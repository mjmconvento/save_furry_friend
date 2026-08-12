<?php

declare(strict_types=1);

namespace App\Casts;

use App\Enums\UserRole;
use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

/**
 * Laravel's own `AsEnumCollection` resolves values with `UserRole::from()`, which
 * throws on anything the enum does not know. One hand-edited row would then
 * answer 500 to every request that account makes - and to any admin listing it,
 * since `UserResource` reads the same attribute.
 *
 * `tryFrom` drops the unrecognised value instead. The account loses that role,
 * which is the safe direction, and it matches what the SPA does with the same
 * payload: an unknown role is not an implicit grant.
 *
 * @implements CastsAttributes<Collection<int, UserRole>, iterable<UserRole|string>>
 */
final class UserRoles implements CastsAttributes
{
    /**
     * @param  array<string, mixed>  $attributes
     * @return Collection<int, UserRole>
     */
    public function get(Model $model, string $key, mixed $value, array $attributes): Collection
    {
        $decoded = is_string($value) ? json_decode($value, true) : $value;
        $roles = [];

        if (is_array($decoded)) {
            foreach ($decoded as $entry) {
                $case = is_string($entry) ? UserRole::tryFrom($entry) : null;

                // Duplicates would make `roles` misreport its own length without
                // changing what the account can do.
                if ($case instanceof UserRole && ! in_array($case, $roles, true)) {
                    $roles[] = $case;
                }
            }
        }

        return new Collection($roles);
    }

    /**
     * @param  array<string, mixed>  $attributes
     * @return array<string, string>
     */
    public function set(Model $model, string $key, mixed $value, array $attributes): array
    {
        $values = [];

        if (is_iterable($value)) {
            foreach ($value as $entry) {
                // The declared input is `UserRole|string`, so anything not an
                // enum case is a candidate backing value.
                $case = $entry instanceof UserRole ? $entry : UserRole::tryFrom($entry);

                if ($case instanceof UserRole && ! in_array($case->value, $values, true)) {
                    $values[] = $case->value;
                }
            }
        }

        // `json_encode` of a list cannot fail here: every element is a string.
        return [
            $key => (string) json_encode($values),
        ];
    }
}
