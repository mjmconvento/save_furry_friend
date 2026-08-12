<?php

declare(strict_types=1);

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\StoreAvatarRequest;
use App\Http\Resources\UserResource;
use App\Models\Eloquent\User;
use App\Services\User\AvatarService;
use Illuminate\Http\Request;

/**
 * Your own profile picture, and nothing else.
 *
 * Sibling of `UserPreferenceController`, and separate from `UserController` for
 * the same reason: account administration is admin-only, so self-service is
 * granted one narrow column at a time on routes with no `{user}` parameter to
 * point elsewhere.
 */
class AvatarController extends Controller
{
    public function __construct(
        private readonly AvatarService $avatars
    ) {
    }

    public function store(StoreAvatarRequest $request): UserResource
    {
        /** @var User $user */
        $user = $request->user();

        /** @var \Illuminate\Http\UploadedFile $file */
        $file = $request->file('avatar');

        $this->avatars->replace($user, $file);

        return new UserResource($user);
    }

    public function destroy(Request $request): UserResource
    {
        /** @var User $user */
        $user = $request->user();

        $this->avatars->remove($user);

        return new UserResource($user);
    }
}
