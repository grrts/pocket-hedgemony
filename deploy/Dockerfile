# The production image (docs/deploy.md): FrankenPHP (Caddy with PHP 8.3 built in) serving the Symfony
# server from /app/public and the web game from /play, with HTTPS from Let's Encrypt for SERVER_NAME.
# Built from the repository root: docker compose -f deploy/compose.yaml build

# --- The web game (apps/client), built to talk to this same address ---
FROM node:22-bookworm-slim AS client
WORKDIR /src
RUN corepack enable
COPY . .
# Where the game's cloud saves, sign-in and online play go: the address it is served from.
ARG VITE_CLOUD_API=
ARG VITE_GOOGLE_CLIENT_ID=
ARG VITE_APPLE_SERVICES_ID=
ARG VITE_APPLE_REDIRECT_URI=
ENV CI=1
# Only the client and what it imports: the desktop app's Electron download is not needed here.
RUN pnpm install --frozen-lockfile --filter "@ph/client..." \
 && pnpm --filter @ph/client build

# --- PHP dependencies ---
FROM composer:2 AS vendor
WORKDIR /app
COPY server/composer.json server/composer.lock server/symfony.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --no-interaction --no-progress --ignore-platform-reqs
COPY server/ ./
RUN rm -rf var .env.local .env.*.local \
 && composer dump-autoload --no-dev --optimize --classmap-authoritative

# --- The server ---
FROM dunglas/frankenphp:1-php8.3-bookworm
RUN install-php-extensions pdo_pgsql intl zip \
 && cp "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"
COPY deploy/php.ini $PHP_INI_DIR/conf.d/zz-pocket-hegemony.ini
COPY deploy/Caddyfile /etc/frankenphp/Caddyfile
COPY deploy/entrypoint.sh /usr/local/bin/ph-entrypoint
WORKDIR /app
ENV APP_ENV=prod APP_DEBUG=0 SAVES_DIR=/srv/saves
COPY --from=vendor /app ./
COPY --from=client /src/apps/client/dist ./public/play
RUN mkdir -p var /srv/saves && chown -R www-data:www-data var /srv/saves && chmod +x /usr/local/bin/ph-entrypoint
ENTRYPOINT ["ph-entrypoint"]
CMD ["frankenphp", "run", "--config", "/etc/frankenphp/Caddyfile", "--adapter", "caddyfile"]
