# deploy/

One-server deployment with Docker: the game's server, website and web game (at `/play`) behind automatic HTTPS, with PostgreSQL 16. The step-by-step guide is in [docs/deploy.md](../docs/deploy.md#a-test-server-on-one-vps).

| File | What it is |
|---|---|
| `Dockerfile` | Builds the web game (`apps/client`) and the Symfony server into one FrankenPHP image (Caddy with PHP 8.3 built in). Built from the repository root. |
| `Caddyfile` | Serves `/play/` as files and everything else through Symfony. |
| `entrypoint.sh` | On start: checks the settings, builds the prod cache, runs the database migrations. |
| `php.ini` | Production PHP settings. |
| `compose.yaml` | The app and the database (`server/compose.yaml`'s), with volumes for the database, the save files and the HTTPS certificates. |
| `.env.example` | The settings to copy to `deploy/.env`. |
