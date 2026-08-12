<?php

declare(strict_types=1);

use App\Models\Mongo\Post;
use Database\Seeders\SamplePostSeeder;
use Database\Seeders\SampleUserSeeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

beforeEach(function (): void {
    // The seeder uploads one object per image on every run. Against a real
    // bucket the suite would depend on MinIO being up and would leave dozens of
    // objects behind.
    Storage::fake('s3');
});

it('creates the documented sample corpus', function (): void {
    $this->seed(SampleUserSeeder::class);
    $this->seed(SamplePostSeeder::class);

    expect(Post::count())->toBe(50)
        ->and(DB::table('users')->count())->toBe(count(SampleUserSeeder::USERS));
});

it('replaces its own output on a re-run instead of doubling it', function (): void {
    // `make bootstrap` and any deploy step runs `migrate --seed` unconditionally,
    // so a seeder that appends would grow the corpus by 50 every time.
    $this->seed(SampleUserSeeder::class);
    $this->seed(SamplePostSeeder::class);
    $this->seed(SamplePostSeeder::class);

    expect(Post::count())->toBe(50);
});

it('leaves posts it did not create alone', function (): void {
    $this->seed(SampleUserSeeder::class);

    $mine = Post::create([
        'authorId' => SampleUserSeeder::USERS[0]['id'],
        'authorName' => 'Real Person',
        'content' => 'written by hand',
        'tags' => ['happy_post'],
    ]);

    $this->seed(SamplePostSeeder::class);
    $this->seed(SamplePostSeeder::class);

    // The re-run purges by the `sample` marker, which no API-created post
    // carries; matching on anything looser would delete real content.
    expect(Post::find($mine->id)?->content)->toBe('written by hand')
        ->and(Post::count())->toBe(51);
});

it('spreads the corpus across every author, tone and media count', function (): void {
    $this->seed(SampleUserSeeder::class);
    $this->seed(SamplePostSeeder::class);

    $posts = Post::all();
    $mediaCounts = $posts->map(static fn (Post $post): int => count($post->medias ?? []));

    expect($posts->pluck('authorId')->unique())
        ->toHaveCount(count(SampleUserSeeder::USERS))
        ->and($posts->pluck('tags')->flatten()->unique())
        ->toHaveCount(3)
        // A feed of uniform posts exercises none of the layout: the mix of
        // text-only, single image and gallery is the point of the sample data.
        ->and($mediaCounts->contains(0))
        ->toBeTrue()
        ->and($mediaCounts->contains(1))
        ->toBeTrue()
        ->and($mediaCounts->contains(static fn (int $count): bool => $count > 1))
        ->toBeTrue();
});

it('puts several of today\'s posts in more than one tone', function (): void {
    // The home page counts today per tone. A corpus dated entirely in the past
    // makes that summary read all zeros on a fresh install, and dating it in
    // tone order made every recent post the same tone - which read as a bug.
    $this->seed(SampleUserSeeder::class);
    $this->seed(SamplePostSeeder::class);

    $today = Post::where('createdAt', '>=', now()->startOfDay())->get();

    expect($today->count())
        ->toBeGreaterThanOrEqual(3)
        ->and($today->pluck('tags')->flatten()->unique()->count())
        ->toBeGreaterThan(1);
});

it('gives every sample author a media object of its own per image', function (): void {
    $this->seed(SampleUserSeeder::class);
    $this->seed(SamplePostSeeder::class);

    $keys = [];

    // Every seeded document sets `medias`, empty or not, matching the model's
    // declared `array<string>`.
    foreach (Post::all() as $post) {
        foreach ($post->medias as $key) {
            $keys[] = $key;
        }
    }

    // Reusing one object across posts would be smaller, but deleting either post
    // would then blank the other's images.
    expect($keys)
        ->not->toBeEmpty()
        ->and(array_unique($keys))
        ->toHaveCount(count($keys));

    foreach ($keys as $key) {
        expect(Storage::disk('s3')->exists($key))->toBeTrue();
    }
});

it('makes the sample users follow each other so their posts are visible', function (): void {
    // Every feed is scoped to the follow graph plus the viewer's own posts, so
    // without this the sample corpus is invisible to the account you log in as.
    $this->seed(SampleUserSeeder::class);
    $this->seed(SampleUserSeeder::class);

    $users = count(SampleUserSeeder::USERS);

    expect(DB::table('user_followers')->count())->toBe($users * ($users - 1));
});
