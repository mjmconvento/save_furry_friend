<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\Eloquent\User;
use App\Services\User\UserService;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    public function __construct(
        private readonly UserService $users
    ) {
    }

    /**
     * Public registration. Deliberately its own endpoint: `POST /api/users` is
     * admin-only account administration, and reopening that would undo the rule
     * rather than add a feature beside it.
     *
     * Returns a token, so the SPA signs the new account straight in. The address
     * is unverified until the emailed link is opened; nothing is gated on that
     * yet, and `email_verified` on the payload is what the banner reads.
     *
     * With `MAIL_MAILER=log` - the local default - the whole email, link
     * included, lands in `storage/logs/laravel.log`.
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = $this->users->createAccount($request);

        // Laravel's own listener sends the verification notification for a
        // `MustVerifyEmail` user, so there is nothing to send by hand here.
        event(new Registered($user));

        return response()->json([
            'message' => 'Registered successfully',
            'token' => $user->createToken('spa')
                ->plainTextToken,
            'user' => new UserResource($user),
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('email', $request->string('email'))->first();

        if (! $user instanceof User || ! Hash::check($request->string('password')->value(), $user->password)) {
            return response()->json([
                'message' => 'Unauthorized',
            ], 401);
        }

        return response()->json([
            'message' => 'Login successful',
            'token' => $user->createToken('spa')
                ->plainTextToken,
            'user' => new UserResource($user),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $token = $request->user()?->currentAccessToken();

        if ($token instanceof PersonalAccessToken) {
            $token->delete();
        }

        return response()->json([
            'message' => 'Logout successful',
        ]);
    }
}
