<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use MongoDB\Collection;
use MongoDB\Laravel\Connection as MongoConnection;

return new class() extends Migration {
    /**
     * `Post` used to write `createdAt` by hand while Eloquent kept maintaining its
     * default `created_at` / `updated_at`, so every document carries both pairs.
     * The model now declares CREATED_AT/UPDATED_AT, which makes the snake_case
     * pair dead weight — and `updatedAt` was never written at all.
     */
    public function up(): void
    {
        $posts = $this->posts();

        // Seed updatedAt from created_at (the real last-write time) where we still
        // have it, otherwise from createdAt, before dropping the legacy pair.
        foreach ($this->documents($posts, [
            'updatedAt' => [
                '$exists' => false,
            ],
        ]) as $post) {
            $updatedAt = $post['updated_at'] ?? $post['created_at'] ?? $post['createdAt'] ?? null;

            if ($updatedAt === null) {
                continue;
            }

            $posts->updateOne([
                '_id' => $post['_id'],
            ], [
                '$set' => [
                    'updatedAt' => $updatedAt,
                ],
            ]);
        }

        $posts->updateMany(
            [
                '$or' => [[
                    'created_at' => [
                        '$exists' => true,
                    ],
                ], [
                    'updated_at' => [
                        '$exists' => true,
                    ],
                ]],
            ],
            [
                '$unset' => [
                    'created_at' => '',
                    'updated_at' => '',
                ],
            ],
        );
    }

    /**
     * The legacy pair only ever duplicated the camelCase values, so restoring it
     * from them is a faithful inverse. `updatedAt` stays: the model owns it now.
     */
    public function down(): void
    {
        $posts = $this->posts();

        foreach ($this->documents($posts, [
            'created_at' => [
                '$exists' => false,
            ],
        ]) as $post) {
            $createdAt = $post['createdAt'] ?? null;

            if ($createdAt === null) {
                continue;
            }

            $posts->updateOne([
                '_id' => $post['_id'],
            ], [
                '$set' => [
                    'created_at' => $createdAt,
                    'updated_at' => $post['updatedAt'] ?? $createdAt,
                ],
            ]);
        }
    }

    private function posts(): Collection
    {
        $connection = DB::connection('mongodb');
        assert($connection instanceof MongoConnection);

        return $connection->getCollection('posts');
    }

    /**
     * @param  array<string, mixed>  $filter
     * @return iterable<array<array-key, mixed>>
     */
    private function documents(Collection $posts, array $filter): iterable
    {
        $cursor = $posts->find($filter, [
            'typeMap' => [
                'root' => 'array',
                'document' => 'array',
                'array' => 'array',
            ],
        ]);

        foreach ($cursor as $document) {
            yield (array) $document;
        }
    }
};
