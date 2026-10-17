# Troop movement (MOVE)

## 1. Purpose and scope

Troop movement decides where every army (and, through the shared **mover** rules, every fleet, trade ship and
trader) stands on each day of the turn: how a weekly turn (X-18) is played out day by day, how many days one step
takes and why, what stops a march, whose land an army may enter, how armies meet, withdraw, retreat, intercept
and chase, what the route preview shows about food, how many armies are moved together, the march orders and
route settings, the touch controls for giving a march, and the replay of the turn.

**In scope**
- The day loop of a turn (move, stop checks, contact, standing orders) and where an army stands while it walks.
- Step days: crossing, days per crossing, road, season, march order, guns, column, horse share, Cunning, river days.
- Rivers, bridges, fords, floods, passes, snow closures, wet seasons, impassable ground, dunes, strait ferries.
- Stop checks in order; castles always block; whose land may be entered.
- Contact and withdrawing, broken armies' retreat, interception, chasing, allies and neutrals sharing forage.
- Food shown on the route (colours, point of no return, Refill and go).
- Splitting, joining, march together, rally points, "new regiments go to", fronts.
- March orders and route settings; touch controls; route preview; several armies in one province; zoom levels;
  watching the turn; notices; accessibility of route controls.
- The mover interface shared with naval and trade (one graph, one clock, one planner), boarding and landing.

**Not in scope (owned by …)**
- Battles, standing orders' battle meaning, sieges, the food reserve, hunger, sickness, plunder, raids' burning and
  loot, scouting and rumours, commander stats: **warfare**.
- Ground types, days to cross per ground, forage, shore tiles, bridges and roads as buildings: **province** and
  **world-map**.
- Fleets' step days per zone, may-sail rules, winds, ship room: **naval**.
- Traders' step days, may-enter and stops-at rules: **trade**.
- Whether passage is granted, its cost and duration: **diplomacy**.
- Subjects' terms for feeding an overlord's army: **subjects**.
- The global order of a turn, the date and calendar: **time-and-turns**.
- Floods as events: **events**.
- Raising levies and training regiments: **recruiting**.
- Map rendering in general and zoom levels: **map-presentation** (this context states only what marching shows).

## 2. Sources

Newest decision first.
0. `domain/DECISIONS.md` (17 Oct 2026): X-1 (battles fought over time; while a player battle runs the day is six
   4-hour steps), X-2 (turn order; movers in kind and id order each day; sieges monthly), X-3 (real month lengths;
   weekly steps once a turn), X-18 (a turn is 7 days), X-4 (seasons), X-17 (frozen rivers); and section 13 below.
1. `troop-movement/troop-movement-design.md` version 1, all sections 1–15. §15 "Decided by Leroy": 6 days per
   crossing; river and strait crossing days scale with army size; guns slow an army by one ×1.25 for the whole
   army; terrain proposals for snow passes, dunes, glacier and wet-season paddies adopted; castles always block.
2. `planning/gap-lists.md` v2 (16 Oct 2026): one-month turns (A3, decided; since replaced by one-week turns, X-18); "whether a battle pauses the turn" still
   being settled; "the planning thread: march pace (6 days per crossing unit)" listed as still open; multiplayer-
   friendly orders as data (A4).
3. `warfare/warfare-design.md` v5: 5.1–5.5, 6.1–6.3, 7.1, 7.14, 9.2, 11.3 (5.5 already adopts "castles always block").
4. `naval/naval-design.md` 7.1, 7.4 and `trade/trade-design.md` (movers, adopted); `diplomacy/diplomacy-design.md` 6.4
   (passage).
5. Engine code (compared below): `packages/engine/src/march.ts`, `packages/engine/src/turn.ts` (`processTurn`,
   `applyOrder`, `runMarches`), `packages/engine/src/world.ts` (`marchMap`), `packages/rules/data/defines.json` (`march`).

### Code and design: where they agree and differ

| Topic | Code today | Design | Agree? |
|---|---|---|---|
| Days in a month | the month's real length, 28 to 31 (X-3) | the real length | Done (X-3) |
| Days per crossing | `march.daysPerCrossing` 6 | 6, decided by Leroy | Agree (D-MOVE-1) |
| Crossing | half leaving + half entering ground, `march.daysToCross` (farmland 1, hills 1.5, forest 2, mountains/jungle/marsh 3 …) | same | Agree |
| Column | `+bigArmyExtraCrossings` (1 crossing) when men > forage limit of the entered province | +1 crossing | Agree (D-MOVE-2) |
| Horse share | ÷(1 + 0.5 × min(1, horse/men)), `horseSpeedBonus` 0.5 | 1 + 0.5 × horses ÷ men | Agree (design implies the cap at horse-only) |
| River | flat `riverCrossingDays` 1 when entering a river province | +1 day per 10,000 men or part, ×2 great river, 0 with bridge | Differ; the design wins (D-MOVE-3) |
| Road, season, march order, guns, Cunning | absent | factors in 3.1 | Differ; the design wins (D-MOVE-3) |
| Month played out | each army walks its whole month in turn (`runMarches`) | day loop, all armies at once | Differ; the day loop wins (D-MOVE-4) |
| Progress carries over | `progress` kept across months; reset to 0 on a new order and when the route ends | carries over across months (2.3) | Kept only when the new order's next step is the same (D-MOVE-5) |
| One order per army per turn | `applyOrder` rejects "army already moved this turn" | silent; orders are changed freely in the preview | Dropped: the last order of the orders phase stands (D-MOVE-5) |
| Halt | a move to its own province clears the route | Halt keeps the rest of the route greyed | An order to its own province is a Halt (D-MOVE-5) |
| May enter | any land province; water rejected ("armies need ships to cross water"); no route → "no road there over land" | land ownership rule 5.3, castles end routes, closed passes | Differ; the design wins (D-MOVE-3) |
| Food | eats a month of rations up front, refills from forage where it stops, capped at `monthsCarried` (2) × need, whoever owns the land; hunger loss `hungerLossPerMonth` 0.28 | refills from own provinces passed through (warfare 6.2); abroad from reserve then plunder | Differ; the design wins, at the weekly food step (D-MOVE-6) |
| Rations | `rationsPerSoldier` 2, `rationsPerHorse` 3, `logisticsRationCut` 0.05 | warfare 6.1 same; Logistics −5 % a point | Agree |
| Planner | single Dijkstra (`planRoute`) on precomputed per-province costs | single Dijkstra per order, gains may-enter and closed passes | Agree on shape |
| Commander | `MarchingArmy` carries logistics only | needs Cunning for speed | Differ |
| Snapshot | `marched` path only | route settings, day entered per province, list of stops and battles with day | Differ (not built) |

## 3. Ubiquitous language

| Term | Meaning | Not to be confused with |
|---|---|---|
| Mover | Anything that moves on the map by the shared rules: army, fleet, trade ship, trader | Cargo (an army aboard ships) |
| Place | A land province or a sea zone; a mover is always in exactly one | — |
| Step | A move from one place into a neighbouring one | Route (many steps) |
| Step days | Days a step takes, kept with its fraction | Days to cross (a ground value) |
| Crossing | Half the leaving ground's days to cross plus half the entering ground's | — |
| Days per crossing | Real days per crossing unit: 6 | — |
| Progress | Days walked toward the next place, carried into the next turn | — |
| Day loop | The 7 passes of a turn, one a day: move, stop checks, contact, standing orders | Weekly turn |
| Destination / route / waypoint | Where an army goes / the places it will go through / a chosen place it must pass | — |
| March order (pace) | Normal · Forced · Careful (Raid for horse-only) | Standing order |
| On the way | Route setting: keep marching · halt when the enemy is seen · attack what we see | — |
| Standing orders | Warfare's retreat if outnumbered, attack or wait | Route settings |
| Column | The extra crossing when an army is bigger than the forage limit of the province it enters | — |
| Forage limit | Soldiers a province can feed for a month (warfare 6.3), shared by all armies there | — |
| Great river | A river of Natural Earth scale rank 0 or 1, costing twice the river days (D-MOVE-10) | — |
| Bridge | A shore-tile building that removes river days | — |
| Ford | A named crossing in config that counts as a bridge in summer and autumn of its hemisphere | — |
| Pass | A mountain province with a historic road, in config; counts as a road | — |
| Strait crossing | A config pair of land neighbours across a narrow strait | — |
| Ferry | A harbour on either side of a strait owned by you, an ally or someone who grants passage | — |
| Passage | Permission to enter a realm's land (diplomacy) | — |
| Broken army | The side that broke in battle, during its retreat | — |
| Refuge | Nearest own-side province with a castle, or any own-side province with no enemy | — |
| Trapped | No refuge within 3 provinces (retreat), or every enterable neighbour holds an enemy army or castle (withdraw) | — |
| Point of no return | The last province on a route abroad from which the army can still get home before its reserve runs out | — |
| Turn mark | A bar on the route where the army will stand at the end of this and each later turn | — |
| Order pill | The small bar at the route's end with March, pace, on the way and cancel | — |
| Rally point | A province armies march to and join on arrival | — |
| Front | A drawn line of provinces held by assigned armies (W14) | — |
| Cargo | An army aboard ships; moves with its fleet and is not a mover | — |

## 4. Domain model

### Aggregates

**Mover / Army movement** (identity: army id; the army itself belongs to warfare)
- Holds: place, route (places still to go through), waypoints, progress (days toward the next place, fractional),
  pace, on-the-way setting, standing orders (read from warfare), a greyed remainder (route kept after a stop),
  follow target, whether broken (and its refuge), whether cargo, the days it entered each province this month.
- INV-MOVE-1: A mover is always in exactly one place, never between two.
- INV-MOVE-2: While walking a step, an army stands in the place it is leaving until the day it arrives.
- INV-MOVE-3: An army's place is never a sea zone unless it is cargo aboard ships.
- INV-MOVE-4: A route never passes *through* a province with a hostile garrisoned castle; such a province can only be its end.
- INV-MOVE-5: A route never passes through land the army may not enter (5.3) or a closed snow pass.
- INV-MOVE-6: Progress is never negative and never reaches the current step's days without the army arriving.

**TurnOfMarching** (identity: turn number; one per turn, a domain process)
- Holds: day (1–7), province → armies standing there, the turn's stops and battles with their day.
- INV-MOVE-7: Each day runs move, stop checks, contact, standing orders in that order.
- INV-MOVE-8: Armies in a battle don't move while it lasts (1–3 days).

### Entities and value objects
- **StepDaysRule**: per mover kind; armies use 3.1.
- **MayEnterRule**: per mover kind; armies use 5.3.
- **StopsAtRule**: per mover kind; armies use section 5.
- **RouteSettings**: pace, on the way.
- **RoutePreview**: path, arrive day per place, turn marks, reserve on arrival per place and its colour,
  point of no return, step icons, end status ("stops at Langres until the castle falls", "needs ships",
  "needs passage from Savoy").
- **Notice**: kind (stopped short + reason, battle fought, route turned red, enemy seen entering your land), army.
- **Config lists**: passes, fords, strait crossings, wet-season months by climate.

### Domain services
- **RoutePlanner** (`planRoute`): fastest route by step days with a mover's may-enter rule; ends at hostile castles;
  avoids closed passes in their season; single Dijkstra per order.
- **StepDaysCalculator** (`stepDays`): the 3.1 formula.
- **DayLoop**: runs the turn's 7 days for all movers at once.
- **RetreatPlanner**: finds a refuge within 3 provinces for a broken army.

## 5. Requirements

### Time: the day loop
- MOVE-001 The movement system shall play out each turn as 7 days (`turnDays`, X-18), the calendar running through months of their real length, 28 to 31 days, with Gregorian leap years (time-and-turns `daysInMonth`, X-3); the monthly steps run at the end of the turn in which a new month begins. [movement §2.1; X-3, X-18]
- MOVE-002 On each day, the movement system shall run, in order: move, stop checks, contact, standing orders. [movement §2.1]
- MOVE-003 On each day, the movement system shall add one day to the step of every marching army, and move an army that has walked enough days into the next province. [movement §2.1] *Replaced in part by MOVE-123 (playtest feedback).*
- MOVE-004 When an army arrives in a province, the movement system shall run the stop checks of section 5. [movement §2.1, §5]
- MOVE-005 When hostile armies stand in the same province at the end of a day (or of a 4-hour step, MOVE-118), the movement system shall start the battle rules (warfare 7.1) then, letting a side withdraw first if allowed (MOVE-055 to MOVE-057); the battle runs over time (MOVE-118). [movement §2.1, §6.1; X-1] *Replaced in part by MOVE-126 (playtest feedback).*
- MOVE-006 While a battle runs, the movement system shall not move the armies in it. [movement §2.1; X-1]
- MOVE-007 The movement system shall run army food, hunger, plunder and raids as the weekly steps once at the end of every turn (every 7th day of the loop), and sieges, sickness and pay once in the turn in which a new month begins. [movement §2.1, §7; X-2, X-3, X-18; D-MOVE-6]
- MOVE-008 While an army walks a step, the movement system shall keep it in the province it is leaving, where it eats, is seen and can be attacked, until the day it arrives. [movement §2.2] *Replaced in part by MOVE-120, MOVE-123 (playtest feedback).*
- MOVE-009 When two hostile armies walk the same border in opposite directions and meet, the movement system shall fight the battle in the province of the army with more days still to walk. [movement §2.2]
- MOVE-010 The movement system shall carry days walked toward the next province into the next turn. [movement §2.1, §2.3; X-18]

### Step days
- MOVE-011 The movement system shall compute step days as crossing × days per crossing × road × season × march order × guns × column ÷ horse share bonus ÷ Cunning factor + river days. [movement §3.1]
- MOVE-012 The movement system shall take crossing as half the leaving ground's days to cross plus half the entering ground's (province 3.1). [movement §3.1] *Replaced in part by MOVE-120 (playtest feedback).*
- MOVE-013 The movement system shall use 6 days per crossing unit (`daysPerCrossing`). [movement §3.1, §15]
- MOVE-014 The movement system shall apply the road factor of the worse road of the two provinces: track 1, road 0.75, paved road 0.5, turnpike 0.4, railway 0.1. [movement §3.1; warfare 5.2]
- MOVE-015 While it is winter (December–February north, June–August south), the movement system shall double step days in tundra, mountains and forest. [movement §3.1, §4.3]
- MOVE-016 While it is the wet season of its climate, the movement system shall multiply step days by 1.25 in paddies, marsh and jungle. [movement §3.1, §4.3]
- MOVE-017 The movement system shall apply the march order factor: Normal 1, Forced 0.67, Careful 1.33, Raid 0.67 (horse-only armies). [movement §3.1; warfare 5.1]
- MOVE-018 Where an army has any guns other than light field guns, the movement system shall multiply step days by 1.25 once for the army into hills, mountains, forest, jungle and marsh. [movement §3.1, §15]
- MOVE-019 If an army has bombards and the mountain province it would enter has no road, then the movement system shall not let it enter. [movement §3.1, §3.2]
- MOVE-020 When an army is bigger than the forage limit of the province it enters, the movement system shall add 1 crossing to the step. [movement §3.1; warfare 5.3]
- MOVE-021 The movement system shall divide step days by 1 + 0.5 × (horses ÷ men), so a horse-only army goes 1.5 times as fast as foot. [movement §3.1]
- MOVE-022 The movement system shall divide step days by 1 + 0.05 per point of the commander's Cunning. [movement §3.1; warfare 4.2]
- MOVE-023 The movement system shall keep the fraction of step days and round to whole days only for display. [movement §3.1]

### Rivers, passes, seasons and ground
- MOVE-024 When an army enters a river province with no bridge, the movement system shall add 1 day per 10,000 men or part of it, 2 per 10,000 or part for a great river (Natural Earth scale rank 0 or 1). [movement §3.1, §4.1, §15; D-MOVE-10]
- MOVE-025 Where the entered province has a bridge, the movement system shall add no river days for any army size. [movement §4.1]
- MOVE-026 While an enemy army holds a bridge province, the movement system shall charge you the river days there (the bridge is useless to you). [movement §4.1]
- MOVE-027 Where a named ford in config lies on the step, the movement system shall count it as a bridge in summer and autumn of the province's hemisphere (June–November in the north, December–May in the south). [movement §4.1; X-4; D-MOVE-10]
- MOVE-028 When a flood (an event) starts on a province, the movement system shall double its river days for 3 months from that month. [movement §4.1; D-MOVE-10]
- MOVE-029 Where a mountain province is marked a pass in config, the movement system shall count it as having a road (×0.75) even before roads are built. [movement §4.2]
- MOVE-030 While it is December to March (June to September in the south), the movement system shall close snow-peak provinces with no pass and no road, and the planner shall route round them. [movement §4.2, §5]
- MOVE-031 The movement system shall read seasons by hemisphere, and wet seasons by climate from config (monsoon Asia June–September, Sahel and savanna July–September, Amazon December–May). [movement §4.3]
- MOVE-032 The movement system shall let an army enter sea and ocean zones only aboard ships. [movement §4.4, §11.3]
- MOVE-033 The movement system shall make a province whose main tile type is glacier impassable. [movement §4.4; D-MOVE-11]
- MOVE-034 Where an army crosses a province whose main tile type is dunes, the movement system shall count that province's days to cross as 3 instead of desert's 2, allow no foraging there, and let guns in only with camels. [movement §4.4; D-MOVE-11] *Replaced in part by MOVE-120 (playtest feedback).*
- MOVE-035 Where two land provinces are a strait crossing in config with a ferry (a harbour on at least one side owned by the army's realm, an ally or a realm granting passage), the movement system shall let an army cross without its own ships in 2 days per 10,000 men or part of it. [movement §4.4; D-MOVE-20]
- MOVE-036 While an enemy fleet is in a strait, the movement system shall close its strait crossing. [movement §4.4]

### Splitting and joining
- MOVE-037 When an army is split in two, the movement system shall take 2 days before W14 Army divisions and no days after, giving each half its share of food, wagons and companies. [movement §3.3]
- MOVE-038 When an army is split, the commander shall stay with the half the player picks; the other half needs a captain or new commander, or is led by its senior company captain with Cunning 0. [movement §3.3] *Replaced in part by WAR-209 (playtest feedback).*
- MOVE-039 When two armies in the same province join, the movement system shall take 1 day, add up food and wagons, and let the commander with more victories lead, the other becoming a captain if there is room. [movement §3.3; warfare 4.5]

### What stops an army
- MOVE-040 When an army arrives in a province, the movement system shall run, in order: enemy army here, enemy garrisoned castle here, border closed, snow pass closed, halt when the enemy is seen, food runs out. [movement §5]
- MOVE-041 When a check stops a march, the movement system shall keep the rest of the route, greyed, so one order resumes it. [movement §5, §9.1]
- MOVE-042 The movement system shall let an enemy army stop another army only in the province it stands in. [movement §5.1]
- MOVE-043 When an army enters a province with an enemy garrisoned castle, the movement system shall stop it there, and no army shall march on past until the castle is taken (stormed, surrendered or bribed). [movement §5.2; warfare 5.5]
- MOVE-044 While an army stands in a province with a hostile garrisoned castle, the movement system shall let it only stay (besiege or wait), go back the way it came or into any neighbouring province it came from or its own side holds, or march on once the castle has fallen. [movement §5.2]
- MOVE-045 If a castle has no garrison, then it shall not block. [movement §5.2]
- MOVE-046 The movement system shall make an ally's garrisoned castles block that ally's enemies the same way. [movement §5.2]
- MOVE-047 The route planner shall treat every province with a hostile garrisoned castle as the end of a route, routing to it and never through it, and show "stops at <province> until the castle falls". [movement §5.2]
- MOVE-048 The movement system shall let an army enter its own land, its subjects', an enemy's at war with it, rebel-held provinces, an ally's or a realm granting passage, and land nobody owns; and no other realm's land, by any order. [movement §5.3; D-MOVE-7]
- MOVE-049 If passage is withdrawn while an army marches, then the army shall stop at the border, the passage ending the day it is withdrawn. [movement §5.3, §5]
- MOVE-050 If the planner can't reach a destination without entering a realm that grants no passage, then it shall route round or say "needs passage from <realm>". [movement §5.3]
- MOVE-051 If a snow pass closes while an army is in it, then the army shall stop and winter there, hungry. [movement §5]
- MOVE-052 Where an army is set to halt when the enemy is seen, the movement system shall stop it in the province before the one where an enemy is seen on its route. [movement §5, §2.1]
- MOVE-053 If an army's food runs out on its route, then the movement system shall not stop it but turn the route red from that step and give one notice. [movement §5, §7]
- MOVE-054 The movement system shall record for each land type what the army eats from: own land the locals, refilling; subjects' the reserve unless the subject's terms feed it; enemy, rebel-held and nobody's land the reserve then plunder; ally's or passage land the reserve. [movement §5.3; warfare 6.2]

### Meeting the enemy
- MOVE-055 Before a battle starts, the movement system shall have each side check its standing order "retreat if outnumbered" against what it sees, a rumour counting at its shown size; only a side outnumbered past its ratio wants to withdraw. [movement §6.1; D-MOVE-13]
- MOVE-056 When a side wants to withdraw, it shall step back to the province it came from, or, if it was standing still, to the neighbouring friendly province with the fewest enemies. [movement §6.1]
- MOVE-057 A withdrawing side shall get away only if its commander's Cunning is higher than the enemy's and it isn't trapped (every neighbour it may enter, the province it came from included, holds an enemy army or garrisoned castle); otherwise it shall fight. [movement §6.1; D-MOVE-13]
- MOVE-058 When a side breaks in battle, the movement system shall drop half its wagons, and its guns if the winner held the field with horse. [movement §6.2]
- MOVE-059 When a side breaks, the movement system shall march it on forced march by the fastest route to the nearest refuge up to 3 steps away (`retreatMaxProvinces`), never through a province with a hostile garrisoned castle. [movement §6.2; D-MOVE-18]
- MOVE-060 While an army is broken, it shall take no orders, not besiege, and not stop for castles of its own side. [movement §6.2]
- MOVE-061 If an enemy army meets a broken army, then they shall fight at once, the broken army can't withdraw and breaks again at the first lost sector. [movement §6.2]
- MOVE-062 If there is no refuge within 3 provinces, then the broken army shall surrender: its men become the winner's prisoners and its commander is captured unless he has Cunning 4 or more, in which case he gets away alone to the capital. [movement §6.2]
- MOVE-063 When a broken army reaches its refuge, it shall be an ordinary army again and fled men who come back join it. [movement §6.2]
- MOVE-064 Once a day, an army with standing order "attack" shall look at seen enemy armies in neighbouring provinces (never one known only as a rumour) and turn to march on one if it is not on a player route (or Attack on the way is set), its men are at least the enemy's (or what its AI personality's retreat ratio allows), and its step there takes fewer days than the enemy has left on its own step. [movement §6.3; D-MOVE-17]
- MOVE-065 An army on "wait" shall never intercept. [movement §6.3]
- MOVE-066 While an army follows an enemy army, the movement system shall re-plan its route each day to where the enemy was last seen; if the enemy disappears from sight, the follower walks to where it was last seen and stops there with a notice. [movement §6.4]
- MOVE-067 Allied and neutral armies in the same province shall not fight or block, and shall share the province's forage limit by men. [movement §6.5]

### Food on the road
- MOVE-068 The route preview shall show the reserve on arrival at each province, counting meals abroad, refills at home and the forage limit met, coloured green while it covers the march, yellow under half, red where empty. [movement §7]
- MOVE-069 On a route that leaves the realm's land, the route preview shall flag the point of no return. [movement §7]
- MOVE-070 Where Refill and go is chosen, the movement system shall add a stop at the realm's castle with most food above its siege reserve, or the richest of its provinces on the route, and wait a day per 10 % of the reserve refilled. [movement §7]
- MOVE-071 When an army marches through its own provinces, the movement system shall refill its reserve from them as the warfare design says (castle store first, then the locals) at each weekly food step it stands in its own land, without stopping it (MOVE-112). [movement §13; warfare 6.2; D-MOVE-6]

### Moving many armies
- MOVE-072 When several armies get one destination with March together, the movement system shall give each its own route and, with arrive together on (default on), start the faster ones later so all arrive the same day, showing that day. [movement §8]
- MOVE-073 When armies are sent to a rally point, each shall march there and join on arrival, in the order they come. [movement §8]
- MOVE-074 Where the realm has set "New regiments go to" a province (or one per front), newly raised levies (once gathered, recruiting RECR-103) and trained regiments shall march there on their own when ready, with no order needed, and join the army standing there. [movement §8; D-MOVE-16] *Replaced in part by RECR-107 (playtest feedback).*
- MOVE-075 Where the realm has W14 Army divisions, the movement system shall let the player draw a front and give it armies, which spread along it (the provinces cut into even stretches in the order drawn, each army marching to the middle of its own), intercept only within their stretch and retreat to a refuge on the front when one is in range. [movement §8]

### Orders
- MOVE-076 The movement system shall offer every army March to, March by (waypoints), Halt, Return home, Follow / Join. [movement §9.1]
- MOVE-077 March to shall take the fastest route to a province the army may enter. [movement §9.1]
- MOVE-078 Halt shall stop the army where it stands, keeping the rest of the route greyed. [movement §9.1]
- MOVE-079 Return home shall take the fastest route to the nearest own province with a castle. [movement §9.1]
- MOVE-080 Follow / Join on a friendly army shall follow it and join when they meet; on an enemy army it follows as MOVE-066. [movement §9.1]
- MOVE-081 Raid shall be offered only to horse-only armies, marching at raid speed and spending a week in each province (warfare 9.2), as MOVE-114 says. [movement §9.1; D-MOVE-12]
- MOVE-082 Besiege shall be offered to any army in a province with an enemy castle; the army can't march on until the castle falls. [movement §9.1]
- MOVE-083 Board ships / Land shall be offered to armies in a port with ships, or at sea. [movement §9.1, §11.3]
- MOVE-084 The movement system shall remember per army two route settings, Pace (Normal · Forced · Careful) and On the way (keep marching · halt when the enemy is seen · attack what we see); "halt when the enemy is seen" is an On the way choice. [movement §9.2; D-MOVE-14]
- MOVE-085 The movement system shall add no standing orders beyond the warfare ones; the AI shall use the same orders, its standing orders set by its personality (warfare WAR-194). [movement §9.3]
- MOVE-086 The movement system shall accept every order as data, the same for player and AI. [gap-lists A4]

### Touch controls and route preview (presentation)
- MOVE-087 When the player taps an army, it shall be selected, its card slides up halfway, and provinces it could reach this turn are lightly shaded, those next turn lighter still. [movement §10.1]
- MOVE-088 When the player drags from the selected army's banner, the route shall be drawn live with a label of days and food on arrival, set on lift, and cancelled by dragging back onto the army. [movement §10.1]
- MOVE-089 When the player taps a province while an army is selected, the same route shall be drawn, waiting for confirmation on the order pill. [movement §10.1, §10.2]
- MOVE-090 When the player drags the middle of a set route, a waypoint shall be added through the province under the finger; dragging a waypoint off removes it. [movement §10.1]
- MOVE-091 Tapping the route's end shall open the order pill; a two-finger tap shall deselect. [movement §10.1]
- MOVE-092 A drag shall draw a route only when it starts on the selected army's banner; otherwise it pans the map. [movement §10.1]
- MOVE-093 The order pill shall be at least 44 points high and hold March with days, pace, on the way and cancel; tapping March confirms a tapped route; a dragged route is confirmed on lift; changing a setting redraws the route and its days at once. [movement §10.2]
- MOVE-094 The route preview shall show a dashed line, turn marks (every 7 days) for this and each later turn, day counts at each province and the total, food colour and the point-of-no-return flag, icons for river, snow pass, stopping castle, border needing passage and enemy army seen (with shown size), and other selected armies' routes thinner in the same colour. [movement §10.3, §4.3]
- MOVE-095 When armies stand together, one banner shall show total men and the count of armies; tapping it opens a picker (name, men, food, commander) with Select all here and, at region zoom, Select all in sight. [movement §10.4]
- MOVE-096 At world zoom marching shall show arrows thick by men coloured by owner with no day counts, and long routes in months; at region zoom the full preview; at local zoom marching columns as sprites in proportion to the army. [movement §10.5]
- MOVE-097 When the turn ends, the turn's 7 days shall play back as the day loop runs, at about one second per 10 days (`replaySecondsPer10Days`) with a skip button, battles between AI realms flashing and pausing half a second without slowing it, the player's battles slowing it to 4-hour steps (MOVE-113), and stopping castles ringing red; any battle can be replayed from its notice. [movement §10.6; X-1; D-MOVE-8]
- MOVE-098 After the turn, the movement system shall give a notice only for: an army stopped short (with the reason: enemy, castle, border, snow), a battle fought (with its one-line reason), an army whose route turned red, an enemy army first seen marching into the realm's land; nothing for an army that walked where it was told. [movement §10.6]
- MOVE-099 Every gesture shall have a tap-only version (tap army, tap province, tap March; Go by… for waypoints); food colours shall also carry a pattern (solid, dashed, dotted); day counts stay at least 10 points tall at region zoom and hide rather than shrink. [movement §10.7]

### One way of moving
- MOVE-100 The movement system shall give every mover a place, a route, progress, a step-days rule, a may-enter rule and a stops-at rule. [movement §11.1]
- MOVE-101 The movement system shall keep land provinces and sea zones as one graph (`adjStart`/`adjList`), each mover's may-enter rule choosing its part. [movement §11.2]
- MOVE-102 The movement system shall step all movers in the same day loop. [movement §11.2]
- MOVE-103 The route planner shall serve every mover kind through its step-days and may-enter rules. [movement §11.2]
- MOVE-104 The movement system shall let a port province with a harbour on a shore tile neighbour its sea zone, crossed only by movers allowed to. [movement §11.2]
- MOVE-105 When an army in a port province has enough of its own or an ally's ships there, it shall board at a day per 5,000 men and become cargo, moving with the fleet. [movement §11.3]
- MOVE-106 When a fleet in a sea zone lands its army on a neighbouring coast, the army shall land at a day per 5,000 men, twice as long with no port, and be a mover again in that province, section 5 applying. [movement §11.3]
- MOVE-107 When the player routes an army onto water, the planner shall ask the naval design for a combined route (march, board, sail, land, march) if the player has ships to carry it, otherwise stop at the coast with "needs ships". [movement §11.3]
- MOVE-108 While an army is aboard, it shall eat from its reserve, as abroad. [movement §11.3]
- MOVE-109 The movement system shall let a trader's stops-at rule react to an enemy army in a province, and let armies on Raid attack traders in provinces they pass through, the amounts set by trade. [movement §11.4]
- MOVE-110 Trader step days shall use the same roads, rivers and passes as armies. [movement §11.4]

### Decided rules (17 October 2026)
- MOVE-111 On each day, the movement system shall step the movers in kind order (armies, then fleets, then traders by land and by sea), each kind in ascending id. [X-2]
- MOVE-112 At each weekly food step (the end of every turn, X-18), an army standing in its own land shall refill its reserve there without stopping; elsewhere it eats its reserve, then plunders. [X-3; warfare 6.2; D-MOVE-6]
- MOVE-113 While a battle the player's army or fleet is in runs, the playback shall show each 4-hour step, where the player may change standing orders, order a retreat or switch between running battles; there is no Skip to result, and battles between AI realms never slow it. [movement §10.6; X-1; D-MOVE-8]
- MOVE-114 When a raiding army enters a province on its route, it shall stand there 7 days (`raidDaysPerProvince`) and then ride on at raid pace, the days walked carrying over as usual. [warfare 9.2; movement §9.1; D-MOVE-12]
- MOVE-115 When an army is ordered to march to the province it stands in, the movement system shall treat it as Halt; a new order keeps the days walked only when its next step is the same, and days left over when a route ends are dropped; there is no limit of one order a turn. [D-MOVE-5]
- MOVE-116 The movement system shall count the day an army arrives as the day its walked days reach the step, so a fraction rounds up (13.5 days → day 14), and the planner shall say "stops at <province> on day <n> until the castle falls"; a route that stops at a castle abroad shows the food colour there as the reserve left at the end of the turn. [movement §12; D-MOVE-19]
- MOVE-117 From December to March, the movement system shall treat a river in a province at latitude 55° or more as frozen and crossed like a bridge, with no river days (`frozenRivers`); warfare's −20 % for attacking across it does not apply. [X-17]
- MOVE-118 While a battle the player's army or fleet is in runs, the movement system shall play each day as six 4-hour steps (`battleSteps`): each step moves every other mover a sixth of a day, runs stop checks and contact, and fights one round of every running battle; a retreat the player orders leaves the battle at that step's round (to a neighbour when its commander's Cunning is higher than the enemy's and it isn't trapped, otherwise broken); when no player battle runs, battles fight their six rounds a day at once. [X-1]
- MOVE-119 When an army enters a province where a battle runs, the movement system shall add it to the side it belongs to: at any 4-hour step for a player battle, at the start of a day for a battle between AI realms. [X-1]

### Playtest feedback (17 October 2026)
Leroy's playtest feedback (DECISIONS.md, F-1 to F-22). It is the latest decision, so it replaces the requirements it names.

- MOVE-120 The route planner shall plan routes over map tiles (the map-grid pixels of world-map), choosing the path of least total tile weight, where a tile's weight is the days to cross its tile type (`movement.tile_days.<tile type>`, provisional) times its state factor; the province an army is in is the province that owns its tile, and the road, season, march order, guns, column, horse and Cunning factors of MOVE-011 apply to the tile weights. [F-4]
- MOVE-121 While a tile lies under snow (winter cover from latitude 50° toward the pole and on mountains, X-17), the movement system shall multiply its weight by `movement.snow_factor` (provisional); closed tiles (snow passes MOVE-030, glacier MOVE-033) stay closed. [F-4; X-17]
- MOVE-122 The movement system shall keep tile weights tuned so that marching keeps today's pace: an army on foot cannot march from Mexico City to southern Québec in 2 months (about 172 days on foot and 126 all on horseback today). [F-4; Leroy 17 Oct]
- MOVE-123 On each day, or each 4-hour step while a player battle runs, the movement system shall advance every marching army along its tile path by the tiles its walked days pay for, so its position changes as the days pass and never jumps at the end of the turn. [F-2]
- MOVE-124 The movement system shall publish every army's current tile, route tiles and commander, so the map can draw the commander where the army stands. [F-3]
- MOVE-125 The movement system shall make an army walk exactly the tile path the route preview showed, and the planner shall never return a path through a closed or impassable tile or through a province with a hostile garrisoned castle (INV-MOVE-4, INV-MOVE-5). [F-1]
- MOVE-126 When the tiles of two hostile armies come within engagement range, 10 tiles plus one per 2 points of the better commander's Cunning, at most 15 (`movement.engage_tiles_base` 10, `movement.engage_tiles_max` 15, provisional), the movement system shall make contact and start the battle rules where the defender stands. [F-20]
- MOVE-127 The movement system shall let several armies be selected at once (multi-tap or a drag-box on the map, or from the Army list) and given one march order together, each walking its own route (MOVE-072). [F-21]

## 6. Commands

| Command | Who issues it | Preconditions | Result | Events emitted |
|---|---|---|---|---|
| MarchTo(army, province, settings) | player / AI | army alive, owned, not broken; destination enterable (5.3) and reachable | Route set (ends at first hostile castle) | RoutePlanned |
| MarchBy(army, waypoints, province) | player / AI | as MarchTo | Route through waypoints | RoutePlanned |
| Halt(army) | player / AI | not broken | Stops; rest of route greyed | MarchHalted |
| Resume(army) | player / AI | greyed route; stop cause gone | Greyed route becomes active | RoutePlanned |
| ReturnHome(army) | player / AI | an own province with a castle exists | Route to nearest | RoutePlanned |
| Follow(army, target) / Join(army, friendly) | player / AI | target visible / friendly | Daily re-plan | RoutePlanned |
| Raid(army, route) | player / AI | horse-only army | Raid pace, a week per province | RoutePlanned |
| Besiege(army) | player / AI | enemy castle in province | Siege (warfare) | SiegeLaid (warfare) |
| SetRouteSettings(army, pace, onTheWay) | player / AI | — | Route redrawn | — |
| Split(army, share, commander side) | player / AI | — | Two armies after 2 days (same day with W14) | ArmySplit |
| JoinArmies(a, b) | player / AI | same province | One army after 1 day | ArmiesJoined |
| MarchTogether(armies, province, arriveTogether) | player / AI | — | Staggered starts | RoutePlanned × n |
| RallyHere(armies, province) | player / AI | — | March and join | RoutePlanned × n |
| SetNewRegimentsGoTo(province or per front) | player / AI | — | Rally point stored | — |
| DrawFront(provinces, armies) | player / AI | W14 | Armies spread along it | FrontSet |
| RefillAndGo(army) | player / AI | a route | Refill stop added | RoutePlanned |
| BoardShips(army, fleet) / Land(army, province) | player / AI | port with enough ships / coast next to fleet | Cargo / mover again | ArmyBoarded / ArmyLanded |

## 7. Domain events

| Event | When | Payload | Consumed by (context) |
|---|---|---|---|
| ArmyEnteredProvince | Day an army arrives | army, province, day | warfare (contact, occupation, scouting), map-presentation (replay) |
| ArmyStopped | A stop check stops a march | army, province, day, reason (enemy, castle, border, snow, enemy seen) | game-shell (notice), map-presentation |
| ContactMade | Hostile armies end a day in one province (or meet on a border) | armies, province, day | warfare (battle) |
| ArmyWithdrew | A side slipped away before battle | army, from, to | warfare |
| ArmyBroken / RetreatReachedRefuge / ArmySurrendered | Retreat steps | army, refuge or captor, commander fate | warfare, realm |
| RouteTurnedRed | Food runs out on a route this turn | army, step | game-shell (notice) |
| EnemySeenEnteringLand | First sighting of an enemy army marching into the realm | army, province | game-shell (notice) |
| ArmySplit / ArmiesJoined | as named | armies | warfare (commanders, captains) |
| ArmyBoarded / ArmyLanded | as named | army, fleet, place | naval |
| TurnReplay | End of day loop | per army: day entered each province; stops and battles with day | map-presentation, game-shell |

## 8. Policies (reactions to other contexts)

- When warfare reports a castle taken, then the movement system lets armies in that province march on (a greyed route can resume).
- When warfare reports a battle broken, then the movement system starts the broken army's retreat.
- When diplomacy reports passage withdrawn, then armies inside that realm stop at the border the same day and the planner stops using its land.
- When diplomacy reports war declared or peace made, then may-enter changes for that realm pair.
- When naval reports an enemy fleet in a strait, then that strait crossing is closed for the rest of the day loop.
- When events start a flood, then river days in that province double for a season.
- When recruiting reports levies gathered or a regiment trained, then they march to "New regiments go to" if set.
- When buildings completes a bridge or a road, then step days for steps into that province change.
- When time-and-turns ends a turn, then the movement system runs the day loop for the turn's 7 days.

## 9. Each turn

The day loop (7 passes, one per day of the weekly turn, X-18; the calendar uses real month lengths, X-3) runs inside the turn, after the orders of the turn (the player's, then each AI
realm's in nation-index order) and before the monthly steps (X-2). Each day: movers step in kind and id order
(MOVE-111), arrivals run their stop checks, then battles fight their rounds (six a day; while a player battle runs the day is six
4-hour steps, X-1), then standing orders. Weekly steps run once at the end of the turn, after its 7th day (X-18): army food and hunger, plunder, raids
(X-3). Sieges, sickness and pay run once after the loop, in the turn in which a new month begins (X-2, X-18). It must read first: orders of the turn, passage and war state
(diplomacy), season and wet season (time-and-turns and world-map), garrisons (warfare), fleets in straits (naval),
roads and bridges (province/buildings).

## 10. Configuration

| Key | Meaning | Value in the design | Placeholder? | Config file |
|---|---|---|---|---|
| `march.daysPerMonth` | Days in the day loop | replaced by the month's real length (X-3) | no | `packages/rules/data/defines.json` |
| `turnDays` | Days in a turn | 7 (X-18) | no | `troop-movement.json` |
| `frozenRivers` | Latitude and months a river freezes | 55°, December to March | yes | `troop-movement.json` |
| `battleSteps` | Steps a day while a player battle runs; default rounds | 6 of 4 hours; 6 | defaultRounds | `troop-movement.json` |
| `march.daysPerCrossing` | Real days per crossing unit | 6 | decided by Leroy | defines.json |
| `march.daysToCross` | Ground days to cross | farmland/grassland/savanna 1, drylands/hills 1.5, desert/forest/tundra 2, mountains/jungle/marsh 3 | yes | defines.json (province 3.1) |
| `march.horseSpeedBonus` | Horse share bonus | 0.5 | yes | defines.json |
| `march.bigArmyExtraCrossings` | Column penalty | 1 crossing | yes | defines.json |
| `march.riverCrossingDays` | River days (code; flat) | 1 (to be replaced) | yes | defines.json |
| `roadFactor` | Road factors | track 1, road 0.75, paved 0.5, turnpike 0.4, railway 0.1 | yes | defines.json (new) |
| `seasonFactor` | Winter / wet season | ×2 tundra, mountains, forest; ×1.25 paddies, marsh, jungle | yes | defines.json (new) |
| `orderFactor` | March order | Normal 1, Forced 0.67, Careful 1.33, Raid 0.67 | yes | defines.json (new) |
| `gunsFactor` | Guns in rough ground | 1.25 | decided | defines.json (new) |
| `cunningSpeed` | Speed per Cunning point | 0.05 | yes | defines.json (new) |
| `riverDaysPer10kMen` | River days | 1 | decided scaling | defines.json (new) |
| `greatRiverDaysPer10kMen` | Great river days | 2 | decided scaling | defines.json (new) |
| `ferryDaysPer10kMen` | Strait ferry | 2 | decided scaling | defines.json (new) |
| `retreatMaxProvinces` | Retreat range | 3 | yes | defines.json (new) |
| `splitDays` | Split before W14 | 2 | yes | defines.json (new) |
| `joinDays` | Join | 1 | yes | troop-movement.json (D-MOVE-15) |
| `refillDaysPer10Pct` | Refill and go wait | 1 day per 10 % | yes | defines.json (new) |
| `replaySecondsPer10Days` | Replay speed | 1 | yes | defines.json (new) |
| passes, fords, strait crossings | Lists | Great St Bernard, Khyber, Brenner, Roncesvalles…; Ebro at Tortosa, Danube at Vidin…; Bosporus, Øresund, Messina, Kerch, Gibraltar… | yes | defines.json (new) |
| `winterMonths`, `wetSeasonMonths`, `snowClosedMonths` | Winter months, wet season by climate, snow closure months | Dec–Feb N / Jun–Aug S; monsoon Asia Jun–Sep, Sahel/savanna Jul–Sep, Amazon Dec–May; closure Dec–Mar N / Jun–Sep S | yes | troop-movement.json (D-MOVE-15) |
| `menPerBoardingDay`, `landingNoPortFactor` | Board / land | a day per 5,000 men; ×2 landing with no port | yes (warfare 11.3) | troop-movement.json (D-MOVE-15) |
| `escapeCunning` | Cunning to escape | 4 | yes | troop-movement.json (D-MOVE-15) |
| `fordMonths` | Ford usable | Jun–Nov N / Dec–May S (D-MOVE-10) | provisional | troop-movement.json |
| `floodMonths` | Flood length | 3 (D-MOVE-10) | provisional | troop-movement.json |
| `greatRiverScaleRanks` | Great river | scale ranks 0 and 1 (D-MOVE-10) | provisional | troop-movement.json |
| `dunesDaysToCross` | Dunes | 3 (D-MOVE-11) | provisional | troop-movement.json |
| `raidDaysPerProvince` | Raid stay | 7 (D-MOVE-12) | provisional | troop-movement.json |
| `turnDays`, `moverKindOrder` | Weekly steps at the end of each turn, mover order | every 7th day; army, fleet, trader, trade ship (X-2, X-18) | no | troop-movement.json |
| min pill height / day-count size | UI | 44 points / 10 points | no | client |
| `march.rationsPerSoldier`, `rationsPerHorse`, `rationsStoredPerPerson`, `monthsCarried`, `logisticsRationCut`, `hungerLossPerMonth`, `foraging`, `startingHorseShare` | Food (warfare's) used by the march code | 2, 3, 0.5, 2, 0.05, 0.28, per ground, 0.2 | yes | defines.json |

## 11. Seams

| Other context | Direction | Pattern | What crosses |
|---|---|---|---|
| warfare | both (upstream for battles, sieges, food; downstream for contact) | Partnership | Contact → battles fought in rounds, six a day or one per 4-hour step while a player battle runs (X-1), joinable by armies marching in; withdraw/break results; standing orders (AI's from personality, WAR-194); sieges once a month (X-2); no shore penalty across a frozen river (X-17); food reserve and hunger at the weekly steps (X-3), forage limit, plunder; raids (a week per province); scouting (what is seen; rumours are never intercepted); commander Cunning |
| world-map | upstream | Conformist | Province graph `adjStart`/`adjList`, ground, rivers and their scale rank, sea zones, hemisphere, climate |
| province | upstream | Customer–Supplier | Days to cross per ground, roads, bridges (shore tile), forage limit inputs (people, stores), castles |
| buildings | upstream | Conformist | Bridges, roads, harbours as built |
| naval | both | Shared Kernel | Mover interface, day loop, planner; fleets' step days and may-sail; boarding/landing; enemy fleets closing straits; sailors walking between ports at "levy pace", which is the step days of a foot army of that size at Normal pace (D-MOVE-16) |
| trade | downstream | Shared Kernel | Mover interface; traders on the day loop; stops-at on enemy armies; raid on traders |
| diplomacy | upstream | Customer–Supplier | Yes/no passage per realm pair and its withdrawal day; war state; allies. No army can enter a realm without passage, so diplomacy's "entered without passage" case can't arise from a march (D-MOVE-7) |
| subjects | upstream | Conformist | Subject terms for feeding the overlord's army |
| recruiting | upstream | Customer–Supplier | Gathered levies (one army in the drawn province with most men, RECR-103) and trained regiments march to "New regiments go to" with no order; levies walking to training places |
| research | upstream | Conformist | W14 Army divisions (split same day, fronts) |
| events | upstream | Published Language | Floods |
| time-and-turns | upstream | Conformist | Turn = 7 days (X-18); month = its real length (`daysInMonth`, X-3), turn order (X-2), weekly steps at the end of every turn (X-18), date and seasons (X-4), the day slowing to 4-hour steps for the player's battles (X-1) |
| map-presentation | downstream | Published Language | Route preview, turn marks, replay timing, zoom displays |
| game-shell | downstream | Published Language | Notices of the turn; the 4-hour battle steps with standing orders, retreat and switching battles (X-1) |
| rebellions | upstream | Conformist | Rebel-held provinces (may enter; plunder) |

## 12. AI

- The AI uses the same orders and route settings, given in the orders phase after the player's, in nation-index order (X-2); its standing orders are set by its personality (warfare WAR-194) [movement §9.3].
- Interception uses the AI personality's retreat ratio to judge "it thinks it will win" [movement §6.3].
- No other AI movement rules are stated; the overall war AI is warfare's.

## 13. Decisions and open questions

Decided on 17 October 2026 (domain/DECISIONS.md). None of troop-movement's questions is a release task, so none stays open.

- **D-MOVE-1** (was OQ-MOVE-1) March pace: 6 days per crossing unit is decided; the gap-list item is closed. Leroy decided it in troop-movement §15, the later word.
- **D-MOVE-2** (was OQ-MOVE-2) Column penalty: an army bigger than the entered province's forage limit adds 1 crossing (6 days on open ground), not one day; warfare 5.3 follows. Troop-movement is the newer design and the code agrees.
- **D-MOVE-3** (was OQ-MOVE-3) Step days and may-enter: the design's full step-days formula (road, season, march order, guns, column, horse, Cunning, river days by army size, bridges, fords, passes, straits) and the land rule of 5.3 replace the engine's flat rules; warfare 5.2 takes half the leaving and half the entering ground and troop-movement's river days. The newer, decided design wins.
- **D-MOVE-4** (was OQ-MOVE-4) Day loop: every mover takes its day step together in one day loop of the turn's 7 days (X-2, X-18), through months of their real length (X-3), replacing the engine's army-by-army month; the domain rules here are that loop. X-2, X-3 and X-18 decide it.
- **D-MOVE-5** (was OQ-MOVE-5) Code-only rules: there is no limit of one order a turn (the last order of the orders phase stands); a new order keeps the days walked only when its next step is the same; days left over when a route ends are dropped; an order to the army's own province is a Halt that keeps the rest greyed (MOVE-115). Each keeps the design's "change orders freely" with the fewest rules.
- **D-MOVE-6** (was OQ-MOVE-6) Food: army food runs at the weekly steps (X-3). An army standing in its own land refills its reserve there (castle store first, then the locals) without stopping; abroad it eats its reserve, then plunders; ownership counts and allied or neutral armies share forage by men (MOVE-112). Warfare 6.2 and X-3 decide it.
- **D-MOVE-7** (was OQ-MOVE-7) Passage: no order can take an army into a realm that grants no passage; the planner routes round or says "needs passage from <realm>". Diplomacy's "an army that enters without passage" can then only arise from events, not from a march. The may-enter rule is the simpler one and already decided by the movement design.
- **D-MOVE-8** (was OQ-MOVE-8) Watching the turn: as X-1 (Leroy, 17 Oct), battles are fought over time; while a battle the player's army is in runs, the day loop slows to six 4-hour steps, each moving every other mover a sixth of a day and fighting one round (MOVE-118), so armies can march in and join (MOVE-119); the player can change standing orders, retreat or switch battles at any step, with no Skip to result; AI battles fight six rounds a day at once and never slow the month; any battle can be replayed from its notice (MOVE-097, MOVE-113). X-1 decides it.
- **D-MOVE-9** (was OQ-MOVE-9) Season and guns factors look at the province entered. The table and the Dunois example both apply them that way.
- **D-MOVE-10** (was OQ-MOVE-10) Rivers: Natural Earth scale ranks 0 and 1 are great rivers; a ford is a bridge in summer and autumn of its province's hemisphere (June–November north, December–May south, X-4); a flood doubles river days for 3 months from the month it starts. All provisional. A season is 3 months, and X-4 sets the hemispheres. X-17 (Leroy, 17 Oct) adds that from December to March a river at latitude 55° or more is frozen and crossed like a bridge (MOVE-117).
- **D-MOVE-11** (was OQ-MOVE-11) Tile types: dunes, glacier and paddies count for movement when they are the province's main tile type; a dunes province's days to cross are 3 instead of desert's 2, with no foraging and guns only with camels. Step days already use one value per province.
- **D-MOVE-12** (was OQ-MOVE-12) Raid: a raider walks each step at raid pace (×0.67) and then stands 7 days in the province it entered before riding on (MOVE-114); the burning itself is warfare's weekly raid step. The two rules apply one after the other, with no new rule.
- **D-MOVE-13** (was OQ-MOVE-13) Withdrawing: only a side outnumbered past its "retreat if outnumbered" ratio wants to withdraw, so a stronger side does not; it gets away with higher Cunning when not trapped, and "trapped" counts the province it came from like any other neighbour. §6.1's check is the detailed rule, and §2.1 is its summary.
- **D-MOVE-14** (was OQ-MOVE-14) Route settings: there are two, Pace and On the way; "halt when the enemy is seen" is an On the way choice that works like a standing order. The design's "three" counts wrong.
- **D-MOVE-15** (was OQ-MOVE-15) Config keys: join days, boarding rate, landing factor, escape Cunning, winter, wet-season and snow-closure months live in `troop-movement.json` with the other keys of §13; the provisional ones are listed in its `_provisional`. One file per context is the convention.
- **D-MOVE-16** (was OQ-MOVE-16) New regiments: a levy gathers first (recruiting RECR-103) and then marches to "New regiments go to" with no order; "levy pace" for sailors walking between ports is the step days of a foot army of that size at Normal pace. It reuses the existing step-days rule.
- **D-MOVE-17** (was OQ-MOVE-17) Interception and rumours: only a seen army can be intercepted; an army known only as a rumour is never a target, since its remaining days are not known. The rule needs no guess at hidden numbers.
- **D-MOVE-18** (was OQ-MOVE-18) Broken armies: a broken army passes its own side's castles; the refuge search counts steps (up to 3) and never routes through a province with a hostile garrisoned castle, which still ends any route. The planner's castle rule applies unchanged.
- **D-MOVE-19** (was OQ-MOVE-19) Arrival day: an army arrives on the day its walked days reach the step, so 6.5 + 7.0 = 13.5 days is day 14, and the planner says "stops at Langres on day 14 until the castle falls"; a route stopping at a castle abroad shows the food colour there at the end of the turn, which makes the example's yellow at Langres (MOVE-116). The day loop already works that way.
- **D-MOVE-20** (was OQ-MOVE-20) Strait ferry: a harbour on one side is enough (owned by the army's realm, an ally or a realm granting passage). It is the simpler reading.

## 14. Traceability

| Requirement | Feature file | Scenario |
|---|---|---|
| MOVE-001–010 | day-loop.feature | all |
| MOVE-011–023 | step-days.feature | all |
| MOVE-024–036 | rivers-passes-and-ground.feature | all |
| MOVE-037–039 | splitting-and-joining.feature | all |
| MOVE-040–054 | what-stops-an-army.feature | all |
| MOVE-055–067 | meeting-the-enemy.feature | all |
| MOVE-068–071 | food-on-the-road.feature | all |
| MOVE-072–075 | moving-many-armies.feature | all |
| MOVE-076–086 | orders.feature | all |
| MOVE-087–092, 095, 096, 099 | — | Presentation only (touch gestures, banners, zoom rendering, accessibility); verified by client UI tests, not domain scenarios |
| MOVE-093, 094, 097, 098 | route-preview-and-notices.feature | data the preview and replay must carry |
| MOVE-100–110 | movers.feature | all |
| MOVE-111 | day-loop.feature | Movers take their day step in a fixed order |
| MOVE-112 | food-on-the-road.feature | Refilling while passing through own provinces |
| MOVE-113 | route-preview-and-notices.feature | Watching the turn |
| MOVE-114 | orders.feature | A raid spends a week in each province |
| MOVE-115 | orders.feature | An order to the province it stands in is a Halt |
| MOVE-116 | dunois-1450.feature | The planner ends the route at Langres |
| MOVE-117 | rivers-passes-and-ground.feature | A frozen river is crossed like a bridge |
| MOVE-118 | day-loop.feature | A player battle slows the day to 4-hour steps and others march in; The player orders a retreat at any step |
| MOVE-119 | day-loop.feature | AI battles never slow the turn and are joined at the start of a day; A player battle slows the day to 4-hour steps and others march in |
| Worked example §12 | dunois-1450.feature | all |
| MOVE-120–122 | step-days.feature | Routes are planned over map tiles; Snow makes a tile slower; Marching keeps its pace |
| MOVE-123, 124 | day-loop.feature | An army moves tile by tile as the days pass |
| MOVE-125 | orders.feature | The army walks the route the preview showed |
| MOVE-126 | meeting-the-enemy.feature | Armies make contact within engagement range |
| MOVE-127 | moving-many-armies.feature | Several armies selected at once march together |
