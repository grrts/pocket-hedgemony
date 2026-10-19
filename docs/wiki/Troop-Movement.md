# Troop Movement

Troop movement is where your armies stand on every day of the turn. You draw a route with your finger, see how many days it takes and how much food will be left on arrival, and the week then plays out day by day for every army at once: armies cross rivers and passes, get stopped by castles and borders, meet the enemy, withdraw, retreat and chase. The same rules move fleets, trade ships and traders, so the whole map runs on one clock.

## How it works

### The day loop

A turn is **one week**: each turn plays out **7 days**, and the calendar runs through months of their real length, 28 to 31 days (February has 29 in leap years). On each day, for every army at once, the game runs four steps in order:

1. **Move**: every marching army walks a day further along its route, tile by tile, and enters the next province on the day it reaches that province's first tile.
2. **Stop checks**: an army that arrives somewhere is checked against the list below.
3. **Contact**: hostile armies that come within engagement range of each other, 10 tiles plus one for every 2 points of the better commander's Cunning, at most 15, start the battle rules from [Warfare](Warfare) where the defender stands, with a chance to withdraw first.
4. **Standing orders**: armies set to attack may turn to intercept.

Every mover steps in a fixed order each day: armies first, then fleets, then traders, then exploration ships, each in the order they were raised. After the moves come arrivals, then battles. Battles are fought over time, in rounds of 4 hours, six a day, and while a battle runs its armies don't move. Other armies that march into the province join the side they belong to.

While one of your battles runs, the whole map slows down: each day is played as six 4-hour steps, every other army, fleet and trader moving a sixth of a day per step. At every step you can change your army's standing orders, order a retreat or switch between your running battles; the result can't be skipped. When the battle ends, days go back to normal. Battles between other realms never slow the game: they fight their six rounds a day at once, and others can join them at the start of a day.

At the end of every turn the weekly steps run: armies eat (and go hungry when the food is gone), plunder, raids and plague. An army standing in your own land refills its food there at each weekly step, from the castle store first and then from the locals, without having to stop. Sieges, sickness and pay run once a month, at the end of the turn in which a new month begins.

A mover always stands on exactly one map tile, and so in the province that owns that tile. You can follow every army across the map tile by tile as the days pass: its commander's banner stands where the army is. If two hostile armies walk the same border in opposite directions, they fight in the province of the army with more days still to walk. Days already walked toward the next province carry over into the next turn.

### How long a step takes

Routes run over the map's tiles, not from province to province. Each tile has a **weight**, the days it takes to cross its kind of land (grassland is quick, mountains, jungle and marsh are slow), and the route planner picks the path of least total weight. **Snow** makes a tile slower still: in winter, land from latitude 50° toward the pole and every mountain lies under snow and costs more to cross. The tile weights are provisional, tuned so marching keeps its pace: an army on foot can't walk from Mexico to Canada in 2 months (it takes about 4 to 6). The factors below still apply on top of the tiles:

**days = tile weights walked × road × season × march order × guns × column ÷ horse bonus ÷ Cunning bonus + river days**

- **Crossing** used to be counted per province by its ground (farmland, grassland and savanna 1; drylands and hills 1.5; desert, forest and tundra 2; mountains, jungle and marsh 3); these are now the starting weights of the tiles of those grounds.
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

- **Rivers**: entering a river province with no bridge adds 1 day per 10,000 men or part of it, 2 for a great river (the biggest rivers on the map, such as the Rhine, Danube, Volga or Nile). A bridge removes river days for any army size, but a bridge province held by an enemy army is no use to you. Named **fords** count as bridges in summer and autumn: June to November in the north, December to May in the south. A **flood** (an event) doubles river days in a province for 3 months. **Frozen rivers**: from December to March a river at latitude 55° or more freezes and is crossed like a bridge, with no river days and no penalty for attacking across it.
- **Passes**: mountain provinces marked as passes (Great St Bernard, Khyber, Brenner, Roncesvalles and others) count as having a road (×0.75) even before roads are built.
- **Snow**: from December to March (June to September in the south) snow-peak provinces with no pass and no road are closed, and routes go round them.
- **Sea**: armies enter sea and ocean zones only aboard ships.
- **Glacier** is impassable.
- **Dunes**: a province that is mostly dunes takes 3 crossings instead of desert's 2, allows no foraging, and guns can enter it only with camels. Glacier and paddies likewise count when they are most of the province.
- **Straits**: some land neighbours across a narrow strait (Bosporus, Øresund, Messina, Kerch, Gibraltar and others) can be crossed without your own ships where there is a **ferry** (a harbour on either side owned by you, an ally or someone granting passage), at 2 days per 10,000 men or part. An enemy fleet in the strait closes it.

### What stops an army

When an army arrives in a province, the checks run in this order: enemy army here, enemy garrisoned castle here, border closed, snow pass closed, halt when the enemy is seen, food runs out. When a check stops a march, the rest of the route stays drawn in grey so one order resumes it.

- **Enemy armies** stop you only in the province they stand in.
- **Castles always block.** An army that enters a province with an enemy garrisoned castle stops there, and no army marches on past until the castle is taken (stormed, surrendered or bribed). While there it can only stay (besiege or wait), go back the way it came or into a neighbour it came from or its side holds, or march on once the castle has fallen. A castle with no garrison doesn't block. An ally's garrisoned castles block that ally's enemies the same way. The planner treats every such province as the end of a route and shows "stops at Langres on day 14 until the castle falls". An arrival in the middle of a day counts as that day, so 13.5 days is day 14.
- **Borders.** An army may enter its own land, its subjects', the land of an enemy at war with it, rebel-held provinces, an ally's land or a realm granting passage, and land nobody owns, and no other realm's land. No order can march an army into any other realm, not even as an act of war: declare war or get passage first. If passage is withdrawn while it marches, the army stops at the border that day. If a destination can't be reached without passage, the planner routes round or says "needs passage from Savoy".
- **Snow.** If a pass closes while an army is in it, the army stops and winters there, hungry.
- **Halt when the enemy is seen** stops the army in the province before the one where an enemy is seen.
- **Food.** An army whose food runs out on its route is not stopped; its route turns red from that step and you get one notice.

What an army eats from depends on the land: its own land feeds it from the locals and refills it; a subject's land uses the reserve unless the subject's terms feed it; enemy, rebel-held and unowned land use the reserve and then plunder; an ally's or passage land use the reserve.

### Meeting the enemy

**Withdrawing.** Before a battle each side checks its standing order "retreat if outnumbered" against what it sees, a rumour counting at its shown size. Only an outnumbered side wants to go; the stronger side never withdraws. A side that wants to go steps back to the province it came from, or if it was standing still to the friendly neighbour with the fewest enemies. It gets away only if its commander's Cunning is higher than the enemy's and it isn't trapped; otherwise it fights.

**Broken armies.** A side that breaks in battle drops half its wagons, and its guns if the winner held the field with horse. It marches on forced march by the fastest route to the nearest **refuge** (an own-side province with a castle, or any own-side province with no enemy) up to 3 steps away, never through an enemy castle. While broken it takes no orders, doesn't besiege and doesn't stop for its own side's castles. An enemy that meets it fights at once; the broken army can't withdraw and breaks again at the first lost sector. With no refuge within 3 provinces, it surrenders: its men become prisoners and its commander is captured, unless he has Cunning 4 or more and gets away alone to the capital. At the refuge it becomes an ordinary army again and fled men who come back rejoin it.

**Interception.** Once a day an army with standing order "attack" looks at seen enemies in neighbouring provinces (an army known only as a rumour is never a target) and turns to march on one if it isn't on a player route (or Attack on the way is set), its men are at least the enemy's (or what its AI personality's retreat ratio allows), and its step there is shorter than the enemy's remaining step. An army on "wait" never intercepts.

**Chasing.** An army following an enemy re-plans its route each day to where the enemy was last seen. If the enemy vanishes from sight, the follower walks to where it was last seen and stops there with a notice.

**Friends and neutrals** in the same province don't fight or block, and share the province's forage limit by men.

### Food on the road

The route preview shows the food reserve on arrival at each province, counting meals abroad, refills at home and the forage limit: **green** while it covers the march, **yellow** under half, **red** where empty. On a route that leaves your land, the **point of no return** is flagged: the last province from which the army can still get home before its reserve runs out. **Refill and go** adds a stop at your castle with the most food above its siege reserve, or the richest of your provinces on the route, and waits a day per 10 % of the reserve refilled. Marching through your own provinces refills the reserve at each weekly step, not only where it stops at month end. A route that stops at a castle abroad shows its colour for the end of the turn there.

### Splitting and joining

Splitting an army takes 2 days before W14 Army divisions and no time after, and each half gets its share of food, wagons and companies. The commander stays with the half you pick; the other needs a captain or new commander, or is led by its senior company captain with Cunning 0. Joining two armies in one province takes 1 day: food and wagons add up, the commander with more victories leads, and the other becomes a captain if there is room.

### Moving many armies

- **March together**: several armies get one destination, each with its own route. With "arrive together" on (the default), the faster ones start later so all arrive the same day, and that day is shown.
- **Rally point**: armies march there and join on arrival in the order they come.
- **New regiments go to**: set a province (or one per front) and trained regiments march there on their own when ready and join the army standing there. Newly raised levies don't: they wait in their province as its garrison until a commander picks them up (see [Recruiting](Recruiting)).
- **Fronts** (W14): draw a line of provinces and give it armies, which split it into even stretches, march to the middle of their own stretch, intercept only within it and retreat to a castle on the front.

### Orders

You can change an army's orders as often as you like before ending the turn; the last order stands. Every army can **March to** (fastest route to a province it may enter; marching to the province it stands in is a Halt), **March by** (through waypoints), **Halt** (stop, keeping the rest of the route greyed), **Return home** (to the nearest own province with a castle) and **Follow / Join** (follow a friendly army and join when you meet, or chase an enemy). Horse-only armies can **Raid**, walking each step at raid pace and then spending 7 days in each province they enter before riding on. Any army in a province with an enemy castle can **Besiege**, and can't march on until the castle falls. Armies in a port with ships, or at sea, can **Board ships / Land**.

To stop a march, tap **Halt** beside Move on the army's card, tap **Halt it where it stands** in the commander list, and it stops on the spot. A fleet under sail has **Stop here** beside Sail on its card. These show only while there is a route to cancel.

Each army remembers two route settings: **Pace** (Normal, Forced, Careful) and **On the way** (keep marching, halt when the enemy is seen, attack what we see). There are no standing orders beyond warfare's. Every order is data, the same for player and AI; an AI army's standing orders come from its realm's personality.

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

The Bastard of Burgundy (Cunning 2) leads 8,000 men, seen by France only as a rumour of "about 6,000 near Beaune". His standing order is retreat if outnumbered 3 to 2. When he stands in Langres at the end of day 22 he wants to withdraw (14,200 against 8,000 is more than 3 to 2), but must fight because his Cunning is lower than Dunois'. The garrison joins him from the walls, and while the battle runs the month slows to 4-hour steps, where the player can change standing orders or order a retreat. If Dunois wins and the castle falls, tapping the grey leg resumes the march to Dijon.

## What you see

- **Selecting an army**: tap it (banners take big taps) or tap its commander in the Army list, and its card slides up halfway; provinces it could reach this turn are lightly shaded, those next turn lighter still. Selecting never moves or zooms the map. Select several armies at once with more taps or a drag-box and give them one march order together.
- **Drawing a route**: drag from the army's banner and the route is drawn live with days and food on arrival, set when you lift, cancelled by dragging back onto the army. A drag that doesn't start on the banner pans the map. Tapping a province draws the same route and waits for confirmation. Drag the middle of a route to add a waypoint; drag a waypoint off to remove it. A two-finger tap deselects.
- **The order pill**: at least 44 points high, at the route's end, with March and its days, pace, on the way and cancel. Changing a setting redraws the route and its days at once.
- **The route preview**: a light dashed line over a dark outline, so it shows on every map colour; turn marks (every 7 days) where the army will stand at the end of this and each later turn; day counts at each province and the total; food colour and the point-of-no-return flag; icons for river, snow pass, stopping castle, border needing passage and enemy seen (with shown size); other selected armies' routes thinner in the same colour.
- **Stacked armies**: one banner with total men and number of armies; tapping opens a picker (name, men, food, commander) with Select all here and, at region zoom, Select all in sight.
- **Zoom**: at world zoom, arrows thick by men and coloured by owner, long routes in weeks; at region zoom, the full preview; at local zoom, marching columns as sprites sized to the army.
- **Watching the turn**: when the turn ends its week plays at about one second per 10 days with a skip button, the date ticking one day at a time while armies walk their routes. The army walks exactly the route the preview showed. While one of your battles runs, the playback slows to 4-hour steps where you can change standing orders, retreat or switch battles. Battles between other realms only flash for half a second, and stopping castles ring red. Any battle can be replayed from its notice.
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
- [Time-and-Turns](Time-and-Turns): the weekly turn, real month lengths, turn order and seasons.
- [Map and Map Modes](Map-and-Lenses) and [Screens-and-Navigation](Screens-and-Navigation): the route preview, replay and notices.
- [Rebellions](Rebellions): rebel-held provinces may be entered and plundered.

## Numbers

Every value the game uses, made from its config so it always matches the game: [Troop movement data](Data-Troop-Movement). How they combine: [Formulas](Formulas).

Values live in `packages/rules/data/domain/troop-movement.json`. Values marked provisional may change in balancing.

| What | Value | Status |
|---|---|---|
| Days in a turn | 7 (a week) | fixed |
| Days in a month | the real length, 28 to 31 | fixed |
| Days per crossing | 6 | fixed |
| Days to cross by ground | farmland 1, hills 1.5, forest 2, mountains 3, dunes 3 … | provisional |
| Horse speed bonus | 0.5 | provisional |
| Column too big for the forage limit | +1 crossing | fixed |
| River days | 1 per 10,000 men, 2 for a great river or a ferry | provisional |
| Road | 1 / 0.75 / 0.5 / 0.4 / 0.1 | provisional |
| Season | ×2 winter; ×1.25 wet season | provisional |
| March order | Normal 1, Forced 0.67, Careful 1.33, Raid 0.67 | provisional |
| Guns | ×1.25 | fixed |
| Cunning | 0.05 a point | provisional |
| Flood | 3 months | provisional |
| Frozen rivers | latitude 55° or more, December to March | provisional |
| Battle steps | six 4-hour steps a day while your battle runs | fixed |
| Raid stay | 7 days per province | provisional |
| Refuge search | 3 steps | provisional |
| Split / join | 2 days / 1 day | provisional |
| Refill and go | 1 day per 10 % of the reserve | provisional |
| Replay speed | 1 second per 10 days, battles flash 0.5 s | provisional |
| Boarding / landing | a day per 5,000 men; ×2 landing with no port | provisional |
| Captured commander escapes | Cunning 4 | provisional |

The march code also uses warfare's food values: 2 rations a soldier, 3 a horse, 2 months carried and 5 % less food per Logistics point.

## Still open

Nothing in troop movement is waiting on a decision; the provisional numbers above are tuned in balancing.

## For developers

- Spec: `domain/troop-movement/spec.md` in the game repository.
- Features: `domain/troop-movement/features/`, including `day-loop.feature`, `step-days.feature`, `what-stops-an-army.feature`, `movers.feature` and the worked example `dunois-1450.feature`.
- Code: `packages/engine/src/domain/troop-movement/` (`model.ts`, `planner.ts`, `day-loop.ts`, `food.ts`, `army-rules.ts`, `army-ops.ts`, `many.ts`, `orders.ts`, `preview.ts`), with balance numbers in `packages/rules/data/domain/troop-movement.json`. The older march code in `packages/engine/src/march.ts` and `turn.ts` is replaced by these rules.
