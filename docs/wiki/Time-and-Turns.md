# Time and Turns

Pocket Hegemony is played one month at a time, from spring 1444 to the end of August 1939. You give your orders, press End turn, and the game plays out the 30 days of that month for every army, fleet and trader in the world at once. This page explains the clock: how a turn runs, when battles stop it, what happens daily, weekly, monthly, seasonally and yearly, and how the campaign ends.

## How it works

### One month per turn

Every turn is one calendar month. When a turn is processed, the date moves on by exactly one month and the turn counter goes up by one. After December comes January of the next year. The engine keeps the date as a year and a month, and the turn counter starts at 0.

A new 1444 campaign starts on the configured start date, which the engine currently sets to March 1444 ("spring 1444"). The exact start date is not fully settled yet (see Still open, OQ-TIME-1): the country catalogue and the relations data describe the world on 11 November 1444, the day after Varna, which the game calls the reference day.

### When the campaign ends

The end date is chosen when you start a campaign and saved with it. By default it is **31 August 1939**, and it is one setting, not something that changes mid-game. When the end date is reached, the campaign ends with a final wrap-up event or events, a closing sequence and the final result. There is no playing on past the end date: no further turn is processed.

If a victory condition is ever added and fires, the campaign ends the same way as at the end date. Whether there is one, and how often the lead is checked, is still open (OQ-TIME-10).

Nothing after 1939 is in the game. That means no Era VIII, no 1939 to 1960 part of Era VII, no Second World War events, and no Decolonization, Cold War or Globalization ages.

### Orders and End turn

Every command that changes the world is an **order** that can be sent as data, for example "move this army to that province". The player and the AI send exactly the same kinds of order through exactly the same pipeline. There are no player-only shortcuts, which keeps the game ready for multiplayer.

- Orders you give during your turn are **queued, not applied**. If you tell Jean de Dunois's army in Paris to march to Dijon, it still stands in Paris until you press End turn.
- When you press End turn, the queued orders are applied first, in the order they were received, before anything else runs.
- If an order can't be applied, it is **rejected** with a plain-language reason, listed in the turn report, and the rest of the turn still runs.
- An army can take only one move order per turn. A second move order for the same army in the same turn is rejected with the reason "army already moved this turn".
- While the turn is being processed, orders are frozen. You can still pan and zoom the map, but you can't give new orders.

**Unanswered events block End turn.** If any event is still waiting for your answer (for example "Hungary offers a ten-year peace at Edirne"), End turn does not end the turn. It opens the first unanswered event instead. Nothing ever answers an event for you.

**Warnings never block.** If the End turn confirmation setting is on, the game asks before ending the turn and tells you how many warnings are open (for example 3). Warnings are advice only.

### What a turn looks like

Inside one turn you see, in this order:

1. The turn in progress (the month playing out on the map).
2. Each of your battles, as the month reaches it.
3. The events that fired, one at a time in date order.
4. The turn report.

Events and the report are skipped when there is nothing in them.

### The day loop: 30 days inside a month

The month is played out as **30 days**, day by day, for every mover at once. A mover is anything with a place and a route: armies, fleets, trade ships and traders. They all share one clock, so a trader and an army can meet on the same day, and a fleet that closes a strait on day 12 matters to an army trying to cross on day 13.

Each day runs four steps, always in this order:

1. **Move**: every mover takes its day step.
2. **Stop checks**: who has to stop where they are.
3. **Contact**: who meets whom. A battle lasts 1 to 3 days, and armies in a battle don't move while it lasts.
4. **Standing orders**: for example armies set to attack look at visible enemies in neighbouring provinces.

The day loop only decides where movers are and who meets whom. Food, sickness, sieges and pay run once a month, not daily.

Days already walked toward the next place are called **progress**, and they carry over into the next month. An army halfway to the next province at the end of March keeps those days in April.

At the end of every day, every mover stands in exactly one place, a land province or a sea zone, never between two.

### Battles inside the month

Battles are simulated **one at a time, in the order they happen**. If there are battles on day 9 and day 22 in Langres, the day 9 battle is resolved first. Each battle's result is worked out when its turn comes and is ready before it is shown, so watching a battle is only playback.

When the month reaches a battle your armies or fleets fight in, the turn **stops on that battle**. For example, if Dunois's army and the army of the Bastard of Burgundy both stand in Langres at the end of day 22, the turn stops on day 22, and the day loop carries on only when you choose to carry on.

Battles between other realms never stop the turn. If you play France and Castile fights Navarre on day 5, the month rolls on.

If the app is killed while the turn is stopped at a battle, the campaign resumes from the save taken before the turn, with the same orders. The month reaches the same battle in Langres on day 22 again, with the same result.

How exactly the stop at a battle looks is still being settled between three designs (OQ-TIME-3).

### Determinism: same world, same orders, same result

The turn is fully reproducible:

- All randomness comes from one seeded random generator (`Rng`), never from the platform. Its whole state is four 32-bit numbers. A single seed number is spread over those four with a mixing step, and the same seed gives the same sequence on every phone, PC and server.
- The engine runs its steps (phases) in a fixed order.
- The same world plus the same orders always gives the same world hash (`hashWorld()`). That lets tests, and later a server, check that a turn was computed identically elsewhere.
- The random generator's state is saved with the world, so a loaded campaign continues the exact same sequence.
- Nothing outside the engine changes the simulation: not the music, not the interface, not the settings. Anything that changes rules, balance or the AI is a campaign rule chosen at new game and saved in the campaign, never a setting.

The engine today runs: apply orders, then marches, then the economy, then levies, then advance the date. This order comes from the code, not from a design, and it is still open (OQ-TIME-14).

### Turn boundaries and saves

A save always represents the world **between two turns**, never halfway through one. If your phone puts the app in the background or kills it while a turn is being worked out, the turn is processed again from the last turn-boundary save with the same orders and gives the same result. If a balance change is loaded with a campaign, the changed rules apply from the next turn on. See [Saving](Saving) for what a save holds.

### Cadences: what runs when

Each system decides what it does on its own tick, but the clock sets the rhythms. The overall order of systems inside one month has not been designed yet (OQ-TIME-2); here is what the designs say runs on each cadence.

| Cadence | What runs | System |
|---|---|---|
| Daily (30 times) | Move, stop checks, contact, standing orders | [Troop Movement](Troop-Movement), [Warfare](Warfare) |
| Daily | Fleets move once a day | [Naval](Naval) |
| Daily | Traders walk on the same day loop and collect in every province they enter | [Trade](Trade) |
| Weekly | Armies eat; the reserve shrinks abroad and refills at home | [Warfare](Warfare) |
| Weekly | Hunger: 5 % desert, 2 % die, 1 horse in 10 eaten | [Warfare](Warfare) |
| Weekly | Plunder burns one tile a week once the store is gone; a raid burns one tile a week, then moves on | [Warfare](Warfare) |
| Weekly | Forced march: levies desert 2 % a week | [Warfare](Warfare) |
| Weekly | Plague, while an outbreak runs | [Provinces](Provinces) |
| Monthly | Births, deaths and overflow; homeless move | [Provinces](Provinces) |
| Monthly | Sickness on campaign; the siege month; pay owed, months out, drill; reserve rots 5 % a month | [Warfare](Warfare) |
| Monthly | Storms at sea in storm season; sailors in port and ship states | [Naval](Naval) |
| Monthly | Building upkeep; building sites advance; finished buildings open their slots before overflow; the AI looks at one province per country | [Buildings](Buildings) |
| Monthly, after the day loop | Trade ratio gain and decay; trader upkeep | [Trade](Trade) |
| Monthly | Colony progress +5, locals' pressure, the colony eats 20 rations | [Exploration and Colonies](Exploration-and-Colonies) |
| Monthly | Recruit pool refills, Fallen and Veterans fade, training, pay | [Recruiting](Recruiting) |
| Monthly | Rising chance in plotting provinces; rebels join, spread, starve | [Rebellions](Rebellions) |
| Monthly | Subject tribute | [Subjects](Subjects) |
| Each turn | Funding rebels or a revolution (gold and a caught roll); AI envoys score candidate actions | [Diplomacy](Diplomacy), [Revolutions](Revolutions) |
| Monthly | Pool events roll against how often they happen on average | [Historical Events](Historical-Events) |
| After the turn's systems | Attention and tutorial checks | [Tutorial and Help](Tutorial-and-Help) |
| Last of all | Achievement tests | [Achievements](Achievements) |
| Seasonal (every 3 months) | Famine check and stores rot; farms, groves and fisheries make food; subject loyalty; resident envoys and courting; lords lose loyalty while an army takes their grain; pirate fleets grow by one | several |
| Yearly | The harvest in autumn (collection, castle shares, spread); traders and trade balance, trade value, reroute; wares, neglect years, village works and craft buildings, AI advice; culture drift after births and deaths; faith mix with the traders; diplomacy fades and league checks | several |
| Every 5 years | Culture's engine-raised checks | [Culture](Culture) |

A few ordering rules are fixed by the designs:

- Achievement tests run at the very end of the turn so they read final values.
- Attention and tutorial checks read the finished turn.
- The trade ratio updates after the day loop.
- Finished buildings open their slots before overflow runs.
- Culture drift runs once a year after births and deaths.
- The faith mix updates once a year at the same time as traders and trade balance.
- A diplomatic answer arrives the turn after the proposal is sent.

### Seasons and the hemispheres

Seasons are three months long. Some seasons depend on where you are:

| Season | North | South |
|---|---|---|
| Winter | December to February | June to August |
| Snow peaks with no pass and no road are closed | December to March | June to September |

Wet seasons follow the climate: monsoon Asia June to September, the Sahel and savanna July to September, the Amazon December to May.

The harvest is rolled in autumn, and rice paddies harvest twice a year. If you set the autosave to "every 12 turns", it falls each January.

### Ages and eras

**Ages** are history's big situations, owned by [Historical Events](Historical-Events). Each starts and ends by its own conditions inside a window of years, and each has forced start and end dates so a stalled game still moves on. Ages may overlap, and a period may belong to several ages. The ages in the game are Gunpowder Empires, Exploration, Reformations, Atlantic Empires, Crisis and Absolutism, Revolutions, Industrialization, Imperialism and World Wars.

**Eras** are the dated bands of the [Research](Research) and [Warfare](Warfare) trees:

| Era | Years |
|---|---|
| I | 1444 to 1500 |
| II | 1500 to 1600 |
| III | 1600 to 1700 |
| IV | 1700 to 1800 |
| V | 1800 to 1870 |
| VI | 1870 to 1914 |
| VII | 1914 to the end date |

## What you see

- **End turn** sends your orders. With the confirmation setting on, it asks first and names the number of open warnings.
- **Turn in progress**: the month plays out on the map. Orders are frozen, but you can still pan and zoom.
- **Battle stop**: when the month reaches one of your battles, the turn stops on it, and you carry on when ready.
- **Events**: shown one at a time in date order; End turn opens the first unanswered one if you try to skip it.
- **Turn report**: shown last, including any rejected orders with their reasons.
- **End of campaign**: the wrap-up events, a closing sequence and the final result.

The screens themselves are described on [Screens and Navigation](Screens-and-Navigation).

## How it connects

- [Troop Movement](Troop-Movement): runs in the day loop; progress carries over between months.
- [Naval](Naval): fleets take their day step in the same loop; monthly storms and ship states.
- [Trade](Trade): traders walk the day loop; the trade ratio updates after it; yearly reroute.
- [Warfare](Warfare): battles one at a time; weekly food and hunger; monthly sieges and sickness.
- [Provinces](Provinces): monthly births and deaths, seasonal famine, weekly plague.
- [Buildings](Buildings): monthly upkeep and sites, seasonal food, yearly wares and advice.
- [Your Realm](Your-Realm): autumn harvest, monthly income, when scores are judged.
- [Recruiting](Recruiting): monthly levy recovery and pool refill.
- [Exploration and Colonies](Exploration-and-Colonies): monthly colony progress.
- [Diplomacy](Diplomacy): answers next turn, seasonal envoy ties, yearly fades, each-turn AI.
- [Subjects](Subjects): monthly tribute, seasonal loyalty.
- [Rebellions](Rebellions) and [Revolutions](Revolutions): monthly rolls and funding.
- [Culture](Culture) and [Religion](Religion): yearly drift and faith mix; five-yearly culture checks.
- [Historical Events](Historical-Events): monthly pool roll, ages with forced dates, the end-of-campaign wrap-up.
- [Research](Research): supplies the era dates.
- [Saving](Saving): the turn boundary is the only save point; the random state, turn, date and options are saved.
- [Screens and Navigation](Screens-and-Navigation): turn in progress, battle stops, events and report; End turn blocked by events.
- [Achievements](Achievements): turn-end, year-end, harvest, spring-start and campaign-end moments; tests run last.
- [Tutorial and Help](Tutorial-and-Help): checks read after each turn.
- [Settings](Settings): End turn confirmation and autosave interval; settings never change the simulation.
- [The 1444 Start](The-1444-Start): start date, seed and campaign rules such as the end date.
- [Music and Sound](Music-and-Sound): music reads turn results, outside the engine.
- [Map and Lenses](Map-and-Lenses): month playback and turn-time budgets.

## Numbers

| Value | Config key | Design value | Provisional? |
|---|---|---|---|
| Start date | `startDate.year`, `startDate.month` | 1444, month 3 | No, but see OQ-TIME-1 |
| Days in a month | `march.daysPerMonth` | 30 | Yes (placeholder) |
| Campaign end date | `options.endDate` | 31 August 1939 (default) | No (decided) |
| Winter months | season calendar (`seasonFactor`) | December to February north, June to August south | No |
| Snow-pass closure | troop-movement config | December to March north, June to September south | No |
| Wet seasons | troop-movement config | as listed above | Yes |
| How often pool events roll | `selection.pool_roll_interval_months` | 1 month | Yes (placeholder) |
| Month playback speed | `replaySecondsPer10Days` | about 1 second per 10 days | Yes |
| Autosave interval | settings | every turn, 6, 12 (each January) or off; default 12 | No |
| Age windows | `event-tree/data/ages.yaml` | per age | Event data |

## Still open

- **OQ-TIME-1**: Does a campaign start in March 1444 (engine), spring or April 1444 (tutorial), or on the catalogue's reference day of 11 November 1444?
- **OQ-TIME-2**: No design sets the global order in which systems run inside one turn; only a few constraints exist.
- **OQ-TIME-3**: Three designs disagree on how battles inside the turn are shown; this page follows the latest (stop at each player battle).
- **OQ-TIME-4**: How many weeks a 30-day month has, and where weekly steps run in the day loop.
- **OQ-TIME-5**: Which months make each season, whether they follow the hemisphere, and which month the autumn harvest falls in.
- **OQ-TIME-6**: Which month runs the yearly steps.
- **OQ-TIME-7**: Whether an interrupted turn is processed again or simply carries on, and exactly when the pre-turn save is taken.
- **OQ-TIME-8**: What happens to ages and periods whose window opens before 31 August 1939 but belong to out-of-scope history.
- **OQ-TIME-9**: Whether "era" follows the calendar or technology, and where.
- **OQ-TIME-10**: Whether there is a victory condition, how often a lead is checked, and which system owns it.
- **OQ-TIME-11**: Whether the same random generator is used for setup and the 24-month trade warm-up, and whether the warm-up moves the date.
- **OQ-TIME-12**: In what order the player's and each AI's orders are applied.
- **OQ-TIME-13**: In what order movers act on the same day.
- **OQ-TIME-14**: Whether the engine's current phase order is kept, and where events, sieges, battles and AI decisions go.
- **OQ-TIME-15**: Whether month playback is shown before, during or after the battle stops.

## For developers

- Spec: [`domain/time-and-turns/spec.md`](https://github.com/grrts/pocket-hedgemony/blob/claude/domain-specs-bdd-ebdpmx/domain/time-and-turns/spec.md), requirement code **TIME** (TIME-001 to TIME-065).
- Features: `domain/time-and-turns/features/` (calendar, end-turn, day-loop, battles-in-turn, determinism, cadences, ages-and-eras).
- Code: the turn pipeline lives today in `packages/engine/src/turn.ts` (`processTurn`, `advanceDate`), the random generator in `packages/engine/src/rng.ts`, the world hash in `packages/engine/src/hash.ts`. Rules code for this context goes in `packages/engine/src/domain/time-and-turns/`. Start date and days per month are in `packages/rules/data/defines.json`.
