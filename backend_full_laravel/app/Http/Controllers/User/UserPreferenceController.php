<?php

declare(strict_types=1);

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\UpdateUserPreferencesRequest;
use App\Http\Resources\UserResource;
use App\Models\Eloquent\User;

/**
 * Self-service display preferences, and nothing else.
 *
 * Account administration is admin-only (`UserPolicy`), which is why this is a
 * separate controller on a separate route rather than an exception inside
 * `UserController`: it has no `{user}` parameter to point at somebody else, and
 * it can only write keys the `UserPreference` enum defines.
 */
class UserPreferenceController extends Controller
{
    public function update(UpdateUserPreferencesRequest $request): UserResource
    {
        /** @var User $user */
        $user = $request->user();

        /** @var array<string, bool> $submitted */
        $submitted = $request->validated();

        // Merged, not replaced: a client toggling one preference must not clear
        // the ones it did not mention.
        $user->preferences = [...$user->preferences, ...$submitted];
        $user->save();

        return new UserResource($user);
    }
}
