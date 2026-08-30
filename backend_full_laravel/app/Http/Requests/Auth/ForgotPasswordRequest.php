<?php

declare(strict_types=1);

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class ForgotPasswordRequest extends FormRequest
{
    /** Public by definition: the caller cannot sign in, which is the problem. */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Deliberately no `exists:users,email` rule. It would answer "does this
     * address have an account?" to anyone who asks, which is exactly what the
     * controller's uniform response exists to avoid.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'email' => ['required', 'email:rfc', 'max:255'],
        ];
    }
}
