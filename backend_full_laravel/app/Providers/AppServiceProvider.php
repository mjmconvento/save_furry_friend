<?php

declare(strict_types=1);

namespace App\Providers;

use App\Models\Eloquent\User;
use App\Models\Mongo\Post;
use App\Policies\PostPolicy;
use App\Policies\UserPolicy;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // The models do not live under App\Models, so policy auto-discovery
        // cannot find them; register both explicitly.
        Gate::policy(Post::class, PostPolicy::class);
        Gate::policy(User::class, UserPolicy::class);

        RateLimiter::for('api', fn (Request $request): Limit => Limit::perMinute(60)
            ->by($request->user()?->id ?: $request->ip()));

        RateLimiter::for('login', fn (Request $request): array => [
            Limit::perMinute(5)->by($request->string('email')->lower() . '|' . $request->ip()),
            Limit::perMinute(20)->by($request->ip()),
        ]);
    }
}
