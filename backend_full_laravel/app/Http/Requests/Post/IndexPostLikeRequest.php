<?php

declare(strict_types=1);

namespace App\Http\Requests\Post;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Paging for a post's like roster.
 *
 * Its own request rather than `IndexFollowRequest` despite the identical rule:
 * that one is named for the follow lists, and sharing it would mean a change
 * made for one surface silently reaching the other. Same reason
 * `IndexFollowRequest` itself is not `IndexUserRequest`.
 */
class IndexPostLikeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'per_page' => ['integer', 'min:1', 'max:50'],
        ];
    }
}
