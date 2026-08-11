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
            'content' => $this->content,
            'tags' => $this->tags ?? [],
            'medias' => array_map(
                static fn (string $key): string => Storage::disk('s3')->url($key),
                $this->medias ?? [],
            ),
            'createdAt' => $this->createdAt?->toIso8601String(),
            'updatedAt' => $this->updatedAt?->toIso8601String(),
        ];
    }
}
