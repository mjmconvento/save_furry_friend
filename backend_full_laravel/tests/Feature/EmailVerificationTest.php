<?php

declare(strict_types=1);

use App\Models\Eloquent\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;

$link = static fn (User $user, ?string $hash = null): string => URL::temporarySignedRoute(
    'verification.verify',
    Carbon::now()->addHour(),
    [
        'id' => $user->id,
        'hash' => $hash ?? sha1($user->getEmailForVerification()),
    ],
);

it('verifies an address from a signed link and hands the browser back to the SPA', function () use ($link): void {
    // No bearer token here on purpose: the link is opened from an email, which is
    // why Laravel's own `EmailVerificationRequest` cannot be used - it reads
    // `$request->user()` and this app keeps no session.
    $user = User::factory()->unverified()->create();

    $this->get($link($user))
        ->assertRedirect(Config::string('cors.frontend_url') . '/?verified=1');

    expect($user->fresh()?->hasVerifiedEmail())
        ->toBeTrue();
});

it('can be opened twice without complaining', function () use ($link): void {
    $user = User::factory()->unverified()->create();
    $url = $link($user);

    $this->get($url)
        ->assertRedirect();
    $this->get($url)
        ->assertRedirect();

    expect($user->fresh()?->hasVerifiedEmail())
        ->toBeTrue();
});

it('refuses a link whose signature has been tampered with', function () use ($link): void {
    $user = User::factory()->unverified()->create();

    $this->get($link($user) . 'ff')->assertForbidden();

    expect($user->fresh()?->hasVerifiedEmail())
        ->toBeFalse();
});

it('refuses a hash that does not belong to the account', function () use ($link): void {
    // Otherwise a valid signed link could be re-pointed at somebody else.
    $user = User::factory()->unverified()->create();

    $this->get($link($user, sha1('someone.else@user.com')))
        ->assertForbidden();

    expect($user->fresh()?->hasVerifiedEmail())
        ->toBeFalse();
});

it('refuses a link for an account that no longer exists', function () use ($link): void {
    $user = User::factory()->unverified()->create();
    $url = $link($user);

    $user->delete();

    $this->get($url)
        ->assertForbidden();
});

it('stops working once the address has changed', function () use ($link): void {
    // The hash is of the address, so a link mailed to the old one is spent.
    $user = User::factory()->unverified()->create([
        'email' => 'before@user.com',
    ]);
    $url = $link($user);

    $user->email = 'after@user.com';
    $user->save();

    $this->get($url)
        ->assertForbidden();

    expect($user->fresh()?->hasVerifiedEmail())
        ->toBeFalse();
});

it('resends the link for the signed-in account', function (): void {
    Notification::fake();

    $user = User::factory()->unverified()->create();

    $this->actingAs($user)
        ->postJson('/api/email/verification-notification')
        ->assertOk()
        ->assertJsonPath('message', 'Verification link sent.');

    Notification::assertSentTo($user, VerifyEmail::class);
});

it('does not resend for an address that is already verified', function (): void {
    Notification::fake();

    $this->actingAs(User::factory()->create())
        ->postJson('/api/email/verification-notification')
        ->assertOk()
        ->assertJsonPath('message', 'That address is already verified.');

    Notification::assertNothingSent();
});

it('requires authentication to resend', function (): void {
    $this->postJson('/api/email/verification-notification')
        ->assertUnauthorized();
});

it('reports the verified state on login', function (): void {
    $user = User::factory()->unverified()->create([
        'password' => 'password112233',
    ]);

    $this->postJson('/api/login', [
        'email' => $user->email,
        'password' => 'password112233',
    ])
        ->assertOk()
        ->assertJsonPath('user.email_verified', false);

    $user->markEmailAsVerified();

    $this->postJson('/api/login', [
        'email' => $user->email,
        'password' => 'password112233',
    ])
        ->assertOk()
        ->assertJsonPath('user.email_verified', true);
});

it('still lets an unverified account use the app', function (): void {
    // The chosen scope: unverified is reported, not enforced.
    $this->actingAs(User::factory()->unverified()->create())
        ->getJson('/api/posts')
        ->assertOk();
});
