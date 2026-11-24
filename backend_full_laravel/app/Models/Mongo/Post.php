<?php

declare(strict_types=1);

namespace App\Models\Mongo;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Attributes\Connection;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
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
 *   cannot double-count. Deliberately absent from `#[Fillable]`: a like is not
 *   something a post payload may set. Absent on every document written before
 *   likes existed, so readers must treat it as `[]`.
 * @property ?string $authorAvatar
 *   Not stored: filled in from Postgres by `PostService::attachAuthorAvatars()`
 *   so a changed picture cannot leave old posts showing the old one. Absent from
 *   `#[Fillable]`, and these instances are never saved.
 *
 * @property int $commentCount
 *   Not stored either: counted from the `comments` collection by
 *   `PostService::hydrate()`.
 * @method static ?Post find(string $id)
 */
#[Connection('mongodb')]
#[Table('posts', keyType: 'string', incrementing: false)]
#[Fillable(['authorId', 'authorName', 'content', 'tags', 'medias'])]
class Post extends Model
{
    public const CREATED_AT = 'createdAt';

    public const UPDATED_AT = 'updatedAt';

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
