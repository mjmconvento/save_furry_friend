<?php

declare(strict_types=1);

use App\Models\Eloquent\User;
use App\Models\Mongo\Post;

it('forbids editing another user\'s post', function (): void {
    $owner = User::factory()->create();
    $intruder = User::factory()->create();
    $post = Post::create([
        'authorId' => $owner->id,
        'authorName' => 'Owner',
        'content' => 'mine',
        'tags' => ['happy_post'],
    ]);

    $this->actingAs($intruder)
        ->putJson("/api/posts/{$post->id}", [
            'content' => 'hijacked',
        ])
        ->assertForbidden();

    expect(Post::find($post->id)->content)->toBe('mine');
});

it('forbids deleting another user\'s post', function (): void {
    $owner = User::factory()->create();
    $intruder = User::factory()->create();
    $post = Post::create([
        'authorId' => $owner->id,
        'authorName' => 'Owner',
        'content' => 'mine',
        'tags' => ['happy_post'],
    ]);

    $this->actingAs($intruder)
        ->deleteJson("/api/posts/{$post->id}")
        ->assertForbidden();

    expect(Post::find($post->id))->not->toBeNull();
});

it('lets the author edit their own post', function (): void {
    $owner = User::factory()->create();
    $post = Post::create([
        'authorId' => $owner->id,
        'authorName' => 'Owner',
        'content' => 'mine',
        'tags' => ['happy_post'],
    ]);

    $this->actingAs($owner)
        ->putJson("/api/posts/{$post->id}", [
            'content' => 'edited',
        ])
        ->assertOk();

    expect(Post::find($post->id)->content)->toBe('edited');
});

it('forbids deleting another user\'s account', function (): void {
    $victim = User::factory()->create();
    $intruder = User::factory()->create();

    $this->actingAs($intruder)
        ->deleteJson("/api/users/{$victim->id}")
        ->assertForbidden();

    expect(User::find($victim->id))->not->toBeNull();
});

it('forbids updating another user\'s account', function (): void {
    $victim = User::factory()->create([
        'email' => 'victim@b.test',
    ]);
    $intruder = User::factory()->create();

    $this->actingAs($intruder)
        ->putJson("/api/users/{$victim->id}", [
            'email' => 'stolen@b.test',
        ])
        ->assertForbidden();

    expect(User::find($victim->id)->email)->toBe('victim@b.test');
});

it('returns 404 for a post that does not exist', function (): void {
    $this->actingAs(User::factory()->create())
        ->getJson('/api/posts/' . fake()->uuid())
        ->assertStatus(404);
});
