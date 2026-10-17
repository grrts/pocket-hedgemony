# Performance requirements

Hard budgets for the game on a mid-range phone. They are not goals: a change
that breaks one fails CI. Two scripts check them:

- `pnpm bench` (packages/engine/bench/turn.bench.ts) times the engine itself.
- `pnpm --filter @ph/client perf` (apps/client/scripts/perf.mjs) runs the
  built game in mobile Chromium, pans the map at five zooms and ends three
  turns. `--report` prints the numbers without failing.

## Frame rate

The map must hold **60 fps** while panning and zooming, which leaves 16.7 ms
a frame for everything.

| What | Budget | Checked by |
| --- | --- | --- |
| Overlay a frame (labels, towns, armies, routes) | ≤ 2.5 ms average, ≤ 5 ms p95 | perf |
| Map shading | 1 pixel per CSS pixel, never device pixels | code (`MAP_PIXEL_RATIO` in mapView.ts) |
| Longest main-thread task while playing | ≤ 50 ms | perf |
| Frames redrawn while something animates (marching armies) | ≥ 90 % | perf |

Rules that keep it there:

- Never read layout (`clientWidth`, `getBoundingClientRect`) in the draw
  loop. The view size is cached on resize.
- Text and sprites are drawn from cached bitmaps, never rasterised a frame.
- Nothing per frame plans routes or walks the province graph. Results are
  cached until the next order or turn.
- The overlay canvas uses the device pixel ratio so text stays crisp; the
  map canvas does not, because shading 4 to 7 times the pixels is what
  overheats phones. Close-up tile detail switches in by CSS zoom.

GPU time is not measured in CI (it runs on a software GPU); the map's frame
time is reported only.

## Ending a turn

The turn is simulated **in the background**: the engine runs in a Web
Worker (a Node worker on desktop) and the main thread keeps drawing while
it works. Only when the worker has no support does the turn run on the
main thread.

| What | Budget | Checked by |
| --- | --- | --- |
| Engine turn, 5,000 provinces and 500 nations | ≤ 25 ms | bench |
| Engine turn, 20,000 provinces and 2,000 nations | ≤ 100 ms | bench |
| Worker answer after End turn, real map | ≤ 250 ms | perf |
| Applying the answer on the main thread | ≤ 16 ms (one frame) | perf |

Rules:

- The worker sends typed arrays and transfers them; no JSON of the world.
- Applying a turn updates textures and redraws once; panels re-render only
  what is open.
- Budgets scale with the world, not the player: AI nations run in the same
  worker turn.

## Route planning

Dragging an army plans a route each time the target changes.

| What | Budget | Checked by |
| --- | --- | --- |
| Slowest route, 5,000 provinces | ≤ 8 ms | bench |
| Slowest route, 20,000 provinces | ≤ 32 ms | bench |

## Measured (October 2026, CI machine)

- Overlay: about 1 ms a frame at every zoom (was about 11 ms, from a layout
  read in the draw loop).
- Applying a turn: 7.5 ms (was 4.3 s, from re-encoding sprite images on
  every panel render).
- Worker answer: about 50 ms.
- Engine turn: 0.2 ms at 5,000 provinces, 0.4 ms at 20,000.
- Animation: every frame (was one in five, so marching armies moved at
  5 fps: the redraw request made while drawing was wiped right after).
- Route: about 4 ms at 5,000 and 20,000 provinces (was about 8 ms).
