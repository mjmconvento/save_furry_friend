<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Enums\UserRole;
use App\Models\Eloquent\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/**
 * Wire shape for a user. Keys are snake_case on purpose — the React client's
 * `interface/User.ts` reads exactly these.
 *
 * Two fields are viewer- or query-relative rather than properties of the row, and
 * both are read from per-request properties the callers fill in: `viewerFollows`
 * and `profileStats` on the model. They used to be constructor arguments, which
 * only worked for a single resource - `UserResource::collection()` instantiates
 * members with the resource argument alone, so a list of people could never carry
 * its own follow state. Every list needed one.
 *
 * `stats` stays null wherever nobody displays it: the user index and people
 * search do not pay for three counts per row.
 */
class UserResource extends JsonResource
{
    public function __construct(
        private readonly User $user,
    ) {
        parent::__construct($user);
    }

    /**
     * @return array{
     *     id: string,
     *     first_name: string,
     *     middle_name: ?string,
     *     last_name: string,
     *     email: string,
     *     email_verified: bool,
     *     avatar: ?string,
     *     roles: list<string>,
     *     preferences: array<string, bool>,
     *     is_following: bool,
     *     stats: ?array{posts: int, followers: int, following: int}
     * }
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->user->id,
            'first_name' => $this->user->first_name,
            'middle_name' => $this->user->middle_name,
            'last_name' => $this->user->last_name,
            'email' => $this->user->email,
            // A boolean, not the timestamp: the SPA only decides whether to show
            // the "unverified" banner, and a date it never renders is one more
            // thing to keep in step.
            'email_verified' => $this->user->hasVerifiedEmail(),
            // Stored as a bare object key, like post media, so the bucket can
            // move without a data migration.
            'avatar' => $this->user->avatar === null
                ? null
                : Storage::disk('s3')->url($this->user->avatar),
            // `AuthController@login` returns this same resource, so the SPA gets
            // the roles with the token instead of needing a second request.
            // `array_values` so it serializes as a JSON array rather than an
            // object, whatever the keys look like.
            'roles' => array_values(
                $this->user->roles
                    ->map(static fn (UserRole $role): string => $role->value)
                    ->all()
            ),
            // Every known preference with its effective value, so the client
            // never has to decide what a missing key means.
            'preferences' => $this->user->preferenceMap(),
            // False when nobody hydrated it, which is also the right answer for
            // a resource that *is* the viewer.
            'is_following' => $this->user->viewerFollows ?? false,
            'stats' => $this->user->profileStats,
        ];
    }
}
