# The website

The Symfony app in [`server/`](../server) serves the game's website next to its API, server-rendered with Twig and no JavaScript framework, in the game's own look: parchment sheets in carved wood frames over the sea, a plank bar on top, and the game's two pixel fonts. It follows the same pattern as Retracoon's site.

| Page | What it is |
|---|---|
| `/` | The landing page: the name and pitch, Play and the store buttons, five features with real screenshots (the map far out and close in, a province card, a battle, the diplomacy map mode, an event card), each linking to its wiki page, "How it plays", and a closing call with the price model from the wiki |
| `/wiki` | The wiki: every page of [`docs/wiki`](wiki), with search |
| `/press` | The press kit: fact sheet, a short and a long description, the screenshots and the logo and crown art as downloads |
| `/privacy` | The privacy policy: what the server really stores (accounts and usage records) and what the site does not do; use this address in the stores |

## How the player uses it

1. **Where they find it.** Every page has the plank bar with the game's name (home), **Wiki** and, once `PLAY_URL` is set, a wax **Play** button. The footer links Wiki, **Press** and **Privacy**. The landing page's main button is **Play free in your browser**; until `PLAY_URL` is set it reads **Coming soon** instead. A store button shows for each store whose address is set. The wiki's sidebar has a search box and every page, grouped as the wiki's Home page groups them (Start here, Land and economy, Armies and the seas…). Each long page has an **On this page** box with its sections.
2. **How it is grouped.** The landing page has one sheet per subject (map, provinces, war, diplomacy, history), each ending in a link to its wiki page. Press and privacy are a page each. The wiki has one page per subject, the same pages as `docs/wiki`. Links between pages stay inside the site, and `/wiki/trade` or `/wiki/Home` lead to the right page.
3. **Overview.** The landing page is the overview of the game, and the press kit's fact sheet sums it up in a table. The wiki home is the overview of the wiki: every subject with one line on what it covers.
4. **On a phone.** One column under 900 px wide: the page list and the contents fold into tap-to-open boxes above the page, wide tables scroll sideways inside their own box, frames shrink to half size under 500 px, and nothing needs hover (heading anchors only show on hover, and are hidden on phones). On the landing page the hero, each feature and the tiles stack into one column under 900 px, the two map shots stack under 600 px, and the buttons fill the width under 500 px. Links, buttons and fields are at least 44 px tall, and the bar respects safe areas. Checked in Chromium at 1366 × 860, iPhone 13 portrait and iPhone 13 landscape, with no sideways page scroll.

## Keeping it in step with the game

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

The site is part of the same Symfony app as the API, so it deploys with it: point the web server's document root at `server/public/`. Settings in `server/.env.local`:

| Setting | What it does |
|---|---|
| `PLAY_URL` | Where the Play buttons go (the hosted web game). Empty hides them, and the landing page says "Coming soon". |
| `STORE_APP_STORE_URL` | The game's App Store page. Empty hides its button. |
| `STORE_GOOGLE_PLAY_URL` | The game's Google Play page. Empty hides its button. |
| `STORE_STEAM_URL` | The game's Steam page. Empty hides its button. |
| `SUPPORT_EMAIL` | The address players and press can write to, shown on the press kit and privacy pages. Empty hides it; the privacy page then points to the store page. |

Nothing is deployed to a public address yet.
