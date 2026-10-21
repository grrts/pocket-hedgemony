# Purchases: the full game on each store

How the game and the server know that the full game was bought. The rules are `domain/saves/spec.md`
SAVE-170 to SAVE-185 and D-SAVE-23; the design is `accounts/accounts-design.md` §6, §8, §10 and §11 step 6.
Cross-buy is per store (Leroy, 19 October): a purchase unlocks the full game only on the store where it was
bought, while the account carries the saves everywhere.

## What happens

- **Steam** sells the paid app; the demo is its own app id and unlocks nothing. The Steam build is the full
  game. When the game asks `GET /api/entitlements/steam`, the server checks `ISteamUser/CheckAppOwnership`
  for the account's SteamID at most once a day and records the purchase; a refund shows as not owned.
- **App Store and Google Play** sell one non-consumable in-app product, `full_game`, in the free download.
  The game asks its store first (offline, no account needed). When signed in it also asks the server, and
  sends the store's proof (`POST /api/purchases`): the StoreKit 2 signed transaction, checked against Apple's
  root certificate, or the Play purchase token, read with `purchases.products.get` and acknowledged.
- **Refunds** come in through `POST /api/stores/apple/notifications` (App Store Server Notifications V2:
  `REFUND`, `REVOKE`, `REFUND_REVERSED`) and `POST /api/stores/google/notifications?token=…` (Play's real-time
  developer notifications through a Pub/Sub push), and from the daily `php bin/console app:stores:google-voided`.
- **A store whose settings are empty is unavailable**: its calls answer 503 `store_unavailable` ("App Store
  purchases are not available on this server."), and everything else keeps working.
- **The game** keeps it all on the Unlock card (Buy with the store's price, Restore purchases on phones). The
  platform calls go through `StoreBridge` in `apps/client/src/cloud/purchases.ts`; a phone shell plugs in by
  setting `globalThis.phStore` from its StoreKit 2 or Play Billing plugin. Without `VITE_CLOUD_API`, or
  without a bridge (the web game, the desktop without Steam), nothing changes: the game is the full game.

No new library: the JWS and certificate checks and the service account's JWT use PHP's `openssl` extension,
and the store calls use Symfony's HTTP client. Every test mocks the stores (`server/tests/StoresMock.php`)
and makes its own keys and certificates (`server/tests/StoreKeys.php`).

## What Leroy sets up

### Steamworks

| Where | What |
|---|---|
| The full game's app | Its app id goes in `STEAM_APP_ID` (sign-in uses it too). The demo is a separate app id and is not configured here. |
| Users & Permissions → Manage Groups → Web API key | A **publisher** Web API key in `STEAM_WEB_API_KEY`. `CheckAppOwnership` answers only with the publisher key, on `partner.steam-api.com`. |

### App Store Connect

| Where | What |
|---|---|
| The app → Monetization → In-App Purchases | A **Non-Consumable** product with Product ID `full_game` (or set `APPLE_PRODUCT_ID`). Family Sharing as you wish; a revocation then locks it again. |
| The app → App Information | The bundle id goes in `APPLE_BUNDLE_ID`; the Apple ID (a number) may go in `APPLE_APP_APPLE_ID`. |
| The app → App Information → App Store Server Notifications | **Version 2**. Production URL `https://<domain>/api/stores/apple/notifications`; the same for Sandbox while testing. |
| apple.com/certificateauthority | Download **Apple Root CA - G3** (`AppleRootCA-G3.cer`), check its SHA-256 fingerprint against the one on that page, put it on the server (for example `server/config/apple/AppleRootCA-G3.cer`) and name the path in `APPLE_ROOT_CERTIFICATE`. |
| Sandbox testers | Only on a test server: `APPLE_ACCEPT_SANDBOX=1`. Production stays `0`. |

The game sets `appAccountToken` on the purchase to the `accountTag` from `GET /api/entitlements/apple` (the
account id) when the player is signed in. No App Store Server API key is needed yet (D-SAVE-23).

### Google Play Console

| Where | What |
|---|---|
| The app → Monetize → Products → In-app products | A managed product with Product ID `full_game` (or set `GOOGLE_PLAY_PRODUCT_ID`), active. |
| The app's package name | In `GOOGLE_PLAY_PACKAGE_NAME`. |
| Google Cloud console | A project with the **Google Play Android Developer API** enabled, and a **service account** with a JSON key. |
| Play Console → Users and permissions | Invite the service account's email with **View financial data** and **Manage orders and subscriptions** for the app. |
| Server | The JSON key, either the JSON itself or a path to the file, in `GOOGLE_PLAY_SERVICE_ACCOUNT`. Keep it out of git. |
| Google Cloud → Pub/Sub | A topic (for example `play-notifications`); grant `google-play-developer-notifications@system.gserviceaccount.com` the **Pub/Sub Publisher** role on it. A **push** subscription to `https://<domain>/api/stores/google/notifications?token=<secret>`, with a long random secret that also goes in `GOOGLE_PUBSUB_PUSH_TOKEN`. |
| Play Console → Monetization setup → Real-time developer notifications | The topic's full name (`projects/<project>/topics/play-notifications`); **Send test notification** should answer 204. |
| Server cron | `php bin/console app:stores:google-voided` once a day (it looks back 3 days; `--days` up to 30). |

The game sets `obfuscatedAccountId` on the purchase to the `accountTag` from `GET /api/entitlements/google`
(a SHA-256 of the account id) when the player is signed in.

### Server settings, all in `server/.env.local` or the host's environment

| Setting | Store | Example |
|---|---|---|
| `STEAM_WEB_API_KEY`, `STEAM_APP_ID` | Steam | the publisher key, the full game's app id |
| `APPLE_BUNDLE_ID` | App Store | `com.pockethegemony.app` |
| `APPLE_ROOT_CERTIFICATE` | App Store | `config/apple/AppleRootCA-G3.cer` (from `server/`, or absolute) |
| `APPLE_PRODUCT_ID` | App Store | `full_game` (the default) |
| `APPLE_ACCEPT_SANDBOX` | App Store | `0` in production |
| `APPLE_APP_APPLE_ID` | App Store | optional, checks the notifications' app |
| `GOOGLE_PLAY_PACKAGE_NAME` | Google Play | `com.pockethegemony.app` |
| `GOOGLE_PLAY_SERVICE_ACCOUNT` | Google Play | the key's JSON, or a path to it |
| `GOOGLE_PLAY_PRODUCT_ID` | Google Play | `full_game` (the default) |
| `GOOGLE_PUBSUB_PUSH_TOKEN` | Google Play | the push URL's secret |

After deploying, update the database for the new `entitlement` table: `php bin/console doctrine:schema:update --force`.
