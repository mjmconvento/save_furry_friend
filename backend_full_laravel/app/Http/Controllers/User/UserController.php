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
    /**
     * Verbatim from the `users_names_trgm` index in
     * `2026_08_11_100000_add_query_indexes`. Changing the expression - even to
     * tidy the double space a null middle name leaves - orphans that index and
     * turns every search into a sequential scan, so it is matched exactly and
     * the words are separated in PHP instead.
     */
    private const FULL_NAME_SQL = "(first_name || ' ' || coalesce(middle_name, '') || ' ' || last_name)";

    private const MAX_SEARCH_WORDS = 5;

    private const SEARCH_LIMIT = 10;

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

    /**
     * The profile page: the only place that pays for the counts.
     */
    public function show(User $user): UserResource
    {
        return new UserResource(
            $user,
            $this->userService->isFollowing($this->authUser(), $user),
            $this->userService->profileStats($user),
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

    /**
     * People search, matched a word at a time.
     *
     * One `ILIKE '%keyword%'` over the joined name looked reasonable and was
     * wrong twice: "Daniel Okafor" missed `Daniel Chukwu Okafor`, because the
     * middle name breaks contiguity, and "Marisol Vega" missed `Marisol  Vega`,
     * because a null middle name leaves two spaces. Requiring every word
     * separately fixes both, and matches a surname typed first as a bonus.
     */
    public function search(string $keyword): AnonymousResourceCollection
    {
        $authUser = $this->authUser();
        $words = preg_split('/\s+/', trim($keyword), -1, PREG_SPLIT_NO_EMPTY);

        // A keyword of nothing but whitespace must not degrade into "everyone".
        if ($words === false || $words === []) {
            return UserResource::collection([]);
        }

        $query = User::query()
            ->leftJoin('user_followers as uf', function (JoinClause $join) use ($authUser): void {
                $join->on('users.id', '=', 'uf.followed_id')
                    ->where('uf.follower_id', '=', $authUser->id);
            })
            ->where('users.id', '!=', $authUser->id);

        // Capped: each word is another index scan, and nobody searches by essay.
        foreach (array_slice($words, 0, self::MAX_SEARCH_WORDS) as $word) {
            $query->whereRaw(self::FULL_NAME_SQL . ' ILIKE ?', ['%' . $word . '%']);
        }

        $users = $query->orderByRaw('uf.follower_id IS NULL')
            ->select('users.*')
            // The SPA renders these in a dropdown; an unbounded list is a
            // scrollbar nobody reads.
            ->limit(self::SEARCH_LIMIT)
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
