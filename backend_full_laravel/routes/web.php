<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\UserController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::post('/api/login', [AuthController::class, 'login']);
Route::post('/api/logout', [AuthController::class, 'logout']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/api/csrf-token', function () {
        return response()->json([
            'csrf_token' => csrf_token(),
        ]);
    });

    Route::post('/api/tokens/create', function (Request $request) {
        $token = $request->user()->createToken("token_name");
        return ['token' => $token->plainTextToken];
    });

    Route::post('/api/users', [UserController::class, 'store']);
    Route::put('/api/users/{id}', [UserController::class, 'update']);
    Route::delete('/api/users/{id}', [UserController::class, 'destroy']);
    Route::get('/api/users', [UserController::class, 'index']);
    Route::get('/api/users/{id}', [UserController::class, 'show']);
});


