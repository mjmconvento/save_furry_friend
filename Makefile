# Fresh clone -> working app:
#
#     cp .env.docker.example .env
#     make bootstrap
#
# Every recipe runs inside the containers, so the host needs Docker and nothing
# else: no PHP, no Composer, no Node.

COMPOSE ?= docker compose
# -T disables TTY allocation so the same recipes work from a non-interactive
# shell (CI, a hook, another Makefile).
EXEC    ?= $(COMPOSE) exec -T app
YARN    ?= $(COMPOSE) exec -T react yarn

# Display only, for the URLs bootstrap prints. Mirrors NGINX_PORT / REACT_PORT
# in ./.env; override on the command line if you remapped them there.
NGINX_PORT         ?= 8081
REACT_PORT         ?= 3000
MINIO_CONSOLE_PORT ?= 9002

.DEFAULT_GOAL := help
.PHONY: help up down bootstrap env deps fresh logs shell test lint
# bootstrap's prerequisites are strictly ordered (env writes the .env that
# compose interpolates, up starts the containers deps execs into), so -j must
# not interleave them.
.NOTPARALLEL:

help: ## show targets
	@grep -hE '^[a-z-]+:.*##' $(MAKEFILE_LIST) | sed 's/:.*##/\t/'

# --wait blocks until every healthcheck reports healthy. It is only meaningful
# because docker-compose.yml defines healthchecks; without them it returns as
# soon as the containers are created and `migrate` races Postgres startup.
up: ## build and start the stack, blocking until every healthcheck passes
	$(COMPOSE) up -d --build --wait

down: ## stop the stack, keep volumes
	$(COMPOSE) down

# Both files, because they serve different consumers: ./.env is read by compose
# itself (datastore credentials, published ports) and never reaches the app,
# backend_full_laravel/.env is read by Laravel inside the container.
env: ## create ./.env and backend_full_laravel/.env if absent
	@test -f .env \
	  || { cp .env.docker.example .env; echo "created ./.env from .env.docker.example"; }
	@test -f backend_full_laravel/.env \
	  || { cp backend_full_laravel/.env.example backend_full_laravel/.env; \
	       echo "created backend_full_laravel/.env from .env.example"; }

deps: ## composer install and generate APP_KEY if missing
	$(EXEC) composer install
	@grep -q '^APP_KEY=base64:' backend_full_laravel/.env || $(EXEC) php artisan key:generate

# No MinIO step: the minio-init service creates the uploads bucket and its
# anonymous-download policy. Seeding is idempotent - users are matched on a
# fixed uuid and the sample posts replace their own previous run - so
# re-running bootstrap on an existing stack is safe.
bootstrap: env up deps ## one command: fresh clone -> working app
	$(EXEC) php artisan migrate --seed
	@echo
	@echo "SPA         http://localhost:$(REACT_PORT)"
	@echo "API health  http://localhost:$(NGINX_PORT)/up"
	@echo "MinIO       http://localhost:$(MINIO_CONSOLE_PORT)  (MINIO_ROOT_USER / MINIO_ROOT_PASSWORD from ./.env)"
	@echo "login       test1@user.com / password112233  (also test2, test3, test4)"

fresh: ## drop every table, re-migrate, re-seed
	$(EXEC) php artisan migrate:fresh --seed

logs: ## follow app and react output
	$(COMPOSE) logs -f app react

shell: ## interactive shell in the app container
	$(COMPOSE) exec app bash

# Pest wants a dedicated Postgres database named `testing`, created once with
# `docker compose exec db createdb -U root testing` (see README).
test: ## backend Pest + frontend Vitest
	$(EXEC) composer test
	$(YARN) test

lint: ## backend PHPStan/ECS/Rector + frontend typecheck/eslint/prettier
	$(EXEC) composer phpstan
	$(EXEC) composer ecs-check
	$(EXEC) composer rector
	$(YARN) typecheck
	$(YARN) lint
	$(YARN) format:check
