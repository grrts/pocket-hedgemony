# Province (PROV)

## 1. Purpose and scope

The province is where the realm's stats actually happen: gold is taxed here, food grows here, recruits are raised
here, lords and officials govern here, and armies burn it. This context decides what a province holds (land, tiles,
people, classes), what it produces, how its people grow, starve, move between classes and become homeless, how much
tax it owes and how much reaches the treasury, who governs it, how it is defended, what grievances it carries, its
health and land condition, its colony state, and how its numbers add up to the country card.

**In scope**
- Tiles, tile uses, tile states and tile count (province stats §2).
- Ground: effects on troops, on buildings and on people working without buildings (§3).
- Buildings as they touch the province: job slots, fallow rule, tiles without buildings, town building slots, mine
  ore deposits, timber reach (§4, as a summary; see "Not in scope").
- Production of food and wares from tiles (§5).
- People: births and deaths, famine, classes and job slots, overflow, homeless, refugees, faith and language mix,
  recruits, students and scholars counted per province (§6).
- Toll points and toll rates (§7.2 *Toll*, kept by trade v2).
- Tax per province and the Tax screen (§8).
- Roads, rivers and days to capital (§9).
- Governance: owner, governed by, occupation, years held, homeland, pretenders, officials and their types, lords in
  the province, charters (§10).
- Defence stats: castle step, walls, garrison (§11).
- Grievances and their thresholds, rebels as a province stat (§12.1); plague, fever land, smoke (§12.2); colonies and
  the people already there as province state (§12.3).
- Aggregation to the country card (§13).
- Mapping of the event tree's province stats (§15).
- Rules for starting values (§16; the data itself belongs to scenario-setup).
- What is stored and what is worked out, and update cadence (§17).

**Not in scope (owned by …)**
- What the player sees at each zoom and the map modes (§14): **map-presentation**.
- Trade (§7, except tolls): replaced by trade v2, **trade**. Province stats §7.1 (trader paths), §7.2 *Market price*
  and *Trade balance*, and §7.3 (profit and debt) are superseded; see D-PROV-1.
- The full building list, construction, upkeep, condition, owners and steps: **buildings** (province §4 is a summary).
- How risings start, grow and end: **rebellions**.
- How castles fight, sieges, sacks, battles, army food reserves: **warfare**.
- Days-to-cross marching and the day loop: **troop-movement**.
- Founding a colony (governors, colony food, progress): **exploration**; colony subject stages: **subjects**.
- Faith pulls: **religion**; language drift: **culture**; officials and lords caps: **government**.
- Food policy, castle food stores, lords' loyalty, the country card itself: **realm**.
- Schools, research and the invention tree: **research**.
- The starting values data per province: **scenario-setup**.

## 2. Sources

Newest decision first.
1. `planning/gap-lists.md` "Decisions already made" (16 Oct 2026): campaign 1444 to 31 August 1939; one month per turn (since replaced by one week per turn, X-18);
   multiplayer-friendly (deterministic, orders as data); colonising stateless peoples' land still open.
2. `trade/trade-design.md` v2 (16 Oct): replaces province stats §7; §14 lists edits for province stats.
3. `buildings/buildings-design.md` v1 §5.2, §18 (changes for province stats).
4. `government/government-design.md` v2 §2, "Changes needed elsewhere".
5. `exploration/exploration-design.md` §4.2, §5, §9.
6. `diplomacy/diplomacy-design.md` §18; `warfare/warfare-design.md` §18; `recruiting/recruiting-design.md` (changes for
   province stats); `culture/culture-design.md` (changes for other files); `religion/religion-design.md` §18.
7. `province-stats/province-stats-design.md` version 3 (all sections except §14; §7 superseded except *Toll*).
8. `province-stats/rebellions-design.md` v1 §2.1 (only where it contradicts §12.1).

## 3. Ubiquitous language

| Term | Meaning | Not to be confused with |
|---|---|---|
| Province | One land area of the map; holds tiles, people, buildings, stats | Sea zone; region |
| Tile | One of the 4 to 16 slots of land in a province's tile row; has one use | Map hex/pixel; tile type of the terrain art (world-map) |
| Tile use | Fields, Pasture, Woods, Marsh, Waste, Shore, Town, Castle | Tile state |
| Tile state | Burned, Fallow or Worn; at most one at a time | Tile use; building condition (buildings) |
| Ground | The province's one terrain class (11 grounds: farmland, grassland, savanna, drylands, desert, hills, mountains, forest, jungle, marsh, tundra) | Tile use; the 22 map tile types (world-map) |
| Building | A structure on a tile (land building) or in the town (town building); the castle is a building | Building slot |
| Job slot | Room for people of one class in a building or on a bare tile, counted in people with their families | Building slot |
| Building slot | Room for one town building in the Town tile, from town size | Job slot |
| Class | The group a person belongs to: farmers, herders, woodsmen, miners, seafolk, craftsmen, market folk, clergy, clerks, scholars, homeless | Language; faith |
| Townsfolk / Countryfolk | People of town classes / land classes; shown, not stored | Town size |
| Town size | Hamlet, village, market town, town, city, great city; read from townsfolk | Tile count |
| Overflow | Extra people of a full class moving to the least-filled slots | Migration; refugees |
| Homeless | People with no slot | Refugees |
| Refugees | People sheltering from another province, outside the classes | Homeless; settlers |
| Settlers | Your people living in a colony, in thousands | Refugees |
| Wares | Non-food goods made from tiles and buildings | Trade value (trade) |
| Harvest roll | Bumper, good, normal, poor, failed | Harvest step |
| Harvest step | One step better on the harvest roll, given by inventions | |
| Tax rate | None, light, normal, heavy, crushing; per province | Tribute (subjects) |
| Tax owed / Reaches you | Gold a province owes in a year / the part that arrives | Trade income |
| Seat | A governor's hall (town building); provinces near it count days to it | Capital |
| Days to capital | Travel time to the capital or nearest seat by the fastest route | Days to cross (troop-movement) |
| Governed by | Official, lord, no one, subject ruler, occupied | Owner |
| Official | A person of a type who runs one province | Lord |
| Years served | Years an official has spent in his current province | |
| Lord | A named holder of at least one province, with his own officials | Courtier |
| Courtier | A former lord with no land, at court | Lord |
| Pretender | A named person with a right to this land | Rebel leader |
| Homeland of | Peoples who see this land as theirs | Owner |
| Charter | A written privilege granted to one province or town | Grievance |
| Grievance | A named cause of anger in a province | Riots; rebels |
| Riots / Rebels | 3 grievances / 4 or more grievances (province stats §12.1) | Rising (rebellions) |
| Fever land | How dangerous the ground is to people not born there: none, mild, harsh, deadly | Sickness |
| Sickness | What an army loses each month it stays in a ground | Plague |
| Smoke | Soot and poisoned water from factories and coal mines (era V on) | |
| Settlement | None, trading post, settlement, colony | Colony stage (subjects) |
| Free tile | A tile nobody works in an unowned province | Empty tile in an owned province |
| Toll point | Bridge, ford, pass, river mouth or strait where a toll can be set | |
| Ore deposit (was Mine seam) | Ore under a waste tile, counted in years of digging left; a mine digs it | |

## 4. Domain model

### Aggregates

**Province** (identity: province id from the game map)
Holds: owner; governed by; occupied by and months; years held; homeland of; pretenders; ground; tiles (use, building,
building step, state, workers); people per class (11 numbers); homeless; refugees; faith mix and language mix (top three
each); recruits here; students here; scholars here; ore deposits; tax rate; tolls; charters; grievances; rebels; road
step; river; plague; fever land; smoke; food stores; castle step, walls and garrison; official (type, years served);
settlement, settlers, local people's tiles.
- INV-PROV-1: tile count is between 4 and 16 inclusive and follows the province's size on the map.
- INV-PROV-2: each tile has exactly one use and at most one state.
- INV-PROV-3: each land tile holds at most one building; town buildings are limited by building slots from town size.
- INV-PROV-4: shore tiles exist only in provinces on a coast, lake or navigable river, 1 to 3 of them, and are never lost.
- INV-PROV-5: every settled province has a Town tile.
- INV-PROV-6: every person belongs to exactly one class; homeless is a class with no slots; refugees are outside the classes.
- INV-PROV-7: no class other than homeless holds more people than its slots after overflow, except where the province
  has no free slot of any kind.
- INV-PROV-8: scholars only come from graduating students, soldiers only from raised recruits; overflow never enters either.
- INV-PROV-9: one official runs 1 to 3 provinces by inventions (D-PROV-24); a seat needs its own official.
- INV-PROV-10: a province governed by a lord belongs to a lord who holds at least one province.
- INV-PROV-11: grievances are named causes, never a meter; riots and rebels follow from their count.
- INV-PROV-12: a colony is founded only in a province no country owns, and takes only free tiles.
- INV-PROV-13: enslaved people are never a ware.

### Entities and value objects
- **Tile** (entity within Province): use, building, building step, state, workers.
- **Ground** (value): troop modifiers, days to cross, foraging, sickness, build cost, building output, people output.
- **Class population** (value): count per class.
- **Official** (entity, owned by realm or a lord, assigned here): type, years served, language (proposed by culture, D-PROV-13).
- **Charter** (value): kind and date granted; a revoked charter leaves *Broken charter* for 20 years.
- **Grievance** (value): kind, weight (1 or 2), start date.
- **Pretender** (reference to a person): right, and its expiry (50 years after loss for an old ruler).
- **Mine** (entity on a tile): ware, years of ore left.
- **Settlement** (value): step, settlers, local people's tiles.

### Domain services
- **Food producer**: food per tile from people, building, ground, harvest roll and inventions.
- **Ware producer**: wares per building from workers, ground building output and inventions.
- **Class balancer**: births, deaths, overflow, homeless drift.
- **Famine resolver**: compares food with eaters each season.
- **Tax collector**: tax owed and the part that reaches you.
- **Grievance evaluator**: starts and ends grievances, sets calm, grumbling, riots or rebels.
- **Country aggregator**: sums for the country card (§13).
- **Event mapper**: turns event-tree province stats into concrete changes (§15).

## 5. Requirements

### 5.1 Principles
- PROV-001: The province shall express every stat as something countable (tiles, buildings, workers, men, days), with no abstract levels. [province-stats intro]
- PROV-002: The province shall give every stat a list of how it is gained and how it is lost, shown when the player opens that stat. [province-stats intro, §1]
- PROV-003: The province shall keep all rates and limits (jobs per building, food per worker, ground tables, slots per town size, toll effects, grievance thresholds) in one province config file. [province-stats §17]
- PROV-004: The province shall not use development, base tax, autonomy, cores, unrest or devastation meters. [province-stats intro]

### 5.2 Tiles
- PROV-010: The province shall have between 4 tiles (smallest) and 16 tiles (largest), set by the province's size on the map. [§2.1]
- PROV-011: Each tile shall have one use from Fields, Pasture, Woods, Marsh, Waste, Shore, Town and Castle, and most uses can hold one building. [§2.1]
- PROV-012: When the player clears a woods tile, the province shall turn it into fields after 3 years at a gold cost, and give one load of timber. [§2.1]
- PROV-013: If a fields tile is left unworked for 10 years, then the province shall turn it back into woods. [§2.1]
- PROV-014: If fields or pasture are salted or overgrazed, then the province shall turn the tile to waste. [§2.1]
- PROV-015: When the player turns a fields tile to pasture, the province shall change its use after one season; ploughing pasture turns it to fields. [§2.1]
- PROV-016: When marsh is drained with *Polder drainage*, the province shall turn it into fields; floods and dykes broken in war shall turn tiles into marsh. [§2.1]
- PROV-017: When waste is irrigated with *Qanat and canal irrigation*, the province shall turn it into fields. [§2.1]
- PROV-018: The province shall give shore tiles (1 to 3) only to provinces on a coast, lake or navigable river, and shall never remove them; a blockade or silted harbour stops their buildings working. [§2.1]
- PROV-019: The province shall give every settled province one Town tile; when townsfolk reach 40,000 the town shall take a second tile built over fields, and a great city a third. [§2.1]
- PROV-020: If a town shrinks below the limit of a tile it holds, then the province shall give that tile back as fields. [§2.1]
- PROV-021: When a castle is built, the province shall place it on any land tile except Town, and that tile shall stop producing. [§2.1]
- PROV-022: When a castle is destroyed, the province shall turn its tile into waste for 5 years, then into fields. [§2.1]
- PROV-023: Woods shall be gained by unworked fields growing back and by replanting (later inventions), and lost by clearing, cutting timber faster than it regrows, and fire. [§2.1]
- PROV-024: Pasture shall be lost to drought and overgrazing (to waste); grassland, savanna and steppe provinces start with many pasture tiles. [§2.1]

### 5.3 Tile states
- PROV-030: The province shall allow at most one state per tile: Burned, Fallow or Worn. [§2.2]
- PROV-031: When an army forages or loots, the player burns their own fields (scorched earth), raiders raid or rebels act, the province shall mark the tile Burned: its building is wrecked, it gives nothing, and its workers become refugees or die. [§2.2]
- PROV-032: While the province has people and peace, it shall rebuild one burned tile a year, faster with gold. [§2.2]
- PROV-033: While a building has fewer than half its workers, the province shall mark its tile Fallow, until enough workers return. [§2.2, §4]
- PROV-034: When fields are farmed for decades with more people than the farm needs and no rotation inventions, pasture is overgrazed, or (later) mines and factories wear the land, the province shall mark the tile Worn, giving half output. [§2.2]
- PROV-035: When a worn tile goes five years without use, the province shall clear the Worn state; *Three-field rotation*, *Fodder crops* and *Four-field rotation* make wearing rarer. [§2.2]
- PROV-036: The province shall show war damage as burned tiles, not as a meter. [§2.2]

### 5.4 Ground: troops
- PROV-040: Each province shall have one ground, taken from the game map's terrain, that sets its starting tile mix and its troop, building and people effects. [§3]
- PROV-041: The province shall apply the ground's foot, horse, guns and defender strength changes, days to cross, foraging and sickness from the ground troop table (§10 config). [§3.1]
- PROV-042: In desert, the province shall apply 0 to camels instead of the horse −10 %. [§3.1]
- PROV-043: If an attacker comes over a river shore tile, then the attacker shall fight at −20 %, unless the province has a bridge. [§3.1]
- PROV-044: The defender shall get +5 % for every two woods tiles, up to +15 %. [§3.1]
- PROV-045: Burned tiles shall give nothing to forage. [§3.1]
- PROV-046: Where the province has a castle tile, the defender shall fight from the walls (warfare 8.1). [§3.1, §11]
- PROV-047: A defending army of the province's homeland language shall get a further +10 % in hills, mountains, forest, jungle and marsh. [§3.1]
- PROV-048: While an army stays in a province, it shall lose its ground's sickness each month, worst for soldiers not born on that ground. [§3.1]
- PROV-049: Foraging shall be how much an army can take from the tiles before it starts burning them. [§3.1]

### 5.5 Ground: buildings versus people
- PROV-050: The province shall multiply building costs by the ground's build cost and building output by the ground's building output, and output of people working without a building by the ground's people output (table in §10). [§3.2]
- PROV-051: In drylands, building output shall be −25 % until irrigated; in marsh −50 % until drained. [§3.2]
- PROV-052: In desert, building output shall be −50 % except mines and irrigation works. [§3.2]
- PROV-053: In hills mines shall get +25 %; in mountains farms −50 % and mines +50 %; in forest lumber +50 %. [§3.2]

### 5.6 Buildings in the province (summary; buildings owns the rules)
- PROV-060: Every building shall stand on a tile in a province, and the castle shall be a building. [§4]
- PROV-061: Each building shall have job slots for one class; with all slots filled it works fully, with fewer people in proportion, and below half it is fallow. [§4]
- PROV-062: Buildings shall be gained by building them (cost times the ground's build cost), by conquering the province, by events, and some appear by themselves. [§4]
- PROV-063: Buildings shall be lost when their tile burns (land buildings), when the town is sacked (town buildings), when 10 years of neglect (from unpaid upkeep, which makes them Neglected at half output after one month) drop them a step or close them, when demolished by the player or a peace treaty, or when the province is lost. [§4, buildings §5.2, D-PROV-3]
- PROV-064: The province shall allow land buildings only on the tile uses listed for them in the land building table, with the slots, products, needs and unlocks given there. [§4.1]
- PROV-065: Each mine shall show its ore deposit in years of digging left; ore deposits are gained by prospecting events and mining inventions and lost every year the mine is dug. [§4.1]
- PROV-066: When a mine runs out, the province shall close it; its miners overflow into other slots or become homeless, and the town shrinks. [§4.1]
- PROV-067: Shipyards and mines shall need timber from a lumber camp in the same province or in reach (one ring, more with roads and rivers); without timber no ships are built. [§4.1]
- PROV-068: A tile with no building shall still have slots for up to 3,000 people of the matching class, working at the ground's people output rate. [§4.2]
- PROV-069: The Town tile shall have building slots from town size: hamlet 1, village 2, market town 4, town 6, city 9, great city 12. [§4.3]
- PROV-070: The province shall allow town buildings with the job slots, products and needs of the town building table. [§4.3]
- PROV-071: An almshouse shall shelter 3,000 homeless, who then stop counting toward theft, the *Homeless* grievance and shanty camps, at a cost in gold upkeep and clergy. [§4.3, §6.4]
- PROV-072: While a town has a market, homeless people and the raw ware nearby, craft buildings shall now and then appear by themselves. [§4.3]
- PROV-073: When craftsmen fleeing persecution abroad arrive, they may found a craft building. [§4.3]

### 5.7 Food from tiles
- PROV-080: The province's harvest shall be the sum of its food tiles, each giving people in its slots × food per person × the ground's output × harvest roll × inventions. [§5.1]
- PROV-081: Farms, terraces and raised fields shall feed 1.5 people per worker; rice paddies 1.5 with two harvests (rolled twice); ranches 1.33; fisheries 1.33; empty fields, woods and pasture 0.67 × the ground's people output. [§5.1]
- PROV-082: The harvest roll shall multiply food by bumper ×1.3, good ×1.15, normal ×1, poor ×0.7, failed ×0.3, for farms, terraces, raised fields, rice paddies and empty fields only. [§5.1]
- PROV-083: Ranches shall not roll a harvest (drought and hard winter events instead); fisheries shall not roll (storms and blockades instead); empty woods and pasture shall not roll. [§5.1]
- PROV-084: Each of *Three-field rotation*, *Fodder crops*, *Seed drill* and *Four-field rotation* shall make the harvest one step better. [§5.1]
- PROV-085: With *Maize, potato and cassava*, a failed harvest shall become poor. [§5.1]

### 5.8 Wares
- PROV-090: Each non-food ware shall be made by the people in a building's slots × the ground's building output × inventions. [§5.2]
- PROV-091: Craft buildings turning raw wares into finished ones shall add value (wool into cloth is worth three times as much). [§5.2]
- PROV-092: Wares made shall fall with burned and fallow tiles, plague killing workers, missing inputs (a forge without iron stops) and a mine running out. [§5.2]
- PROV-093: The list of wares shall live in config, starting with the list in §5.2; later eras add coal, rubber and oil. [§5.2]
- PROV-094: The province shall never treat enslaved people as a ware. [§5.2]

### 5.9 People: births, deaths and famine
- PROV-100: Each month, every class shall gain births (people × birth rate) and lose deaths (people × death rate), from the yearly base rates in config. [§6.1]
- PROV-101: Birth rates shall go up with 10 years of peace in the province (+0.5), and down with war in the province (−1), plague (−1) and, in later eras, in towns by era. Food does not change births: people go on having children through hard years, and famine is what a shortage costs (D-PROV-36). [§6.1] (units: D-PROV-8)
- PROV-102: Death rates shall go up with plague (+5 % rumour, +15 % outbreak, +30 % at its worst), war in the province (+1 %), each burned tile (+0.5 %), fever land for people born elsewhere, and smoke (+1 % for town classes); and down with hospitals, wells and drains (−0.5 % in town) and sanitation and vaccination (each −0.5 %). [§6.1]
- PROV-103: Clergy birth rate shall be 0.5 % where the faith's clergy don't marry, otherwise as townsfolk. [§6.1]
- PROV-104: Each season, the province shall compare the food it has (its share of the harvest, its local store and castle deliveries) with the people who must eat. [§6.2]
- PROV-105: When there is enough food, everyone shall eat and what is left goes to the store. [§6.2]
- PROV-106: If there is not enough food, then the people the food cannot feed shall die that season, spread over the classes by size, except that a quarter of them flee as refugees if a neighbouring province has food. The turn engine eats month by month, and a month without food is a third of a season, so a third of each month's unfed are lost that month and the rest go hungry into the next. A year's famine shall kill at most a fifth of the people the province had in January; past that the unfed go hungry, so two failed harvests in a row cost at most about a third of a province. [§6.2, feedback 93, D-PROV-28]
- PROV-107: A province whose land feeds less than its people in a normal year (what its tiles bring in over its people, under `province.food.balance.short`, 1.0) shall be *short of food*, and one under `tight` (1.05) shall be *tight*: a poor harvest starves it. Births don't fall with food (PROV-101), so a short province shrinks through famine until the realm builds farms, clears land or feeds it from a castle. [D-PROV-36]

#### How the player uses it: short of food
- PROV-364: Where: the province card's Overview has a **Land feeds** line under Food: "92 % of its people · short: it shrinks · build a farm". On the player's own royal province that is short or tight the line is a button that opens the Land tab, where the farm, the better farm or the clearing is one tap away. The Food tab of the realm book starts with a **Short of food** list under its counts, worst first, each row naming the fix and opening that province's Land tab; the Provinces tab keeps its Short of food sort for every province, lords' included. [X-19, D-PROV-36]
- PROV-365: Grouping and overview: the food of a province sits in its Food lines; the realm's food sits on the Food tab, whose counts read hungry, running low, short of food and fed by castles. The Economy tile of the realm's Overview says "N provinces short of food" when none is hungry and opens the Food tab (SHELL-171). A lord's province is his to build on, so it is listed under Provinces but never counted as waiting on the player. [X-19]
- PROV-366: Phone: the line, the rows and the button fit the side panel in landscape in the Wide and Tall layouts and the bottom sheet in portrait, within the safe areas; every row and button is at least 44 points tall, short and tight are written in words, and nothing needs hover. [X-19]

### 5.10 Classes and job slots
- PROV-110: The province shall place every person in one class and give each class its slots in the buildings and tiles listed in the class table. [§6.3]
- PROV-111: Newborns shall join their parents' class the month they are born. [§6.3]
- PROV-112: When a class has more people than its slots, the extra shall move to the class whose slots are least filled (lowest share filled), ties going to food classes first. [§6.3]
- PROV-113: Overflow shall never go into scholars or soldiers. [§6.3]
- PROV-114: When every slot in the province is full, overflow shall become homeless. [§6.3]
- PROV-115: When a slot opens (a new building, deaths, plague or a levy), homeless people shall move into it first. [§6.3, §6.4]
- PROV-116: Each month a share of the homeless shall move to the neighbouring province with the least-filled slots, in the owner's own realm first. [§6.3]
- PROV-117: A class with fewer people than slots shall leave the slots empty until overflow arrives. [§6.3]
- PROV-118: Fleet crews shall be raised from seafolk. [§6.3]

### 5.11 Homeless
- PROV-120: Homeless people shall eat from the local store, make nothing, pay no tax, and die at 5 % a year. [§6.4]
- PROV-121: While homeless are over 5 % of the people, for every 5 % homeless the province shall send 5 % less tax to you and give 5 % less trade ratio gain. [§6.4, trade v2, D-PROV-1]
- PROV-122: While homeless are over 10 % of the people, the province shall have the *Homeless* grievance. [§6.4, §12.1]
- PROV-123: While homeless are over 20 % of the people (shanty camps), the *Homeless* grievance shall count as two; plague shall start here first and spread twice as fast; town classes shall die 1 % faster; and each year a town building may burn. [§6.4]
- PROV-124: Rebels shall muster from the recruit pool like any levy; the homeless are not taken first. [§6.4, D-PROV-18]
- PROV-125: The province shall make people homeless from overflow with every slot full, burned tiles, buildings closing, and soldiers and refugees returning with no slot free. [§6.4]
- PROV-126: The province shall remove homeless people through new slots, rebuilt tiles, almshouses, levies, settlers sent to a colony or frontier with free tiles, and drift to neighbours or abroad. [§6.4]

### 5.12 Other people stats
- PROV-130: People shall be everyone living in the province, summed over classes. [§6.5]
- PROV-131: Countryfolk and townsfolk shall be shown, not stored; town size comes from townsfolk; townsfolk grow no food. [§6.5]
- PROV-132: Refugees shall shelter outside the classes, eat without working at first, go home when it is safe, and after 2 years settle and overflow into slots or become homeless if none are free. [§6.5]
- PROV-133: Fleeing craftsmen and scholars shall keep their class if a slot is free. [§6.5]
- PROV-134: The faith mix and language mix shall store the top three faiths and languages; the country's Faith and Language % are their people-weighted sums. [§6.5, §17]
- PROV-135: Persecution shall make people flee and take their faith and crafts elsewhere. [§6.5]

### 5.13 Recruits, students and scholars here
- PROV-140: Each year the province shall add to recruits here 1 % of every class except clergy and scholars. [§6.6, D-PROV-17]
- PROV-141: Recruits of royal provinces shall go to the ruler; a lord's recruits go to his retinue. [§6.6]
- PROV-142: When recruits are raised, they shall leave their class slots. [§6.6]
- PROV-143: When soldiers come home, they shall rejoin as homeless and overflow into the emptiest slots. [§6.6]
- PROV-144: While recruits are below a quarter of the pool, the province shall have the *Conscription* grievance, ending when refilled to half. [§6.6, §12.1]
- PROV-145: Local recruits shall fill local school seats first, then the realm's. [§6.6]
- PROV-146: Students here shall be lost by graduating, being called to arms, plague and the school being sacked. [§6.6]
- PROV-147: Scholars here shall be gained by graduation and foreign scholars settling in towns with schools and peace, and lost by old age, war here, persecution and a richer neighbour hiring them. [§6.6]

### 5.14 Tolls (kept from §7.2)
- PROV-150: The owner shall set a toll rate of none, low or high on each toll point (bridge, ford, pass, river mouth, strait); a free-trade charter sets it to none. [§7.2, trade §7.2]

### 5.15 Tax
- PROV-160: The province shall have its own tax rate (none, light, normal, heavy, crushing), defaulting to the realm default set on the Tax screen, overridable per province. [§8]
- PROV-161: Tax owed shall be the gold the province owes each year at its rate, from the value of what its buildings make and its townsfolk; tolls count in trade, not here. [§8]
- PROV-162: Tax owed shall fall with burned and fallow tiles, homeless people, and riots (half). [§8]
- PROV-163: Reaches you shall be the part of tax owed that arrives: half without an official, half kept by a lord, a share lost for every day of travel beyond 5, less with enemy armies on the road, and nothing while occupied. [§8]
- PROV-164: When the player picks a Tax screen preset (e.g. *Even*, *Spare the frontier*, *Squeeze the towns*, *War chest*), the province rates shall be filled in at once. [§8]
- PROV-165: In a lord's province, the rate shall be what is demanded from the lord; he keeps half of what is collected either way, and a heavy or crushing demand makes him waver. [§8]
- PROV-166: Riots or rebels may force the rate down, and a tax cap charter shall keep it at light or below. [§8, §10.4]
- PROV-167: While a province's rate is heavy, it shall have the *Heavy taxes* grievance; crushing counts as two. [§12.1]

### 5.16 Roads and travel
- PROV-170: The province shall have one road step for the whole province: track, road, paved road, turnpike, railway; each step is unlocked by an invention and built for gold × the ground's build cost. [§9]
- PROV-171: Roads shall be lost by neglect without upkeep, fighting and floods. [§9]
- PROV-172: A navigable river shall be fixed, shown as shore tiles; canals add one (*Grand canals*, *Canal locks*); a wrecked canal or silting removes it. River provinces count one ring closer for castle food spread. [§9]
- PROV-173: Days to capital shall be the travel time to the capital or nearest seat by the fastest road, river or sea route, longer in winter and with enemy armies, broken roads or a sea route closed in war. [§9]
- PROV-174: While days to capital are above a limit (example 30), the province shall have *Far from the throne*. [§9, §12.1]
- PROV-175: Days to capital shall be counted from the realm's capital over its own land (each step the march's days to cross both grounds, plus a day for a river) and the sea (`far_from_throne.sea_zone_days` a sea zone); a realm that has lost its capital counts from its most populous province, and a province it can't reach over its land or the sea is as far as can be. They are worked out again in the monthly step whenever land has changed hands. [X-28]
- PROV-176: While royal land is far from the throne, it shall send the crown `far_from_throne.cut_per_10_days` (0.1) less of its tax and recruit refill for every 10 days past the limit, down to `far_from_throne.least_share` (half, at 80 days). A province a lord holds is run from his seat: it is never far from the throne. [X-28]

- PROV-177: For `newly_taken.years` (10) after a province is taken from another realm by a peace or handed over by a demand, it shall have *Newly taken*, one grievance (so foreign rule and the wrong faith together riot), whose rebels rise for their homeland. Land taken in from tribes, colonies and land held since the start are not newly taken. [X-28]
- PROV-178: While newly taken, a province shall cost its owner `newly_taken.upkeep_share_of_tax` (half) of its tax at the normal rate again each month, on the ledger's *Holding new land* line. [X-28]

#### How the player uses it: newly taken land
- The province card's Overview shows *Newly taken* with the year it was taken and the year it ends, and that it costs garrisons and clerks; *Newly taken* is listed with its grievances. The Treasury tab's ledger shows the whole cost as *Holding new land*, so the price of conquest reads at a glance. Works by tap on a phone in either layout. [X-28]

#### How the player uses it: far from the throne
- The province card's Overview shows *To capital* with the days, and for far royal land the share it loses (for example "far from the throne: −20 % tax and recruits"); its Tax line says the same under the gold, so the player sees why it pays less. A lord's land far away says its lord runs it from his seat. [X-28]
- *Far from the throne* is listed with the province's grievances and counts toward its mood like the rest. [X-28]
- The *Days to capital* lens colours the player's royal land: green within the limit, amber to red as the cut grows, a lord's land in grey, other realms faded; its key says what each colour costs. This is the overview at a glance. [X-28]
- The choice it brings: grant far land to a lord (no cut, but he keeps his share and may turn) or keep it royal and accept the cut. Nothing needs hover; the lens and the card work by tap on a phone in either layout. [X-28]

### 5.17 Governance
- PROV-180: Each province shall have an owner, gained by conquest, inheritance, purchase, a lord joining with his land or a colony, and lost by losing a war, a lord defecting, rebels breaking away or ceding it. [§10.1]
- PROV-181: Each province shall be governed by an official, a lord, no one, a subject ruler, or be occupied. [§10.1]
- PROV-182: An official shall give full tax and recruits plus the effect of his type; a lord half tax, recruits to his retinue, run by his own officials; no one half of everything and the *Ungoverned* grievance. [§10.1]
- PROV-183: When a lord's line dies out, his province shall return to royal and need an official. [§10.1]
- PROV-184: While an enemy holds the castle, or holds a province with no castle for a season, the province shall be occupied, counting months, and its tax, recruits, food and trade go to the occupier. [§10.1]
- PROV-185: Years held shall count years since this owner gained it; language and faith shift faster the longer it is held, and *Foreign rule* fades. [§10.1]
- PROV-186: Homeland of shall be set at start from the catalogue, gained by a people who make up most of the province for 100 years and lost by a people gone for 100 years. [§10.1]
- PROV-187: While a homeland is held by a ruler of another language, the province shall have *Foreign rule*, and separatist events start here. [§10.1, §12.1]
- PROV-188: Pretenders shall be gained by inheritance and marriage, by losing the province in war (the old ruler keeps a right for 50 years) and by buying a title, and lost by death without heirs, renouncing in a peace, marrying into your house, and time. [§10.1]

### 5.18 Officials
- PROV-190: Every official shall have a type; assigned to a province he runs it and gives his type's effect there (officials table, §10 config). [§10.2]
- PROV-191: One official shall run 1 province with G1, 2 with G9, 3 with G16, plus one for each of B2, G11 and T14; a seat needs one of its own. [§10.2, D-PROV-24]
- PROV-192: An official shall give half his effect in his first year in a province, rising to full after 5 years there; moving him starts him again at half. [§10.2]
- PROV-193: A colonial governor shall have no effect of his own; he founds a colony and then becomes its ordinary official; he needs a colonial governor slot and does not count against the officials cap while holding one. [§10.2, exploration §4.2]
- PROV-194: Officials shall be gained by hiring one of a chosen type (gold up front, wages yearly; a foreign specialist costs more), by school graduates (madrasa: judges and chaplains; university: judges and stewards; academy: masters of works and wardens), and by a lord's line dying out; and lost by old age and death, dismissal, unpaid wages, being killed when rebels or an enemy take their province, and a richer neighbour hiring them. [§10.2]
- PROV-195: The country card's Officials count shall be the sum of the realm's officials. [§10.2, §13]
- PROV-303: The ruler may move an official from one royal province of his realm to another: the two officials swap posts, or he takes the other's empty post and leaves his own empty; each official who moves keeps his name and type and starts again at half his effect (PROV-192). A lord's province takes no part, and its official cannot be commissioned: he serves the lord, not the crown (PROV-202). [F-54; PROV-192, PROV-202]
- PROV-304: At the start of the campaign each official shall have served 0 to 10 years in his province, spread over the provinces, so that their effects differ (default chosen). [F-54; PROV-192]
- PROV-305: The type effects that work so far shall be: tax collector on tax reaching the holder, steward on food from the harvest, judge on riots, muster master on recruits refilling, customs officer on trade gold, and warden on the garrison's strength against a storm; a master of works and a schoolmaster take effect when buildings and schools are in the game. An effect works on the province's own output, before a lord takes his share. [F-54; PROV-190, PROV-202]

#### How the player uses it: moving officials
- PROV-306: Where: the player opens an official's screen from the realm's Officials tab or from the governance card at the top of the province panel, and taps "Move to another province"; a list of the realm's royal provinces follows, each row showing its official (or an empty post), his type, and what the move changes (the two effects before and after, both starting at half). Tapping a row moves him; the button says why when it can't (a lord's province, both posts empty). [F-54; X-19]
- PROV-307: Grouping: everything about an official sits on his screen: name, type, province, years served, his effect now and at full, and the Move and Commission buttons. [F-54; X-19]
- PROV-308: Overview: the Officials tab of the player's country card lists every official of the realm with his type, province, years served and effect, and the empty posts; tapping one opens his screen. [F-54; X-19]
- PROV-309: Phone: in landscape the official's screen and the province list fit the side panel in the Wide and Tall layouts, every row and button is at least 44 points high, and nothing needs hover (each row spells out what the move changes). [F-54; X-19]

#### Hiring an official (default chosen, 18 October 2026)
- PROV-333: Hiring an official shall fill an empty royal post with an official of the chosen type for `province.officials.hire.gold` (25 gold, provisional) up front; he starts at half his effect (PROV-192). A type that serves nowhere else among the realm's royal posts has no one at home to learn it from, so it can only be hired from abroad. [PROV-194; default chosen]
- PROV-334: A foreign specialist can be of any type and shall cost `province.officials.hire.foreign_multiplier` (2, provisional) times a native hire; he bears a name of the realm he comes from. [PROV-194; default chosen]
- PROV-335: Neither kind of hire shall fill a lord's province: his own officials serve him (PROV-202). [PROV-303]

#### How the player uses it: filling an empty post and commissioning
- PROV-336: Where: the governance card at the top of a province's overview shows its official, or "No official" with a "Fill the post" button; the realm's Officials tab lists the empty posts as buttons to the same screen. The post's screen offers, first, the realm's officials who could move in (best fit for the province first, one tap each), then one row per type with what it does here, "Hire · 25 gold" and "Foreign · 50 gold"; a button that can't be pressed says why (not enough gold, no one at home of that type). [X-19; PROV-303, PROV-333]
- PROV-337: Grouping: everything about one post sits on one screen: the official's screen when it is filled (move, commission), the post's screen when it is empty (move in, hire). Commissioning is on the official's screen, with its price (RECR-114) and what the province loses meanwhile. A lord's official has no screen: his card says he serves the lord. [X-19; PROV-307]
- PROV-338: Overview: the Officials tab of the country card counts the realm's officials by type and the empty posts, so a realm missing a type or with posts standing empty sees it at a glance. [X-19; PROV-308]
- PROV-339: Phone: the post's screen fits the side panel in landscape in the Wide and Tall layouts and the bottom sheet in portrait; each type row and button is at least 44 points tall and spells out its effect, so nothing needs hover. [X-19; PROV-309]

#### Land just taken and a lord's land (feedback 120 and 121, 18 October 2026)
- PROV-340: When a realm takes a province, by peace or handed over, the province's official shall be lost with it (fled or killed, PROV-194): its post stands empty and it is royal land. Until the player decides for each such province (fill the post, grant it to a lord, or keep it royal with the post empty), End turn shall open the Officials tab, which lists them first under "New lands" with those three buttons. [feedback 121; PROV-194, PROV-303] *Applies only while the player's Auto-fill posts is off (PROV-344).*
- PROV-341: In a lord's province the player shall not call levies (its men answer the lord's call for his retinue) nor change its tiles (he decides on his land); he may set its tax, at the loyalty cost of REALM-187, and pay for a building there, which becomes the lord's and wins him a step as a gift of gold (PROV-206). The governance card says so in one line. [feedback 120; PROV-202, PROV-206, REALM-187]

#### Officials with fewer taps (Leroy, 19 October 2026)
Leroy found getting, hiring, firing and moving officials tedious: about five taps for each empty post, End turn stopping for every province taken, no way to fire one. The crown now fills its own posts unless the player turns that off, and every one-off choice is a single tap (F-157).
- PROV-342: Where a realm fills its posts itself (every AI realm, and the player's while *Auto-fill posts* is on, as it is in a new campaign), at the start of each month it shall fill its empty royal posts, most people first, each with the best fit for the province (PROV-343): hired at home when someone of that type serves in another of its royal posts, else as a foreign specialist, at the price of PROV-333 and PROV-334. It stops when a hire would leave less than `province.officials.auto_fill.reserve_gold` (20 gold, provisional) in the treasury or take the realm's officials over its officials cap (GOV-001); the post of an occupied province waits until it is freed. [F-157; PROV-333, PROV-334, D-PROV-19, default chosen]
- PROV-343: The best fit for a province shall be, in this order: a judge where it riots or plots; a steward where its store holds less than `province.officials.auto_fill.hungry_months` (1, provisional) of food; a warden where it has walls and borders a realm it is at war with; a customs officer where at least `province.officials.auto_fill.traders_passing` (3, provisional) traders passed last month, since he speeds only the gain they bring (TRADE-035); otherwise a tax collector. Each comes with its reason in a few words ("riots here", "under a month of food", "walls facing the enemy", "traders pass here", "2.1 gold tax a month"). [F-157; PROV-190, default chosen]
- PROV-344: While the player's *Auto-fill posts* is on, land just taken shall not wait for a decision (PROV-340 applies only while it is off): its post is filled at once by PROV-342 when the gold allows, else with a later month's filling, and it can be granted to a lord at any time. [F-157; PROV-340]
- PROV-345: The ruler may dismiss the official of a royal post: he leaves the realm's service, no gold comes back, and the post stands empty. He may also replace him in one step with a hire of another type, which is refused, keeping the official, when the hire would be (PROV-333 to PROV-335). A lord's official cannot be dismissed: he serves the lord (PROV-202). [F-157; PROV-194, PROV-202]
- PROV-346: When a commissioned official is released and his old post is filled (by auto-fill or a hire), he shall take the empty royal post that fits his type best, starting at half his effect; with no post empty, the release is refused and says to dismiss an official or wait for a post. [F-157; RECR-087, PROV-192]
- PROV-347: A month's filling shall reach the player as one line of news naming each hire, its post and the gold spent ("Auto-fill: Jean Morel, tax collector, at Troyes; Pierre Lenoir, judge, at Rouen. 50 gold."), and a post it could not fill for want of gold as one line too, at most once a year. [F-157]

#### How the player uses it: filling, replacing and dismissing
- PROV-348: Where: the Officials tab opens with the *Auto-fill posts* switch (on or off, one line on what it does and the gold it keeps back); under Empty posts, a *Fill all · N gold* button fills every empty post at once by PROV-342's choices and price, whatever the switch, until the gold runs out. An empty post's screen opens with the best fit and its reason as one *Hire · 25 gold* button (*Foreign · 50 gold* when no one at home knows the type), above the officials who could move in and the full list of types. An official's screen has, above Command, *Replace with* the best fit (when it is another type) and *Dismiss*. [F-157; X-19; PROV-336, PROV-306]
- PROV-349: Grouping: auto-fill and Fill all sit with the empty posts they fill on the Officials tab; replacing and dismissing sit on the official's own screen with moving and commissioning, so everything about one post stays on one screen (PROV-337). [F-157; X-19]
- PROV-350: Overview: the Officials tab says whether auto-fill is on and counts the empty posts with what filling them all would cost; the Officials pillar of Stability (REALM-201) stays the at-a-glance view on the General tab. [F-157; X-19; PROV-338]
- PROV-351: Phone: in landscape the switch, Fill all, the best-fit button, Replace and Dismiss fit the side panel in the Wide and Tall layouts and the bottom sheet in portrait; each is at least 44 points tall and says in words what it does and costs, and nothing needs hover. Dismiss asks once more in place (the button turns into *Dismiss him? Yes*) so a stray tap does not lose an official. [F-157; X-19; PROV-339]

### Land in the game (feedback 80 and 87, 17 October 2026)
- PROV-310: Until the land's tile changes are played, each province shall lay out its 4 to 16 tiles from the map: the count from its size (the smallest 4, the largest 16, on a log scale between the 5th and 95th percentile of province sizes), one Town tile, 1 to 3 Shore tiles on a coast (more with more seafolk), and the rest shared out by the share of each use in the ground of the map squares under it. [PROV-010, PROV-011, PROV-018, D-PROV-25]
- PROV-311: A land building shall stand in the province, take one of its building slots like every other building, and work all the province's tiles of its use: a farm the fields, a ranch the pasture, a fishery the shore, a lumber camp the woods, a quarry rocky waste. Each such tile holds the building's job slots (times the slot scale), and the building needs at least one tile of its use. [Leroy 17 Oct; D-PROV-25]
- PROV-312: The food a class grows shall be its workers in the job slots of its tiles at its building's rate (a farm by step 1.1, 1.3, 1.5; ranch and fishery 1.33) times the ground's building output, and everyone else at 0.67 times the ground's people output (bare land); with no building, every worker is on bare land. [PROV-080, PROV-081, feedback 80]
- PROV-313: In 1444 each province's own ways of working the land shall make up whatever its buildings leave short of 110 % of its people's food in a normal year, up to three times, and stay fixed after; growth past that needs better buildings. [feedback 80; D-PROV-25]
- PROV-314: Where: the province card's Land tab shows the tiles as a grid of squares coloured by use, each naming the building that works it; tapping one opens a sheet under the grid with who works it, what it feeds or gives a year, and the building that would work it better with its Build button or why not. [X-19]
- PROV-315: Grouping and overview: the Land tab opens with the land's food against the province's people in a normal year as a share, in warning colours under 100 %; the realm's Provinces list stays the overview of food across the realm. [X-19]
- PROV-316: Phone: in landscape the tiles are at least 44 points each way in the Wide and Tall layouts, the sheet sits under the grid in the side panel, and nothing needs hover. [X-19]

### Hunting in the game (feedback 81, 17 October 2026)
- PROV-317: Woodsmen shall hunt and gather in the province's woods: the woods tiles hold a hunting lodge's job slots each (times the slot scale) at 0.67 times the ground's people output times how rich its game is (1.3 in boreal forest north of 55° and in tundra, 1.1 in other forest, 1.0 in jungle, 0.9 in thin woods) times the game left; woodsmen past that room scrape a living at half the bare rate. [PROV-080, feedback 81, D-PROV-26]
- PROV-318: A hunting lodge shall stand in the province, take one building slot and need a woods tile; it makes the hunters in the woods' room bring in half as much again (1.0 against 0.67), and gives furs in the northern woods. [PROV-311, feedback 81]
- PROV-319: Each January the game shall move a fifth of the way toward what the hunting leaves: full while the hunters fit the woods' room, 0.35 less for each room's worth of hunters past it, never under 0.3; in 1444 it starts where the hunting of that year leaves it. Fewer woods tiles (cleared for fields) crowd the same hunters and so thin the game. [feedback 81, D-PROV-26]
- PROV-320: Each January each weather region north of 45° shall roll for a hard winter (one year in 8, one in 5 north of 55° or on tundra); hunting in a hard winter brings in 0.6 of a normal year. Hunting rolls no harvest. The roll comes from the game's seed, the year and the region, apart from the game's other dice, so a hard winter never changes what else happens that turn. [feedback 81, D-PROV-26]
- PROV-321: Where: the woods tile's sheet on the province's Land tab shows the game left (plenty, thinning or scarce, with the reason) and a hard winter when there is one, and offers both a hunting lodge and a lumber camp, each with its Build button or why not; the Build tab lists the lodge with the other works. [X-19]
- PROV-322: Grouping and overview: hunting sits with the other food on the Land tab and counts in its food line; the realm's Provinces list stays the overview of food across the realm. Phone: as PROV-316, with one 44-point button per building on the sheet. [X-19]

### Changing a tile's use in the game (feedback 86, 17 October 2026)
- PROV-323: The crown shall change a tile of a royal province: clear woods into fields (3 years), turn fields to pasture (a season), plough pasture into fields (a season), drain marsh into fields (3 years, *Polder drainage*) and irrigate waste into fields on drylands, desert or savanna (2 years, *Qanat and canal irrigation*). The gold is the data's (30, 5, 10, 60, 60) times the gold scale and the ground's build cost, paid at the start; stopping gives half back. The ground never changes. [PROV-012, PROV-015 to PROV-017, feedback 86, D-PROV-27]
- PROV-324: A province shall change one tile at a time, the last tile of the use; a change stops if the province is lost or the tile's use changes otherwise. [feedback 86]
- PROV-325: Lords and the AI shall change tiles by rule: each January a province that does not feed its people in a normal year, and changes nothing yet, starts the first of drain, irrigate, then clear woods (keeping one woods tile) it can, the AI keeping its gold reserve, a lord at his own cost. The player decides only for royal provinces. [feedback 86, D-PROV-27]
- PROV-326: Where: tapping a tile on the province's Land tab shows under its sheet the one to three changes that fit it, each a 44-point button with what it becomes, its gold and time, or why not (another change under way, the invention it needs by name, its lord, the gold); a tile being changed shows "→ Fields" on the grid and in its sheet the time left with a bar and Stop. [X-19]
- PROV-327: Overview: the realm's Provinces list has a "Short of food" view listing only the provinces whose land feeds under all their people in a normal year, each with its share and the fix the Land tab offers first (build or improve the farm, clear the woods, drain, irrigate, or bring food in from a castle); a row opens that province's Land tab. Phone: as PROV-316. [X-19, feedback 86]

### Mines and saltworks in the game (feedback 87, 18 October 2026)
- PROV-328: A province in hills or mountains with a waste tile may hold an ore deposit: one ware (iron, copper, tin, silver, gold or rock salt) and its years of digging left (40 to 160). About a third of such provinces hold one, found by a fixed roll per province so every game has the same geology; the map's famous mines of 1444 (Kutná Hora's silver in Středočeský, Falun's copper in Dalarna) hold theirs whatever the ground, with a waste tile for the mine. [PROV-065, feedback 87, D-PROV-29]
- PROV-329: A mine shall stand in the province, take one building slot and need rough waste, an ore deposit and timber in reach (a lumber camp in the province or in a neighbouring province of the same realm). It gives work for 6,000 miners, its ware, and trade as a lumber camp does; silver and gold three times as much. The map's famous mines and mines in rich provinces (wealth 5 or more) stand in 1444. [PROV-064, PROV-067, feedback 87]
- PROV-330: Each January every mine shall dig a year off its ore deposit; when the deposit runs out the mine closes and the owner hears of it. Prospecting events and mining inventions that find new ore deposits come later. [PROV-065, PROV-066, feedback 87]
- PROV-331: Saltworks shall stand in a province with a shore tile on a dry or warm coast (drylands, desert or savanna, or below 42° of latitude); they give work for 1,500 miners, salt and trade as a lumber camp does. [feedback 87]
- PROV-332: Where: the waste tile's sheet on the Land tab shows the ore deposit and its years left (or none found) and offers the mine with its Build button or why not (no ore deposit, no timber in reach); the shore tile's sheet offers saltworks beside the fishery. Grouping and overview: mines and saltworks sit with the other land on the Land tab; the Build tab lists them with the other works. Phone: as PROV-316. [X-19]

### Land and health in the game (18 October 2026)
- PROV-333: Each January a province whose farmers outnumber what its fields hold shall count a year of overwork, and after 30 years in a row one fields tile wears (half its food), one tile at a time; each of *Three-field rotation*, *Fodder crops* and *Four-field rotation* its owner knows makes that half as long again. Farmers fill the sound fields first, so a worn tile the sound fields can spare rests, and after 5 years of rest it is sound again. [PROV-034, PROV-035, D-PROV-31]
- PROV-334: Each province shall have a fever land step from its ground (jungle harsh, marsh and savanna mild), a step worse in the tropics (within 23.5° of the equator) and for every two marsh tiles, and a step better for each of quinine and sanitation its owner knows, never below none. People born elsewhere die there at an extra 5, 15 or 30 % a year (mild, harsh, deadly); locals at a tenth of that. Warfare can read the same rate for armies. [PROV-102, PROV-243, D-PROV-32]
- PROV-335: Where: worn fields show on the province's Land tab as a faded, striped fields square marked "worn"; its sheet says it gives half, why, and how many of its 5 years of rest have passed. Overworked fields that have not worn yet say so on their sheet, with the years so far and the year they wear. Fever land shows as a line under the land's food line ("Harsh fever land", what it does to people from elsewhere, and what sets and lowers it), in warning colours from harsh up. [X-19]
- PROV-336: Grouping and overview: wearing and fever land sit with the rest of the land on the Land tab; worn fields count at half in its food line, and the realm's Provinces list (Short of food) stays the overview of food across the realm. Phone: as PROV-316: the worn mark is text and stripes, not colour alone or hover, and the fever line wraps in the side panel in the Wide and Tall layouts. [X-19]

### 5.19 Lords in the province
- PROV-200: A lord shall always hold at least one province; someone with no land is a courtier. [§10.3]
- PROV-201: When a lord loses his last province, he shall stop being a lord: he stays at court as a courtier who can be granted land again, or, if he lost it to you by force, he flees abroad and becomes a pretender to it. [§10.3]
- PROV-202: A lord shall hire and pay his own officials, with types, from his wealth; they run his provinces and give their type effects there. [§10.3]
- PROV-203: If a lord's province has none of his officials, then it shall pay him half and have *Ungoverned*. [§10.3]
- PROV-204: When the player lends a lord one of his officials, it shall cost the player's wage and win the lord's loyalty; the official works for the lord until called back. [§10.3]
- PROV-205: A lord shall spend his own wealth on buildings in his lands by his traits: Builder the most, Greedy markets and mines, Pious houses of worship, Warlike castles. [§10.3]
- PROV-206: When the player pays for a building in a lord's province, the building shall be the lord's and his loyalty shall rise one step, unless he is in revolt. [§10.3]
- PROV-207: When a lord's land comes back to the ruler, its buildings shall come with it. [§10.3]

### 5.20 Charters
- PROV-210: The ruler may grant a charter to one province or town: market charter, tax cap, town law, no quartering, faith tolerance, free trade, mining right, each with the gain and cost in the charters table. [§10.4]
- PROV-211: Charters shall be gained by granting, by lords and towns demanding them for loyalty or a loan, or by rebels forcing them. [§10.4]
- PROV-212: When a charter is revoked, the province shall get *Broken charter* for 20 years, and every lord notices. [§10.4, §12.1]
- PROV-213: When the province is lost, the conqueror may keep or revoke its charters. [§10.4]
- PROV-214: Under town law, the town shall need no official, and nothing may be seized there without breaking the charter. [§10.4]
- PROV-215: Under a mining right, a merchant house shall run the mine for half its output, digging faster and finding new ore deposits. [§10.4]

### 5.21 Defence
- PROV-220: The castle shall be none, earthwork ring fort, stone castle, bastion fort or star fort; gained by building or upgrading (gold × build cost, and years) or conquest; lost by siege, demolition in a peace, or one step per 10 years without upkeep. [§11]
- PROV-221: An enemy shall have to besiege the castle to take the province; on hills or mountains it is far harder to take; on a shore tile it can be supplied by sea. [§11]
- PROV-222: Walls shall be whole or have 1 to 3 breaches; repaired with gold and months; breached by siege guns, mining and earthquakes; each breach shortens a siege and allows an assault. [§11]
- PROV-223: The garrison shall be soldiers inside counted from the army; if a castle has no garrison, it falls at once. [§11]

### 5.22 Grievances and rebels
- PROV-230: The province shall keep a list of named grievances, each with the start and end conditions of the grievance table. [§12.1]
- PROV-231: With 0–1 grievances the province shall be calm; with 2 grumbling (growth slows, scholars and craftsmen start to leave); with 3 riots (tax and recruits halved, traders avoid it, the lord wavers); with 4 or more the province is *Plotting* (PROV-232). [§12.1] (D-PROV-2)
- PROV-232: While a province has 4 or more grievances it shall be *Plotting*, rising with a monthly chance of 5 %, 15 % or 30 % at 4, 5 or 6+ grievances (a spark can start a rising at 3); a rising's men come from the province's recruit pool under a named leader, with a demand from its biggest grievance. [§12.1, rebellions §2.1, X-9, D-PROV-2]
- PROV-233: Rebels shall be gained from four or more grievances, a disloyal lord raising his retinue, a pretender landing, or foreign gold, and lost by beating them, granting their demand, fixing grievances, or killing or bribing their leader. [§12.1]
- PROV-234: Rebel armies shall fight as the *Rebel band* kind under the warfare battle rules. [§12.1]
- PROV-235: A province with riots or rebels shall count toward the country's In revolt. [§12.1, §13]
- PROV-236: Under a judge official, riots shall need one grievance more (4 instead of 3), *Plotting* still starts at 4, and *Broken charter* shall fade twice as fast. [§10.2, D-PROV-2]

### 5.23 Health and land condition
- PROV-240: Plague shall have the steps none, rumour, outbreak, burning out; it spreads with traders along roads, rivers and sea routes, with armies and refugees; crowded towns catch it first. [§12.2]
- PROV-241: Plague shall burn out after a season or two; quarantine (the player closes the province) stops trade; hospitals, wells and drains slow it. [§12.2]
- PROV-242: Plague shall kill townsfolk first, then countryfolk, and buildings go fallow. [§12.2]
- PROV-243: Fever land shall be none, mild, harsh or deadly, set by ground and climate, with marsh tiles adding to it; lowered by draining marsh and later inventions (quinine, sanitation); soldiers and settlers from elsewhere die there, locals mostly don't. [§12.2]
- PROV-244: From era V, factories and coal mines shall make smoke; townsfolk get sick and tiles become worn; closing them and later inventions reduce it; smoke feeds the event tree's climate stats. [§12.2]

### Plague in the game (Leroy, 18 October 2026)
*Leroy:* "provinces can be sick, a disease can break out, just like in history, like the Black Plague." The game runs PROV-240 to PROV-242 as below (`packages/engine/src/plague.ts`). Every number is provisional (`province.plague.*`, listed in `_provisional`), set so that plague recurs in a region about once a decade, as it did from 1378 to the 1450s, and a large realm sees an outbreak somewhere in its land every few years, not every few months. A province's **crowding** is its townsfolk share over 10 % (`plague.crowd_town_share`), kept between 0.5 and 3. Hospitals, wells and drains, refugees carrying plague and buildings going fallow are not in the game yet: they come with those buildings and with refugees.

- PROV-352: Once a month, on the first plague week, each province a realm holds shall roll a yearly chance of `plague.start_chance_year` (0.3 %) that plague breaks out there, times its crowding and twice that in shanty camps (PROV-123). Land no realm holds has scattered folk and no towns: plague neither starts nor spreads there. [PROV-240, PROV-123]
- PROV-353: Each plague week (days 7, 14, 21 and 28, D-PROV-4), plague shall spread from every province in outbreak: to each land province next door at `plague.spread_week` (4 %), half as much again along a river both share (`plague.river_factor`), and by ship to every other coast of each sea zone it touches at `plague.sea_spread_week` (0.15 %). Each chance is multiplied by the target's crowding, doubled in shanty camps, and cut to a quarter (`plague.into_quarantine_factor`) when the target is closed. A closed province sends nothing out by road, river or sea. A province already sick, or spared, cannot catch it. [PROV-240, PROV-241]
- PROV-354: An army standing in a province in outbreak on a plague week shall carry plague for `plague.army_carry_weeks` (4) plague weeks, and on each of them may bring it to the province it stands in at `plague.army_spread_week` (15 %), by that province's crowding as above. Quarantine does not stop an army. [PROV-240]
- PROV-355: A province that catches plague shall go through rumour for `plague.rumour_weeks` (4) plague weeks, outbreak for a season or two (`plague.outbreak_seasons`, rolled, `plague.weeks_per_season` 12 plague weeks each) and burning out for `plague.burning_out_weeks` (4), then have no plague and be spared for `plague.spared_years` (12) years: its survivors don't catch it again soon. [PROV-240, PROV-241]
- PROV-356: Each plague week a sick province shall lose a 48th of the yearly plague death rate of PROV-102 (+5 % at rumour and burning out, +15 % in outbreak, +30 % in outbreak in shanty camps). The dead come from the townsfolk first, at most `plague.town_week_share_max` (2 %) of each town class a week, and the rest from the countryfolk by their shares. While sick its births fall by a point (PROV-101), and while it is in outbreak it has the *Plague* grievance. [PROV-101, PROV-102, PROV-242]
- PROV-357: The owner of a land province shall be able to close it (QuarantineProvince), sick or healthy, and to open it again, at no gold cost. While it is closed its trade ratio is 0 and no trader trades there (TRADE-040), it pays `plague.quarantine_tax_factor` (half) of its tax, nothing spreads out of it by trade, and plague gets in at a quarter of the chance. It stays closed until the owner lifts the quarantine; after that its trade ratio grows back as traders return. [PROV-241]
- PROV-358: An AI realm shall close a province of its own when an outbreak begins there and the province is a crowded town (crowding 1 or more), and open it again when the plague is gone; it leaves its countryside open, where closing costs more than it saves. [PROV-241]
- PROV-359: The player shall hear once when plague reaches a province of theirs, saying how it came (broke out there, along a road, down a river, by ship from a named province, with an army), and once when it burns out there, with its dead; closing and lifting a quarantine each say what it costs. [X-19]
- PROV-360: Plague is part of the save: each sick province's step, weeks left and dead, the closed provinces, the spared ones with the day their plague ended, the armies carrying it, and plague's own seeded draws, which never shift any other roll of the game. A save from before plague loads with no plague and no province closed. [SAVE, X-25]

#### How the player uses it: plague
- PROV-361: Where: the player taps a sick province on the map, marked at Region zoom by a pale door with the plague cross (barred with a plank while it is closed, VIEW-011, VIEW-128); its Overview tab opens with a plague card under the siege view: the step in words with about how long it lasts yet, the dead so far ("townsfolk first"), whether it is closed and what that costs, and, on the player's own province, one full-width button, **Quarantine** or **Lift quarantine**, that spells out its cost under its label. A healthy province of the player's shows the card only while it is closed or plague is next door, so it can be closed before plague arrives. [X-19]
- PROV-362: Grouping and overview: everything about a province's plague sits on that one card. The realm's Provinces tab counts the sick and closed provinces in a line at the top, its **Sick** tab (beside Short of food, with the count) lists them worst first, each row saying the step, the dead and whether it is closed, and the Lands tile of the realm's Overview says "Plague in N provinces" and opens the Provinces tab. The *Plague* grievance shows in the province's mood line. [X-19]
- PROV-363: Phone: the card fits the side panel in landscape in the Wide and Tall layouts and the bottom sheet in portrait, within the safe areas; the button is at least 44 points tall and full width, the Sick tab wraps with the other tabs (F-111), every state is written in words (never colour alone), and nothing needs hover. [X-19]

### 5.24 Colonies and the people already there
- PROV-250: A colony shall be founded only in a province no country owns; land held by any country, tribal countries included, can only be gained by war, treaty, marriage or a lord joining. [§12.3]
- PROV-251: A colony shall take only the free tiles (nobody works them); tiles the local people work stay theirs. [§12.3]
- PROV-252: Settlement shall be none, trading post, settlement or colony; gained by founding a colony (exploration), founding a post (envoy and gold), settlers arriving, or a treaty; lost by the local people driving it out, disease, abandoning it, or another power taking it. [§12.3, exploration §5]
- PROV-253: A trading post shall be a market that draws traders without taking any tile. [§12.3]
- PROV-254: Settlers shall be sent from provinces with homeless people, live on the colony's free tiles, and stop the colony growing when the free tiles are full; they are lost to fever land, war with the local people, and leaving. [§12.3]
- PROV-255: The local people shall keep their own tiles, buildings and lords; their tiles are taken only by conquest or treaty once the province is owned, and each tile taken adds grievances and starts resistance events. [§12.3]

### 5.25 Aggregation to the country card
- PROV-260: The province shall supply the country card's sums as in the aggregation table: gold income, people (people + refugees), recruits (royal provinces only), food, horses, ships, castles, faith and language, in revolt, schools/students/scholars, officials. [§13] (gold income: D-PROV-1)

### 5.26 Event-tree mapping
- PROV-270: When an event changes an event-tree province stat, the province shall apply it as the concrete change in the mapping table (§15), e.g. population −10 % → people −10 % (townsfolk first in plague events); devastation +30 → 30 % of tiles burned; prosperity +2 → two new fitting buildings; unrest +20 → one named grievance; fort_level +1 → castle one step up. [§15]

### 5.27 Starting values (rules)
- PROV-280: At the start the province shall set tile count from map size, ground from terrain, tile mix from ground, shore tiles from coast and rivers, people from population, and how many buildings start built (and town size) from wealth. [§16]
- PROV-281: At the start the catalogue shall set owner, lords' provinces, homeland, faith and language mix, and `administrative_capacity` decides how many royal provinces start with an official. [§16]
- PROV-282: At the start the research tree's start inventions shall decide which buildings, castle steps and road steps exist; region tables set wares by ground, fever land and crops; event-tree geography anchors fix mines, toll points, castles and markets at named places; the relations file sets trade pacts, occupations and pretenders. [§16]
- PROV-283: Once buildings are placed, `wealth` shall stop being a live stat. [§16]

### 5.28 Storage and cadence
- PROV-290: The province shall store only the stored fields of §17 (about 95 small numbers) and work out food made, wares made, tax owed and reaching you, town size and country sums when needed. [§17]
- PROV-291: Births, deaths and overflow shall update each month; food each season; plague each week (days 7, 14, 21 and 28) while an outbreak runs. [§17, X-3, D-PROV-4]
- PROV-292: The province card shall show the province's name, owner, governance, official, pretender, ground, tile row and the lines of §1, and tapping a line opens its gain and lose list. [§1]

### 5.29 Decided rules (17 October 2026)
- PROV-293: Tax owed shall be paid a twelfth each month; each day of travel beyond 5 loses 5 %; a tax collector's +20 % makes up losses, but what reaches you never exceeds what is owed. [D-PROV-10, D-PROV-22]
- PROV-294: A province shall have 4 to 16 tiles by its land area rank on the map; town sizes start at village 1,000, market town 3,000, town 8,000, city 20,000 and great city 40,000 townsfolk, with a second town tile at 40,000 and a third at 100,000. [D-PROV-11]
- PROV-295: Each harvest step shall move the harvest roll one band better, with bumper the top; steps add up. [D-PROV-14]
- PROV-296: Each class except clergy and scholars shall give 1 % of its people a year as recruits; 2 % of the homeless a year drift to free slots elsewhere; refugees settle after 2 years. [D-PROV-17]
- PROV-297: Birth and death modifiers shall be percentage points on the class's yearly rate. [D-PROV-8]
- PROV-298: Land of stateless peoples shall count as unowned for colonies; trading post, settlement and colony shall be the Outpost, Settled and Self-governing stages. [D-PROV-7]
- PROV-299: An official shall learn a province in 5 years among his own language, 7 among a related one and 10 among a foreign one. [culture, D-PROV-13]
- PROV-300: A lord's province without his official shall give him half its tax and half its recruits. [D-PROV-23]
- PROV-301: Armies shall lose a share of men a month to sickness: Low 0 %, Medium 1 %, High 2 %, Heat 2 %, Cold 2 %; fever land counts as High. [D-PROV-15]

### Playtest feedback (17 October 2026)
Leroy's playtest feedback (DECISIONS.md, F-1 to F-22). It is the latest decision, so it replaces the requirements it names.

- PROV-302: The province card shall have a Garrison tab listing the troops in the province without a commander (by thousand, arm and drill), the levies still gathering with the days left, and the commanders present who can pick them up. [F-17; recruiting RECR-107]

#### How the player uses it: the Garrison tab
- PROV-333: Where: the player taps one of their provinces on the map and then Garrison, the third tab of the province card; each row of the Military tab's recruit list opens the same tab. [F-17; X-19]
- PROV-334: Grouping: the tab holds, top to bottom, Recruit (the button and the queue with days left, RECR-116 to RECR-121), then Troops without a commander (men, their arms and drill, and per row the pick-up, Lead and Send home buttons), then a line naming the commanders standing there, or saying none is free. Only the realm that owns the troops sees them. [F-17; X-19]
- PROV-335: Overview: the Military tab of the country card lists every province with men gathering and when all will be in, and opens its Garrison tab. [F-17; X-19]
- PROV-336: Phone: in landscape the tab fits the side panel in the Wide and Tall layouts, each button is at least 44 points high and each queue row 48, and nothing needs hover. [F-17; X-19]

## 6. Commands

| Command | Who issues it | Preconditions | Result | Events emitted |
|---|---|---|---|---|
| SetProvinceTaxRate(province, rate) | player / AI | Owner; no tax cap charter above light | Rate set; heavy/crushing adds *Heavy taxes*; lord wavers if heavy | TaxRateChanged, GrievanceStarted |
| SetRealmTaxDefault(rate) | player / AI | — | Default for provinces without override | TaxRateChanged |
| ApplyTaxPreset(preset) | player / AI | — | All rates filled | TaxRateChanged |
| SetToll(tollPoint, none/low/high) | player / AI | Owns the toll point; no free-trade charter | Toll rate set | TollChanged |
| ChangeTileUse(tile, newUse) | player / AI | Allowed transition (clear woods, fields↔pasture, drain marsh, irrigate waste) and unlock known | Use changes after its time | TileUseChanged |
| BurnOwnFields(province) | player / AI | Owner | Tiles Burned (scorched earth) | TileBurned |
| RebuildBurnedTile(tile, gold) | player / AI | Tile Burned | Faster rebuild | TileRebuilt |
| AssignOfficial(official, province) | player / AI | Official free, or serving in another royal province of the realm; province royal or seat, not a lord's | Governed by official; years served 0; an official already there takes the mover's old post (both start at half), else the old post stands empty (PROV-303) | OfficialAssigned, GrievanceEnded |
| HireOfficial(province, type, foreign) | player | Royal province of the realm, post empty, not a lord's; a native hire's type serves in another royal post of the realm; gold ≥ price | Official of that type in post, years served 0; price paid (PROV-333, PROV-334) | OfficialHired |
| DismissOfficial(province, hire?) | player | Royal province of the realm with an official, not a lord's; with hire, that hire's preconditions | Post empty, or filled by the new hire at half his effect (PROV-345) | OfficialDismissed, OfficialHired |
| SetAutoFill(on) | player | — | The realm fills its own empty posts each month, or not (PROV-342) | — |
| FillPosts | player | Empty royal posts; gold | Each empty post filled by its best fit until the gold runs out (PROV-348) | OfficialHired |
| HireOfficial(type) | player / AI | Gold; colonial governor needs a slot | New official | OfficialHired |
| LendOfficialToLord(official, lord) / RecallLentOfficial | player / AI | Official free / lent | Works for the lord; loyalty up | OfficialLent / OfficialRecalled |
| PayForBuildingInLordProvince(lord, tile, building) | player / AI | Lord not in revolt for the loyalty step | Lord owns building; loyalty +1 step | BuildingFunded |
| GrantCharter(province, kind) / RevokeCharter | player / AI | Owner | Charter in force / *Broken charter* 20 years | CharterGranted / CharterRevoked |
| BuildRoad(province, step) | player / AI | Invention known; gold | Road one step up | RoadBuilt |
| QuarantineProvince(province, on/off) | player / AI | Owner; land; not already in that state | Trade ratio 0, half tax, nothing spreads out by trade, a quarter of the chance in (PROV-357); stays until lifted | QuarantineChanged |
| AssignGarrison(castle, soldiers) | player / AI | Own soldiers present | Garrison set | GarrisonChanged |
| RepairWalls(castle) | player / AI | Breaches; gold | Breach removed after months | WallsRepaired |
| SendSettlers(from, to, count) | player / AI | Homeless in source; free tiles in colony or frontier | Settlers arrive | SettlersSent |

## 7. Domain events

| Event | When | Payload | Consumed by |
|---|---|---|---|
| HarvestRolled | Each harvest | province, roll | realm (food year), events |
| FamineStruck | Season with too little food | province, dead, fled | realm, rebellions, events |
| RefugeesFled | Famine, war, persecution | from, to, count, classes | province (receiver), culture, religion |
| PeopleChanged | Monthly births/deaths | province, per class | realm, recruiting |
| BecameHomeless / HomelessShareCrossed | Overflow with no slot; threshold 5/10/20 % | province, share | rebellions |
| TileBurned / TileRebuilt / TileStateChanged | State changes | province, tile, state | warfare, map-presentation, buildings |
| TileUseChanged | Use changes | province, tile, from, to | buildings, map-presentation |
| MineExhausted | Ore deposit reaches 0 | province, mine | buildings, trade |
| TaxCollected | Tax paid | province, owed, reached | realm |
| TaxRateChanged / TollChanged | Command | province, rate | realm, trade |
| GrievanceStarted / GrievanceEnded | Conditions met/lost | province, grievance | rebellions, realm (lord loyalty), revolutions |
| RiotsBegan / RebelsMustered | 3 / 4+ grievances | province, cause, leader | rebellions, warfare, realm |
| OfficialAssigned / OfficialDismissed / OfficialHired / OfficialLent | Commands | official, province, type | realm, government |
| LordLostLastProvince | Lord has no land | lord, cause | realm |
| CharterGranted / CharterRevoked | Commands | province, charter | realm (lords notice), rebellions |
| ProvinceOwnerChanged | Conquest, cession, defection, colony | province, from, to | realm, diplomacy, subjects |
| ProvinceOccupied / ProvinceLiberated | Enemy holds castle / peace or retake | province, occupier | realm, warfare |
| PlagueStageChanged | Plague step | province, step | events, trade |
| CastleStepChanged / WallsBreached | Build, siege, neglect | province, step | warfare |
| SettlementChanged | Settlement step | province, step | subjects, exploration |

## 8. Policies (reactions to other contexts)

- When warfare reports an army foraging or looting, then burn tiles beyond the foraging limit and make their workers refugees or dead.
- When warfare reports an army requisitioning food from a province's store, then start *Requisitioned* for a season after the last taking.
- When an army stays more than a season, then start *Soldiers quartered*, unless a no-quartering charter.
- When warfare reports a castle taken or a province with no castle held for a season, then mark the province occupied.
- When warfare reports a sack, then apply its loss of town buildings and townsfolk (warfare 8.5).
- When realm's food year delivers castle food or the local store changes, then use it in the seasonal famine check.
- When realm grants a fief, then set governed by to the lord and drop the need for a royal official.
- When realm reports a lord's line dying out, then return his provinces to royal (his officials may enter your service).
- When research reports an invention known, then unlock its buildings, tile changes, harvest steps, road and castle steps.
- When exploration reports a colony founded, then set the province's owner, settlement *settlement*, the governor as its official, and put left-over colony food into the store.
- When government reports an official over the cap, then add *Grasping officials* (not yet in the province grievance table: D-PROV-6).
- When rebellions reports a rising, then count the province as in revolt.
- When events apply a province effect, then translate it by the §15 mapping.
- When diplomacy sends an official as envoy, then his province pays half until he returns (country stats 9).

## 9. Monthly step

A turn is one week (X-18). The steps below are monthly: they run once, in the turn in which a new month begins.

Reads first: realm's food policy and castle deliveries, owner and war state, inventions known, armies present (warfare/troop-movement).
1. Births and deaths per class (monthly share of the yearly rates and modifiers).
2. Overflow into least-filled slots; homeless take open slots; a share of homeless drift to neighbours.
3. Rebels: a province with 4 or more grievances is Plotting and rolls to rise (D-PROV-2).
4. Sickness for armies staying in the province.
5. Occupation months advance.
6. Grievance evaluation (start/end), then calm/grumbling/riots/rebels.
Each season: food check and famine (§6.2); store rot (realm); *Hungry*, *Requisitioned*, *Soldiers quartered* timers.
Each autumn (and twice for rice): harvest roll (realm food year).
Each year: recruits refill; tax owed; years held, official years served; burned tile rebuild; worn tile checks (overwork wears, rest recovers); mine seams fall; upkeep and neglect (buildings); woods regrowth after 10 unworked years; refugees settle after 2 years.
Each plague week (days 7, 14, 21, 28; D-PROV-4): the sick provinces move on a week and lose their dead, plague spreads from each outbreak to its neighbours and with armies, and on the first plague week of the month new outbreaks are rolled (PROV-352 to PROV-356). Only the sick provinces are visited, except for the monthly roll.

## 10. Configuration

All values are placeholders ("Numbers are placeholders for config", province-stats intro). The design names one
province config file but no file name or keys; keys below are proposed by this spec (D-PROV-20).

| Key | Meaning | Value in the design | Placeholder? | Config file |
|---|---|---|---|---|
| province.tiles.min / max | Tile count range by map size | 4 / 16 | yes | province config |
| province.shore_tiles | Shore tiles on coast/lake/river | 1 to 3 | yes | province config |
| province.clear_woods.years | Years to clear woods | 3 | yes | province config |
| province.fields_to_woods.years | Unworked years before fields become woods | 10 | yes | province config |
| province.castle_ruin.waste_years | Years a destroyed castle tile stays waste | 5 | yes | province config |
| province.town.second_tile_townsfolk | Townsfolk for the second town tile | 40,000 | yes | province config |
| province.worn.recovery_years | Years without use to clear Worn | 5 | yes | province config |
| province.worn.overwork_years, rotation_stretch | Years of overwork that wear a fields tile; stretch per rotation invention | 30; ×1.5 (D-PROV-31) | yes | province config |
| province.woods | Timber loads a woods tile regrows a year; years lost woods take to grow back | 1; 10 (D-PROV-30) | yes | province config |
| province.fever_land | Steps by ground, tropics, marsh tiles; deaths for people born elsewhere; locals' share | jungle 2, marsh 1, savanna 1, +1 tropics, +1 per 2 marsh; 5/15/30 %; 0.1 (D-PROV-32) | yes | province config |
| province.tax.owed | Gold per 1,000 building workers and townsfolk; rate factors | 0.12; 0.5; 0, ½, 1, 1½, 2 (D-PROV-33) | yes | province config |
| province.roads.travel | Winter, enemy army and broken road factors | ×1.5; ×2; ×2 (D-PROV-34) | yes | province config |
| province.ground.start_mix | Share of each tile use in a square of each ground at the start | grassland pasture 0.55 (PROV-024, D-PROV-25) | yes | province config |
| province.burned.rebuild_per_year | Burned tiles rebuilt a year in peace | 1 | yes | province config |
| province.ground.troops | Foot, horse, guns, defender, days to cross, foraging, sickness per ground | farmland 0/+10/0/0/1/Rich/Low; grassland 0/+25/0/−10/1/Fair/Low; savanna 0/+15/0/0/1/Fair/Medium; drylands 0/+10/0/0/1.5/Poor/Low; desert −10/−10 (camels 0)/−10/+10/2/Almost none/Heat; hills +10/−15/−10/+15/1.5/Fair/Low; mountains 0/−40/−30/+30/3/Poor/Cold; forest 0/−25/−20/+15/2/Fair/Low; jungle −10/−40/−30/+25/3/Poor/High; marsh −10/−30/−30/+20/3/Poor/High; tundra 0/−10/−10/+10/2/Almost none/Cold | yes | province config |
| province.river_crossing_penalty | Attacker over a river without bridge | −20 % | yes | province config |
| province.woods_ambush | Defender per two woods tiles / cap | +5 % / +15 % | yes | province config |
| province.locals_rough_bonus | Homeland defender in rough ground | +10 % | yes | province config |
| province.ground.economy | Build cost / building output / people output per ground | farmland 100/+25/100; grassland 100/100/+50 herding; savanna 100/100/+25 herding; drylands 125/−25 until irrigated/100; desert 150/−50 except mines and irrigation/100 herding and caravans; hills 125/100 (mines +25)/100; mountains 200/−50 farms, +50 mines/−25; forest 150/100 (lumber +50)/+25 hunting and gathering; jungle 200/−25/+25 gathering; marsh 200/−50 until drained/+25 fishing; tundra 150/−50/100 herding | yes | province config |
| province.buildings.slots | Job slots per building | farm 12,000; rice paddy 18,000; terrace 12,000; raised fields 12,000; plantation 12,000; ranch 3,000; horse stud 3,000; lumber camp 1,500; mine 6,000; irrigation works 1,500; fishery 3,000; saltworks 1,500; harbour 1,500; shipyard 3,000; bridge 0; loom house 1,500; forge 1,500; kiln 1,500; tannery 1,500; press 900; brewery/winery 900; market 1,500; caravanserai/warehouse 900; house of worship 600; seat 300 + official; almshouse 600; powder mill 900; hospital/wells/drains 600; factory 6,000; rail station 600 | yes | province config / buildings config |
| province.buildings.land | Tile, needs and unlock per land building | farm: fields, known at start; mill: +25 % gold, F5; rice paddy: fields on wet ground or by a shore, needs shore tile or irrigation, F2; terrace: fields on hills or mountains, F2 or Andean terraces; raised fields: marsh, F6; plantation: fields on tropical ground, F10 (no forced-labour bonus); ranch: pasture, start; horse stud: pasture, F11; lumber camp: woods, start; mine: waste, hills or mountains with an ore deposit, needs timber, start, deeper by research; irrigation works: waste or drylands fields, F3; fishery: shore, start, more with F4; saltworks: shore on dry or warm coast, start; harbour: shore, start; shipyard: shore with a harbour, needs timber, start; bridge: shore on a river, start; castle: castle tile, B4/B1/B5/B6; granary: start, bigger with F7 | yes | province config / buildings config |
| province.buildings.town | Needs per town building | loom house: raw ware; forge: iron; kiln: clay; tannery: hides; press: paper and printing; brewery/winery: grain or grapes; market: market charter for the fair (weekly market → yearly fair → trading house); caravanserai/warehouse: a road; school: market town or bigger; seat: town or bigger; almshouse: gold upkeep; powder mill: saltpetre; hospital/wells/drains: later inventions; factory: era V inventions, coal or water power; rail station: railway invention and a road | yes | province config / buildings config |
| province.bare_tile.slots | People per tile without building | 3,000 | yes | province config |
| province.town.building_slots | Building slots by town size | hamlet 1, village 2, market town 4, town 6, city 9, great city 12 | yes | province config |
| province.mill.gold_bonus | Mill on a farm | +25 % gold from grain | yes | province config |
| province.almshouse.shelters | Homeless sheltered | 3,000 | yes | province config |
| province.food.per_worker | People fed per worker | farm/terrace/raised 1.5; rice 1.5 ×2 harvests; ranch 1.33; fishery 1.33; bare 0.67 × people output | yes | province config |
| province.harvest.multipliers | Harvest roll | bumper 1.3, good 1.15, normal 1, poor 0.7, failed 0.3 | yes | province config |
| province.wares.list | Wares | grain, rice, wine, olive oil, wool, cloth, flax, linen, silk, cotton, salt, fish, timber, furs, hides, leather, horses, iron, tools, arms, copper, tin, silver, gold, gems, spices, pepper, sugar, tea, coffee, cocoa, tobacco, incense, ivory, pottery, porcelain, dyes, paper, books, saltpetre, powder; later coal, rubber, oil | yes | province config |
| province.wares.craft_value | Finished vs raw | ×3 (wool to cloth) | yes | province config |
| province.births / deaths | Base yearly rates per class | land classes 3.6/3.0; miners 3.5/4.0; craftsmen, market folk, clerks 3.0/3.5; clergy 0.5 (celibate) or as townsfolk /3.0; scholars 1.0/3.0; homeless 4.0/5.0 | yes | province config |
| province.births.modifiers | Birth modifiers are percentage points | peace 10 years +0.5; war −1; plague −1; towns by era (food does not count, D-PROV-36) | yes | province config |
| province.deaths.modifiers | Death modifiers | plague +5/+15/+30 %; war +1 %; burned tile +0.5 % each; smoke +1 % town; hospitals −0.5 % town; sanitation, vaccination −0.5 % each | yes | province config |
| province.famine.flee_share | Share of the unfed who flee | a quarter | yes | province config |
| province.homeless.drift_share | Homeless moving each month | not given | yes | province config |
| province.homeless.thresholds | Theft / grievance / shanty | 5 % (−5 % tax and traders per 5 %) / 10 % / 20 % | yes | province config |
| province.homeless.deaths | Yearly deaths | 5 % | yes | province config |
| province.homeless.rebel_rate | Rebel muster rate vs others | ×2 | yes | province config |
| province.shanty.town_death_extra | Town class deaths in shanty camps | +1 % | yes | province config |
| province.refugees.settle_years | Years before refugees settle | 2 | yes | province config |
| province.recruits.conscription | Conscription start / end | below 1/4 / refilled to 1/2 | yes | province config |
| province.tax.rates | Tax steps | none, light, normal, heavy, crushing | yes | province config |
| province.tax.no_official | Share without official | half | yes | province config |
| province.tax.lord_share | Lord keeps | half | yes | province config |
| province.tax.free_travel_days | Days before travel losses | 5 | yes | province config |
| province.newly_taken.years | Years a taken province stays newly taken | 10 (X-28) | yes | province config |
| province.newly_taken.upkeep_share_of_tax | Upkeep of newly taken land, as a share of its tax at the normal rate | 0.5 (X-28) | yes | province config |
| province.far_from_throne.days | Days to capital limit | 30 (example) | yes | province config |
| province.far_from_throne.cut_per_10_days | Share of tax and recruits lost every 10 days past the limit | 0.1 (X-28) | yes | province config |
| province.far_from_throne.least_share | Least share a far province still sends | 0.5 (X-28) | yes | province config |
| province.far_from_throne.sea_zone_days | Days to cross a sea zone toward the capital | 8 (X-28) | yes | province config |
| province.officials.full_effect_years | Years to full effect | 5 (half in first year) | yes | province config |
| province.officials.hire.gold | Gold up front to hire a native official | 25 (PROV-333) | yes | province config |
| province.officials.hire.foreign_multiplier | A foreign specialist's price against a native's | 2 (PROV-334) | yes | province config |
| province.officials.auto_fill.reserve_gold | Gold auto-fill keeps back in the treasury | 20 (PROV-342) | yes | province config |
| province.officials.auto_fill.hungry_months | Months of food under which a steward fits best | 1 (PROV-343) | yes | province config |
| province.officials.auto_fill.traders_passing | Traders passing in a month from which a customs officer fits best | 3 (PROV-343) | yes | province config |
| province.officials.effects | Type effects | tax collector +20 % reaches you; steward +10 % food, store rot ×½; judge riots +1 grievance, *Broken charter* ×2 fade; master of works −25 % cost, ×½ time, burned rebuild ×2; muster master refill +25 %; customs officer +15 % trade ratio gain (fees and tolls are collected in full with or without him, D-TRADE-10); chaplain faith ×2; schoolmaster language ×2, graduate 1 year sooner; warden garrison +25 %, walls repair ×2, castle store rot ×½; colonial governor none | yes | province config |
| province.homeland.years | Years to gain or lose homeland | 100 | yes | province config |
| province.pretender.years | Old ruler's right after losing a province | 50 | yes | province config |
| province.charter.broken_years | *Broken charter* duration | 20 | yes | province config |
| province.castle.neglect_years | Years without upkeep to drop a step | 10 | yes | province config |
| province.walls.max_breaches | Breaches | 3 | yes | province config |
| province.grievances.levels | Calm / grumbling / riots / rebels | 0–1 / 2 / 3 / 4+ | yes | province config |
| province.plague.steps | Plague steps | none, rumour, outbreak, burning out | no (states) | province config |
| province.plague.start_chance_year | Yearly chance plague breaks out in a province, at crowding 1, rolled monthly | 0.003 | yes (provisional, PROV-352 to PROV-357) | province config |
| province.plague.crowd_town_share / crowd_min / crowd_max | Crowding: townsfolk share over this, kept between | 0.1 / 0.5 / 3 | yes (provisional, PROV-352 to PROV-357) | province config |
| province.plague.rumour_weeks / weeks_per_season / burning_out_weeks | Plague weeks at rumour, per outbreak season, at burning out | 4 / 12 / 4 | yes (provisional, PROV-352 to PROV-357) | province config |
| province.plague.outbreak_seasons | Outbreak lasts a season or two | 1–2 | yes (provisional, PROV-352 to PROV-357) | province config |
| province.plague.spread_week / river_factor / sea_spread_week | Weekly chance to land next door; along a river; by ship to each coast of the waters | 0.04 / 1.5 / 0.0015 | yes (provisional, PROV-352 to PROV-357) | province config |
| province.plague.into_quarantine_factor | Share of the chance into a closed province | 0.25 | yes (provisional, PROV-352 to PROV-357) | province config |
| province.plague.army_carry_weeks / army_spread_week | Weeks an army carries plague; weekly chance it brings it | 4 / 0.15 | yes (provisional, PROV-352 to PROV-357) | province config |
| province.plague.spared_years | Years a province is spared after its plague burns out | 12 | yes (provisional, PROV-352 to PROV-357) | province config |
| province.plague.town_week_share_max | Most of each town class plague takes in a week | 0.02 | yes (provisional, PROV-352 to PROV-357) | province config |
| province.plague.quarantine_tax_factor | Tax a closed province still pays | 0.5 | yes (provisional, PROV-352 to PROV-357) | province config |
| province.fever_land.steps | Fever land steps | none, mild, harsh, deadly | no (states) | province config |

## 11. Seams

| Other context | Direction | Pattern | What crosses |
|---|---|---|---|
| world-map | upstream | Conformist | Ground (terrain), size on the map (tile count), coast, rivers, neighbours, population, wealth |
| scenario-setup | upstream | Customer–Supplier | Starting values data per province under the §16 rules |
| time-and-turns | upstream | Conformist | Month, season, year ticks; turn order |
| buildings | upstream | Customer–Supplier | Building list, job slots, construction, upkeep and condition (neglect), owners; province supplies tiles, ground build cost and output, classes |
| research | upstream | Published Language | Known inventions unlock buildings, tile changes, harvest steps, road and castle steps |
| realm | downstream | Customer–Supplier | Province sums for the country card (§13); realm supplies food policy, castle deliveries, lords and loyalty, fief grants |
| trade | downstream | Customer–Supplier | Wares made, buildings, toll points and rates, customs officer, homeless penalty, quarantine; trade v2 replaces §7 and stores trade value and ratio per province |
| warfare | downstream | Partnership | Ground troop modifiers, castles, walls, garrison, occupation; warfare sends burned tiles, sacks, requisition, quartering |
| troop-movement | downstream | Customer–Supplier | Days to cross, foraging, roads, rivers, bridges, days to capital |
| recruiting | downstream | Customer–Supplier | Recruits here, classes, homeless, muster master; recruiting asks for a ceiling by class, Fallen/Veterans here, Marshal and deputy officials |
| rebellions | downstream | Customer–Supplier | Grievances, homeless share, classes, leaders; rebellions owns how risings start |
| revolutions | downstream | Conformist | Grievances and class shares read as signs; pretenders/émigrés |
| religion | upstream | Customer–Supplier | Faith mix pulls, house of worship, chaplain, *Wrong faith* and *Persecuted* definitions |
| culture | upstream | Customer–Supplier | Language mix drift, *Foreign rule*, *Banned language*, *Own language* charter, officials' language, settlers to own provinces |
| government | upstream | Customer–Supplier | Officials and lords caps, *Grasping officials*, seats |
| exploration | upstream | Customer–Supplier | Colonial governor type and slots, founding a colony sets *Settlement* |
| subjects | downstream | Customer–Supplier | Governed by subject ruler; colony stages follow §12.3 settlers and years |
| diplomacy | upstream | Customer–Supplier | Envoys taken from officials leave a province at half pay; foreign agitators (via rebellions) |
| naval | downstream | Customer–Supplier | Seafolk crews, harbours, shipyards, timber |
| national-strengths | upstream | Conformist | Levers on tax reach, harvest steps, official type strength, grievance shields, building cost |
| events | upstream | Anti-Corruption Layer | Event-tree province stats translated by §15 |
| map-presentation | downstream | Published Language | Card fields, tile row, zoom content and lenses (§14) |

## 12. AI

- The AI uses the same stats and commands as the player; lords (AI-driven people) build in their own provinces by their traits: Builder the most, Greedy markets and mines, Pious houses of worship, Warlike castles (§10.3).
- Lords hire and pay their own officials from their wealth (§10.3).
- Lords and towns demand charters for loyalty or a loan (§10.4).
- Province AI: tax normal (heavy at war), tolls low, no charters unless forced, officials to the most populous royal provinces first, food through the realm presets (D-PROV-19).
- Plague: the AI closes its crowded towns (crowding 1 or more) when an outbreak begins there and opens them when the plague is gone; it leaves its countryside open (PROV-358).

## 13. Decisions and open questions

- **D-PROV-1** (was OQ-PROV-1) Trade v2 edits: all adopted: the card's Trade line shows trade value and ratio, homeless cut trade ratio gain by 5 % per 5 % homeless, the Customs officer gives +15 % trade ratio gain, gold income is tax reaching you plus trade income, `trade_access` maps to trade ratio gain, and yearly trader paths are dropped. X-6 settles it.
- **D-PROV-2** (was OQ-PROV-2) Rebels: the rebellions design governs: at 4+ grievances a province is *Plotting* with a monthly chance to rise of 5 %, 15 % or 30 % at 4, 5 or 6+, a spark can start a rising at 3, and a rising's men come from the province's recruit pool; "a share of recruits each month" and "rebels need 5" are dropped. X-9 settles it.
- **D-PROV-3** (was OQ-PROV-3) Upkeep: buildings §5.2 governs: one unpaid month makes a building (castle included) Neglected, working at half, and 10 years neglected drops it a step. The later design asked for it.
- **D-PROV-4** (was OQ-PROV-4) Weekly plague: plague runs as a weekly step on days 7, 14, 21 and 28 of the month's day loop. X-3 settles it.
- **D-PROV-5** (was OQ-PROV-5) Muster master and levies: recruiting v3 is followed: every levy takes each class by its share (no homeless first), class recruit ceilings, *Fallen from here*, *Veterans here*, the Marshal official and the deputy exist. X-7 settles it.
- **D-PROV-6** (was OQ-PROV-6) Grievance list: the list is the union of all designs: *Grasping officials*, *Banned language*, *Foreign rule* (foreign languages only, before nationalism), the new *Wrong faith* wording, *Persecuted* counting as two, and one *Foreign meddling* for diplomacy's agitators. Later designs add to the list; none removes from it.
- **D-PROV-7** (was OQ-PROV-7) Colonies: land of stateless peoples (no realm owns it) is unowned and may be colonised on free tiles; land of any realm, tribal realms included, may not. The steps map one to one: trading post = Outpost, settlement = Settled, colony = Self-governing. The simplest reading of "unowned".
- **D-PROV-8** (was OQ-PROV-8) Birth and death modifiers are percentage points on the class's yearly rate (+0.5 turns 4 % into 4.5 %); the Troyes figures are illustrative, not a test of the modifiers. One unit for every modifier.
- **D-PROV-9** (was OQ-PROV-9) Hospitals, wells and drains: buildings §18 is adopted: the hospital is known at the start, wells and drains are ring works with B11. The later design.
- **D-PROV-10** (was OQ-PROV-10) Tax timing: tax owed is yearly and paid a twelfth each month; every day of travel beyond 5 loses 5 % (provisional); a tax collector's +20 % makes up losses but what reaches you never exceeds tax owed. Monthly payment runs in the turn a new month begins (X-18).
- **D-PROV-11** (was OQ-PROV-11) Sizes: tiles run 4 to 16 by the province's land area rank on the map (smallest 4, largest 16, linear); towns are hamlet under 1,000 townsfolk, village 1,000, market town 3,000, town 8,000, city 20,000, great city 40,000 (second tile at 40,000, third at 100,000). Provisional values.
- **D-PROV-12** (was OQ-PROV-12) Wares: stone (marble counts as stone), grapes, dates, guns, steel, cement, amber, wax and honey, and alum join the list, and new buildings get the classes buildings §18 gives. Later designs add wares; nothing conflicts.
- **D-PROV-13** (was OQ-PROV-13) Officials' language: adopted: an official learns a province in 5 years among his own language, 7 among a related one, 10 among a foreign one; settlers may go to your own provinces with free tiles. Culture's later text on an existing rule.
- **D-PROV-14** (was OQ-PROV-14) Harvest steps: each step moves the harvest roll one band better (failed → poor → normal → good → bumper) and bumper is the top; steps from inventions add up; F16's step lasts 30 years (D-RSCH-16); rice gives 1.5 food per worker per harvest, two harvests a year. One rule for every step.
- **D-PROV-15** (was OQ-PROV-15) Sickness, foraging and fever land: foraging takes the march defines' numbers; sickness kills a share of an army a month: Low 0 %, Medium 1 %, High 2 %, Heat 2 %, Cold 2 %; fever land counts as High. Provisional numbers.
- **D-PROV-16** (was OQ-PROV-16) Event mapping: `prosperity +2` lets the owner pick the two buildings (the AI by its building rules); `control −20` makes the official flee, or a road fall a step where there is none; `trade_good` changes the main ware, `urbanization` moves 5 % of people to or from town, `manpower_yield` changes the recruit share by a fifth, `environmental_degradation` wears one tile, `culture_share` goes to culture and `colonial_status` moves the settlement step. One concrete effect per row.
- **D-PROV-17** (was OQ-PROV-17) Shares: each class gives 1 % of its people a year as recruits (clergy and scholars none), 2 % of the homeless a year drift to free slots elsewhere, and refugees settle after 2 years; the rebel muster share is dropped (D-PROV-2). Provisional values.
- **D-PROV-18** (was OQ-PROV-18) Rebel pool: rebels come from the recruit pool; "homeless first, twice the rate" is dropped. X-9 settles it.
- **D-PROV-19** (was OQ-PROV-19) Province AI: tax normal (heavy at war), tolls low, no charters unless a revolt forces one, officials to the royal provinces with most people first, food through the realm's presets. The simplest rules on the player's own levers.
- **D-PROV-20** (was OQ-PROV-20) Config: `packages/rules/data/domain/province.json` with the keys of §10 and a `_provisional` list. Already in the repo.
- **D-PROV-21** (was OQ-PROV-21) Tax scale: five steps, none, light, normal, heavy, crushing, per province with a realm default. Same as D-REALM-8.
- **D-PROV-22** (was OQ-PROV-22) Troyes tax: what reaches you is owed × (1 − travel loss) × (1 + collector), capped at owed; Troyes at 3 days and a full-effect collector gets all 11 gold, so the card's "9" is corrected to 11. The rules win over a card mock-up.
- **D-PROV-23** (was OQ-PROV-23) A lord's province without his official: it is *Ungoverned* and gives the lord half its tax and half its recruits for his retinue. The same half rule as a royal province without an official.
- **D-PROV-24** (was OQ-PROV-24) Officials per province: one official runs 1 province with G1, 2 with G9, 3 with G16, plus one for each of B2, G11 and T14. Same as D-REALM-14.
- **D-PROV-25** (17 Oct, Leroy: "Buildings are build in the province but effect tiles, not on tiles"; the food plan, feedback 80 and 87) Land buildings stand in the province, take one building slot and work all its tiles of their use; the tile rules of §2 decide how many people they employ. The map's provinces hold far more people than the design's (median 46,000, a tenth over 300,000), so a tile holds 2.5 times the design's job slots. The 1444 land is laid out from the map's ground, and a province's own ways (terraces, ditches, herding on the move) make up its food to 110 % in 1444. A 15-year run then shows famine touching about 4 % of provinces a year by 1459 against under 1 % before. Tile conversion (feedback 86), hunting (81) and mines with ore deposits (87) build on this next.
- **D-PROV-26** (17 Oct, feedback 81) Hunting gets its own room in the woods, a lodge, game that thins and hard winters, not the bare rate everywhere. Game starts at the level the 1444 hunting leaves, so the first years don't crash; at that start a tenth of provinces (crowded woods in the steppe and India) sit near the floor and the median at plenty. The province's own ways (PROV-313) are worked out after, so the 1444 food stays at 110 %. Hard winters touch 200 to 300 provinces a year.
- **D-PROV-27** (17 Oct, feedback 86) Tile changes are few and slow: only the five changes the tile rules (§2.1) name, one per province at a time, for gold and years, and the ground never changes. The tile a change takes is the last of its use, so the player chooses the change, not the square. Lords and the AI act by a plain rule (feed the province first: drain, irrigate, then clear woods), so the AI's land changes slowly and only where it is short.
- **D-PROV-28** (18 Oct, feedback 93) A year's famine kills at most a fifth of a province. Without a cap, an occupied province or two failed harvests in a row could lose nine in ten of its people (Nordjylland 95 % in 1454 to 1455 on seed 1). With it, the worst two years cost about a third, and famine deaths over the first 16 years fall from about 25M to 16M while the world still grows. Some 60 to 100 provinces a year still reach the cap, mostly in the far north where the food is short every year; that is a balance question for the land, not the famine rule.
- **D-PROV-29** (18 Oct, feedback 87) Ore deposits come from a fixed roll per province, not the game's dice, so the geology is the same in every game and seeding never shifts the turn's rolls. A third of rough waste holds an ore deposit (about 360 provinces), weighted to iron; silver and gold mines give three times the trade, standing in for the precious-metal flows the trade context will model. Mines need timber from a lumber camp next door at most (one ring); roads and rivers stretching that reach wait for the timber trade.

- **D-PROV-30** (18 Oct) Woods lost to fire or to cutting more timber in a year than they regrow (one load per woods tile a year) become waste, stumps and ash, and grow back to woods after 10 years, as unworked fields do. The design says woods are lost but not what they become (tiles.feature); waste is the plainest answer and lets them come back on their own.
- **D-PROV-31** (18 Oct) Wearing: "farmed for decades" is 30 years in a row with more farmers than the fields hold; each rotation invention stretches it by half (45, 68, 101 years), one tile at a time. A worn tile recovers after 5 years without use, which in the game means 5 years in which the sound fields hold every farmer. Wearing starts at none in 1444, so the 1444 food stays at 110 % (D-PROV-25) and only crowded fields wear, slowly. Provisional numbers.
- **D-PROV-32** (18 Oct) Fever land: ground first (jungle 2, marsh and savanna 1), one more in the tropics, one more per two marsh tiles, one less per quinine and sanitation known; mild, harsh and deadly add 5, 15 and 30 % a year to the death rate of people born elsewhere, the same steps as plague, and locals take a tenth. Quinine and sanitation are not in the research tree yet, so the game's fever land falls only with draining. Provisional numbers.
- **D-PROV-33** (18 Oct) Tax owed is 0.12 gold a year per 1,000 workers in working land buildings and 0.5 per 1,000 townsfolk at the normal rate, scaled by the realm's tax steps (0, ½, 1, 1½, 2), less the homeless cut (D-PROV-1) and half under riots. Burned and fallow tiles make nothing and so owe nothing. Troyes's 61,500 workers and 6,900 townsfolk owe about 11 gold, as its card says. Tolls are trade's and never counted here. Provisional numbers.
- **D-PROV-34** (18 Oct) Travel: winter makes roads and rivers half as slow again, an enemy army on the road or a broken road doubles the road's days (the detour), and a sea route closed in war is no route. Days to capital is the fastest of the routes to the capital or a seat as things stand. Provisional numbers.
- **D-PROV-36** (19 Oct, Leroy: "Birthrates should not reflect food", "You can lower birthrates to 3.6") Land classes are born at 3.6 % a year against 3.0 % deaths, so a fed, peaceful province grows about 0.6 % a year (it was 1 %). Births do not follow the food store or the *Hungry* grievance: people go on having children through hard years, and feeding them is the realm's task, with farms, ranches, fisheries and castles. The province card and the Food tab show where a normal year's food falls short so the player can build before famine comes.
- **D-PROV-35** (18 Oct) Sickness: men born on the ground lose half its monthly rate and are spared fever land; everyone else takes the full rate and fever land counts as High (D-PROV-15). People made homeless by a burned tile who stay in the province join the homeless.

## 14. Traceability

Every requirement has at least one scenario. PROV-292 (card layout) is also presentation; map-presentation owns the zoom views.

| Requirement | Feature file | Scenario |
|---|---|---|
| PROV-001 | province-basics.feature | Every stat is a count, never an abstract meter |
| PROV-002 | province-basics.feature | The province card explains every number |
| PROV-003 | province-basics.feature | Rates and limits live in one province config file |
| PROV-004 | province-basics.feature | Every stat is a count, never an abstract meter |
| PROV-010 | tiles.feature | Tile count follows the province's size on the map |
| PROV-011 | tiles.feature | Each tile has one use and holds only the buildings its use allows |
| PROV-012 | tiles.feature | Clearing woods gives fields after three years and one load of timber |
| PROV-013 | tiles.feature | Unworked fields grow back into woods |
| PROV-014 | tiles.feature | Salting or overgrazing turns land to waste |
| PROV-015 | tiles.feature | Fields turn to pasture after one season and pasture can be ploughed back |
| PROV-016 | tiles.feature | Marsh comes and goes |
| PROV-017 | tiles.feature | Irrigation turns waste into fields |
| PROV-018 | tiles.feature | Shore tiles exist only on water and are never lost |
| PROV-018 | tiles.feature | A blockade stops shore buildings working but keeps the tile |
| PROV-019 | tiles.feature | The town grows over fields and shrinks back |
| PROV-019 | tiles.feature | A great city takes a third tile |
| PROV-020 | tiles.feature | The town grows over fields and shrinks back |
| PROV-021 | tiles.feature | A castle can stand on any land tile except the town |
| PROV-022 | tiles.feature | A destroyed castle leaves waste, then fields |
| PROV-023 | tiles.feature | Woods and pasture are lost |
| PROV-023 | tiles.feature | Woods come back on unworked fields and by replanting |
| PROV-024 | tiles.feature | Woods and pasture are lost |
| PROV-024 | tiles.feature | Grassland provinces start with many pasture tiles |
| PROV-030 | tile-states.feature | A tile carries at most one state |
| PROV-031 | tile-states.feature | Tiles burn |
| PROV-032 | tile-states.feature | Burned tiles are rebuilt in peace |
| PROV-033 | tile-states.feature | A building with fewer than half its workers is fallow |
| PROV-034 | tile-states.feature | Overworked fields wear out and recover |
| PROV-035 | tile-states.feature | Overworked fields wear out and recover |
| PROV-035 | tile-states.feature | Rotation inventions make wearing rarer |
| PROV-036 | tile-states.feature | War damage is burned tiles, not a meter |
| PROV-040 | ground-troops.feature | Each province takes one ground from the map's terrain |
| PROV-041 | ground-troops.feature | The ground changes strength by arm and sets crossing, foraging and sickness |
| PROV-042 | ground-troops.feature | Camels do not suffer in the desert |
| PROV-043 | ground-troops.feature | Attacking over a river |
| PROV-044 | ground-troops.feature | Woods tiles give the defender an ambush bonus |
| PROV-045 | ground-troops.feature | Burned tiles give nothing to forage |
| PROV-046 | ground-troops.feature | The defender fights from the walls of a castle tile |
| PROV-047 | ground-troops.feature | Locals know their rough land |
| PROV-048 | ground-troops.feature | Sickness hits soldiers not born on the ground hardest |
| PROV-049 | ground-troops.feature | Burned tiles give nothing to forage |
| PROV-050 | ground-economy.feature | Build cost, building output and people output by ground |
| PROV-051 | ground-economy.feature | Irrigation and draining lift the building penalty |
| PROV-052 | ground-economy.feature | In the desert only mines and irrigation works escape the penalty |
| PROV-053 | ground-economy.feature | Some grounds favour one kind of building |
| PROV-060 | buildings-in-province.feature | Every building stands on a tile and the castle is a building |
| PROV-061 | buildings-in-province.feature | A building works in proportion to its filled slots |
| PROV-062 | buildings-in-province.feature | Ways to gain a building |
| PROV-063 | buildings-in-province.feature | Ways to lose a building |
| PROV-063 | buildings-in-province.feature | One unpaid month leaves a building neglected at half output |
| PROV-064 | buildings-in-province.feature | Land buildings, their tiles and slots |
| PROV-064 | buildings-in-province.feature | A rice paddy needs water in the province |
| PROV-064 | buildings-in-province.feature | A farm with a mill earns more gold from its grain |
| PROV-064 | buildings-in-province.feature | Castle steps come from research |
| PROV-064 | tiles.feature | Each tile has one use and holds only the buildings its use allows |
| PROV-065 | buildings-in-province.feature | A mine runs out and leaves a ghost town |
| PROV-065 | buildings-in-province.feature | Prospecting adds ore |
| PROV-066 | buildings-in-province.feature | A mine runs out and leaves a ghost town |
| PROV-067 | buildings-in-province.feature | Shipyards and mines need timber in reach |
| PROV-068 | buildings-in-province.feature | Bare tiles still give work |
| PROV-069 | buildings-in-province.feature | Town building slots come from town size |
| PROV-070 | buildings-in-province.feature | Town buildings and their workers |
| PROV-070 | buildings-in-province.feature | A school needs a market town or bigger |
| PROV-071 | buildings-in-province.feature | An almshouse shelters the homeless |
| PROV-072 | buildings-in-province.feature | Craft buildings appear by themselves where trade is good |
| PROV-073 | buildings-in-province.feature | Fleeing craftsmen found a craft building |
| PROV-080 | food-from-tiles.feature | Troyes feeds about 104,000 in a normal year |
| PROV-081 | food-from-tiles.feature | Troyes feeds about 104,000 in a normal year |
| PROV-081 | food-from-tiles.feature | People fed per worker by food tile |
| PROV-082 | food-from-tiles.feature | The harvest roll multiplies field food |
| PROV-082 | food-from-tiles.feature | Rice is rolled twice |
| PROV-083 | food-from-tiles.feature | Herds, fish, woods and pasture do not roll a harvest |
| PROV-084 | food-from-tiles.feature | Rotation inventions improve the harvest one step each |
| PROV-085 | food-from-tiles.feature | New crops turn a failed harvest into a poor one |
| PROV-090 | wares.feature | Wares are made by workers times ground times inventions |
| PROV-091 | wares.feature | Finished wares are worth more than raw ones |
| PROV-092 | wares.feature | Wares fall when work or inputs fail |
| PROV-093 | wares.feature | The ware list lives in config and grows in later eras |
| PROV-094 | wares.feature | Enslaved people are never a ware |
| PROV-100 | births-deaths-famine.feature | Base yearly birth and death rates by class |
| PROV-100 | births-deaths-famine.feature | Troyes grows by 432 a year with no modifiers |
| PROV-101 | births-deaths-famine.feature | Birth modifiers are percentage points |
| PROV-102 | births-deaths-famine.feature | Death modifiers |
| PROV-102 | births-deaths-famine.feature | Fever land kills people born elsewhere |
| PROV-103 | births-deaths-famine.feature | Clergy births depend on the faith |
| PROV-104 | births-deaths-famine.feature | Enough food fills the store |
| PROV-105 | births-deaths-famine.feature | Enough food fills the store |
| PROV-106 | births-deaths-famine.feature | Famine kills the people the food cannot feed, and some flee |
| PROV-106 | births-deaths-famine.feature | With no fed neighbour nobody flees |
| PROV-110 | classes-and-overflow.feature | Each class works in its own slots |
| PROV-111 | classes-and-overflow.feature | Newborns join their parents' class at once |
| PROV-112 | classes-and-overflow.feature | Troyes builds a loom house |
| PROV-112 | classes-and-overflow.feature | Overflow goes to the least-filled slots |
| PROV-112 | classes-and-overflow.feature | A tie goes to food classes first |
| PROV-113 | classes-and-overflow.feature | Overflow never makes scholars or soldiers |
| PROV-114 | classes-and-overflow.feature | With every slot full, overflow becomes homeless |
| PROV-115 | classes-and-overflow.feature | Troyes builds a loom house |
| PROV-115 | classes-and-overflow.feature | Homeless fill gaps left by deaths and levies first |
| PROV-116 | classes-and-overflow.feature | Homeless drift to the emptiest neighbour in their own realm first |
| PROV-117 | classes-and-overflow.feature | A short class leaves slots empty |
| PROV-118 | classes-and-overflow.feature | Fleet crews come from seafolk |
| PROV-120 | homeless.feature | Homeless eat, make nothing, pay nothing and die fast |
| PROV-121 | homeless.feature | Theft and begging cut tax and trade |
| PROV-122 | homeless.feature | The Homeless grievance and shanty camps |
| PROV-123 | homeless.feature | The Homeless grievance and shanty camps |
| PROV-123 | homeless.feature | Shanty camps bring plague, death and fire |
| PROV-124 | homeless.feature | Rebels muster from the recruit pool |
| PROV-125 | homeless.feature | Ways people become homeless |
| PROV-126 | homeless.feature | Ways to get rid of homeless |
| PROV-130 | people-stats.feature | People are the sum of the classes; town and country are shown, not stored |
| PROV-131 | people-stats.feature | People are the sum of the classes; town and country are shown, not stored |
| PROV-132 | people-stats.feature | Refugees settle after two years |
| PROV-132 | people-stats.feature | Refugees go home when it is safe |
| PROV-133 | people-stats.feature | Fleeing scholars keep their class if a slot is free |
| PROV-134 | people-stats.feature | The country's Faith is the people-weighted sum of the provinces |
| PROV-134 | people-stats.feature | Only the top three faiths and languages are stored |
| PROV-135 | people-stats.feature | Persecuted people take their faith and crafts away |
| PROV-140 | recruits-students-scholars.feature | Recruits refill from every class except clergy and scholars |
| PROV-141 | recruits-students-scholars.feature | Whose recruits they are |
| PROV-142 | recruits-students-scholars.feature | A levy at harvest time empties the farms |
| PROV-143 | recruits-students-scholars.feature | Soldiers come home homeless |
| PROV-144 | recruits-students-scholars.feature | Conscription grievance |
| PROV-145 | recruits-students-scholars.feature | Local recruits fill local school seats first |
| PROV-146 | recruits-students-scholars.feature | Students here are lost |
| PROV-147 | recruits-students-scholars.feature | Scholars here come and go |
| PROV-150 | tax-and-tolls.feature | The owner sets tolls on toll points |
| PROV-150 | tax-and-tolls.feature | A free-trade charter sets the toll to none |
| PROV-160 | tax-and-tolls.feature | Provinces follow the realm default unless overridden |
| PROV-160 | tax-and-tolls.feature | Five tax rates |
| PROV-161 | tax-and-tolls.feature | Tolls are not part of tax owed |
| PROV-162 | tax-and-tolls.feature | Troyes owes 11 gold and all 11 reach the treasury |
| PROV-162 | tax-and-tolls.feature | Things that cut tax owed |
| PROV-162 | tax-and-tolls.feature | Riots halve tax |
| PROV-163 | tax-and-tolls.feature | Troyes owes 11 gold and all 11 reach the treasury |
| PROV-163 | tax-and-tolls.feature | How much reaches you |
| PROV-164 | tax-and-tolls.feature | Tax screen presets fill in the realm at once |
| PROV-165 | tax-and-tolls.feature | A lord keeps half and wavers under a heavy demand |
| PROV-166 | tax-and-tolls.feature | A tax cap charter keeps the rate at light |
| PROV-166 | tax-and-tolls.feature | Rebels force the rate down |
| PROV-167 | tax-and-tolls.feature | Heavy taxes are a grievance |
| PROV-170 | roads-and-travel.feature | Road steps are unlocked by inventions |
| PROV-171 | roads-and-travel.feature | Roads are lost |
| PROV-172 | roads-and-travel.feature | Canals add a river, war wrecks it |
| PROV-173 | roads-and-travel.feature | Days to capital follow the fastest route |
| PROV-174 | roads-and-travel.feature | Far from the throne |
| PROV-175 | roads-and-travel.feature | Days to capital are counted over the realm's land and the sea |
| PROV-176 | roads-and-travel.feature | Far royal land sends less; a lord's land is never far |
| PROV-177 | — | Covered by engine test (packages/engine/test/newlyTaken.test.ts: holds the grievance for ten years) |
| PROV-178 | — | Covered by engine test (packages/engine/test/newlyTaken.test.ts: costs upkeep on the New land line) |
| PROV-180 | governance.feature | A province changes owner |
| PROV-181 | governance.feature | What governance gives |
| PROV-181 | governance.feature | A subject ruler governs a subject's province |
| PROV-182 | governance.feature | What governance gives |
| PROV-183 | governance.feature | A lord's line dies out |
| PROV-184 | governance.feature | Occupation |
| PROV-184 | governance.feature | Peace ends occupation |
| PROV-185 | governance.feature | Long holding shifts language and faith faster and fades Foreign rule |
| PROV-186 | governance.feature | A people becomes a homeland's people after 100 years |
| PROV-186 | governance.feature | A people gone for 100 years loses its homeland |
| PROV-187 | governance.feature | Foreign rule over a homeland |
| PROV-188 | governance.feature | Pretenders come and go |
| PROV-190 | officials.feature | Each type has its own effect in the province it runs |
| PROV-191 | officials.feature | One official runs one province, and a seat needs its own |
| PROV-191 | officials.feature | How many provinces one official runs |
| PROV-192 | officials.feature | Officials grow into their province |
| PROV-192 | officials.feature | Moving an official starts him again at half |
| PROV-193 | officials.feature | A colonial governor founds a colony and then runs it |
| PROV-194 | officials.feature | Schools train officials of certain types |
| PROV-194 | officials.feature | Officials are gained and lost |
| PROV-194 | officials.feature | A foreign specialist costs more |
| PROV-195 | officials.feature | The country card's officials count is the sum of the realm's officials |
| PROV-303 | officials.feature | Two officials swap provinces; Moving an official into an empty post; A lord's official stays with the lord |
| PROV-304 | officials.feature | Officials start with years served |
| PROV-305 | officials.feature | Each type has its own effect in the province it runs; Effects that wait for their system |
| PROV-306, 307 | officials.feature | Moving an official from his screen |
| PROV-308 | officials.feature | The Officials tab lists every official |
| PROV-309 | — | Presentation only: checked on phone screenshots in landscape |
| PROV-333, 335 | officials.feature | Hiring an official for an empty post; A type no one serves in comes only from abroad |
| PROV-334 | officials.feature | A foreign specialist costs more |
| PROV-340 | officials.feature | A province just taken waits for a decision |
| PROV-341 | — | Engine: packages/engine/test/officials.test.ts (no levy in a lord's land); presentation: the governance card |
| PROV-342, 343, 347 | officials.feature | The crown fills its empty posts each month; The best fit for a province |
| PROV-344 | officials.feature | Land just taken is filled, not waited on |
| PROV-345 | officials.feature | Dismissing and replacing an official |
| PROV-346 | officials.feature | A released commander takes another post |
| PROV-348–351 | — | Presentation: apps/client/src/ui/people.ts Officials tab, post and official screens, checked on phone screenshots in landscape and portrait |
| PROV-336–339 | — | Presentation: apps/client/src/ui/people.ts post screen, checked on phone screenshots in landscape and portrait |
| PROV-310 … PROV-313 | — | Engine: packages/engine/test/works.test.ts (tiles, farms on fields, 1444 food) |
| PROV-314 … PROV-316 | — | Presentation: apps/client/scripts/land-shots.mjs on phones in landscape |
| PROV-317 … PROV-320 | — | Engine: packages/engine/test/works.test.ts (hunting: lodge, thinning, hard winter, save) |
| PROV-321 … PROV-322 | — | Presentation: apps/client/src/ui/land.ts woods sheet |
| PROV-323 … PROV-325 | — | Engine: packages/engine/test/works.test.ts (tile changes, the AI's rule, save) |
| PROV-326 … PROV-327 | — | Presentation: apps/client/src/ui/land.ts change block; main.ts Short of food view |
| PROV-328 … PROV-331 | — | Engine: packages/engine/test/works.test.ts (ore deposits, mines, saltworks, save) |
| PROV-332 | — | Presentation: apps/client/src/ui/land.ts waste and shore sheets |
| PROV-333 … PROV-334 | — | Engine: packages/engine/test/land.test.ts (wearing and rest, fever land, save) |
| PROV-335 … PROV-336 | — | Presentation: apps/client/src/ui/land.ts worn tiles and fever line |
| PROV-200 | lords-in-province.feature | A lord who loses his last province stops being a lord |
| PROV-201 | lords-in-province.feature | A lord who loses his last province stops being a lord |
| PROV-201 | lords-in-province.feature | A courtier can be granted land again |
| PROV-202 | lords-in-province.feature | A lord's officials run his provinces |
| PROV-203 | lords-in-province.feature | A lord's officials run his provinces |
| PROV-204 | lords-in-province.feature | Lending an official to a lord |
| PROV-205 | lords-in-province.feature | Lords build by their traits |
| PROV-206 | lords-in-province.feature | Paying for a building in a lord's land |
| PROV-207 | lords-in-province.feature | Land comes back with its buildings |
| PROV-210 | charters.feature | What each charter gives and costs |
| PROV-211 | charters.feature | How a province gains a charter |
| PROV-212 | charters.feature | Revoking a charter leaves a broken charter for 20 years |
| PROV-213 | charters.feature | A conqueror keeps or revokes charters |
| PROV-214 | charters.feature | Town law needs no official and blocks seizures |
| PROV-215 | charters.feature | A mining right hands the mine to a merchant house |
| PROV-220 | defence.feature | Castle steps |
| PROV-220 | defence.feature | Conquering a province takes its castle |
| PROV-221 | defence.feature | Where the castle stands matters |
| PROV-221 | defence.feature | A castle on a shore tile can be supplied by sea |
| PROV-222 | defence.feature | Walls are breached and repaired |
| PROV-223 | defence.feature | A castle with no garrison falls at once |
| PROV-230 | grievances.feature | Grievances start and end |
| PROV-230 | grievances.feature | Harsh lord |
| PROV-231 | grievances.feature | The number of grievances sets the province's mood |
| PROV-231 | grievances.feature | Grumbling slows growth and drives out scholars and craftsmen |
| PROV-231 | grievances.feature | Riots halve tax and recruits, drive traders away and make the lord waver |
| PROV-231 | tax-and-tolls.feature | Riots halve tax |
| PROV-232 | grievances.feature | Rebels rise from the recruit pool under a named leader with a demand |
| PROV-232 | grievances.feature | A plotting province rises with a monthly chance |
| PROV-232 | grievances.feature | A spark can start a rising at 3 grievances |
| PROV-233 | grievances.feature | Rebels come from more than grievances |
| PROV-233 | grievances.feature | Rebels melt away |
| PROV-234 | grievances.feature | Rebel armies fight as a rebel band |
| PROV-235 | grievances.feature | Riots and rebels count as in revolt |
| PROV-236 | grievances.feature | A judge raises the bar for riots |
| PROV-240 | health.feature | Plague spreads along roads, rivers and the sea |
| PROV-240 | health.feature | Crowded towns catch plague first |
| PROV-240 | health.feature | Plague runs its steps and burns out |
| PROV-241 | health.feature | Plague runs its steps and burns out |
| PROV-241 | health.feature | Quarantine closes the province |
| PROV-242 | health.feature | Plague kills townsfolk first and leaves buildings fallow |
| PROV-243 | health.feature | Fever land |
| PROV-243 | health.feature | Locals mostly survive fever land |
| PROV-244 | health.feature | Factories make smoke from era V |
| PROV-352 | health.feature | Plague breaks out now and then, most in crowded towns |
| PROV-353 | health.feature | Plague spreads to land next door, less into a closed province; Nothing leaves a closed province by trade |
| PROV-354 | health.feature | An army carries plague |
| PROV-355 | health.feature | Plague runs its weeks in the game |
| PROV-356 | health.feature | Plague kills townsfolk first in the game |
| PROV-357 | health.feature | Closing a province against plague |
| PROV-358 | health.feature | The AI closes its crowded towns |
| PROV-359 | health.feature | Plague runs its weeks in the game |
| PROV-360 | health.feature | Plague is kept in the save |
| PROV-352 … PROV-360 | — | Engine: packages/engine/test/plague.test.ts |
| PROV-361 … PROV-363 | — | Presentation: apps/client/src/ui/plague.ts plague card and map mark, the Provinces tab's Sick list; checked on phone screenshots in landscape and portrait |
| PROV-107 | — | Engine config: province.food.balance; client: apps/client/src/ui/food.ts shortProvinces |
| PROV-364 … PROV-366 | — | Presentation: apps/client/src/ui/food.ts Short of food list, the province card's Land feeds line; checked on phone screenshots in landscape and portrait |
| PROV-250 | colonies.feature | Only unowned provinces can be colonised |
| PROV-251 | colonies.feature | A colony takes only the free tiles |
| PROV-252 | colonies.feature | Settlement steps are gained |
| PROV-252 | colonies.feature | Settlements are lost |
| PROV-253 | colonies.feature | A trading post draws traders without taking a tile |
| PROV-254 | colonies.feature | Settlers fill the free tiles and then growth stops |
| PROV-254 | colonies.feature | Settlers are lost |
| PROV-255 | colonies.feature | Taking the local people's tiles has a cost |
| PROV-260 | country-aggregation.feature | Country stats are sums over provinces |
| PROV-260 | country-aggregation.feature | Lords' recruits and officials stay on their own cards |
| PROV-270 | event-mapping.feature | Event effects land as concrete province changes |
| PROV-270 | event-mapping.feature | Event stats map onto province stats |
| PROV-280 | starting-values.feature | The map sets the land |
| PROV-281 | starting-values.feature | The catalogue sets owners, lords, homelands and mixes |
| PROV-282 | starting-values.feature | Other sources fill the rest |
| PROV-283 | starting-values.feature | Wealth stops being live once buildings are placed |
| PROV-290 | province-basics.feature | Only stored stats are kept; the rest is worked out when needed |
| PROV-291 | province-basics.feature | Update cadence |
| PROV-292 | province-basics.feature | The province card explains every number |
| PROV-293 | tax-and-tolls.feature | Tax is paid monthly and capped at what is owed |
| PROV-293 | tax-and-tolls.feature | Travel loses 5 % a day beyond 5 and a collector makes it up |
| PROV-293 | tax-and-tolls.feature | Troyes owes 11 gold and all 11 reach the treasury |
| PROV-294 | tiles.feature | Tile count by size |
| PROV-294 | tiles.feature | Town size follows its townsfolk |
| PROV-295 | food-from-tiles.feature | Harvest steps add up and stop at bumper |
| PROV-296 | recruits-students-scholars.feature | Recruits refill from every class except clergy and scholars |
| PROV-296 | recruits-students-scholars.feature | Homeless drift and refugees settle |
| PROV-297 | births-deaths-famine.feature | Birth modifiers are percentage points |
| PROV-297 | births-deaths-famine.feature | Troyes grows by 432 a year with no modifiers |
| PROV-298 | colonies.feature | Only unowned provinces can be colonised |
| PROV-298 | colonies.feature | Settlement steps are the subjects design's colony stages |
| PROV-299 | officials.feature | Officials learn by language |
| PROV-300 | lords-in-province.feature | A lord's province without his official |
| PROV-301 | health.feature | Sickness by land |
| PROV-302 | defence.feature | The Garrison tab |
| PROV-333–336 | — | Presentation only: checked on phone screenshots in landscape |
