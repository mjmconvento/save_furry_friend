<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Services\User\FollowService;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

class FollowController extends Controller
{
    public function __construct(private readonly FollowService $followService)
    {
    }

    /**
     * @throws ValidationException
     */
    public function follow(string $id): JsonResponse
    {
        return $this->followService->follow($id);
    }

    /**
     * @throws ValidationException
     */
    public function unfollow(string $id): JsonResponse
    {
        return $this->followService->unfollow($id);
    }
}
