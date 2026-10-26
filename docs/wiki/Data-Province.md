# Province data

Every value in the game's province config, exactly as the game reads it. This page is made from `packages/rules/data/domain/province.json` each time the config changes, so it always matches the game. How these values are used is explained on [Provinces](Provinces).

Keys are written as in the config file. Shares are fractions (0.25 is 25 %), and values marked (provisional) are placeholders that may still change in balancing. Inventions are shown by id and name; see [Research data](Data-Research#inventions).

> Province config (domain/province/spec.md §10; province-stats design v3). Every value is a placeholder for balancing. Rates are fractions (0.05 = 5 %). Key names are the spec's proposals (OQ-PROV-20).

| Key | Value |
|---|---|
| `months_per_season` | 3 |
| `river_crossing_penalty` | -0.2 |
| `castle_hard_grounds` | hills, mountains |
| `loyalty` | In revolt, Disloyal, Wavering, Loyal |

## Tiles

| Key | Value |
|---|---|
| `min` | 4 |
| `max` | 16 |

## Shore tiles

| Key | Value |
|---|---|
| `min` | 1 |
| `max` | 3 |

## Clear woods

| Key | Value |
|---|---|
| `years` | 3 |
| `timber_loads` | 1 |

## Fields to woods

| Key | Value |
|---|---|
| `years` | 10 |

## Fields to pasture

| Key | Value |
|---|---|
| `seasons` | 1 |

## Woods

> D-PROV-30: woods lost to fire or to cutting more timber in a year than they regrow become waste (stumps and ash) and grow back to woods after regrow\_years without use.

| Key | Value |
|---|---|
| `regrow_loads_per_tile` | 1 |
| `regrow_years` | 10 |

## Tile changes

> Feedback 86: what the player (or a lord, or the AI) pays to change a tile's use, in the buildings data's gold, and the time for the changes clear\_woods and fields\_to\_pasture don't already set. One change at a time per province.

| Name | gold | seasons | years | needs | grounds |
|---|---|---|---|---|---|
| clear woods | 30 |  |  |  |  |
| to pasture | 5 |  |  |  |  |
| plough | 10 | 1 |  |  |  |
| drain | 60 |  | 3 | [F8 Polder drainage](Data-Research#inventions) |  |
| irrigate | 60 |  | 2 | [F3 Qanat and canal irrigation](Data-Research#inventions) | drylands, desert, savanna |

## Castle ruin

| Key | Value |
|---|---|
| `waste_years` | 5 |

## Town

| Key | Value |
|---|---|
| `second_tile_townsfolk` | 40000 |
| `great_city_tiles` | 3 |
| `sizes` | hamlet, village, market town, town, city, great city |

### Building slots

| Key | Value |
|---|---|
| `hamlet` | 1 |
| `village` | 2 |
| `market town` | 4 |
| `town` | 6 |
| `city` | 9 |
| `great city` | 12 |

## Worn

> D-PROV-31: a fields tile farmed with more farmers than its slots for overwork\_years in a row wears; each rotation invention known stretches that by rotation\_stretch.

| Key | Value |
|---|---|
| `recovery_years` | 5 |
| `output` | 0.5 |
| `overwork_years` | 30 |
| `rotation_stretch` | 1.5 |
| `rotation_inventions` | [F1 Three-field rotation](Data-Research#inventions), [F12 Fodder crops (clover, turnips)](Data-Research#inventions), [F15 Four-field rotation](Data-Research#inventions) |

## Burned

| Key | Value |
|---|---|
| `rebuild_per_year` | 1 |

## Ground

| Name | farmland | grassland | savanna | drylands | desert | hills | mountains | forest | jungle | more |
|---|---|---|---|---|---|---|---|---|---|---|
| start\_mix | fields: 0.8; pasture: 0.1; woods: 0.1 | pasture: 0.55; fields: 0.3; woods: 0.15 | pasture: 0.6; fields: 0.25; waste: 0.15 | pasture: 0.4; waste: 0.35; fields: 0.25 | waste: 0.8; pasture: 0.15; fields: 0.05 | pasture: 0.35; fields: 0.3; woods: 0.15; waste: 0.2 | waste: 0.5; pasture: 0.3; woods: 0.15; fields: 0.05 | woods: 0.6; fields: 0.25; pasture: 0.15 | woods: 0.7; fields: 0.2; marsh: 0.1 | marsh: (marsh: 0.6; fields: 0.25; pasture: 0.15); tundra: (waste: 0.5; woods: 0.35; pasture: 0.15) |
| troops | foot: 0; horse: 0.1; guns: 0; defender: 0; days\_to\_cross: 1; foraging: Rich; sickness: Low | foot: 0; horse: 0.25; guns: 0; defender: -0.1; days\_to\_cross: 1; foraging: Fair; sickness: Low | foot: 0; horse: 0.15; guns: 0; defender: 0; days\_to\_cross: 1; foraging: Fair; sickness: Medium | foot: 0; horse: 0.1; guns: 0; defender: 0; days\_to\_cross: 1.5; foraging: Poor; sickness: Low | foot: -0.1; horse: -0.1; camels: 0; guns: -0.1; defender: 0.1; days\_to\_cross: 2; foraging: Almost none; sickness: Heat | foot: 0.1; horse: -0.15; guns: -0.1; defender: 0.15; days\_to\_cross: 1.5; foraging: Fair; sickness: Low | foot: 0; horse: -0.4; guns: -0.3; defender: 0.3; days\_to\_cross: 3; foraging: Poor; sickness: Cold | foot: 0; horse: -0.25; guns: -0.2; defender: 0.15; days\_to\_cross: 2; foraging: Fair; sickness: Low | foot: -0.1; horse: -0.4; guns: -0.3; defender: 0.25; days\_to\_cross: 3; foraging: Poor; sickness: High | marsh: (foot: -0.1; horse: -0.3; guns: -0.3; defender: 0.2; days\_to\_cross: 3; foraging: Poor; sickness: High); tundra: (foot: 0; horse: -0.1; guns: -0.1; defender: 0.1; days\_to\_cross: 2; foraging: Almost none; sickness: Cold) |
| economy | build\_cost: 1; building\_output: (base: 1.25); people\_output: (base: 1) | build\_cost: 1; building\_output: (base: 1); people\_output: (base: 1; herding: 1.5) | build\_cost: 1; building\_output: (base: 1); people\_output: (base: 1; herding: 1.25) | build\_cost: 1.25; building\_output: (base: 0.75; lifted\_by: irrigated); people\_output: (base: 1) | build\_cost: 1.5; building\_output: (base: 0.5; mine: 1; irrigation works: 1); people\_output: (base: 1; herding: 1; caravans: 1) | build\_cost: 1.25; building\_output: (base: 1; mine: 1.25); people\_output: (base: 1) | build\_cost: 2; building\_output: (base: 1; farm: 0.5; mine: 1.5); people\_output: (base: 0.75) | build\_cost: 1.5; building\_output: (base: 1; lumber camp: 1.5); people\_output: (base: 1; hunting and gathering: 1.25) | build\_cost: 2; building\_output: (base: 0.75); people\_output: (base: 1; gathering: 1.25) | marsh: (build\_cost: 2; building\_output: (base: 0.5; lifted\_by: drained); people\_output: (base: 1; fishing: 1.25)); tundra: (build\_cost: 1.5; building\_output: (base: 0.5); people\_output: (base: 1; herding: 1)) |

## Woods ambush

| Key | Value |
|---|---|
| `per_two_woods` | 0.05 |
| `cap` | 0.15 |

## Locals rough bonus

| Key | Value |
|---|---|
| `bonus` | 0.1 |
| `grounds` | hills, mountains, forest, jungle, marsh |

## Bare tile

| Key | Value |
|---|---|
| `slots` | 3000 |

### By use

| Name | class | activity | food | harvest roll |
|---|---|---|---|---|
| Fields | farmers | farming | yes | yes |
| Pasture | herders | herding | yes | no |
| Woods | woodsmen | hunting and gathering | yes | no |
| Shore | seafolk | fishing | no | no |

## Buildings

| Key | Value |
|---|---|
| `craft` | loom house, forge, kiln, tannery, press, brewery or winery, powder mill |
| `fallow_below` | 0.5 |
| `timber_reach_rings` | 1 |

### Land

| Name | uses | slots | class | unlock | food per worker | harvests | harvest roll | hazards | needs timber | more |
|---|---|---|---|---|---|---|---|---|---|---|
| farm | Fields | 12000 | farmers | none | 1.5 | 1 | yes |  |  |  |
| rice paddy | Fields | 18000 | farmers | [F2 Wet-rice terracing](Data-Research#inventions) | 1.5 | 2 | yes |  |  | needs water: yes |
| terrace | Fields | 12000 | farmers | [F2 Wet-rice terracing](Data-Research#inventions) | 1.5 | 1 | yes |  |  | grounds: hills, mountains |
| raised fields | Marsh | 12000 | farmers | [F6 Chinampa and raised fields](Data-Research#inventions) | 1.5 | 1 | yes |  |  |  |
| plantation | Fields | 12000 | farmers | [F10 Sugar and spice plantations](Data-Research#inventions) |  |  |  |  |  | tropical: yes |
| ranch | Pasture | 3000 | herders | none | 1.33 | 1 | no | drought, hard winter |  |  |
| horse stud | Pasture | 3000 | herders | [F11 Horse breeding studs](Data-Research#inventions) |  |  |  |  |  |  |
| lumber camp | Woods | 1500 | woodsmen | none |  |  |  |  |  |  |
| hunting lodge | Woods | 1500 | woodsmen | none | 1 | 1 | no | hard winter |  |  |
| mine | Waste | 6000 | miners | none |  |  |  |  | yes | rough grounds: hills, mountains; needs seam: yes |
| irrigation works | Waste, Fields | 1500 | farmers | [F3 Qanat and canal irrigation](Data-Research#inventions) |  |  |  |  |  | fields grounds: drylands |
| fishery | Shore | 3000 | seafolk | none | 1.33 | 1 | no | storms, blockades |  |  |
| saltworks | Shore | 1500 | miners | none |  |  |  |  |  | dry or warm coast: yes |
| harbour | Shore | 1500 | seafolk | none |  |  |  |  |  |  |
| shipyard | Shore | 3000 | seafolk | none |  |  |  |  | yes | needs harbour: yes |
| bridge | Shore | 0 | none | none |  |  |  |  |  | river: yes |
| castle | Castle | 0 | none | none |  |  |  |  |  |  |

### Town

| Name | slots | class | needs | min town size |
|---|---|---|---|---|
| loom house | 1500 | craftsmen | raw ware |  |
| forge | 1500 | craftsmen | iron |  |
| kiln | 1500 | craftsmen | clay |  |
| tannery | 1500 | craftsmen | hides |  |
| press | 900 | craftsmen | paper, printing |  |
| brewery or winery | 900 | craftsmen | grain or grapes |  |
| market | 1500 | market folk | market charter for the fair |  |
| caravanserai or warehouse | 900 | market folk | road |  |
| house of worship | 600 | clergy | none |  |
| school | 0 | scholars | none | market town |
| seat | 300 | clerks | own official | town |
| almshouse | 600 | clergy | gold upkeep |  |
| powder mill | 900 | craftsmen | saltpetre |  |
| hospital, wells and drains | 600 | clergy | later inventions |  |
| factory | 6000 | craftsmen | era V inventions, coal or water power |  |
| rail station | 600 | craftsmen | railway invention, road |  |

### Mill

| Key | Value |
|---|---|
| `unlock` | [F5 Water and wind mills](Data-Research#inventions) |
| `gold_bonus` | 0.25 |

### Castle steps

| Key | Value |
|---|---|
| `none` | none |
| `earthwork ring fort` | [B4 Earthwork ring forts](Data-Research#inventions) |
| `stone castle` | [B1 Stone castles](Data-Research#inventions) |
| `bastion fort` | [B5 bastion\_fortification](Data-Research#inventions) |
| `star fort` | [B6 Star forts](Data-Research#inventions) |

### Lord traits

| Key | Value |
|---|---|
| `Builder` | any |
| `Greedy` | market, mine |
| `Pious` | house of worship |
| `Warlike` | castle |

## Almshouse

| Key | Value |
|---|---|
| `shelters` | 3000 |

## Food

| Key | Value |
|---|---|
| `bare_per_worker` | 0.67 |
| `harvest_order` | failed, poor, normal, good, bumper |

### Balance

> D-PROV-36: a normal year's food against what the people eat. Under short the province grows less than it eats and the card and the Food tab ask for a farm; under tight one poor harvest brings famine.

| Key | Value |
|---|---|
| `short` | 1 |
| `tight` | 1.05 |

### Harvest

| Key | Value |
|---|---|
| `bumper` | 1.3 |
| `good` | 1.15 |
| `normal` | 1 |
| `poor` | 0.7 |
| `failed` | 0.3 |

### New crops

| Key | Value |
|---|---|
| `invention` | [F9 Maize, potato and cassava](Data-Research#inventions) |
| `failed_becomes` | poor |

### Hunting

> Feedback 81. Woods hold game for the hunters their tiles' slots can take; more hunters than that thin it. Game moves toward what the hunting leaves each year; a hard winter cuts the year's catch.

| Key | Value |
|---|---|
| `boreal_lat` | 55 |
| `boreal_yield` | 1.3 |
| `beyond_woods` | 0.5 |
| `thinning_per_crowding` | 0.35 |
| `game_floor` | 0.3 |
| `regrow_per_year` | 0.2 |

#### Game yield

| Key | Value |
|---|---|
| `tundra` | 1.3 |
| `forest` | 1.1 |
| `jungle` | 1 |
| `base` | 0.9 |

#### Hard winter

| Key | Value |
|---|---|
| `north_lat` | 55 |
| `north_one_in` | 5 |
| `mid_lat` | 45 |
| `mid_one_in` | 8 |
| `catch` | 0.6 |

## Wares

| Key | Value |
|---|---|
| `list` | grain, rice, wine, olive oil, wool, cloth, flax, linen, silk, cotton, salt, fish, timber, furs, hides, leather, horses, iron, tools, arms, copper, tin, silver, gold, gems, spices, pepper, sugar, tea, coffee, cocoa, tobacco, incense, ivory, pottery, porcelain, dyes, paper, books, saltpetre, powder |
| `later` | coal, rubber, oil |
| `craft_value` | 3 |

### Crafts

| Key | Value |
|---|---|
| `cloth` | wool |
| `linen` | flax |
| `leather` | hides |
| `tools` | iron |
| `arms` | iron |

## Classes

| Key | Value |
|---|---|
| `all` | farmers, herders, woodsmen, miners, seafolk, craftsmen, market folk, clergy, clerks, scholars, homeless |
| `town` | craftsmen, market folk, clergy, clerks, scholars |
| `food` | farmers, herders, woodsmen, seafolk |
| `no_overflow` | scholars |

## Births

| Key | Value |
|---|---|
| `farmers` | 0.036 |
| `herders` | 0.036 |
| `woodsmen` | 0.036 |
| `seafolk` | 0.036 |
| `miners` | 0.035 |
| `craftsmen` | 0.03 |
| `market folk` | 0.03 |
| `clerks` | 0.03 |
| `clergy_celibate` | 0.005 |
| `scholars` | 0.01 |
| `homeless` | 0.04 |

## Deaths

| Key | Value |
|---|---|
| `farmers` | 0.03 |
| `herders` | 0.03 |
| `woodsmen` | 0.03 |
| `seafolk` | 0.03 |
| `miners` | 0.04 |
| `craftsmen` | 0.035 |
| `market folk` | 0.035 |
| `clerks` | 0.035 |
| `clergy` | 0.03 |
| `scholars` | 0.03 |
| `homeless` | 0.05 |

## Death modifiers

| Key | Value |
|---|---|
| `war` | 0.01 |
| `per_burned_tile` | 0.005 |
| `smoke_town` | 0.01 |
| `hospitals_town` | -0.005 |
| `sanitation` | -0.005 |
| `vaccination` | -0.005 |

### Plague

| Key | Value |
|---|---|
| `rumour` | 0.05 |
| `outbreak` | 0.15 |
| `worst` | 0.3 |

## Famine

| Key | Value |
|---|---|
| `flee_share` | 0.25 |
| `year_share` | 0.2 |

## Mines

> Feedback 87, PROV-065 to PROV-067. Rough waste (hills, mountains) may hold a seam: a ware and the years of digging it has left. The map's anchors are the famous mines of 1444; elsewhere a seam is found by a fixed roll per province, so every game has the same geology. A mine digs a year off its seam each January and closes when it runs out.

| Key | Value |
|---|---|
| `seam_chance` | 0.35 |
| `years_min` | 40 |
| `years_max` | 160 |
| `precious` | silver, gold |
| `timber_reach` | 1 |
| `salt_grounds` | drylands, desert, savanna |
| `salt_lat_below` | 42 |

### Ware weights

| Key | Value |
|---|---|
| `iron` | 45 |
| `copper` | 20 |
| `tin` | 8 |
| `silver` | 12 |
| `gold` | 5 |
| `salt` | 10 |

### Anchors

| Name | ware | years | mine |
|---|---|---|---|
| Středočeský | silver | 120 | Kutná Hora |
| Dalarna | copper | 300 | Falun |
| South Kayes | gold | 300 | Bambuk gold field |
| Siguiri | gold | 300 | Bure gold field |
| Ashanti | gold | 300 | Akan forest gold |
| Masvingo | gold | 200 | Zimbabwe plateau gold |
| Manicaland | gold | 200 | Manyika gold |

### Trade

| Key | Value |
|---|---|
| `base` | 1 |
| `precious` | 3 |

## Homeless

| Key | Value |
|---|---|
| `theft_from` | 0.05 |
| `theft_step` | 0.05 |
| `grievance_over` | 0.1 |
| `shanty_over` | 0.2 |
| `shanty_town_death_extra` | 0.01 |
| `shanty_plague_spread` | 2 |

## Refugees

| Key | Value |
|---|---|
| `settle_years` | 2 |

## Recruits

| Key | Value |
|---|---|
| `conscription_below` | 0.25 |
| `conscription_ends_at` | 0.5 |
| `no_recruits_from` | clergy, scholars |

## Tax

| Key | Value |
|---|---|
| `rates` | none, light, normal, heavy, crushing |
| `no_official_share` | 0.5 |
| `lord_share` | 0.5 |
| `riots_factor` | 0.5 |
| `free_travel_days` | 5 |
| `cap_charter_max` | light |

### Heavy weight

| Key | Value |
|---|---|
| `heavy` | 1 |
| `crushing` | 2 |

### Owed

> D-PROV-33: gold a year at the normal rate per 1,000 workers in working land buildings and per 1,000 townsfolk; the rate scales it as the realm's tax steps. Tolls are trade's, never here.

| Key | Value |
|---|---|
| `per_1000_building_workers` | 0.12 |
| `per_1000_townsfolk` | 0.5 |

#### Rate factor

| Key | Value |
|---|---|
| `none` | 0 |
| `light` | 0.5 |
| `normal` | 1 |
| `heavy` | 1.5 |
| `crushing` | 2 |

### Presets

| Name | all | border | heartland | towns | countryside |
|---|---|---|---|---|---|
| Even | normal |  |  |  |  |
| Spare the frontier |  | light | heavy |  |  |
| Squeeze the towns |  |  |  | heavy | light |
| War chest | heavy |  |  |  |  |

## Tolls

| Key | Value |
|---|---|
| `rates` | none, low, high |
| `points` | bridge, ford, pass, river mouth, strait |

## Roads

| Key | Value |
|---|---|
| `steps` | none, track, road, paved road, turnpike, railway |
| `canal_inventions` | [B3 Grand canals](Data-Research#inventions), Canal locks |

### Travel

> D-PROV-34: winter slows roads and rivers; an enemy army on the road or a broken road forces a detour; a sea route closed in war is no route.

| Key | Value |
|---|---|
| `winter` | 1.5 |
| `enemy_army` | 2 |
| `broken_road` | 2 |

## Newly taken

> X-29: for years after a province is taken from another realm by a peace or a demand, it has Newly taken (one grievance) and costs its owner upkeep\_share\_of\_tax of its tax at the normal rate again each month, on the ledger's New land line. Provisional.

| Key | Value |
|---|---|
| `years` | 10 |
| `upkeep_share_of_tax` | 0.5 |
| `provisional` | yes |

## Far from throne

> PROV-173, PROV-174, X-29: days from a royal province to the capital over the realm's own land (the march's crossing days) and the sea (sea\_zone\_days a zone). Past days it has Far from the throne and sends the crown cut\_per\_10\_days less tax and recruits for every 10 days beyond, down to least\_share. A lord's province is run from his seat and is never far. Provisional.

| Key | Value |
|---|---|
| `days` | 30 |
| `cut_per_10_days` | 0.1 |
| `least_share` | 0.5 |
| `sea_zone_days` | 8 |
| `provisional` | yes |

## Officials

| Key | Value |
|---|---|
| `full_effect_years` | 5 |
| `first_year_share` | 0.5 |
| `types` | tax collector, steward, judge, master of works, muster master, customs officer, chaplain, schoolmaster, warden, colonial governor |

### Effects

| Name | tax reach | food | store rot | riots extra grievances | broken charter fade | build cost | build time | burned rebuild | recruit refill | more |
|---|---|---|---|---|---|---|---|---|---|---|
| tax collector | 0.2 |  |  |  |  |  |  |  |  |  |
| steward |  | 0.1 | 0.5 |  |  |  |  |  |  |  |
| judge |  |  |  | 1 | 2 |  |  |  |  |  |
| master of works |  |  |  |  |  | -0.25 | 0.5 | 2 |  |  |
| muster master |  |  |  |  |  |  |  |  | 0.25 |  |
| customs officer |  |  |  |  |  |  |  |  |  | trade ratio gain: 0.15 |
| chaplain |  |  |  |  |  |  |  |  |  | faith shift: 2 |
| schoolmaster |  |  |  |  |  |  |  |  |  | tongue shift: 2; graduate sooner years: 1 |
| warden |  |  |  |  |  |  |  |  |  | garrison: 0.25; walls repair: 2; castle store rot: 0.5 |
| colonial governor |  |  |  |  |  |  |  |  |  |  |

### School trains

| Key | Value |
|---|---|
| `madrasa` | judge, chaplain |
| `university` | judge, steward |
| `academy` | master of works, warden |

### Hire

| Key | Value |
|---|---|
| `gold` | 10 |
| `foreign_multiplier` | 2 |
| `provisional` | yes |

### Auto fill

> PROV-342, PROV-343: gold auto-fill keeps back, and months of food under which a steward fits best.

| Key | Value |
|---|---|
| `reserve_gold` | 10 |
| `hungry_months` | 1 |
| `traders_passing` | 3 |
| `provisional` | yes |

## Homeland

| Key | Value |
|---|---|
| `years` | 100 |

## Pretender

| Key | Value |
|---|---|
| `years` | 50 |

## Charters

| Key | Value |
|---|---|
| `kinds` | market charter, tax cap, town law, no quartering, faith tolerance, free trade, mining right |
| `broken_years` | 20 |
| `mining_right_share` | 0.5 |

## Castle

| Key | Value |
|---|---|
| `steps` | none, earthwork ring fort, stone castle, bastion fort, star fort |
| `neglect_years` | 10 |

## Walls

| Key | Value |
|---|---|
| `max_breaches` | 3 |

## Grievances

| Key | Value |
|---|---|
| `soldiers_quartered_seasons` | 1 |
| `requisitioned_seasons` | 1 |
| `bloodshed_years` | 20 |
| `harsh_lord_traits` | Cruel, Greedy |

### Levels

| Key | Value |
|---|---|
| `grumbling` | 2 |
| `riots` | 3 |
| `rebels` | 4 |

### Hungry

| Key | Value |
|---|---|
| `starts_below_months` | 1 |
| `ends_above_months` | 3 |

## Plague

> PROV-352 to PROV-363 (18 October 2026): the game's plague. Every number below is provisional. Weeks are plague weeks, the days of decided.plague\_week\_days (four a month). A province's crowding is its townsfolk share over crowd\_town\_share, kept between crowd\_min and crowd\_max.

| Key | Value |
|---|---|
| `steps` | none, rumour, outbreak, burning out |
| `care_death_cut` (provisional) | 0.5 |
| `outbreak_seasons` | 1, 2 |
| `links` | road, river, sea route, army, refugees |
| `start_chance_year` (provisional) | 0.003 |
| `crowd_town_share` (provisional) | 0.1 |
| `crowd_min` (provisional) | 0.5 |
| `crowd_max` (provisional) | 3 |
| `rumour_weeks` (provisional) | 4 |
| `weeks_per_season` (provisional) | 12 |
| `burning_out_weeks` (provisional) | 4 |
| `spread_week` (provisional) | 0.04 |
| `river_factor` (provisional) | 1.5 |
| `sea_spread_week` (provisional) | 0.0015 |
| `into_quarantine_factor` (provisional) | 0.25 |
| `army_carry_weeks` (provisional) | 4 |
| `army_spread_week` (provisional) | 0.15 |
| `spared_years` (provisional) | 12 |
| `town_week_share_max` (provisional) | 0.02 |
| `quarantine_tax_factor` (provisional) | 0.5 |

## Fever land

> D-PROV-32: steps from the ground, one more in the tropics and one more for every two marsh tiles, one less for each of quinine and sanitation known. People born elsewhere die at the extra yearly rate of the step; locals at local\_share of it.

| Key | Value |
|---|---|
| `steps` | none, mild, harsh, deadly |
| `tropics_lat` | 23.5 |
| `tropics_steps` | 1 |
| `marsh_tiles_per_step` | 2 |
| `lowered_by` | quinine, sanitation |
| `local_share` | 0.1 |

### By ground

| Key | Value |
|---|---|
| `jungle` | 2 |
| `marsh` | 1 |
| `savanna` | 1 |

### Deaths born elsewhere

| Key | Value |
|---|---|
| `none` | 0 |
| `mild` | 0.05 |
| `harsh` | 0.15 |
| `deadly` | 0.3 |

## Smoke

| Key | Value |
|---|---|
| `from_era` | V |
| `sources` | factory, coal mine |

## Settlement

| Key | Value |
|---|---|
| `steps` | none, trading post, settlement, colony |

## Event map

| Key | Value |
|---|---|
| `population` | People |
| `prosperity` | buildings and their workers |
| `devastation` | burned tiles |
| `unrest` | grievances and rebels |
| `control` | governed by, days to capital and reaches you |
| `fort_level` | castle and walls |
| `infrastructure` | road, harbour and bridge |
| `industry` | factories |
| `trade_good` | wares made |
| `trade_access` | trade ratio gain |
| `local_supply` | food from tiles, local store and castle store |
| `food_security` | food from tiles, local store and castle store |
| `urbanization` | townsfolk share |
| `manpower_yield` | recruits here |
| `disease_burden` | plague and fever land |
| `environmental_degradation` | worn tiles and smoke |
| `culture_share` | language mix |
| `religion_share` | faith mix |
| `colonial_status` | settlement and governed by |
| `terrain` | ground and tile mix |
| `innovation_presence` | schools and scholars here |

## Card

| Key | Value |
|---|---|
| `lines` | owner, governance, official, pretender, ground, tile row, people, classes, food, town, trade, tax, recruits, castle, faith, language, grievances, rebels |

### Gain lose

| Name | gain | lose |
|---|---|---|
| tax | the value of what its buildings make, townsfolk, an official in a royal province, few days to the capital or a seat, roads | burned and fallow tiles, homeless people, riots (half), no official (half), a lord (he keeps half), every day of travel beyond 5, enemy armies on the road, occupation (nothing) |
| people | births, refugees settling, migrants coming for work | deaths, famine, war, leaving for work or safety, soldiers who die on campaign |
| recruits | a share of every class except clergy and scholars each year, more from homeless men | raising soldiers, enrolling students, famine and plague, losing the province |
| castle | building or upgrading, conquering one | destroyed in a siege, demolished in a peace, 10 years without upkeep drops it a step |

## Decided

| Key | Value |
|---|---|
| `tax_months_per_year` | 12 |
| `neglected_output` | 0.5 |
| `tax_travel_loss_per_day` (provisional) | 0.05 |
| `tax_collector_bonus` | 0.2 |
| `town_tiles_at` (provisional) | 0, 40000, 100000 |
| `recruit_share_per_class` (provisional) | 0.01 |
| `homeless_drift_share` (provisional) | 0.02 |
| `refugee_settle_years` (provisional) | 2 |
| `plotting_at` | 4 |
| `spark_at` | 3 |
| `judge_riots_extra` | 1 |
| `lord_ungoverned_share` | 0.5 |
| `sickness_local_share` | 0.5 |
| `plague_week_days` | 7, 14, 21, 28 |
| `homeless_trade_cut_per_5pct` | 0.05 |

### Event effects

| Key | Value |
|---|---|
| `population` | people −10 %, townsfolk first in plague events |
| `prosperity` | two new buildings the owner picks |
| `devastation` | 30 % of its tiles burned |
| `unrest` | one named grievance from the event |
| `control` | its official fleeing, or its road a step down |
| `fort_level` | its castle one step up |
| `infrastructure` | its road one step up |
| `industry` | one factory |
| `trade_access` | trade ratio gain −20 % for the event's duration |
| `food_security` | a harvest two steps worse |
| `disease_burden` | a plague outbreak |
| `trade_good` | a new main ware |
| `urbanization` | 5 % of its people moving to town |
| `manpower_yield` | its recruit share up by a fifth |
| `environmental_degradation` | one tile worn |
| `colonial_status` | its settlement one step up |

### Country sums

| Key | Value |
|---|---|
| `Gold income` | tax reaching you plus trade income over all provinces |
| `People` | people plus refugees |
| `Recruits` | recruits here in royal provinces only |
| `Food` | local stores and castle stores |
| `Hungry` | provinces with the "Hungry" grievance |
| `Horses` | horse studs and ranches |
| `Ships` | ships built at shipyards and based at harbours |
| `Castles` | castle buildings |
| `Faith` | the people-weighted faith mix |
| `Language` | the people-weighted language mix |
| `In revolt` | provinces with riots or rebels |
| `Schools, Students, Scholars` | school buildings, students here and scholars here |
| `Officials` | your officials in royal provinces and seats |

### Birth points

| Key | Value |
|---|---|
| `10 years of peace` | 0.5 |
| `war` | -1 |
| `plague` | -1 |

### Town size floors (provisional)

| Key | Value |
|---|---|
| `hamlet` | 0 |
| `village` | 1000 |
| `market town` | 3000 |
| `town` | 8000 |
| `city` | 20000 |
| `great city` | 40000 |

### Rise chance

| Key | Value |
|---|---|
| `4` | 0.05 |
| `5` | 0.15 |
| `6` | 0.3 |

### Official learn years (provisional)

| Key | Value |
|---|---|
| `own` | 5 |
| `cousin` | 7 |
| `stranger` | 10 |

### Sickness monthly (provisional)

| Key | Value |
|---|---|
| `Low` | 0 |
| `Medium` | 0.01 |
| `High` | 0.02 |
| `Heat` | 0.02 |
| `Cold` | 0.02 |

### Settlement stages

| Key | Value |
|---|---|
| `trading post` | Outpost |
| `settlement` | Settled |
| `colony` | Self-governing |

### Officials per province

| Key | Value |
|---|---|
| `G1` | 1 |
| `G9` | 2 |
| `G16` | 3 |
| `extra_from` | [B2 Roads and post stations](Data-Research#inventions), [G11 Postal service](Data-Research#inventions), [T14 telegraphy](Data-Research#inventions) |
