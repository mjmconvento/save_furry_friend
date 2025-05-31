<?php

namespace App\Http\Controllers;

use App\Http\Requests\Post\StorePostRequest;
use App\Http\Requests\Post\UpdatePostRequest;
use App\Models\Post;
use App\Services\PostService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class PostController extends Controller
{
    public function __construct(private readonly PostService $postService) {}

    public function index(): Collection
    {
        $tags = request()->query('tags');
        if (is_null($tags)) {
            return Post::all();
        }

        return Post::whereRaw(['tags' => ['$in' => $tags]])
            ->orderBy('createdAt', 'desc')
            ->get();
    }

    public function show(string $id): JsonResponse
    {
        $post = Post::findOneOrFail($id);

        return response()->json($post);
    }

    public function store(StorePostRequest $request): JsonResponse
    {
        $post =  $this->postService->storePost($request);

        return response()->json($post);
    }

    public function update(UpdatePostRequest $request, string $id): JsonResponse
    {
        /** @var Post $post */
        $post = Post::findOneOrFail($id);

        $this->postService->updatePost($request, $post);

        return response()->json($post);
    }

    public function destroy($id): JsonResponse
    {
        $post = Post::findOneOrFail($id);
        $post->delete();

        return response()->json(['message' => 'Post deleted successfully']);
    }
}
