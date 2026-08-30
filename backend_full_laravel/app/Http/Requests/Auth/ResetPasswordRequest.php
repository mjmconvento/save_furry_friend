<?php

declare(strict_types=1);

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class ResetPasswordRequest extends FormRequest
{
    /** The token in the payload is the authority here, not a bearer token. */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * `Password::defaults()` is the same policy registration enforces, so a
     * reset cannot be used to set a weaker password than signing up allows.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'token' => ['required', 'string'],
            'email' => ['required', 'email:rfc', 'max:255'],
            'password' => ['required', 'confirmed', Password::defaults()],
        ];
    }
}
