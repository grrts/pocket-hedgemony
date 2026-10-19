# National strengths

Every playable country has a heritage: what it is good at because of where and what it is, what it becomes good at when its moment in history comes, what it secretly wants, what it has achieved, and what holds it back. Heritage is small on purpose. It fits on one card of at most five rows, and every line changes something you can count somewhere else in the game: gold, officials, lords, recruits, horses, ships, scholars, traders, buildings or grievances.

## How it works

### The five parts

| Part | What it is |
|---|---|
| Birthright | The one always-on strength that comes from who the country is |
| Golden age | A strength tied to one historical age, active while that age is running and its condition holds |
| Ambitions | Hidden goals drawn from the country's own pool |
| Legacies | Permanent strengths you earned |
| Weakness | Something from history that holds you back until you overcome it |

Venice is a good example. Its birthright "Lagoon and Arsenal" makes galleys build 30 % faster, the capital's garrison 40 % stronger and ports raise 15 % more sailors. In the Age of Gunpowder Empires its golden age "The mude to Alexandria" can be active. It has the weakness "The feared lion", has three active ambitions, and starts with no legacies. Heritage is the game's own system; it uses no mechanic, name or value from another game.

### Birthright

Every country with heritage has exactly one birthright of its own. A birthright can name a *needs* condition. While that condition fails, the birthright goes dormant: it is shown greyed out and does nothing, and it wakes again as soon as the condition holds. A birthright is never deleted because you lost a war.

### Golden ages

A golden age belongs to one age of the [historical events](Historical-Events) system, and a country has up to 3. Each golden age moves through four states:

| State | When |
|---|---|
| Waiting | Its age has not begun |
| Active | Its age is running and its start condition holds |
| Inactive | Its age is running but the condition fails; years already served are kept |
| Ended | Its age ended or its *ends* condition held; this is for good |

Portugal's golden age "Carreira da Índia" belongs to the Age of Exploration and begins when Portugal has an Atlantic harbour and knows invention S4. If Portugal loses its Atlantic harbours it becomes inactive, keeping its years. Because golden ages follow the ages as they actually happen in your campaign, an early Atlantic crossing that starts the Age of Atlantic Empires early lets Atlantic golden ages begin early too.

**Marks.** A golden age that was active for 25 years in total leaves a mark when it ends: a permanent legacy worth a third of the golden age, which counts toward the 5 legacies. Carreira da Índia active for 24 years leaves nothing; at 25 years it leaves the mark "Cape charts". A golden age with no mark written for it leaves its first lever at a third of its value, so a golden age with +15 tax reach leaves a legacy of +5.

At most 2 golden ages can be active at once. If a third would begin, you are asked which one becomes inactive.

### Ambitions

Each country has a pool of 4 to 7 ambitions (at least 5 for hand-written countries, at least 4 for generated ones). When the campaign starts, 3 are drawn as your active ambitions, and at least one of them is tagged historical. Castile, with a pool of 6 of which 2 are historical, gets 3 drawn with at least one historical among them. If a drawn ambition's goal already holds on the first day, it is put back and another is drawn: no free wins.

Ambitions stay hidden. While an ambition is open, its plain goal is never shown.

| State | What you see |
|---|---|
| Hidden | Only its theme icon (land, sea, trade, faith, crown, learning, survival or wealth) and a one-line riddle hint, such as Venice's "The Visconti line is ending; the river is a border only by habit." |
| Hinted | Its hint condition held, so it is revealed. The hint is still the only words shown, but now you also see its warmth, the name of the legacy it promises and its deadline, if it has one |
| Done | The goal holds. You get the legacy, the plain goal is shown for the first time, and a new ambition is drawn |
| Lost | The deadline passed or the fail condition held. No penalty: the plain goal is shown as what might have been, and a new ambition is drawn |

When Portugal holds Calicut, its ambition "Beyond the Cape of Storms" is done and grants the legacy "Estado da Índia". If its window ends in 1560, the ambition is lost when 1561 begins.

**Warmth** is the share of the goal's conditions that currently hold, shown in three bands: cold (under a third), warm (from a third to under two thirds) and hot (two thirds or more). A count condition counts as partly met by how far it has come: a goal of 12 markets with 8 built is two thirds met. A goal that is a single yes-or-no condition goes from cold straight to done.

| Goal conditions | Holding | Warmth |
|---|---|---|
| 3 | 0 | cold |
| 3 | 1 | warm |
| 3 | 2 | warm |
| 3 | 3 | done |
| 4 | 3 | hot |

**Counsel.** Once every 10 years you can pay gold to reveal one ambition at once and see its warmth. Its words stay a hint. The price rises by era:

| Era | I | II | III | IV | V | VI | VII |
|---|---|---|---|---|---|---|---|
| Gold | 30 | 50 | 80 | 120 | 180 | 260 | 380 |

**Envoys.** A country that keeps a resident envoy at a foreign court for 2 years learns the hint and warmth of one of that country's active ambitions, never its plain goal. Milan with an envoy at Venice's court learns one of Venice's. The computer can do the same to you.

**Age ambitions.** Some pool entries name an age; they join the pool when that age begins.

**History mode.** A campaign setting chooses "Drawn" (the default) or "Historical only", which draws only historical ambitions. No setting reveals ambitions.

The [tutorial](Tutorial-and-Help) teaches ambitions with one ambition whose hint is plain.

### Legacies

Legacies are permanent, and come three ways: an ambition's reward, a golden age's mark, or a turned weakness. Great legacies, the rewards for the hardest goals, get a bigger budget. A country keeps at most 5 legacies; if you would earn a sixth, you are asked which one to let go.

### Weakness

A country has no weakness or one. A weakness has negative points and a condition to overcome it. When that condition holds, the weakness goes and its turned legacy is granted in its place. A weakness can never be bought off: only its condition or a reform event overcomes it.

### Levers

Every heritage effect is a lever: one named effect that changes one rule in the system that owns it by a value. A strength usually pulls one to three levers. Each lever has a unit, a cost in points per unit, its parameters, the design that owns its rule, and whether higher or lower is better.

| Unit | Meaning |
|---|---|
| pct | A percent change relative to the base rule |
| steps | Whole steps on a ladder the owning design defines |
| count | Whole things |
| flag | A rule switched on, or access granted |

There are 64 levers in 13 groups:

| Group | Levers | Example cost |
|---|---|---|
| Treasury (6) | tax reach, trade balance, toll gold, loan interest, tribute, loot | tax reach 0.1 per % |
| Economy (1) | ware output (all wares cost triple) | 0.06 |
| Food (5) | harvest steps, herd growth, fish, store rot, castle reach rings | harvest 1.2 per step |
| People (3) | growth, migrants, class slots | growth 0.1 |
| Rule (12) | official wage, official type, official years to full, official capacity, lord capacity, lord loyalty start, lord loyalty shield, retinue, grievance shield, days to capital, integration years, homeland resistance | grievance shield 1.5 (flag) |
| Army (13) | recruit refill, troop cap share, levy free months, break point, hits, horses, march days, forage, siege, garrison, hired company cost, commander style, commander skill | troop cap share 2.0 per point |
| Navy (5) | ship build, crew, ship hits, sea days, storm loss | storm loss 0.03 |
| Trade (3) | trader count, trader gain, traders passing | trader count 1.0 |
| Learning (5) | invention cost, scholar output, school seats, spread discount cap, invention known | invention known 1.5 (flag) |
| Belief (2) | faith shift, language shift | 0.05 |
| Abroad (4) | envoy count, opinion steps, oath fade, lands taken | envoy count 1.2 |
| Building (2) | building cost, building unlock | building unlock 1.5 (flag) |
| Events (3) | event weight, event option, stat | stat: by the stat's points |

Ten levers are provisional because the design that owns their rule is still being written: tribute, official capacity, lord capacity, ship build, crew, sea days, faith shift, language shift, envoy count and opinion steps. The trade levers follow the trade design: trade balance and traders passing raise the trade ratio gain, trader gain raises each deposit, and trader count gives extra traders at the start. Building levers use the buildings design's buildings, and a unique building variant is unlocked the same way. Their owner may rename them or point them at a rule; only the key changes in heritage data.

A lever can be limited to a scope with `where`: realm, capital, coast, core, royal, lords, frontier, a terrain, a culture group, a faith, an area or a region. A limited lever costs less.

### Conditions

Heritage uses the event tree's condition language unchanged, with `this` meaning the heritage's own country, and adds a few of its own:

| Condition | Meaning |
|---|---|
| knows | An invention is known |
| holds_place | Owns the province holding a named place |
| coastal | Owns a province with a harbour on the named sea, or any sea |
| count | A counted country-card stat, which can be `building:<id>` and can be relative to the start ("start*2", "start+3") |
| heritage | An item is `awake`, `done`, `lost`, `shed` or `held` (the data's state names) |
| independent | Has no overlord |

`relation {who: A, other: B, type: T}` reads as "A is the T of B". Each place name used by `holds_place` is bound once to a map province.

### Budgets

Each part has a budget in points (a point is about a tenth more of something central, for the whole realm).

| Part | Budget |
|---|---|
| Birthright | 3.0 |
| Golden age | 3.0 |
| Legacy | 2.0 |
| Great legacy | 3.0 |
| Weakness | −2.0 |

Smaller countries get a size bonus on their birthright and golden ages. Size class is the mean of six catalogue assessments (economic strength, manpower potential, military capability, naval capability, diplomatic influence, trade access), each from very low (1) to very high (5).

| Size class | Bonus |
|---|---|
| 4.5 or more | none |
| 3.5 or more | +0.5 |
| 2.5 or more | +1.0 |
| 1.5 or more | +1.5 |
| below 1.5 | +2.0 |

A scoped lever's cost is multiplied by its scope factor: a single `where` limit (capital, coast, core, royal, lords, frontier, terrain, culture, faith or region) 0.5, one named area or place 0.25, a terrain or sea parameter 0.5. Factors multiply but never go below 0.25. Ware output without a named ware costs triple, and the `stat` lever costs by stat: legitimacy 0.1, stability 1.0, prestige 1.0, notoriety 0.5, admin capacity 0.1, literacy 0.2, cohesion 0.1. The build totals every part of every country and reports any part outside its budget by more than 0.6.

### Who gets what

| Group | Count | Heritage |
|---|---|---|
| Tier A playable countries and subjects | 58 | Hand-written: birthright, 2 or 3 golden ages, 5 to 7 ambitions, weakness |
| Tier B and C playable countries and subjects | 434 | Generated from archetypes |
| Decentralised polities | 214 | Generated from archetypes for societies without a crown |
| Background actors, non-state actors, internal estates, collective institutions | 257 | None (not played) |

Generated heritage comes from 27 archetypes. Each has detection rules on catalogue fields and templates for the birthright, golden age and weakness, written in the country's own words. The game scores every generated country against all archetypes: the best gives the birthright and weakness, the second best may add a golden age. A generated golden age gets the first allowed age whose regions cover the country, with percentages scaled to the budget. Ambitions are filled from the catalogue record: likely rivals become "outlast" goals, preferred partners "bind or ally", disputed territories and key locations "hold a place", possible future paths a historical path, and trade routes "win a trade hub". Decentralised polities only take the crownless archetypes (forest, hill, herding, steppe, desert, island, mountain, ocean, chiefdom, commune, raiders, segmentary). A hand-written file overrides whatever generated parts it defines.

The current build has 706 countries with heritage (58 hand-written, 648 generated), 3,551 ambitions, 945 golden ages and 706 weaknesses, with 0 errors, 0 warnings, 273 place names to bind (most bind to the map's nearest land province by their name; the rest are bound by hand), and all 64 levers in use.

### When countries change hands

- **Annexation.** The annexed country's birthright becomes a dormant claim of the annexer. Once the annexer has owned its old capital and held most of its homeland for 30 years, the claim wakes as a second birthright. A country holds at most 2 birthrights.
- **Subjects** keep their whole heritage, and an overlord's legacies never apply to its subjects.
- **Released countries** get their catalogue heritage, or their archetype's generated heritage if they are not in the catalogue.
- **Formed countries** (a union, or a new state made by an event) keep the forming country's birthright and legacies, add the formed country's own heritage if any, and draw ambitions from both pools.

### Events

Heritage proposes four effects and one condition to the event tree. `grant_legacy` grants a legacy; `wake_heyday` makes a golden age active for a number of years even if its condition fails; `stir_ambition` reveals an ambition, keeping its words a hint; `shed_burden` overcomes the weakness. The `heritage` condition lets events ask about heritage, and the `event_weight` and `event_option` levers raise an event's weight or open an option for the country.

### The computer

The computer always knows its own ambitions and treats them as goals with weight 1.5 next to its personality priorities. When it completes one, it gets the legacy just as you would. Golden ages give it a reason to change course across the centuries. It can read your ambitions through a resident envoy kept 2 years at your court. When a third golden age would begin or a sixth legacy arrives, it lets the weakest one go (the one worth the fewest points).

## What you see

- **In the game today.** Every realm's card has a **Heritage** line on its General tab, naming its birthright and its weakness. Tap it, or the **Heritage** tab, to see the birthright, each golden age with the age it belongs to, and the weakness; tap any of them for its full text and history note. Under them, **In 1378** shows how the chronicles judge the realm at the start: Strength (economy, manpower, army, navy, trade, standing abroad), Government (reach of rule, finances, stability, institutions, cohesion, prospects) and Dangers (unrest, threat from outside), each as five steps with a word, with a question mark where the chronicles are unsure. The tab is there for every realm, also before you pick one. 110 of the 137 realms on the map have heritage; the rest say none is recorded yet. Ambitions, legacies and golden ages beginning follow when heritage is checked each turn.

- **The country card** gets one Heritage row: the birthright icon, the active golden age icon, three hidden ambition icons and the weakness icon. Tapping it opens the Heritage sheet.
- **The heritage card** shows five rows, never more: Birthright, Golden age, Ambitions, Weakness and Legacies ("none yet" when empty). Tapping a row shows its full text, its history note and what it changes. A dormant birthright is greyed.
- **Reveal moments.** When a hidden ambition is revealed or warmth rises from warm to hot, a small quiet animation plays and one line goes into the monthly digest.
- **Map shimmer.** While an ambition that names places or areas is hot, the map shimmers faintly over its region, without outlining or naming the target.
- **The nation picker** shows each country's birthright and weakness, a count of hidden ambitions, and its golden ages as the ages they belong to.
- Every country has the same system in every tier; the free tier only limits which countries you can pick.

## How it connects

- [Historical events](Historical-Events): ages drive golden ages; heritage uses the condition language and proposes four effects and a condition.
- [The 1378 start](The-1378-Start): catalogue fields, tiers, size assessments, personality and places feed generation.
- [Your realm](Your-Realm): levers on treasury, officials, lords, loyalty, recruits, horses and envoys.
- [Provinces](Provinces): levers on tax reach, harvests, growth, class slots, official types and grievances.
- [Warfare](Warfare): levers on troop cap, break point, marching, sieges, garrisons and commanders.
- [Recruiting](Recruiting): recruit refill and retinues.
- [Research](Research): invention levers, and invention ids for `knows`.
- [Trade](Trade): trader levers, trade presence and hubs.
- [Naval](Naval): ship build, crew and sea days (provisional).
- [Buildings](Buildings): building cost and unlock levers; unique variants and landmarks offered as hooks.
- [Government](Government): official and lord capacity; reforms that overcome weaknesses.
- [Religion](Religion) and [Culture](Culture): faith and language shift.
- [Diplomacy](Diplomacy): envoys, annexation and release; envoy and opinion levers.
- [Subjects](Subjects): tribute; subjects keep their heritage.
- [Revolutions](Revolutions): reforms and revolutions can overcome weaknesses or grant legacies.
- [Achievements](Achievements): suggested achievements for every ambition of a country and for 5 legacies.
- [Screens and navigation](Screens-and-Navigation): heritage row and sheet, nation picker, digest lines.
- [Map and Map Modes](Map-and-Lenses): the shimmer over hot ambitions; place names bound to provinces.
- [Settings](Settings): the history mode setting.
- [Tutorial and help](Tutorial-and-Help): the tutorial ambition with a plain hint.
- [How a turn works](Time-and-Turns): dates, eras for counsel gold, and years counted.

### Each turn

Heritage is checked once a turn (a week), right after historical events, and counts time in months by the date: a month is counted in the turn in which a new month begins, 12 months make a year, so a golden age needs 300 active months (25 years) to leave its mark. In order, heritage checks dormant claims and birthright needs; golden ages, counting a month active, granting marks and resolving a third beginning; ambitions, warmth, deadlines and draws, with digest lines; whether the weakness is overcome and a sixth legacy; then publishes its active levers to the systems that own them for the next month.

## Numbers

Every value the game uses, made from its config so it always matches the game: [National strengths data](Data-National-Strengths). How they combine: [Formulas](Formulas).

From `heritage-rules.json` and `levers.json`. All are provisional placeholders except where noted.

| Key | Value |
|---|---|
| `budget.birthright` / `heyday` / `legacy` / `great_legacy` / `burden` | 3 / 3 / 2 / 3 / −2 |
| `budget.tolerance` | 0.6 |
| `budget.size_bonus` | 4.5 → 0, 3.5 → 0.5, 2.5 → 1, 1.5 → 1.5, below → 2 |
| `stat_points.*` | legitimacy 0.1, stability 1, prestige 1, notoriety 0.5, admin capacity 0.1, literacy 0.2, cohesion 0.1 |
| `birthright.per_country` | 1 (fixed) |
| `heydays.max_per_country` / `max_active` | 3 / 2 |
| `heydays.mark_after_years` / `mark_share` | 25 / a third |
| `ambitions.active` / `guaranteed_historical` | 3 / 1 |
| `ambitions.pool_min_authored` / `pool_min_generated` | 5 / 4 |
| `ambitions.counsel.cooldown_years` / `gold_by_era` | 10 / 30, 50, 80, 120, 180, 260, 380 |
| `ambitions.envoy_reveal_years` | 2 |
| `ambitions.history_mode_setting` | drawn (default), historical only |
| `ambitions.max_legacies` | 5 (decided) |
| `ambitions.warmth_bands` | cold under a third, warm from a third, hot from two thirds |
| `ambitions.pool_max` | 7 (age ambitions join on top) |
| `inheritance.claim_years` | 30 |
| `burden.per_country_max` / `turned_legacy` | 1 / true |
| `inheritance.*` | 30 years, at most 2 birthrights (a proposal) |
| `ai.ambition_goal_weight` | 1.5 |
| `levers.*`, `scope_cost.*` | 64 levers; scope floor 0.25 |
| archetypes | 27, in `archetypes.json` |

## Still open

Nothing about heritage itself is open. Binding the last place names the map does not hold is data work.

## For developers

- Spec: [`domain/national-strengths/spec.md`](https://github.com/grrts/pocket-hedgemony/blob/claude/domain-specs-bdd-ebdpmx/domain/national-strengths/spec.md), requirement code **HER** (HER-001 to HER-077).
- Features: `domain/national-strengths/features/` (heritage-card, birthright, heydays, ambitions, legacies-and-burdens, levers, conditions, budgets, heritage-generation, changing-hands, heritage-events, heritage-on-the-phone).
- Code: not written yet. It will live in `packages/engine/src/domain/national-strengths/`.
- Build tools in the national strengths design: `extract_vocab.py` refreshes ids from other designs, `make_archetypes.py` rebuilds archetypes, `build_heritage.py` generates, merges, validates and writes `build/` (with `--check FILE` for one authored file). The report lists budget overruns, unknown ids and place names still to bind. Heritage reads the catalogue, event tree, country stats, province stats and warfare read-only.
