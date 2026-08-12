<?php

declare(strict_types=1);

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;

class StoreAvatarRequest extends FormRequest
{
    /**
     * Any signed-in account may set its own picture. As with preferences, the
     * route carries no user parameter, so the only account reachable is the
     * token's own - this is not a way into admin-only account editing.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Stricter than post media on purpose: an avatar is displayed at 40px, so
     * there is no reason to accept a 10MB file or a video. `mimes` checks the
     * decoded type rather than the client's filename.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'avatar' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'avatar.max' => 'A profile picture must be 4 MB or smaller.',
            'avatar.mimes' => 'A profile picture must be a JPEG, PNG or WebP image.',
        ];
    }
}
