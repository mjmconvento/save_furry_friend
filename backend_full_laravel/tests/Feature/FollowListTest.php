<?php

declare(strict_types=1);

use App\Enums\PostTag;
use App\Models\Eloquent\User;
use App\Models\Mongo\Post;

$postsFor = static function (User $author, int $count): void {
    foreach (range(1, $count) as $ignored) {
        Post::create([
            'authorId' => $author->id,
            'authorName' => $author->first_name,
            'content' => 'sample',
            'tags' => [PostTag::Happy->value],
        ]);
    }
};

it('lists the people who follow an account', function (): void {
    $subject = User::factory()->create();
    $follower = User::factory()->create();

    $follower->following()
        ->attach($subject->id, [
            'created_at' => now(),
        ]);

    $this->actingAs(User::factory()->create())
        ->getJson("/api/users/{$subject->id}/followers")
        ->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.id', $follower->id);
});

it('lists the people an account follows', function (): void {
    $subject = User::factory()->create();
    $followed = User::factory()->create();

    $subject->following()
        ->attach($followed->id, [
            'created_at' => now(),
        ]);

    $this->actingAs($subject)
        ->getJson("/api/users/{$subject->id}/following")
        ->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.id', $followed->id)
        // Hydrated per row, which is what lets the list draw an Unfollow button
        // without a query per person.
        ->assertJsonPath('data.0.is_following', true);
});

it('reports each row relative to the viewer, not to the subject', function (): void {
    // Looking at somebody else's followers: whether *you* follow them is what the
    // button has to reflect.
    $subject = User::factory()->create();
    $mutual = User::factory()->create();
    $stranger = User::factory()->create();
    $viewer = User::factory()->create();

    $mutual->following()
        ->attach($subject->id, [
            'created_at' => now()
                ->subMinute(),
        ]);
    $stranger->following()
        ->attach($subject->id, [
            'created_at' => now(),
        ]);
    $viewer->following()
        ->attach($mutual->id);

    $response = $this->actingAs($viewer)
        ->getJson("/api/users/{$subject->id}/followers")
        ->assertOk();

    /** @var list<array{id: string, is_following: bool}> $rows */
    $rows = $response->json('data');
    $flags = collect($rows)
        ->pluck('is_following', 'id')
        ->all();

    expect($flags[$mutual->id])->toBeTrue()
        ->and($flags[$stranger->id])->toBeFalse();
});

it('never claims the viewer follows themselves', function (): void {
    $subject = User::factory()->create();
    $viewer = User::factory()->create();

    $viewer->following()
        ->attach($subject->id, [
            'created_at' => now(),
        ]);

    $this->actingAs($viewer)
        ->getJson("/api/users/{$subject->id}/followers")
        ->assertOk()
        ->assertJsonPath('data.0.id', $viewer->id)
        ->assertJsonPath('data.0.is_following', false);
});

it('carries the counts each row displays', function () use ($postsFor): void {
    $subject = User::factory()->create();
    $follower = User::factory()->create();

    $follower->following()
        ->attach($subject->id, [
            'created_at' => now(),
        ]);
    $postsFor($follower, 3);

    $this->actingAs(User::factory()->create())
        ->getJson("/api/users/{$subject->id}/followers")
        ->assertOk()
        ->assertJsonPath('data.0.stats.posts', 3)
        ->assertJsonPath('data.0.stats.following', 1);
});

it('paginates both lists', function (): void {
    $subject = User::factory()->create();

    foreach (User::factory()->count(25)->create() as $follower) {
        $follower->following()
            ->attach($subject->id, [
                'created_at' => now(),
            ]);
    }

    $this->actingAs(User::factory()->create())
        ->getJson("/api/users/{$subject->id}/followers")
        ->assertOk()
        ->assertJsonCount(20, 'data')
        ->assertJsonPath('meta.total', 25)
        ->assertJsonPath('meta.last_page', 2);
});

it('returns an empty list rather than an error for a lonely account', function (): void {
    $subject = User::factory()->create();

    $this->actingAs(User::factory()->create())
        ->getJson("/api/users/{$subject->id}/followers")
        ->assertOk()
        ->assertJsonCount(0, 'data');
});

it('requires authentication for both lists', function (): void {
    $subject = User::factory()->create();

    $this->getJson("/api/users/{$subject->id}/followers")
        ->assertUnauthorized();
    $this->getJson("/api/users/{$subject->id}/following")
        ->assertUnauthorized();
});

it('404s for an account that does not exist', function (): void {
    $this->actingAs(User::factory()->create())
        ->getJson('/api/users/' . fake()->uuid() . '/followers')
        ->assertNotFound();
});
