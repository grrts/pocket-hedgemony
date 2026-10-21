# Performance requirements

Hard budgets for the game on a mid-range phone. They are not goals: a change
that breaks one fails CI on main. Two scripts check them, on pushes to main
(not on pull requests, where a busy runner made them fail on noise):

- `pnpm bench` (packages/engine/bench/turn.bench.ts) times the engine itself.
- `pnpm --filter @ph/client perf` (apps/client/scripts/perf.mjs) runs the
  built game in mobile Chromium, pans the map at five zooms, plays three
  warm-up turns and then ends three turns (21 days); when the week stops for
  an event or a revolution it takes the first answer, as a player would. CI
  runners share their CPUs with the software GPU, so a day now and then stalls for a CPU: the day
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
shading off for the whole check, which keeps it under a minute. It stays
off while the turns play: the software GPU's 200 to 300 ms of CPU a frame
took the cores the worker and the main thread need, which no phone's GPU
does, and made applying a day a third slower than the same code with the
map dark. Applying a day still uploads the provinces' textures, so that is
still timed.

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
  The snapshot is copied to the main thread every day, in one task, so a
  per-province field is a typed array (bits for a small set, such as the
  harvest months), never an array of numbers or arrays.
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
- Worker answer: about 50 ms. The 1378 start's 315 realms took it to about
  75 ms (most of it the Diplomacy tab's view of every realm, whose lookups
  scanned every relation in the world); with the relations indexed by realm
  it is about 55 ms.
- Engine turn: 0.2 ms at 5,000 provinces, 0.4 ms at 20,000.
- Engine turn bench (`pnpm bench`, 5,000 provinces and 500 nations): about
  13.5 ms on this container, was 17 to 19 ms and over budget on CI (25.7 ms of
  25). The daily occupation pass looked every province up in a map of the
  armies and tried to lift a siege in each; each 4-hour step with no fleets
  scanned every province for a blockade, and refreshing blockades cleared
  and copied the whole map; the yearly technology score threw an exception
  for the root and the boughs of every realm. Now only marked provinces are
  touched. At 20,000 provinces: about 80 ms, was about 90.
- Standing armies (DIPL-232, F-165): until then the AI sent its levies home
  before their pay began, so the bench's realms held no armies after the first
  weeks; now some 900 stand at 5,000 provinces and the turn is about 18 to
  21 ms on this container (main without them about 10 to 12). Engage walks
  only the armies of realms at war and skips a province with one army in it,
  garrisons join a battle from a list by province, armies eat without a
  throwaway object, the AI calls men without a recount per province and
  gathers its standing army where its garrisons stand.
- Main failed the timing checks twice after the standing armies (zoom 4
  overlay 2.7 ms of 2.5, then the 5,000-province turn 26.1 ms of 25), both on
  runners about twice as slow as usual (map shading 357 to 523 ms a frame,
  usually about 166). The overlay was unchanged; the turn had lost its
  headroom. Engage now returns at once when no two realms' armies at war
  share a province and no battle is fought (most steps), and builds its cells
  only where armies can meet; an army still where it last charted from
  charts nothing more; realms at peace share one empty enemy set; pay is
  counted without an array per army; the AI's weekly marches list armies by
  province without copying. About 5 % off the turn on this container (14.6
  ms, was 15.8), the same world to the bit.
- Animation: every frame (was one in five, so marching armies moved at
  5 fps: the redraw request made while drawing was wiped right after).
- Route: about 4 ms at 5,000 and 20,000 provinces (was about 8 ms).
