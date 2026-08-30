<?php

declare(strict_types=1);

use App\Models\Eloquent\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;

it('emails a reset link pointing at the SPA, not the API', function (): void {
    Notification::fake();

    $user = User::factory()->create([
        'email' => 'a@b.test',
    ]);

    $this->postJson('/api/password/forgot', [
        'email' => 'a@b.test',
    ])
        ->assertOk();

    Notification::assertSentTo($user, ResetPassword::class, function (ResetPassword $notification) use ($user): bool {
        // The link is opened in a browser and needs a form, which only the SPA
        // has. Laravel's default would aim at a `password.reset` web route.
        $url = $notification->toMail($user)
            ->actionUrl;

        return str_contains($url, '/reset-password?token=')
            && str_contains($url, urlencode('a@b.test'));
    });
});

it('answers the same for an unknown address, so it cannot enumerate accounts', function (): void {
    Notification::fake();

    $known = $this->postJson('/api/password/forgot', [
        'email' => 'nobody@b.test',
    ]);

    $known->assertOk();
    Notification::assertNothingSent();

    User::factory()->create([
        'email' => 'real@b.test',
    ]);
    $this->postJson('/api/password/forgot', [
        'email' => 'real@b.test',
    ])
        ->assertOk()
        // Byte-identical bodies: a different message would answer "does this
        // address have an account?" just as well as a different status.
        ->assertExactJson($known->json());
});

it('sets the new password and lets it log in', function (): void {
    Notification::fake();

    $user = User::factory()->create([
        'email' => 'a@b.test',
        'password' => Hash::make('old-password'),
    ]);

    $this->postJson('/api/password/forgot', [
        'email' => 'a@b.test',
    ]);

    $token = '';
    Notification::assertSentTo($user, ResetPassword::class, function (ResetPassword $notification) use (&$token): bool {
        $token = $notification->token;

        return true;
    });

    $this->postJson('/api/password/reset', [
        'token' => $token,
        'email' => 'a@b.test',
        'password' => 'new-password-1',
        'password_confirmation' => 'new-password-1',
    ])->assertOk();

    $this->postJson('/api/login', [
        'email' => 'a@b.test',
        'password' => 'new-password-1',
    ])
        ->assertOk();
    $this->postJson('/api/login', [
        'email' => 'a@b.test',
        'password' => 'old-password',
    ])
        ->assertStatus(401);
});

it('signs out every existing session when the password changes', function (): void {
    Notification::fake();

    $user = User::factory()->create([
        'email' => 'a@b.test',
    ]);
    $user->createToken('phone');
    $user->createToken('laptop');

    $this->postJson('/api/password/forgot', [
        'email' => 'a@b.test',
    ]);

    $token = '';
    Notification::assertSentTo($user, ResetPassword::class, function (ResetPassword $notification) use (&$token): bool {
        $token = $notification->token;

        return true;
    });

    $this->postJson('/api/password/reset', [
        'token' => $token,
        'email' => 'a@b.test',
        'password' => 'new-password-1',
        'password_confirmation' => 'new-password-1',
    ])->assertOk();

    // A reset is what you do when a password may be compromised, so tokens
    // minted with the old one must not survive it.
    expect($user->tokens()->count())
        ->toBe(0);
});

it('rejects a tampered token', function (): void {
    User::factory()->create([
        'email' => 'a@b.test',
    ]);

    $this->postJson('/api/password/reset', [
        'token' => 'not-a-real-token',
        'email' => 'a@b.test',
        'password' => 'new-password-1',
        'password_confirmation' => 'new-password-1',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['email']);
});

it('requires the confirmation to match', function (): void {
    $this->postJson('/api/password/reset', [
        'token' => 'whatever',
        'email' => 'a@b.test',
        'password' => 'new-password-1',
        'password_confirmation' => 'different-password',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['password']);
});

it('needs an email that looks like one', function (): void {
    $this->postJson('/api/password/forgot', [
        'email' => 'not-an-email',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['email']);
});
