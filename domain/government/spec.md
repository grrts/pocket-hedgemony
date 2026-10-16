# Government (GOV)

## 1. Purpose and scope

Government decides how many **officials** and how many **lords** a country can support (the two caps), what
happens when a country goes over a cap, which **government form** a country has, how forms change (reform,
revolution, coup, capital loss, event), and the per-form numbers other contexts read (subject reach change,
colonial range, succession).

**In scope**
- The officials cap and the lords cap, and the buildings' contribution to each (the numbers, not the buildings).
- Over-cap consequences: the *Grasping officials* grievance and New Year loyalty slips.
- The *Great lord* loyalty reason (lord size only affects loyalty).
- The 27 government forms in 6 families and their numbers.
- Reforms (needs, gold, lords slipping), and form changes without a reform.
- The mapping from the event tree's 16 `government` values to forms.
- The 1444 starting form of every catalogue record, and the start of lords and caps.
- The government card.

**Not in scope (owned by …)**
- Building the palace, seat, chancery, court of law, diet hall, hostage residence, examination hall, parliament
  house: their costs, slots, jobs, unlocks (buildings).
- Grievances, riots, officials as people, *Ungoverned* (province).
- Lords, loyalty steps and reasons, rulers, heirs (realm).
- Rebellions and the *New ideas* rising (rebellions); when a revolution happens and which regime it sets
  (revolutions).
- Subject reach and what happens over it (subjects). Colonies, colonial governors (exploration).
- Inventions G1, G3, G4, G9, G11, G14, W12 (research).
- Army coups as an event of the army (warfare); event firing (events).

## 2. Sources

Newest decision first.
1. Gap lists, "Decisions already made" (16 Oct): a revolution can grant a government form before its era.
2. `government/government-design.md` version 2 (all sections 1–8, "Changes in version 2", "Changes needed elsewhere").
3. `government/config/government.yaml` version 2 (caps, buildings, forms, reforms, `revolution_ignores_era`, `event_tree_map`).
4. `government/config/start-forms.yaml`, `government/tools/assign_start_forms.py` (rule order), `government/build/start-forms-summary.md`.
5. Read for seams only: buildings-design 7.7 and 8, subjects-design 6, exploration-design 4.2–4.3, revolutions-design 6 and
   changes-for-other-designs, culture-design 5.1 and 10, religion-design 11, country-stats 8.2, province-stats 12.1.

Version 2 replaces version 1: power bases, seat reach, ruler modifiers and unsettled years are gone, and a lord's
size no longer affects the cap.

## 3. Ubiquitous language

| Term | Meaning | Not to be confused with |
|---|---|---|
| Government form | One of 27 named ways a country is ruled (Feudal realm, Horde, Party state …). Sets the form's part of each cap, subject reach change, colonial range and succession | The event tree's 16 `government` values, which map onto forms |
| Family (of forms) | One of six groups: rule by a house, by citizens, by faith, by kin, by warriors, modern and from abroad | A culture family (culture) or faith family (religion) |
| Officials cap | Form's officials + buildings' officials. Shown as "x of y" | Officials themselves (province) |
| Lords cap | Form's lords + buildings' lords. Each lord counts 1 | Lord loyalty (realm) |
| Over the cap | More officials (or lords) than the cap | — |
| Grasping officials | Grievance put on the province of each official over the officials cap | *Ungoverned* (province) |
| Great lord | Permanent loyalty down reason for a lord with 4–7 provinces (one) or 8+ (two) | Lord counting against the cap (always 1) |
| Subject reach | The subjects cap (subjects design). Start base from the catalogue's `administrative_capacity`; the form adds or takes away | Lords cap |
| Colonial range | How many sea zones from your nearest port or colony you may found a colony; set by the form | Naval reach |
| Succession | How the next ruler is chosen; set by the form | Country stats' former "inheritance law" |
| Reform | A chosen change from one form to one of its next forms; needs items, costs gold, some lords lose a loyalty step | A revolution, coup or event change |
| Next forms | The forms a form can reform into (`next`) | — |
| Self-run | Clan council and chiefdom: their own people run their home provinces | — |
| Start form | A country's form on 1 Jan 1444, from the start-forms rules | — |

## 4. Domain model

### Aggregates

**CountryGovernment** (identity: country id)
- Holds: current form id; the form held before the last revolutionary regime (needed by revolutions' `old_form`, see OQ-GOV-9);
  derived officials cap and lords cap with their breakdown (form part, each building's part, national strengths);
  derived subject reach.
- INV-GOV-1: a country has exactly one government form at any time, from the 27 in config.
- INV-GOV-2: officials cap = form officials + Σ building officials (+ any national-strength additions); lords cap likewise.
- INV-GOV-3: every lord counts exactly 1 toward the lords cap, whatever his number of provinces.
- INV-GOV-4: a colonial governor holding a governor slot is not counted toward the officials cap.
- INV-GOV-5: a reform's target is one of the source form's next forms and matches a reform row in config.
- INV-GOV-6: a country whose form has subject reach `none` (colonial government) can hold no subjects.

**FormCatalogue** (reference data, config `forms`, `reforms`, `event_tree_map`)
- INV-GOV-7: every `next`, reform `from`/`to` and event-map `set` names a form that exists (checked by the start-forms tool).

### Entities and value objects
- **GovernmentForm** (value): id, family, officials, lords, subject_reach (integer or none), colonial_range, succession,
  event_tree value, next forms, self_run flag.
- **ReformRule** (value): from form(s), to form, needs (list of items), gold, lords_slip.
- **CapBuildingContribution** (value): building id, officials by step, lords by step, needs (invention or forms).
- **EventTreeMapping** (value): event value, form to set, `keep_if_in` forms, `before_G14` form.
- **StartFormRule** (value): override, text rule (match, only_types, skip_types), kingdom-by-region, entity type, default.

### Domain services
- **CapCalculator**: computes both caps and the breakdown shown on the card.
- **OverCapEnforcer**: applies *Grasping officials* and New Year loyalty slips.
- **ReformService**: checks needs and gold, changes the form, slips lords.
- **FormMapper**: maps an event-tree `government` value to a form.
- **StartFormAssigner**: the tool order overrides → text rules → kingdom by region → entity type → default.

## 5. Requirements

### 5.1 The two caps
- GOV-001 The government shall set a country's officials cap to its form's officials plus the officials given by its buildings. [government §2; config §1]
- GOV-002 The government shall set a country's lords cap to its form's lords plus the lords given by its buildings. [government §2]
- GOV-003 The government shall count each lord as 1 toward the lords cap, whatever his number of provinces. [government §2]
- GOV-004 While a country is within both caps, the government shall apply no cap consequence. [government §2]
- GOV-005 If a country has more officials than its officials cap, then the government shall give the province of each official over the cap the grievance *Grasping officials*, taking the newest hires first. [government §2; config over_cap.officials]
- GOV-006 When a country is back within its officials cap, the government shall remove the *Grasping officials* grievance it gave. [government §2]
- GOV-007 When a New Year begins and a country has more lords than its lords cap, the government shall make one lord lose a loyalty step for each lord over the cap, choosing lowest loyalty first, then the lord with the most provinces. [government §2; config over_cap.lords]
- GOV-008 The government shall give a lord with 4 to 7 provinces one permanent loyalty down reason *Great lord*, and a lord with 8 or more provinces two. [government §2; config great_lord]
- GOV-009 Where a national strength adds to a country's caps, the government shall include that addition in the cap. [government §8]

### 5.2 Buildings that raise the caps
- GOV-010 The government shall add 6 / 10 / 16 officials and 2 / 4 / 6 lords for a palace at step 1 / 2 / 3. [government §2.1; config buildings.palace]
- GOV-011 The government shall add 2 officials for each seat at step 1 and 4 for each seat at step 2, one seat per town, step 2 needing G11. [government §2.1]
- GOV-012 The government shall add 4 officials for a chancery, which needs G3 Tax registers. [government §2.1]
- GOV-013 The government shall add 2 lords for a court of law, which needs G1 Written law codes. [government §2.1]
- GOV-014 The government shall add 3 lords for a diet hall, which only feudal realm, diet monarchy, elective monarchy and confederation forms may have. [government §2.1; config buildings.diet_hall]
- GOV-015 The government shall add 3 lords for a hostage residence, which only household realm, tribute empire, horde, warlord domain and shogunate forms may have. [government §2.1; config]
- GOV-016 The government shall add 4 officials for an examination hall, which needs G4 Examination system. [government §2.1]
- GOV-017 The government shall add 6 officials for a parliament house, which needs G14 Written constitution. [government §2.1]

### 5.3 Forms and what they set
- GOV-018 The government shall offer exactly the 27 forms in 6 families with the officials, lords, subject reach change, colonial range and succession given in config `forms`. [government §3; config §3]
- GOV-019 The government shall set a country's subject reach to the start base from the catalogue's `administrative_capacity` (very low 2, low 3, moderate 5, high 7, very high 9) plus its form's subject reach change. [government §2, §3; config subject_reach_start]
- GOV-020 If a country's form is colonial government, then the government shall give it no subject reach (it cannot hold subjects). [government §3 "none"; config]
- GOV-021 The government shall set a country's colonial range, in sea zones from its nearest port or colony, from its form. [government §3]
- GOV-022 The government shall set how the next ruler is chosen (succession) from the country's form. [government §3]
- GOV-023 While a country's form is clan council or chiefdom, the government shall mark provinces of its own people as needing no official, so *Ungoverned* never appears there. [government §3; config self_run]
- GOV-024 While a country's form is clan council or chiefdom, the government shall still require an official in provinces of another people. [government §3]
- GOV-025 While a colonial governor holds a governor slot, the government shall not count him against the officials cap. [government §3; config colonial_governors_count_against_officials_cap]
- GOV-026 When a governor's colony is founded, the government shall count him as that colony's official against the officials cap. [government §3]

### 5.4 Reforms
- GOV-027 The government shall let a country reform only into one of its form's next forms, through a reform listed in config `reforms`. [government §4; config §4]
- GOV-028 If a reform's listed needs are not all met, then the government shall refuse the reform. [government §4]
- GOV-029 When a reform passes, the government shall take the reform's gold from the treasury. [government §4]
- GOV-030 If the treasury holds less than the reform's gold, then the government shall refuse the reform. [government §4 "costs gold"]
- GOV-031 When a reform passes, the government shall make the reform's listed number of lords lose a loyalty step. [government §4; config lords_slip]
- GOV-032 When a reform passes, the government shall set the new form, so that both caps, subject reach, colonial range and succession follow the new form from then on. [government §3, §4]
- GOV-033 The government shall use the reform rows of config `reforms` (needs, gold, lords slipping) as the full list of reforms. [government §4 "The full list is in the config"]

### 5.5 Form changes without a reform
- GOV-034 When a revolution or a won *New ideas* rising sets a form, the government shall change the country to that form without a reform. [government §4]
- GOV-035 When a revolution sets a form, the government shall accept it regardless of the era in which the form normally appears. [gap-lists decisions 16 Oct; government §4; config revolution_ignores_era]
- GOV-036 If a country reforms, then the government shall still require the reform's listed items, whatever revolutions have done elsewhere. [government §4]
- GOV-037 When an army coup succeeds, the government shall set the country's form to military junta. [government §4]
- GOV-038 When a shogunate's shogun loses the capital, the government shall break the shogunate into warlord domains. [government §4; config reform shogunate → warlord_domain]
- GOV-039 When an event sets an event-tree `government` value, the government shall set the form given in config `event_tree_map`. [government §5]
- GOV-040 If the event value already fits the current form (the current form is in its `keep_if_in` list), then the government shall leave the form unchanged. [government §5]
- GOV-041 When an event sets `republic` on a country that does not have G14, the government shall set city commune instead of constitutional republic. [government §5; config before_G14]
- GOV-042 When an event changes `admin_capacity`, the government shall apply it to the officials cap. [government §5]

### 5.6 The start in 1444
- GOV-043 The government shall give each catalogue record its start form by the first rule that applies: a hand-set override, then the text rules in order on the catalogue's government form text, then (for entity type kingdom) kingdom by region, then the entity type table, then the default chiefdom. [government §6; start-forms.yaml; assign_start_forms.py]
- GOV-044 Where a text rule has `only_types`, the government shall apply it only to those entity types; where it has `skip_types`, never to those. [start-forms.yaml]
- GOV-045 Where a kingdom lies in a region whose rule depends on detail tier (Southeast Asia), the government shall give tier A and B kingdoms tribute empire and tier C kingdoms paramount chiefdom; a kingdom in a region with no rule gets feudal realm. [start-forms.yaml kingdom_by_region; assign_start_forms.py]
- GOV-046 The government shall start each country with the catalogue's historical houses as lords, and a country with only one province with no lords. [government §6; config start.lords]
- GOV-047 The government shall derive each country's 1444 caps from its start form and the start buildings set by the buildings design (15.2). [government §6]
- GOV-048 The government shall start no country in absolute monarchy, constitutional monarchy, constitutional republic, military junta, party state or company rule. [start-forms-summary]

### 5.7 What the player sees
- GOV-049 The government shall show a government card with the form and ruler, each cap as "x of y" with its parts (form, each building), subjects as "x of y", the next forms with each need met or not, and a Reform action. [government §1]

## 6. Commands

| Command | Who issues it | Preconditions | Result | Events emitted |
|---|---|---|---|---|
| `Reform(country, toForm)` | player / AI | `toForm` in current form's next forms; a matching reform row; all needs met; gold ≥ reform gold | Form changes; gold paid; listed lords slip | `GovernmentFormChanged(cause=reform)`, `LordsSlippedOnReform` |
| `SetFormByRevolution(country, form)` | system (revolutions) | A revolutionary regime or won *New ideas* rising | Form set, era ignored; previous form remembered | `GovernmentFormChanged(cause=revolution)` |
| `SetFormByCoup(country)` | system (warfare / events) | A successful army coup | Form becomes military junta | `GovernmentFormChanged(cause=coup)` |
| `BreakShogunate(country)` | system | Form is shogunate and the shogun lost the capital | Form becomes warlord domain(s) | `GovernmentFormChanged(cause=capital_lost)` |
| `ApplyEventGovernment(country, value)` | system (events) | An event effect sets a `government` value | Mapped form, or unchanged if it fits | `GovernmentFormChanged(cause=event)` (only on change) |
| `AssignStartForms()` | system (setup) | Catalogue loaded | Start form per record | `StartFormsAssigned` |

## 7. Domain events

| Event | When | Payload | Consumed by |
|---|---|---|---|
| `GovernmentFormChanged` | Any change of form | country, old form, new form, cause | subjects, exploration, realm, culture, religion, revolutions, events, map-presentation |
| `CapsChanged` | A form, building or strength change alters a cap | country, officials cap, lords cap | province, realm |
| `OfficialOverCap` / `OfficialBackUnderCap` | Officials exceed / fall back within the cap | country, official, province | province (grievance *Grasping officials*) |
| `LordsOverCapAtNewYear` | New Year with lords over the cap | country, lords chosen, steps | realm (loyalty) |
| `LordsSlippedOnReform` | A reform passes | country, number of lords | realm |
| `GreatLordReasonsChanged` | A lord's province count crosses 4 or 8 | lord, reasons | realm |
| `StartFormsAssigned` | Setup | record → form, rule used | scenario-setup |

## 8. Policies (reactions to other contexts)
- When a building that adds to a cap is built, upgraded or lost (buildings), then GOV recomputes the caps.
- When an official is hired or leaves (province), then GOV re-checks the officials cap.
- When a lord gains or loses provinces (realm), then GOV updates his *Great lord* reasons.
- When a lord is created or removed (realm), then GOV re-checks the lords cap (consequence only at New Year).
- When a colony is founded (exploration), then GOV counts its governor against the officials cap.
- When a revolutionary regime or won *New ideas* rising sets a form (revolutions / rebellions), then GOV sets it, era ignored.
- When an army coup succeeds (warfare / events), then GOV sets military junta.
- When a shogunate loses its capital (warfare), then GOV breaks it into warlord domains.
- When an event effect sets a `government` value or changes `admin_capacity` (events), then GOV applies the mapping.
- When a prince-bishopric's or military order's ruler takes a reformed faith (religion), then the reform to feudal realm becomes possible.

## 9. Monthly turn
- Each month: recompute caps after buildings and hiring have resolved; apply or lift *Grasping officials*.
- At New Year: apply lords-over-cap loyalty slips (after lords and provinces for the year are settled; realm then applies loyalty).
- On demand: reforms are orders resolved when issued (gold must be available).
- Depends on: buildings (steps), province (officials), realm (lords and their provinces), research (inventions), exploration (colonies).

## 10. Configuration

All numbers are placeholders (government.yaml header: "Every number is a placeholder for balancing").

| Key | Meaning | Value in the design | Placeholder? | Config file |
|---|---|---|---|---|
| `colonial_governors_count_against_officials_cap` | Governors in a slot count? | false | yes | government.yaml |
| `over_cap.officials.grievance` | Grievance per official over | grasping_officials | yes | government.yaml |
| `over_cap.lords.when` / `slips_per_lord_over` / `order` | New Year; 1 per lord over; lowest loyalty then most provinces | new_year; 1; [lowest_loyalty, most_provinces] | yes | government.yaml |
| `great_lord` | Provinces → down reasons | 4–7 → 1; 8–999 → 2 | yes | government.yaml |
| `subject_reach_start` | By `administrative_capacity` | very_low 2, low 3, moderate 5, high 7, very_high 9 | yes | government.yaml |
| `start.form` / `start.lords` | Start rules | historical from start-forms.yaml; historical houses, none with one province | yes | government.yaml |
| `buildings.palace` | officials / lords by step | [6,10,16] / [2,4,6] | yes | government.yaml |
| `buildings.seat` | officials by step | [2,4], one per town | yes | government.yaml |
| `buildings.chancery` | officials, needs | 4, G3 | yes | government.yaml |
| `buildings.court_of_law` | lords, needs | 2, G1 | yes | government.yaml |
| `buildings.diet_hall` | lords, forms | 3; feudal, diet, elective, confederation | yes | government.yaml |
| `buildings.hostage_residence` | lords, forms | 3; household, tribute, horde, warlord, shogunate | yes | government.yaml |
| `buildings.examination_hall` | officials, needs | 4, G4 | yes | government.yaml |
| `buildings.parliament_house` | officials, needs | 6, G14 | yes | government.yaml |
| `forms.<id>` | family, officials, lords, subject_reach, colonial_range, succession, event_tree, next, self_run | table below | yes | government.yaml |
| `reforms[]` | from, to, needs, gold, lords_slip | table below | yes | government.yaml |
| `revolution_ignores_era` | Revolution may set a form before its era | true (decided 16 Oct) | no (decision) | government.yaml |
| `event_tree_map.<value>` | set, keep_if_in, before_G14 | table in §5 of design | yes | government.yaml |
| `default`, `kingdom_by_region`, `entity_type`, `text_rules`, `overrides` | Start-form rules (75 overrides) | see start-forms.yaml | yes | start-forms.yaml |

**Forms** (officials / lords / subject reach / colonial range / succession → next):

| Form | Family | Off. | Lords | Subj. | Col. | Succession | Next |
|---|---|---|---|---|---|---|---|
| feudal_realm | house | 6 | 8 | 0 | 20 | eldest heir | diet, absolute, elective |
| diet_monarchy | house | 8 | 10 | 0 | 20 | eldest heir | absolute, constitutional monarchy |
| household_realm | house | 10 | 4 | +1 | 10 | strongest son | absolute, bureaucratic |
| bureaucratic_empire | house | 20 | 2 | +1 | 10 | named heir | constitutional monarchy |
| elective_monarchy | house | 4 | 12 | −1 | 10 | lords elect | feudal, diet |
| absolute_monarchy | house | 16 | 4 | +1 | 20 | eldest heir | constitutional monarchy |
| constitutional_monarchy | house | 24 | 4 | +1 | 30 | eldest heir | constitutional republic |
| city_commune | citizens | 8 | 4 | −1 | 10 | council picks | merchant republic, feudal, constitutional republic |
| merchant_republic | citizens | 10 | 4 | +1 | 30 | council picks | city commune, feudal, constitutional republic |
| peasant_commune | citizens | 4 | 1 | −2 | 0 | assembly picks | city commune, constitutional republic |
| constitutional_republic | citizens | 24 | 0 | 0 | 30 | elections | constitutional monarchy |
| prince_bishopric | faith | 6 | 3 | −1 | 5 | chapter elects | feudal |
| military_order | faith | 8 | 4 | 0 | 15 | brothers elect | feudal |
| holy_rule | faith | 6 | 4 | 0 | 5 | clergy choose | household |
| clan_council | kin | 0 | 0 | −2 | 0 | elders choose | chiefdom, confederation (self-run) |
| chiefdom | kin | 2 | 3 | −1 | 0 | chosen from the chief's lineage | paramount chiefdom (self-run) |
| paramount_chiefdom | kin | 4 | 6 | 0 | 5 | chosen from the chief's lineage | tribute empire, feudal, household |
| tribute_empire | kin | 6 | 12 | +3 | 5 | royal kin choose | household, bureaucratic |
| horde | kin | 2 | 10 | +2 | 0 | eldest of the house | household, confederation |
| confederation | kin | 2 | 10 | −1 | 0 | members take turns | feudal, constitutional republic |
| warlord_domain | warriors | 4 | 6 | 0 | 5 | heir or adopted son | shogunate, feudal |
| shogunate | warriors | 8 | 14 | +3 | 10 | heir or adopted son | warlord domain, constitutional monarchy |
| soldier_emirs | warriors | 10 | 6 | +1 | 10 | emirs choose | household |
| military_junta | warriors | 20 | 2 | 0 | 15 | generals choose | constitutional republic |
| party_state | modern | 30 | 0 | +2 | 20 | the party chooses | constitutional republic |
| company_rule | modern | 8 | 4 | +2 | 40 | owners appoint | colonial government |
| colonial_government | modern | 6 | 4 | none | 15 | overlord appoints | — |

**Reforms** (config, the full list): see `features/reforms.feature`, which lists every row as an example.

## 11. Seams

| Other context | Direction | Pattern | What crosses |
|---|---|---|---|
| buildings | upstream | Customer–Supplier | Which cap buildings stand and at what step; GOV supplies the officials/lords per building (buildings 7.7 adopted these) |
| province | downstream | Customer–Supplier | GOV → *Grasping officials* grievance, self-run provinces need no official; PROV → officials hired (newest first), their provinces |
| realm | partnership | Partnership | GOV → loyalty slips (New Year, reforms), *Great lord* reasons, succession by form; REALM → lords, their provinces and loyalty, treasury gold |
| subjects | downstream | Published Language | Subject reach base and the form's change; colonial government holds none |
| exploration | downstream | Published Language | Colonial range per form; governors in a slot don't count, founded colony's governor does |
| revolutions | upstream | Conformist | Regimes set forms (era ignored); `old_form` restore needs the remembered form |
| rebellions | upstream | Customer–Supplier | A won *New ideas* rising sets a form; disloyal lords rebel (consequence of slips) |
| events | upstream | Anti-Corruption Layer | 16 event-tree `government` values mapped to forms; `admin_capacity` → officials cap; events read the form's event-tree value |
| research | upstream | Conformist | G1, G2, G3, G4, G6, G9, G11, G14, W12 as reform needs and building needs |
| national-strengths | upstream | Customer–Supplier | Additions to caps (e.g. +2 officials for Venice) |
| religion | upstream | Customer–Supplier | "Ruler takes a reformed faith" opens prince-bishopric/order → feudal realm; religion reads forms for the Inquisition |
| culture | upstream | Customer–Supplier | Proposed 1.5 province weight of stranger provinces (not adopted, OQ-GOV-5); "own people" for self-run |
| warfare | upstream | Customer–Supplier | Army coup; loss of the shogun's capital |
| trade | upstream | Conformist | "4 or more traders abroad", "trade in debt 3 years running" as reform needs |
| diplomacy | upstream | Conformist | "Allied with 2 neighbours of the same people"; subjects count for "3 or more subjects" |
| scenario-setup | downstream | Published Language | Start form per record (`start-forms.csv`), start lords |
| map-presentation | downstream | Published Language | Government card content |

## 12. AI

The government design gives no AI rules. The AI uses the same `Reform` command as the player (multiplayer rule:
no player-only shortcuts). When the AI reforms, which form it prefers and how it handles being over a cap are open
(OQ-GOV-12).

## 13. Open questions and contradictions

- **OQ-GOV-1** Reform to a constitutional form: the design's table says "Any monarchy or republic → constitutional, 150 to 250 gold, 0 to 4 lords", but config allows constitutional monarchy only from diet, absolute and bureaucratic (200 / 1) and shogunate (250 / 4), and constitutional republic from the three citizen forms (150 / 0). Feudal, elective, household, tribute empire, paramount chiefdom and the faith forms cannot reach it directly. This spec follows config ("the full list is in the config"); confirm.
- **OQ-GOV-2** Three `next` links have no reform row: confederation → constitutional republic, military junta → constitutional republic, party state → constitutional republic. Are they reachable only by revolution/event, or are reform rows missing?
- **OQ-GOV-3** Several config reform rows are conditions rather than choices, at 0 gold: feudal → elective ("the ruling line dies out"), horde → confederation ("no adult heir"), shogunate → warlord domain ("the shogun loses the capital"), merchant republic → city commune ("trade in debt 3 years running"), constitutional monarchy ↔ republic ("ruler deposed", "king invited"), company → colonial government ("the crown takes over"). Does the change happen automatically when the condition holds, or must the country choose? The design lists the shogunate case as a change "without a reform", config as a reform.
- **OQ-GOV-4** Which lords lose a step when a reform passes ("some lords")? Lowest loyalty first like the New Year rule, the biggest, or chosen at random?
- **OQ-GOV-5** Culture design 5.1 / config `officials.capacity_weight` says a stranger-majority province counts as 1.5 provinces toward how many officials and lords the government can support. Government v2 has no province count in either cap. Not adopted; decide whether it is dropped or how it enters the caps.
- **OQ-GOV-6** Culture design 10 proposes government types limit Tongue policies ("a nation state can Impose; a confederation is always Let be"). Government v2 has no such rule and no "nation state" form.
- **OQ-GOV-7** "Changes needed elsewhere" not yet adopted: province-stats 12.1 has no *Grasping officials*; country-stats 5.5 has no *Great lord*; country-stats 8.2 still describes an inheritance law fixed by culture and history (including how a lord's land splits), and gap-lists still lists inheritance law as open, while government says succession by form settles it. Which wins, and who decides how a lord's land passes?
- **OQ-GOV-8** Event mapping `monarchy` keeps ten forms but not elective monarchy, constitutional monarchy or the faith forms, although the design says "any house … monarchy stays as it is"; an elective or constitutional monarchy hit by `monarchy` would become a feudal realm. Likewise `republic` keeps city commune, peasant commune and constitutional republic but not merchant republic. Intended?
- **OQ-GOV-9** Revolutions' `restored_monarchy` uses `old_form`: GOV must remember the form held before the last revolutionary regime. Not in the government design. Also revolutions' `committee_rule` "adds the army as a power base", but power bases were removed in v2.
- **OQ-GOV-10** Seat: government says "one per town", buildings 7.7 says "one per province". Buildings landmarks give a palace step 4 (Forbidden City +24 officials, Topkapı +20 officials) but government lists palace steps 1–3 only.
- **OQ-GOV-11** "`admin_capacity` in events becomes the officials cap": does an event's `admin_capacity` change add to or replace the officials cap, and for how long?
- **OQ-GOV-12** No AI behaviour is designed for government (when to reform, building cap buildings, handling over-cap).
- **OQ-GOV-13** Self-run forms: "their own people run their home provinces". Who counts as "own people" (culture's kin only, or cousins too)? Culture is not referenced.
- **OQ-GOV-14** "A ruler takes a reformed faith" (prince-bishopric/order → feudal) has no definition in the religion design, which has no "reformed faith" term (Protestant? Anglican? any adopted faith?).
- **OQ-GOV-15** Religion config restricts the Inquisition to governments `[monarchy, elective_monarchy, constitutional_monarchy]` (event-tree values). Which of the 27 forms count as "monarchies" for it is not stated.
- **OQ-GOV-16** Where an event sets a form with `none` subject reach (colonial government) on a country that holds subjects, what happens to its subjects?
- **OQ-GOV-17** Over the officials cap: the order is "newest hires first", but officials can also come as graduates or from a dying lord's line (province 10.2). Is "hired" the date they entered service?

## 14. Traceability

| Requirement | Feature file | Scenario |
|---|---|---|
| GOV-001, GOV-002 | caps.feature | France's caps in 1444; The Ottomans' caps in 1444; A one-province count |
| GOV-003 | caps.feature | A lord counts as 1 whatever his size |
| GOV-004 | caps.feature | Within both caps nothing happens |
| GOV-005, GOV-006 | caps.feature | Officials over the cap get Grasping officials; Grasping officials goes when back under |
| GOV-007 | caps.feature | Lords over the cap slip at New Year |
| GOV-008 | caps.feature | Great lord reasons by size |
| GOV-009 | caps.feature | A national strength adds to a cap |
| GOV-010 … GOV-017 | cap-buildings.feature | Buildings add to the caps; Buildings need inventions or forms |
| GOV-018, GOV-021, GOV-022 | forms.feature | Each form's numbers |
| GOV-019 | forms.feature | Subject reach from administrative capacity and form |
| GOV-020 | forms.feature | Colonial government holds no subjects |
| GOV-023, GOV-024 | forms.feature | Self-run forms need no official for their own people |
| GOV-025, GOV-026 | forms.feature | Colonial governors and the officials cap |
| GOV-027 … GOV-033 | reforms.feature | Every reform row; Reform refused; Reform needs a next form; Reform changes the numbers |
| GOV-034 … GOV-038 | form-changes.feature | Revolution, coup, shogunate |
| GOV-039 … GOV-042 | form-changes.feature | Event-tree values map to forms; admin_capacity |
| GOV-043 … GOV-048 | start-forms.feature | Rule order; overrides; kingdom by region; entity types; lords at start; forms no one starts with |
| GOV-049 | caps.feature | The government card for France |
