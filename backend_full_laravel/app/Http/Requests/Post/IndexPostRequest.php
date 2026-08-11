<?php

declare(strict_types=1);

namespace App\Http\Requests\Post;

use Illuminate\Foundation\Http\FormRequest;

class IndexPostRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'tags' => ['array'],
            'tags.*' => ['string'],
            'authorId' => ['uuid'],
            'per_page' => ['integer', 'min:1', 'max:50'],
        ];
    }
}
