# The website

The Symfony app in [`server/`](../server) serves the game's website next to its API, server-rendered with Twig and no JavaScript framework, in the game's own look: parchment sheets in carved wood frames over the sea, a plank bar on top, and the game's two pixel fonts. It follows the same pattern as Retracoon's site.

| Page | What it is |
|---|---|
| `/wiki` | The wiki: every page of [`docs/wiki`](wiki), with search |

## How the player uses it

1. **Where they find it.** Every page has the plank bar with the game's name (home), **Wiki** and, once `PLAY_URL` is set, a wax **Play** button. The wiki's sidebar has a search box and every page, grouped as the wiki's Home page groups them (Start here, Land and economy, Armies and the seas…). Each long page has an **On this page** box with its sections.
2. **How it is grouped.** One page per subject, the same pages as `docs/wiki`. Links between pages stay inside the site, and `/wiki/trade` or `/wiki/Home` lead to the right page.
3. **Overview.** The wiki home is the overview: every subject with one line on what it covers.
4. **On a phone.** One column under 900 px wide: the page list and the contents fold into tap-to-open boxes above the page, wide tables scroll sideways inside their own box, frames shrink to half size under 500 px, and nothing needs hover (heading anchors only show on hover, and are hidden on phones). Links, buttons and fields are at least 44 px tall, and the bar respects safe areas. Checked in Chromium at 1366 × 860, iPhone 13 portrait and iPhone 13 landscape, with no sideways page scroll.

## Keeping it in step with the game

- **The wiki** is made from `docs/wiki/*.md` by `pnpm wiki` ([`tools/wiki-export.ts`](../tools/wiki-export.ts)), which writes `server/wiki/`: `index.json` (sidebar groups, titles, summaries, headings), `search.json` (plain text for search) and `pages/<Page>.html`. Don't edit those by hand; after changing `docs/wiki`, run `pnpm wiki` and commit. CI re-runs it and fails if the output changed. Raw HTML in the markdown is shown as text.
- **The art and fonts** in `server/public/site/art/` and `server/public/site/fonts/` are exported from the game by `pnpm --filter @ph/client site-art`, which paints `apps/client/src/art/ui.ts` in headless Chromium. Rerun it after changing the interface art. The fonts are Jersey 10 and Jacquard 12 (SIL Open Font License). The site's CSS is `server/public/site/site.css`.

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
| `PLAY_URL` | Where the Play buttons go (the hosted web game). Empty hides them. |

Nothing is deployed to a public address yet.
