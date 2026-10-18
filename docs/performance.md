# Performance requirements

Hard budgets for the game on a mid-range phone. They are not goals: a change
that breaks one fails CI on main. Two scripts check them, on pushes to main
(not on pull requests, where a busy runner made them fail on noise):

- `pnpm bench` (packages/engine/bench/turn.bench.ts) times the engine itself.
- `pnpm --filter @ph/client perf` (apps/client/scripts/perf.mjs) runs the
  built game in mobile Chromium, pans the map at five zooms, plays one
  warm-up turn and then ends three turns (21 days). CI runners share their
  CPUs with the software GPU, so a day now and then stalls for a CPU: the day
  budgets are judged on the third slowest of the 21 days (about the 90th
  percentile), and when those turns break a budget it plays three more, up to
  three attempts; one attempt must meet every budget. `--report` prints the
  numbers without failing.

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

GPU time is not measured in CI (it runs on a software GPU, about 120 ms a
frame); the map's frame time is reported only. So perf turns the map's
shading off while it pans and animates, which keeps the check under a
minute, and back on before it ends turns.

## Ending a turn

The turn is simulated **in the background**: the engine runs in a Web
Worker (a Node worker on desktop) and the main thread keeps drawing while
it works. Only when the worker has no support does the turn run on the
main thread. End turn plays the week a day at a time (about 300 ms a day,
a 4-hour step every half second while the player fights), so each day is
one worker answer and one apply.

| What | Budget | Checked by |
| --- | --- | --- |
| Engine turn, 5,000 provinces and 500 nations | ≤ 25 ms | bench |
| Engine turn, 20,000 provinces and 2,000 nations | ≤ 100 ms | bench |
| Planning a march over tiles (A* through the provinces on the route), slowest of 20 | ≤ 100 ms | bench |
| Worker answer for a day of the turn, real map (third slowest of 21) | ≤ 250 ms | perf |
| Applying a day on the main thread (third slowest of 21) | ≤ 16 ms (one frame) | perf |

Rules:

- The worker sends typed arrays and transfers them; no JSON of the world.
- Applying a day updates textures and redraws once; panels re-render only
  what is open. Seasons change once a week, worked out ahead while the
  player looks at the map.
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
- Applying a turn: 4 to 6 ms (was 14 to 26 ms, from converting every
  province's season on the main thread; before that 4.3 s, from re-encoding
  sprite images on every panel render).
- Worker answer: about 50 ms.
- Engine turn: 0.2 ms at 5,000 provinces, 0.4 ms at 20,000.
- Animation: every frame (was one in five, so marching armies moved at
  5 fps: the redraw request made while drawing was wiped right after).
- Route: about 4 ms at 5,000 and 20,000 provinces (was about 8 ms).
