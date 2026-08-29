<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * The trivia tone vocabulary. Values are the tone keys the SPA's theme palette
 * is indexed by (`theme.palette.tone`), NOT the post tag literals: a trivia is
 * ours end to end, so unlike post tags the API validates against this list.
 *
 * Mirrors the `Tone` type in `frontend_react/src/interface/Trivia.ts`. Keep the
 * two in step.
 */
enum TriviaTone: string
{
    case Happy = 'happy';
    case Neutral = 'neutral';
    case Heartbreaking = 'heartbreaking';
}
