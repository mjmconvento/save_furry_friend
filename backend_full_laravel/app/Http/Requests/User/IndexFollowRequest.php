<?php

declare(strict_types=1);

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Paging for the follower and following lists.
 *
 * Deliberately not `IndexUserRequest`, which looks identical and is **admin
 * only**: reusing it for the `per_page` rule silently made both lists 403 for
 * everybody who is not an admin. Seeing who follows whom is part of the product,
 * like profile pages and the people search.
 */
class IndexFollowRequest extends FormRequest
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
