<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Which animal a trivia is about, so the card can label it. `Both` covers
 * facts that compare the two or apply to either.
 *
 * Mirrors the `Species` type in `frontend_react/src/interface/Trivia.ts`.
 */
enum TriviaSpecies: string
{
    case Cat = 'cat';
    case Dog = 'dog';
    case Both = 'both';
}
