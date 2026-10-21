# The website

The Symfony app in [`server/`](../server) serves the game's website next to its API, server-rendered with Twig and no JavaScript framework, in the game's own look: parchment sheets in carved wood frames over the sea, a plank bar on top, and the game's two pixel fonts. It follows the same pattern as Retracoon's site.

| Page | What it is |
|---|---|
| `/` | The landing page: the name and pitch, Play and the store buttons, five features with real screenshots (the map far out and close in, a province card, a battle, the diplomacy map mode, an event card), each linking to its wiki page, "How it plays", and a closing call with the price model from the wiki |
| `/wiki` | The wiki: every page of [`docs/wiki`](wiki), with search |
| `/wiki/Game-Data` | The game data: every value of the game's rules config, a page per system, and the formulas that combine them |
| `/press` | The press kit: fact sheet, a short and a long description, the screenshots and the logo and crown art as downloads |
| `/privacy` | The privacy policy: what the server really stores (accounts and usage records) and what the site does not do; use this address in the stores |
| `/community` | The community forum's overview: every board with its topic and post counts and latest topic, and the latest topics across boards |
| `/community/{board}` | One board (`general`, `strategy`, `ideas`, `bugs`, `saves`): its topics, newest activity first, 25 a page |
| `/community/t/{id}-{slug}` | One topic: its posts oldest first, 20 a page, and the reply box at the bottom |
| `/community/new` | Start a topic (signed in) |
| `/community/p/{id}` | A link to one post; leads to its page in the topic. `/edit` and `/report` edit or report it |
| `/community/signin`, `/community/join` | Sign in with the game account (email and password), or make one |
| `/community/you` | The signed-in player's page: their shared saves (plays, Remove), their topics, and Sign out |
| `/s/{code}`, `/s/{code}.phsave` | A shared save: the short link leads to the post with its save card; `.phsave` downloads the file |
| `/community/reports` | Moderators only: reported posts |

## How the player uses it

1. **Where they find it.** Every page has the plank bar with the game's name (home), **Wiki**, **Community**, **Sign in** (or the signed-in player's name) and, once `PLAY_URL` is set, a wax **Play** button. The footer links Wiki, **Community**, **Press** and **Privacy**. The landing page's main button is **Play free in your browser**; until `PLAY_URL` is set it reads **Coming soon** instead. A store button shows for each store whose address is set. The wiki's sidebar has a search box and every page, grouped as the wiki's Home page groups them (Start here, Land and economy, Armies and the seas…). Each long page has an **On this page** box with its sections.
2. **How it is grouped.** The landing page has one sheet per subject (map, provinces, war, diplomacy, history), each ending in a link to its wiki page. Press and privacy are a page each. The wiki has one page per subject, the same pages as `docs/wiki`. Links between pages stay inside the site, and `/wiki/trade` or `/wiki/Home` lead to the right page.
3. **Overview.** The landing page is the overview of the game, and the press kit's fact sheet sums it up in a table. The wiki home is the overview of the wiki: every subject with one line on what it covers.
4. **On a phone.** One column under 900 px wide: the page list and the contents fold into tap-to-open boxes above the page, wide tables scroll sideways inside their own box, frames shrink to half size under 500 px, and nothing needs hover (heading anchors only show on hover, and are hidden on phones). On the landing page the hero, each feature and the tiles stack into one column under 900 px, the two map shots stack under 600 px, and the buttons fill the width under 500 px. Links, buttons and fields are at least 44 px tall, and the bar respects safe areas. Checked in Chromium at 1366 × 860, iPhone 13 portrait and iPhone 13 landscape, with no sideways page scroll.

## The community

A small forum for players, in the same parchment and wood as the wiki ([`CommunityController`](../server/src/Controller/CommunityController.php), templates in `server/templates/community/`, styles in `server/public/site/community.css`).

- **Boards** are fixed in [`server/config/packages/community.yaml`](../server/config/packages/community.yaml): General, Strategy and campaign stories, Ideas and feedback, Bug reports, Saves to try. They are not edited on the site.
- **Shared saves** (`App\Controller\SharedSavesController`, `domain/saves/spec.md` SAVE-124 to SAVE-139): the game's Share sheet sends `POST /api/shared-saves` (the file as base64, title, note, realm, and `show`, `help`, `broke` or `reply`); the server checks the file as any upload, drops its device name, keeps the bytes under `shared/<code>.phsave` in `SAVES_DIR`, and opens the topic on Strategy, Saves to try or Bug reports, or, for `reply`, a reply in the topic of the save the campaign was copied from. The topic shows a save card above that post (map crop, title, realm, date, week, play time, version, the code, **Play this save** to `PLAY_URL?shared=<code>` once `PLAY_URL` is set, and **Download**). `GET /api/shared-saves/{code}` is the card and `/file` the bytes (each fetch counts a play); `GET /api/shared-saves` lists the player's own and `DELETE /api/shared-saves/{code}` removes one. Up to 50 per account; they do not count toward the cloud quota, and a share counts toward the new-topic or reply limit. Hiding the topic or post hides the save.
- **Topics** have a title, an author, a board, and are locked or hidden by moderators. **Posts** are plain text: shown escaped, with their paragraphs and line breaks, and http(s) addresses become `rel="nofollow ugc noopener"` links. The first post of a topic is its opening post; editing it also edits the title.
- **Accounts** are the game's own (`Account`): players sign in with email and password (Symfony `form_login` with a session cookie, "Stay signed in" for 30 days), or join on `/community/join` with the same rules as `POST /api/accounts` (`App\Account\Registration`). Guests read everything that is not hidden; posting needs an account. The JSON API under `/api` has its own stateless firewall and never gets a session. The game signs in there with `POST /api/sessions` (email and password, or a Steam Web API ticket checked with Steam; `STEAM_WEB_API_KEY` and `STEAM_APP_ID` empty turn Steam sign-in off), gets a 15-minute access token sent as `Authorization: Bearer …` and a device token it swaps on `POST /api/sessions/refresh`; `GET /api/account` lists sign-ins and devices, `POST /api/account/sign-ins` adds Steam or email to an account, and `DELETE /api/devices/{id}` signs a device out (`App\Controller\SessionController`, `domain/saves/spec.md` SAVE-112 to SAVE-118). An account made with Steam has no email until one is added, so it cannot sign in on the website yet. Phones and the web also sign in with Apple, Google, and Steam in the browser (SAVE-149 to SAVE-154): `POST /api/sessions` takes `{appleIdentityToken, nonce}` or `{googleIdToken, nonce}`, checked with PHP's OpenSSL against Apple's and Google's key sets (issuer, audience in `APPLE_CLIENT_IDS` or `GOOGLE_CLIENT_IDS`, expiry, and the token's nonce being the SHA-256 of the one sent; `App\Account\IdToken`); `POST /api/sessions/steam-openid` with `{return}` gives Steam's OpenID address, Steam comes back to `GET /auth/steam/return`, which checks the answer with Steam's `check_authentication` and sends the browser to the return address with a 5-minute one-time `steamCode` (`App\Controller\SteamBrowserController`), exchanged as `{steamOpenIdCode}`; the return address must be listed in `SIGN_IN_RETURN_URLS`. Each of these is off, answering "… is not available", while its setting is empty, and `POST /api/account/sign-ins` adds any of them to an account. In the game (`apps/client/src/cloud/storeSignIn.ts`, `bridge.ts`) the web build shows Google with `VITE_GOOGLE_CLIENT_ID` and Apple with `VITE_APPLE_SERVICES_ID` and `VITE_APPLE_REDIRECT_URI`; the phone builds show each store once the app has its Capacitor plugin (`@capgo/capacitor-social-login` for Apple on iOS and Google on Android, `@capacitor/browser` with `@capacitor/app` and the `pockethegemony` URL scheme; `docs/mobile.md`), and on iOS none without Sign in with Apple. Cloud saves (`App\Controller\SavesController`, SAVE-061 to SAVE-070): `PUT /api/saves/{saveId}` takes the `.phsave` bytes as the body and checks size, magic, CRCs and header; `GET /api/saves?since=<cursor>` lists headers and tombstones; `GET` and `DELETE /api/saves/{saveId}`, `DELETE /api/campaigns/{campaignId}` and `POST /api/campaigns/{campaignId}/ironman-head` do the rest. The bytes go to `SAVES_DIR` (default `var/saves/<env>`) through `App\Saves\SaveObjects`, which an S3 adapter will replace when the server is hosted; run `bin/console app:saves:purge` daily to drop the bytes of saves removed 30 days ago.
- **Authors** can edit their post for 30 minutes after sending it, and delete nothing. Anyone signed in can report a post.
- **Moderators** (`ROLE_MODERATOR`) hide and unhide posts and topics, lock and unlock topics (they can still reply to a locked topic), and see `/community/reports`. Hidden things show to nobody else, and hiding a post closes its reports. Grant or remove the role on the server:

  ```sh
  php bin/console app:community:moderator someone@example.com
  php bin/console app:community:moderator someone@example.com --remove
  ```

- **Safety:** every form has a CSRF token; titles are 3 to 120 characters and posts 2 to 10,000; sign-ins are throttled (5 tries per 15 minutes), and rate limits (`config/packages/community.yaml`) allow 3 sign-ups per IP address an hour, and per account 5 new topics an hour, 10 replies in 10 minutes and 10 reports an hour.

### How the player uses it

1. **Where they find it.** **Community** in the plank bar on every page, next to **Wiki**, then **Sign in** (or, once signed in, their name, which opens their page with Sign out). The overview has **New topic**; each board has **New topic** too, with that board chosen. On a topic, the reply box is at the bottom; guests see **Join** and **Sign in** there instead, and come back to the topic after.
2. **How it is grouped.** Everything about the forum lives under `/community`: one board per subject, one page per topic with its replies, and a post's Edit, Report and (for moderators) Hide buttons on the post itself. A moderator's topic tools (Lock, Hide) sit under the topic's title, and reports have one page. A shared save is a card on the post it came with, and the player's shared saves are listed on their You page, with how often each was played and Remove (which asks first, in place).
3. **Overview.** `/community` shows every board at a glance (topics, posts, latest topic and who posted last) beside the latest topics across all boards. Moderators see **Reports** there with the number of reported posts waiting.
4. **On a phone.** One column under 960 px; the plank bar wraps its links to a second row on a narrow phone, and the player's name is cut short with an ellipsis. Topic rows, buttons, page numbers and fields are at least 44 px tall, links in running text get 44 px of tap room, and nothing needs hover. A shared save's card stacks its map crop above its facts, and Play this save and Download fill the width under 500 px. In a short window (a phone on its side, or with the keyboard up) the plank bar scrolls away with the page, and the reply box shrinks so it and **Post reply** fit above the keyboard. Text fields use 22 px type, so iOS does not zoom in. Checked in Chromium at 1366 × 860, iPhone 13 portrait and iPhone 13 landscape, with no sideways page scroll.

To look at it with demo players and topics (dev only; every demo password is `demo-password`, and `mod@example.com` is a moderator):

```sh
cd server && php bin/console doctrine:schema:update --force && php bin/console app:community:demo
```

## Keeping it in step with the game

- **The game data pages** (`docs/wiki/Data-*.md` and `Game-Data.md`) are made from the rules config in `packages/rules/data` by `pnpm wiki` ([`tools/wiki-data.ts`](../tools/wiki-data.ts)): one page per system, every value as the game reads it, collections such as arms, kinds of troops and inventions as tables, and placeholder values marked (provisional). Don't edit them by hand; the list of systems, and the keys each page leaves out or shows first, are at the top of the tool. After changing `packages/rules/data`, run `pnpm wiki` and commit; CI fails otherwise.
- **The wiki** is made from `docs/wiki/*.md` by `pnpm wiki` ([`tools/wiki-export.ts`](../tools/wiki-export.ts)), which writes `server/wiki/`: `index.json` (sidebar groups, titles, summaries, headings), `search.json` (plain text for search) and `pages/<Page>.html`. Don't edit those by hand; after changing `docs/wiki`, run `pnpm wiki` and commit. CI re-runs it and fails if the output changed. Raw HTML in the markdown is shown as text.
- **The art and fonts** in `server/public/site/art/` and `server/public/site/fonts/` are exported from the game by `pnpm --filter @ph/client site-art`, which paints `apps/client/src/art/ui.ts` in headless Chromium. Rerun it after changing the interface art. The fonts are Jersey 10 and Jacquard 12 (SIL Open Font License). The site's CSS is `server/public/site/site.css`; the landing page and press kit add `server/public/site/home.css`.
- **The screenshots** in `server/public/site/shots/` are real play, taken by `pnpm --filter @ph/client site-shots` (after `pnpm --filter @ph/client build`): it plays the Ottomans from the 1378 start on a phone held sideways (the map far and close, Edirne's card, the realm card, the diplomacy map mode, a battle against Karaman), France until its first event card, and the map on a 1366 × 768 desktop, and saves them as WebP (about 1.6 MB in all). It also draws `logo.png` and `crown.png` for the press kit from the site's font and art. Rerun it when the game's look changes. Every claim on the landing page and press kit comes from `docs/wiki`; change them together.

## Running and deploying

```sh
pnpm wiki                     # only after changing docs/wiki
cd server && composer install
php -S localhost:8000 -t public   # http://localhost:8000/wiki
php bin/phpunit
```

The site is part of the same Symfony app as the API, so it deploys with it: point the web server's document root at `server/public/`. After deploying a version that changes the entities (the community added its tables and an `account.roles` column), update the database schema; there are no migrations:

```sh
php bin/console doctrine:schema:update --force
```

Sessions are files in `server/var/sessions/`, and the rate limits are kept in the app cache (`server/var/cache/`), so the web server needs to write there. Settings in `server/.env.local`:

| Setting | What it does |
|---|---|
| `PLAY_URL` | Where the Play buttons go (the hosted web game). Empty hides them, and the landing page says "Coming soon". |
| `STORE_APP_STORE_URL` | The game's App Store page. Empty hides its button. |
| `STORE_GOOGLE_PLAY_URL` | The game's Google Play page. Empty hides its button. |
| `STORE_STEAM_URL` | The game's Steam page. Empty hides its button. |
| `SUPPORT_EMAIL` | The address players and press can write to, shown on the press kit and privacy pages. Empty hides it; the privacy page then points to the store page. |

Nothing is deployed to a public address yet.
