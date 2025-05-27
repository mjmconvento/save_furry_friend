<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\JsonResponse;

class TokenController extends Controller
{
    public function generateCsrfToken(Request $request): JsonResponse
    {
        $token = $request->session()->token();

        return response()->json([
            'csrfToken' => $token,
        ]);
    }

    public function generateBearerToken(Request $request): JsonResponse
    {
        $token = $request->user()->createToken("bearerTokenName");

        return response()->json([
            'token' => $token->plainTextToken,
        ]);
    }
}
