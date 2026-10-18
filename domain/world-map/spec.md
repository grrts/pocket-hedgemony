# World map (MAP)

## 1. Purpose and scope

This context owns the geography of the game world as a fixed, build-time fact: the pixel grid, the land
provinces and sea zones, each place's terrain (22 tile types folded onto 11 grounds), ocean depth, rivers,
coasts, straits, passes and fords as geographic lists, regions, and the adjacency graph that every mover
plans on. It also owns how the map is versioned so old saves can be mapped onto a changed map.

**In scope**
- The map grid (5760 × 2144 pixels, 16 per degree) and the province id image.
- Land provinces: id, name, centre, size, ground, coastal flag, river flag, neighbours.
- Sea zones: coastal (`sea`) and open-ocean (`ocean`) zones, their size rule and names.
- Terrain tile types, their categories, their source in the data and the ground each plays as; ocean
  depth bands.
- Rivers (path, great or not) and the province river flag.
- Straits that join seas, and the geographic lists other designs ask for: strait crossings between land
  neighbours, passes, fords.
- Roads only as a per-province geographic attribute other contexts read (no rules about building them).
- Regions: the event tree's macro-regions, sub-regions, areas and anchor provinces; the map generator's
  density and settlement regions; modern admin regions as name sources.
- The province graph (land and sea in one graph).
- Map versioning: `mapHash`, the rename table for split and merged provinces.
- Data sources and licences (Natural Earth, Köppen-Geiger, WWF ecoregions).

**Not in scope (owned by …)**
- What a ground does to troops, buildings and people (province; warfare; troop-movement).
- Who owns what in 1444, population, wealth and castles at start (scenario-setup).
- Days to cross, river days, ferries, passes as routing rules (troop-movement); days per sea zone, winds,
  storms, freezes (naval).
- Building and upgrading roads, bridges, harbours (buildings, province).
- How the map is drawn and what shows at each zoom (map-presentation).
- Charting and fog (exploration; map-presentation).

## 2. Sources

Newest decision first.

1. `troop-movement/troop-movement-design.md` v1 §4 (rivers, fords, passes, seasons, strait crossings), §11.2
   (one graph), §15 (terrain proposals adopted: snow passes, dunes, glacier, wet-season paddies).
2. `terrain/terrain.md` (= repo `docs/terrain.md`, identical): 22 tile types, categories, shares, sources,
   province ground rule, rivers, differences from the province design.
3. Repository `README.md` "The world map"; `tools/mapgen/config.json`; `tools/mapgen/mapgen.ts`;
   `packages/rules/data/world/provinces.json` and `map.json` (the built data).
4. `province-stats/province-stats-design.md` v3 §2.1 (tiles by size, shore tiles), §3 (11 grounds),
   §9 (road, river, days to capital, as geography), §16 (map as a starting source), §17.
5. `naval/naval-design.md` §1.3, §7.1–7.3, §13 ("Map (game build)").
6. `save-system/README.md` §4.3–4.4 (what is not saved; rename table; `mapHash`).
7. `event-tree/data/geography.yaml` (13 macro-regions, sub-regions, 257 areas, 25 anchor provinces, trade hubs).
8. `planning/gap-lists.md` (Terrain proposals; item 25 province names; List 2 item 15 credits).
9. `warfare/warfare-design.md` §5.2 (road factors, winter, river day).

## 3. Ubiquitous language

| Term | Meaning | Not to be confused with |
|---|---|---|
| Map grid | The 5760 × 2144 pixel image of the world, 16 pixels per degree (about 7 km per pixel at the equator), from 78° N to 56° S | The art pixels drawn at close zoom |
| Province | A land place on the map; armies stand in it | A sea zone; a modern admin region |
| Sea zone | A water place: coastal (`sea`, about 150 km across) or open ocean (`ocean`, about 300 km), equal in kilometres at every latitude | A sea region name |
| Place | A province or a sea zone; one node of the graph | — |
| Tile type | One of the 22 terrain looks drawn per map pixel (grassland, paddies, snowpeaks …) | A tile of a province's tile row (fields, pasture …) |
| Category | One of six landscape groups of tile types: temperate, boreal and polar, dry lands, tropical, wetlands, hills and mountains | — |
| Ground | One of the 11 terrains the simulation uses (farmland, grassland, savanna, drylands, desert, hills, mountains, forest, jungle, marsh, tundra); each province has one | Tile type |
| Province ground rule | Mountains when more than half the province is mountain; hills when a quarter or more is hills or mountain; otherwise the most common ground; thickly wooded temperate land (over 60 %) is forest | — |
| Depth band | Ocean depth class: under 200 m, 1 km, 3 km, 5 km, deeper | — |
| River | A Natural Earth centre line traced as map pixels; size 2 for great rivers (scale ranks 0–4), 1 for the rest (to rank 8) | A navigable river (province stats 9) |
| River province | A province with three or more river pixels (`river: true`) | A province with a navigable river |
| Coastal | A province that touches a sea zone | A port (a harbour building, naval) |
| Strait (sea) | A config link that joins two seas the pixel grid closes (Bosporus, Øresund, Gibraltar …) | A strait crossing |
| Strait crossing | A config pair of land neighbours across a narrow strait that armies may cross by ferry (troop-movement 4.4) | A strait (sea) |
| Pass | A mountain province marked in config as having a historic road through it | A road |
| Ford | A config list of named river crossings that count as bridges in summer and autumn | A bridge (a building) |
| Region | A named group of places: event-tree macro-region, sub-region or area; also map-generator density and settlement boxes | A catalogue research region |
| Anchor province | A province the event tree names by id (Constantinople, Potosí, Malacca …) | — |
| Graph | All provinces and sea zones with their neighbours (`adjStart`/`adjList` in code) | A route |
| Rename table | `old id → new ids, with shares`, written by the map generator when it splits or merges provinces | — |
| `mapHash` | A hash identifying the built map, written into saves | `worldHash` |

## 4. Domain model

### Aggregates

**World map** (identity: `mapHash`)
- Holds: grid size and scale, the province id image, the terrain image (terrain per pixel in red, depth band
  in green, river links in blue), all places, the graph, the strait list, the region tables.
- INV-MAP-1: Every map pixel belongs to exactly one place, or to no place (lakes punched out, polar band).
- INV-MAP-2: Every place has a unique id; land provinces come first (`p0` … `p4410`), sea zones after
  (`sea0` …), with terrain `sea` or `ocean`.
- INV-MAP-3: Every land province has exactly one ground, one of the 11.
- INV-MAP-4: Neighbour lists are symmetric: if A lists B, B lists A.
- INV-MAP-5: A province with a sea-zone neighbour is marked coastal. (78 provinces marked coastal have no
  sea-zone neighbour, for example lake shores such as Tartu and Põlva: D-MAP-12.)
- INV-MAP-6: The map is build data: nothing in it changes during a campaign and none of it is saved.

**Place** (entity; identity: `p<n>` for land provinces, `sea<n>` for sea zones, all in `provinces.json`)
- Land province: id, name (modern admin region, plus a compass point when split), centre x and y, size in
  pixels, ground, coastal, river, neighbours.
- Sea zone: id, name (from Natural Earth marine areas), kind `sea` or `ocean`, neighbours.
- INV-MAP-7: A province's tile count follows its size on the map: 4 for the smallest, 16 for the largest.

### Entities and value objects

- **Tile type** (value): name, category, ground, source rule, starting tile uses, proposal (if any).
- **Ground** (value): one of 11; the tables of what it does live in other contexts.
- **Depth band** (value): 1 to 5 (0 on land).
- **River path** (value): pixels, size (1 or 2), links to neighbour pixels (one bit per direction).
- **Strait** (value): name, two points (longitude, latitude).
- **Strait crossing**, **Pass**, **Ford** (value lists, config): named places.
- **Region** (entity): id, name, parent, macro flag; **Area**: id, name, region; **Anchor province**: id,
  name, area.
- **Density region** (value, config): name, bounding box, target province size in pixels.

### Domain services

- **Map generator** (`tools/mapgen`): builds the grid, provinces, sea zones, terrain, rivers, graph and the
  1444 setup (setup belongs to scenario-setup) from Natural Earth and the climate map; writes the rename
  table when provinces change.

## 5. Requirements

### 5.1 Grid and provinces

- MAP-001 (Ubiquitous): The map shall be a grid of 5760 × 2144 pixels at 16 pixels per degree, from latitude 78° N to 56° S. [README; config.json `pxPerDeg`, `latTop`, `latBottom`; map.json]
- MAP-002 (Ubiquitous): Land provinces shall be drawn from modern first-level admin regions, then merged or split until they are roughly even in size. [README]
- MAP-003 (Ubiquitous): The target province size shall be set per part of the world, so Europe, India and China are denser than Siberia or the Sahara. [README; config.json `density`, `defaultTarget` 1100]
- MAP-004 (Ubiquitous): Each province's name shall be the name of the modern admin region that covers most of it, plus a compass point when it was split. [mapgen.ts; README] (D-MAP-6)
- MAP-005 (Ubiquitous): Large lakes shall be punched out of the land, and connected pieces of an admin region (exclaves, islands) shall become their own pieces. [mapgen.ts; config.json `lakeMaxScalerank`, `minIslandSize`]
- MAP-006 (Ubiquitous): The map shall have about 4,400 land provinces and about 4,700 sea zones (9,158 places in the current build). [province-stats §17; README; provinces.json; save-system §3.4]
- MAP-007 (Ubiquitous): Each land province shall carry: id, name, centre, size, ground, coastal, river and its neighbours. [provinces.json; province-stats §16]
- MAP-008 (Ubiquitous): A province's number of tiles shall follow its size on the map image, from 4 for the smallest to 16 for the largest (config). [province-stats §2.1, §16]
- MAP-009 (Ubiquitous): Only provinces on a coast, lake or navigable river shall have shore tiles, 1 to 3 of them, set from coast and rivers. [province-stats §2.1, §16]

### 5.2 Sea zones and straits

- MAP-010 (Ubiquitous): Water shall be split into sea zones: coastal zones about 150 km across and open-ocean zones about 300 km, equal in kilometres at every latitude, so the zones a fleet crosses measure travel time. [README; config.json `seas`]
- MAP-011 (Ubiquitous): Sea zones shall take real sea names from Natural Earth's marine areas. [README]
- MAP-012 (Ubiquitous): Sea zones shall come after the land provinces in `provinces.json`, with terrain `sea` (coastal) or `ocean` (open ocean). [README]
- MAP-013 (Ubiquitous): The map shall join seas that the pixel grid closes through a config list of straits: Bosporus, Dardanelles, Kerch Strait, Øresund, Great Belt, Strait of Gibraltar, Strait of Messina, Strait of Hormuz, Bab-el-Mandeb, Strait of Malacca, Garabogaz strait, Strait of Maracaibo. [README; config.json `straits`]
- MAP-014 (Ubiquitous): The map shall provide a config list of strait crossings: land neighbours across a narrow strait (Bosporus, Øresund, Messina, Kerch, Gibraltar …). [troop-movement §4.4] (D-MAP-3)
- MAP-015 (Unwanted): If a mover is an army, then the map shall give it no way into a sea zone except aboard ships. [README; troop-movement §4.4, §11.2]

### 5.3 Terrain

- MAP-016 (Ubiquitous): The map shall draw 22 tile types, each in one of six categories, each played as one of the 11 grounds of the province design. [terrain.md]
- MAP-017 (Ubiquitous): Each tile type shall map onto its ground as in terrain.md: grassland, mediterranean and steppe → grassland; farmland and paddies → farmland; broadleaf and forest → forest; tundra and glacier → tundra; drylands → drylands; desert, dunes and colddesert → desert; savanna → savanna; jungle → jungle; marsh and swamp → marsh; hills → hills; mountains, snowpeaks, badlands and highlands → mountains. [terrain.md]
- MAP-018 (Ubiquitous): The terrain of each map pixel shall come from the Köppen-Geiger climate class, then Natural Earth mountain ranges (with a hills rim 1–3 pixels wide), then Natural Earth wetlands, then woods and fields that break each zone up. [terrain.md; README]
- MAP-019 (Ubiquitous): The mountain type shall follow the climate: badlands in desert climates, highlands in tropical climates, snowpeaks in alpine and polar climates, in the high core of large ranges and north of 50°, grey-rock mountains elsewhere. [terrain.md]
- MAP-020 (Ubiquitous): Wetlands shall be swamp in the tropics and marsh elsewhere. [terrain.md]
- MAP-021 (Ubiquitous): Woods shall follow the climate's natural forest (WWF ecoregions), blurred across climate borders by a degree or two and wobbled with noise; fields shall be rice paddies in monsoon Asia and farmland elsewhere, in the share of how crowded the region was in 1444. [terrain.md]
- MAP-022 (Ubiquitous): Each province shall take one ground by the province ground rule: mountains when more than half is mountain; hills when a quarter or more is hills or mountain; otherwise the most common ground; temperate land over 60 % wooded is forest. [terrain.md; mapgen.ts `MOUNTAIN_SHARE` 0.5, `HILL_SHARE` 0.25]
- MAP-023 (Ubiquitous): Grassland in the most crowded parts of 1444 shall be farmland ground. [mapgen.ts]
- MAP-024 (Ubiquitous): The config shall be able to force lowland valleys (the Po valley). [README; config.json `lowlands`]
- MAP-025 (Ubiquitous): The simulation shall use one ground per province: the most common terrain under it by the rule above. [README; province-stats §3]
- MAP-026 (Ubiquitous): Ocean depth shall be stored per water pixel in five bands from Natural Earth bathymetry: under 200 m, 1 km, 3 km, 5 km, deeper. [README]
- MAP-027 (Ubiquitous): Each tile type shall suggest starting tile uses for the province design (for example farmland → fields; steppe → pasture; badlands → waste with mines). [terrain.md "Starting tiles"]
- MAP-028 (Ubiquitous): The terrain proposals adopted by troop movement shall hold as map facts: snow peaks close passes in winter; dunes need camels for guns and give no foraging; glacier is impassable; paddies are slower in the wet season. [troop-movement §4.2–4.4, §15] (D-MAP-1, D-MAP-2)

### 5.4 Rivers

- MAP-029 (Ubiquitous): Rivers shall come from Natural Earth's river centre lines (scale ranks 0 to 8), traced as paths of map pixels with, per pixel, the river's size and the neighbours it flows to, so each river draws as one clean line. [terrain.md; mapgen.ts]
- MAP-030 (Ubiquitous): Rivers of scale rank 0 to 4 shall be great rivers. [terrain.md; troop-movement §3.1]
- MAP-031 (Ubiquitous): A province with three or more river pixels shall be marked as a river province. [terrain.md; mapgen.ts]
- MAP-032 (Ubiquitous): The map shall provide a config list of fords: named river crossings (the Ebro at Tortosa, the Danube at Vidin …). [troop-movement §4.1]

### 5.5 Passes and roads as geography

- MAP-033 (Ubiquitous): The map shall provide a config list of passes: mountain provinces with a historic road through them (the Great St Bernard, the Khyber, the Brenner, the Pyrenees at Roncesvalles …). [troop-movement §4.2]
- MAP-034 (Ubiquitous): Each province shall have one road step for the whole province (track, road, paved road, turnpike, railway), read by movement and trade. [province-stats §9; warfare §5.2]
- MAP-035 (Ubiquitous): Each province shall record whether a navigable river runs through it: a great river with 3 or more pixels there, which is also troop movement's great river. [province-stats §9] (D-MAP-4)

### 5.6 The graph

- MAP-036 (Ubiquitous): Land provinces and sea zones shall form one graph of places with their neighbours. [troop-movement §11.2]
- MAP-037 (Ubiquitous): A province shall neighbour the sea zones it touches, and every province with a sea-zone neighbour shall be marked coastal. [provinces.json; troop-movement §11.2]
- MAP-038 (Ubiquitous): Neighbour lists shall be symmetric. [graph definition; provinces.json]

### 5.7 Regions

- MAP-039 (Ubiquitous): The map shall use the event tree's 13 macro-regions (Europe, Middle East, North Africa, Sub-Saharan Africa, South Asia, Central and North Asia, East Asia, Southeast Asia, Oceania, North America, Mesoamerica and Central America, the Caribbean, South America) with their sub-regions and areas. [geography.yaml]
- MAP-040 (Ubiquitous): The map shall resolve each event-tree anchor province (Constantinople, Potosí, Malacca …) to one province of the map. [geography.yaml; province-stats §16] (D-MAP-5)

### 5.8 Versions and data

- MAP-041 (Ubiquitous): Map data (adjacency, terrain, water, rivers, province shapes) shall come from the build and never be stored in a save. [save-system §4.3]
- MAP-042 (Event-driven): When the map generator splits or merges provinces, it shall write a rename table (`old id → new ids, with shares`) shipped with the map. [save-system §4.4]
- MAP-043 (Ubiquitous): Each built map shall have a `mapHash` that saves record. [save-system §4.2, §4.4]
- MAP-044 (Ubiquitous): The map shall credit its sources: Natural Earth (public domain), the Köppen-Geiger climate maps of Beck et al. 2018 (CC BY 4.0, attribution required), and the WWF terrestrial ecoregions of Olson et al. 2001. [README; terrain.md; gap-lists List 2 item 15]
- MAP-046 (Ubiquitous): Each land province shall record its tile type: the most common tile type among its pixels that play as its ground. [D-MAP-1]
- MAP-047 (Ubiquitous): A lake shore shall count as coast for shore tiles without giving a sea-zone neighbour, and a large lake the build made a sea zone shall be a water place fleets enter. [D-MAP-12]
- MAP-048 (Ubiquitous): Terrain proposals troop movement did not adopt shall change nothing in the game. [D-MAP-2]
- MAP-049 (State-driven): While the month is December to March, the northern sea zones that froze historically (the Gulf of Bothnia, the White Sea and the far north: Arctic Ocean, Kara, Laptev, East Siberian, Chukchi and Beaufort Seas, the North Western Passages, Foxe Basin and Hudson Bay) shall be closed to fleets, and a port whose every sea zone is frozen can neither launch nor take in ships. [X-17] @placeholder
- MAP-050 (State-driven): While the month is December to March, a river at latitude 55° or more shall be frozen and crossed like a bridge, with no river penalty. [X-17] @placeholder
- MAP-045 (Ubiquitous): The terrain image shall hold terrain per pixel in its red channel and ocean depth in its green channel (0 on land, else depth band + 1), with river size and links where a river runs. [README; mapgen.ts]

## 6. Commands

The map takes no commands during a campaign. One build-time command:

| Command | Who issues it | Preconditions | Result | Events emitted |
|---|---|---|---|---|
| `BuildMap(config)` | System (developer tool `mapgen.ts`) | Natural Earth and climate data available | Grid, places, terrain, rivers, graph; rename table if provinces changed; new `mapHash` | `MapBuilt` |

## 7. Domain events

| Event | When | Payload | Consumed by (context) |
|---|---|---|---|
| `MapBuilt` | The generator writes a new map | `mapHash`, rename table | saves (migrations), scenario-setup (1444 setup), naval (rerun port placement) |

## 8. Policies (reactions to other contexts)

- When `scenario-setup` maps catalogue records onto the map and needs provinces split (gap item 25), then the
  map is rebuilt with a rename table and naval's port placement is rerun (naval §13).
- When `saves` loads a save whose `mapHash` differs, then it maps provinces through the rename table.

## 9. Each turn

Nothing. The map does not change during a campaign. Contexts read it every turn (graph, ground, river,
coastal, passes, strait crossings).

## 10. Configuration

| Key | Meaning | Value in the design | Placeholder? | Config file |
|---|---|---|---|---|
| `pxPerDeg` | Pixels per degree | 16 | No | `tools/mapgen/config.json` |
| `latTop`, `latBottom` | Latitude band of the grid | 78, −56 | No | `config.json` |
| `lakeMaxScalerank` | Largest lakes punched out | 3 | No | `config.json` |
| `minIslandSize` | Smallest island kept, in pixels | 10 | No | `config.json` |
| `minFactor`, `maxFactor` | Merge and split thresholds against the target size | 0.4, 1.7 | No | `config.json` |
| `defaultTarget`, `density[]` | Target province size in pixels, by region | 1100; Western and Central Europe 380 … Far north 3200 | No | `config.json` |
| `lowlands[]` | Forced lowland valleys | Po valley | No | `config.json` |
| `seas.coastSpacing`, `oceanSpacing`, `coastBand`, `minSeaSize` | Sea zone seeds and sizes in pixels | 22, 44, 20, 150 | No | `config.json` |
| `straits[]` | Sea straits joined across the grid | 12 named | No | `config.json` |
| `MOUNTAIN_SHARE`, `HILL_SHARE` | Province ground thresholds | 0.5, 0.25 | No | `tools/mapgen/mapgen.ts` |
| tile count range | Tiles per province by size | 4 to 16 | Yes (config) | province config |
| great river ranks | Scale ranks counting as great | 0 to 4 | No | mapgen |
| river province threshold | River pixels to mark a province | 3 | No | mapgen |
| strait crossings, passes, fords, anchors | Geographic lists resolved to provinces | as D-MAP-3, D-MAP-5 | No | `world-map.json` `geoLists` |
| `navigableRiverPixels` | Great-river pixels for a navigable river | 3 | Yes | `world-map.json` |
| `provinceFacts` | Size, tile type, great-river pixels per province | from the built images | No | `world-map.json` |

## 11. Seams

| Other context | Direction | Pattern | What crosses |
|---|---|---|---|
| province | downstream | Published Language | Ground, size (tile count), coastal and river (shore tiles), road step |
| troop-movement | downstream | Open Host Service | The graph; ground; tile type per province; river and great-river (= navigable) flags; passes, fords, strait crossings resolved to provinces |
| naval | downstream | Open Host Service | Sea zones and their kind (`sea`/`ocean`); coasts; straits |
| trade | downstream | Open Host Service | Graph, roads, rivers, sea zones for routes |
| warfare | downstream | Published Language | Ground for battles; roads; rivers |
| exploration | downstream | Customer–Supplier | Graph steps for the charted start; coastal provinces |
| scenario-setup | downstream | Customer–Supplier | Places to own; size, terrain and coast for 1444 population and wealth; rebuild with splits |
| events | upstream | Shared Kernel | Region ids, areas; world-map resolves anchor provinces to map provinces |
| map-presentation | downstream | Published Language | Id image, terrain image, depth, rivers |
| saves | downstream | Customer–Supplier | `mapHash`, rename table; map data never saved |
| buildings | downstream | Conformist | Ground (build cost), shore tiles, anchors for fixed mines and markets |

## 12. AI

The map has no AI. AI movers plan on the same graph as the player (troop-movement §11.2; naval §11).

## 13. Decisions and open questions

- **D-MAP-1** (was OQ-MAP-1) Tile type per province: the map stores one tile type per land province, the most common tile type among its pixels that play as its ground, counted from the built images into `world-map.json` `provinceFacts`. One stored fact gives troop movement the tile types it needs without a share table.
- **D-MAP-2** (was OQ-MAP-2) Terrain proposals: only the four troop movement adopted hold (snow passes, dunes, glacier, wet-season paddies); every other proposal (broadleaf, mediterranean, pine forest, steppe, colddesert, swamp, badlands, highlands, snowpeaks cold sickness, glacier unsettleable, paddies horse) is dropped. No new mechanics.
- **D-MAP-3** (was OQ-MAP-3) Strait crossings: world-map keeps a land list of strait crossings apart from the sea straits, each joining two land provinces: Bosporus Istanbul–Sakarya (Istanbul holds both shores), Øresund West Hovedstaden–Skåne, Messina Catania–Reggio Calabria, Kerch Crimea–West Krasnodar, Gibraltar Cádiz–Tanger-Tétouan. The two lists mean different things (fleets against armies), so they stay two lists with shared names.
- **D-MAP-4** (was OQ-MAP-4) Navigable river: a navigable river is a great river (Natural Earth ranks 0–4) with 3 or more pixels in the province (provisional `navigableRiverPixels`); only coasts, lake shores and navigable rivers give shore tiles, not every river province. It reuses the great-river size the map already traces.
- **D-MAP-5** (was OQ-MAP-5) Great river and regions: the great-river flag is the navigable-river flag of D-MAP-4; world-map owns region membership and resolves the event tree's 25 anchors to map provinces in its data, and areas get member provinces when an event needs them. One owner, one flag.
- **D-MAP-6** (was OQ-MAP-6) Province names: provinces keep their modern admin region names, with a compass point when split; no historical names are added. No design gives them.
- **D-MAP-7** (was OQ-MAP-7) Coarse places: the map is not re-cut now; ports that share a province share it, and Melos and Malé stay off the map; any later split goes through the rename table. Simplest, and X-13 needs no new provinces.
- **D-MAP-8** (was OQ-MAP-8) Hills and mountains thresholds: the 25 % / 50 % rule stays. It is the only rule the designs give.
- **D-MAP-9** (was OQ-MAP-9) Mediterranean and steppe: both keep playing as grassland, with no ground of their own. Their proposals are dropped (D-MAP-2).
- **D-MAP-10** (was OQ-MAP-10) River crossing rule: troop movement's rule governs; the map supplies only the river and great-river flags. The latest design wins.
- **D-MAP-11** (was OQ-MAP-11) Province count: the map stays at 4,411 land provinces; catalogue records that own no map province are reference data, not realms. X-13 settles it.
- **D-MAP-12** (was OQ-MAP-12) Coastal without sea: a lake shore counts as coast for shore tiles, but a harbour needs a sea-zone neighbour; the large lakes the build made sea zones (Ladoga, the Great Lakes …) are water places fleets enter, and other lakes are not. It follows the data as built.

## 14. Traceability

| Requirement | Feature file | Scenario |
|---|---|---|
| MAP-001 | grid-and-provinces.feature | The map grid covers the world at 16 pixels per degree |
| MAP-002 | grid-and-provinces.feature | Province size targets differ by part of the world |
| MAP-003 | grid-and-provinces.feature | Province size targets differ by part of the world |
| MAP-004 | grid-and-provinces.feature | A province is named after its modern admin region |
| MAP-005 | grid-and-provinces.feature | Lakes are punched out and islands become their own pieces |
| MAP-006 | grid-and-provinces.feature | The map has about 4,400 land provinces and 4,700 sea zones |
| MAP-007 | grid-and-provinces.feature | A land province carries its geographic facts |
| MAP-008 | grid-and-provinces.feature | A province's tiles follow its size on the map |
| MAP-009 | grid-and-provinces.feature | Only provinces on water have shore tiles |
| MAP-010 | sea-zones-and-straits.feature | Sea zones are sized in kilometres |
| MAP-011 | sea-zones-and-straits.feature | Sea zones follow the land provinces and take marine names |
| MAP-012 | sea-zones-and-straits.feature | Sea zones follow the land provinces and take marine names |
| MAP-013 | sea-zones-and-straits.feature | Named straits join seas the grid closes |
| MAP-014 | sea-zones-and-straits.feature | Land neighbours across a strait are listed for armies |
| MAP-015 | sea-zones-and-straits.feature | Armies can't walk into a sea zone |
| MAP-016 | terrain.feature | Each tile type plays as one ground |
| MAP-017 | terrain.feature | Each tile type plays as one ground |
| MAP-018 | terrain.feature | Mountain ranges take a type from the climate |
| MAP-019 | terrain.feature | Mountain ranges take a type from the climate |
| MAP-020 | terrain.feature | Wetlands are swamp in the tropics and marsh elsewhere |
| MAP-021 | terrain.feature | Fields are paddies in monsoon Asia and farmland elsewhere |
| MAP-022 | terrain.feature | A province takes one ground by the province ground rule |
| MAP-022 | terrain.feature | Thickly wooded temperate land is forest ground |
| MAP-023 | terrain.feature | Crowded grassland is farmland ground |
| MAP-024 | terrain.feature | The Po valley is forced lowland |
| MAP-025 | terrain.feature | The simulation reads one ground per province |
| MAP-026 | terrain.feature | Ocean depth is stored in five bands |
| MAP-027 | terrain.feature | Tile types suggest starting tile uses |
| MAP-028 | terrain.feature | Adopted terrain proposals hold as map facts |
| MAP-029 | rivers-passes-roads.feature | Rivers are traced with their size |
| MAP-030 | rivers-passes-roads.feature | Rivers are traced with their size |
| MAP-031 | rivers-passes-roads.feature | A province with three or more river pixels is a river province |
| MAP-032 | rivers-passes-roads.feature | Named fords are listed |
| MAP-033 | rivers-passes-roads.feature | Named passes are listed |
| MAP-034 | rivers-passes-roads.feature | Each province has one road step |
| MAP-035 | rivers-passes-roads.feature | A province records a navigable river |
| MAP-036 | graph-and-regions.feature | Land and sea are one graph |
| MAP-037 | graph-and-regions.feature | Land and sea are one graph |
| MAP-038 | graph-and-regions.feature | Neighbour lists are symmetric |
| MAP-039 | graph-and-regions.feature | The event tree's macro-regions are used |
| MAP-040 | graph-and-regions.feature | Each anchor province resolves to one map province |
| MAP-041 | map-versions.feature | Map data is never saved |
| MAP-042 | map-versions.feature | Splitting a province writes a rename table |
| MAP-043 | map-versions.feature | A save records the map it was made on |
| MAP-044 | map-versions.feature | The map credits its data sources |
| MAP-045 | terrain.feature | Ocean depth is stored in five bands |
| MAP-045 | terrain.feature | Land pixels carry terrain in red and no depth |
| MAP-014 | sea-zones-and-straits.feature | Where one province holds both shores, the crossing joins it to the far shore |
| MAP-035 | rivers-passes-roads.feature | A navigable river is a great river for movement |
| MAP-040 | graph-and-regions.feature | Every anchor of the event tree is on the map |
| MAP-046 | grid-and-provinces.feature | A province records its tile type |
| MAP-047 | grid-and-provinces.feature | A lake shore counts as water for shore tiles but has no sea zone |
| MAP-047 | sea-zones-and-straits.feature | A large lake the map made a sea zone is a water place for fleets |
| MAP-048 | terrain.feature | Terrain proposals troop movement did not adopt are dropped |
| MAP-049 | sea-zones-and-straits.feature | Northern seas freeze from December to March |
| MAP-049 | sea-zones-and-straits.feature | A port on frozen water launches no ships |
| MAP-050 | rivers-passes-roads.feature | Northern rivers freeze and are crossed like a bridge |
