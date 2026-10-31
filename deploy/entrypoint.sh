#!/bin/sh
# Starts the server container: checks the settings, builds the prod cache, and brings the database
# schema up to date before taking requests (docs/deploy.md). Then runs the command given (FrankenPHP).
set -e

if [ "$1" = "frankenphp" ]; then
	: "${APP_SECRET:?APP_SECRET is not set: put it in deploy/.env (openssl rand -hex 32)}"
	: "${DATABASE_URL:?DATABASE_URL is not set}"

	php bin/console cache:clear --no-interaction
	# The database container reports healthy before it takes connections from other containers, so try a few times.
	tries=0
	until php bin/console doctrine:migrations:migrate --no-interaction --allow-no-migration; do
		tries=$((tries + 1))
		if [ "$tries" -ge 10 ]; then
			echo "Migrations failed 10 times; giving up." >&2
			exit 1
		fi
		sleep 3
	done
	chown -R www-data:www-data var "${SAVES_DIR:-/srv/saves}"
fi

exec docker-php-entrypoint "$@"
