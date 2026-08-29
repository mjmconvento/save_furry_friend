<?php

declare(strict_types=1);

use App\Enums\TriviaSpecies;
use App\Enums\TriviaTone;
use App\Models\Eloquent\Trivia;
use Database\Seeders\TriviaSeeder;

it('seeds the documented 200-fact corpus', function (): void {
    $this->seed(TriviaSeeder::class);

    expect(Trivia::count())->toBe(200)
        // The dashboard card reads only happy and neutral, so those two carry
        // the bulk; heartbreaking serves its feed page alone.
        ->and(Trivia::where('tone', TriviaTone::Happy)->count())->toBe(80)
        ->and(Trivia::where('tone', TriviaTone::Neutral)->count())->toBe(80)
        ->and(Trivia::where('tone', TriviaTone::Heartbreaking)->count())->toBe(40);
});

it('replaces its own output on a re-run instead of doubling it', function (): void {
    // `make bootstrap` runs `migrate --seed` unconditionally, so a seeder that
    // appends would grow the table by 200 every time.
    $this->seed(TriviaSeeder::class);
    $this->seed(TriviaSeeder::class);

    expect(Trivia::count())->toBe(200);
});

it('covers cats, dogs and both in every tone', function (): void {
    // Every tone page shows its own trivia area, so no tone may end up as a
    // single-species column.
    $this->seed(TriviaSeeder::class);

    foreach (TriviaTone::cases() as $tone) {
        foreach ([TriviaSpecies::Cat, TriviaSpecies::Dog] as $species) {
            expect(
                Trivia::where('tone', $tone)->where('species', $species)->count()
            )->toBeGreaterThan(0);
        }
    }
});
