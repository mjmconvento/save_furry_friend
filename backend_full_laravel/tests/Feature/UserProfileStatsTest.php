<?php

declare(strict_types=1);

use App\Enums\PostTag;
use App\Models\Eloquent\User;
use App\Models\Mongo\Post;

it('reports post, follower and following counts on a profile', function (): void {
    $subject = User::factory()->create();
    $viewer = User::factory()->create();
    $follower = User::factory()->create();
    $followed = User::factory()->create();

    $follower->following()
        ->attach($subject->id);
    $subject->following()
        ->attach($followed->id);

    foreach (range(1, 3) as $ignored) {
        Post::create([
            'authorId' => $subject->id,
            'authorName' => $subject->first_name,
            'content' => 'sample',
            'tags' => [PostTag::Happy->value],
        ]);
    }

    $this->actingAs($viewer)
        ->getJson("/api/users/{$subject->id}")
        ->assertOk()
        ->assertJsonPath('data.stats', [
            'posts' => 3,
            'followers' => 1,
            'following' => 1,
        ]);
});

it('reports zeros for an account with nothing yet', function (): void {
    $subject = User::factory()->create();

    $this->actingAs(User::factory()->create())
        ->getJson("/api/users/{$subject->id}")
        ->assertOk()
        ->assertJsonPath('data.stats', [
            'posts' => 0,
            'followers' => 0,
            'following' => 0,
        ]);
});

it('leaves stats out of list responses', function (): void {
    // Deliberate: three extra queries per row, one against Mongo, for counts no
    // list displays. Only the profile page pays for them.
    User::factory()->count(2)->create();

    $this->actingAs(User::factory()->admin()->create())
        ->getJson('/api/users')
        ->assertOk()
        ->assertJsonPath('data.0.stats', null);
});

it('leaves stats out of search results', function (): void {
    User::factory()->create([
        'first_name' => 'Findable',
    ]);

    $this->actingAs(User::factory()->create())
        ->getJson('/api/users/search/Findable')
        ->assertOk()
        ->assertJsonPath('data.0.stats', null);
});
