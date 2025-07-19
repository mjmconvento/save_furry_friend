<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\StoreUserRequest;
use App\Http\Requests\User\UpdateUserRequest;
use App\Models\Eloquent\User;
use App\Services\User\UserService;
use Illuminate\Auth\AuthManager;
use Illuminate\Auth\TokenGuard;
use Illuminate\Database\Query\Builder;
use Illuminate\Database\Query\JoinClause;
use Illuminate\Http\JsonResponse;

class UserController extends Controller
{
    public function __construct(private readonly UserService $userService)
    {
    }

    public function index(): JsonResponse
    {
        $users = User::all();

        return response()->json($users);
    }

    public function show(string $id): JsonResponse
    {
        return response()->json(
            $this->userService->getUser($id)
        );
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $user = $this->userService->storeUser($request);

        return response()->json($user, 201);
    }

    public function update(UpdateUserRequest $request, string $id): JsonResponse
    {
        $user = User::findOneOrFail($id);

        $this->userService->updateUser($request, $user);

        return response()->json($user);
    }

    public function destroy(string $id): JsonResponse
    {
        $user = User::findOneOrFail($id);
        $user->delete();

        return response()->json(['message' => 'User deleted successfully']);
    }

    public function search(string $keyword): JsonResponse
    {
        /** @var AuthManager $auth */
        $auth = auth();

        /** @var User $authUser */
        $authUser = $auth->user();

        $users = User::query()
            ->leftJoin('user_followers as uf', function (JoinClause $join) use ($authUser): void {
                $join->on('users.id', '=', 'uf.followed_id')
                    ->where('uf.follower_id', '=', $authUser->id);
            })
            ->where('users.id', '!=', $authUser->id)
            ->where(function (Builder $query) use ($keyword): void {
                $query->whereRaw('LOWER(first_name) LIKE ?', ["%" . strtolower($keyword) . "%"])
                    ->orWhereRaw('LOWER(middle_name) LIKE ?', ["%" . strtolower($keyword) . "%"])
                    ->orWhereRaw('LOWER(last_name) LIKE ?', ["%" . strtolower($keyword) . "%"]);
            })
            ->orderByRaw('uf.follower_id IS NULL')
            ->select('users.*')
            ->get();

        return response()->json($users);
    }
}
