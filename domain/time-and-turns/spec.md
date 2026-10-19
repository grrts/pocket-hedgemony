# Time and turns (TIME)

## 1. Purpose and scope

This context owns the game clock: the calendar, one week (7 days) per turn on the real calendar (months of 28 to 31 days), the
cadences on which other contexts run (day, week, month, season, year), the order of a turn as far as the
designs fix it, battles fought over time inside the month, seeded randomness and determinism, the start
and end of a campaign, and the ages and eras that are tied to the calendar.

Gap list item 20 ("The order of a turn [New doc]") said no document set the global order in which systems
run inside one turn. Cross-context decision X-2 (`domain/DECISIONS.md`) now sets it, and this spec follows
it (D-TIME-2). Section 9 lists every "each day / week / month / season / year" statement in the designs and
where it sits in that order.

**In scope**
- The calendar: date (year, month), turn counter, months of their real length (28 to 31 days, Gregorian leap years), the start date and the end date.
- The End turn pipeline: orders as data, applied only at End turn, rejected orders reported, orders frozen
  while the turn runs, End turn blocked by unanswered events.
- The day loop that plays out a month, and the shared clock for every mover.
- Battles fought round by round inside the month, and slowing the day to 4-hour steps while a player battle runs.
- Determinism: seeded `Rng`, fixed phase order, `hashWorld()`, nothing outside the engine changing it.
- Cadences (daily, weekly, monthly, seasonal, yearly, five-yearly) and the season and hemisphere calendar.
- Ages (event tree) and eras (research and warfare) as calendar-bound situations, and the 1939 cut-off.
- Campaign end at the end date.

**Not in scope (owned by …)**
- What each system does on its tick (owned by each system's context: province, trade, warfare, …).
- How armies, fleets and traders move inside a day (troop-movement, naval, trade).
- How a battle is fought (warfare); the battle viewer and its screens (game-shell).
- What a save holds and when save files are written (saves); this context only states that a turn boundary
  is the only save point.
- What each event does and how ages change the event pool (events).
- Victory scores and how they are measured (realm, country stats 12); this context only owns *when* the
  campaign ends.
- Frame and turn-time budgets (map-presentation).

## 2. Sources

Newest decision first.

0. `domain/DECISIONS.md` (17 Oct 2026): X-1 battles in the turn, X-2 turn order, X-3 weeks, X-4 seasons
   and harvest, X-5 start date, X-6 trade v2 (no yearly trader paths), X-12 how a campaign is won, X-14
   content after 1939, X-15 settings never change results.
1. `planning/gap-lists.md` v2 (16 Oct 2026): "Decisions already made" (campaign span, 31 August 1939 end date
   as one setting, out-of-scope content); List 1 A3 (one month per turn, battles one at a time), A4
   (multiplayer-friendly: deterministic, no player-only shortcuts, orders as data), item 20 (turn order),
   items 22–24 (Era VIII dropped, Era VII cut at 1939, event tree after 1939 out of scope).
2. `screen-flow/screen-flow-design.md` v1 §2, §4.6 (G5 turn in progress, G6 battles, decided 16 Oct; G7
   events; G8 turn report; G9 attention), §5 (E1, E2), §6 R1, §10, §11.
3. `save-system/README.md` (second draft, 16 Oct) §1 principles, §2.3, §3.1–3.2, §4.3, §4.4.
4. `troop-movement/troop-movement-design.md` v1 §1, §2 (day loop), §3.1 (season factor), §4.2–4.3
   (passes, seasons), §6.3, §10.6, §11.2, §13, §15.
5. `warfare/warfare-design.md` v5 §5.1, §6, §7.1, §7.15, §8.3, §9.2, §11.3, §16, §19.
6. Repository: `README.md` (Determinism; "starting in spring 1444"), `packages/engine/src/turn.ts`,
   `packages/engine/src/rng.ts`, `packages/rules/data/defines.json` (`startDate`).
7. Event tree: `event-tree/README.md` (ages and periods as situations), `event-tree/data/balance.yaml`
   (`pool_roll_interval_months`), `event-tree/generated/ages_and_periods.md`.
8. "Each month / season / year" statements in: `province-stats` §6.1, §6.2, §17; `buildings` §2, §15.3–15.4;
   `trade` §4.3, §13.3; `naval` §7.3, §11; `exploration` §5.3, §7; `culture` §3, §9; `religion` §14;
   `diplomacy` §2.3, §6.8, §6.11, §9, §12.3, §13.2, §15; `subjects` §3, §11; `rebellions-design` §1, §3, §5;
   `recruiting` §2, §11; `revolutions` §7.1; `achievements` §5.1; `tutorial` §5.2; `music-design` §5.1;
   `country-stats` §3.4, §12; `country-stats/research-tree.md` (era dates); `settings` §1, §4.3, §5.3.
9. `country-catalogue/README.md` and `country-relations/README.md` (reference day 11 November 1444).

## 3. Ubiquitous language

| Term | Meaning | Not to be confused with |
|---|---|---|
| Turn | One calendar month of game time, ended by the player's End turn | A day of the day loop; a battle "bell" |
| Date | Year and month of the campaign (the engine keeps `{year, month}`) | The real date a save was written |
| Day loop | The day passes (28 to 31) that play out a month, one per day, in which every mover takes its day step | The monthly phases |
| Day step | One mover's one day inside the day loop | A "step" of a route (a march from one province into the next) |
| Mover | Anything with a place, a route, progress, step days, may-enter and stops-at rules: armies, fleets, trade ships, traders | A unit that is cargo aboard ships |
| Progress | Days already walked or sailed toward the next place; carries over between months | A colony's founding progress (exploration) |
| Phase | A monthly step of the engine's turn (orders, marches, economy, levies, date) | A day step |
| Stage | One of the nine parts of a turn in order: orders, day loop, monthly, seasonal and yearly steps, events, achievements, autosave, the date (X-2) | A phase of the engine |
| Cadence | How often a system's step runs: daily, weekly, monthly, seasonal, at the harvest, yearly, five-yearly | — |
| Week | One turn: 7 days of the day loop (X-18) | A calendar week from Monday |
| Season | Three months. North: spring March–May, summer June–August, autumn September–November, winter December–February; the south the other way round, by the province's latitude (X-4) | Wet season (defined per climate) |
| Harvest month | September in the north, March in the south; rice paddies harvest in both (D-TIME-5) | — |
| Battle step | A 4-hour step while a battle the player's army or fleet is in runs: time keeps passing, the player may change standing orders, retreat or switch battle; there is no skip (X-1) | The battle report |
| World domination | Owning or holding as subjects half of the world's settled land provinces; checked each January turn (X-12) | Best at the end |
| Best at the end | On 31 August 1939 the realm leading the Economy, Power or Technology score wins in that score; ties share (X-12) | — |
| Winter | December to February in the north, June to August in the south | Snow-pass closure (December to March / June to September) |
| Wet season | By climate: monsoon Asia June–September, Sahel and savanna July–September, Amazon December–May (config) | Winter |
| End turn | The player's (or AI's) act that sends the month's orders and starts the turn | Turn report |
| Order | A command sent as data, the same for player and AI, applied only at End turn | A standing order (warfare) |
| Rejected order | An order the engine refused, with a reason, listed in the turn report | — |
| Player battle | A battle in which the player's armies or fleets fight | A battle between other realms |
| Seeded randomness | Random numbers drawn only from the campaign's `Rng` | Platform `Math.random` |
| `Rng` | The engine's xoshiro128** generator whose whole state is four uint32s | — |
| World hash | `hashWorld()`: a hash of the world state, equal for equal worlds | `rulesHash`, `mapHash` (saves) |
| Turn boundary | The point between two turns: the only point a save can represent | — |
| Start date | The first date of every campaign, the tutorial included: 11 November 1444 (X-5) | — |
| Reference day | 11 November 1444: the day the country catalogue and relations describe; the same as the start date | — |
| End date | The date the campaign stops; default 31 August 1939, one setting chosen at campaign start | Game over (the player's realm is gone) |
| Age | An event-tree situation with a baseline, a window, start and end conditions and forced start and end dates | An era |
| Era | A dated band of the research and warfare trees that follows the calendar: I 1378–1500 … VII 1914 to the end date (X-14) | An age |
| Out of scope | Content after 31 August 1939: Era VIII, the 1939–1960 part of Era VII, the Second World War events and the Decolonization, Cold War and Globalization ages | — |

## 4. Domain model

### Aggregates

**Campaign clock** (identity: the campaign id)
- Holds: `turn` (integer, starts at 0 in the engine), `date` (year, month), `startDate`, `endDate`,
  the `Rng` state (four uint32), and the campaign's phase position (between turns, running, stopped at a
  battle).
- INV-TIME-1: `date.month` is 1 to 12.
- INV-TIME-2: Each processed turn adds exactly one to `turn` and advances the date by exactly 7 days (fewer only for the last turn).
- INV-TIME-3: `startDate` ≤ `date` ≤ `endDate`; no turn is processed after `endDate` is reached.
- INV-TIME-4: The `Rng` state is part of the world and is the only source of randomness in a turn.
- INV-TIME-5: A save represents the world only at a turn boundary, never inside a turn.

**Turn** (identity: campaign id + turn number)
- Holds: the queued orders, the rejected orders with reasons, the day position (0 to the month's length), the list of
  battles in the order they happen, and the reports produced.
- INV-TIME-6: Orders are applied only when the turn starts (at End turn), never while the player is giving
  them.
- INV-TIME-7: Orders are frozen from End turn until the turn ends.
- INV-TIME-8: The same world, the same orders and the same `Rng` state always give the same world hash.
- INV-TIME-9: Every mover stands in exactly one place (land province or sea zone) at the end of every day.

### Entities and value objects

- **Date** (value): year, month. December is followed by January of the next year.
- **Order** (value): type and payload, for example `{ type: "move", army, to }`; sent by an acting nation.
- **Rejected order** (value): the order and a plain-language reason.
- **Cadence** (value): daily · weekly · monthly · seasonal · harvest · yearly · five-yearly · per-event.
- **Hemisphere season calendar** (value, config): season names by hemisphere; season start months (March,
  June, September, December); harvest month per hemisphere; winter months per hemisphere; snow-pass closed
  months per hemisphere; wet-season months per climate.
- **Campaign win** (value): nation, way (world domination or best at the end), date.
- **Age** (entity, owned by events, read here): id, baseline span, window, forced start year, forced end
  year, regions. In scope: Gunpowder Empires, Exploration, Reformations, Atlantic Empires, Crisis and
  Absolutism, Revolutions, Industrialization, Imperialism, World Wars. Out of scope: Decolonization, Cold
  War, Globalization.
- **Era** (value, owned by research/warfare, read here): I 1378–1500 · II 1500–1600 · III 1600–1700 ·
  IV 1700–1800 · V 1800–1870 · VI 1870–1914 · VII 1914 to the end date. Era VIII is dropped (X-14).

### Domain services

- **Turn processor** (`processTurn`, `runTurnPlan`): runs the stages of X-2 in order: orders, the day loop,
  monthly, seasonal and yearly steps, events, achievements, autosave, then advances the date and the turn
  counter.
- **Day loop**: runs one pass per day of the turn (7) for all movers in kind and id order; runs the weekly
  steps once at the end of the turn; while a player battle runs, splits each day into six 4-hour steps.
- **Seeded random source** (`Rng`): xoshiro128**; a single seed is spread over four words with splitmix32.

## 5. Requirements

### 5.1 Calendar and campaign span

- TIME-001 (Ubiquitous): A turn shall be one week: the day loop plays 7 days per turn, the first turn starting on 11 November 1444 and the last ending on the end date, which may make it shorter. [X-18]
- TIME-002 (Ubiquitous): The game shall play out each month as its real number of days, 28 to 31, with Gregorian leap years applied to every year (no 1582 switch); things measured per day use the real count and things measured per month stay one amount per month. [X-3]
- TIME-003 (Event-driven): When a turn is processed, the game shall advance the date by 7 days and add one to the turn counter. [X-18]
- TIME-004 (Event-driven): When the date passes the last day of a month, the game shall go on with the 1st of the next month, and from 31 December to 1 January of the next year. [X-3; X-18]
- TIME-005 (Ubiquitous): The game shall start every campaign, the tutorial "The Year of Varna" included, on 11 November 1444, with the turn counter at 0. [X-5; D-TIME-1; country-catalogue reference day]
- TIME-006 (Ubiquitous): The campaign end date shall default to 31 August 1939 and be kept as one setting chosen when the campaign starts and saved with it. [gap-lists decisions; screen-flow E2, S5; settings §4.3; save-system §4.2 `options.endDate`]
- TIME-007 (Event-driven): When the end date is reached, the game shall end the campaign: the final wrap-up event or events, the closing sequence and the final result. [screen-flow E2]
- TIME-008 (Unwanted): If the end date has been reached, then the game shall not process any further turn ("no play on past the end date"). [screen-flow E2]
- TIME-009 (Ubiquitous): The game shall contain no content after 1939: no Era VIII, no 1939–1960 part of Era VII, no Second World War events and no Decolonization, Cold War or Globalization ages. [gap-lists decisions, items 22–24]
- TIME-010 (Event-driven): When a January turn finds a realm owning or holding as subjects half of the world's settled land provinces, the game shall declare its world-domination win at once and let the campaign go on to the end date. [X-12; D-TIME-10]

### 5.2 Orders and End turn

- TIME-011 (Ubiquitous): The game shall represent every command that changes the world as an order that can be sent as data, with the same orders for the player and the AI. [gap-lists A4; troop-movement §9.3]
- TIME-012 (Ubiquitous): The game shall apply orders only at End turn; orders given during a turn are queued, not applied. [save-system §3.1; turn.ts]
- TIME-013 (Event-driven): When End turn is given, the turn processor shall apply the queued orders before any other stage runs. [turn.ts `processTurn`; X-2]
- TIME-014 (Unwanted): If an order cannot be applied, then the turn processor shall reject it with a plain reason and report it in the turn's result, and the rest of the turn shall still run. [turn.ts `rejectedOrders`]
- TIME-015 (Event-driven): When an army that is already marching gets a new move order, the new order shall replace the old one, from the tile the army stands on. [playtest feedback F-1; turn.ts `orderMarch`]
- TIME-016 (State-driven): While a turn is being processed, the game shall keep orders frozen while the map can still be panned and zoomed. [screen-flow G5]
- TIME-017 (Unwanted): If any event is unanswered, then End turn shall not end the turn but open the first unanswered event instead; nothing answers an event for the player. [screen-flow §4.6, decided 16 Oct]
- TIME-018 (Optional): Where the End turn confirmation setting is on, the game shall ask before ending the turn and name the count of open warnings; warnings shall never block the turn. [screen-flow §4.6, G9; settings §5.3]
- TIME-019 (Ubiquitous): Within a turn the game shall present, in this order: the turn in progress, each player battle followed as it runs, then the events, then the turn report; events and report are skipped when empty. [screen-flow §2, §4.6]

### 5.3 The day loop

- TIME-020 (Ubiquitous): The game shall play out the month day by day for every mover at once. [troop-movement §1, §2.1]
- TIME-021 (Ubiquitous): On each day the game shall run, in this order: (1) move (armies, then fleets, then traders, then exploration ships), (2) stop checks for arrivals, (3) contact, (4) battles, (5) standing orders; sieges update once a month, in the monthly steps before province. [troop-movement §2.1; X-2]
- TIME-022 (Ubiquitous): Armies, fleets, trade ships and traders shall all take their day step in the same day loop (one clock). [troop-movement §11.2; naval §7.1; trade §1]
- TIME-023 (Ubiquitous): The day loop shall decide where movers are, who meets whom, and which battles are fought; army food and hunger run weekly (TIME-044), and sickness, the siege month and pay run once a month. [troop-movement §2.1; warfare §16; X-2; X-3]
- TIME-024 (Ubiquitous): Days walked toward the next place shall carry over into the next turn. [troop-movement §2.3]
- TIME-025 (State-driven): While a battle lasts, the armies in it shall not move. [troop-movement §2.1; warfare §7.1]
- TIME-026 (Ubiquitous): Every mover shall be in exactly one place at the end of every day, never between two. [troop-movement §2.2, §11.1] *Replaced in part by MOVE-123 (one tile, so one province) (playtest feedback).*

### 5.4 Battles inside the turn

- TIME-027 (Ubiquitous): A battle shall start on the day the day loop brings two hostile armies together and be fought over time, one round per 4-hour step (six a day), until one side is beaten or retreats. [X-1; warfare §7.15]
- TIME-028 (State-driven): While a battle the player's army or fleet is in runs, the game shall play each day as six 4-hour steps, each moving every other mover a sixth of a day and fighting one round of every running battle; armies of a battle's sides that reach its place join it; the player may change its standing orders or order a retreat at any step, and the result cannot be skipped; the turn never stops. [X-1]
- TIME-029 (Ubiquitous): Battles between AI realms shall never slow the game: each day they fight their six rounds at once inside the normal day loop, and other armies can join them at the start of a day. [X-1]
- TIME-030 (Event-driven): When a turn killed during a battle is replayed from the pre-turn save, the game shall reach the same battle with the same result. [screen-flow G6, R1; save-system §3.2]
- TIME-031 (Ubiquitous): Each battle's result shall be worked out when it ends, with the standing orders it was fought with. [warfare §16; X-1]

### 5.5 Determinism and randomness

- TIME-032 (Ubiquitous): The turn processor shall use only seeded randomness from the campaign's `Rng` and plain arithmetic. [README Determinism; turn.ts]
- TIME-033 (Ubiquitous): The turn processor shall run its phases in a fixed order. [README Determinism]
- TIME-034 (Ubiquitous): The same world and the same orders shall always give the same `hashWorld()`. [README Determinism; save-system §1.1]
- TIME-035 (Ubiquitous): The `Rng` shall give the same sequence from the same seed on every platform; its whole state is four uint32s, and a single seed is spread over them with splitmix32. [rng.ts]
- TIME-036 (Ubiquitous): The `Rng` state shall be saved with the world (the `core` chunk), so a loaded campaign continues the same sequence. [save-system §4.3, §4.4; rng.ts]
- TIME-037 (Ubiquitous): Nothing outside the engine (music director, interface, settings) shall change the simulation. [music-design §5.1; settings §1.6]
- TIME-038 (Ubiquitous): Anything that changes rules, balance or AI shall be a campaign rule chosen at new game and saved in the campaign, never a setting. [settings §1.6, §4.3]
- TIME-039 (Ubiquitous): The game shall offer no player-only shortcut: the AI gives the same orders through the same pipeline. [gap-lists A4; troop-movement §9.3]

### 5.6 Turn boundaries

- TIME-040 (Ubiquitous): A turn boundary shall be the only point a save represents; nothing is saved halfway through a turn. [save-system §1.1]
- TIME-041 (Unwanted): If the app is killed while a turn is processed, then the turn shall be processed again from the last turn-boundary save with the same orders, giving the same result; if the app is only backgrounded, the turn pauses with it and carries on. [save-system §3.2; screen-flow R1; D-TIME-7]
- TIME-042 (Event-driven): When a balance change is loaded with a campaign, the changed rules shall apply from the next turn on. [save-system §4.4]

### 5.7 Cadences

- TIME-043 (Ubiquitous): The game shall run daily steps inside the day loop: marching armies, sailing fleets, travelling traders and the interception look of armies set to attack. [troop-movement §2.1, §6.3; naval §11; warfare §16]
- TIME-044 (Ubiquitous): The game shall run weekly steps once at the end of every turn, for: army food taken at home and the reserve shrinking abroad, hunger, plunder of one tile a week, raids (a week in each province), forced-march desertion, and plague while an outbreak runs. [warfare §5.1, §6.2–6.4, §9.2; province-stats §17; X-3; X-18]
- TIME-045 (Ubiquitous): The game shall run monthly steps once, at the end of the turn in which a new month begins, for every context that states one (section 9), so monthly amounts keep their size. [section 9 sources; X-18]
- TIME-046 (Ubiquitous): The game shall run seasonal steps in the turn in which a season begins: 1 March, 1 June, 1 September or 1 December. [buildings §2 "a full season (3 months)"; province-stats §6.2, §17; subjects §11; diplomacy §2.3; X-4]
- TIME-047 (Ubiquitous): The game shall run yearly steps in the turn in which 1 January falls (the January turn). [province-stats §17; buildings §15.4; culture §9; religion §14; diplomacy §15; X-4]
- TIME-048 (Ubiquitous): The game shall run five-yearly steps for the culture engine-raised checks in the January turn of every year divisible by five. [culture §9; D-TIME-6]
- TIME-049 (Ubiquitous): Pool events shall roll against their `mean_years` once a month (`selection.pool_roll_interval_months` = 1). [event-tree balance.yaml] @placeholder

### 5.8 Ordering constraints the designs state

- TIME-050 (Ubiquitous): Achievement tests shall run at the very end of the turn, after the turn's own systems, so they read final values. [achievements §5.1]
- TIME-051 (Ubiquitous): Attention and tutorial checks shall be read each turn after that turn's simulation. [tutorial §5.2]
- TIME-052 (Ubiquitous): The trade ratio update shall run each month after the day loop. [trade §4.3]
- TIME-053 (Ubiquitous): The buildings step shall run after the province step, so slots of a building finished this month take overflow from the next month on. [X-2; buildings §15.4]
- TIME-054 (Ubiquitous): Culture drift shall run once a year after births and deaths. [culture §9]
- TIME-055 (Ubiquitous): The faith mix shall update once a year, in the January turn, after culture drift. [religion §14; X-2; X-6]
- TIME-056 (Ubiquitous): The turn shall run, in this order: (1) orders, (2) the day loop, (3) monthly steps in the context order province, buildings, recruiting, realm, research, trade, subjects, government, diplomacy, culture, religion, rebellions, revolutions, (4) seasonal steps, (5) yearly steps, (6) events, (7) achievements, (8) autosave, (9) the date moves to the next month; the engine's marches are the day loop, its economy and levies are monthly steps. [X-2; turn.ts; D-TIME-14]
- TIME-057 (Event-driven): When a diplomatic proposal is sent, its answer shall arrive the turn after it is given. [diplomacy §13.2, §13.3]

### 5.9 Seasons and calendar effects

- TIME-058 (Ubiquitous): Winter shall be December to February in the north and June to August in the south. [troop-movement §3.1]
- TIME-059 (Ubiquitous): A snow-peak province with no pass and no road shall be closed from December to March in the north and from June to September in the south. [troop-movement §4.2]
- TIME-060 (Ubiquitous): Wet seasons shall follow climate: monsoon Asia June to September, the Sahel and savanna July to September, the Amazon December to May (config). [troop-movement §4.3]
- TIME-061 (Ubiquitous): The harvest shall be rolled in September in the north and in March in the south, and rice paddies shall harvest twice a year, in March and September. [country-stats §3.4; province-stats §5.1; X-4]
- TIME-062 (Optional): Where the autosave interval is "every 12 months", the autosave shall fall in each January turn; the rotating autosave is measured by the date (every month, 6 months or 12 months), never by counting turns. [X-18] [save-system §2.3; settings §5.3]

### 5.10 Ages and eras on the calendar

- TIME-063 (Ubiquitous): Ages shall start and end by their own conditions inside their window, and shall be forced to start or end by their forced dates so a stalled game still advances. [event-tree README "Ages and periods"]
- TIME-064 (Ubiquitous): Ages may overlap, and a period may belong to several ages. [ages_and_periods.md]
- TIME-065 (Ubiquitous): Research and warfare eras shall follow the calendar in the dated bands I from the start to 1500 (1378–1500; a campaign that starts in 1444 begins inside it), II 1500–1600, III 1600–1700, IV 1700–1800, V 1800–1870, VI 1870–1914, VII 1914 to the end date. [research-tree; gap-lists items 22–23; X-14; research D-RSCH-23]

### 5.11 Decided rules

- TIME-066 (Ubiquitous): Any battle of the turn, the player's or between AI realms, shall be replayable afterwards from its notice, with the same result. [X-1]
- TIME-067 (Ubiquitous): The turn processor shall take the player's orders first, then each AI realm's in ascending nation index, each realm's orders in the order given. [X-2; D-TIME-12]
- TIME-068 (Ubiquitous): Within a day, movers shall take their step by kind (armies, fleets, traders, exploration ships) and, within a kind, in ascending id; ties on the same day go by that order. [X-2; D-TIME-13]
- TIME-069 (Event-driven): When the campaign reaches its end date, the game shall judge the Economy, Power and Technology scores, and the realm leading each score shall win in it, with no margin needed and ties sharing the win. [X-12]
- TIME-070 (Ubiquitous): Setup and warm-up before the first turn shall draw from the campaign's one `Rng` and shall move neither the date nor the turn counter. [D-TIME-11]
- TIME-071 (Ubiquitous): The month shall play back as the day loop runs, at about 1 second per 10 whole days (`playback.secondsPer10Days`), slowing to 0.5 seconds per 4-hour step (`playback.secondsPerBattleStep`) while a player battle runs; it never pauses. [X-1; troop-movement §10.6; D-TIME-15] @placeholder
- TIME-072 (Ubiquitous): An age or period whose window opens before the end date shall be cut at the end date, and an age that would start on an event after the end date shall never start. [X-14; D-TIME-8]
- TIME-073 (Optional): Where several player battles run at once, the player shall be able to switch between them to follow each one and decide when to retreat; every running battle fights a round each step whichever is followed. [X-1]
- TIME-074 (Ubiquitous): Monthly, seasonal and yearly steps shall run once, at the end of the turn in which a new month, season or year begins, and no rule shall count in turns: every duration, delay or cadence is a span of time measured by the date; only orders, End turn and the turn report are per turn. [X-18]
- TIME-075 (Ubiquitous): The day loop shall let a caller play a turn one step at a time, a step being a day, or a 4-hour step while a player battle runs, and pause between steps; playing the whole turn at once gives the same result. [X-1; game-shell §11 request]

### Playtest feedback (17 October 2026)
Leroy's playtest feedback (DECISIONS.md, F-1 to F-22). It is the latest decision, so it replaces the requirements it names.

- TIME-076 (Event-driven): When End turn is given, the game shall show the date advancing day by day as the day loop plays (by 4-hour steps while a player battle runs), with movers, battles and sieges updated at each step; the date shall never jump to the end of the turn at once. [F-7; F-2]

## 6. Commands

| Command | Who issues it | Preconditions | Result | Events emitted |
|---|---|---|---|---|
| `EndTurn(orders, actingNation)` | Player; AI | Campaign between turns; no unanswered event (player); end date not reached | Orders applied (or rejected with reasons), phases run, date and turn advance | `TurnStarted`, `OrderRejected`*, `DayPassed`*, `PlayerBattleReached`*, `MonthEnded`, `SeasonEnded`?, `YearEnded`?, `TurnEnded` |
| `ChangeBattleOrders(battle, orders)` | Player | A player battle is running | Later rounds are fought with the new standing orders | — |
| `Retreat(battle)` | Player | A player battle is running | The battle ends at this step with a retreat | `BattleEnded` |
| `FollowBattle(battle)` | Player | Several player battles are running | The view follows that battle | — |
| `NewGame(seed, playerNation, options)` | Player (system on behalf) | Options include the end date | Campaign clock at `startDate`, `turn` 0, `Rng` seeded | `CampaignStarted` |
| `EndCampaign()` | System | `date` reached `endDate` | No more turns; best-at-the-end judged; final sequence | `CampaignEnded` |

Order types and their own preconditions belong to the context that owns them (for example `move` to
troop-movement). `NewGame`'s request shape is the one save-system §9 suggests for the worker protocol.

## 7. Domain events

| Event | When | Payload | Consumed by (context) |
|---|---|---|---|
| `CampaignStarted` | New game begins | campaign id, seed, start date, end date, player nation | saves, scenario-setup, game-shell |
| `TurnStarted` | End turn accepted | turn, date, orders | saves (pre-turn save), game-shell (turn in progress) |
| `OrderRejected` | An order can't be applied | order, reason | game-shell (turn report) |
| `DayPassed` | End of each day of the day loop | day 1 to the month's length | troop-movement, naval, trade, warfare |
| `PlayerBattleStarted` | A battle with the player's armies or fleets begins; days slow to 4-hour steps | battle id, day, province | game-shell (battle view), warfare, audio |
| `BattleEnded` | A side is beaten or retreats | battle id, day, step, how | game-shell, warfare |
| `WeekPassed` | Days 7, 14, 21 and 28 of the day loop (D-TIME-4) | week | warfare, province |
| `TurnPlayed` | The turn's 7 days done | turn, date | troop-movement, warfare |
| `MonthEnded` | The turn in which a new month begins, at its end | turn, month | every context with a monthly step |
| `SeasonStarted` | The turn in which 1 March, 1 June, 1 September or 1 December falls (D-TIME-5) | season by hemisphere | province, buildings, subjects, diplomacy, naval |
| `YearStarted` | The January turn (D-TIME-6) | year | province, buildings, culture, religion, diplomacy, realm (domination check), achievements (`year_end`) |
| `WorldDominationReached` | A January turn finds a realm at half the settled land provinces | nation, date | game-shell, achievements |
| `TurnEnded` | Date advanced | turn, new date, rejected orders | saves (Resume save), achievements (`turn_end`), onboarding (checks), game-shell (events, turn report), audio |
| `CampaignEnded` | End date reached | date, reason, winners by score | game-shell (E2, E3), achievements (`campaign_end`), events (wrap-up) |

## 8. Policies (reactions to other contexts)

- When `game-shell` reports an unanswered event, then `EndTurn` from the player is refused and the first
  unanswered event is opened.
- When `warfare` starts a battle that involves the player, then the day loop plays each day as six 4-hour
  steps until no player battle runs; it never stops.
- When `saves` loads a campaign, then the clock takes `turn`, `date`, options and `Rng` state from the `core`
  chunk and the queued orders from the orders journal.
- When `events` fires a forced age start or end date, then the age begins or ends regardless of its
  conditions (event tree owns the effect).
- When `settings` changes any value, then nothing in this context changes (settings never change the
  simulation).

## 9. The weekly turn

The order of a turn is X-2 (D-TIME-2): orders (the player's, then each AI realm's by nation index) → the day
loop (the turn's 7 days; each day armies, fleets, traders, exploration ships move in id order, then arrivals,
battles, standing orders; six 4-hour steps while a player battle runs; weekly steps once at the end) → monthly steps (warfare with sieges, naval and exploration first, as they close the day loop; then province, buildings, recruiting, realm, research, trade, subjects,
government, diplomacy, culture, religion, rebellions, revolutions) → seasonal steps (March, June, September,
December) → yearly steps (January; the harvest in March and September) → events, then the national strengths tick → attention checks →
achievements → autosave → the date moves on 7 days. Monthly, seasonal and yearly steps run only at the end of
the turn in which a new month, season or year begins (X-18). What each system does, and on what cadence:

| Cadence | Step | Context | Source |
|---|---|---|---|
| Per End turn, first | Apply queued orders; reject invalid ones | time-and-turns | turn.ts |
| Daily (28 to 31×) | Move · stop checks · contact · battle rounds (six a day) · standing orders | troop-movement, warfare | troop-movement §2.1 |
| Daily | Fleets move once a day | naval | naval §11 |
| Daily | Traders walk on the same day loop; collect in every province entered | trade | trade §1, §4.4 |
| Daily | Armies set to attack look at visible enemies in neighbouring provinces | troop-movement | troop-movement §6.3 |
| Weekly | Army eats; reserve shrinks abroad; refill at home | warfare | warfare §6.2–6.3 |
| Weekly | Hunger: desert 5 %, die 2 %, 1 in 10 horses eaten | warfare | warfare §6.4 |
| Weekly | Plunder burns one tile a week once the store is gone | warfare | warfare §6.3 |
| Weekly | Raid burns one tile a week, then moves on | warfare | warfare §9.2 |
| Weekly | Forced march: levies desert 2 % a week | warfare | warfare §5.1 |
| Weekly | Plague while an outbreak runs | province | province-stats §17 |
| Monthly | March rations eaten, hunger loss (engine today) | troop-movement | turn.ts `runMarches` |
| Monthly | Gold income from people and wealth, army upkeep (engine today) | realm | turn.ts `runEconomy` |
| Monthly | Levies recover a share of the maximum (engine today) | recruiting | turn.ts `runLevies` |
| Monthly | Births, deaths and overflow; homeless share moves | province | province-stats §6.1, §6.4, §17 |
| Monthly | Sickness on campaign | warfare | warfare §6.5 |
| Monthly | Siege month: garrison eats, besiegers eat, breaches, sally, terms, hunger, camp fever | warfare | warfare §8.3 |
| Monthly | Pay owed, months out, drill | warfare | warfare §2.1 |
| Monthly | Reserve rot 5 % a month | warfare | warfare §6.2 |
| Monthly | Storms at sea in storm season | warfare, naval | warfare §11.3; naval §7.3 |
| Monthly | Sailors in port and ship states | naval | naval §11 |
| Monthly | Building upkeep paid or unpaid; sites advance; finished buildings open slots before overflow | buildings | buildings §15.4 |
| Monthly | AI looks at one province per country for building | buildings | buildings §15.3 |
| Monthly, after the day loop | Trade ratio gain and decay | trade | trade §4.3 |
| Monthly | Trader upkeep | trade | trade §2.2 |
| Monthly | Colony progress +5, locals' pressure, colony eats 20 rations | exploration | exploration §5.3, §7 |
| Monthly | Recruit pool refill, *Fallen* and *Veterans* fading, training months, pay from the 4th month, pay spent at home | recruiting | recruiting §2, §11 |
| Monthly | Rising chance in plotting provinces; rebels join, spread, starve | rebellions | rebellions-design §1, §3, §5 |
| Monthly | Subject tribute from the subject's treasury | subjects | subjects §3 |
| Monthly | Fund rebels: gold, caught roll | diplomacy | diplomacy §6.11 |
| Monthly | Fund a revolution: gold, caught roll | revolutions | revolutions §7.1 |
| Monthly | AI with a free envoy seat scores candidate actions | diplomacy | diplomacy §12.3 |
| Monthly | Pool events roll against `mean_years` | events | balance.yaml |
| After the turn's systems | Attention and tutorial checks | onboarding | tutorial §5.2 |
| End of turn (last) | Achievement tests (`turn_end` and other moments) | achievements | achievements §5.1 |
| Seasonal | Famine check; stores rot | province, realm | province-stats §6.2; country-stats §3.4 |
| Seasonal | Farms, groves and fisheries make food | buildings | buildings §15.4 |
| Seasonal | Subject loyalty worked out | subjects | subjects §11 |
| Seasonal | Resident envoy +5; courting: loyalty step, 1 in 4 discovery | diplomacy | diplomacy §2.3, §6.8 |
| Seasonal | Lords lose loyalty while an army takes their grain | warfare, realm | warfare §6.3 |
| Seasonal | Pirate fleets grow by one | naval | naval §8 |
| Harvest (September north, March south) | Harvest rolled; collection; castle shares; spread | realm, province | country-stats §3.4; X-4 |
| Yearly (January) | World domination check | realm | X-12 |
| Yearly | Wares; neglect years; village works and craft buildings appearing; AI advice | buildings | buildings §15.4 |
| Yearly, after births and deaths | Culture drift | culture | culture §9 |
| Yearly, after culture drift | Faith mix and faith waves | religion | religion §14; X-6 drops the yearly traders |
| Yearly | Diplomacy fades; league checks | diplomacy | diplomacy §9, §15 |
| Every 5 years (January of years divisible by 5) | Culture engine-raised checks | culture | culture §9 |
| Turn end (presentation) | Battles → events → turn report | game-shell | screen-flow §4.6 |

## 10. Configuration

| Key | Meaning | Value in the design | Placeholder? | Config file |
|---|---|---|---|---|
| `startDate` | First date of every campaign | 11 November 1444 | No (X-5); `defines.json` matches | `time-and-turns.json` |
| `turnDays` | Days in a turn | 7 | No (X-18) | `time-and-turns.json` |
| `seasons.startMonths`, `seasons.harvestMonth`, `seasons.paddyHarvestMonths` | Seasonal and harvest months | 3, 6, 9, 12; north 9, south 3; 3 and 9 | No (X-4) | `time-and-turns.json` |
| `yearlyMonth`, `fiveYearlyEvery` | Yearly and five-yearly steps | January; years divisible by 5 | No (D-TIME-6) | `time-and-turns.json` |
| `turnStages`, `monthlyContextOrder`, `moverKindOrder` | Turn order | as X-2 | No | `time-and-turns.json` |
| `victory.dominationShare`, `victory.checkMonth` | World domination | half; January | No (X-12) | `time-and-turns.json` |
| `playback.secondsPer10Days` | Month playback speed | 1 | Yes | `time-and-turns.json` |
| `playback.secondsPerBattleStep` | Playback of one 4-hour step while a player battle runs | 0.5 | Yes | `time-and-turns.json` |
| `battleStepsPerDay` | Steps a day splits into while a player battle runs | 6 (4 hours each) | No (X-1) | `time-and-turns.json` |
| month length | Days in the day loop | 28 to 31, Gregorian | No (X-3); the engine uses the real length | `daysInMonth` |
| `options.endDate` | Campaign end date | 1939-08-31 (default) | No (decided) | save header / campaign rules |
| season calendar: winter months | Months that count as winter | Dec–Feb north; Jun–Aug south | No | troop-movement config (`seasonFactor`) |
| snow-pass closure months | Months snow peaks without pass or road are closed | Dec–Mar north; Jun–Sep south | No | troop-movement config |
| wet-season months | Wet season per climate | monsoon Asia Jun–Sep; Sahel/savanna Jul–Sep; Amazon Dec–May | Yes (config) | troop-movement config |
| `selection.pool_roll_interval_months` | How often pool events roll | 1 | Yes | `event-tree/data/balance.yaml` |
| autosave interval | Rotating autosave, measured by the date | every month / 6 months / 12 months (each January) / off; default 12 months | No (X-18) | settings |
| age windows | Baseline, window, forced start/end per age | see `ages_and_periods.md` | Event-tree data | `event-tree/data/ages.yaml` |

## 11. Seams

| Other context | Direction | Pattern | What crosses |
|---|---|---|---|
| troop-movement | downstream | Customer–Supplier | The day loop and day order; `DayPassed`; progress carry-over |
| naval | downstream | Customer–Supplier | Fleets' day step in the same day loop; monthly storm and ship-state steps |
| trade | downstream | Customer–Supplier | Traders' day step; monthly ratio update after the day loop; warm-up from the one `Rng` before turn 0 |
| warfare | downstream | Customer–Supplier | Battles fought round by round over time; 4-hour steps while a player battle runs; sieges once a month before province; weekly food and hunger (end of each turn); monthly siege month and sickness |
| province | downstream | Customer–Supplier | Monthly births and deaths; seasonal famine; yearly traders; weekly plague |
| buildings | downstream | Customer–Supplier | Monthly upkeep and sites; seasonal food; yearly wares and advice |
| realm | downstream | Customer–Supplier | Harvest month; monthly income; January domination check; scores judged at the end date (X-12) |
| recruiting | downstream | Customer–Supplier | Monthly levy recovery and pool refill |
| exploration | downstream | Customer–Supplier | Monthly colony progress |
| diplomacy | downstream | Customer–Supplier | Answers next turn; seasonal envoy ties; yearly fades and leagues; each-turn AI |
| subjects | downstream | Customer–Supplier | Monthly tribute; seasonal loyalty |
| rebellions | downstream | Customer–Supplier | Monthly rising rolls and spread |
| revolutions | downstream | Customer–Supplier | Monthly funding cost and caught roll |
| culture | downstream | Customer–Supplier | Yearly drift (January) after births and deaths; five-yearly checks |
| religion | downstream | Customer–Supplier | Yearly faith mix (January) after culture drift |
| events | downstream | Partnership | Monthly pool roll; ages with forced dates; end-of-campaign wrap-up |
| research | upstream | Conformist | Era dates (I–VII), following the calendar and cut at the end date |
| saves | downstream | Customer–Supplier | Turn boundary as only save point; `Rng` state, turn, date, options in `core`; orders journal |
| game-shell | downstream | Open Host Service | `TurnStarted`, `PlayerBattleStarted`, `BattleEnded`, `TurnEnded`, `CampaignEnded`; End turn blocked by events |
| achievements | downstream | Published Language | `turn_end`, `year_end`, `harvest`, `spring_start`, `date`, `campaign_end` moments; tests last |
| onboarding | downstream | Customer–Supplier | Checks read after each turn's simulation |
| settings | upstream | Conformist | End turn confirmation, autosave interval; settings never change the simulation |
| scenario-setup | upstream | Customer–Supplier | Start date 11 November 1444, seed, campaign rules (end date) |
| audio | downstream | Published Language | Turn results; music reads them outside the engine |
| map-presentation | downstream | Customer–Supplier | Month playback as the day loop runs, pausing at each stop; turn-time budgets |

## 12. AI

- The AI acts through the same orders and the same End turn pipeline as the player (TIME-011, TIME-039).
- AI nations run in the same worker turn as the player's (map-presentation budgets; performance.md).
- Per-turn AI steps stated by designs: diplomacy candidate actions each turn (diplomacy §12.3); one province
  per country per month for buildings (buildings §15.3); yearly building advice (buildings §15.4).
- The AI decides its orders in the first stage of the turn, and its orders are applied after the player's,
  realm by realm in ascending nation index (D-TIME-12).

## 13. Decisions and open questions

- **D-TIME-1** (was OQ-TIME-1) Start date: every campaign, the tutorial "The Year of Varna" included, starts on 11 November 1444 with the turn counter at 0, the day the catalogue and relations data describe; `time-and-turns.json` holds the date and `newCampaign` uses it, while `defines.json` `startDate` (March 1444) is a request to the game build. X-5 settles it.
- **D-TIME-2** (was OQ-TIME-2) Global turn order: a turn runs orders, the day loop, monthly steps in the context order province, buildings, recruiting, realm, research, trade, subjects, government, diplomacy, culture, religion, rebellions, revolutions, then seasonal steps, yearly steps, events, achievements, autosave, and last the date moves; warfare, naval and exploration, which X-2 does not list, run their monthly steps first, as they close the day loop. X-2 settles it, and the context order replaces the old "buildings before overflow" and "faith mix with traders" constraints.
- **D-TIME-3** (was OQ-TIME-3) Battles inside the turn: a battle starts on the day the day loop brings two hostile armies together and is fought one round per 4-hour step; while any player battle runs, each day is six 4-hour steps, each moving every other mover a sixth of a day, so armies can march in and join; the player may change standing orders, retreat, or switch between running battles at any step, and cannot skip the result; AI-only battles fight six rounds a day at once and never slow the game; any battle can be replayed from its notice. X-1 (Leroy, 17 Oct) settles it.
- **D-TIME-4** (was OQ-TIME-4) Turn and month length: a turn is one week of 7 days, the last ending on 31 August 1939 and maybe shorter; a month has its real length, 28 to 31 days, with Gregorian leap years for every year (no 1582 switch); weekly steps (army food and hunger, plunder, raids, forced-march desertion, plague) run once at the end of every turn; monthly, seasonal and yearly steps run once at the end of the turn in which a new month, season or year begins, so their amounts keep their size; no rule counts in turns. X-3 and X-18 (Leroy, 17 Oct) settle it.
- **D-TIME-5** (was OQ-TIME-5) Seasons: north spring March–May, summer June–August, autumn September–November, winter December–February, the south the other way round by latitude (below 0 is south); seasonal steps run in March, June, September and December; the harvest is in September in the north and March in the south, and rice paddies harvest in both months. X-4 settles it.
- **D-TIME-6** (was OQ-TIME-6) Year boundary: yearly steps run in the January turn, five-yearly steps in the January turn of years divisible by 5, and the yearly "traders and trade balance" step is dropped. X-4 and X-6 settle it.
- **D-TIME-7** (was OQ-TIME-7) Interrupted turns: a backgrounded app pauses the turn and carries on; a killed app processes the turn again from the last turn-boundary save with the same orders, which gives the same result because the turn is deterministic. Both texts hold for their own case, so the simpler reading keeps both.
- **D-TIME-8** (was OQ-TIME-8) Ages past 1939: an age or period whose window opens before 31 August 1939 is cut at the end date (the Age of World Wars runs to the end), and an age that would start on a post-1939 event, the Age of Decolonization, never starts. X-14 settles it.
- **D-TIME-9** (was OQ-TIME-9) Eras: eras follow the calendar, I 1378–1500 to VII 1914 to the end date, and Era VIII is dropped. X-14 settles it.
- **D-TIME-10** (was OQ-TIME-10) When victory is judged: world domination (half of the world's settled land provinces owned or held as subjects) is checked in every January turn and wins at once without ending the campaign; the Economy, Power and Technology leaders are judged only on 31 August 1939, with ties sharing the win; realm owns the score formulas. X-12 settles it.
- **D-TIME-11** (was OQ-TIME-11) Campaign seed: setup and any warm-up (such as trade's months of traders) draw from the campaign's one `Rng` before turn 0 and move neither the date nor the turn counter. One seed and one generator is the simplest rule that keeps a campaign reproducible.
- **D-TIME-12** (was OQ-TIME-12) Several acting nations: the player's orders are taken first, then each AI realm's in ascending nation index, each realm's in the order given. X-2 settles it.
- **D-TIME-13** (was OQ-TIME-13) Order within a day: armies move, then fleets, then traders (and trade ships), then exploration ships, each kind in ascending id; then arrivals and battles, with sieges once a month in the monthly steps; so an army crossing a strait on the day an enemy fleet arrives there crosses first. X-2 settles it.
- **D-TIME-14** (was OQ-TIME-14) Engine phases: the engine's order is kept and placed in X-2: orders, marches (the day loop), economy and levies (monthly steps), the date last; events, achievements and autosave follow the monthly, seasonal and yearly steps, and the AI decides in the orders stage. X-2 settles it.
- **D-TIME-15** (was OQ-TIME-15) Turn playback: the turn plays back as the day loop runs, at about 1 second per 10 whole days (provisional `playback.secondsPer10Days` = 1), slowing to 0.5 s per 4-hour step (provisional `playback.secondsPerBattleStep`) while a player battle runs, and never pauses. X-1 settles it.

## 14. Traceability

| Requirement | Feature file | Scenario |
|---|---|---|
| TIME-001 | calendar.feature | A turn advances the date by 7 days and the turn counter by one |
| TIME-002 | calendar.feature | Months have their real number of days |
| TIME-002 | calendar.feature | A turn plays 7 days and runs the weekly steps once |
| TIME-003 | calendar.feature | A turn advances the date by 7 days and the turn counter by one |
| TIME-004 | calendar.feature | The date rolls over at the end of the month and the year |
| TIME-005 | calendar.feature | Every campaign starts on 11 November 1444 |
| TIME-006 | calendar.feature | The end date is chosen when the campaign starts and kept with it |
| TIME-007 | calendar.feature | Reaching the end date ends the campaign with no play on |
| TIME-008 | calendar.feature | Reaching the end date ends the campaign with no play on |
| TIME-009 | calendar.feature | Content after 1939 is out of scope |
| TIME-010 | calendar.feature | World domination wins at once in a January turn and play goes on |
| TIME-010 | calendar.feature | World domination is checked only in January turns |
| TIME-011 | end-turn.feature | The AI and the player send the same orders as data |
| TIME-012 | end-turn.feature | Orders given during the turn are queued, not applied |
| TIME-013 | end-turn.feature | Queued orders are applied before any phase runs |
| TIME-014 | end-turn.feature | An order that can't be applied is rejected with a reason and the turn still runs |
| TIME-015 | end-turn.feature | A later move order replaces the earlier one |
| TIME-016 | end-turn.feature | Orders are frozen while the turn runs |
| TIME-017 | end-turn.feature | Unanswered events block End turn |
| TIME-018 | end-turn.feature | The End turn confirmation names open warnings but never blocks |
| TIME-019 | end-turn.feature | A turn is presented as turn in progress, battles, events, then the report |
| TIME-020 | day-loop.feature | Each day runs move, stop checks, contact, battles and standing orders in that order |
| TIME-021 | day-loop.feature | Each day runs move, stop checks, contact, battles and standing orders in that order |
| TIME-022 | day-loop.feature | Fleets and armies share one clock |
| TIME-022 | day-loop.feature | Traders and armies meet on the same day |
| TIME-023 | day-loop.feature | Only movement and meetings are daily; supply steps are monthly |
| TIME-024 | day-loop.feature | Progress on a step carries over into the next turn |
| TIME-025 | day-loop.feature | Armies in a battle don't move while it lasts |
| TIME-026 | day-loop.feature | A marching army stands in exactly one province every day |
| TIME-032 | determinism.feature | The same world and orders give the same world hash |
| TIME-033 | determinism.feature | A turn runs its stages in a fixed order |
| TIME-033 | determinism.feature | The engine's own phases sit in the turn order |
| TIME-034 | determinism.feature | The same world and orders give the same world hash |
| TIME-035 | determinism.feature | The Rng gives the same sequence from the same seed on every platform |
| TIME-035 | determinism.feature | The Rng's whole state is four 32-bit words |
| TIME-036 | determinism.feature | A loaded campaign continues the same random sequence |
| TIME-037 | determinism.feature | Nothing outside the engine changes the simulation |
| TIME-038 | determinism.feature | Nothing outside the engine changes the simulation |
| TIME-038 | determinism.feature | Rules that change the simulation are campaign rules |
| TIME-039 | end-turn.feature | The AI and the player send the same orders as data |
| TIME-040 | determinism.feature | A save only represents a turn boundary |
| TIME-041 | determinism.feature | A turn interrupted by the phone is processed again with the same result |
| TIME-042 | determinism.feature | A balance change applies from the next turn on |
| TIME-043 | cadences.feature | Daily steps run inside the day loop |
| TIME-044 | cadences.feature | Weekly steps run once at the end of every turn |
| TIME-045 | cadences.feature | Monthly steps run once per turn |
| TIME-046 | cadences.feature | Seasonal steps run in the first month of each season |
| TIME-047 | cadences.feature | Yearly steps run in the January turn |
| TIME-048 | cadences.feature | Culture's engine-raised checks run every five years |
| TIME-049 | cadences.feature | Pool events roll once a month |
| TIME-050 | cadences.feature | Achievement tests run last |
| TIME-051 | cadences.feature | Attention checks read the finished turn |
| TIME-052 | cadences.feature | The trade ratio updates after the day loop |
| TIME-053 | cadences.feature | A building finished this month takes overflow from the next month on |
| TIME-054 | cadences.feature | Culture drift follows births and deaths |
| TIME-055 | cadences.feature | The faith mix updates once a year, after culture drift |
| TIME-056 | determinism.feature | A turn runs its stages in a fixed order |
| TIME-056 | determinism.feature | Monthly steps run in a fixed order of contexts |
| TIME-056 | determinism.feature | The engine's own phases sit in the turn order |
| TIME-057 | cadences.feature | A diplomatic answer arrives the next turn |
| TIME-058 | cadences.feature | The season follows the hemisphere, read from the latitude |
| TIME-058 | cadences.feature | Winter depends on the hemisphere |
| TIME-059 | cadences.feature | Snow passes close by hemisphere |
| TIME-060 | cadences.feature | Wet seasons follow the climate |
| TIME-061 | cadences.feature | The harvest is rolled in autumn and paddies harvest twice |
| TIME-062 | cadences.feature | The 12-month autosave falls each January |
| TIME-063 | ages-and-eras.feature | An age is forced to start or end by its forced date |
| TIME-064 | ages-and-eras.feature | Ages overlap |
| TIME-065 | ages-and-eras.feature | Eras are dated bands ending at the campaign end (Era I from 1378) |
| TIME-066 | battles-in-turn.feature | Any battle can be replayed from its notice |
| TIME-067 | end-turn.feature | The player's orders come first, then each AI realm's by nation index |
| TIME-068 | day-loop.feature | On the same day armies move before fleets |
| TIME-068 | day-loop.feature | Movers of one kind take their day step in ascending id |
| TIME-069 | calendar.feature | The leader in each score wins at the end date, and ties share the win |
| TIME-070 | determinism.feature | Setup and warm-up draw from the campaign's one Rng without moving the date |
| TIME-027 | battles-in-turn.feature | Battles are fought in the order they begin |
| TIME-028 | battles-in-turn.feature | A player battle slows the day to six 4-hour steps |
| TIME-028 | battles-in-turn.feature | Other armies keep marching during a player battle and can join it |
| TIME-028 | battles-in-turn.feature | Standing orders changed during the battle are the ones fought with |
| TIME-028 | battles-in-turn.feature | The player can retreat at any step and there is no skip |
| TIME-029 | battles-in-turn.feature | Battles between other realms never slow the game |
| TIME-030 | battles-in-turn.feature | A turn killed during a battle replays to the same result |
| TIME-031 | battles-in-turn.feature | Battles are fought in the order they begin |
| TIME-034 | battles-in-turn.feature | A turn killed during a battle replays to the same result |
| TIME-071 | battles-in-turn.feature | The turn plays back slower while a player battle runs |
| TIME-072 | ages-and-eras.feature | An age is cut at the campaign end |
| TIME-072 | ages-and-eras.feature | An age that would start on an event after 1939 never starts |
| TIME-073 | battles-in-turn.feature | The player switches between running battles |
| TIME-074 | calendar.feature | Monthly, seasonal and yearly steps run in the turn a new month, season or year begins |
| TIME-074 | calendar.feature | The last turn ends on 31 August 1939 and may be shorter |
| TIME-075 | battles-in-turn.feature | The game shell can play a turn one step at a time |
| TIME-076 | end-turn.feature | The date ticks day by day after End turn |
