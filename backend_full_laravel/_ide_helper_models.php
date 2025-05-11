<?php

// @formatter:off
// phpcs:ignoreFile
/**
 * A helper file for your Eloquent Models
 * Copy the phpDocs from this file to the correct Model,
 * And remove them from this file, to prevent double declarations.
 *
 * @author Barry vd. Heuvel <barryvdh@gmail.com>
 */


namespace App\Models{
/**
 * 
 *
 * @property string $title
 * @property string $author
 * @property string $content
 * @property Carbon $createdAt
 * @property array $tags
 * @property mixed $id 3 occurrences
 * @property \Illuminate\Support\Carbon|null $created_at 1 occurrences
 * @property \Illuminate\Support\Carbon|null $updated_at 1 occurrences
 * @method static \MongoDB\Laravel\Eloquent\Builder<static>|Post addHybridHas(\Illuminate\Database\Eloquent\Relations\Relation $relation, string $operator = '>=', string $count = 1, string $boolean = 'and', ?\Closure $callback = null)
 * @method static \MongoDB\Laravel\Eloquent\Builder<static>|Post aggregate($function = null, $columns = [])
 * @method static \MongoDB\Laravel\Eloquent\Builder<static>|Post getConnection()
 * @method static \MongoDB\Laravel\Eloquent\Builder<static>|Post insert(array $values)
 * @method static \MongoDB\Laravel\Eloquent\Builder<static>|Post insertGetId(array $values, $sequence = null)
 * @method static \MongoDB\Laravel\Eloquent\Builder<static>|Post newModelQuery()
 * @method static \MongoDB\Laravel\Eloquent\Builder<static>|Post newQuery()
 * @method static \MongoDB\Laravel\Eloquent\Builder<static>|Post query()
 * @method static \MongoDB\Laravel\Eloquent\Builder<static>|Post raw($value = null)
 * @method static \MongoDB\Laravel\Eloquent\Builder<static>|Post search(\MongoDB\Builder\Type\SearchOperatorInterface|array $operator, ?string $index = null, ?array $highlight = null, ?bool $concurrent = null, ?string $count = null, ?string $searchAfter = null, ?string $searchBefore = null, ?bool $scoreDetails = null, ?array $sort = null, ?bool $returnStoredSource = null, ?array $tracking = null)
 * @method static \MongoDB\Laravel\Eloquent\Builder<static>|Post vectorSearch(string $index, string $path, array $queryVector, int $limit, bool $exact = false, \MongoDB\Builder\Type\QueryInterface|array $filter = [], ?int $numCandidates = null)
 * @method static \MongoDB\Laravel\Eloquent\Builder<static>|Post whereAuthor($value)
 * @method static \MongoDB\Laravel\Eloquent\Builder<static>|Post whereContent($value)
 * @method static \MongoDB\Laravel\Eloquent\Builder<static>|Post whereCreatedAt($value)
 * @method static \MongoDB\Laravel\Eloquent\Builder<static>|Post whereId($value)
 * @method static \MongoDB\Laravel\Eloquent\Builder<static>|Post whereTags($value)
 * @method static \MongoDB\Laravel\Eloquent\Builder<static>|Post whereTitle($value)
 * @method static \MongoDB\Laravel\Eloquent\Builder<static>|Post whereUpdatedAt($value)
 */
	class Post extends \Eloquent {}
}

namespace App\Models{
/**
 * 
 *
 * @property int $id
 * @property string $name
 * @property string $email
 * @property \Illuminate\Support\Carbon|null $email_verified_at
 * @property string $password
 * @property string|null $remember_token
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \Illuminate\Notifications\DatabaseNotificationCollection<int, \Illuminate\Notifications\DatabaseNotification> $notifications
 * @property-read int|null $notifications_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \Laravel\Sanctum\PersonalAccessToken> $tokens
 * @property-read int|null $tokens_count
 * @method static \Database\Factories\UserFactory factory($count = null, $state = [])
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereEmail($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereEmailVerifiedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User wherePassword($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereRememberToken($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereUpdatedAt($value)
 */
	class User extends \Eloquent {}
}

