<?php

declare(strict_types=1);

namespace App\Models\Eloquent;

use App\Casts\UserRoles;
use App\Enums\UserRole;
use Database\Factories\Eloquent\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Laravel\Sanctum\HasApiTokens;

/**
 * @property string $id
 * @property string $first_name
 * @property ?string $middle_name
 * @property string $last_name
 * @property string $email
 * @property string $password
 * @property Collection<int, UserRole> $roles
 */
class User extends Authenticatable
{
    use HasApiTokens;
    /** @use HasFactory<UserFactory> */
    use HasFactory;
    use Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'first_name',
        'middle_name',
        'last_name',
        'email',
        'password',
    ];

    /**
     * The column has the same default, but Eloquent does not read it back after
     * an insert - so a freshly created `User` had no roles in memory, and
     * `UserResource` died on it while the row itself was fine. Declaring it here
     * means the value exists before the insert, and is written explicitly.
     *
     * A raw JSON string, because `$attributes` holds pre-cast values.
     *
     * @var array<string, string>
     */
    protected $attributes = [
        'roles' => '["' . UserRole::User->value . '"]',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The primary key is a Postgres `uuid` column, so a malformed route value
     * makes the lookup itself fail (SQLSTATE 22P02 — "invalid input syntax for
     * type uuid") and surfaces as a 500. Treat it as "not found" instead.
     *
     * @param mixed $value
     * @param ?string $field
     */
    public function resolveRouteBinding($value, $field = null): ?Model
    {
        if (($field ?? $this->getRouteKeyName()) === $this->getKeyName()
            && (! is_string($value) || ! Str::isUuid($value))) {
            return null;
        }

        return parent::resolveRouteBinding($value, $field);
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, mixed>
     */
    protected function casts(): array
    {
        return [
            'id' => 'string',
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'roles' => UserRoles::class,
        ];
    }

    /**
     * Membership, not equality: the list is additive, so an admin also carries
     * `user` and a role added later cannot silently revoke anything.
     *
     * A value in the column that is not a known case is dropped by `UserRoles`,
     * so hand-edited data costs an account that role rather than granting one.
     *
     * `roles` is deliberately absent from `$fillable`: no request may set it, so
     * there is no payload that can promote an account. Roles are assigned by the
     * seeder, which writes through the query builder.
     */
    public function hasRole(UserRole $role): bool
    {
        return $this->roles->contains($role);
    }

    public function isAdmin(): bool
    {
        return $this->hasRole(UserRole::Admin);
    }

    /**
     * @return BelongsToMany<User, User>
     */
    public function followers(): BelongsToMany
    {
        /** @var BelongsToMany<User, User> $relation */
        $relation = $this->belongsToMany(User::class, 'user_followers', 'followed_id', 'follower_id');

        return $relation;
    }

    /**
     * @return BelongsToMany<User, User>
     */
    public function following(): BelongsToMany
    {
        /** @var BelongsToMany<User, User> $relation */
        $relation = $this->belongsToMany(User::class, 'user_followers', 'follower_id', 'followed_id');

        return $relation;
    }
}
