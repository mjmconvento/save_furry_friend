<?php

namespace App\Services;

use App\Http\Requests\User\StoreUserRequest;
use App\Http\Requests\User\UpdateUserRequest;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserService
{
    public function storeUser(StoreUserRequest $request)
    {
        $user = new User;
        $user->id = Str::uuid();
        $user->name = $request->get('name');
        $user->email = $request->get('email');
        $user->password = Hash::make($request->get('password'));
        $user->save();

        return $user;
    }

    public function updateUser(UpdateUserRequest $request, User $user): void
    {
        if ($request->has('name')) {
            $user->name = $request->get('name');
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
