<?php

declare(strict_types=1);

use App\Enums\PostTag;
use App\Models\Eloquent\User;
use App\Models\Mongo\Post;
use Illuminate\Support\Carbon;
use Illuminate\Testing\TestResponse;

/**
 * @param int $recent posts inside the 30-day window
 * @param int $old    posts well outside it
 */
function discoverPosts(User $author, int $recent, int $old = 0): void
{
    foreach (range(1, max($recent, 0)) as $ignored) {
        if ($recent < 1) {
            break;
        }

        Post::create([
            'authorId' => $author->id,
            'authorName' => $author->first_name,
            'content' => 'recent',
            'tags' => [PostTag::Happy->value],
        ]);
    }

    foreach (range(1, max($old, 0)) as $ignored) {
        if ($old < 1) {
            break;
        }

        $post = Post::create([
            'authorId' => $author->id,
            'authorName' => $author->first_name,
            'content' => 'old',
            'tags' => [PostTag::Happy->value],
        ]);

        // Written after the fact: `createdAt` is model-managed.
        $post->createdAt = Carbon::now()->subDays(90);
        $post->save();
    }
}

/**
 * Ids in the order the endpoint returned them.
 *
 * Takes `mixed` because the test client's fluent chain is untyped, and
 * `TestResponse` is generic - narrowing here beats sprinkling casts across
 * every assertion below.
 *
 * @return list<string>
 */
function discoverIds(mixed $response): array
{
    $rows = $response instanceof TestResponse ? $response->json('data') : null;

    if (! is_array($rows)) {
        return [];
    }

    $ids = [];

    foreach ($rows as $row) {
        if (is_array($row) && is_string($row['id'] ?? null)) {
            $ids[] = $row['id'];
        }
    }

    return $ids;
}

it('ranks by posts in the last 30 days', function (): void {
    $viewer = User::factory()->create();
    $quietLately = User::factory()->create();
    $busyLately = User::factory()->create();

    discoverPosts($quietLately, 1);
    discoverPosts($busyLately, 4);

    $response = $this->actingAs($viewer)
        ->getJson('/api/users/discover')
        ->assertOk();

    expect(discoverIds($response))
        ->toBe([$busyLately->id, $quietLately->id]);
});

it('breaks a tie on recent posts with the lifetime total', function (): void {
    // Both posted twice this month; the one with a longer history goes first.
    $viewer = User::factory()->create();
    $newer = User::factory()->create();
    $established = User::factory()->create();

    discoverPosts($newer, 2);
    discoverPosts($established, 2, 6);

    $response = $this->actingAs($viewer)
        ->getJson('/api/users/discover')
        ->assertOk();

    expect(discoverIds($response))
        ->toBe([$established->id, $newer->id]);
});

it('ranks a dormant prolific account below anyone posting now', function (): void {
    // The whole point of the 30-day window: 20 posts from three months ago is
    // not a better suggestion than one post last week.
    $viewer = User::factory()->create();
    $dormant = User::factory()->create();
    $active = User::factory()->create();

    discoverPosts($dormant, 0, 20);
    discoverPosts($active, 1);

    $response = $this->actingAs($viewer)
        ->getJson('/api/users/discover')
        ->assertOk();

    expect(discoverIds($response))
        ->toBe([$active->id, $dormant->id]);
});

it('lists accounts that have never posted, after everyone who has', function (): void {
    // A directory, unlike the suggestions prompt: a member who has not posted
    // yet must still be findable.
    $viewer = User::factory()->create();
    $silent = User::factory()->create();
    $poster = User::factory()->create();

    discoverPosts($poster, 1);

    $response = $this->actingAs($viewer)
        ->getJson('/api/users/discover')
        ->assertOk();

    expect(discoverIds($response))
        ->toBe([$poster->id, $silent->id]);
});

it('never lists the viewer or anyone they already follow', function (): void {
    $viewer = User::factory()->create();
    $followed = User::factory()->create();
    $stranger = User::factory()->create();

    discoverPosts($viewer, 9);
    discoverPosts($followed, 5);
    discoverPosts($stranger, 1);

    $viewer->following()
        ->attach($followed->id);

    $response = $this->actingAs($viewer)
        ->getJson('/api/users/discover')
        ->assertOk();

    expect(discoverIds($response))
        ->toBe([$stranger->id]);
});

it('fills whole pages even though exclusions happen after ranking', function (): void {
    // The suggestions prompt takes a fixed slice from Mongo and filters after,
    // which can hand back a short list. A paged directory may not do that.
    $viewer = User::factory()->create();
    $followed = User::factory()->create();
    discoverPosts($followed, 50);
    $viewer->following()
        ->attach($followed->id);

    foreach (User::factory()->count(7)->create() as $index => $stranger) {
        discoverPosts($stranger, $index + 1);
    }

    $first = $this->actingAs($viewer)
        ->getJson('/api/users/discover?per_page=3')
        ->assertOk();

    expect($first->json('meta.total'))
        ->toBe(7)
        ->and($first->json('meta.last_page'))
        ->toBe(3)
        ->and(discoverIds($first))
        ->toHaveCount(3);

    $last = $this->actingAs($viewer)
        ->getJson('/api/users/discover?per_page=3&page=3')
        ->assertOk();

    expect(discoverIds($last))
        ->toHaveCount(1);
});

it('reports the counts each row displays', function (): void {
    $viewer = User::factory()->create();
    $author = User::factory()->create();
    discoverPosts($author, 2, 1);

    $this->actingAs($viewer)
        ->getJson('/api/users/discover')
        ->assertOk()
        // Lifetime totals, matching every other person row in the app; the
        // ordering is what reflects the recent window.
        ->assertJsonPath('data.0.stats.posts', 3)
        ->assertJsonPath('data.0.is_following', false);
});

it('requires authentication', function (): void {
    $this->getJson('/api/users/discover')
        ->assertUnauthorized();
});

it('is reachable by a non-admin', function (): void {
    // Finding people is part of the product; user administration is not.
    $viewer = User::factory()->create();

    expect($viewer->isAdmin())
        ->toBeFalse();

    $this->actingAs($viewer)
        ->getJson('/api/users/discover')
        ->assertOk();
});

it('is not swallowed by the {user} route', function (): void {
    // Declared before apiResource('users'), or `discover` resolves as a user id.
    $this->actingAs(User::factory()->create())
        ->getJson('/api/users/discover')
        ->assertOk()
        ->assertJsonStructure([
            'data',
            'meta' => ['total', 'last_page'],
        ]);
});
