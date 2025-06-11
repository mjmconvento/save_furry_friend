<?php

namespace App\Traits;

use Illuminate\Database\Eloquent\Model as EloquentModel;
use MongoDB\Laravel\Eloquent\Model as MongoDbModel;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

trait HasFindOneOrFail
{
    /**
     * Find a model by ID or throw a 404 Not Found exception.
     *
     * @param string $id
     * @param array $columns
     *
     * @return EloquentModel|MongoDbModel
     */
    public static function findOneOrFail(string $id, array $columns = ['*']): EloquentModel|MongoDbModel
    {
        $model = static::find($id, $columns);

        if (!$model) {
            throw new NotFoundHttpException('Resource not found.');
        }

        return $model;
    }
}
