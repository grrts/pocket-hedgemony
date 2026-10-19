# Exploration and Colonies

Exploration is how your realm sails into the unknown and plants colonies there. Each country sees only the part of the world it has charted, with a parchment fog over the rest; exploration ships push into that fog, and once you can hire colonial governors you can carry one to an unowned coast, keep the colony fed from your ships, and watch it grow until the province becomes yours.

## How it works

### Unlocking exploration

A country gets the **exploration unlock** when it knows S4 *Carrack and caravel* (or S3 *Outrigger voyaging*) and the **Age of Exploration** has begun in its region. Once the age has begun there, the gate stays open for that country even after the age ends. The gating age is one config line, `exploration.unlock_age`, set to the event tree's `age_of_exploration`. Regions outside that age's list wait for the first later age that covers them: North America opens with the Age of Atlantic Empires (1520), the Middle East and central Asia with the Age of Reformations (1530). So the Mamluks can know S4 early and still not explore until then.

At the 1378 start nobody can explore. Genoa and Venice know S4, but the Age of Exploration has not begun; it starts when Portugal or Castile has the ocean ships or holds the Atlantic islands (earliest 1415, and by 1445 at the latest), see [Historical Events](Historical-Events). Portugal and Castile don't know S4 yet and must research it first. Ming knows S1 and S2 but not S4.

Without the unlock you can't buy exploration ships: no caravel without S4, no voyaging canoe without S3, and the age gate applies to voyaging canoes too. Where an exploration ship may sail is [Naval](Naval)'s research rule: with S4 and S1 within 3 zones of a coast, with S5 the open ocean. Early voyages creep along the coasts.

**The Pacific and Malay way.** A country that knows S3 builds the **voyaging canoe** (outrigger or double-hulled) as its exploration ship: 60 supply, 100 rations of colony stores, crew 20, 5 gold, 1 timber and 1 month, built on any shore with seafolk. It can cross open ocean from the start. S3 also opens colonies with 1 colonial governor slot and a colonial range of at least 10 zones, whatever the government form; T8 and T9 add a slot each on top.

### The charted map

Every country has its own **charted map** of the land provinces and sea zones it knows, and what it hasn't charted lies under the **parchment**.

- At the start a country has charted every province within 6 steps of its lands, plus every sea zone touching them.
- When an exploration ship enters a zone, that zone and every zone and coastal province next to it are charted.
- Any army or fleet charts what is next to where it stands.
- Charts are never lost: if Portugal charted the coast of Arguin and later loses every ship and province near it, the coast stays charted.
- Charts are never shared or handed over: not with allies, subjects or overlords, and not when land is conquered or inherited. Each country charts its own world.
- Only exploration ships enter uncharted zones. Trade and military fleets plan routes only through charted zones.

### Voyages

You give a voyage to an exploration ship or a fleet of them by tapping zones one by one, uncharted ones allowed. The preview shows the zones and how many are uncharted, the supply needed out and back and any shortfall, the ports on the way (uncharted or undockable ones marked), and the **low-supply choice**:

- **Turn back** (the default): when the supply left is just enough to reach the nearest port where it may dock, the ship turns and sails there.
- **Carry on**: the ship sails the path to its end and runs out of supply if it must, losing 1 in 10 of its crew each zone.

A voyage is given only to ships in port, so it always leaves with full supply; ships at sea must put into a port first. Supply is naval's: 1 per zone, 60 for exploration ships, refilled by docking (food in friendly ports, gold in neutral ones, nothing in an enemy's or a rival's). Newly charted land shows its terrain, its owner if any and its ports, and nothing else.

**The São Gabriel.** The caravel São Gabriel waits in Lagos with 60 supply. The player draws a voyage of 34 zones, 21 uncharted. The preview shows supply 60 of 60, 34 out and 34 back, 8 short; it lists Arguin as a canoe landing with no dock and Elmina as uncharted, and offers Turn back and Carry on.

**Castile 1493, the first voyage.** Castile has the unlock and knows S5. Three caravels sail from Seville to the Canaries and dock for food from the province, then sail 17 uncharted zones west with 60 supply each. The preview shows enough to get there and back; they chart the Bahamas and the coast of Hispaniola, and come home.

### Colonial governors and range

Knowing S5 *Ocean navigation* lets a country hire **colonial governors**. A governor is hired like any official, in any of your ports, for **20 gold** and a wage of **5 gold a year**. He is a person: 30 when hired, a year older each January, and he can die. He needs a **slot**:

| Source | Slots |
|---|---|
| S5 Ocean navigation | 2 |
| S3 Outrigger voyaging (without S5) | 1 |
| T8 Licensed trading companies | +1 on top |
| T9 Joint-stock finance | +1 on top |

Slots are never lost. With no free slot you can't hire. A governor holding a slot doesn't count against the government's officials cap. He leaves his slot when his colony is founded (he becomes its ordinary official and the slot frees), when it fails (he dies), by old age or by dismissal. He waits in a port of yours until a ship picks him up, and any ship can carry him.

**Colonial range** is how many sea zones from your nearest port or colony a colony may be founded. It counts from your own ports (your lords' ports and canoe landings included), your subjects' ports and the colonies you have founded, but not from a colony still being founded. The range comes from your government form:

| Range | Government forms |
|---|---|
| 40 | company rule |
| 30 | merchant republic, constitutional monarchy, constitutional republic |
| 20 | feudal realm, diet monarchy, absolute monarchy, party state |
| 15 | military order, military junta, colonial government |
| 10 | household realm, bureaucratic empire, elective monarchy, city commune, soldier emirs, shogunate |
| 5 | prince-bishopric, holy rule, paramount chiefdom, tribute empire, warlord domain |
| 0 | peasant commune, clan council, chiefdom, horde, confederation |

Once a colony is founded, range is measured from it too, so colonies chain across an ocean. Range is checked only when the governor goes ashore: if your government changes and your range shrinks, colonies already being founded carry on. Portugal, a feudal realm with range 20, can found a colony on an unowned coast of Brazil about 10 zones from a Portuguese port in the Cape Verde islands.

### Founding a colony

A province can be colonised only when it is charted, coastal, owned by no country, has at least one free tile, lies inside your colonial range, and nobody else is already founding a colony there.

- Land owned by a country, tribal countries (a chiefdom or clan council in the start list) included, can't be colonised; it can only be taken by war or treaty. Hispaniola, held by a Taíno chiefdom, is one such case.
- Land that no realm on the map owns belongs to a people with no country, even where old records name a people or tribe there. A colony there takes only the free tiles, and the people's tiles stay theirs.

**Going ashore.** When a ship carrying a governor is in the province's coastal zone and you give *Found colony*, the governor goes ashore and the colony starts at **10 progress**. Its **local aggression** is rolled at once from the peoples in the province and its neighbours (a coast across one sea zone counts) and shown:

| Aggression | Chance | Average progress lost a month | Months to 100 on average | Food needed on average |
|---|---|---|---|---|
| Peaceful | 30 % | 0 | 18 | 360 rations |
| Wary | 30 % | 1 | 23 | 460 |
| Hostile | 25 % | 2 | 30 | 600 |
| Fierce | 15 % | 3 | 45 | 900 |

If nobody lives in the province or any neighbour, the colony is Peaceful.

**Each month** a colony being founded gains 5 progress from its settling party, loses the **locals' pressure** (a whole number from 0 to twice the aggression's average, each equally likely: 0–2 for Wary, 0–4 for Hostile, 0–6 for Fierce), and eats 20 rations of colony food. If it has no food left it loses a further 10 progress that month.

**Colony food** comes only from ships. Exploration ships carry colony stores apart from their supply (a caravel 300 rations, a voyaging canoe 100), loaded in any port where the ship could resupply at the same cost as resupply. *Unload stores* moves them into colony food in one day from the colony's coastal zone, with no port needed.

- **Founded**: at 100 progress the province becomes one of your own royal provinces with its settlement at *settlement*. The governor stays as its official (now counting against the officials cap), his slot frees, and left-over colony food goes into the province's store. From there the [Provinces](Provinces) rules (settlers, local tiles) take over; it becomes a Colony subject only if you later charter it under the [Subjects](Subjects) rules. The event tree's colonial presence counts it, together with the trading posts you hold, but not colonies still being founded.
- **Lost**: at 0 progress the governor dies, the colony food is lost, the slot frees and the province stays unowned. The colony is lost the same way if its governor dies of old age, or if another realm gains the province while you are founding it. A governor at sea dies if his ship sinks.
- **Abandon**: while one of your ships is in the colony's zone you can take the governor back aboard. The colony food left ashore is lost. He can go ashore on another coast at once with *Found colony*; otherwise his slot stays used until he is home in a port.

**Castile 1493, the second trip.** Castile has a colonial governor in slot 1 of 2 and a feudal range of 20. Two caravels load 600 rations of colony stores and the governor and sail to an unowned coast on a small island 17 zones from the Canaries. Castile gives *Found colony*; the Taíno across the strait make the roll Hostile, and the caravels unload all 600 rations. The colony gains about 3 progress a month. After a bad run of rolls a third caravel brings 300 more rations in year two, and the colony reaches 100 in month 31 and becomes a Castilian province. The governor stays as its official and his slot frees for the next colony.

### The computer players

A country whose catalogue personality favours expansion by sea sends exploration ships along the edge of its charted map, then founds colonies on the nearest unowned coasts, always loading the stores its rolled aggression needs on average plus a quarter: 450 rations for Peaceful, 575 for Wary, 750 for Hostile and 1,125 for Fierce. Land powers never explore. The AI uses the same commands as the player. Charted maps are stored as one bit per province and zone per country, and colonies update once a month with the province.

## How you play it

Most of exploration happens on the fleet card and the map; the Colonies tab is its overview.

- **Order a caravel** on the Port tab of a coastal province, like any ship. It sails in its own fleet of explorers and needs no admiral.
- **Explore** on the fleet card (in port) folds the card away and brings up the **voyage bar** along the bottom of the map. Tap sea zones, under the parchment or not: each tap adds a leg, the course is drawn in gold, and the bar shows the zones, how many are uncharted, the supply out and back and any shortfall. Pick *Turn back* or *Carry on*, then *Set sail*; *Undo* takes back the last leg and *Cancel* drops the course. A zone too far out for your ships' reach says why when tapped.
- As the fleet sails the **parchment lifts** from every zone and coast next to it, and a news line reports how many places the voyage charted when it ends.
- **The Colony section** of the same card (once you know Ocean navigation): *Hire a colonial governor* in a port of yours, *Load* colony stores, then at sea beside an empty coast one *Found a colony in …* button per coast, each with the reason underneath when it can't be used. Beside your colony, *Unload* puts the stores ashore.
- **A colony being founded** shows its card on the province: progress and the month's change, the locals, food and whether it will last, and *Abandon* when a ship of yours lies beside it. On the map it is a small flag over a ring that fills as it grows.
- **The Exploration map mode** (Map mode menu) shows what you have charted, empty coasts inside your colonial range in bright green, empty land beyond it in pale green and colonies being founded in gold.
- **The Colonies tab** of your country card: governors used of slots and the range, where each governor is (tap to go there), colonies being founded with their progress and food, those founded, and how many empty coasts lie in range, with a button to the Exploration map mode.

On a phone in landscape the voyage bar sits between the overview button and End turn, wraps its buttons rather than shrinking them, and every reason is written under its button since there is no hover.

**In the game today.** Until the map records regions per province and who works each tile, a realm's region for the age gate comes from the event tree's region list or the scenario catalogue's region, every unowned land province has one free tile, and a founded colony keeps the people living there, who become yours. The computer players that explore are the sea-minded realms of the catalogue (Castile, Portugal, Novgorod): each keeps one caravel exploring the edge of its charts and, once it can hire governors, settles the nearest empty coast in range with the stores it needs.

## How it connects

- [Naval](Naval): ship families, the caravel and voyaging canoe, 60 supply, colony stores, docking and sailing reach; exploration gives back the unlock and the charted map.
- [Research](Research): S3, S4, S5, T8, T9 and S1.
- [Historical-Events](Historical-Events): the Age of Exploration and its regions open the gate; founded colonies count toward `colonial_presence`.
- [Government](Government): colonial range per form, the officials cap and the governor exemption.
- [Provinces](Provinces): the founded colony as province state, free tiles and the colonial governor official type.
- [Subjects](Subjects): a founded colony is a royal province until it is chartered as a Colony subject; subjects' ports count for colonial range.
- [World-Map](World-Map): sea zones, coastal provinces and adjacency.
- [The 1378 Start](The-1378-Start): which land is owned at the start and which is unowned with peoples on it.
- [Your-Realm](Your-Realm): the country card line and the governor's gold and wage.
- [Troop-Movement](Troop-Movement): the shared planner and day loop voyages use.
- [Diplomacy](Diplomacy): war and rivalry close ports to a voyage.
- [Map and Map Modes](Map-and-Lenses): the parchment, paths, flags, range line and colony card.
- [Time-and-Turns](Time-and-Turns): the monthly colony update and the day loop.

## Numbers

One exploration config file; only `exploration.unlock_age` is named by the design, the other keys are proposed. Everything except the age is **provisional** and still being balanced.

| Key | Value |
|---|---|
| `exploration.unlock_age` | `age_of_exploration` (decided) |
| `exploration.unlock_inventions` | S4 or S3 |
| `exploration.colonial_unlock_invention` | S5 |
| `exploration.governor_slots` | S5 2, else S3 1; T8 +1; T9 +1 |
| `exploration.s3_min_range` | 10 zones |
| `exploration.range_by_form` | 40 / 30 / 20 / 15 / 10 / 5 / 0 (owned by government) |
| `exploration.start_charted_reach` | 6 steps |
| `exploration.progress_start` | 10 |
| `exploration.progress_founded` / `lost` | 100 / 0 |
| `exploration.progress_gain` | +5 a month |
| `exploration.aggression` | Peaceful 30 %, 0; Wary 30 %, 1; Hostile 25 %, 2; Fierce 15 %, 3 |
| `exploration.pressure_roll_max_factor` | 0 to 2 × average |
| `exploration.food_per_month` | 20 rations |
| `exploration.no_food_progress_loss` | 10 |
| `exploration.colony_stores` | caravel 300, voyaging canoe 100 |
| `exploration.unload_days` | 1 |
| `exploration.governor_hire_gold` / `governor_wage_per_year` | 20 gold / 5 gold a year |
| `exploration.governor_age_when_hired` | 30 |
| `exploration.ai.stores_margin` | 1.25 |

## Still open

Nothing in exploration waits on a design decision any more. There is no first contact or disease when worlds meet: voyages chart land and nothing else happens, by design. The numbers above are provisional and will move with balancing.

## For developers

- Spec: `domain/exploration/spec.md` in the game repository, requirement code **EXPL** (EXPL-001 to EXPL-075; EXPL-069 to EXPL-074 are the screens).
- Features: `domain/exploration/features/`: `unlocking-exploration.feature`, `charted-map.feature`, `voyages.feature` (São Gabriel, Castile 1493), `colonial-governors.feature`, `founding-a-colony.feature` (Castile 1493) and `exploration-ai.feature`.
- Code: the rules in `packages/engine/src/domain/exploration/`, the game in `packages/engine/src/exploration.ts` (charts, unlock) and `colonies.ts` (voyages, governors, colonies, AI, the player's view); numbers in `packages/rules/data/domain/exploration.json`. Screens in `apps/client/src/ui/explore.ts`, checked on phones by `apps/client/scripts/explore-shots.mjs`.
