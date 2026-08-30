<?php

declare(strict_types=1);

namespace App\Http\Requests\Post;

use Illuminate\Foundation\Http\FormRequest;

class StoreCommentRequest extends FormRequest
{
    /** Anyone who can read a post can comment on it, as with liking. */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * The bound is generous but real: without one a single request could write
     * a document big enough to slow every read of the thread.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'content' => ['required', 'string', 'max:2000'],
        ];
    }

    /**
     * Whitespace is not content. Trimming before validation is what makes
     * `required` reject "   " rather than storing a blank comment.
     */
    protected function prepareForValidation(): void
    {
        $content = $this->input('content');

        if (is_string($content)) {
            $this->merge([
                'content' => trim($content),
            ]);
        }
    }
}
