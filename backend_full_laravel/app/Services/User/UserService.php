<?php

namespace App\Services\User;

use App\Http\Requests\User\StoreUserRequest;
use App\Http\Requests\User\UpdateUserRequest;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserService
{
    public function getUser(string $id): array
    {
        /** @var User $user */
        $user = User::findOneOrFail($id);

        /** @var User $authUser */
        $authUser = Auth::user();

        $isFollowing = false;

        if ($authUser->id !== $user->id) {
            $isFollowing = $authUser->following()->where('followed_id', $user->id)->exists();
        }

        $userData = $user->toArray();
        $userData['is_following'] = $isFollowing;

        return $userData;
    }

    public function storeUser(StoreUserRequest $request): User
    {
        $user = new User;
        $user->id = Str::uuid();
        $user->first_name = $request->get('firstName');
        $user->middle_name = $request->get('middleName');
        $user->last_name = $request->get('lastName');
        $user->email = $request->get('email');
        $user->password = Hash::make($request->get('password'));
        $user->save();

        return $user;
    }

    public function updateUser(UpdateUserRequest $request, User $user): void
    {
        if ($request->has('firstName')) {
            $user->first_name = $request->get('firstName');
        }

        if ($request->has('middleName')) {
            $user->middle_name = $request->get('middleName');
        }

        if ($request->has('lastName')) {
            $user->last_name = $request->get('lastName');
        }

        if ($request->has('email')) {
            $user->email = $request->get('email');
        }
        if ($request->has('password')) {
            $user->password = Hash::make($request->get('password'));
        }

        $user->save();
    }
}
