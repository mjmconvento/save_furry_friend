<?php

declare(strict_types=1);

use App\Http\Controllers\AuthController;
use App\Http\Controllers\PostController;
use App\Http\Controllers\User\FollowController;
use App\Http\Controllers\User\UserController;
use Illuminate\Support\Facades\Route;

Route::post('login', [AuthController::class, 'login'])->middleware('throttle:login')->name('login');
Route::post('users', [UserController::class, 'store'])->middleware('throttle:5,1')->name('users.store');

Route::middleware('auth:sanctum')->group(function (): void {
    Route::post('logout', [AuthController::class, 'logout'])->name('logout');

    // These MUST be declared BEFORE apiResource('users'), or `search` is
    // swallowed by the {user} wildcard.
    Route::get('users/search/{keyword}', [UserController::class, 'search'])->name('users.search');
    Route::post('users/{user}/follow', [FollowController::class, 'follow'])->name('users.follow');
    Route::post('users/{user}/unfollow', [FollowController::class, 'unfollow'])->name('users.unfollow');

    Route::apiResource('posts', PostController::class);
    Route::apiResource('users', UserController::class)->except(['store']);
});
