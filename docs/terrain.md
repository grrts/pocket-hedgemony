# Terrain tile types

The map draws 22 tile types, all taken from real-world data. Each type falls into one of six landscape categories. Each type also maps onto one of the 11 **grounds** the simulation uses, from the province design (`/mnt/project-files/province-stats/province-stats-design.md`, sections 2, 3 and 5).

The grounds set the numbers: troop strength, crossing days, foraging, sickness, and the value of buildings against people. Those tables live in the province design, and that design is not edited here.

What this file adds:
- which tile types belong to each ground;
- where each tile type comes from in the data;
- the land tile uses (fields, pasture, woods, marsh, waste) each type suggests;
- **proposed** extra effects, marked *proposal*, where a tile type should play differently from the rest of its ground. These are ideas to decide on and are not built yet.

## Where the types come from

The generator is `tools/mapgen/terrain.ts`. It decides each map pixel (about 7 km) like this:

1. **Climate zone**, from the Köppen-Geiger map (Beck et al. 2018, *Scientific Data* 5:180214, CC BY 4.0). This picks rainforest, savanna, steppe, desert, Mediterranean, temperate, taiga, tundra or ice.
2. **Mountain ranges**, from Natural Earth's range outlines. Each range is filled edge to edge with a mountain type, with a rim of hills 1–3 pixels wide. Which mountain type depends on the climate:
   - desert climates give badlands (red rock);
   - tropical climates give highlands (green slopes);
   - alpine and polar climates, the high core of large ranges outside the tropics (30° and beyond), and ranges north of 50° give snow peaks; tropical highlands such as Ethiopia stay bare, since the snow line there is near 5 km;
   - everywhere else gets grey-rock mountains.
3. **Wetlands**, from Natural Earth: swamp in the tropics, marsh elsewhere.
4. **Breaking up** each zone with woods and fields:
   - How wooded the land is, and how much of the wood is pine, comes from the climate's natural forest, after the WWF terrestrial ecoregions (Olson et al. 2001, *BioScience* 51:933): taiga in the subarctic climates (about 90 % wooded, nearly all pine); hemiboreal mixed forest of pine, spruce, oak and lime in the cool continental climates (Dfb: the Baltic, Muscovy, southern Scandinavia); broadleaf forest in the warm temperate ones; thinning out into forest-steppe at the edge of the steppe.
   - These values are blurred across climate borders by a degree or two and wobbled with noise, so taiga, mixed forest, broadleaf and forest-steppe fade into each other instead of meeting at a line. Pine and broadleaf mingle stand by stand in the mixed belt.
   - Where 1444 settlement was dense, some of the wood is cleared for fields.
   - Fields are rice paddies in monsoon Asia and ordinary farmland elsewhere.
   - How much land is fields follows how crowded the region was in 1444.
5. **Province ground**: a province is mountains when more than half of it is mountain, hills when a quarter or more of it is hills or mountain, and otherwise takes the most common ground under it. Temperate land that is thickly wooded (over 60 % cover after blurring) is forest ground.

## Share of the land

Shares are of land pixels. Ocean depth is handled separately: five bands from Natural Earth bathymetry.

| Category | Type | Share | Ground |
|---|---|---|---|
| **Temperate** | grassland | 9.5 % | grassland |
| | farmland | 1.3 % | farmland |
| | broadleaf | 7.3 % | forest |
| | mediterranean | 1.3 % | grassland |
| | paddies | 0.8 % | farmland |
| **Boreal and polar** | forest (pine, taiga) | 19.3 % | forest |
| | tundra | 5.9 % | tundra |
| | glacier | 2.1 % | tundra |
| **Dry lands** | steppe | 4.1 % | grassland |
| | drylands | 4.8 % | drylands |
| | desert (stony) | 7.3 % | desert |
| | dunes (sand sea) | 4.1 % | desert |
| | colddesert | 2.5 % | desert |
| **Tropical** | savanna | 7.6 % | savanna |
| | jungle | 5.8 % | jungle |
| **Wetlands** | marsh | 0.2 % | marsh |
| | swamp | 0.2 % | marsh |
| **Hills and mountains** | hills | 1.0 % | hills |
| | mountains (grey rock) | 1.9 % | mountains |
| | snowpeaks | 7.2 % | mountains |
| | badlands (red rock) | 3.4 % | mountains |
| | highlands (green) | 2.1 % | mountains |

These shares come from the run with the blended forest belts. Re-running the generator after a rule change moves them a little.

## The types

**Starting tiles** are the land tile uses in the province design, section 2.1.

### Temperate

| Type | Comes from | Looks like | Starting tiles | Plays as |
|---|---|---|---|---|
| grassland | Temperate climates (Cfa, Cfb, Dfa, Cw, the thinner edges of Dfb) with no woods or fields | Meadow, flowers, bushes | Pasture, some fields | Grassland ground |
| farmland | Fields where 1444 Europe, the Middle East and India were crowded | Strip fields, hedges, a farmstead | Fields | Farmland ground |
| broadleaf | The broadleaf share of woods in temperate climates (oak, beech, lime), and half the hemiboreal mixed forest; about 1 in 3 tiles drawn in autumn colours | Round-crowned trees | Woods | Forest ground. *Proposal:* half the forest crossing penalty of pine; better for clearing to fields, since the soil under it is good |
| mediterranean | Mediterranean climates (Csa, Csb): dry summers | Olive groves, cypresses, pale stony soil | Fields (olives, vines), pasture | Grassland ground. *Proposal:* wine and olive oil wares; a drought roll in summer; horse bonus like drylands, not open grassland |
| paddies | Fields in monsoon Asia (Cwa, Cfa, Aw, Am, Af east of 72°E) | Flooded terraces, earth dikes | Fields with rice paddies | Farmland ground. Rice paddies harvest twice a year (province design, section 5.1). *Proposal:* horse −25 % and +1 day to cross in the wet season |

### Boreal and polar

| Type | Comes from | Looks like | Starting tiles | Plays as |
|---|---|---|---|---|
| forest | Taiga climates (Dfc, Dfd, Dwc, Dsc, Cfc), the pine half of the hemiboreal mixed forest (Dfb), and pine on hills | Dense pines | Woods | Forest ground. *Proposal:* furs and timber wares; winter attrition on top of the forest numbers |
| tundra | Tundra climate (ET): treeless, frozen most of the year | Grey-green ground, snow patches, stones | Waste, pasture (reindeer) | Tundra ground |
| glacier | Ice-cap climate (EF): Greenland, Antarctica, the highest peaks | White ice with crevasses | Waste | Tundra ground. *Proposal:* impassable to armies and unsettleable; then Greenland's interior can't be claimed |

### Dry lands

| Type | Comes from | Looks like | Starting tiles | Plays as |
|---|---|---|---|---|
| steppe | Cold semi-arid climate (BSk): the Eurasian steppe, the Anatolian plateau, the Great Plains | Wind-combed pale grass | Pasture | Grassland ground: the herding bonus and +25 % horse. *Proposal:* +10 % horse on top of grassland (the best cavalry land); fields worth −25 % without irrigation |
| drylands | Hot semi-arid climate (BSh): the Sahel, the Deccan's dry side, inland Australia | Sandy scrub, tufts | Pasture, waste | Drylands ground |
| desert | Hot desert (BWh), stony parts (reg and hamada) | Pale sand, low dunes | Waste | Desert ground |
| dunes | The large sand seas inside hot deserts (Sahara ergs, Rub' al Khali) | Tall crescent dunes | Waste | Desert ground. *Proposal:* 3 days to cross instead of 2; guns can't cross without camels; no foraging at all |
| colddesert | Cold desert (BWk): the Gobi, Taklamakan, Patagonia, the Great Basin | Grey gravel, stones, frost | Waste, some pasture | Desert ground. *Proposal:* sickness is cold, not heat; camels still help |

### Tropical

| Type | Comes from | Looks like | Starting tiles | Plays as |
|---|---|---|---|---|
| savanna | Tropical wet-and-dry climate (Aw, As) | Golden grass, acacias | Pasture, some fields | Savanna ground |
| jungle | Tropical rainforest and monsoon (Af, Am) | Dense broadleaf canopy, palms | Woods | Jungle ground |

### Wetlands

| Type | Comes from | Looks like | Starting tiles | Plays as |
|---|---|---|---|---|
| marsh | Natural Earth wetlands outside the tropics (Pripet, the Fens, the Po delta) | Reeds and pools | Marsh | Marsh ground |
| swamp | Natural Earth wetlands in the tropics (the Sudd, the Pantanal, the Sundarbans) | Mangroves over dark water | Marsh | Marsh ground. *Proposal:* sickness high, not just medium (fever) |

### Hills and mountains

| Type | Comes from | Looks like | Starting tiles | Plays as |
|---|---|---|---|---|
| hills | The rim of each mountain range | Rolling humps | Fields, pasture | Hills ground |
| mountains | Ranges in temperate climates below the snow line | Grey peaks with small snow caps | Waste, pasture | Mountains ground |
| snowpeaks | Ranges in alpine (ET) and polar climates, the high core of big ranges (the Alps, the Pyrenees, the Caucasus), and ranges north of 50° | Peaks under snow nearly to the foot | Waste | Mountains ground. *Proposal:* passes close in winter (no crossing December to March without a road); cold sickness doubled |
| badlands | Ranges in desert and steppe climates (the Atlas, the Zagros, the Hoggar, the dry Andes) | Banded red rock, mesas | Waste (mines) | Mountains ground. *Proposal:* mines +25 % more (copper, silver, salt); heat sickness instead of cold |
| highlands | Ranges in tropical climates (the Ethiopian Highlands, the wet Andes, New Guinea) | Green forested peaks | Woods, fields (terraces) | Mountains ground. *Proposal:* the forest's ambush bonus too; sickness low (above the fever line). This is why the Ethiopian and Andean highlands held dense populations |

## Rivers

Rivers come from Natural Earth's river centre lines (`ne_10m_rivers_lake_centerlines`, scale ranks 0 to 8). The generator traces each one as a path of map pixels and stores, per pixel, the river's size (great rivers are ranks 0 to 4) and which neighbours it flows to, so the map draws each river as one clean line. A province with three or more river pixels is marked `river` in the province data. Marching into such a province costs a day to cross (warfare design 5.2), until bridges exist.

## Differences from the province design

- The design has 11 grounds. The map has 22 tile types and folds them onto those grounds (the tables above). A type's *proposal* line is the only place it would play differently from its ground. None of these proposals is built.
- **Hills come from the share of high ground.** Mountain ranges are drawn edge to edge with a thin rim of hills, so a province picks hills when a quarter or more of it is hills or mountain (and mountains when more than half of it is mountain). That gives 443 hill provinces and 610 mountain provinces, against 12 and 687 when the most common type decided. The two thresholds are `HILL_SHARE` and `MOUNTAIN_SHARE` in `tools/mapgen/mapgen.ts`.
- **Steppe and mediterranean are grassland** to the simulation. The design's herding and horse numbers fit steppe well. They fit Mediterranean land less well, which is drier and grows olives and vines.

## For artists

- Tiles are painted in code in `apps/client/src/art/tiles.ts`, with one `PAINT` function per type. Each type has 4 variants of 16 × 16 pixels.
- The four mountain types are each one 32 × 32 picture spread over the four variants and mirrored at random. Its peaks wrap around the edges, so a range has no flat gaps.
- Each type's average colour becomes its colour on the zoomed-out map. Repainting a tile therefore changes the far map too.
- To add a type:
  1. Add it at the end of `TERRAINS` (`apps/client/src/art/palette.ts`) and of `DETAIL_TERRAINS` (`tools/mapgen/terrain.ts`), in the same order.
  2. Add a `PAINT` function and a `BASE` colour.
  3. Add a rule in `buildTerrain`.
  4. Add a row in `PROVINCE_TERRAIN`.
  5. Add an entry in `TERRAIN_CATEGORIES`.
