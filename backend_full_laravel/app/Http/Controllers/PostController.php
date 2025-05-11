<?php

namespace App\Http\Controllers;

use App\Models\Post;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;

class PostController extends Controller
{
    public function index(): Collection
    {
        return Post::all();
    }

    public function store(): JsonResponse
    {
        $post = new Post;
        $post->title = 'Fourth Post';
        $post->author = 'Alan Turing';
        $post->content = 'Saved using save() method.';
        $post->createdAt = now();
        $post->tags = ['history', 'cs'];
        $post->save();

        return response()->json($post);
    }
}
