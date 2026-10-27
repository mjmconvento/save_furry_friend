# Exact patch pin: Dependabot's docker ecosystem then opens a PR for every new
# 8.5.x patch, and .github/dependabot.yml ignores php minor/major bumps because
# moving to 8.6 is a deliberate upgrade (composer.json platform, CI, Rector).
# composer.json's config.platform.php must never be newer than this tag.
FROM php:8.5.12-fpm AS base

# Pinned deliberately: the PECL release must satisfy what composer.lock
# requires (mongodb/mongodb 2.5.0 requires `ext-mongodb: ^2.5`), and 2.5.5's
# package.xml declares PHP 8.1.0-8.99.99. Bump on purpose, never by
# rebuilding: an unpinned `pecl install` builds clean and then `composer install`
# refuses the day PECL ships a release the lock does not accept. When
# mongodb/mongodb moves to a new minor, raise this to a matching 2.x first.
ARG MONGODB_EXT_VERSION=2.5.5

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        git \
        unzip \
        libfcgi-bin \
        libicu-dev \
        libpq-dev \
        libssl-dev \
        libxml2-dev \
        libzip-dev \
        pkg-config; \
    # No opcache here: since PHP 8.5 OPcache is compiled into PHP itself, and
    # `docker-php-ext-install opcache` fails with "cp: cannot stat 'modules/*'".
    docker-php-ext-install -j"$(nproc)" pdo_pgsql pgsql zip intl; \
    pecl install "mongodb-${MONGODB_EXT_VERSION}"; \
    docker-php-ext-enable mongodb; \
    pecl clear-cache; \
    apt-get purge -y --auto-remove pkg-config; \
    rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer

COPY php/opcache.ini /usr/local/etc/php/conf.d/10-opcache.ini
COPY php/uploads.ini /usr/local/etc/php/conf.d/20-uploads.ini
COPY php/fpm-ping.conf /usr/local/etc/php-fpm.d/zz-ping.conf

WORKDIR /var/www

EXPOSE 9000

CMD ["php-fpm"]

# Deployable artifact: nginx + php-fpm in ONE container, answering HTTP on
# ${PORT}. Compose does not use this stage - its dev service targets `base` and
# bind-mounts the source over /var/www, which would shadow anything baked here.
#
# Why one container rather than the two compose runs: every free PaaS instance
# gives you a single container and routes to a single injected port. `base`
# alone speaks FastCGI on 9000 and nothing but nginx can talk to it, so a
# platform pointed at this image would connect and get bytes it cannot parse.
FROM base AS prod

ENV COMPOSER_ALLOW_SUPERUSER=1 \
    COMPOSER_NO_INTERACTION=1 \
    PORT=8080

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends nginx supervisor gettext-base; \
    rm -rf /var/lib/apt/lists/*

COPY backend_full_laravel/composer.json backend_full_laravel/composer.lock ./
RUN composer install --no-dev --no-scripts --prefer-dist --no-progress

COPY backend_full_laravel/ ./

COPY php/nginx-single.conf.template /etc/nginx/templates/default.conf.template
COPY php/supervisord.conf /etc/supervisord.conf
COPY php/entrypoint.sh /usr/local/bin/entrypoint

RUN set -eux; \
    composer dump-autoload --no-dev --optimize --classmap-authoritative; \
    php artisan route:cache; \
    php artisan view:cache; \
    echo 'opcache.validate_timestamps=0' >> /usr/local/etc/php/conf.d/10-opcache.ini; \
    # The dev vhost ships in the image via `nginx/conf.d`; drop the distro
    # default so it cannot answer on the same port as the rendered template.
    rm -f /etc/nginx/sites-enabled/default /etc/nginx/conf.d/default.conf; \
    # Running as www-data: the pid path must be writable, and the `user`
    # directive is meaningless (and warns) without super-user privileges.
    sed -i 's#^pid .*#pid /tmp/nginx.pid;#; /^user /d' /etc/nginx/nginx.conf; \
    # Non-root needs to own everything nginx and Laravel write at runtime: the
    # request-body spool, the rendered vhost, and Laravel's own caches.
    mkdir -p /var/lib/nginx/body /var/log/nginx; \
    chown -R www-data:www-data \
        storage bootstrap/cache \
        /var/lib/nginx /var/log/nginx /etc/nginx/conf.d

# Deliberately NOT `config:cache` - see the entrypoint. `view:cache` IS here: it
# precompiles the Blade templates behind the verification email, so the running
# container never writes to storage/framework/views.

USER www-data

EXPOSE 8080

ENTRYPOINT ["entrypoint"]
CMD ["supervisord", "-c", "/etc/supervisord.conf"]
