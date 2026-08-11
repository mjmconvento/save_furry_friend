<?php

declare(strict_types=1);

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\Eloquent\User;
use App\Services\User\FollowService;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

class FollowController extends Controller
{
    public function __construct(
        private readonly FollowService $followService
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
}
