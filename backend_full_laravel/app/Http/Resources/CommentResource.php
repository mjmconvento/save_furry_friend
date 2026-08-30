<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Mongo\Comment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/**
 * @mixin Comment
 */
class CommentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'postId' => $this->postId,
            'authorId' => $this->authorId,
            // Null when the account is gone. The comment stays - it is content,
            // and a thread with holes punched in it reads worse than one that
            // says who is missing. The client renders the placeholder.
            'authorName' => $this->authorName,
            'authorAvatar' => $this->authorAvatar === null
                ? null
                : Storage::disk('s3')->url($this->authorAvatar),
            'content' => $this->content,
            'createdAt' => $this->createdAt?->toIso8601String(),
        ];
    }
}
