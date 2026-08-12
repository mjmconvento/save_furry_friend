<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Eloquent\User;

/**
 * Administering accounts is an admin function; seeing and following them is what
 * the app is for. So listing, creating, editing and deleting users are
 * admin-only, while `show`, `users/search/{keyword}` and follow/unfollow stay
 * open to every signed-in user - gating those would break profile pages and the
 * follow graph, which are the product rather than its administration.
 *
 * There is deliberately no self-service exception: a non-admin cannot edit or
 * delete even their own account. Nothing in the SPA offers that, and an
 * exception nobody exercises is a hole to forget about.
 *
 * Every ability takes only the actor, because the target's identity no longer
 * changes the answer. That is also what lets the checks run in the FormRequests
 * (`authorize()` needs no model), so an unauthorized caller gets 403 before
 * validation can answer 422 and disclose whether their payload was well-formed.
 * `destroy` has no FormRequest, so it authorizes in the controller.
 */
class UserPolicy
{
    /**
     * Listing every account, including the email addresses no feed exposes.
     */
    public function viewAny(User $user): bool
    {
        return $user->isAdmin();
    }

    public function create(User $user): bool
    {
        return $user->isAdmin();
    }

    public function update(User $user): bool
    {
        return $user->isAdmin();
    }

    public function delete(User $user): bool
    {
        return $user->isAdmin();
    }
}
