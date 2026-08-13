<?php

declare(strict_types=1);

namespace App\Providers;

use App\Models\Eloquent\User;
use App\Models\Mongo\Post;
use App\Policies\PostPolicy;
use App\Policies\UserPolicy;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Symfony\Component\HttpClient\HttpClient;
use Symfony\Component\Mailer\Bridge\Brevo\Transport\BrevoTransportFactory;
use Symfony\Component\Mailer\Transport\Dsn;
use Symfony\Component\Mailer\Transport\TransportInterface;

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

        // Brevo is not one of Laravel's built-in transports, so it is registered
        // here - the pattern Laravel's mail documentation prescribes, using Brevo
        // as its own worked example.
        //
        // `brevo+api` matters. The bare `brevo` scheme is accepted by the factory
        // but routes to the SMTP transport on port 465, which the free tiers of
        // most PaaS hosts block; it then fails with "Password is not set", an
        // error that says nothing about the real mistake.
        //
        // A `Dsn` object rather than a DSN string on purpose: the string form goes
        // through `parse_url()`, so an API key containing `/`, `:` or `@` silently
        // mis-parses.
        //
        // The client carries an explicit timeout because a hung outbound call
        // otherwise holds a php-fpm worker for the default 100 seconds - and on a
        // free single-instance host there are very few workers to lose.
        Mail::extend('brevo', fn (): TransportInterface => (new BrevoTransportFactory(
            null,
            HttpClient::create([
                'timeout' => 10,
            ]),
        ))->create(new Dsn(
            'brevo+api',
            'default',
            Config::string('services.brevo.key'),
        )));
    }
}
