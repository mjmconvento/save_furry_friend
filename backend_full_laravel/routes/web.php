<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\PostController;
use App\Http\Controllers\TokenController;
use App\Http\Controllers\User\FollowController;
use App\Http\Controllers\User\UserController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::post('/api/login', [AuthController::class, 'login']);
Route::post('/api/logout', [AuthController::class, 'logout']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/api/token/csrf', [TokenController::class, 'generateCsrfToken']);
    Route::get('/api/token/user', [TokenController::class, 'generateBearerToken']);

    Route::get('/api/users', [UserController::class, 'index']);
    Route::post('/api/users', [UserController::class, 'store']);
    Route::put('/api/users/{id}', [UserController::class, 'update']);
    Route::delete('/api/users/{id}', [UserController::class, 'destroy']);
    Route::get('/api/users/{id}', [UserController::class, 'show']);
    Route::get('/api/users/search/{keyword}', [UserController::class, 'search']);

    Route::post('/api/users/follow/{id}', [FollowController::class, 'follow']);
    Route::post('/api/users/unfollow/{id}', [FollowController::class, 'unfollow']);

    Route::get('/api/posts', [PostController::class, 'index']);
    Route::post('/api/posts', [PostController::class, 'store']);
    Route::put('/api/posts/{id}', [PostController::class, 'update']);
    Route::delete('/api/posts/{id}', [PostController::class, 'destroy']);
    Route::get('/api/posts/{id}', [PostController::class, 'show']);
});
