# Historical events

Historical events are the game's history layer: the turning points of five centuries, from the fall of Constantinople to the Great Depression, arriving as cards with choices. They follow the state of the world rather than a fixed calendar, so history can come early, late, differently or not at all, and every event lets you decide how your realm answers it.

## How it works

### The campaign span

Events run from the campaign's start to the campaign's end date, which is 31 August 1939 by default (it is one setting). When a campaign loads, every event that history places after that date is dropped and never fires. That covers the Second World War events, the Holocaust, the 1943 Bengal famine, the atomic bombings and everything in the Cold War and decolonization chains: 59 events in the current data. The ages Age of Decolonization, Cold War and Age of Globalization never start, and any age still running on the last day is cut there. An age that would end on a dropped event (the World Wars age ends on the Second World War) simply runs until its other end condition or the end date.

The interwar years stay in: the Wilsonian moment, the 1918 armistice, the 1918 influenza, Versailles, the May Fourth movement, the founding of the Soviet Union, Lausanne, the Great Depression, the Italian invasion of Ethiopia and the Second Sino-Japanese War.

### Principles

A few rules shape every event in the tree.

- **History is a reference, not a script.** Each event carries a history block (dates, a summary, why it matters, sources, how confident the record is, and any disputes). That block never drives play. Only the event's availability, trigger and selection decide when it happens.
- **Roles, not hard-coded countries.** An event names slots such as `$realm`, `$sponsor` or `$resister`. When the event becomes eligible, each slot is bound to whichever country, entity or province meets its selector. A selector can be `fixed` (the historical holders) or a condition, optionally limited to a place. So "a monarchy in deep debt with liberal ideas spreading" can be France, or someone else.
- **Agency for everyone.** Colonised, enslaved and Indigenous actors can hold the initiator and resister roles and choose their own options.
- **Harm is shown, never rewarded.** An event marked narrative only depicts an atrocity. It never offers the perpetrator an option with a positive stat or prestige payoff, and it acts on the people it names (population and forced movement of a population group), not just on a modifier. Enslaved people are never a trade good or a production bonus on the victims' land; enslavement is forced movement of people, with costs on the societies they were taken from.
- **No invented facts.** Contested dates and numbers sit in `disputes` with lowered confidence, and gameplay magnitudes are labelled as design values. Every source is marked verified or not, and a historian spot-checks citations before release.
- **Our own model.** The tree uses its own words: prosperity, innovations, trade hubs, mean years, notoriety, integration strain.

### Ages

An age is a broad frame over the world with a window, start and end conditions and forced dates. Once the game is inside an age's window it checks the start and end conditions every year. If they never come true, the forced dates start and end the age anyway, so a stalled game still moves on. Several ages run at the same time.

| Age | Window | Forced start | Forced end |
|---|---|---|---|
| Schism and Conquerors | 1378 to 1460 | 1378 | 1460 |
| Gunpowder Empires | 1420 to 1760 | 1453 | 1760 |
| Exploration | 1415 to 1680 | 1445 | 1680 |
| Reformations | 1480 to 1700 | 1530 | 1700 |
| Atlantic Empires | 1480 to 1880 | 1520 | 1880 |
| Crisis and Absolutism | 1590 to 1790 | 1640 | 1790 |
| Revolutions | 1750 to 1880 | 1800 | 1880 |
| Industrialization | 1700 to 1950 | 1830 | 1950 |
| Imperialism | 1800 to 1945 | 1860 | 1945 |
| World Wars | 1890 to 1960 | 1925 | 1960 |

Each age also lists its regions, so systems that care whether "the age has begun in your region" (exploration, national strengths, music) can read it. There are 13 ages in the data and these 10 are inside the campaign.

The campaign is moving to a start on 20 September 1378, the day the Western Schism begins. The **Age of Schism and Conquerors** covers the years from then to the fall of Constantinople: two popes, Timur's campaigns, the early Ming fleets. It is under way from the first day in every region and ends once the Schism and the Council of Basel are over and Constantinople has fallen. **Gunpowder Empires** starts when three of the eight great powers (the realms with the most provinces) know Bombards, or when Constantinople falls. **Exploration** starts when Portugal or Castile has the ocean ships (Carrack and caravel) or holds the Atlantic islands. A fast world starts them early and a slow one waits for 1453 and 1445. A campaign that starts in 1444 has all three under way from the start, as before.

### Periods

A period is a regional or thematic situation inside one or more ages, such as a dynastic crisis or a regional war. There are 101. A period becomes active when its start condition holds inside its window (a period marked `initial` is already running at the start, if the start lies inside its window) and ends when its end condition holds, so it can start early, late or never. Events can also start and end periods directly, and conditions can ask whether a period or an age is active. Which events belong to a period or an age is declared once, on the event itself.

From the 1378 start the Western Schism, Timur's conquests, the Caroline phase of the Hundred Years' War, Ottoman expansion, Muscovite consolidation and the Southeast Asian states are under way. Others follow from what happens: the Timurid fragmentation once Timur's conquests are over, the Lancastrian phase when England and France go to war again, the Ottoman Interregnum only if Timur breaks the Ottomans, the Hussite wars when religious rebels rise in Bohemia, the Ming treasure voyages while the Ming are steady, Majapahit's decline, and Late Ming once the voyages are over. Portuguese oceanic expansion waits for the Age of Exploration, and Aztec and Inca expansion for the Triple Alliance and the Inca.

### When an event can happen

An event has to pass several gates before it can fire.

- **Years.** It never fires outside its earliest and latest year.
- **How strongly the date binds.** `mandatory` fires inside the window whenever the trigger holds: in the window's last year it is certain. `approximate` is weighted toward the historical date: its monthly chance is doubled in the history year and the extra fades away over 10 years either side, so the death of Suleiman is twice as likely in 1566 and half again as likely in 1561 or 1571. `reference` uses the date only as a guide.
- **Repeating.** `one_time` fires once. `recurring` can fire again after a cooldown: the Bengal famine of 1770 has a 30-year cooldown, so if Bengal's food security falls below 0.4 again in 1790 it cannot fire yet, but in 1801 it can. `process` diffuses and can fire for several countries.
- **Prerequisites.** Event chains use `all` (mandatory), `any` (alternative paths), `not` (exclusive) and `at_least` (n of m). A prerequisite can name an outcome: the French revolutionary wars need the French Revolution to have ended as a radical republic, so a constitutional monarchy outcome closes that branch.
- **Optional events** only raise the weight. If the American Revolution has happened, the French Revolution's weight is multiplied by 1.5, but it was never needed for eligibility.
- **Exclusive events.** When one of a pair fires, the other never does.
- **Invalidation.** When an event's invalidation condition holds, it is removed for good. If France becomes a republic by some other path, the French Revolution event is gone. A branch closed because its entity vanished can re-open if a later event creates that entity again.
- **Trigger.** A condition tree over the state of the world. For example, the French Revolution needs `$realm` to be a monarchy with debt of 2000 or more and liberalism of 0.25 or more, plus any of stability -1 or lower, legitimacy under 40, or the Laki eruption having happened. A France with debt 2100, liberalism 0.3, stability 0 and legitimacy 35 qualifies.

Triggers may only use condition types declared in the vocabulary: date, exists, controls, owns, borders, at war, war ongoing, relation, opinion, stat, rank, government, religion, religion share, culture group, innovation, ideology, tech, colonial presence, trade presence, rebels active, subject count, event, event active, period active, age active, flag, any country, all countries and count countries. Logic is all, any, not and at least. The `event` condition means "this event has happened", optionally with a given outcome, within n years, with a role bound to someone. No condition can ask whether a country is played by a person: you and the computer face the same history.

Targets can be a role, an entity id, a province, an area, a region, the whole world, or "this" inside the any, all and count country tests.

### How an eligible event is chosen

| Selection | What happens |
|---|---|
| Immediate | Fires as soon as it becomes eligible. |
| Pool | Rolled every month against its mean years (the expected wait once eligible), multiplied by its selection modifiers and any follow-up boost. An event with a mean wait of 4 years, modifiers of ×2 and a boost of ×1.5 rolls with all three applied. |
| Decision | Offered to its chooser. Napoleon's invasion of Iberia, with the invader role bound to France, is offered to whoever controls France. |

To keep the pace sane, no country gets more than 2 pool events a year. A decision a computer country leaves unanswered for 10 years lapses and goes back into the pool if it is still eligible. A decision offered to you never lapses: it waits for you like every other event.

**Follow-ups.** When an event fires, each of its follow-ups gets a weight boost during its delay window. Boosts are capped at ×5, fade out linearly over 10 years after the window closes, and never make an ineligible event fire.

**Alternate history.** When you start a new game, the "Events" choice picks how closely history is followed. Plausible is the default.

| Events choice | Follow-up boost | Historical option weight | Mean years |
|---|---|---|---|
| Historical | ×1.5 | ×2.0 | ×0.8 |
| Plausible | ×1.0 | ×1.0 | ×1.0 |
| Free | ×0.6 | ×0.5 | ×1.3 |

### Options and choices

Every event offers two to four options, and exactly one is marked historical, the one that matches the record. An option's chooser is a role: its controller, player or computer, picks. If an option has no chooser, the game rolls between options by weight. An option whose `allowed` condition is false is hidden. An option's effects add to the event's own effects.

When an event is offered to you, the game waits for your answer. Nothing ever answers an event for you: while one is waiting, End turn opens the oldest unanswered event instead.

The computer weighs each option by a base weight times named factors:

| Factor | True when |
|---|---|
| at_war | The country is at war |
| low_treasury | Treasury is below one year of expenses |
| high_unrest | More than half its provinces have 4 or more grievances |
| same_religion | The other party shares the state religion |
| rival | The other party is a rival |
| great_power | The country is in the top 8 by great power score |
| threatened | A hostile neighbour has more than 1.5 times its army strength |

### Effects

Effects land in tiers: **immediate**; **delayed** after a number of years (or a range); **ongoing** each month while the event runs; and **long term** as a permanent change to the world. In the Anglo-Zulu war, the "invade" option starts the war at once and annexes the Zulu kingdom a year later if its war weariness is 10 or more.

Some events run for a while. They last their duration, apply ongoing effects, end early if their `maintain` condition stops holding, and abort if their cancel condition comes true. Samori Toure's resistance runs for 16 years while the Wassoulou empire exists; if the empire falls in year five, the event ends and its ongoing effects stop. Conditions can ask whether such an event is still running.

The effect types are: modifier, stat, transfer, create country, annex, vassalize, release, war, peace, reason for war, relation, rebels, spread, population, move population, set flag, start period, end period, unlock, government, religion, trade route and colony. A stat change is a one-off delta, either a flat amount or a percentage. A war started by an event gets a stable id that later events can test. Adding a new condition or effect type takes one engine evaluator and nothing else; everything else is data.

A rebels effect is a spark: a rising starts at once in the province, and its men come out of the province's recruit pool. Rebellions then runs it like any other rising.

| Size | Share of the recruit pool | From a pool of 1000 |
|---|---|---|
| Small | one eighth | 125 |
| Medium | a quarter | 250 |
| Large | half | 500 |
| Huge | all of it | 1000 |

When a revolution's rising ends, the option you chose applies its "if the rising won" or "if the rising was crushed" effects.

### Modifiers

A modifier is a named, timed bundle of stat changes. There are 159. Each has a scope (province, country, region or global), its changes, a length in years (0 means permanent), a decay (none, linear or exponential) and a stacking rule (none, refresh or stack). A modifier that names no stacking rule refreshes. No modifier stacks more than 3 times. Exponential decay halves the magnitude at half the duration.

How a change applies depends on the stat: a plain number holds on a level stat while the modifier is active, and applies once a year on an accumulating stat. A percentage scales a derived stat, or removes that share of population each year. A key ending in `_growth` changes the yearly growth rate. A region-scoped modifier aimed at a country hits all its provinces.

### The event tree's statistics

The tree has its own abstract statistics (prosperity 1 to 60, unrest 0 to 100, stability -3 to +3, opinion -200 to 200, trust 0 to 100 and so on), split into stored values that are kept as state and derived values recomputed every tick. An event never writes a derived value directly, only its inputs or a modifier the formula reads; when a province's devastation rises, its local supply and output are worked out again the next tick.

The tree's abstract words never reach your cards. Each change lands as something concrete in the system that owns it:

| An event changes… | …and you see |
|---|---|
| prosperity +2 | two new buildings that fit the province |
| devastation +30 | 30 % of the province's tiles burned |
| unrest up | one named grievance from the event |
| fort level +1 | the castle one step up |
| infrastructure +1 | the road one step up |
| industry +1 | one factory |
| disease burden up | a plague outbreak |
| trade access | the trade ratio gain, for the event's duration |
| notoriety up | a notorious deed in every country that knows you |
| trust down | an oath broken |

Integration strain is only read by events, as the share of your provinces with a grievance.

### Flags, lists and entities

Triggers may only read flags that some effect sets or that are declared system flags set by the engine or the scenario (ruler died, succession crisis, succession dispute, regency, female succession, ruler led campaign, Atlantic island bases, potato blight, commercial crisis and the world-state flags). Religion sets its own three: persecution, missionary persecution and an inquisition. Religions, governments, innovations, ideologies, culture groups, rebel types, relation types, period kinds and entity kinds come from closed lists; adding a value needs no engine change. The lists hold nothing first seen after 1939, and there are 43 culture groups. The 625 entities (polities, companies, movements, population groups, organizations) have real existence spans. A population group is never owned and an organization holds no provinces.

### The data build

The event data is checked offline before it ships. The build splits it into runtime layers (history reference, ages, periods, event definitions, triggers, selection, execution, choices, AI, effects, modifiers, statistics, balance and English localization). All player-facing text comes from the localization layer, keyed by id and ready for translation.

The build checks that every id exists, every condition and effect type is declared, every event has its roles, two to four options with one historical, that narrative-only events pay no perpetrator, that there are no mandatory prerequisite cycles, impossible triggers or jointly required exclusive pairs, that entities exist at the event's date, that flags read are set or declared, and that ages and periods have start and end conditions. It also reports coverage: any region with fewer than 2 events in an age that lists it, and an agency share (initiator, beneficiary and resister slots over all slots in a region) below 0.35. An error fails the build; warnings do not. The current result is 0 errors and 21 warnings; the anachronism warnings are corrected when a historian checks the sources before release.

### Hooks for other systems

An event can carry a music tag (good event, bad event, major event, crisis, revolution) that moves the soundtrack. Events marked tutorial only never fire in a real campaign.

## What you see

- **The event card.** A fired event opens as a modal card with its options. Events open one at a time, queued in date order.
- **End turn waits for you.** Unanswered events block End turn until you choose.
- **The "Events" choice** (Historical, Plausible or Free) is offered among the new game options.
- **The chronicle** records events that were invalidated.
- **The end of the campaign** shows the final scores; there is no separate wrap-up event.

## How it connects

- [Provinces](Provinces): event statistics such as prosperity, devastation and unrest land on province numbers.
- [Your realm](Your-Realm): legitimacy, stability, war weariness, prestige, treasury and the engine flags such as ruler died.
- [Research](Research): the 17 innovations are research-tree inventions with the same ids.
- [Trade](Trade): trade access lands on the trade ratio gain; trade presence and trade route effects.
- [Government](Government): 16 government values map to forms of rule.
- [Rebellions](Rebellions): the rebels effect starts a rising; "rebels active" reads it.
- [Revolutions](Revolutions): built on events, adding a revolution block and the "rising won" and "rising crushed" effects.
- [Religion](Religion), [Culture](Culture), [Subjects](Subjects), [Diplomacy](Diplomacy), [National strengths](National-Strengths), [Buildings](Buildings): each adds its own conditions and effects to the events.
- [Exploration and colonies](Exploration-and-Colonies): the Age of Exploration gates exploration per region.
- [Warfare](Warfare): war, peace and reasons for war; prestige from victories.
- [Screens and navigation](Screens-and-Navigation): the event card, the queue and blocking End turn.
- [Music and sound](Music-and-Sound): music tags on events.
- [Achievements](Achievements): your roles and historical or non-historical choices.
- [Tutorial and help](Tutorial-and-Help): tutorial-only scripted events such as the Varna crusade.
- [How a turn works](Time-and-Turns): events run after every other system's monthly, seasonal and yearly steps, just before achievements and the autosave.

### Each month

Turns are a week long, so this runs in the turn in which a new month begins. Each year, in the turn in which 1 January falls, the game checks age and period conditions and applies forced dates. Each month it lets computer decisions older than 10 years lapse, then checks eligibility and binds roles, fires immediate events, rolls pool events under the pacing cap, offers decisions, queues fired events for you in date order (computer choosers answer at once), applies effects, schedules delayed ones, ticks running events and modifiers, fades follow-up boosts and works out derived values again.

## Numbers

All of these are provisional values still being balanced, unless noted.

| Key | Value |
|---|---|
| `selection.pool_roll_interval_months` | 1 |
| `selection.max_pool_events_per_country_year` | 2 |
| `selection.decision_expiry_years` | 10 |
| `date_binding` (approximate events) | ×2.0 in the history year, fading over 10 years |
| `selection.alternate_history_mode.historical` | 1.5, 2.0, 0.8 |
| `selection.alternate_history_mode.plausible` | 1.0, 1.0, 1.0 |
| `selection.alternate_history_mode.divergent` | 0.6, 0.5, 1.3 |
| `follow_ups.max_boost` | 5.0 |
| `follow_ups.boost_decay_years` | 10 |
| `ai_factors` | the 7 factors above |
| `rebel_sizes` (share of the recruit pool) | 1/8, 1/4, 1/2, all |
| `options.max` | 4 options per event |
| `modifier_rules.default_stacking` | refresh |
| `modifier_rules.max_stacks` | 3 |
| `modifier_rules.exponential_half_life_share` | 0.5 |
| `coverage.min_events_per_region_age` | 2 |
| `coverage.min_agency_share` | 0.35 |
| Supply and output formula coefficients | 1, with no tech bonus |
| Per-event mean years, modifiers and AI base weights | per event, in `data/events/*.yaml` |
| Per-modifier changes and years | design values, in `data/modifiers.yaml` |
| Campaign end date | 31 August 1939 (a setting, not a placeholder) |

## Still open

- A historian's check of the sources and the dated anachronisms before release.

## For developers

- Spec: [`domain/events/spec.md`](https://github.com/grrts/pocket-hedgemony/blob/claude/domain-specs-bdd-ebdpmx/domain/events/spec.md), requirement code **EVT** (EVT-001 to EVT-068).
- Features: `domain/events/features/` (campaign-scope, principles, ages-and-periods, eligibility, selection, options, effects, modifiers, statistics, data-validation).
- Code: `packages/engine/src/domain/events/`; numbers in `packages/rules/data/domain/events.json`.
- Event data lives in the event tree design (`event-tree/data/`), with the schema in `event-tree/schema/event-tree.d.ts`.
