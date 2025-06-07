<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\StoreUserRequest;
use App\Http\Requests\User\UpdateUserRequest;
use App\Models\User;
use App\Services\UserService;
use Illuminate\Http\JsonResponse;

class UserController extends Controller
{
    public function __construct(private readonly UserService $userService) {}

    public function index(): JsonResponse
    {
        $users = User::all();

        return response()->json($users);
    }

    public function show(string $id): JsonResponse
    {
        $user = User::findOneOrFail($id);

        return response()->json($user);
    }


    public function store(StoreUserRequest $request): JsonResponse
    {
        $user = $this->userService->storeUser($request);

        return response()->json($user, 201);
    }

    public function update(UpdateUserRequest $request, string $id): JsonResponse
    {
        /** @var User $user */
        $user = User::findOneOrFail($id);

        $this->userService->updateUser($request, $user);

        return response()->json($user);
    }

    public function destroy($id): JsonResponse
    {
        $user = User::findOneOrFail($id);
        $user->delete();

        return response()->json(['message' => 'User deleted successfully']);
    }
}
