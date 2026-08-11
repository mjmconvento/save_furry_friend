<?php

declare(strict_types=1);

use App\Models\Eloquent\User;
use App\Models\Mongo\Post;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

// File uploads cannot go through postJson(), which JSON-encodes the body and
// would turn an UploadedFile into garbage. post() with an explicit Accept
// header gives multipart plus JSON error rendering.
$json = [
    'Accept' => 'application/json',
];

// `fake()->image()` needs the GD extension, which the php image does not ship.
// `create()` with an explicit mime exercises the same `mimes:` rule without it.
$jpeg = static fn (string $name, int $kilobytes = 40): UploadedFile => UploadedFile::fake()->create($name, $kilobytes, 'image/jpeg');

it('rejects a disallowed media type', function () use ($json): void {
    Storage::fake('s3');

    $this->actingAs(User::factory()->create())
        ->post('/api/posts', [
            'content' => 'hi',
            'tags' => ['happy_post'],
            'medias' => [UploadedFile::fake()->create('payload.php', 10, 'application/x-php')],
        ], $json)
        ->assertStatus(422)
        ->assertJsonValidationErrors('medias.0');

    expect(Storage::disk('s3')->allFiles())->toBeEmpty();
});

it('rejects an oversize upload', function () use ($json, $jpeg): void {
    Storage::fake('s3');

    $this->actingAs(User::factory()->create())
        ->post('/api/posts', [
            'content' => 'hi',
            'tags' => ['happy_post'],
            'medias' => [$jpeg('big.jpg', 50_000)],
        ], $json)
        ->assertStatus(422)
        ->assertJsonValidationErrors('medias.0');

    expect(Storage::disk('s3')->allFiles())->toBeEmpty();
});

it('rejects more than four files', function () use ($json, $jpeg): void {
    Storage::fake('s3');

    $this->actingAs(User::factory()->create())
        ->post('/api/posts', [
            'content' => 'hi',
            'tags' => ['happy_post'],
            'medias' => array_map(
                fn (int $i): UploadedFile => $jpeg("p{$i}.jpg"),
                range(1, 5)
            ),
        ], $json)
        ->assertStatus(422)
        ->assertJsonValidationErrors('medias');
});

it('rejects an empty content body', function () use ($json): void {
    $this->actingAs(User::factory()->create())
        ->post('/api/posts', [
            'content' => '',
        ], $json)
        ->assertStatus(422)
        ->assertJsonValidationErrors('content');
});

it('stores an accepted image as a bare object key, not a url', function () use ($json, $jpeg): void {
    Storage::fake('s3');
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/api/posts', [
            'content' => 'a good dog',
            'tags' => ['happy_post'],
            'medias' => [$jpeg('dog.jpg')],
        ], $json)
        ->assertStatus(201);

    $post = Post::where('authorId', $user->id)->first();

    expect($post->medias)
        ->toHaveCount(1)
        ->and($post->medias[0])->toStartWith("{$user->id}/")
        ->and($post->medias[0])->not->toContain('://');

    Storage::disk('s3')->assertExists($post->medias[0]);
});

it('returns 422 json rather than a redirect when no Accept header is sent', function (): void {
    // Documents BE-04: in routes/web.php this produced a 302 to url()->previous().
    $this->actingAs(User::factory()->create())
        ->post('/api/posts', [
            'content' => '',
        ])
        ->assertStatus(422);
});
