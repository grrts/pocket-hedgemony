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
- Holds: current form id; the form held before the last revolutionary regime (needed by revolutions' `old_form`, D-GOV-9: the last form not set by a revolution);
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
- GOV-005 If a country has more officials than its officials cap, then the government shall give the province of each official over the cap the grievance *Grasping officials*, taking the newest hires first, where "hired" is the date the official entered service in that post, whether hired, a graduate or from a lord's line (D-GOV-17). [government §2; config over_cap.officials]
- GOV-006 When a country is back within its officials cap, the government shall remove the *Grasping officials* grievance it gave. [government §2]
- GOV-007 When a New Year begins and a country has more lords than its lords cap, the government shall make one lord lose a loyalty step for each lord over the cap, choosing lowest loyalty first, then the lord with the most provinces. [government §2; config over_cap.lords]
- GOV-008 The government shall give a lord with 4 to 7 provinces one permanent loyalty down reason *Great lord*, and a lord with 8 or more provinces two. [government §2; config great_lord]
- GOV-009 Where a national strength adds to a country's caps, the government shall include that addition in the cap. [government §8]

### 5.2 Buildings that raise the caps
- GOV-010 The government shall add 6 / 10 / 16 officials and 2 / 4 / 6 lords for a palace at step 1 / 2 / 3, and for a landmark palace (step 4) the officials GOV-055 gives. [government §2.1; config buildings.palace; D-GOV-10]
- GOV-011 The government shall add 2 officials for each seat at step 1 and 4 for each seat at step 2, one seat per province, step 2 needing G11. [government §2.1; buildings 7.7; D-GOV-10]
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
- GOV-023 While a country's form is clan council or chiefdom, the government shall mark provinces of its own people (the province's largest tongue is the realm's own tongue) as needing no official, so *Ungoverned* never appears there. [government §3; config self_run; D-GOV-13]
- GOV-024 While a country's form is clan council or chiefdom, the government shall still require an official in provinces of another people. [government §3]
- GOV-025 While a colonial governor holds a governor slot, the government shall not count him against the officials cap. [government §3; config colonial_governors_count_against_officials_cap]
- GOV-026 When a governor's colony is founded, the government shall count him as that colony's official against the officials cap. [government §3]

### 5.4 Reforms
- GOV-027 The government shall let a country reform only into one of its form's next forms, through a reform listed in config `reforms`. [government §4; config §4]
- GOV-028 If a reform's listed needs are not all met, then the government shall refuse the reform. [government §4]
- GOV-029 When a reform passes, the government shall take the reform's gold from the treasury. [government §4]
- GOV-030 If the treasury holds less than the reform's gold, then the government shall refuse the reform. [government §4 "costs gold"]
- GOV-031 When a reform passes, the government shall make the reform's listed number of lords lose a loyalty step, choosing lowest loyalty first, then the lord with the most provinces, as at New Year. [government §4; config lords_slip; D-GOV-4]
- GOV-032 When a reform passes, the government shall set the new form, so that both caps, subject reach, colonial range and succession follow the new form from then on. [government §3, §4]
- GOV-033 The government shall use the reform rows of config `reforms` (needs, gold, lords slipping) as the full list of reforms; a form reaches a constitutional form by reform only through a listed row. [government §4 "The full list is in the config"; D-GOV-1]

### 5.5 Form changes without a reform
- GOV-034 When a revolution or a won *New ideas* rising sets a form, the government shall change the country to that form without a reform. [government §4]
- GOV-035 When a revolution sets a form, the government shall accept it regardless of the era in which the form normally appears. [gap-lists decisions 16 Oct; government §4; config revolution_ignores_era]
- GOV-036 If a country reforms, then the government shall still require the reform's listed items, whatever revolutions have done elsewhere. [government §4]
- GOV-037 When an army coup succeeds, the government shall set the country's form to military junta. [government §4]
- GOV-038 When a shogunate's shogun loses the capital, the government shall break the shogunate into warlord domains. [government §4; config reform shogunate → warlord_domain]
- GOV-039 When an event sets an event-tree `government` value, the government shall set the form given in config `event_tree_map`. [government §5]
- GOV-040 If the event value already fits the current form (the current form is in its `keep_if_in` list), then the government shall leave the form unchanged; `monarchy` keeps every house form (elective and constitutional monarchy included) and the chiefly and warrior monarchies, and `republic` keeps the merchant republic too. [government §5; D-GOV-8]
- GOV-041 When an event sets `republic` on a country that does not have G14, the government shall set city commune instead of constitutional republic. [government §5; config before_G14]
- GOV-042 When an event changes `admin_capacity`, the government shall add the change (1 official per point) to the officials cap for good, shown as an "events" part, and never let the cap fall below 0. [government §5; D-GOV-11]

### 5.5a Decided rules (17 October)
- GOV-050 When the condition of a condition row holds (the ruling line dies out, no adult heir, the shogun loses the capital, trade in debt 3 years running, the ruler deposed or abdicates, a king invited by parliament, the crown takes over), the government shall change the form by itself in the monthly government step, with the row's gold (0) and its lords slipping; a country cannot order a condition row as a reform. [config reforms; D-GOV-3]
- GOV-051 If a next form has no reform row (confederation, military junta or party state → constitutional republic), then the government shall refuse it as a reform and the card shall show it as reached "by revolution or event only". [config forms.next; D-GOV-2]
- GOV-052 When the turn in which 1 January falls comes, the AI shall order the reform to the first of its form's next forms, in their listed order, whose needs it meets and whose gold it holds twice over. [D-GOV-12]
- GOV-053 When a country's form changes to one that holds no subjects (colonial government), the government shall release all its subjects. [government §3 "none"; D-GOV-16]
- GOV-054 When a revolution sets a form, the government shall remember the last form not set by a revolution as the country's old form; any other change of form sets the old form to the new form. [revolutions `old_form`; D-GOV-9]
- GOV-055 The government shall count a landmark palace (palace step 4) as the landmark's officials (Forbidden City 24, Topkapı Palace 20) and 6 lords. [buildings landmarks; D-GOV-10]
- GOV-056 The government shall count "the ruler takes a reformed faith" as met when a prince-bishopric's or military order's state faith differs from the faith it was founded in. [D-GOV-14]
- GOV-057 The government shall publish as monarchies, for religion's Inquisition, the forms whose event-tree value is `monarchy`, `elective_monarchy` or `constitutional_monarchy`. [config forms.event_tree; religion config; D-GOV-15]

### 5.6 The start in 1444
- GOV-043 The government shall give each catalogue record its start form by the first rule that applies: a hand-set override, then the text rules in order on the catalogue's government form text, then (for entity type kingdom) kingdom by region, then the entity type table, then the default chiefdom. [government §6; start-forms.yaml; assign_start_forms.py]
- GOV-044 Where a text rule has `only_types`, the government shall apply it only to those entity types; where it has `skip_types`, never to those. [start-forms.yaml]
- GOV-045 Where a kingdom lies in a region whose rule depends on detail tier (Southeast Asia), the government shall give tier A and B kingdoms tribute empire and tier C kingdoms paramount chiefdom; a kingdom in a region with no rule gets feudal realm. [start-forms.yaml kingdom_by_region; assign_start_forms.py]
- GOV-046 The government shall start each country with the catalogue's historical houses as lords, and a country with only one province with no lords. [government §6; config start.lords]
- GOV-047 The government shall derive each country's 1444 caps from its start form and the start buildings set by the buildings design (15.2). [government §6]
- GOV-048 The government shall start no country in absolute monarchy, constitutional monarchy, constitutional republic, military junta, party state or company rule. [start-forms-summary]

### 5.7 What the player sees
- GOV-049 The government shall show a government card with the form and ruler, each cap as "x of y" with its parts (form, each building), subjects as "x of y", the next forms with each need met or not, and a Reform action. [government §1]

### 5.8 Government in the game (first slice)
Every realm now has a form, both caps and their consequences in the game's month, and the player reforms from a Government tab (D-GOV-18). Cap buildings, condition rows, self-run provinces, subject reach in numbers and colonial range in play come with their contexts.

- GOV-058 When a campaign starts, the game shall give every realm its 1444 form by the start-form rules (GOV-043), reading a map realm the catalogue names otherwise through its catalogue record (the Ottomans as `ottoman`, Japan as `ashikaga`), and giving the three with no record a form by hand (Albania confederation, Cherokee and Creek chiefdom). [GOV-043; D-GOV-18]
- GOV-059 Until cap buildings stand in the game, each cap shall carry a part *Custom since 1444*: the officials (royal provinces with an official at his post) and the landed lords the realm held above its form's part on 1 January 1444, fixed for good, so no realm starts over a cap; a reform changes only the form's part. [GOV-001, GOV-002, GOV-047; D-GOV-18]
- GOV-060 Each month, before moods are counted, the game shall give the province of each of a realm's officials over its officials cap, newest in his post first, the grievance *Grasping officials*, and lift it when the realm is back within the cap; only the crown's officials count (a lord's officials are his own). [GOV-005, GOV-006]
- GOV-061 In the month that begins with 1 January, the game shall make one of a realm's lords lose a loyalty step for each lord over its lords cap, lowest loyalty first, then most provinces; a slip stops at Disloyal like every loyalty step. [GOV-007]
- GOV-062 A realm may order a Reform to a next form when the reform row's needs are met and it holds the row's gold at the game's gold scale (the data's gold × `works.goldScale` 0.2, so 100 is 20); the gold is paid, the row's lords slip (GOV-031) and the new form sets the caps and laws from then on. Building needs are not met until cap buildings are built, and other conditions (traders abroad, families, alliances) not until their contexts run. [GOV-027 … GOV-032; D-GOV-18]
- GOV-063 In the month that begins with 1 January, each AI realm shall order the reform GOV-052 names. [GOV-052]
- GOV-065 Every realm's form, old form and Custom shall be kept in the save. [SAVE]

#### How the player uses it
- GOV-064 Where: the player's own realm card (tap the realm in the top bar) has a **Government** tab next to General. It shows, top to bottom, the form and its family; both caps as two 44-point buttons, each "Officials x of y" or "Lords x of y" with a bar, its parts (Form, Custom since 1444) and, when over, in red what that does (which provinces get *Grasping officials*, how many lords slip at New Year); tapping a cap opens the Officials or Lords tab where the player can act (move or commission officials, grant or seize fiefs). Then **Laws of the realm**, what the form sets: succession, how far colonies may reach, and how many subjects it can hold against its reach. Then **Reform**: a card per next form with the change in officials and lords from now, each need marked ✓ or ✗, its gold and the lords who will slip, and a Reform button; a first tap asks "Pay N gold and M lords lose a loyalty step?" with Reform and Cancel, so a reform is never made by a stray tap. A form that comes only by revolution or event, or by itself when its condition holds, says so instead of a button. [X-19, GOV-049]
- GOV-066 Grouping and overview: everything about the form sits in this one tab. The General tab of the player's card carries one line, "Government: <form> · officials x/y · lords x/y", red when over a cap, that opens the tab; another realm's card shows its form by name. *Grasping officials* shows in a province's grievances with what ends it, and a reform reaches the dispatches. Phone: the tab fits the side panel in the Wide and Tall layouts, the two caps and the next-form cards stack to one column on a narrow panel, every button at least 44 points high, nothing needs hover and the panel never scrolls sideways; a phone held upright is asked to turn sideways, as for the whole game. [X-19, SHELL-108, SHELL-109, SHELL-114]
### 5.9 Hordes: how far behind, and how they stay in the game (Leroy, 18 October)

Leroy asked how far behind the hordes are in technology and how to balance it. The answer: a horde starts level with
anyone in the horse and one era level behind its settled neighbours in everything else. It wins in the field in
Eras I and II, cannot take castles well, lives from raids and tribute, and fades from Era III unless it studies what
its neighbours know or settles. The era levels are the single tree's (research); this section only places the steppe
start group on them. Numbers are provisional (D-GOV-19).

#### How far behind
- GOV-067 A **horde** is a realm whose form is horde (GOV-043 gives it to steppe and Siberia kingdoms and the overrides, for example the Great Horde, Crimea, Kazan, the Nogais, the Uzbeks, Moghulistan, the Oirats, the Mongols and the Qara Qoyunlu). The **steppe start group** is research's start group `Steppe` (great_horde, crimea, nogai, kazan, uzbek_khanate, moghulistan, oirat, mongols). [Leroy 18 Oct; research start_region_members]
- GOV-068 In 1444 the steppe start group shall know the **horse line** at the level of the best realm that knows it (W1 *Composite-bow horse archery*, F11 *Horse breeding studs* and every invention below Era I that they grow from), and in every other line shall stand one era level below what its settled neighbours (Muscovy, the Ottomans, the Timurids and Ming) start with: no B1 *Stone castles*, no W2, W3, W4 or W5 (no knights, guns or wagon forts), no G2 *Feudal grants* and no G5 *Royal chancery*; it keeps G1 *Written law codes* and L1 *Temple and monastery schools*, and its Islamic realms (Great Horde, Crimea, Kazan, Nogais, Uzbeks) keep L2 *Madrasa networks*. Research's start sets carry this as data; nothing in the code names a horde. [Leroy 18 Oct; D-GOV-19]
- GOV-069 The balance target for the start is that a horde's Technology score in 1444 is about half that of Muscovy, its nearest settled rival (`hordes.balance.start_score_vs_muscovy` 0.5, provisional), and that the gap is never so large that a horde cannot field horse archers against anyone in Era I. [Leroy 18 Oct; D-GOV-19]

#### How they catch up
- GOV-070 Every realm, horde or not, shall pay less for an invention of an era earlier than the current date: 25 % less for each era it lies behind, at most 50 % off (`research.behind_discount_pct_per_era` 25, `research.behind_discount_cap_pct` 50, provisional), applied after the cost by era and before the spread from neighbours and trade partners (RSCH-034); an invention never costs less than a fifth of its era cost. This is how anyone who starts behind (hordes, African and American starts) catches up: what the world already knows is cheap to learn, and what is new still costs full price. [Leroy 18 Oct; D-GOV-19]
- GOV-071 The balance target for catching up is that a horde which keeps its school seats full and studies only what its neighbours know closes its one-era gap outside the horse line by about 1550 (`hordes.balance.catch_up_by` 1550, provisional), and one that never fills its seats is still an era behind in 1650. [D-GOV-19]
- GOV-072 A horde shall settle by the reform that already exists, Horde → Household realm (a palace in a town, 150 gold, 2 lords slip). It keeps every invention it knows (INV-RSCH-1), so a settled horde keeps its horse archers; it gains the household realm's officials (2 → 10), so more provinces are governed and taxed and it can pay for more schools; and it loses the horde's lords (10 → 4) and subject reach (+2 → +1). [government §4; reforms config; D-GOV-19]

#### Why a horde is strong while it is behind (rules that already exist)
- GOV-073 The balance shall be made only with the rules other contexts already have, with no new horde bonus: horse archers (2.5 strength, Light and Shot, warfare §5), *Feigned flight* (warfare styles, needs W1), pasture and herds that give horses (province, realm), raids by horse-only armies that burn and loot (WAR-176) and the tribute term of a peace (WAR-182). The balance target is that a horde army beats a settled army of the same size on open ground in about 6 battles out of 10 in Era I, 5 in 10 in Era II once the settled side fields W5 and W8, and at most 1 in 4 from Era III against W9 and W11, the point where horse archers keep only scouting and raiding (warfare obsolescence table) (`hordes.balance.field_win_share` 0.6 / 0.5 / 0.25, provisional). [warfare §5, §9.2, §10.3; D-GOV-19]

#### Why it does not overrun everyone (the weaknesses)
- GOV-074 Without B1 and W3 a horde shall have no castles of its own to build and no siege guns, so it takes a settled realm's castles slowly; its wars are raids and tribute more than conquest. The balance target is that a horde earns at least a third of its gold from raid loot and tribute in Era I and that a settled neighbour can buy peace with tribute for less than a year of raids costs it (`hordes.balance.raid_tribute_gold_share` 1/3, provisional). This keeps war against a horde a matter for diplomacy: paying tribute, allying against it, or settling the border, not only fighting. [Leroy 18 Oct (war balanced through diplomacy); WAR-176, WAR-182; D-GOV-19]
- GOV-075 A horde's research shall stay slow for the reasons the rules already give: few towns, so few schools (RSCH-001); a horde's 2 officials, so few governed provinces and little tax for school upkeep (GOV-001, RSCH-021); and every student is a rider the horde cannot raise (RSCH-020). No extra penalty is added. [research §5.1, §5.3; D-GOV-19]

#### The computer hordes
- GOV-076 An AI horde shall study by the research AI's rule (RSCH-078: the eligible invention that costs it least now), which with GOV-070 makes it study first what its neighbours already know, and shall settle by the government AI's rule (GOV-052) once it has a palace in a town and the gold twice over. No AI rule is added for hordes. [RSCH-078, GOV-052; D-GOV-19]

#### How the player uses it
- GOV-077 Where: on the player's own realm card. The **Learning** tab's overview (RSCH-084) shall carry one more line, "Behind your neighbours: N inventions they know and you don't", which opens the tree with those inventions marked; each invention's sheet shall show "Behind the times: −X %" beside its spread discount when GOV-070 applies, so the player sees why it is cheap. For a horde, the **Government** tab's Laws of the realm shall carry one line on the horde's edge and its end, "Your riders: strong until your enemies field field guns (W8) and flintlocks (W11)", and the Horde → Household realm card says what settling changes (officials, lords, subject reach; inventions kept). [X-19, RSCH-084, GOV-064]
- GOV-078 Grouping and overview: technology stays in the Learning tab and the form in the Government tab; the line in each opens the other where they meet (the settle card names the inventions that help a settled realm, G3 and L7). The overview at a glance is the Learning overview's "Behind your neighbours" line; another realm's card already shows how many inventions it knows, and shall also say "N ahead of you" or "N behind you". [X-19, RSCH-088]
- GOV-079 Phone: both lines are single rows inside the existing tabs, at least 44 points tall, tappable, with no hover and no sideways scroll, in the Wide and Tall layouts and inside the safe areas, as RSCH-090 and GOV-066 already require for their tabs. [X-19, SHELL-108, SHELL-109, SHELL-114]

## 6. Commands

| Command | Who issues it | Preconditions | Result | Events emitted |
|---|---|---|---|---|
| `Reform(country, toForm)` | player / AI | `toForm` in current form's next forms; a matching reform row; all needs met; gold ≥ reform gold | Form changes; gold paid; listed lords slip | `GovernmentFormChanged(cause=reform)`, `LordsSlippedOnReform` |
| `SetFormByRevolution(country, form)` | system (revolutions) | A revolutionary regime or won *New ideas* rising | Form set, era ignored; the last form not set by a revolution remembered (D-GOV-9) | `GovernmentFormChanged(cause=revolution)` |
| `ApplyConditionChange(country)` | system (monthly step) | A condition row's condition holds (D-GOV-3) | Form changes; row's lords slip | `GovernmentFormChanged(cause=condition)`, `LordsSlippedOnReform` |
| `SetFormByCoup(country)` | system (warfare / events) | A successful army coup | Form becomes military junta | `GovernmentFormChanged(cause=coup)` |
| `BreakShogunate(country)` | system | Form is shogunate and the shogun lost the capital | Form becomes warlord domain(s) | `GovernmentFormChanged(cause=capital_lost)` |
| `ApplyEventGovernment(country, value)` | system (events) | An event effect sets a `government` value | Mapped form, or unchanged if it fits | `GovernmentFormChanged(cause=event)` (only on change) |
| `AssignStartForms()` | system (setup) | Catalogue loaded | Start form per record | `StartFormsAssigned` |

## 7. Domain events

| Event | When | Payload | Consumed by |
|---|---|---|---|
| `GovernmentFormChanged` | Any change of form | country, old form, new form, cause | subjects (releases all subjects when the new form holds none, D-GOV-16), exploration, realm, culture, religion, revolutions, events, map-presentation |
| `CapsChanged` | A form, building or strength change alters a cap | country, officials cap, lords cap | province, realm |
| `OfficialOverCap` / `OfficialBackUnderCap` | Officials exceed / fall back within the cap | country, official, province | province (grievance *Grasping officials*) |
| `LordsOverCapAtNewYear` | New Year with lords over the cap | country, lords chosen, steps | realm (loyalty) |
| `LordsSlippedOnReform` | A reform or condition change passes | country, the lords chosen (lowest loyalty, then most provinces) | realm |
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
- When a prince-bishopric's or military order's state faith changes from its founding faith (religion), then the reform to feudal realm becomes possible (D-GOV-14).
- When a condition of a condition row holds (realm, trade, warfare, events), then GOV changes the form in its monthly step (D-GOV-3).

## 9. Monthly step
A turn is one week (X-18); the monthly and yearly steps run once, in the turn in which a new month or year begins.
- Each month (government's place in the monthly steps, X-2): apply any condition change (D-GOV-3); recompute caps after buildings and hiring have resolved; apply or lift *Grasping officials*.
- In the turn in which 1 January falls: the AI's reform orders (D-GOV-12) are given with the orders of the next turn.
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
| `buildings.palace.landmark_step_4` | Landmark palace officials / lords | forbidden_city 24, topkapi 20 / 6 | yes (`_provisional`) | government.json |
| `over_cap.reform.order` | Which lords slip on a reform | lowest loyalty, then most provinces (D-GOV-4) | no (decision) | government.json |
| `reforms[].automatic` | Condition rows that change by themselves | 7 rows (D-GOV-3) | no (decision) | government.json |
| `admin_capacity_officials_per_point` | Officials per event `admin_capacity` point | 1 | yes (`_provisional`) | government.json |
| `ai.reform_month` / `ai.reform_gold_reserve_factor` | When the AI reforms; gold it must hold per gold of the reform | 1 (January) / 2 | yes (`_provisional`) | government.json |
| `revolution_ignores_era` | Revolution may set a form before its era | true (decided 16 Oct) | no (decision) | government.yaml |
| `event_tree_map.<value>` | set, keep_if_in, before_G14 | table in §5 of design | yes | government.yaml |
| `default`, `kingdom_by_region`, `entity_type`, `text_rules`, `overrides` | Start-form rules (75 overrides) | see start-forms.yaml | yes | start-forms.yaml |
| `research.behind_discount_pct_per_era` / `research.behind_discount_cap_pct` | Cheaper inventions from an earlier era (GOV-070), floor a fifth of the era cost | 25 % per era / 50 % | yes (D-GOV-19) | research.json |
| `hordes.balance.start_score_vs_muscovy` | Horde Technology score in 1444 against Muscovy's (target, GOV-069) | 0.5 | yes (D-GOV-19) | balance targets |
| `hordes.balance.catch_up_by` | Year a studying horde closes its gap (target, GOV-071) | 1550 | yes (D-GOV-19) | balance targets |
| `hordes.balance.field_win_share` | Horde field wins against an equal settled army, Era I / II / III on (target, GOV-073) | 0.6 / 0.5 / 0.25 | yes (D-GOV-19) | balance targets |
| `hordes.balance.raid_tribute_gold_share` | Share of a horde's gold from raids and tribute in Era I (target, GOV-074) | at least 1/3 | yes (D-GOV-19) | balance targets |

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
| realm | partnership | Partnership | GOV → loyalty slips (New Year, reforms, lowest loyalty first), *Great lord* reasons, succession by form (country stats' inheritance law dropped, D-GOV-7); REALM → lords, their provinces and loyalty, treasury gold |
| subjects | downstream | Published Language | Subject reach base and the form's change; a change to colonial government releases every subject (D-GOV-16) |
| exploration | downstream | Published Language | Colonial range per form; governors in a slot don't count, founded colony's governor does |
| revolutions | upstream | Conformist | Regimes set forms (era ignored); GOV remembers the last form not set by a revolution for `old_form` (D-GOV-9); committee rule only sets its form |
| rebellions | upstream | Customer–Supplier | A won *New ideas* rising sets a form; disloyal lords rebel (consequence of slips) |
| events | upstream | Anti-Corruption Layer | 16 event-tree `government` values mapped to forms; `admin_capacity` adds 1 official per point for good (D-GOV-11); events read the form's event-tree value |
| research | upstream | Conformist | G1, G2, G3, G4, G6, G9, G11, G14, W12 as reform needs and building needs; the steppe start group's start set (GOV-068) and the cheaper earlier-era inventions (GOV-070) are research data and rules, placed on the single tree's era levels |
| national-strengths | upstream | Customer–Supplier | Additions to caps (e.g. +2 officials for Venice) |
| religion | upstream | Customer–Supplier | A change of state faith from the founding faith opens prince-bishopric/order → feudal realm (D-GOV-14); religion reads the forms' event-tree values for the Inquisition (D-GOV-15) |
| culture | upstream | Customer–Supplier | A province's largest tongue and the realm's tongue, for self-run "own people" (D-GOV-13); the 1.5 stranger weight is dropped (D-GOV-5) and forms set no tongue policy limits (D-GOV-6) |
| warfare | upstream | Customer–Supplier | Army coup; loss of the shogun's capital; horse archers, *Feigned flight*, raids and tribute as the horde's strengths and the balance targets they are checked against (GOV-073, GOV-074) |
| trade | upstream | Conformist | "4 or more traders abroad", "trade in debt 3 years running" as reform needs |
| diplomacy | upstream | Conformist | "Allied with 2 neighbours of the same people"; subjects count for "3 or more subjects" |
| scenario-setup | downstream | Published Language | Start form per record (`start-forms.csv`), start lords |
| map-presentation | downstream | Published Language | Government card content |

## 12. AI

The AI uses the same `Reform` command as the player (multiplayer rule: no player-only shortcuts). In the turn in
which 1 January falls it orders the reform to the first of its form's next forms, in their listed order, whose needs it meets and whose
gold it holds twice over (D-GOV-12, GOV-052). Building cap buildings is the buildings AI's choice; government adds no
other AI rule.

## 13. Decisions and open questions

Decided on 17 October 2026 (DECISIONS.md). No question stays open.

- **D-GOV-1** (was OQ-GOV-1) Reform to a constitutional form: only the config's rows reach a constitutional form by reform: diet, absolute or bureaucratic → constitutional monarchy (200 gold, 1 lord), shogunate → constitutional monarchy (250, 4), and the three citizen forms → constitutional republic (150, 0). A feudal realm reaches one through a diet or absolute monarchy first. The design says "the full list is in the config", and the table line is its summary.
- **D-GOV-2** (was OQ-GOV-2) Next forms without a reform row: confederation, military junta and party state reach constitutional republic only by revolution or event; the card shows the line "by revolution or event only" (GOV-051). No reform row is invented, and revolutions already set constitutional forms.
- **D-GOV-3** (was OQ-GOV-3) Condition rows: the seven rows whose need is something that happens (the ruling line dies out, no adult heir, the shogun loses the capital, trade in debt 3 years running, the ruler deposed or abdicates, a king invited by parliament, the crown takes over) change the form by themselves in the monthly government step, at the row's gold (0) and with its lords slipping, and cannot be ordered (GOV-050). The design already treats the shogun's case as a change without a reform, and none of them is a choice.
- **D-GOV-4** (was OQ-GOV-4) Which lords slip on a reform: the same order as at New Year, lowest loyalty first, then the lord with the most provinces. One order for both slips is simpler than two.
- **D-GOV-5** (was OQ-GOV-5) Stranger provinces' 1.5 weight: dropped; neither cap counts provinces. Government v2 is the later design and made both caps plain "form + buildings".
- **D-GOV-6** (was OQ-GOV-6) Forms limiting tongue policies: dropped; no form limits a tongue policy and there is no "nation state" form. It would add a mechanic government v2 does not have.
- **D-GOV-7** (was OQ-GOV-7) Changes needed elsewhere: government wins. *Grasping officials* is a province grievance and *Great lord* a lord's loyalty reason, as GOV-005 and GOV-008 publish them; succession by form replaces country stats' inheritance law, and a lord's land passes whole to his heir, never split. Government v2 is the later design and says it settles inheritance.
- **D-GOV-8** (was OQ-GOV-8) Event keep lists: `monarchy` keeps every house form, elective and constitutional monarchy included, plus the chiefly and warrior monarchies already listed; `republic` also keeps the merchant republic. The faith forms do not count as monarchies. The design's own words are "any house … monarchy stays as it is".
- **D-GOV-9** (was OQ-GOV-9) Old form: government remembers the last form not set by a revolution; any other change of form makes the new form the old form (GOV-054). Committee rule only sets its form, since power bases are gone. Revolutions need `old_form`, and skipping a run of regimes is what "restored" means.
- **D-GOV-10** (was OQ-GOV-10) Seats and landmark palaces: one seat per province, as the buildings design places it, each adding 2 / 4; a landmark palace is palace step 4 with the landmark's officials (Forbidden City 24, Topkapı Palace 20) and 6 lords, provisional (GOV-055). Buildings owns placement, and the landmark numbers already exist there.
- **D-GOV-11** (was OQ-GOV-11) Event `admin_capacity`: each point adds 1 official to the officials cap (provisional), for good, shown as "events" on the card; a cap never falls below 0. Adding is simpler than replacing a cap that buildings and form keep changing.
- **D-GOV-12** (was OQ-GOV-12) Government AI: in the turn in which 1 January falls the AI orders the reform to the first next form, in config order, whose needs it meets and whose gold it holds twice over (factor 2, provisional). It is the smallest rule that makes AI realms change form at all.
- **D-GOV-13** (was OQ-GOV-13) Own people: a province is of the realm's own people when its largest tongue is the realm's tongue; kin tongues do not count. One comparison is simpler than kin rules.
- **D-GOV-14** (was OQ-GOV-14) A reformed faith: met when the state faith of a prince-bishopric or military order is no longer the faith it was founded in, whatever the new faith. Religion's state faith change already exists, so no new term is needed.
- **D-GOV-15** (was OQ-GOV-15) Monarchies for the Inquisition: the forms whose event-tree value is `monarchy`, `elective_monarchy` or `constitutional_monarchy` (GOV-057). Every form already carries its event-tree value.
- **D-GOV-16** (was OQ-GOV-16) A form that holds no subjects: when a country becomes a colonial government its subjects are all released at once (GOV-053). INV-GOV-6 must hold, and releasing is the existing way a tie ends.
- **D-GOV-18** First game slice (milestone 5, provisional): no cap buildings stand in the game yet, so each realm's caps carry *Custom since 1444*, what it held above its form on 1 January 1444, and every realm starts within both caps; conquests, new officials and a reform to a smaller form push a realm over. Reform gold is at the game's gold scale (× 0.2, as works and gifts are). Building needs and condition rows wait on their contexts. Map realms the catalogue names otherwise take their catalogue record's start form. It is the smallest rule that runs the design's caps without flooding every realm with grievances on day one.
- **D-GOV-17** (was OQ-GOV-17) "Newest hires first": an official's hire date is the day he entered service in that post, whether hired, a graduate or from a lord's line. One date for every official keeps one order.
- **D-GOV-19** (Leroy, 18 Oct: "design how far back the hordes are in terms of technology, and try and find the balance for it") Hordes start level in the horse line and one era level behind their settled neighbours in everything else (GOV-068), on the single tree's era levels. They catch up through one general rule, cheaper inventions from an earlier era (25 % per era, at most 50 %, GOV-070), which also helps every other start that is behind, and by settling through the existing reform (GOV-072). No horde bonus or penalty is added: their edge (horse archers, *Feigned flight*, raids) and their limits (no castles or guns, few schools and officials) already exist, so the balance is set by the start sets and checked against four targets (GOV-069, GOV-071, GOV-073, GOV-074) that the balance model runs. The targets keep war against a horde a matter for diplomacy as well (tribute, alliances), as Leroy asked for war in general. All numbers are provisional.

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
| GOV-027 … GOV-033 | reforms.feature | Every reform row; Reform refused; Reform needs a next form; Reform changes the numbers; The lords with the lowest loyalty lose a step when a reform passes |
| GOV-034 … GOV-038 | form-changes.feature | Revolution, coup, shogunate |
| GOV-039 … GOV-042 | form-changes.feature | Event-tree values map to forms; A monarchy event on an elective monarchy; An event's admin capacity adds to the officials cap |
| GOV-043 … GOV-048 | start-forms.feature | Rule order; overrides; kingdom by region; entity types; lords at start; forms no one starts with (GOV-047's scenario waits on the buildings context's 1444 start buildings) |
| GOV-049 | caps.feature | The government card for France |
| GOV-050 | reforms.feature | A condition changes the form by itself; A condition change cannot be ordered |
| GOV-051 | reforms.feature | A reform only goes to a listed next form; A next form with no reform row comes only by revolution or event |
| GOV-052 | reforms.feature | The AI reforms in January when it meets the needs with gold to spare |
| GOV-053 | form-changes.feature | A form that holds no subjects releases them all |
| GOV-054 | form-changes.feature | The form before a run of revolutions is remembered; Another change ends the run of revolutions |
| GOV-055 | cap-buildings.feature | A landmark palace is palace step 4 |
| GOV-056 | reforms.feature | A prince-bishop takes a reformed faith |
| GOV-057 | forms.feature | Which forms count as monarchies for the Inquisition |
| GOV-058 … GOV-063, GOV-065 | — | Engine: packages/engine/test/government.test.ts (start forms, Custom, Grasping officials, New Year slips, reform, AI reform, save) |
| GOV-064, GOV-066 | — | Presentation: apps/client/src/ui/government.ts, the Government tab; screenshots from apps/client/scripts/government-shots.mjs |
| GOV-067, GOV-068 | hordes.feature | Which realms are hordes; A horde starts level in the horse and behind in the rest |
| GOV-069, GOV-071, GOV-073, GOV-074 | hordes.feature | Balance targets for hordes |
| GOV-070 | hordes.feature | Inventions from an earlier era cost less |
| GOV-072 | hordes.feature | A horde settles and keeps what it knows |
| GOV-075, GOV-076 | — | No new rule: existing research and government rules (RSCH-001, RSCH-020, RSCH-021, RSCH-078, GOV-052) |
| GOV-077 … GOV-079 | — | Presentation: the Learning and Government tabs |
