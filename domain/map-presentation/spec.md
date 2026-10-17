# Map presentation (VIEW)

## 1. Purpose and scope

This context owns how the map is shown: the three zoom levels and what each system draws at each, the map
lenses, the parchment over uncharted land, overlays, how the month is played back on the map, how screens
are laid out by window shape, map accessibility (colour, pattern, contrast), and the frame and turn-time
budgets that keep the map smooth on a phone. It is presentation only: what a lens or icon *means* is the
rule of the system that owns the stat.

**In scope**
- Zoom levels (World, Region, Local) and what is drawn at each, collected from every system's design.
- Rendering by zoom (terrain colour with owner wash; 4 × 4 and 8 × 8 art pixels per map pixel; borders).
- Map lenses: the list, what each colours, lens patterns and colour-blind ramps.
- Parchment (fog) as a display layer over what a country has not charted; its display toggle.
- Overlays: labels, towns, armies, routes as drawn things.
- Month playback on the map (speed, battle flashes, castle rings).
- Layout by window shape (Short wide, Tall, Large, Far), landscape-only phones, touch sizes, safe areas.
- Performance budgets: frame, overlay, main-thread, turn, worker answer, route planning; the performance
  knobs (Sharpness, Frame rate cap, Map detail, Animations, Battery saver).

**Not in scope (owned by …)**
- Which provinces a country has charted, and voyages (exploration).
- The rules behind every stat a lens shows (province, trade, religion, culture, diplomacy, naval, buildings,
  subjects, revolutions, national-strengths).
- Route preview contents, gestures to give a march (troop-movement §10); cards, screens, the turn report,
  the Attention screen (game-shell).
- Where a setting is stored and its defaults per device profile (settings).
- Save size and save-time budgets (saves).
- The map's geography (world-map).

## 2. Sources

Newest decision first.

1. `settings/settings-design.md` v2 (16 Oct) §3.1, §4.3 (parchment toggle), §5.1 (Graphics), §5.5
   (Accessibility), §7 (performance knobs), §8.
2. `screen-flow/screen-flow-design.md` v1 §1, §4.2, §4.3, §4.6 (G5), §7 (layout by window shape), §8.2.
3. `performance/performance.md` (= repo `docs/performance.md`, identical).
4. `province-stats/province-stats-design.md` v3 §14 (zoom levels, lenses).
5. `warfare/warfare-design.md` v5 §14 (zoom), §7.15 (battle screen on the tile row), §16.
6. `troop-movement/troop-movement-design.md` v1 §10.5 (at each zoom), §10.6 (watching the month), §10.7.
7. `naval/naval-design.md` §10; `religion/religion-design.md` §12; `diplomacy/diplomacy-design.md` §13.1;
   `trade/trade-design.md` §10.1, §14; `culture/culture-design.md` §7.3; `exploration/exploration-design.md`
   §3.1, §7, §9; `buildings/buildings-design.md` §11.1 and changes list; `subjects/subjects-design.md`
   (Subjects lens); `revolutions/revolutions-design.md` (Revolution lens); `national-strengths` (map
   shimmer); `tutorial/tutorial-design.md` (lens steps, colour note).
8. Repository `README.md` (WebGL2 map, zoom rendering, art), `apps/client/src/main.ts` (today's lenses and
   fog toggle), `apps/client/src/map/mapView.ts` (`MAP_PIXEL_RATIO`).
9. `planning/gap-lists.md` List 1 item 29, List 2 items 10 and 14.

## 3. Ubiquitous language

| Term | Meaning | Not to be confused with |
|---|---|---|
| Zoom level | One of three map scales: **World**, **Region**, **Local** (naval and exploration call the third one **Province**) | The camera's numeric zoom |
| World zoom | Farthest view: owner colours, lenses, front lines, banners | — |
| Region zoom | Middle view: towns, castles, roads, routes, sprites | — |
| Local zoom | Close view: the province's tile row as pixel art; still the map, not a screen | The province card |
| Lens | A map mode that recolours provinces by one stat | A card; a filter on the realm picker |
| Lens picker | The small pop-over from the tool column that switches lenses | — |
| Parchment | The drawn fog over land and sea a country has not charted | Fog of war over enemy armies (rumours, warfare 5.4) |
| Overlay | What is drawn over the shaded map: labels, towns, armies, routes | — |
| Owner wash | The owner's colour laid over the terrain colour at World zoom | A lens colour |
| Art pixel | One pixel of the 8-bit art; at middle zoom a map pixel is 4 × 4 art pixels, close in 8 × 8 | A map pixel; a CSS pixel |
| Window shape | Short wide, Tall, Large or Far, chosen from the window size and device | Device profile (settings) |
| Playback | Showing the month just processed on the map | Replaying a battle |
| Frame budget | 16.7 ms per frame at 60 fps | Turn budget |
| Performance knob | A setting that trades looks for cost: Sharpness, Frame rate cap, Map detail, Animations | — |

## 4. Domain model

### Aggregates

**Map view** (identity: one per running client)
- Holds: camera (x, y, zoom), current zoom level, current lens, lens options (Tongue toggle, patterns),
  parchment on or off, selection, window shape, performance knob values.
- INV-VIEW-1: Exactly one lens is active at a time.
- INV-VIEW-2: The zoom level is derived from the camera zoom; the local zoom's tile row is part of the map.
- INV-VIEW-3: Nothing the map view does changes the simulation (it reads snapshots only).
- INV-VIEW-4: The map never unloads during a campaign.

### Entities and value objects

- **Lens** (value): id, the stat it reads, colour ramp, colour-blind ramp, pattern per band, the context
  that owns the stat.
- **Zoom content** (value): per zoom level and per context, the things drawn.
- **Window shape** (value): Short wide · Tall · Large · Far, with its layout rule.
- **Budget** (value): what, limit, checked by (bench, perf, code).

### Domain services

- **Renderer** (WebGL2): uploads the province id image once; each province's colour comes from a small
  lookup texture, so recolouring after a turn costs almost nothing.
- **Overlay painter** (2D canvas at device pixel ratio): labels, towns, armies, routes from cached bitmaps.

## 5. Requirements

### 5.1 Drawing the map

- VIEW-001 (Ubiquitous): The client shall draw the map with WebGL2, uploading the province id image once and taking every province's colour from a small lookup texture, so recolouring after a turn costs almost nothing. [README]
- VIEW-002 (State-driven): While zoomed out, each map pixel shall take its terrain's colour with hill shading and the owner's colour washed over it, and the sea shall be shaded by depth with dithered band edges. [README]
- VIEW-003 (State-driven): While at middle zoom, each map pixel shall become 4 × 4 art pixels (half-size tiles); while close in, 8 × 8, drawn from the terrain tile atlas with rounded coasts, sand and surf. [README]
- VIEW-004 (Ubiquitous): Nation borders shall be drawn as an ink line with a band of the owner's colour inside. [README]
- VIEW-005 (Ubiquitous): Each tile type's average colour shall be its colour on the zoomed-out map, so repainting a tile changes the far map too. [terrain.md "For artists"]
- VIEW-006 (Ubiquitous): Rivers shall be drawn as one clean line along their traced path. [terrain.md]

### 5.2 What each zoom shows

- VIEW-007 (State-driven): While at World zoom, the map shall show for each province its owner colour and a small icon if hungry, rioting or in revolt, plus front lines. [province-stats §14]
- VIEW-008 (State-driven): While at World zoom, armies shall show as a banner with a men count, battles as crossed swords and besieged castles with a ring; armies on the move as arrows, thick by men and coloured by owner, with no day counts. [warfare §14; troop-movement §10.5]
- VIEW-009 (State-driven): While at World zoom, ports shall show as anchor dots in the owner's colour, larger for great ports, and fleets as a single ship sprite with a count. [naval §10]
- VIEW-010 (State-driven): While at World zoom, the parchment, voyage paths as dotted lines and colonies being founded (a small flag with a progress ring) shall show. [exploration §7]
- VIEW-011 (State-driven): While at Region zoom, each province shall show town size, the castle and its reach rings, roads, rivers and the busiest trade paths (thicker = more traders), armies and sieges, burned provinces hatched, and plague. [province-stats §14; trade §10.1]
- VIEW-012 (State-driven): While at Region zoom, armies shall show as sprites by arm (foot, horse, guns) with a food bar of days of reserve left on the banner; rumours as faded banners; the forage limit when an army is dragged; and the full route of a selected army with day counts, month marks, food colour and step icons. [warfare §14; troop-movement §10.5]
- VIEW-013 (State-driven): While at Region zoom, the harbour tile shall show an anchor icon with berths used and free (`7/20`), a slipway icon with hulls building, and fleets with their admiral's banner and course line in days. [naval §10]
- VIEW-014 (State-driven): While at Region zoom, each house of worship shall show as a sprite in the town, preachers as walking figures and active faith waves as a soft tint spreading from their source. [religion §12]
- VIEW-015 (State-driven): While at Region zoom, envoys on the road shall show as small riders with a dotted route, and countries you hold a war aim against shall carry the war-aim icon; at World zoom only the diplomacy colours show. [diplomacy §13.1]
- VIEW-016 (State-driven): While at Region zoom, traders shall show as icons (caravan, barge, ship) with a purse bar, and cities with a market shall show a coin. [trade §10.1]
- VIEW-017 (State-driven): While at Region zoom, colonial range shall show as a faint line on the sea and colonisable provinces with a pale flag. [exploration §7]
- VIEW-018 (State-driven): While at Local zoom, the province's tile row shall show as pixel art: each tile's building as a sprite, burned tiles in ash, workers moving on busy tiles, ships in the harbour, caravans on the road, barges on the river; marching armies as columns of foot, horse, guns and wagons in proportion. [province-stats §14; trade §10.1; troop-movement §10.5]
- VIEW-019 (State-driven): While at Local zoom, a battle shall be shown on the province's tile row, and a siege as the castle tile with breaches drawn in the walls. [warfare §14, §7.15]
- VIEW-020 (Ubiquitous): Each system added after the province and warfare designs shall state what it shows at each zoom, including its map lens. [gap-lists List 1 item 29]

### 5.3 Lenses

- VIEW-021 (Ubiquitous): A map lens shall recolour the map by one stat, chosen from the lens picker in the tool column. [province-stats §14; screen-flow §4.2, §4.7]
- VIEW-022 (Ubiquitous): The lens list shall hold the province lenses Food, Tax reaching you, Days to capital, Grievances, Faith, Tongue, Ground, Recruits; the trade lenses Trade ratio, Trade value and Traders (Trade ratio and Trade value replace Traders passing and Trade balance); and the lenses Diplomacy, Sea, Works, Jobs, Subjects and Revolution. [province-stats §14; trade §10.1; diplomacy §13.1; naval §10; buildings §11.1; subjects §10.3; revolutions §13] (see OQ-VIEW-2)
- VIEW-023 (Ubiquitous): The Faith lens shall colour each province by its majority faith, hatched where a community of another faith is 30 % or more; holy places carry a small icon. [religion §12]
- VIEW-024 (Ubiquitous): The Tongue lens shall colour by tongue family at far zoom and by tongue at regional zoom, with a toggle to kin / cousin / stranger colours for the player's realm, and outline homelands of peoples without a country. [culture §7.3]
- VIEW-025 (Ubiquitous): The Diplomacy lens shall colour every country by the player's relation to it: own colour for you and your subjects; blue for allies (light blue pledged); green and pale green for Close and Warm; grey for Cool or nothing recorded; orange for Cold or Rival; red for Hostile, Bitter or at war (hatched at war); a red border for a league against you. [diplomacy §13.1]
- VIEW-026 (Ubiquitous): The Sea lens shall shade every port by the sailors who can still be called, and show fleets at sea, the month's winds as arrows over sea zones, and the zones a fleet's ships can enter at the current research. [naval §10]
- VIEW-027 (Ubiquitous): The Trade ratio lens shall colour provinces by trade ratio, with the busiest roads and sea lanes as lines; Traders shows only your traders and their routes. [trade §10.1]
- VIEW-028 (Ubiquitous): The Works lens shall colour provinces by building sites (green), neglected or damaged buildings (amber) and ruined ones (red); the Jobs lens by empty job slots against homeless people. [buildings §11.1]
- VIEW-029 (Ubiquitous): The Subjects lens shall colour your subjects by loyalty and draw a line to each courted subject from the courting country's capital. [subjects §10.3]
- VIEW-030 (Ubiquitous): The Revolution lens shall shade provinces by how many of the revolution's province-level signs they meet, and hatch risen provinces in the revolution's colour. [revolutions §13]
- VIEW-031 (State-driven): While a national ambition that names places is hot, the map shall shimmer faintly over the region it concerns without outlining or naming the target. [national-strengths §9]

### 5.4 Parchment

- VIEW-032 (Ubiquitous): Land and sea a country has not charted shall lie under the parchment. [exploration §3.1]
- VIEW-033 (Ubiquitous): The parchment shall show the charted map, which only grows; it replaces today's "6 steps from your lands and armies". [exploration §3.1, §9]
- VIEW-034 (Optional): Where the player turns off "Parchment over unknown lands" in the lens menu, the map shall show the whole world; the switch is display only. [settings §4.3; main.ts] (see OQ-VIEW-3)

### 5.5 Month playback

- VIEW-035 (Event-driven): When a turn ends, the month shall play on the map at about one second per 10 days (config), with a skip button. [troop-movement §10.6]
- VIEW-036 (Ubiquitous): During playback armies shall walk their routes, battles flash crossed swords and pause for half a second, and castles that stop an army ring red. [troop-movement §10.6]
- VIEW-037 (State-driven): While a turn is processed, the map shall stay visible and can be panned and zoomed, armies march along their routes and borders change as the worker's results arrive. [screen-flow G5]
- VIEW-038 (Unwanted): If a turn takes longer than 1.5 s, then a small parchment strip shall say what is being worked out ("The courts of Europe deliberate…"). [screen-flow G5]

### 5.6 Layout by window shape

- VIEW-039 (Ubiquitous): Screens shall be laid out by the shape of the window, not by the device. [screen-flow §1.5, §7.1]
- VIEW-040 (State-driven): While the window is Short wide (phones in landscape, height under 500 CSS px), the map shall come first, cards are side sheets on the left (45 % of the screen), the Realm book's tabs a left icon rail, and the top bar one thin row. [screen-flow §7.1, §4.3]
- VIEW-041 (State-driven): While the window is Tall (tablets in portrait, desktop windows taller than wide), cards shall be bottom sheets (55 % height, draggable), the Realm book's tabs a bottom icon row, and the tool column on the right edge above End turn. [screen-flow §7.1, §4.3]
- VIEW-042 (State-driven): While the window is Large (tablets in landscape, desktop, Steam Deck 1280 × 800), side sheets shall have a fixed width (380 px at UI scale 1), menus are centred with a maximum width, and nothing stretches edge to edge. [screen-flow §7.1, §4.3]
- VIEW-043 (State-driven): While the window is Far (TV and Steam Machine), the Large layout shall be used with UI scale raised so body text is about 1/30 of screen height, thicker focus frames, and nothing in the outer 5 % of the screen. [screen-flow §7.1; settings §3.1]
- VIEW-044 (Ubiquitous): Phones shall play in landscape only, in every screen; a phone held upright shows "Turn your phone sideways". [screen-flow §7.2, decided 16 Oct; settings §11.1]
- VIEW-045 (Ubiquitous): Every tap target shall be at least 44 × 44 points with 8 points between neighbours (56 with Large touch targets); End turn and the game menu button sit at opposite corners; system safe areas stay clear of buttons. [screen-flow §7.1, §7.3; settings §5.5]
- VIEW-046 (State-driven): While a card is open on a phone in landscape, the map shall stay live on the right and be recentred so the selected thing isn't hidden. [screen-flow §4.3]

### 5.7 Map accessibility

- VIEW-047 (Optional): Where a colour vision mode is chosen, nation colours shall swap to a second assignment from the same 32-colour palette chosen so neighbours stay distinguishable, and each lens's ramp to a safe ramp (blue to orange instead of red to green); "No colour" uses greys with patterns. [settings §5.5]
- VIEW-048 (Optional): Where patterns on lenses are on, every lens shall carry hatching, dots and stripes by band so it reads without colour. [settings §5.5]
- VIEW-049 (Optional): Where borders are High contrast, nation borders shall be drawn in black and white ink two art pixels wide. [settings §5.5]
- VIEW-050 (Ubiquitous): Route food colours shall also carry a pattern (solid, dashed, dotted); day counts stay at least 10 points tall at region zoom and hide rather than shrink when the map is too zoomed out. [troop-movement §10.7]
- VIEW-051 (Ubiquitous): Every lens the tutorial teaches shall read without telling colours apart (for example hungry provinces also carry the hunger icon on the Food lens). [tutorial §10; gap-lists List 2 item 10]

### 5.8 Performance budgets

- VIEW-052 (Ubiquitous): The map shall hold 60 fps while panning and zooming (16.7 ms a frame). [performance.md]
- VIEW-053 (Ubiquitous): Drawing the overlay (labels, towns, armies, routes) shall take at most 2.5 ms a frame on average and 5 ms at the 95th percentile. [performance.md]
- VIEW-054 (Ubiquitous): The map canvas shall shade 1 pixel per CSS pixel, never device pixels; the overlay canvas shall use the device pixel ratio so text stays crisp; close-up tile detail switches in by CSS zoom. [performance.md; mapView.ts] (see OQ-VIEW-1)
- VIEW-055 (Ubiquitous): The longest main-thread task while playing shall be at most 50 ms. [performance.md]
- VIEW-056 (State-driven): While something animates (marching armies), at least 90 % of frames shall be redrawn. [performance.md]
- VIEW-057 (Ubiquitous): The draw loop shall never read layout; text and sprites shall come from cached bitmaps; nothing per frame shall plan routes or walk the province graph. [performance.md]
- VIEW-058 (Ubiquitous): An engine turn shall take at most 25 ms with 5,000 provinces and 500 nations and at most 100 ms with 20,000 provinces and 2,000 nations. [performance.md]
- VIEW-059 (Ubiquitous): The worker's answer after End turn on the real map shall arrive within 250 ms, and applying it on the main thread shall take at most 16 ms (one frame). [performance.md]
- VIEW-060 (Ubiquitous): The turn shall be simulated in the background (a Web Worker, a Node worker on desktop); only when the worker has no support shall it run on the main thread. [performance.md; README]
- VIEW-061 (Ubiquitous): The worker shall send typed arrays and transfer them, never JSON of the world; applying a turn updates textures and redraws once; panels re-render only what is open. [performance.md]
- VIEW-062 (Ubiquitous): Budgets shall scale with the world, not the player: AI nations run in the same worker turn. [performance.md]
- VIEW-063 (Ubiquitous): The slowest route plan shall take at most 8 ms on 5,000 provinces and 32 ms on 20,000. [performance.md]
- VIEW-064 (Ubiquitous): A change that breaks a budget shall fail CI (`pnpm bench`; `pnpm --filter @ph/client perf`). [performance.md]
- VIEW-065 (Ubiquitous): Performance targets shall be measured at the phone defaults and checked once with Battery saver on. [settings §7]
- VIEW-066 (Optional): Where Battery saver is on, the frame rate shall be capped at 30, Sharpness set to Battery, animations reduced, the map redrawn only on change and the AI turn run with a smaller worker budget. [settings §5.1]
- VIEW-067 (State-driven): While nothing moves, the map shall not redraw, whatever the frame cap. [settings §5.1]
- VIEW-068 (Ubiquitous): Map detail shall have three steps: Low (no 8 × 8 close-in tiles, no surf, no forest blending), Medium (8 × 8 tiles, still water), High (everything). [settings §5.1]
- VIEW-069 (Ubiquitous): Animations shall have three steps: Full, Reduced, Off; Off shows battle results as still frames; Reduced motion sets Reduced or lower. [settings §5.1, §5.5]

## 6. Commands

Presentation commands, issued by the player; none reach the engine.

| Command | Who issues it | Preconditions | Result | Events emitted |
|---|---|---|---|---|
| `SetLens(lens)` | Player | Lens exists | Map recoloured | `LensChanged` |
| `SetZoom(zoom)` / `Pan(dx, dy)` | Player | — | Camera moved; zoom level may change | `ZoomLevelChanged` |
| `ToggleParchment(on)` | Player | — | Parchment shown or hidden (display only) | — |
| `SkipPlayback()` | Player | Month playback running | Map jumps to the end of the month | — |

## 7. Domain events

| Event | When | Payload | Consumed by (context) |
|---|---|---|---|
| `LensChanged` | Player picks a lens | lens id | audio (`map_lens` sound) |
| `ZoomLevelChanged` | Camera crosses a zoom boundary | level | audio (music zoom mix) |
| `PlaybackFinished` | Month playback ends or is skipped | turn | game-shell (turn report) |

## 8. Policies (reactions to other contexts)

- When `time-and-turns` emits `TurnEnded`, then the map applies the worker's arrays (textures updated, one
  redraw) and plays the month back.
- When `exploration` charts new places, then the parchment shrinks over them.
- When `settings` changes Sharpness, Frame rate cap, Map detail, Animations, colour vision, patterns or
  borders, then the map applies it at once or at the next redraw.

## 9. Monthly turn

The map does no simulation. After each turn it applies the results (≤ 16 ms), plays the month back, and
re-renders only open panels.

## 10. Configuration

| Key | Meaning | Value in the design | Placeholder? | Config file |
|---|---|---|---|---|
| `MAP_PIXEL_RATIO` | Map canvas pixels per CSS pixel | 1 | No | `apps/client/src/map/mapView.ts` |
| overlay device pixel ratio cap | Overlay resolution | ≤ 2 (today's code) | — | `main.ts` |
| frame budget | Frame time | 16.7 ms (60 fps) | No | performance.md |
| overlay budget | Per frame | ≤ 2.5 ms avg, ≤ 5 ms p95 | No | performance.md |
| main-thread task | Longest task | ≤ 50 ms | No | performance.md |
| redrawn frames while animating | Share | ≥ 90 % | No | performance.md |
| engine turn | 5k/500 and 20k/2,000 | ≤ 25 ms, ≤ 100 ms | No | performance.md |
| worker answer | After End turn | ≤ 250 ms | No | performance.md |
| apply answer | Main thread | ≤ 16 ms | No | performance.md |
| route planning | 5k and 20k provinces | ≤ 8 ms, ≤ 32 ms | No | performance.md |
| `replaySecondsPer10Days` | Playback speed | about 1 | Yes | `defines.json` (march) |
| turn strip delay | Show "what is being worked out" | 1.5 s | Yes (interface config) | interface config |
| battle flash pause | Pause on a battle during playback | 0.5 s | Yes | interface config |
| Short wide threshold | Phone landscape height | under 500 CSS px | Yes | interface config |
| side sheet width | Large layout | 380 px at UI scale 1 | Yes | interface config |
| card width on phone | Short wide | 45 % | Yes | interface config |
| bottom sheet height | Tall | 55 % | Yes | interface config |
| Far body text | Share of screen height | about 1/30; 5 % margin | Yes | interface config |
| tap target | Size and spacing | 44 × 44 pt, 8 pt; Large 56 | Yes | interface config |
| Faith hatch threshold | Other faith share hatched | 30 % | Yes | religion config |
| Sharpness | Native ≤ 3×, Balanced ≤ 2×, Battery 1× | phone default Balanced | No | settings |
| Frame rate cap | 30 / 60 / 120 / display | phone 60 | No | settings |
| Map detail | Low / Medium / High | phone Medium | No | settings |
| Animations | Full / Reduced / Off | Full | No | settings |

## 11. Seams

| Other context | Direction | Pattern | What crosses |
|---|---|---|---|
| world-map | upstream | Conformist | Id image, terrain image, depth, rivers, tile colours |
| time-and-turns | upstream | Customer–Supplier | Turn results, playback timing, turn-time budgets |
| province | upstream | Published Language | Province zoom content and lens stats (Food, Tax, Days to capital, Grievances, Ground, Recruits) |
| warfare | upstream | Published Language | Army banners, battles, sieges, rumours, front lines |
| troop-movement | upstream | Published Language | Routes, arrows, columns, playback events |
| naval | upstream | Published Language | Ports, fleets, Sea lens |
| trade | upstream | Published Language | Trade lenses, traders, roads and lanes |
| religion | upstream | Published Language | Faith lens, worship sprites, preachers, waves |
| culture | upstream | Published Language | Tongue lens and toggle |
| diplomacy | upstream | Published Language | Diplomacy lens, envoys, war-aim icons |
| exploration | upstream | Customer–Supplier | Charted map (parchment), voyages, colonies |
| buildings | upstream | Published Language | Works and Jobs lenses |
| subjects | upstream | Published Language | Subjects lens |
| revolutions | upstream | Published Language | Revolution lens |
| national-strengths | upstream | Published Language | Ambition shimmer |
| settings | upstream | Conformist | Performance knobs, colour vision, patterns, borders, reduced motion |
| game-shell | downstream | Customer–Supplier | Layout by window shape, map as home, cards over the map |
| audio | downstream | Published Language | Lens and zoom events |
| onboarding | downstream | Customer–Supplier | Lens and zoom steps the tutorial teaches |

## 12. AI

None. AI nations run in the same worker turn, which the turn budgets cover (VIEW-062).

## 13. Open questions and contradictions

- **OQ-VIEW-1 Sharpness against the shading rule.** Settings §5.1 says Sharpness Balanced is "up to 2
  (today's code)" and Native "up to 3", and §8 says the device-pixel-ratio cap of 2 in `mapView.ts` becomes
  Sharpness. performance.md says the map shades "1 pixel per CSS pixel, never device pixels", and the code
  has `MAP_PIXEL_RATIO = 1` (the cap of 2 is on the overlay in `main.ts`). Does Sharpness apply to the map
  canvas, the overlay, or both?
- **OQ-VIEW-2 Lens list not agreed.** Province stats 14 lists ten lenses including Traders passing and Trade
  balance; trade asked to rename them (Trade ratio, Trade value) and add Traders; buildings asks for Works and
  Jobs ("14 lenses"); naval adds Sea, diplomacy Diplomacy, subjects Subjects, revolutions Revolution. The
  province design has not adopted these changes. Today's build has Realms, Terrain, People, Wealth, Walls
  and Food, of which Realms, Terrain, People, Wealth and Walls are in no design list. Which lenses ship,
  and how does the picker hold about 17 of them on a phone?
- **OQ-VIEW-3 Parchment: display, rule or gameplay?** Settings §4.3 keeps "Parchment over unknown lands" as
  a display toggle and makes fog a campaign rule only if it ever hides information the AI uses. Exploration
  makes the charted map gameplay (only exploration ships enter uncharted zones; trade and military fleets
  plan only through charted zones). Fog is also listed among the new-game options. Can the toggle show
  uncharted land the player can't enter, and is "fog" in the options this toggle or something else?
- **OQ-VIEW-4 Zoom names.** Province, warfare and troop-movement use World, Region, Local; naval and
  exploration use World, Region, **Province** (naval also lists **Lens** as a row). The perf script pans "at
  five zooms". Are there three zoom levels, and is "Province" the same as "Local"?
- **OQ-VIEW-5 Zoom boundaries.** No design gives the camera zoom at which World, Region and Local change;
  today's code uses several thresholds (labels below 3.5, sprites from 1.1, 2, 3, 4, 6, 8).
- **OQ-VIEW-6 Playback and battle stops.** Troop-movement §10.6 plays the month back with half-second
  battle pauses; screen-flow G6 stops the turn at each player battle. How do playback and the stops combine
  (see OQ-TIME-3, OQ-TIME-15)?
- **OQ-VIEW-7 New systems' zoom content.** Gap item 29 asks every new system for its zoom table and lens.
  Government, recruiting, rebellions, subjects and revolutions give a lens or a card but no full zoom table.
- **OQ-VIEW-8 Budgets on real devices.** Budgets are checked on a CI machine in mobile Chromium with a
  software GPU (GPU time not measured). Gap List 2 item 14 asks for targets on a low-end Android phone, an
  older iPhone, Steam Deck and Steam Machine; none are set yet.
- **OQ-VIEW-9 Battery saver's AI budget.** Settings says Battery saver runs the AI turn "with a smaller
  worker budget (slower turns)". If that changes what the AI decides, it changes the simulation, which
  settings §1.6 forbids. Is it only slower, or also different?
- **OQ-VIEW-10 Map pixel art scale versus Map detail.** README describes 4 × 4 at middle zoom and 8 × 8 close
  in; Map detail Low stays at 4 × 4. Is Low still a valid reading of "close in" for the Local zoom's tile
  row and battle screen?

## 14. Traceability

| Requirement | Feature file | Scenario |
|---|---|---|
| VIEW-001 | map-rendering.feature | Recolouring after a turn only changes the lookup texture |
| VIEW-002 | map-rendering.feature | Far out the map shows terrain with the owner washed over it |
| VIEW-003 | map-rendering.feature | Closer in, each map pixel becomes art pixels |
| VIEW-004 | map-rendering.feature | Nation borders are an ink line with the owner's colour inside |
| VIEW-005 | map-rendering.feature | A repainted tile changes the far map too |
| VIEW-006 | map-rendering.feature | Rivers are drawn as one clean line |
| VIEW-007 | zoom-content.feature | World zoom shows owners and trouble icons |
| VIEW-008 | zoom-content.feature | World zoom shows armies as banners and arrows |
| VIEW-009 | zoom-content.feature | World zoom shows ports and fleets |
| VIEW-010 | zoom-content.feature | World zoom shows the parchment, voyages and colonies being founded |
| VIEW-011 | zoom-content.feature | Region zoom shows towns, castles, roads and damage |
| VIEW-012 | zoom-content.feature | Region zoom shows armies by arm with their food |
| VIEW-012 | zoom-content.feature | Dragging an army shows the forage limit |
| VIEW-013 | zoom-content.feature | Region zoom shows harbour berths and slipways |
| VIEW-014 | zoom-content.feature | Region zoom shows houses of worship, preachers and waves |
| VIEW-015 | zoom-content.feature | Envoys and war aims show only from Region zoom |
| VIEW-016 | zoom-content.feature | Region zoom shows traders and market cities |
| VIEW-017 | zoom-content.feature | Region zoom shows colonial range and colonisable provinces |
| VIEW-018 | zoom-content.feature | Local zoom shows the tile row as pixel art |
| VIEW-018 | zoom-content.feature | Local zoom shows marching columns in proportion |
| VIEW-019 | zoom-content.feature | Battles and sieges are shown on the province's own tiles |
| VIEW-020 | zoom-content.feature | Each new system states its zoom content and lens |
| VIEW-021 | lenses.feature | Picking a lens recolours the map |
| VIEW-022 | lenses.feature | The lens list holds every system's lens |
| VIEW-023 | lenses.feature | The Faith lens hatches large minority communities |
| VIEW-024 | lenses.feature | The Tongue lens changes with zoom and a toggle |
| VIEW-024 | lenses.feature | Homelands of peoples without a country are outlined |
| VIEW-025 | lenses.feature | The Diplomacy lens colours countries by your relation |
| VIEW-025 | lenses.feature | A league against you shows as a red border |
| VIEW-026 | lenses.feature | The Sea lens shows sailors, fleets, winds and reachable zones |
| VIEW-027 | lenses.feature | Trade lenses show ratio and your traders |
| VIEW-028 | lenses.feature | The Works and Jobs lenses colour building trouble and jobs |
| VIEW-029 | lenses.feature | The Subjects lens shows loyalty and courting |
| VIEW-030 | lenses.feature | The Revolution lens shows where the fire will start |
| VIEW-031 | lenses.feature | A hot ambition makes its region shimmer without naming the target |
| VIEW-032 | parchment.feature | Uncharted land and sea lie under the parchment |
| VIEW-033 | parchment.feature | The parchment only shrinks |
| VIEW-034 | parchment.feature | The parchment can be switched off for viewing |
| VIEW-035 | month-playback.feature | The month plays at about a second per ten days |
| VIEW-036 | month-playback.feature | Playback shows marches, battles and castles that stop armies |
| VIEW-037 | month-playback.feature | The map stays live while the turn is worked out |
| VIEW-038 | month-playback.feature | A long turn shows what is being worked out |
| VIEW-039 | layout.feature | The window shape decides the layout |
| VIEW-040 | layout.feature | The window shape decides the layout |
| VIEW-041 | layout.feature | The window shape decides the layout |
| VIEW-042 | layout.feature | The window shape decides the layout |
| VIEW-043 | layout.feature | The window shape decides the layout |
| VIEW-043 | layout.feature | The Far layout keeps clear of the overscan band |
| VIEW-044 | layout.feature | Phones play in landscape only |
| VIEW-045 | layout.feature | Tap targets are large and the risky buttons are apart |
| VIEW-046 | layout.feature | A card on a phone keeps the selected thing in view |
| VIEW-047 | map-accessibility.feature | Colour vision modes swap nation colours and lens ramps |
| VIEW-048 | map-accessibility.feature | Patterns let a lens read without colour |
| VIEW-049 | map-accessibility.feature | High contrast borders |
| VIEW-050 | map-accessibility.feature | Route food colours carry patterns |
| VIEW-050 | map-accessibility.feature | Day counts hide rather than shrink |
| VIEW-051 | map-accessibility.feature | The tutorial's Food lens works without telling colours apart |
| VIEW-052 | performance.feature | Frame budgets hold while panning and zooming |
| VIEW-053 | performance.feature | Frame budgets hold while panning and zooming |
| VIEW-054 | performance.feature | The map canvas shades per CSS pixel and the overlay per device pixel |
| VIEW-055 | performance.feature | Frame budgets hold while panning and zooming |
| VIEW-056 | performance.feature | Frame budgets hold while panning and zooming |
| VIEW-057 | performance.feature | The draw loop does no heavy work |
| VIEW-058 | performance.feature | Engine turns stay within budget as the world grows |
| VIEW-059 | performance.feature | The worker answers quickly and the answer applies in one frame |
| VIEW-060 | performance.feature | The turn runs in the background where it can |
| VIEW-061 | performance.feature | The worker answers quickly and the answer applies in one frame |
| VIEW-062 | performance.feature | Engine turns stay within budget as the world grows |
| VIEW-063 | performance.feature | Route planning stays within budget |
| VIEW-064 | performance.feature | Frame budgets hold while panning and zooming |
| VIEW-064 | performance.feature | Engine turns stay within budget as the world grows |
| VIEW-065 | performance.feature | Targets are measured at phone defaults and once with Battery saver |
| VIEW-066 | performance.feature | Battery saver turns every knob down |
| VIEW-067 | performance.feature | A still map is not redrawn |
| VIEW-068 | performance.feature | Map detail steps |
| VIEW-069 | performance.feature | Animation steps |
