<?php

declare(strict_types=1);

namespace App\Services\User;

use App\Models\Eloquent\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
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

    /**
     * People who follow `$user`, newest follow first.
     *
     * @return LengthAwarePaginator<int, User>
     */
    public function followers(User $user, int $perPage): LengthAwarePaginator
    {
        /** @var LengthAwarePaginator<int, User> $paginator */
        $paginator = $user->followers()
            ->orderByPivot('created_at', 'desc')
            ->paginate($perPage);

        return $paginator;
    }

    /**
     * People `$user` follows, newest follow first.
     *
     * @return LengthAwarePaginator<int, User>
     */
    public function following(User $user, int $perPage): LengthAwarePaginator
    {
        /** @var LengthAwarePaginator<int, User> $paginator */
        $paginator = $user->following()
            ->orderByPivot('created_at', 'desc')
            ->paginate($perPage);

        return $paginator;
    }

    /**
     * Fills in `viewerFollows` for a set of people in one query.
     *
     * Without this every row in a followers list would need its own `exists()` -
     * twenty queries to draw twenty buttons.
     *
     * @param iterable<User> $users
     */
    public function attachViewerFollows(iterable $users, User $viewer): void
    {
        $ids = [];

        foreach ($users as $user) {
            $ids[] = $user->id;
        }

        if ($ids === []) {
            return;
        }

        $followed = DB::table('user_followers')
            ->where('follower_id', $viewer->id)
            ->whereIn('followed_id', $ids)
            ->pluck('followed_id')
            ->all();

        $lookup = [];

        foreach ($followed as $id) {
            if (is_string($id)) {
                $lookup[$id] = true;
            }
        }

        foreach ($users as $user) {
            // Never "following yourself": the SPA would otherwise draw an
            // Unfollow button pointing at an endpoint that rejects it.
            $user->viewerFollows = $user->id !== $viewer->id
                && array_key_exists($user->id, $lookup);
        }
    }
}
