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
    /**
     * Days the home page summary spans, counting today. The endpoint reports the
     * dates it used, so a change here needs no client change.
     */
    public const SUMMARY_DAYS = 7;

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
     * Post counts per tone over the last week, for the home page.
     *
     * A **rolling** seven days rather than a calendar week: Monday to Sunday
     * would collapse to near-zero every Monday morning, which is the emptiness a
     * single day already suffered from.
     *
     * `from` and `to` travel with the counts because the window is bounded by
     * midnight in the API's timezone, not the browser's: without them the client
     * would caption someone else's week as its own.
     */
    public function summary(Request $request): JsonResponse
    {
        /** @var User $viewer */
        $viewer = $request->user();

        $to = now();
        // Inclusive of both ends, so `SUMMARY_DAYS` days are counted rather than
        // one more than that.
        $from = $to->copy()
            ->subDays(self::SUMMARY_DAYS - 1);

        return response()->json([
            'data' => [
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
                'counts' => $this->postService->countByTone($viewer, $from, $to),
            ],
        ]);
    }

    public function show(Post $post): PostResource
    {
        $this->postService->attachAuthorAvatars([$post]);

        return new PostResource($post);
    }

    public function store(StorePostRequest $request): PostResource
    {
        /** @var User $author */
        $author = $request->user();

        $post = $this->postService->storePost($request, $author);
        $this->postService->attachAuthorAvatars([$post]);

        return new PostResource($post);
    }

    public function update(UpdatePostRequest $request, Post $post): PostResource
    {
        $this->authorize('update', $post);

        $this->postService->updatePost($request, $post);
        // After the save, never before: the attribute is not persisted, and
        // hydrating first would write it into the document.
        $this->postService->attachAuthorAvatars([$post]);

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
