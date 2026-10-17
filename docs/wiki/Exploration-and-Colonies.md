# Exploration and Colonies

Exploration is how your realm sails into the unknown and plants colonies there. Each country sees only the part of the world it has charted, with a parchment fog over the rest; exploration ships push into that fog, and once you can hire colonial governors you can carry one to an unowned coast, keep the colony fed from your ships, and watch it grow until the province becomes yours.

## How it works

### Unlocking exploration

A country gets the **exploration unlock** when it knows S4 *Carrack and caravel* (or S3 *Outrigger voyaging*) and the **Age of Exploration** has begun in its region. Once the age has begun there, the gate stays open for that country even after the age ends. The gating age is one config line, `exploration.unlock_age`, set to the event tree's `age_of_exploration`. Regions outside that age's list (central Asia and the Middle East in today's data) wait until a later age that covers them begins.

In 1444 Portugal, Castile, Genoa and Venice know S4 and have the unlock. Ming knows S1 and S2 but not S4, so it must research S4 first.

Without the unlock you can't buy exploration ships: no caravel without S4, no voyaging canoe without S3. Where an exploration ship may sail is [Naval](Naval)'s research rule: with S4 and S1 within 3 zones of a coast, with S5 the open ocean. Early voyages creep along the coasts.

**The Pacific and Malay way.** A country that knows S3 builds the **voyaging canoe** (outrigger or double-hulled) as its exploration ship: 60 supply, 100 rations of colony stores, crew 20, 5 gold, 1 timber and 1 month, built on any shore with seafolk. It can cross open ocean from the start. S3 also opens colonies with 1 colonial governor slot and a colonial range of at least 10 zones, whatever the government form.

### The charted map

Every country has its own **charted map** of the land provinces and sea zones it knows, and what it hasn't charted lies under the **parchment**.

- At the start a country has charted every province within 6 steps of its lands, plus every sea zone touching them.
- When an exploration ship enters a zone, that zone and every zone and coastal province next to it are charted.
- Any army or fleet charts what is next to where it stands.
- Charts are never lost: if Portugal charted the coast of Arguin and later loses every ship and province near it, the coast stays charted.
- Only exploration ships enter uncharted zones. Trade and military fleets plan routes only through charted zones.

### Voyages

You give a voyage to an exploration ship or a fleet of them by tapping zones one by one, uncharted ones allowed. The preview shows the zones and how many are uncharted, the supply needed out and back and any shortfall, the ports on the way (uncharted or undockable ones marked), and the **low-supply choice**:

- **Turn back** (the default): when the supply left is just enough to reach the nearest port where it may dock, the ship turns and sails there.
- **Carry on**: the ship sails the path to its end and runs out of supply if it must, losing 1 in 10 of its crew each zone.

A voyage always leaves port with full supply. Supply is naval's: 1 per zone, 60 for exploration ships, refilled by docking (food in friendly ports, gold in neutral ones, nothing in an enemy's or a rival's). Newly charted land shows its terrain, its owner if any and its ports, and nothing else.

**The São Gabriel.** The caravel São Gabriel waits in Lagos with 60 supply. The player draws a voyage of 34 zones, 21 uncharted. The preview shows supply 60 of 60, 34 out and 34 back, 8 short; it lists Arguin as a canoe landing with no dock and Elmina as uncharted, and offers Turn back and Carry on.

**Castile 1493, the first voyage.** Castile has the unlock and knows S5. Three caravels sail from Seville to the Canaries and dock for food from the province, then sail 17 uncharted zones west with 60 supply each. The preview shows enough to get there and back; they chart the Bahamas and the coast of Hispaniola, and come home.

### Colonial governors and range

Knowing S5 *Ocean navigation* lets a country hire **colonial governors**. A governor is hired like any official, for gold and a yearly wage, and is a person who ages and can die. He needs a **slot**:

| Source | Slots |
|---|---|
| S5 Ocean navigation | 2 |
| T8 Licensed trading companies | +1 |
| T9 Joint-stock finance | +1 |
| S3 Outrigger voyaging | 1 |

Slots are never lost. With no free slot you can't hire. A governor holding a slot doesn't count against the government's officials cap. He leaves his slot when his colony is founded (he becomes its ordinary official and the slot frees), when it fails (he dies), by old age or by dismissal. He waits in a port of yours until a ship picks him up, and any ship can carry him.

**Colonial range** is how many sea zones from your nearest port or colony a colony may be founded, and it comes from your government form:

| Range | Government forms |
|---|---|
| 40 | company rule |
| 30 | merchant republic, constitutional monarchy, constitutional republic |
| 20 | feudal realm, diet monarchy, absolute monarchy, party state |
| 15 | military order, military junta, colonial government |
| 10 | household realm, bureaucratic empire, elective monarchy, city commune, soldier emirs, shogunate |
| 5 | prince-bishopric, holy rule, paramount chiefdom, tribute empire, warlord domain |
| 0 | peasant commune, clan council, chiefdom, horde, confederation |

Once a colony is founded, range is measured from it too, so colonies chain across an ocean. Portugal, a feudal realm with range 20, can found a colony on an unowned coast of Brazil about 10 zones from a Portuguese port in the Cape Verde islands.

### Founding a colony

A province can be colonised only when it is charted, coastal, owned by no country, has at least one free tile, lies inside your colonial range, and nobody else is already founding a colony there.

- Land owned by a country, tribal countries (a chiefdom or clan council in the 1444 list) included, can't be colonised; it can only be taken by war or treaty. Hispaniola, held by a Taíno chiefdom, is one such case.
- Where a people with no country live, the colony takes only the free tiles, and the people's tiles stay theirs.

**Going ashore.** When a ship carrying a governor is in the province's coastal zone and you give *Found colony*, the governor goes ashore and the colony starts at **10 progress**. Its **local aggression** is rolled at once from the peoples in the province and its neighbours (a coast across one sea zone counts) and shown:

| Aggression | Chance | Average progress lost a month | Months to 100 on average | Food needed on average |
|---|---|---|---|---|
| Peaceful | 30 % | 0 | 18 | 360 rations |
| Wary | 30 % | 1 | 23 | 460 |
| Hostile | 25 % | 2 | 30 | 600 |
| Fierce | 15 % | 3 | 45 | 900 |

If nobody lives in the province or any neighbour, the colony is Peaceful.

**Each month** a colony being founded gains 5 progress from its settling party, loses the **locals' pressure** (a roll from 0 to twice the aggression's average), and eats 20 rations of colony food. If it has no food left it loses a further 10 progress that month.

**Colony food** comes only from ships. Exploration ships carry colony stores apart from their supply (a caravel 300 rations, a voyaging canoe 100), loaded in any port where the ship could resupply at the same cost as resupply. *Unload stores* moves them into colony food in one day from the colony's coastal zone, with no port needed.

- **Founded**: at 100 progress the province becomes yours with its settlement at *settlement*. The governor stays as its official (now counting against the officials cap), his slot frees, and left-over colony food goes into the province's store. From there the [Provinces](Provinces) rules (settlers, local tiles) and [Subjects](Subjects) (growing into a Colony subject at *Outpost*) take over, and the event tree's `colonial_presence` counts it.
- **Lost**: at 0 progress the governor dies, the colony food is lost, the slot frees and the province stays unowned.
- **Abandon**: while one of your ships is in the colony's zone you can take the governor back aboard. His slot stays used until he is home in a port.

**Castile 1493, the second trip.** Castile has a colonial governor in slot 1 of 2 and a feudal range of 20. Two caravels load 600 rations of colony stores and the governor and sail to an unowned coast on a small island 17 zones from the Canaries. Castile gives *Found colony*; the Taíno across the strait make the roll Hostile, and the caravels unload all 600 rations. The colony gains about 3 progress a month. After a bad run of rolls a third caravel brings 300 more rations in year two, and the colony reaches 100 in month 31 and becomes a Castilian province. The governor stays as its official and his slot frees for the next colony.

### The computer players

A country whose catalogue personality favours expansion by sea sends exploration ships along the edge of its charted map, then founds colonies on the nearest unowned coasts, always loading enough stores for the aggression it rolled plus a margin. Land powers never explore. The AI uses the same commands as the player. Charted maps are stored as one bit per province and zone per country, and colonies update once a month with the province.

## What you see

- **World zoom**: the parchment over what you haven't charted, voyage paths as dotted lines, and colonies being founded as a small flag with a progress ring.
- **Region zoom**: your colonial range as a faint line on the sea, and colonisable provinces marked with a pale flag.
- **The voyage preview**: zones and uncharted count, supply out and back with any shortfall, ports on the way, and Turn back or Carry on.
- **The colony card** (province zoom): governor, progress and average monthly change, the locals and their monthly range, food and months left with a shortfall warning, and *Abandon*.
- **The country card**: "Colonial governors n of m · range r zones".

## How it connects

- [Naval](Naval): ship families, the caravel and voyaging canoe, 60 supply, colony stores, docking and sailing reach; exploration gives back the unlock and the charted map.
- [Research](Research): S3, S4, S5, T8, T9 and S1.
- [Historical-Events](Historical-Events): the Age of Exploration and its regions open the gate; founded colonies count toward `colonial_presence`.
- [Government](Government): colonial range per form, the officials cap and the governor exemption.
- [Provinces](Provinces): the founded colony as province state, free tiles and the colonial governor official type.
- [Subjects](Subjects): a founded colony enters at Outpost and the Colony subject charter.
- [World-Map](World-Map): sea zones, coastal provinces and adjacency.
- [The-1444-Start](The-1444-Start): which land is owned in 1444 and which is unowned with peoples on it.
- [Your-Realm](Your-Realm): the country card line and the governor's gold and wage.
- [Troop-Movement](Troop-Movement): the shared planner and day loop voyages use.
- [Diplomacy](Diplomacy): war and rivalry close ports to a voyage.
- [Map-and-Lenses](Map-and-Lenses): the parchment, paths, flags, range line and colony card.
- [Time-and-Turns](Time-and-Turns): the monthly colony update and the day loop.

## Numbers

One exploration config file; only `exploration.unlock_age` is named by the design, the other keys are proposed. Everything except the age is a **placeholder**.

| Key | Value |
|---|---|
| `exploration.unlock_age` | `age_of_exploration` (decided) |
| `exploration.unlock_inventions` | S4 or S3 |
| `exploration.colonial_unlock_invention` | S5 |
| `exploration.governor_slots` | S5 2; T8 +1; T9 +1; S3 1 |
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

## Still open

- **OQ-EXPL-1**: first contact and disease when worlds meet are left out on purpose for now.
- **OQ-EXPL-2**: colonising stateless peoples' land is decided, but which catalogue records count as countries owning land is not.
- **OQ-EXPL-3**: which later ages open the gate for the Middle East, central Asia and North America.
- **OQ-EXPL-4**: whether the age gate applies to S3 realms, and how S3 and S5 slots combine.
- **OQ-EXPL-5**: what counts as "nearest port or colony" for range (colonies being founded, subjects' ports, canoe landings).
- **OQ-EXPL-6**: a colonial governor's hire cost, wage and hiring port.
- **OQ-EXPL-7**: whether a new colony is a royal province or a Colony subject at Outpost.
- **OQ-EXPL-8**: what `colonial_presence` counts.
- **OQ-EXPL-9**: whether a colony continues if the government form or range changes.
- **OQ-EXPL-10**: what happens if the governor dies of age ashore, or his ship sinks.
- **OQ-EXPL-11**: what happens when another country attacks or takes a colony being founded.
- **OQ-EXPL-12**: what happens to colony food on abandoning, and where the governor can land.
- **OQ-EXPL-13**: the AI's margin of stores.

## For developers

- Spec: `domain/exploration/spec.md` in the game repository, requirement code **EXPL** (EXPL-001 to EXPL-057).
- Features: `domain/exploration/features/`: `unlocking-exploration.feature`, `charted-map.feature`, `voyages.feature` (São Gabriel, Castile 1493), `colonial-governors.feature`, `founding-a-colony.feature` (Castile 1493) and `exploration-ai.feature`.
- Code: there is no `packages/engine/src/domain/exploration/` yet. Today's parchment is in `apps/client/src/main.ts` (provinces within a reach of steps of the player's lands and armies, with a toggle).
