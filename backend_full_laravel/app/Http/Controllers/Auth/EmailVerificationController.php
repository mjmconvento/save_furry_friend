<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Eloquent\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

/**
 * Email verification for a token-authenticated SPA.
 *
 * The link is opened from an email, in a browser, so there is no bearer token and
 * this app keeps no session - which rules out Laravel's own
 * `EmailVerificationRequest`: it reads `$request->user()` and dies on null here.
 *
 * The URL's authority is instead the signature the `signed` middleware checks, so
 * the account is resolved from the route id. The hash is still compared, because
 * it is a hash of the address: a link stops working once the address changes,
 * which a signature alone would not catch.
 */
class EmailVerificationController extends Controller
{
    public function verify(Request $request, string $id, string $hash): RedirectResponse
    {
        $user = User::find($id);

        if (! $user instanceof User
            || ! hash_equals($hash, sha1($user->getEmailForVerification()))) {
            throw new AccessDeniedHttpException('This verification link is not valid.');
        }

        // Re-opening a link is not an error; people do it.
        if (! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();

            event(new Verified($user));
        }

        // Back to the app rather than a JSON body: a person opened this in a
        // browser, and a page that says so beats a bare payload.
        return redirect()->away(Config::string('cors.frontend_url') . '/?verified=1');
    }

    /**
     * Sends the link again, for the signed-in account.
     *
     * Without this an expired or mistyped link means registering a second
     * account, which is a silly reason to create data.
     */
    public function send(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'That address is already verified.',
            ]);
        }

        $user->sendEmailVerificationNotification();

        return response()->json([
            'message' => 'Verification link sent.',
        ]);
    }
}
