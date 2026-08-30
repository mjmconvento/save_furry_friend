<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Mongo\Post;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/**
 * @mixin Post
 */
class PostResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'authorId' => $this->authorId,
            'authorName' => $this->authorName,
            // Read from Postgres at render time rather than denormalized, so it
            // cannot go stale. Null when the author has no picture, or when the
            // caller did not hydrate it.
            'authorAvatar' => $this->authorAvatar === null
                ? null
                : Storage::disk('s3')->url($this->authorAvatar),
            'content' => $this->content,
            'tags' => $this->tags ?? [],
            // The count is public; the roster is not. Exposing `likes` would
            // let any reader enumerate who liked what, and nothing in the UI
            // needs it.
            'likeCount' => count($this->likes ?? []),
            'likedByViewer' => in_array(
                $request->user()?->id,
                $this->likes ?? [],
                true,
            ),
            'medias' => array_map(
                static fn (string $key): string => Storage::disk('s3')->url($key),
                $this->medias ?? [],
            ),
            'createdAt' => $this->createdAt?->toIso8601String(),
            'updatedAt' => $this->updatedAt?->toIso8601String(),
        ];
    }
}
