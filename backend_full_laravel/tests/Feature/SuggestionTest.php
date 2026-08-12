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

it('suggests the most prolific authors first', function () use ($postsFor): void {
    $viewer = User::factory()->create();
    $quiet = User::factory()->create();
    $busy = User::factory()->create();

    $postsFor($quiet, 2);
    $postsFor($busy, 9);

    $this->actingAs($viewer)
        ->getJson('/api/users/suggestions')
        ->assertOk()
        ->assertJsonPath('data.0.id', $busy->id)
        ->assertJsonPath('data.1.id', $quiet->id);
});

it('reports the post count that earned the suggestion', function () use ($postsFor): void {
    $author = User::factory()->create();
    $postsFor($author, 4);

    $this->actingAs(User::factory()->create())
        ->getJson('/api/users/suggestions')
        ->assertOk()
        ->assertJsonPath('data.0.stats.posts', 4)
        ->assertJsonPath('data.0.is_following', false);
});

it('never suggests somebody already followed', function () use ($postsFor): void {
    $viewer = User::factory()->create();
    $followed = User::factory()->create();
    $stranger = User::factory()->create();

    $postsFor($followed, 9);
    $postsFor($stranger, 1);
    $viewer->following()
        ->attach($followed->id);

    $response = $this->actingAs($viewer)
        ->getJson('/api/users/suggestions')
        ->assertOk();

    /** @var list<array{id: string}> $rows */
    $rows = $response->json('data');

    expect(collect($rows)->pluck('id')->all())
        ->toContain($stranger->id)
        ->not->toContain($followed->id);
});

it('never suggests the viewer', function () use ($postsFor): void {
    // The most prolific author is often you.
    $viewer = User::factory()->create();
    $postsFor($viewer, 20);

    $this->actingAs($viewer)
        ->getJson('/api/users/suggestions')
        ->assertOk()
        ->assertJsonCount(0, 'data');
});

it('ignores accounts that have never posted', function (): void {
    // Ranked by post count, so somebody with none has nothing to rank on and is
    // not a useful suggestion.
    User::factory()->count(3)->create();

    $this->actingAs(User::factory()->create())
        ->getJson('/api/users/suggestions')
        ->assertOk()
        ->assertJsonCount(0, 'data');
});

it('still finds strangers when the top authors are all familiar', function () use ($postsFor): void {
    // The ranking slice is deliberately wider than the number returned: taking
    // exactly five would come back empty as soon as the five busiest are all
    // followed already.
    $viewer = User::factory()->create();

    foreach (User::factory()->count(6)->create() as $followed) {
        $postsFor($followed, 10);
        $viewer->following()
            ->attach($followed->id);
    }

    $stranger = User::factory()->create();
    $postsFor($stranger, 1);

    $this->actingAs($viewer)
        ->getJson('/api/users/suggestions')
        ->assertOk()
        ->assertJsonPath('data.0.id', $stranger->id);
});

it('returns a short list, not a directory', function () use ($postsFor): void {
    foreach (User::factory()->count(12)->create() as $index => $author) {
        $postsFor($author, $index + 1);
    }

    $response = $this->actingAs(User::factory()->create())
        ->getJson('/api/users/suggestions')
        ->assertOk();

    expect(count((array) $response->json('data')))
        ->toBeLessThanOrEqual(5);
});

it('requires authentication', function (): void {
    $this->getJson('/api/users/suggestions')
        ->assertUnauthorized();
});

it('is not swallowed by the {user} route', function (): void {
    // Declared before apiResource('users'), or `suggestions` resolves as a user id
    // and 404s.
    $this->actingAs(User::factory()->create())
        ->getJson('/api/users/suggestions')
        ->assertOk()
        ->assertJsonStructure(['data']);
});
