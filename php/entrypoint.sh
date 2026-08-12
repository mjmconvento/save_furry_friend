#!/bin/sh
set -e

# Every deployment forgets this once. Without a key Laravel still boots and then
# fails deep inside the first request that touches encryption or a signed URL, so
# the error surfaces nowhere near its cause. Refusing to start says it plainly.
if [ -z "${APP_KEY}" ]; then
    echo "entrypoint: APP_KEY is not set." >&2
    echo "entrypoint: generate one with 'php artisan key:generate --show' and set it" >&2
    echo "entrypoint: as an environment variable on the service." >&2
    exit 1
fi

# `php artisan config:cache` freezes the result of every `env()` call at the
# moment it runs. Baking it into the image froze the *build's* environment, which
# has no `.env` at all (it is .dockerignored): the published container then read
# `DB_HOST=127.0.0.1`, a null `APP_KEY` and `mongodb://mongo:27017` from config
# defaults, and silently ignored everything the hosting platform injected.
#
# Caching here instead - after the platform has set the environment, before
# php-fpm accepts a request - is what makes runtime configuration work. It costs
# about a tenth of a second per container start.
#
# `route:cache` stays in the image: no route file in this app reads `env()`, so
# it has nothing to freeze.
php artisan config:cache

# The platform picks the port and tells you at runtime - Render injects 10000,
# Cloud Run and Container Apps 8080. nginx has no equivalent of `env()`, so the
# vhost is a template rendered here. Only ${PORT} is substituted: naming it
# explicitly stops envsubst from eating nginx's own $uri, $document_root and
# every other dollar variable in the file.
if [ -f /etc/nginx/templates/default.conf.template ]; then
    envsubst '${PORT}' \
        < /etc/nginx/templates/default.conf.template \
        > /etc/nginx/conf.d/default.conf
fi

exec "$@"
