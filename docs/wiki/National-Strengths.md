# National strengths

Every playable country has a heritage: what it is good at because of where and what it is, what it becomes good at when its moment in history comes, what it secretly wants, what it has achieved, and what holds it back. Heritage is small on purpose. It fits on one card of at most five rows, and every line changes something you can count somewhere else in the game: gold, officials, lords, recruits, horses, ships, scholars, traders, buildings or grievances.

## How it works

### The five parts

| Part | What it is |
|---|---|
| Birthright | The one always-on strength that comes from who the country is |
| Heyday | A strength tied to one historical age, awake while that age is running and its condition holds |
| Ambitions | Hidden goals drawn from the country's own pool |
| Legacies | Permanent strengths you earned |
| Burden | A historical weakness that holds you back until you shed it |

Venice is a good example. Its birthright "Lagoon and Arsenal" makes galleys build 30 % faster, the capital's garrison 40 % stronger and ports raise 15 % more sailors. In the Age of Gunpowder Empires its heyday "The mude to Alexandria" can be awake. It carries the burden "The feared lion", has three active ambitions, and starts with no legacies. Heritage is the game's own system; it uses no mechanic, name or value from another game.

### Birthright

Every country with heritage has exactly one birthright of its own. A birthright can name a *needs* condition. While that condition fails, the birthright goes dormant: it is shown greyed out and does nothing, and it wakes again as soon as the condition holds. A birthright is never deleted because you lost a war.

### Heydays

A heyday belongs to one age of the [historical events](Historical-Events) system, and a country has up to 3. Each heyday moves through four states:

| State | When |
|---|---|
| Waiting | Its age has not begun |
| Awake | Its age is active and its *wakes* condition holds |
| Asleep | Its age is active but the condition fails; years already served are kept |
| Ended | Its age ended or its *ends* condition held; this is for good |

Portugal's heyday "Carreira da Índia" belongs to the Age of Exploration and wakes when Portugal has an Atlantic harbour and knows invention S4. If Portugal loses its Atlantic harbours it falls asleep, keeping its years. Because heydays follow the ages as they actually happen in your campaign, an early Atlantic crossing that starts the Age of Atlantic Empires early lets Atlantic heydays wake early too.

**Marks.** A heyday that was awake for 25 years in total leaves a mark when it ends: a permanent legacy worth a third of the heyday, which counts toward the 5 legacies. Carreira da Índia awake for 24 years leaves nothing; at 25 years it leaves the mark "Cape charts". A heyday with no mark written for it leaves its first lever at a third of its value, so a heyday with +15 tax reach leaves a legacy of +5.

At most 2 heydays can be awake at once. If a third would wake, you are asked which one sleeps.

### Ambitions

Each country has a pool of 4 to 7 ambitions (at least 5 for hand-written countries, at least 4 for generated ones). When the campaign starts, 3 are drawn as your active ambitions, and at least one of them is tagged historical. Castile, with a pool of 6 of which 2 are historical, gets 3 drawn with at least one historical among them. If a drawn ambition's goal already holds on the first day, it is put back and another is drawn: no free wins.

Ambitions stay hidden. While an ambition is open, its plain goal is never shown.

| State | What you see |
|---|---|
| Sealed | Only its theme icon (land, sea, trade, faith, crown, learning, survival or wealth) and a one-line riddle hint, such as Venice's "The Visconti line is ending; the river is a border only by habit." |
| Stirred | Its stir condition held. The hint is still the only words shown, but now you also see its warmth, the name of the legacy it promises and its deadline, if it has one |
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

**Counsel.** Once every 10 years you can pay gold to stir one ambition at once and see its warmth. Its words stay a hint. The price rises by era:

| Era | I | II | III | IV | V | VI | VII |
|---|---|---|---|---|---|---|---|
| Gold | 30 | 50 | 80 | 120 | 180 | 260 | 380 |

**Envoys.** A country that keeps a resident envoy at a foreign court for 2 years learns the hint and warmth of one of that country's active ambitions, never its plain goal. Milan with an envoy at Venice's court learns one of Venice's. The computer can do the same to you.

**Age ambitions.** Some pool entries name an age; they join the pool when that age begins.

**History mode.** A campaign setting chooses "Drawn" (the default) or "Historical only", which draws only historical ambitions. No setting reveals ambitions.

The [tutorial](Tutorial-and-Help) teaches ambitions with one ambition whose hint is plain.

### Legacies

Legacies are permanent, and come three ways: an ambition's reward, a heyday's mark, or a turned burden. Great legacies, the rewards for the hardest goals, get a bigger budget. A country keeps at most 5 legacies; if you would earn a sixth, you are asked which one to let go.

### Burden

A country has no burden or one. A burden has negative points and a shed condition. When the shed condition holds, the burden goes and its turned legacy is granted in its place. A burden can never be bought off: only its shed condition or a reform event sheds it.

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
| Belief (2) | faith shift, tongue shift | 0.05 |
| Abroad (4) | envoy count, opinion steps, oath fade, lands taken | envoy count 1.2 |
| Building (2) | building cost, building unlock | building unlock 1.5 (flag) |
| Events (3) | event weight, event option, stat | stat: by the stat's points |

Ten levers are provisional because the design that owns their rule is still being written: tribute, official capacity, lord capacity, ship build, crew, sea days, faith shift, tongue shift, envoy count and opinion steps. The trade levers follow the trade design: trade balance and traders passing raise the trade ratio gain, trader gain raises each deposit, and trader count gives extra traders at the start. Building levers use the buildings design's buildings, and a unique building variant is unlocked the same way. Their owner may rename them or point them at a rule; only the key changes in heritage data.

A lever can be limited to a scope with `where`: realm, capital, coast, core, royal, lords, frontier, a terrain, a culture group, a faith, an area or a region. A limited lever costs less.

### Conditions

Heritage uses the event tree's condition language unchanged, with `this` meaning the heritage's own country, and adds a few of its own:

| Condition | Meaning |
|---|---|
| knows | An invention is known |
| holds_place | Owns the province holding a named place |
| coastal | Owns a province with a harbour on the named sea, or any sea |
| count | A counted country-card stat, which can be `building:<id>` and can be relative to the start ("start*2", "start+3") |
| heritage | An item is awake, done, lost, shed or held |
| independent | Has no overlord |

`relation {who: A, other: B, type: T}` reads as "A is the T of B". Each place name used by `holds_place` is bound once to a map province.

### Budgets

Each part has a budget in points (a point is about a tenth more of something central, for the whole realm).

| Part | Budget |
|---|---|
| Birthright | 3.0 |
| Heyday | 3.0 |
| Legacy | 2.0 |
| Great legacy | 3.0 |
| Burden | −2.0 |

Smaller countries get a size bonus on their birthright and heydays. Size class is the mean of six catalogue assessments (economic strength, manpower potential, military capability, naval capability, diplomatic influence, trade access), each from very low (1) to very high (5).

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
| Tier A playable countries and subjects | 58 | Hand-written: birthright, 2 or 3 heydays, 5 to 7 ambitions, burden |
| Tier B and C playable countries and subjects | 434 | Generated from archetypes |
| Decentralised polities | 214 | Generated from archetypes for societies without a crown |
| Background actors, non-state actors, internal estates, collective institutions | 257 | None (not played) |

Generated heritage comes from 27 archetypes. Each has detection rules on catalogue fields and templates for the birthright, heyday and burden, written in the country's own words. The game scores every generated country against all archetypes: the best gives the birthright and burden, the second best may add a heyday. A generated heyday gets the first allowed age whose regions cover the country, with percentages scaled to the budget. Ambitions are filled from the catalogue record: likely rivals become "outlast" goals, preferred partners "bind or ally", disputed territories and key locations "hold a place", possible future paths a historical path, and trade routes "win a trade hub". Decentralised polities only take the crownless archetypes (forest, hill, herding, steppe, desert, island, mountain, ocean, chiefdom, commune, raiders, segmentary). A hand-written file overrides whatever generated parts it defines.

The current build has 706 countries with heritage (58 hand-written, 648 generated), 3,551 ambitions, 945 heydays and 706 burdens, with 0 errors, 0 warnings, 273 place names to bind (most bind to the map's nearest land province by their name; the rest are bound by hand), and all 64 levers in use.

### When countries change hands

- **Annexation.** The annexed country's birthright becomes a dormant claim of the annexer. Once the annexer has owned its old capital and held most of its homeland for 30 years, the claim wakes as a second birthright. A country holds at most 2 birthrights.
- **Subjects** keep their whole heritage, and an overlord's legacies never apply to its subjects.
- **Released countries** get their catalogue heritage, or their archetype's generated heritage if they are not in the catalogue.
- **Formed countries** (a union, or a new state made by an event) keep the forming country's birthright and legacies, add the formed country's own heritage if any, and draw ambitions from both pools.

### Events

Heritage proposes four effects and one condition to the event tree. `grant_legacy` grants a legacy; `wake_heyday` wakes a heyday for a number of years even if its condition fails; `stir_ambition` stirs an ambition, keeping its words a hint; `shed_burden` sheds the burden. The `heritage` condition lets events ask about heritage, and the `event_weight` and `event_option` levers raise an event's weight or open an option for the country.

### The computer

The computer always knows its own ambitions and treats them as goals with weight 1.5 next to its personality priorities. When it completes one, it gets the legacy just as you would. Heydays give it a reason to change course across the centuries. It can read your ambitions through a resident envoy kept 2 years at your court. When a third heyday would wake or a sixth legacy arrives, it lets the weakest one go (the one worth the fewest points).

## What you see

- **The country card** gets one Heritage row: the birthright icon, the awake heyday icon, three ambition seals and the burden icon. Tapping it opens the Heritage sheet.
- **The heritage card** shows five rows, never more: Birthright, Heyday, Ambitions, Burden and Legacies ("none yet" when empty). Tapping a row shows its full text, its history note and what it changes. A dormant birthright is greyed.
- **Seal moments.** When a seal cracks or warmth rises from warm to hot, a small quiet animation plays and one line goes into the monthly digest.
- **Map shimmer.** While an ambition that names places or areas is hot, the map shimmers faintly over its region, without outlining or naming the target.
- **The nation picker** shows each country's birthright and burden, a count of sealed ambitions, and its heydays as the ages they belong to.
- Every country has the same system in every tier; the free tier only limits which countries you can pick.

## How it connects

- [Historical events](Historical-Events): ages drive heydays; heritage uses the condition language and proposes four effects and a condition.
- [The 1444 start](The-1444-Start): catalogue fields, tiers, size assessments, personality and places feed generation.
- [Your realm](Your-Realm): levers on treasury, officials, lords, loyalty, recruits, horses and envoys.
- [Provinces](Provinces): levers on tax reach, harvests, growth, class slots, official types and grievances.
- [Warfare](Warfare): levers on troop cap, break point, marching, sieges, garrisons and commanders.
- [Recruiting](Recruiting): recruit refill and retinues.
- [Research](Research): invention levers, and invention ids for `knows`.
- [Trade](Trade): trader levers, trade presence and hubs.
- [Naval](Naval): ship build, crew and sea days (provisional).
- [Buildings](Buildings): building cost and unlock levers; unique variants and landmarks offered as hooks.
- [Government](Government): official and lord capacity; reforms that shed burdens.
- [Religion](Religion) and [Culture](Culture): faith and tongue shift.
- [Diplomacy](Diplomacy): envoys, annexation and release; envoy and opinion levers.
- [Subjects](Subjects): tribute; subjects keep their heritage.
- [Revolutions](Revolutions): reforms and revolutions can shed burdens or grant legacies.
- [Achievements](Achievements): suggested achievements for every ambition of a country and for 5 legacies.
- [Screens and navigation](Screens-and-Navigation): heritage row and sheet, nation picker, digest lines.
- [Map and lenses](Map-and-Lenses): the shimmer over hot ambitions; place names bound to provinces.
- [Settings](Settings): the history mode setting.
- [Tutorial and help](Tutorial-and-Help): the tutorial ambition with a plain hint.
- [How a turn works](Time-and-Turns): dates, eras for counsel gold, and years counted.

### Each turn

Heritage is checked once a turn, right after historical events, and counts time in months (12 turns make a year, so a heyday needs 300 awake turns to leave its mark). In order, heritage checks dormant claims and birthright needs; heydays, counting a month awake, granting marks and resolving a third waking; ambitions, warmth, deadlines and draws, with digest lines; the burden's shed condition and a sixth legacy; then publishes its active levers to the systems that own them for the next month.

## Numbers

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
