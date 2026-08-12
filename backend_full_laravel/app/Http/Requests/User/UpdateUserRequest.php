<?php

declare(strict_types=1);

namespace App\Http\Requests\User;

use App\Models\Eloquent\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UpdateUserRequest extends FormRequest
{
    /**
     * Admin-only, and no longer ownership-based, so it needs no model and can
     * run here - ahead of validation, which would otherwise answer 422 to a
     * caller not allowed to edit anyone.
     *
     * Note `current_password` in the rules below: it validates against the
     * *authenticated* user, so an admin changing someone's password confirms
     * with their own.
     */
    public function authorize(): bool
    {
        $user = $this->user();

        return $user instanceof User && $user->can('update', User::class);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'firstName' => ['sometimes', 'string', 'max:255'],
            'middleName' => ['sometimes', 'nullable', 'string', 'max:255'],
            'lastName' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email:rfc', Rule::unique('users', 'email')->ignore($this->route('user'))],
            'password' => ['sometimes', 'confirmed', Password::defaults()],
            'current_password' => ['required_with:password', 'current_password'],
        ];
    }
}
