<?php

declare(strict_types=1);

use App\Enums\PostTag;
use App\Models\Eloquent\User;
use App\Models\Mongo\Post;

function rosterPost(User $author, PostTag $tag = PostTag::Happy): Post
{
    return Post::create([
        'authorId' => $author->id,
        'authorName' => $author->first_name,
        'content' => 'A dog found his family today.',
        'tags' => [$tag->value],
    ]);
}

it('lists the people who liked a post, most recent first', function (): void {
    $post = rosterPost(User::factory()->create());
    $first = User::factory()->create([
        'first_name' => 'Ada',
    ]);
    $second = User::factory()->create([
        'first_name' => 'Grace',
    ]);

    $this->actingAs($first)
        ->postJson("/api/posts/{$post->id}/like");
    $this->actingAs($second)
        ->postJson("/api/posts/{$post->id}/like");

    $this->actingAs(User::factory()->create())
        ->getJson("/api/posts/{$post->id}/likes")
        ->assertOk()
        // `$addToSet` appends, so the stored set reads oldest-first; a roster
        // is more useful newest-first, like every other list in the app.
        ->assertJsonPath('data.0.id', $second->id)
        ->assertJsonPath('data.1.id', $first->id);
});

it('carries what a person row renders', function (): void {
    $post = rosterPost(User::factory()->create());
    $liker = User::factory()->create();

    $this->actingAs($liker)
        ->postJson("/api/posts/{$post->id}/like");

    $this->actingAs(User::factory()->create())
        ->getJson("/api/posts/{$post->id}/likes")
        ->assertOk()
        // The dialog reuses PersonRow, which needs the follow flag and the
        // counts or it renders a button that lies.
        ->assertJsonPath('data.0.is_following', false)
        ->assertJsonStructure([
            'data' => [['id', 'first_name', 'last_name', 'is_following', 'stats']],
        ]);
});

it('knows which likers the reader already follows', function (): void {
    $post = rosterPost(User::factory()->create());
    $viewer = User::factory()->create();
    $followed = User::factory()->create();

    $this->actingAs($followed)
        ->postJson("/api/posts/{$post->id}/like");
    $viewer->following()
        ->attach($followed->id);

    $this->actingAs($viewer)
        ->getJson("/api/posts/{$post->id}/likes")
        ->assertOk()
        ->assertJsonPath('data.0.is_following', true);
});

it('pages a long roster', function (): void {
    $post = rosterPost(User::factory()->create());

    foreach (User::factory()->count(7)->create() as $liker) {
        $this->actingAs($liker)
            ->postJson("/api/posts/{$post->id}/like");
    }

    $response = $this->actingAs(User::factory()->create())
        ->getJson("/api/posts/{$post->id}/likes?per_page=3")
        ->assertOk();

    expect($response->json('meta.total'))
        ->toBe(7)
        ->and($response->json('meta.last_page'))
        ->toBe(3)
        ->and($response->json('data'))
        ->toHaveCount(3);

    $this->actingAs(User::factory()->create())
        ->getJson("/api/posts/{$post->id}/likes?per_page=3&page=3")
        ->assertOk()
        ->assertJsonCount(1, 'data');
});

it('answers an empty list for a post nobody has liked', function (): void {
    $post = rosterPost(User::factory()->create());

    $this->actingAs(User::factory()->create())
        ->getJson("/api/posts/{$post->id}/likes")
        ->assertOk()
        ->assertJsonCount(0, 'data')
        ->assertJsonPath('meta.total', 0);
});

it('serves the roster on a heartbreaking post too', function (): void {
    // All three tones get the roster; only the wording differs, and that is the
    // client's business.
    $post = rosterPost(User::factory()->create(), PostTag::Heartbreaking);
    $liker = User::factory()->create();

    $this->actingAs($liker)
        ->postJson("/api/posts/{$post->id}/like");

    $this->actingAs(User::factory()->create())
        ->getJson("/api/posts/{$post->id}/likes")
        ->assertOk()
        ->assertJsonPath('data.0.id', $liker->id);
});

it('skips a liker whose account is gone', function (): void {
    // The set holds ids, not references, so a deleted account leaves one
    // behind. It must drop out of the roster rather than 500 the request.
    $post = rosterPost(User::factory()->create());
    $staying = User::factory()->create();
    $leaving = User::factory()->create();

    $this->actingAs($staying)
        ->postJson("/api/posts/{$post->id}/like");
    $this->actingAs($leaving)
        ->postJson("/api/posts/{$post->id}/like");
    $leaving->delete();

    $this->actingAs(User::factory()->create())
        ->getJson("/api/posts/{$post->id}/likes")
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $staying->id);
});

it('requires authentication', function (): void {
    $post = rosterPost(User::factory()->create());

    $this->getJson("/api/posts/{$post->id}/likes")
        ->assertUnauthorized();
});

it('is reachable by a non-admin', function (): void {
    $post = rosterPost(User::factory()->create());
    $viewer = User::factory()->create();

    expect($viewer->isAdmin())
        ->toBeFalse();

    $this->actingAs($viewer)
        ->getJson("/api/posts/{$post->id}/likes")
        ->assertOk();
});

it('404s on a post that does not exist', function (): void {
    $this->actingAs(User::factory()->create())
        ->getJson('/api/posts/2b1f4c9e-0000-4000-8000-000000000000/likes')
        ->assertNotFound();
});
