# Time and turns (TIME)

## 1. Purpose and scope

This context owns the game clock: the calendar, one month per turn, the 30 days played inside a month, the
cadences on which other contexts run (day, week, month, season, year), the order of a turn as far as the
designs fix it, battles taken one at a time inside the month, seeded randomness and determinism, the start
and end of a campaign, and the ages and eras that are tied to the calendar.

Gap list item 20 ("The order of a turn [New doc]") says no document sets the global order in which systems
run inside one turn. This spec does **not** invent that order. It collects every "each day / week / month /
season / year" statement in the designs (section 9 and `cadences.feature`), records the few ordering
constraints the designs do state, and lists the missing global order as an open question (OQ-TIME-2).

**In scope**
- The calendar: date (year, month), turn counter, 30-day months, the start date and the end date.
- The End turn pipeline: orders as data, applied only at End turn, rejected orders reported, orders frozen
  while the turn runs, End turn blocked by unanswered events.
- The day loop that plays out a month, and the shared clock for every mover.
- Battles simulated one at a time inside the month, and stopping the month at the player's battles.
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
   `packages/engine/src/rng.ts`, `packages/rules/data/defines.json` (`startDate`, `march.daysPerMonth`).
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
| Day loop | The 30 passes that play out a month, one per day, in which every mover takes its day step | The monthly phases |
| Day step | One mover's one day inside the day loop | A "step" of a route (a march from one province into the next) |
| Mover | Anything with a place, a route, progress, step days, may-enter and stops-at rules: armies, fleets, trade ships, traders | A unit that is cargo aboard ships |
| Progress | Days already walked or sailed toward the next place; carries over between months | A colony's founding progress (exploration) |
| Phase | A monthly step of the engine's turn (orders, marches, economy, levies, date) | A day step |
| Cadence | How often a system's step runs: daily, weekly, monthly, seasonal, yearly, five-yearly | — |
| Season | A three-month span (buildings: "a full season (3 months)"); boundaries not defined globally (OQ-TIME-5) | Winter, wet season (defined per hemisphere or climate) |
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
| Start date | The first date of a campaign | The catalogue's reference day |
| Reference day | 11 November 1444: the day the country catalogue and relations describe | The engine's start date |
| End date | The date the campaign stops; default 31 August 1939, one setting chosen at campaign start | Game over (the player's realm is gone) |
| Age | An event-tree situation with a baseline, a window, start and end conditions and forced start and end dates | An era |
| Era | A dated band of the research and warfare trees: I 1444–1500 … VII 1914–1960 | An age |
| Out of scope | Content after 31 August 1939: Era VIII, the 1939–1960 part of Era VII, the Second World War events and the Decolonization, Cold War and Globalization ages | — |

## 4. Domain model

### Aggregates

**Campaign clock** (identity: the campaign id)
- Holds: `turn` (integer, starts at 0 in the engine), `date` (year, month), `startDate`, `endDate`,
  the `Rng` state (four uint32), and the campaign's phase position (between turns, running, stopped at a
  battle).
- INV-TIME-1: `date.month` is 1 to 12.
- INV-TIME-2: Each processed turn adds exactly one to `turn` and advances `date` by exactly one month.
- INV-TIME-3: `startDate` ≤ `date` ≤ `endDate`; no turn is processed after `endDate` is reached.
- INV-TIME-4: The `Rng` state is part of the world and is the only source of randomness in a turn.
- INV-TIME-5: A save represents the world only at a turn boundary, never inside a turn.

**Turn** (identity: campaign id + turn number)
- Holds: the queued orders, the rejected orders with reasons, the day position (0 to 30), the list of
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
- **Cadence** (value): daily · weekly · monthly · seasonal · yearly · five-yearly · per-event.
- **Hemisphere season calendar** (value, config): winter months per hemisphere; snow-pass closed months per
  hemisphere; wet-season months per climate.
- **Age** (entity, owned by events, read here): id, baseline span, window, forced start year, forced end
  year, regions. In scope: Gunpowder Empires, Exploration, Reformations, Atlantic Empires, Crisis and
  Absolutism, Revolutions, Industrialization, Imperialism, World Wars. Out of scope: Decolonization, Cold
  War, Globalization.
- **Era** (value, owned by research/warfare, read here): I 1444–1500 · II 1500–1600 · III 1600–1700 ·
  IV 1700–1800 · V 1800–1870 · VI 1870–1914 · VII 1914–1960, cut at 1939 · VIII 1960 on, out of scope.

### Domain services

- **Turn processor** (`processTurn`): applies orders, then runs the phases in a fixed order, then advances
  the date and the turn counter.
- **Day loop**: runs 30 day passes for all movers; can stop on the day of a player battle and resume.
- **Seeded random source** (`Rng`): xoshiro128**; a single seed is spread over four words with splitmix32.

## 5. Requirements

### 5.1 Calendar and campaign span

- TIME-001 (Ubiquitous): The game shall advance by one calendar month per turn. [gap-lists A3; troop-movement §1]
- TIME-002 (Ubiquitous): The game shall play out each month as 30 days (config `march.daysPerMonth`). [troop-movement §2.1; defines.json]
- TIME-003 (Event-driven): When a turn is processed, the game shall advance the date by one month and add one to the turn counter. [turn.ts `advanceDate`, `world.turn++`]
- TIME-004 (Event-driven): When the date advances from December, the game shall set the date to January of the next year. [turn.ts `advanceDate`]
- TIME-005 (Ubiquitous): The game shall start every 1444 campaign on the configured start date, which the engine sets to 1444, month 3 (`startDate`). [defines.json; README "starting in spring 1444"] (see OQ-TIME-1)
- TIME-006 (Ubiquitous): The campaign end date shall default to 31 August 1939 and be kept as one setting chosen when the campaign starts and saved with it. [gap-lists decisions; screen-flow E2, S5; settings §4.3; save-system §4.2 `options.endDate`]
- TIME-007 (Event-driven): When the end date is reached, the game shall end the campaign: the final wrap-up event or events, the closing sequence and the final result. [screen-flow E2]
- TIME-008 (Unwanted): If the end date has been reached, then the game shall not process any further turn ("no play on past the end date"). [screen-flow E2]
- TIME-009 (Ubiquitous): The game shall contain no content after 1939: no Era VIII, no 1939–1960 part of Era VII, no Second World War events and no Decolonization, Cold War or Globalization ages. [gap-lists decisions, items 22–24]
- TIME-010 (Event-driven): When a victory condition fires (if gap list 1 item 1 chooses one), the game shall end the campaign the same way as at the end date. [screen-flow E2] (see OQ-TIME-10)

### 5.2 Orders and End turn

- TIME-011 (Ubiquitous): The game shall represent every command that changes the world as an order that can be sent as data, with the same orders for the player and the AI. [gap-lists A4; troop-movement §9.3]
- TIME-012 (Ubiquitous): The game shall apply orders only at End turn; orders given during a turn are queued, not applied. [save-system §3.1; turn.ts]
- TIME-013 (Event-driven): When End turn is given, the turn processor shall apply the queued orders in the order received before any phase runs. [turn.ts `processTurn`]
- TIME-014 (Unwanted): If an order cannot be applied, then the turn processor shall reject it with a plain reason and report it in the turn's result, and the rest of the turn shall still run. [turn.ts `rejectedOrders`]
- TIME-015 (Unwanted): If an army already received a move order this turn, then a second move order for it in the same turn shall be rejected ("army already moved this turn"). [turn.ts `movedThisTurn`]
- TIME-016 (State-driven): While a turn is being processed, the game shall keep orders frozen while the map can still be panned and zoomed. [screen-flow G5]
- TIME-017 (Unwanted): If any event is unanswered, then End turn shall not end the turn but open the first unanswered event instead; nothing answers an event for the player. [screen-flow §4.6, decided 16 Oct]
- TIME-018 (Optional): Where the End turn confirmation setting is on, the game shall ask before ending the turn and name the count of open warnings; warnings shall never block the turn. [screen-flow §4.6, G9; settings §5.3]
- TIME-019 (Ubiquitous): Within a turn the game shall present, in this order: the turn in progress, each player battle as it is reached, then the events, then the turn report; events and report are skipped when empty. [screen-flow §2, §4.6]

### 5.3 The day loop

- TIME-020 (Ubiquitous): The game shall play out the month day by day for every mover at once. [troop-movement §1, §2.1]
- TIME-021 (Ubiquitous): On each day the game shall run, in this order: (1) move, (2) stop checks, (3) contact, (4) standing orders. [troop-movement §2.1]
- TIME-022 (Ubiquitous): Armies, fleets, trade ships and traders shall all take their day step in the same day loop (one clock). [troop-movement §11.2; naval §7.1; trade §1]
- TIME-023 (Ubiquitous): The day loop shall decide only where movers are and who meets whom; food, sickness, sieges and pay shall run once a month. [troop-movement §2.1; warfare §16]
- TIME-024 (Ubiquitous): Days walked toward the next place shall carry over into the next month. [troop-movement §2.3]
- TIME-025 (State-driven): While a battle lasts (1 to 3 days), the armies in it shall not move. [troop-movement §2.1; warfare §7.1]
- TIME-026 (Ubiquitous): Every mover shall be in exactly one place at the end of every day, never between two. [troop-movement §2.2, §11.1]

### 5.4 Battles inside the month

- TIME-027 (Ubiquitous): The game shall simulate battles one battle at a time, in the order they happen within the month. [gap-lists A3; screen-flow G6; warfare §7.15]
- TIME-028 (Event-driven): When the month reaches a player battle, the game shall stop the turn on that battle and continue the month only when the player carries on. [screen-flow G6 decided 16 Oct; screen-flow §11 "turn order"] (see OQ-TIME-3)
- TIME-029 (Ubiquitous): Battles between other realms shall never stop the turn. [screen-flow G6; warfare §7.15]
- TIME-030 (Event-driven): When a turn stopped at a battle is replayed from the pre-turn save, the game shall reach the same battle with the same result. [screen-flow G6, R1; save-system §3.2]
- TIME-031 (Ubiquitous): Each battle shall be resolved when its turn comes, with its result ready before it is shown, so watching is only playback. [warfare §16]

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
- TIME-041 (Unwanted): If the app is backgrounded or killed while a turn is processed, then the turn shall be processed again from the last turn-boundary save with the same orders, giving the same result. [save-system §3.2; screen-flow R1] (see OQ-TIME-7)
- TIME-042 (Event-driven): When a balance change is loaded with a campaign, the changed rules shall apply from the next turn on. [save-system §4.4]

### 5.7 Cadences

- TIME-043 (Ubiquitous): The game shall run daily steps inside the day loop: marching armies, sailing fleets, travelling traders and the interception look of armies set to attack. [troop-movement §2.1, §6.3; naval §11; warfare §16]
- TIME-044 (Ubiquitous): The game shall run weekly steps for: army food taken at home and the reserve shrinking abroad, hunger, plunder of one tile a week, raids (a week in each province), forced-march desertion, and plague while an outbreak runs. [warfare §5.1, §6.2–6.4, §9.2; province-stats §17] (see OQ-TIME-4)
- TIME-045 (Ubiquitous): The game shall run monthly steps once per turn for every context that states one (section 9). [section 9 sources]
- TIME-046 (Ubiquitous): The game shall run seasonal steps once per season, a season being three months. [buildings §2 "a full season (3 months)"; province-stats §6.2, §17; subjects §11; diplomacy §2.3] (see OQ-TIME-5)
- TIME-047 (Ubiquitous): The game shall run yearly steps once per year. [province-stats §17; buildings §15.4; culture §9; religion §14; diplomacy §15; trade §13.3] (see OQ-TIME-6)
- TIME-048 (Ubiquitous): The game shall run five-yearly steps for the culture engine-raised checks. [culture §9]
- TIME-049 (Ubiquitous): Pool events shall roll against their `mean_years` once a month (`selection.pool_roll_interval_months` = 1). [event-tree balance.yaml] @placeholder

### 5.8 Ordering constraints the designs state

- TIME-050 (Ubiquitous): Achievement tests shall run at the very end of the turn, after the turn's own systems, so they read final values. [achievements §5.1]
- TIME-051 (Ubiquitous): Attention and tutorial checks shall be read each turn after that turn's simulation. [tutorial §5.2]
- TIME-052 (Ubiquitous): The trade ratio update shall run each month after the day loop. [trade §4.3]
- TIME-053 (Ubiquitous): Finished buildings shall open their slots before overflow runs. [buildings §15.4]
- TIME-054 (Ubiquitous): Culture drift shall run once a year after births and deaths. [culture §9]
- TIME-055 (Ubiquitous): The faith mix shall update once a year at the same time as traders and trade balance. [religion §14]
- TIME-056 (Ubiquitous): The engine shall run, in this order: apply orders, marches, economy, levies, advance the date. [turn.ts] (see OQ-TIME-14)
- TIME-057 (Event-driven): When a diplomatic proposal is sent, its answer shall arrive the turn after it is given. [diplomacy §13.2, §13.3]

### 5.9 Seasons and calendar effects

- TIME-058 (Ubiquitous): Winter shall be December to February in the north and June to August in the south. [troop-movement §3.1]
- TIME-059 (Ubiquitous): A snow-peak province with no pass and no road shall be closed from December to March in the north and from June to September in the south. [troop-movement §4.2]
- TIME-060 (Ubiquitous): Wet seasons shall follow climate: monsoon Asia June to September, the Sahel and savanna July to September, the Amazon December to May (config). [troop-movement §4.3]
- TIME-061 (Ubiquitous): The harvest shall be rolled in autumn, and rice paddies shall harvest twice a year. [country-stats §3.4; province-stats §5.1] (see OQ-TIME-5)
- TIME-062 (Optional): Where the autosave interval is "every 12 turns", the autosave shall fall each January. [save-system §2.3; settings §5.3]

### 5.10 Ages and eras on the calendar

- TIME-063 (Ubiquitous): Ages shall start and end by their own conditions inside their window, and shall be forced to start or end by their forced dates so a stalled game still advances. [event-tree README "Ages and periods"]
- TIME-064 (Ubiquitous): Ages may overlap, and a period may belong to several ages. [ages_and_periods.md]
- TIME-065 (Ubiquitous): Research and warfare eras shall be the dated bands I 1444–1500, II 1500–1600, III 1600–1700, IV 1700–1800, V 1800–1870, VI 1870–1914, VII 1914 to the end date. [research-tree; gap-lists items 22–23] (see OQ-TIME-9)

## 6. Commands

| Command | Who issues it | Preconditions | Result | Events emitted |
|---|---|---|---|---|
| `EndTurn(orders, actingNation)` | Player; AI | Campaign between turns; no unanswered event (player); end date not reached | Orders applied (or rejected with reasons), phases run, date and turn advance | `TurnStarted`, `OrderRejected`*, `DayPassed`*, `PlayerBattleReached`*, `MonthEnded`, `SeasonEnded`?, `YearEnded`?, `TurnEnded` |
| `CarryOn()` | Player | Turn stopped at a player battle whose result was shown | Day loop resumes from that battle's day | `TurnResumed` |
| `NewGame(seed, playerNation, options)` | Player (system on behalf) | Options include the end date | Campaign clock at `startDate`, `turn` 0, `Rng` seeded | `CampaignStarted` |
| `EndCampaign()` | System | `date` reached `endDate`, or a victory condition fired | No more turns; final sequence | `CampaignEnded` |

Order types and their own preconditions belong to the context that owns them (for example `move` to
troop-movement). `NewGame`'s request shape is the one save-system §9 suggests for the worker protocol.

## 7. Domain events

| Event | When | Payload | Consumed by (context) |
|---|---|---|---|
| `CampaignStarted` | New game begins | campaign id, seed, start date, end date, player nation | saves, scenario-setup, game-shell |
| `TurnStarted` | End turn accepted | turn, date, orders | saves (pre-turn save), game-shell (turn in progress) |
| `OrderRejected` | An order can't be applied | order, reason | game-shell (turn report) |
| `DayPassed` | End of each day of the day loop | day 1–30 | troop-movement, naval, trade, warfare |
| `PlayerBattleReached` | Day loop reaches a battle with the player's armies or fleets | battle id, day, province | game-shell (battle viewer), warfare, audio |
| `TurnResumed` | Player carries on after a battle | battle id | game-shell |
| `WeekPassed` | End of each week of the month (OQ-TIME-4) | week | warfare, province |
| `MonthEnded` | All daily steps of the month done | turn, date | every context with a monthly step |
| `SeasonEnded` | Last month of a season (OQ-TIME-5) | season | province, buildings, subjects, diplomacy, naval |
| `YearEnded` | Last month of a year (OQ-TIME-6) | year | province, buildings, trade, culture, religion, diplomacy, achievements (`year_end`) |
| `TurnEnded` | Date advanced | turn, new date, rejected orders | saves (Resume save), achievements (`turn_end`), onboarding (checks), game-shell (events, turn report), audio |
| `CampaignEnded` | End date reached or victory | date, reason | game-shell (E2, E3), achievements (`campaign_end`), events (wrap-up) |

## 8. Policies (reactions to other contexts)

- When `game-shell` reports an unanswered event, then `EndTurn` from the player is refused and the first
  unanswered event is opened.
- When `warfare` resolves a battle in the day loop that involves the player, then the day loop stops and
  waits for `CarryOn`.
- When `saves` loads a campaign, then the clock takes `turn`, `date`, options and `Rng` state from the `core`
  chunk and the queued orders from the orders journal.
- When `events` fires a forced age start or end date, then the age begins or ends regardless of its
  conditions (event tree owns the effect).
- When `settings` changes any value, then nothing in this context changes (settings never change the
  simulation).

## 9. Monthly turn

The global order is **not designed** (OQ-TIME-2). What the designs say each system does, and on what cadence:

| Cadence | Step | Context | Source |
|---|---|---|---|
| Per End turn, first | Apply queued orders; reject invalid ones | time-and-turns | turn.ts |
| Daily (30×) | Move · stop checks · contact (battle 1–3 days) · standing orders | troop-movement, warfare | troop-movement §2.1 |
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
| Monthly ("each turn") | Fund rebels: gold, caught roll | diplomacy | diplomacy §6.11 |
| Monthly ("each turn") | Fund a revolution: gold, caught roll | revolutions | revolutions §7.1 |
| Monthly ("each turn") | AI with a free envoy seat scores candidate actions | diplomacy | diplomacy §12.3 |
| Monthly | Pool events roll against `mean_years` | events | balance.yaml |
| After the turn's systems | Attention and tutorial checks | onboarding | tutorial §5.2 |
| End of turn (last) | Achievement tests (`turn_end` and other moments) | achievements | achievements §5.1 |
| Seasonal | Famine check; stores rot | province, realm | province-stats §6.2; country-stats §3.4 |
| Seasonal | Farms, groves and fisheries make food | buildings | buildings §15.4 |
| Seasonal | Subject loyalty worked out | subjects | subjects §11 |
| Seasonal | Resident envoy +5; courting: loyalty step, 1 in 4 discovery | diplomacy | diplomacy §2.3, §6.8 |
| Seasonal | Lords lose loyalty while an army takes their grain | warfare, realm | warfare §6.3 |
| Seasonal | Pirate fleets grow by one | naval | naval §8 |
| Yearly (autumn) | Harvest rolled; collection; castle shares; spread | realm, province | country-stats §3.4 |
| Yearly | Traders and trade balance; trade value; reroute | province, trade | province-stats §17; trade §13.3 |
| Yearly | Wares; neglect years; village works and craft buildings appearing; AI advice | buildings | buildings §15.4 |
| Yearly, after births and deaths | Culture drift | culture | culture §9 |
| Yearly, with traders | Faith mix and faith waves | religion | religion §14 |
| Yearly | Diplomacy fades; league checks | diplomacy | diplomacy §9, §15 |
| Every 5 years | Culture engine-raised checks | culture | culture §9 |
| Turn end (presentation) | Battles → events → turn report | game-shell | screen-flow §4.6 |

## 10. Configuration

| Key | Meaning | Value in the design | Placeholder? | Config file |
|---|---|---|---|---|
| `startDate.year`, `startDate.month` | First date of a campaign | 1444, 3 | No (but see OQ-TIME-1) | `packages/rules/data/defines.json` |
| `march.daysPerMonth` | Days in the day loop | 30 | Yes ("placeholders for the march block") | `defines.json` |
| `options.endDate` | Campaign end date | 1939-08-31 (default) | No (decided) | save header / campaign rules |
| season calendar: winter months | Months that count as winter | Dec–Feb north; Jun–Aug south | No | troop-movement config (`seasonFactor`) |
| snow-pass closure months | Months snow peaks without pass or road are closed | Dec–Mar north; Jun–Sep south | No | troop-movement config |
| wet-season months | Wet season per climate | monsoon Asia Jun–Sep; Sahel/savanna Jul–Sep; Amazon Dec–May | Yes (config) | troop-movement config |
| `selection.pool_roll_interval_months` | How often pool events roll | 1 | Yes | `event-tree/data/balance.yaml` |
| `replaySecondsPer10Days` | Month playback speed | about 1 s per 10 days | Yes | `defines.json` (march) |
| autosave interval | Rotating autosave | every turn / 6 / 12 (each January) / off; default 12 | No | settings |
| age windows | Baseline, window, forced start/end per age | see `ages_and_periods.md` | Event-tree data | `event-tree/data/ages.yaml` |

## 11. Seams

| Other context | Direction | Pattern | What crosses |
|---|---|---|---|
| troop-movement | downstream | Customer–Supplier | The day loop and day order; `DayPassed`; progress carry-over |
| naval | downstream | Customer–Supplier | Fleets' day step in the same day loop; monthly storm and ship-state steps |
| trade | downstream | Customer–Supplier | Traders' day step; monthly ratio update after the day loop; yearly reroute |
| warfare | downstream | Customer–Supplier | Battle one at a time; weekly food and hunger; monthly siege and sickness |
| province | downstream | Customer–Supplier | Monthly births and deaths; seasonal famine; yearly traders; weekly plague |
| buildings | downstream | Customer–Supplier | Monthly upkeep and sites; seasonal food; yearly wares and advice |
| realm | downstream | Customer–Supplier | Autumn harvest; monthly income; win score timing |
| recruiting | downstream | Customer–Supplier | Monthly levy recovery and pool refill |
| exploration | downstream | Customer–Supplier | Monthly colony progress |
| diplomacy | downstream | Customer–Supplier | Answers next turn; seasonal envoy ties; yearly fades and leagues; each-turn AI |
| subjects | downstream | Customer–Supplier | Monthly tribute; seasonal loyalty |
| rebellions | downstream | Customer–Supplier | Monthly rising rolls and spread |
| revolutions | downstream | Customer–Supplier | Monthly funding cost and caught roll |
| culture | downstream | Customer–Supplier | Yearly drift after births and deaths; five-yearly checks |
| religion | downstream | Customer–Supplier | Yearly faith mix with traders |
| events | downstream | Partnership | Monthly pool roll; ages with forced dates; end-of-campaign wrap-up |
| research | upstream | Conformist | Era dates (I–VII) |
| saves | downstream | Customer–Supplier | Turn boundary as only save point; `Rng` state, turn, date, options in `core`; orders journal |
| game-shell | downstream | Open Host Service | `TurnStarted`, `PlayerBattleReached`, `TurnEnded`, `CampaignEnded`; End turn blocked by events |
| achievements | downstream | Published Language | `turn_end`, `year_end`, `harvest`, `spring_start`, `date`, `campaign_end` moments; tests last |
| onboarding | downstream | Customer–Supplier | Checks read after each turn's simulation |
| settings | upstream | Conformist | End turn confirmation, autosave interval; settings never change the simulation |
| scenario-setup | upstream | Customer–Supplier | Start date, seed, campaign rules (end date) |
| audio | downstream | Published Language | Turn results; music reads them outside the engine |
| map-presentation | downstream | Customer–Supplier | Month playback; turn-time budgets |

## 12. AI

- The AI acts through the same orders and the same End turn pipeline as the player (TIME-011, TIME-039).
- AI nations run in the same worker turn as the player's (map-presentation budgets; performance.md).
- Per-turn AI steps stated by designs: diplomacy candidate actions each turn (diplomacy §12.3); one province
  per country per month for buildings (buildings §15.3); yearly building advice (buildings §15.4).
- The designs do not say when in the turn the AI decides its orders, or in what order nations' orders are
  applied (OQ-TIME-12).

## 13. Open questions and contradictions

- **OQ-TIME-1 Start date.** The engine starts in March 1444 (`defines.json` `startDate`), the repo README
  says "starting in spring 1444", the loading screen mock-up shows "Spring 1444" (screen-flow S7) and the
  tutorial starts in April 1444 (tutorial §3.2). The country catalogue and the relations dataset describe
  the world on **11 November 1444** (the reference day), after Varna (10 November) and with the Poland–Hungary
  union lapsing. Which date does a campaign start on, and is the catalogue's November snapshot used for a
  spring start? Blocks: scenario-setup, relations, tutorial.
- **OQ-TIME-2 Global turn order missing.** Gap list item 20: no design sets the order in which systems run in
  one turn (food before levies, battles before sieges, events last …). Only partial constraints exist
  (TIME-050 to TIME-057). The engine today runs orders → marches → economy → levies → date, which no design
  confirms. Blocks: every monthly step; determinism across contexts.
- **OQ-TIME-3 Battles inside the turn.** Three texts disagree: troop-movement §10.6/§15.1 plays the whole
  month and lets the player replay any battle from its notice; warfare §7.15 and §19 ("decided") resolve
  battles when the month ends and stop on a battle report with a Watch button; screen-flow G6 ("decided 16
  Oct") stops the turn *at* each player battle on a before-the-battle card where standing orders can be
  changed, with Fight or Skip to result. The gap list says this is "still being settled". This spec follows
  screen-flow as the latest; warfare and troop-movement have not adopted it.
- **OQ-TIME-4 Weeks in a 30-day month.** Warfare runs army food, hunger, plunder and raids weekly; province
  stats runs plague weekly; troop-movement §13 says "food stays monthly"; the engine eats a month of rations
  at once. How many weeks does a 30-day month have, and where in the day loop do weekly steps run?
- **OQ-TIME-5 Seasons.** No design says which months make spring, summer, autumn and winter for seasonal
  steps (famine, food, loyalty, envoy ties), whether they follow the hemisphere, or which month the autumn
  harvest falls in (north and south). Achievements use `harvest` and `spring_start` moments.
- **OQ-TIME-6 Year boundary.** Which month runs the yearly steps (traders, wares, drift, faith, fades)?
  Province stats 17 works traders out "once a year", while trade v2 (which replaces province 7) moves
  traders daily and only reroutes yearly.
- **OQ-TIME-7 Interrupted turns.** Save-system §3.2: a turn interrupted by backgrounding is "simply processed
  again on resume". Screen-flow R1: "the worker pauses with the app. On return the turn carries on".
  Screen-flow G5 takes "an autosave just before the turn runs"; save-system writes the Resume save after
  every End turn and rotating autosaves "at the start of a turn".
- **OQ-TIME-8 Ages past 1939.** The Age of World Wars has a window to 1960 and forced end 1960, its Second
  World War period window opens in 1925, and the Age of Decolonization's window opens in 1919 and starts on
  `world_war_ii`. Gap list says Second World War events and the Decolonization age are out of scope. What
  happens to ages and periods whose window opens before 31 August 1939? Owner: events.
- **OQ-TIME-9 Eras.** The research tree still lists Era VII 1914–1960 and Era VIII (gap item 22 not yet
  done). Music open question 10 asks whether "era" follows the calendar or technology. Which applies where?
- **OQ-TIME-10 When victory is judged.** Gap list item 1 asks when scores are judged ("presumably at the end
  date"). Country stats 12 adds a placeholder: lead by 50 % for 25 years, or lead at the end date. How often
  is the lead checked (monthly, yearly) and which context owns it?
- **OQ-TIME-11 Campaign seed.** `newGame` takes a `seed` (save-system §9), country stats 10 asks for a wider
  random range for low-confidence starts, and trade warms up 24 months of traders before the first turn. Is
  the same `Rng` used for setup and warm-up, and does the warm-up move the date?
- **OQ-TIME-12 Several acting nations.** `processTurn` takes one `actingNation`. In what order are the orders
  of the player, each AI nation (and later other players) applied, so the result is deterministic?
- **OQ-TIME-13 Order within a day.** When several movers act on the same day (two armies arriving, a fleet
  closing a strait), in what order are they processed? Troop-movement gives the strait example "fleet on day
  12 closes it to an army crossing on day 13" but not same-day ties.
- **OQ-TIME-14 Engine phases.** Marches before economy before levies, and the date advance last, come from
  code only. No events phase exists in code. Should the engine's order be kept, and where do events,
  sieges, battles and AI decisions go?
- **OQ-TIME-15 Month playback.** Troop-movement §10.6 plays the month at about 1 s per 10 days with a skip
  button and half-second pauses at battles; with the turn now stopping at player battles, is the playback
  shown before, during or after the stops?

## 14. Traceability

| Requirement | Feature file | Scenario |
|---|---|---|
| TIME-001 | calendar.feature | A turn advances the date by one month and the turn counter by one |
| TIME-002 | calendar.feature | A month is played out as 30 days |
| TIME-003 | calendar.feature | A turn advances the date by one month and the turn counter by one |
| TIME-004 | calendar.feature | The date rolls over at the end of the year |
| TIME-005 | calendar.feature | A new 1444 campaign starts on the configured start date |
| TIME-006 | calendar.feature | The end date is chosen when the campaign starts and kept with it |
| TIME-007 | calendar.feature | Reaching the end date ends the campaign with no play on |
| TIME-008 | calendar.feature | Reaching the end date ends the campaign with no play on |
| TIME-009 | calendar.feature | Content after 1939 is out of scope |
| TIME-010 | calendar.feature | A victory condition ends the campaign the same way as the end date |
| TIME-011 | end-turn.feature | The AI and the player send the same orders as data |
| TIME-012 | end-turn.feature | Orders given during the month are queued, not applied |
| TIME-013 | end-turn.feature | Queued orders are applied before any phase runs |
| TIME-014 | end-turn.feature | An order that can't be applied is rejected with a reason and the turn still runs |
| TIME-015 | end-turn.feature | An army takes one move order per turn |
| TIME-016 | end-turn.feature | Orders are frozen while the turn runs |
| TIME-017 | end-turn.feature | Unanswered events block End turn |
| TIME-018 | end-turn.feature | The End turn confirmation names open warnings but never blocks |
| TIME-019 | end-turn.feature | A turn is presented as turn in progress, battles, events, then the report |
| TIME-020 | day-loop.feature | Each day runs move, stop checks, contact and standing orders in that order |
| TIME-021 | day-loop.feature | Each day runs move, stop checks, contact and standing orders in that order |
| TIME-022 | day-loop.feature | Fleets and armies share one clock |
| TIME-022 | day-loop.feature | Traders and armies meet on the same day |
| TIME-023 | day-loop.feature | Only movement and meetings are daily; supply steps are monthly |
| TIME-024 | day-loop.feature | Progress on a step carries over into the next month |
| TIME-025 | day-loop.feature | Armies in a battle don't move while it lasts |
| TIME-026 | day-loop.feature | A marching army stands in exactly one province every day |
| TIME-027 | battles-in-turn.feature | Battles are resolved one at a time in the order they happen |
| TIME-028 | battles-in-turn.feature | The month stops at the player's battle and resumes on Carry on |
| TIME-029 | battles-in-turn.feature | Battles between other realms never stop the turn |
| TIME-030 | battles-in-turn.feature | A turn killed at a battle replays to the same battle with the same result |
| TIME-031 | battles-in-turn.feature | Battles are resolved one at a time in the order they happen |
| TIME-032 | determinism.feature | The same world and orders give the same world hash |
| TIME-033 | determinism.feature | The engine runs its phases in a fixed order |
| TIME-034 | battles-in-turn.feature | A turn killed at a battle replays to the same battle with the same result |
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
| TIME-044 | cadences.feature | Weekly steps run each week of the month |
| TIME-045 | cadences.feature | Monthly steps run once per turn |
| TIME-046 | cadences.feature | Seasonal steps run once every three months |
| TIME-047 | cadences.feature | Yearly steps run once a year |
| TIME-048 | cadences.feature | Culture's engine-raised checks run every five years |
| TIME-049 | cadences.feature | Pool events roll once a month |
| TIME-050 | cadences.feature | Achievement tests run last |
| TIME-051 | cadences.feature | Attention checks read the finished turn |
| TIME-052 | cadences.feature | The trade ratio updates after the day loop |
| TIME-053 | cadences.feature | Finished buildings open their slots before overflow runs |
| TIME-054 | cadences.feature | Culture drift follows births and deaths |
| TIME-055 | cadences.feature | The faith mix updates with the traders |
| TIME-056 | determinism.feature | The engine runs its phases in a fixed order |
| TIME-057 | cadences.feature | A diplomatic answer arrives the next turn |
| TIME-058 | cadences.feature | Winter depends on the hemisphere |
| TIME-059 | cadences.feature | Snow passes close by hemisphere |
| TIME-060 | cadences.feature | Wet seasons follow the climate |
| TIME-061 | cadences.feature | The harvest is rolled in autumn and paddies harvest twice |
| TIME-062 | cadences.feature | The 12-turn autosave falls each January |
| TIME-063 | ages-and-eras.feature | An age is forced to start or end by its forced date |
| TIME-064 | ages-and-eras.feature | Ages overlap |
| TIME-065 | ages-and-eras.feature | Eras are dated bands ending at the campaign end |
