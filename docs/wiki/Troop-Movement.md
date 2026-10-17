# Troop Movement

Troop movement is where your armies stand on every day of the month. You draw a route with your finger, see how many days it takes and how much food will be left on arrival, and the month then plays out day by day for every army at once: armies cross rivers and passes, get stopped by castles and borders, meet the enemy, withdraw, retreat and chase. The same rules move fleets, trade ships and traders, so the whole map runs on one clock.

## How it works

### The day loop

Each month is played out as **30 days**. On each day, for every army at once, the game runs four steps in order:

1. **Move**: every marching army adds a day to its current step, and an army that has walked enough days enters the next province.
2. **Stop checks**: an army that arrives somewhere is checked against the list below.
3. **Contact**: hostile armies standing in the same province at the end of the day start the battle rules from [Warfare](Warfare), with a chance to withdraw first.
4. **Standing orders**: armies set to attack may turn to intercept.

While a battle lasts (1 to 3 days) its armies don't move. Food, sickness, sieges and pay are not in the day loop; they run once a month in [Warfare](Warfare).

A mover is always in exactly one place, never between two. While an army walks a step it stays in the province it is leaving, where it eats, is seen and can be attacked, until the day it arrives. If two hostile armies walk the same border in opposite directions, they fight in the province of the army with more days still to walk. Days already walked toward the next province carry over into the next month.

### How long a step takes

A step is one move from a province into its neighbour. Its days are:

**step days = crossing × 6 × road × season × march order × guns × column ÷ horse bonus ÷ Cunning bonus + river days**

- **Crossing** is half the leaving ground's days to cross plus half the entering ground's: farmland, grassland and savanna 1; drylands and hills 1.5; desert, forest and tundra 2; mountains, jungle and marsh 3.
- **6 days per crossing unit**, so a step across farmland takes 6 days.
- **Road**: the worse road of the two provinces counts: track 1, road 0.75, paved road 0.5, turnpike 0.4, railway 0.1.
- **Season**: in winter (December to February in the north, June to August in the south) step days double in tundra, mountains and forest. In the wet season of the climate they are ×1.25 in paddies, marsh and jungle (monsoon Asia June to September, Sahel and savanna July to September, Amazon December to May).
- **March order**: Normal 1, Forced 0.67, Careful 1.33, Raid 0.67 (horse-only armies).
- **Guns**: an army with any guns other than light field guns takes ×1.25 once for the whole army into hills, mountains, forest, jungle and marsh. Bombards can't enter a mountain province without a road.
- **Column**: an army bigger than the forage limit of the province it enters adds 1 crossing.
- **Horse bonus**: step days are divided by 1 + 0.5 × (horses ÷ men), so a horse-only army goes 1.5 times as fast as foot.
- **Cunning bonus**: divided by 1 + 0.05 per point of the commander's Cunning.

Fractions are kept, and rounded to whole days only for display.

### Rivers, passes and hard ground

- **Rivers**: entering a river province with no bridge adds 1 day per 10,000 men or part of it, 2 for a great river. A bridge removes river days for any army size, but a bridge province held by an enemy army is no use to you. Named **fords** count as bridges in summer and autumn. A **flood** (an event) doubles river days in a province for a season.
- **Passes**: mountain provinces marked as passes (Great St Bernard, Khyber, Brenner, Roncesvalles and others) count as having a road (×0.75) even before roads are built.
- **Snow**: from December to March (June to September in the south) snow-peak provinces with no pass and no road are closed, and routes go round them.
- **Sea**: armies enter sea and ocean zones only aboard ships.
- **Glacier** is impassable.
- **Dunes** count 3 crossings instead of 2, allow no foraging and need camels for guns.
- **Straits**: some land neighbours across a narrow strait (Bosporus, Øresund, Messina, Kerch, Gibraltar and others) can be crossed without your own ships where there is a **ferry** (a harbour owned by you, an ally or someone granting passage), at 2 days per 10,000 men or part. An enemy fleet in the strait closes it.

### What stops an army

When an army arrives in a province, the checks run in this order: enemy army here, enemy garrisoned castle here, border closed, snow pass closed, halt when the enemy is seen, food runs out. When a check stops a march, the rest of the route stays drawn in grey so one order resumes it.

- **Enemy armies** stop you only in the province they stand in.
- **Castles always block.** An army that enters a province with an enemy garrisoned castle stops there, and no army marches on past until the castle is taken (stormed, surrendered or bribed). While there it can only stay (besiege or wait), go back the way it came or into a neighbour it came from or its side holds, or march on once the castle has fallen. A castle with no garrison doesn't block. An ally's garrisoned castles block that ally's enemies the same way. The planner treats every such province as the end of a route and shows "stops at Langres until the castle falls".
- **Borders.** An army may enter its own land, its subjects', the land of an enemy at war with it, rebel-held provinces, an ally's land or a realm granting passage, and land nobody owns, and no other realm's land. If passage is withdrawn while it marches, the army stops at the border that day. If a destination can't be reached without passage, the planner routes round or says "needs passage from Savoy".
- **Snow.** If a pass closes while an army is in it, the army stops and winters there, hungry.
- **Halt when the enemy is seen** stops the army in the province before the one where an enemy is seen.
- **Food.** An army whose food runs out on its route is not stopped; its route turns red from that step and you get one notice.

What an army eats from depends on the land: its own land feeds it from the locals and refills it; a subject's land uses the reserve unless the subject's terms feed it; enemy, rebel-held and unowned land use the reserve and then plunder; an ally's or passage land use the reserve.

### Meeting the enemy

**Withdrawing.** Before a battle each side checks its standing order "retreat if outnumbered" against what it sees, a rumour counting at its shown size. A side that wants to go steps back to the province it came from, or if it was standing still to the friendly neighbour with the fewest enemies. It gets away only if its commander's Cunning is higher than the enemy's and it isn't trapped; otherwise it fights.

**Broken armies.** A side that breaks in battle drops half its wagons, and its guns if the winner held the field with horse. It marches on forced march by the fastest route to the nearest **refuge** (an own-side province with a castle, or any own-side province with no enemy) up to 3 provinces away. While broken it takes no orders, doesn't besiege and doesn't stop for its own side's castles. An enemy that meets it fights at once; the broken army can't withdraw and breaks again at the first lost sector. With no refuge within 3 provinces, it surrenders: its men become prisoners and its commander is captured, unless he has Cunning 4 or more and gets away alone to the capital. At the refuge it becomes an ordinary army again and fled men who come back rejoin it.

**Interception.** Once a day an army with standing order "attack" looks at visible enemies in neighbouring provinces and turns to march on one if it isn't on a player route (or Attack on the way is set), its men are at least the enemy's (or what its AI personality's retreat ratio allows), and its step there is shorter than the enemy's remaining step. An army on "wait" never intercepts.

**Chasing.** An army following an enemy re-plans its route each day to where the enemy was last seen. If the enemy vanishes from sight, the follower walks to where it was last seen and stops there with a notice.

**Friends and neutrals** in the same province don't fight or block, and share the province's forage limit by men.

### Food on the road

The route preview shows the food reserve on arrival at each province, counting meals abroad, refills at home and the forage limit: **green** while it covers the march, **yellow** under half, **red** where empty. On a route that leaves your land, the **point of no return** is flagged: the last province from which the army can still get home before its reserve runs out. **Refill and go** adds a stop at your castle with the most food above its siege reserve, or the richest of your provinces on the route, and waits a day per 10 % of the reserve refilled. Marching through your own provinces refills the reserve as it goes, not only where it stops at month end.

### Splitting and joining

Splitting an army takes 2 days before W14 Army divisions and no time after, and each half gets its share of food, wagons and companies. The commander stays with the half you pick; the other needs a captain or new commander, or is led by its senior company captain with Cunning 0. Joining two armies in one province takes 1 day: food and wagons add up, the commander with more victories leads, and the other becomes a captain if there is room.

### Moving many armies

- **March together**: several armies get one destination, each with its own route. With "arrive together" on (the default), the faster ones start later so all arrive the same day, and that day is shown.
- **Rally point**: armies march there and join on arrival in the order they come.
- **New regiments go to**: set a province (or one per front) and newly raised levies and trained regiments march there on their own when ready and join the army standing there.
- **Fronts** (W14): draw a line of provinces and give it armies, which spread along it, intercept within their stretch and retreat along the front.

### Orders

Every army can **March to** (fastest route to a province it may enter), **March by** (through waypoints), **Halt** (stop, keeping the rest of the route greyed), **Return home** (to the nearest own province with a castle) and **Follow / Join** (follow a friendly army and join when you meet, or chase an enemy). Horse-only armies can **Raid**, marching at raid speed and spending a week in each province. Any army in a province with an enemy castle can **Besiege**, and can't march on until the castle falls. Armies in a port with ships, or at sea, can **Board ships / Land**.

Each army remembers two route settings: **Pace** (Normal, Forced, Careful) and **On the way** (keep marching, halt when the enemy is seen, attack what we see). There are no standing orders beyond warfare's. Every order is data, the same for player and AI.

### One way of moving

Armies, fleets, trade ships and traders are all **movers**. Each has a place, a route, progress, and three rules of its own: how many days a step takes, where it may enter, and where it stops. Land provinces and sea zones form one graph, and each mover's may-enter rule picks its part. All movers step in the same day loop and use the same route planner. A port province with a harbour on a shore tile neighbours its sea zone.

- **Boarding**: an army in a port with enough of its own or an ally's ships boards at a day per 5,000 men and becomes **cargo**, moving with the fleet. Aboard, it eats from its reserve as if abroad.
- **Landing**: a fleet lands its army on a neighbouring coast at a day per 5,000 men, twice as long with no port, and the army is a mover again with the stop checks applying.
- If you route an army onto water, the planner asks [Naval](Naval) for a combined route (march, board, sail, land, march) when you have ships, or stops at the coast with "needs ships".
- Traders use the same roads, rivers and passes. A trader's stop rule reacts to enemy armies, and raiding armies can attack traders they pass; [Trade](Trade) sets the amounts.

### Dunois marches to Dijon, March 1450

France is at war with Burgundy. Jean de Dunois (Cunning 4) leads 14,200 men with 3,200 horse and 8 bombards from Paris. Paris and Troyes are French farmland, Langres is Burgundian hills, Dijon is Burgundian farmland, and Troyes sits on the Seine with no bridge.

| Step | Days |
|---|---|
| Paris to Troyes | 6.5 |
| Troyes to Langres | 7.0 |
| Langres to Dijon | 5.6 |

Langres has a stone castle with 400 men and every other road to Dijon runs through Burgundian castles. Dragging the banner to Dijon gives a route ending at Langres: "stops at Langres on day 14 until the castle falls", with the leg to Dijon in grey. The food line is green to Troyes and yellow at Langres. In the month, Dunois arrives at Langres on day 14 and besieges it.

The Bastard of Burgundy (Cunning 2) leads 8,000 men, seen by France only as a rumour of "about 6,000 near Beaune". His standing order is retreat if outnumbered 3 to 2. When he stands in Langres at the end of day 22 he wants to withdraw (14,200 against 8,000 is more than 3 to 2), but must fight because his Cunning is lower than Dunois'. The garrison joins him from the walls, and the player gets one notice: "Battle at Langres". If Dunois wins and the castle falls, tapping the grey leg resumes the march to Dijon.

## What you see

- **Selecting an army**: tap it and its card slides up halfway; provinces it could reach this month are lightly shaded, those next month lighter still.
- **Drawing a route**: drag from the army's banner and the route is drawn live with days and food on arrival, set when you lift, cancelled by dragging back onto the army. A drag that doesn't start on the banner pans the map. Tapping a province draws the same route and waits for confirmation. Drag the middle of a route to add a waypoint; drag a waypoint off to remove it. A two-finger tap deselects.
- **The order pill**: at least 44 points high, at the route's end, with March and its days, pace, on the way and cancel. Changing a setting redraws the route and its days at once.
- **The route preview**: a dashed line; month marks where the army will stand at the end of this and each later turn; day counts at each province and the total; food colour and the point-of-no-return flag; icons for river, snow pass, stopping castle, border needing passage and enemy seen (with shown size); other selected armies' routes thinner in the same colour.
- **Stacked armies**: one banner with total men and number of armies; tapping opens a picker (name, men, food, commander) with Select all here and, at region zoom, Select all in sight.
- **Zoom**: at world zoom, arrows thick by men and coloured by owner, long routes in months; at region zoom, the full preview; at local zoom, marching columns as sprites sized to the army.
- **Watching the month**: when the turn ends the month plays at about one second per 10 days with a skip button; battles flash and pause half a second, and stopping castles ring red.
- **Notices**, only for: an army stopped short (enemy, castle, border or snow), a battle fought (with its reason), a route that turned red, and an enemy first seen marching into your land. Nothing for an army that walked where it was told.
- **Accessibility**: every gesture has a tap-only version (tap army, tap province, tap March; Go by… for waypoints); food colours also carry a pattern (solid, dashed, dotted); day counts stay at least 10 points tall at region zoom and hide rather than shrink.

## How it connects

- [Warfare](Warfare): contact leads to battles; warfare supplies withdraw and break results, standing orders, sieges, food reserve, forage limit, plunder, raids, scouting and Cunning.
- [World-Map](World-Map): the province and sea-zone graph, ground, rivers and their rank, hemisphere and climate.
- [Provinces](Provinces): days to cross per ground, roads, bridges, castles and the inputs to the forage limit.
- [Buildings](Buildings): bridges, roads and harbours as built.
- [Naval](Naval): shares the mover rules, day loop and planner; fleets' step days, boarding and landing, enemy fleets closing straits.
- [Trade](Trade): traders move on the same day loop and roads.
- [Diplomacy](Diplomacy): passage, war state and allies decide where you may enter.
- [Subjects](Subjects): a subject's terms may feed your army.
- [Recruiting](Recruiting): gathered levies and trained regiments march to "New regiments go to", and levies walk to training places.
- [Research](Research): W14 Army divisions for same-day splits and fronts.
- [Historical-Events](Historical-Events): floods.
- [Time-and-Turns](Time-and-Turns): the 30-day month, turn order and seasons.
- [Map-and-Lenses](Map-and-Lenses) and [Screens-and-Navigation](Screens-and-Navigation): the route preview, replay and notices.
- [Rebellions](Rebellions): rebel-held provinces may be entered and plundered.

## Numbers

Values live in `packages/rules/data/defines.json` under `march` (some keys are new and not yet in the file).

| Key | Value | Status |
|---|---|---|
| `march.daysPerMonth` | 30 | in code |
| `march.daysPerCrossing` | 6 | decided |
| `march.daysToCross` | farmland 1, hills 1.5, forest 2, mountains 3 … | placeholder |
| `march.horseSpeedBonus` | 0.5 | placeholder |
| `march.bigArmyExtraCrossings` | 1 crossing | placeholder |
| `march.riverCrossingDays` | 1 (flat, to be replaced) | placeholder |
| `roadFactor` | 1 / 0.75 / 0.5 / 0.4 / 0.1 | placeholder |
| `seasonFactor` | ×2 winter; ×1.25 wet season | placeholder |
| `orderFactor` | Normal 1, Forced 0.67, Careful 1.33, Raid 0.67 | placeholder |
| `gunsFactor` | 1.25 | decided |
| `cunningSpeed` | 0.05 a point | placeholder |
| `riverDaysPer10kMen` / `greatRiverDaysPer10kMen` / `ferryDaysPer10kMen` | 1 / 2 / 2 | scaling decided |
| `retreatMaxProvinces` | 3 | placeholder |
| `splitDays` | 2 | placeholder |
| join days | 1 | placeholder, no key yet |
| `refillDaysPer10Pct` | 1 | placeholder |
| `replaySecondsPer10Days` | 1 | placeholder |
| boarding / landing | a day per 5,000 men; ×2 landing with no port | placeholder, no key yet |
| captured commander escapes | Cunning 4 | placeholder, no key yet |
| order pill / day counts | 44 points / 10 points | client |

The march code also uses warfare's food values: `march.rationsPerSoldier` 2, `rationsPerHorse` 3, `rationsStoredPerPerson` 0.5, `monthsCarried` 2, `logisticsRationCut` 0.05, `hungerLossPerMonth` 0.28 and `startingHorseShare` 0.2.

## Still open

- **OQ-MOVE-1**: 6 days per crossing is decided, but the gap list still lists it as open.
- **OQ-MOVE-2**: the column penalty is +1 crossing here, one day in warfare.
- **OQ-MOVE-3**: the code lacks road, season, order, guns, Cunning, bridges, fords, passes, straits and the may-enter rule.
- **OQ-MOVE-4**: the code walks each army's whole month in turn instead of a day loop for all.
- **OQ-MOVE-5**: code-only rules (one order per turn, progress reset on a new order, Halt clearing the route) may not be intended.
- **OQ-MOVE-6**: food in code differs from the design (refill wherever it stops, ownership ignored).
- **OQ-MOVE-7**: whether an army can enter without passage as an act of war.
- **OQ-MOVE-8**: whether a battle pauses the turn.
- **OQ-MOVE-9**: whether season and guns factors look at the province entered, left, or either.
- **OQ-MOVE-10**: which river ranks are great, fords by hemisphere, and which season a flood lasts.
- **OQ-MOVE-11**: how tile-level dunes, glacier and paddies apply to province steps.
- **OQ-MOVE-12**: how raid speed and a week per province combine.
- **OQ-MOVE-13**: whether a stronger side can withdraw, and how "trapped" is judged.
- **OQ-MOVE-14**: whether "halt when the enemy is seen" is a standing order or a route setting.
- **OQ-MOVE-15**: several numbers have no config key.
- **OQ-MOVE-16**: how "New regiments go to" fits where levies gather, and "levy pace" for sailors.
- **OQ-MOVE-17**: how a rumour counts for interception.
- **OQ-MOVE-18**: whether a broken army passes enemy castles, and how its 3 provinces are counted.
- **OQ-MOVE-19**: how fractional arrival days are rounded (13.5 shown as day 14).
- **OQ-MOVE-20**: whether a strait ferry needs a harbour on one side or both.

## For developers

- Spec: `domain/troop-movement/spec.md` in the game repository, requirement code **MOVE** (MOVE-001 to MOVE-110).
- Features: `domain/troop-movement/features/`, including `day-loop.feature`, `step-days.feature`, `what-stops-an-army.feature`, `movers.feature` and the worked example `dunois-1450.feature`.
- Code: `packages/engine/src/domain/troop-movement/` (`model.ts`, `planner.ts`, `day-loop.ts`, `food.ts`, `army-rules.ts`, `army-ops.ts`), with balance numbers in `packages/rules/data/domain/troop-movement.json`. The older march code is `packages/engine/src/march.ts` (`stepDays`, `planRoute`), `packages/engine/src/turn.ts` (`processTurn`, `applyOrder`, `runMarches`) and `marchMap` in `packages/engine/src/world.ts`.
