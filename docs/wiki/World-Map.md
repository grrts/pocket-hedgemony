# World Map

The world map is the ground every other system stands on: about 4,400 land provinces and about 4,700 sea zones covering the whole world, each with its terrain, rivers, coasts and neighbours. It is built once from real-world data and never changes during a campaign, so every army, fleet and trader plans its way across the same fixed geography. This page explains how the map is made, what each place knows about itself, and how the map keeps old saves working when it changes between versions.

## How it works

### The grid

The world is a pixel image **5,760 by 2,144 pixels**, at 16 pixels per degree, which is about 7 km per pixel at the equator. It runs from 78° north to 56° south. Every pixel belongs to exactly one place (a land province or a sea zone), or to no place at all: large lakes are punched out, and the polar band is left empty.

The map is build data. Nothing in it changes during a campaign, and none of it is stored in a save.

### Land provinces

Provinces start from **modern first-level admin regions** (states, counties, oblasts and so on), which are then merged or split until they are roughly even in size. The target size is set per part of the world, so Europe, India and China are cut more finely than Siberia or the Sahara. The default target is 1,100 pixels; Western and Central Europe aims for 380 and the far north for 3,200.

- A province is **named** after the modern admin region that covers most of it, plus a compass point when it was split (for example "West Pskov"). Historical names are not designed yet (OQ-MAP-6).
- Large lakes are punched out of the land, and connected pieces of one admin region (exclaves, islands) become their own pieces. Islands smaller than 10 pixels are dropped.
- The current build has **9,158 places**: about 4,400 land provinces (`p0` to `p4410`) followed by about 4,700 sea zones (`sea0` onward).

Each land province carries:

| Fact | What it means |
|---|---|
| Id | `p` plus a number |
| Name | Modern region name, plus a compass point if split |
| Centre | x and y on the grid |
| Size | Its size in pixels |
| Ground | One of the 11 grounds (see below) |
| Coastal | Whether it touches a sea zone |
| River | Whether three or more river pixels run through it |
| Neighbours | Every land province and sea zone it touches |

A province's size on the map sets how many **tiles** it has on its [Provinces](Provinces) card: 4 for the smallest, 16 for the largest. Only provinces on a coast, lake or navigable river get **shore tiles**, 1 to 3 of them, set from their coast and rivers.

### Sea zones and straits

Water is split into sea zones that are equal in kilometres at every latitude, so the number of zones a fleet crosses really measures how long it takes:

| Kind | Terrain value | Size |
|---|---|---|
| Coastal zone | `sea` | about 150 km across |
| Open-ocean zone | `ocean` | about 300 km across |

Sea zones take real sea names from Natural Earth's marine areas.

Some narrow waters are closed on a 7 km grid even though ships sailed through them. A config list of **straits** joins those seas: the Bosporus, the Dardanelles, the Kerch Strait, the Øresund, the Great Belt, the Strait of Gibraltar, the Strait of Messina, the Strait of Hormuz, the Bab-el-Mandeb, the Strait of Malacca, the Garabogaz strait and the Strait of Maracaibo.

A separate config list of **strait crossings** names land neighbours across a narrow strait that armies may cross by ferry, such as across the Bosporus, the Øresund, Messina, Kerch and Gibraltar. The rules for crossing belong to [Troop Movement](Troop-Movement). Armies have no way into a sea zone at all except aboard ships.

### Terrain: 22 tile types, 11 grounds

The map draws **22 tile types** so the world looks varied, but the simulation plays every province as one of **11 grounds**. The ground is what matters for troops, buildings and people; the tile type is mostly how it looks.

| Category | Tile type | Plays as ground |
|---|---|---|
| Temperate | grassland | grassland |
| | farmland | farmland |
| | broadleaf | forest |
| | mediterranean | grassland |
| | paddies | farmland |
| Boreal and polar | forest (pine, taiga) | forest |
| | tundra | tundra |
| | glacier | tundra |
| Dry lands | steppe | grassland |
| | drylands | drylands |
| | desert (stony) | desert |
| | dunes (sand sea) | desert |
| | colddesert | desert |
| Tropical | savanna | savanna |
| | jungle | jungle |
| Wetlands | marsh | marsh |
| | swamp | marsh |
| Hills and mountains | hills | hills |
| | mountains (grey rock) | mountains |
| | snowpeaks | mountains |
| | badlands (red rock) | mountains |
| | highlands (green) | mountains |

The 11 grounds are farmland, grassland, savanna, drylands, desert, hills, mountains, forest, jungle, marsh and tundra.

**How each pixel gets its type.** The generator decides every pixel in four passes:

1. **Climate**, from the Köppen-Geiger climate map: rainforest, savanna, steppe, desert, Mediterranean, temperate, taiga, tundra or ice.
2. **Mountain ranges**, from Natural Earth, each with a rim of hills 1 to 3 pixels wide. The mountain type follows the climate: badlands in desert climates, highlands in tropical climates, snowpeaks in alpine and polar climates, in the high core of large ranges and north of 50°, and grey-rock mountains everywhere else.
3. **Wetlands**, from Natural Earth: swamp in the tropics (the Sudd, the Pantanal), marsh elsewhere (the Pripet, the Fens).
4. **Woods and fields** break each zone up. How wooded the land is follows the climate's natural forest (after the WWF ecoregions), blurred across climate borders by a degree or two and wobbled with noise, so taiga, mixed forest and broadleaf fade into each other. Where 1444 was crowded, some wood is cleared for fields: rice paddies in monsoon Asia and farmland elsewhere (the Paris basin), in proportion to how crowded the region was.

**How a province gets its ground.** Each province takes one ground by the province ground rule:

| Province is… | Ground |
|---|---|
| More than half mountain | mountains |
| A quarter or more hills or mountain | hills |
| Temperate land more than 60 % wooded | forest |
| Otherwise | the most common ground under it |

So a province that is 55 % mountain is mountains; one that is 20 % mountain and 10 % hills is hills; one that is 10 % of each and mostly grassland is grassland. Grassland in the most crowded parts of 1444 counts as farmland ground, and the config can force lowland valleys such as the Po valley.

Each tile type also **suggests starting tile uses** for the province card: farmland suggests fields, steppe suggests pasture, badlands suggests waste with mines, and so on.

A few terrain effects adopted by [Troop Movement](Troop-Movement) hold as map facts: snow peaks close passes in winter, dunes need camels for guns and give no foraging, glacier is impassable, and paddies are slower in the wet season. The other terrain proposals are still undecided (OQ-MAP-2).

**Ocean depth** is stored for every water pixel in five bands from Natural Earth's sea-floor data: under 200 m, 1 km, 3 km, 5 km, and deeper.

### Rivers

Rivers come from Natural Earth's river centre lines (scale ranks 0 to 8), traced as paths of map pixels. Each pixel knows the river's size and which neighbouring pixels it flows to, so every river draws as one clean line.

- Rivers of scale rank 0 to 4 are **great rivers** (size 2); the rest are size 1.
- A province with three or more river pixels is a **river province**.
- A config list of **fords** names river crossings that count as bridges in summer and autumn, such as the Ebro at Tortosa and the Danube at Vidin.

Whether a province has a *navigable* river is recorded too, but which rivers count as navigable is still open (OQ-MAP-4).

### Passes and roads

A config list of **passes** marks mountain provinces with a historic road through them: the Great St Bernard, the Khyber, the Brenner, the Pyrenees at Roncesvalles and others. Movement rules for passes belong to [Troop Movement](Troop-Movement).

Each province has **one road step** for the whole province: track, road, paved road, turnpike or railway. The map only holds it as a fact; building roads belongs to [Provinces](Provinces) and [Buildings](Buildings), and movement and [Trade](Trade) read it.

### One graph for land and sea

All land provinces and sea zones form **one graph** of places and their neighbours. A province neighbours the sea zones it touches, and any province with a sea-zone neighbour is marked coastal. Neighbour lists are always two-way: if A lists B, B lists A. Every mover, player or AI, plans on the same graph.

### Regions

The map uses the [Historical Events](Historical-Events) geography: **13 macro-regions** (Europe, the Middle East, North Africa, Sub-Saharan Africa, South Asia, Central and North Asia, East Asia, Southeast Asia, Oceania, North America, Mesoamerica and Central America, the Caribbean, South America) with their sub-regions and 257 areas. The event tree also names **anchor provinces** such as Constantinople, Potosí and Malacca, and each resolves to one province on the map. The map generator has its own density and settlement regions, and modern admin regions supply names.

### Map versions

If the map generator splits or merges provinces, it writes a **rename table** (`old id → new ids, with shares`) that ships with the map. Every built map has a `mapHash`, and saves record it. When a save made on an older map is loaded, its provinces are mapped through the rename table. See [Saving](Saving).

### Sources and credits

The map credits its data: Natural Earth (public domain), the Köppen-Geiger climate maps of Beck et al. 2018 (CC BY 4.0, attribution required), and the WWF terrestrial ecoregions of Olson et al. 2001.

## What you see

The world map has no screen of its own; [Map and Lenses](Map-and-Lenses) draws it. What it hands over for drawing:

- The **province id image**, which says which place each pixel belongs to.
- The **terrain image**: terrain per pixel in the red channel, ocean depth in the green channel (0 on land, otherwise depth band plus one), and river size and links where a river runs.
- Province and sea zone names, rivers and depth bands.

## How it connects

- [Provinces](Provinces): reads ground, size (tile count), coastal and river (shore tiles) and the road step.
- [Troop Movement](Troop-Movement): plans on the graph; reads ground, river and great-river flags, passes, fords and strait crossings.
- [Naval](Naval): reads sea zones and their kind, coasts and straits.
- [Trade](Trade): routes over the graph, roads, rivers and sea zones.
- [Warfare](Warfare): reads ground for battles, roads and rivers.
- [Exploration and Colonies](Exploration-and-Colonies): graph steps for the charted start; coastal provinces.
- [The 1444 Start](The-1444-Start): places to own; size, terrain and coast for 1444 population and wealth; asks for rebuilds when provinces must be split.
- [Historical Events](Historical-Events): shares region ids, areas and anchor provinces.
- [Map and Lenses](Map-and-Lenses): draws the id image, terrain, depth and rivers.
- [Saving](Saving): `mapHash` and the rename table; map data is never saved.
- [Buildings](Buildings): ground (build cost), shore tiles, anchors for fixed mines and markets.

When a rebuild splits provinces, [Naval](Naval) reruns its port placement.

## Numbers

These are the map generator's settings. None are game balance placeholders except where noted.

| Value | Config key | Design value | Provisional? |
|---|---|---|---|
| Pixels per degree | `pxPerDeg` | 16 | No |
| Latitude band | `latTop`, `latBottom` | 78, −56 | No |
| Largest lakes punched out | `lakeMaxScalerank` | 3 | No |
| Smallest island kept | `minIslandSize` | 10 pixels | No |
| Merge and split thresholds | `minFactor`, `maxFactor` | 0.4, 1.7 of the target | No |
| Target province size | `defaultTarget`, `density[]` | 1,100 px; Western and Central Europe 380 … far north 3,200 | No |
| Forced lowlands | `lowlands[]` | Po valley | No |
| Sea zone seeds and sizes | `seas.coastSpacing`, `oceanSpacing`, `coastBand`, `minSeaSize` | 22, 44, 20, 150 pixels | No |
| Sea straits | `straits[]` | 12 named | No |
| Province ground thresholds | `MOUNTAIN_SHARE`, `HILL_SHARE` (in `mapgen.ts`) | 0.5, 0.25 | No |
| Tiles per province | tile count range (province config) | 4 to 16 | Yes |
| Great rivers | great river ranks | scale ranks 0 to 4 | No |
| River province | river province threshold | 3 river pixels | No |
| Strait crossings, passes, fords | troop-movement `march` config | named examples only | Yes (lists still to fill) |

## Still open

- **OQ-MAP-1**: A province stores only its ground, but snow peaks, dunes, glacier and paddies effects need the tile type. Should the map store a dominant tile type per province?
- **OQ-MAP-2**: Most terrain proposals (broadleaf, mediterranean, pine forest, steppe, colddesert, swamp, badlands, highlands, snowpeaks sickness, glacier unsettleable, paddies horse) still need a yes or no.
- **OQ-MAP-3**: Strait crossings for armies are not in the data yet, and the sea strait list and the land crossing list overlap in names but mean different things.
- **OQ-MAP-4**: Which rivers are navigable, and does every river province get a shore tile?
- **OQ-MAP-5**: Provinces have no great-river flag and no region, area or anchor membership yet; who assigns them?
- **OQ-MAP-6**: Province names are modern; historical names are not designed.
- **OQ-MAP-7**: The map is too coarse in places (several ports in one province, Melos and Malé missing); splits wait on the catalogue-to-map work.
- **OQ-MAP-8**: The 25 % and 50 % hill and mountain thresholds give 443 hill and 610 mountain provinces and were not reviewed by the province design.
- **OQ-MAP-9**: Should mediterranean land get its own ground instead of playing as grassland?
- **OQ-MAP-10**: The river crossing rule comes from troop movement (latest wins); the map only supplies the flags.
- **OQ-MAP-11**: Will the map be re-cut to hold all 963 catalogue records, and will the province count stay near 4,400?
- **OQ-MAP-12**: 78 provinces are marked coastal with no sea-zone neighbour (lake shores such as Tartu and Põlva). Do lake coasts give shore tiles and ports, and can fleets enter large lakes?

## For developers

- Spec: [`domain/world-map/spec.md`](https://github.com/grrts/pocket-hedgemony/blob/claude/domain-specs-bdd-ebdpmx/domain/world-map/spec.md), requirement code **MAP** (MAP-001 to MAP-045).
- Features: `domain/world-map/features/` (grid-and-provinces, sea-zones-and-straits, terrain, rivers-passes-roads, graph-and-regions, map-versions).
- Map generator: `tools/mapgen/mapgen.ts`, `tools/mapgen/terrain.ts`, settings in `tools/mapgen/config.json`. Built data: `packages/rules/data/world/provinces.json` and `map.json`. Terrain notes: `docs/terrain.md`.
- The engine reads the graph in `packages/engine/src/world.ts` (`adjStart`, `adjList`). Rules code for this context goes in `packages/engine/src/domain/world-map/`.
