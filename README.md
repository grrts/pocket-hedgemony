# Pocket Hegemony

A turn-based, 8-bit grand strategy game for phones, desktop and the web, starting in spring 1444.

## Layout

| Path | What it is |
| --- | --- |
| `packages/rules` | Game rules as JSON (`data/`): balance numbers, units, nations, provinces. Validated at load time. |
| `packages/engine` | The simulation. Pure TypeScript with no DOM, deterministic, and storing state in typed arrays so it scales to thousands of provinces. |
| `apps/client` | The web game (Vite). Runs the engine in a Web Worker. |
| `apps/desktop` | Electron wrapper around the client build. |
| `apps/mobile` | Capacitor wrapper (iOS and Android) around the client build. |
| `server` | Symfony 7.4 API for accounts and metrics. |
| `tools/mapgen` | Builds the world map and the 1444 setup from Natural Earth (public domain) data. |

## Running it

```sh
pnpm install
pnpm dev            # web game at http://localhost:5173
pnpm test           # engine and rules tests
pnpm bench          # turn timing on a synthetic 5k and 20k province world
pnpm desktop        # build the client and open it in Electron

cd apps/mobile && pnpm sync && npx cap add android   # then: npx cap open android (needs Android Studio)

cd server && composer install
php bin/console doctrine:schema:update --force   # SQLite in var/ for local dev
php -S localhost:8000 -t public
php bin/phpunit
```

## The world map

`node --experimental-strip-types tools/mapgen/mapgen.ts --preview` rebuilds the map (about 10 seconds; it downloads Natural Earth data on first run).

- Modern first-level regions (states, provinces, departments) are drawn onto a 5760 × 2144 pixel grid (16 pixels per degree), then merged or split until provinces are roughly even in size. `config.json` sets the size per part of the world, so Europe, India and China are denser than Siberia or the Sahara.
- `nations-1444.json` lists the 137 nations with their capitals. `owners-1444.json` hands provinces to them: rules are checked in order and the first match wins, by modern country, region name, or a longitude and latitude box. Borders are an approximation of 1444, not a historical atlas, and province names are modern region names.
- Water is split into sea zones (about 4,700): coastal zones about 150 km across, open-ocean zones about 300 km, equal in kilometres at every latitude so the zones a fleet crosses measure travel time. They take real sea names from Natural Earth's marine areas, and `config.json` lists straits (Bosporus, Øresund, Gibraltar…) that join seas the pixel grid closes. Sea zones come after the land provinces in `provinces.json`, with terrain `sea` or `ocean`; armies can't enter them.
- A second image holds terrain per pixel for the close-zoom art: real geography (mountain ranges, deserts, wetlands) where Natural Earth has it, otherwise the province's terrain broken up with woods and with fields where 1444 was crowded. The simulation still uses one terrain per province.
- Outputs: `apps/client/public/map/provinces.png` (province or sea zone id per pixel), `apps/client/public/map/terrain.png`, and `packages/rules/data/world/*.json`.

The client draws the map with WebGL2: the id image is uploaded once and every province's colour comes from a small lookup texture, so recolouring the world after a turn costs almost nothing. Zoomed in, each map pixel becomes 8 × 8 art pixels drawn from a terrain tile atlas (`src/art/tiles.ts`), with rounded coasts, sand and surf, and nation borders in the owners' colours. The interface art (parchment, wood frames, ribbons, buttons, icons) is painted in code by `src/art/ui.ts`. `/style.html` is the art test page; `?view=x,y,zoom` opens the game at a map spot.

## The engine worker on each platform

All simulation runs in a module Web Worker (`apps/client/src/engine.worker.ts`), so heavy turns never freeze the map. If a platform can't start the worker, `EngineClient` runs the same engine on the main thread instead, and the diagnostics line at the bottom of the screen says which mode is active.

| Platform | Origin the game runs on | Worker support | Checked |
| --- | --- | --- | --- |
| Web (Chrome, Edge, Firefox, Safari 15+) | your domain | Module workers in all current browsers | Headless Chromium as a Pixel 7: `pnpm --filter @ph/client smoke` |
| Desktop (Electron 44) | `app://game` (custom secure scheme) | Chromium; full support | `xvfb-run pnpm --filter @ph/desktop smoke` |
| Android (Capacitor 8, Android 7+) | `https://localhost` | System WebView is Chromium; module workers need WebView 80+, enforced with `minWebViewVersion: 80` | Same Chromium engine as the web smoke test; not yet run on a device |
| iOS (Capacitor 8, iOS 15+) | `capacitor://localhost` | WKWebView; module workers arrived in Safari 15, which is also Capacitor 8's minimum | Not yet run on a device; the main-thread fallback covers a failure |

Decisions that follow from this:

- **No SharedArrayBuffer.** It needs cross-origin isolation headers that mobile webviews can't send. The engine sends results to the UI as transferable `ArrayBuffer`s instead, which costs no copy.
- **Relative asset paths** (`base: "./"`) so one build works on all four origins.
- **Electron uses `app://` rather than `file://`.** Workers work on both, but `file://` blocks `fetch()` of data files and has no stable origin.
- **Scaling beyond one core** will use several workers, for example one per group of AI nations, rather than shared memory.

## Determinism

`processTurn` uses only seeded randomness (`Rng`) and plain arithmetic, and runs its phases in a fixed order. The same world and the same orders always give the same `hashWorld()`. That makes replays, save validation and server-side turn checks possible later.
