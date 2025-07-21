<?php

use App\Http\Requests\Post\UpdatePostRequest;
use App\Models\Mongo\Post;
use App\Services\PostService;

it('calls update on post with correct data', function (): void {
    $postMock = mock(Post::class);

    $postMock->shouldReceive('update')
        ->once()
        ->with([
            'title' => 'New Title',
            'content' => 'New Content',
            'tags' => ['new', 'tags']
        ]);

    $requestMock = mock(UpdatePostRequest::class);
    $requestMock->shouldReceive('only')
        ->once()
        ->with(['title', 'content', 'tags'])
        ->andReturn([
            'title' => 'New Title',
            'content' => 'New Content',
            'tags' => ['new', 'tags']
        ]);

    $service = new PostService();
    $service->updatePost($requestMock, $postMock);
});
