<?php

declare(strict_types=1);

namespace App\Http\Requests\Trivia;

use App\Enums\TriviaTone;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class IndexTriviaRequest extends FormRequest
{
    /**
     * Strict where `IndexPostRequest` is deliberately loose: post tags are an
     * open vocabulary, trivia tones are ours alone, so a typo should 422
     * rather than silently match nothing.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'tones' => ['array'],
            'tones.*' => [Rule::enum(TriviaTone::class)],
        ];
    }
}
