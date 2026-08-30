<?php

declare(strict_types=1);

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\IndexFollowRequest;
use App\Http\Resources\UserResource;
use App\Models\Eloquent\User;
use App\Services\User\FollowService;
use App\Services\User\UserService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\ValidationException;

class FollowController extends Controller
{
    public function __construct(
        private readonly FollowService $followService,
        private readonly UserService $userService,
    ) {
    }

    /**
     * @throws ValidationException
     */
    public function follow(User $user): JsonResponse
    {
        $this->followService->follow($user);

        return response()->json([
            'message' => 'Followed successfully.',
            'following_id' => $user->id,
        ]);
    }

    /**
     * @throws ValidationException
     */
    public function unfollow(User $user): JsonResponse
    {
        $this->followService->unfollow($user);

        return response()->json([
            'message' => 'Unfollowed successfully.',
            'unfollowed_id' => $user->id,
        ]);
    }

    /**
     * People who follow this account.
     */
    public function followers(IndexFollowRequest $request, User $user): AnonymousResourceCollection
    {
        return $this->people(
            $request,
            $this->followService->followers($user, $this->perPage($request))
        );
    }

    /**
     * People this account follows.
     */
    public function following(IndexFollowRequest $request, User $user): AnonymousResourceCollection
    {
        return $this->people(
            $request,
            $this->followService->following($user, $this->perPage($request))
        );
    }

    /**
     * Who to follow: the most prolific authors the viewer does not follow yet.
     *
     * Not paginated. It is a short prompt, not a directory - "load more
     * suggestions" is a browsing surface nobody asked for.
     */
    public function suggestions(Request $request): AnonymousResourceCollection
    {
        /** @var User $viewer */
        $viewer = $request->user();

        $suggested = $this->userService->suggestions($viewer);

        // Everyone here is by definition not followed, but the flag is hydrated
        // anyway so a Follow button flipping to Unfollow needs no special case.
        $this->followService->attachViewerFollows($suggested, $viewer);
        // The post count is the reason each row is on the list, so it ships with
        // the row rather than making the SPA ask.
        $this->userService->attachBulkProfileStats($suggested);

        return UserResource::collection($suggested);
    }

    /**
     * The discover directory: every account the viewer does not follow yet,
     * paginated, most-active-first.
     *
     * Distinct from `suggestions` on purpose. That one is a five-second prompt
     * with a deliberate cap; this is the surface somebody opens to browse, so
     * it pages and it includes members who have not posted yet.
     */
    public function discover(IndexFollowRequest $request): AnonymousResourceCollection
    {
        /** @var User $viewer */
        $viewer = $request->user();

        return $this->people($request, $this->userService->discoverable(
            $viewer,
            $this->perPage($request),
            $request->integer('page') ?: 1,
        ));
    }

    /**
     * Both list endpoints answer the same shape: a page of people, each carrying
     * whether the viewer follows them and the counts a row displays.
     *
     * @param LengthAwarePaginator<int, User> $people
     */
    private function people(Request $request, LengthAwarePaginator $people): AnonymousResourceCollection
    {
        /** @var User $viewer */
        $viewer = $request->user();
        $items = $people->items();

        $this->followService->attachViewerFollows($items, $viewer);
        $this->userService->attachBulkProfileStats($items);

        return UserResource::collection($people);
    }

    private function perPage(IndexFollowRequest $request): int
    {
        return $request->integer('per_page') ?: 20;
    }
}
