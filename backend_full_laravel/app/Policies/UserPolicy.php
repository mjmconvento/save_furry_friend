<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Eloquent\User;

class UserPolicy
{
    /**
     * A user may only update their own account.
     */
    public function update(User $user, User $model): bool
    {
        return $user->id === $model->id;
    }

    /**
     * A user may only delete their own account.
     */
    public function delete(User $user, User $model): bool
    {
        return $user->id === $model->id;
    }
}
