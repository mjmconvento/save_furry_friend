<?php

namespace App\Http\Controllers;

use App\Models\Eloquent\User;
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
        /** @var User $requestUser */
        $requestUser = $request->user();

        $token = $requestUser->createToken("bearerTokenName");

        return response()->json([
            'token' => $token->plainTextToken,
        ]);
    }
}
