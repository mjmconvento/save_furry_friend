<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use MongoDB\Laravel\Connection as MongoConnection;

return new class() extends Migration {
    /**
     * `medias` used to hold absolute URLs rewritten to the local MinIO host, which
     * pinned every document to one environment. It now holds bare object keys and
     * the URL is resolved at render time through the s3 disk.
     */
    public function up(): void
    {
        $bucket = $this->bucket();

        $this->eachPost(fn (array $medias): array => array_values(array_map(
            static function (string $media) use ($bucket): string {
                // Idempotent: a value that is already a key has no scheme.
                if (! str_contains($media, '://')) {
                    return $media;
                }

                $key = ltrim((string) parse_url($media, PHP_URL_PATH), '/');

                if ($bucket !== '' && str_starts_with($key, $bucket . '/')) {
                    $key = substr($key, strlen($bucket) + 1);
                }

                return $key;
            },
            $medias,
        )));
    }

    public function down(): void
    {
        $this->eachPost(static fn (array $medias): array => array_values(array_map(
            static fn (string $media): string => str_contains($media, '://')
                ? $media
                : Storage::disk('s3')->url($media),
            $medias,
        )));
    }

    /**
     * @param \Closure(array<int, string>): array<int, string> $transform
     */
    private function eachPost(Closure $transform): void
    {
        $connection = DB::connection('mongodb');
        assert($connection instanceof MongoConnection);

        $posts = $connection->getCollection('posts');

        $cursor = $posts->find(
            [
                'medias' => [
                    '$type' => 'array',
                ],
            ],
            [
                'typeMap' => [
                    'root' => 'array',
                    'document' => 'array',
                    'array' => 'array',
                ],
            ],
        );

        foreach ($cursor as $document) {
            $post = (array) $document;
            $rawMedias = $post['medias'] ?? null;

            if (! is_array($rawMedias)) {
                continue;
            }

            $medias = array_values(array_filter($rawMedias, is_string(...)));

            $rewritten = $transform($medias);

            if ($rewritten === $medias) {
                continue;
            }

            $posts->updateOne([
                '_id' => $post['_id'] ?? null,
            ], [
                '$set' => [
                    'medias' => $rewritten,
                ],
            ]);
        }
    }

    private function bucket(): string
    {
        $bucket = config('filesystems.disks.s3.bucket');

        return is_scalar($bucket) ? (string) $bucket : '';
    }
};
