<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class FollowController extends Controller
{
    /**
     * @throws ValidationException
     */
    public function follow(string $id): JsonResponse
    {
        $userToFollow = User::findOrFail($id);
        $userLoggedIn = Auth::user();

        if ($userLoggedIn->id === $userToFollow->id) {
            throw ValidationException::withMessages([
                'follow' => ['You cannot follow yourself.']
            ]);
        }

        if ($userLoggedIn->following()->where('followed_id', $userToFollow->id)->exists()) {
            throw ValidationException::withMessages([
                'follow' => ['You are already following this user.']
            ]);
        }

        $userLoggedIn->following()->attach($userToFollow->id, [
            'created_at' => now(),
        ]);

        return response()->json([
            'message' => 'Followed successfully.',
            'following_id' => $userToFollow->id,
        ]);
    }
}
