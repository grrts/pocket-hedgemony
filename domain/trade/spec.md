# Trade (TRADE)

## 1. Purpose and scope

Trade is carried by **units the realm owns and steers**: traders on land and rivers, trade ships at sea. Each has a route
between cities. Every province a trader passes gets busier (its **trade ratio** rises); in every province it enters the
trader **collects** value into its **purse**; it **deposits** the purse into the treasury when it enters a city of its own
country. This context decides those rules and their numbers for 1444 to 31 August 1939.

**In scope**
- Traders and trade ships as units: kinds, founding, crew, upkeep, how they are gained and lost.
- Trade value, trade ratio and traders passing on every province (and the two counts on every sea zone).
- Collecting, crowding, market fees, deposits, bills of exchange, trade income.
- Routes: stops, modes, path choice, preview, breaks.
- Who may enter where; tolls as paid by traders; the trade effects of pacts, embargoes, war, peace terms, subjects.
- Risks on land and at sea as they touch traders and purses.
- The trade side-effects: tax from trade ratio, crafts appearing, inputs within reach, trade partners for research.
- Trade screens, lenses, touch controls and turn-report lines.
- The T and S invention effects on trade; the event tree's trade stats mapping; trade hubs as labels.
- Starting traders and routes in 1444, the warm-up; the AI for trade; storage and speed on a phone.

**Not in scope (owned by …)**
- The building list, market steps, their costs and job slots: **buildings** (trade gives only the trade weight of each).
- Ship types, their costs, crews and sailors, ports, captains, pirates: **naval**.
- Movement on the day loop, the shared graph and route planner, step days: **troop-movement**.
- Hunting fleets, escorts, blockades, storms, raids, peace terms as mechanics: **warfare**.
- Trade pacts, embargoes as diplomatic actions: **diplomacy**. Tribute and subject kinds: **subjects**.
- Toll points and toll rates as province stats; wares made; classes; plague; customs officers: **province**.
- Treasury, lords' wealth: **realm**. Invention costs: **research**. Event authoring: **events**.

## 2. Sources

Newest decision first.
1. `trade/trade-design.md` version 2 (decisions of 16 October, Leroy): collect in every province entered; stops are city
   size or have a market or trading post; no lord's fee; pirates stay with naval. **Replaces province-stats §7.**
2. `trade/trade-design.md` v2 §1–§17 (all sections).
3. `trade/trade-config.example.yaml` (every trade number; all placeholders).
4. `trade/README.md` (still describes version 1; superseded where it disagrees).
5. Read for seams and contradictions: `buildings/buildings-design.md` §4, §7.4; `naval/naval-design.md` (ship table, §492
   note); `diplomacy/diplomacy-design.md` §6.5; `subjects/subjects-design.md`; `province-stats/province-stats-design.md` §7;
   `country-stats/research-tree.md` (T branch); `national-strengths/config/levers.json`.

## 3. Ubiquitous language

| Term | Meaning | Not to be confused with |
|---|---|---|
| Trader | A unit on the map that carries a purse along a route: a caravan, barge, wagon train, rail freight, or a trade ship | Merchant (old country-stats term, replaced) |
| Trade ship | A naval ship type set to trade | Warship |
| Kind | A trader's type (pack caravan, camel caravan, river barge, wagon train, rail freight, or a ship type) | Class (of people) |
| Home city | The city that founded the trader; it goes there when it has no route | Capital |
| Crew | People taken from a class to man a trader: market folk for land traders, sailors for ships | Building crew |
| Purse | Gold collected and not yet deposited, up to the kind's purse size | Treasury |
| Hold | The factor a single collection is multiplied by | Purse size |
| Trade value | What a province has to trade, gold a month, from goods and buildings | Trade income |
| Goods value | Σ wares made (loads a year) × price per load | Trade value |
| Building weight | A share added to goods value for a building that makes a place good to trade | Building output |
| Trade ratio | How busy a province is, 0 to 100 % | Traders passing |
| Traders passing | How many traders of every country passed or stood in a province this month | Trade ratio |
| Visit share | The part of a month's value one passing trader takes (0.2) | Market fee |
| Crowding | Fewer gold per visit once a province's served visits are used up this month | — |
| Served visits | Trader visits a month a province serves at full value: 2, 4, 8, 16 by market | — |
| Market fee | 10 % of a collection paid to the owner of a foreign province | Toll |
| Toll | Gold a trader pays from its purse at a toll point (bridge, ford, pass, river mouth, strait) | Market fee |
| City (for trade) | A settlement of city or great-city size, or one with a market or trading post | Town size "city" alone |
| Stop | A city on a route | A province walked through |
| Route | A start and an end, walked there and back or once; the planner finds the way through the busiest land (D-TRADE-21) | Path |
| Path | The provinces between two stops chosen by the route planner | Route |
| Deposit | Emptying the whole purse into the treasury in a city of the trader's own country | Collection |
| Bills of exchange | With T3, depositing in a foreign city with a counting house or bank for a 10 % fee | — |
| Trade income | Deposits + market fees received + tolls received | Trade balance (dropped) |
| Sea lane | A sea zone traders sail through; each ship counts as half a trader passing in every port province on its coast | Route |
| Hub | A named set of provinces and sea zones used only by event triggers | A stop |
| Warm-up | 24 months of the starting traders run before the first turn | — |

## 4. Domain model

### Aggregates

**Trader** (identity: trader id; owner country or lord)
- Holds: kind, owner, home city, crew (class, count), route (stops, mode), purse, hold, position (province or sea zone),
  progress (days walked to next), months of unpaid upkeep, set to trade (ships).
- INV-TRADE-1: 0 ≤ purse ≤ purse size of its kind.
- INV-TRADE-2: A route has a start and an end, two different cities (D-TRADE-21).
- INV-TRADE-3: A river barge stays on its river; a land trader never enters a sea zone; a trade ship enters port provinces only.
- INV-TRADE-4: A lord's trader deposits only into its lord's wealth and can't be steered by the crown.
- Stored: about 12 small numbers (kind, home, crew, purse, route of up to 8 stops, position, progress).

**ProvinceTrade** (identity: province)
- Holds: trade ratio, traders passing this month, trade value (yearly, or on change), visits this month, last-updated month.
- INV-TRADE-5: 0 ≤ trade ratio ≤ 100.
- INV-TRADE-6: While the province is under quarantine, its ratio is 0 and no trader enters.

**SeaZoneTrade** (identity: sea zone): trade ratio and traders passing (same two numbers).

**CountryTrade** (identity: country): trade income by month (last 12 for `trade_index`), collections by hub
(`trade_presence`), trade partners, known sea passages.

### Value objects
- **TraderKind** (config `land_traders`, `sea_traders`):

| Kind | Era | Moves on | Step days | Hold | Purse | Crew | Found (gold) | Upkeep / month | Needs |
|---|---|---|---|---|---|---|---|---|---|
| Pack caravan | I | Land | army × 0.75 | ×1 | 10 | 50 market folk | 15 | 0.5 | A yearly fair |
| Camel caravan | I | Land; desert and drylands at half step days | ×0.75, desert ×0.5 | ×1.5 | 15 | 50 market folk | 20 | 0.6 | T1 (start in the Middle East, Central Asia, the Sahel) or a desert or drylands home |
| River barge | I | Along a navigable river only | ×0.4 | ×1.5 | 15 | 50 market folk | 15 | 0.4 | A river shore tile at home |
| Wagon train | IV | Land with at least a road | ×0.6 | ×2 | 25 | 80 market folk | 30 | 0.8 | B9 Turnpike roads; a paved road or better at home |
| Rail freight | V | Along the railway | rail days | ×6 | 80 | 120 craftsmen | 80 | 2 | A rail station at both ends of each leg |

| Ship type (naval) | Hold | Purse | Upkeep while trading / month | Notes |
|---|---|---|---|---|
| Cog / junk / dhow | ×2 | 30 | 1 | The 1444 trade ship everywhere |
| Galley (merchant galley) | ×2 | 25 | 2 | Enclosed seas only |
| Caravel | ×1 | 20 | 1 | Small, fast; more explorer than trader |
| Carrack | ×3 | 50 | 1.5 | Ocean-going |
| Galleon | ×3 | 60 | 2 | Can defend itself |
| Fluyt / merchantman | ×4 | 70 | 1.5 | Cheap crew, can't fight (if naval adds it) |
| Steamer (S13) | ×6 | 150 | 3 | Ignores wind; needs coal at a port on the route |

- **Price tiers** (config `value.price_per_load`): staples 1 (grain, rice, fish, salt, timber, hides, clay goods);
  raw 2 (wool, flax, cotton, iron, copper, tin, horses, saltpetre, dyes); finished 5 (cloth, linen, leather, tools, arms,
  pottery, beer and wine, paper, powder); luxuries 10 (silk, silk cloth, spices, pepper, sugar, tea, coffee, cocoa,
  tobacco, incense, ivory, porcelain, furs, gems, books); precious 12 (silver, gold; silver falls after the silver flood).
- **Building weights** (config `value.building_weights`): weekly market +25 % (city; serves 4); yearly fair +50 %
  (serves 8); trading house +100 % (serves 16); caravanserai +25 % for land traders (stops bandits); warehouse +25 %;
  harbour +25 % for ships (needed to dock); counting house +10 % (foreign deposits); bank +25 % (foreign deposits);
  every working craft building (loom house, forge, kiln, tannery, press, brewery) +5 % each. No market: serves 2.
- **Route** value: start and end, mode (there and back default, once), cached paths.

### Formulas
```
trade value (gold a month) = goods value × (1 + building weights) / 12
goods value                = Σ wares made in the province (loads a year) × price per load
ratio gain                 = 3 × traders passing × (1 − ratio / 100)   (× modifiers)
ratio decay                = 10 % of the current ratio
new ratio                  = ratio + gain − decay   (clamped 0..100)
collected                  = trade value × trade ratio × hold × visit share (0.2) × crowding
crowding (after served)    = served ÷ visits so far this month
trade income               = deposits + market fees received + tolls received
```
Steady ratios: 1 trader a month ≈ 23 %; 2 ≈ 37 %; 5 ≈ 60 %; 10 ≈ 75 %; 20 ≈ 86 %. A road with no traders loses half
its ratio in about seven months.

### Domain services
- **RoutePlanner** (shared with troop-movement 11.2): fewest days by the trader's step days and may-enter rule,
  avoiding forbidden provinces, preferring lower tolls when close (a toll counts as 2 days). Paths cached per city pair.
- **RoutePreview**: loop days, provinces collected in, best provinces, expected gold a month, tolls, danger, crowding.
- **TradeValueCalculator**: yearly with wares made, and again on events or burned tiles.
- **RatioUpdater**: monthly after the day loop; lazy decay (×0.9ⁿ for n untouched months).

## 5. Requirements

### 5.1 Traders and trade ships
- TRADE-001 The trade context shall represent each trader as one map unit with kind, home city, crew, route, purse, hold, position and progress. [trade §2.1]
- TRADE-002 While a trader has no route, the trade context shall send it to its home city. [trade §2.1]
- TRADE-003 When a country founds a land trader in one of its cities with a market of any step (or a trading post once T8 is known), the trade context shall charge the kind's founding gold up front and take its crew from the home province's job slots of the crew's class, like a levy, refusing if they are too few. [trade §1, §2.2, §2.3] (D-TRADE-2, D-TRADE-12)
- TRADE-004 When a country buys a ship in a port with enough sailors (naval) and sets it to Trade, or turns a cog, junk, dhow or carrack to trade, the trade context shall count it as a trade ship. [trade §2.2, §2.3, §10.2]
- TRADE-005 The trade context shall also let a trader be gained by capture in war (an army taking a caravan may keep it), a lord's gift, or an event. [trade §2.2]
- TRADE-006 When a trader is dismissed, the trade context shall remove it and overflow its crew into the emptiest slots of its home. [trade §2.2]
- TRADE-007 If a trader's or trade ship's upkeep is unpaid for 6 months, then the trade context shall remove it and its crew shall leave. [trade §2.2]
- TRADE-008 The trade context shall charge each trader's upkeep monthly in gold, even with an empty purse and no route. [trade §2.2]
- TRADE-009 The trade context shall put no cap on the number of traders a country runs. [trade §2.2]
- TRADE-010 When a trade ship is pressed into war, the trade context shall stop its trading and keep its purse until it next reaches a port of its own country. [trade §2.2]
- TRADE-011 The trade context shall let lords run their own traders from their own cities with their own wealth; these deposit into the lord's wealth, are visible to the crown and cannot be steered by it. [trade §2.2]
- TRADE-012 The trade context shall take each land trader's crew by kind from config: 50 market folk for a caravan or barge, 80 for a wagon train, 120 craftsmen for rail freight. [trade §2.3, §3.1]

### 5.2 Kinds and movement
- TRADE-013 The trade context shall give each land kind the era, movement, step-day factor, hold, purse, crew, founding cost, upkeep and needs of the kinds table. [trade §3.1]
- TRADE-014 The trade context shall move land traders by the troop-movement step-day rules (ground, road, river, season, passes) times their kind's factor, with no guns, no column penalty and no march orders. [trade §3.1]
- TRADE-015 Where a camel caravan is in desert or drylands, the trade context shall use half step days (factor 0.5). [trade §3.1]
- TRADE-016 The trade context shall let a camel caravan be founded only with T1 Caravanserai networks or from a desert or drylands home province. [trade §3.1]
- TRADE-017 The trade context shall keep a river barge on provinces joined by its navigable river and require a river shore tile in its home province. [trade §3.1]
- TRADE-018 The trade context shall let a wagon train be founded only with B9 Turnpike roads and a paved road or better at home, and move only on land with at least a road. [trade §3.1]
- TRADE-019 The trade context shall move rail freight along the railway between provinces with a rail station at both ends of each leg. [trade §3.1]
- TRADE-020 The trade context shall give each trading ship type the hold, purse and upkeep of the ship trade table; the naval context owns which ships exist and their build cost and crew. [trade §3.2]
- TRADE-021 The trade context shall move trade ships by the naval sea-zone step days, entering port provinces only. [trade §3.2]
- TRADE-022 The trade context shall keep merchant galleys to enclosed seas. [trade §3.2]
- TRADE-023 The trade context shall require a steamer's route to have a port with coal. [trade §3.2]

### 5.3 Trade value
- TRADE-024 The trade context shall keep on every province a trade value, a trade ratio and a count of traders passing. [trade §4.1]
- TRADE-025 The trade context shall compute trade value as goods value × (1 + building weights) / 12, in gold a month. [trade §4.2]
- TRADE-026 The trade context shall compute goods value from the wares actually made in the province this year times the price per load of their tier; burned and fallow tiles make nothing, and only the food surplus counts. [trade §4.2]
- TRADE-027 The trade context shall price wares by tier: staples 1, raw materials 2, finished goods 5, luxuries 10, precious 12 gold a load. [trade §4.2]
- TRADE-028 When the event tree's silver flood happens, the trade context shall lower the price of silver from 12 to 6 gold a load. [trade §4.2]
- TRADE-029 The trade context shall add building weights: weekly market +25 %, yearly fair +50 %, trading house +100 %, caravanserai +25 % (land traders), warehouse +25 %, harbour +25 % (ships), counting house +10 %, bank +25 %, each working craft building +5 %. [trade §4.2]
- TRADE-030 The trade context shall let a province with no market have a trade value, get busier and pay traders who walk through it. [trade §4.2]

### 5.4 Trade ratio
- TRADE-031 When the day loop of a month ends, the trade context shall update each province's ratio by gain = 3 × traders passing × (1 − ratio/100) and decay = 10 % of ratio, kept between 0 and 100. [trade §4.3]
- TRADE-032 The trade context shall count every trader of every country in traders passing. [trade §4.3]
- TRADE-033 The trade context shall count a trader once in every province it stood in during the month, whether it stopped or walked through. [trade §4.3]
- TRADE-034 When a trade ship sails through a sea zone, the trade context shall count it as half a trader passing in every port province on that zone's coast. [trade §4.3]
- TRADE-035 Where a province has a customs officer, the trade context shall raise its ratio gain by 15 %. [trade §4.3]
- TRADE-036 Where a province's road is one step better than every neighbour's, the trade context shall raise its ratio gain by 10 %. [trade §4.3]
- TRADE-037 While a province has been at peace for 10 years, the trade context shall raise its ratio gain by 10 %. [trade §4.3]
- TRADE-038 While a province has riots, the trade context shall halve its ratio gain. [trade §4.3]
- TRADE-039 While a province has homeless over 5 %, the trade context shall lower its ratio gain by 5 % for every 5 % of homeless. [trade §4.3]
- TRADE-040 While a province is under plague quarantine, the trade context shall set its ratio to 0 and let no trader enter. [trade §4.3]
- TRADE-041 While an enemy army or a siege is in a province, the trade context shall give it no ratio gain that month. [trade §4.3]
- TRADE-042 While a port is blockaded, the trade context shall let no ship enter it and stop its sea-lane gain. [trade §4.3, §8.2] *When a port is blockaded, which trade ships may pass and the prize money are now set by NAVY-155 to NAVY-158 (playtest feedback).*

### 5.5 Collecting
- TRADE-043 When a trader enters a province, the trade context shall on that day collect trade value × trade ratio × hold × visit share (0.2) × crowding into its purse. [trade §4.4]
- TRADE-044 The trade context shall not collect again in the province a trader sets out from, nor while a trader waits in a province, until it enters another. [trade §4.4]
- TRADE-045 If a trader's purse is full, then the trade context shall collect nothing more until it deposits. [trade §4.4]
- TRADE-046 The trade context shall let ships collect only on entering a port province, and nothing in sea zones. [trade §3.2, §4.4]
- TRADE-047 When a trader collects in a province of another country, the trade context shall pay that country a market fee of 10 % of the collection, except in its own provinces or with a trade pact. [trade §4.4, §7.3]
- TRADE-048 When a province's trader visits this month exceed its served visits (2 without a market, 4 weekly market, 8 fair, 16 trading house), the trade context shall scale each further visit's collection by served ÷ visits so far. [trade §4.5]

### 5.6 Routes
- TRADE-049 The trade context shall accept as a stop only a city: a settlement of city or great-city size, or one with a market or a trading post. [trade §5.1, §17 decision]
- TRADE-050 The trade context shall accept a route of a start and an end, two different cities, and nothing more: the player never draws the way between them. [trade §5.1; D-TRADE-21]
- TRADE-051 The trade context shall run a route there and back (default: reverse at the end) or once (wait at the end for orders). [trade §5.1; D-TRADE-21]
- TRADE-052 The trade context shall find the way between the start and the end by the shared route planner using the trader's step days and may-enter rule: fewest days, each land province's days divided by 1 + `route.busy_weight` × its people over the world's average (at most `route.busy_cap` times), so the way goes through the most populated land; avoiding forbidden provinces, preferring lower tolls when two paths are close (a toll counts as 2 days). [trade §5.1; D-TRADE-21]
- TRADE-053 The trade context shall give every province walked through between stops the ratio gain and a collection. [trade §5.1]
- TRADE-054 When the player sets a route, the game shall show before confirming: loop days, provinces collected in per loop, the best ones, expected gold a month after fees and tolls, tolls, danger and crowding, with red marks for closed borders, quarantines, enemy armies and snowed passes. [trade §5.2]
- TRADE-055 The trade context shall compute Expect as the planned collections over one loop at this month's ratios, minus fees and tolls, divided by the loop's months. [trade §5.2]
- TRADE-056 When something changes on a route (war, closed border, quarantine, snowed pass, blockade), the trade context shall check the route again. [trade §5.3]
- TRADE-057 If a path between two stops is closed, then the trader shall take another path if one exists (a dashed detour), otherwise skip that stop. [trade §5.3]
- TRADE-058 If a stop is closed (war with its owner, embargo, quarantine), then the trader shall skip it, the stop shall show red, and the turn report shall say so once. [trade §5.3]
- TRADE-059 If every stop is closed, then the trader shall go to the nearest own city, deposit, and wait for orders. [trade §5.3]

### 5.7 Deposits and income
- TRADE-060 When a trader enters a city of its own country, stop or not, the trade context shall deposit its whole purse into the treasury that day and the turn report shall record it. [trade §6.1]
- TRADE-061 When a trader deposits in a lord's city, the trade context shall pay the whole purse to the treasury with no fee to the lord. [trade §6.1, §17 decision]
- TRADE-062 If a city belongs to a subject, then the trade context shall not take the overlord's traders' deposits there (unless the subjects design says otherwise for a kind of subject). [trade §6.1]
- TRADE-063 If an own city is occupied by an enemy, then the trade context shall take no deposits there. [trade §6.1]
- TRADE-064 The trade context shall count a country's trade income as its traders' deposits + market fees paid to it + tolls at its toll points, replacing trade balance and Merchants earnings. [trade §6.2]
- TRADE-065 Where a country knows T3 Bills of exchange, the trade context shall let its traders deposit in a foreign city with a counting house or bank, at peace with it, paying 10 % to that city's owner. [trade §6.3]

### 5.8 Who may go where
- TRADE-066 The trade context shall let land traders enter own, lords' and subjects' provinces, and the provinces of countries at peace unless closed or embargoed; trade ships the same, ports only. [trade §7.1]
- TRADE-067 The trade context shall let no trader enter a country at war with its owner, its occupied land, or a quarantined province. [trade §7.1]
- TRADE-068 The trade context shall let land traders cross unclaimed land, collecting nothing there unless it has a trading post. [trade §7.1]
- TRADE-069 The trade context shall let trade ships enter only sea zones known to their country, and never let land traders enter sea zones. [trade §7.1]
- TRADE-070 The trade context shall let traders cross borders at peace without passage. [trade §7.1]
- TRADE-071 When a trader passes a toll point, the trade context shall take the toll at the owner's rate (none, low, high) from its purse. [trade §7.2]
- TRADE-072 While two countries have a trade pact, the trade context shall charge no market fee and no toll between them, both ways. [trade §7.3]
- TRADE-073 While a country is embargoed by another, the trade context shall let its traders neither enter nor stop in the other's provinces or ports. [trade §7.3]
- TRADE-074 The trade context shall shut traders out of another country's land only by an embargo; there are no closed borders. [trade §7.3] (D-TRADE-8)
- TRADE-075 When war starts, the trade context shall send traders inside the enemy's land to the nearest own or neutral city at once, where they may be caught. [trade §7.3]
- TRADE-076 While the peace term Open the roads is in force (10 years), the trade context shall charge the winner's traders no tolls in the loser's provinces. [trade §7.3]
- TRADE-077 The trade context shall charge a tributary's traders no toll in its overlord's cities; a subject's traders shall deposit into the subject's own treasury. [trade §7.4]

### 5.9 Risks
- TRADE-078 When a trader and an army at war with its owner meet in a province, the trader shall lose its purse to the army's owner and be captured (the army's owner may keep it), unless it can step back the way it came that day. [trade §8.1]
- TRADE-079 When a trader sees an enemy army ahead on the day loop, it shall by default wait a day and go round. [trade §5.3, §8.1]
- TRADE-080 When an army on Raid at war with the trader's owner passes, it shall take the purse and the trader shall escape half the time. [trade §8.1]
- TRADE-081 While a province has riots, rebels or homeless over 20 %, the trade context shall give each land trader there a 1-in-20 chance a month of its purse being stolen by bandits, halved with T1, and none where there is a caravanserai or a garrisoned castle. [trade §8.1, §11]
- TRADE-082 While rebels hold a province, the trade context shall treat them as an enemy army for traders. [trade §8.1]
- TRADE-083 When a trader passes through a plague outbreak, it shall carry the plague onward. [trade §8.1, §9]
- TRADE-084 When a hunting fleet is in a zone, it shall capture trade ships there with their purses; routes shall avoid zones where an enemy hunts when they can. [trade §8.2]
- TRADE-085 While own warships escort in a zone, the trade context shall protect own trade ships there until the escort is beaten. [trade §8.2]
- TRADE-086 When a trade ship is lost in a storm, it shall lose its purse; with T11 Marine insurance half the purse is refunded. [trade §8.2, §11]
- TRADE-087 Where the naval design adds pirates, the trade context shall treat them as a hunting fleet with no country. [trade §8.2, §17 decision]

### 5.10 Other effects of trade
- TRADE-088 The trade context shall raise tax owed in a province by 1 % for every 4 points of its trade ratio. [trade §9]
- TRADE-089 The trade context shall let craft buildings appear by themselves only where the trade ratio is 30 % or more. [trade §9]
- TRADE-090 The trade context shall supply a building's input ware if it is made in the province, within reach (one ring, more with roads and rivers), or in any province on a trader's route passing through this one; otherwise the building works at half. [trade §9]
- TRADE-091 When a country's traders deposit or collect in another country's cities, the trade context shall count that country as its trade partner for research spread. [trade §9]
- TRADE-092 The trade context shall never carry food by traders; hungry cities are fed by the castle and food system. [trade §9]

### 5.11 Screens and controls
- TRADE-093 The game shall show trade by zoom: a trade-ratio-coloured Trade lens and busiest roads and sea lanes at world; thicker roads with more traders, trader icons with a purse bar and a coin on market cities at region; caravans, barges and ships moving at local. [trade §10.1]
- TRADE-094 The game shall offer the lenses Trade ratio, Trade value and Traders (own traders and routes), replacing Traders passing and Trade balance. [trade §10.1]
- TRADE-095 The game shall found a trader from a city with a market via Trade → Found a trader → kind; ships are bought at the port screen and switched to Trade. [trade §10.2]
- TRADE-096 The game shall set a route by tapping cities in order, finishing by tapping the last stop again, with the preview updating as stops are added, then Confirm. [trade §10.2]
- TRADE-097 The game shall let a trader copy another trader's route. [trade §10.2]
- TRADE-098 The game shall show a Trade screen listing every trader and trade ship with kind, route, purse, last deposit, expected gold a month and problems, sortable by gold a month. [trade §10.2]
- TRADE-099 The turn report shall sum the turn's deposits (one week, X-18) into one line and give only problems (robbed, route broken, ship taken) their own line. [trade §10.2]
- TRADE-100 The game shall show the trader card with kind, crew, route and loop days, position, purse bar, last collections, fees and tolls, danger and upkeep. [trade §1]

### 5.12 Research
- TRADE-101 The trade context shall apply these invention effects: T1 camel caravans and half bandit losses; T2 collections +10 %; T3 deposit abroad; T5 trade ships' Indian Ocean storm losses halved; T6 the yearly fair can be built and every market serves +2 visits a month; T8 overseas trading posts count as cities and can found traders; T9 trade ships cost 25 % less; T11 half a lost ship's purse refunded; T13 every known province's trade value and ratio visible; S2 trade ships' hold +0.5; S13 steamer trade ships; B2, turnpikes and railways faster land traders. [trade §11] (D-TRADE-3: T6 is needed for a new yearly fair; starting fairs stay)
- TRADE-102 The trade context shall leave T17 Container shipping out (era VIII, out of scope). [trade §11, gap-lists decisions]

### 5.13 Event-tree trade stats
- TRADE-103 When an event changes `trade_power` of a country, the trade context shall change that country's traders' collections by the same share for the modifier's duration. [trade §12]
- TRADE-104 When an event changes `trade_access` of a province, the trade context shall change its ratio gain by that share (−0.2 → −20 %) for the duration. [trade §12]
- TRADE-105 When an event changes `world_trade_index`, the trade context shall change every province's trade value by that share for the duration. [trade §12]
- TRADE-106 The trade context shall answer `trade_index` as the country's trade income over the last 12 months as an index against a reference of 100 gold a year (config, D-TRADE-17). [trade §12]
- TRADE-107 The trade context shall answer `trade_presence(who, hub, value)` as who's share of all collections in the hub's provinces over the last 12 months. [trade §12]
- TRADE-108 When an event applies `trade_route(from_hub, to_hub, open)`, the trade context shall make that sea passage's zones known to the country for route planning, or mark the link closed when open is false. [trade §12]
- TRADE-109 The trade context shall read `trade_good` as wares made, and keep hubs as named sets of provinces and sea zones used only by triggers, never as route targets. [trade §12]

### 5.14 Starting traders, the AI, speed
- TRADE-110 When a campaign starts, the trade context shall give each country starting traders by its catalogue trade_access: very high 6, high 4, moderate 2, low 1, very low or unknown 0. [trade §13.1]
- TRADE-111 When a campaign starts, the trade context shall give coastal countries with ports trade ships and inland ones caravans or barges, in the proportion the catalogue's trade routes suggest, and seed starting routes from a hand-made config. [trade §13.1]
- TRADE-112 When a campaign loads, the trade context shall run the starting traders for 24 months before the first turn to set starting ratios. [trade §13.1]
- TRADE-113 The AI shall score possible loops among its own cities and enterable foreign cities within reach (about 12 provinces for caravans, 40 sea zones for ships) by expected gold a month after fees, tolls and crowding, minus upkeep, weighted down by danger. [trade §13.2]
- TRADE-114 When the best unused loop beats upkeep by a margin (config by AI personality), the AI shall found a trader; when a trader's loop has lost money for a year, it shall dismiss it. [trade §13.2]
- TRADE-115 The AI shall reroute once a year, and at once when a route breaks. [trade §13.2]
- TRADE-116 While at war, the AI shall pull traders off roads near the front and use trade ships as transports if short of carriers. [trade §13.2]
- TRADE-117 The trade context shall store per province and per sea zone only the trade ratio and traders passing, cache paths per city pair (cleared only when something on the path changes), decay ratios lazily (×0.9ⁿ), and recompute trade value yearly and on change. [trade §13.3]

### Decided 17 October

- TRADE-118 The trade context shall add all ratio-gain modifiers into one share, never below 0. (D-TRADE-9)
- TRADE-119 The trade context shall not let a caravel be set to trade, and shall take each trade ship's upkeep from the naval ship table. (D-TRADE-5)
- TRADE-120 When founding fails for want of crew in the home province's job slots, the trade context shall refuse it. (D-TRADE-12)
- TRADE-121 The trade context shall show a country the trade value and ratio of its own provinces and those its traders entered, of all with T13, and count unseen provinces as 0 in the route preview. (D-TRADE-13)
- TRADE-122 The trade context shall charge a lord's traders no market fee or toll in the realm and let them deposit in any city of the realm into the lord's wealth. (D-TRADE-14)
- TRADE-123 The trade context shall add a building's or lever's "+x % traders passing" as x % ratio gain, and count a pilgrimage shrine as 1 more trader passing a month. (D-TRADE-15)
- TRADE-124 The trade context shall keep no ratio for sea zones and count trade ships sailing through each zone a month for the busiest-sea-lanes lens. (D-TRADE-16)
- TRADE-125 The trade context shall read hubs from config and answer `trade_index` against 100 gold a year. (D-TRADE-17)
- TRADE-126 The trade context shall count as food surplus the food made this year minus what the people eat, never below 0. (D-TRADE-19)
- TRADE-127 When a building buys a material in a province no trade route touches (no route stop, no trader passing in 12 months), the trade context shall charge 25 % more. (D-TRADE-7, X-6)
- TRADE-128 The trade context shall apply heritage levers: `trade_balance_pct` and `traders_passing_pct` on ratio gain, `trader_gain_pct` on each deposit, `trader_count` as extra starting traders. (D-TRADE-7, D-TRADE-18, X-6)

### 5.15 Trade in the game (first slice)
Trade now runs in the game's month (D-TRADE-20): every province has goods and a trade value, traders walk there and back between trade cities, ratios rise and fall, and the ledger's Trade line is what traders deposit, not a flat sum from wealth. Tolls, pacts and embargoes, risks on the road, lords' traders, ships other than the cog, the "once" mode, crafts appearing and inputs along routes come with their contexts.

- TRADE-129 Each January and when a campaign starts, the game shall count each land province's goods: the wares its works make (timber and furs, stone, ore, salt, wool and hides), its food surplus as grain, and crafts made by its craftsmen (a stand-in for the craft buildings, D-TRADE-20), and price them by tier (crafts as finished goods, wares without a tier as staples). [TRADE-025 … TRADE-027; D-TRADE-20]
- TRADE-130 The game shall turn goods into trade value by TRADE-025 with the market step's weight (weekly market, yearly fair, trading house) and, for ships, the harbour's; the weights are halved while the realm neglects its works; the trade value is scaled into the treasury's gold by `trade.game.value_scale`. [TRADE-025, TRADE-029; D-TRADE-20]
- TRADE-131 A province shall be a trade stop for land traders when it is of city size or has a market, and for ships when it has a harbour. [TRADE-049; D-TRADE-20]
- TRADE-132 On the first day of each month, before the ledger is paid, the game shall walk every trader through the month just past at its kind's step days (TRADE-014, TRADE-015, TRADE-017, TRADE-021), counting it once as passing in each province it stood in and half in each port on a sea lane it sailed, collecting on entering a province (TRADE-043, TRADE-045, TRADE-047, TRADE-048), collecting nothing on unclaimed land, and depositing its purse in each trade stop of its own realm that its realm holds. [TRADE-031 … TRADE-048, TRADE-060, TRADE-063]
- TRADE-133 The game shall then move every province's ratio by TRADE-031, with a customs officer's share added and riots' taken off, and no gain where an enemy holds it or lays siege. [TRADE-031, TRADE-035, TRADE-038, TRADE-041, TRADE-118]
- TRADE-134 The ledger's Trade line shall be the realm's deposits and the market fees paid to it in the month just past, less its traders' upkeep (the kind's upkeep at the works' gold scale; a ship's is naval's); a realm unpaid for 6 months in a row loses the trader. Tax owed rises by TRADE-088. [TRADE-007, TRADE-008, TRADE-064, TRADE-088]
- TRADE-135 A realm may found a pack caravan or river barge in an own, unoccupied city with a market, a camel caravan where the city is desert or drylands or it knows T1, a barge only on a river, and a cog from an own port with a harbour; it pays the kind's gold at the works' gold scale (a cog naval's gold), and the crew (50 market folk, or 30 seafolk for a cog) leave the city, refused if there are too few. A founded trader starts on the best loop the AI would pick from its city. [TRADE-003, TRADE-016 … TRADE-018, TRADE-120; D-TRADE-2]
- TRADE-136 A realm may set a trader's route as a start and an end, two different trade stops, walked there and back (D-TRADE-21); each way is the planner's fewest days for the kind, a land province counting less the more people live there (TRADE-052), never through the land of a realm at war with it nor land its enemies hold; the trader walks from where it stands. A trader whose way is shut plans its way again the next month, and the card says why. [TRADE-050 … TRADE-052, D-TRADE-21, TRADE-056, TRADE-057, TRADE-066, TRADE-067]
- TRADE-137 A realm may dismiss a trader; its crew go back to its home city. [TRADE-006]
- TRADE-138 When a campaign starts, each realm shall get its starting traders by TRADE-110 (the hand-made routes where their cities are on the map, otherwise the AI's best loops, from its best cities, a ship from every other port), and 24 months of their walking shall set the starting ratios, the last of them counted as the month before the start. [TRADE-110 … TRADE-112]
- TRADE-139 Once a year, a twelfth of them each month, each AI trader shall be set on its best route from its home to one city within reach, there and back through the busiest land, crowded cities counting half; and an AI realm with starting traders shall found one more when its best route beats upkeep by its margin, while it has at most twice its starting traders. [TRADE-113 … TRADE-115; D-TRADE-20, D-TRADE-21]
- TRADE-140 Traders, their purses, routes and the ratios shall be kept in the save. [SAVE]

#### How the player uses it
- TRADE-141 Where: the player's realm card has a **Trade** tab next to Treasury. From the top: **Last month**, the deposits, market fees and upkeep that make the Trade line; **Traders**, one card per trader, best first, with its kind and home, its route ("Paris → Lyon and back", days there and back), a purse bar, about how much it brings a month, what it deposited last month and, in red, what is wrong; each card has **Route**, **Show** and **Dismiss** (Dismiss asks again before it acts). Then **Found a trader**: the realm's cities that can found one, best first, each with a 44-point button per kind showing its gold and upkeep, greyed with the reason when it can't. Then **Busiest cities**: the realm's trade cities by value and ratio, each opening its province. [X-19, TRADE-098, TRADE-100]
- TRADE-142 Route: tapping **Route** closes the card, turns on the Trade map mode and shows the route bar along the bottom of the map: "Tap where it starts, then where it goes". The first tap on a trade stop is where it starts, the second where it goes, and a further one moves where it goes (a tap elsewhere says why not); the player never draws the way: the planner finds it through the busiest land (D-TRADE-21). The bar shows the two as "From" and "To" chips with the preview (days there and back, provinces it collects in, about how much a month after fees, the best provinces) and the reason in red when it can't be set. **Undo**, **Cancel** and **Confirm**; tapping where it goes again also confirms. The way is drawn on the map while it is chosen. [X-19, TRADE-054, TRADE-096, D-TRADE-21]
- TRADE-143 Map: the **Trade** lens colours provinces by trade ratio, the provinces the player doesn't see in parchment; zoomed in to regional it draws each of the player's traders' ways there and back as a dotted line with the trader where it stands and its purse, and a coin on each trade stop. The province card has a Trade line: its value a month, its ratio, traders passing last month and its top goods, or "not seen" for a province the player doesn't see. [X-19, TRADE-093, TRADE-094, TRADE-121]
- TRADE-144 Grouping and overview: everything about traders is in the Trade tab; the General tab carries one line, "Trade: N traders · +x gold a month", that opens it, and the Treasury's Trade line is the same number. A trader given up for want of pay reaches the News. [X-19, TRADE-099]
- TRADE-145 Phone: the tab fits the side panel in the Wide and Tall layouts, trader cards and found buttons wrap to one column on a narrow panel, the route bar stays inside the safe areas above the map's bottom edge and wraps its buttons, every button is at least 44 points high, nothing needs hover and the panel never scrolls sideways. [X-19, SHELL-108, SHELL-109, SHELL-114]

## 6. Commands

| Command | Who | Preconditions | Result | Events |
|---|---|---|---|---|
| FoundTrader(city, kind) | player / AI / lord | Own city with yearly fair or better, or trading post (T8 overseas); kind's needs; gold; crew available | Trader at home city; crew leave market slots | TraderFounded |
| SetShipToTrade(ship) | player / AI | Ship type has hold and purse; in port | Ship becomes a trade ship | TraderFounded |
| SetRoute(trader, stops, mode) | player / AI | 2–8 stops, all cities, reachable | Route set, paths planned | RouteSet |
| CopyRoute(trader, from) | player | — | Same route | RouteSet |
| DismissTrader(trader) | player / AI | Own trader | Trader removed; crew overflow | TraderDismissed |
| PressShipIntoWar(ship) | player / AI | Trade ship | Stops trading, keeps purse | TraderStopped |
| SetToll(point, rate) | player (province owner) | Owns toll point | Rate none / low / high | — |

## 7. Domain events

| Event | When | Payload | Consumed by |
|---|---|---|---|
| TraderFounded | Trader created | trader, kind, home, crew | province (crew leave slots), realm (gold) |
| RouteSet | Route confirmed | trader, stops, mode | troop-movement (planner) |
| TraderCollected | Enters a province | trader, province, gold, fee | realm (fee to owner) |
| TollPaid | Passes a toll point | trader, point, gold | realm |
| PurseDeposited | Enters own city | trader, city, gold | realm (treasury), game-shell (turn report) |
| TraderRobbed / TraderCaptured / TradeShipLost | Risks | trader, by whom, purse | realm, warfare, game-shell |
| RouteBroken | Stop or path closed | trader, reason | game-shell |
| TraderDismissed / TraderLost | Dismissed, unpaid 6 months | trader | province (overflow) |
| TradeRatioChanged | Monthly | province, ratio | province (tax), buildings (crafts appear), map-presentation |
| TradePartnerCounted | Collect or deposit abroad | country, partner | research |

## 8. Policies

- When **troop-movement**'s day loop moves a trader into a province, then count it passing and collect (TRADE-033, -043).
- When the **day loop** of a month ends, then update ratios (TRADE-031).
- When **warfare** declares war, then send traders inside enemy land home and close routes (TRADE-075, -056).
- When **warfare** reports an enemy army, raid, hunting fleet, blockade, storm loss or escort, then apply TRADE-078..087.
- When **province** sets quarantine, riots, rebels or homeless shares, then apply ratio modifiers and bandits.
- When **province** makes wares (yearly) or a tile burns, then recompute trade value (TRADE-026).
- When **diplomacy** signs a trade pact or embargo, then change fees, tolls and may-enter (TRADE-072, -073).
- When **subjects** reports a tributary, then waive its tolls in the overlord's cities (TRADE-077).
- When **events** apply trade_power, trade_access, world_trade_index or trade_route, then TRADE-103..108.
- When **research** grants T or S inventions, then TRADE-101.
- When **realm** can't pay a trader's upkeep, then count unpaid months (TRADE-007).

## 9. Each turn and each month

Reads first: trader positions from the troop-movement day loop; wares made and trade value (yearly); quarantine, riots,
homeless, armies, sieges, blockades; diplomacy relations.
1. Each turn, during the 7 days of the day loop: traders move; on entering a province they count as passing, collect (crowding counted), pay
   fees and tolls, meet risks, and deposit in own cities.
2. In the turn in which a new month begins, after the day loop: update every touched province's and sea zone's ratio (gain, decay; lazy decay elsewhere).
3. In the same monthly step: charge trader upkeep; count unpaid months.
4. Every turn, the turn report: one deposits line for the week, problem lines.
Yearly: trade value with wares made; AI reroutes and dismissals. The global order is time-and-turns'.

## 10. Configuration

| Key | Meaning | Value in the design | Placeholder? | Config file |
|---|---|---|---|---|
| `ratio.gain_per_trader` | Points per trader passing | 3 | yes | trade-config |
| `ratio.decay_share` | Monthly decay | 0.10 | yes | trade-config |
| `ratio.max` | Ratio cap | 100 | yes | trade-config |
| `ratio.sea_lane_trader_weight` | Ship in a zone counts as | 0.5 | yes | trade-config |
| `ratio.modifiers.*` | Customs +15 %, better road +10 %, peace 10 years +10 %, riots −50 %, homeless −5 % per 5 % over 5 %, enemy army or siege −100 %, quarantine ratio 0 and closed | as listed | yes | trade-config |
| `value.price_per_load.*` | Tier prices | 1, 2, 5, 10, 12 | yes | trade-config |
| `value.traded_food` | Food counted | surplus only | — | trade-config |
| `value.building_weights.*` | Weights and served visits | §4 | yes | trade-config |
| `value.serves_without_market` | Visits without a market | 2 | yes | trade-config |
| `value.city_size_is_city` | Sizes that are cities | city, great city | — | trade-config |
| `collect.visit_share` | Share per visit | 0.2 | yes | trade-config |
| `collect.foreign_market_fee` | Market fee | 0.10 | yes | trade-config |
| `collect.trade_pact_fee` | Fee with a pact | 0 | yes | trade-config |
| `deposit.bills_of_exchange_fee` | Fee abroad | 0.10 | yes | trade-config |
| `deposit.lord_city.to_treasury` | Lord's city share | 1.00 | decided | trade-config |
| `route.min_stops` / `max_stops` | Stops: a start and an end | 2 / 2 | decided | trade-config |
| `route.default_mode` | Mode | there and back | decided | trade-config |
| `route.busy_weight` / `busy_cap` | Pull of populous land on the planner | 1 / 3 | yes | trade-config |
| `route.toll_counts_as_days` | Toll as days | 2 | yes | trade-config |
| `danger.bandit_chance_per_month` | Bandits | 0.05 | yes | trade-config |
| `danger.bandit_when.homeless_share_over` | Bandit homeless share | 0.20 | yes | trade-config |
| `danger.raid_trader_escapes` | Escape a raid | 0.5 | yes | trade-config |
| `danger.t1_bandit_chance_factor` | T1 | 0.5 | yes | trade-config |
| `danger.t11_lost_purse_refund` | T11 | 0.5 | yes | trade-config |
| `land_traders.*` | Kinds | §4 table | yes | trade-config |
| `sea_traders.*`, `s2_hold_bonus` | Ship trade numbers; S2 | §4 table; +0.5 | yes | trade-config |
| `effects.tax_per_ratio_points` | Tax from ratio | +1 % per 4 points | yes | trade-config |
| `effects.crafts_appear_min_ratio` | Crafts floor | 30 | yes | trade-config |
| `effects.missing_input_output` | Missing input | 0.5 | yes | trade-config |
| (design) unpaid upkeep months | Trader lost after | 6 | yes | not yet in config |
| (design) T2, T6, T9, T5, Open the roads | +10 % collections; +2 visits; −25 % ship cost; storms halved; 10 years | as listed | yes | not yet in config |
| `start.traders_by_trade_access` | Starting traders | 6, 4, 2, 1, 0, 0 | yes | trade-config |
| `start.warmup_months` | Warm-up | 24 | yes | trade-config |
| `ai.caravan_reach_provinces` / `ship_reach_sea_zones` | AI reach | 12 / 40 | yes | trade-config |
| `ai.found_margin` | Found when loop beats upkeep by | 1.25 (config only) | yes | trade-config |
| `ai.reroute_every_months` / `dismiss_after_losing_months` | AI timing | 12 / 12 | yes | trade-config |
| `event_mapping.*`, `hubs.*` | Event stats and hubs (Alexandria, Amsterdam, Malacca Strait, and 20 more) | lists empty | yes | trade-config |
| starting routes | Hand-made seeds (Venice, Genoa, Lübeck, Florence, Mali, Kilwa, Calicut and Gujarat, Malacca, Ryukyu) | §13.1 | — | not yet in config |

## 11. Seams

| Other context | Direction | Pattern | What crosses |
|---|---|---|---|
| troop-movement | upstream | Shared Kernel | Mover model, day loop, graph, route planner, step days; trade supplies may-enter, stops-at and raid rules |
| buildings | upstream | Customer–Supplier | Market steps, caravanserai, warehouse, counting house, bank, harbour, trading post, craft buildings, rail stations, roads |
| buildings | downstream | Customer–Supplier | Trade weights and served visits per building; crafts appear only at ratio ≥ 30 %; inputs along routes |
| province | upstream | Customer–Supplier | Wares made, food surplus, toll points and rates, customs officer, riots, rebels, homeless, quarantine, plague, town size |
| province | downstream | Published Language | Trade ratio (tax +1 % per 4 points), traders passing, trade value; replaces province §7 |
| realm | downstream | Customer–Supplier | Deposits, market fees, tolls as trade income; founding gold and upkeep; Traders and Trade ships replace Merchants |
| realm | upstream | Customer–Supplier | Treasury, lords and their wealth, catalogue trade_access |
| naval | upstream | Customer–Supplier | Ship types, buying and crewing, sailors, ports and the 1444 port list, sea-zone step days, pirates |
| naval | downstream | Customer–Supplier | Hold and purse per ship type; ships set to Trade; ports as route stops |
| warfare | upstream | Customer–Supplier | War state, armies, raids, sieges, hunting, escort, blockade, storms, peace term Open the roads, capture |
| diplomacy | upstream | Customer–Supplier | Trade pact, embargo, peace and war (no closed borders, D-TRADE-8) |
| subjects | upstream | Customer–Supplier | Tributary tolls, colony cities as deposit points (proposal) |
| research | upstream | Conformist | T and S invention ids and their trade effects |
| research | downstream | Published Language | Trade partners for invention spread |
| events | upstream | Anti-Corruption Layer | trade_power, trade_access, world_trade_index, trade_index, trade_presence, trade_route, trade_good, hubs, silver flood |
| scenario-setup | upstream | Customer–Supplier | Starting traders and routes from the catalogue; warm-up |
| national-strengths | downstream | Published Language | Levers trader_count, trader_gain_pct, traders_passing_pct, toll_gold_pct, trade_balance_pct; trade_presence condition |
| rebellions | upstream | Customer–Supplier | Rebels holding provinces act as enemy armies |
| map-presentation | downstream | Published Language | Trade lens, trader icons, road thickness |
| game-shell | downstream | Published Language | Trade screen, trader card, route preview, turn-report lines |
| time-and-turns | upstream | Conformist | Day loop, month end, year |

Changes the design asks of other files (§14), recorded here; not edited:
- province-stats: §7 replaced by a summary and link (Market price and Trade balance dropped, Traders passing a count,
  Toll unchanged, Trade value and Trade ratio added); card Trade line; 4.3 market text; 6.4 homeless → −5 % ratio gain;
  10.2 customs officer "+15 % ratio gain; tolls and market fees in full"; 13 gold income; 14 lenses; 15 trade_access;
  17 yearly paths replaced; 18 links. **Not adopted** as of reading: province §7 still has market price, trade balance
  and yearly trader paths (D-TRADE-7).
- country-stats: card "Traders 8"; Gold row; §9 Merchants → Traders and Trade ships; §10–11 trade_access.
- research-tree: T-branch effect texts. **Not adopted**: T1 still "caravans lose less on long routes", T6 "+1 merchant slot".
- warfare 11.3: hunt takes purses; blockade closes ports to trade ships.
- troop-movement 11.4: answered here (may enter 7.1, stops at 8.1, raid takes purse).
- naval: hold and purse in its ship table (**adopted**, with caravel and steamer differences: D-TRADE-5).
- buildings: trade weights; served visits; deposit in any own city (warehouse stores only) (D-TRADE-4).
- diplomacy: trade pact, embargo, closed borders (pact and embargo adopted in diplomacy 6.5; closed borders absent).
- subjects: tributary toll waiver taken in; colony cities as deposit points (proposal).

## 12. AI

- Scores loops among own cities and enterable foreign cities in reach (≈12 provinces caravans, ≈40 sea zones ships):
  expected gold a month after fees, tolls and crowding, minus upkeep, weighted down by danger (TRADE-113).
- Founds a trader when the best unused loop beats upkeep by a margin set by AI personality (merchant republics found
  more); dismisses one whose loop has lost money for a year (TRADE-114).
- Reroutes yearly and at once when a route breaks (TRADE-115).
- At war: pulls traders off roads near the front; uses trade ships as transports if short of carriers (TRADE-116).
- Lords run their own traders (TRADE-011). Traders default to waiting a day and going round enemy armies (TRADE-079).

## 13. Decisions and open questions

- **D-TRADE-1** (was OQ-TRADE-1) Balancing: keep 3 ratio points per trader, a tenth decay a month and a 0.2 visit share as provisional numbers in `trade.json` (`_provisional`). Tuning is a balance pass on these numbers, not a rule change.
- **D-TRADE-2** (was OQ-TRADE-2) Where a trader may be founded: in an own city with a market of any step (weekly market or better), or in an own trading post once T8 is known. The latest and simplest text ("your city with a market") wins, and T8 then has a real effect.
- **D-TRADE-3** (was OQ-TRADE-3) Yearly fair unlock: T6 is needed to build a new yearly fair; fairs standing at the start stay, and founding needs only a market (D-TRADE-2), so 1444 realms can found traders. X-6 keeps trade's T-branch texts, and this keeps both the start and T6 working.
- **D-TRADE-4** (was OQ-TRADE-4) Building roles: trade's own roles stand: caravanserai +25 % weight for land traders and stops bandits, counting house and bank take foreign deposits with T3, warehouse only adds weight (deposits happen in any own city anyway). Trade v2 is the latest design and buildings follow it.
- **D-TRADE-5** (was D-TRADE-5) Ships: the caravel cannot be set to trade; cog, galley, carrack, galleon, fluyt and steamer can, and each ship's upkeep is naval's one upkeep. One ship, one upkeep, and naval names the caravel an exploration ship.
- **D-TRADE-6** (was OQ-TRADE-6) 1444 ports: `start-ports.json` (236 harbour provinces) sets the sea ends of routes and the starting ports. It is the list buildings and naval already read.
- **D-TRADE-7** (was OQ-TRADE-7) Dropped province stats: as X-6 says, a material costs its price per load, 25 % more where no trade route touches the province (no route stop and no trader passed in 12 months); `trade_balance_pct` and `traders_passing_pct` add to ratio gain, `trader_gain_pct` to each deposit, `trader_count` to starting traders. X-6 decides it.
- **D-TRADE-8** (was OQ-TRADE-8) Closed borders: there are none; only an embargo shuts traders out. Diplomacy has no such act.
- **D-TRADE-9** (was OQ-TRADE-9) Ratio-gain modifiers add together (customs +15 %, better road +10 %, 10 years of peace +10 %, riots −50 %, −5 % for every full 5 % of homeless over 5 %, event trade_access, heritage and building shares), never below 0; an enemy army or siege gives no gain. "Better road" means better than every neighbour's. Adding is the simplest rule to read.
- **D-TRADE-10** (was OQ-TRADE-10) Customs officer: there is no reduction without one; the officer only adds +15 % ratio gain. "In full" is dropped as it named no rule.
- **D-TRADE-11** (was OQ-TRADE-11) Trade ships with unpaid upkeep are lost after 6 months, like land traders. Same rule for every trader.
- **D-TRADE-12** (was OQ-TRADE-12) Crew: a land trader's crew comes from the home province's job slots of the crew's class (market folk, or craftsmen for rail freight); founding is refused if there are too few. Same levy-like rule for all kinds.
- **D-TRADE-13** (was OQ-TRADE-13) Visibility: a country sees the trade value and ratio of its own provinces and of every province its traders entered; with T13 of every province. The route preview counts provinces it cannot see as 0. This gives T13 its stated effect.
- **D-TRADE-14** (was OQ-TRADE-14) Lords' traders count as the crown's at home: no market fee or toll in the realm, and they deposit in any city of the realm into the lord's wealth. Lords are part of the realm.
- **D-TRADE-15** (was OQ-TRADE-15) "+x % traders passing" effects (Djenné +20 %, Taj Mahal +30 %, `traders_passing_pct`) add x % to ratio gain; a pilgrimage shrine counts as 1 more trader passing a month (provisional). Traders passing is a count, so percentages act on the gain it drives.
- **D-TRADE-16** (was OQ-TRADE-16) Sea zones have no trade ratio; trade counts ships sailing through each zone a month for the busiest-sea-lanes lens only. Sea lanes already lift port provinces.
- **D-TRADE-17** (was OQ-TRADE-17) Hubs: config names 10 hubs (alexandria, amsterdam, malacca_strait, venice, genoa, seville, bruges_antwerp, tabriz, aleppo, volga) as provisional province and sea-zone sets; `trade_index` = trade income over the last 12 months ÷ 100 gold × 100 for every country (provisional). Simple and readable by triggers.
- **D-TRADE-18** (was OQ-TRADE-18) The v1 README text is superseded by collect-on-enter; `trader_gain_pct` is a percentage on each deposit (X-6). The latest decision wins.
- **D-TRADE-19** (was OQ-TRADE-19) Food surplus = food made in the province this year minus what its people eat, never below 0, whatever the store holds. Simplest measurable rule.
- **D-TRADE-20** First game slice (milestone 8, provisional): goods are what the game already makes (works' wares, food surplus as grain) plus crafts by craftsmen until the craft buildings make wares; trade value is scaled into the treasury's gold (`trade.game.value_scale`, so the world's trade income in 1444 is about the old flat Trade line) and so are purses; trader gold and upkeep use the works' gold scale. Trade runs once a month on its first day. Kinds in the slice: pack and camel caravans, river barges and the cog. The AI reroutes a twelfth of its traders each month, and only realms with starting traders found more, at most twice as many. Tolls, pacts, embargoes, risks, lords' traders and the other ships wait on their contexts. The smallest slice that replaces the flat line with traders the player steers.
- **D-TRADE-21** Routes are a start and an end (Leroy, 18 October): the player sets only where a trader starts and where it goes, never the way or stops between; the planner finds the way there and back, drawn toward the most populated land (each land province's days divided by 1 + `route.busy_weight` × its people over the world's average, at most `route.busy_cap` times), since busy land is where trade is. The loop mode goes, there and back is the default, once stays. The 1444 routes are each a start and an end (the old multi-stop ones split into pairs). Supersedes TRADE-050's 2 to 8 stops.

## 14. Traceability

| Requirement | Feature file | Scenario |
|---|---|---|
| TRADE-001..012 | traders.feature | all scenarios |
| TRADE-013..023 | trader-kinds.feature | all scenarios |
| TRADE-024..030 | trade-value.feature | all scenarios |
| TRADE-031..042 | trade-ratio.feature | all scenarios |
| TRADE-043..048 | collecting.feature | all scenarios |
| TRADE-049..059 | routes.feature | all scenarios |
| TRADE-060..065 | deposits.feature | all scenarios |
| TRADE-066..077 | access-tolls-diplomacy.feature | all scenarios |
| TRADE-078..087 | risks.feature | all scenarios |
| TRADE-088..092 | trade-effects.feature | all scenarios |
| TRADE-093..100 | trade-screens.feature | all scenarios |
| TRADE-101, TRADE-102 | trade-research.feature | all scenarios |
| TRADE-103..109 | event-mapping.feature | all scenarios |
| TRADE-110..117 | start-ai-performance.feature | all scenarios |
| TRADE-118, TRADE-123 | trade-ratio.feature | Ratio gain modifiers add together; "Traders passing" effects |
| TRADE-119 | trader-kinds.feature | Which ships can trade |
| TRADE-120, TRADE-122 | traders.feature | Crew from the home province's job slots; A lord's traders count as the crown's at home |
| TRADE-121 | routes.feature | What a country can see of trade; The preview counts provinces it cannot see as nothing |
| TRADE-124 | trade-screens.feature | Busy sea lanes are counted, not given a ratio |
| TRADE-125 | event-mapping.feature, trade-screens.feature | trade_index against the reference; Hubs as the event tree reads them |
| TRADE-126 | trade-value.feature | What the food surplus is |
| TRADE-127 | trade-effects.feature | Materials cost more where no trade route touches |
| TRADE-128 | deposits.feature, start-ai-performance.feature | A heritage lever on deposits; The heritage lever trader_count |
| TRADE-129 … TRADE-140 | — | Engine: packages/engine/test/trade.test.ts (goods, value, stops, the month, ratios, the Trade line, founding, routes, dismissing, the start, the AI, saves) |
| TRADE-141 … TRADE-145 | — | Presentation: apps/client/src/ui/trade.ts, the Trade tab, route bar and lens; screenshots from apps/client/scripts/trade-shots.mjs |
