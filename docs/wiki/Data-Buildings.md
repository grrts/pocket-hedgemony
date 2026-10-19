# Buildings data

Every value in the game's buildings config, exactly as the game reads it. This page is made from `packages/rules/data/domain/buildings.json` each time the config changes, so it always matches the game. How these values are used is explained on [Buildings](Buildings).

Keys are written as in the config file. Shares are fractions (0.25 is 25 %), and values marked (provisional) are placeholders that may still change in balancing. Inventions are shown by id and name; see [Research data](Data-Research#inventions).

| Key | Value |
|---|---|
| `town_sizes` | hamlet, village, market\_town, town, city, great\_city |
| `loyalty_steps` | wavering, loyal |
| `company_output_share` | 0.5 |
| `clergy_order` | house of worship, monastery, almshouse, hospital, school |
| `town_order` | market, town walls, bridge, craft |
| `company_order` | warehouse, market, mine, plantation |
| `materials_no_route_multiplier` (provisional) | 1.25 |
| `starting_ports_file` | scenarios/1444/ports.json |
| `lord_province_counts_as_yours` | yes |
| `caravanserai_land_trader_weight` | 0.25 |

## Materials

| Name | made by | price | far price multiplier | far after rings | counts as | grounds | upkeep multiplier | from era |
|---|---|---|---|---|---|---|---|---|
| timber | lumber camp | 0.5 |  |  |  |  |  |  |
| stone | quarry | 0.5 | 2 | 3 |  |  |  |  |
| bricks | kiln | 0.8 |  |  | stone |  |  |  |
| earth | anywhere | 0 |  |  | stone | drylands, desert, savanna | 2 |  |
| iron | mine | 2 |  |  |  |  |  | 4 |
| steel | factory | 3 |  |  |  |  |  | 6 |
| concrete | factory | 3 |  |  |  |  |  | 6 |

## Ground multiplier

| Key | Value |
|---|---|
| `farmland` | 1 |
| `hills` | 1.25 |
| `mountains` | 2 |
| `jungle` | 2 |

## Town slots

| Key | Value |
|---|---|
| `hamlet` | 1 |
| `village` | 2 |
| `market_town` | 4 |
| `town` | 6 |
| `city` | 9 |
| `great_city` | 12 |
| `capital_extra` | 1 |

## Sites

| Key | Value |
|---|---|
| `half_crew_months_multiplier` | 2 |
| `cancel_refund` | 0.5 |
| `queue_max` | 10 |

### Per province

| Key | Value |
|---|---|
| `land` | 1 |
| `town` | 1 |

### Master of works

| Key | Value |
|---|---|
| `extra_sites` | 1 |
| `months_multiplier` | 0.5 |
| `gold_multiplier` | 0.75 |

### Stop months by climate

| Key | Value |
|---|---|
| `cold` | 1 |
| `monsoon` | 7 |

## Condition

| Key | Value |
|---|---|
| `neglected_output` | 0.5 |
| `damaged_output` | 0.5 |
| `years_neglected_to_lose_step` | 10 |
| `repair_cost_share` | 0.5 |
| `rebuild_cost_share` | 0.5 |
| `demolish_material_refund` | 0.25 |
| `neglect_recovery_months` | 3 |

## Damage

| Key | Value |
|---|---|
| `plunder_share` | 0.333333 |
| `plunder_share_with_walls` | 0.166667 |
| `earthquake_share` | 0.333333 |
| `fire_buildings` | 1, 3 |
| `plunder_share_with_walls_from_step` | 1 |
| `quake_chance_per_year` (provisional) | 0.002 |
| `big_raid_men` (provisional) | 2000 |

### Town fire (provisional)

| Key | Value |
|---|---|
| `chance_per_year` | 0.01 |
| `per_size_above_town` | 0.005 |

## Village works

| Key | Value |
|---|---|
| `chance_per_year` (provisional) | 0.2 |
| `owner` | commons |

### Needs

| Key | Value |
|---|---|
| `years_at_peace` | 5 |
| `food_store_months_over` | 3 |
| `homeless_or_full_slots` | yes |

### Builds

| Key | Value |
|---|---|
| `fields` | farm |
| `pasture` | ranch |
| `shore` | fishery |
| `woods` | lumber camp |

## Crafts appearing

| Key | Value |
|---|---|
| `builds` | loom house, tannery, kiln, brewery |
| `owners` | town, commons |
| `trade_ratio_at_least` | 0.3 |
| `chance_per_year` (provisional) | 0.1 |

### Raw

| Key | Value |
|---|---|
| `loom house` | wool |
| `tannery` | hides |
| `kiln` | clay |
| `brewery` | grain |

## Upkeep groups

| Key | Value |
|---|---|
| `land` | 0, 0.5 |
| `extraction` | 0.5, 2 |
| `crafts` | 0.5, 2 |
| `learning` | 2, 6 |
| `castle` | 3, 20 |
| `palace` | 5, 30 |
| `worship` | clergy |

## Arsenal

| Key | Value |
|---|---|
| `spoil_share_without` | 0.1 |

## Ai

| Key | Value |
|---|---|
| `reserve_years_of_upkeep` | 1 |
| `homeless_share_trigger` | 0.05 |
| `food_months_trigger` | 3 |
| `busy_sites` (provisional) | 3 |

## Advice

| Key | Value |
|---|---|
| `max_lines` | 5 |

## Owners may build

| Key | Value |
|---|---|
| `clergy` | house of worship, monastery, almshouse, hospital, school |
| `town` | market, town walls, guild hall, bridge |
| `company` | mine, warehouse, market, plantation, trading post |
| `commons` | farm, ranch, fishery, lumber camp |

## Lord traits

| Key | Value |
|---|---|
| `Builder` | any |
| `Greedy` | market, mine |
| `Pious` | house of worship, monastery |
| `Warlike` | castle, drill yard |

## Ai personality

| Key | Value |
|---|---|
| `mercantile` | market, harbour |
| `isolationist` | school |
| `hegemon_seeker` | castle, drill yard |

## Map wealth

| Name | built tile share | buildings | town step |
|---|---|---|---|
| 1 | 0.333333 | farm, ranch |  |
| 10 | 1 |  | 2 |

## Templates

### European market town

| type | name | faith |
|---|---|---|
| market | market |  |
| house of worship | church | catholic |
| loom house | loom house |  |

### Sahel trade town

| type | name | faith |
|---|---|---|
| market | market |  |
| house of worship | mosque | sunni |
| caravanserai | caravanserai |  |

## Variants

| Name | Catholic Europe | Sunni Maghreb | Ottoman lands | Mexico | Andes | Sahel | steppe |
|---|---|---|---|---|---|---|---|
| house of worship | church | mosque |  |  |  |  |  |
| market |  |  | bazaar | tianguis |  |  |  |
| caravanserai |  |  |  |  | tambo |  |  |
| castle |  |  |  |  |  | tata |  |
| palace |  |  |  |  |  |  | ordu |
| granary |  |  |  |  | qollqa |  |  |

## Landmarks

| id | province | present 1444 | building | step | converts by event | effect | material | founded by event | more |
|---|---|---|---|---|---|---|---|---|---|
| Hagia Sophia | Constantinople | yes | house of worship | 3 | 1453 | its faith's houses of worship in reach of the capital turn the faith mix twice as fast |  |  |  |
| Forbidden City | Beijing | yes | palace | 3 |  | +24 officials; lords at court never waver |  |  |  |
| Alhambra | Granada | yes | palace | 3 |  | Granada's castle counts one step higher |  |  |  |
| Great Mosque of Djenné | Djenné | yes | house of worship | 3 |  | no grievance from earth upkeep; traders passing +20 % in the replastering season | earth |  |  |
| Sankore Mosque | Timbuktu | yes | school | 3 |  | scholars from any Muslim realm may settle here |  |  |  |
| Masjid al-Haram | Mecca | yes | pilgrimage shrine | 1 |  | the largest pilgrims passing in the world |  |  |  |
| St Peter's Basilica | Rome | no | house of worship | 3 |  |  |  | 1506 | asks gifts while built: yes |
| Topkapı Palace | Constantinople | no | palace | 3 |  | +20 officials; the capital's seat runs two provinces |  | 1459 |  |
| Ulugh Beg Observatory | Samarkand | yes | observatory | 1 |  | Boats and Counting inventions 20 % cheaper for its owner |  |  |  |
| Kremlin | Moscow | yes | castle | 3 |  | the palace and the castle share one tile |  |  |  |
| Templo Mayor | Tenochtitlan | yes | house of worship | 3 |  | Triple Alliance lords gain loyalty when the realm wins a war |  |  |  |
| Coricancha | Cusco | yes | house of worship | 3 |  | every province linked to Cusco by road counts one day closer |  |  |  |
| Angkor | Angkor | yes | house of worship | 3 |  |  |  |  | condition: neglected; restoring is decision: yes |
| Venetian Arsenal | Venice | yes | shipyard | 3 |  | 3 slipways |  |  | slipways: 3 |
| Taj Mahal | Agra | no | landmark tomb | 1 |  | traders passing in Agra +30 % |  | 1632 |  |

## Anchors

| id | province | building | from year | by event | town |
|---|---|---|---|---|---|
| Kutná Hora mine | Kutná Hora | mine | 1444 |  |  |
| Falun mine | Falun | mine | 1444 |  |  |
| Bruges market | Bruges | market | 1444 |  |  |
| Champagne fairs | Troyes | market | 1444 |  |  |
| Malacca market | Malacca | market | 1444 |  |  |
| Potosí mine | Potosí | mine | 1545 | yes |  |
| Timbuktu market | Southeast Timbuktu | market | 1444 |  | Sahel trade town |
| Djenné market | Mopti | market | 1444 |  | Sahel trade town |
| Gao market | Gao | market | 1444 |  | Sahel trade town |
| Kano market | Kano | market | 1444 |  | Sahel trade town |
| Agadez market | Southwest Agadez | market | 1444 |  | Sahel trade town |
| Kilwa market | Lindi | market | 1444 |  | Swahili coast town |
| Mombasa market | Coast | market | 1444 |  | Swahili coast town |
| Mogadishu market | Shabeellaha Hoose | market | 1444 |  | Swahili coast town |

## Inventions

| Key | Value |
|---|---|
| `F5` | Water and wind mills |
| `W3` | Bombards |
| `C16` | railways |
| `G14` | Written constitution |
| `T3` | Bills of exchange |
| `L1` | [L1 Temple and monastery schools](Data-Research#inventions) |
| `F8` | [F8 Polder drainage](Data-Research#inventions) |

## Buildings

- id: farm; place: fields; class: farmers; limit: per\_place; group: land; steps: ((name: farm; cost: (gold: 30; months: 6; timber: 10; crew: 500); unlocked\_by: start; jobs: 12000; upkeep: 0; makes: (grain: 1.5)), (name: mill farm; cost: (gold: 40; months: 8; timber: 20; crew: 500); unlocked\_by: [F5 Water and wind mills](Data-Research#inventions); jobs: 12000; upkeep: 0.5; needs: (any\_of: river, windy\_ground)), (name: enclosed farm; cost: (gold: 60; months: 12; timber: 20; crew: 500); unlocked\_by: [F15 Four-field rotation](Data-Research#inventions); jobs: 9000; upkeep: 0.5)); crops: grain, flax, hemp, cotton, dye\_plants, tobacco; food\_crop: grain
- id: rice paddy; place: fields; class: farmers; limit: per\_place; group: land; steps: ((name: rice paddy; cost: (gold: 40; months: 12; timber: 10); unlocked\_by: [F2 Wet-rice terracing](Data-Research#inventions); jobs: 18000; needs: (any\_of: shore, irrigation)))
- id: terrace; place: fields; class: farmers; limit: per\_place; group: land; steps: ((name: terrace; cost: (gold: 50; months: 24; stone: 20); unlocked\_by: [F2 Wet-rice terracing](Data-Research#inventions); jobs: 12000))
- id: raised fields; place: marsh; class: farmers; limit: per\_place; group: land; steps: ((name: raised fields; cost: (gold: 40; months: 18; timber: 10); unlocked\_by: [F6 Chinampa and raised fields](Data-Research#inventions); jobs: 12000))
- id: plantation; place: fields; class: farmers; limit: per\_place; group: land; steps: ((name: plantation; cost: (gold: 80; months: 24; timber: 20); unlocked\_by: [F10 Sugar and spice plantations](Data-Research#inventions); jobs: 12000)); forced\_labour\_bonus: no
- id: grove; place: fields; class: farmers; limit: per\_place; group: land; steps: ((name: grove; cost: (gold: 40; months: 12; timber: 10; crew: 500); unlocked\_by: start; jobs: 6000; upkeep: 0.5)); years\_to\_bear: 3; aliases: vineyard
- id: ranch; place: pasture; class: herders; limit: per\_place; group: land; steps: ((name: ranch; cost: (gold: 20; months: 4; timber: 10); unlocked\_by: start; jobs: 3000))
- id: horse stud; place: pasture; class: herders; limit: per\_place; group: land; steps: ((name: horse stud; cost: (gold: 60; months: 12; timber: 20); unlocked\_by: [F11 Horse breeding studs](Data-Research#inventions); jobs: 3000))
- id: irrigation works; place: waste; class: farmers; limit: per\_place; group: land; steps: ((name: irrigation works; cost: (gold: 60; months: 24; stone: 20); unlocked\_by: [F3 Qanat and canal irrigation](Data-Research#inventions); jobs: 1500))
- id: monastery; place: fields; class: clergy; limit: per\_place; group: none; steps: ((name: monastery; cost: (gold: 90; months: 36; stone: 40); unlocked\_by: start; jobs: 6300; student\_seats\_with\_L1: 20)); outside\_town: yes; makes\_clergy: yes; grain\_at\_farm\_rate: yes; jobs\_text: 300 clergy + 6,000 farmers
- id: lumber camp; place: woods; class: woodsmen; limit: per\_place; group: land; steps: ((name: lumber camp; cost: (gold: 10; months: 4); unlocked\_by: start; jobs: 1500))
- id: hunting lodge; place: woods; class: woodsmen; limit: per\_place; group: land; steps: ((name: hunting lodge; cost: (gold: 8; months: 3); unlocked\_by: start; jobs: 1500))
- id: mine; place: waste, hills, mountains; class: miners; limit: per\_place; group: extraction; steps: ((name: mine; cost: (gold: 60; months: 12; timber: 20); unlocked\_by: start; jobs: 6000), (name: shaft mine; cost: (gold: none; months: none); unlocked\_by: [C6 Mining pumps and shafts](Data-Research#inventions); jobs: 6000), (name: steam-pumped mine; cost: (gold: none; months: none); unlocked\_by: [C13 steam\_power](Data-Research#inventions); jobs: 6000))
- id: quarry; place: waste, hills, mountains; class: miners; limit: per\_place; group: extraction; steps: ((name: quarry; cost: (gold: 20; months: 6; timber: 10; crew: 500); unlocked\_by: start; jobs: 3000; upkeep: 0.5; makes: (stone: 40)))
- id: saltworks; place: shore; class: miners; limit: per\_place; group: extraction; steps: ((name: saltworks; cost: (gold: 20; months: 6; timber: 10); unlocked\_by: start; jobs: 1500))
- id: saltpetre works; place: town; class: craftsmen; limit: per\_place; group: crafts; steps: ((name: saltpetre works; cost: (gold: 30; months: 6; timber: 10); unlocked\_by: [W3 Bombards](Data-Research#inventions); jobs: 900; needs: (building\_in\_province\_any: ranch, horse stud)))
- id: loom house; place: town; class: craftsmen; limit: per\_place; group: crafts; steps: ((name: loom house; cost: (gold: 35; months: 6; timber: 10; crew: 1000); unlocked\_by: start; jobs: 1500; upkeep: 1; makes: (cloth: 30); eats: (wool: 30)), (name: draper's hall; cost: (gold: 80; months: 8; bricks: 20; crew: 1000); unlocked\_by: start; jobs: 2400; upkeep: 1.5; eats: (dyes: 5)), (name: weaving manufactory; cost: (gold: 160; months: 18; stone: 40; crew: 2000); unlocked\_by: [C11 Manufactories](Data-Research#inventions); jobs: 3900; upkeep: 3; needs: (official\_in\_province: yes))); craft: yes; converts\_to: forge, kiln, tannery, brewery
- id: forge; place: town; class: craftsmen; limit: per\_place; group: crafts; steps: ((name: forge; cost: (gold: none; months: none); unlocked\_by: start; jobs: 1500)); craft: yes
- id: kiln; place: town; class: craftsmen; limit: per\_place; group: crafts; steps: ((name: kiln; cost: (gold: none; months: none); unlocked\_by: start; jobs: 1500)); craft: yes
- id: tannery; place: town; class: craftsmen; limit: per\_place; group: crafts; steps: ((name: tannery; cost: (gold: none; months: none); unlocked\_by: start; jobs: 1500)); craft: yes
- id: brewery; place: town; class: craftsmen; limit: per\_place; group: crafts; steps: ((name: brewery; cost: (gold: none; months: none); unlocked\_by: start; jobs: 900)); craft: yes
- id: press; place: town; class: craftsmen; limit: per\_place; group: crafts; steps: ((name: press; cost: (gold: none; months: none); unlocked\_by: [L4 Metal movable type](Data-Research#inventions); jobs: 900), (name: printing house; cost: (gold: none; months: none); unlocked\_by: start; effect: schools\_in\_reach\_cost\_less)); craft: yes
- id: paper mill; place: town; class: craftsmen; limit: per\_place; group: crafts; steps: ((name: paper mill; cost: (gold: none; months: none); unlocked\_by: [C1 Paper making](Data-Research#inventions); jobs: 900)); craft: yes
- id: powder mill; place: town; class: craftsmen; limit: per\_place; group: crafts; steps: ((name: powder mill; cost: (gold: none; months: none); unlocked\_by: [W3 Bombards](Data-Research#inventions); jobs: 900), (name: gunpowder mills; cost: (gold: none; months: none); unlocked\_by: [C10 Gunpowder mills](Data-Research#inventions); jobs: 900)); craft: yes
- id: gun foundry; place: town; class: craftsmen; limit: per\_place; group: crafts; steps: ((name: gun foundry; cost: (gold: none; months: none); unlocked\_by: [W3 Bombards](Data-Research#inventions); jobs: 900), (name: cannon works; cost: (gold: none; months: none); unlocked\_by: [C2 Blast furnace](Data-Research#inventions); jobs: 900)); craft: yes
- id: factory; place: town; class: craftsmen; limit: per\_place; group: crafts; steps: ((name: factory; cost: (gold: none; months: none); unlocked\_by: [C14 mechanized\_textiles](Data-Research#inventions); jobs: 6000), (name: powered factory; cost: (gold: none; months: none); unlocked\_by: [C19 electrification](Data-Research#inventions); jobs: 6000; needs: (building\_in\_province: power station)), (name: assembly plant; cost: (gold: none; months: none); unlocked\_by: [C21 Assembly line](Data-Research#inventions); jobs: 6000)); makes\_smoke: yes; products: textile mill, iron and steel works, engine works, cannery, chemical works, cement works
- id: power station; place: town; class: craftsmen; limit: per\_province; group: none; steps: ((name: power station; cost: (gold: none; months: none); unlocked\_by: [C19 electrification](Data-Research#inventions); jobs: 900))
- id: market; place: town; class: market\_folk; limit: per\_province; group: crafts; steps: ((name: weekly market; cost: (gold: 40; months: 6; timber: 10; crew: 1000); unlocked\_by: start; jobs: 1500; upkeep: 1; needs: (min\_town: village); flags: trade\_endpoint), (name: yearly fair; cost: (gold: 100; months: 12; stone: 30; crew: 2000); unlocked\_by: [T6 Merchant fairs and exchanges](Data-Research#inventions); jobs: 2400; upkeep: 2; needs: (charter: market charter; min\_town: market\_town); flags: trade\_endpoint, hires\_traders; stands\_in\_1444: yes), (name: trading house; cost: (gold: 200; months: 18; stone: 40; crew: 2000); unlocked\_by: [T3 Bills of exchange](Data-Research#inventions); jobs: 3000; upkeep: 3; needs: (min\_town: town); flags: trade\_endpoint, hires\_traders, traders\_start\_stocked, bills\_of\_exchange)); loot\_first: yes
- id: caravanserai; place: town; class: market\_folk; limit: per\_place; group: crafts; steps: ((name: caravanserai; cost: (gold: 40; months: 12; stone: 20); unlocked\_by: start; jobs: 900; needs: (ring\_work: road); flags: rest\_stop))
- id: warehouse; place: town; class: market\_folk; limit: per\_place; group: crafts; steps: ((name: warehouse; cost: (gold: 30; months: 6; timber: 20); unlocked\_by: start; jobs: 900; needs: (building\_in\_province: market); flags: storage))
- id: counting house; place: town; class: market\_folk; limit: per\_place; group: crafts; steps: ((name: counting house; cost: (gold: 60; months: 6; stone: 10); unlocked\_by: [T2 Double-entry bookkeeping](Data-Research#inventions); jobs: 600; flags: counting\_house))
- id: trading post; place: shore; class: market\_folk; limit: per\_place; group: crafts; steps: ((name: trading post; cost: (gold: 60; months: 6; timber: 20); unlocked\_by: start; jobs: 300; flags: trade\_endpoint))
- id: bank; place: town; class: market\_folk; limit: per\_province; group: crafts; steps: ((name: bank; cost: (gold: 150; months: 12; stone: 30); unlocked\_by: [T7 Deposit banks](Data-Research#inventions); jobs: 900; needs: (min\_town: city); flags: bank))
- id: house of worship; place: town; class: clergy; limit: per\_faith\_per\_town; group: worship; steps: ((name: step1; cost: (gold: 40; months: 12; stone: 20; crew: 1000); unlocked\_by: start; jobs: 600; upkeep: 1), (name: step2; cost: (gold: 120; months: 36; stone: 80; crew: 2000); unlocked\_by: start; jobs: 1200; upkeep: 2), (name: step3; cost: (gold: 300; months: 120; stone: 200; crew: 2000); unlocked\_by: start; jobs: 2000; upkeep: 4; needs: (min\_town: city))); owner\_default: clergy; faith\_effect: pulls
- id: minority house of worship; place: town; class: clergy; limit: per\_place; group: worship; steps: ((name: minority house of worship; cost: (gold: 40; months: 12; stone: 20); unlocked\_by: start; jobs: 300; needs: (any\_of: ((faith\_share\_at\_least: 0.1), (charter: Faith tolerance))))); owner\_default: clergy; faith\_effect: calms
- id: pilgrimage shrine; place: holy\_place; class: clergy; limit: per\_place; group: worship; steps: ((name: pilgrimage shrine; cost: (gold: none; months: none); unlocked\_by: start; jobs: 600)); never\_on\_build\_sheet: yes; pilgrims\_count\_as\_traders: yes
- id: school; place: town; class: scholars; limit: per\_province; group: learning; steps: ((name: temple school; cost: (gold: 60; months: 12; stone: 20); unlocked\_by: [L1 Temple and monastery schools](Data-Research#inventions); needs: (min\_town: market\_town); seats: 20; upkeep: 2), (name: madrasa or university; cost: (gold: none; months: none); unlocked\_by: [L2 Madrasa networks](Data-Research#inventions); seats: (madrasa: 30; university: 60); upkeep: 4), (name: academy; cost: (gold: none; months: none); unlocked\_by: [L12 Academies of science](Data-Research#inventions); seats: 100; upkeep: 6))
- id: library; place: town; class: scholars; limit: per\_place; group: learning; steps: ((name: library; cost: (gold: 80; months: 12; stone: 20); unlocked\_by: [L5 printing](Data-Research#inventions); jobs: 300; needs: (building\_step: school, 2))); effects: graduate\_a\_year\_sooner, sacked\_scholars\_not\_all\_flee
- id: observatory; place: outside; class: scholars; limit: per\_place; group: learning; steps: ((name: observatory; cost: (gold: 120; months: 24; stone: 40); unlocked\_by: [L3 Observatories](Data-Research#inventions); jobs: 300; needs: (building\_in\_province: school))); effects: boats\_inventions\_double\_rate
- id: hospital; place: town; class: clergy; limit: per\_province; group: learning; steps: ((name: hospital; cost: (gold: 60; months: 12; stone: 20); unlocked\_by: start; jobs: 600)); town\_death\_rate\_slower: 0.005; effects: plague\_spreads\_slower
- id: wells and drains; place: ring; class: none; limit: per\_place; group: none; steps: ((name: wells and drains; cost: (gold: 200; months: 36; stone: 60); unlocked\_by: [B11 Sewers and clean water](Data-Research#inventions))); town\_plague\_deaths\_factor: 0.5; town\_size\_bonus: 1
- id: almshouse; place: town; class: clergy; limit: per\_place; group: learning; steps: ((name: almshouse; cost: (gold: 30; months: 6; stone: 10); unlocked\_by: start; jobs: 600)); shelters\_homeless: 3000
- id: palace; place: capital\_extra; class: clerks; limit: per\_realm; group: palace; steps: ((name: palace; cost: (gold: 100; months: 24; stone: 60; crew: 2000); unlocked\_by: start; jobs: 600; upkeep: 5; officials: 6; lords: 2), (name: great palace; cost: (gold: 300; months: 60; stone: 150; crew: 3000); unlocked\_by: start; jobs: 1200; upkeep: 10; officials: 10; lords: 4), (name: royal city; cost: (gold: 700; months: 120; stone: 300; crew: 4000); unlocked\_by: [G9 Professional bureaucracy](Data-Research#inventions); jobs: 2000; upkeep: 20; officials: 16; lords: 6))
- id: seat; place: town; class: clerks; limit: per\_province; group: none; steps: ((name: seat; cost: (gold: 60; months: 12; stone: 20); unlocked\_by: start; jobs: 300; officials: 2), (name: seat step 2; cost: (gold: none; months: none); unlocked\_by: [G11 Postal service](Data-Research#inventions); officials: 4))
- id: chancery; place: town; class: clerks; limit: per\_realm; group: none; steps: ((name: chancery; cost: (gold: 80; months: 12; stone: 20); unlocked\_by: [G3 Tax registers](Data-Research#inventions); jobs: 300; officials: 4)); enables: [G3 Tax registers](Data-Research#inventions), [G10 Census](Data-Research#inventions)
- id: court of law; place: town; class: clerks; limit: per\_place; group: none; steps: ((name: court of law; cost: (gold: 50; months: 12; stone: 20); unlocked\_by: [G1 Written law codes](Data-Research#inventions); jobs: 300; lords: 2))
- id: diet hall; place: town; class: clerks; limit: per\_realm; group: none; steps: ((name: diet hall; cost: (gold: 100; months: 18; stone: 40); unlocked\_by: start; jobs: 300; lords: 3))
- id: hostage residence; place: town; class: clerks; limit: per\_realm; group: none; steps: ((name: hostage residence; cost: (gold: 60; months: 12; stone: 20); unlocked\_by: start; jobs: 300; lords: 3))
- id: examination hall; place: town; class: scholars; limit: per\_place; group: none; steps: ((name: examination hall; cost: (gold: 120; months: 18; stone: 40); unlocked\_by: [G4 Examination system](Data-Research#inventions); jobs: 300; officials: 4))
- id: parliament house; place: town; class: clerks; limit: per\_realm; group: none; steps: ((name: parliament house; cost: (gold: 250; months: 36; stone: 100); unlocked\_by: [G14 Written constitution](Data-Research#inventions); jobs: 600; officials: 6))
- id: mint; place: town; class: craftsmen; limit: per\_province; group: none; steps: ((name: mint; cost: (gold: 80; months: 12; stone: 20); unlocked\_by: start; jobs: 300)); coins: silver, gold
- id: castle; place: castle; class: garrison; limit: per\_province; group: castle; steps: ((name: earthwork ring fort; cost: (gold: 60; months: 12; timber: 40; crew: 2000); unlocked\_by: [B4 Earthwork ring forts](Data-Research#inventions); upkeep: 3), (name: stone castle; cost: (gold: 300; months: 36; stone: 200; crew: 3000); unlocked\_by: [B1 Stone castles](Data-Research#inventions); upkeep: 6), (name: bastion fort; cost: (gold: 600; months: 48; stone: 400; crew: 4000); unlocked\_by: [B5 bastion\_fortification](Data-Research#inventions); upkeep: 12), (name: star fort; cost: (gold: 900; months: 60; stone: 600; crew: 5000); unlocked\_by: [B6 Star forts](Data-Research#inventions); upkeep: 20), (name: concrete fortress; cost: (gold: 1200; months: 36; concrete: 300; crew: 4000); unlocked\_by: [B13 Reinforced concrete](Data-Research#inventions); upkeep: 25))
- id: granary; place: part\_of\_castle; class: none; limit: per\_place; group: none; steps: ((name: granary; cost: (gold: 30; months: 6; timber: 20); unlocked\_by: start)); needs\_castle: yes
- id: town walls; place: ring; class: none; limit: per\_place; group: none; steps: ((name: palisade; cost: (gold: 30; months: 6; timber: 40); unlocked\_by: start), (name: stone walls; cost: (gold: 200; months: 36; stone: 150); unlocked\_by: start), (name: bastioned walls; cost: (gold: none; months: none); unlocked\_by: [B5 bastion\_fortification](Data-Research#inventions)))
- id: drill yard; place: town; class: none; limit: per\_province; group: none; steps: ((name: drill yard; cost: (gold: 40; months: 6; timber: 20; crew: 500); unlocked\_by: start; upkeep: 1; needs: (min\_town: town); training\_room: 1500), (name: barracks; cost: (gold: 120; months: 18; stone: 60; crew: 1500); unlocked\_by: [W12 Standing regiments](Data-Research#inventions); upkeep: 3; training\_room: 4000; no\_soldiers\_quartered: yes))
- id: arsenal; place: town; class: craftsmen; limit: per\_province; group: none; steps: ((name: arsenal; cost: (gold: 60; months: 12; stone: 30); unlocked\_by: start; jobs: 300)); stores\_keep: yes
- id: watchtower line; place: ring; class: none; limit: per\_place; group: none; steps: ((name: watchtower line; cost: (gold: 20; months: 6; stone: 20); unlocked\_by: start)); effects: enemy\_armies\_seen\_one\_province\_further, raids\_spotted\_a\_season\_ahead
- id: airfield; place: fields; class: none; limit: per\_place; group: none; steps: ((name: airfield; cost: (gold: 150; months: 6; concrete: 40); unlocked\_by: [B16 Airfields](Data-Research#inventions)))
- id: harbour; place: shore; class: seafolk; limit: per\_province; group: none; steps: ((name: harbour; cost: (gold: 40; months: 12; timber: 20; crew: 1000); unlocked\_by: start; jobs: 1500; upkeep: 1; berths: 10), (name: port; cost: (gold: 120; months: 24; stone: 60; crew: 2000); unlocked\_by: start; jobs: 3000; upkeep: 3; needs: (min\_town: market\_town); berths: 25), (name: great port; cost: (gold: 300; months: 36; stone: 120; crew: 3000); unlocked\_by: [S13 Steamships](Data-Research#inventions); jobs: 4500; upkeep: 6; berths: 50)); port: yes; raises\_sailors: yes
- id: shipyard; place: shore; class: seafolk; limit: per\_province; group: none; steps: ((name: slipway yard; cost: (gold: 60; months: 12; timber: 40; crew: 1000); unlocked\_by: start; jobs: 3000; upkeep: 2; slipways: 1), (name: shipyard; cost: (gold: 150; months: 18; timber: 80; crew: 2000); unlocked\_by: [S4 Carrack and caravel](Data-Research#inventions); jobs: 4500; upkeep: 4; slipways: 2), (name: naval dockyard; cost: (gold: 400; months: 36; stone: 120; crew: 3000); unlocked\_by: [S10 Naval dockyards](Data-Research#inventions); jobs: 6000; upkeep: 8; slipways: 2)); needs\_building: harbour
- id: fishery; place: shore; class: seafolk; limit: per\_place; group: land; steps: ((name: fishery; cost: (gold: 15; months: 4; timber: 10); unlocked\_by: start; jobs: 3000))
- id: lighthouse; place: shore; class: seafolk; limit: per\_province; group: none; steps: ((name: lighthouse; cost: (gold: 60; months: 18; stone: 40); unlocked\_by: start; jobs: 100)); next\_zone\_storm\_loss\_factor: 0.5
- id: naval base; place: shore; class: seafolk; limit: per\_place; group: none; steps: ((name: naval base; cost: (gold: 200; months: 24; stone: 100); unlocked\_by: [S10 Naval dockyards](Data-Research#inventions); jobs: 600; needs: (building\_step: harbour, 3))); effects: based\_crews\_kept\_in\_peace\_without\_pay, reinforces\_sea\_battles\_next\_to\_it
- id: road; place: ring; class: none; limit: per\_place; group: none; steps: ((name: track; cost: (gold: 20; months: 6; stone: 10); unlocked\_by: start), (name: road; cost: (gold: 40; months: 12; stone: 20); unlocked\_by: [B2 Roads and post stations](Data-Research#inventions)), (name: paved road; cost: (gold: 120; months: 24; stone: 80); unlocked\_by: [B2 Roads and post stations](Data-Research#inventions)), (name: turnpike; cost: (gold: 180; months: 36; stone: 120); unlocked\_by: [B9 Turnpike roads](Data-Research#inventions)), (name: railway; cost: (gold: 300; months: 24; steel: 100); unlocked\_by: [C16 railways](Data-Research#inventions)))
- id: bridge; place: shore; class: none; limit: per\_place; group: none; steps: ((name: bridge; cost: (gold: 40; months: 18; stone: 40); unlocked\_by: start)); toll\_point: yes
- id: canal; place: ring; class: none; limit: per\_place; group: none; steps: ((name: canal; cost: (gold: 400; months: 60; stone: 100; crew: 6000); unlocked\_by: [B3 Grand canals](Data-Research#inventions))); adds\_river: yes
- id: dykes; place: ring; class: none; limit: per\_place; group: none; steps: ((name: dykes; cost: (gold: 100; months: 36; stone: 60); unlocked\_by: start)); stops\_floods\_to\_marsh: yes; drain\_marsh\_with: [F8 Polder drainage](Data-Research#inventions)
- id: rail station; place: town; class: none; limit: per\_province; group: none; steps: ((name: rail station; cost: (gold: 150; months: 12; steel: 40); unlocked\_by: [C16 railways](Data-Research#inventions)))
- id: telegraph office; place: town; class: none; limit: per\_place; group: none; steps: ((name: telegraph office; cost: (gold: 60; months: 6; iron: 10); unlocked\_by: [T14 telegraphy](Data-Research#inventions))); days\_to\_capital: 1

## Burned rebuild (provisional)

| Key | Value |
|---|---|
| `free_per_year_in_peace` | 1 |
| `paid_share_of_farm_cost` | 0.5 |
| `paid_months` | 3 |

## Troyes 1444

| Key | Value |
|---|---|
| `town_size` | town |
| `slots` | 6 |

## Unique variants

| id | who | change |
|---|---|---|
| Külliye | Ottoman | a great mosque that holds an almshouse, a school and a hospital in one slot |
| Kontor | Hanseatic towns | a warehouse abroad in a foreign town by treaty |
| Qollqa line | Inca | granaries along roads without a castle |
| Polder mill | Low Countries | dykes drain one marsh tile every 5 years by themselves |
| Ever-normal granary | Ming, Korea | granaries in towns as well as castles |
| Funduq quarter | Mamluk and Maghrebi ports | foreign traders passing pay market fees here |
