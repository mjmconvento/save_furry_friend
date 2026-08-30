<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Post\IndexCommentRequest;
use App\Http\Requests\Post\StoreCommentRequest;
use App\Http\Resources\CommentResource;
use App\Models\Eloquent\User;
use App\Models\Mongo\Comment;
use App\Models\Mongo\Post;
use App\Services\CommentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CommentController extends Controller
{
    public function __construct(
        private readonly CommentService $commentService
    ) {
    }

    public function index(IndexCommentRequest $request, Post $post): AnonymousResourceCollection
    {
        return CommentResource::collection($this->commentService->forPost(
            $post,
            $request->integer('per_page') ?: 20,
            $request->integer('page') ?: 1,
        ));
    }

    public function store(StoreCommentRequest $request, Post $post): JsonResponse
    {
        /** @var User $author */
        $author = $request->user();

        /** @var string $content */
        $content = $request->validated('content');

        $comment = $this->commentService->store($post, $author, $content);

        return (new CommentResource($comment))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Bound to the comment alone, so `CommentPolicy` looks the post up itself
     * to decide whether the caller owns the story this hangs off.
     */
    public function destroy(Comment $comment): JsonResponse
    {
        $this->authorize('delete', $comment);

        $comment->delete();

        return response()->json([
            'message' => 'Comment deleted successfully',
        ]);
    }
}
