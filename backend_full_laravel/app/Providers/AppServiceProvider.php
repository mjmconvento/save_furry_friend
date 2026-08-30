<?php

declare(strict_types=1);

namespace App\Providers;

use App\Models\Eloquent\User;
use App\Models\Mongo\Comment;
use App\Models\Mongo\Post;
use App\Policies\CommentPolicy;
use App\Policies\PostPolicy;
use App\Policies\UserPolicy;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Contracts\Auth\CanResetPassword;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use InvalidArgumentException;
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
        // cannot find them; register all three explicitly.
        Gate::policy(Post::class, PostPolicy::class);
        Gate::policy(Comment::class, CommentPolicy::class);
        Gate::policy(User::class, UserPolicy::class);

        RateLimiter::for('api', fn (Request $request): Limit => Limit::perMinute(60)
            ->by($request->user()?->id ?: $request->ip()));

        RateLimiter::for('login', fn (Request $request): array => [
            Limit::perMinute(5)->by($request->string('email')->lower() . '|' . $request->ip()),
            Limit::perMinute(20)->by($request->ip()),
        ]);

        // Laravel's default builds this from a `password.reset` WEB route, which
        // this API does not have and should not: the person needs a form, and
        // only the SPA has one. The token travels in the query and comes back
        // to `PasswordResetController::reset` in a POST body.
        //
        // The address is appended because the broker verifies the token against
        // it, and the SPA cannot know which account a bare token belongs to.
        // The signature must accept `mixed` to satisfy the framework's own
        // callback type, so the notifiable is narrowed here instead. The throw
        // is unreachable in this app - `Foundation\Auth\User` implements the
        // contract - but it states the requirement rather than building a
        // silently broken link out of an unexpected notifiable.
        ResetPassword::createUrlUsing(function (mixed $user, string $token): string {
            if (! $user instanceof CanResetPassword) {
                throw new InvalidArgumentException(
                    'A password reset URL needs a CanResetPassword notifiable.'
                );
            }

            return sprintf(
                '%s/reset-password?token=%s&email=%s',
                Config::string('cors.frontend_url'),
                $token,
                urlencode($user->getEmailForPasswordReset()),
            );
        });

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
