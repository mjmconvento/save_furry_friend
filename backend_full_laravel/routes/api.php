<?php

declare(strict_types=1);

use App\Http\Controllers\AuthController;
use App\Http\Controllers\PostController;
use App\Http\Controllers\User\FollowController;
use App\Http\Controllers\User\UserController;
use App\Http\Controllers\User\UserPreferenceController;
use Illuminate\Support\Facades\Route;

Route::post('login', [AuthController::class, 'login'])->middleware('throttle:login')->name('login');

Route::middleware('auth:sanctum')->group(function (): void {
    Route::post('logout', [AuthController::class, 'logout'])->name('logout');

    // These MUST be declared BEFORE apiResource('users'), or `search` is
    // swallowed by the {user} wildcard.
    Route::get('users/search/{keyword}', [UserController::class, 'search'])->name('users.search');
    Route::post('users/{user}/follow', [FollowController::class, 'follow'])->name('users.follow');
    Route::post('users/{user}/unfollow', [FollowController::class, 'unfollow'])->name('users.unfollow');

    // Singular `user`, meaning the token's own account: no {user} parameter
    // exists, so this cannot be aimed at anyone else. Account administration
    // stays admin-only on `users` below.
    Route::patch('user/preferences', [UserPreferenceController::class, 'update'])
        ->name('user.preferences.update');

    // Same rule as `users/search` above: declared before apiResource('posts'),
    // or `summary` is swallowed by the {post} wildcard.
    Route::get('posts/summary', [PostController::class, 'summary'])->name('posts.summary');

    Route::apiResource('posts', PostController::class);
    // `store` lives in this group now: creating an account is an admin action,
    // so there is no public registration endpoint left to rate-limit.
    Route::apiResource('users', UserController::class);
});
