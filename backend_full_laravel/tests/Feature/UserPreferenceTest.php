<?php

declare(strict_types=1);

use App\Enums\UserPreference;
use App\Models\Eloquent\User;

it('reports every known preference on login, defaulting to off', function (): void {
    // The client must never have to decide what a missing key means, and off is
    // the safe default: the content warning shows until it is dismissed.
    $user = User::factory()->create([
        'password' => 'password112233',
    ]);

    $this->postJson('/api/login', [
        'email' => $user->email,
        'password' => 'password112233',
    ])
        ->assertOk()
        ->assertJsonPath('user.preferences', [
            UserPreference::HideHeartbreakingWarning->value => false,
        ]);
});

it('lets any signed-in user set their own preference', function (): void {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->patchJson('/api/user/preferences', [
            UserPreference::HideHeartbreakingWarning->value => true,
        ])
        ->assertOk()
        ->assertJsonPath(
            'data.preferences.' . UserPreference::HideHeartbreakingWarning->value,
            true
        );

    expect($user->fresh()?->prefers(UserPreference::HideHeartbreakingWarning))->toBeTrue();
});

it('lets the preference be turned back off', function (): void {
    $user = User::factory()->create([
        'preferences' => [
            UserPreference::HideHeartbreakingWarning->value => true,
        ],
    ]);

    $this->actingAs($user)
        ->patchJson('/api/user/preferences', [
            UserPreference::HideHeartbreakingWarning->value => false,
        ])
        ->assertOk();

    expect($user->fresh()?->prefers(UserPreference::HideHeartbreakingWarning))->toBeFalse();
});

it('needs no admin role', function (): void {
    // Preferences are self-service on purpose; account administration is not.
    expect(User::factory()->create()->isAdmin())->toBeFalse();

    $this->actingAs(User::factory()->create())
        ->patchJson('/api/user/preferences', [
            UserPreference::HideHeartbreakingWarning->value => true,
        ])
        ->assertOk();
});

it('rejects a payload with no known preference in it', function (): void {
    // Otherwise a typo'd key would validate, merge nothing and answer 200 - the
    // client would believe it saved.
    $this->actingAs(User::factory()->create())
        ->patchJson('/api/user/preferences', [
            'hide_sad_things' => true,
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors('preferences');
});

it('rejects a non-boolean preference', function (): void {
    $this->actingAs(User::factory()->create())
        ->patchJson('/api/user/preferences', [
            UserPreference::HideHeartbreakingWarning->value => 'yes please',
        ])
        ->assertStatus(422);
});

it('cannot be used to change identity or roles', function (): void {
    // The reason this is a separate route from `PUT /api/users/{user}`: it must
    // not become the self-service crack in an admin-only surface.
    $user = User::factory()->create([
        'email' => 'mine@user.com',
    ]);

    $this->actingAs($user)
        ->patchJson('/api/user/preferences', [
            UserPreference::HideHeartbreakingWarning->value => true,
            'email' => 'hijacked@user.com',
            'first_name' => 'Hijacked',
            'roles' => ['admin'],
        ])
        ->assertOk();

    $fresh = $user->fresh();

    expect($fresh?->email)
        ->toBe('mine@user.com')
        ->and($fresh?->first_name)
        ->toBe($user->first_name)
        ->and($fresh?->isAdmin())
        ->toBeFalse();
});

it('touches nobody else\'s preferences', function (): void {
    // There is no {user} parameter to aim elsewhere, which is the point.
    $user = User::factory()->create();
    $other = User::factory()->create();

    $this->actingAs($user)
        ->patchJson('/api/user/preferences', [
            UserPreference::HideHeartbreakingWarning->value => true,
        ])
        ->assertOk();

    expect($other->fresh()?->prefers(UserPreference::HideHeartbreakingWarning))->toBeFalse();
});

it('keeps preferences it was not asked about', function (): void {
    // Merged rather than replaced, so a client toggling one preference cannot
    // clear another it has never heard of.
    $user = User::factory()->create([
        'preferences' => [
            'some_future_preference' => true,
        ],
    ]);

    $this->actingAs($user)
        ->patchJson('/api/user/preferences', [
            UserPreference::HideHeartbreakingWarning->value => true,
        ])
        ->assertOk();

    expect($user->fresh()?->preferences)
        ->toBe([
            'some_future_preference' => true,
            UserPreference::HideHeartbreakingWarning->value => true,
        ]);
});

it('requires authentication', function (): void {
    $this->patchJson('/api/user/preferences', [
        UserPreference::HideHeartbreakingWarning->value => true,
    ])->assertUnauthorized();
});
