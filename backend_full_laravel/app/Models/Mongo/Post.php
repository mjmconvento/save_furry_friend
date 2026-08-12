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
 * @property ?string $authorAvatar
 *   Not stored: filled in from Postgres by `PostService::attachAuthorAvatars()`
 *   so a changed picture cannot leave old posts showing the old one. Absent from
 *   `$fillable`, and these instances are never saved.
 *
 * @method static ?Post find(string $id)
 */
class Post extends Model
{
    public const CREATED_AT = 'createdAt';

    public const UPDATED_AT = 'updatedAt';

    protected $connection = 'mongodb';

    protected $table = 'posts';

    protected $fillable = ['authorId', 'authorName', 'content', 'tags', 'medias'];

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
