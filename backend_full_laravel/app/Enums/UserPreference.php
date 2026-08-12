<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Per-account display preferences, stored in `users.preferences`.
 *
 * This enum is the allowlist: `UpdateUserPreferencesRequest` builds its rules
 * from it and the controller merges nothing else, so the preferences endpoint
 * cannot be talked into writing an arbitrary key - or any other column.
 *
 * Every preference is a boolean that defaults to false, and false must always be
 * the safe answer: a session that has never heard of a preference behaves as if
 * it were off. `hide_heartbreaking_warning` reads that way round for exactly
 * that reason - the default shows the warning.
 */
enum UserPreference: string
{
    case HideHeartbreakingWarning = 'hide_heartbreaking_warning';
}
