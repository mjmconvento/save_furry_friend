<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $credentials = $request->only('email', 'password');

        if (Auth::attempt($credentials)) {
            // Authentication passed, return success message
            return response()->json([
                'message' => 'Login successful',
                'token' => $request->user()->createToken('token_name')->plainTextToken,
            ], 200);
        }

        // Authentication failed, return error
        return response()->json(['message' => 'Unauthorized'], 401);
    }

    public function logout(Request $request)
    {
        Auth::logout(); // Log the user out
        return response()->json(['message' => 'Logout successful'], 200);
    }
}
