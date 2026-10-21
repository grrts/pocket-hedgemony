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

0. `start-date/plan-1378.md` §5 and `start-date/research/europe-west.md` (goals with reasons), 19 Oct 2026: the
   West's bridge events of 1378 to 1444 (EVT-085 to EVT-089, D-EVT-20).
0. `start-date/plan-1378.md` §3.1 (18 Oct 2026, Leroy's choices of 18 and 19 Oct): the campaign starts on
   20 September 1378; a new Age of Schism and Conquerors; Gunpowder Empires and Exploration start by their
   conditions; the periods move and new ones cover 1378 to 1444 (EVT-081 to EVT-084, D-EVT-19).
1. `planning/gap-lists.md` "Decisions already made" (16 Oct 2026): the game stops 31 August 1939; the event
   tree's Second World War events and its Decolonization, Cold War and Globalization ages are out of scope;
   item 24 (event tree fixes); item 20 (order of a turn).
2. `screen-flow/screen-flow-design.md` §4.6, G7 (16 Oct): unanswered events block End turn; events open one
   at a time; options include historical, plausible or free events (D-SETUP-21); the end-of-campaign wrap-up.
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
| Historical goal | A realm's goal from history with its reason, window, weight and aim; ends when its reason does (EVT-100). | Event, war aim |
| Aim (of a goal) | What the game reads from a goal: take, hold, subject, ally, fight, free, or none. | War aim (diplomacy) |
| Pull | How strongly a live goal draws its realm, from its weight, shake, preset and time (EVT-102). | Standing |
| Shake | The seed's change to a realm's goals at the start: weights vary, some goals deviate or drop (EVT-101). | |
| Turning point | A historic event of the history checkpoints that the event tree holds (EVT-109). | |
| Chronicle | The History tab of the News: the turning points and whether each is on course, bent or gone (EVT-112). | The old Chronicle tab of the Realm book (SHELL-169) |

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

- EVT-001 The game shall run events from the campaign's start to its end date, 31 August 1939 by default (one
  setting). [gap-lists decisions; plan-1378 §3.1]
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
- EVT-013 The game shall run the 10 in-scope ages with these windows and forced dates: Schism and Conquerors
  (1378–1460; force start 1378, force end 1460); Gunpowder Empires (1420–1760; 1453, 1760); Exploration
  (1415–1680; 1445, 1680); Reformations (1480–1700; 1530,
  1700); Atlantic Empires (1480–1880; 1520, 1880); Crisis and Absolutism (1590–1790; 1640, 1790); Revolutions
  (1750–1880; 1800, 1880); Industrialization (1700–1950; 1830, 1950); Imperialism (1800–1945; 1860, 1945);
  World Wars (1890–1960; 1925, 1960), with their start and end conditions as in ages.yaml. [ages.yaml;
  plan-1378 §3.1; D-EVT-19]
- EVT-014 The game shall list each age's regions, so systems that read "the age has begun in your region"
  (exploration, national strengths, music) can use them. [ages.yaml; exploration §2]

### 5.4 Periods

- EVT-015 The game shall make a period active when its start condition holds inside its window (`start:
  initial` = active at the campaign's start when the start lies inside its window) and end it when its end condition holds, so a period can start early,
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
- EVT-033 The game shall fire at most `max_pool_events_per_country_year` (3) pool events per country per year.
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
  starts before the end date, no tutorial-only ones), every age, period and modifier, start the start's periods,
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
  where later events read it. A change to a derived statistic the tree still holds at its start value (naval
  reach, navy, military quality; D-EVT-17) lands on that reading; a change to any other derived statistic is not
  written (EVT-054) and never stops the game. [EVT-045, EVT-054, EVT-056; D-EVT-17]
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

### 5.16 Ages and periods from 1378 (milestone 10, 19 October 2026)

The campaign is to start on 20 September 1378 (Leroy, 18 Oct; plan-1378). The ages and periods now run from that
start, and a campaign that still starts in 1444 plays them as before: every age and period of 1444 is under way
at a 1444 start, by its conditions rather than by its date.

- EVT-081 The game shall run these periods from the start (periods.yaml):

| Period | Window | Starts | Ends |
|---|---|---|---|
| Western Schism (new) | 1378–1418 | at the start | with its window (the Council of Constance's bridge event, later) |
| Timur's conquests (new) | 1378–1405 | at the start | when Timur's realm is gone, or with its window (his death, 1405) |
| Hundred Years' War, Caroline phase (new) | 1378–1396 | at the start | when England and France are no longer at war |
| Hundred Years' War, Lancastrian phase (new) | 1399–1453 | when England and France are at war again after the Caroline phase | the end of the Hundred Years' War, or peace |
| Ottoman Interregnum (new) | 1400–1420 | only if the Ottomans fall under Timur's realm, or are at war with it at stability −2 or worse | when they are free of it, at peace with it and at stability 0 or better |
| Hussite wars (new) | 1415–1440 | when religious rebels rise in Bohemia | in 1436, or when the rebels are gone |
| Ming treasure voyages (new) | 1403–1435 | when the Ming stand at stability +1 or better | in 1433, when the Ming fall to −1 or worse, or are gone |
| Majapahit's decline (new) | 1389–1527 | while Majapahit stands (after Hayam Wuruk, 1389) | when Majapahit is gone |
| Ottoman expansion | 1378–1620 | at the start | as before |
| Muscovite consolidation | 1378–1620 | at the start | as before |
| Southeast Asian mainland and maritime states | 1378–1700 | at the start | as before |
| Timurid fragmentation | 1400–1540 | once Timur's conquests are over | as before |
| Late Ming | 1424–1650 | after Yongle, once the treasure voyages are over | as before |
| Songhai and the Sahel | 1378–1640 | when Songhai stands on its own | as before |
| Aztec and Inca expansion | 1428–1580 | when the Triple Alliance or the Inca stand | as before |
| Portuguese oceanic expansion | 1415–1640 | when the Age of Exploration is under way and Portugal stands | as before |

  The new periods belong to the Age of Schism and Conquerors; the periods under way from the start belong to it
  as well as to their later ages. Where a new period's history turns on an event of 1378 to 1444 (Constance,
  Timur's death, Ankara, the Defenestration, the voyages), that bridge event will start or end it by
  `start_period` and `end_period` (EVT-017); until those events are written, the period runs by the conditions
  above. @placeholder [plan-1378 §3.1, §5; D-EVT-19]
- EVT-082 The game shall start the Age of Schism and Conquerors at the start, in every region, and end it once the
  Western Schism is over, the Council of Basel is over (1449 until its bridge event is written) and Constantinople
  has fallen or Byzantium is gone. Gunpowder Empires shall start from 1420 when 3 of the 8 great powers (EVT-083)
  know bombards, or when Constantinople falls. Exploration shall start from 1415 when Portugal or Castile knows the
  ocean ships or holds the Atlantic islands (the engine's `atlantic_island_bases` flag); the Ceuta and island
  bridge events add to this later. A world that moves fast starts them early, a slow one waits for their forced
  years. @placeholder [plan-1378 §3.1; D-EVT-19]
- EVT-083 The bridge shall show the tree, each month, the innovations a realm has adopted as including the research
  inventions it knows, by the table `innovations_from_research` (bombards: W3 Bombards, gunpowder_infantry: W5,
  ocean_navigation: S4 Carrack and caravel, printing: L5, humanist_learning: L6), and its `great_power_score` as
  the number of provinces it holds, so the 8 great powers are the 8 realms with the most provinces, as music and
  diplomacy count them (D-AUD-2). [D-EVT-19; D-EVT-17]

#### How the player uses it
- EVT-084 Nothing new is tapped: an age or a period that starts shows as before, in the News and in the systems
  that read it (exploration, national strengths, music). From the 1378 start the Age of Schism and Conquerors is
  under way on the first day, so it brings no stinger (AUD-033 keeps its nine). The Chronicle card, the overview
  of history from 1378, comes with the bridge events (plan-1378 §4.6). [X-19; plan-1378 §3.1]

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

### 5.17 Bridge events of the West, 1378 to 1444 (milestone 10, step 6, 19 October 2026)

History from the 1378 start to 1444 reaches the West as events (plan-1378 §5, rows Church, Empire, France and
England, Iberia and Italy). Like every event they are conditional and mostly `approximate`: likeliest near their
history year when their conditions hold, never forced by the date (EVT-004, EVT-019, plan-1378 §2).

- EVT-085 The game shall join each region's bridge file (`events-bridge-<region>.json`: its events, the places they
  name with their map provinces, entity names and words) to the campaign's events when a campaign loads. A bridge
  event with the id of a campaign event replaces it, which is how a 1444 event is re-dated (EVT-089). [plan-1378 §5;
  D-EVT-20]
- EVT-086 The bridge shall show the tree, each month, three more things of each realm: its state faith as the tree
  first meets it (an event's change of faith is the tree's own after), its ruler's age and years on the throne as
  the statistics `ruler_age` and `ruler_years` (0 through a new ruler's first year), and these flags: `regency`
  while a regent rules for a child, `emperor` on the realm whose ruler holds the Empire, `empire_member` on each
  member. So "the king has died", "a child is king" and "the Emperor" are conditions an event can read.
  [D-EVT-20; REALM-100; INST-010]
- EVT-087 When a campaign starts, the game shall count every bridge event whose history date lies before the start
  as having happened, with its historical option and holders, and shall not apply its effects again (the start's
  own data shows them). A date of a year alone counts as under way all that year. So a 1444 campaign plays as
  before, and an event that needs a bridge event (EVT-089) can still follow there; a 1378 campaign has none of them
  yet. [D-EVT-20]
- EVT-088 The game shall run the West's 54 bridge events (`events-bridge-west.json`; ★ marks the 18 turning points
  the history check will watch):

| Region | Events (history year) |
|---|---|
| Church | France declares for Clement ★ (1378), A realm chooses its Pope ★ (1378–87, once for each Catholic realm of Europe: Rome, Avignon or neutral, leaning by its ties to France and England), Urban deposes Joanna (1380), Wyclif and the Lollards (1382), Council of Pisa (1409), Council of Constance ★ (1414, ends the Western Schism), Hus burned (1415), Defenestration of Prague ★ (1419, starts the Hussite wars), Council of Basel (1431), Union of Florence (1439) |
| Empire | Wenceslaus succeeds Charles IV ★ (1378), Neuberg partition (1379), Battle of Sempach (1386), Battle of Näfels (1388), Swabian City War (1388), Deposition of Wenceslaus ★ (1400), Rupert's Italian venture (1401), Sigismund King of the Romans (1410), Brandenburg to the Hohenzollerns (1415, a union under Brandenburg), Saxony to the Wettins (1423, Saxony annexes Saxe-Wittenberg), Hussite crusades ★ (1420–31), Albert of Austria takes three crowns (1438, unions of Hungary and Bohemia), Frederick III (1440) |
| France and England | Brittany confiscated (1378), The uncles' regency (1380), Peasants' Revolt ★ (1381), Madness of Charles VI (1392), Richard II deposed ★ (1399), Murder of Orléans (1407), Armagnac–Burgundian war (1411), Cabochien revolt (1413), Agincourt ★ (1415, Normandy passes to England two years on if the war goes on), Treaty of Troyes ★ (1420, Paris to England), Joan of Arc ★ (1429), Congress of Arras ★ (1435, Paris back to France a year on), Écorcheurs (1435) |
| Iberia | Portuguese crisis ★ (1383), Aljubarrota ★ (1385), Lancaster's claim to Castile (1386), Compromise of Caspe (1412), Conquest of Ceuta ★ (1415), Madeira and the Azores (1420, sets `atlantic_island_bases`, so the Age of Exploration can start), Past Cape Bojador (1434), Alfonso V takes Naples (1435, a union under Aragon) |
| Italy | War of Chioggia ★ (1378), Peace of Turin (1381), Charles of Durazzo takes Naples (1381), Gian Galeazzo seizes Milan ★ (1385, Pavia annexes Milan), Milan made a duchy (1395), Death of Gian Galeazzo (1402), Florence takes Pisa (1406), Ladislaus marches on Rome (1408), Lombard wars (1425, Brescia to Venice), Sforza weds the duke's daughter (1441) |

  The events chain by their conditions and follow-ups: the obedience each realm chooses is a flag Urban's and
  Pisa's events read, the madness opens the princes' feud that Orléans's murder, the civil war, Agincourt and
  Troyes follow, Ceuta leads to the islands and the islands to Bojador. Durazzo's and Alfonso's events give the
  `claim_on_naples` and Sforza's the `claim_on_milan` the Italian Wars read. A `rebels` effect is a spark in each
  aggrieved province of the realm or place it names (EVT-048, REBL-010). Effects the game does not simulate yet
  (prestige, casus belli, relations other than subjects) stay in the tree's world, where later events read them
  (EVT-073). @placeholder [plan-1378 §5; europe-west.md goals; D-EVT-20]
- EVT-089 The game shall run these 1444 events from the 1378 start, re-dated (the same events otherwise):
  `end_of_hundred_years_war` from 1420, needing Agincourt or Troyes first; `wars_of_the_roses` from 1430, needing
  Richard II's deposition; `union_of_castile_and_aragon` from 1415, needing the Compromise of Caspe;
  `fall_of_granada` and `alhambra_decree` from 1400; `printing_press_spreads` from 1440. The West's other events with
  `earliest: 1444` keep it, because their history needs what the bridge period builds first: `castile_portugal_union`
  (the war of 1475 over a Castilian succession), `columbus_first_voyage`, `portuguese_cape_route`,
  `treaty_of_tordesillas` and `portuguese_elmina` (ocean reach after Bojador). [plan-1378 §5; D-EVT-20]

#### How the player uses it: the bridge events
- Where: nothing new is built. A bridge event for the player's realm opens the event card over the map like any
  other (EVT-076): its name, its history year, what happened then, and its options as 44-point buttons with their
  effects in words, the historical one marked *As in history*. Playing France in 1378, the first card is *France
  declares for Clement*; playing Castile, *A realm chooses its Pope* asks Rome, Avignon or neutral. Grouping and
  overview: one card per event; the News keeps a line for each that fired, so the run of history from 1378 reads
  there, and the Chronicle card (plan-1378 §4.6) will show the turning points on course, bent or gone. Phone: the
  card's Wide and Tall sheets, safe areas and 44-point buttons, nothing that needs hover (EVT-076). [X-19]

### 5.18 Bridge events of 1378 to 1444: the East (milestone 10, step 6)

The East's bridge events live in `events-bridge-east.json`, written by `tools/domain-data/build_bridge_east.py`:
North and East (Kulikovo to Grunwald and the Muscovite war of succession), the Ottomans and the Balkans (John V
restored to the Crusade of Varna), the steppe and Iran (Tokhtamysh to Abu'l-Khayr's Uzbeks) and the Mamluks and
the Horn of Africa (Barquq to Zara Yaqob). Timur in India is the South file's `sack_of_delhi`.

- EVT-090 The East's bridge events shall all belong to the Age of Schism and Conquerors, none shall be
  `mandatory`, and most shall be `approximate`, so each is likeliest near its history year while its
  conditions hold and none is forced by its date. Its turning points (★ in plan-1378 §5) shall be among them:
  Kulikovo, Tokhtamysh burns Moscow, the Union of Krewo, Grunwald, Kosovo, Nikopolis, Ankara, the Crusade of
  Varna, Tokhtamysh unites the Horde, Timur's three-year and five-year campaigns, the Terek, the death of Timur,
  and the Khanates of Kazan and Crimea. [plan-1378 §2, §5; D-EVT-21]
- EVT-091 Every East bridge event shall pass the tree's build checks (EVT-062) together with the campaign's
  events, shall name realms by their tree ids (`ottoman`, `mamluk`, `timurid_empire`, `golden_horde`), and shall
  name only places that its file or `events-places.json` maps to provinces. [EVT-057, EVT-062; D-EVT-17;
  D-EVT-21]
- EVT-092 The campaign events of the East that waited only for the year 1444 shall be copied into the East file
  with an earlier `earliest` and nothing else changed: the fall of Constantinople (1390), Mohács (1400), the
  Union of Lublin (1386), the Ottoman conquest of the Mamluks (1400), the conquest of Kazan (1438), the Kazakh
  khanate (1428) and the Shaybanid conquest of Transoxiana (1428); a bridge event replaces the campaign event of
  the same id. [plan-1378 §5; D-EVT-21]
- EVT-093 The Crusade of Varna shall be a bridge event like the others: open from 1425 to 1465, likeliest
  in 1444, it fires when a realm on the Ottoman border is at war with the Ottomans or has just made the Long
  Campaign, and not once the Ottomans hold Constantinople. [plan-1378 §5; D-EVT-21]

#### How the player uses it
- EVT-094 Nothing new is tapped: an East bridge event that fires for the player opens the event card
  (EVT-076) with its name, its history year, its summary and two or three options, one marked *As in
  history*; every one has its name, summary and option labels in the localization. Grouping and overview: each
  event is one card, and the News keeps the line; the Chronicle card (plan-1378 §4.6) is the overview of the
  bridge events and comes with the history check. Phone: as EVT-076. [X-19; EVT-061, EVT-076]
### 5.19 Bridge events of 1378 to 1444: Asia, Africa and the Americas (milestone 10, 19 October 2026)

The south's turning points between the 1378 start and 1444 (plan-1378 §5, rows South Asia, East Asia, Southeast
Asia and the Americas, and the African events of the research), in `events-bridge-south.json`. Each is conditional:
its trigger is the reason the realms had (a weak Delhi after Firuz Shah, Timur's strength, a Ming emperor who needs
prestige, a Hồ usurper on the Trần throne, Maxtla's usurpation), and its date only makes it likelier near its year
(`approximate`, EVT-019). History is the reference, not the script (plan-1378 §2).

- EVT-095 The game shall load the region bridge files beside the campaign's events, with their names, the realms
  they name and the places they add. At the start, each bridge event whose history began before the start day has
  already happened, with its historical option and its historical realms and without its effects, since the start's
  map already shows them; so a 1444 start finds Chanka's war fought and Malacca founded, and plays on as before. No
  bridge event is `mandatory`, and each belongs to the Age of Schism and Conquerors. [plan-1378 §2, §5; D-EVT-23]
- EVT-096 The south's events with a 1444 floor shall open by their reason instead: the Inca expand once they have
  beaten the Chanka, or once no Chanka stand (from 1400); the Triple Alliance's height follows its founding (from
  1430); Majapahit's collapse follows the Paregreg war (from 1420); Songhai expands once free of Mali (from 1400);
  the Ōnin war needs the courts of Japan reunited (from 1400); the Tumu crisis needs the Oirat (from 1424). Iwami's
  silver, Elmina, the Cape route, Columbus, Tordesillas and the Tongan chiefdom keep 1444: their conditions name
  realms, techs and ages that come later anyway. A bridge event with a campaign event's id replaces it.
  [plan-1378 §5; decisions.md, Africa and the Americas 1]
- EVT-097 Asia's bridge events shall be these (★ the turning points the history check watches):

| Region | Events |
|---|---|
| South Asia (22) | Katehar's revolt, Vijayanagara takes Goa, the Faruqi grant of Thalner, Jayasthiti Malla, death of Firuz Shah, the Tughlaq succession war, Azam Shah in Bengal, Jaunpur's independence, the Tomars take Gwalior, the Rathores take Mandore, the Reddi kingdom splits, Sack of Delhi ★, Khandesh breaks away, Malwa's and Gujarat's independence, the Ming in Ceylon, Kotte founded, the Sayyids take Delhi ★, the Vijayanagara–Bahmani wars (recurring), Vijayanagara annexes Kondavidu, the Bahmanis take the Velama forts, Kapilendra's usurpation |
| East Asia (26) | Kōryaku coup, Hu Weiyong purge, Yellow Registers, Ming takes Yunnan ★, Naghachu surrenders, Buir Lake ★, death of Tögüs Temür, Wihwado retreat, Goryeo raids Tsushima, Meitoku rebellion, Joseon founded ★, courts of Japan reunited ★, death of Hongwu, Ōei rebellion, Jingnan war ★, Yoshimitsu king of Japan, the Jurchen guards, treasure voyages ★, Ming conquest of Đại Việt ★, Lam Sơn uprising ★, Gelug founded, the southern line passed over, Hokuzan falls, Ōei invasion, Ming capital to Beijing, Ryukyu united ★ |
| Southeast Asia (14) | Death of Chế Bồng Nga, death of Hayam Wuruk, Hồ dynasty, Hồ takes Amaravati, Majapahit sacks Singapura, Malacca founded ★, Paregreg war, Ayutthaya sacks Angkor ★, the Forty Years' War (recurring), Razadarit reunites Hanthawaddy, Ava takes Arakan, Arakan restored at Mrauk U, Suphannaphum takes Ayutthaya, Sukhothai absorbed |

  [plan-1378 §5; research/asia.md]
- EVT-098 Africa's and the Americas' bridge events shall be these:

| Region | Events |
|---|---|
| Maghreb and Sahel (13) | Fez retakes Marrakesh, the Marinids against Tlemcen, the Hafsids retake Tripoli, the Hafsid–Zayyanid war, the Sayfawa flee to Bornu, Kano pays Bornu, Mali's succession crisis, Songhai breaks from Mali ★, Masina settled, the Aïr sultanate, the Tuareg take Timbuktu ★, Ewuare in Benin, the treasure fleet on the Swahili coast |
| Central and southern Africa (4) | Kongo founded ★, Kongo's provinces joined, Mutapa formed ★, Khami rises |
| Mesoamerica (8) | Tepanec expansion, fall of Xaltocan, a Tepanec queen for Tenochtitlan, the Tepanec war on Texcoco, death of Tezozómoc, the Tepanec war and the Triple Alliance ★, Tariácuri unites the Pátzcuaro basin, fall of Mayapan ★ |
| Andes and North America (6) | Cusco masters its basin, the Colla–Lupaca war, the Chanka war ★, Chimor reaches south, the Great Law of Peace, the Wendat alliance |

  The Horn (Ifat and Adal, Dawit, Zara Yaqob) and the Mamluk court are in the East bridge file. Where a
  checkpoint names a turning point (`start-date/checkpoints`), the event takes its key as id, so the history check
  finds it. [plan-1378 §5; research/africa-americas.md; decisions.md]

#### How the player uses it
- EVT-099 Nothing new is tapped: a bridge event reaches the player as every event does, on the event card over the
  map (EVT-076), with its year in history, its summary and two to four options, the historical one marked *As in
  history*; the News keeps its line. Grouping and overview: one card per event; what history has done so far shows
  in the News and, with the history check, on the Chronicle card (plan-1378 §4.6). Phone: the card is the same
  sheet in the Wide and Tall layouts, 44-point options, nothing that needs hover. [X-19; EVT-076]

### 5.20 Realms' historical goals (milestone 10, 19 October 2026)

History is a reference, not a script, and realms follow its normal course because each pursues the goals it really
had, for the reasons it had them (Leroy, 18 Oct; X-25; plan-1378 §2). A goal ends when its reason does. The AI
weighs goals like any other wish and never above what it can afford.

- EVT-100 The scenario shall give realms historical goals (`scenarios/<id>/regions/<key>/goals.json`), each with its
  realm, the goal, its reason and when it ends in words, a window of years, a weight (weak, normal or strong), a
  plausible alternative in words, an **aim** the game can read or none, optionally the alternative as an aim, and
  the turning points it leads toward (the history checkpoints' event keys). The aims are **take** (hold these
  places), **hold** (keep these places), **subject** (make that realm a subject), **ally** (an alliance or a
  marriage with that realm), **fight** (beat that realm in war) and **free** (throw off that realm's overlordship).
  A place is a point bound to the nearest land province, as heritage binds its places (D-HER-16). A goal with no aim
  is shown and never weighed. A goal of a realm that is not on the map waits until that realm wakes. [plan-1378 §2,
  §4.1; X-25]
- EVT-101 At the start of each campaign the game shall shake every realm's goals with the campaign's seed: each
  goal's weight is multiplied by a factor drawn between `goals.shake_low` (0.5) and `goals.shake_high` (1.5); a
  share of the goals deviates by the Events preset (`goals.deviate_share`: Historical 10 %, Plausible 25 %, Free
  50 %), a goal with an alternative aim taking it and one without being dropped; then every weight is multiplied
  by the preset's `goals.preset_mult` (×1.5, ×1, ×0.5). Every realm's goals differ from one campaign to the next,
  while the big picture usually holds. @placeholder [plan-1378 §2; EVT-035, EVT-036]
- EVT-102 A goal's pull shall be its weight word's number (`goals.weights`: weak 0.5, normal 1, strong 2) times its
  shake and preset factors, times its time factor: 1 inside its window, rising from 0 over `goals.lead_years` (5)
  before it, and fading to 0 over `goals.lapse_years` (10) after it, when the goal has lapsed; a window with no last year stays open. @placeholder
  [plan-1378 §2: "while its reason holds and its time is near"]
- EVT-103 The game shall end a goal, each month, when its reason ends: a take goal when its realm holds all its
  places (achieved); a hold goal when its realm has lost one of them (lost); a subject goal when the target is its
  realm's subject, an ally goal when the two are allied, and a free goal when its realm is no longer the target's
  subject (achieved); a fight goal when its realm has taken land from the target since the start (achieved); a subject, ally, fight
  or free goal when its target is gone (gone); and every goal of a realm that is gone. An ended goal never comes
  back. [plan-1378 §2: "the goal ends if its reason ends"]
- EVT-104 A realm's pull toward another realm shall be the sum of the pulls of its live goals aimed at it: a take
  goal at the holder of any of its places, a subject or fight goal at its target. [plan-1378 §2]
- EVT-105 An AI realm at peace shall multiply its monthly chance of looking for a war (WAR-228) by 1 +
  `goals.war_chance_per_pull` (1) × its greatest pull toward a neighbour, and pick its target among the neighbours
  that pass the price of war with weight 1 + `goals.target_weight_per_pull` (4) × its pull toward each. A goal never
  lets a war past the price of war: a weak realm does not march however strong its goal. When the target holds a
  place of one of its take goals, its demand before war (DIPL-180) asks for that province first, and a Take land aim
  it holds on that province is the war's aim. @placeholder [plan-1378 §2; WAR-228; DIPL-180]
- EVT-106 An AI realm sending an envoy shall weigh, besides its warmest neighbour, the targets of its live ally
  goals (propose an alliance, arrange a marriage) and subject goals (offer overlordship), adding
  `goals.envoy_points_per_pull` (10) × the goal's pull to the count of that ask; every other reason of the count
  still counts (DIPL-223), and the envoy goes only when the total is above 0. @placeholder [plan-1378 §2; DIPL-223]
- EVT-107 The player's realm is never steered: its goals weigh nothing the player does, and the game never acts on
  them for the player. [plan-1378 §2; X-25]
- EVT-108 A save shall keep every goal's state: its shaken weight, whether it deviated or was dropped, and whether
  and how it ended. [SAVE]

### 5.21 The Chronicle (milestone 10, 19 October 2026)

The Chronicle is the overview of history: the turning points that have happened, those realms' goals are heading
toward, and whether each is on course, bent or gone (plan-1378 §4.6).

- EVT-109 The Chronicle shall list the historic turning points of the history checkpoints (each checkpoint's events
  since the previous one, with key, name and date) that the event tree holds, by the checkpoint's `event_tree_id` or
  an event whose id is the key. [plan-1378 §2, §4.6]
- EVT-110 The Chronicle shall give each turning point one state:
  - **Happened** when its event has fired, with the year; *as in history* within `chronicle.on_course_years` (10)
    of its history year, else *early* or *late*;
  - **Gone** when it can no longer happen: its event is invalidated, past its latest year, or an event exclusive
    with it has fired;
  - **Bent** when it has not happened more than `chronicle.on_course_years` after its history year, or when goals
    lead toward it and none of them is still live with its own aim (each deviated, was dropped, lapsed, was lost
    or lost its realm);
  - **On course** otherwise.
  @placeholder [plan-1378 §4.6]
- EVT-111 The Chronicle shall show *Ahead* the turning points not yet happened whose history year is at most
  `chronicle.horizon_years` (25) away, and those Bent or Gone whose history year passed within the same span, each
  with the realms whose live goals lead toward it and those goals; and *Happened* the ones that fired, newest
  first. [plan-1378 §4.6]

#### How the player uses it: the Chronicle and realms' aims
- EVT-112 Where: the News (SHELL-147) has a third tab, **History**, beside *All* (was *Everything*) and *Your realm*, in one row: the
  Chronicle card. Its first line counts the turning points ahead by state ("On course 9 · Bent 2 · Gone 1"), so
  history's course reads at a glance; under it *Ahead*, soonest first, then *Happened*, newest first. Each row is
  one 44-point line with the turning point's name, its history year, and its state as a word with an icon (never
  colour alone); a tap opens the row to show who is heading there, each realm as a button that opens its card,
  with the goal and its reason ("Ottomans: Break Lazar's Serbia, because Lazar's coalition blocks the road
  north"). Grouping: everything about history's course is on this one card; the event card and the News lines
  stay as they are (EVT-076). Overview: the Chronicle card is the overview of history. [X-19; plan-1378 §4.6]
- EVT-113 Another realm's General tab shall hold an **Aims** fold, its line counting the realm's live goals
  ("Aims · 3"), each goal with its reason, its window and its target as a button; the player's own goals are shown
  only if the player opens the closed *History's plan for your realm* fold at the foot of the History tab, as hints
  that nothing enforces. [plan-1378 §2: "Other realms' goals show on their realm card"; X-19]
- EVT-114 Phone: on a phone held sideways the News is the side panel (Wide) or the lower sheet (Tall); the History
  tab scrolls down, never sideways; every row, fold line and realm button is at least 44 points tall inside the
  safe areas; nothing needs hover. Checked with `apps/client/scripts/chronicle-shots.mjs` on a phone held sideways
  and upright. [X-19; plan-1378 §4.6]

### 5.22 Everyday events (feedback 152, 19 October 2026)

The historical events give a realm a choice about once in three years (research/play-hook.md); everyday events
add small ones about the realm's own people and stores, so something asks the player to choose every few months.
Leroy (19 Oct): officials dying, children born, lords dying, things happening to lords and lords changing their
opinion of you, and stores losing a big part of their grain; and not so many that play turns tedious. They are
drawn from what the game already holds (officials, lords and their loyalty, the ruler and heir, the food stores),
from `packages/rules/data/domain/events-everyday.json`, and stand beside the event tree: they are not tree events
and do not count toward its pool (EVT-033). Every number is a placeholder for balance (D-EVT-22).

- EVT-115 Each realm shall draw one everyday event every `months_between` months (2 to 4, rolled after each
  draw), its first within `first_within_months` (4) of the start, so realms do not all draw in the same month.
  @placeholder [feedback 152: "a choice every 2 to 4 months"; D-EVT-22; gaps review item 3]
- EVT-116 When a realm draws, the game shall pick by `weight` among the everyday events the realm could have now,
  each bound to who and where it is about; a realm with nothing to bind draws nothing that month. The AI answers
  at once by the options' `ai` weights; the player's waits on the event card (EVT-044). [feedback 152]
- EVT-117 While an event, historical or everyday, waits for the player's answer, no new everyday event shall
  come to the player; the draw waits a month at a time. A decision the player may take or leave (EVT-031) does not
  hold one back. [Leroy, 19 Oct: "not too much, so the gameplay doesn't feel too tedious"]
- EVT-118 Everyday events shall be: an official's death (a royal post with an official), a lord's death, a lord
  slighted at court (Loyal or Wavering), a lord speaking well of you (Wavering or Disloyal), two lords quarrelling,
  a lord hurt, a child born to the ruler (a ruler of an age to have children under a law of heirs by blood, with no
  regent), the heir falling ill (an heir under the age of a child ruler), and grain lost from a province's store
  (rot, fire, rats) where it holds at least `food.min_store_months` (3) months and `food.min_store` (2) thousand
  months of food. A lord in revolt or with no land is never drawn. Beside these come the events of EVT-133 to
  EVT-135, each listed with its options in `events-everyday.json` and on the wiki's Data-Events-Everyday page.
  [feedback 152; REALM-088, REALM-089]
- EVT-119 Every everyday event shall have two or three options, each with its effects shown in words, at least one
  costing nothing. [EVT-039; feedback 152]
- EVT-120 If an option costs more gold than the realm holds, or asks for a second lord the realm does not have,
  then the game shall not offer it. [EVT-041]
- EVT-121 The player's everyday events shall show on the event card with the realm's own story instead of a year
  in history, marked *In your realm*. [EVT-076]
- EVT-122 An official's death shall leave the post to a new man: the deputy, who starts at half the post's effect
  (PROV-192); a seasoned man sent for, for gold, who keeps the post's years and so its effect; or a lord's kinsman,
  who starts at half and makes that lord a step more loyal. [PROV-192; REALM-088 office at court]
- EVT-123 A lord's death shall pass his lands to his son, as loyal as his father; the crown may ask a fee (gold,
  the son a step less loyal, heavy taxes) or take the lands for the crown, making them royal land and every other
  lord of the realm a step less loyal (land seized from another). [PROV-200, PROV-201; REALM-089]
- EVT-124 A child born to a ruler with no heir shall be the heir. A feast costs gold and makes the two least loyal
  lords a step more loyal; promising the child to a lord's house makes him a step more loyal (marriage into the
  ruling house). [REALM-100 to REALM-107, REALM-088]
- EVT-125 A lord's loyalty shall move a step by the realm's causes (REALM-088, REALM-089): a gift of gold, his want
  granted, an office at court, marriage into the ruling house up; heavy taxes, land seized from him, grain
  requisitioned, and the new *slighted at court* down. [REALM-088, REALM-089]
- EVT-126 Grain lost from a store shall be gone when the event fires, whatever is chosen; buying grain (gold) or
  requisitioning it from the province's lord, else another lord (a step less loyal), makes half of it good.
  [feedback 152; PROV-104]
- EVT-127 If the player trusts the sick heir to prayer, then the heir shall die with the chance the option shows
  (3 in 10). [feedback 152]
- EVT-128 The everyday events' state (each realm's next draw, the player's waiting events, the count and the dice)
  shall be kept in the save; a save from before them starts the draws afresh. [EVT-075]

- EVT-130 When plague reaches a province of the player's (PROV-359), an everyday event shall ask what to do, unless
  one about plague already waits: *Close the province* (quarantine, PROV-357), *Send physicians and burn the sick
  houses* (gold; `plague.care_death_cut` (0.5) fewer die there and its outbreak lasts the shortest time, one season),
  or *Keep the roads open*. Plague fires it; it is never drawn and does not wait for EVT-117. @placeholder
  [feedback 152; PROV-240 to PROV-242]

**More everyday events, by region and era** (gaps review item 3, Leroy 19 Oct: "Both"). Twelve events would
repeat endlessly over a campaign of five centuries, so the pool grows to about fifty, many of them about one
province of the realm and many limited to a part of the world or a span of years.

- EVT-133 An everyday event may name the regions it comes to (`where`: regions or wider regions of
  `exploration-regions.json`, a realm's region being the event tree's, EVT-078) and the years it comes in (`from`,
  `to`); a realm draws only the events of its region and the current year. Besides those of EVT-118, the events are
  about one province of the realm (any, a coastal one, or the capital, never an occupied one; the options that ask a
  second lord ask its own lord, else the least loyal one), a landed lord and one of his provinces, or a living
  official at a royal post: a rich harvest, hail, bandits, a fallen bridge, a town fire, a flood, a scholar seeking a
  patron, a lord asking for a market or raising walls, an official skimming the tolls, old soldiers asking for land,
  wolves, a tutor for the heir, a comet, silver found, pilgrims; in Europe tournaments (to 1600), quarrelling guilds,
  a printer (1460 to 1600), witch trials (1560 to 1700), enclosure (1550 to 1850), coffee houses (1550 to 1800);
  anywhere railways (from 1830), strikes (from 1820), cholera (1817 to 1910) and a newspaper (from 1780); in the
  Middle East, North Africa and Central Asia raided caravans, failing water channels, locusts and endowments; in
  Africa gold traders, cattle raids and late rains; in South and Southeast Asia a failed monsoon, temple festivals and
  revenue surveys; in East Asia river dykes, cheating at the examinations, pirates and a tea master; spice ships,
  the ball game, maize blight, voyagers, horse fairs, hard winters and furs where they belong. @placeholder
  [gaps review item 3; feedback 152]
- EVT-134 The player's realm shall not draw the same everyday event again within `rest_years` (20) of the last
  time it came; if every event it could have is resting, it draws nothing that month. The plague card (EVT-130) is
  not drawn and so does not rest. When each event last came is kept in the save. The AI's events are never seen and do not rest. @placeholder [gaps review item 3]
- EVT-135 An event about a province may also, by the option chosen: add or take months of food in its store
  (`food`, months of eating for its people), add or take a share of its people (`people`, every class alike) or of
  its recruits (`recruits`, up to its ceiling), or lighten its tax for some years (`light_tax`, as a rising's light
  tax, REB). Each shows on the card in words ("Creuse: +2 months of food in store", "Creuse: 1 in 100 of its people
  lost", "Creuse: light tax for a year"). [EVT-119; PROV-104]

#### How the player uses it: everyday events
- EVT-129 Where: nothing new to find. An everyday event opens the same event card over the map and pauses the week
  (EVT-076): its title names who or where ("Death of Gilles de Chabannes", "Grain rots at Creuse"), *In your
  realm* in place of the history line, the story in one or two sentences, *Whatever you choose* for grain already
  lost, and each option as a 44-point button with its cost and effect in words ("You: gold −25", "Charles de
  Brézé: a step more loyal"). *Look at the map* folds the card into End turn and, for an event about a province,
  opens that province. Grouping: every event is one card; lords, officials, the heir and stores stay on their own
  cards, where the result shows (the lord's loyalty, the post's years, the heir on the General tab, the store on the
  Land tab). Overview: the News keeps a line for each, with what was chosen, and the realm's Lords list and
  Provinces list stay the overviews of loyalty and food. Phone: the card is the sheet it already is, in the Wide
  and Tall layouts, inside the safe areas, options in reach, nothing that needs hover. Rate: about three to five a
  year per realm, never stacking (EVT-117), and never the same one twice in 20 years (EVT-134). The new events are the same card, with nothing new to learn; an event
  about a province opens that province from *Look at the map*, where its store, people and tax show on the Land tab.
  [X-19; EVT-076]

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
| selection.max_pool_events_per_country_year | Pacing cap | 3 (was 2; raised with the everyday events, feedback 152) | yes | data/balance.yaml |
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
| innovations_from_research | Tree innovation → research invention the bridge reads it from (EVT-083) | bombards W3, gunpowder_infantry W5, ocean_navigation S4, printing L5, humanist_learning L6 | no | events.json |
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
| goals.weights | A goal's pull by its weight word (EVT-102) | weak 0.5, normal 1, strong 2 | yes | events.json |
| goals.shake_low, goals.shake_high | The seed's shake of each goal's weight (EVT-101) | 0.5, 1.5 | yes | events.json |
| goals.deviate_share | Share of goals that deviate, by preset (EVT-101) | historical 0.10, plausible 0.25, divergent 0.50 | yes (plan-1378 §2 "provisional") | events.json |
| goals.preset_mult | Goal weight by preset (EVT-101) | historical 1.5, plausible 1, divergent 0.5 | yes | events.json |
| goals.lead_years, goals.lapse_years | How far before its window a goal pulls, and how long after (EVT-102) | 5, 10 | yes | events.json |
| goals.war_chance_per_pull | Extra chance of looking for a war per pull (EVT-105) | 1 | yes | events.json |
| goals.target_weight_per_pull | Weight of a neighbour as a war target per pull (EVT-105) | 4 | yes | events.json |
| goals.envoy_points_per_pull | Count points of an envoy toward a goal's target per pull (EVT-106) | 10 | yes | events.json |
| chronicle.on_course_years | Years from its history year a turning point is on course (EVT-110) | 10 | yes | events.json |
| chronicle.horizon_years | Years ahead and behind the Chronicle shows (EVT-111) | 25 | yes | events.json |

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

- Each realm weighs its historical goals (EVT-100 to EVT-106): a goal's pull raises how often it looks for a war,
  which neighbour it picks and which province it asks for, and the count of an envoy toward an ally or a subject it
  wants; it never lets a war past the price of war (WAR-228) nor an envoy past its count (DIPL-223).
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

- **D-EVT-19** Ages and periods from 1378 (Leroy, 18 Oct; plan-1378 §3.1; milestone 10, step 4): a new age, the
  Age of Schism and Conquerors, runs from the start to about 1460; Gunpowder Empires and Exploration start by
  their conditions inside wider windows, forced on in 1453 and 1445; the eight periods that started `initial` in
  1444 get a start in 1378 or a start condition, and eight new periods cover 1378 to 1444 (EVT-081, EVT-082).
  The conditions are written so that a campaign that still starts in 1444 has every one of its ages and periods
  under way as before: bombards among the great powers and Portugal's ocean ships hold at that start, and the
  periods whose windows closed before 1444 never start. The tree cannot see research or provinces, so the bridge
  shows it the inventions a realm knows as innovations (a new innovation, `bombards`, joins the tree's list) and
  the great powers by provinces held (EVT-083). Exploration's gate reads the tree's own age when the tree runs
  (EXPL-076). Conditions name only events the tree has; the bridge events of 1378 to 1444 will start and end
  the new periods when they are written (plan-1378 step 6).
- **D-EVT-22** Everyday events (feedback 152; integrator's picks under Leroy's rule of quick decisions, 19 Oct):
  kept apart from the event tree in their own file and engine module, because they act on what the tree cannot
  see (officials, lords, heirs, stores); they reuse the tree's card, News lines and AnswerEvent order. The rate
  (one every 3 to 6 months, none while one waits) is set below the 2 to 4 months of the research so play stays
  light, as Leroy asked; `months_between` tunes it. Effects use only what the game already has; one new loyalty
  cause, *slighted at court*, joins the down list. Province disease is its own mechanic (province PROV-240 to
  PROV-242) and comes in the next change. The deaths of officials and lords roll on their own for now; once the
  shared ageing and death of people lands (the "Death across all people" work), they fire from it instead.

- **D-EVT-21** The East's bridge events (milestone 10, step 6; integrator's picks, 19 Oct): 46 new events and 7
  re-dated ones (EVT-090 to EVT-093). Realms go by tree ids, places by 1444 province ids in the file's own
  `places`. The Horde union of east.md is Tokhtamysh's event: the Golden Horde absorbs the White Horde and Arab
  Shah's Horde and keeps the id `golden_horde` (map `great_horde`). The Livonian and Prussian confederations and
  Giskra's Upper Hungary come as events, not sleeping realms (decisions.md 5); Kazan, Crimea, the Uzbeks, Adal and
  Galich wake by `create_country`. Ankara starts the Ottoman Interregnum and Mehmed I ends it; Timur's death ends
  his conquests and opens the Timurid fragmentation (EVT-081). The Crusade of Varna keeps its id and opens in
  1425, with the Long Campaign as its forerunner. Mamluk events are written from general scholarship (no
  research file covers them), with confidence in each event's history block. Kalmar and Engelbrekt are the
  West's; Timur in India is the South's `sack_of_delhi`.

- **D-EVT-20** Bridge events of the West (plan-1378 §5; milestone 10, step 6; quick calls by the integrator under
  Leroy's rule of quick decisions): each region keeps its own bridge file, joined to the campaign at load, so the
  regions are written side by side (EVT-085). A bridge event before the start counts as history rather than being
  dropped, so re-dated 1444 events can need one and still run from 1444 (EVT-087). The tree is shown the ruler's
  age and years, the regency and the Emperor, so deaths, regencies and imperial politics are read from the game's
  own rulers and Empire instead of from dates (EVT-086); a faith is seeded once, as the tree's `religion` effect
  lands nowhere else yet. Choices: the Schism obedience is a flag on each realm, asked once per Catholic realm,
  France first; the Visconti state after 1385 is whoever holds Milan's province (the role binds by `owns`), so the
  realm Gian Galeazzo's coup leaves standing carries the later events; Ceuta (a port below map size) changes no
  land; Madeira's settlement sets `atlantic_island_bases`, which already starts the Age of Exploration; the age of
  Schism keeps 1449 as Basel's end. Tests run the events on today's map set back to 1378 until the 1378 map is
  joined. Provisional. Effects stay small (prestige, legitimacy, a share of the treasury) where the game cannot
  yet land the real thing.
- **D-EVT-23** Bridge events for Asia, Africa and the Americas (milestone 10, step 6; 19 Oct 2026): the region
  files share one shape (the campaign's events, names, entities and places as lists of map provinces) and one
  loader, and a bridge event that has an id of the campaign replaces it, so a 1444 floor gives way to its reason.
  At the start the events whose history began earlier count as fought as in history, which keeps a 1444 start
  playing as before. Effects use only the tree's existing modifiers; realms the game does not know yet are named
  in `entities` and bind once they exist. Starting statistics for 1378 are not yet set, so the stability,
  legitimacy and army thresholds in the triggers are provisional.

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
| EVT-081 | ages-and-periods.feature | The periods under way at the 1378 start; Timur's death opens the Timurid fragmentation; the Lancastrian phase; the Ottoman Interregnum; from a 1444 start the periods that closed before it never start |
| EVT-082 | ages-and-periods.feature | Forced dates; bombards among three great powers; two are not enough; the fall of Constantinople; Portugal's ocean ships; Exploration's window. Engine: packages/engine/test/events.test.ts |
| EVT-083 | — | Engine: packages/engine/test/events.test.ts (without bombards or ocean ships the two ages wait) |
| EVT-084 | — | Presentation: nothing new on screen |
| EVT-085 – 089 | bridge-west.feature | A 1444 campaign already has the West's history; a 1378 campaign has none yet; France declares for Clement, then the realms choose; the tree sees a regent and the Emperor; Troyes gives Paris to England; the end of the Hundred Years' War needs the Lancastrian conquest. Engine: packages/engine/test/bridgeWest.test.ts (build checks, places and modifiers, the uncles' regency on the player's card, rebels as sparks) |
| EVT-090 – 093 | bridge-east.feature | The East's bridge events and turning points; build checks, tree ids and places; the re-dated campaign events; the Crusade of Varna waits for a war on the Ottoman border |
| EVT-094 | bridge-east.feature | Every East event reads on the card: name, summary, two or three options, one historical |
| EVT-095 | bridge-south.feature | The southern events are well formed and never forced; from 1444 the earlier ones have happened as in history |
| EVT-096 | bridge-south.feature | The Inca expand after beating the Chanka; a fled court does not; the 1444 floors give way to their reasons |
| EVT-097 | bridge-south.feature | Malacca is founded only after Singapura falls |
| EVT-098 | bridge-south.feature | The Triple Alliance forms after Maxtla's usurpation |
| EVT-099 | — | Presentation: the event card, nothing new on screen |
| EVT-100 – 108 | historical-goals.feature | A goal ends with its reason; the seed shakes the goals; a goal's pull fades after its window; a goal draws the AI's war but not past its price; an ally goal sends an envoy; the player is never steered. Engine: packages/engine/test/goals.test.ts; data: packages/rules/test/goals-1378.test.ts |
| EVT-109 – 111 | chronicle.feature | A turning point happened as in history; late; bent when its goals are gone; gone when invalidated. Engine: packages/engine/test/goals.test.ts |
| EVT-112 – 114 | — | Presentation: apps/client/src/ui/chronicle.ts, the History tab and the Aims fold; apps/client/scripts/chronicle-shots.mjs |
| EVT-115 – 128 | everyday.feature | A choice every few months; none while one waits; an official's death; an option the realm cannot pay; spoiled grain; a lord's death; a child born heirless. Engine: packages/engine/test/everyday.test.ts |
| EVT-129 | — | Presentation: apps/client/src/ui/events.ts, the event card |
| EVT-130 | — | Engine: packages/engine/test/everyday.test.ts (plague reaching the player's land opens one card) |
| EVT-133 – 135 | everyday.feature | Events of the realm's region and era; never the same within 20 years. Engine: packages/engine/test/everyday.test.ts (about fifty events, each with a free option and known regions; region and era; no repeat in 20 years through a save; a rich harvest fills the store and hail lightens the tax) |
