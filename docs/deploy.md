# Deploying the server

The server (`server/`) is one Symfony app: the game's JSON API (accounts, cloud saves, shared saves, purchases), the website, the wiki and the community forum. To put the whole thing on one rented server for testing, follow [A test server on one VPS](#a-test-server-on-one-vps); the rest of this page is how the launch setup should go once a host is picked.

## The shape

```
            players, the website
                    │ https
            ┌───────▼────────┐
            │ load balancer  │  TLS, /api/health checks
            └───┬────────┬───┘
        ┌───────▼──┐  ┌──▼───────┐
        │ app 1    │  │ app 2 …  │  nginx or Caddy + PHP 8.3 FPM, no state of their own
        └──┬────┬──┘  └──┬────┬──┘
           │    └────────┼────┼──────────┐
     ┌─────▼─────────────▼┐  ┌▼──────────▼──────────┐
     │ PostgreSQL 16      │  │ S3-compatible bucket │
     │ accounts, rows,    │  │ save files (.phsave) │
     │ sessions, limits   │  └──────────────────────┘
     └────────────────────┘
```

One app server is enough at launch; the point is that a second one can be added at any time without changing anything. An app server keeps nothing that must survive: everything players make sits in the database or the bucket.

| What | Where | Why it works across servers |
|---|---|---|
| Accounts, devices, save rows, purchases, the forum | PostgreSQL | One database. |
| Save files (cloud and shared saves) | The bucket, under `S3_PREFIX` | `S3_BUCKET` set: `App\Saves\S3SaveObjects`. Without it they go to the folder `SAVES_DIR`, which only that server sees. |
| Website sign-in sessions | `sessions` table | `PdoSessionHandler` (`config/packages/framework.yaml`), on its own connection. |
| Rate limits, login throttling, Apple's and Google's sign-in keys | `cache_items` table | `cache.app` is the `doctrine_dbal` adapter (`config/packages/cache.yaml`), and the limiters keep their counts in it. |
| "Remember me" on the website, CSRF tokens | Signed with `APP_SECRET` | Every server must have the same `APP_SECRET`. |
| Compiled container, Twig and Doctrine caches | `var/cache/prod` on each server | Built at deploy, thrown away at the next one. |

The rate limiters have no lock between servers, so two requests landing on two servers in the same instant can both pass the last free slot. For limits like "5 sign-ins in 15 minutes" one extra try is harmless.

## Picking a host

What to look for: PHP 8.3 with `pdo_pgsql` and `intl`, a managed PostgreSQL 16 with daily snapshots and point-in-time recovery, and S3-compatible storage with object versioning. Examples that fit: a VPS or two (Hetzner, DigitalOcean) with their managed Postgres; Fly.io or Render with their Postgres; any of these with Cloudflare R2, Backblaze B2 or AWS S3 for the bucket. Keep the database and the bucket in the same region as the app servers.

## A test server on one VPS

Everything on one machine with Docker: the website, the wiki, the forum, the JSON API and the web game at `https://<your domain>/play/`, with PostgreSQL 16 next to it and an HTTPS certificate that Caddy gets and renews by itself. The files are in [`deploy/`](../deploy/README.md). The web game is built to talk to the same address, so cloud saves, accounts and (once it is merged) online play work from the browser with nothing else to set up.

### 1. Rent the server and point a domain at it

1. Create a server: Ubuntu 24.04, at least 2 vCPU and 4 GB of memory (building the game needs about 2 GB). Hetzner's CX22 or DigitalOcean's 4 GB droplet are enough. Add your SSH key while creating it.
2. In your domain's DNS, add an **A record** for the address players will open (for example `play.example.com`) pointing at the server's IPv4 address, and an **AAAA record** for its IPv6 address if it has one. Wait until `ping play.example.com` answers from that address; Caddy can't get a certificate before it does.
3. If the host has a firewall in its control panel, allow TCP 22, 80 and 443 and UDP 443.

### 2. Install Docker and get the code

SSH in (`ssh root@play.example.com`) and run:

```sh
curl -fsSL https://get.docker.com | sh          # Docker Engine and the compose plugin
git clone https://github.com/grrts/pocket-hedgemony.git /srv/pocket-hegemony
cd /srv/pocket-hegemony
```

If the repository is private, `git clone` asks for a GitHub user and a token: make a [fine-grained personal access token](https://github.com/settings/personal-access-tokens/new) with read access to this repository's contents, and paste it as the password.

### 3. Fill in the settings

```sh
cp deploy/.env.example deploy/.env
sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$(openssl rand -hex 32)/; s/^APP_SECRET=.*/APP_SECRET=$(openssl rand -hex 32)/" deploy/.env
nano deploy/.env        # set DOMAIN=play.example.com (no https://)
```

`deploy/.env` holds the database password and `APP_SECRET`; keep a copy in your password manager. Everything else in the [settings table](#settings) is filled in from `DOMAIN` by `deploy/compose.yaml`. For extras (Steam, Apple and Google sign-in, store purchases, S3 for the save files) put the lines from `server/.env` into `deploy/server.env`; it is read if it exists.

### 4. Start it

```sh
docker compose -f deploy/compose.yaml up -d --build
docker compose -f deploy/compose.yaml logs -f app    # Ctrl+C to stop watching
```

The first build takes a few minutes. When it starts, the app container builds its cache, runs the database migrations (the first time this makes the whole schema), and Caddy fetches the certificate; the log shows `certificate obtained successfully`. Then check:

- `https://play.example.com/api/health` answers `{"status":"ok"}`.
- `https://play.example.com/` is the website, and its Play button opens `https://play.example.com/play/`.
- In the game, the account card's sign-up works and a cloud save appears on a second device or browser.

To make yourself the forum's first moderator after signing up on the website: `docker compose -f deploy/compose.yaml exec app php bin/console app:community:moderator you@example.com`.

### Updating to the latest main

```sh
cd /srv/pocket-hegemony
git pull
docker compose -f deploy/compose.yaml up -d --build
```

The new container runs any new migrations before it takes requests. Players see the new game on their next page load (the page itself is never cached; its scripts have new names each build).

### Everyday commands

All from `/srv/pocket-hegemony`; `dc` below stands for `docker compose -f deploy/compose.yaml`.

| What | Command |
|---|---|
| See what's running | `dc ps` |
| Follow the server's log | `dc logs -f app` |
| A Symfony console command | `dc exec app php bin/console <command>` |
| Where the migrations stand | `dc exec app php bin/console doctrine:migrations:status` |
| A database shell | `dc exec database psql -U app app` |
| Stop everything (data is kept) | `dc down` |

The data lives in Docker volumes: `pocket-hegemony_database_data` (the database), `pocket-hegemony_saves` (cloud save files, while `S3_BUCKET` is unset) and `pocket-hegemony_caddy_data` (the certificates). `dc down` keeps them; `dc down -v` deletes them all, so never add `-v` on a server with players.

### Scheduled jobs and backups

Add the [scheduled jobs](#scheduled-jobs) and a nightly database dump to root's crontab (`crontab -e`):

```cron
15 3 * * * cd /srv/pocket-hegemony && for c in app:saves:purge app:crashes:purge app:stores:google-voided cache:pool:prune; do docker compose -f deploy/compose.yaml exec -T app php bin/console $c; done
45 3 * * * cd /srv/pocket-hegemony && mkdir -p backups && docker compose -f deploy/compose.yaml exec -T database pg_dump -U app -Fc app > backups/db-$(date +\%F).dump && find backups -name 'db-*.dump' -mtime +7 -delete
```

A dump on the same machine doesn't survive losing the machine: turn on the host's server backups or snapshots too, and copy `backups/` somewhere else (`rclone copy backups offsite:ph-db-backups`) once players' data matters. To restore a dump into a fresh database: `dc exec -T database pg_restore -U app -d app --clean --if-exists < backups/db-YYYY-MM-DD.dump`, then `dc restart app`.

### When something goes wrong

- **No certificate, the browser warns**: the DNS record doesn't point at the server yet, or port 80 or 443 is closed. `dc logs app | grep -i acme` says which. Caddy retries by itself; Let's Encrypt allows only a few failed tries an hour, so fix the DNS before restarting again and again.
- **The app container keeps restarting**: `dc logs app`. "APP_SECRET is not set" or "Set DOMAIN in deploy/.env" mean a setting is missing; "Migrations failed" means the database refused, usually a changed `POSTGRES_PASSWORD` after the database was first made (the password is fixed when the volume is created).
- **The build stops with "Killed"**: the server ran out of memory building the game. Add swap (`fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile`) or pick a bigger server.
- **The game says it can't reach the server**: open `https://play.example.com/api/health` in the same browser. The game is built for the address in `DOMAIN`; after changing `DOMAIN`, rebuild with `up -d --build`.

### Testing the image on your own computer

With Docker Desktop: put `DOMAIN=localhost`, `SERVER_NAME=:80`, `PUBLIC_URL=http://localhost` and the two secrets in `deploy/.env`, run `docker compose -f deploy/compose.yaml up -d --build`, and open `http://localhost/play/`. `SERVER_NAME=:80` and `PUBLIC_URL` turn HTTPS off for that test only; never set them on a real server.

## Settings

Set these as real environment variables on every app server (or in `server/.env.local`, which is never committed). Keep the secrets in a password manager too: without `APP_SECRET` and the store keys a rebuilt server can't take over.

| Setting | Value |
|---|---|
| `APP_ENV` | `prod` |
| `APP_SECRET` | 32 random bytes as hex (`openssl rand -hex 32`); the same on every server. Changing it signs everyone out of the website. |
| `DATABASE_URL` | `postgresql://user:password@host:5432/dbname?serverVersion=16&charset=utf8`. Use a password of letters and digits only: the session handler reads the URL without decoding `%` escapes. |
| `S3_BUCKET` | The bucket's name. Empty keeps saves in `SAVES_DIR` (one server only). |
| `S3_PREFIX` | Optional folder in the bucket, e.g. `saves`. |
| `S3_REGION` | AWS region (`eu-central-1`), or `auto` for R2. |
| `S3_ENDPOINT` | Empty for AWS. R2: `https://<account id>.r2.cloudflarestorage.com`; B2: `https://s3.<region>.backblazeb2.com`; MinIO: its URL. |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | A key that may read, write and delete objects in that bucket only. Empty on AWS uses the instance's role. |
| `S3_PATH_STYLE` | `1` for MinIO, else `0`. |
| `TRUSTED_PROXIES` | The load balancer's addresses (`10.0.0.0/8`), or `REMOTE_ADDR` when only the load balancer can reach the app servers. Without it every player has the load balancer's IP, and the per-IP limits lock everyone out together. |
| `DEFAULT_URI` | The site's address, e.g. `https://pockethegemony.com`, for links made outside a request. |
| `CORS_ALLOW_ORIGINS` | The game's origins: the hosted web game's address, `app://game`, `capacitor://localhost`, `https://localhost`. |
| `PLAY_URL`, `STORE_*_URL`, `SUPPORT_EMAIL` | The website's buttons and contact address ([website.md](website.md)). |
| Steam, Apple and Google | Sign-in: `STEAM_*`, `APPLE_CLIENT_IDS`, `GOOGLE_CLIENT_IDS`, `SIGN_IN_RETURN_URLS` ([steam.md](steam.md), `server/.env`). Purchases: [purchases.md](purchases.md). |

## A release

Build once, the same way for every server:

```sh
cd server
composer install --no-dev --optimize-autoloader --classmap-authoritative --no-interaction
APP_ENV=prod php bin/console cache:clear     # builds var/cache/prod
```

Then, in this order:

1. **Back up the database** if the release has a migration (`bin/backup-database`, below), so a bad migration can be undone.
2. **Migrate, once, from one machine**: `php bin/console doctrine:migrations:migrate --no-interaction`. It applies only the migrations not yet run, each in a transaction, and records them in `doctrine_migration_versions`. `doctrine:migrations:status` shows where the database stands.
3. **Switch the app servers** to the new build one at a time; the load balancer keeps traffic on the others meanwhile.

Between steps 2 and 3 the old code runs against the new schema, so a migration must not break the version before it: add columns nullable or with a default, and drop or rename a column in two releases (stop using it, then drop it). Never run `doctrine:schema:update --force` against production: it applies whatever the entities say without review, including drops.

The web server's document root is `server/public/`, with every request that isn't a file going to `index.php` (Symfony's [web server guide](https://symfony.com/doc/current/setup/web_server_configuration.html)). PHP's `upload_max_filesize` and `post_max_size` must allow a save upload (2 MB, `cloud.max_save_mb`), and the web user needs write access to `server/var/` only.

### First deploy

On the new, empty database step 2 makes the whole schema from `migrations/Version20261021000000.php`, then `php bin/console app:community:moderator <email>` makes the first moderator once they have joined.

### Changing an entity

Production's schema comes only from migrations. After changing anything in `src/Entity/`:

```sh
cd server
docker compose up -d database      # PostgreSQL 16 from compose.yaml
export DATABASE_URL="postgresql://app:!ChangeMe!@127.0.0.1:5432/app?serverVersion=16&charset=utf8"
php bin/console doctrine:migrations:migrate -n   # bring it to main's schema
php bin/console doctrine:migrations:diff         # writes migrations/VersionYYYYMMDDHHMMSS.php
```

Read the new migration (Doctrine sometimes drops and re-adds where a rename was meant), give it a description, and commit it with the entity. CI runs every migration on an empty PostgreSQL and fails if the entities still need something (`doctrine:schema:validate`), then runs them all down and up again.

Local development on SQLite keeps using `doctrine:schema:update --force`: the migrations are written for PostgreSQL and refuse to run on anything else. The `sessions` and `cache_items` tables come with it.

## Scheduled jobs

Run each from one machine only (a cron job on one app server, or the host's scheduler):

| When | Command | What it does |
|---|---|---|
| Daily | `php bin/console app:saves:purge` | Deletes the files of cloud saves removed over 30 days ago (SAVE-062). |
| Daily | `php bin/console app:crashes:purge` | Deletes crash reports over 90 days old and usage statistics over 13 months old, as the privacy page promises (SET-141). |
| Daily | `php bin/console app:stores:google-voided` | Marks refunded the Google Play purchases a missed notification didn't ([purchases.md](purchases.md)). |
| Daily | `php bin/console cache:pool:prune` | Removes expired rate-limit counts and keys from `cache_items`. |
| Nightly | `bin/backup-database` | The database backup below. |

Expired sessions clear themselves: about 1 in 100 session starts removes them.

## Watching it

- The load balancer checks `GET /api/health`: 200 while the server reaches the database, 503 when it doesn't, so the balancer stops sending players to it. The bucket is left out of the check on purpose; a bucket outage hits every server, and taking them all out would also take down the website. The game can call it too.
- Errors go to PHP's error log (stderr under FPM). Crash reports and analytics aren't built yet (production readiness, item 7).

## Backups

What a lost day would cost: players' accounts, purchases and cloud saves. The aim is to lose at most a few minutes of the database and nothing of the save files, and to be back within two hours.

**The database**

1. **The host's backups**: turn on daily snapshots and point-in-time recovery (PITR), kept for at least 14 days. PITR is what gets back to "a minute before the bad migration".
2. **Our own copy, elsewhere**: `bin/backup-database` every night. It runs `pg_dump` (custom format), checks the dump by listing it back, copies it with `rclone` to `BACKUP_REMOTE` (a bucket at another provider or in another account, so one closed account or one mistake can't take both), and keeps 7 days locally. Give the remote bucket a 30-day lifecycle rule. It needs `pg_dump` 16 or newer on the machine that runs it.

```sh
DATABASE_URL=… BACKUP_REMOTE=offsite:ph-db-backups bin/backup-database
```

**The save files**

1. **Versioning on the bucket**, with a lifecycle rule that removes noncurrent versions after 30 days. An overwritten or deleted save can then be brought back for a month, which also covers a bug that writes bad bytes.
2. **A copy elsewhere**: `rclone sync` the bucket nightly to the same offsite place as the dumps (`rclone sync prod:ph-saves offsite:ph-saves-copy`).

The database and the bucket are backed up at different moments, and that's fine: a restored database older than the bucket only leaves unused files, and the 30-day wait before `app:saves:purge` deletes a file means a restored database never points at a file that's already gone.

## Restoring

**The database**, from the host's PITR: restore to a new database at the chosen time, check it, then point `DATABASE_URL` at it and restart the app servers. From our own dump:

```sh
createdb -h <host> -U <user> pocket_hegemony_restored
bin/restore-database pocket-hegemony-20261021T030000Z.dump "postgresql://user:pass@host:5432/pocket_hegemony_restored"
```

`bin/restore-database` refuses a database that already has tables, so it can't write over the live one, and prints the accounts, saves and migrations it restored. Then run `doctrine:migrations:status` against it, switch `DATABASE_URL`, and restart.

**A save file**: list its versions in the bucket's console (or `aws s3api list-object-versions --prefix <accountId>/<campaignId>/`) and copy the version wanted back over the current one. The key is in the `cloud_save` row (`<accountId>/<campaignId>/<saveId>.phsave`).

**A restore drill** every three months, and before launch: restore last night's dump into a scratch database with `bin/restore-database`, start one app server against it and the real bucket read-only, sign in and load a cloud save. Write down how long it took. A backup nobody has restored is a guess.
