<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * The post tag vocabulary. The API deliberately does not validate tags - a post
 * may carry anything - but the three tones below are the ones the app has feeds
 * and badges for, and the daily summary has to report a count for each of them
 * even when it is zero.
 *
 * Mirrors `frontend_react/src/config/tags.ts`, which owns the same list for the
 * SPA's filters and badges. Keep the two in step.
 */
enum PostTag: string
{
    case Happy = 'happy_post';
    case Neutral = 'neutral_post';
    case Heartbreaking = 'heartbreaking_post';
}
