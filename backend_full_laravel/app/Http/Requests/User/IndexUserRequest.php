<?php

declare(strict_types=1);

namespace App\Http\Requests\User;

use App\Models\Eloquent\User;
use Illuminate\Foundation\Http\FormRequest;

class IndexUserRequest extends FormRequest
{
    /**
     * Admin-only, and checked here rather than in the controller so the 403
     * lands before validation can answer 422.
     */
    public function authorize(): bool
    {
        $user = $this->user();

        return $user instanceof User && $user->can('viewAny', User::class);
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
