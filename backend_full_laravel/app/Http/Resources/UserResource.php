<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Enums\UserRole;
use App\Models\Eloquent\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Wire shape for a user. Keys are snake_case on purpose — the React client's
 * `interface/User.ts` reads exactly these.
 *
 * `is_following` is viewer-relative and therefore not derivable from the model
 * alone, so the caller passes it through the constructor:
 *
 *     new UserResource($user, $isFollowing);
 *
 * It defaults to `false`, which is what `UserResource::collection()` yields
 * (Laravel instantiates collection members with the resource argument only, so
 * there is no way to thread a per-item flag through it). `false` is also the
 * correct answer when the resource *is* the viewer.
 */
class UserResource extends JsonResource
{
    public function __construct(
        private readonly User $user,
        private readonly bool $isFollowing = false,
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
     *     roles: list<string>,
     *     preferences: array<string, bool>,
     *     is_following: bool
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
        ];
    }
}
