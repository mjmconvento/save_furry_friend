<?php

namespace App\Http\Controllers;

use App\Models\Eloquent\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->only('email', 'password');

        if (Auth::attempt($credentials)) {
            /** @var User $user */
            $user = Auth::user();

            return response()->json([
                'message' => 'Login successful',
                'token' => $request->user()->createToken('token_name')->plainTextToken,
                'user' => $user->toArray(),
            ]);
        }

        return response()->json(['message' => 'Unauthorized'], 401);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::logout();
        return response()->json(['message' => 'Logout successful']);
    }
}
