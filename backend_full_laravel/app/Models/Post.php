<?php

namespace App\Models;

use App\Traits\HasFindOneOrFail;
use Carbon\Carbon;
use MongoDB\Laravel\Eloquent\Model;

/**
 * @property int $authorId
 * @property string $authorName
 * @property string $content
 * @property Carbon $createdAt
 * @property array $tags
 * @property array $images
 */
class Post extends Model
{
    use HasFindOneOrFail;

    protected $connection = 'mongodb';
    protected string $collection = 'posts';

    protected $fillable = ['authorId', 'authorName', 'content', 'createdAt', 'tags', 'images'];
}
