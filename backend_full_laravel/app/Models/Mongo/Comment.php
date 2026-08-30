<?php

declare(strict_types=1);

namespace App\Models\Mongo;

use Carbon\Carbon;
use Illuminate\Support\Str;
use MongoDB\Laravel\Eloquent\Model;

/**
 * A comment on a post.
 *
 * Its own collection rather than an array on the post, for two reasons. A
 * thread can be paginated, which an embedded array cannot without slicing the
 * document. And the author's name stays out of it: `Post::authorName` is
 * denormalized and needs `SyncAuthorName` to fan out and stay honest, so
 * embedding comments would extend that fan-out into every subdocument. Identity
 * is resolved from Postgres at render time instead - the rule
 * `PostService::attachAuthorAvatars` already argues for.
 *
 * @property string $id
 * @property string $postId
 * @property string $authorId
 * @property string $content
 * @property ?Carbon $createdAt
 * @property ?Carbon $updatedAt
 * @property ?string $authorName
 *   Not stored: filled in from Postgres by `CommentService::attachAuthors()`.
 *   Absent from `$fillable`, and these instances are never saved.
 * @property ?string $authorAvatar
 *   Not stored either, same reason.
 *
 * @method static ?Comment find(string $id)
 */
class Comment extends Model
{
    public const CREATED_AT = 'createdAt';

    public const UPDATED_AT = 'updatedAt';

    protected $connection = 'mongodb';

    protected $table = 'comments';

    protected $fillable = ['postId', 'authorId', 'content'];

    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'createdAt' => 'datetime',
        'updatedAt' => 'datetime',
    ];

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (self $model): void {
            if (! $model->getKey()) {
                $model->{$model->getKeyName()} = (string) Str::uuid();
            }
        });
    }
}
