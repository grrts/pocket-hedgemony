# National strengths (HER)

## 1. Purpose and scope

Every playable country gets a **heritage**: what it is good at because of where and what it is (birthright), what it
becomes good at when its moment in history arrives (heydays), what it secretly wants (ambitions), what it achieved
(legacies) and what holds it back (burden). Heritage is small on purpose: at most five rows on a card, each line
changing something countable in another context. This context decides the parts, their life cycles, the levers they may
pull, the conditions they use, the budgets that keep them fair, who gets which heritage, and what happens to heritage
when countries change hands. It is Pocket Hegemony's own system (1444 to 31 August 1939).

**In scope**
- The heritage card and its five parts; birthright needs and dormancy; heyday waking, sleeping, ending and marks;
  hidden ambitions (draw, seal, stir, warmth, done, lost, counsel, envoy reading, age ambitions, settings); legacies
  and their cap; burdens and shedding.
- The lever catalogue (`config/levers.json`): units, groups, costs, scope costs, provisional levers.
- The heritage condition types and how heritage reads the event tree's condition language.
- Budgets, size bonus, tolerance and the build-time validation.
- Who gets hand-written, generated or no heritage; archetype generation.
- Inheritance on annexation, subjects, releases and formed countries.
- The four event effects and one condition heritage proposes to the event tree.
- Heritage on the phone (card row, sheet, seal moments, map shimmer, nation picker).

**Not in scope (owned by …)**
- The rules each lever changes (tax, harvests, officials, battles, ships, traders, buildings …): the owning contexts.
- Ages and their start and end conditions, the condition language, event selection: **events**.
- Catalogue data (assessments, rivals, places, personality): **scenario-setup**.
- How envoys are stationed: **diplomacy**. Accepted cultures: **culture**. Map province ids for places: **world-map**.
- Building variants' rules (offered by buildings §9.2): **buildings**; heritage only unlocks a variant through
  `building_unlock` (D-HER-7).

## 2. Sources

Newest decision first.
1. `national-strengths/national-strengths-design.md` §13 "Decided (16 October)": ambitions hidden with a hint and never
   fully revealed while open (Leroy); a country keeps 5 legacies; burdens can't be bought off, shed only by their
   condition or a reform event.
2. `national-strengths-design.md` version 1, §1–§12, §14.
3. `config/heritage-rules.json` (budgets, caps, timings, counsel, envoy, AI weight).
4. `config/levers.json` (64 levers, units, scope costs).
5. `README.md`, `requests-to-other-designs.md`, `data/example-portugal.json`, `build/report.md`.
6. `domain/DECISIONS.md` (17 October): X-6 trade v2's heritage levers, X-2 the order of a turn.
7. Read for contradictions: `data/authored/west_europe_italy.json` (Portugal), `trade/trade-design.md` v2,
   `buildings/buildings-design.md` §9.2.

## 3. Ubiquitous language

| Term | Meaning | Not to be confused with |
|---|---|---|
| Heritage | A country's birthright, heydays, ambitions, legacies and burden | National ideas (not used) |
| Birthright | The one always-on strength from who the country is; may name a *needs* condition | Legacy |
| Dormant | A birthright whose needs fail: greyed, no effect, wakes when needs hold | Lost |
| Heyday | A strength tied to one event-tree age, active while the age is active and its *wakes* holds | Age |
| Awake / asleep | A heyday's active / inactive state within its age | Ended |
| Mark | The permanent legacy a heyday leaves if it was awake 25 years in total, worth a third of it | Legacy from an ambition |
| Ambition | A hidden goal drawn from the country's pool | Mission |
| Pool | 4 to 7 ambitions per country, plus age ambitions that join when their age begins | Active ambitions (3) |
| Sealed | An ambition showing only a theme icon and a riddle hint | Stirred |
| Stirred | An ambition whose stir condition held: shows warmth, promised legacy name, deadline; words stay a hint | Done |
| Hint | The one-line riddle shown for an open ambition | Plain goal |
| Plain goal | The ambition's real goal text, shown only once done or lost | Hint |
| Warmth | Share of the goal's leaf conditions that hold, shown as cold, warm or hot | Progress bar |
| Counsel | Paying gold (by era), once every 10 years, to stir one ambition at once | Envoy reading |
| Legacy | A permanent strength: an ambition's reward, a heyday's mark, or a turned burden | Birthright |
| Great legacy | A legacy with a bigger budget, for the hardest goals | — |
| Burden | A historical weakness with negative points and a shed condition | Grievance |
| Shed / turned | A burden removed when its shed condition holds; its turned legacy is granted | Bought off (not allowed) |
| Lever | One named effect from levers.json that changes one rule of another context by a value | Modifier |
| Provisional lever | A lever whose rule belongs to a design still being written; may be renamed by its owner | — |
| Point | Budget unit, about a tenth more of something central for the whole realm | — |
| Size class | Mean of six catalogue assessments on 1 (very low) to 5 (very high) | Country tier |
| Archetype | One of 27 templates that generate heritage from catalogue fields | Authored heritage |
| Tier A | The 58 major playable countries and subjects with hand-written heritage | Tier B/C |
| Dormant claim | An annexed country's birthright held by the annexer until it wakes | Claim (diplomacy) |

## 4. Domain model

### Aggregates

**Heritage** (identity: country id)
- Holds: birthrights (1, up to 2 with an inherited one) with dormant flag; heydays (up to 3) with state (waiting,
  awake, asleep, ended) and years awake; pool of ambitions with state (in pool, sealed, stirred, done, lost) and
  warmth; up to 5 legacies; 0 or 1 burden with state (held, shed); dormant claims with years held.
- INV-HER-1: At most 5 rows on the card: birthright, heyday, ambitions, burden, legacies.
- INV-HER-2: At most 2 heydays awake at once.
- INV-HER-3: Exactly 3 ambitions active (sealed or stirred) while the pool allows; at least one of the first three drawn is tagged historical.
- INV-HER-4: An open ambition's plain goal is never shown.
- INV-HER-5: At most 5 legacies held.
- INV-HER-6: At most 1 burden; at most 2 birthrights.
- INV-HER-7: Every effect is a lever from levers.json.
- INV-HER-8: Each part's lever points are within its budget (plus size bonus) ± tolerance 0.6 at build time.

### Entities and value objects
- **Birthright**: id, name, text, why (history note), needs (condition), effects (levers).
- **Heyday**: id, name, age, text, why, wakes (condition), ends (condition, optional), effects, mark (name, text, effects; optional).
- **Ambition**: id, name, theme (land, sea, trade, faith, crown, learning, survival, wealth), hint, text (plain goal),
  historical (flag), window (years, optional deadline), stir, goal, fail (optional), age (optional), legacy.
- **Legacy**: id, name, great (flag), text, effects.
- **Burden**: id, name, text, effects (negative points), shed (condition), turned (legacy).
- **Effect**: lever key, value, lever params (`where`, `ware`, `arm`, `type`, `style`, `building`, `event`, `route_kind` …).

### Lever catalogue (summary of `config/levers.json`)
Units: `pct` (percent change relative to the base rule), `steps` (whole steps on a ladder the owning design defines),
`count` (whole things), `flag` (on/off rule switch or access). Each lever has a group, a unit, points per unit, params,
the owning design section, its meaning and whether higher or lower is better. 64 levers in 13 groups:

| Group | Levers | Examples of cost (points per unit) |
|---|---|---|
| treasury (6) | tax_reach_pct, trade_balance_pct, toll_gold_pct, loan_interest_pct, tribute_pct, loot_pct | tax_reach_pct 0.1 per % |
| economy (1) | ware_output_pct (all wares at triple cost) | 0.06 |
| food (5) | harvest_steps, herd_growth_pct, fish_pct, store_rot_pct, castle_reach_rings | harvest_steps 1.2 per step |
| people (3) | growth_pct, migrants_pct, class_slots_pct | growth_pct 0.1 |
| rule (12) | official_wage_pct, official_type_pct, official_years_to_full, official_capacity, lord_capacity, lord_loyalty_start_steps, lord_loyalty_shield, retinue_pct, grievance_shield, days_to_capital_pct, integration_years_pct, homeland_resistance_pct | grievance_shield 1.5 flag |
| army (13) | recruit_refill_pct, troop_cap_share, levy_free_months, break_point_pct, hits_pct, horses_pct, march_days_pct, forage_pct, siege_pct, garrison_pct, hired_company_cost_pct, commander_style, commander_skill | troop_cap_share 2.0 per point |
| navy (5) | ship_build_pct, crew_pct, ship_hits_pct, sea_days_pct, storm_loss_pct | storm_loss_pct 0.03 |
| trade (3) | trader_count, trader_gain_pct, traders_passing_pct (trade v2, X-6) | trader_count 1.0 |
| learning (5) | invention_cost_pct, scholar_output_pct, school_seats_pct, spread_discount_cap, invention_known | invention_known 1.5 flag |
| belief (2) | faith_shift_pct, tongue_shift_pct | 0.05 |
| abroad (4) | envoy_count, opinion_steps, oath_fade_pct, lands_taken_pct | envoy_count 1.2 |
| building (2) | building_cost_pct, building_unlock (buildings design) | building_unlock 1.5 flag |
| events (3) | event_weight, event_option, stat (lands through the events mapping, D-EVT-4) | stat: per heritage-rules `stat_points` |

Provisional (owner design still being written): tribute_pct, official_capacity, lord_capacity, ship_build_pct,
crew_pct, sea_days_pct, faith_shift_pct, tongue_shift_pct, envoy_count, opinion_steps. The trade levers follow trade v2
(X-6): `trade_balance_pct` and `traders_passing_pct` are a percentage on the trade ratio gain, `trader_gain_pct` a
percentage on each deposit, and `trader_count` extra traders at the start.

`where` values: realm, capital, coast, core, royal, lords, frontier, `terrain:<id>`, `culture:<group>`, `faith:<id>`,
`area:<id>`, `region:<id>`. Scope cost multipliers: realm 1.0; capital, coast, core, royal, lords, frontier, terrain,
culture, faith, region 0.5; area, place 0.25; a terrain param or sea param 0.5; factors multiply; never below 0.25.

`stat_points` (cost per unit of the `stat` lever): legitimacy 0.1, stability 1.0, prestige 1.0, notoriety 0.5,
admin_capacity 0.1, literacy 0.2, cohesion 0.1.

### Budget rules (`config/heritage-rules.json`)
| Part | Budget (points) |
|---|---|
| Birthright | 3.0 |
| Heyday | 3.0 |
| Legacy | 2.0 |
| Great legacy | 3.0 |
| Burden | −2.0 |
| Tolerance | ± 0.6 |

Size bonus (to birthright and heyday only), by size class: ≥ 4.5 → 0; ≥ 3.5 → +0.5; ≥ 2.5 → +1.0; ≥ 1.5 → +1.5;
below → +2.0. Size class = mean of `economic_strength`, `manpower_potential`, `military_capability`,
`naval_capability`, `diplomatic_influence`, `trade_access` (very_low 1 … very_high 5).

### Who gets what
| Group | Count | Heritage |
|---|---|---|
| Tier A playable countries and subjects | 58 | Hand-written (`data/authored/`, 6 regional files): birthright, 2–3 heydays, 5–7 ambitions, burden |
| Tier B and C playable countries and subjects | 434 | Generated by archetype |
| Decentralised polities | 214 | Generated with decentralised archetypes |
| Background, non-state actors, internal estates, collective institutions | 257 | None (not played) |
Build report: 706 countries with heritage (58 hand-written, 648 generated), 3,551 ambitions, 945 heydays, 706 burdens,
0 errors, 0 warnings, 273 place names to bind, every lever in use.

### Domain services
- **HeritageEvaluator**: evaluates needs, wakes, ends, stir, goal, fail, shed, claim conditions; warmth.
- **AmbitionDrawer**: draws 3 with one historical; redraws on done or lost; refuses goals true on day one; age entries.
- **HeritageGenerator** (`tools/build_heritage.py`, `tools/make_archetypes.py`, `tools/extract_vocab.py`): archetype
  scoring, template filling, merge of authored over generated, budget and id validation, report.

## 5. Requirements

### 5.1 The heritage card
- HER-001 The game shall show a country's heritage as five rows, never more: Birthright, Heyday, Ambitions, Burden, Legacies. [ns §1]
- HER-002 When the player taps a heritage row, the game shall show its full text, its history note and what it changes. [ns §1]
- HER-003 The heritage context shall make every heritage line change something countable or pointable in another context (gold, officials, lords, recruits, horses, ships, scholars, traders, buildings, grievances). [ns intro]
- HER-004 The heritage context shall copy no mechanic, name or value from Europa Universalis IV or another game. [ns intro]

### 5.2 Birthright
- HER-005 The heritage context shall give every country with heritage exactly one birthright of its own, active while its needs condition holds. [ns §2, §2.1; rules birthright.per_country]
- HER-006 While a birthright's needs condition fails, the heritage context shall make it dormant (shown greyed, no effect), and wake it when the condition holds again. [ns §2.1; rules dormant_if_condition_false]
- HER-007 The heritage context shall never delete a birthright because a war was lost. [ns §2.1]

### 5.3 Heydays
- HER-008 The heritage context shall tie each heyday to one age of the event tree (`ages.yaml`), with up to 3 heydays per country. [ns §2, §2.2; rules heydays.max_per_country]
- HER-009 When a heyday's age is active and its wakes condition holds, the heritage context shall wake it. [ns §2.2]
- HER-010 While a heyday's wakes condition fails during its age, the heritage context shall keep it asleep without losing years already served. [ns §2.2]
- HER-011 When a heyday's age ends or its ends condition holds, the heritage context shall end it for good. [ns §2.2]
- HER-012 When a heyday that was awake 25 years in total ends, the heritage context shall grant its mark as a permanent legacy worth a third of it (its mark block, or its first lever at a third of its value); a mark is a legacy and counts toward the 5-legacy cap. [ns §2.2; rules mark_after_years, mark_share; D-HER-14]
- HER-013 If a third heyday would wake while 2 are awake, then the heritage context shall ask the player which one sleeps. [ns §2.2; rules max_active]

### 5.4 Ambitions
- HER-014 The heritage context shall give each country a pool of 4 to 7 ambitions (at least 5 hand-written, at least 4 generated, at most 7 either way); age ambitions join on top and do not count. [ns §2; rules pool_min_*, pool_max; D-HER-10]
- HER-015 When a campaign starts, the heritage context shall draw 3 active ambitions from the pool, at least one tagged historical. [ns §2.3; rules active, guaranteed_historical]
- HER-016 While an ambition is open, the heritage context shall never show its plain goal. [ns §2.3, §13; rules never_revealed]
- HER-017 While an ambition is sealed, the game shall show only its theme icon (land, sea, trade, faith, crown, learning, survival, wealth) and its one-line riddle hint. [ns §2.3]
- HER-018 When an ambition's stir condition holds, the heritage context shall stir it: the hint stays the only words shown, and its warmth, the name of its promised legacy and its deadline (if any) are shown. [ns §2.3]
- HER-019 When an ambition's goal holds, the heritage context shall mark it done, grant its legacy, show its plain goal for the first time and draw a new ambition from the pool. [ns §2.3; rules redraw_on_complete_or_fail]
- HER-020 When an ambition's deadline passes or its fail condition holds, the heritage context shall mark it lost without penalty, show its plain goal as what might have been and draw a new one. [ns §2.3]
- HER-021 The heritage context shall compute warmth as the share of the goal's leaf conditions that hold, with a count leaf counting as partly met by how far it has come, and show it as cold (under a third), warm (from a third to under two thirds) or hot (two thirds or more). [ns §2.3; rules warmth_bands; D-HER-13]
- HER-022 If an ambition's goal is a single yes-or-no condition, then its warmth shall go from cold straight to done. [ns §2.3]
- HER-023 If a drawn ambition's goal already holds on the first day of the campaign, then the heritage context shall put it back and draw another. [ns §2.3]
- HER-024 When a country pays counsel (gold by era: 30, 50, 80, 120, 180, 260, 380 for eras I–VII), at most once every 10 years, the heritage context shall stir one ambition at once and show its warmth, keeping its words a hint. [ns §2.3; rules counsel]
- HER-025 When a country has kept a resident envoy (diplomacy) at a foreign court for 2 years, the heritage context shall show it the hint and warmth of one of that country's active ambitions, never its plain goal; the AI may do the same against the player. [ns §2.3; rules envoy_reveal_years; diplomacy residents; D-HER-11]
- HER-026 When an age begins, the heritage context shall add the pool entries that name that age to the pool. [ns §2.3; rules age_ambitions_join_pool_when_age_starts]
- HER-027 Where the setting "History mode" is "Historical only", the heritage context shall draw only ambitions tagged historical; the default is "Drawn"; no setting reveals ambitions. [ns §2.3; rules history_mode_setting]
- HER-028 The tutorial shall teach ambitions with one ambition whose hint is plain. [ns §2.3]

### 5.5 Legacies and burdens
- HER-029 The heritage context shall grant legacies three ways: an ambition's reward, a heyday's mark, or a turned burden; legacies are permanent. [ns §2.4]
- HER-030 If a country would earn a sixth legacy, then the heritage context shall ask which one to let go. [ns §2.4, §13; rules max_legacies]
- HER-031 The heritage context shall budget great legacies (rewards for the hardest goals) at 3 points instead of 2. [ns §2.4, §5]
- HER-032 The heritage context shall give a country 0 or 1 burden, with negative points and a shed condition. [ns §2, §2.5; rules burden.per_country_max]
- HER-033 When a burden's shed condition holds, the heritage context shall remove it and grant its turned legacy. [ns §2.5; rules turned_legacy]
- HER-034 The heritage context shall never let a burden be bought off; only its shed condition or a reform event sheds it. [ns §13]

### 5.6 Levers
- HER-035 The heritage context shall express every heritage effect as a lever from levers.json (64 levers) that names one rule in an owning context and changes it by a value: trade levers act on trade v2 (X-6), building levers on the buildings design's ids (a unique variant of buildings §9.2 is a `building_unlock`), and the `stat` lever on the events mapping. [ns §3; X-6; D-HER-2, D-HER-4 … D-HER-7]
- HER-036 The heritage context shall give each lever a unit (pct, steps, count, flag), points per unit, params, owner and a better direction. [levers.json]
- HER-037 Where a lever has a `where` param, the heritage context shall apply it only in that scope (realm, capital, coast, core, royal, lords, frontier, terrain, culture, faith, area, region). [ns §3; levers.json where_values]
- HER-038 Where a lever's owning design is still being written, the heritage context shall mark it provisional, and the owner may rename it or point it at its rule with only the key changing in heritage data. [ns §3, §10]
- HER-039 The heritage context shall have a strength pull usually one to three levers. [ns §3]

### 5.7 Conditions
- HER-040 The heritage context shall use the event tree's condition language unchanged, with `this` bound to the heritage's country. [ns §4]
- HER-041 The heritage context shall add the conditions `knows` (invention known), `holds_place` (owns the province holding a named place), `coastal` (owns a province with a harbour on the named sea or any sea), `count` (a counted country-card stat), `heritage` (an item in state awake, done, lost, shed or held) and `independent` (no overlord). [ns §4]
- HER-042 The heritage context shall read `relation {who: A, other: B, type: T}` as "A is the T of B". [ns §4]
- HER-043 The heritage context shall let `count` take `building:<id>` as its thing and a value relative to the campaign start ("start*2", "start+3"). [ns §4]
- HER-044 The heritage context shall bind each `holds_place` place name once to one map province: the land province nearest the scenario map's place of that name (a capital or a port). A name the map does not hold stays in `build/places-to-bind.md` and its condition is false until bound. [ns §4; report; D-HER-16]

### 5.8 Budgets
- HER-045 The heritage context shall budget each part: birthright 3, heyday 3, legacy 2, great legacy 3, burden −2 points, from each lever's points per unit. [ns §5; rules budget]
- HER-046 The heritage context shall add a size bonus to birthrights and heydays by size class: ≥ 4.5 none, ≥ 3.5 +0.5, ≥ 2.5 +1, ≥ 1.5 +1.5, below +2 (France, 4.2, gets +0.5). [ns §5; rules size_bonus; D-HER-3]
- HER-047 The heritage context shall compute size class as the mean of the catalogue's economic strength, manpower potential, military capability, naval capability, diplomatic influence and trade access on very low 1 to very high 5. [rules budget comment]
- HER-048 The heritage context shall multiply a scoped lever's cost by its scope factor (one `where` limit 0.5; one named area or place 0.25; a terrain or sea param 0.5), factors multiplying, never below 0.25. [ns §5; levers.json scope_cost]
- HER-049 The heritage context shall cost `ware_output_pct` without a named ware at triple, and the `stat` lever at the stat's `stat_points`. [levers.json; rules stat_points]
- HER-050 When heritage is built, the build shall total each part of every country and report any part outside its budget ± 0.6 in `build/report.md`. [ns §5, §12; rules tolerance]

### 5.9 Who gets what
- HER-051 The heritage context shall give the 58 tier A playable countries and subjects hand-written heritage (birthright, 2–3 heydays, 5–7 ambitions, burden). [ns §6]
- HER-052 The heritage context shall generate heritage for the 434 tier B and C playable countries and subjects and the 214 decentralised polities, and give none to the 257 background actors, non-state actors, estates and institutions. [ns §6]
- HER-053 The heritage context shall generate heritage from 27 archetypes, each with detection rules on catalogue fields, birthright, heyday and burden templates named in the country's own words, and ambition templates filled from the record. [ns §6.1]
- HER-054 The heritage context shall give a generated heyday the first of its allowed ages whose regions cover the country, and scale its percentages to the country's budget. [ns §6.1]
- HER-055 The heritage context shall fill generated ambitions from the catalogue: likely rivals (outlast), preferred partners (bind or ally), disputed territories and key locations (hold a place), possible future paths with event keys (historical path), trade routes (win a trade hub). [ns §6.1]
- HER-056 The heritage context shall let decentralised polities take only archetypes for societies without a crown (forest, hill, herding, steppe, desert, island, mountain, ocean, chiefdom, commune, raiders, segmentary). [ns §6.1]
- HER-057 The heritage context shall score every generated country against all archetypes: the best gives birthright and burden, the second best may add a heyday. [ns §6.1]
- HER-058 Where an authored file exists for a country, the heritage context shall let it override the generated parts it defines. [ns §6.1]

### 5.10 When countries change hands
- HER-059 When a country is annexed, the heritage context shall make its birthright a dormant claim of the annexer. [ns §7.1; rules inheritance]
- HER-060 When the annexer has owned the annexed capital and held a majority of its homeland provinces for 30 years, the heritage context shall wake the claim as a second birthright; there is no culture test, and a country holds at most 2 birthrights. [ns §7.1; rules inheritance; D-HER-1]
- HER-061 The heritage context shall let subjects keep their whole heritage, and never apply an overlord's legacies to its subjects. [ns §7.2]
- HER-062 When a country is released, the heritage context shall give it its catalogue heritage, or its archetype's generated heritage if it is not in the catalogue. [ns §7.2]
- HER-063 When a country is formed (a union or a new state by event), the heritage context shall keep the forming country's own birthright and legacies, add the formed country's own heritage if any (its birthright second), make any other birthright of the forming country a dormant claim again, and draw ambitions from both pools. [ns §7.2; D-HER-17]

### 5.11 Events
- HER-064 When an event applies `grant_legacy {on, id}`, the heritage context shall grant that legacy. [ns §8]
- HER-065 When an event applies `wake_heyday {on, id, years}`, the heritage context shall wake that heyday for those years even if its condition fails. [ns §8]
- HER-066 When an event applies `stir_ambition {on, id}`, the heritage context shall stir that ambition, keeping its words a hint. [ns §8]
- HER-067 When an event applies `shed_burden {on}`, the heritage context shall shed the country's burden. [ns §8]
- HER-068 The heritage context shall answer the `heritage` condition for events, and let the `event_weight` and `event_option` levers raise an event's weight or open an option for the country. [ns §8]

### 5.12 AI
- HER-069 The heritage context shall let the AI always see its own ambitions and treat them as goals with weight 1.5 next to its catalogue ai_personality priorities; an AI that completes one gets the legacy like a player. [ns §2.3; rules ai.ambition_goal_weight]
- HER-079 When a third heyday would wake or a sixth legacy is earned for an AI country, the heritage context shall put to sleep the heyday, or let go the legacy, with the fewest lever points; on a tie, the one held longest. [D-HER-12]

### 5.13 On the phone
- HER-070 The game shall add one Heritage row to the country card (birthright icon, awake heyday icon, three ambition seals, burden icon) that opens the Heritage sheet. [ns §9]
- HER-071 When a seal cracks, or warmth rises from warm to hot, the game shall show a small quiet animation and one line in the monthly digest. [ns §9]
- HER-072 While an ambition that names places or areas is hot, the map shall shimmer faintly over the region it concerns, without outlining or naming the target. [ns §9]
- HER-073 The nation picker shall show each country's birthright and burden, a count of sealed ambitions, and its heydays as the ages they belong to. [ns §9]
- HER-074 The heritage context shall give every country the same system in every tier; the free tier only limits which countries can be picked. [ns §9]

### How the player uses it
- HER-080 The game shall give every realm on the map the heritage of its matched catalogue record (scenario-setup D-SETUP-1): its birthright, heydays and burden; a realm with no heritage in the build says that none is recorded. Ambitions and legacies join when heritage is evaluated each turn (HER-078). [X-19; build/heritage-all.json; D-HER-18]
- HER-081 The realm card's General tab shall carry one Heritage line, the overview at a glance, naming the realm's birthright and its burden; tapping it opens the realm card's Heritage tab. The Heritage tab is offered for every realm, the player's own and others, before and during a campaign, so the realm picker shows it too (HER-073). [X-19; HER-070]
- HER-082 The Heritage tab shall hold everything about the realm's strengths in one place: the birthright, each heyday with its age, and the burden, each a row that opens on a tap to its full text and history note (HER-002); under them the realm's 1444 assessments from the catalogue in three groups (Strength, Government, Dangers) as five-step bars with the level in words, marked uncertain where the catalogue's confidence is low. [X-19; scenario-setup SETUP-009]
- HER-083 The Heritage tab shall work on a phone in landscape: 44-point rows in one column in the Tall layout, the assessment groups side by side where the panel is wide enough, inside the safe areas, and nothing that needs hover. [X-19]

### 5.14 Build and data
- HER-075 The build shall refresh ids from other designs (`extract_vocab.py`), rebuild archetypes (`make_archetypes.py`), and generate, merge, validate and write `build/` (`build_heritage.py`, with `--check FILE` for one authored file). [ns §12; README]
- HER-076 When heritage is built, the report shall list budget overruns, unknown ids (levers, ages, events, inventions, styles, buildings, countries, areas) and place names still to bind. [ns §12]
- HER-077 The heritage context shall read the country catalogue, event tree, country stats, province stats and warfare read-only and change nothing outside its own folder. [README]

### 5.15 Timing
- HER-078 Each turn, after the event tree's step and before achievements, the heritage context shall evaluate every heritage once (needs, claims, heydays, ambitions, burden), and count heyday years awake and claim years held in months by the date: a month is added in the turn in which a new month begins, 12 months to a year. [X-2; X-18; D-HER-9]

## 6. Commands

| Command | Who | Preconditions | Result | Events |
|---|---|---|---|---|
| ChooseSleepingHeyday(country, heyday) | player | A third heyday would wake | Chosen heyday sleeps | HeydaySlept |
| PayCounsel(country, ambition) | player / AI | 10 years since last; gold for the era | Ambition stirred, warmth shown | AmbitionStirred |
| LetGoLegacy(country, legacy) | player / AI | A sixth legacy earned | Chosen legacy removed | LegacyReleased |
| SetHistoryMode(drawn / historical_only) | player (campaign setting) | Before the campaign starts | Ambition draws limited | — |
| KeepEnvoyAtCourt(country, target) | player / AI (diplomacy) | A resident envoy at that court (diplomacy) | After 2 years: hint and warmth of one target ambition | AmbitionRead |

## 7. Domain events

| Event | When | Payload | Consumed by |
|---|---|---|---|
| BirthrightDormant / BirthrightWoke | Needs fail / hold | country, birthright | game-shell, map-presentation |
| HeydayWoke / HeydaySlept / HeydayEnded | Heyday state changes | country, heyday, age, years | game-shell, events (heritage condition) |
| MarkGranted | Heyday ended after 25 years | country, mark | events, achievements |
| AmbitionDrawn | Start, done, lost, age begins | country, ambition (sealed) | game-shell |
| AmbitionStirred | Stir holds, counsel, event | country, ambition, warmth | game-shell (seal moment, digest), map-presentation |
| WarmthChanged | Warmth band changes | country, ambition, band | game-shell, map-presentation (shimmer when hot) |
| AmbitionDone / AmbitionLost | Goal holds / deadline or fail | country, ambition, plain goal | game-shell, achievements, events |
| LegacyGranted / LegacyReleased | Earned / let go | country, legacy | all lever-owning contexts |
| BurdenShed | Shed holds or event | country, burden, turned legacy | events, game-shell |
| DormantClaimCreated / DormantClaimWoke | Annexation / 30 years held | country, claim | game-shell |
| AmbitionRead | Envoy 2 years | reader, target, hint, warmth | diplomacy, game-shell |

## 8. Policies

- When **events** report an age beginning, then heydays of that age may wake and age ambitions join pools (HER-009, HER-026).
- When **events** report an age ending, then its heydays end (and marks are granted) (HER-011, HER-012).
- When **events** apply grant_legacy, wake_heyday, stir_ambition or shed_burden, then HER-064..067.
- When **diplomacy** or **warfare** reports an annexation, release or formed country, then HER-059..063.
- When **subjects** reports a new subject, then it keeps its heritage and the overlord's legacies do not apply (HER-061).
- When **diplomacy** reports an envoy kept 2 years at a court, then HER-025.
- When **diplomacy** or **warfare** reports how long an annexer has held an annexed capital and homeland, then a dormant claim may wake after 30 years (HER-060).
- When **government** or **revolutions** apply a reform event, then a burden may be shed or a legacy granted (HER-034, HER-067).
- When any owning context changes state named in a condition, then needs, wakes, stir, goal, fail and shed are re-evaluated.

## 9. Each turn

A turn is one week (X-18). Heritage is evaluated once per turn, in the events step (X-2 step 6) right after the event tree, so a new age is seen the
same turn; its levers apply from the next month's steps. Time is counted in months by the date, not in turns (HER-078). Steps, in order:
1. Evaluate dormant claims (wake after 30 years held) and birthright needs (dormant or awake).
2. Evaluate heydays: age active, wakes, ends; in the turn in which a new month begins, add a month to each awake heyday; grant marks on end; resolve a third
   waking (the AI by HER-079).
3. Evaluate ambitions: stir, warmth, goal, fail, deadline; draw replacements; digest lines for seal and warmth moments.
4. Evaluate burden shed; grant turned legacy; resolve a sixth legacy (the AI by HER-079).
5. Publish active levers to their owning contexts for the next monthly steps.
Reads first: ages (events), the condition inputs from every context, catalogue data (start only).

## 10. Configuration

| Key | Meaning | Value | Placeholder? | Config file |
|---|---|---|---|---|
| `budget.birthright` / `heyday` / `legacy` / `great_legacy` / `burden` | Part budgets | 3 / 3 / 2 / 3 / −2 | yes | heritage-rules.json |
| `budget.tolerance` | Build tolerance | 0.6 | yes | heritage-rules.json |
| `budget.size_bonus` | Size bonus by size class | 4.5→0, 3.5→0.5, 2.5→1, 1.5→1.5, 0→2 | yes | heritage-rules.json |
| `budget.size_bonus_applies_to` | Parts | birthright, heyday | — | heritage-rules.json |
| `stat_points.*` | Cost per unit of `stat` | legitimacy 0.1, stability 1, prestige 1, notoriety 0.5, admin_capacity 0.1, literacy 0.2, cohesion 0.1 | yes | heritage-rules.json |
| `birthright.per_country` | Birthrights | 1 | — | heritage-rules.json |
| `heydays.max_per_country` / `max_active` | Heydays | 3 / 2 | yes | heritage-rules.json |
| `heydays.mark_after_years` / `mark_share` | Mark | 25 / one third | 25 yes | national-strengths.json rules |
| `ambitions.active` / `guaranteed_historical` | Active, historical | 3 / 1 | yes | heritage-rules.json |
| `ambitions.pool_min_authored` / `pool_min_generated` / `pool_max` | Pool size | 5 / 4 / 7 | yes (pool_max provisional) | national-strengths.json rules |
| `ambitions.counsel.cooldown_years` / `gold_by_era` | Counsel | 10 / 30, 50, 80, 120, 180, 260, 380 | yes | heritage-rules.json |
| `ambitions.envoy_reveal_years` | Envoy reading (a resident envoy) | 2 | yes | heritage-rules.json |
| `ambitions.history_mode_setting` | Setting | drawn (default), historical_only | — | heritage-rules.json |
| `ambitions.max_legacies` | Legacy cap | 5 | decided | heritage-rules.json |
| `ambitions.warmth_bands` | Warmth bands | cold 0, warm one third, hot two thirds | no (design) | national-strengths.json rules |
| `burden.per_country_max` / `turned_legacy` | Burden | 1 / true | — | heritage-rules.json |
| `inheritance.*`, `inheritance.claim_years` | Claims, releases, formed, subjects; 30 years; max 2 birthrights | as §5.10 | claim_years provisional | national-strengths.json rules |
| `ai.ambition_goal_weight` | AI weight | 1.5 | yes | heritage-rules.json |
| `ai.sleep_heyday` / `ai.let_go_legacy` | AI choice | fewest points | provisional | national-strengths.json rules |
| `timing.months_per_year` | Months in a year of heritage time | 12 | no | national-strengths.json rules |
| `levers.*` | 64 levers (D-HER-2): group, unit, points, params, owner, meaning, better | §4 | yes | levers.json |
| `scope_cost.*`, `where_values` | Scope multipliers, floor 0.25 | §4 | yes | levers.json |
| archetypes | 27 archetypes, detection rules, templates; one may go unused (D-HER-15) | — | yes | archetypes.json |
| vocab | Ids from other designs | — | — | vocab-ref.json |

## 11. Seams

| Other context | Direction | Pattern | What crosses |
|---|---|---|---|
| events | upstream | Conformist | Ages (`ages.yaml`) and their start/end, the condition language, event ids for event_weight/event_option; the `stat` lever lands through the events mapping (D-EVT-4, D-HER-6); heritage runs right after the event tree each turn |
| events | downstream | Published Language | Four effects (grant_legacy, wake_heyday, stir_ambition, shed_burden) and the `heritage` condition (adopted, D-EVT-11) |
| scenario-setup | upstream | Anti-Corruption Layer | Catalogue fields read by archetypes; tiers; size-class assessments; ai_personality; places |
| realm | downstream | Published Language | Levers on treasury, officials, lords, loyalty, recruits, horses, envoys, Lands taken (country-stats) |
| province | downstream | Published Language | Levers on tax reach, harvests, growth, class slots, official types, grievances, Foreign rule, days to capital |
| warfare | downstream | Published Language | Levers on troop cap, levies, break point, hits, marching, forage, sieges, garrisons, hired companies, commanders, ship hits, storms |
| recruiting | downstream | Published Language | Recruit refill, retinue |
| research | downstream | Published Language | invention_cost_pct, invention_known, spread_discount_cap, scholar output, school seats |
| research | upstream | Conformist | Invention ids for `knows` |
| trade | downstream | Published Language | Trade v2 (X-6): trade_balance_pct and traders_passing_pct on trade ratio gain, trader_gain_pct on each deposit, trader_count extra starting traders; toll_gold_pct |
| trade | upstream | Conformist | trade_presence condition, hubs |
| naval | downstream | Published Language | ship_build_pct, crew_pct, sea_days_pct (provisional) |
| buildings | downstream | Published Language | building_cost_pct, building_unlock on buildings-design ids; `count building:<id>` |
| buildings | upstream | Open Host Service | Unique variants of §9.2 are unlocked through `building_unlock` (D-HER-7); landmarks (§12.2) |
| government | downstream | Published Language | official_capacity, lord_capacity; reforms that shed burdens |
| religion | downstream | Published Language | faith_shift_pct (provisional) |
| culture | downstream | Published Language | tongue_shift_pct (provisional) |
| diplomacy | upstream | Customer–Supplier | Resident envoys (D-HER-11); annexation, release; years an annexed homeland is held |
| diplomacy | downstream | Published Language | envoy_count, opinion_steps, oath_fade_pct, lands_taken_pct; ambition reading |
| subjects | downstream | Published Language | tribute_pct; subjects keep heritage |
| revolutions | upstream | Customer–Supplier | Reforms and revolutions shedding burdens or granting legacies through event effects |
| achievements | downstream | Published Language | Suggested achievements: every ambition of a country, 5 legacies |
| game-shell | downstream | Published Language | Heritage row and sheet, nation picker, digest lines |
| map-presentation | downstream | Published Language | Shimmer over hot ambition regions |
| settings | upstream | Customer–Supplier | History mode setting (Drawn / Historical only) |
| onboarding | downstream | Customer–Supplier | Tutorial ambition with a plain hint |
| world-map | upstream | Customer–Supplier | Province ids for place names, bound to the nearest land province (D-HER-16); areas, seas |
| time-and-turns | upstream | Conformist | Dates, eras (counsel gold); heritage runs in the events step, time in months (X-2, HER-078) |

Requests to other designs (`requests-to-other-designs.md`), worked around, nothing blocked:
- events: missing event ids (Europe 17, Islamic world and steppe 7, South Asia and Africa 6, East and Southeast Asia 9,
  Americas 4, as listed), missing areas (about 41), trade hubs (tabriz, aleppo, volga, bruges/antwerp, seville, genoa,
  venice), a canonical list of sea ids, the four effects and the heritage condition.
- scenario-setup (catalogue): playable records for kazakh_khanate, dzungar_khanate, ndongo, the Mughals, ahmadnagar,
  golconda, berar.
- province / warfare: wares amber, wax and honey, alum; ships jong and the Orang Laut light vessel; commander styles for
  mainland Southeast Asian elephants, an Andean style, the Italian condottiere lance.
- religion: Utraquist or Hussite Christianity id. world-map: 273 place names to bind.

## 12. AI

- The AI always knows its own ambitions and weighs them at 1.5 next to its catalogue ai_personality priorities (HER-069).
- An AI completing an ambition gets the legacy like a player.
- Heydays give the AI a reason to change course across centuries, alongside the catalogue's `adaptation` notes. [ns §2.2]
- The AI may read the player's ambitions through envoys kept 2 years (HER-025).
- When a third heyday would wake or a sixth legacy is earned, the AI lets the one with the fewest lever points go, on a
  tie the one held longest (HER-079).

## 13. Decisions and open questions

- **D-HER-1** (was OQ-HER-1) Inherited birthrights: a dormant claim wakes when the annexer has owned the annexed capital
  and held a majority of its homeland for 30 years (provisional); there is no culture test. The culture design has no
  accepted cultures, and the simpler rule needs no new one.
- **D-HER-2** (was OQ-HER-2) Lever count: 64, as levers.json holds and the build uses. The data is what is built.
- **D-HER-3** (was OQ-HER-3) France's size bonus: the rules table governs, so France (size class 4.2) gets +0.5; the
  design's "nothing for France" is a slip. One table is simpler than an exception.
- **D-HER-4** (was OQ-HER-4) Trade levers: `trade_balance_pct` and `traders_passing_pct` are a percentage on the trade
  ratio gain; `trader_gain_pct` a percentage on each deposit; `trader_count` extra traders at the campaign start. X-6
  decides it.
- **D-HER-5** (was OQ-HER-5) Building levers: owned by the buildings design, and their building ids follow it. The
  buildings design was written later and owns the list.
- **D-HER-6** (was OQ-HER-6) The `stat` lever: kept, owned by events, and its change lands through the events mapping
  (D-EVT-4: legitimacy on lords' loyalty, stability, prestige and so on); the words are the event tree's own, not EU4's.
  The mapping already exists, so no new rule is needed.
- **D-HER-7** (was OQ-HER-7) Unique building variants: accepted as `building_unlock` with the variant's building id
  from buildings §9.2; no new field. The existing lever carries it.
- **D-HER-8** (was OQ-HER-8) Example against authored Portugal: the authored entry and design §11 govern ("Carreira da
  Índia", 5 birthright effects, "Goa or Calicut"); example-portugal.json is an illustration only. `colonial_presence` is
  in the event-tree vocabulary, so heritage may use it (HER-040). The authored data is the later and fuller one.
- **D-HER-9** (was OQ-HER-9) Evaluation timing: every heritage is evaluated once per turn, right after the event tree in
  the events step, and time (heyday years awake, claim years held) is counted in months, 12 months a year (HER-078). Since turns became a week (X-18), the check still runs every
  turn, but a month is counted only in the turn in which a new month begins, measured by the date.
- **D-HER-10** (was OQ-HER-10) Pool maximum: 7 is a cap for every pool, generated or authored; age ambitions join on top
  and do not count. The design's "4 to 7" is the rule.
- **D-HER-11** (was OQ-HER-11) Envoy reading: diplomacy's resident envoy (an envoy who stays at one court) is the envoy
  kept at a court; after 2 years it reads one ambition's hint and warmth. Diplomacy already has residents.
- **D-HER-12** (was OQ-HER-12) AI choices: the AI sleeps the heyday, and lets go the legacy, with the fewest lever
  points; on a tie the one held longest (HER-079, provisional). Points already measure worth.
- **D-HER-13** (was OQ-HER-13) Warmth band edges: cold under a third, warm from a third to under two thirds, hot from two
  thirds, so exactly 1/3 is warm and exactly 2/3 is hot. The design's words govern over the rounded config.
- **D-HER-14** (was OQ-HER-14) Mark share: exactly a third; a mark is a legacy and counts toward the cap of 5. A mark is
  granted as a legacy already.
- **D-HER-15** (was OQ-HER-15) Archetype count: 27 archetypes are kept; one that no generated country scores best on is
  allowed and the build only reports it. Removing it would change the design for no gain.
- **D-HER-16** (was OQ-HER-16) Unbound ids: a place name binds to the land province nearest the scenario map's place of
  that name (a capital or a port); a name the map does not hold stays in places-to-bind.md and its condition is false
  until bound; the other requested ids stay worked around with place names. A rule binds most names without hand work.
- **D-HER-18** (18 Oct, Leroy: give each realm its strengths and assessments on the realm card) The map's realms take
  the heritage of their matched catalogue record from the heritage build, extracted per realm with
  `tools/domain-data/extract_realm_strengths.py` into `national-strengths-realms.json` with the record's assessments,
  so the client reads 137 rows, not the whole build. 110 realms have heritage; the 27 without (no record, or a record
  the build gives none, such as the Swiss Confederation) show that none is recorded. The card shows the parts that do
  not need the turn's evaluation; ambitions, legacies and the awake state follow with HER-078.
- **D-HER-17** (was OQ-HER-17) Formed countries beyond the caps: the formed country keeps the forming country's own
  birthright and adds its own; any other birthright of the forming country becomes a dormant claim again. Legacies
  cannot exceed 5, since a formed heritage brings none, and a burden stays at most one (the formed country's, or else
  the forming one's). It reuses the claim rule instead of a new choice.

## 14. Traceability

| Requirement | Feature file | Scenario |
|---|---|---|
| HER-001..004 | heritage-card.feature | all scenarios |
| HER-005..007 | birthright.feature | all scenarios |
| HER-008..013 | heydays.feature | all scenarios |
| HER-014..028 | ambitions.feature | all scenarios |
| HER-029..034 | legacies-and-burdens.feature | all scenarios |
| HER-035..039 | levers.feature | all scenarios |
| HER-040..044 | conditions.feature | all scenarios |
| HER-045..050 | budgets.feature | all scenarios |
| HER-051..058 | heritage-generation.feature | all scenarios |
| HER-059..063 | changing-hands.feature | all scenarios |
| HER-064..068 | heritage-events.feature | all scenarios |
| HER-069 | ambitions.feature | The AI knows its own ambitions |
| HER-078 | ambitions.feature | Heritage counts time month by month |
| HER-079 | ambitions.feature | The AI puts its weakest heyday to sleep; The AI lets its weakest legacy go |
| HER-070..074 | heritage-on-the-phone.feature | all scenarios |
| HER-080 | realm-heritage.feature | all scenarios |
| HER-081..083 | — | Client screens; checked by apps/client/src/ui/heritage.test.ts and phone screenshots |
| HER-075..077 | heritage-generation.feature | Build and report |
