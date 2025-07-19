<?php

namespace App\Models\Eloquent;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * @property string $id
 * @property string $first_name
 * @property string $middle_name
 * @property string $last_name
 * @property string $email
 * @property string $password
 *
 * @method static ?User find(string $id)
 */
class User extends Authenticatable
{

    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

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
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    public static function findOneOrFail(string $id): User
    {
        $user = static::find($id);

        if (!$user) {
            throw new NotFoundHttpException('User not found.');
        }

        return $user;
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'id' => 'string',
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
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
