<?php

declare(strict_types=1);

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
{
    /**
     * Public by definition. This is deliberately *not* `StoreUserRequest`, which
     * is admin-only: the two look similar but answer different questions, and
     * sharing them would mean one edit could make account administration public
     * by accident.
     *
     * Note what is absent: `roles` and `preferences` are not fillable on the
     * model, so no payload here can grant anything.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Field names match `StoreUserRequest` so the SPA's two forms agree.
     *
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
