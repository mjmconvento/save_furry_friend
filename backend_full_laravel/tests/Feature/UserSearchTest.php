<?php

declare(strict_types=1);

use App\Models\Eloquent\User;

$named = static fn (string $first, ?string $middle, string $last): User => User::factory()->create([
    'first_name' => $first,
    'middle_name' => $middle,
    'last_name' => $last,
]);

it('finds someone by their full displayed name, past a middle name', function () use ($named): void {
    // The reported bug: the SPA shows "Daniel Okafor", but one `ILIKE` over
    // `first || ' ' || middle || ' ' || last` needs the words to be adjacent, so
    // the middle name made the name on screen unsearchable.
    $target = $named('Daniel', 'Chukwu', 'Okafor');

    $this->actingAs(User::factory()->create())
        ->getJson('/api/users/search/Daniel Okafor')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $target->id);
});

it('finds someone whose middle name is null', function () use ($named): void {
    // The second bug in the same expression: `coalesce(middle_name, '')` leaves
    // two spaces, so "Marisol Vega" did not match `Marisol  Vega` either.
    $target = $named('Marisol', null, 'Vega');

    $this->actingAs(User::factory()->create())
        ->getJson('/api/users/search/Marisol Vega')
        ->assertOk()
        ->assertJsonPath('data.0.id', $target->id);
});

it('does not care which order the words are typed in', function () use ($named): void {
    $target = $named('Daniel', 'Chukwu', 'Okafor');

    $this->actingAs(User::factory()->create())
        ->getJson('/api/users/search/Okafor Daniel')
        ->assertOk()
        ->assertJsonPath('data.0.id', $target->id);
});

it('ignores case and repeated spaces', function () use ($named): void {
    $target = $named('Priya', null, 'Raman');

    $this->actingAs(User::factory()->create())
        ->getJson('/api/users/search/priya   raman')
        ->assertOk()
        ->assertJsonPath('data.0.id', $target->id);
});

it('still matches a single word', function () use ($named): void {
    $target = $named('Tomas', 'Iker', 'Iglesias');

    $this->actingAs(User::factory()->create())
        ->getJson('/api/users/search/Iglesias')
        ->assertOk()
        ->assertJsonPath('data.0.id', $target->id);
});

it('requires every word to match, not just one', function () use ($named): void {
    // Otherwise "Daniel Okafor" would also return every other Daniel.
    $named('Daniel', 'Chukwu', 'Okafor');
    $named('Daniel', null, 'Mensah');

    $this->actingAs(User::factory()->create())
        ->getJson('/api/users/search/Daniel Okafor')
        ->assertOk()
        ->assertJsonCount(1, 'data');
});

it('returns nothing for a keyword nobody matches', function () use ($named): void {
    $named('Daniel', 'Chukwu', 'Okafor');

    $this->actingAs(User::factory()->create())
        ->getJson('/api/users/search/zzzznobody')
        ->assertOk()
        ->assertJsonCount(0, 'data');
});

it('returns nothing rather than everyone for whitespace', function () use ($named): void {
    $named('Daniel', 'Chukwu', 'Okafor');
    $named('Marisol', null, 'Vega');

    $this->actingAs(User::factory()->create())
        ->getJson('/api/users/search/%20%20')
        ->assertOk()
        ->assertJsonCount(0, 'data');
});

it('never returns the person searching', function () use ($named): void {
    // You are not a search result for yourself.
    $viewer = $named('Marisol', null, 'Vega');

    $this->actingAs($viewer)
        ->getJson('/api/users/search/Marisol')
        ->assertOk()
        ->assertJsonCount(0, 'data');
});

it('puts people you already follow first', function () use ($named): void {
    $viewer = User::factory()->create();
    $stranger = $named('Aaa', null, 'Walker');
    $followed = $named('Zzz', null, 'Walker');

    $viewer->following()
        ->attach($followed->id);

    $this->actingAs($viewer)
        ->getJson('/api/users/search/Walker')
        ->assertOk()
        ->assertJsonPath('data.0.id', $followed->id)
        ->assertJsonPath('data.1.id', $stranger->id);
});

it('caps how many results a dropdown has to render', function (): void {
    User::factory()->count(15)->create([
        'last_name' => 'Walker',
    ]);

    $this->actingAs(User::factory()->create())
        ->getJson('/api/users/search/Walker')
        ->assertOk()
        ->assertJsonCount(10, 'data');
});
