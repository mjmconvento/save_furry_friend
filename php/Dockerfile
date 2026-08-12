# Pinned minor, floating patch: Laravel 12 supports PHP 8.2-8.4, and the whole
# verified state of this app (test suite, static analysis, the image on disk)
# is 8.2. The ARG below is what controls the extension version, not the tag.
FROM php:8.2-fpm AS base

# Pinned deliberately to the version the app is actually validated against
# (`php --ri mongodb` in the current image reports 2.0.0). It satisfies the
# locked constraint `ext-mongodb: ^2.0` (mongodb/mongodb 2.0.0 in composer.lock)
# and its package.xml declares PHP 8.1.0-8.99.99. Bump on purpose, never by
# rebuilding: an unpinned `pecl install` builds clean and then `composer install`
# refuses the day PECL ships a new major.
ARG MONGODB_EXT_VERSION=2.0.0

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
    docker-php-ext-install -j"$(nproc)" pdo_pgsql pgsql zip intl opcache; \
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

# Deployable artifact. Everything below is invisible in dev: the compose dev
# service targets `base` and bind-mounts the source over /var/www, which would
# shadow anything baked here.
FROM base AS prod

ENV COMPOSER_ALLOW_SUPERUSER=1 \
    COMPOSER_NO_INTERACTION=1

COPY backend_full_laravel/composer.json backend_full_laravel/composer.lock ./
RUN composer install --no-dev --no-scripts --prefer-dist --no-progress

COPY backend_full_laravel/ ./

RUN set -eux; \
    composer dump-autoload --no-dev --optimize --classmap-authoritative; \
    php artisan config:cache; \
    php artisan route:cache; \
    chown -R www-data:www-data storage bootstrap/cache; \
    echo 'opcache.validate_timestamps=0' >> /usr/local/etc/php/conf.d/10-opcache.ini

USER www-data
