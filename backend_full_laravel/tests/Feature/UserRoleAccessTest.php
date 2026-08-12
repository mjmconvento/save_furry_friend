<?php

declare(strict_types=1);

use App\Enums\UserRole;
use App\Models\Eloquent\User;
use Illuminate\Support\Facades\DB;

it('lets an admin list every account', function (): void {
    User::factory()->count(2)->create();

    $this->actingAs(User::factory()->admin()->create())
        ->getJson('/api/users')
        ->assertOk()
        ->assertJsonPath('meta.total', 3);
});

it('forbids a non-admin from listing accounts', function (): void {
    // The index exposes every email address, which no feed does.
    $this->actingAs(User::factory()->create())
        ->getJson('/api/users')
        ->assertForbidden();
});

it('forbids a non-admin from creating an account', function (): void {
    $this->actingAs(User::factory()->create())
        ->postJson('/api/users', [
            'firstName' => 'Un',
            'lastName' => 'Invited',
            'email' => 'uninvited@user.com',
            'password' => 'password112233',
            'password_confirmation' => 'password112233',
        ])
        ->assertForbidden();

    expect(User::where('email', 'uninvited@user.com')->exists())->toBeFalse();
});

it('answers 403 before 422, so a rejected caller learns nothing about the payload', function (): void {
    // Authorization runs in the FormRequest rather than the controller precisely
    // for this: an invalid body from an unauthorized caller must not come back
    // as a validation report.
    $this->actingAs(User::factory()->create())
        ->postJson('/api/users', [
            'email' => 'not-an-email',
        ])
        ->assertForbidden();
});

it('requires authentication to create an account, now that registration is not public', function (): void {
    $this->postJson('/api/users', [
        'firstName' => 'Anon',
        'lastName' => 'Person',
        'email' => 'anon@user.com',
        'password' => 'password112233',
        'password_confirmation' => 'password112233',
    ])->assertUnauthorized();
});

it('lets an admin create, edit and delete any account', function (): void {
    $admin = User::factory()->admin()->create();
    $target = User::factory()->create();

    $this->actingAs($admin)
        ->postJson('/api/users', [
            'firstName' => 'Invited',
            'lastName' => 'Person',
            'email' => 'invited@user.com',
            'password' => 'password112233',
            'password_confirmation' => 'password112233',
        ])
        ->assertCreated();

    $this->actingAs($admin)
        ->putJson("/api/users/{$target->id}", [
            'firstName' => 'Renamed',
        ])
        ->assertOk();

    $this->actingAs($admin)
        ->deleteJson("/api/users/{$target->id}")
        ->assertOk();

    expect($target->fresh())
        ->toBeNull()
        ->and(User::where('email', 'invited@user.com')->exists())->toBeTrue();
});

it('forbids a non-admin from editing or deleting even their own account', function (): void {
    // Deliberate: there is no self-service exception, because no screen offers
    // one and an unused exception is a hole to forget about.
    $user = User::factory()->create();

    $this->actingAs($user)
        ->putJson("/api/users/{$user->id}", [
            'firstName' => 'Renamed',
        ])
        ->assertForbidden();

    $this->actingAs($user)
        ->deleteJson("/api/users/{$user->id}")
        ->assertForbidden();

    expect($user->fresh()?->first_name)
        ->toBe($user->first_name);
});

it('still lets a non-admin view and search other users', function (): void {
    // Profile pages and the people search feed the follow graph; gating them
    // would break the product rather than protect its administration.
    $viewer = User::factory()->create();
    $other = User::factory()->create([
        'first_name' => 'Findable',
    ]);

    $this->actingAs($viewer)
        ->getJson("/api/users/{$other->id}")
        ->assertOk()
        ->assertJsonPath('data.id', $other->id);

    $this->actingAs($viewer)
        ->getJson('/api/users/search/Findable')
        ->assertOk()
        ->assertJsonPath('data.0.id', $other->id);
});

it('reports the whole role list on login so the client can hide admin navigation', function (): void {
    $admin = User::factory()->admin()->create([
        'password' => 'password112233',
    ]);

    $this->postJson('/api/login', [
        'email' => $admin->email,
        'password' => 'password112233',
    ])
        ->assertOk()
        // Additive, so the admin carries `user` too.
        ->assertJsonPath('user.roles', [UserRole::Admin->value, UserRole::User->value]);
});

it('grants administration on membership, not on the whole list matching', function (): void {
    // The point of a list: an account holding `admin` among other roles is an
    // admin, whatever else it holds and in whatever order.
    $admin = User::factory()->create([
        'roles' => [UserRole::User, UserRole::Admin],
    ]);

    expect($admin->isAdmin())
        ->toBeTrue()
        ->and($admin->hasRole(UserRole::User))->toBeTrue();

    $this->actingAs($admin)
        ->getJson('/api/users')
        ->assertOk();
});

it('ignores a stored role that is not a known case', function (): void {
    // Written straight to the column, bypassing the cast, as hand-edited data
    // would be. The unknown value must not become an implicit grant.
    $user = User::factory()->create();
    DB::table('users')->where('id', $user->id)->update([
        'roles' => json_encode(['superuser', UserRole::User->value]),
    ]);

    $reloaded = $user->fresh();

    expect($reloaded?->roles->count())
        ->toBe(1)
        ->and($reloaded?->isAdmin())
        ->toBeFalse();

    $this->actingAs($reloaded)
        ->getJson('/api/users')
        ->assertForbidden();
});

it('defaults a new account to the non-admin role', function (): void {
    // `roles` is not fillable, so no payload can promote an account.
    $this->actingAs(User::factory()->admin()->create())
        ->postJson('/api/users', [
            'firstName' => 'Sneaky',
            'lastName' => 'Person',
            'email' => 'sneaky@user.com',
            'password' => 'password112233',
            'password_confirmation' => 'password112233',
            'roles' => ['admin'],
        ])
        ->assertCreated()
        ->assertJsonPath('data.roles', [UserRole::User->value]);

    expect(User::where('email', 'sneaky@user.com')->first()?->isAdmin())->toBeFalse();
});
