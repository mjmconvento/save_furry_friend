<?php

namespace App\Services;

use App\Http\Requests\Post\StorePostRequest;
use App\Http\Requests\Post\UpdatePostRequest;
use App\Models\Post;

class PostService
{
    public function storePost(StorePostRequest $request): Post
    {
        $post = new Post;
        $post->title = $request->get('title');
        $post->author = $request->get('author');
        $post->content = $request->get('content');
        $post->createdAt = now();
        $post->tags = $request->get('tags');
        $post->save();

        return $post;
    }

    public function updatePost(UpdatePostRequest $request, Post $post): void
    {
        $post->update($request->only(['title', 'author', 'content', 'tags']));
    }
}
