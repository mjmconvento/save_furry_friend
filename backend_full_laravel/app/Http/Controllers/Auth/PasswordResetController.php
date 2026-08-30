<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Models\Eloquent\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Password reset for a token-authenticated SPA.
 *
 * Same shape as `EmailVerificationController`: the link is opened from an email
 * in a browser, so there is no bearer token and no session. The difference is
 * where it lands - a reset needs a form, so the link points at the SPA and the
 * token comes back here in a POST body. `AppServiceProvider` owns that URL.
 *
 * The reset table, the 60-minute expiry and the per-address throttle are
 * Laravel's `passwords.users` broker config; nothing here reimplements them.
 */
class PasswordResetController extends Controller
{
    /**
     * Uniform response, always 200.
     *
     * Reporting whether the address existed would turn this endpoint into an
     * account-enumeration oracle - the same reason `login` answers 401 for an
     * unknown email rather than 404. A throttled repeat says the same thing.
     */
    public function forgot(ForgotPasswordRequest $request): JsonResponse
    {
        Password::sendResetLink($request->validated());

        return response()->json([
            'message' => 'If that address has an account, a reset link is on its way.',
        ]);
    }

    public function reset(ResetPasswordRequest $request): JsonResponse
    {
        /** @var string $status Broker status key, e.g. `passwords.token`. */
        $status = Password::reset(
            $request->validated(),
            function (User $user, string $password): void {
                $user->forceFill([
                    'password' => Hash::make($password),
                    // Invalidates any "remember me" cookie issued under the old
                    // password, per Laravel's own reset flow.
                    'remember_token' => Str::random(60),
                ])->save();

                // A reset is what someone does when the old password may be
                // compromised, so every token minted under it must die with it.
                // Sanctum tokens outlive a password change otherwise.
                $user->tokens()
                    ->delete();

                event(new PasswordReset($user));
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            // An expired, reused or tampered token, or an address with no
            // pending reset. Reported on `email` because that is the field the
            // person can act on - the token is not theirs to fix.
            throw ValidationException::withMessages([
                'email' => [__($status)],
            ]);
        }

        return response()->json([
            'message' => 'Your password has been reset. Sign in with the new one.',
        ]);
    }
}
