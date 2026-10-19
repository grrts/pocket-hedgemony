# Events (EVT)

## 1. Purpose and scope

This context is the historical layer of the game: the **event tree**. It decides which ages and periods are
active, which historical events can happen, to whom (roles), when (availability, prerequisites, trigger,
selection), what choices they offer, how the computer chooses, and what effects and modifiers they apply. It
also owns the event tree's own abstract statistics model and the condition and effect vocabulary that other
contexts extend, and the data build that validates all of it.

**In scope**
- Ages (12 in the data; 9 inside the campaign) and periods (93): windows, start and end conditions, forced dates.
- Events (306 in the data): roles, availability, prerequisites, trigger, selection, execution, options,
  effects, follow-ups, invalidation and exclusivity.
- The condition, effect and target vocabulary (the engine contract) and the closed lists in enums.
- Modifiers (159): scope, changes, duration, decay, stacking.
- Balance values: selection pacing, follow-up boosts, alternate-history presets, AI factors, rebel sizes (as
  shares of the recruit pool), coverage thresholds, the mapping table to the owning contexts.
- AI option choice (weights and factors).
- The statistics model (stored and derived values) as the event tree's language.
- Principles: history is reference not script, roles not hard-coded countries, agency, harm depicted never
  rewarded, no invented facts, our own model.
- Data layers, localization layer, validation and coverage reports.
- The campaign cut at 31 August 1939.

**Not in scope (owned by …)**
- What each abstract statistic becomes in play: **province** (province stats 15), **realm** (country stats 11),
  **trade** (trade 12), **government** (government 5), **diplomacy** (diplomacy 11), **subjects** (subjects 11).
- Rising mechanics behind the `rebels` effect: **rebellions**.
- The revolution layer (signs, stances, regimes) built on events: **revolutions**.
- Faith waves and faith policy: **religion**. Languages and nationalism: **culture**. Heritage: **national-strengths**.
- How an event card looks and how unanswered events block End turn: **game-shell**. Music tags: **audio**.
- Tutorial-only scripted events: **onboarding**.
- Where events run in the turn, and in which turn their monthly work runs: **time-and-turns**.

## 2. Sources

Newest decision first.

1. `planning/gap-lists.md` "Decisions already made" (16 Oct 2026): the game stops 31 August 1939; the event
   tree's Second World War events and its Decolonization, Cold War and Globalization ages are out of scope;
   item 24 (event tree fixes); item 20 (order of a turn).
2. `screen-flow/screen-flow-design.md` §4.6, G7 (16 Oct): unanswered events block End turn; events open one
   at a time; options include historical or free events; the end-of-campaign wrap-up.
3. Sibling designs proposing additions (16 Oct): `religion/religion-design.md` §10.2–10.4, §18 and
   `religion/event-tree-additions/`; `revolutions/changes-for-other-designs.md` and
   `revolutions/generated/event_tree_patch/`; `culture/culture-design.md` §6, §11; `subjects/subjects-design.md`
   §11.1; `diplomacy/diplomacy-design.md` §11, §18; `national-strengths/national-strengths-design.md` §8 and
   `requests-to-other-designs.md`; `buildings/buildings-design.md` §12.1; `tutorial/tutorial-design.md`;
   `music-design/README.md`.
4. Mappings of event-tree stats: `province-stats/province-stats-design.md` §15, `country-stats/country-stats-design.md`
   §11, `trade/trade-design.md` §12, `government/government-design.md` §5.
5. `event-tree/README.md` (trigger model, data model layers, statistics model, principles).
6. `event-tree/schema/event-tree.d.ts`.
7. `event-tree/data/enums.yaml`, `balance.yaml`, `vocabulary.yaml`, `ages.yaml`, `statistics.yaml`, and samples
   of `periods.yaml`, `modifiers.yaml`, `data/events/*.yaml`.
8. `event-tree/generated/validation_report.md`, `coverage_report.md`, `statistics_catalogue.md`.

## 3. Ubiquitous language

| Term | Meaning | Not to be confused with |
|---|---|---|
| Event tree | The whole historical layer: ages, periods, events, modifiers, vocabulary, balance. | |
| Age | A global framing layer with a window, start and end conditions and forced dates; several run at once. | Era (research and warfare), period |
| Period | A regional or thematic situation inside one or more ages; active between its start and end conditions. | Age |
| Event | A historical turning point with roles, availability, trigger, selection, options and effects. | Revolution (an event with a `revolution` block) |
| Role | A slot (`$realm`, `$sponsor`, `$resister`…) bound to a country, entity or province when the event becomes eligible. | Country tag |
| Role relation | initiator, participant, affected, beneficiary, cost_bearer, victim, resister. | Diplomatic relation |
| History block | Dates, summary, significance, sources, confidence, disputes; reference only, never drives play. | |
| Availability | Earliest and latest year, mode (mandatory, approximate, reference), repeat (one_time, recurring, process). | |
| Prerequisite (`requires`) | Event chains: all, any, not, at_least. | Trigger |
| Optional | Events that only raise the weight. | |
| Trigger | A condition tree over world state. | |
| Selection | immediate, pool (rolled against `mean_years`) or decision (offered). | |
| `mean_years` | Expected waiting time once eligible. | "Mean time to happen" (a genre term the design replaced) |
| Follow-up | A later event whose weight is boosted for a delay window; never bypasses its trigger. | Prerequisite |
| Chooser | The role whose controller (player or AI) picks an option; none means a weighted roll. | |
| Historical option | The one option per event that matches recorded history. | |
| Effect tier | immediate, delayed, ongoing, long_term, rising_won, rising_crushed. | |
| Modifier | A named, timed bundle of stat changes with decay and stacking. | |
| Narrative only | `depiction: narrative_only`: an atrocity shown, never rewarded. | |
| Stored / derived statistic | Persisted state / computed each tick from stored values, never written by events. | |
| System flag | A flag set by the engine or the scenario, not by an event effect. | Event flag (set by `set_flag`) |
| Process | An event that diffuses and can fire for several countries. | Recurring |
| Re-emergence | Re-opening an invalidated branch by creating its entity again. | |
| Alternate history mode | Game rule preset: historical, plausible, divergent. | |
| Agency share | (initiator + beneficiary + resister) / all role slots of a region. | |
| prosperity, innovations, trade_hubs, notoriety, integration_strain | The tree's own names that replaced genre terms. | |

## 4. Domain model

### Aggregates

**Age** (identity: age id)
- Holds: name, window (earliest start, latest end), regions, start and end conditions, force_start,
  force_end, characteristics, significance, transitions_to, history.
- INV-EVT-1: an age is active only inside its window; it starts when its start condition holds (checked yearly)
  or at force_start; it ends when its end condition holds or at force_end.

**Period** (identity: period id)
- Holds: name, kind, ages, regions, entities, window, start (`initial` = active at 1444), end, parent,
  context, consequences.
- INV-EVT-2: a period lies inside at least one of its ages; it can be active only inside its window.

**Event definition** (identity: event id)
- Holds: name, ages, periods, regions, importance (major, regional, local), depiction, history, roles,
  availability, requires, optional, trigger, selection, invalidated_if, cancel_if, maintain, duration,
  exclusive_with, options, effects, follow_ups, notes; optionally `revolution` (revolutions context).
- INV-EVT-3: at least one role; every `$role` used is declared.
- INV-EVT-4: two or more options, exactly one historical, unique option ids.
- INV-EVT-5: a `narrative_only` event offers no option with a positive stat or prestige payoff to the
  perpetrator.
- INV-EVT-6: the mandatory prerequisite graph has no cycles.
- INV-EVT-7: the earliest reachable date never exceeds the event's latest date.
- INV-EVT-8: two exclusive events are never both mandatory prerequisites of a third.
- INV-EVT-9: every condition and effect type is declared in the vocabulary with known parameters.

**Event instance** (identity: event id + bound roles + occurrence)
- Holds: bound roles, eligibility state, accumulated follow-up boost, fired date, chosen option, running
  state (duration, maintain), delayed effects pending, occurrences (for recurring and process events).
- INV-EVT-10: a one-time event fires at most once (except a re-armed revolution, revolutions context).
- INV-EVT-11: follow-up boosts multiply weight but never make an ineligible event fire.

**Modifier instance** (identity: modifier id + target)
- Holds: target, start, remaining years, current magnitude, stack count.
- INV-EVT-12: stacks never exceed `max_stacks` (3).

### Entities and value objects

- **Role** (value): historical (reference only), select (`fixed` or `{where?, condition}`), as (relations).
- **Condition** (value): logic `all`, `any`, `not`, `at_least {n, of}` or a leaf of a vocabulary type.
- **Target** (value): `$role`, `<entity_id>`, `province:<id>`, `area:<id>`, `region:<id>`, `global`, `this`.
- **Effect** (value): one vocabulary effect with its params.
- **Option** (entity): id, chooser, historical, allowed, ai (base, factors), effects.
- **Modifier** (reference data): id, scope, changes, years, decay, stacking, rationale, purpose.
- **Statistic** (reference data): id, scope, kind, unit, range, merges, formula or update rule.
- **Entity** (reference data, 625): polity, company, movement, population_group, organization; region;
  existence spans; successors.
- **Geography** (reference data): 13 macro-regions, sub-regions, areas, anchor provinces, trade hubs.
- **Source** (reference data, 606): short, full, verified.

### Domain services

- **Age and period clock**: evaluates start and end conditions yearly inside windows.
- **Eligibility evaluator**: availability, requires, trigger, invalidation, exclusivity; binds roles.
- **Selector**: immediate, pool rolls, decision offers; pacing cap; follow-up boosts; presets.
- **Option resolver**: chooser's answer or weighted roll; AI weights.
- **Effect applier**: tiers, durations, maintain and cancel, modifiers.
- **Event tree build** (offline): validates, generates catalogues, graphs, reports and runtime layers.

## 5. Requirements

### 5.1 Campaign span

- EVT-001 The game shall run events from 1444 to the campaign's end date, 31 August 1939 by default (one
  setting). [gap-lists decisions]
- EVT-002 When a campaign loads its events, the game shall drop every event whose history starts after
  31 August 1939 (59 in the current data: world_war_ii, holocaust, bengal_famine_1943, atomic_bombings and the
  events of cold_war_to_present, decolonization_1945_1994 and the post-1939 events of coverage_gaps) and shall
  never fire them; the data keeps them as reference. [gap-lists decisions; X-14; D-EVT-1]
- EVT-003 The game shall never start the ages Age of Decolonization, Cold War and Age of Globalization, and
  shall cut every age still running at the end date. An end condition part that names a dropped event never
  holds, so such an age ends by its other end conditions or at the end date. [gap-lists decisions; X-14;
  D-EVT-1]

### 5.2 Principles

- EVT-004 The game shall never let an event's history block drive play; availability, trigger and selection
  drive it. [README principle 1]
- EVT-005 The game shall bind each role when the event becomes eligible, from its `select` (`fixed` = the
  historical holders, or a condition, optionally limited to a `where`); `historical` is reference only.
  [README principle 2; schema Role]
- EVT-006 The game shall let colonised, enslaved and Indigenous actors hold initiator and resister roles and
  choose their own options. [README principle 3]
- EVT-007 Where an event is `narrative_only`, the game shall offer no option that pays the perpetrator and
  shall act on the named people (`population`, `move_population` on a population group), not only on a
  modifier. [README principle 4]
- EVT-008 The game shall never treat enslaved people as a trade good or a positive production modifier on the
  victims' land; enslavement is forced population movement with costs on the source societies.
  [README principle 4; statistics redundancy notes]
- EVT-009 The game shall keep contested dates and numbers in `disputes` with lowered confidence, and label
  gameplay magnitudes as design values. [README principle 5]
- EVT-010 The game shall use the tree's own terms (prosperity, innovations, trade_hubs, mean_years, notoriety,
  integration_strain) and no term, value, event text or data from other commercial games. [README principle 6]

### 5.3 Ages

- EVT-011 Once inside an age's window, the game shall evaluate its start and end conditions every year; an age
  starts at its `force_start` and ends at its `force_end` regardless, so a stalled game still advances.
  [ages.yaml header; README]
- EVT-012 The game shall allow several ages to be active at once. [ages.yaml header]
- EVT-013 The game shall run the 9 in-scope ages with these windows and forced dates: Gunpowder Empires (1444–
  1760; force start 1444, force end 1760); Exploration (1444–1680; 1444, 1680); Reformations (1480–1700; 1530,
  1700); Atlantic Empires (1480–1880; 1520, 1880); Crisis and Absolutism (1590–1790; 1640, 1790); Revolutions
  (1750–1880; 1800, 1880); Industrialization (1700–1950; 1830, 1950); Imperialism (1800–1945; 1860, 1945);
  World Wars (1890–1960; 1925, 1960), with their start and end conditions as in ages.yaml. [ages.yaml]
- EVT-014 The game shall list each age's regions, so systems that read "the age has begun in your region"
  (exploration, national strengths, music) can use them. [ages.yaml; exploration §2]

### 5.4 Periods

- EVT-015 The game shall make a period active when its start condition holds inside its window (`start:
  initial` = active at the 1444 start) and end it when its end condition holds, so a period can start early,
  late or never. [periods.yaml header]
- EVT-016 The game shall derive each period's and each age's event list from the events' own `periods` and
  `ages` fields. [periods.yaml header; ages.yaml header]
- EVT-017 The game shall start and end periods by the `start_period` and `end_period` effects and let
  conditions test `period_active` and `age_active`. [vocabulary.yaml]

### 5.5 Eligibility

- EVT-018 The game shall not let an event fire outside its `earliest`–`latest` years. [README trigger model]
- EVT-019 The game shall bind the date by mode: `mandatory` fires in the window if the trigger holds (its
  pool chance becomes certain in the last year of the window); `approximate` multiplies its pool chance by up
  to `approximate_peak_mult` (2.0) in the history year, fading linearly to 1 at `approximate_spread_years`
  (10) either side; `reference` uses the date only as a guide (factor 1). [README trigger model; numbers
  provisional]
- EVT-020 The game shall repeat events by `repeat`: `one_time` fires once; `recurring` may fire again after
  `cooldown_years`; `process` can fire for several countries as a diffusion. [README trigger model]
- EVT-021 The game shall require `requires` to hold: `all` mandatory, `any` alternative paths, `not` exclusive,
  `at_least` n of m. [README trigger model]
- EVT-022 The game shall let `optional` events only raise the weight by their factor. [README; schema]
- EVT-023 When one of two `exclusive_with` events fires, the game shall not fire the other. [README]
- EVT-024 When `invalidated_if` holds, the game shall remove the event for good; a later event can re-open the
  branch by creating its entity again. [README trigger model]
- EVT-025 The game shall evaluate the trigger as a condition tree over world state using only the condition
  types declared in the vocabulary (date, exists, controls, owns, borders, at_war, war_ongoing, relation,
  opinion, stat, rank, government, religion, religion_share, culture_group, innovation, ideology, tech,
  colonial_presence, trade_presence, rebels_active, subject_count, event, event_active, period_active,
  age_active, flag, any_country, all_countries, count_countries) with logic all, any, not, at_least.
  [vocabulary.yaml] Subjects adds `subject_loyalty {who, target, op, step}` (the more loyal step is the
  higher: `>= wavering` is Loyal or Wavering), `subject_count … by_reach: true` (subjects weighed by their
  reach weights, else a head count) and `relation … kind` (the subject bond's kind) (D-EVT-11, SUBJ-097).
- EVT-026 The game shall resolve targets as `$role`, an entity id, `province:<id>`, `area:<id>`,
  `region:<id>`, `global`, or `this` inside any_country, all_countries and count_countries. [vocabulary.yaml]
- EVT-027 The game shall have no condition that reads whether a country is played by a person: `is_human` is
  not in the vocabulary, and the build reports it as an undeclared condition type anywhere it appears.
  [vocabulary.yaml; DECISIONS principle 3; D-EVT-10]
- EVT-028 The game shall evaluate the `event` condition as "the event has occurred", optionally with a given
  option outcome, within n years, with a role bound to who. [vocabulary.yaml]

### 5.6 Selection and pacing

- EVT-029 When an `immediate` event becomes eligible, the game shall fire it. [README]
- EVT-030 Each `pool_roll_interval_months` (1), the game shall roll each eligible pool event against its
  `mean_years`, multiplied by its selection modifiers and follow-up boosts. [README; balance.yaml]
- EVT-031 When a `decision` event becomes eligible, the game shall offer it to the chooser (player or AI).
  [README]
- EVT-032 If a decision offered to an AI country is left unanswered for `decision_expiry_years` (10), then
  it lapses and re-enters the pool (it is rolled as a pool event) if still eligible. A decision offered to
  the player never lapses (EVT-044). [balance.yaml; screen-flow §4.6; D-EVT-8]
- EVT-033 The game shall fire at most `max_pool_events_per_country_year` (2) pool events per country per year.
  [balance.yaml]
- EVT-034 When an event fires, the game shall boost each follow-up's weight by its `boost` during its `delay`
  window, cap any boost at `max_boost` (5.0), fade it linearly over `boost_decay_years` (10) after the window
  closes, and never let a boost bypass a trigger. [README; balance.yaml]
- EVT-035 The game shall apply the alternate history preset: historical (follow-up boost ×1.5, historical
  option ×2.0, mean_years ×0.8), plausible (×1.0, ×1.0, ×1.0) or divergent (×0.6, ×0.5, ×1.3).
  [balance.yaml; README principle 1]
- EVT-036 The game shall set the preset from the new game's "Events" choice: Historical → historical,
  Plausible → plausible (the default), Free → divergent. There is no separate "historical lean" rule.
  [screen-flow new-game options; balance.yaml; D-EVT-9]

### 5.7 Execution

- EVT-037 While an event with a duration runs, the game shall keep it running for `duration_years`, apply its
  `ongoing` effects, end it if `maintain` stops holding, and abort it if `cancel_if` holds. [README; schema]
- EVT-038 The game shall let `event_active` test whether a process or duration event is running.
  [vocabulary.yaml]

### 5.8 Options and choice

- EVT-039 The game shall give every event two to four options, exactly one marked historical, with unique
  ids; the build reports more than four as an error and fewer than two as a warning on a major event (an error
  otherwise). [README; balance validation_checks; revolutions; D-EVT-7]
- EVT-040 When an option has a chooser, the game shall let that role's controller, player or AI, pick; when it
  has none, the game shall pick by a weighted roll. [README; schema Option]
- EVT-041 If an option's `allowed` condition is false, then the game shall hide the option. [vocabulary
  option_fields]
- EVT-042 The game shall weight each option for the AI by its base weight times its named factors: at_war
  (country is at war), low_treasury (treasury below one year of expenses), high_unrest (more than half
  the country's provinces have 4 or more grievances, D-EVT-5), same_religion (other party shares state religion), rival (other party is a rival), great_power
  (top 8 by great_power_score), threatened (a hostile neighbour has more than 1.5× army_strength).
  [balance.yaml ai_factors; schema]
- EVT-043 The game shall add an option's effects to the event-level effects. [vocabulary option_fields]
- EVT-044 When an event is offered to the player, the game shall wait for the player's answer; nothing answers
  an event for the player: while one waits, End turn opens the oldest unanswered event instead of ending
  the turn. [screen-flow §4.6; D-EVT-8]

### 5.9 Effects

- EVT-045 The game shall apply effects by tier: `immediate`; `delayed` after n years (or a range); `ongoing`
  each month while the event runs; `long_term` as permanent structural change. [README; schema Effects]
- EVT-046 The game shall apply only effect types declared in the vocabulary: modifier, stat, transfer,
  create_country, annex, vassalize, release, war, peace, casus_belli, relation, rebels, spread, population,
  move_population, set_flag, start_period, end_period, unlock, government, religion, trade_route, colony.
  [vocabulary.yaml] Subjects adds `change_subject_kind {who, target, kind}` (a kind, or `tighten` /
  `loosen`), `add_subject_reason {target, reason, months}` (a subjects reason id, its arrow from subjects
  config) and `remove_subject_reason {target, reason}` (D-EVT-11, SUBJ-097).
- EVT-047 The game shall apply a `stat` change as a one-off delta, `+n` / `-n` or `+n%` / `-n%`. [vocabulary.yaml]
- EVT-048 When a `rebels` effect applies, the game shall start a rising in the target province at once (the
  event is a spark), taking its men from the province's recruit pool: small 1/8, medium 1/4, large 1/2, huge
  the whole pool. Rebellions runs the rising from there. `rebels_active` is true while a rising of the given
  type (any of enums' rebel_types, `anticolonial` included) is under way. There are no unrest thresholds.
  [balance.yaml; X-9; D-EVT-5; numbers provisional]
- EVT-049 The game shall start a war by `war {id, attackers, defenders, goal}` with a stable war id that other
  events can test with `war_ongoing`. [vocabulary.yaml]
- EVT-050 Adding a new condition or effect type shall need one engine evaluator and nothing else; everything
  else stays data-only. [vocabulary.yaml header; README]

### 5.10 Modifiers

- EVT-051 The game shall apply a modifier with its scope (province, country, region, global), changes, years
  (0 = permanent), decay (none, linear, exponential) and stacking (none, refresh, stack). [schema Modifier;
  modifiers.yaml]
- EVT-052 The game shall use `refresh` when a modifier names no stacking, allow at most 3 stacks, and make
  exponential decay halve the magnitude at half the duration. [balance.yaml modifier_rules]
- EVT-053 The game shall hold plain numbers on level stats while active, apply them per year on accumulating
  stats, read percent strings as a scale on derived stats or a share of population removed per year, read
  `<stat>_growth` keys as a change to the yearly growth rate, and apply a region-scoped modifier on a country
  target to all its provinces. [modifiers.yaml header]

### 5.11 Statistics

- EVT-054 The game shall keep stored statistics as simulation state and recompute derived statistics each
  tick; an event never writes a derived statistic directly, only its inputs or a modifier the formula reads.
  [statistics.yaml header]
- EVT-055 The game shall keep the province, country, global and pairwise statistics of statistics.yaml with
  their units and ranges (for example prosperity 1–60, unrest 0–100, stability −3..+3, opinion −200..200,
  trust 0–100), with formula coefficients `k_*` in balance. [statistics.yaml]
- EVT-056 The game shall land each event-tree statistic on the concrete stats of the owning designs through
  the mapping table in the events data (province stats 15, country stats 11, trade v2, government 5,
  diplomacy 11), with no rename in the event data: prosperity +n → n fitting buildings; devastation +n → n %
  of tiles burned; unrest up → one named grievance; fort_level +n → castle n steps; infrastructure +n → road n
  steps; industry +n → n factories; disease_burden up → a plague outbreak; trade_access → trade ratio gain %;
  trade_index → trade ratio; trust down → an Oath broken and notoriety up → a Notorious deed (diplomacy);
  integration_strain is only read. [province stats §15; country stats §11; trade §12; X-6; government §5;
  diplomacy §11; D-EVT-4, D-EVT-14]

### 5.12 Flags and reference tables

- EVT-057 The game shall let triggers read only flags that some effect sets or that are declared system flags,
  set by the engine or the scenario (ruler_died, succession_crisis, succession_dispute, regency,
  female_succession, ruler_led_campaign, atlantic_island_bases, potato_blight, commercial_crisis and the
  world-state flags of enums.yaml); religion sets religious_persecution_active, missionary_persecution and
  inquisition_established by its own rules. [enums.yaml system_flags; validation; religion §10; D-EVT-16]
- EVT-058 The game shall read religions, governments, innovations, ideologies, culture groups, rebel types,
  relation types, period kinds and entity kinds from closed lists in enums; adding a value needs no engine
  change. The lists hold no value first seen after 1939 (no computing, green_revolution_agriculture,
  internet, non_alignment, environmentalism or neoliberalism), and the culture groups are enums' 39 plus
  culture's celtic, baltic, caucasian and hebrew. [enums.yaml; X-14; culture §6; D-EVT-12, D-EVT-13]
- EVT-059 The game shall keep entities with real existence spans; a population group is never owned and an
  organization holds no provinces. [enums.yaml entity_kinds; schema Entity]

### 5.13 Data layers, localization and validation

- EVT-060 The build shall split the bundle into runtime layers: history_reference, ages, periods,
  event_definitions, triggers, selection, execution, choices, ai, effects, modifiers, statistics, balance and
  localization.en. [README data model layers]
- EVT-061 The game shall take all player-facing text from the localization layer, keyed by id and ready for
  translation. [README]
- EVT-062 The build shall check: every referenced id exists; every condition and effect type is declared;
  roles are declared and every event has one; 2+ options with one historical and unique ids; narrative_only
  pays no perpetrator; no mandatory cycle (Tarjan SCC); no impossible trigger; no jointly required exclusive
  pair; entities in triggers exist at the event's date or are created earlier; flags read are set or declared;
  ages and periods have start and end conditions and periods lie inside their ages; coverage. [balance.yaml
  validation_checks; validation_report.md]
- EVT-063 The build shall report coverage per macro-region and age, flagging any region below 2 events in an
  age that lists it, and an agency share below 0.35. [balance.yaml coverage; coverage_report.md]
- EVT-064 If the build finds an error, then it shall exit non-zero in check mode; warnings are reported but do
  not fail. Current result: 0 errors, 21 warnings. [README; validation_report.md]
- EVT-065 The game shall mark each source `verified: true` or `false`; a historian shall spot-check citations
  before release. [README research caveats]

### 5.14 Hooks used by other contexts

- EVT-066 Where an event carries an optional `music:` tag (event_good, event_bad, event_major, crisis,
  revolution), the game shall pass it to the soundtrack. [music-design §6]
- EVT-067 Where an event is marked `tutorial_only: true`, the game shall never fire it in a real campaign.
  [tutorial-design §3.4]
- EVT-068 When a rising tagged with an event ends (rebellions), the game shall apply the `rising_won` effects
  of the event and of the chosen option if the rising won, or their `rising_crushed` effects if it was
  crushed. Sibling contexts add their conditions and effects as one evaluator each (EVT-050).
  [revolutions changes-for-other-designs; D-EVT-11]

### 5.15 Events in the game (milestone 6, first slice)

The event tree now runs in the game's month for every realm (D-EVT-17). The library keeps every rule above;
a bridge shows it the game as the tree's own world, and lands what the game already simulates.

- EVT-069 When a campaign starts, the game shall load the campaign's events (the tree's 247 events whose history
  starts before the end date, no tutorial-only ones), every age, period and modifier, start the 1444 periods,
  and check the ages and periods of the start year at once. [EVT-002, EVT-011, EVT-015; D-EVT-17]
- EVT-070 Each month, as the last of the month's work, the game shall show the tree every realm under its tree id
  (aliases where the map's id differs), whether it exists, its wars, alliances, subjects and truces, its land
  neighbours, its gold, debt and men under arms (army_strength in thousands), its legitimacy as the share of its
  lords who are Loyal and its integration_strain as the share of its provinces with a grievance (D-EVT-4), its
  stability from the realm's step (Steady +1, Uneasy 0, Troubled −1, Crumbling −3), and who owns and holds each
  map province of a mapped place; then it shall run the tree's month (spec 9). [EVT-054 … EVT-056; D-EVT-17]
- EVT-071 When an event or decision is for an AI realm, the AI shall answer it at once by the option weights of
  EVT-042; an event with no chooser is rolled the same way. [EVT-040, EVT-042; spec 12]
- EVT-072 When an event fires for the player, or a decision is offered to the player, the game shall keep it
  waiting until the player answers it; nothing answers it for them and it never lapses. [EVT-044; D-EVT-8]
- EVT-073 The game shall land on the game what it already simulates: a `transfer` hands the map provinces of
  the place to the realm, an `annex` hands it all of the target's land, a `treasury` or `debt` change moves the
  realm's gold or debt (a `%` change of what it holds, a number at the game's gold scale), and a change to
  legitimacy or stability is kept on top of the realm's own reading. Every other effect stays in the tree's world,
  where later events read it. [EVT-045, EVT-056; D-EVT-17]
- EVT-074 When an event fires for a realm or the AI answers one, the News shall say so ("Fall of
  Constantinople: Ottomans chooses “Imperial capital”"); a major event is told to every realm, any other to the
  realms in it and those close to them. [EVT-066; game-shell SHELL-082]
- EVT-075 The event tree's state (its world, ages and periods, what fired, events waiting for an answer, boosts
  and its dice) shall be kept in the save. [saves; D-EVT-17]

- EVT-077 When a `create_country` effect fires, the game shall found the realm on the map (SETUP-083 to
  SETUP-090): the realm's sleeping realm wakes, or a gone map realm wakes again; a realm the list does not hold
  takes the first spare sleeper under the tree's name for it. With no `where` and realms named in `from`, those
  realms form it (a union); with a `where`, it takes the map provinces of that place, only those the `from` realms
  hold when it names them, and holds a truce with the realm it broke from; a place the map does not know yet
  gives it its home land; `subject_of` makes it that realm's subject. With no land to give, nothing wakes and the
  effect stays in the tree's world. [EVT-045; X-24; D-EVT-18]
- EVT-078 The tree shall know a founded realm under the id the event gave it from then on, and a save shall keep
  it. [EVT-075; SETUP-091; D-EVT-18]
- EVT-079 The game shall show the tree each realm's region, so a `where: region:<id>` limit binds: the tree's
  region for the realm where it has one, else that of the nearest realm it has one for; a founded realm takes the
  region of whoever held its capital in 1444. A region holds the regions inside it (region:europe holds
  region:germany). [EVT-030; D-EVT-18]
- EVT-080 The map's Japan, Korea and Khmer shall be the tree's Ashikaga, Joseon and Cambodia, as the catalogue
  has them, so the events written for them fire (the Ōnin War, the Imjin War). [D-EVT-17; D-EVT-18]

#### How the player uses it: the event card
- EVT-076 Where: when an event fires for the player, the week pauses and the event card opens over the map,
  one event at a time, oldest first (SHELL-080). The card shows the event's name, the year it happened in
  history, the tree's summary of what happened then, *Whatever you choose* with the event's own effects, and
  each option as a 44-point button with its effects listed under it in words ("You: gold +15%", "Constantinople
  passes to you"), the historical option marked *As in history*. Tapping an option answers it; the next waiting
  event follows, and when none is left the paused week plays on. *Look at the map* folds the card into the End
  turn button, which shows a scroll with the count of waiting events; while any waits, End turn opens the
  oldest instead of ending the turn (SHELL-070, SHELL-081, EVT-044). Grouping and overview: every event is one
  card; the News keeps a line for each event that fired, so the history of the campaign reads there, and
  waiting events sit at the top of the News with an *Answer* button. Phone: the card is a sheet over the
  map in the Wide and Tall layouts, inside the safe areas, its text scrolling while the options stay in reach,
  every button at least 44 points high, nothing that needs hover. [X-19, SHELL-070, SHELL-080, SHELL-081]

## 6. Commands

| Command | Who issues it | Preconditions | Result | Events emitted |
|---|---|---|---|---|
| AnswerEvent(event instance, option) | player / AI (the chooser) | Event fired or offered; option allowed | Option effects plus event effects applied | OptionChosen, EffectsApplied |
| FireEvent(event, bound roles) | system | Eligible and selected | Event fires | EventFired |
| SetAlternateHistoryMode(choice) | player (new game "Events": Historical, Plausible, Free) | At game setup | Preset historical, plausible or divergent used | (none) |

## 7. Domain events

| Event | When | Payload | Consumed by (context) |
|---|---|---|---|
| AgeStarted / AgeEnded | Start or end condition, or forced date | age | exploration, national-strengths, audio, onboarding, research |
| PeriodStarted / PeriodEnded | Start or end condition, or effect | period | events (triggers), map-presentation |
| EventBecameEligible | Availability, requires and trigger hold | event, roles | revolutions (card stage), AI |
| EventFired | Selected | event, roles, date | game-shell (modal), audio, achievements, revolutions |
| OptionChosen | Answer or roll | event, option, chooser, historical? | achievements, revolutions |
| EffectApplied | Each effect | effect type, target, values | province, realm, trade, government, diplomacy, subjects, religion, culture, rebellions, warfare, buildings |
| ModifierApplied / ModifierExpired | Modifier effect; duration ends | modifier, target | owning contexts |
| EventInvalidated | `invalidated_if` holds | event | AI, game-shell (chronicle) |
| EventCancelled | `cancel_if` holds or `maintain` fails | event | owning contexts |
| DecisionLapsed | An AI's decision 10 years unanswered | event | AI |
| RisingTierApplied | A tagged rising ends | event, tier | revolutions, game-shell |

## 8. Policies (reactions to other contexts)

- When any statistic, ownership, war, relation, flag or rising changes (all contexts), then the next
  eligibility check reads the new state.
- When a tagged revolution rising ends (rebellions), then apply the option's `rising_won` or `rising_crushed`
  tier (EVT-068, D-EVT-11).
- When the campaign end date arrives (time-and-turns), then cut every running age and fire nothing more; the
  final scores screen (game-shell, X-12) is the wrap-up, not an event (D-EVT-2).

## 9. Each month

The events' monthly work runs in the turn in which a new month begins (X-18), in the events step of that turn.

Reads first: every statistic and flag the triggers name, after the other systems' monthly steps.

1. Each year (the turn in which 1 January falls): evaluate age and period start and end conditions inside windows; apply
   forced dates (D-EVT-15).
2. Each month: AI decisions unanswered for 10 years lapse into the pool (EVT-032).
3. Each month: evaluate eligibility (availability, requires, trigger, invalidation) and bind roles.
4. Fire immediate events; roll pool events (`pool_roll_interval_months` 1) under the pacing cap; offer
   decisions.
5. Queue fired events for the player in date order; AI choosers answer at once.
6. Apply chosen options' and events' immediate effects; schedule delayed effects; tick ongoing effects,
   durations, `maintain` and `cancel_if`; tick modifiers' decay and expiry; fade follow-up boosts; recompute
   derived values.

Events run as step 6 of the turn (X-2): after the monthly, seasonal and yearly steps of every other system and
before achievements and the autosave. The age and period checks run in the events step of the turn in which 1 January falls.

## 10. Configuration

| Key | Meaning | Value in the design | Placeholder? | Config file |
|---|---|---|---|---|
| selection.pool_roll_interval_months | How often pool events roll | 1 | yes | data/balance.yaml |
| selection.max_pool_events_per_country_year | Pacing cap | 2 | yes | data/balance.yaml |
| selection.decision_expiry_years | Unanswered decision lapses | 10 | yes | data/balance.yaml |
| campaign.events_choice | New-game "Events" choice → preset | Historical, Plausible (default), Free → historical, plausible, divergent | no | events.json |
| date_binding.approximate_peak_mult | Approximate event's chance in its history year | 2.0 | yes (provisional) | events.json |
| date_binding.approximate_spread_years | Years either side over which it fades to ×1 | 10 | yes (provisional) | events.json |
| options.min, options.max | Options per event | 2, 4 | max provisional | events.json |
| selection.alternate_history_mode.historical | follow_up_boost_mult, historical_option_mult, mean_years_mult | 1.5, 2.0, 0.8 | yes | data/balance.yaml |
| selection.alternate_history_mode.plausible | same | 1.0, 1.0, 1.0 | yes | data/balance.yaml |
| selection.alternate_history_mode.divergent | same | 0.6, 0.5, 1.3 | yes | data/balance.yaml |
| follow_ups.max_boost | Boost cap | 5.0 | yes | data/balance.yaml |
| follow_ups.boost_decay_years | Linear fade after the window | 10 | yes | data/balance.yaml |
| ai_factors | Named AI factors | 7 factors (EVT-042); high_unrest: more than 0.5 of provinces at 4+ grievances | yes | data/balance.yaml; events.json ai_factor_rules |
| rebel_sizes | Share of the province's recruit pool that rises | small 0.125, medium 0.25, large 0.5, huge 1.0 | yes (provisional) | events.json |
| stat_mapping | Event-tree statistic → concrete change (D-EVT-4) | province §15 table, country §11, trade v2, diplomacy 11 | food_security step size provisional | events.json |
| derived_formulas | k_supply, good_base_yield, tech_economy_bonus, terrain_supply_mult | 1, 1, 0, 1 | yes (provisional) | events.json |
| modifier_rules.default_stacking | Default stacking | refresh | yes | data/balance.yaml |
| modifier_rules.max_stacks | Stack cap | 3 | yes | data/balance.yaml |
| modifier_rules.exponential_half_life_share | Exponential decay | 0.5 | yes | data/balance.yaml |
| coverage.min_events_per_region_age | Coverage threshold | 2 | yes | data/balance.yaml |
| coverage.min_agency_share | Agency threshold | 0.35 | yes | data/balance.yaml |
| statistics other `k_*` coefficients | Formula coefficients | not given | yes | data/balance.yaml (named in statistics.yaml) |
| campaign end date | Last day of the campaign | 31 August 1939 | no (a setting) | settings; events.json campaign.end_date |
| per event `selection.mean_years`, `modifiers`, option `ai.base` | Per-event balance | per event | yes | data/events/*.yaml |
| per modifier `changes`, `years` | Per-modifier magnitudes | per modifier | yes (design values) | data/modifiers.yaml |

## 11. Seams

| Other context | Direction | Pattern | What crosses |
|---|---|---|---|
| province | downstream | Anti-Corruption Layer | Province stats mapping (§15, the events data's stat_mapping): population, prosperity → buildings, devastation → burned tiles, unrest → grievances, control, fort_level, infrastructure, industry, trade_access, food_security, disease_burden, culture and religion shares, colonial_status; geography anchors → fixed places |
| realm | downstream | Customer–Supplier | Country stats mapping (§11): legitimacy, stability, war_weariness, prestige, admin_capacity, tech and innovations, literacy, debt, treasury, army and navy; engine flags (ruler_died, regency …) |
| research | downstream | Customer–Supplier | The 20 innovations are research-tree inventions with the same ids; `tech` tracks |
| trade | downstream | Customer–Supplier | trade_access → trade ratio gain %, trade_index → trade ratio (X-6); trade_presence, trade_route, hubs as labels |
| government | downstream | Customer–Supplier | 16 `government` values mapped to forms; admin_capacity → officials cap |
| rebellions | downstream | Customer–Supplier | `rebels` effect starts a rising from the recruit pool (EVT-048); `rebels_active` reads risings; `unrest` lands as one named grievance; events as sparks; the end of a tagged rising (EVT-068) |
| revolutions | downstream (they extend this) | Customer–Supplier | Adopted (D-EVT-11), registered by revolutions: conditions grievance, class_share, lords, war_lost; effects regime, lock; param rebels.revolution; tiers rising_won, rising_crushed; event field revolution with rearm (one_time may fire again); flags revolutionary_regime, emigre_court, reaction_regime, revolution_funded; areas hokuriku, old_castile; entities ikko_ikki_kaga, comuneros, tay_son, donghak_movement, russian_opposition_1905, iranian_constitutionalists; 7 unverified sources; 26 extended and 10 new events; build.py EFFECT_TIERS |
| religion | downstream (they extend this) | Customer–Supplier | Adopted (D-EVT-11), registered by religion: religions hussite, jain, asian_traditional; conditions faith_policy, holds_holy_place, faith_wave_active; effects faith_wave, faith_policy, preachers; entities tumed, gelug_order, old_believers, gowa_tallo, merina_kingdom; 7 modifiers; 8 unverified sources; 10 new events; faith_wave patches on protestant_reformation, council_of_trent, safavid_rise, sikh_panth_founded, futa_jallon_jihad, sokoto_jihad; flags religious_persecution_active, missionary_persecution, inquisition_established set by religion (D-EVT-16) |
| culture | downstream (they extend this) | Customer–Supplier | Adopted (D-EVT-11, D-EVT-12): culture groups celtic, baltic, caucasian, hebrew; effects tongue_spread, set_court_tongue, merge_tongues, move_people; conditions court_tongue, tongue_share, kin_of, cousin_of, stranger_to; engine-raised events "the court goes native" and "new languages abroad"; culture effects on listed events; nationalism read from ideology_support |
| subjects | downstream (they extend this) | Customer–Supplier | vassalize, release, relation subject/overlord/personal_union, subject_count, create_country subject_of, doctrine_of_lapse; adopted (D-EVT-11) subject_loyalty, add_subject_reason, remove_subject_reason, change_subject_kind |
| diplomacy | downstream (they extend this) | Customer–Supplier | opinion → ledger standing; trust and notoriety are diplomacy's derived values, an event's change lands as an Oath broken or a Notorious deed (D-EVT-14); relation types to relation actions; adopted effects war_aim, league, pretender (D-EVT-11) |
| national-strengths | downstream (they extend this) | Customer–Supplier | Ages for golden ages; condition language; adopted (D-EVT-11) effects grant_legacy, wake_heyday, stir_ambition, shed_burden and condition heritage; requested missing events, areas, hubs and sea ids |
| buildings | downstream (they extend this) | Customer–Supplier | Adopted (D-EVT-11) effects add_building, remove_building, damage_buildings, building_step and condition has_building; landmarks founded by events |
| exploration | downstream | Customer–Supplier | `age_of_exploration` gates exploration per region; colonial_presence |
| warfare | downstream | Customer–Supplier | war, peace, casus_belli; prestige from victories |
| game-shell | downstream | Published Language | Event modal, queue in date order, unanswered events block End turn (EVT-044), the "Events" choice Historical / Plausible / Free (EVT-036); the final scores screen is the wrap-up (D-EVT-2) |
| audio | downstream | Published Language | `music:` tags |
| achievements | downstream | Published Language | `event_role`, historical vs non-historical choices, narrative_only excluded |
| onboarding | downstream | Customer–Supplier | `tutorial_only` scripted events in event format; requested Varna crusade and abdication events |
| time-and-turns | upstream | Conformist | Events are step 6 of the turn, after every other system and before achievements (X-2); monthly work in the turn a new month begins, yearly checks in the turn in which 1 January falls (X-18) |
| game-shell (new game) | upstream | Customer–Supplier | The "Events" choice sets the alternate history mode; settings never change it during play (X-15) |

## 12. AI

- The AI picks among options by base weight times named factors (EVT-042); historical options are multiplied
  by the preset's `historical_option_mult`.
- A decision the AI leaves unanswered for 10 years lapses into the pool (EVT-032).
- Options with no chooser are rolled by these same weights.
- The AI reads the same counts as the player (country stats 11).
- Revolutions add their own weights (revolutions context).

## 13. Decisions and open questions

- **D-EVT-1** (was OQ-EVT-1) How post-1939 content is cut: when a campaign loads its events it drops every
  event whose history starts after 31 August 1939 (59 events); the data keeps them as reference. The ages
  Decolonization, Cold War and Globalization never start. Every running age is cut at the end date. An end
  condition part that names a dropped event (the World Wars age's `world_war_ii`) never holds, so the age ends
  by its other conditions or at the end date; force_end dates after 1939 are never reached. X-14 decides it.
- **D-EVT-2** (was OQ-EVT-2) Interwar coverage and the wrap-up: the 10 interwar events are the interwar
  content and no events are added; the end of the campaign has no wrap-up event, the final scores screen of
  X-12 is the wrap-up. Adding events or a new end mechanic would go beyond the designs.
- **D-EVT-3** (was OQ-EVT-3) The validator's anachronisms: they stay build warnings that never fail the
  build (EVT-064); the dates are corrected in the historian's spot-check before release (EVT-065). The build
  already reports them, and fixing history is a sources task, not a rule.
- **D-EVT-4** (was OQ-EVT-4) The rename pass: there is no rename in the event data. The events data holds a
  mapping table (an anti-corruption layer) that lands each change on the owning context (EVT-056): province
  §15's table, country §11, trade_access → trade ratio gain % and trade_index → trade ratio (X-6), trust and
  notoriety → diplomacy (D-EVT-14). legitimacy is read as the share of loyal lords and a change lands as the
  same points of loyalty on each lord. integration_strain is only read, as the share of the realm's provinces
  with one or more grievances. One table is simpler than rewriting 306 events.
- **D-EVT-5** (was OQ-EVT-5) Rebels: a `rebels` effect is a spark that starts a rising at once in the target
  province, with its men taken from the province's recruit pool: small 1/8, medium 1/4, large 1/2, huge the
  whole pool (provisional; the same 1:2:4:8 steps). Rebellions runs it from there. The unrest thresholds 60 and
  90 are dropped; `unrest` lands as one named grievance; `rebels_active` reads risings under way and accepts
  every rebel type, `anticolonial` included; the `high_unrest` AI factor holds when more than half the
  country's provinces have 4 or more grievances. X-9 says the rebellions design governs and men come from the
  recruit pool.
- **D-EVT-6** (was OQ-EVT-6) Schema against data: the built data is the contract and the schema follows it
  (`execution` holds duration_years, cooldown_years, max_occurrences, maintain and cancel_if; delayed effects
  are `{after_years, <effect>, if}`; AI factors are `{if, factor}` or a named `{factor, mult}`; `{event: id}`
  is allowed; localization is flat keys such as `event.<id>.name`). The data is what the build validates and
  the engine already reads.
- **D-EVT-7** (was OQ-EVT-7) Number of options: two to four, exactly one historical. More than four is a
  build error; fewer than two is a warning on a major event (printing_press_spreads, a diffusion with nothing
  to choose) and an error otherwise. Four covers the revolutions' largest events.
- **D-EVT-8** (was OQ-EVT-8) Decision expiry: only a decision offered to an AI country lapses after 10 years
  and re-enters the pool. A decision offered to the player waits and blocks End turn like every event. This
  keeps screen-flow's "nothing answers an event for the player".
- **D-EVT-9** (was OQ-EVT-9) Game rules: the new-game "Events" choice has three values, Historical,
  Plausible (the default) and Free, which are the presets historical, plausible and divergent. The separate
  "historical lean" rule (×1.25) is dropped. One choice is simpler than two overlapping rules.
- **D-EVT-10** (was OQ-EVT-10) `is_human`: dropped from the vocabulary; no condition reads whether a country
  is played by a person, and the build reports it as undeclared. The player and the AI follow the same rules.
- **D-EVT-11** (was OQ-EVT-11) Sibling additions: adopted. Religion, revolutions, culture, subjects,
  diplomacy, national strengths, buildings and the tutorial each register their conditions and effects as one
  evaluator each (EVT-050) and their data patches merge into the tree at build; the tiers `rising_won` and
  `rising_crushed` apply when a tagged rising ends (EVT-068); the `revolution` field and `rearm` are read
  through revolutions' re-arm hook. They were designed later and need no new rule in the event tree.
- **D-EVT-12** (was OQ-EVT-12) Culture groups: enums' list of 39 is the closed list, plus culture's four
  additions celtic, baltic, caucasian and hebrew, 43 in all. enums is the contract (D-EVT-6).
- **D-EVT-13** (was OQ-EVT-13) Post-1939 values: removed from the closed lists: the innovations computing,
  green_revolution_agriculture and internet; the ideologies non_alignment, environmentalism and neoliberalism;
  the global `co2_concentration`. The research tree holds the 17 remaining innovations. X-14 drops what comes
  after 1939.
- **D-EVT-14** (was OQ-EVT-14) trust and notoriety: they are diplomacy's derived values (DIPL-173, DIPL-174).
  An event may still change them; the change is handed to diplomacy (trust down → an Oath broken, notoriety
  up → a Notorious deed) and the event tree stores no number. Diplomacy was designed later.
- **D-EVT-15** (was OQ-EVT-15) When ages and periods are checked: in the turn in which 1 January falls, in the events step
  (step 6 of X-2), before eligibility. X-2 and X-4 put yearly steps in January.
- **D-EVT-16** (was OQ-EVT-16) The religion flags: religious_persecution_active, missionary_persecution and
  inquisition_established are set by religion's own rules (`set_by: religion` in the events data). Religion
  was designed later.
- **D-EVT-17** First game slice of events (milestone 6, provisional): the bridge maps 13 realm ids of the map to
  the tree's (ottomans → ottoman, mamluks → mamluk, timurids → timurid_empire and so on) and 20 of the tree's
  places to map provinces by name (Constantinople is Istanbul, Granada is Granada, Málaga and Almería, Guyenne is
  Gironde, Landes, Dordogne and Lot-et-Garonne …), in `events-places.json`; a place not yet mapped covers no
  provinces, so a condition on it does not hold and its events wait for the mapping. The tree's own statistics
  start at one value for every realm (prestige 0, war weariness 0, administration 50, the three tech tracks 6,
  literacy 5, military quality 40, naval reach 10, navy 0) and every mapped place (control 60, prosperity 10,
  literacy 5), until the realm and province contexts give them; stability's steps sit at +1, 0, −1 and −3.
  An AI realm takes up a decision as soon as it is offered. Events roll their own dice, so they never shift the
  rest of the turn. Only land, gold, debt, legitimacy and stability land on the game in this slice (EVT-073); war,
  peace, subjects, rebels, buildings and people from events land when their bridges are built. Quick defaults so
  the game can play history now; each is replaced when its context lands.
- **D-EVT-18** Founding events (Leroy, 18 Oct; X-24): a `create_country` founds the realm on the map through
  the sleeping realms (EVT-077, EVT-078). The bridge also gives every realm a region, the tree's own or its
  nearest neighbour's as a stand-in, and reads a region as holding the regions inside it, because before this no
  `where: region:` limit could bind (EVT-079); and it aliases japan, korea and khmer to the catalogue's ashikaga,
  joseon and cambodia (EVT-080). The tree's later "japan" and "korea" (Meiji Japan, the Korean Empire) are other
  entities and are founded when their events say so.

## 14. Traceability

| Requirement | Feature file | Scenario |
|---|---|---|
| EVT-001 – 003 | campaign-scope.feature | End date; post-1939 events dropped; later ages never start; ages cut at the end date |
| EVT-004 – 010 | principles.feature | History reference; roles; agency; harm; enslavement; own terms |
| EVT-011 – 017 | ages-and-periods.feature | Age windows, forced dates; periods |
| EVT-018 – 028 | eligibility.feature | Availability, mode, repeat, requires, exclusive, invalidation, trigger |
| EVT-029 – 036 | selection.feature | Immediate, pool, decision, AI decisions lapse and the player's do not, pacing, follow-ups, presets, the Events choice |
| EVT-037 – 038 | effects.feature | Duration, maintain, cancel |
| EVT-039 – 044 | options.feature | Options, chooser, allowed, AI factors, player answer |
| EVT-045 – 050 | effects.feature | Effect tiers and types; rebels sizes; new types |
| EVT-051 – 053 | modifiers.feature | Decay, stacking, scopes |
| EVT-054 – 056 | statistics.feature | Stored vs derived; derived recomputed each tick; the mapping; trust and notoriety to diplomacy; integration_strain read only |
| EVT-057 – 059 | data-validation.feature | Flags, enums, entities |
| EVT-060 – 065 | data-validation.feature | Layers, localization, checks, coverage |
| EVT-066 – 067 | principles.feature | Music tags, tutorial-only events |
| EVT-068 | effects.feature | The end of a tagged rising applies its tier |
| EVT-069 … EVT-075 | — | Engine: packages/engine/test/events.test.ts (ages and periods at the start, the AI's Fall of Constantinople, the player's card and answer, the save) |
| EVT-076 | — | Presentation: apps/client/src/ui/events.ts, the event card |
| EVT-077 – 080 | founding.feature | Founding events wake sleeping realms; regions and aliases bind |