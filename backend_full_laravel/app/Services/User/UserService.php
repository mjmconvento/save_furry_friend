<?php

namespace App\Services\User;

use App\Http\Requests\User\StoreUserRequest;
use App\Http\Requests\User\UpdateUserRequest;
use App\Models\Eloquent\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserService
{
    /**
     * @return array{
     *     id: string,
     *     first_name: string,
     *     middle_name: ?string,
     *     last_name: string,
     *     email: string,
     *     is_following: bool
     * }
     */
    public function getUser(string $id): array
    {
        $user = User::findOneOrFail($id);

        /** @var User $authUser */
        $authUser = Auth::user();

        $isFollowing = false;

        if ($authUser->id !== $user->id) {
            $isFollowing = $authUser->following()->where('followed_id', $user->id)->exists();
        }

        return [
            'id' => $user->id,
            'first_name' => $user->first_name,
            'middle_name' => $user->middle_name,
            'last_name' => $user->last_name,
            'email' => $user->email,
            'is_following' => $isFollowing,
        ];
    }

    public function storeUser(StoreUserRequest $request): User
    {
        $user = new User();
        $user->id = Str::uuid();

        /** @var string $firstName */
        $firstName = $request->get('firstName');

        /** @var string $middleName */
        $middleName = $request->get('middleName');

        /** @var string $lastName */
        $lastName = $request->get('lastName');

        /** @var string $email */
        $email = $request->get('email');

        /** @var string $password */
        $password = $request->get('password');

        $user->first_name = $firstName;
        $user->middle_name = $middleName;
        $user->last_name = $lastName;
        $user->email = $email;
        $user->password = Hash::make($password);
        $user->save();

        return $user;
    }

    public function updateUser(UpdateUserRequest $request, User $user): void
    {
        if ($request->has('firstName')) {
            /** @var string $firstName */
            $firstName = $request->get('firstName');

            $user->first_name = $firstName;
        }

        if ($request->has('middleName')) {
            /** @var string $middleName */
            $middleName = $request->get('middleName');

            $user->middle_name = $middleName;
        }

        if ($request->has('lastName')) {
            /** @var string $lastName */
            $lastName = $request->get('lastName');

            $user->last_name = $lastName;
        }

        if ($request->has('email')) {
            /** @var string $email */
            $email = $request->get('email');

            $user->email = $email;
        }

        if ($request->has('password')) {
            /** @var string $password */
            $password = $request->get('password');

            $user->password = Hash::make($password);
        }

        $user->save();
    }
}
