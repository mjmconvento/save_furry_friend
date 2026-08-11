<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\Mongo\Post;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * `authorName` is denormalized into every Mongo post document because there is
 * no join available across Postgres and Mongo. A rename therefore needs a
 * write-side fan-out.
 */
class SyncAuthorName implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly string $userId,
        private readonly string $authorName,
    ) {
    }

    public function handle(): void
    {
        Post::where('authorId', $this->userId)
            ->update([
                'authorName' => $this->authorName,
            ]);
    }
}
