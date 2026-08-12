<?php

declare(strict_types=1);

namespace App\Services\User;

use App\Models\Eloquent\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * Avatars live in the same bucket as post media, under the owner's id, and are
 * stored as bare object keys for the same reason: the URL is rendered at read
 * time so moving the bucket is a config change rather than a data migration.
 */
class AvatarService
{
    public function replace(User $user, UploadedFile $file): void
    {
        $previous = $user->avatar;

        /** @var string $key */
        $key = $file->storePublicly($user->id, 's3');

        $user->avatar = $key;
        $user->save();

        // Only after the row points at the new object: crashing between the two
        // would otherwise leave an account referencing a deleted file, which
        // renders as a broken image rather than as initials.
        $this->discard($previous);
    }

    public function remove(User $user): void
    {
        $previous = $user->avatar;

        $user->avatar = null;
        $user->save();

        $this->discard($previous);
    }

    /**
     * Best effort, and deliberately so: the row is the source of truth, and an
     * orphaned object costs storage while a failed request costs the user their
     * change.
     */
    private function discard(?string $key): void
    {
        if ($key === null || $key === '') {
            return;
        }

        try {
            Storage::disk('s3')->delete($key);
        } catch (Throwable $e) {
            Log::warning('Could not delete a replaced avatar object.', [
                'key' => $key,
                'exception' => $e->getMessage(),
            ]);
        }
    }
}
