# Naval (NAVY)

## 1. Purpose and scope

This context decides how a realm gets ships to sea and keeps them there: which provinces are ports, where
sailors come from, how ships are bought and crewed, who commands a fleet, how ships are kept, supplied and
wear out, how fast and where fleets sail, and the crew, boarding, prize and pirate rules added on top of sea
battles.

**In scope**
- Ports: what makes a port, the naval numbers of the port buildings (berths, slipways), the 1444 ports data.
- Sailors: mustering, other sources, moving, releasing, and what going to sea gives and takes from a province.
- Buying ships: the crew-in-port rule, ship families, the ship table (cost, crew, months, upkeep), small
  craft, buying abroad, other ways to get ships.
- Fleets and ships: the fleet, ship stats (crew, hull, supply, age), under-crewing.
- Admirals: commissioning from officials, sea skills, which officials make which admirals, other leaders.
- Keeping ships: the three ship states, berths and the anchorage, docking and resupply, supply at sea.
- Sailing: step days per zone, where a ship may sail by research, winds, storms and ice, the room an army takes.
- At sea against an enemy: crew share, boarding, prizes, pirates, ports at war.
- Naval AI and the phone budget for fleets.

**Not in scope (owned by …)**
- The building list, building costs, slots and build times: buildings (harbour, shipyard, lighthouse, naval base).
- Ship fighting strength, room, sea battle bell rules, blockade/carry/hunt/escort orders and storm loss rates:
  warfare (11.1 to 11.3).
- Moving on the shared map and clock, the route planner, boarding and landing: troop-movement (11).
- Traders, trade routes, and what trade ships earn (hold, purse): trade.
- When exploration ships unlock, voyages into the fog, the charted map, colonial governors and colonies:
  exploration.
- The levy, commanders from officials, the empty province an official leaves: recruiting.
- Seafolk class, food stores, officials, grievances, fisheries: province.
- The *Ships* country stat and lords: realm.
- The S bough of research: research.
- Docking rights between realms, selling hulls between realms, privateers dragging a realm into war: diplomacy.
- Drawing ports, fleets and the Sea lens: map-presentation (this spec lists what the naval design asks it to show).

## 2. Sources

Newest decision first.
- `planning/gap-lists.md`, "Decisions already made" (16 Oct): one month per turn (since replaced: a turn is one week, X-18); multiplayer-friendly orders
  as data; women can be rulers, lords and commanders; exploration opens with the Age of Exploration; campaign
  ends 31 August 1939.
- `naval/naval-design.md` (version 1), all sections 1 to 14.
- `naval/README.md` (file list, placer tool).
- `naval/data/ports-1444.tsv`, `naval/data/ports-1444.json`, `naval/data/start-ports.json` (structure and counts only).
- Read for seams and contradictions: `exploration/exploration-design.md` 2.1, 9; `buildings/buildings-design.md`
  7.9; `warfare/warfare-design.md` 11; `troop-movement/troop-movement-design.md` 11; `trade/trade-design.md`
  (v2) 2, 3.2; `country-stats/research-tree.md` (S bough, T5); `province-stats/province-stats-design.md` 12.1,
  13, 16; `country-stats/country-stats-design.md` 6; `subjects/subjects-design.md` 12, 16; `diplomacy/diplomacy-design.md`.

## 3. Ubiquitous language

| Term | Meaning | Not to be confused with |
|---|---|---|
| Port | A province with a harbour on a shore tile. Only a port can muster sailors, buy ships (other than small craft) and give berths | Plain shore; canoe landing |
| Plain shore | A coastal province without a harbour: seafolk fish from the beach and launch small craft, armies can land, no ship bought, berthed or crewed | Port |
| Canoe landing | A 1444 port tier: no harbour, extra seafolk, small craft only. The trading towns of the Americas, Atlantic Africa and Mozambique | Small harbour |
| Port tier | One of great port, port, small harbour, canoe landing (data value `great`, `port`, `small`, `landing`) | Harbour step |
| Harbour step | Harbour 1 *harbour*, 2 *port*, 3 *great port* | Port tier |
| Shipyard step | Shipyard 1 *slipway yard*, 2 *shipyard*, 3 *naval dockyard*; the Venetian Arsenal is shipyard step 4 | Arsenal (the land arms store building) |
| Berth | Room for one ship in a port to shelter, resupply and (from harbour 2) refit | Anchorage |
| Anchorage | Where ships ride beyond a port's berths: resupply but no refit, rot and storms as at sea | Berth |
| Drawn up | Galleys, cogs and small craft pulled on the beach in a port: no berth taken, rot at the anchorage rate | Laid up |
| Slipway | Room in a shipyard to build one hull at a time | Berth |
| Sailor | A person mustered from a port province's people, counted one by one; their home slot stays empty while they serve | Seafolk (the class), crew |
| Sailors in port | Mustered sailors waiting in a named port to board a ship | Crew |
| Crew | Sailors aboard a ship; also the crew number a ship type needs | Sailors in port |
| Muster | The act that turns people of a port province into sailors | Levy (recruiting) |
| Bounty | Gold paid for signing sailors on at a muster | Wage |
| Pressing | After S9, taking seafolk men as sailors without the bounty, causing the *Pressed* grievance | Muster |
| Ship family | Trade, military or exploration; sets the supply a ship carries | Ship type |
| Small craft | Fishing boats, canoes, dugouts and rafts: 6 sailors, coastal only (ocean with S3), never fight | Trade ship |
| Hull | A ship's condition: sound, worn, leaking, wrecked | Damage (warfare 11.2 hits) |
| Refit | Repairing a hull in a berth at harbour 2 or better, or at any shipyard | Resupply |
| Supply | Zones a ship can still sail before it must dock; 1 used per zone | Colony stores; food reserve |
| Colony stores | Food an exploration ship carries apart from its supply, for colonies (exploration) | Supply |
| Dock | Put into a port to resupply (and refit where allowed) | Berth |
| Fleet | One admiral and any number of ships | Trade ships (no admiral) |
| Admiral | An official (or ruler, heir, lord, privateer, chief or elder) leading a fleet | Commander (land) |
| Vice-admiral | Up to two officials or lords leading part of a large fleet's line | Captain (land, warfare 4.5) |
| Ship state | At sea, in port crewed, laid up | Hull step |
| Laid up | A ship in port with no crew, at a tenth of upkeep | Drawn up |
| Fit out | Bringing a laid-up ship back into service: crew back in port plus a month | Buy |
| Step days | Days a fleet needs to cross one sea zone | Supply |
| Coastal zone / ocean zone | Sea zone with terrain `sea` (about 150 km) / `ocean` (about 300 km) | |
| Prize crew | Sailors put aboard a captured ship (at least a quarter of its crew) | Prize crews (taken-in enemy sailors, 2.3) |
| Pirate fleet | A hunting fleet with no country tied to a pirate coast in config | Privateer (hired) |
| Pirate coast | A config entry: home zones and a base for a pirate fleet | |
| Start ports | The buildings design's `start_ports` table: harbour and shipyard step per province in 1444 | Ports data (per town) |

## 4. Domain model

### Aggregates

**Port** (identity: province id; exists while the province has a harbour on a shore tile)
- Holds: harbour step, shipyard step (0 to 3, or 4 for the Arsenal), berths (from harbour step, halved when
  fallow, lowered when the harbour falls a step), slipways (from shipyard step, idle without timber in reach),
  sailors in port (by owner: own, foreign hired, lord's), hulls on slipways (type, crew assigned, months left),
  hulls built on the harbour (at most one), ships in port (berthed, drawn up, at anchorage; each crewed or laid up),
  lighthouse present, naval base present, blockaded flag.
- INV-NAVY-1: A province without a harbour on a shore tile has no berths, no slipways and no sailors in port.
- INV-NAVY-2: Berthed ships take at most the port's berths; a ship of the line or larger takes two berths;
  drawn-up galleys, cogs and small craft take none; ships beyond the berths are at the anchorage.
- INV-NAVY-3: Hulls building on slipways ≤ slipways; at most one hull built on the harbour without a slipway.
- INV-NAVY-4: Every hull on order has its full crew assigned from sailors in port of that port.
- INV-NAVY-5: A hull needing a shipyard step is built only on a slipway of that step or higher.

**Fleet** (identity: fleet id; owner country)
- Holds: admiral (person reference), up to two vice-admirals, ships, position and route (a troop-movement
  mover), order, cargo (army, sailors as passengers, a colonial governor).
- INV-NAVY-6: A fleet of warships or troop carriers outside port has an admiral.
- INV-NAVY-7: A fleet sails at the step days of its slowest ship.
- INV-NAVY-8: A fleet enters only zones every ship in it may enter (7.2), and an uncharted zone only if every
  ship is an exploration ship.

**Ship** (identity: ship id; part of a fleet or of a port)
- Holds: type, family, crew (sailors aboard), hull step, supply (zones left), age (years since launch),
  state (at sea / in port crewed / laid up), colony stores (exploration ships), owner (realm or lord), set to trade flag.
- INV-NAVY-9: Supply ≤ the family's supply (trade 15, military 15, galleys 6, exploration 60).
- INV-NAVY-10: A laid-up ship has crew 0.
- INV-NAVY-11: A ship with crew under a quarter of its crew number cannot leave port.
- INV-NAVY-12: A laid-up ship left 10 years is wrecked.

**Sailor pool of a province** (part of the province's people, counted per home province)
- Holds: sailors serving (in port, aboard, walking), by home province and class taken from; months served at sea
  in the last years; seafolk lost at sea in the last 5 years.
- INV-NAVY-13: Sailors + levied men from a province never exceed its fighting-age men (a quarter of its people),
  and sailors per class never exceed that class's share (seafolk 2 in 3, homeless 1 in 3, others 1 in 20 of the
  class's fighting-age men).

**Pirate fleet** (identity: pirate coast id from config)
- Holds: home zones, base province, ship count, hunting flag, ended flag.

### Entities and value objects

- **Ship type** (config row): family, unlocking invention, built at (any shore / harbour or slipway / shipyard
  step), crew, gold, timber (and iron for the steamer), months, upkeep, hold and purse (trade's numbers),
  colony stores, step days coastal/ocean, berths taken. Values in section 10.
- **Hull step**: sound → worn → leaking → wrecked.
- **Admiral skills**: Might, Cunning, Logistics (warfare 4.2), trait, sea style.
- **Official-to-admiral row**: official type → starting skills and trait offered (5.3).
- **Docking right**: own/lord/subject/ally → food; not at war and not rival → gold; at war or rival → none.
- **Wind calendar**: per sea, per month: wind direction; storm season; freeze season (config).
- **Ports 1444 row** (`ports-1444.tsv`): name, lat, lon, holder_1444 (catalogue id), tier, shipyard (y/n),
  source (`cat` named in the catalogue / `add` added from history), note. 317 towns: 32 great, 110 port,
  162 small, 13 landing; 53 with a shipyard; 217 `cat`, 100 `add`.
- **Ports 1444 placement** (`ports-1444.json`): `ports` (315 placed towns with province, province name, map
  owner, offset), `provinces` (248: 31 great, 97 port, 108 small, 12 landing; 51 with a shipyard), `not_placed`
  (Melos, Malé).
- **Start ports** (`start-ports.json`): `start_ports` list of 236 provinces {province, harbour 1|2, shipyard
  0|1|2|4, ports[]}; canoe-landing provinces are not in it; 51 with a shipyard (43 at step 1, 7 at step 2,
  Venice at 4). The note says harbour step 2 needs a market town or bigger and setup lowers it to 1 where the
  town is smaller.

### Domain services

- **Muster calculator**: who can be called per class, bounty, fish lost, wage, ready time.
- **Step-day rule** (fleet's step days for troop-movement): ship type × zone terrain × wind × admiral Cunning ×
  under-crewing.
- **May-enter rule**: research (S1, S5, S3, T5 monsoon seas), galleys, charted map (exploration), freeze, enemy
  war fleet (small craft).
- **Resupply service**: docking right, cost per zone per ship, limited by province food.
- **Port placer** (`tools/place_ports.py`): places towns into provinces; rerun when the TSV or the map changes.

## 5. Requirements

### Ports

- NAVY-001: The naval system shall treat a province as a port when it has a harbour on a shore tile. [naval §1.1]
- NAVY-002: The naval system shall allow mustering sailors, buying ships (other than small craft) and berthing
  ships only in a port. [naval §1.1]
- NAVY-003: If a coastal province has no harbour, then the naval system shall treat it as a plain shore where
  seafolk fish from the beach, small craft can be launched and armies can land, and where no ship can be bought
  (other than small craft), berthed or crewed. [naval §1.1]
- NAVY-004: The naval system shall give a port 10 berths at harbour 1, 25 at harbour 2 and 50 at harbour 3. [naval §1.2]
- NAVY-005: The naval system shall give a shipyard 1 slipway at step 1, 2 at step 2, 2 at step 3, and 3 for the
  Venetian Arsenal (shipyard step 4). [naval §1.2]
- NAVY-006: The naval system shall allow at harbour 1 mustering, buying and resupply; from harbour 2 also refit
  and hiring foreign crews; from harbour 3 also coaling for steamships and later ships. [naval §1.2]
- NAVY-007: The naval system shall allow shipyard 1 to build galleys and, faster, every hull that needs no
  slipway; shipyard 2 also carracks, armed carracks, galleons, turtle ships and fluyts; shipyard 3 also ships of
  the line, then ironclads and later hulls; the Venetian Arsenal builds as a naval dockyard from the start. [naval §1.2]
- NAVY-008: Where a lighthouse stands, the naval system shall halve the storm chance in the sea zone next to it. [naval §1.2; buildings §7.9] (D-NAVY-7)
- NAVY-009: Where a ship is crewed in port at a naval base, the naval system shall charge upkeep and food but no
  wages. [naval §1.2, §6.1]
- NAVY-010: The naval system shall have each ship take one berth, and a ship of the line or anything larger take two. [naval §1.2]
- NAVY-011: Where a ship is a galley, cog or small craft, the naval system shall allow it to be drawn up on the
  beach in a port, taking no berth and rotting at the anchorage rate. [naval §1.2, §6.2]
- NAVY-012: When the 1444 ports are placed, the naval system shall put each town in the province under its
  latitude and longitude or else the nearest coastal province within about 80 km, and give each province the
  highest tier among its towns and a shipyard if any of its towns had one. [naval §1.3]
- NAVY-013: When a campaign starts in 1444, the naval system shall give a great-port province harbour 2; a
  port-tier province harbour 2, or harbour 1 where the town is smaller than the market town harbour 2 needs; a
  small-harbour province harbour 1; and a canoe-landing province no harbour, 100 extra seafolk and 5 small craft only (provisional, D-NAVY-10). [naval §1.3; start-ports.json note]
- NAVY-014: When a campaign starts in 1444, the naval system shall give a province marked with a shipyard
  shipyard 1, or shipyard 2 where its holder knows S4 *Carrack and caravel* at the start, and give Venice the
  Venetian Arsenal. [naval §1.3]
- NAVY-015: The naval system shall publish the per-province 1444 result as the `start_ports` table
  (`start-ports.json`) for the buildings design and scenario setup. [naval §1.3, §13]
- NAVY-016: If a 1444 port town falls on no land of the current map (Melos, Malé), then the naval system shall
  leave it unplaced until the map gains small islands. [naval §1.3]
- NAVY-017: The naval system shall let any realm make a new port by building a harbour on any shore tile it
  holds, by the buildings rules. [naval §1.3]
- NAVY-018: When a harbour is burned in a raid or sacked with the town, the naval system shall lower it a step;
  while a harbour's slots are under half filled, the naval system shall halve its berths (fallow). [naval §1.4]
- NAVY-019: If a shipyard is burned, has no timber in reach, or has its slots under half filled, then the naval
  system shall stop its slipways (lost or standing idle). [naval §1.4]
- NAVY-020: The naval system shall raise a port's sailors in port by mustering, crews paid off there and sailors
  arriving by road or aboard, and lower it by boarding a new ship or fleet, release to their slots, desertion
  when unpaid and plague in the port. [naval §1.4]
- NAVY-021: The naval system shall raise a port's ships in port by building and fleets putting in, and lower them
  by sailing, sinking or burning in port, and rot. [naval §1.4]

### Sailors

- NAVY-022: When sailors are mustered, the naval system shall change people into sailors one by one, each
  leaving their class and leaving their home slot empty until released. [naval §2.1]
- NAVY-023: The naval system shall count every sailor the same toward a ship's crew. [naval §2.1]
- NAVY-024: The naval system shall offer *Muster sailors* on a port, or on the country card for several ports at
  once, with one slider, only for provinces with a harbour. [naval §2.2]
- NAVY-025: The naval system shall let a muster call, of a province's fighting-age men (a quarter of its people),
  2 in 3 of the seafolk, 1 in 3 of the homeless and 1 in 20 of every other class. [naval §2.2]
- NAVY-026: When sailors are mustered, the naval system shall take every callable class by its share, by largest remainder, never seafolk first. [naval §2.2; X-7] (D-NAVY-29)
- NAVY-027: The naval system shall take sailors from the same people as the levy, so a man at sea cannot be
  levied and the province's levy pool shows the sailors already gone. [naval §2.2]
- NAVY-028: When a muster is ordered, the naval system shall pay a bounty of 0.05 gold a sailor (rounded), lower the
  province's fish by seafolk at sea ÷ a third of the province's seafolk, and have the sailors ready in that port after 14 days. [naval §2.2, §9] (D-NAVY-14)
- NAVY-029: While sailors wait in port, the naval system shall feed each 1 ration a month from the province store
  and pay each 0.1 gold a month. [naval §2.2]
- NAVY-030: While sailors have waited in port more than 6 months and no ship is being built for them, the naval
  system shall send 1 in 10 of them back to their slots each month. [naval §2.2]
- NAVY-031: Where a port is at harbour 2 or better, the naval system shall allow hiring foreign crews from a
  seafaring people whose ships call there, arriving as sailors in that port, paid twice the wage, leaving when unpaid. [naval §2.3]
- NAVY-032: Where a lord's lands include a port and the lord is loyal, the naval system shall let him muster his
  own sailors there by the same rules and bring his ships when called; his ships and crews stay his. [naval §2.3, §3.6]
- NAVY-033: When a ship is captured, the naval system shall allow its sailors to be taken into service as
  sailors, and 1 in 4 of them shall desert at the first port friendly to them. [naval §2.3]
- NAVY-034: Where the realm knows S9 *Line-of-battle tactics*, the naval system shall allow pressing seafolk men
  in a port without the bounty, and give the province the *Pressed* grievance for a year. [naval §2.3]
- NAVY-035: The naval system shall move sailors by road to another port of the same realm at levy marching pace,
  eating on the way, or aboard any ship with room as passengers counted as men carried. [naval §2.4]
- NAVY-036: When a crew is paid off (a ship laid up or a fleet disbanded), the naval system shall send its sailors
  to walk home and refill the emptiest slots of their own province, and return them as homeless where those slots
  were filled by others. [naval §2.5; recruiting §6.2]
- NAVY-037: When a province's men have served 2 years or more at sea, the naval system shall give that province
  +10 % fish and +10 % traders by sea for 10 years. [naval §2.6]
- NAVY-038: The naval system shall spend a fifth of the wages of sailors in port in that port as trade for its
  market folk. [naval §2.6]
- NAVY-039: While sailors are away, the naval system shall leave their fishery, harbour or shipyard slots empty,
  and a fishery under half filled shall be fallow with no fish. [naval §2.6]
- NAVY-040: If a muster takes the seafolk a shipyard fills its slots from, then the naval system shall stop its
  slipways. [naval §2.6]
- NAVY-041: When a province loses more than a tenth of its seafolk at sea within 5 years, the naval system shall
  give it fewer births for 10 years and the *Lost at sea* grievance for 2 years. [naval §2.6]

### Buying ships

- NAVY-042: When a ship is ordered, the naval system shall require in the same port enough sailors in port for its
  crew, a free slipway of the step the hull needs (or only the harbour for small hulls), and the gold and timber,
  paid when the order is placed. [naval §3.1]
- NAVY-043: When a ship is ordered, the naval system shall assign the crew to the hull, and the crew shall help
  build it alongside the shipyard's own seafolk. [naval §3.1, §3.3]
- NAVY-044: If a port lacks the sailors for a ship's crew, then the naval system shall refuse the order. [naval §3.1]
- NAVY-045: The naval system shall sell only ship types the realm has unlocked in the S bough (and, for
  exploration ships, the exploration unlock). [naval §3.3, §3.2]
- NAVY-046: The naval system shall put every ship type in one family, trade, military or exploration, carrying 15
  zones of supply (trade, military), 6 (galleys) or 60 plus a hold of colony stores (exploration). [naval §3.2]
- NAVY-047: The naval system shall use the ship table (section 10) for each type's family, unlock, where built,
  crew, gold, timber, months, upkeep, and trade's hold and purse. [naval §3.3]
- NAVY-048: Where a port has no slipway, the naval system shall let its harbour build cogs, junks, dhows and
  caravels one at a time, taking half as many months again; with slipways, at the table's months, as many at once
  as there are slipways. [naval §3.3]
- NAVY-049: The naval system shall make the cog, junk or dhow type follow the sea: cog in Europe, junk in East and
  Southeast Asia, dhow in the Indian Ocean and Red Sea. [naval §3.3]
- NAVY-050: Where a ship type shoots (armed carrack and later), the naval system shall require its guns, cast or
  bought as for gun crews, and powder for each voyage. [naval §3.3; recruiting §4.2]
- NAVY-051: While a port is blockaded, the naval system shall let it keep mustering and building but let nothing
  leave it without a battle. [naval §3.3, §8]
- NAVY-052: When an enemy takes a port, the naval system shall give the occupier every hull on its slipways. [naval §3.3, §8]
- NAVY-053: Where a great port with a shipyard belongs to a foreign realm at peace with the buyer and its owner
  agrees, the naval system shall let the buyer order a hull there on the seller's slipway at 1.5 times the gold,
  with the buyer's crew waiting there as sailors in a foreign port paid double. [naval §3.4]
- NAVY-054: The naval system shall let small craft be bought on any shore tile with seafolk, harbour or not, crewed
  by 6 sailors each, each carrying 10 men or a load of goods along coastal zones only, able to land an army on any
  shore, and serving as the fishery's boats. [naval §3.5]
- NAVY-055: The naval system shall never let small craft fight a sea battle, and shall close a zone with an enemy
  war fleet to them. [naval §3.5, §7.4]
- NAVY-056: Where a realm knows S3 *Outrigger voyaging*, the naval system shall let its small craft cross ocean
  zones and let it build war canoe fleets and voyaging canoes on any beach. [naval §3.5]
- NAVY-057: The naval system shall also give ships by capture with a prize crew, a loyal lord's ships for the time
  of his service, hired privateers or corsairs (ship, crew and commander for a season), and events (a treasure
  fleet, a gift from a sea power, a wreck salvaged). [naval §3.6]

### Fleets and ships

- NAVY-058: The naval system shall group ships at sea or ready to sail into fleets of one admiral and any number of ships. [naval §4.1]
- NAVY-059: The naval system shall count for each ship its crew, hull, supply and age (years since launch, +1 each year). [naval §4.2]
- NAVY-060: The naval system shall lower a hull a step for battle hits, every 6 months at sea, storms, and rot
  while laid up or in port. [naval §4.2, §6.1]
- NAVY-061: While a ship is in a berth where it may refit, the naval system shall refit a worn hull to sound in a
  month and a leaking one in 3 months, twice as fast with a shipyard. [naval §4.2]
- NAVY-062: The naval system shall sail a worn ship as normal, a leaking ship at half speed losing a hull step in
  each storm, and a wrecked ship only limping to the nearest port, sinking at the next storm. [naval §4.2]
- NAVY-063: While a ship has fewer sailors than its crew number, the naval system shall make it fight in
  proportion to its crew share and need more days per zone (100 of 200: half strength, twice the days). [naval §4.3, §8]
- NAVY-064: If a ship's crew is below a quarter of its crew number, then the naval system shall keep it in port. [naval §4.3]

### Admirals

- NAVY-065: If a fleet of warships or troop carriers would leave port without an admiral, then the naval system
  shall keep it in port; such ships can still defend the port in a sea battle in the port's own zone. [naval §5.1]
- NAVY-066: The naval system shall let trade ships sail with no admiral, under the country they belong to, on the
  routes the trade design gives them. [naval §5.1]
- NAVY-067: When an official is commissioned as admiral, the naval system shall use the same act as an army
  commander: the official leaves the province he ran (handled as recruiting 7.4) and returns to a province of the
  player's choice when released. [naval §5.1; recruiting §7.1, §7.4]
- NAVY-068: The naval system shall let a large fleet have up to two vice-admirals, officials or lords, each
  leading part of the line in a sea battle. [naval §5.1]
- NAVY-069: The naval system shall give an admiral's Might +5 % hits per point to ships in his part of the line,
  and +10 % per point for soldiers and crew he leads aboard in boarding. [naval §5.2]
- NAVY-070: The naval system shall give an admiral's Cunning the orders per bell in a sea battle, sight of enemy
  fleets one zone further, slipping away at night, and −5 % days per zone per point. [naval §5.2]
- NAVY-071: The naval system shall give each point of an admiral's Logistics −10 % storm losses, and at 3 or more
  make every tenth zone sailed use no supply. [naval §5.2]
- NAVY-072: The naval system shall gain and lose admiral skills by the warfare rules counting sea victories as
  victories, and give +1 Logistics for every 3 years at sea without losing a ship to a storm. [naval §5.2; warfare §4.2]
- NAVY-073: When an official is commissioned as admiral, the naval system shall set his starting skills and offered
  trait by his official type (section 10 table), with years served in a port province counting double. [naval §5.3]
- NAVY-074: When an admiral is commissioned, the naval system shall give him the realm's current sea style. [naval §5.3]
- NAVY-075: The naval system shall also let a fleet be led by the ruler or an heir (lost at sea or captured:
  succession crisis), a lord (his own ships, or the realm's if he is loyal; a proud lord won't sail under an
  official admiral), a hired privateer or corsair for a season (leaves when unpaid; may raid neutral shipping and
  drag the employer into a war), or, in realms with no officials, a chief or elder. [naval §5.4]

### Keeping ships

- NAVY-076: The naval system shall keep every ship in one of three states: at sea (full crew paid 0.2 gold a month
  each, upkeep, supply used, a hull step every 6 months), in port crewed (full crew paid 0.1 gold and 1 ration a
  month each from the port's province, upkeep, a hull step every 3 years) or laid up (no crew, a tenth of upkeep,
  a hull step every 2 years). [naval §6.1]
- NAVY-077: If a ship stays laid up 10 years, then the naval system shall wreck it. [naval §6.1]
- NAVY-078: When a ship is laid up, the naval system shall release its crew. [naval §6.1]
- NAVY-079: When a laid-up ship is fitted out, the naval system shall require its crew as sailors in port in that
  port and take a month. [naval §6.1]
- NAVY-080: While ships in a port exceed its berths, the naval system shall keep the extra at the anchorage, where
  they can resupply but not refit, rot as if at sea, and face storms as if at sea. [naval §6.2]
- NAVY-081: The naval system shall let a fleet dock in ports of its realm, its lords, its subjects and its allies
  (resupply for food), of countries it is not at war with and that are not its rival (resupply for gold), and not
  in ports of a country at war with it or its rival. [naval §6.3]
- NAVY-082: When a fleet resupplies, the naval system shall charge per ship crew ÷ 10 rations of the province's
  food per zone refilled in friendly ports, or crew ÷ 100 gold to the port's country per zone refilled in neutral ports. [naval §6.3]
- NAVY-083: When a fleet resupplies, the naval system shall fill every ship to full supply in one day, only as far
  as the province's food goes. [naval §6.3]
- NAVY-084: The naval system shall refit hulls only in a berth at harbour 2 or better or at any shipyard, at the
  upkeep cost in friendly ports and 1.5 times that elsewhere. [naval §6.3]
- NAVY-085: The naval system shall use 1 supply for every zone a ship sails, and while a fleet holds one zone
  (blockading, hunting, waiting) 1 supply every step-days. [naval §6.4]
- NAVY-086: The naval system shall let only exploration ships enter uncharted zones. [naval §6.4; exploration §3.1]
- NAVY-087: The naval system shall keep an exploration ship's colony stores (caravel 300 rations, voyaging canoe
  100) apart from its supply, loaded when docking at the resupply cost. [naval §6.4, §3.3; exploration §5.3]
- NAVY-088: If a ship has no supply left, then the naval system shall take 1 in 10 of its crew for each zone it
  sails and let it fight at no more than half strength until it docks. [naval §6.4]

### Sailing

- NAVY-089: The naval system shall move fleets as troop-movement movers whose may-enter places are sea zones and
  port provinces through their harbour. [naval §7.1; troop-movement §11]
- NAVY-090: The naval system shall give each ship type its step days per coastal and ocean zone (section 10). [naval §7.1]
- NAVY-091: Where a realm has not learned S1 *Magnetic compass and sea charts*, the naval system shall keep its
  ships to coastal zones; with S1 to ocean zones up to 3 zones from a coast; with S5 *Ocean navigation* to any
  ocean zone. [naval §7.2]
- NAVY-092: The naval system shall never let galleys enter ocean zones, and shall count junks and dhows as
  ocean-going in their own monsoon seas (config) while T5 *Monsoon sailing calendars* is known, as its start regions know it in 1444. [naval §7.2] (D-NAVY-20)
- NAVY-093: While a fleet sails with the wind of its sea's calendar, the naval system shall halve its days per
  zone; against it, double them; steamships shall ignore wind. [naval §7.3]
- NAVY-094: While a zone is in its storm season, the naval system shall give each ship at sea and not in port a 1-in-20 chance a month to be struck (Logistics −10 % a point, lighthouse halves); a struck ship loses one hull step and a wrecked one sinks. [naval §7.3; warfare §11.3] (D-NAVY-7)
- NAVY-095: While Baltic and White Sea zones are frozen in winter, the naval system shall let no fleet enter them,
  and shall ice a fleet caught there into the nearest port. [naval §7.3]
- NAVY-096: When an army is carried, the naval system shall count its food reserve as loads, each horse as the room
  of 4 men and each gun as the room of 20, against the ships' room. [naval §7.4]
- NAVY-097: Where an army is carried by small craft, the naval system shall keep it to coastal zones and never
  through a zone with an enemy war fleet. [naval §7.4, §3.5]

### At sea against an enemy

- NAVY-098: When ships fight a sea battle, the naval system shall make each ship fight with the share of its crew aboard. [naval §8]
- NAVY-099: When a side's admiral gives a Close order or a galley rams, the naval system shall have its soldiers
  aboard fight the enemy ship's crew and soldiers by the land bell rules on a single sector, and take the ship
  whose defenders break. [naval §8]
- NAVY-100: When a ship is taken, or strikes to a stronger fleet in a hunt, the naval system shall make it the
  winner's if a prize crew of at least a quarter of its crew is put aboard from the fleet, and otherwise burn it;
  its own crew become prisoners or prize crew. [naval §8]
- NAVY-101: When a ship sinks, the naval system shall have a third of its crew swim ashore or be picked up by the
  winner as prisoners, and the rest drown. [naval §8]
- NAVY-102: The naval system shall give each pirate coast in config a pirate fleet with no country, hunting trade
  ships in its home zones and one zone beyond. [naval §8]
- NAVY-103: When a season passes in which a pirate coast's home zones saw trade ships pass and no warship hunt
  there, the naval system shall add one ship to its pirate fleet; it shall remove ships taken or sunk. [naval §8]
- NAVY-104: When a pirate fleet's base (a port province on that coast with no harbour of a realm that hunts it) is
  burned (its base is the province config names for the coast, D-NAVY-23), the naval system shall end the pirate fleet until trade brings it back. [naval §8]
- NAVY-105: Where a pirate people is also a catalogue record (wokou, Orang Laut), the naval system shall let the
  same fleet belong to a lord or be hired. [naval §8]
- NAVY-106: When an enemy fleet is in a port's zone, the naval system shall block the port (warfare blockade). [naval §8]
- NAVY-107: When an army takes a port province's castle, the naval system shall give its owner every ship in that
  port that has not sailed and the hulls on its slipways. [naval §8]

### Presentation (owned by map-presentation)

- NAVY-108: The naval system shall supply, for each zoom: ports as anchor dots in the owner's colour (larger for
  great ports) and fleets as one ship sprite with a count (world); berths used/free, slipways with hulls building,
  fleets with the admiral's banner and course line in days (region); the port card with sailors in port, berths,
  slipways, ships by state and the *Muster sailors* and *Buy ship* commands (province); and a Sea lens of ports
  shaded by sailors who can still be called, fleets at sea, the month's winds and the zones a fleet can enter. [naval §10, §4.1]

### AI and the phone

- NAVY-109: Where a country's catalogue personality marks it a sea power (`naval_capability`, `military.naval`,
  preferred expansion modes), the naval AI shall keep 1/4 of its callable seafolk at sea (D-NAVY-25), buy trade ships first and buy
  warships when a rival's fleet grows. [naval §11]
- NAVY-110: Where a country is a land power, the naval AI shall lay its ships up in peace and fit them out when a
  war starts across water. [naval §11]
- NAVY-111: The naval AI shall keep a customs officer in each great port it holds. [naval §11]
- NAVY-112: The naval AI shall plan voyages with the same zone graph and wind calendar as the player. [naval §11]
- NAVY-113: While an AI fleet is more than 10 zones from the player's realm and ports and at peace, the naval
  system shall run no fleet AI for it and resolve its voyage as a day count. [naval §11]
- NAVY-114: The naval system shall move fleets once a day and use a cached shortest path per (ship class, research
  step, month), recomputed only when research or a port changes. [naval §11]
- NAVY-115: The naval system shall update sailors in port and ship states once a month with the rest of the province. [naval §11]
- NAVY-116: The naval system shall fight a sea battle on at most 3 sectors. [naval §11; warfare §11.2]
- NAVY-117: The naval system shall read all its numbers from one naval config file and the 1444 ports from data. [naval §11, §1.3]

### Decided 17 October

- NAVY-118: When a ship takes hits in a sea battle and stays afloat, the naval system shall lower its hull one step. (D-NAVY-6)
- NAVY-119: When an admiral is commissioned, the naval system shall charge 10 gold, and while he is at sea pay him three times his wage. (D-NAVY-15)
- NAVY-120: The naval system shall not let a colonial governor be commissioned as admiral. (D-NAVY-24)
- NAVY-121: The naval system shall let a port hire foreign sailors of a realm whose trade ships call there, up to 100 a year. (D-NAVY-22)
- NAVY-122: The naval system shall give each pirate fleet 2 ships at the start and a season of 3 months. (D-NAVY-23)
- NAVY-123: The naval system shall not let a caravel trade, and a trading ship shall pay the naval upkeep only. (D-NAVY-8)
- NAVY-124: When a fleet docks in a subject's or lord's port, the naval system shall take its food from that province's store and owe nothing. (D-NAVY-28)
- NAVY-125: From December to March, the naval system shall close the northern sea zones that froze historically (Gulf of Bothnia, White Sea and the far north; provisional list in config until world-map has it) to fleets, and their ports shall neither launch nor take in ships. (X-17)

## 6. Commands

| Command | Who issues it | Preconditions | Result | Events emitted |
|---|---|---|---|---|
| MusterSailors(port(s), count) | player / AI | Province has a harbour; count ≤ who can be called; bounty gold | People become sailors; sailors in port after the muster time | SailorsMustered |
| PressSailors(port, count) | player / AI | S9 known; seafolk men available | Sailors without bounty; *Pressed* on the province for a year | SailorsPressed |
| HireForeignCrew(port, people, count) | player / AI | Harbour 2+; that people's ships call there | Foreign sailors in port at double wage | ForeignCrewHired |
| MoveSailors(from port, to port, by road/aboard) | player / AI | Own ports; road or a ship with room | Sailors walk at levy pace or travel as passengers | SailorsMoved |
| BuyShip(port, type) | player / AI | Type unlocked; crew in port; free slipway of the step or harbour (small hulls); gold and timber (and guns for shooting ships) | Hull on order with crew assigned; launched after its months | ShipOrdered, ShipLaunched |
| BuyShipAbroad(foreign port, type) | player / AI | Seller great port with shipyard, at peace, owner agrees; own crew waiting there | As BuyShip at 1.5× gold on seller's slipway | ShipOrdered |
| BuySmallCraft(shore tile, count) | player / AI | Shore tile with seafolk; 6 sailors each | Small craft | ShipLaunched |
| CommissionAdmiral(official, fleet) | player / AI | An official (recruiting 7.1) | Admiral with skills by type; province left as recruiting 7.4 | AdmiralCommissioned |
| AssignLeader(fleet, ruler/heir/lord/privateer/elder) | player / AI | As 5.4 | Fleet led | AdmiralCommissioned |
| ReleaseAdmiral(fleet, province) | player / AI | — | Official returns to a chosen province | AdmiralReleased |
| HirePrivateer(season) | player / AI | A privateer or corsair on offer; gold | Ship, crew and commander for a season | PrivateerHired |
| FormFleet / SplitFleet | player / AI | Ships in the same place | Fleet regrouped | — |
| SailFleet(route) | player / AI | Admiral (unless trade ships); crew ≥ a quarter; may-enter allows the route | Fleet sails as a mover | FleetSailed |
| Dock(port) | player / AI / system (turn back) | Docking right | Resupply (and refit if allowed), load colony stores | FleetDocked, FleetResupplied |
| LayUp(ship) | player / AI | In port | Crew released; tenth of upkeep | ShipLaidUp, SailorsReleased |
| FitOut(ship) | player / AI | Crew as sailors in that port | Crewed after a month | ShipFittedOut |
| DisbandFleet / PayOff | player / AI | — | Sailors walk home | SailorsReleased |
| DrawUp(ship) | player / AI | Galley, cog or small craft in a port | No berth taken | — |
| SetToTrade(ship) | player / AI | Type has hold and purse (trade owns routes) | Ship trades, no admiral needed | — |
| PutPrizeCrew(ship) | player / AI / system | Ship taken or struck; ≥ a quarter of its crew available | Ship captured, else burned | ShipCaptured / ShipBurned |
| TakePrisonersIntoService(crew) | player / AI | Captured crew | Sailors (1 in 4 desert later) | SailorsMustered |

## 7. Domain events

| Event | When | Payload | Consumed by (context) |
|---|---|---|---|
| SailorsMustered | Muster or pressing or prisoners taken in | port, home province, count by class | province (slots, fish), recruiting (levy pool), realm (Sailors) |
| SailorsPressed | Pressing | province | province (*Pressed* grievance) |
| SailorsReleased | Lay up, disband, drift home | home province, count | province (slots, homeless) |
| ShipOrdered | Order placed | port, type, crew, gold, timber | realm (treasury), province (timber) |
| ShipLaunched | Hull finished | ship, port | realm (*Ships*), map-presentation |
| ShipLaidUp / ShipFittedOut | State change | ship | realm |
| AdmiralCommissioned / AdmiralReleased | Commission / release | person, fleet, province left | recruiting, province (officials) |
| FleetSailed / FleetDocked | Movement | fleet, place | troop-movement, map-presentation, exploration (charting) |
| FleetResupplied | Docking | port, food or gold paid | province (food), realm (gold) |
| ShipSunk | Battle or storm | ship, crew lost, survivors | realm, province (*Lost at sea* count) |
| ShipCaptured / ShipBurned | Prize | ship, captor | realm |
| PortBlockaded | Enemy fleet in port's zone | port | trade, warfare |
| PortTaken | Castle of a port province taken | port, ships and hulls taken | realm, warfare |
| PirateFleetGrew / PirateFleetEnded | Season / base burned | pirate coast | trade |
| ProvinceSeaSkilled | 2 years served | province, until date | trade (+10 % traders by sea), province (+10 % fish) |
| LostAtSea | > a tenth of seafolk lost in 5 years | province | province (births, grievance) |

## 8. Policies (reactions to other contexts)

- When a harbour is built, raised or loses a step (buildings), then the naval system recomputes berths and
  whether the province is a port, and refreshes cached paths.
- When a shipyard is built, raised or burned (buildings), then slipways are recomputed; hulls beyond them wait.
- When the realm learns S1, S3, S4, S5, S9 or another S-bough ship invention (research), then sailable zones,
  ship types and pressing unlock, and cached paths are recomputed.
- When the exploration context opens the exploration unlock for a realm, then exploration ships can be bought.
- When a war starts or a rivalry is made (warfare, diplomacy), then docking rights change; AI land powers fit out.
- When a sea battle is decided (warfare), then hulls, crews, prizes and survivors are applied by section 8.
- When a lord's loyalty drops (realm), then his ships and crews leave service.
- When plague breaks out in a port (province), then sailors in port are lost.
- When an army takes a port province's castle (warfare), then the port's unsailed ships and slipway hulls change hands.
- When an exploration ship enters a zone (exploration), then exploration charts it; when a colonial governor is
  carried, the fleet holds him as cargo.
- When an army boards or lands (troop-movement), then the room of men, horses, guns and food is checked.

## 9. Each turn and each month

Each day of the turn's 7 days (troop-movement day loop): fleets take their step; supply is used per zone; storms,
ice, docking, resupply (one day) and battles start on their day. Sea battles follow X-1: they are fought over
time in 4-hour rounds, never resolved at once. While a battle with a player fleet runs, the day loop slows to six
4-hour steps a day (fleets move a sixth of a day per step and may join), with no skip; the player may retreat at any
step and switch between running battles. Battles between AI realms fight their six rounds each day inside the normal
day loop and never slow the game.

In the turn in which a new month begins (X-18), after the province's people and food are known and before the
treasury closes:
1. Pay wages (0.2 at sea, 0.1 in port, foreign ×2, naval base none), upkeep and feed sailors in port and
   crewed ships (1 ration each) from the province store. Unpaid: desertion and foreign crews leave.
2. Sailors waiting more than 6 months drift home (1 in 10).
3. Advance hulls on slipways and on harbours; launch finished ships.
4. Apply rot (hull steps by state and time), the 10-year laid-up wreck, refit in berths.
5. Spend a fifth of in-port wages in the port's market.
6. Update province effects: fish lost, fallow fisheries, sea-skilled bonus, *Lost at sea*, *Pressed* expiry.
7. Once a season: pirate fleets grow or stay.
8. Once a year: ship age +1; admiral Logistics for 3 storm-free years.
Reads first: province people and food store, research known, diplomacy relations (war, rival, ally,
subject), the wind calendar of the month.

## 10. Configuration

All in one naval config file (keys proposed here; the design names only the file).

| Key | Meaning | Value in the design | Placeholder? | Config file |
|---|---|---|---|---|
| naval.berths_by_harbour_step | Berths per harbour step | 10 / 25 / 50 | yes | naval |
| naval.slipways_by_shipyard_step | Slipways per shipyard step (Arsenal) | 1 / 2 / 2 (3) | yes | naval |
| naval.berths_per_large_ship | Berths a ship of the line or larger takes | 2 | yes | naval |
| naval.port_placement_radius_km | Nearest coastal province search radius | about 80 | yes | tools |
| naval.muster_share | Share of fighting-age men callable | seafolk 2/3, homeless 1/3, others 1/20 | yes | naval |
| naval.fighting_age_share | Fighting-age men of the people | 1/4 (recruiting 2.2) | yes | recruiting |
| naval.bounty_per_sailor | Bounty for signing on | not given (example: 15 for 300, 4 for 75) | yes | naval |
| naval.muster_time | Time until mustered sailors are ready | not given (example: 2 weeks) | yes | naval |
| naval.wage_in_port | Gold a month per sailor in port | 0.1 | yes | naval |
| naval.wage_at_sea | Gold a month per sailor at sea | 0.2 | yes | naval |
| naval.ration_in_port | Rations a month per sailor in port | 1 | yes | naval |
| naval.foreign_wage_multiplier | Foreign crews and crews waiting abroad | 2 | yes | naval |
| naval.drift_home_after_months / rate | Waiting sailors drift home | 6 months / 1 in 10 a month | yes | naval |
| naval.prize_crew_desertion | Taken-in prisoners deserting | 1 in 4 | yes | naval |
| naval.pressed_grievance_years | *Pressed* duration | 1 | yes | naval |
| naval.skilled_service_years / bonus / duration | Sea-skilled province | 2 years; +10 % fish, +10 % traders by sea; 10 years | yes | naval |
| naval.wages_spent_ashore | Share of in-port wages spent in port | 1/5 | yes | naval |
| naval.fallow_threshold | Fishery, harbour, shipyard fallow below | half filled | yes | naval |
| naval.widows_threshold / window / births_years / grievance_years | *Lost at sea* | > 1/10 in 5 years; 10 years; 2 years | yes | naval |
| naval.harbour_build_months_multiplier | Hulls built on the harbour | 1.5 | yes | naval |
| naval.abroad_price_multiplier | Buying abroad | 1.5 | yes | naval |
| naval.ships | Ship table (below) | see table | yes | naval |
| naval.supply_by_family | Zones of supply | trade 15, military 15, galleys 6, exploration 60 | yes | naval |
| naval.colony_stores | Colony stores by exploration ship type | caravel 300, voyaging canoe 100 | yes | naval/exploration |
| naval.refit_months | Worn→sound / leaking→sound | 1 / 3 (÷2 with a shipyard) | yes | naval |
| naval.rot | Hull step every | at sea 6 months, in port crewed 3 years, laid up 2 years | yes | naval |
| naval.laid_up_wreck_years | Laid-up ship wrecked after | 10 | yes | naval |
| naval.laid_up_upkeep_share | Upkeep while laid up | 1/10 | yes | naval |
| naval.fit_out_months | Fitting out | 1 | yes | naval |
| naval.min_crew_to_sail | Below this share a ship can't leave port | 1/4 | yes | naval |
| naval.resupply_food_per_zone | Rations per zone per ship, friendly | crew ÷ 10 | yes | naval |
| naval.resupply_gold_per_zone | Gold per zone per ship, neutral | crew ÷ 100 | yes | naval |
| naval.refit_cost_foreign_multiplier | Refit away from friendly ports | 1.5 × upkeep | yes | naval |
| naval.out_of_supply_crew_loss / strength_cap | Out of supply | 1 in 10 per zone; half strength | yes | naval |
| naval.step_days | Days per zone (below) | see table | yes | naval |
| naval.wind_multiplier | With / against the wind | 0.5 / 2 | yes | naval |
| naval.wind_calendars | Per sea per month | not given (monsoon, trade winds, North Sea/Baltic storms) | yes | naval |
| naval.storm_seasons / freeze_seasons | Storm and freeze by zone | December to March: Gulf of Bothnia, White Sea, far north (X-17, `frozenSeas`, provisional) | yes | naval / world-map |
| naval.ocean_reach_with_s1 | Ocean zones from a coast with S1 | 3 | yes | naval |
| naval.admiral.might_hits / might_boarding | Per point | +5 % / +10 % | yes | naval |
| naval.admiral.cunning_days | Per point | −5 % days per zone | yes | naval |
| naval.admiral.logistics_storm / supply_free_zone | Per point / at 3+ | −10 % storm losses / every tenth zone free | yes | naval |
| naval.admiral.logistics_gain_years | +1 Logistics per storm-free years at sea | 3 | yes | naval |
| naval.admiral.port_years_multiplier | Years served in a port province | 2 | yes | naval |
| naval.admiral.vice_admirals_max | Vice-admirals in a large fleet | 2 | yes | naval |
| naval.admirals_by_official | Official type → skills, trait (below) | see table | yes | naval |
| naval.prize_crew_share | Prize crew needed | 1/4 of its crew | yes | naval |
| naval.sunk_survivors_share | Crew of a sunk ship surviving | 1/3 | yes | naval |
| naval.pirate_coasts | Pirate coasts: home zones, base, growth | wokou (East China Sea), Barbary and Aegean corsairs, Orang Laut (Malacca strait), Caribbean later; +1 ship a season | yes | naval |
| naval.pirate_reach | Zones beyond home hunted | 1 | yes | naval |
| naval.lighthouse_storm_factor | Storm losses near a lighthouse | 1/2 | yes | naval/buildings |
| naval.small_craft | Crew, carry | 6 sailors; 10 men or a load | yes | naval |
| naval.room.horse / gun | Room in men | 4 / 20 | yes | naval |
| naval.ai.fleet_ai_radius_zones | No fleet AI beyond | 10 | yes | naval |

**Ship table** (`naval.ships`, all placeholders; hold and purse are the trade design's numbers):

| Ship | Family | Unlocked by | Built at | Crew | Gold | Timber | Months | Upkeep/mo | Hold | Purse |
|---|---|---|---|---|---|---|---|---|---|---|
| Fishing boat, canoe or raft (small craft) | Small craft | Known | Any shore | 6 | 2 | 0 | 1 | 0 | | |
| War canoe fleet | Military | S3 | Any shore | 100 | 10 | 2 | 2 | 0.5 | | |
| Voyaging canoe (100 rations stores) | Exploration | S3 | Any shore with seafolk | 20 | 5 | 1 | 1 | 0.5 | | |
| Cog, junk or dhow | Trade | Known | Harbour, or a slipway | 30 | 25 | 6 | 3 | 1 | ×2 | 30 |
| Caravel | Exploration | S4 + exploration unlock | Harbour, or a slipway | 25 | 25 | 4 | 3 | 1 | | |
| Galley | Military | Known | Shipyard 1 | 180 (150 row) | 40 | 6 | 4 | 2 | ×2 | 25 |
| Carrack | Trade | S4 | Shipyard 2 | 60 | 60 | 12 | 6 | 3 | ×3 | 50 |
| Armed carrack | Military | S6 | Shipyard 2 | 120 | 120 | 14 | 7 | 5 | | |
| Galleon | Military | S7 | Shipyard 2 | 200 | 200 | 20 | 9 | 8 | ×3 | 60 |
| Fluyt | Trade | S7 | Shipyard 2 | 20 | 40 | 10 | 4 | 1.5 | ×4 | 70 |
| Turtle ship | Military | S8 | Shipyard 2 | 120 | 150 | 12 | 8 | 6 | | |
| Ship of the line | Military | S9 | Shipyard 3 | 600 | 600 | 60 | 18 | 25 | | |
| Steamer | Trade | S13 | Shipyard 3 | 40 | 200 | 20 + 40 iron | 8 | 3 + coal | ×6 | 150 |
| Ironclads, dreadnoughts, submarines, carriers | Military | S14 to S18 | Shipyard 3 | not given | not given | steel and coal or oil | not given | not given | | |

Proposed for warfare 11.1 (naval's text): caravel fights 8, carries 60 men, ocean-going, fast; fluyt fights 2, carries 300 men.

**Step days** (`naval.step_days`): galley 1 coastal / not allowed ocean; small craft and war canoes 1 / 2 (S3 only);
cog, junk, dhow 2 / 3; caravel 1.5 / 2; carrack, armed carrack, galleon, turtle ship 2 / 2; ship of the line 2 / 2;
steamships and later 1 / 1.

**Admirals by official** (`naval.admirals_by_official`, Might / Cunning / Logistics, trait offered): customs
officer 0/3/1 Careful; warden 2/1/1 Steady; steward 0/1/3 Careful; muster master 1/1/2 Beloved (crews desert
half as often); tax collector 0/2/1 Greedy (keeps a tenth of prizes); judge 1/2/0 Cruel (captured crews hanged;
enemy merchant crews surrender faster); master of works 0/1/2 none (his fleet's hulls refit twice as fast in any
berth); chaplain, schoolmaster 0/1/1 none; marshal 2/2/1 any.

**Ports data**: `naval/data/ports-1444.tsv` (hand-edited), generated `ports-1444.json` and `start-ports.json`
by `naval/tools/place_ports.py <repo root>` (reads `packages/rules/data/world/provinces.json`, `map.json`,
`apps/client/public/map/provinces.png`; needs Pillow).

## 11. Seams

| Other context | Direction | Pattern | What crosses |
|---|---|---|---|
| buildings | upstream | Customer–Supplier | Harbour, shipyard, lighthouse, naval base and their steps; NAVY supplies their naval numbers (berths, slipways) and the `start_ports` table |
| warfare | upstream | Conformist | Ship fighting strength and room (11.1), sea battle bell rules (11.2), blockade/carry/hunt/escort and storms (11.3), commander skills and traits (4.2, 4.3), prisoners (2.4), sea styles; NAVY adds crew share, boarding, prizes, admirals |
| troop-movement | upstream | Conformist | Mover model, day loop, shared planner, boarding and landing (11.3); NAVY supplies step days and may-enter rules |
| recruiting | upstream | Shared Kernel | The levy's people (fighting-age share), commissioning officials (7.1), empty province (7.4), coming home (6.2), guns (4.2); NAVY asks the levy pool to count sailors |
| province | upstream | Customer–Supplier | Seafolk and other classes, slots, fisheries, food store, officials and types, plague; NAVY emits *Pressed* and *Lost at sea* grievances, fish and trader effects, births |
| realm | downstream | Customer–Supplier | *Ships* stat, proposed *Sailors* and *Admirals* rows; lords (country 5), ruler and heir (succession crisis) come from realm (upstream) |
| research | upstream | Conformist | S bough (S1, S3, S4, S5, S6, S7, S8, S9, S13, S14–S18), T5 monsoon seas |
| trade | downstream | Customer–Supplier | Trade ships bought and crewed here, hold and purse per type (trade supplies the numbers), ports as route ends, pirates as hunting fleets, blockades |
| exploration | downstream | Customer–Supplier | Exploration ships (caravel, voyaging canoe), 60 supply, colony stores, docking; exploration supplies the unlock, the charted map (may-enter for uncharted zones) and carries governors aboard |
| diplomacy | upstream | Customer–Supplier | War, peace, rivalry, alliance (docking rights), consent to sell hulls, privateers dragging into war |
| subjects | upstream | Customer–Supplier | Subject ports are friendly docking; subjects asks NAVY for "your sea route", a colony's defence by sea, and what makes an overseas trade empire |
| world-map | upstream | Conformist | About 4,700 sea zones (`sea` coastal ~150 km, `ocean` ~300 km), shore tiles, adjacency, provinces for port placement |
| scenario-setup | downstream | Published Language | `start_ports` (harbour and shipyard per province), canoe landings' extra seafolk and small craft |
| map-presentation | downstream | Published Language | Port and fleet drawing per zoom, Sea lens, fleet card |
| time-and-turns | upstream | Conformist | Day loop inside the weekly turn, monthly and seasonal steps (X-18) |
| events | upstream | Conformist | Ships from events (treasure fleet, gift, wreck) |
| government | upstream | Conformist | Realms with no officials (chiefdoms, stateless) lead fleets by chiefs or elders |

## 12. AI

- Reads its catalogue personality (`naval_capability`, `military.naval`, preferred expansion modes).
- Sea powers (Venice, Genoa, Portugal, the Hanse towns, Hormuz, Malacca, Ryukyu) keep a share of their seafolk
  always at sea, buy trade ships first, and warships when a rival's fleet grows (1/4 of callable seafolk, D-NAVY-25).
- Land powers lay up their few ships in peace and fit them out when a war starts across water.
- Every AI keeps a customs officer in each great port it holds, so it has admirals to commission.
- AI fleets plan with the same zone graph and wind calendar; no fleet AI runs for fleets more than 10 zones from
  the player's realm and ports in peace: their voyages resolve as a day count.
- The AI uses the same commands as the player (multiplayer decision).

## 13. Decisions and open questions

- **D-NAVY-1** (was OQ-NAVY-1) Berths and slipways: keep 10/25/50 berths and 1/2/2 slipways (Arsenal 3) as provisional numbers in `naval.json` (`_provisional`). Balancing changes numbers, not rules.
- **D-NAVY-2** (was OQ-NAVY-2) The seafolk share that can go to sea stays 2 in 3, provisional. A number to tune, not a rule.
- **D-NAVY-3** (was OQ-NAVY-3) Women at sea: admirals follow the commander rule of 16 October (each country's history); sailors follow the levy rule. One rule for land and sea.
- **D-NAVY-4** (was OQ-NAVY-4) Ship of the line needs S9 and a shipyard at step 3, which needs S10, or the Arsenal; with S9 but not S10 a realm builds them only at an Arsenal. Buildings owns the shipyard steps; naval does not add a second gate.
- **D-NAVY-5** (was OQ-NAVY-5) The naval ship table governs ship types, crews (sailors) and families; warfare keeps strength, room, battle and carry rules and reads the rest from naval. Each fact has one owner.
- **D-NAVY-6** (was OQ-NAVY-6) Damage: a ship that takes hits in a battle loses one hull step (sound → worn → leaking → wrecked); hits equal to its strength sink or take it. Refit happens at harbour step 2 or a shipyard, as naval says. One step per battle is the simplest rule that keeps both texts.
- **D-NAVY-7** (was OQ-NAVY-7) Storms: in storm season each ship at sea and not in port has a 1-in-20 chance a month to be struck (Logistics −10 % a point, a lighthouse in the sea zone next to it halves it); a struck ship loses one hull step and a wrecked one sinks with its crew. S21 is out of scope. Hull steps join the two texts without a new mechanic.
- **D-NAVY-8** (was OQ-NAVY-8) A trading ship pays naval's one upkeep; the caravel cannot trade; cog, junk, dhow, galley, carrack, galleon, fluyt and steamer can. Same as D-TRADE-5.
- **D-NAVY-9** (was OQ-NAVY-9) *Pressed* and *Lost at sea* are grievances the province context adds to its list. Naval raises them; province owns the list.
- **D-NAVY-10** (was OQ-NAVY-10) A canoe-landing province starts with 100 extra seafolk and 5 small craft (provisional). A start number, no new rule.
- **D-NAVY-11** (was OQ-NAVY-11) Commissioning an admiral is recruiting's commission act (X-7); the years-served bonus +1 step at 5 and at 10 years is confirmed, and the levy pool counts sailors already gone. X-7 follows recruiting v3 everywhere.
- **D-NAVY-12** (was OQ-NAVY-12) The realm card shows Ships, Sailors (at sea and in port) and Admirals; ships are built at shipyards and based at harbours. Naval is the latest text.
- **D-NAVY-13** (was OQ-NAVY-13) Docking is allowed in the ports of realms at peace and not rivals; selling a hull needs the AI owner's agreement, given when at peace and not rivals; privateers raid only their employer's enemies and never start a war; envoys have no sea legs. No new diplomacy acts needed.
- **D-NAVY-14** (was OQ-NAVY-14) Muster: bounty 0.05 gold a sailor (300 → 15, 75 → 4, rounded); muster time 14 days; fish lost = seafolk at sea ÷ the third of the province's seafolk who fish (75 of 4600 → 5 %); classes taken by share (D-NAVY-29). Numbers come from the design's examples.
- **D-NAVY-15** (was OQ-NAVY-15) An admiral's commission costs 10 gold and his wage is ×3 while at sea. The Lagos example becomes the rule.
- **D-NAVY-16** (was OQ-NAVY-16) Harbour step 3 gives only coaling (S13) and 50 berths; ocean ships need no harbour 3. Ocean-going is set by ship type, not by the port.
- **D-NAVY-17** (was OQ-NAVY-17) Naval base: crewed ships berthed there pay no wages while in port only. Naval's narrower text is simpler and cheaper to read.
- **D-NAVY-18** (was OQ-NAVY-18) Under-crewing is proportional: half crew, twice the days. One formula covers every share.
- **D-NAVY-19** (was OQ-NAVY-19) Small craft belong to the trade family, supply 15 days, built at any shore tile with seafolk. Small craft carry and fish, like trade ships.
- **D-NAVY-20** (was OQ-NAVY-20) Junks and dhows are ocean-going in their own monsoon seas only with T5 known (T5's start regions have it in 1444); the seas are the Indian Ocean zones of trade's T5 list plus the South China Sea and Java Sea. Uses research's own start knowledge.
- **D-NAVY-21** (was OQ-NAVY-21) Later ships (ironclad, dreadnought, submarine, aircraft carrier) get provisional crew, cost, months and upkeep in `naval.json`; carriers stay (X-14); steamer coal 1 load a month at sea and powder 1 load a voyage, provisional. X-14 keeps carriers; numbers are provisional.
- **D-NAVY-22** (was OQ-NAVY-22) Foreign crews: a port can hire sailors of any realm whose trade ships call there, up to 100 a year (provisional). Ties hiring to trade already in the game.
- **D-NAVY-23** (was OQ-NAVY-23) Pirates: a season lasts 3 months, each pirate fleet starts with 2 ships, and each pirate coast has one base province named in config (provisional). Concrete numbers, no new mechanic.
- **D-NAVY-24** (was OQ-NAVY-24) A colonial governor cannot be commissioned as admiral. He is bound to his colony.
- **D-NAVY-25** (was OQ-NAVY-25) The sea-power AI keeps 1/4 of its callable seafolk at sea (provisional). A plain number for the personality.
- **D-NAVY-26** (was OQ-NAVY-26) "Your sea route" is the shortest charted sea path between the two realms' nearest ports; a colony has no special sea defence; an overseas trade empire is a realm holding a port reachable from its capital only by sea. Each reuses what naval already has.
- **D-NAVY-27** (was OQ-NAVY-27) One port per province; Melos and Malé stay unplaced until the map gains them. The map owns provinces; naval follows it.
- **D-NAVY-28** (was OQ-NAVY-28) Docking in a subject's or lord's port takes food from that province's store and nothing is owed. Simplest reading of "from that province".
- **D-NAVY-29** (was OQ-NAVY-29) Sailors are mustered by share of every callable class, never seafolk first (X-7): 830 callable (770 seafolk, 45 homeless, 15 others) give 300 sailors as 278 seafolk, 16 homeless and 6 others by largest remainder. X-7 rules out "first" orders.

## 14. Traceability

| Requirement | Feature file | Scenario |
|---|---|---|
| NAVY-001 | ports.feature | A province with a harbour on a shore tile is a port |
| NAVY-002 | ports.feature | A province with a harbour on a shore tile is a port |
| NAVY-002 | ports.feature | A coastal province without a harbour is a plain shore |
| NAVY-003 | ports.feature | A coastal province without a harbour is a plain shore |
| NAVY-004 | ports.feature | Berths by harbour step |
| NAVY-005 | ports.feature | Slipways by shipyard step |
| NAVY-006 | ports.feature | What each harbour step allows |
| NAVY-007 | ports.feature | Which hulls each shipyard step builds |
| NAVY-008 | sailing.feature | Storms in the storm season, halved by a lighthouse |
| NAVY-009 | keeping-ships.feature | A naval base keeps a crewed fleet without wages |
| NAVY-010 | ports.feature | Berths taken by ship size |
| NAVY-011 | ports.feature | Drawn-up ships take no berth but rot at the anchorage rate |
| NAVY-012 | ports.feature | Several port towns in one province take the highest tier and any shipyard |
| NAVY-013 | ports.feature | Starting harbour and shipyard by tier in 1444 |
| NAVY-013 | ports.feature | A port-tier town too small for harbour 2 starts at harbour 1 |
| NAVY-013 | ports.feature | A canoe landing starts with no harbour and extra seafolk |
| NAVY-014 | ports.feature | Starting harbour and shipyard by tier in 1444 |
| NAVY-015 | ports.feature | Starting harbour and shipyard by tier in 1444 |
| NAVY-015 | ports.feature | The 1444 ports data adds up |
| NAVY-016 | ports.feature | A town on no land of the current map is not placed |
| NAVY-017 | ports.feature | A realm builds a new port on its own shore |
| NAVY-018 | ports.feature | A burned harbour falls a step |
| NAVY-018 | ports.feature | A fallow harbour halves its berths |
| NAVY-019 | ports.feature | Slipways stand idle |
| NAVY-020 | ports.feature | Sailors and ships in port go up and down |
| NAVY-021 | ports.feature | Sailors and ships in port go up and down |
| NAVY-022 | sailors.feature | Mustering changes people into sailors who leave their slots empty |
| NAVY-023 | sailors.feature | Mustering changes people into sailors who leave their slots empty |
| NAVY-024 | sailors.feature | Only provinces with a harbour can be picked for a muster |
| NAVY-025 | sailors.feature | Who can be called, by class |
| NAVY-026 | sailors.feature | Sailors are taken by share |
| NAVY-027 | sailors.feature | A man at sea cannot be levied |
| NAVY-028 | sailors.feature | The Lagos muster |
| NAVY-029 | sailors.feature | Sailors in port eat and are paid |
| NAVY-030 | sailors.feature | Sailors waiting too long drift home |
| NAVY-031 | sailors.feature | Hiring foreign crews needs harbour 2 |
| NAVY-031 | sailors.feature | Foreign crews cost twice the wage and leave unpaid |
| NAVY-032 | sailors.feature | A loyal lord musters his own crews |
| NAVY-033 | sailors.feature | Prize crews taken into service desert at a friendly port |
| NAVY-034 | sailors.feature | Pressing seafolk after S9 |
| NAVY-035 | sailors.feature | Sailors move like people |
| NAVY-036 | sailors.feature | Sailors paid off come home to nothing |
| NAVY-036 | sailors.feature | Sailors paid off refill the emptiest slots |
| NAVY-037 | sailors.feature | Sailors come home skilled |
| NAVY-038 | sailors.feature | Wages spent ashore |
| NAVY-039 | ports.feature | A fallow harbour halves its berths |
| NAVY-039 | sailors.feature | Empty boats leave a fishery fallow |
| NAVY-040 | sailors.feature | Mustering all the seafolk stops the slipways |
| NAVY-041 | sailors.feature | Widows' ports |
| NAVY-042 | buying-ships.feature | Crew, slipway and materials in the same port |
| NAVY-043 | buying-ships.feature | Crew, slipway and materials in the same port |
| NAVY-044 | buying-ships.feature | No crew in port, no ship |
| NAVY-045 | buying-ships.feature | Only unlocked ship types can be bought |
| NAVY-045 | buying-ships.feature | Exploration ships also need the exploration unlock |
| NAVY-046 | buying-ships.feature | Exploration ships also need the exploration unlock |
| NAVY-046 | buying-ships.feature | Supply carried by family |
| NAVY-047 | buying-ships.feature | What each ship takes |
| NAVY-048 | buying-ships.feature | The Lagos caravels, two on slipways and one on the harbour |
| NAVY-048 | buying-ships.feature | A harbour without a shipyard builds small hulls one at a time |
| NAVY-049 | buying-ships.feature | The 1444 trade ship follows the sea |
| NAVY-050 | buying-ships.feature | Ships that shoot need guns and powder |
| NAVY-051 | buying-ships.feature | A blockaded port keeps building but nothing leaves |
| NAVY-051 | sea-combat.feature | An enemy fleet blocks a port |
| NAVY-052 | buying-ships.feature | A taken port loses its hulls on the slipways |
| NAVY-053 | buying-ships.feature | Buying a hull abroad in Venice |
| NAVY-053 | buying-ships.feature | No crew abroad, no hull abroad |
| NAVY-054 | buying-ships.feature | Small craft at a canoe landing |
| NAVY-055 | buying-ships.feature | Small craft never fight |
| NAVY-055 | sailing.feature | Small craft carry an army only along the coast |
| NAVY-056 | buying-ships.feature | Outrigger voyaging opens the ocean to small craft |
| NAVY-056 | buying-ships.feature | War canoe fleets and voyaging canoes are built on any beach |
| NAVY-057 | buying-ships.feature | Other ways to get ships |
| NAVY-058 | fleets-and-hulls.feature | The fleet of the Algarve |
| NAVY-059 | fleets-and-hulls.feature | The fleet of the Algarve |
| NAVY-059 | fleets-and-hulls.feature | Ships age each year |
| NAVY-060 | fleets-and-hulls.feature | Hulls wear by time at sea |
| NAVY-060 | fleets-and-hulls.feature | Battle hits lower a hull |
| NAVY-061 | fleets-and-hulls.feature | Refit in a berth |
| NAVY-062 | fleets-and-hulls.feature | What each hull step means at sea |
| NAVY-063 | fleets-and-hulls.feature | A half-crewed galleon fights at half strength and sails at half speed |
| NAVY-064 | fleets-and-hulls.feature | Below a quarter of its crew a ship cannot leave port |
| NAVY-065 | admirals.feature | Warships without an admiral stay in port but defend it |
| NAVY-066 | admirals.feature | Trade ships sail with no admiral |
| NAVY-067 | admirals.feature | Commissioning an official leaves his province |
| NAVY-068 | admirals.feature | Vice-admirals |
| NAVY-069 | admirals.feature | Sea skills |
| NAVY-070 | admirals.feature | Sea skills |
| NAVY-070 | sailing.feature | Lagos to Arguin with the trades |
| NAVY-071 | admirals.feature | Sea skills |
| NAVY-072 | admirals.feature | Three storm-free years at sea teach logistics |
| NAVY-072 | admirals.feature | Sea victories count as victories |
| NAVY-073 | admirals.feature | Which officials make admirals |
| NAVY-073 | admirals.feature | Rui Vaz of Lagos |
| NAVY-074 | admirals.feature | An admiral takes the realm's sea style |
| NAVY-075 | admirals.feature | Who else can lead a fleet |
| NAVY-076 | keeping-ships.feature | The three ship states |
| NAVY-077 | keeping-ships.feature | A ship laid up 10 years is wrecked |
| NAVY-078 | keeping-ships.feature | Laying a ship up releases its crew |
| NAVY-079 | keeping-ships.feature | Fitting out needs the crew back in that port, plus a month |
| NAVY-080 | keeping-ships.feature | Ships beyond the berths ride at the anchorage |
| NAVY-081 | keeping-ships.feature | Where a fleet may dock |
| NAVY-082 | keeping-ships.feature | The cost of resupply |
| NAVY-083 | keeping-ships.feature | The cost of resupply |
| NAVY-083 | keeping-ships.feature | A province with too little food fills ships only as far as it goes |
| NAVY-084 | keeping-ships.feature | Where hulls refit, and at what cost |
| NAVY-085 | keeping-ships.feature | Supply used at sea |
| NAVY-086 | keeping-ships.feature | Only exploration ships enter uncharted zones |
| NAVY-087 | keeping-ships.feature | Colony stores are loaded at resupply cost, apart from supply |
| NAVY-088 | keeping-ships.feature | Out of supply |
| NAVY-089 | sailing.feature | Fleets are movers on sea zones and ports |
| NAVY-090 | sailing.feature | Days per zone by ship and water |
| NAVY-090 | sailing.feature | A fleet sails at the pace of its slowest ship |
| NAVY-090 | sailing.feature | Lagos to Arguin with the trades |
| NAVY-091 | sailing.feature | Research opens the sea |
| NAVY-091 | sailing.feature | Lagos to Arguin with the trades |
| NAVY-092 | sailing.feature | Galleys never enter the ocean |
| NAVY-092 | sailing.feature | Junks and dhows sail their own monsoon seas with T5 |
| NAVY-093 | sailing.feature | Winds |
| NAVY-093 | sailing.feature | Steamships ignore the wind |
| NAVY-093 | sailing.feature | Lagos to Arguin with the trades |
| NAVY-094 | sailing.feature | Storms in the storm season, halved by a lighthouse |
| NAVY-095 | sailing.feature | Ice in the Baltic |
| NAVY-096 | sailing.feature | The room an army takes aboard |
| NAVY-097 | sailing.feature | Small craft carry an army only along the coast |
| NAVY-098 | sea-combat.feature | A ship fights with the share of its crew aboard |
| NAVY-099 | sea-combat.feature | Boarding |
| NAVY-100 | sea-combat.feature | Prizes need a prize crew |
| NAVY-100 | sea-combat.feature | A ship that strikes in a hunt can be taken as a prize |
| NAVY-101 | sea-combat.feature | Crews of sunk ships |
| NAVY-102 | sea-combat.feature | A pirate fleet grows where trade passes unhunted |
| NAVY-102 | sea-combat.feature | A pirate fleet hunts trade ships near home |
| NAVY-103 | sea-combat.feature | A pirate fleet grows where trade passes unhunted |
| NAVY-103 | sea-combat.feature | A pirate fleet shrinks by ships taken or sunk |
| NAVY-104 | sea-combat.feature | Burning a pirate base ends the pirate fleet |
| NAVY-105 | sea-combat.feature | A pirate people with its own catalogue record |
| NAVY-106 | sea-combat.feature | An enemy fleet blocks a port |
| NAVY-107 | sea-combat.feature | Taking a port's castle takes its ships |
| NAVY-108 | — | Presentation only (owned by map-presentation) |
| NAVY-109 | naval-ai.feature | A sea power keeps seafolk at sea and buys trade ships first |
| NAVY-109 | naval-ai.feature | A sea power buys warships when a rival's fleet grows |
| NAVY-110 | naval-ai.feature | A land power lays up in peace and fits out for war across water |
| NAVY-111 | naval-ai.feature | Every AI keeps a customs officer in each great port |
| NAVY-112 | naval-ai.feature | AI fleets plan with the player's graph and winds |
| NAVY-113 | naval-ai.feature | No fleet AI far from the player in peace |
| NAVY-114 | naval-ai.feature | Cached sea paths |
| NAVY-115 | naval-ai.feature | Sailors in port and ship states update once a month |
| NAVY-116 | naval-ai.feature | A sea battle has at most 3 sectors |
| NAVY-117 | — | Configuration structure; checked by config loading, no behaviour |
| NAVY-118 | fleets-and-hulls.feature | Battle hits lower a hull |
| NAVY-119, NAVY-120 | admirals.feature | Commission cost and pay; A colonial governor cannot be commissioned |
| NAVY-121 | sailors.feature | Foreign crews per port and year |
| NAVY-122 | sea-combat.feature | Pirate fleets at the start |
| NAVY-123 | buying-ships.feature | Which ships can trade |
| NAVY-124 | keeping-ships.feature | Docking in a subject's port |
| NAVY-125 | sailing.feature | Frozen northern seas from December to March |
