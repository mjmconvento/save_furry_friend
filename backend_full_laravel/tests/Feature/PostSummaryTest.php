<?php

declare(strict_types=1);

use App\Enums\PostTag;
use App\Http\Controllers\PostController;
use App\Models\Eloquent\User;
use App\Models\Mongo\Post;
use Illuminate\Support\Carbon;

/**
 * @param ?list<string> $tags overrides the single tone, for multi-tag cases
 */
function summaryPost(User $author, PostTag $tag, ?Carbon $createdAt = null, ?array $tags = null): Post
{
    $post = Post::create([
        'authorId' => $author->id,
        'authorName' => $author->first_name,
        'content' => 'sample',
        'tags' => $tags ?? [$tag->value],
    ]);

    if ($createdAt instanceof Carbon) {
        // Written after the fact: `createdAt` is model-managed, so it cannot be
        // set on the way in.
        $post->createdAt = $createdAt;
        $post->save();
    }

    return $post;
}

it('counts the week\'s posts by tone', function (): void {
    $viewer = User::factory()->create();

    summaryPost($viewer, PostTag::Happy);
    summaryPost($viewer, PostTag::Happy, now()->subDays(4));
    summaryPost($viewer, PostTag::Heartbreaking, now()->subDays(6));

    $this->actingAs($viewer)
        ->getJson('/api/posts/summary')
        ->assertOk()
        ->assertJsonPath('data.counts', [
            PostTag::Happy->value => 2,
            // Every tone is reported, so the client never has to fill a gap.
            PostTag::Neutral->value => 0,
            PostTag::Heartbreaking->value => 1,
        ])
        ->assertJsonPath('data.to', now()->toDateString())
        ->assertJsonPath('data.from', now()->subDays(6)->toDateString());
});

it('reports a window of exactly seven days, both ends included', function (): void {
    // `subDays(7)` would span eight. The endpoint states the dates it used, so
    // this is the arithmetic the caption depends on.
    $this->actingAs(User::factory()->create())
        ->getJson('/api/posts/summary')
        ->assertOk()
        ->assertJsonPath('data.from', now()->subDays(PostController::SUMMARY_DAYS - 1)->toDateString());
});

it('ignores posts from before the window', function (): void {
    // A rolling week, so the boundary moves: a post one second before the seventh
    // day back began is out, however recently it looks.
    $viewer = User::factory()->create();

    summaryPost($viewer, PostTag::Happy);
    summaryPost($viewer, PostTag::Happy, now()->subDays(7));
    summaryPost($viewer, PostTag::Happy, now()->subDays(6)->startOfDay()->subSecond());
    summaryPost($viewer, PostTag::Happy, now()->subDays(30));

    $this->actingAs($viewer)
        ->getJson('/api/posts/summary')
        ->assertOk()
        ->assertJsonPath('data.counts.' . PostTag::Happy->value, 1);
});

it('counts the whole of the first and last day in the window', function (): void {
    // Whole days, not a 168-hour window measured from the current clock time:
    // midnight seven days back through the final second of today.
    $viewer = User::factory()->create();

    summaryPost($viewer, PostTag::Neutral, now()->subDays(6)->startOfDay());
    summaryPost($viewer, PostTag::Neutral, now()->endOfDay());

    $this->actingAs($viewer)
        ->getJson('/api/posts/summary')
        ->assertOk()
        ->assertJsonPath('data.counts.' . PostTag::Neutral->value, 2);
});

it('is scoped like the feeds: followed authors plus yourself', function (): void {
    // Matching the feed matters more than the number being impressive - a card
    // reading 3 while the Happy feed shows 1 would just look broken.
    $viewer = User::factory()->create();
    $followed = User::factory()->create();
    $stranger = User::factory()->create();

    $viewer->following()
        ->attach($followed->id);

    summaryPost($viewer, PostTag::Happy);
    summaryPost($followed, PostTag::Happy);
    summaryPost($stranger, PostTag::Happy);

    $this->actingAs($viewer)
        ->getJson('/api/posts/summary')
        ->assertOk()
        ->assertJsonPath('data.counts.' . PostTag::Happy->value, 2);
});

it('ignores tags outside the tone vocabulary', function (): void {
    $viewer = User::factory()->create();

    summaryPost($viewer, PostTag::Happy, null, [PostTag::Happy->value, 'adoption_drive']);

    $this->actingAs($viewer)
        ->getJson('/api/posts/summary')
        ->assertOk()
        // Three keys, not four: an unknown tag is not a tone.
        ->assertJsonCount(3, 'data.counts')
        ->assertJsonPath('data.counts.' . PostTag::Happy->value, 1);
});

it('counts a multi-tone post once per tone it carries', function (): void {
    // `tags` is an array, so the pipeline unwinds it. Grouping on the field
    // directly would key by the whole array and count neither tone.
    $viewer = User::factory()->create();

    summaryPost($viewer, PostTag::Happy, null, [PostTag::Happy->value, PostTag::Neutral->value]);

    $this->actingAs($viewer)
        ->getJson('/api/posts/summary')
        ->assertOk()
        ->assertJsonPath('data.counts.' . PostTag::Happy->value, 1)
        ->assertJsonPath('data.counts.' . PostTag::Neutral->value, 1);
});

it('requires authentication', function (): void {
    $this->getJson('/api/posts/summary')
        ->assertUnauthorized();
});

it('is reachable by a non-admin', function (): void {
    // It is a reading surface, not administration.
    $this->actingAs(User::factory()->create())
        ->getJson('/api/posts/summary')
        ->assertOk();
});

it('is not swallowed by the {post} route', function (): void {
    // Declared before apiResource('posts'), or `summary` resolves as a post id
    // and 404s.
    $this->actingAs(User::factory()->create())
        ->getJson('/api/posts/summary')
        ->assertOk()
        ->assertJsonStructure([
            'data' => ['from', 'to', 'counts'],
        ]);
});
