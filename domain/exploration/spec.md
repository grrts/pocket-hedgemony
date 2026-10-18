# Exploration (EXPL)

## 1. Purpose and scope

This context decides how a realm sails into the unknown and plants colonies there: when exploration unlocks,
what each country has charted, how a voyage into the fog is given and what it finds, colonial governors and
their slots, colonial range, and founding a colony up to the moment the province becomes the realm's.

**In scope**
- The exploration unlock (research and the Age of Exploration), voyaging canoes as the Pacific and Malay way.
- The charted map per country, the parchment over what is uncharted, and the rule that only exploration ships
  enter uncharted zones.
- Voyages: the drawn path, its supply preview, *Turn back* and *Carry on*, what a voyage finds.
- Colonialism: the S5 unlock, colonial governors and their slots, colonial range.
- Founding a colony: where, going ashore, local aggression, progress and colony food, founded, lost, abandoned.
- The exploration AI and the phone budget for charts and colonies.

**Not in scope (owned by …)**
- Ships, their cost and crew, supply, docking and resupply, the voyaging canoe's ship-table row, colony stores'
  carrying and loading: naval.
- The colony as province state after founding (*Settlement*, *Settlers*, local people's tiles, fever land):
  province (12.3).
- What a founded colony becomes as a subject (Outpost, Settled, Self-governing): subjects (2.4).
- Colonial range numbers per government form, the officials cap: government (3).
- The ages, their regions and start/end conditions, `colonial_presence`: events.
- First contact, disease when worlds meet, trade with newly met peoples: left out of the game (D-EXPL-1).
- Drawing the parchment, voyage paths, colony flags and the colony card: map-presentation (this spec lists what
  the exploration design asks it to show).

## 2. Sources

Newest decision first.
- `domain/DECISIONS.md` and section 13 below (17 October 2026): the open questions of this spec decided in the
  spirit of the game so far (D-EXPL-1 to D-EXPL-18); cross-context decisions X-7, X-8 and X-13 apply.
- `exploration/exploration-design.md` (version 1), section 10 *Open questions*: "Which age?" decided by Leroy
  (Age of Exploration); "Land of stateless peoples" decided by Leroy (land no country owns can be colonised, using
  only its free tiles; land of tribes that are countries can't); "Pacific voyaging" decided (voyaging canoes are
  exploration ships). This file (16 Oct, 22:54) is newer than `planning/gap-lists.md` (16 Oct, 22:34), which still
  lists colonising land of stateless peoples as open: the exploration decision wins (D-EXPL-2).
- `planning/gap-lists.md`, "Decisions already made" (16 Oct): exploration opens with the Age of Exploration; one
  month per turn (since replaced: a turn is one week, X-18); multiplayer-friendly orders; campaign ends 31 August 1939; gap 14 (exploration and first contact).
- `exploration/exploration-design.md` (version 1), sections 1 to 9.
- Read for seams and contradictions: `naval/naval-design.md` 3.2, 3.3, 3.5, 6.3, 6.4, 7.2, 13;
  `province-stats/province-stats-design.md` 10.2, 12.3; `government/government-design.md` 3;
  `country-stats/research-tree.md` (S3, S4, S5, T8, T9); `subjects/subjects-design.md` 2.4, 7, 9, 12;
  `event-tree/data/ages.yaml` (`age_of_exploration`), `event-tree/data/vocabulary.yaml` (`colonial_presence`);
  repository `README.md` and `apps/client/src/main.ts` (parchment today: provinces within a reach of steps of the
  player's lands and armies, a toggle).

## 3. Ubiquitous language

| Term | Meaning | Not to be confused with |
|---|---|---|
| Exploration unlock | Knowing S4 *Carrack and caravel* or S3 *Outrigger voyaging*, and the Age of Exploration having begun in the realm's region | Colonial unlock (S5) |
| Exploration ship | A ship of the exploration family (caravel, voyaging canoe): 60 supply, colony stores, the only ships that enter uncharted zones | Trade or military ship |
| Voyaging canoe | The exploration ship of S3 realms (outrigger or double-hulled), built on any shore with seafolk | War canoe fleet (military) |
| Charted map | The land provinces and sea zones a country knows; only grows | Parchment |
| Parchment | The map's fog drawn over what a country has not charted | Charted map |
| Voyage | A path of zones drawn for an exploration ship or fleet, into the parchment if wished | Route (trade, military) |
| Turn back / Carry on | The voyage's low-supply choice: turn to the nearest dockable port (default) or sail on and run out | |
| Colonial unlock | Knowing S5 *ocean_navigation*: colonial governors can be hired | Exploration unlock |
| Colonial governor | A type of official who founds a colony; needs a slot; a person who ages and can die | Governor of a subject; ordinary official |
| Colonial governor slot | How many colonial governors a country can have at once | Officials cap |
| Colonial range | Sea zones from the nearest port or colony within which a colony may be founded; set by the government form | Charted reach |
| Free tile | A tile nobody works; the only tiles a colony takes | Local people's tiles |
| Colony (being founded) | A province where a governor has gone ashore and progress is between 0 and 100 | Colony subject (subjects); *Settlement: colony* (province) |
| Progress | 0 to 100; starts at 10; 100 founds the colony, 0 loses it | Settlement level |
| Local aggression | Peaceful, Wary, Hostile or Fierce, rolled once when going ashore | |
| Locals' pressure | The monthly roll from 0 to twice the aggression's average, taken off progress | |
| Colony food | Rations held by a colony being founded; it eats 20 a month | Province food store |
| Colony stores | Food an exploration ship carries in its hold apart from its supply, for colonies | Supply |
| Unload stores | Moving colony stores from a ship in the colony's coastal zone into colony food | Resupply |
| Abandon | Taking the governor back aboard a ship in the zone | Lost (progress 0) |

## 4. Domain model

### Aggregates

**Charted map** (identity: country id)
- Holds: one bit per land province and per sea zone.
- INV-EXPL-1: A charted province or zone is never uncharted again.
- INV-EXPL-2: At the start a country has charted every province within 6 steps of its lands and every sea zone
  touching them.

**Voyage** (identity: fleet id of one or more exploration ships)
- Holds: path (ordered zones, some uncharted), start port, low-supply choice (*Turn back* default, *Carry on*),
  supply needed out and back, ports on the way (charted, possibly unknown "?").
- INV-EXPL-3: Every ship of a fleet entering an uncharted zone is an exploration ship.
- INV-EXPL-4: A voyage leaves port with full supply.

**Colonial office** (identity: country id)
- Holds: colonial governor slots (from S5, T8, T9, or S3), colonial governors (each: person, where: in port / at
  sea / ashore founding / travelling home), colonial range (from government form, or the S3 floor).
- INV-EXPL-5: Colonial governors ≤ colonial governor slots.
- INV-EXPL-6: A governor holding a slot does not count against the government's officials cap.
- INV-EXPL-7: Slots are never lost.

**Colony being founded** (identity: province id)
- Holds: owner country, governor, progress (0 to 100), local aggression, colony food (rations).
- INV-EXPL-8: At most one country founds a colony in a province at a time.
- INV-EXPL-9: The province is charted by, coastal, unowned, has at least one free tile, and lay inside the
  founder's colonial range when the governor went ashore.
- INV-EXPL-10: The colony takes only free tiles; tiles the local people work stay theirs.

### Entities and value objects

- **Local aggression level**: chance, average progress lost a month, months to 100 on average, food needed on
  average (table in section 10).
- **Colonial range by form** (government's numbers): 40 company rule; 30 merchant republic, constitutional
  monarchy, constitutional republic; 20 feudal realm, diet monarchy, absolute monarchy, party state; 15 military
  order, military junta, colonial government; 10 household realm, bureaucratic empire, elective monarchy, city
  commune, soldier emirs, shogunate; 5 prince-bishopric, holy rule, paramount chiefdom, tribute empire, warlord
  domain; 0 peasant commune, clan council, chiefdom, horde, confederation. Government 3 has adopted this column.
- **Colony stores per exploration ship type**: caravel 300 rations, voyaging canoe 100.

### Domain services

- **Unlock check**: S4 or S3 known, and the configured age (`exploration.unlock_age`) has begun at some time in
  the country's region.
- **Charting**: on each zone entered by an exploration ship, chart it and every zone and coastal province next to
  it; armies and other fleets chart what is next to them.
- **Range check**: zones from the province's coastal zone to the nearest port or colony of the country.
- **Voyage planner**: supply out and back, nearest dockable port for *Turn back*.
- **Aggression roll**: Peaceful if no people in the province or any neighbour (a coast across one sea zone
  counts), otherwise by the chances.

## 5. Requirements

### Unlocking exploration

- EXPL-001: When a country knows S4 *Carrack and caravel* or S3 *Outrigger voyaging* and the Age of Exploration has
  begun in its region, the exploration system shall give it the exploration unlock. [exploration §1, §2]
- EXPL-002: When the Age of Exploration has begun in a country's region, the exploration system shall keep the age
  gate open for that country, also after the age ends. [exploration §2]
- EXPL-003: The exploration system shall read the gating age from one config line `exploration.unlock_age`, set to
  the event tree's `age_of_exploration`. [exploration §2, §10.1; gap-lists decisions 16 Oct]
- EXPL-004: If a country's region is outside the gating age's region list (north_america, the Middle East and
  central Asia in the current data), then the exploration system shall not give it the exploration unlock until the
  first age that starts later than the gating age and covers its region begins there: `age_of_atlantic_empires` for
  north_america, `age_of_reformations` for middle_east and central_asia (D-EXPL-3). [exploration §2]
- EXPL-005: If a country lacks the exploration unlock, then the exploration system shall not let it buy
  exploration ships (the caravel without S4, the voyaging canoe without S3); the age gate applies to S3 realms and
  their voyaging canoes too (D-EXPL-4, D-EXPL-18). [exploration §2; naval §3.2, §3.3]
- EXPL-006: The exploration system shall leave where an exploration ship may sail to naval's research rule (with S4
  and S1 within 3 zones of a coast; with S5 the open ocean). [exploration §2; naval §7.2]
- EXPL-007: Where a country knows S3 *Outrigger voyaging*, the exploration system shall treat the voyaging canoe as
  an exploration ship (60 supply, 100 rations of colony stores; crew 20, 5 gold, 1 timber, 1 month), built on any
  shore with seafolk. [exploration §2.1; naval §3.3]
- EXPL-008: The exploration system shall let a voyaging canoe cross open ocean from the start. [exploration §2.1; naval §3.5]
- EXPL-009: Where a country knows S3 *Outrigger voyaging*, the exploration system shall open colonies for it with 1
  colonial governor slot and a colonial range of at least 10 zones whatever its government form; with S5 as well the
  base is 2 slots, not 3 (D-EXPL-4). [exploration §2.1]

### The charted map

- EXPL-010: The exploration system shall keep for every country a charted map of the land provinces and sea zones
  it knows. [exploration §3.1]
- EXPL-011: When a campaign starts, the exploration system shall chart for each country every province within 6
  steps of its lands, plus every sea zone touching them. [exploration §3.1, §8]
- EXPL-012: When an exploration ship enters a zone, the exploration system shall chart that zone and every zone and
  coastal province next to it. [exploration §3.1]
- EXPL-013: When any army or fleet of a country stands in a place, the exploration system shall chart what is next
  to it. [exploration §3.1]
- EXPL-014: The exploration system shall never remove a province or zone from a country's charted map. [exploration §3.1]
- EXPL-015: The exploration system shall show what a country has not charted under the parchment. [exploration §3.1, §9]
- EXPL-016: The exploration system shall let only exploration ships enter uncharted zones, and trade and military
  fleets shall plan routes only through charted zones. [exploration §3.1; naval §6.4]

### Voyages

- EXPL-017: When a player or AI gives a voyage to an exploration ship or a fleet of them, the exploration system
  shall take a path of zones tapped one by one, uncharted ones allowed, and show the zones, how many are uncharted,
  the supply needed out and back and any shortfall, the ports on the way (uncharted or undockable ones marked), and
  the low-supply choice. [exploration §3.2]
- EXPL-018: When a voyage starts, the exploration system shall have it leave port with full supply. [exploration §3.2]
- EXPL-019: The exploration system shall use naval's supply on a voyage: 1 per zone, refilled by docking; 60 for
  exploration ships. [exploration §3.2; naval §6.4]
- EXPL-020: While a voyage is set to *Turn back* (the default), when the supply left is just enough to reach the
  nearest port where it may dock, the exploration system shall turn the ship and sail it there. [exploration §3.2]
- EXPL-021: While a voyage is set to *Carry on*, the exploration system shall sail the path to its end, running out
  of supply if it must (naval: 1 in 10 of the crew lost each zone). [exploration §3.2; naval §6.4]
- EXPL-022: When a voyage docks on the way, the exploration system shall apply naval's docking: food in friendly
  ports, gold in neutral ones, none in an enemy's or a rival's. [exploration §3.2; naval §6.3]
- EXPL-023: When land is newly charted, the exploration system shall show its terrain, its owner if any and its
  ports, and nothing else. [exploration §3.3]

### Colonialism

- EXPL-024: When a country knows S5 *ocean_navigation*, the exploration system shall let it hire colonial governors. [exploration §4.1]
- EXPL-025: The exploration system shall hire a colonial governor like any other official, in any port of the
  country, for 20 gold and a wage of 5 gold a year (provisional), as a person who ages (30 when hired) and can die
  (D-EXPL-6). [exploration §4.2]
- EXPL-026: The exploration system shall give a base of 2 colonial governor slots with S5 (else 1 with S3), +1 with T8
  *Licensed trading companies* and +1 with T9 *joint_stock_finance* on top of either base, and never take a slot
  away (D-EXPL-4). [exploration §4.2; research-tree]
- EXPL-027: If a country has no free colonial governor slot, then the exploration system shall refuse to hire a
  colonial governor. [exploration §4.2]
- EXPL-028: The exploration system shall remove a colonial governor when his colony is founded (he becomes its
  ordinary official and his slot frees), when his colony fails (he dies), by old age, or by dismissal. [exploration §4.2]
- EXPL-029: While a colonial governor holds a slot, the exploration system shall not count him against the
  government's officials cap. [exploration §4.2; government §3]
- EXPL-030: The exploration system shall keep a colonial governor waiting in a port of his country until a ship picks
  him up, and let any ship carry him. [exploration §4.2]
- EXPL-031: The exploration system shall take a country's colonial range, in sea zones, from its government form. [exploration §4.3; government §3]
- EXPL-032: If a province's coastal zone is more zones from the country's nearest port or colony (as EXPL-065 counts
  them) than its colonial range, then the exploration system shall not let the country found a colony there. [exploration §4.3]
- EXPL-033: When a colony is founded, the exploration system shall measure later colonial range from it too, so
  colonies chain across an ocean. [exploration §4.3]

### Founding a colony

- EXPL-034: The exploration system shall let a province be colonised only when it is charted, coastal, owned by no
  country, has at least one free tile, lies inside the colonial range, and is not already being founded by someone
  else. [exploration §5.1]
- EXPL-035: If a province is owned by a country, tribal countries (a chiefdom or clan council in the 1444 list)
  included, then the exploration system shall not let it be colonised; it can only be taken by war or treaty.
  [exploration §5.1, §10.2; province §12.3]
- EXPL-036: When a colony is founded where a people with no country live, the exploration system shall take only
  the free tiles, and the people's tiles stay theirs. [exploration §5.1, §10.2; province §12.3]
- EXPL-037: When a ship carrying a colonial governor is in a colonisable province's coastal zone and *Found colony*
  is given, the exploration system shall put the governor ashore and start the colony at 10 progress. [exploration §5.2]
- EXPL-038: When a governor goes ashore, the exploration system shall roll the colony's local aggression at once
  from the peoples in the province and its neighbours (a coast across one sea zone counts) and show it. [exploration §5.2]
- EXPL-039: The exploration system shall roll local aggression as Peaceful 30 %, Wary 30 %, Hostile 25 %, Fierce
  15 %, with average progress lost a month 0, 1, 2 and 3. [exploration §5.2]
- EXPL-040: If there are no people in the province or any neighbour, then the exploration system shall make the
  colony Peaceful. [exploration §5.2]
- EXPL-041: Each month while a colony is being founded, the exploration system shall add 5 progress. [exploration §5.3]
- EXPL-042: Each month while a colony is being founded, the exploration system shall take away the locals' pressure,
  a roll from 0 to twice the aggression's average. [exploration §5.3]
- EXPL-043: Each month while a colony is being founded, the exploration system shall have it eat 20 rations of
  colony food, and if no food is left take a further 10 progress that month. [exploration §5.3]
- EXPL-044: The exploration system shall let colony food come only from ships: colony stores carried by exploration
  ships apart from their supply (per type in config: caravel 300 rations). [exploration §5.3; naval §6.4]
- EXPL-045: The exploration system shall load colony stores in any port where the ship could resupply, at the same
  cost as resupply (food from the country's own provinces, gold in neutral ports). [exploration §5.3; naval §6.3]
- EXPL-046: When an exploration ship in a colony's coastal zone is given *Unload stores*, the exploration system shall
  move its stores into colony food in one day, without a port. [exploration §5.3]
- EXPL-047: When a colony's progress reaches 100, the exploration system shall make the province the country's with
  its settlement at *settlement*, keep the governor as its official counting against the officials cap, free his
  slot, and put left-over colony food into the province's store. [exploration §5.3]
- EXPL-048: When a colony's progress reaches 0, the exploration system shall kill the governor, lose the colony
  food, free the slot and leave the province unowned. [exploration §5.3]
- EXPL-049: While a ship of the founder is in the colony's zone, the exploration system shall let the founder
  abandon the colony by taking the governor back aboard, and keep his slot used until he is home in a port. [exploration §5.3]
- EXPL-050: When a colony is founded, the exploration system shall hand the province to province stats 12.3 as a royal
  province of the founder (settlers, local tiles); it becomes a Colony subject only when the subjects design charters
  it, never by itself (D-EXPL-7). [exploration §5.3, §9]
- EXPL-051: When a colony is founded, the exploration system shall publish it so the event tree's `colonial_presence`
  counts it (EXPL-067). [exploration §9]

### Decided 17 October

- EXPL-058: While a colony is being founded, the exploration system shall not check the colonial range again; a change
  of government form or a shrinking range affects only colonies founded later (D-EXPL-9). [D-EXPL-9; exploration §4.3]
- EXPL-059: When a colonial governor dies, of old age or at sea when his ship sinks, the exploration system shall free
  his slot, and if he was founding a colony, lose it as at progress 0 (EXPL-048) (D-EXPL-10). [D-EXPL-10]
- EXPL-060: If a province being founded as a colony gets an owner other than the founder, then the exploration system
  shall lose the colony as at progress 0 (D-EXPL-11). [D-EXPL-11; province §12.3]
- EXPL-061: When a colony is abandoned, the exploration system shall lose the colony food left ashore, and let the
  governor aboard go ashore on another colonisable coast at once with *Found colony* (D-EXPL-12). [D-EXPL-12]
- EXPL-062: When the exploration AI loads colony stores, it shall load the average food the rolled aggression needs
  times 1.25 (provisional): Peaceful 450, Wary 575, Hostile 750, Fierce 1,125 rations (D-EXPL-13). [D-EXPL-13; exploration §8]
- EXPL-063: The exploration system shall roll the locals' pressure as a whole number from 0 to twice the aggression's
  average, each number equally likely (D-EXPL-14). [D-EXPL-14]
- EXPL-064: The exploration system shall never share a charted map between countries, allies, subjects and overlords
  included, nor hand one over when land is conquered or inherited (D-EXPL-15). [D-EXPL-15; exploration §3.1]
- EXPL-065: The exploration system shall measure colonial range from the country's own ports (lords' ports and canoe
  landings included), its subjects' ports and its founded colonies, never from a colony still being founded (D-EXPL-5). [D-EXPL-5]
- EXPL-066: The exploration system shall give a voyage only to exploration ships in port; ships at sea must dock first (D-EXPL-17). [D-EXPL-17; exploration §3.2]
- EXPL-067: The exploration system shall count for the event tree's `colonial_presence` every colony the country has
  founded plus every trading post it holds, and not a colony still being founded (D-EXPL-8). [D-EXPL-8; event-tree vocabulary]
- EXPL-068: The exploration system shall treat a province no nation on the map owns as land of a people with no
  country, whatever the catalogue records there (decentralised polities and non-state actors included); only a map
  nation's land counts as owned (D-EXPL-2, X-13). [D-EXPL-2; X-13]

### On screen (owned by map-presentation)

- EXPL-052: The exploration system shall supply: at world zoom the parchment, voyage paths as dotted lines and
  colonies being founded as a small flag with a progress ring; at region zoom the colonial range as a faint line on
  the sea and colonisable provinces marked with a pale flag; at province zoom the colony card (governor, progress
  and average monthly change, locals and their monthly range, food and months left with a shortfall warning, the
  *Abandon* command); and on the country card "Colonial governors n of m · range r zones". [exploration §7]

### AI and the phone

- EXPL-053: Where a country's catalogue personality favours expansion by sea (`naval_capability`, preferred
  expansion modes), the exploration AI shall send exploration ships along the edge of its charted map, then found
  colonies on the nearest unowned coasts, always loading enough stores for the aggression it rolled plus a margin
  (EXPL-062). [exploration §8]
- EXPL-054: Where a country is a land power, the exploration AI shall never explore. [exploration §8]
- EXPL-055: The exploration system shall store charted maps as one bit per province and zone per country. [exploration §8]
- EXPL-056: The exploration system shall update colonies being founded once a month with the province. [exploration §8]
- EXPL-057: The exploration system shall read its numbers from one exploration config file. [exploration §8]

### How the player uses it (first slice in the game)

- EXPL-069 Where: exploration ships (the caravel, the voyaging canoe) are ordered in a port's **Port** tab like any ship; until the realm has the exploration unlock their row says what is missing (the invention by its name, or "the Age of Exploration has not reached your lands"). A fleet of nothing but exploration ships has **Explore** on its fleet card. Tapping Explore folds the panel away and shows a voyage bar over the map; each tap on a sea zone, charted or under the parchment, adds a leg to the drawn course (the quickest way from the last point). The bar shows the zones, how many are uncharted, the supply out and back against what the ships carry and any shortfall, and a two-way switch *Turn back* (default) / *Carry on*, with *Set sail*, *Undo* and *Cancel*. Explore needs the fleet in port (EXPL-066): at sea the card says "Put into port to explore again" and Sail takes it home. As the fleet sails, the parchment lifts from what it charts; when a voyage ends or turns back, a news line says where and how many places it charted. [X-19; D-EXPL-19]
- EXPL-070 Founding: everything a ship does for a colony is on its fleet card, under **Colony**. In a port of the realm's with a free colonial governor slot: *Hire a colonial governor · 20 gold*, who comes aboard at once (a governor already waiting in that port has *Take aboard*). In a port where the ships may resupply: *Load colony stores*, with the rations and their cost. At sea next to land: one *Found a colony in …* button for each coast there the governor aboard may settle, and the reason under each one he may not (owned, out of range, already being settled). Next to one of the realm's colonies being founded: *Unload n rations into …*. [X-19]
- EXPL-071 One colony: tapping a province being founded opens its province card with a **Colony** section first: the governor, progress as a bar with the average change a month, the locals' mood and the range of their monthly pressure, the food and the months it lasts with a warning when it runs out before the colony is founded, and *Abandon* (only with one of the realm's ships in the zone, else the reason). [X-19; EXPL-052]
- EXPL-072 Overview: the player's realm card has a **Colonies** tab (after Navy) opening with "Colonial governors n of m · range r zones" (EXPL-052), then every governor and where he is (waiting in a port, aboard a fleet, ashore), each with a button to his fleet or colony; every colony being founded with its progress bar, food in months and locals; the colonies founded; and how many empty coasts the realm has charted inside its range, with *Show on the Exploration map mode*. Before the colonial unlock the tab says which inventions open it. [X-19]
- EXPL-073 The map: the map mode menu gains **Exploration** (was the Charts lens): land the realm has charted in its holders' colours faded, the parchment over everything uncharted (whatever the fog switch says), empty coasts inside the colonial range bright green, empty land beyond it pale green, and colonies being founded in the realm's colour with a small flag and a progress ring. The fog switch's parchment everywhere else comes from the charted map, not from a reach around the player's lands (D-EXPL-16). [X-19; EXPL-052]
- EXPL-074 Phone: the voyage bar, fleet card, colony section and Colonies tab work in the Wide and Tall layouts, held sideways and upright: the voyage bar sits above the bottom safe area, one row in Wide and two in Tall; every button is at least 44 points high; a reason a button can't be used is written under it, never only in a hover title. Checked by apps/client/scripts/explore-shots.mjs. [X-19]
- EXPL-075 The exploration system shall, until the province and event tree contexts supply them, read a realm's region for the age gate from the event tree's 1444 polities where it is listed, else from the scenario catalogue's region group of the realm; count every unowned land province as having a free tile; and make a founded colony a province of the founder whose people stay and whose post goes to the governor (D-EXPL-20). [D-EXPL-20]

## 6. Commands

| Command | Who issues it | Preconditions | Result | Events emitted |
|---|---|---|---|---|
| GiveVoyage(fleet, path, lowSupply) | player / AI | Fleet of exploration ships only, in port (EXPL-066); path of zones | Fleet sails with full supply; charts as it goes; turns back or carries on | VoyageStarted, ZoneCharted, VoyageTurnedBack |
| HireColonialGovernor(port) | player / AI | S5 (or S3); free slot; 20 gold | Governor waits in that port; 5 gold a year | ColonialGovernorHired |
| DismissColonialGovernor(governor) | player / AI | Governor not ashore founding | Slot frees | ColonialGovernorDismissed |
| EmbarkGovernor(governor, ship) | player / AI | Ship in the governor's port (any ship) | Governor aboard as cargo | — |
| LoadColonyStores(ship, rations) | player / AI | Exploration ship docked where it may resupply | Stores loaded at resupply cost | ColonyStoresLoaded |
| FoundColony(ship, province) | player / AI | Ship carrying a governor in the province's coastal zone; province colonisable (EXPL-034) | Colony at 10 progress; aggression rolled | ColonyFoundingStarted, LocalAggressionRolled |
| UnloadStores(ship, colony) | player / AI | Exploration ship in the colony's coastal zone | Stores into colony food in one day | ColonyFoodUnloaded |
| AbandonColony(colony, ship) | player / AI | A ship of the founder in the zone | Governor aboard; colony food lost; slot used until he is home or ashore elsewhere | ColonyAbandoned |

## 7. Domain events

| Event | When | Payload | Consumed by (context) |
|---|---|---|---|
| ExplorationUnlocked | Unlock check passes | country | naval (exploration ships buyable), map-presentation |
| ZoneCharted / ProvinceCharted | Charting | country, place | map-presentation (parchment), naval (may-enter), troop-movement (planner) |
| VoyageStarted / VoyageTurnedBack / VoyageEnded | Voyage | fleet, path, port | map-presentation |
| ColonialGovernorHired / Dismissed / Died | Governor changes | country, person | province (officials), government (cap) |
| ColonyFoundingStarted | Governor ashore | province, country, governor | map-presentation, events |
| LocalAggressionRolled | Ashore | province, level | map-presentation |
| ColonyFoodUnloaded | Unload | province, rations | — |
| ColonyFounded | Progress 100 | province, country, governor, left-over food | province (royal province, *Settlement*, store), subjects (may charter later), events (`colonial_presence`), realm (provinces) |
| ColonyLost | Progress 0, governor dead, or province taken by another | province, country | province (unowned), events |
| ColonyAbandoned | Abandon | province, country | — |

## 8. Policies (reactions to other contexts)

- When a country learns S3, S4 or S5, T8 or T9 (research), then the unlock check runs and slots are recounted.
- When an age begins in a region (events), then the unlock check runs for countries of that region.
- When a country's government form changes (government), then its colonial range is re-read; colonies already
  being founded are not affected (EXPL-058).
- When a fleet or army moves (naval, troop-movement), then charting runs for the places next to it.
- When a governor dies of old age (province, people) or his ship sinks (naval), then his slot frees and a colony he
  was founding is lost (EXPL-028, EXPL-059).
- When a province becomes owned by a country (war, treaty, event), then any colony being founded there by another
  country is lost (EXPL-060).
- When a year passes (time-and-turns), then every colonial governor is a year older.

## 9. Each turn and each month

Each day of the turn's 7 days (troop-movement day loop): voyages move as naval fleets; charting runs as they enter zones; *Turn back*
is checked against supply; unloading takes one day.

In the turn in which a new month begins, with the province update:
1. For each colony being founded: progress +5; minus the locals' pressure roll; eat 20 rations of colony food, or
   −10 progress if there is none.
2. Progress ≥ 100: founded (hand over to province and subjects; publish for `colonial_presence`). Progress ≤ 0: lost.
3. Recount governor slots from research.
4. In the turn in which 1 January falls, every colonial governor ages a year; wages (5 gold a year each) go to the realm's treasury
   step.
Reads first: research known, the current ages and regions (events), government form (range), province ownership
and free tiles.

## 10. Configuration

All in one exploration config file (keys proposed here except `exploration.unlock_age`, which the design names).

| Key | Meaning | Value in the design | Placeholder? | Config file |
|---|---|---|---|---|
| exploration.unlock_age | Age that gates exploration | `age_of_exploration` | no (decided) | exploration |
| exploration.unlock_inventions | Inventions that unlock exploration | S4 or S3 | yes | exploration |
| exploration.colonial_unlock_invention | Invention that unlocks colonial governors | S5 | yes | exploration |
| exploration.governor_slots | Slots per invention | S5: 2; T8: +1; T9: +1; S3: 1 | yes | exploration |
| exploration.s3_min_range | Colonial range floor for S3 realms | 10 zones | yes | exploration |
| exploration.range_by_form | Colonial range per government form | 40/30/20/15/10/5/0 (owned by government) | yes | government |
| exploration.start_charted_reach | Steps charted around a country's lands at start | 6 | yes | exploration |
| exploration.progress_start | Progress when going ashore | 10 | yes | exploration |
| exploration.progress_founded / lost | Thresholds | 100 / 0 | yes | exploration |
| exploration.progress_gain | Progress a month from the settling party | +5 | yes | exploration |
| exploration.aggression | Levels: chance; average loss a month | Peaceful 30 %, 0; Wary 30 %, 1; Hostile 25 %, 2; Fierce 15 %, 3 | yes | exploration |
| exploration.pressure_roll_max_factor | Pressure roll range | 0 to 2 × average | yes | exploration |
| exploration.food_per_month | Rations a colony eats | 20 | yes | exploration |
| exploration.no_food_progress_loss | Extra loss with no food | 10 | yes | exploration |
| exploration.colony_stores | Stores per exploration ship type | caravel 300; voyaging canoe 100 | yes | exploration/naval |
| exploration.unload_days | Days to unload stores | 1 | yes | exploration |
| exploration.governor_hire_gold | Gold to hire a colonial governor | 20 (D-EXPL-6) | provisional | exploration |
| exploration.governor_wage_per_year | His yearly wage | 5 (D-EXPL-6) | provisional | exploration |
| exploration.governor_age_when_hired | His age when hired | 30 (D-EXPL-6) | provisional | exploration |
| exploration.ai.stores_margin | AI stores over the level's average need | 1.25 (D-EXPL-13) | provisional | exploration |
| (later ages) | Age that opens the gate outside `unlock_age`'s regions | first later age covering the region (D-EXPL-3), read from exploration-regions.json | decided | events |

Provisional numbers are listed in the file's `_provisional` array.

Derived from the design's table (averages): months to 100 — Peaceful 18, Wary 23, Hostile 30, Fierce 45; food
needed — 360, 460, 600, 900 rations.

## 11. Seams

| Other context | Direction | Pattern | What crosses |
|---|---|---|---|
| naval | upstream | Customer–Supplier | Ship families, the caravel and voyaging canoe rows, 60 supply, colony stores in the hold, docking and resupply, sailing reach (7.2), fleets as movers; EXPL supplies the unlock and the charted map (uncharted may-enter) |
| research | upstream | Conformist | S3, S4, S5 (*ocean_navigation*, "opens colonies with 2 colonial governor slots"), T8 and T9 (+1 slot each), S1 |
| events | upstream | Conformist | `age_of_exploration` and its regions (the age gate) |
| events | downstream | Published Language | Founded colonies plus trading posts held counted by `colonial_presence` (D-EXPL-8); no first-contact hook (D-EXPL-1) |
| events | upstream | Conformist | The later ages that open the gate outside the Age of Exploration's regions (D-EXPL-3) |
| government | upstream | Conformist | Colonial range per form (adopted column), officials cap and the governor exemption |
| province | downstream | Customer–Supplier | The founded colony as province state: owner, *Settlement* at *settlement*, the governor as official, left-over food to the store, free tiles vs local people's tiles (12.3); colonial governor official type (10.2, upstream) |
| subjects | downstream | Customer–Supplier | A founded colony is a royal province (D-EXPL-7); subjects may later charter colonial provinces as a Colony subject (subjects 9); subjects' ports count for colonial range (D-EXPL-5) |
| world-map | upstream | Conformist | Sea zones (~150 km coastal, ~300 km ocean), coastal provinces, adjacency, steps for the start charted reach |
| scenario-setup | upstream | Conformist | 1444 owners: land owned by a map nation (tribal countries included) is owned; land no map nation owns is a people's with no country, whatever the catalogue lists (X-13, D-EXPL-2) |
| map-presentation | downstream | Published Language | Parchment from the charted map, voyage paths, colony flags and progress rings, range line, colony card; the client's reach toggle is replaced by the charted map (D-EXPL-16) |
| naval | upstream | Customer–Supplier | Ship sinking (a governor aboard dies, EXPL-059); the voyaging canoe needs the full exploration unlock (D-EXPL-18) |
| realm | downstream | Customer–Supplier | Country card line (governors n of m, range); governor hiring gold and wage from the treasury |
| troop-movement | upstream | Conformist | Shared planner and day loop the voyage uses through naval |
| diplomacy | upstream | Conformist | War and rivalry that close ports to a voyage's docking (through naval) |
| time-and-turns | upstream | Conformist | Monthly colony update and the day loop |

## 12. AI

- Explores when its catalogue personality favours expansion by sea (`naval_capability`, preferred expansion modes).
- Sends exploration ships along the edge of its charted map.
- Then founds colonies on the nearest unowned coasts, always loading enough stores for the aggression it rolled plus
  a margin: the level's average need × 1.25 (EXPL-062).
- Land powers never explore.
- Uses the same commands as the player.

## 13. Decisions and open questions

Decided on 17 October 2026 under `domain/DECISIONS.md` (latest decision wins, simpler rule, no new mechanics,
provisional numbers in `exploration.json`). None stays open.

- **D-EXPL-1** (was OQ-EXPL-1) First contact and disease: there is no first-contact or disease mechanic; voyages chart land and nothing else happens when worlds meet, and the event tree's epidemics keep their own triggers. The design left them out on purpose and the rules add no mechanic.
- **D-EXPL-2** (was OQ-EXPL-2) Land of stateless peoples: land owned by a nation on the map (tribal countries included) cannot be colonised; a province no map nation owns is land of a people with no country and can be colonised on its free tiles, whatever the catalogue records there, `decentralized_polity` and `non_state_actor` records included (EXPL-068). X-13 makes the map's nations the realms and catalogue records with no province reference data.
- **D-EXPL-3** (was OQ-EXPL-3) Regions outside the gating age: a region outside `age_of_exploration`'s list opens with the first age that starts later and covers it, read from the event tree's ages: `age_of_atlantic_empires` (1520) for north_america, `age_of_reformations` (1530) for middle_east and central_asia (EXPL-004). It needs no new config line and follows the design's "a later age that covers it".
- **D-EXPL-4** (was OQ-EXPL-4) S3 realms: the age gate applies to S3 realms too; the slot base is 2 with S5, else 1 with S3 (the larger, not added), and T8 and T9 each add 1 on top of either base; the range floor of 10 stays for S3 realms (EXPL-005, EXPL-009, EXPL-026). One unlock rule for every realm is the simpler rule.
- **D-EXPL-5** (was OQ-EXPL-5) Nearest port or colony: colonial range counts from the country's own ports (lords' ports and canoe landings included), its subjects' ports (so Castile reaches from the Canaries) and its founded colonies, never from a colony still being founded (EXPL-065). A colony still being founded is not yet the country's land.
- **D-EXPL-6** (was OQ-EXPL-6) Governor cost and wage: hiring costs 20 gold and the wage is 5 gold a year (both provisional, `governor_hire_gold`, `governor_wage_per_year`); he is hired in any port of the country, is 30 when hired and ages a year each January (EXPL-025). No official's price exists anywhere yet, so the numbers are provisional.
- **D-EXPL-7** (was OQ-EXPL-7) The founded colony: it becomes a royal province of the founder at settlement *settlement* with its governor as official; it becomes a Colony subject only when the subjects design charters it, never by itself (EXPL-050). Exploration 5.3 says the province becomes the country's, and no automatic subject is the simpler rule.
- **D-EXPL-8** (was OQ-EXPL-8) `colonial_presence`: it counts every colony founded plus every trading post held, as the event vocabulary says; a colony still being founded does not count (EXPL-067). The event tree owns the trigger's meaning.
- **D-EXPL-9** (was OQ-EXPL-9) Form or range changes during founding: the colony goes on; range is checked only when the governor goes ashore (EXPL-058). INV-EXPL-9 already measures range at going ashore.
- **D-EXPL-10** (was OQ-EXPL-10) The governor dies: a colony whose governor dies of old age is lost as at progress 0; a governor at sea dies when his ship sinks; either way his slot frees (EXPL-059). A colony needs its governor, as progress 0 already shows.
- **D-EXPL-11** (was OQ-EXPL-11) Interference: if the province gets an owner other than the founder while the colony is being founded, the colony is lost as at progress 0 (EXPL-060); unowned land cannot be attacked, so nothing else applies. One loss rule covers every ending.
- **D-EXPL-12** (was OQ-EXPL-12) Abandon: the colony food left ashore is lost, and the governor aboard may go ashore on another colonisable coast at once with *Found colony*; otherwise his slot frees when he is home in a port (EXPL-061). It reuses the existing commands.
- **D-EXPL-13** (was OQ-EXPL-13) AI margin: the AI loads the rolled level's average food need × 1.25 (provisional `ai.stores_margin`): Peaceful 450, Wary 575, Hostile 750, Fierce 1,125 rations (EXPL-062). One multiplier is the smallest rule that gives "plus a margin".
- **D-EXPL-14** (was OQ-EXPL-14) Pressure roll: a whole number from 0 to twice the level's average, each number equally likely, drawn from the game's Rng (EXPL-063). It keeps the design's table averages.
- **D-EXPL-15** (was OQ-EXPL-15) Charts between countries: charted maps are never shared, not between allies, subjects or overlords, and never handed over by conquest or inheritance (EXPL-064). The design only says charts are never lost, and sharing would add a mechanic.
- **D-EXPL-16** (was OQ-EXPL-16) Start reach and the client: the charted map replaces the client's `KNOWN_REACH` toggle: 6 land steps from the country's lands plus the sea zones touching them, and armies and fleets chart only what is next to them (EXPL-011, EXPL-013); a request to the client build. The design asked for the replacement.
- **D-EXPL-17** (was OQ-EXPL-17) Voyages at sea: a voyage is given only to ships in port, so it always leaves with full supply; ships at sea must dock first by an ordinary order (EXPL-066). No implied docking means no new rule.
- **D-EXPL-18** (was OQ-EXPL-18) Voyaging canoes outside the age: every exploration ship needs the full exploration unlock, the age gate included; naval's "S3 only" for the voyaging canoe follows exploration (EXPL-005, naval NAVY-045). One unlock rule for both exploration ships.
- **D-EXPL-19** (Leroy, X-19, 18 October) The voyage path is drawn by taps that each add a leg, the quickest way from the last point, rather than one zone a tap: on a phone a crossing of thirty zones would otherwise need thirty exact taps on small sea zones. The preview, the low-supply choice and every rule of a voyage stay as written (EXPL-017).
- **D-EXPL-20** First slice in the game (EXPL-075): the map has no region per province and tiles do not yet record who works them, so a realm's region comes from the event tree's polity list or the scenario catalogue's region group (and colonial presence is not yet counted by region, so age ends read the date alone), every unowned land province counts one free tile, and a founded colony keeps its people, who become the founder's. A voyaging canoe is ordered in a port like the caravel until shores with seafolk can build without a harbour. The AI builds one caravel in its best port once it has the unlock, explores the edge of its charts and founds on the nearest empty coast; it gets colonial governors through the same orders as the player.

## 14. Traceability

| Requirement | Feature file | Scenario |
|---|---|---|
| EXPL-001 | unlocking-exploration.feature | Who can explore in 1444 |
| EXPL-001 | unlocking-exploration.feature | Ming must research S4 first |
| EXPL-001 | unlocking-exploration.feature | Outrigger voyaging is the Pacific and Malay way |
| EXPL-002 | unlocking-exploration.feature | The age gate stays open after the age ends |
| EXPL-003 | unlocking-exploration.feature | Who can explore in 1444 |
| EXPL-004 | unlocking-exploration.feature | A region outside the age cannot explore yet |
| EXPL-005 | unlocking-exploration.feature | No unlock, no exploration ships |
| EXPL-006 | unlocking-exploration.feature | Early voyages creep along the coasts |
| EXPL-007 | unlocking-exploration.feature | Outrigger voyaging is the Pacific and Malay way |
| EXPL-007 | unlocking-exploration.feature | A voyaging canoe |
| EXPL-008 | unlocking-exploration.feature | A voyaging canoe crosses open ocean from the start |
| EXPL-009 | unlocking-exploration.feature | S3 opens colonies whatever the government form |
| EXPL-010 | charted-map.feature | What a country has charted at the start |
| EXPL-011 | charted-map.feature | What a country has charted at the start |
| EXPL-012 | charted-map.feature | An exploration ship charts as it sails |
| EXPL-012 | voyages.feature | Castile 1493, the first voyage |
| EXPL-013 | charted-map.feature | Armies and other fleets chart what is next to them |
| EXPL-014 | charted-map.feature | Charts are never lost |
| EXPL-015 | charted-map.feature | The parchment covers what is uncharted |
| EXPL-016 | charted-map.feature | Only exploration ships enter uncharted zones |
| EXPL-017 | voyages.feature | The São Gabriel voyage preview |
| EXPL-018 | voyages.feature | A voyage always leaves port with full supply |
| EXPL-019 | voyages.feature | The São Gabriel voyage preview |
| EXPL-020 | voyages.feature | Turn back is the default |
| EXPL-021 | voyages.feature | Carry on runs out of supply if it must |
| EXPL-022 | voyages.feature | Docking on the way |
| EXPL-022 | voyages.feature | Castile 1493, the first voyage |
| EXPL-023 | voyages.feature | What a voyage finds |
| EXPL-024 | colonial-governors.feature | S5 opens colonial governors |
| EXPL-025 | colonial-governors.feature | A colonial governor is hired like any official, and is a person |
| EXPL-026 | colonial-governors.feature | Colonial governor slots |
| EXPL-026 | colonial-governors.feature | Slots are never lost |
| EXPL-027 | colonial-governors.feature | No free slot, no governor |
| EXPL-028 | colonial-governors.feature | How a colonial governor leaves his slot |
| EXPL-029 | colonial-governors.feature | A governor holding a slot is not counted against the officials cap |
| EXPL-030 | colonial-governors.feature | A governor waits in port until any ship picks him up |
| EXPL-031 | colonial-governors.feature | Colonial range by government form |
| EXPL-031 | colonial-governors.feature | Portugal reaches Brazil from the Cape Verde islands |
| EXPL-032 | colonial-governors.feature | Inside or outside the colonial range |
| EXPL-033 | colonial-governors.feature | Colonies chain across an ocean |
| EXPL-034 | founding-a-colony.feature | Where a colony can be founded |
| EXPL-035 | founding-a-colony.feature | Hispaniola is held by Taíno chiefdoms |
| EXPL-036 | founding-a-colony.feature | A people with no country keep their tiles |
| EXPL-037 | founding-a-colony.feature | Going ashore |
| EXPL-037 | founding-a-colony.feature | Castile 1493, the second trip and the colony |
| EXPL-038 | founding-a-colony.feature | Going ashore |
| EXPL-038 | founding-a-colony.feature | A coast across one sea zone counts as a neighbour |
| EXPL-039 | founding-a-colony.feature | Local aggression levels |
| EXPL-039 | founding-a-colony.feature | The chances of each level |
| EXPL-039 | founding-a-colony.feature | Castile 1493, the second trip and the colony |
| EXPL-040 | founding-a-colony.feature | No people around means Peaceful |
| EXPL-041 | founding-a-colony.feature | A month of founding |
| EXPL-042 | founding-a-colony.feature | A month of founding |
| EXPL-042 | founding-a-colony.feature | The locals' pressure roll |
| EXPL-043 | founding-a-colony.feature | A month of founding |
| EXPL-043 | founding-a-colony.feature | Castile 1493, the second trip and the colony |
| EXPL-044 | founding-a-colony.feature | Loading colony stores |
| EXPL-045 | founding-a-colony.feature | Loading colony stores |
| EXPL-046 | founding-a-colony.feature | Unloading stores needs no port |
| EXPL-046 | founding-a-colony.feature | Castile 1493, the second trip and the colony |
| EXPL-047 | founding-a-colony.feature | Progress 100 founds the colony |
| EXPL-047 | founding-a-colony.feature | Castile 1493, the second trip and the colony |
| EXPL-048 | founding-a-colony.feature | Progress 0 loses the colony |
| EXPL-049 | founding-a-colony.feature | Abandoning a colony |
| EXPL-049 | founding-a-colony.feature | No ship in the zone, no abandoning |
| EXPL-050 | founding-a-colony.feature | Progress 100 founds the colony |
| EXPL-051 | founding-a-colony.feature | Progress 100 founds the colony |
| EXPL-052 | — | Presentation only (owned by map-presentation) |
| EXPL-053 | exploration-ai.feature | A sea-minded AI explores the edge of its charts, then colonises |
| EXPL-053 | exploration-ai.feature | The AI loads enough stores for the roll plus a margin |
| EXPL-054 | exploration-ai.feature | Land powers never explore |
| EXPL-055 | charted-map.feature | What a country has charted at the start |
| EXPL-056 | founding-a-colony.feature | Colonies update once a month |
| EXPL-057 | — | Configuration structure; checked by config loading, no behaviour |
| EXPL-004 | unlocking-exploration.feature | The first later age that covers a region opens its gate |
| EXPL-004 | unlocking-exploration.feature | The Mamluks may explore once the later age begins |
| EXPL-005 | unlocking-exploration.feature | The age gate applies to voyaging canoes too |
| EXPL-009, EXPL-026 | colonial-governors.feature | T8 and T9 add to the S3 slot too |
| EXPL-025 | colonial-governors.feature | A colonial governor is hired like any official, and is a person |
| EXPL-058 | colonial-governors.feature | A colony already being founded keeps going when the range shrinks |
| EXPL-059 | founding-a-colony.feature | The governor dies of old age while his colony is being founded |
| EXPL-059 | founding-a-colony.feature | A governor at sea dies when his ship sinks |
| EXPL-060 | founding-a-colony.feature | Another country gains the province during founding |
| EXPL-061 | founding-a-colony.feature | Abandoning loses the food left, and the governor may land elsewhere |
| EXPL-062 | exploration-ai.feature | The AI loads enough stores for the roll plus a margin |
| EXPL-063 | founding-a-colony.feature | The locals' pressure roll |
| EXPL-064 | charted-map.feature | Charts are never shared or handed over |
| EXPL-065 | colonial-governors.feature | What colonial range is measured from |
| EXPL-066 | voyages.feature | A voyage is given only in port |
| EXPL-067 | founding-a-colony.feature | What colonial presence counts |
| EXPL-068 | founding-a-colony.feature | A people with no country keep their tiles |
| EXPL-069 … EXPL-074 | — | Client screens; checked by apps/client/scripts/explore-shots.mjs |
| EXPL-075 | — | packages/engine/test/exploration.test.ts (the game's first slice) |
