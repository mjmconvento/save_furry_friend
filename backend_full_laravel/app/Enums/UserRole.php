<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Two roles, and deliberately no permission table: every question the app asks
 * is "is this person an admin?". A package like spatie/laravel-permission would
 * add three tables and a cache to answer that one boolean.
 *
 * Backed by its wire value, because `UserResource` sends it to the SPA and
 * `frontend_react/src/interface/User.ts` matches on these exact strings.
 */
enum UserRole: string
{
    case Admin = 'admin';
    case User = 'user';
}
