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
- Turn playback on the map (speed, battle flashes, castle rings, slowing for player battles).
- Seasons on the map: per-province season palettes (X-17).
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
- VIEW-020 (Ubiquitous): Each system added after the province and warfare designs shall state what it shows at each zoom, including its map lens; a system that gives no zoom table shows its lens at every zoom and its card at Local only. [gap-lists List 1 item 29; D-VIEW-7]

### 5.3 Lenses

- VIEW-021 (Ubiquitous): A map lens shall recolour the map by one stat, chosen from the lens picker in the tool column. [province-stats §14; screen-flow §4.2, §4.7]
- VIEW-022 (Ubiquitous): The lens list shall hold the province lenses Food, Tax reaching you, Days to capital, Grievances, Faith, Tongue, Ground, Recruits; the trade lenses Trade ratio, Trade value and Traders (Trade ratio and Trade value replace Traders passing and Trade balance); and the lenses Diplomacy, Sea, Works, Jobs, Subjects and Revolution. [province-stats §14; trade §10.1; diplomacy §13.1; naval §10; buildings §11.1; subjects §10.3; revolutions §13] The picker also keeps the build's Realms, Terrain, People, Wealth and Walls, 22 lenses in all, and scrolls on a phone (D-VIEW-2).
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
- VIEW-034 (Optional): Where the player turns off "Parchment over unknown lands" in the lens menu, the map shall show the whole world; the switch is display only and never lets anything enter uncharted zones. [settings §4.3; main.ts; D-VIEW-3]

### 5.5 Month playback

- VIEW-035 (Event-driven): When a turn ends, its 7 days (fewer for the last turn) shall play on the map at about one second per 10 days (config); while a player battle runs, each day plays as six 4-hour steps at about half a second each (`playback.battleStepSeconds`); a skip button is offered only for a month with no player battle. [troop-movement §10.6; X-1; X-18; D-VIEW-6]
- VIEW-036 (Ubiquitous): During playback armies shall walk their routes, battles flash crossed swords, and castles that stop an army ring red; playback never pauses. [troop-movement §10.6; X-1]
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
- VIEW-054 (Ubiquitous): The map canvas shall shade 1 pixel per CSS pixel, never device pixels; the overlay canvas shall use the device pixel ratio so text stays crisp; close-up tile detail switches in by CSS zoom. Sharpness sets only the overlay's cap (Balanced 2, Native 3). [performance.md; mapView.ts; D-VIEW-1]
- VIEW-055 (Ubiquitous): The longest main-thread task while playing shall be at most 50 ms. [performance.md]
- VIEW-056 (State-driven): While something animates (marching armies), at least 90 % of frames shall be redrawn. [performance.md]
- VIEW-057 (Ubiquitous): The draw loop shall never read layout; text and sprites shall come from cached bitmaps; nothing per frame shall plan routes or walk the province graph. [performance.md]
- VIEW-058 (Ubiquitous): An engine turn shall take at most 25 ms with 5,000 provinces and 500 nations and at most 100 ms with 20,000 provinces and 2,000 nations, measured as the median of several runs of consecutive turns so one slow run on a shared CI runner does not count. [performance.md]
- VIEW-059 (Ubiquitous): The worker's answer after End turn on the real map shall arrive within 250 ms, and applying it on the main thread shall take at most 16 ms (one frame). [performance.md]
- VIEW-060 (Ubiquitous): The turn shall be simulated in the background (a Web Worker, a Node worker on desktop); only when the worker has no support shall it run on the main thread. [performance.md; README]
- VIEW-061 (Ubiquitous): The worker shall send typed arrays and transfer them, never JSON of the world; applying a turn updates textures and redraws once; panels re-render only what is open. [performance.md]
- VIEW-062 (Ubiquitous): Budgets shall scale with the world, not the player: AI nations run in the same worker turn. [performance.md]
- VIEW-063 (Ubiquitous): The slowest route plan shall take at most 8 ms on 5,000 provinces and 32 ms on 20,000. [performance.md]
- VIEW-064 (Ubiquitous): A change that breaks a budget shall fail CI (`pnpm bench`; `pnpm --filter @ph/client perf`). [performance.md]
- VIEW-065 (Ubiquitous): Performance targets shall be measured at the phone defaults and checked once with Battery saver on. [settings §7]
- VIEW-066 (Optional): Where Battery saver is on, the frame rate shall be capped at 30, Sharpness set to Battery, animations reduced and the map redrawn only on change; the AI turn's budget is counted in work steps and is the same with Battery saver on or off. [settings §5.1; X-15; D-VIEW-9]
- VIEW-067 (State-driven): While nothing moves, the map shall not redraw, whatever the frame cap. [settings §5.1]
- VIEW-068 (Ubiquitous): Map detail shall have three steps: Low (no 8 × 8 close-in tiles, no surf, no forest blending), Medium (8 × 8 tiles, still water), High (everything). [settings §5.1]
- VIEW-069 (Ubiquitous): Animations shall have three steps: Full, Reduced, Off; Off shows battle results as still frames; Reduced motion sets Reduced or lower. [settings §5.1, §5.5]
- VIEW-070 (Ubiquitous): The zoom level shall follow the camera zoom: World below 2, Region from 2 to under 4, Local from 4. [D-VIEW-4, D-VIEW-5] @placeholder
- VIEW-071 (State-driven): While several player battles run, the map shall show a battle bar with each running battle and its progress; tapping one follows it and moves the camera to it. [X-1]
- VIEW-072 (Ubiquitous): Each province's tiles shall take the palette of its hemisphere's season: in winter, snow on land from latitude 50° toward the pole and on every mountain province (otherwise the base palette); in spring, spring green; in summer, the base palette; in autumn, forests and fields turn gold; a dry land in its wet season shows the wet-season palette, shown alongside the seasonal markers (closed passes, fords, floods). [X-17; X-4] @placeholder
- VIEW-073 (Ubiquitous): Season palettes shall be swapped per province once a month, never per frame, and no setting shall turn them off. [X-17; X-15]

### Playtest feedback (17 October 2026)
Leroy's playtest feedback (DECISIONS.md, F-1 to F-22). It is the latest decision, so it replaces the requirements it names.

- VIEW-074 (Ubiquitous): Every army shall be drawn on its current map tile with its commander's banner, and shall move tile by tile along its route as playback runs. [F-3; F-2]
- VIEW-075 (Ubiquitous): Route lines shall be drawn as a light dash over a dark outline, so they stay readable on every map colour, terrain, season palette and lens. [F-5]
- VIEW-076 (State-driven): While a turn plays back, the top bar's date shall tick one day at a time, and show the hour of each 4-hour step while a player battle runs. [F-7]
- VIEW-077 (State-driven): While a battle runs, the map shall show it on its province with each side's men and a progress bar of men and morale left per side, updated every round, and the battle viewer shall show the same. [F-8; X-1]
- VIEW-078 (State-driven): While a castle is besieged, the map shall show the siege at Region and Local zoom with its progress: time held, breaches, garrison left and food left, updated when the siege updates. [F-9]
- VIEW-079 (Ubiquitous): The map shall draw no land province names at any zoom except on each country's capital; a province's name shows on its name tab and card when it is selected. Realm names and sea names stay. [F-22]
- VIEW-080 (Ubiquitous): The edge between open sea and sea ice shall be drawn with no ordered (checkerboard) dither; it shall be a soft, textured edge (VIEW-082). [F-24]
- VIEW-081 (Ubiquitous): Sea ice shall take its own colour, a grey-blue darker than land snow with faint cracks, so it can be told from snow on land in every colour vision mode. [F-25]
- VIEW-082 (State-driven): While the sea freezes, the drawn ice shall grow from the coasts and from the pole as the water cools and shrink back as it warms, so its outline crosses sea zones in natural shapes instead of filling whole zones, with a soft, textured edge between open sea and ice; a sea zone closes to fleets (MAP-049) once it is drawn mostly frozen. [F-26; X-17]

#### How the player uses it: armies, battles, sieges, the date and the ice on the map
1. Where: everything here is on the map itself, with nothing new to tap. The player ends the turn and watches: armies step tile by tile along their routes under their commanders' banners, the top bar's date ticks a day at a time (with the hour while their battle runs), a battle shows two bars per side over its tile (men, then morale), a besieged castle shows a plate of how long it has held with its breaches, garrison and food beneath, and the ice creeps out from the coasts as winter comes. A tap on an army, battle or castle opens its own card as before.
2. Grouping: each picture sits on the thing it shows, on its own tile; the battle viewer strip shows the same two bars as the map, and the siege's numbers are the same as on the castle's card.
3. Overview: the map is the overview of the war: whose armies are where, which battles are being lost (the morale bar emptying), which castles are about to fall (breaches and food), and where the sea is closing. Only each realm's capital is named, so the map stays clear and a capital reads as a seat; every other name is on the province's name tab and card.
4. Phone: the plates and bars are pixel art at one size from Region zoom in, sized so their digits stay at least 10 points tall; nothing needs hover; armies, battles and castles keep their 44-point tap boxes in the Wide and Tall layouts; route lines are a light dash over a dark outline, so they read on snow, desert, sea and a white realm alike, outdoors in bright light too.

### Milestone 3 playtest (17 October 2026)
Leroy's playtest feedback, items 55 to 58, 65, 77 and 89 of the feedback log.

- VIEW-083 (Ubiquitous): Every realm shall show its own national flag, without a pole, wherever its flag appears (the top bar, realm and nation buttons, the province card, the realm book's banner): the flag a player knows the country by today where it still stands, otherwise its banner of the age; a realm without one shows a cloth in its map colour. [feedback 55; feedback 37]
- VIEW-084 (Ubiquitous): A commander on the map shall be drawn as a figure on foot dressed in their realm's flag colours, with the headwear of where the realm lies in the early eras and the kit of the current era (plate and sword, halberd, pistol, tricorne, sabre, revolver, rifle, field glasses), their hair greying with age. [feedback 56]
- VIEW-085 (Ubiquitous): Army figures shall be drawn at one size at every zoom from Local in, so they never cover the province they stand in. [feedback 57]
- VIEW-086 (Ubiquitous): Every army figure on the map shall show its realm's flag before its men count, on the same row and centred on it, so you can tell whose army it is; the commander's name, where it shows, goes below. [feedback 77; feedback 89]
- VIEW-087 (Ubiquitous): Portraits of commanders, officials and lords shall show who they are and what they do: their realm's flag dimmed behind them and its colours on them; a commander in the armour or uniform of the era, an official in the dress and with the tool of their post (a judge's red robe and gavel, a steward's keys, a tax collector's purse, a schoolmaster's book), a lord in a fur mantle and coronet; their hair greying with age. [feedback 58; feedback 65]

#### How the player uses it: flags, commanders and portraits
1. Where: flags sit beside every realm name the player taps (top bar, realm links, the nation list) and before a commander's name on the map; commander figures stand on the map from Local zoom; portraits are on the army card, the official and lord cards and the realm book's Officials and Lords tabs.
2. Grouping: nothing new to tap; each picture sits on the card or tab of the thing it shows.
3. Overview: the map is the overview of armies, and a figure's colours and the flag at its name tell whose army it is at a glance; the Officials and Lords tabs are the overview of people.
4. Phone: figures are 32 × 44 CSS pixels with the tap box padded to 44 points round them; flags and portraits are images, so they need no hover; at the same size in the Wide and Tall layouts.

### Living map close in (18 October 2026)
Leroy asked for towns, boats and commanders to match the detail of the world map (feedback 126, feedback log row 133). Close in, the map stops showing icons and shows the world itself: towns cover map pixels in proportion to their people, and armies, fleets and traders become small figures in the ground's own art pixels. Sizes show importance, not kilometres (map scale, not true scale). Every number is a starting value in `livingMap` in `map-presentation.json`. [living-map-design.md]

Zoom bands
- VIEW-100 (State-driven): While at Local zoom, the map shall be in one of three bands by camera zoom (CSS pixels per map pixel): icons from 4 to under 16 (`livingFrom`), as Local zoom draws today; living from 16 to under 40 (`streetFrom`), with town footprints, hamlets, roads, figure armies, hull fleets and traders and the icons hidden; street from 40 to 96 (`streetTo`), the same at double art density. The three zoom levels World, Region and Local do not change. [living-map-design §2]
- VIEW-101 (State-driven): While the camera zoom is between `livingFrom - livingFade` (14) and `livingFrom` (16), the icons shall fade out as the living pieces fade in, so pinching across never pops. [living-map-design §2, §5.4]
- VIEW-102 (Ubiquitous): In the living band, every piece (towns, figures, ships, roads) shall be drawn in the ground's own art pixels, at `u = max(2, zoom / 8)` CSS pixels per art pixel, and at street level at `u = zoom / 16`, so at zoom 16 a piece is as big as today's tokens and nothing looks pasted on. [living-map-design §1.1, §2, §4]
- VIEW-103 (State-driven): While at street level, the terrain shall be drawn at 16 × 16 art pixels per map pixel, handing over from 8 × 8 at zoom 40 as 4 × 4 hands over to 8 × 8, and the tiles refined by seeded detail (stones, tufts, single trees, furrows) so they don't look blocky. [living-map-design §2, §3.5]
- VIEW-104 (Optional): Where Map detail is Low, the map shall draw icons at every zoom with the closest zoom 40; where Medium, the living band and no street level (closest zoom 40), with reduced life; where High, both bands (closest zoom 96) and full life (SET-041). [living-map-design §6]

Towns
- VIEW-105 (Ubiquitous): A town shall cover `clamp(1, maxCells, round(sqrt(town people in thousands) × cellsPerRootK))` map pixels (`cellsPerRootK` 1.0, `maxCells` 30), its town people being the province's craftsmen, market folk, clergy, clerks and scholars, the town classes the province overview counts. [living-map-design §3.1]
- VIEW-106 (Ubiquitous): A town shall grow from its seed, the province's own land pixel nearest its centre point (which can be in the sea), in a fixed order over the province's land within `growRadius` (8) pixels: each next pixel is the cheapest on the town's edge, its cost the distance to the seed plus a small seeded jitter, less a bonus by rivers and coasts, plus a penalty on mountains and marsh; lakes and sea are never used, so a growing town only adds pixels at its edge and a shrinking one only loses them. [living-map-design §3.1]
- VIEW-107 (Ubiquitous): The first `coreShare` (60 %) of a town's pixels shall be its core (packed houses on cobbles) and the rest its outskirts (scattered houses among strip fields). [living-map-design §3.1]
- VIEW-108 (Event-driven): When a turn is applied in a new game month, the map shall work out again the footprints of the provinces whose cell count changed, and no others, so towns never flicker. [living-map-design §3.1]
- VIEW-109 (Ubiquitous): Special cells shall be taken from the core in growth order, starting at the seed: a keep with the realm's flag and corner towers where the province is a realm's capital, a market square (stalls and a well) where the market is built, a house of worship by majority faith always (spire, dome or temple roof, extending `worshipSprites`), and a drill yard where it is built; the docks take the first town pixel by water where the harbour is built or the province is coastal, with a pier into each neighbouring water pixel. [living-map-design §3.2]
- VIEW-110 (State-driven): While a province has a fort, its core shall be ringed by a palisade along its outer edges, and while it has a castle, by a stone wall with towers, worked out from neighbouring core cells as coasts are. [living-map-design §3.2, §3.5]
- VIEW-111 (Ubiquitous): The countryside shall make `clamp(0, 6, round(rural thousands / 40))` hamlets of 1 or 2 houses on strip fields, each on a seeded land pixel at least 4 pixels from the town and from each other. [living-map-design §3.3]
- VIEW-112 (Ubiquitous): A mine, quarry or lumber camp shall mark one seeded pixel of the province on matching ground (mountains or hills, hills, forest), and farms add field strips round the outskirts. [living-map-design §3.2]
- VIEW-113 (Ubiquitous): A road line shall run over land from each town to the town of each neighbouring province, round the water and across rivers on a bridge pixel, drawn as a track, or as a road or paved road where both ends' road step is that high; each hamlet gets a track to its nearest town or hamlet within 8 pixels. [living-map-design §3.3]
- VIEW-114 (State-driven): While an army marches or a caravan travels in the living band, it shall be drawn along the road line where the road runs its way; the movement rules do not change. [living-map-design §3.3]
- VIEW-115 (Ubiquitous): The map shall carry towns as one settlement byte per map pixel in the free alpha channel of the province id texture: bits 0-3 the cell kind (0 none, 1 hamlet, 2 outskirts, 3 core, 4 keep, 5 market, 6 worship, 7 docks, 8 drill yard, 9 mine, quarry or camp, 10 ash, 11 building site, 12 landmark) and bits 4-7 the road links north, east, south and west; a change rewrites only the alpha of the chunks it touches, and below the living band the byte is ignored. [living-map-design §3.5]

Moving pieces
- VIEW-116 (Ubiquitous): In the living band, an army shall be drawn as one figure per `menPerFigure` men (1,000 living, 250 at street level), at least 1 and at most `maxFigures` (12 living, 40 street), split between foot, horse, guns and wagons in proportion to its arms. [living-map-design §4.1]
- VIEW-117 (State-driven): While an army stands, its figures shall stand in ranks on its tile, facing the way it last marched. [living-map-design §4.1]
- VIEW-118 (State-driven): While an army marches, its figures shall walk in step in a column along its route, the leading figure carrying the banner in the realm's colours; the route, week markers and arrival time are drawn as before. [living-map-design §4.1]
- VIEW-119 (State-driven): While a battle runs, the two sides' figures shall face each other on the battle tile with their front ranks clashing, and each round take away figures as the side's men fall (VIEW-077). [living-map-design §4.1]
- VIEW-120 (State-driven): While an army besieges a town, its figures shall stand in a ring round the walls among tents; rebels are the same figures in the rebel colour with no banner; and in the living band the commander's token is replaced by the banner-bearer, whose name shows on selection, or always at street level. [living-map-design §4.1]
- VIEW-121 (State-driven): While a fleet is at sea in the living band, it shall be drawn as one hull per `shipsPerHull` ships (5 living, 1 street), at most 8 or 24 hulls, sailing in a loose formation round the fleet's point with wakes while it moves, in the ship types of the naval design once they exist and a generic sailing ship until then. [living-map-design §4.2]
- VIEW-122 (State-driven): While a fleet is in port, its hulls shall lie at the docks' berths, as many as the harbour has berths (`harbourMarks`); a naval battle shows the hulls facing off on the zone with smoke. [living-map-design §4.2]
- VIEW-123 (State-driven): While a trade path is busy, the living band shall show up to 3 movers on it (a caravan of mules and carts on land, a barge on a navigable river, a trading ship at sea), spaced evenly and moving with the game clock from a start seeded by the path, so they never jump between frames or turns. [living-map-design §4.3]
- VIEW-124 (Ubiquitous): In the living band, envoys shall ride in the band's art pixels, explorers sail as a single ship along the voyage path, colonists' carts head for the colony site, and life (people in town streets and at the market at street level, chimney smoke, flags on keeps) shall be decoration only. [living-map-design §4.4]

How the player uses it
- VIEW-125 (Ubiquitous): In the living band, a tap on a formation, fleet or moving caravan shall open its own card (the army, fleet or trade path card) and a tap on a town cell the province card, resolving to the piece first and then the province; every piece has a tap box of at least 44 points round it, and stacked pieces fan out on tap as before. [living-map-design §5]
- VIEW-126 (Optional): Where the player turns Markers on (one toggle with the lens and map-mode buttons), the living band shall show the number plates and names over every piece; with it off only the selected piece shows its plate and route; names show always at street level, and capital names stay as pixel text under the keep. [living-map-design §5]
- VIEW-127 (Ubiquitous): Every number the icons show shall stay readable in its card, ledger or plate; the living band is never the only place where something can be read, and its sizes show importance, not true scale. [living-map-design §1.2, §1.3]
- VIEW-128 (State-driven): While a town is in a state, its tiles shall show it: scaffolding on a seeded core cell for a building site (replacing the hammer in this band), ash and rubble for burned or sacked cells, breaches in the walls and the besiegers' camp for a siege (VIEW-019), empty market stalls for hunger, smoke rising from the core for riots or revolt, pale cells with closed doors for plague, and the province's season palette (snow on roofs in winter, VIEW-072). [living-map-design §3.4]
- VIEW-129 (Optional): Where Animations is Off, every figure shall be drawn still; where Reduced, only marching and battles move; Battery saver sets Map detail Medium with still figures. [living-map-design §6]
- VIEW-130 (Ubiquitous): The overlay shall animate at most `maxAnimated` (60) figures at about 10 frames a second, the nearest the screen's centre first, from sprite caches keyed by piece, colour and whole `u` with least-recently-used eviction; towns cost the tiled tiers one extra texture read, and the budgets do not change (VIEW-054). [living-map-design §1.5, §6]
- VIEW-131 (Ubiquitous): Town buildings shall take their culture group's style (`townStyles`: roof and wall colours from the 32-colour palette and a house variant set), with one generic set until a group has its own, and a hand-made landmark (`landmarks`, per province) replaces the generic keep or worship cell where one exists. [living-map-design §3.4]
- VIEW-132 (Ubiquitous): The snapshot shall carry the busy trade paths the player may see for the living map: traders sharing a loop and a way of going (land, river or sea) are one path, with its loop province by province, its trader count, the realm of its first trader for the colours and one of the player's traders on it; a path is kept where its loop enters a province whose trade the player sees (D-TRADE-13), busiest first, at most `livingMap.traders.maxPaths` (200). A tap on a mover of a path the player has a trader on opens that trader's card in the Trade tab; others give way to the province beneath, as there is no card for another realm's trader. [living-map-design §4.3, §7]

#### How the player uses it: the living map
1. Where: the player pinches past the Local icons and nothing else is new. A tap on a town cell opens its province card, a tap on a formation or fleet its own card, a tap on a moving caravan the trade path's card; taps go to the piece first, then the province.
2. Grouping: this is a way of drawing, not a new screen; each piece keeps its existing card, and the one new control, **Markers**, sits with the lens and map-mode buttons in the map controls.
3. Overview: army sizes, sieges, battles and building works keep their overviews (the army list, the battle bar, the Works and Garrison tabs); in the band each has a picture (town states, figures lost, breaches) so the map alone still tells the story, and the numbers stay in the cards.
4. Phone: every formation, fleet and caravan has a tap box of at least 44 points even when its figures are smaller; Markers brings back the plates for players who want the numbers, and the selected piece always shows its plate and route; nothing needs hover; plates and tap boxes stay inside the safe areas in the Wide and Tall layouts; pinching across 14 to 16 cross-fades with no pop. At zoom 16 a phone held sideways shows about 53 × 22 map pixels, at 40 about 21 × 9 and at 96 about 9 × 4, one city.

## 6. Commands

Presentation commands, issued by the player; none reach the engine.

| Command | Who issues it | Preconditions | Result | Events emitted |
|---|---|---|---|---|
| `SetLens(lens)` | Player | Lens exists | Map recoloured | `LensChanged` |
| `SetZoom(zoom)` / `Pan(dx, dy)` | Player | — | Camera moved; zoom level may change | `ZoomLevelChanged` |
| `ToggleParchment(on)` | Player | — | Parchment shown or hidden (display only) | — |
| `ToggleMarkers(on)` | Player | Living band | Plates and names shown over every piece, or only the selected one (display only) | — |
| `SkipPlayback()` | Player | Turn playback running and no player battle in the turn | Map jumps to the end of the month | — |

## 7. Domain events

| Event | When | Payload | Consumed by (context) |
|---|---|---|---|
| `LensChanged` | Player picks a lens | lens id | audio (`map_lens` sound) |
| `ZoomLevelChanged` | Camera crosses a zoom boundary | level | audio (music zoom mix) |
| `PlaybackFinished` | Month playback ends or is skipped | turn | game-shell (turn report) |

## 8. Policies (reactions to other contexts)

- When `time-and-turns` emits `TurnEnded`, then the map applies the worker's arrays (textures updated, one
  redraw) and plays the turn back.
- When `exploration` charts new places, then the parchment shrinks over them.
- When `settings` changes Sharpness, Frame rate cap, Map detail, Animations, colour vision, patterns or
  borders, then the map applies it at once or at the next redraw.

## 9. Each turn

The map does no simulation. After each turn it applies the results (≤ 16 ms), plays the turn back, and
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
| `playback.battleStepSeconds` | Playback of one 4-hour step while a player battle runs | 0.5 s | Yes | `map-presentation.json` |
| `seasonPalettes.snowFromLatitude` | Latitude from which winter snow covers land | 50° | Yes | `map-presentation.json` |
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
| `livingMap.livingFrom`, `livingFade`, `streetFrom`, `streetTo` | Living and street band zooms | 16, 2, 40, 96 | Yes | `map-presentation.json` |
| `livingMap.cellsPerRootK`, `maxCells`, `coreShare` | Town footprint | 1.0, 30, 60 % | Yes | `map-presentation.json` |
| `livingMap.growRadius`, `growth` | Town growth order | 8 pixels; jitter and river, coast, mountain and marsh weights | Yes | `map-presentation.json` |
| `livingMap.hamlets` | Hamlets and tracks | 40 thousand rural per hamlet, at most 6, 4 apart, tracks within 8 | Yes | `map-presentation.json` |
| `livingMap.figures` | Figures | 1,000 / 250 men a figure, 12 / 40 at most, 60 animated at 10 fps | Yes | `map-presentation.json` |
| `livingMap.hulls` | Hulls | 5 / 1 ships a hull, 8 / 24 at most | Yes | `map-presentation.json` |
| `livingMap.traders.maxMovers` | Movers per trade path | 3 | Yes | `map-presentation.json` |
| `livingMap.traders.maxPaths` | Trade paths in the snapshot feed | 200 | Yes | `map-presentation.json` |
| `livingMap.byDetail` | Bands and life by Map detail | Low off, Medium living, High living and street | Yes | `map-presentation.json` |
| `livingMap.townStyles`, `landmarks` | Culture styles and landmarks | generic set; Toledo, Constantinople, Rome, Paris, Venice, Cairo, Beijing, Cuzco | Yes | `map-presentation.json` |

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

## 13. Decisions and open questions

- **D-VIEW-1** (was OQ-VIEW-1) Sharpness: Sharpness applies to the overlay only (Balanced up to 2, Native up to 3 device pixels per CSS pixel); the map canvas always shades 1 pixel per CSS pixel. It keeps the performance rule and the code.
- **D-VIEW-2** (was OQ-VIEW-2) Lenses: the lens picker holds the build's six (Realms, Terrain, People, Wealth, Walls, Food) and every lens the designs add (Tax reaching you, Days to capital, Grievances, Faith, Tongue, Ground, Recruits, Trade ratio, Trade value, Traders, Diplomacy, Sea, Works, Jobs, Subjects, Revolution), 22 in all, in a scrolling picker on a phone; Trade ratio and Trade value replace Traders passing and Trade balance. Keep what the game does and follow trade v2 (X-6).
- **D-VIEW-3** (was OQ-VIEW-3) Parchment: "Parchment over unknown lands" is a display toggle only; it never lets the player enter uncharted zones, which stays exploration's rule, and "fog" in the new-game options is the fog-of-war campaign rule, a different thing. X-15: settings never change results.
- **D-VIEW-4** (was OQ-VIEW-4) Zoom names: there are three zoom levels, World, Region and Local; "Province" in naval and exploration means Local. The simpler set.
- **D-VIEW-5** (was OQ-VIEW-5) Zoom boundaries: World below camera zoom 2, Region from 2 to under 4, Local from 4 (provisional in `map-presentation.json`). Missing numbers get provisional values.
- **D-VIEW-6** (was OQ-VIEW-6) Playback and battles: the turn plays back as the day loop runs over its 7 days (X-18); while a player battle runs, playback slows to six 4-hour steps a day (provisional 0.5 s each) and never stops or skips; a battle bar lets the player switch between running battles; there are no half-second pauses. X-1 and X-18 (Leroy, 17 Oct) settle it.
- **D-VIEW-7** (was OQ-VIEW-7) New systems' zoom content: a system with no zoom table shows its lens at every zoom and its card at Local only. Simplest default with no new content.
- **OQ-VIEW-8** (release task) Budgets on real devices: targets on a low-end Android phone, an older iPhone, Steam Deck and Steam Machine need device tests.
- **D-VIEW-9** (was OQ-VIEW-9) Battery saver: it only lowers the frame rate, animation and music voices; the AI's budget is counted in work steps, the same on every device, and `engine.worker_budget` is dropped. X-15 settles it.
- **D-VIEW-10** (was OQ-VIEW-10) Map detail Low: Low keeps 4 × 4 art at every zoom, Local included, and that is a valid close-in view. It only lowers detail and changes nothing else.

- **OQ-VIEW-11** (default chosen) Band thresholds: living from zoom 16 and street level up to 96. Leroy can overrule. [living-map-design §9 OQ-LIVE-1]
- **OQ-VIEW-12** (default chosen) Footprint scale: `sqrt(town thousands) × 1.0`, capped at 30 cells, to be tuned so big cities read clearly without swallowing small provinces. [OQ-LIVE-2]
- **OQ-VIEW-13** (default chosen) Street level on the phone default: Medium has no street level, to spare the battery; High only. [OQ-LIVE-3]
- **OQ-VIEW-14** (default chosen) First landmarks: Toledo, Constantinople (Hagia Sophia), Rome, Paris, Venice, Cairo, Beijing (the Forbidden City) and Cuzco. [OQ-LIVE-4]

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
| VIEW-020 | zoom-content.feature | A new system with no zoom table falls back to its lens and a Local card |
| VIEW-021 | lenses.feature | Picking a lens recolours the map |
| VIEW-022 | lenses.feature | The lens list holds every system's lens |
| VIEW-022 | lenses.feature | The lens picker holds 22 lenses and scrolls on a phone |
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
| VIEW-034 | parchment.feature | Switching the parchment off charts nothing |
| VIEW-035 | month-playback.feature | The turn's days play at about a second per ten days |
| VIEW-035 | month-playback.feature | Playback slows to 4-hour steps while a player battle runs |
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
| VIEW-066 | performance.feature | Battery saver turns the display knobs down and leaves the AI alone |
| VIEW-067 | performance.feature | A still map is not redrawn |
| VIEW-068 | performance.feature | Map detail steps |
| VIEW-069 | performance.feature | Animation steps |
| VIEW-070 | zoom-content.feature | The camera zoom picks the zoom level |
| VIEW-071 | month-playback.feature | The battle bar switches between running battles |
| VIEW-072 | seasons.feature | Each province takes its season's palette |
| VIEW-073 | seasons.feature | Palettes swap once a month and cannot be turned off |
| VIEW-074 | zoom-content.feature | Armies stand on their tile with their commander's banner |
| VIEW-075 | map-rendering.feature | Route lines stay readable on any colour |
| VIEW-076, 077 | month-playback.feature | The date ticks during playback; Battles show their progress on the map |
| VIEW-078 | zoom-content.feature | Sieges show their progress on the map |
| VIEW-079 | zoom-content.feature | No province names on the map |
| VIEW-080–082 | seasons.feature | The sea-ice edge is soft; Sea ice is not snow; Sea ice grows in natural shapes |
| VIEW-083 | zoom-content.feature | Realms show their national flags |
| VIEW-084 | zoom-content.feature | Commanders look like their realm, era and age |
| VIEW-085 | zoom-content.feature | Army figures keep one size as you zoom in |
| VIEW-086 | zoom-content.feature | An army's men count carries their realm's flag |
| VIEW-087 | zoom-content.feature | Portraits show who people are and what they do |
| VIEW-100 | living-map.feature | Local zoom splits into three bands |
| VIEW-101 | living-map.feature | Icons cross-fade into living pieces |
| VIEW-102 | living-map.feature | Pieces are drawn in the ground's art pixels |
| VIEW-103 | living-map.feature | Street level doubles the art density |
| VIEW-104 | living-map.feature | Map detail sets the close-in bands |
| VIEW-105 | living-map.feature | A town covers map pixels by the root of its people; Town people are the town classes |
| VIEW-106 | living-map.feature | Toledo grows from its seed over its own land; A town whose centre point is in the sea is seeded on land; A growing town only adds pixels at its edge |
| VIEW-107 | living-map.feature | The first 60 % of a town is its core |
| VIEW-108 | living-map.feature | Footprints change only in a new month and only where needed |
| VIEW-109 | living-map.feature | A capital's core holds its keep, market, house of worship and drill yard; A village always has its house of worship |
| VIEW-110 | living-map.feature | Walls by castle step |
| VIEW-111 | living-map.feature | The countryside makes hamlets; Hamlets stand apart from the town and each other |
| VIEW-112 | living-map.feature | A mine marks one pixel of the province |
| VIEW-113 | living-map.feature | Roads are graded by both ends; Roads join neighbouring towns over land; No road reaches an island |
| VIEW-114 | — | presentation only: drawing marches and caravans along the road line |
| VIEW-115 | living-map.feature | The settlement byte packs kind and road links |
| VIEW-116 | living-map.feature | One figure per thousand men; Figures are split by arm |
| VIEW-117 | living-map.feature | A standing army stands in ranks |
| VIEW-118 | living-map.feature | A marching army walks in a column behind its banner |
| VIEW-119 | living-map.feature | Figures fall with the men |
| VIEW-120 | living-map.feature | Rebels carry no banner |
| VIEW-121 | living-map.feature | Fleets as hulls |
| VIEW-122 | living-map.feature | Hulls in port fill the berths |
| VIEW-123 | living-map.feature | Traders move steadily along their path |
| VIEW-124 | — | presentation only: envoys, explorers, colonists and life are decoration |
| VIEW-125 | living-map.feature | A tap goes to the piece before the province; Every piece has a 44-point tap box |
| VIEW-126 | living-map.feature | Markers bring back the plates |
| VIEW-127 | — | presentation only: the cards keep every number; checked by review |
| VIEW-128 | — | presentation only: town states are tile art |
| VIEW-129 | living-map.feature | Animations set which figures move |
| VIEW-130 | living-map.feature | At most 60 figures move at once |
| VIEW-131 | — | presentation only: culture styles and landmarks are art |
| VIEW-132 | living-map.feature | The snapshot feeds the busy trade paths |
