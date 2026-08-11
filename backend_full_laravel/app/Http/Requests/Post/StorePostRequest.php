<?php

declare(strict_types=1);

namespace App\Http\Requests\Post;

use Illuminate\Foundation\Http\FormRequest;

class StorePostRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'content' => ['required', 'string', 'max:255'],
            'tags' => ['array', 'max:10'],
            'tags.*' => ['string', 'max:30'],
            'medias' => ['array', 'max:4'],
            'medias.*' => ['file', 'mimes:jpg,jpeg,png,webp,gif,mp4', 'max:10240'],
        ];
    }
}
