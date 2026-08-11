<?php

declare(strict_types=1);

namespace App\Services\User;

use App\Models\Eloquent\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class FollowService
{
    /**
     * @throws ValidationException
     */
    public function follow(User $userToFollow): void
    {
        /** @var User $userLoggedIn */
        $userLoggedIn = Auth::user();

        if ($userLoggedIn->id === $userToFollow->id) {
            throw ValidationException::withMessages([
                'follow' => ['You cannot follow yourself.'],
            ]);
        }

        if ($userLoggedIn->following()->wherePivot('followed_id', $userToFollow->id)->exists()) {
            throw ValidationException::withMessages([
                'follow' => ['You are already following this user.'],
            ]);
        }

        $userLoggedIn->following()
            ->attach($userToFollow->id, [
                'created_at' => now(),
            ]);
    }

    /**
     * @throws ValidationException
     */
    public function unfollow(User $userToUnfollow): void
    {
        /** @var User $userLoggedIn */
        $userLoggedIn = Auth::user();

        if ($userLoggedIn->id === $userToUnfollow->id) {
            throw ValidationException::withMessages([
                'unfollow' => ['You cannot unfollow yourself.'],
            ]);
        }

        if (! $userLoggedIn->following()->wherePivot('followed_id', $userToUnfollow->id)->exists()) {
            throw ValidationException::withMessages([
                'unfollow' => ['You are not following this user.'],
            ]);
        }

        $userLoggedIn->following()
            ->detach($userToUnfollow->id);
    }
}
