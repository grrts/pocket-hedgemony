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
- Balance values: selection pacing, follow-up boosts, alternate-history presets, AI factors, rebel sizes and
  thresholds, coverage thresholds.
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
- Faith waves and faith policy: **religion**. Tongues and nationalism: **culture**. Heritage: **national-strengths**.
- How an event card looks and how unanswered events block End turn: **game-shell**. Music tags: **audio**.
- Tutorial-only scripted events: **onboarding**.
- Where events run in the monthly turn: **time-and-turns**.

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
| Effect tier | immediate, delayed, ongoing, long_term (and, if adopted, rising_won, rising_crushed). | |
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
- EVT-002 The game shall treat as out of scope the Second World War events and every event whose history
  starts after 31 August 1939 (59 in the current data: world_war_ii, holocaust, bengal_famine_1943,
  atomic_bombings and the events of cold_war_to_present, decolonization_1945_1994 and the post-1939 events of
  coverage_gaps), and shall not fire them. [gap-lists decisions; event data]
- EVT-003 The game shall treat the ages Age of Decolonization, Cold War and Age of Globalization as out of
  scope and shall not start them. [gap-lists decisions]

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
- EVT-019 The game shall bind the date by mode: `mandatory` fires in the window if the trigger holds;
  `approximate` is weighted toward the historical date; `reference` uses the date only as a guide.
  [README trigger model]
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
  age_active, flag, any_country, all_countries, count_countries, is_human) with logic all, any, not, at_least.
  [vocabulary.yaml]
- EVT-026 The game shall resolve targets as `$role`, an entity id, `province:<id>`, `area:<id>`,
  `region:<id>`, `global`, or `this` inside any_country, all_countries and count_countries. [vocabulary.yaml]
- EVT-027 The game shall use `is_human` only in selection weights, never in eligibility. [vocabulary.yaml]
- EVT-028 The game shall evaluate the `event` condition as "the event has occurred", optionally with a given
  option outcome, within n years, with a role bound to who. [vocabulary.yaml]

### 5.6 Selection and pacing

- EVT-029 When an `immediate` event becomes eligible, the game shall fire it. [README]
- EVT-030 Each `pool_roll_interval_months` (1), the game shall roll each eligible pool event against its
  `mean_years`, multiplied by its selection modifiers and follow-up boosts. [README; balance.yaml]
- EVT-031 When a `decision` event becomes eligible, the game shall offer it to the chooser (player or AI).
  [README]
- EVT-032 If a decision is left unanswered for `decision_expiry_years` (10), then it lapses and re-enters the
  pool if still eligible. [balance.yaml] (see OQ-EVT-8)
- EVT-033 The game shall fire at most `max_pool_events_per_country_year` (2) pool events per country per year.
  [balance.yaml]
- EVT-034 When an event fires, the game shall boost each follow-up's weight by its `boost` during its `delay`
  window, cap any boost at `max_boost` (5.0), fade it linearly over `boost_decay_years` (10) after the window
  closes, and never let a boost bypass a trigger. [README; balance.yaml]
- EVT-035 Where the alternate history game rule is set, the game shall apply its preset: historical (follow-up
  boost ×1.5, historical option ×2.0, mean_years ×0.8), plausible (×1.0, ×1.0, ×1.0) or divergent (×0.6,
  ×0.5, ×1.3). [balance.yaml; README principle 1]
- EVT-036 Where the "historical lean" game rule is on, the game shall multiply historical options' AI weight
  by 1.25. [balance.yaml]

### 5.7 Execution

- EVT-037 While an event with a duration runs, the game shall keep it running for `duration_years`, apply its
  `ongoing` effects, end it if `maintain` stops holding, and abort it if `cancel_if` holds. [README; schema]
- EVT-038 The game shall let `event_active` test whether a process or duration event is running.
  [vocabulary.yaml]

### 5.8 Options and choice

- EVT-039 The game shall give every event two or more options (two or three in the design), exactly one marked
  historical, with unique ids. [README; balance validation_checks]
- EVT-040 When an option has a chooser, the game shall let that role's controller, player or AI, pick; when it
  has none, the game shall pick by a weighted roll. [README; schema Option]
- EVT-041 If an option's `allowed` condition is false, then the game shall hide the option. [vocabulary
  option_fields]
- EVT-042 The game shall weight each option for the AI by its base weight times its named factors: at_war
  (country is at war), low_treasury (treasury below one year of expenses), high_unrest (average unrest above
  50), same_religion (other party shares state religion), rival (other party is a rival), great_power
  (top 8 by great_power_score), threatened (a hostile neighbour has more than 1.5× army_strength).
  [balance.yaml ai_factors; schema]
- EVT-043 The game shall add an option's effects to the event-level effects. [vocabulary option_fields]
- EVT-044 When an event is offered to the player, the game shall wait for the player's answer; nothing answers
  an event for the player. [screen-flow §4.6] (see OQ-EVT-8)

### 5.9 Effects

- EVT-045 The game shall apply effects by tier: `immediate`; `delayed` after n years (or a range); `ongoing`
  while the event runs; `long_term` as permanent structural change. [README; schema Effects]
- EVT-046 The game shall apply only effect types declared in the vocabulary: modifier, stat, transfer,
  create_country, annex, vassalize, release, war, peace, casus_belli, relation, rebels, spread, population,
  move_population, set_flag, start_period, end_period, unlock, government, religion, trade_route, colony.
  [vocabulary.yaml]
- EVT-047 The game shall apply a `stat` change as a one-off delta, `+n` / `-n` or `+n%` / `-n%`. [vocabulary.yaml]
- EVT-048 The game shall size `rebels` as small 0.5, medium 1.0, large 2.0, huge 4.0 × the province's
  `manpower_yield`, and use `unrest_spawn` 60 and `unrest_guaranteed` 90. [balance.yaml] (see OQ-EVT-5)
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
- EVT-056 The game shall land each event-tree statistic on the concrete stats of the owning designs (province
  stats 15, country stats 11, trade 12, government 5, diplomacy 11). [province stats §15; country stats §11;
  trade §12; government §5; diplomacy §11]

### 5.12 Flags and reference tables

- EVT-057 The game shall let triggers read only flags that some effect sets or that are declared system flags,
  set by the engine or the scenario (ruler_died, succession_crisis, succession_dispute, regency,
  female_succession, ruler_led_campaign, atlantic_island_bases, potato_blight, commercial_crisis and the
  world-state flags of enums.yaml). [enums.yaml system_flags; validation]
- EVT-058 The game shall read religions, governments, innovations, ideologies, culture groups, rebel types,
  relation types, period kinds and entity kinds from closed lists in enums; adding a value needs no engine
  change. [enums.yaml]
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

## 6. Commands

| Command | Who issues it | Preconditions | Result | Events emitted |
|---|---|---|---|---|
| AnswerEvent(event instance, option) | player / AI (the chooser) | Event fired or offered; option allowed | Option effects plus event effects applied | OptionChosen, EffectsApplied |
| FireEvent(event, bound roles) | system | Eligible and selected | Event fires | EventFired |
| SetAlternateHistoryMode(mode) | player (new game options) | At game setup | Preset multipliers used | (none) |

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
| DecisionLapsed | 10 years unanswered | event | AI |

## 8. Policies (reactions to other contexts)

- When any statistic, ownership, war, relation, flag or rising changes (all contexts), then the next
  eligibility check reads the new state.
- When a tagged revolution rising ends (rebellions), then apply the option's `rising_won` or `rising_crushed`
  tier (revolutions; pending merge, OQ-EVT-11).
- When the campaign end date arrives (time-and-turns), then fire the wrap-up event or events (game-shell;
  not yet designed, OQ-EVT-2).

## 9. Monthly turn

Reads first: every statistic and flag the triggers name, after the other systems' monthly steps.

1. Each year (first month of the year): evaluate age and period start and end conditions inside windows; apply
   forced dates.
2. Each month: evaluate eligibility (availability, requires, trigger, invalidation) and bind roles.
3. Fire immediate events; roll pool events (`pool_roll_interval_months` 1) under the pacing cap; offer
   decisions.
4. Queue fired events for the player in date order; AI choosers answer at once.
5. Apply chosen options' and events' immediate effects; schedule delayed effects; tick ongoing effects,
   durations, `maintain` and `cancel_if`; tick modifiers' decay and expiry; fade follow-up boosts.

Gap list item 20 places events last in the turn; screen-flow shows G7 Events after battles. The global order
belongs to time-and-turns.

## 10. Configuration

| Key | Meaning | Value in the design | Placeholder? | Config file |
|---|---|---|---|---|
| selection.pool_roll_interval_months | How often pool events roll | 1 | yes | data/balance.yaml |
| selection.max_pool_events_per_country_year | Pacing cap | 2 | yes | data/balance.yaml |
| selection.decision_expiry_years | Unanswered decision lapses | 10 | yes | data/balance.yaml |
| selection.historical_weight_bonus | "Historical lean" rule | 1.25 | yes | data/balance.yaml |
| selection.alternate_history_mode.historical | follow_up_boost_mult, historical_option_mult, mean_years_mult | 1.5, 2.0, 0.8 | yes | data/balance.yaml |
| selection.alternate_history_mode.plausible | same | 1.0, 1.0, 1.0 | yes | data/balance.yaml |
| selection.alternate_history_mode.divergent | same | 0.6, 0.5, 1.3 | yes | data/balance.yaml |
| follow_ups.max_boost | Boost cap | 5.0 | yes | data/balance.yaml |
| follow_ups.boost_decay_years | Linear fade after the window | 10 | yes | data/balance.yaml |
| ai_factors | Named AI factors | 7 factors (EVT-042) | yes | data/balance.yaml |
| rebel_sizes | × manpower_yield | small 0.5, medium 1.0, large 2.0, huge 4.0 | yes | data/balance.yaml |
| rebel_thresholds | Unrest spawn and guaranteed | 60, 90 | yes | data/balance.yaml |
| modifier_rules.default_stacking | Default stacking | refresh | yes | data/balance.yaml |
| modifier_rules.max_stacks | Stack cap | 3 | yes | data/balance.yaml |
| modifier_rules.exponential_half_life_share | Exponential decay | 0.5 | yes | data/balance.yaml |
| coverage.min_events_per_region_age | Coverage threshold | 2 | yes | data/balance.yaml |
| coverage.min_agency_share | Agency threshold | 0.35 | yes | data/balance.yaml |
| statistics `k_*` coefficients | Formula coefficients | not given | yes | data/balance.yaml (named in statistics.yaml) |
| campaign end date | Last day of the campaign | 31 August 1939 | no (a setting) | settings |
| per event `selection.mean_years`, `modifiers`, option `ai.base` | Per-event balance | per event | yes | data/events/*.yaml |
| per modifier `changes`, `years` | Per-modifier magnitudes | per modifier | yes (design values) | data/modifiers.yaml |

## 11. Seams

| Other context | Direction | Pattern | What crosses |
|---|---|---|---|
| province | downstream | Customer–Supplier | Province stats mapping (§15): population, prosperity → buildings, devastation → burned tiles, unrest → grievances, control, fort_level, infrastructure, industry, trade_access, food_security, disease_burden, culture and religion shares, colonial_status; geography anchors → fixed places |
| realm | downstream | Customer–Supplier | Country stats mapping (§11): legitimacy, stability, war_weariness, prestige, admin_capacity, tech and innovations, literacy, debt, treasury, army and navy; engine flags (ruler_died, regency …) |
| research | downstream | Customer–Supplier | The 20 innovations are research-tree inventions with the same ids; `tech` tracks |
| trade | downstream | Customer–Supplier | trade_power, trade_access, world_trade_index, trade_index, trade_presence, trade_route, hubs as labels |
| government | downstream | Customer–Supplier | 16 `government` values mapped to forms; admin_capacity → officials cap |
| rebellions | downstream | Customer–Supplier | `rebels` effect, `rebels_active`, `unrest`, `separatism_risk`; events as sparks (OQ-EVT-5) |
| revolutions | downstream (they extend this) | Customer–Supplier | Proposed: conditions grievance, class_share, lords, war_lost; effects regime, lock; param rebels.revolution; tiers rising_won, rising_crushed; event field revolution with rearm (one_time may fire again); flags revolutionary_regime, emigre_court, reaction_regime, revolution_funded; areas hokuriku, old_castile; entities ikko_ikki_kaga, comuneros, tay_son, donghak_movement, russian_opposition_1905, iranian_constitutionalists; 7 unverified sources; 26 extended and 10 new events; build.py EFFECT_TIERS (not merged) |
| religion | downstream (they extend this) | Customer–Supplier | Proposed: religions hussite, jain, asian_traditional; conditions faith_policy, holds_holy_place, faith_wave_active; effects faith_wave, faith_policy, preachers; entities tumed, gelug_order, old_believers, gowa_tallo, merina_kingdom; 7 modifiers; 8 unverified sources; 10 new events; faith_wave patches on protestant_reformation, council_of_trent, safavid_rise, sikh_panth_founded, futa_jallon_jihad, sokoto_jihad; flags religious_persecution_active, missionary_persecution, inquisition_established set by religion (not merged) |
| culture | downstream (they extend this) | Customer–Supplier | Proposed: culture groups celtic, baltic, caucasian, hebrew; effects tongue_spread, set_court_tongue, merge_tongues, move_people; conditions court_tongue, tongue_share, kin_of, cousin_of, stranger_to; engine-raised events "the court goes native" and "new tongues abroad"; culture effects on listed events; nationalism read from ideology_support |
| subjects | downstream (they extend this) | Customer–Supplier | vassalize, release, relation subject/overlord/personal_union, subject_count, create_country subject_of, doctrine_of_lapse; proposed subject_loyalty, add_subject_reason, remove_subject_reason, change_subject_kind |
| diplomacy | downstream (they extend this) | Customer–Supplier | opinion → ledger standing; trust and notoriety read-only; relation types to relation actions; proposed effects war_aim, league, pretender |
| national-strengths | downstream (they extend this) | Customer–Supplier | Ages for heydays; condition language; proposed effects grant_legacy, wake_heyday, stir_ambition, shed_burden and condition heritage; requested missing events, areas, hubs and sea ids |
| buildings | downstream (they extend this) | Customer–Supplier | Proposed effects add_building, remove_building, damage_buildings, building_step and condition has_building; landmarks founded by events |
| exploration | downstream | Customer–Supplier | `age_of_exploration` gates exploration per region; colonial_presence |
| warfare | downstream | Customer–Supplier | war, peace, casus_belli; prestige from victories |
| game-shell | downstream | Published Language | Event modal, queue in date order, unanswered events block End turn, historical or free events option, wrap-up |
| audio | downstream | Published Language | `music:` tags |
| achievements | downstream | Published Language | `event_role`, historical vs non-historical choices, narrative_only excluded |
| onboarding | downstream | Customer–Supplier | `tutorial_only` scripted events in event format; requested Varna crusade and abdication events |
| time-and-turns | upstream | Conformist | Monthly and yearly ticks; events last in the turn |
| settings | upstream | Customer–Supplier | Campaign end date; alternate history mode |

## 12. AI

- The AI picks among options by base weight times named factors (EVT-042); under the game rules, historical
  options are multiplied by the preset's `historical_option_mult` and, with "historical lean", by 1.25.
- Options with no chooser are rolled by these same weights.
- The AI reads the same counts as the player (country stats 11).
- Revolutions add their own weights (revolutions context).

## 13. Open questions and contradictions

- OQ-EVT-1: The data still holds 59 events after 31 August 1939 and the Decolonization (window from 1919, start
  conditions that include `world_war_ii` and Indian independence), Cold War and Globalization ages; the World
  Wars age ends on `world_war_ii` or after 1940; Imperialism and Industrialization force-end in 1945 and 1950.
  Gap list 24 asks to mark these out of scope; it is not done. How are they cut: deleted, flagged, or ignored by
  the engine? Can an in-scope age's end condition that names an out-of-scope event ever be met?
- OQ-EVT-2: Interwar coverage is thin: 10 events start 1918–1939 (wilsonian_moment, armistice_1918,
  influenza_pandemic_1918, treaty_of_versailles, may_fourth_movement, soviet_union_founded, treaty_of_lausanne,
  great_depression, italian_invasion_of_ethiopia, second_sino_japanese_war); the century table counts the 1900s
  together; Caribbean, Mesoamerica and the steppe are thin in some ages; there is no end-of-campaign wrap-up
  event (gap list 24, screen-flow). Not designed.
- OQ-EVT-3: The validator's anachronisms (Johor 1511, Hyderabad, Bengal and Awadh 1707, Tahiti 1768,
  Dutch Republic 1799, Boer republics 1835, Poland 1917, two mandates 1919) are kept as warnings; gap list 24
  asks to fix them.
- OQ-EVT-4: The tree's statistics (prosperity, unrest, devastation, control, legitimacy, integration_strain …)
  are abstractions the province and country designs replace by concrete counts through a "rename pass"; the
  pass has not been done in the event data. `integration_strain` and `legitimacy` (partly) have no mapping;
  trade 12 uses `trade_index`, which is not in statistics.yaml.
- OQ-EVT-5: `rebels` (type, size × manpower_yield), `rebel_thresholds` (unrest 60 / 90), `rebels_active` and
  the `high_unrest` AI factor (average unrest above 50) assume an unrest meter, while province stats 12.1 says
  "there is no anger meter" and rebellions works from grievances and 8 causes. No mapping from rebel types and
  sizes to causes and men. Also `rebels_active`'s type list omits `anticolonial`, which enums' rebel_types has.
- OQ-EVT-6: Schema and data disagree: data puts `duration_years`, `cooldown_years`, `max_occurrences`,
  `maintain` and `cancel_if` under `execution`, the schema puts duration, maintain and cancel at top level and
  cooldown in `availability` and has no `max_occurrences`; data writes delayed effects as `{after_years, <effect>,
  if}`, the schema as `{years, effects}`; data writes AI factors as `{if, factor}`, the schema as
  `{factor: <balance id>, mult}`; data uses the shorthand `{event: <id>}`; the localization runtime is flat keys
  (`event.<id>.name`, 1,419 keys), the schema an object per id. Which is the contract?
- OQ-EVT-7: How many options: the README says two or three, the validator 2 or more, revolutions allow up to
  four, and `printing_press_spreads` has one (a warning).
- OQ-EVT-8: Balance lets an unanswered decision lapse after 10 years and re-enter the pool; screen-flow (16 Oct)
  says unanswered events block End turn and nothing ever answers an event for the player. Does lapsing apply
  only to AI-held decisions?
- OQ-EVT-9: Game rules: balance has three alternate history presets plus a "historical lean" rule; screen-flow
  new-game options offer "historical or free events". How do the two map?
- OQ-EVT-10: `is_human` changes selection weights for human players. Does this break the multiplayer-friendly
  rule "no player-only shortcuts" (gap list 4)?
- OQ-EVT-11: None of the sibling additions is merged (religion, revolutions, culture, subjects, diplomacy,
  national strengths, buildings, tutorial). The event tree has no owner decision on them; the effect tiers
  `rising_won` / `rising_crushed`, the `revolution` field and `rearm` (which lets a one_time event fire again)
  need schema and build changes.
- OQ-EVT-12: Culture says the event tree has 38 culture groups (42 with its four additions); enums.yaml lists 39.
- OQ-EVT-13: Post-1939 values remain in closed lists: innovations computing, green_revolution_agriculture,
  internet; ideologies non_alignment, environmentalism, neoliberalism; global `co2_concentration` drives
  climate "after ~1950". Country stats says the research tree holds all 20 event-tree innovations, while Era
  VIII is dropped. Are these values removed?
- OQ-EVT-14: Diplomacy asks for `trust` and `notoriety` to be derived (read-only); statistics.yaml has
  `notoriety` stored and `trust` stored pairwise.
- OQ-EVT-15: When in the month do age and period checks run ("yearly")? Ages are checked yearly; periods do not
  say. The turn order is open (gap list 20).
- OQ-EVT-16: Religion moves three world-state flags (religious_persecution_active, missionary_persecution,
  inquisition_established) from "engine" to religion's own rules; enums.yaml still says `set_by: engine`.

## 14. Traceability

| Requirement | Feature file | Scenario |
|---|---|---|
| EVT-001 – 003 | campaign-scope.feature | End date; out-of-scope events and ages |
| EVT-004 – 010 | principles.feature | History reference; roles; agency; harm; enslavement; own terms |
| EVT-011 – 017 | ages-and-periods.feature | Age windows, forced dates; periods |
| EVT-018 – 028 | eligibility.feature | Availability, mode, repeat, requires, exclusive, invalidation, trigger |
| EVT-029 – 036 | selection.feature | Immediate, pool, decision, pacing, follow-ups, presets |
| EVT-037 – 038 | effects.feature | Duration, maintain, cancel |
| EVT-039 – 044 | options.feature | Options, chooser, allowed, AI factors, player answer |
| EVT-045 – 050 | effects.feature | Effect tiers and types; rebels sizes; new types |
| EVT-051 – 053 | modifiers.feature | Decay, stacking, scopes |
| EVT-054 – 056 | statistics.feature | Stored vs derived; mapping |
| EVT-057 – 059 | data-validation.feature | Flags, enums, entities |
| EVT-060 – 065 | data-validation.feature | Layers, localization, checks, coverage |
| EVT-066 – 067 | principles.feature | Music tags, tutorial-only events |
