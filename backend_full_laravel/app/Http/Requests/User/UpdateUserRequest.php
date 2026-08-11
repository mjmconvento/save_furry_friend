<?php

declare(strict_types=1);

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UpdateUserRequest extends FormRequest
{
    /**
     * Ownership is enforced by UserPolicy via $this->authorize() in the
     * controller, not here.
     */
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
            'firstName' => ['sometimes', 'string', 'max:255'],
            'middleName' => ['sometimes', 'nullable', 'string', 'max:255'],
            'lastName' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email:rfc', Rule::unique('users', 'email')->ignore($this->route('user'))],
            'password' => ['sometimes', 'confirmed', Password::defaults()],
            'current_password' => ['required_with:password', 'current_password'],
        ];
    }
}
