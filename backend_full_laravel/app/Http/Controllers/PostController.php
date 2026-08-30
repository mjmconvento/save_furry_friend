<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Post\IndexPostLikeRequest;
use App\Http\Requests\Post\IndexPostRequest;
use App\Http\Requests\Post\StorePostRequest;
use App\Http\Requests\Post\UpdatePostRequest;
use App\Http\Resources\PostResource;
use App\Http\Resources\UserResource;
use App\Models\Eloquent\User;
use App\Models\Mongo\Post;
use App\Services\PostService;
use App\Services\User\FollowService;
use App\Services\User\UserService;
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
        private readonly PostService $postService,
        private readonly FollowService $followService,
        private readonly UserService $userService,
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

    /**
     * Liking is idempotent and needs no policy: `show` lets any authenticated
     * reader read any post, so gating the like harder than the post itself
     * would be theatre. Authors may like their own posts - there is no rule
     * against it, so there is no surprise when it works.
     *
     * Returns the whole post rather than a bare count so the SPA can trust one
     * shape everywhere and never has to reconcile two.
     */
    public function like(Request $request, Post $post): PostResource
    {
        /** @var User $viewer */
        $viewer = $request->user();

        $this->postService->like($post, $viewer);
        $this->postService->attachAuthorAvatars([$post]);

        return new PostResource($post);
    }

    public function unlike(Request $request, Post $post): PostResource
    {
        /** @var User $viewer */
        $viewer = $request->user();

        $this->postService->unlike($post, $viewer);
        $this->postService->attachAuthorAvatars([$post]);

        return new PostResource($post);
    }

    /**
     * Who liked a post, for the roster dialog behind the count.
     *
     * Its own endpoint rather than a field on the post: a feed page carries
     * twenty posts, and inlining every roster would ship a lot of bytes for
     * something most readers never open. The count stays on the post; the
     * names load when somebody asks.
     *
     * Served on all three tones - only the wording differs, and that is the
     * client's business.
     */
    public function likes(IndexPostLikeRequest $request, Post $post): AnonymousResourceCollection
    {
        /** @var User $viewer */
        $viewer = $request->user();

        $likers = $this->postService->likers(
            $post,
            $request->integer('per_page') ?: 20,
            $request->integer('page') ?: 1,
        );

        // Same hydration the follow lists do, because the dialog renders the
        // same PersonRow: without these the follow button would lie and the
        // counts would be blank.
        $items = $likers->items();
        $this->followService->attachViewerFollows($items, $viewer);
        $this->userService->attachBulkProfileStats($items);

        return UserResource::collection($likers);
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
