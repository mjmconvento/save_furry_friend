<?php

declare(strict_types=1);

use App\Models\Eloquent\User;
use App\Models\Mongo\Post;

function makePost(User $author, string $content, string $tag = 'happy_post'): Post
{
    return Post::create([
        'authorId' => $author->id,
        'authorName' => "{$author->first_name} {$author->last_name}",
        'content' => $content,
        'tags' => [$tag],
    ]);
}

it('returns a paginated envelope rather than a bare array', function (): void {
    $user = User::factory()->create();
    makePost($user, 'mine');

    $this->actingAs($user)
        ->getJson('/api/posts?tags[]=happy_post')
        ->assertOk()
        ->assertJsonStructure([
            'data' => [['id', 'authorId', 'authorName', 'content', 'tags', 'medias', 'createdAt']],
            'links',
            'meta',
        ]);
});

it('scopes the untagged feed to the follow graph instead of returning everything', function (): void {
    // BE-07: the untagged branch used to short-circuit to Post::all().
    $viewer = User::factory()->create();
    $followed = User::factory()->create();
    $stranger = User::factory()->create();

    $viewer->following()
        ->attach($followed->id, [
            'created_at' => now(),
        ]);

    makePost($viewer, 'my own post');
    makePost($followed, 'a followed post');
    makePost($stranger, 'a stranger post');

    $contents = $this->actingAs($viewer)
        ->getJson('/api/posts')
        ->assertOk()
        ->json('data.*.content');

    expect($contents)
        ->toContain('my own post')
        ->and($contents)
        ->toContain('a followed post')
        ->and($contents)
        ->not->toContain('a stranger post');
});

it('scopes the tagged feed the same way', function (): void {
    $viewer = User::factory()->create();
    $stranger = User::factory()->create();

    makePost($viewer, 'mine');
    makePost($stranger, 'theirs');

    $contents = $this->actingAs($viewer)
        ->getJson('/api/posts?tags[]=happy_post')
        ->json('data.*.content');

    expect($contents)
        ->toBe(['mine']);
});

it('filters by tag', function (): void {
    $user = User::factory()->create();
    makePost($user, 'happy one', 'happy_post');
    makePost($user, 'sad one', 'heartbreaking_post');

    expect($this->actingAs($user)->getJson('/api/posts?tags[]=heartbreaking_post')->json('data.*.content'))
        ->toBe(['sad one']);
});

it('rejects query parameters that are not valid', function (): void {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->getJson('/api/posts?per_page=51')
        ->assertStatus(422);
    $this->actingAs($user)
        ->getJson('/api/posts?authorId=not-a-uuid')
        ->assertStatus(422);
    $this->actingAs($user)
        ->getJson('/api/posts?tags=cats')
        ->assertStatus(422);
});

it('honours per_page', function (): void {
    $user = User::factory()->create();
    makePost($user, 'one');
    makePost($user, 'two');
    makePost($user, 'three');

    expect($this->actingAs($user)->getJson('/api/posts?per_page=2')->json('data'))
        ->toHaveCount(2);
});

it('ignores a title on update because a post has no such attribute', function (): void {
    // BE-16: updatePost used $request->only(['title', ...]) and the model
    // silently discarded it. Now only validated keys reach the model.
    $user = User::factory()->create();
    $post = makePost($user, 'original');

    $this->actingAs($user)
        ->putJson("/api/posts/{$post->id}", [
            'title' => 'nope',
            'content' => 'updated',
        ])
        ->assertOk();

    $fresh = Post::find($post->id);

    expect($fresh->content)
        ->toBe('updated')
        ->and($fresh->getAttributes())
        ->not->toHaveKey('title');
});

it('exposes createdAt as an iso string and no legacy timestamp keys', function (): void {
    // BE-11: documents used to carry createdAt AND created_at AND updated_at.
    $user = User::factory()->create();
    $post = makePost($user, 'timestamped');

    $createdAt = $this->actingAs($user)
        ->getJson("/api/posts/{$post->id}")
        ->assertOk()
        ->json('data.createdAt');

    expect($createdAt)
        ->toBeString()
        ->and(Post::find($post->id)->getAttributes())
        ->not->toHaveKey('created_at')
        ->not->toHaveKey('updated_at');
});
