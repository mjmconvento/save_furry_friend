<?php

declare(strict_types=1);

use App\Models\Eloquent\User;

it('paginates the user index instead of returning every row', function (): void {
    // BE-07's second half: GET /api/users was User::all(), unbounded.
    User::factory()->count(25)->create();

    $response = $this->actingAs(User::factory()->create())
        ->getJson('/api/users')
        ->assertOk()
        ->assertJsonStructure(['data', 'links', 'meta']);

    expect($response->json('data'))
        ->toHaveCount(20)
        ->and($response->json('meta.total'))
        ->toBe(26);
});

it('honours per_page on the user index', function (): void {
    User::factory()->count(5)->create();

    expect($this->actingAs(User::factory()->create())->getJson('/api/users?per_page=3')->json('data'))
        ->toHaveCount(3);
});

it('rejects an out-of-range per_page on the user index', function (): void {
    $this->actingAs(User::factory()->create())
        ->getJson('/api/users?per_page=51')
        ->assertStatus(422);
});

it('never exposes credentials on the user index', function (): void {
    User::factory()->count(3)->create();

    $body = $this->actingAs(User::factory()->create())->getJson('/api/users')->content();

    expect($body)
        ->not->toContain('password')
        ->and($body)
        ->not->toContain('remember_token');
});
