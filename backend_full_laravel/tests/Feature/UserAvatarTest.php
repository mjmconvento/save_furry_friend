<?php

declare(strict_types=1);

use App\Models\Eloquent\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

// `fake()->image()` needs the GD extension, which the php image does not ship;
// `create()` with an explicit mime is what the post upload tests use too.
$jpeg = static fn (string $name, int $kilobytes = 40): UploadedFile => UploadedFile::fake()
    ->create($name, $kilobytes, 'image/jpeg');

beforeEach(function (): void {
    Storage::fake('s3');
});

it('has no picture until one is uploaded', function (): void {
    $user = User::factory()->create([
        'password' => 'password112233',
    ]);

    $this->postJson('/api/login', [
        'email' => $user->email,
        'password' => 'password112233',
    ])
        ->assertOk()
        ->assertJsonPath('user.avatar', null);
});

it('stores an uploaded picture under the owner and reports a url', function () use ($jpeg): void {
    $user = User::factory()->create();

    $response = $this->actingAs($user)
        ->postJson('/api/user/avatar', [
            'avatar' => $jpeg('me.jpg'),
        ])
        ->assertOk();

    $key = $user->fresh()?->avatar;

    expect($key)
        ->toStartWith($user->id . '/')
        // A key, not a URL: baking the host into the row is what forces a data
        // migration when the bucket moves.
        ->and($key)
        ->not->toContain('http')
        ->and(Storage::disk('s3')->exists((string) $key))->toBeTrue();

    // Rendered, not echoed: the wire value is built from the key. Its host comes
    // from the disk config, so under `Storage::fake` it is relative - the
    // absolute MinIO URL is a config concern, not this test's.
    expect($response->json('data.avatar'))
        ->toContain((string) $key)
        ->and($response->json('data.avatar'))
        ->not->toBe($key);
});

it('replaces the previous picture rather than accumulating one per upload', function () use ($jpeg): void {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->postJson('/api/user/avatar', [
            'avatar' => $jpeg('first.jpg'),
        ])
        ->assertOk();

    $first = (string) $user->fresh()?->avatar;

    $this->actingAs($user)
        ->postJson('/api/user/avatar', [
            'avatar' => $jpeg('second.jpg'),
        ])
        ->assertOk();

    $second = (string) $user->fresh()?->avatar;

    expect($second)
        ->not->toBe($first)
        ->and(Storage::disk('s3')->exists($second))->toBeTrue()
        // Otherwise every change leaves an orphan behind for ever.
        ->and(Storage::disk('s3')->exists($first))->toBeFalse();
});

it('removes the picture and the object behind it', function () use ($jpeg): void {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->postJson('/api/user/avatar', [
            'avatar' => $jpeg('me.jpg'),
        ])
        ->assertOk();

    $key = (string) $user->fresh()?->avatar;

    $this->actingAs($user)
        ->deleteJson('/api/user/avatar')
        ->assertOk()
        ->assertJsonPath('data.avatar', null);

    expect($user->fresh()?->avatar)
        ->toBeNull()
        ->and(Storage::disk('s3')->exists($key))->toBeFalse();
});

it('rejects anything that is not an image', function (): void {
    $this->actingAs(User::factory()->create())
        ->postJson('/api/user/avatar', [
            'avatar' => UploadedFile::fake()->create('resume.pdf', 100, 'application/pdf'),
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors('avatar');
});

it('rejects a picture over the size limit', function () use ($jpeg): void {
    // An avatar renders at 40px; there is no reason to accept a 10MB file the way
    // post media does.
    $this->actingAs(User::factory()->create())
        ->postJson('/api/user/avatar', [
            'avatar' => $jpeg('huge.jpg', 5000),
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors('avatar');
});

it('requires the field to be present', function (): void {
    $this->actingAs(User::factory()->create())
        ->postJson('/api/user/avatar', [])
        ->assertStatus(422)
        ->assertJsonValidationErrors('avatar');
});

it('needs no admin role', function () use ($jpeg): void {
    // Self-service, like preferences: the route has no {user} parameter, so it
    // is not a crack in admin-only account editing.
    $user = User::factory()->create();

    expect($user->isAdmin())
        ->toBeFalse();

    $this->actingAs($user)
        ->postJson('/api/user/avatar', [
            'avatar' => $jpeg('me.jpg'),
        ])
        ->assertOk();
});

it('cannot touch anybody else\'s picture', function () use ($jpeg): void {
    $user = User::factory()->create();
    $other = User::factory()->create();

    $this->actingAs($user)
        ->postJson('/api/user/avatar', [
            'avatar' => $jpeg('me.jpg'),
            // No route parameter to aim elsewhere; a body field is not one either.
            'id' => $other->id,
            'user_id' => $other->id,
        ])
        ->assertOk();

    expect($user->fresh()?->avatar)
        ->not->toBeNull()
        ->and($other->fresh()?->avatar)
        ->toBeNull();
});

it('requires authentication', function () use ($jpeg): void {
    $this->postJson('/api/user/avatar', [
        'avatar' => $jpeg('me.jpg'),
    ])->assertUnauthorized();

    $this->deleteJson('/api/user/avatar')
        ->assertUnauthorized();
});
