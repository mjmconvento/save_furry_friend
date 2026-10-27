<?php

declare(strict_types=1);

namespace App\Models\Mongo;

use Carbon\Carbon;
use Illuminate\Support\Str;
use MongoDB\Laravel\Eloquent\Model;

/**
 * @property string $id
 * @property string $authorId
 * @property string $authorName
 * @property string $content
 * @property ?Carbon $createdAt
 * @property ?Carbon $updatedAt
 * @property array<string> $tags
 * @property array<string> $medias
 * @property array<string> $likes
 *   Account ids, maintained with atomic `$addToSet` / `$pull` so two taps
 *   cannot double-count. Deliberately absent from `$fillable`: a like is not
 *   something a post payload may set. Absent on every document written before
 *   likes existed, so readers must treat it as `[]`.
 * @property ?string $authorAvatar
 *   Not stored: filled in from Postgres by `PostService::attachAuthorAvatars()`
 *   so a changed picture cannot leave old posts showing the old one. Absent from
 *   `$fillable`, and these instances are never saved.
 *
 * @property int $commentCount
 *   Not stored either: counted from the `comments` collection by
 *   `PostService::hydrate()`.
 * @method static ?Post find(string $id)
 */
class Post extends Model
{
    public const CREATED_AT = 'createdAt';

    public const UPDATED_AT = 'updatedAt';

    #[\Override]
    protected $connection = 'mongodb';

    #[\Override]
    protected $table = 'posts';

    #[\Override]
    protected $fillable = ['authorId', 'authorName', 'content', 'tags', 'medias'];

    #[\Override]
    public $incrementing = false;

    #[\Override]
    protected $keyType = 'string';

    /**
     * @var array<string, string>
     */
    #[\Override]
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
