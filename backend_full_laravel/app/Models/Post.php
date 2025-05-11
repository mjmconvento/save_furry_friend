<?php

namespace App\Models;

use Carbon\Carbon;
use MongoDB\Laravel\Eloquent\Model;

/**
 * @property string $title
 * @property string $author
 * @property string $content
 * @property Carbon $createdAt
 * @property array $tags
 */
class Post extends Model
{
    protected $connection = 'mongodb';
    protected string $collection = 'posts';

    protected $fillable = ['title', 'author', 'content', 'createdAt', 'tags'];
}
