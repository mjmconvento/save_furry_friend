<?php

declare(strict_types=1);

use App\Enums\UserRole;
use App\Models\Eloquent\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Support\Facades\Notification;

beforeEach(function (): void {
    Notification::fake();
});

$payload = static fn (array $over = []): array => [
    'firstName' => 'New',
    'lastName' => 'Volunteer',
    'email' => 'new@user.com',
    'password' => 'password112233',
    'password_confirmation' => 'password112233',
    ...$over,
];

it('registers an account without a token', function () use ($payload): void {
    $this->postJson('/api/register', $payload())
        ->assertCreated()
        ->assertJsonPath('user.email', 'new@user.com')
        // The banner reads this, so it has to be in the payload that signs you in.
        ->assertJsonPath('user.email_verified', false)
        ->assertJsonStructure(['message', 'token', 'user']);

    expect(User::where('email', 'new@user.com')->exists())->toBeTrue();
});

it('signs the new account in, so the token works immediately', function () use ($payload): void {
    $token = $this->postJson('/api/register', $payload())
        ->json('token');

    expect($token)
        ->toBeString();

    /** @var string $token asserted above */
    $this->withToken($token)
        ->getJson('/api/posts')
        ->assertOk();
});

it('leaves the address unverified until the link is opened', function () use ($payload): void {
    $this->postJson('/api/register', $payload())
        ->assertCreated();

    expect(User::where('email', 'new@user.com')->first()?->hasVerifiedEmail())->toBeFalse();
});

it('sends a verification notification', function () use ($payload): void {
    $this->postJson('/api/register', $payload())
        ->assertCreated();

    $user = User::where('email', 'new@user.com')->first();

    expect($user)
        ->not->toBeNull();
    Notification::assertSentTo($user, VerifyEmail::class);
});

it('cannot grant itself a role', function () use ($payload): void {
    // `roles` is not fillable, so registration is not a way to become an admin.
    $this->postJson('/api/register', $payload([
        'roles' => ['admin'],
    ]))
        ->assertCreated()
        ->assertJsonPath('user.roles', [UserRole::User->value]);

    expect(User::where('email', 'new@user.com')->first()?->isAdmin())->toBeFalse();
});

it('rejects a duplicate address', function () use ($payload): void {
    User::factory()->create([
        'email' => 'new@user.com',
    ]);

    $this->postJson('/api/register', $payload())
        ->assertStatus(422)
        ->assertJsonValidationErrors('email');
});

it('rejects a mismatched confirmation', function () use ($payload): void {
    $this->postJson('/api/register', $payload([
        'password_confirmation' => 'somethingelse',
    ]))
        ->assertStatus(422)
        ->assertJsonValidationErrors('password');
});

it('rejects a missing name', function () use ($payload): void {
    $this->postJson('/api/register', $payload([
        'firstName' => '',
    ]))
        ->assertStatus(422)
        ->assertJsonValidationErrors('firstName');
});

it('does not reopen admin-only account creation', function () use ($payload): void {
    // The whole point of a separate route: `POST /api/users` administers other
    // people's accounts and stays admin-only.
    $this->postJson('/api/users', $payload())
        ->assertUnauthorized();

    $this->actingAs(User::factory()->create())
        ->postJson('/api/users', $payload())
        ->assertForbidden();
});
