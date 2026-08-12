<?php

declare(strict_types=1);

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\IndexUserRequest;
use App\Http\Requests\User\StoreUserRequest;
use App\Http\Requests\User\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\Eloquent\User;
use App\Services\User\UserService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthManager;
use Illuminate\Database\Query\JoinClause;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class UserController extends Controller
{
    public function __construct(
        private readonly UserService $userService
    ) {
    }

    /**
     * Admin-only. The check lives in `IndexUserRequest::authorize()`, which runs
     * before validation; the same is true of `store` and `update`. Only
     * `destroy` authorizes here, because it has no request class.
     */
    public function index(IndexUserRequest $request): AnonymousResourceCollection
    {
        $perPage = $request->integer('per_page') ?: 20;

        return UserResource::collection(
            User::query()->orderBy('first_name')->paginate($perPage)
        );
    }

    public function show(User $user): UserResource
    {
        return new UserResource(
            $user,
            $this->userService->isFollowing($this->authUser(), $user)
        );
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $user = $this->userService->storeUser($request);

        return (new UserResource($user))
            ->response()
            ->setStatusCode(201);
    }

    public function update(UpdateUserRequest $request, User $user): UserResource
    {
        $this->userService->updateUser($request, $user);

        return new UserResource($user);
    }

    /**
     * @throws AuthorizationException
     */
    public function destroy(User $user): JsonResponse
    {
        $this->authorize('delete', User::class);

        $this->userService->destroyUser($user);

        return response()->json([
            'message' => 'User deleted successfully',
        ]);
    }

    public function search(string $keyword): AnonymousResourceCollection
    {
        $authUser = $this->authUser();

        $users = User::query()
            ->leftJoin('user_followers as uf', function (JoinClause $join) use ($authUser): void {
                $join->on('users.id', '=', 'uf.followed_id')
                    ->where('uf.follower_id', '=', $authUser->id);
            })
            ->where('users.id', '!=', $authUser->id)
            ->whereRaw(
                "(first_name || ' ' || coalesce(middle_name, '') || ' ' || last_name) ILIKE ?",
                ['%' . $keyword . '%']
            )
            ->orderByRaw('uf.follower_id IS NULL')
            ->select('users.*')
            ->get();

        return UserResource::collection($users);
    }

    private function authUser(): User
    {
        /** @var AuthManager $auth */
        $auth = auth();

        /** @var User $user */
        $user = $auth->user();

        return $user;
    }
}
