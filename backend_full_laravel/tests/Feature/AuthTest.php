<?php

declare(strict_types=1);

use App\Models\Eloquent\User;
use Illuminate\Support\Facades\Hash;

it('issues a token on valid credentials', function (): void {
    User::factory()->create([
        'email' => 'a@b.test',
        'password' => Hash::make('secret123'),
    ]);

    $this->postJson('/api/login', [
        'email' => 'a@b.test',
        'password' => 'secret123',
    ])
        ->assertOk()
        ->assertJsonStructure([
            'token',
            'user' => ['id', 'email'],
        ])
        ->assertJsonMissingPath('user.password')
        ->assertJsonMissingPath('user.remember_token');
});

it('rejects bad credentials with 401', function (): void {
    User::factory()->create([
        'email' => 'a@b.test',
        'password' => Hash::make('secret123'),
    ]);

    $this->postJson('/api/login', [
        'email' => 'a@b.test',
        'password' => 'wrong',
    ])
        ->assertStatus(401);
});

it('rejects an unknown email with 401 rather than leaking that it is unknown', function (): void {
    $this->postJson('/api/login', [
        'email' => 'nobody@b.test',
        'password' => 'secret123',
    ])
        ->assertStatus(401)
        ->assertJson([
            'message' => 'Unauthorized',
        ]);
});

it('revokes the access token on logout', function (): void {
    $user = User::factory()->create();
    $token = $user->createToken('t')
        ->plainTextToken;

    $this->withToken($token)
        ->postJson('/api/logout')
        ->assertOk();

    expect($user->tokens()->count())
        ->toBe(0);
});

it('stops accepting a token once it has been revoked', function (): void {
    $user = User::factory()->create();
    $token = $user->createToken('t')
        ->plainTextToken;

    $this->withToken($token)
        ->getJson('/api/users')
        ->assertOk();
    $this->withToken($token)
        ->postJson('/api/logout')
        ->assertOk();

    // The test client reuses one container across requests, so the auth guard
    // still holds the user it resolved on the first call and would answer from
    // memory instead of re-reading personal_access_tokens. A real second
    // request boots a fresh guard; this is the in-process equivalent.
    $this->app['auth']->forgetGuards();

    $this->withToken($token)
        ->getJson('/api/users')
        ->assertStatus(401);
});

it('requires authentication for the protected group', function (): void {
    $this->getJson('/api/posts')
        ->assertStatus(401);
});
