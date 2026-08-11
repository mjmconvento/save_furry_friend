<?php

declare(strict_types=1);

namespace App\Services;

use App\Http\Requests\Post\StorePostRequest;
use App\Http\Requests\Post\UpdatePostRequest;
use App\Models\Eloquent\User;
use App\Models\Mongo\Post;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
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

        return $paginator;
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
