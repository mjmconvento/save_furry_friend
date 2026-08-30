<?php

declare(strict_types=1);

use App\Enums\PostTag;
use App\Models\Eloquent\User;
use App\Models\Mongo\Post;

function likeablePost(User $author): Post
{
    return Post::create([
        'authorId' => $author->id,
        'authorName' => $author->first_name,
        'content' => 'A dog found his family today.',
        'tags' => [PostTag::Happy->value],
    ]);
}

it('records a like and reports the new count', function (): void {
    $author = User::factory()->create();
    $post = likeablePost($author);

    $this->actingAs(User::factory()->create())
        ->postJson("/api/posts/{$post->id}/like")
        ->assertOk()
        ->assertJsonPath('data.likeCount', 1)
        ->assertJsonPath('data.likedByViewer', true);
});

it('counts one like however many times the button is pressed', function (): void {
    // The toggle is an atomic $addToSet, not a read-modify-write: a double tap
    // or two tabs must not be able to like the same post twice.
    $post = likeablePost(User::factory()->create());
    $viewer = User::factory()->create();

    $this->actingAs($viewer)
        ->postJson("/api/posts/{$post->id}/like");
    $this->actingAs($viewer)
        ->postJson("/api/posts/{$post->id}/like")
        ->assertOk()
        ->assertJsonPath('data.likeCount', 1);
});

it('removes a like, and stays removed', function (): void {
    $post = likeablePost(User::factory()->create());
    $viewer = User::factory()->create();

    $this->actingAs($viewer)
        ->postJson("/api/posts/{$post->id}/like");

    $this->actingAs($viewer)
        ->deleteJson("/api/posts/{$post->id}/like")
        ->assertOk()
        ->assertJsonPath('data.likeCount', 0)
        ->assertJsonPath('data.likedByViewer', false);

    $this->actingAs($viewer)
        ->deleteJson("/api/posts/{$post->id}/like")
        ->assertOk()
        ->assertJsonPath('data.likeCount', 0);
});

it('answers likedByViewer per reader, not globally', function (): void {
    $post = likeablePost(User::factory()->create());
    $liker = User::factory()->create();
    $bystander = User::factory()->create();

    $this->actingAs($liker)
        ->postJson("/api/posts/{$post->id}/like");

    $this->actingAs($bystander)
        ->getJson("/api/posts/{$post->id}")
        ->assertOk()
        ->assertJsonPath('data.likeCount', 1)
        // Somebody liked it; this reader did not.
        ->assertJsonPath('data.likedByViewer', false);
});

it('never says who liked a post', function (): void {
    $post = likeablePost(User::factory()->create());
    $liker = User::factory()->create();

    $this->actingAs($liker)
        ->postJson("/api/posts/{$post->id}/like");

    $response = $this->actingAs(User::factory()->create())
        ->getJson("/api/posts/{$post->id}")
        ->assertOk();

    // The count is public, the roster is not: nothing in the payload should
    // let a reader enumerate who liked what.
    expect($response->json('data'))
        ->not->toHaveKey('likes')
        ->and($response->getContent())
        ->not->toContain($liker->id);
});

it('carries the counts on every post in a feed', function (): void {
    $viewer = User::factory()->create();
    $post = likeablePost($viewer);

    $this->actingAs($viewer)
        ->postJson("/api/posts/{$post->id}/like");

    $this->actingAs($viewer)
        ->getJson('/api/posts')
        ->assertOk()
        ->assertJsonPath('data.0.likeCount', 1)
        ->assertJsonPath('data.0.likedByViewer', true);
});

it('reports zero for a post nobody has liked', function (): void {
    // Absent field, not an empty array, in every document written before this
    // feature existed.
    $viewer = User::factory()->create();
    $post = likeablePost($viewer);

    $this->actingAs($viewer)
        ->getJson("/api/posts/{$post->id}")
        ->assertOk()
        ->assertJsonPath('data.likeCount', 0)
        ->assertJsonPath('data.likedByViewer', false);
});

it('lets an author like their own post', function (): void {
    // No rule against it, so no surprise when it works.
    $author = User::factory()->create();
    $post = likeablePost($author);

    $this->actingAs($author)
        ->postJson("/api/posts/{$post->id}/like")
        ->assertOk()
        ->assertJsonPath('data.likeCount', 1);
});

it('requires authentication', function (): void {
    $post = likeablePost(User::factory()->create());

    $this->postJson("/api/posts/{$post->id}/like")
        ->assertUnauthorized();
    $this->deleteJson("/api/posts/{$post->id}/like")
        ->assertUnauthorized();
});

it('404s on a post that does not exist', function (): void {
    $this->actingAs(User::factory()->create())
        ->postJson('/api/posts/2b1f4c9e-0000-4000-8000-000000000000/like')
        ->assertNotFound();
});
