# Revolutions (REVO)

## 1. Purpose and scope

This context decides when a historical revolution can break out in a country, what the player sees while it
brews, the stance the ruler takes when it breaks out, which **regime** (a package of rules) each outcome
leaves behind, the **decrees** and **locks** regimes bring, how a stopped revolution comes back, the
aftermath abroad (waves, émigrés, counter-revolution, restoration), and the secret funding of a revolution
in a rival.

A revolution is not a new event system. It is an ordinary event of the event tree that carries one extra
block, `revolution`; the struggle is a tagged rising in the rebellions system.

**In scope**
- The revolution card, its signs, ease hints and stages.
- Requirements, signs and sparks, and how they compile into the event's trigger and selection.
- Stances (Lead, Bend, Fight, Path) and the historical option.
- Camps that replace the rebellions join table for a revolution's rising.
- Re-arming a stopped revolution (decided 16 Oct 2026).
- The 33 regimes, 34 decrees, 9 families, and the 36 revolutions of the catalogue.
- Aftermath: wave, émigré court, counter-revolution, generals, restoration.
- Funding a revolution abroad: its effect on the revolution (decided 16 Oct 2026).
- AI behaviour and phone UI for revolutions.
- The data layer and its build (validation, merge into a scratch event tree, generated patch).

**Not in scope (owned by …)**
- Event firing, roles, selection rolls, options and effects machinery: **events**.
- Rising strength, march, sieges, spread and melting away: **rebellions**.
- Government forms and their caps: **government**.
- The diplomatic action "fund a revolution / fund rebels", opinion reasons and war reasons: **diplomacy**.
- Settler colonies turning Disloyal, `release`, `change_subject_kind`: **subjects**.
- Faith waves and the church events after a revolution: **religion**. Nationalism and court language: **culture**.
- Generals growing too big (warfare 4.6): **warfare**.
- Legacies and burdens: **national-strengths** (hook only).

## 2. Sources

Newest decision first.

1. `revolutions/revolutions-design.md` §5.1, §6, §7.1, §8, §17 (Leroy's decisions of 16 Oct 2026: a stopped
   revolution comes back; funding a revolution abroad; forms before their era; Mahdist, Maratha and Sikh
   revolutions added).
2. `revolutions/revolutions-design.md` (all sections), `revolutions/README.md`,
   `revolutions/changes-for-other-designs.md`.
3. `revolutions/data/families.yaml`, `reference.yaml`, `decrees.yaml`, `regimes.yaml`, `revolutions.yaml`,
   `additions.yaml`; `revolutions/generated/revolution_catalogue.md`, `validation_report.md`,
   `event_tree_validation.md`, `event_tree_patch/merged_revolution_events.yaml`.
4. `diplomacy/diplomacy-design.md` §6.11, §10, §18 (16 Oct): fund rebels; "Different form of rule".
5. `government/government-design.md` v2 §3–5 and `government/config/government.yaml`.
6. `subjects/subjects-design.md` §2.4, §8.2, §11–12; `culture/culture-design.md` §6.3–6.4, §10;
   `religion/religion-design.md` §10.2–10.4; `national-strengths/national-strengths-design.md` §8;
   `warfare/warfare-design.md` §4.6.
7. `planning/gap-lists.md` "Decisions already made": campaign ends 31 August 1939; a revolution can grant a
   government form before its era.

## 3. Ubiquitous language

| Term | Meaning | Not to be confused with |
|---|---|---|
| Revolution | An event-tree event carrying a `revolution` block: requirements, signs, sparks, stances and regimes. | A rising (the struggle itself, rebellions); an ordinary peasant, pretender or separatist rising; a coup |
| Revolution card | The card on the country screen that lists signs, ease hints and sparks. | Rebellion card |
| Requirement | A hard condition (who, when, what kind of state); never shown as a sign. If unmet the card is hidden. | Sign |
| Sign | A visible condition with a label and an `ease` hint; `need` of them must be lit for the revolution to be ready. | Requirement |
| `need` / `warn_at` | Signs needed to break out / signs at which the card turns amber. | |
| Spark (revolution) | A multiplier on the monthly chance once the revolution is ready. | Rebellion spark (an instant rising trigger) |
| Stage | Quiet, Brewing, Ready, Outbreak, Struggle, Settlement, Aftermath. | |
| Stance | Lead, Bend, Fight or Path: the tag of each option of a revolution event. | |
| Camp | Revolution camp and old order camp: who joins each side of a revolution's rising. | Rebellions join table |
| Tagged rising | A rising carrying `revolution: <event id>`. | |
| `rising_won` / `rising_crushed` | Option effect tiers applied when the tagged rising wins or is beaten or melts away. | |
| Regime | A package of rules a revolution leaves behind (form, ruler, lords, decrees, locks, grievances, flags, abroad, risk, loop). | Government form (one field of a regime) |
| Add-on regime | A regime with `add_on: true` that stacks on whatever regime is in place (emancipation). | |
| Decree | A new button a regime unlocks, with a cost and a limit. | |
| Lock | An existing action a regime takes away. | |
| Family | One of 9 revolution families giving defaults: cause, camps, stance labels, wave. | |
| Wave | How a won revolution spreads its idea abroad. | Religion's faith wave (one kind of wave) |
| Émigré court | The deposed ruler or old dynasty living abroad as a pretender (`emigre_court`). | |
| Re-arm | A stopped revolution coming back after a grace period while its signs stay lit. | |
| Stopped, not solved | Card label of a re-armed revolution. | |
| Restoration | The family of revolutions that bring the old dynasty back (`restored_monarchy`). | Reaction regime |
| Foreign backing | Secret funding of a revolution by a rival; sets `revolution_funded`. | Diplomacy's "fund rebels" (D-REVO-1) |

## 4. Domain model

### Aggregates

**Revolution** (identity: the event id it extends or adds, e.g. `french_revolution`)
- Holds: family, `country` role, requirements, signs (`need`, `warn_at`, list of `{label, ease, if}`), sparks
  (`{label, mult, if}`, plus the automatic foreign-backing spark), options with stance, regimes
  (`{on, id, after_years}`), `rising_won` / `rising_crushed`, aftermath follow-ups, `keep_trigger`,
  `rearm` (grace years and which outcomes re-arm), its stage per country, and its funder (if any).
- INV-REVO-1: the compiled trigger is `all(requirements + [at_least(need, signs)])`, so the card and the trigger
  always agree.
- INV-REVO-2: every Fight option raises a tagged rising.
- INV-REVO-3: each event has exactly one option with `history: true`.
- INV-REVO-4: the card is shown only when all requirements hold and at least one sign is lit.
- INV-REVO-5: `warn_at` ≤ `need` ≤ number of signs.
- INV-REVO-6: a revolution never fires in the same month its last needed sign lights.
- INV-REVO-7: a revolution that applied a regime (won) does not re-arm.
- INV-REVO-8: a revolution cannot happen outside its event's `availability` window, era or period window.

**Regime state of a country** (identity: country)
- Holds: current regime (at most one), add-on regimes, the form held before the last revolutionary regime
  (for `old_form`), active decrees with their use timers, locked actions, revolution flags
  (`revolutionary_regime`, `emigre_court`, `reaction_regime`, `revolution_funded`).
- INV-REVO-9: one country holds one regime at a time, plus any add-ons.
- INV-REVO-10: `revolutionary_regime` is set when a regime that lists it is applied and cleared when another
  regime replaces it.
- INV-REVO-11: a regime never sets its own officials or lords numbers; the form sets them.

### Entities and value objects

- **Sign** (value): label, ease hint, condition; lit or not.
- **Spark** (value): label, multiplier, condition.
- **Stance option** (entity within the event): option id, stance, regimes, `rising_won`, `rising_crushed`.
- **Regime** (reference data, 33): see 10.2.
- **Decree** (reference data, 34): id, name, card (country or province), cost, limit, does; see 10.3.
- **Family** (reference data, 9): cause, revolution camp (join shares by class, lords, army), old order camp,
  stance labels, wave (kind, id, amount, where).
- **Lockable action** (closed list): grant_fief, sell_title, seize_land, call_the_lords, hire_companies,
  crushing_taxes, revoke_charter, massacre, persecute.
- **Foreign backing** (value): funder, monthly gold, caught or not.

### Domain services

- **Card evaluator**: evaluates requirements and signs each month per country and sets the stage.
- **Regime applier**: applies a regime package (`regime` effect) and `lock`.
- **Re-arm keeper**: tracks stopped revolutions and their grace period.
- **Revolution build** (offline tool): validates the layer and compiles it into event-tree format.

## 5. Requirements

### 5.1 The card

- REVO-001 While a revolution's requirements hold for a country and at least one of its signs is lit, the
  game shall show its revolution card on that country's screen. [revolutions §1]
- REVO-002 If a revolution's requirements do not hold for a country, then the game shall not show its card,
  so a player is never shown a revolution that cannot happen to them. [revolutions §1]
- REVO-003 The game shall list lit signs first, each with how to ease it using actions the player already
  has. [revolutions §1]
- REVO-004 The game shall turn the card's bar amber at `warn_at` lit signs and red at `need`. [revolutions §1]
- REVO-005 The game shall let the player open "What happens if it breaks out" to see the stances and the regime
  each leads to before the event fires. [revolutions §1]
- REVO-006 The game shall show the sparks on the card with their multipliers. [revolutions §1]

### 5.2 Stages

- REVO-007 The game shall track each revolution per country through the stages Quiet (requirements unmet or
  no sign lit), Brewing (requirements met, fewer than `need` signs), Ready (trigger true; the event's
  selection rolls by `mean_years` × sparks; card red "may break out any month"), Outbreak (the event fires
  with text and stance options), Struggle (option effects; for Fight a tagged rising, shown on the map with
  its camps), Settlement (a banner says who won; `rising_won` or `rising_crushed` applies) and Aftermath
  (the regime applies; wave, émigrés and abroad reactions). [revolutions §2]
- REVO-008 If the last needed sign lights this month, then the game shall not fire the revolution this month; it
  rolls through the normal selection so the player can still act once the card is red. [revolutions §2]
- REVO-009 When the lit signs fall below `need`, the game shall stop the roll. [revolutions §2]

### 5.3 Requirements, signs and sparks

- REVO-010 The build shall compile each revolution's trigger as all of its requirements plus at least `need` of
  its signs, and add one selection modifier `{if, mult}` per spark. [revolutions §3]
- REVO-011 The game shall read signs from stats the player already reads: grievances (province stats 12.1),
  class shares (6.3), lords' loyalty and land (country stats 5), debt, stability, faith and ideology shares,
  lost wars. [revolutions §3]
- REVO-012 The game shall evaluate the condition `grievance {who, id, op, value}` as the share (0 to 1) of
  who's provinces (a polity, area or region) that have that grievance. [revolutions §11; additions.yaml]
- REVO-013 The game shall evaluate `class_share {who, class, op, value}` as the share of who's people in a class
  (farmers, herders, woodsmen, miners, seafolk, craftsmen, market folk, clergy, clerks, scholars, homeless).
  [revolutions §11; reference.yaml]
- REVO-014 The game shall evaluate `lords {who, measure, op, value}` with measure `land_share` (share of the
  realm's provinces held by lords rather than run by officials), `wavering_or_worse`, `disloyal_or_worse`
  or `count`. [revolutions §11; reference.yaml]
- REVO-015 The game shall evaluate `war_lost {who, within_years}` as true when who made peace on the losing
  side (gave land, paid, or was made a subject) within that many years. [revolutions §11; additions.yaml]
- REVO-016 Where a revolution extends an existing event, the game shall keep that event's `availability`
  window; a revolution with an era or period window shall not happen outside it. [revolutions §3]
- REVO-017 Where a revolution has `keep_trigger: true`, the build shall keep the event's existing trigger
  instead of the sign checklist (armistice_1918). [revolutions.yaml; catalogue]

### 5.4 Stances

- REVO-018 The game shall give every revolution event two to four options, each tagged Lead, Bend, Fight or
  Path. [revolutions §5]
- REVO-019 When the ruler takes a Lead option, the game shall apply the revolution's regime at once with no
  rising, and the lords and clergy whom the regime hurts may rise as the old order camp. [revolutions §5]
- REVO-020 When the ruler takes a Bend option, the game shall apply a milder regime or a set of reforms and end
  some signs; if enough stay lit, the revolution comes back (5.6). [revolutions §5]
- REVO-021 When the ruler takes a Fight option, the game shall raise a rising tagged `revolution: <event>`;
  if it wins, apply the option's `rising_won`; if it is crushed, apply `rising_crushed`. [revolutions §5, §11]
- REVO-022 When a Path option is picked by the event's chooser, the game shall apply its regimes to the
  countries named in the option. [revolutions §5]
- REVO-023 Where an option's regime has `after_years`, the game shall apply it that many years after the
  option is taken. [revolutions.yaml]
- REVO-024 When a Fight rising is crushed, the game shall leave *Bloodshed* grievances and keep the signs lit,
  so the revolution comes back unless they are eased. [revolutions §5]
- REVO-025 The game shall show each family's stance labels on the options (for example liberal and national:
  "Proclaim the new order", "Grant a constitution", "Restore order"). [families.yaml]

### 5.5 Camps

- REVO-026 When a Fight stance raises a rising, the game shall use the family's camps to decide who joins
  each side, replacing the rebellions join table for that rising only. [revolutions §4, §9]
- REVO-027 The game shall draw the revolution camp by its monthly join share per class, the lords it names and
  the army desertion it names. [revolutions §4; families.yaml]
- REVO-028 The game shall make the old order camp's loyal lords send retinues to the ruler and its clergy calm
  their provinces. [revolutions §4]
- REVO-029 While the revolution camp holds a province's castle, the game shall count that province as risen;
  everything else (strength, march, sieges, melting away) follows the rebellions design unchanged.
  [revolutions §4]
- REVO-030 The game shall use these revolution camp join shares (per class, per month): faith – homeless
  0.30, farmers 0.10, clergy 0.30, craftsmen 0.08, market folk 0.08, only of the movement's faith; estates –
  homeless 0.20, market folk 0.15, craftsmen 0.12, clerks 0.10, scholars 0.05, farmers 0.03; liberal and
  national – homeless 0.30, scholars 0.25, clerks 0.15, craftsmen 0.12, market folk 0.10, farmers 0.04
  (0.10 if hungry); freedom – homeless 0.30, farmers 0.30, craftsmen 0.10, market folk 0.10; agrarian –
  homeless 0.30, farmers 0.15, herders 0.10, woodsmen 0.08, miners 0.08, craftsmen 0.04; from above – none
  (old order: clergy 0.10, farmers 0.02); homeland – homeless 0.20, herders 0.10, woodsmen 0.08, farmers
  0.06, only of the region's culture; war and want – homeless 0.30, craftsmen 0.20, seafolk 0.10, miners
  0.15, farmers 0.08, scholars 0.10, clerks 0.05; restoration – none (the returning pretender's backers).
  [families.yaml]
- REVO-031 The game shall apply each family's camp lords and army rules as written in families.yaml (for
  example faith: lords of the movement's faith who are Wavering or worse join, soldiers of the movement's faith
  desert at 5 % a month; war and want: soldiers mutiny at 10 % a month while war weariness is above 14).
  [families.yaml]

### 5.6 A stopped revolution comes back (decided 16 Oct 2026)

- REVO-032 When a revolution is stopped by Bend, by a crushed rising, or by a Path outcome that applies no
  regime, the game shall re-arm it and keep its card up marked "Stopped, not solved". [revolutions §5.1]
- REVO-033 While a re-armed revolution is within its grace period (3 years), the game shall not let it break out.
  [revolutions §5.1; reference.yaml rearm.grace_years]
- REVO-034 After the grace period, whenever `need` signs are lit, the game shall let the revolution break out
  again through the normal selection with its sparks. [revolutions §5.1]
- REVO-035 When lit signs fall below `need`, the game shall disarm the re-armed revolution; there is no fixed
  cooldown that waits it out. [revolutions §5.1]
- REVO-036 When a re-armed revolution returns, the game shall fire the same event with the same stances, so a
  ruler who bent once may fight or lead the second time. [revolutions §5.1]
- REVO-037 When a revolution has applied a regime, the game shall not re-arm it. [revolutions §5.1]
- REVO-038 Where an event carries `revolution.rearm`, the game shall let it fire again after a listed outcome
  even when its `repeat` is `one_time`. [revolutions §11; changes-for-other-designs Event tree 7]

### 5.7 Regimes

- REVO-039 When a `regime {on, id}` effect applies, the game shall apply the regime's package: form, ruler,
  lords, church, faith, language, levy, land, towns, trade, research, decrees, locks, grievances to end and add,
  flags to set and clear. [revolutions §6, §11; regimes.yaml]
- REVO-040 The game shall set the regime's form from the government forms; `keep` leaves the form as it is;
  `old_form` restores the form saved before the last revolutionary regime. [revolutions §6; regimes.yaml]
- REVO-041 The game shall remember the form a country held before its last revolutionary regime.
  [changes-for-other-designs Government 4]
- REVO-042 The game shall let a regime set any form regardless of era (a revolution is the unlock).
  [revolutions §6; gap-lists decisions]
- REVO-043 Where a regime has `form_before_g14` and the country lacks G14 Written constitution, the game shall
  use that form instead (crown and assembly → diet monarchy). [regimes.yaml]
- REVO-044 The game shall take officials and lords limits from the form only; a regime never sets its own
  numbers. [revolutions §6]
- REVO-045 The game shall let a country hold one regime at a time plus add-on regimes, which stack on
  whatever regime is in place. [regimes.yaml]
- REVO-046 The game shall apply the regime's ruler rule: kept; deposed (ruler and heirs go abroad as
  pretenders); replaced (the rising's leader rules); elected. [regimes.yaml]
- REVO-047 When a `lock {on, id}` effect or a regime's locks apply, the game shall remove that action and show it
  greyed out with "Locked by the revolution". [revolutions §6, §11, §13]
- REVO-048 When a regime applies, the game shall end its `grievances_end` and add its `grievances_add` in the
  country's provinces (for example a revolutionary republic ends *Harsh lord* and *Wrong faith* and adds
  *Broken charter*). [revolutions §6]
- REVO-049 When a regime applies, the game shall set its flags (`revolutionary_regime`, `emigre_court`,
  `reaction_regime`) and clear its `flags_clear`; `revolutionary_regime` is cleared when another regime
  replaces it. [revolutions §6, §11; additions.yaml]
- REVO-050 The game shall apply each of the 33 regimes as listed in 10.2. [regimes.yaml]
- REVO-051 While a country holds the reaction regime, the game shall lower the revolution's `need` by one sign
  for 20 years. [regimes.yaml reaction.risk]

### 5.8 Decrees

- REVO-052 The game shall add each decree a regime unlocks as one button on the country card or a province
  card, with its cost and its limit. [revolutions §6.1; decrees.yaml]
- REVO-053 The game shall make every decree cost something the player feels (stability, a grievance, a lord
  turning Disloyal, scholars fleeing); a decree is a trade-off, not a free bonus. [revolutions §6.1]
- REVO-054 The game shall apply each of the 34 decrees as listed in 10.3. [decrees.yaml]

### 5.9 Aftermath

- REVO-055 When a revolution wins, the game shall spread its family's wave: estates – parliamentarism +0.03 to
  neighbours; liberal and national – liberalism +0.05 to neighbours; freedom – abolitionism +0.10 to the region;
  faith – religion's `faith_wave` (0.05, neighbours); war and want – socialism +0.05 to the region; agrarian –
  *Neighbour in revolt* grievances in neighbours, not an ideology; homeland – *Foreign rule* grievances in
  neighbouring provinces held by distant empires; from above and restoration – none. [revolutions §7;
  families.yaml]
- REVO-056 When a regime deposes the ruler, the game shall set `emigre_court` and keep the old dynasty abroad as
  a pretender, which rivals can fund and which is the role selector for `restoration_of_the_old_order`.
  [revolutions §7]
- REVO-057 When a regime's `abroad` line names a counter-revolution reason, the game shall give monarchies an
  opinion malus and a reason to fight for its years (revolutionary republic: −50 and 25 years), through
  diplomacy's "Different form of rule −20" reason row and a counter-revolution war reason. [revolutions §7;
  changes Diplomacy 1–3]
- REVO-058 While a country holds a republic born in revolution whose risk says so, the game shall double the
  chance of a general growing too big (warfare 4.6); a winning general can switch the regime to court
  absolutism or a military kingdom through the `regime` effect. [revolutions §7; changes Warfare]
- REVO-059 When signs such as a lost war, broken charters or a weak regime add up in a country with
  `emigre_court`, the game shall let `restoration_of_the_old_order` fire, applying `restored_monarchy` (old
  form back, revolutionary flags cleared). [revolutions §7]

### 5.10 Funding a revolution abroad (decided 16 Oct 2026)

- REVO-060 The game shall let a country fund a revolution whose card in the target country is at least
  Brewing, and show that card only where the funder has a diplomat. [revolutions §7.1]
- REVO-061 While a revolution is funded, the game shall charge the funder gold every month (1 % of the target's
  yearly income). [revolutions §7.1]
- REVO-062 While a revolution is funded, the game shall set `revolution_funded` on the target, apply the spark
  "Foreign gold backs the movement" ×2 (added to every revolution by the build), and multiply its camp's join
  shares by 1.5 if it becomes a rising. [revolutions §7.1; reference.yaml foreign_backing]
- REVO-063 Each month while funding runs, the game shall roll a chance of being caught (3 %, +1 % while the target is at peace and +1 % with officials in at least half its provinces; the two
  additions are provisional, D-REVO-1). [revolutions §7.1]
- REVO-064 When the funding is caught, the game shall end it, give the target the opinion reason "Funded a
  revolution against us" and a reason to fight against the funder, and name the funder on the card.
  [revolutions §7.1]
- REVO-065 When a funded revolution wins, the game shall start the new regime at +25 opinion of the funder,
  unless the regime is hostile to the funder's form of rule. [revolutions §7.1]

### 5.11 The 36 revolutions and their families

- REVO-066 The game shall carry the 36 revolutions of 10.4 (26 extending existing events, 10 new), each
  choosing one of the 9 families and inheriting its defaults (cause, camps, stance labels, wave), which it may
  override. [revolutions §8, §9]
- REVO-067 The game shall bind a revolution's country through the event's role selector, so another country
  meeting the selector can get the card (alternate history). [revolutions §10]
- REVO-068 If a revolution's signs never light within its window, then the game shall never fire it and not
  force history. [revolutions §10]
- REVO-069 The game shall keep ordinary peasant risings, pretender wars and separatist revolts in the
  rebellions system, reforms without a struggle as ordinary events, and coups in warfare 4.6.
  [revolutions §8]

### 5.12 AI

- REVO-070 While an AI country's card is amber or red, the AI shall ease signs using each sign's ease hint,
  picking signs by personality (a pious ruler eases faith signs first; a miserly one avoids cutting taxes).
  [revolutions §12]
- REVO-071 When a revolution event fires for an AI, the AI shall weight `history: true` options ×3, Fight by
  its army strength against the rising's expected size, and Lead up when the ruler's ideology matches the
  cause. [revolutions §12]
- REVO-072 Where an AI country has `emigre_court` and is a rival of the revolutionary state, the AI shall fund
  its pretender abroad. [revolutions §12]
- REVO-073 Where an AI monarchy is stronger than a revolutionary state, the AI shall use the counter-revolution
  reason. [revolutions §12]
- REVO-074 Where a rival's card is amber or red and the two are not allied, the AI shall fund that revolution.
  [revolutions §7.1]

### 5.13 Phone UI

- REVO-075 When a revolution in another country breaks out or ends, the game shall show a one-line banner
  (for example "Revolution in France: the Bastille has fallen") only for neighbours, rivals and Great Powers;
  tapping it opens that country's revolution card. [revolutions §13]
- REVO-076 The game shall offer a revolution lens that shades provinces by how many of the revolution's
  province-level signs they meet and hatches risen provinces in the revolution's colour. [revolutions §13]
- REVO-077 After a revolution, the game shall show a regime card on the government screen with the regime's
  loop line, its decrees as buttons and its locks greyed out. [revolutions §13]
- REVO-078 The game shall fit the card to phone width (about 40 characters). [revolutions §1]

### 5.14 Data and build

- REVO-079 The engine shall evaluate the four new conditions, apply `regime` and `lock`, keep the revolution
  tag on a rising and apply the raising option's `rising_won` or `rising_crushed` when it ends, show the card
  from the runtime sign data, and re-arm stopped revolutions. [revolutions §11]
- REVO-080 The build shall validate families, regimes against government forms, decrees, every sign leaf,
  stances, and that every Fight option raises tagged rebels; merge the layer into a scratch copy of the event
  tree; run the event tree's validator; write the catalogue, runtime JSON and the event-tree patch; and never
  edit the event tree itself. [revolutions §11; README]
- REVO-081 If the build finds a layer error, then it shall report it (current result: 0 layer errors; event
  tree validator on the merged copy: 0 errors, the same 21 warnings). [revolutions §11; validation_report.md]

### 5.15 In the game (first slice, milestone 6)

- REVO-082 Every realm shall carry one revolution card, played by the catalogue's two oldest families (D-REVO-17): **Estates and towns** while the realm is a monarchy (a form of the *Rule by a house* family) and no hunger sign is lit, else **Peasant and agrarian**. Its six signs read the game's own stats: *Heavy taxes* in a quarter of the realm; *Hungry* in a fifth; a tenth of the realm rioting or plotting; two or more lords Wavering or worse; debt above a year's income; a rising holding the realm's land, or rebels who won against it in the last 5 years. `need` 3 and `warn_at` 2; under the reaction regime `need` is one lower for 20 years (REVO-051). [REVO-001, REVO-004, REVO-011, REVO-014, D-REVO-17]
- REVO-083 Each month, after the risings step, the game shall work out every realm's signs and stage (Quiet, Brewing, Ready, or Stopped while a grace period runs). A Ready card breaks out on a monthly roll of 1 in 12 (`mean_years` 1), doubled by the spark "A great lord turns against the court" (two or more lords Disloyal or worse), never in the month it became Ready and never within 3 years of the last revolution, Bend or crushed rising. [REVO-007, REVO-008, REVO-009, REVO-033, D-REVO-17]
- REVO-084 When a realm's revolution breaks out, its ruler shall take one of three stances with the family's labels. **Estates**: Lead *Share power* applies `town_league` (diet monarchy; crushing taxes locked); Bend *Grant charters* fixes the tax at light for 10 years in every province with *Heavy taxes* and stops the revolution; Fight *Break them* raises a Town rising tagged with the revolution. **Agrarian**: Lead *Divide the land* applies `agrarian_reform` (granting fiefs and selling titles locked; every lord loses a loyalty step for the land he gives up); Bend *Cut taxes and open the granaries* fixes the tax at light for 10 years where it is heavy and opens the castle granaries (4 months) where people are hungry, and stops it; Fight *Crush the bands* raises a Hunger rising tagged with the revolution. A tagged rising starts in the realm's most restless province with twice a rising's first muster. [REVO-018 … REVO-021, REVO-025, REVO-032, D-REVO-17]
- REVO-085 When a tagged rising wins, the game shall apply its family's won regime: `estates_republic` (merchant republic, the ruler elected by the estates) or `new_dynasty` (form kept, the rising's leader rules, the old house abroad as pretenders, every lord Wavering, tax light everywhere for 10 years). When it is scattered, bribed away, starves or melts away, the game shall apply `reaction` (form kept, *Bloodshed* in its provinces, `need` one lower for 20 years) and re-arm it; when its demand is granted or talked out, it is stopped with no regime. [REVO-021, REVO-024, REVO-037, REVO-046, REVO-051]
- REVO-086 When an ordinary rising wins against a realm (not a homeland rising that breaks away), the game shall light the rebels sign; if the realm's card is then Ready, or the rebels hold the capital's castle, and no grace period runs, the revolution has won at once: the family's won regime applies with the rising's leader as the new ruler. [D-REVO-17]
- REVO-087 A regime shall set its form through government without making it the old form (D-GOV-9), keep the officials and lords caps the form's (REVO-044), and its locks shall refuse the order with "Locked by the revolution": `crushing_taxes` (a tax set to crushing), `grant_fief`, `seize_land`, `hire_companies` and `massacre` (the verdict). The other locks of a regime are listed but have no order in the game yet. [REVO-040, REVO-041, REVO-047]
- REVO-088 The AI shall take a stance by weight: Fight 50, Bend 30, Lead 20, Fight ×1.5 when its armies outnumber the rising it would raise and ×0.5 otherwise. [REVO-071, D-REVO-17]
- REVO-089 Revolution cards, grace periods, regimes, rulers, locks and the tagged risings shall be kept in the save and the world's hash. [SAVE]

#### How the player uses it
- REVO-090 Where: the top bar's **Stability** plaque carries a mark while the player's card is amber (a revolution brewing) or red (it may break out any month); its label lists the lit signs, and tapping it opens the General tab, where the **Revolution** block sits under the four pillars: the family and its idea, a bar of lit signs against `need`, the signs lit first, each with how to ease it and the tab that eases it as a button, the spark, the monthly chance when Ready, "Stopped, not solved" with the year the grace ends, and a fold "What happens if it breaks out" with the three stances and the regime each leads to. When nothing is lit the block is one quiet line. [X-19, REVO-001 … REVO-006, REVO-078]
- REVO-091 When the player's revolution breaks out, a **full-screen choice card** covers the map: the revolution's name and idea, the signs that lit it, and the three stances as 44-point buttons, each with its consequences (form, ruler, laws locked, or what Bend gives up and that it can come back; Fight with the men it would raise). It cannot be folded away or skipped: End turn waits on it, like an unanswered event. The result of the struggle comes as an alert over the map with Go there. [X-19, REVO-007, REVO-018]
- REVO-092 The **Government** tab shows the regime under the form: its name and loop line, since when, the ruler (the house of 1444, a new ruler from the rising with the old house abroad, or elected), the form before the revolution, and its locks greyed out with "Locked by the revolution"; the locked buttons elsewhere (crushing tax, grant or seize a fief, hire a company, Massacre) say the same. [X-19, REVO-077]
- REVO-093 Another realm's revolution breaking out or ending shows a **news line** in Dispatches for the player's neighbours (a shared border), naming the realm, the stance or result and its new form; it opens that realm's card. Phone: the Revolution block and the regime card fit the side panel in the Wide and Tall layouts with nothing sideways-scrolling; the choice card fills the safe area in landscape and portrait, its buttons stack in one column on a narrow screen, at least 44 points high, and nothing needs hover. [X-19, REVO-075, SHELL-108, SHELL-109]

## 6. Commands

| Command | Who issues it | Preconditions | Result | Events emitted |
|---|---|---|---|---|
| EaseSign(country, sign, action) | player / AI | Card shown; the ease uses an existing action owned by another context (tax, granary, stability …) | Sign may go dark | SignChanged |
| ChooseStance(event, option) | player / AI (the option's chooser) | Revolution event fired | Lead, Bend, Fight or Path effects | RevolutionOutbreakAnswered |
| UseDecree(country, decree, target?) | player / AI | Regime grants the decree; cost payable; limit not reached | Decree effect | DecreeUsed |
| FundRevolution(funder, target, revolution) | player / AI (action owned by diplomacy) | Target's card at least Brewing; funder has a diplomat there | `revolution_funded` set; gold each month | RevolutionFundingStarted |
| StopFunding(funder, target) | player / AI | Funding running | Flag cleared | RevolutionFundingStopped |

## 7. Domain events

| Event | When | Payload | Consumed by (context) |
|---|---|---|---|
| RevolutionStageChanged | Quiet ↔ Brewing ↔ Ready, re-armed, disarmed | country, revolution, stage | map-presentation, AI, diplomacy (funders' view) |
| RevolutionBrokeOut | The event fires | country, revolution | game-shell (banner), events, audio (`revolution` music tag) |
| RevolutionRisingRaised | A Fight option raises tagged rebels | country, revolution, rising | rebellions |
| RevolutionSettled | Tagged rising won or crushed | country, revolution, outcome | events (effect tiers), game-shell (banner) |
| RegimeApplied | `regime` effect | country, regime, form, flags | government, diplomacy, realm, province, religion, culture, warfare, national-strengths |
| ActionLocked | `lock` effect or regime lock | country, action | realm, province, warfare, rebellions, religion |
| RevolutionRearmed | Stopped by Bend, crushed, or path with no regime | country, revolution, grace end | AI, game-shell |
| WaveSpread | A won revolution's family wave | revolution, kind, id, amount, where | events (ideology), religion (faith wave), province (grievances) |
| RevolutionFundingCaught | Caught roll succeeds | funder, target | diplomacy |

## 8. Policies (reactions to other contexts)

- When a grievance, class share, lord loyalty, debt, stability, ideology share or war outcome changes (province,
  realm, events, diplomacy, warfare), then re-evaluate the signs and stage.
- When a tagged rising wins (rebellions), then apply the raising option's `rising_won`.
- When a tagged rising is beaten or melts away (rebellions), then apply `rising_crushed`.
- When a country gains G14 Written constitution (research), then a regime held with `form_before_g14` may use its
  full form (D-REVO-12).
- When diplomacy's funding is caught, then end `revolution_funded` and name the funder on the card.
- When a revolutionary regime applies, religion's `revolution_and_the_church` and
  `separation_of_church_and_state` may follow (owned by religion; their requirements can read
  `revolutionary_regime`).

## 9. Monthly steps

Reads first: grievances per province, class shares, lords and loyalty, debt, stability, legitimacy, ideology
and faith shares, wars lost, colonies, funding state.

1. Evaluate requirements and signs for every revolution and country; set stages and card colour.
2. For Ready revolutions, the events context rolls the event's selection (`mean_years` × sparks).
3. Tick re-arm grace periods.
4. Charge funding gold; roll the caught chance.
5. Apply delayed regimes (`after_years`).
6. Decree limits tick (once per season, harvest, years).

These run in the turn in which a new month begins (X-18). A revolution never fires in the month its last needed sign lit (REVO-008). The global order is time-and-turns'.

## 10. Configuration

### 10.1 Balance values (all placeholders)

| Key | Meaning | Value in the design | Placeholder? | Config file |
|---|---|---|---|---|
| revolutions.<id>.signs.need | Signs to break out | per revolution (10.4) | yes | data/revolutions.yaml |
| revolutions.<id>.signs.warn_at | Signs for amber | per revolution | yes | data/revolutions.yaml |
| revolutions.<id>.sparks[].mult | Spark multipliers | per revolution | yes | data/revolutions.yaml |
| event `selection.mean_years` | Expected wait once ready | per event | yes | event tree |
| rearm.grace_years | Re-arm grace period | 3 years | yes | data/reference.yaml |
| families.<id>.camps.revolution.joins | Join shares | REVO-030 | yes | data/families.yaml |
| families.<id>.wave.amount | Wave amount | REVO-055 | yes | data/families.yaml |
| counter_revolution.years | Counter-revolution reason length | 25 years (proposed) | yes | not named |
| counter_revolution.opinion | Opinion malus | −50 (proposed) | yes | not named |
| generals.too_big_mult | General multiplier in revolutionary republics | ×2 (proposed) | yes | not named |
| emigre.funding_per_year | Émigré funding per year | not given | yes | not named |
| foreign_backing.mult | Spark multiplier while funded | 2 | yes | data/reference.yaml |
| foreign_backing.joins_mult | Join multiplier while funded | 1.5 | yes | data/reference.yaml |
| foreign_backing.cost | Monthly cost | 1 % of target's yearly income | yes | revolutions-design §7.1 |
| foreign_backing.catch_chance | Chance caught per month | 3 % | yes | revolutions-design §7.1 |
| foreign_backing.win_opinion | Opinion of funder after win | +25 | yes | revolutions-design §7.1 |
| reaction.need_reduction | Lower `need` under reaction | 1 sign for 20 years | yes | data/regimes.yaml |

### 10.2 The 33 regimes (data/regimes.yaml)

| Regime | Form | Ruler | Decrees | Locks | Grievances end / add | Flags | Abroad (short) | Risk (short) |
|---|---|---|---|---|---|---|---|---|
| league_of_the_faithful | holy_rule | replaced | call_the_faithful | grant_fief, sell_title, crushing_taxes | − harsh_lord | revolutionary_regime | neighbours' lords −30 | wars of conquest need half the temple elders |
| qizilbash_order (Order state) | holy_rule | replaced | convert_by_decree | – | + wrong_faith | revolutionary_regime | other branch: holy-war reason | a lost battle the ruler leads: every chief wavers |
| reformist_caliphate | holy_rule | replaced | appoint_emir, call_the_faithful | sell_title | – | revolutionary_regime | same-faith rulers get reason to resist; reformers abroad +0.05 | far governors drift after 30 years |
| heavenly_kingdom | holy_rule | replaced | sacred_treasury, open_the_granaries | grant_fief, sell_title | − harsh_lord, hungry; + wrong_faith | revolutionary_regime | other-faith neighbours −50 | each decade a split roll (pretender rising) |
| mahdiyya | holy_rule | replaced | call_the_faithful, sacred_treasury, gather_the_tribes | hire_companies | − heavy_taxes, foreign_rule | revolutionary_regime | old ruler and overlord −50, reason 20 years | the Mahdi may die; famine risk doubles |
| town_league | diet_monarchy | kept | ask_the_towns, call_the_assembly | revoke_charter, crushing_taxes | − broken_charter | revolutionary_regime | crowns with restless towns −20 | towns refuse far wars |
| estates_republic | merchant_republic | elected | sell_bonds, charter_a_company, ask_the_towns | crushing_taxes | − broken_charter | revolutionary_regime | trade cities, republics +20 | a stadholder event |
| commonwealth | constitutional_republic | deposed | army_council, sell_church_lands | call_the_lords | – | revolutionary_regime, emigre_court | monarchies −40, counter-revolution 20 years | generals ×2; Protector → court_absolutism or restored_monarchy |
| crown_and_assembly | constitutional_monarchy (diet_monarchy before G14) | kept | call_the_assembly, sell_bonds | crushing_taxes | − broken_charter | revolutionary_regime | same regime +15 | 3 refused votes in 10 years: coup (reaction spark) |
| court_absolutism | absolute_monarchy | kept | summon_to_court, intendants | – | – | reaction_regime | none | child ruler or regency: lords' rising spark |
| princes_compact | elective_monarchy | kept | – | seize_land | – | – | rivals bribe lords at half price | any crisis is a lords' rising |
| federal_republic | constitutional_republic | elected | call_the_assembly, settle_the_frontier | grant_fief, sell_title, crushing_taxes | − harsh_lord, ungoverned | revolutionary_regime | old colonial powers −20 for 20 years | separatist sign from one region's wares |
| revolutionary_republic | constitutional_republic | deposed | levy_en_masse, sell_church_lands, revolutionary_tribunal | grant_fief, sell_title, call_the_lords | − harsh_lord, wrong_faith; + broken_charter | revolutionary_regime, emigre_court | monarchies −50, counter-revolution 25 years | generals ×2 |
| free_republic | constitutional_republic | replaced | arm_the_people, divide_the_estates | grant_fief, sell_title | − harsh_lord | revolutionary_regime | slave-holders −60, no trade pacts 30 years, indemnity event | trade income halves while unrecognised |
| creole_republic | constitutional_republic | elected | caudillos_pact, call_the_assembly | – | – | revolutionary_regime | old crown: reconquest reason 15 years | a general seizes the presidency |
| parliamentary_republic | constitutional_republic | deposed | call_the_assembly, sell_bonds | grant_fief, sell_title | − harsh_lord | revolutionary_regime, emigre_court | parliamentary countries +15 | extremist risings in a crisis |
| committee_rule | constitutional_monarchy + army power base | kept | officers_to_the_provinces, call_the_assembly | – | + foreign_rule | revolutionary_regime | none | other languages' separatist signs faster |
| warlord_republic | constitutional_republic | elected | buy_a_warlord, caudillos_pact | – | – | revolutionary_regime | foreign powers back warlords | warlords fight each other |
| secular_republic | party_state | elected | script_and_schools, sell_church_lands | grant_fief, sell_title | + wrong_faith | revolutionary_regime | none | faith rising sign for 20 years |
| agrarian_reform | keep | kept | divide_the_estates | grant_fief, sell_title | − harsh_lord | revolutionary_regime | foreign estate owners −30 | landowners fund risings 20 years |
| new_dynasty | keep | replaced | open_the_granaries | – | − heavy_taxes, hungry | emigre_court | tributary overlords may demand recognition | old heirs pretenders 50 years |
| peasant_directorates | keep | kept | local_directorates | – | − heavy_taxes, harsh_lord | – | neighbours: intervention hook | dissolving: *Broken charter* in every risen province |
| emancipation (add-on) | – | – | – | – | − harsh_lord | – | none | lords waver one step at once |
| swarajya | household_realm | replaced | protection_tribute, garrison_hill_forts | grant_fief, sell_title | – | – | old empire −50, reason 30 years | may become a confederation |
| khalsa_raj | absolute_monarchy | replaced | hire_drill_masters, summon_to_court | persecute | − wrong_faith | – | none at first | at the ruler's death councils may rule |
| misl_confederacy | confederation | elected | protection_tribute | grant_fief, sell_title | – | – | none | 10 years without war: a chief may turn Disloyal |
| service_state | absolute_monarchy | kept | table_of_ranks, missions_abroad | – | + conscription | – | none | old-order rising within 10 years |
| restoration_state | constitutional_monarchy | kept | abolish_domains, missions_abroad | grant_fief, sell_title, call_the_lords | + conscription | revolutionary_regime | none | retainers rise once within 10 years |
| military_kingdom | keep | kept | call_the_age_regiment | – | – | – | neighbours −20 | discontent in long peace |
| regional_armies | keep | kept | raise_provincial_army | – | – | – | none | governors become warlords |
| soviet_state | party_state | deposed | requisition_grain, revolutionary_tribunal, levy_en_masse, divide_the_estates | grant_fief, sell_title, call_the_lords, hire_companies | − harsh_lord; + requisitioned | revolutionary_regime, emigre_court | non-communists −60, intervention 5 years | civil war; famine if requisition meets a failed harvest |
| reaction | keep | kept | censorship | – | + bloodshed | reaction_regime | other crowns +20 | `need` one lower for 20 years |
| restored_monarchy | old_form | replaced | – | – | – | reaction_regime; clears revolutionary_regime, emigre_court | monarchies +30; counter-revolution reason ends | revoking charters can re-fire the revolution |

The lords, church, faith, language, levy, land, towns, trade and research lines and the full `loop` sentence of
each regime are in data/regimes.yaml and are part of the regime (REVO-039, REVO-050).

### 10.3 The 34 decrees (data/decrees.yaml)

| Decree | Card | Cost | Limit |
|---|---|---|---|
| call_the_faithful | country | no gold; 1 stability | once every 5 years |
| convert_by_decree | province | gold by the province's people | one province at a time |
| appoint_emir (Appoint a governor) | province | gold gift | when a governor dies or is removed |
| sacred_treasury | country | each province's surplus food | each harvest |
| open_the_granaries | province | castle store food | any time |
| ask_the_towns | country | a town charter promise | once every 3 years |
| call_the_assembly | country | one season | any time |
| sell_bonds | country | interest each year | up to the loan limit |
| charter_a_company | country | gold and two merchants | one per ocean |
| army_council | country | none | any time |
| sell_church_lands | country | clergy and Pious lords waver | once |
| levy_en_masse | country | *Conscription* everywhere for 3 years | while at war |
| revolutionary_tribunal | country | *Bloodshed* in the provinces of those tried | any time |
| arm_the_people | country | tools and old weapons only | defensive wars |
| divide_the_estates | province | the lord or owner turns Disloyal | one province a season |
| settle_the_frontier (Open the frontier) | country | Indigenous homelands get *Foreign rule* and a resistance | any time |
| caudillos_pact (General's pact) | country | provinces granted | any time |
| summon_to_court | country | gold for the court each year | any time |
| intendants | province | an official's wage | one per lord |
| censorship | country | scholars −10 % a year while on | toggle |
| local_directorates | province | no tax rise there | risen provinces only |
| abolish_domains | country | pensions: each lord's yearly income for 20 years | once |
| missions_abroad | country | gold and two scholars | once every 10 years |
| table_of_ranks (Ranks for service) | country | none | toggle |
| call_the_age_regiment | country | births −10 % while serving | one age set at a time |
| officers_to_the_provinces | country | commanders taken from the army | any time |
| buy_a_warlord | country | gold by the warlord's army | any time |
| requisition_grain | country | *Requisitioned* in every farming province | each harvest |
| script_and_schools | country | research −25 % for 5 years | once |
| raise_provincial_army | province | the official becomes a lord with a retinue | any time |
| gather_the_tribes | province | the province loses a third of its people; its lord's retinue moves | once every 5 years |
| protection_tribute | province | the owner's opinion −20 | neighbouring provinces only |
| garrison_hill_forts | province | gold for each fort's three officers | hill and mountain provinces |
| hire_drill_masters | country | gold each year; Proud lords waver | up to 3 at once |

What each decree does is the `does` line in data/decrees.yaml (REVO-054).

### 10.4 The 36 revolutions (generated/revolution_catalogue.md)

| # | Revolution | Years | Family | Event | Breaks out at |
|---|---|---|---|---|---|
| 1 | The Kaga league | 1488–1580 | Faith | kaga_ikko_ikki (new) | 3 of 5 |
| 2 | Rise of the Safavids | 1501–1510 | Faith | safavid_rise | 3 of 5 |
| 3 | Founding of the Khalsa | 1699 | Faith | khalsa_founded | 2 of 5 |
| 4 | Futa Jallon jihad | 1725–1750 | Faith | futa_jallon_jihad | 2 of 3 |
| 5 | Sokoto jihad | 1804–1812 | Faith | sokoto_jihad | 3 of 5 |
| 6 | Taiping Rebellion | 1850–1864 | Faith | taiping_rebellion | 3 of 5 |
| 7 | Mahdist state in Sudan | 1881–1898 | Faith | mahdist_state | 3 of 5 |
| 8 | Revolt of the Comuneros | 1520–1521 | Estates and towns | comuneros_revolt (new) | 3 of 5 |
| 9 | Dutch Revolt | 1568–1648 | Estates and towns | dutch_revolt | 2 of 5 |
| 10 | Wars of the Three Kingdoms | 1639–1651 | Estates and towns | wars_of_the_three_kingdoms | 3 of 5 |
| 11 | The Fronde | 1648–1653 | Estates and towns | fronde (new) | 3 of 6 |
| 12 | Glorious Revolution | 1688–1689 | Estates and towns | glorious_revolution | 2 of 3 |
| 13 | Restoration of the Stuart monarchy | 1660 | Restorations | restoration_of_charles_ii | 2 of 3 |
| 14 | American Revolution | 1775–1783 | Liberal and national | american_revolution | 3 of 6 |
| 15 | French Revolution | 1789–1799 | Liberal and national | french_revolution | 4 of 6 |
| 16 | Spanish American wars of independence | 1810–1826 | Liberal and national | latin_american_independence | 1 of 4 |
| 17 | Revolutions of 1848 | 1848–1849 | Liberal and national | revolutions_of_1848 | 2 of 4 |
| 18 | The Iranian constitutional revolution | 1905–1911 | Liberal and national | iranian_constitutional_revolution (new) | 3 of 5 |
| 19 | Young Turk Revolution | 1908 | Liberal and national | young_turk_revolution | 1 of 3 |
| 20 | Xinhai Revolution | 1911–1912 | Liberal and national | xinhai_revolution | 3 of 4 |
| 21 | The Egyptian revolution of 1919 | 1919–1922 | Liberal and national | egyptian_revolution_1919 (new) | 3 of 5 |
| 22 | Haitian Revolution | 1791–1804 | Freedom | haitian_revolution | 1 of 4 |
| 23 | Shivaji's coronation | 1674 | Homeland | shivaji_coronation | 2 of 5 |
| 24 | Ranjit Singh's Sikh Empire | 1799–1849 | Homeland | sikh_empire_founded | 2 of 5 |
| 25 | Fall of Beijing and the Qing conquest | 1644 | Peasant and agrarian | fall_of_beijing_1644 | 3 of 5 |
| 26 | The Tay Son uprising | 1771–1802 | Peasant and agrarian | tay_son_uprising (new) | 3 of 5 |
| 27 | The Donghak peasant revolution | 1894–1895 | Peasant and agrarian | donghak_revolution (new) | 3 of 5 |
| 28 | Mexican Revolution | 1910–1920 | Peasant and agrarian | mexican_revolution | 2 of 3 |
| 29 | Petrine reforms | 1689–1725 | From above | petrine_reforms | 1 of 4 |
| 30 | Rise of the Zulu kingdom | 1816–1828 | From above | rise_of_the_zulu_kingdom | 1 of 2 |
| 31 | Meiji Restoration | 1867–1871 | From above | meiji_restoration | 3 of 4 |
| 32 | The Kemalist reforms | 1922–1934 | From above | kemalist_reforms (new) | 2 of 3 |
| 33 | The revolution of 1905 | 1905–1907 | War and want | russian_revolution_1905 (new) | 3 of 6 |
| 34 | Russian Revolution | 1917 | War and want | russian_revolution | 3 of 5 |
| 35 | Armistices of 1918 | 1918 | War and want | armistice_1918 | its existing trigger |
| 36 | Restoration of the old dynasty | 1660–1815 | Restorations | restoration_of_the_old_order (new) | 2 of 5 |

### 10.5 Families (data/families.yaml)

| Family | Cause | Stance labels (lead / bend / fight) | Wave |
|---|---|---|---|
| faith | faith | Take up the new teaching / Tolerate the movement / Suppress it | religion 0.05 neighbours |
| estates | town | Share power / Grant charters / Break them | parliamentarism 0.03 neighbours |
| liberal_national | new_ideas | Proclaim the new order / Grant a constitution / Restore order | liberalism 0.05 neighbours |
| freedom | homeland | Abolish and free / Grant autonomy / Send an army | abolitionism 0.10 region |
| agrarian | hunger | Divide the land / Cut taxes and open the granaries / Crush the bands | none (Neighbour in revolt) |
| from_above | lord | Start the reforms / Reform the army only / Keep the old ways | none |
| homeland | homeland | Grant the region its own crown / Give its leader high rank / Send the imperial army | none (Foreign rule in neighbours held by distant empires) |
| socialist_defeat | new_ideas | Hand power to the councils / Promise an assembly / Send in the troops | socialism 0.05 region |
| restoration | pretender | Recall the dynasty / Restore with a charter / Defend the revolution | none |

## 11. Seams

| Other context | Direction | Pattern | What crosses |
|---|---|---|---|
| events | upstream | Conformist | Revolutions are events: availability, roles, selection, options, effect tiers; this context adds conditions `grievance`, `class_share`, `lords`, `war_lost`, effects `regime`, `lock`, param `rebels.revolution`, tiers `rising_won` / `rising_crushed`, event field `revolution` (with `rearm`), flags `revolutionary_regime`, `emigre_court`, `reaction_regime`, `revolution_funded`, areas `hokuriku`, `old_castile`, 6 entities, 7 unverified sources, 26 extended and 10 new events (patch not yet merged) |
| rebellions | downstream | Customer–Supplier | Tagged risings; camps replace the join table; won / crushed hook; rising causes from families |
| government | downstream | Customer–Supplier | Regimes set forms from `government.yaml` forms (any era), `old_form`, `form_before_g14`, `power_base_add` (D-REVO-2) |
| diplomacy | downstream / upstream | Partnership | "Different form of rule −20"; counter-revolution war reason; one-off opinion changes; fund-a-revolution action and caught reason (D-REVO-1) |
| subjects | upstream | Customer–Supplier | Settler independence via a Disloyal Settled or Self-governing colony, `release`, `change_subject_kind`; requested condition "a colony of who is Disloyal" (D-REVO-5) |
| culture | upstream | Customer–Supplier | Nationalism thresholds 0.3 / 0.5 read by liberal and national signs; creole languages; `set_court_tongue` used by regimes |
| religion | downstream | Customer–Supplier | Faith family wave uses `faith_wave`; `revolution_and_the_church`, `separation_of_church_and_state` follow regimes and read `revolutionary_regime` |
| national-strengths | downstream | Customer–Supplier | Hook only: a won revolution can shed a burden or grant a legacy (which ones: D-REVO-6) |
| warfare | downstream | Customer–Supplier | Generals too big ×2 in revolutionary republics; a winning general switches regime |
| province | upstream | Customer–Supplier | Grievances and class shares read by signs; regimes end and add grievances; locks of crushing_taxes and revoke_charter |
| realm | upstream / downstream | Customer–Supplier | Lords' loyalty and land read by signs; regimes change lords; locks of grant_fief, sell_title, seize_land; stability, debt |
| research | upstream | Customer–Supplier | G14 Written constitution decides `form_before_g14` |
| map-presentation | downstream | Published Language | Revolution lens; risen provinces hatched |
| game-shell | downstream | Published Language | Banner; card; regime card on the government screen |
| audio | downstream | Published Language | `revolution` music tag on revolution events |

## 12. AI

As REVO-070 to REVO-074: the AI eases signs by personality when the card is amber or red; weights historical
options ×3, Fight by army strength against the rising's expected size, Lead when its ideology matches the
cause; funds its pretender abroad from an émigré court; uses the counter-revolution reason when stronger; funds
revolutions in non-allied rivals whose cards are amber or red.

## 13. Decisions and open questions

Decided on 17 October 2026 under DECISIONS.md (latest decision wins, simpler rule, no new mechanics, provisional numbers in the context's data JSON).

- **D-REVO-1** (was OQ-REVO-1) Funding: X-10. One action, *Fund rebels*, owned by diplomacy, with revolutions §7.1's numbers: gold each month = 1 % of the target's yearly income, sparks ×2, joins ×1.5, a win gives +25 opinion; caught 3 % a month; being caught gives the target the caught war reason. Diplomacy 6.11's numbers are dropped.
- **D-REVO-2** (was OQ-REVO-2) References to power bases, service grants, the "three reigns" reform and forced changes are dropped from the regimes (`committee_rule` loses `power_base_add`; `reformist_caliphate` and `qizilbash_order` keep only their form). Government v2 is the later design.
- **D-REVO-3** (was OQ-REVO-3) X-9: a province whose castle a revolution camp holds counts as Risen. A revolution's rising starts at the *Rising* tier; its men are the event's `size` × the province's recruit pool, split by the camps' join shares (D-REBL-4, D-REBL-5).
- **D-REVO-4** (was OQ-REVO-4) Signs read the concrete stats the country-stats §11 and province §15 mappings give (debt in gold, grievance counts, lords' loyalty, literacy as school seats); `integration_strain` reads the share of the realm's provinces with *Foreign rule*. One mapping, no new stat.
- **D-REVO-5** (was OQ-REVO-5) Colony signs read the colony's loyalty to its overlord from subjects (Disloyal); subjects already has loyalty steps (X-8).
- **D-REVO-6** (was OQ-REVO-6) Regimes grant or shed no national strengths; the hook is dropped. No new mechanic.
- **OQ-REVO-7** (release task) The seven new sources in additions.yaml are `verified: false`; checking them is a source review, not code.
- **D-REVO-8** (was OQ-REVO-8) Counter-revolution: each regime's own length and malus is used, as a one-off reason row that replaces diplomacy's −20 row (no stacking); regimes without their own take the global 25 years and −50. Per-regime values are the later, more specific data.
- **D-REVO-9** (was OQ-REVO-9) Restorations happen only through the events that exist (`restoration_of_the_old_order` 1660–1815 and the regimes' own émigré events); "as often as revolutions" gives no number and adds nothing.
- **D-REVO-10** (was OQ-REVO-10) A family wave is a one-off share change of its `amount` in the realms bordering the revolution's country and in its map macro-region; the faith family uses religion's `faith_wave` with pull 1 per carrier and `amount` ignored. One-off is simpler.
- **D-REVO-11** (was OQ-REVO-11) When an option has `regime`, the regime sets the form and the old `government:` / `unlock:` effects are dropped; `parliamentary_monarchy` maps to constitutional monarchy. One source for the form.
- **D-REVO-12** (was OQ-REVO-12) No: `crown_and_assembly` keeps its form when G14 is gained later. Nothing changes without a cause.
- **D-REVO-13** (was OQ-REVO-13) `armistice_1918` keeps its own trigger, shows no revolution card and is not re-armed. It is a one-time event.
- **D-REVO-14** (was OQ-REVO-14) Yes: a decree whose cost is in its effect (`army_council`, `table_of_ranks`) is enough; the card shows that effect as its cost.
- **D-REVO-15** (was OQ-REVO-15) The revolutions patch is part of the game's event content, read from revolutions' data as written (as D-RELG-10 for religion).
- **D-REVO-16** (was OQ-REVO-16) `from_above` is a decision offered to the ruler once its signs are met; nobody rises. The family's own text says so.
- **D-REVO-17** First game slice (milestone 6, provisional): the 36 catalogue revolutions read ideologies, class shares, legitimacy and ages the game does not track yet, and the first of them opens in 1488. Until they are bridged, every realm plays one revolution by the role-selector rule (REVO-067) built from the two families whose catalogue signs the game can read (the Fronde and the Comuneros for estates, the Tay Son and Donghak risings for agrarian): their signs as REVO-082 lists them, their stances, and the regimes their options name (`town_league`, `estates_republic`, `agrarian_reform`, `new_dynasty`, `reaction`). A won ordinary rising lights the rebels sign and wins the revolution at once when the card is Ready or the capital is taken (REBL-057 "the government changes to theirs"). Regime parts with no game system yet wait on it: decrees, waves, the old order camp, opinion abroad, counter-revolution, generals and grievances the game does not track (*Harsh lord*, *Broken charter*). Rulers are a name and a rule (kept, new, elected) until rulers are built. The numbers sit in revolutions.json `game` as `provisional`.

## 14. Traceability

| Requirement | Feature file | Scenario |
|---|---|---|
| REVO-001 – 006, 078 | revolution-card.feature | Card shown, hidden, ordered, coloured (French Revolution) |
| REVO-007 – 009 | stages.feature | Stages; never the same month; easing stops the roll |
| REVO-010 – 017 | signs-and-trigger.feature | Compiled trigger; new conditions; windows; keep_trigger |
| REVO-018 – 025 | stances.feature | Lead, Bend, Fight, Path; after_years; Bloodshed; labels |
| REVO-026 – 031 | camps.feature | Camps replace the join table |
| REVO-032 – 038 | rearm.feature | Stopped, not solved |
| REVO-039 – 051 | regimes.feature | Regime package, forms, locks, flags, add-ons, reaction |
| REVO-052 – 054 | decrees.feature | Decree buttons, costs, limits |
| REVO-055 – 059 | aftermath.feature | Wave, émigrés, counter-revolution, generals, restoration |
| REVO-060 – 065 | funding-abroad.feature | Funding, caught, win |
| REVO-066 – 069 | catalogue.feature | 36 revolutions; role-based; missing; not a revolution |
| REVO-070 – 074 | revolution-ai.feature | AI eases, chooses, funds |
| REVO-075 – 077 | revolution-ui.feature | Banner, lens, regime card |
| REVO-079 – 081 | data-build.feature | Engine contract and build |
| REVO-082 … REVO-089 | — | Engine: packages/engine/test/revolutions.test.ts (signs, roll and same month, stances, tagged rising won and crushed, rebels win, locks, AI, save) |
| REVO-090 … REVO-093 | — | Presentation: apps/client/src/ui/revolution.ts, the Revolution block, choice card and regime card; screenshots from apps/client/scripts/revolution-shots.mjs |
