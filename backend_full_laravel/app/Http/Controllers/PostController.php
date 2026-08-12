<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Post\IndexPostRequest;
use App\Http\Requests\Post\StorePostRequest;
use App\Http\Requests\Post\UpdatePostRequest;
use App\Http\Resources\PostResource;
use App\Models\Eloquent\User;
use App\Models\Mongo\Post;
use App\Services\PostService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PostController extends Controller
{
    public function __construct(
        private readonly PostService $postService
    ) {
    }

    public function index(IndexPostRequest $request): AnonymousResourceCollection
    {
        /** @var User $viewer */
        $viewer = $request->user();

        /** @var array{tags?: array<string>, authorId?: string, per_page?: numeric-string|int} $filters */
        $filters = $request->validated();

        $posts = $this->postService->getPosts(
            $viewer,
            $filters['tags'] ?? null,
            $filters['authorId'] ?? null,
            // Query-string input stays a string even after the `integer` rule.
            (int) ($filters['per_page'] ?? 20),
        );

        // Without this the `links.next` URL drops the filters and page 2 is a
        // different query than page 1.
        return PostResource::collection($posts->appends($filters));
    }

    /**
     * Today's post count per tone, for the home page.
     *
     * `date` travels with the counts because "today" is midnight in the API's
     * timezone, not the browser's: without it the client would caption someone
     * else's day as its own.
     */
    public function summary(Request $request): JsonResponse
    {
        /** @var User $viewer */
        $viewer = $request->user();

        $today = now();

        return response()->json([
            'data' => [
                'date' => $today->toDateString(),
                'counts' => $this->postService->countTodayByTone($viewer, $today),
            ],
        ]);
    }

    public function show(Post $post): PostResource
    {
        return new PostResource($post);
    }

    public function store(StorePostRequest $request): PostResource
    {
        /** @var User $author */
        $author = $request->user();

        return new PostResource($this->postService->storePost($request, $author));
    }

    public function update(UpdatePostRequest $request, Post $post): PostResource
    {
        $this->authorize('update', $post);

        $this->postService->updatePost($request, $post);

        return new PostResource($post);
    }

    public function destroy(Post $post): JsonResponse
    {
        $this->authorize('delete', $post);

        $this->postService->deletePost($post);

        return response()->json([
            'message' => 'Post deleted successfully',
        ]);
    }
}
