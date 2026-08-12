<?php

declare(strict_types=1);

namespace App\Http\Requests\User;

use App\Models\Eloquent\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class StoreUserRequest extends FormRequest
{
    /**
     * Creating an account is an admin action - there is no public registration
     * any more. Checked here rather than in the controller so an unauthorized
     * caller gets 403 without validation first disclosing whether the payload
     * was well-formed.
     */
    public function authorize(): bool
    {
        $user = $this->user();

        return $user instanceof User && $user->can('create', User::class);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'firstName' => ['required', 'string', 'max:255'],
            'middleName' => ['nullable', 'string', 'max:255'],
            'lastName' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email:rfc', 'max:255', Rule::unique('users', 'email')],
            'password' => ['required', 'confirmed', Password::defaults()],
        ];
    }
}
