<?php

namespace App\Models\Mongo;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Str;
use MongoDB\Laravel\Eloquent\Model;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * @property string $id
 * @property int $authorId
 * @property string $authorName
 * @property string $content
 * @property Carbon $createdAt
 * @property array<string> $tags
 * @property array<string> $medias
 *
 * @method static ?Post find(string $id)
 */
class Post extends Model
{
    protected $connection = 'mongodb';
    protected string $collection = 'posts';

    protected $fillable = ['authorId', 'authorName', 'content', 'createdAt', 'tags', 'medias'];

    public $incrementing = false;
    protected $keyType = 'string';

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function ($model): void {
            if (!$model->getKey()) {
                $model->{(string) $model->getKeyName()} = (string) Str::uuid();
            }
        });
    }

    public static function findOneOrFail(string $id): Post
    {
        $post = static::find($id);

        if (!$post) {
            throw new NotFoundHttpException('Resource not found.');
        }

        return $post;
    }
}
