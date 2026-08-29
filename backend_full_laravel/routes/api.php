<?php

declare(strict_types=1);

use App\Http\Controllers\Auth\EmailVerificationController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\PostController;
use App\Http\Controllers\TriviaController;
use App\Http\Controllers\User\AvatarController;
use App\Http\Controllers\User\FollowController;
use App\Http\Controllers\User\UserController;
use App\Http\Controllers\User\UserPreferenceController;
use Illuminate\Support\Facades\Route;

Route::post('login', [AuthController::class, 'login'])->middleware('throttle:login')->name('login');

// Public, and separate from the admin-only `POST /api/users` on purpose:
// registration creates an account for the caller, account administration creates
// one for somebody else.
Route::post('register', [AuthController::class, 'register'])
    ->middleware('throttle:5,1')
    ->name('register');

// Opened from an email in a browser, so it cannot require a bearer token: the
// signature in the URL is its authority. `signed` rejects a tampered or expired
// link before the controller runs.
Route::get('email/verify/{id}/{hash}', [EmailVerificationController::class, 'verify'])
    ->middleware(['signed', 'throttle:6,1'])
    ->name('verification.verify');

Route::middleware('auth:sanctum')->group(function (): void {
    Route::post('logout', [AuthController::class, 'logout'])->name('logout');

    // These MUST be declared BEFORE apiResource('users'), or `search` is
    // swallowed by the {user} wildcard.
    Route::get('users/search/{keyword}', [UserController::class, 'search'])->name('users.search');
    // Also before apiResource('users'), or `suggestions` resolves as a user id.
    Route::get('users/suggestions', [FollowController::class, 'suggestions'])->name('users.suggestions');
    Route::get('users/{user}/followers', [FollowController::class, 'followers'])->name('users.followers');
    Route::get('users/{user}/following', [FollowController::class, 'following'])->name('users.following');

    Route::post('email/verification-notification', [EmailVerificationController::class, 'send'])
        ->middleware('throttle:6,1')
        ->name('verification.send');
    Route::post('users/{user}/follow', [FollowController::class, 'follow'])->name('users.follow');
    Route::post('users/{user}/unfollow', [FollowController::class, 'unfollow'])->name('users.unfollow');

    // Singular `user`, meaning the token's own account: no {user} parameter
    // exists, so this cannot be aimed at anyone else. Account administration
    // stays admin-only on `users` below.
    Route::patch('user/preferences', [UserPreferenceController::class, 'update'])
        ->name('user.preferences.update');
    Route::post('user/avatar', [AvatarController::class, 'store'])->name('user.avatar.store');
    Route::delete('user/avatar', [AvatarController::class, 'destroy'])->name('user.avatar.destroy');

    // Same rule as `users/search` above: declared before apiResource('posts'),
    // or `summary` is swallowed by the {post} wildcard.
    Route::get('posts/summary', [PostController::class, 'summary'])->name('posts.summary');

    // Read-only: trivia rows come from the seeder, so there is no resource
    // controller to grow into.
    Route::get('trivia', [TriviaController::class, 'index'])->name('trivia.index');

    Route::apiResource('posts', PostController::class);
    // `store` lives in this group now: creating an account is an admin action,
    // so there is no public registration endpoint left to rate-limit.
    Route::apiResource('users', UserController::class);
});
