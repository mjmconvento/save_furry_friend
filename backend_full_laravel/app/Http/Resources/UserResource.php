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
 * Two fields are viewer- or query-relative rather than properties of the model,
 * so the caller passes them through the constructor:
 *
 *     new UserResource($user, $isFollowing, $stats);
 *
 * `is_following` defaults to `false`, which is what `UserResource::collection()`
 * yields (Laravel instantiates collection members with the resource argument
 * only, so there is no way to thread a per-item flag through it). `false` is also
 * the correct answer when the resource *is* the viewer.
 *
 * `stats` defaults to `null` and is sent as `null` on lists, deliberately:
 * counting posts, followers and following per row would be three extra queries
 * per user, one of them against Mongo. Only `show` pays for them, because only a
 * profile page displays them.
 */
class UserResource extends JsonResource
{
    /**
     * @param ?array{posts: int, followers: int, following: int} $stats
     */
    public function __construct(
        private readonly User $user,
        private readonly bool $isFollowing = false,
        private readonly ?array $stats = null,
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
            'is_following' => $this->isFollowing,
            'stats' => $this->stats,
        ];
    }
}
