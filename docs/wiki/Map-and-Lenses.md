# Map and Lenses

The map is home in Pocket Hegemony: you play on it, and cards and screens open over it. This page covers how the map is drawn, what you see at each of the three zoom levels, the lenses that recolour the world by one stat, the parchment over lands you have not charted, how the month plays back after End turn, how screens arrange themselves on phones, tablets, PCs and TVs, and the speed budgets that keep it all smooth on a phone. All of it is presentation only: what a lens or an icon *means* is the rule of the system that owns that stat, and nothing the map does ever changes the simulation.

## How it works

### Drawing the map

The map is drawn with WebGL2. The province id image (which place each pixel belongs to) is uploaded once, and each province's colour comes from a small lookup texture, so recolouring the whole world after a turn costs almost nothing.

How a map pixel looks depends on how far you are zoomed in:

| Zoom | How each map pixel is drawn |
|---|---|
| Zoomed out | The terrain's colour with hill shading, and the owner's colour washed over it. The sea is shaded by depth, with dithered edges between depth bands. |
| Middle zoom | 4 × 4 art pixels (half-size tiles) from the terrain tile atlas |
| Close in | 8 × 8 art pixels, with rounded coasts, sand and surf |

Nation borders are an ink line with a band of the owner's colour inside. Each tile type's average colour is its colour on the far map, so an artist who repaints a tile changes the far map too. Rivers are drawn as one clean line along their traced path.

Labels, towns, armies and routes are painted on a separate overlay at the device's pixel ratio, from cached bitmaps, so text stays crisp.

The map never unloads during a campaign, and exactly one lens is active at a time.

### The three zoom levels

There are three zoom levels: **World**, **Region** and **Local** ("Province" zoom in the [Naval](Naval) and [Exploration and Colonies](Exploration-and-Colonies) pages means Local). The map is at World zoom when zoomed out furthest, switches to Region at camera zoom 2 and to Local at 4. Local zoom is still the map, not a screen: the province's tile row is part of it.

**World zoom** shows the big picture:

- Each province's owner colour, with a small icon if it is hungry, rioting or in revolt, and front lines.
- Armies as a banner with a men count, each standing on its own tile with its commander's banner and moving tile by tile as the week plays; battles as crossed swords with each side's men and a bar of men and morale left; besieged castles with a ring. Armies on the move are arrows, thick by men and coloured by owner, with no day counts.
- Ports as anchor dots in the owner's colour, larger for great ports; fleets as a single ship sprite with a count.
- The parchment, voyage paths as dotted lines, and colonies being founded as a small flag with a progress ring.
- For diplomacy, only the lens colours.

**Region zoom** shows a province's life:

- Sieges with their progress: how long the castle has held, its breaches, and the garrison and food left.
- Town size, the castle and its reach rings, roads, rivers and the busiest trade paths (thicker means more traders), armies and sieges, burned provinces hatched, and plague.
- Armies as sprites by arm (foot, horse, guns) with a food bar on the banner showing days of reserve left; rumours as faded banners; the forage limit while you drag an army; and the full route of a selected army with day counts, month marks, food colour and step icons.
- The harbour tile with an anchor icon showing berths used and free (for example `7/20`), a slipway icon with hulls being built, and fleets with their admiral's banner and course line in days.
- Each house of worship as a sprite in the town, preachers as walking figures, and active faith waves as a soft tint spreading from their source.
- Envoys on the road as small riders with a dotted route, and the war-aim icon on countries you hold a war aim against.
- Traders as icons (caravan, barge, ship) with a purse bar, and a coin on cities with a market.
- Colonial range as a faint line on the sea, and colonisable provinces with a pale flag.

**Local zoom** shows the province's tile row as pixel art:

- Each tile's building as a sprite, burned tiles in ash, workers moving on busy tiles, ships in the harbour, caravans on the road and barges on the river.
- Marching armies as columns of foot, horse, guns and wagons in proportion.
- A battle is shown on the province's own tile row, and a siege as the castle tile with breaches drawn in the walls.

**Commanders, flags and portraits.** Each army's commander stands on the map on foot, dressed in their country's flag colours, so a French commander wears blue and white and an English one red and white. Their kit follows the era: plate and sword in 1444, halberd and morion from 1500, pistol and buff coat from 1600, then tricorne, sabre, revolver, rifle and field glasses. Their hair greys as they age. The figure stays the same size however far you zoom in. Their country's flag sits in front of their men count, on the same row, and their name shows below. Every country flies its own flag, without a pole: the one you know it by today where it still exists, otherwise its banner of the age. Portraits of commanders, officials and lords stand before their country's flag and show what they do: armour or uniform for a commander, the dress and tool of an official's post (a judge's red robe and gavel, a steward's keys, a tax collector's purse), and a fur mantle and coronet for a lord.

Land provinces have no names on the map at any zoom, except each country's capital, so you can see whose capital it is. Every province's name shows on its name tab and card when you select it. Realm names and sea names stay. Route lines are a light dash over a dark outline, so they read on every colour.

Every system added after the province and warfare designs has to state what it shows at each zoom, including its lens.

### Lenses

A **lens** recolours the map by one stat. You pick it from the lens picker, a small pop-over in the tool column. The lens list brings together every system's lens:

| Lens | What it colours | Owner |
|---|---|---|
| Food | Food in each province | [Provinces](Provinces) |
| Tax reaching you | Tax that reaches your treasury | [Provinces](Provinces) |
| Days to capital | How far each province is from the capital | [Provinces](Provinces) |
| Grievances | Grievances in each province | [Provinces](Provinces) |
| Faith | Majority faith, hatched where another faith is 30 % or more; holy places carry a small icon | [Religion](Religion) |
| Tongue | Tongue family at far zoom, tongue at region zoom; a toggle to kin, cousin or stranger colours for your realm; homelands of peoples without a country outlined | [Culture](Culture) |
| Ground | Each province's ground | [Provinces](Provinces) |
| Recruits | Recruits | [Provinces](Provinces) |
| Trade ratio | Provinces by trade ratio, with the busiest roads and sea lanes as lines | [Trade](Trade) |
| Trade value | Trade value | [Trade](Trade) |
| Traders | Only your traders and their routes | [Trade](Trade) |
| Diplomacy | Every country by your relation to it (see below) | [Diplomacy](Diplomacy) |
| Sea | Ports shaded by sailors who can still be called; fleets at sea; the month's winds as arrows; zones your ships can enter at current research | [Naval](Naval) |
| Works | Building sites (green), neglected or damaged buildings (amber), ruined ones (red) | [Buildings](Buildings) |
| Jobs | Empty job slots against homeless people | [Buildings](Buildings) |
| Subjects | Your subjects by loyalty, with a line to each courted subject from the courting country's capital | [Subjects](Subjects) |
| Revolution | Provinces by how many of the revolution's province-level signs they meet; risen provinces hatched in the revolution's colour | [Revolutions](Revolutions) |

Trade ratio and Trade value replace the older Traders passing and Trade balance lenses. The picker holds 22 lenses: Realms, Terrain, People, Wealth, Walls and Food, plus Tax reaching you, Days to capital, Grievances, Faith, Tongue, Ground, Recruits, Trade ratio, Trade value, Traders, Diplomacy, Sea, Works, Jobs, Subjects and Revolution. On a phone the picker scrolls. A system with no zoom plan of its own shows its lens at every zoom and its card only at Local.

**Diplomacy lens colours:**

| Colour | Means |
|---|---|
| Your own colour | You and your subjects |
| Blue (light blue if pledged) | Allies |
| Green, pale green | Close, Warm |
| Grey | Cool, or nothing recorded |
| Orange | Cold or Rival |
| Red (hatched at war) | Hostile, Bitter or at war |
| Red border | A league against you |

**Ambition shimmer.** While one of your national ambitions that names places is hot, the map shimmers faintly over the region it concerns, without outlining or naming the target. See [National Strengths](National-Strengths).

### Parchment over uncharted lands

Land and sea your country has not charted lie under a drawn **parchment**. The parchment shows your charted map, which only ever grows; it replaces the old rule of showing everything within 6 steps of your lands and armies. Which places you have charted is decided by [Exploration and Colonies](Exploration-and-Colonies).

The **Charts lens** shows the same charted map with the parchment always on, empty coasts you could settle in green and colonies being founded in gold (see [Exploration and Colonies](Exploration-and-Colonies#how-you-play-it)).

You can turn off "Parchment over unknown lands" in the lens menu to see the whole world. That switch is display only. It only changes what you see: it never lets you enter uncharted waters, and it is not the fog of war campaign rule.

### Watching the week

The date in the top bar ticks one day at a time while the week plays, and shows the hour of each 4-hour step during one of your battles.

While a turn is being worked out, the map stays visible: you can pan and zoom, armies march along their routes, and borders change as results arrive. If the turn takes longer than 1.5 seconds, a small parchment strip says what is being worked out, such as "The courts of Europe deliberate…".

A turn is one week. When you end it, the week **plays back** on the map: armies walk their routes, and castles that stop an army ring red. While one of your battles is being fought, the playback slows to six 4-hour steps a day, about half a second each, and a battle bar shows every battle running. From the bar you can switch between battles, change your standing orders or retreat. The game never stops for a battle, and you cannot skip the playback while one of your battles is running; battles between other realms never slow it. See [Time and Turns](Time-and-Turns).

### Seasons

The map shows the season. Lands north of latitude 50 and mountains turn white with snow in winter, wet climates turn green in the rainy months, and northern seas show ice while they are frozen. Sea ice is grey-blue with faint cracks, darker than the white snow on land, so you can tell frozen sea from snowy coast. It grows out from the coasts and the pole as the water cools and melts back in spring, in natural shapes with a soft, textured edge, not as whole sea zones turning white at once. A sea zone closes to fleets once most of it is frozen. The season colours stay readable in every colour vision mode, and there is no switch to turn them off.

### Layout by window shape

Screens are laid out by the **shape of the window**, not by the device:

| Window shape | Typical device | Layout |
|---|---|---|
| Short wide | Phones in landscape (height under 500 CSS px) | Map first; cards are side sheets on the left (45 % of the screen); the Realm book's tabs are a left icon rail; the top bar is one thin row |
| Tall | Tablets in portrait, desktop windows taller than wide | Cards are bottom sheets (55 % height, draggable); Realm book tabs a bottom icon row; the tool column on the right edge above End turn |
| Large | Tablets in landscape, desktop, Steam Deck (1280 × 800) | Side sheets have a fixed width (380 px at UI scale 1); menus centred with a maximum width; nothing stretches edge to edge |
| Far | TV and Steam Machine | The Large layout with the UI scaled up so body text is about 1/30 of the screen height, thicker focus frames, and nothing in the outer 5 % of the screen |

Phones play **in landscape only**, on every screen; a phone held upright shows "Turn your phone sideways". When a card is open on a phone in landscape, the map stays live on the right and is recentred so the selected thing isn't hidden.

Every tap target is at least 44 × 44 points with 8 points between neighbours (56 with Large touch targets). End turn and the game menu button sit at opposite corners, and system safe areas stay clear of buttons.

### Map accessibility

- **Colour vision modes** swap nation colours to a second assignment from the same 32-colour palette, chosen so neighbours stay distinguishable, and switch each lens to a safe ramp (blue to orange instead of red to green). "No colour" uses greys with patterns.
- **Patterns on lenses** add hatching, dots and stripes by band so every lens reads without colour.
- **High contrast borders** draw nation borders in black and white ink two art pixels wide.
- Route food colours also carry a pattern (solid, dashed, dotted). Day counts stay at least 10 points tall at region zoom and hide rather than shrink when you zoom too far out.
- Every lens the tutorial teaches reads without telling colours apart; for example, hungry provinces also carry the hunger icon on the Food lens.

### Staying smooth: performance budgets

| Budget | Limit |
|---|---|
| Panning and zooming | 60 fps (16.7 ms a frame) |
| Drawing the overlay | at most 2.5 ms a frame on average, 5 ms at the 95th percentile |
| Longest main-thread task while playing | 50 ms |
| Frames redrawn while something animates | at least 90 % |
| Engine turn, 5,000 provinces and 500 nations | 25 ms |
| Engine turn, 20,000 provinces and 2,000 nations | 100 ms |
| Worker's answer after End turn on the real map | 250 ms |
| Applying that answer on the main thread | 16 ms (one frame) |
| Slowest route plan, 5,000 / 20,000 provinces | 8 ms / 32 ms |

To hold these:

- The map canvas shades 1 pixel per CSS pixel, never device pixels; the overlay uses the device pixel ratio; close-up tile detail switches in by CSS zoom.
- The draw loop never reads layout, takes text and sprites from cached bitmaps, and never plans routes or walks the province graph per frame.
- The turn is simulated in the background (a Web Worker, or a Node worker on desktop); only without worker support does it run on the main thread.
- The worker sends typed arrays and transfers them, never JSON of the world. Applying a turn updates textures and redraws once; panels re-render only what is open.
- Budgets scale with the world, not the player: AI nations run in the same worker turn.
- A change that breaks a budget fails the build (`pnpm bench`, `pnpm --filter @ph/client perf`). Targets are measured at the phone defaults and checked once with Battery saver on.
- While nothing moves, the map does not redraw, whatever the frame cap.

**Performance knobs** (in [Settings](Settings)):

| Knob | Steps |
|---|---|
| Sharpness | Native (up to 3×), Balanced (up to 2×), Battery (1×) |
| Frame rate cap | 30, 60, 120 or the display's rate |
| Map detail | Low (no 8 × 8 close-in tiles, no surf, no forest blending), Medium (8 × 8 tiles, still water), High (everything) |
| Animations | Full, Reduced, Off (battle results as still frames); Reduced motion sets Reduced or lower |
| Battery saver | Caps the frame rate at 30, sets Sharpness to Battery, reduces animations, redraws only on change, and runs the AI turn with a smaller worker budget |

## What you see

- The map itself at World, Region and Local zoom, as described above.
- The **tool column** with the **lens picker** pop-over, and the lens menu with the parchment switch and the Tongue toggle.
- **Weekly playback**, slowed to 4-hour steps during your battles, and the parchment strip during long turns.
- Cards as side sheets or bottom sheets depending on the window shape; "Turn your phone sideways" on an upright phone.

Commands you give here never reach the engine: picking a lens, zooming and panning, toggling the parchment, and skipping playback. Picking a lens and crossing a zoom boundary are passed to [Music and Sound](Music-and-Sound) (the lens sound and the music's zoom mix), and the end of playback tells [Screens and Navigation](Screens-and-Navigation) to show the turn report.

## How it connects

- [World Map](World-Map): supplies the id image, terrain image, depth, rivers and tile colours.
- [Time and Turns](Time-and-Turns): turn results, playback timing and turn-time budgets.
- [Provinces](Provinces): province zoom content and the Food, Tax, Days to capital, Grievances, Ground and Recruits lenses.
- [Warfare](Warfare): army banners, battles, sieges, rumours, front lines.
- [Troop Movement](Troop-Movement): routes, arrows, columns and playback events.
- [Naval](Naval): ports, fleets and the Sea lens.
- [Trade](Trade): trade lenses, traders, roads and lanes.
- [Religion](Religion): the Faith lens, worship sprites, preachers, waves.
- [Culture](Culture): the Tongue lens and its toggle.
- [Diplomacy](Diplomacy): the Diplomacy lens, envoys, war-aim icons.
- [Exploration and Colonies](Exploration-and-Colonies): the charted map under the parchment, voyages, colonies.
- [Buildings](Buildings): the Works and Jobs lenses.
- [Subjects](Subjects): the Subjects lens.
- [Revolutions](Revolutions): the Revolution lens.
- [National Strengths](National-Strengths): the ambition shimmer.
- [Settings](Settings): performance knobs, colour vision, patterns, borders, reduced motion.
- [Screens and Navigation](Screens-and-Navigation): layout by window shape, the map as home, cards over the map.
- [Music and Sound](Music-and-Sound): lens and zoom events.
- [Tutorial and Help](Tutorial-and-Help): the lens and zoom steps the tutorial teaches.

## Numbers

| Value | Config key / where | Design value | Provisional? |
|---|---|---|---|
| Map canvas pixels per CSS pixel | `MAP_PIXEL_RATIO` (`mapView.ts`) | 1 | No |
| Overlay device pixel ratio cap | `main.ts` | up to 2 (today's code) | Not stated |
| Frame budget | performance.md | 16.7 ms (60 fps) | No |
| Overlay budget | performance.md | 2.5 ms average, 5 ms p95 | No |
| Longest main-thread task | performance.md | 50 ms | No |
| Frames redrawn while animating | performance.md | at least 90 % | No |
| Engine turn | performance.md | 25 ms (5k/500), 100 ms (20k/2,000) | No |
| Worker answer / applying it | performance.md | 250 ms / 16 ms | No |
| Route planning | performance.md | 8 ms (5k), 32 ms (20k) | No |
| Playback speed | `replaySecondsPer10Days` | about 1 second per 10 days | Yes |
| "What is being worked out" strip | turn strip delay (interface config) | after 1.5 s | Yes |
| Battle flash pause | interface config | 0.5 s | Yes |
| Short wide threshold | interface config | height under 500 CSS px | Yes |
| Side sheet width (Large) | interface config | 380 px at UI scale 1 | Yes |
| Card width on phone | interface config | 45 % | Yes |
| Bottom sheet height (Tall) | interface config | 55 % | Yes |
| Far body text and margin | interface config | about 1/30 of height; 5 % margin | Yes |
| Tap targets | interface config | 44 × 44 pt with 8 pt gaps; 56 with Large | Yes |
| Faith hatch threshold | religion config | 30 % | Yes |
| Sharpness default | settings | Balanced on phones | No |
| Frame rate cap default | settings | 60 on phones | No |
| Map detail default | settings | Medium on phones | No |
| Animations default | settings | Full | No |

## Other display rules

- **Sharpness** sharpens the buttons and text over the map, not the map itself.
- **Battery saver** lowers the frame rate, animations and music, and nothing else: the AI thinks the same on every device.
- **Map detail Low** draws simpler art at every zoom and is still a full close-up view.

## Still open

- Speed and memory targets for a low-end Android phone, an older iPhone, the Steam Deck and the Steam Machine wait on tests on real devices before release.

## For developers

- Spec: [`domain/map-presentation/spec.md`](https://github.com/grrts/pocket-hedgemony/blob/claude/domain-specs-bdd-ebdpmx/domain/map-presentation/spec.md), requirement code **VIEW**.
- Features: `domain/map-presentation/features/` (map-rendering, zoom-content, lenses, parchment, month-playback, layout, map-accessibility, performance).
- Code: the map is drawn in the client, `apps/client/src/map/mapView.ts` (`MAP_PIXEL_RATIO`) and `apps/client/src/main.ts` (today's lenses and fog toggle). Budgets are documented in `docs/performance.md` and checked by `pnpm bench` and `pnpm --filter @ph/client perf`. This context is presentation only and has no engine rules folder.
