# Time and Turns

Pocket Hegemony is played one week at a time, from 11 November 1444 to 31 August 1939. You give your orders, press End turn, and the game plays out the 7 days of that week for every army, fleet and trader in the world at once. This page explains the clock: how a turn runs, how battles slow it, what happens daily, weekly, monthly, seasonally and yearly, and how the campaign is won and ends.

## How it works

### One week per turn

Every turn is one week: 7 days on the real calendar. The very last turn ends on 31 August 1939 and may be shorter. Months have their real number of days, 28 to 31, with leap years in February (every fourth year, except years ending in 00 that can't be divided by 400; the game uses these rules for every year, before 1582 too). Things counted per day, like marching, sailing, traders and battles, use the real number of days. Things counted per month, like tax, wages, upkeep and growth, still come once a month, in full: they are paid at the end of the turn in which the 1st of a new month falls, whatever the month's length. Seasonal and yearly things work the same way. No rule counts turns: anything that lasts or waits is measured in days, weeks, months or years on the calendar. Only orders, End turn and the turn report are once per turn. When a turn is processed, the date moves on by 7 days and the turn counter goes up by one; a campaign is about 25,800 turns.

Every campaign starts on **11 November 1444**, the day after the battle of Varna, the day the realms and their relations are drawn from. The tutorial, "The Year of Varna", starts on the same day. The turn counter starts at 0, and loading screens call the start "Autumn 1444".

Before the first turn, the game sets up the world and lets the traders warm up their routes. All of that uses the campaign's one random seed and does not move the date.

### How a campaign is won and ends

There are two ways to win.

- **World domination.** If your realm owns, or holds as subjects, half of the world's settled land provinces, you win. This is checked in the turn in which 1 January falls, and the win counts at once. You may keep playing to the end date afterwards.
- **Best at the end.** The campaign ends on **31 August 1939**. On that day the realm leading the Economy score, the realm leading the Power score and the realm leading the Technology score each win in that score. No margin is needed, and realms that tie share the win. The scores are worked out each January for the realm book, but the winner is only judged at the end.

A campaign that reaches the end without a win shows the final scores and your rank. The end date is chosen when you start a campaign and saved with it. When it is reached, the campaign ends with the final wrap-up events, a closing sequence and the final result. There is no playing on past it.

Nothing after 1939 is in the game: no Era VIII, no Second World War events, and no Decolonization, Cold War or Globalization ages.

### Orders and End turn

Every command that changes the world is an **order**, for example "move this army to that province". The player and the AI send exactly the same kinds of order through exactly the same pipeline. There are no player-only shortcuts.

- Orders you give during your turn are **queued, not applied**. If you tell Jean de Dunois's army in Paris to march to Dijon, it still stands in Paris until you press End turn.
- When you press End turn, your orders are applied first, then each AI realm's, realm by realm in a fixed order.
- If an order can't be applied, it is **rejected** with a plain-language reason, listed in the turn report, and the rest of the turn still runs.
- An army can take only one move order per turn. A second one is rejected with "army already moved this turn".
- While the turn is being processed, orders are frozen. You can still pan and zoom the map.

**Unanswered events block End turn.** If any event is still waiting for your answer, End turn opens the first unanswered event instead. Nothing ever answers an event for you.

**Warnings never block.** If the End turn confirmation setting is on, the game asks first and tells you how many warnings are open, for example "3 warnings wait for you". You can look, or end the turn anyway.

### Auto turns

In a single-player campaign you can let the weeks play one after another. Tap **Auto**, just above End turn, and the next week starts by itself as soon as one has played and been saved, at your Turn playback speed. Auto turns change only when End turn is pressed, never what happens in a week.

**Pausing finishes the week.** While Auto turns run, a tap on End turn or on Auto (or Space) doesn't stop the clock mid-week: the week plays to its end, then the game stops and you can give orders. Until then both buttons say "Stops at the end of this week"; tap Auto again to keep going. On a keyboard, Shift+Space switches Auto turns.

**Auto turns stop by themselves** at the end of a week in which something needs you, and the alert over the map says what: an event, one of your battles or sieges, a war of your realm, a call to arms, a peace offer or an envoy waiting, beaten rebels waiting for your verdict, scholars with nothing to study, or one of your armies reaching the end of its march. An event, a revolution or one of your battles still makes the week wait at once, as it always does. Auto turns are off every time you load a campaign.

### The order of a turn

Every turn runs the same steps in the same order:

1. **Orders**: yours first, then each AI realm's.
2. **The 7 days of the turn** (the day loop, below), then the weekly steps.
3. **Monthly steps**, only in the turn in which a new month begins: sieges first, then armies and fleets settle their month (sickness, pay, ship states, colonies), then provinces (people, food and tax), buildings, recruiting, the realm (treasury and lords), research, trade upkeep, subjects, government, diplomacy, culture, religion, rebellions and revolutions.
4. **Seasonal steps**, in the turn in which a season begins.
5. **Yearly steps**, in the turn in which 1 January falls.
6. **Events**, then the national strengths tick.
7. **Achievements**, always last.
8. **Autosave**.
9. The date moves on 7 days.

Because provinces run before buildings, a building finished this month takes in homeless people from next month on.

### What a turn looks like

Inside one turn you see, in this order:

1. The week playing out on the map, at about one second per ten days, slowing down while one of your battles runs.
2. Each of your battles, followed while it runs.
3. The events that fired, one at a time in date order.
4. The turn report.

Events and the report are skipped when there is nothing in them.

### Watching time pass

When you end a turn, the date doesn't jump a week. It ticks day by day while the week plays on the map, armies walking their routes, battles fighting and sieges going on as the days pass. While one of your battles runs, the clock slows to 4-hour steps and shows the hour.

### The day loop: the days inside a turn

The turn is played out day by day, all 7 of them, for every mover at once: armies, fleets, traders and trade ships, and exploration ships. They all share one clock, so a trader and an army can meet on the same day, and a fleet that closes a strait on day 12 matters to an army trying to cross on day 13.

Each day runs these steps, always in this order:

1. **Move**: armies first, then fleets, then traders, then exploration ships, each kind in a fixed order. So an army crossing a strait on the very day an enemy fleet arrives there gets across.
2. **Stop checks**: movers that arrived somewhere check what stops them.
3. **Contact**: hostile armies in the same place meet, and a battle may begin.
4. **Battles**: every running battle fights its rounds. Armies in a battle don't move while it lasts.
5. **Standing orders**: for example armies set to attack look at visible enemies next door.

At the end of every turn armies eat (from home or from their reserve), hunger bites, plunder and raids burn a tile, forced marches lose men, and plague spreads while an outbreak runs. Sieges are worked out once a month, at the start of the monthly steps.

Days already walked toward the next place are called **progress** and carry over into the next turn. At the end of every day, every mover stands in exactly one place, never between two.

### Battles inside the turn

A battle begins on the day two hostile armies meet, and it is fought over time, round by round, until one side is beaten or retreats.

While a battle your army or fleet is in is running, **time keeps passing but slows down**: each day is played in six steps of 4 hours. Each step fights one round of every running battle and moves every other army, fleet and trader a sixth of a day, so your armies (and anyone else's) can march in and join the battle while it lasts. When no battle of yours is left, the days go back to whole days.

At any step you can change a battle's standing orders or order a retreat. There is no skip: you watch each of your battles to the end. If several of your battles run at once, you can switch between them to follow each one and decide when to retreat.

Battles between other realms never slow the game. They fight their six rounds a day all at once, so they last just as long as yours, and other armies can still join them at the start of a day. Any battle, yours or not, can be replayed afterwards from its notice.

If the app is killed while a battle runs, the turn is played again from the save taken before it, with the same orders, and the battle comes out the same.

### Determinism: same world, same orders, same result

- All randomness comes from one seeded random generator, never from the device. The same seed gives the same sequence on every phone, PC and server.
- The turn always runs its steps in the same order, and ties on the same day are broken by a fixed rule.
- The same world plus the same orders always gives the same result, which tests and a later server can check.
- The random generator's state is saved with the world, so a loaded campaign continues the same sequence.
- Nothing outside the simulation changes it: not the music, not the interface, not any setting. Anything that changes rules, balance or the AI is a campaign rule chosen at new game.

### Turn boundaries and saves

A save always holds the world **between two turns**. If your phone puts the app in the background while a turn runs, the turn pauses and carries on when you come back. If the app is killed, the turn is played again from the last save with the same orders and gives the same result. If a balance change is loaded with a campaign, the new rules apply from the next turn on. See [Saving](Saving).

### Cadences: what runs when

| Cadence | What runs | System |
|---|---|---|
| Daily (7 times a turn) | Move, stop checks, contact, battle rounds (six a day), standing orders | [Troop Movement](Troop-Movement), [Warfare](Warfare) |
| Daily | Fleets sail; traders walk and collect in every province they enter | [Naval](Naval), [Trade](Trade) |
| Weekly (end of every turn) | Armies eat; hunger (5 % desert, 2 % die, 1 horse in 10 eaten); plunder and raids burn a tile; forced march loses 2 % of levies | [Warfare](Warfare) |
| Weekly | Plague, while an outbreak runs | [Provinces](Provinces) |
| Monthly (the turn in which the 1st falls) | Sieges first, then sickness, pay and drill; storms at sea; sailors and ship states; colony progress | [Warfare](Warfare), [Naval](Naval), [Exploration and Colonies](Exploration-and-Colonies) |
| Monthly | Births, deaths and overflow; building upkeep and sites; recruit pool; treasury and lords; trade ratio and trader upkeep; subject tribute; funding rebels; AI envoys; rising chances | several |
| Monthly | Pool events roll against how often they happen on average | [Historical Events](Historical-Events) |
| Seasonal (March, June, September, December) | Famine check and stores rot; farms, groves and fisheries make food; subject loyalty; resident envoys and courting; lords lose loyalty to an army taking their grain; pirate fleets grow | several |
| Harvest (September in the north, March in the south) | The harvest is rolled; rice paddies harvest in both months | [Your Realm](Your-Realm), [Provinces](Provinces) |
| Yearly (January) | World domination check; wares, neglect years and building advice; culture drift, then the faith mix; diplomacy fades and league checks | several |
| Every 5 years (January of 1445, 1450 …) | Culture's own checks | [Culture](Culture) |

A diplomatic answer arrives the turn after the proposal is sent, a week later.

### Seasons and the hemispheres

| Season | North | South |
|---|---|---|
| Spring | March to May | September to November |
| Summer | June to August | December to February |
| Autumn | September to November | March to May |
| Winter | December to February | June to August |
| Snow peaks with no pass and no road are closed | December to March | June to September |

Which hemisphere a province is in comes from its latitude. Wet seasons follow the climate: monsoon Asia June to September, the Sahel and savanna July to September, the Amazon December to May. If you set the autosave to "every 12 months", it falls in each January turn. The rotating autosave goes by the calendar, at most once a month, so it doesn't write every week.

### Ages and eras

**Ages** are history's big situations, owned by [Historical Events](Historical-Events). Each starts and ends by its own conditions inside a window of years, and each has forced dates so a stalled game still moves on. Ages may overlap. The ages in the game are Schism and Conquerors, Gunpowder Empires, Exploration, Reformations, Atlantic Empires, Crisis and Absolutism, Revolutions, Industrialization, Imperialism and World Wars. An age whose window runs past 1939, like World Wars, simply runs to the end date; an age that would start on an event after 1939 never starts.

**Eras** follow the calendar:

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
- **Auto**, above End turn: lit while Auto turns run, blinking while they stop at the end of the week.
- **Turn in progress**: the week plays out on the map, slowing to 4-hour steps while one of your battles runs. Orders are frozen, but you can pan and zoom.
- **Battle view**: follow a running battle, change its standing orders, retreat, or switch to another of your running battles.
- **Events**: shown one at a time in date order.
- **Turn report**: shown last, including rejected orders with their reasons; battle notices can be replayed.
- **End of campaign**: the wrap-up events, a closing sequence and the final result with the winners and your rank.

## Numbers

| Value | Design value | Provisional? |
|---|---|---|
| Start date | 11 November 1444 | No |
| Days in a month | 28 to 31, the real calendar with leap years | No |
| Steps in a day while your battle runs | 6 of 4 hours | No |
| Playback of one 4-hour step | about half a second | Yes |
| Days in a turn | 7 (the last turn may be shorter) | No |
| Seasonal turns | the turns in which 1 March, 1 June, 1 September or 1 December falls | No |
| Harvest | September north, March south; paddies both | No |
| Yearly turn | the turn in which 1 January falls | No |
| World domination | half the settled land provinces, checked each January | No |
| Campaign end date | 31 August 1939 (default) | No |
| Wet seasons | as listed above | Yes |
| How often pool events roll | every month | Yes |
| Playback speed | about 1 second per 10 days | Yes |
| Autosave interval | every month, every 6 months, every 12 months (each January) or off; default 12 months | No |

## Still open

Nothing about the clock is left open.

## For developers

- Spec: [`domain/time-and-turns/spec.md`](https://github.com/grrts/pocket-hedgemony/blob/claude/domain-specs-bdd-ebdpmx/domain/time-and-turns/spec.md); features in `domain/time-and-turns/features/`.
- Code: `packages/engine/src/domain/time-and-turns/` (turn order, day loop, seasons, victory timing), on top of `packages/engine/src/turn.ts`, `rng.ts` and `hash.ts`. Numbers are in `packages/rules/data/domain/time-and-turns.json`.
