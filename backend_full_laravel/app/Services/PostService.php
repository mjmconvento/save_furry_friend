<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\PostTag;
use App\Http\Requests\Post\StorePostRequest;
use App\Http\Requests\Post\UpdatePostRequest;
use App\Models\Eloquent\User;
use App\Models\Mongo\Post;
use Carbon\CarbonInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use MongoDB\BSON\UTCDateTime;
use MongoDB\Laravel\Connection as MongoConnection;
use Throwable;

class PostService
{
    /**
     * @param ?array<string> $tags
     * @return LengthAwarePaginator<int, Post>
     */
    public function getPosts(User $viewer, ?array $tags, ?string $authorId, int $perPage = 20): LengthAwarePaginator
    {
        $query = Post::query();

        if ($tags !== null) {
            $query->whereIn('tags', $tags);
        }

        $query->whereIn('authorId', $authorId !== null
            ? [$authorId]
            : $this->visibleAuthorIds($viewer));

        /** @var LengthAwarePaginator<int, Post> $paginator */
        $paginator = $query->orderBy('createdAt', 'desc')
            ->paginate($perPage);

        $this->attachAuthorAvatars($paginator->items());

        return $paginator;
    }

    /**
     * Fills in each post's author picture from Postgres in a single query.
     *
     * `authorName` is denormalized into the documents and needs a write-side
     * fan-out to stay honest - the staleness this codebase already carries a job
     * for. Avatars deliberately do not repeat that: they are read at render time,
     * so changing a picture cannot leave old posts showing the old one, and there
     * is nothing to backfill. The cost is one `whereIn` per page.
     *
     * The value is set on the in-memory model only; these instances are never
     * saved, so nothing reaches the documents.
     *
     * @param array<int, Post> $posts
     */
    public function attachAuthorAvatars(array $posts): void
    {
        if ($posts === []) {
            return;
        }

        $authorIds = array_values(array_unique(array_map(
            static fn (Post $post): string => $post->authorId,
            $posts,
        )));

        /** @var array<string, ?string> $avatars */
        $avatars = User::whereIn('id', $authorIds)
            ->pluck('avatar', 'id')
            ->all();

        foreach ($posts as $post) {
            $post->authorAvatar = $avatars[$post->authorId] ?? null;
        }
    }

    /**
     * Counts today's posts per tone, scoped exactly like the feeds - people the
     * viewer follows, plus themselves - so the number on the home page matches
     * what clicking through to the feed actually shows.
     *
     * "Today" is midnight in the application timezone (`config/app.php`), which
     * is why the caller reports the date alongside the counts rather than
     * letting the client assume its own.
     *
     * One aggregation rather than three counts, and `$unwind` rather than
     * grouping on `tags` directly, because the field is an array: grouping on it
     * would key by the whole array and miscount the moment a post carries two
     * tags. Served by the existing `{authorId: 1, createdAt: -1}` index.
     *
     * @return array<string, int> every tone in `PostTag`, zeros included
     */
    public function countTodayByTone(User $viewer, CarbonInterface $today): array
    {
        $counts = [];

        foreach (PostTag::cases() as $tag) {
            $counts[$tag->value] = 0;
        }

        $post = new Post();
        /** @var MongoConnection $connection */
        $connection = $post->getConnection();
        // Straight to the driver: this is an aggregation pipeline, not something
        // the Eloquent builder models.
        $collection = $connection->getCollection($post->getTable());

        $rows = $collection->aggregate([
            [
                '$match' => [
                    'authorId' => [
                        '$in' => $this->visibleAuthorIds($viewer),
                    ],
                    'createdAt' => [
                        '$gte' => new UTCDateTime($today->copy()->startOfDay()),
                        '$lt' => new UTCDateTime($today->copy()->addDay()->startOfDay()),
                    ],
                ],
            ],
            [
                '$unwind' => '$tags',
            ],
            [
                '$match' => [
                    'tags' => [
                        '$in' => array_keys($counts),
                    ],
                ],
            ],
            [
                '$group' => [
                    '_id' => '$tags',
                    'count' => [
                        '$sum' => 1,
                    ],
                ],
            ],
        ], [
            // Plain arrays rather than BSONDocument objects, so the rows below
            // are ordinary offsets.
            'typeMap' => [
                'root' => 'array',
                'document' => 'array',
            ],
        ]);

        foreach ($rows as $row) {
            if (! is_array($row)) {
                continue;
            }

            $tone = $row['_id'] ?? null;
            $count = $row['count'] ?? null;

            // A tone outside the vocabulary cannot reach here - the pipeline
            // filters on it - so anything unexpected is a shape change, not data.
            if (is_string($tone) && is_int($count) && array_key_exists($tone, $counts)) {
                $counts[$tone] = $count;
            }
        }

        return $counts;
    }

    public function storePost(StorePostRequest $request, User $author): Post
    {
        $post = new Post();

        $post->authorId = $author->id;
        $post->authorName = $author->first_name . ' ' . $author->last_name;

        /** @var string $content */
        $content = $request->validated('content');
        $post->content = $content;

        /** @var array<string> $tags */
        $tags = $request->validated('tags', []);
        $post->tags = $tags;

        $post->medias = $this->storeMedias($request, $author->id);

        $post->save();

        return $post;
    }

    public function updatePost(UpdatePostRequest $request, Post $post): void
    {
        $post->update($request->validated());
    }

    public function deletePost(Post $post): void
    {
        $keys = $post->medias ?? [];

        // The document is the source of truth: drop it first, then make a
        // best-effort attempt at the objects it referenced.
        $post->delete();

        $this->deleteMedias($keys);
    }

    /**
     * Deletes every post authored by the given user together with its media objects.
     */
    public function deletePostsByAuthor(string $authorId): void
    {
        /** @var array<int, ?array<string>> $medias */
        $medias = Post::query()
            ->where('authorId', $authorId)
            ->pluck('medias')
            ->all();

        Post::query()->where('authorId', $authorId)->delete();

        $this->deleteMedias(array_merge(...array_map(
            static fn (?array $keys): array => $keys ?? [],
            $medias,
        )));
    }

    /**
     * The follow graph the viewer is allowed to read, including their own posts.
     *
     * @return array<string>
     */
    private function visibleAuthorIds(User $viewer): array
    {
        $followingIds = $viewer
            ->following()
            ->pluck('id')
            ->map(function ($id): string {
                assert(is_scalar($id));

                return (string) $id;
            })
            ->all();

        $followingIds[] = $viewer->id;

        return $followingIds;
    }

    /**
     * @return array<string>
     */
    private function storeMedias(StorePostRequest $request, string $userId): array
    {
        $medias = $request->file('medias', []);

        if ($medias instanceof UploadedFile) {
            $medias = [$medias];
        }

        $keys = [];

        /** @var UploadedFile $file */
        foreach ((array) $medias as $file) {
            /** @var string $key */
            $key = $file->storePublicly($userId, 's3');

            $keys[] = $key;
        }

        return $keys;
    }

    /**
     * Best-effort: the `s3` disk runs with `throw => true`, so a failed delete
     * must not take down a request whose document is already gone.
     *
     * @param array<string> $keys
     */
    private function deleteMedias(array $keys): void
    {
        if ($keys === []) {
            return;
        }

        try {
            Storage::disk('s3')->delete($keys);
        } catch (Throwable $e) {
            logger()->warning('Failed to delete post media objects.', [
                'keys' => $keys,
                'exception' => $e->getMessage(),
            ]);
        }
    }
}
