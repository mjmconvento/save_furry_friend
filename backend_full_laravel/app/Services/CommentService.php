<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Eloquent\User;
use App\Models\Mongo\Comment;
use App\Models\Mongo\Post;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use MongoDB\Laravel\Connection as MongoConnection;

class CommentService
{
    /**
     * One post's thread, oldest first - the order it reads in.
     *
     * @return LengthAwarePaginator<int, Comment>
     */
    public function forPost(Post $post, int $perPage, int $page): LengthAwarePaginator
    {
        /** @var LengthAwarePaginator<int, Comment> $paginator */
        $paginator = Comment::where('postId', $post->id)
            ->orderBy('createdAt')
            ->paginate($perPage, ['*'], 'page', $page);

        $this->attachAuthors($paginator->items());

        return $paginator;
    }

    public function store(Post $post, User $author, string $content): Comment
    {
        $comment = Comment::create([
            'postId' => $post->id,
            'authorId' => $author->id,
            'content' => trim($content),
        ]);

        $this->attachAuthors([$comment]);

        return $comment;
    }

    /**
     * Fills in each comment's author name and picture from Postgres in one
     * query.
     *
     * Nothing about the author is stored on the comment, so there is no
     * fan-out to keep honest and a renamed account is correct everywhere
     * immediately. The cost is one `whereIn` per page.
     *
     * Set on the in-memory models only; these are never saved.
     *
     * @param array<int, Comment> $comments
     */
    public function attachAuthors(array $comments): void
    {
        if ($comments === []) {
            return;
        }

        $authorIds = array_values(array_unique(array_map(
            static fn (Comment $comment): string => $comment->authorId,
            $comments,
        )));

        $authors = User::whereIn('id', $authorIds)
            ->get()
            ->keyBy('id');

        foreach ($comments as $comment) {
            /** @var ?User $author */
            $author = $authors->get($comment->authorId);

            $comment->authorName = $author === null
                ? null
                : trim("{$author->first_name} {$author->last_name}");
            $comment->authorAvatar = $author?->avatar;
        }
    }

    /**
     * Comment counts for a set of posts, in one aggregation rather than one
     * query per post.
     *
     * @param list<string> $postIds
     * @return array<string, int>
     */
    public function countsFor(array $postIds): array
    {
        if ($postIds === []) {
            return [];
        }

        $comment = new Comment();
        /** @var MongoConnection $connection */
        $connection = $comment->getConnection();

        $rows = $connection->getCollection($comment->getTable())
            ->aggregate([
                [
                    '$match' => [
                        'postId' => [
                            '$in' => $postIds,
                        ],
                    ],
                ],
                [
                    '$group' => [
                        '_id' => '$postId',
                        'comments' => [
                            '$sum' => 1,
                        ],
                    ],
                ],
            ], [
                'typeMap' => [
                    'root' => 'array',
                    'document' => 'array',
                ],
            ]);

        $counts = [];

        foreach ($rows as $row) {
            if (! is_array($row)) {
                continue;
            }

            $id = $row['_id'] ?? null;
            $comments = $row['comments'] ?? null;

            if (is_string($id) && is_int($comments)) {
                $counts[$id] = $comments;
            }
        }

        return $counts;
    }
}
