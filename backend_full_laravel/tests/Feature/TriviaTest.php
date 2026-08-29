<?php

declare(strict_types=1);

use App\Enums\TriviaSpecies;
use App\Enums\TriviaTone;
use App\Models\Eloquent\Trivia;
use App\Models\Eloquent\User;

function trivia(TriviaTone $tone, string $text, TriviaSpecies $species = TriviaSpecies::Both): Trivia
{
    return Trivia::create([
        'text' => $text,
        'tone' => $tone,
        'species' => $species,
    ]);
}

it('returns every trivia when no tones are given', function (): void {
    trivia(TriviaTone::Happy, 'Dogs wag right when relaxed.');
    trivia(TriviaTone::Neutral, 'Cats sleep most of the day.');
    trivia(TriviaTone::Heartbreaking, 'Black cats wait longest for adoption.');

    $this->actingAs(User::factory()->create())
        ->getJson('/api/trivia')
        ->assertOk()
        ->assertJsonCount(3, 'data');
});

it('filters by the requested tones', function (): void {
    trivia(TriviaTone::Happy, 'Adopted dogs learn their new name within days.');
    trivia(TriviaTone::Neutral, 'A cat has five toes in front and four behind.');
    trivia(TriviaTone::Heartbreaking, 'Senior dogs are adopted least of all.');

    $this->actingAs(User::factory()->create())
        ->getJson('/api/trivia?tones[]=happy&tones[]=neutral')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonMissing([
            'tone' => TriviaTone::Heartbreaking->value,
        ]);
});

it('serves the fields the card renders', function (): void {
    $row = trivia(TriviaTone::Happy, 'Purring can soothe people too.', TriviaSpecies::Cat);

    $this->actingAs(User::factory()->create())
        ->getJson('/api/trivia?tones[]=happy')
        ->assertOk()
        ->assertJsonPath('data.0', [
            'id' => $row->id,
            'text' => 'Purring can soothe people too.',
            'tone' => 'happy',
            'species' => 'cat',
        ]);
});

it('rejects a tone outside the vocabulary', function (): void {
    // The trivia vocabulary is ours alone - unlike post tags, which are
    // deliberately open - so a typo like `hapy` must 422, not silently match
    // nothing.
    $this->actingAs(User::factory()->create())
        ->getJson('/api/trivia?tones[]=hapy')
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['tones.0']);
});

it('requires authentication', function (): void {
    $this->getJson('/api/trivia')
        ->assertUnauthorized();
});

it('is reachable by a non-admin', function (): void {
    // A reading surface, not administration.
    $this->actingAs(User::factory()->create())
        ->getJson('/api/trivia')
        ->assertOk();
});
