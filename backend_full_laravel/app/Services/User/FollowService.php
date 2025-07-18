<?php

namespace App\Services\User;

use App\Models\Eloquent\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class FollowService
{
    /**
     * @throws ValidationException
     */
    public function follow(string $id): JsonResponse
    {
        if (!Str::isUuid($id)) {
            throw ValidationException::withMessages([
                'id' => ['The provided ID is not a valid UUID.']
            ]);
        }

        $userToFollow = User::findOneOrFail($id);

        /** @var User $userLoggedIn */
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

    /**
     * @throws ValidationException
     */
    public function unfollow(string $id): JsonResponse
    {
        if (!Str::isUuid($id)) {
            throw ValidationException::withMessages([
                'id' => ['The provided ID is not a valid UUID.']
            ]);
        }

        $userToUnfollow = User::findOneOrFail($id);

        /** @var User $userLoggedIn */
        $userLoggedIn = Auth::user();

        if ($userLoggedIn->id === $userToUnfollow->id) {
            throw ValidationException::withMessages([
                'unfollow' => ['You cannot unfollow yourself.']
            ]);
        }

        if (!$userLoggedIn->following()->where('followed_id', $userToUnfollow->id)->exists()) {
            throw ValidationException::withMessages([
                'unfollow' => ['You are not following this user.']
            ]);
        }

        $userLoggedIn->following()->detach($userToUnfollow->id);

        return response()->json([
            'message' => 'Unfollowed successfully.',
            'unfollowed_id' => $userToUnfollow->id,
        ]);
    }
}
