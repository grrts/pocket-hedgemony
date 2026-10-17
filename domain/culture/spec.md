# Culture (CULT)

## 1. Purpose and scope

Culture is **tongue**: the people a person belongs to, the speech they share, and the land they see as theirs.
This context decides what a tongue and a family are, which tongue a country's court has, how every person relates
to that court (kin, cousin, stranger, or trading people), how tongues **drift** each year, the player's levers
(Tongue policy, the *Own tongue* charter), the effects of tongue on officials, lords, order, war, trade, research
and diplomacy, and how tongues move through history (court goes native, new tongues abroad, nationalism, merging).

**In scope**
- Tongues (about 600) and families (42), the court tongue, kin / cousin / stranger / trading people.
- Tongue % on the country card (the formula), the Tongue mix rules (drift and its multipliers).
- Tongue policy (Let be / Teach / Impose), the *Own tongue* charter, the *Banned tongue* grievance's start and end.
- Culture's inputs to other contexts (learning time of officials, loyalty steps, risings, war aims, levy, trade,
  research, diplomacy).
- Engine-raised culture events, nationalism thresholds, tongue merges and splits, the four new event verbs.
- The Peoples screen, tongue dots and the Tongue lens content.

**Not in scope (owned by …)**
- Storing the province's top three tongues, homeland, years held, officials, charters and grievances (province).
- Moving people as settlers, refugees, homeless and soldiers (province); event migrations as events (events).
- Lords and loyalty steps (realm); risings (rebellions); war aims and garrisons (warfare, diplomacy);
  recruit refill (recruiting); trade value and traders (trade); research cost (research).
- Nationalism support values (events: `ideology_support`). Music palettes (audio).
- Faith: kept separate on purpose (religion).

## 2. Sources

Newest decision first.
1. `culture/culture-design.md` §11 "Decisions (16 October)": four new families; early *Impose* for chancery-tradition states; about 600 tongues; two courts dropped.
2. `culture/culture-design.md` version 1, all sections 1–10 (including "Changes for other files").
3. `culture/culture-config.example.yaml` (example config, version 1).
4. Read for seams only: event-tree `data/enums.yaml` (culture_groups), province-stats 10.1, 10.2, 12.1, country-stats 4,
   government-design v2, religion-design, revolutions changes-for-other-designs (culture).

## 3. Ubiquitous language

| Term | Meaning | Not to be confused with |
|---|---|---|
| Tongue | One people: what a province counts and the province card shows (French, Occitan, Mandinka) | Family |
| Family | A broad group of related tongues; uses the event tree's `culture_groups` ids, plus celtic, baltic, caucasian, hebrew | Faith family (religion); form family (government) |
| Court tongue | The tongue of the ruler's house and court; one per country | The majority tongue |
| Kin | People of your court tongue | "Kin faith" (religion) |
| Cousin | People of another tongue of your court tongue's family | — |
| Stranger | People of a tongue of another family | — |
| Trading people | A diaspora tongue; never a stranger for grievances | — |
| Diaspora | Tongue flag for peoples who live scattered among others as merchants and craftsmen | — |
| Tongue % | Share of the realm's people who are kin, plus half of the cousins | Tongue mix |
| Tongue mix | A province's top three tongues and their shares (stored by province) | — |
| Drift | The yearly move of a share of people from one tongue to another | Conversion of faith (religion "drift") |
| Pull tongue | The one tongue a province's people drift toward this year | Faith pull (religion) |
| Homeland | Provinces a tongue sees as its own (province stats 10.1 *Homeland of*) | — |
| Way of life | settled, herding, forest, seafaring or trading | — |
| Tongue policy | Realm-wide setting Let be / Teach / Impose, with per-province overrides | Faith policy (religion) |
| *Own tongue* | Charter: the local tongue is used in courts and schools | *Faith tolerance* charter |
| *Banned tongue* | Grievance from *Impose* in a stranger province | *Foreign rule* |
| *Foreign rule* | Existing grievance in a homeland held by a ruler of a stranger tongue (cousins once nationalism ≥ 0.3) | — |
| Chancery tradition | Start flag letting a state *Impose* from 1444 (Ming, Joseon, Castile, the Ottomans) | The chancery building |
| Nationalism | The event tree's per-province `ideology_support` for nationalism, 0 to 1; culture only reads it | — |
| Court goes native | Engine-raised event when the court tongue is a small minority for long | — |
| New tongue abroad | A settler tongue splitting into its `splits_to` tongue | — |
| Merge tongues | Folding tongues into their `merges_into` national tongue | — |
| Peoples screen | One row per tongue in the realm | — |

## 4. Domain model

### Aggregates

**Tongue** (reference data; identity: tongue id)
- Holds: name, family, homeland provinces, way of life, diaspora flag, `merges_into`, `splits_to`, local names.
- INV-CULT-1: every tongue belongs to exactly one family, and every family is a `culture_groups` id or one of the four added.
- INV-CULT-2: only two levels exist (family, tongue); no sub-tongues.
- INV-CULT-3: a `splits_to` tongue is in the `creole_atlantic` family (all listed splits are).

**CountryCulture** (identity: country id)
- Holds: court tongue, Tongue policy, per-province policy overrides; derived Tongue %.
- INV-CULT-4: a country has exactly one court tongue.
- INV-CULT-5: Tongue % = (kin people + ½ cousin people) ÷ realm people; computed on opening, never stored.
- INV-CULT-6: *Impose* may be set only with *Printing* or the chancery-tradition flag.

**ProvinceTongues** (identity: province id; storage owned by province)
- Holds (read/written through the province): top three tongues and shares, homeland, years held, *Own tongue* charter (one byte).
- INV-CULT-7: at most three tongues per province; a tongue under 1 % is removed.
- INV-CULT-8: each year a province has exactly one pull tongue.

### Entities and value objects
- **Relation** (value): kin | cousin | stranger | trading, between a person's tongue and a court tongue, modified by nationalism.
- **DriftRate** (value): base rate × applicable multipliers.
- **TonguePolicy** (value): let_be | teach | impose.
- **EngineCultureCheck** (entity, per country): timers for court goes native (50 years, recheck 25), merge without event (50 years of *Impose*); per region: settler-majority years for new tongue abroad (100).

### Domain services
- **RelationService**: kin / cousin / stranger / trading for a tongue and a court, given the province's nationalism.
- **DriftService**: yearly pull tongue and drift per province.
- **TongueShareService**: Tongue % and Peoples screen rows on demand.
- **CultureEventService**: the 5-yearly engine checks and the four effect verbs.

## 5. Requirements

### 5.1 Tongues and families
- CULT-001 The culture system shall give every person a tongue and every tongue one family. [culture §1.1]
- CULT-002 The culture system shall use the event tree's `culture_groups` ids as families, plus `celtic`, `baltic`, `caucasian` and `hebrew` (43 in all: the event tree's 39 groups plus the four). [culture §1.1, §11.1; D-CULT-3]
- CULT-003 The culture system shall have exactly two levels, family and tongue, with about 600 tongues in config. [culture §1.1, §11.3]
- CULT-004 The culture system shall map the catalogue's culture strings (1,468) onto tongues once, folding only near-duplicates, and keep the original string as the tongue's local name in tooltips. [culture §1.1, §9]
- CULT-005 If a catalogue culture string cannot be mapped, then the culture system shall put it on a review list. [culture §9]
- CULT-006 The culture system shall keep apart tongues where history turns on the split (French and Occitan, Castilian and Catalan, Great Russian and Ruthenian) and regional peoples until a nation-building merge. [culture §1.1]
- CULT-007 The culture system shall give each tongue an id, name, family, homeland, way of life (settled, herding, forest, seafaring or trading), a diaspora flag, and optionally `merges_into` and `splits_to`. [culture §1.2]
- CULT-008 The culture system shall have no culture meter, no "cultural power" and no list of accepted cultures. [culture intro]

### 5.2 Court tongue
- CULT-009 The culture system shall give every country one court tongue, starting as the first culture in its catalogue record mapped to a tongue (event tree `primary_culture`). [culture §1.3, §9]
- CULT-010 When a new dynasty of another tongue takes the throne (by conquest, inheritance, marriage or a lord's revolt), the culture system shall set the court tongue to that dynasty's tongue. [culture §1.3]
- CULT-011 When the court tongue changes, the culture system shall recompute who is kin and which lords share it, and the music palette shall change from the next track. [culture §1.3]

### 5.3 Kin, cousins, strangers and trading peoples
- CULT-012 The culture system shall classify every person as kin (the court tongue), cousin (another tongue of the same family) or stranger (a tongue of another family). [culture §2]
- CULT-013 The culture system shall work out Tongue % as the share of the realm's people who are kin plus half of the cousins. [culture §1.3, §2; config relation]
- CULT-014 The culture system shall treat a trading people (diaspora tongue) as never a stranger for grievances, counting neither as kin nor stranger for grievances. [culture §2, §5.3]
- CULT-015 While nationalism in a province is under 0.3, the culture system shall give *Foreign rule* only for strangers' homelands, never for cousins'. [culture §2, §5.2]

### 5.4 Drift
- CULT-016 When a year ends, the culture system shall run drift in every province, after births and deaths. [culture §3, §9]
- CULT-017 The culture system shall make the court tongue a province's pull tongue if the province has been held 20 years or more and is governed by any official of the country, whatever his tongue, or by a lord of the court tongue. [culture §3.1; config drift.court_pull_needs; D-CULT-17]
- CULT-018 Otherwise the culture system shall make the province's majority tongue its pull tongue. [culture §3.1]
- CULT-019 The culture system shall move no people already of the pull tongue, and move people of every other tongue toward it at the drift rate. [culture §3.1]
- CULT-020 The culture system shall set the yearly drift rate to a base 0.5 % of the other tongues' people, times every multiplier that applies. [culture §3.2]
- CULT-021 The culture system shall multiply drift by 2 for town classes (craftsmen, market folk, clerks, scholars). [culture §3.2]
- CULT-022 The culture system shall multiply drift by 2 for cousins of the pull tongue. [culture §2, §3.2]
- CULT-023 Where a school in the province teaches in the pull tongue, the culture system shall multiply drift by 1.5; a school of another tongue counts for that tongue, and a school in a learned tongue (Latin, Classical Arabic) counts for no tongue. [culture §3.2, §4.3; D-CULT-15]
- CULT-024 Where a Schoolmaster official serves in the province, the culture system shall multiply drift by 2. [culture §3.2]
- CULT-025 The culture system shall multiply drift by 0.5 / 1 / 2 under the Tongue policy Let be / Teach / Impose. [culture §3.2, §4.1]
- CULT-026 Where the province is the homeland of the drifting tongue, the culture system shall multiply its drift by 0.5. [culture §3.2]
- CULT-027 Where a herding, forest or seafaring tongue lives in its own kind of land (steppe, deep forest, islands, as CULT-092 maps them), the culture system shall multiply its drift by 0.5. [culture §3.2]
- CULT-028 The culture system shall multiply a trading people's drift by 0.25. [culture §3.2]
- CULT-029 Where an *Own tongue* charter stands in the province, the culture system shall stop drift toward the court tongue there. [culture §3.2, §4.2]
- CULT-030 Where the province's nationalism support (the event tree's per-province value) is 0.3 or more, the culture system shall multiply every drift in that province by 0.25. [culture §3.2, §6.4; D-CULT-4]
- CULT-031 The culture system shall multiply drift by 1.25 for each of the inventions printing, mass schooling, newspapers and railways the country has. [culture §3.2]
- CULT-032 If a tongue falls below 1 % of a province, then the culture system shall remove it from that province. [culture §3.1]
- CULT-033 When a fourth tongue arrives in a province, the culture system shall let it replace the smallest of the three only if it is larger, and shall fold whichever group is the smallest of the four into the majority tongue (the same rule as RELG-024). [culture §3.3; D-CULT-5]

### 5.5 People moving
- CULT-034 When people move as settlers, refugees, homeless, returning soldiers or in an event migration, the culture system shall have them carry their tongue into the destination's Tongue mix. [culture §3.3]
- CULT-035 The culture system shall let settlers carry the court tongue into any of the country's own provinces with free tiles, not only colonies. [culture §3.3, §10 change 3]
- CULT-036 When refugees have stayed 2 years, the culture system shall count them in the Tongue mix. [culture §3.3]
- CULT-037 When soldiers come home, the culture system shall return them to their home tongue. [culture §3.3]

### 5.6 Tongue policy
- CULT-038 The culture system shall give each country one realm-wide Tongue policy (Let be, Teach or Impose), Teach by default, with a per-province override. [culture §4.1]
- CULT-039 While the Tongue policy is Teach, the culture system shall raise the upkeep of schools teaching in the court tongue by 10 %. [culture §4.1]
- CULT-040 While the Tongue policy is Impose, the culture system shall give the grievance *Banned tongue* in every province where most people are strangers, and where most are cousins once nationalism there is 0.3 or more. [culture §4.1, §5.2]
- CULT-041 When a country sets Impose (realm-wide or for a province) while it was not Impose before, the culture system shall make lords of the affected tongues waver one step, stranger lords first, once; keeping Impose costs no further steps. [culture §4.1, §5.1; D-CULT-7]
- CULT-042 If a country has neither the *Printing* invention nor the chancery-tradition flag, then the culture system shall refuse the Impose policy. [culture §4.1, §11.2]
- CULT-043 The culture system shall give the chancery-tradition flag from 1444 to Ming, Joseon, Castile and the Ottomans (config list). [culture §4.1, §11.2]
- CULT-044 When the Tongue policy becomes Let be or Teach, an *Own tongue* charter is granted, or the majority becomes kin, the culture system shall end *Banned tongue* in that province. [culture §5.2]

### 5.7 The *Own tongue* charter and other levers
- CULT-045 Where an *Own tongue* charter stands, the culture system shall end *Foreign rule* and *Banned tongue* in that province and require officials there to be of the local tongue. [culture §4.2]
- CULT-046 The culture system shall let the *Own tongue* charter be granted by the ruler, or be demanded by the province's lords, its towns or a homeland rising. [culture §4.2]
- CULT-047 When an *Own tongue* charter is revoked, the culture system shall give *Broken charter* as for any charter. [culture §4.2]
- CULT-048 Where a lord of the local tongue holds a homeland province, the culture system shall end *Foreign rule* there (the lord's tongue is the people's). [culture §4.3]
- CULT-049 When the ruler marries into a local house, the culture system shall count that house's lords as kin for loyalty. [culture §4.3]

### 5.8 Officials and lords
- CULT-050 The culture system shall bring an official to full effect after 5 years among kin, 7 among cousins and 10 among strangers, and after 5 if the official is of the province's own tongue. [culture §5.1; config officials.years_to_full_effect]
- CULT-051 The culture system shall give an official the tongue of the province where he was hired, or of the school he graduated from, and let the player hire officials of any tongue in the realm. [culture §5.1]
- CULT-052 Where an official of the province's majority tongue serves in a stranger province, the culture system shall not give *Banned tongue* there; *Foreign rule* stays. [culture §5.1; D-CULT-11]
- CULT-053 The culture system shall add no weight to the government's officials or lords caps for a province's tongue; a stranger province weighs only through its officials' longer learning time (CULT-050). [culture §5.1; D-CULT-1]
- CULT-054 The culture system shall give a kin lord (or a lord of a house the ruler married into) the realm's rising loyalty cause "shares your tongue", a stranger lord a start one step lower, and a cousin lord neither. [culture §5.1; country-stats §5.5; D-CULT-8]

### 5.9 Order and war
- CULT-055 When a homeland rising starts, the culture system shall have it draw 8 % of everyone of the tongue. [culture §5.2]
- CULT-056 While nationalism in a homeland is 0.5 or more, the culture system shall make its risings demand a new country, not self-rule. [culture §5.2, §6.4]
- CULT-057 The culture system shall give defenders of the homeland tongue, rebels included, +10 % in rough ground. [culture §5.2]
- CULT-058 The culture system shall allow a garrison captain of another tongue than his ruler to be bribed, cousins only after nationalism. [culture §5.2]
- CULT-059 The culture system shall allow the *Free a people* war aim on a stranger homeland, or a cousin homeland once nationalism there is 0.3 or more. [culture §5.2, §6.4]
- CULT-060 From the age of revolutions, the culture system shall supply diplomacy, which owns the war aim, the condition for *Gather our kin*: a province whose majority is the court tongue held by another country, and taking it gives no *Foreign rule*. [culture §5.2; D-CULT-12]
- CULT-061 From the age of revolutions, the culture system shall make kin provinces with nationalism 0.5 or more refill recruits 25 % faster and stranger provinces 25 % slower (*National levy*). [culture §5.2; config effects.national_levy]

### 5.10 Trade, research and diplomacy
- CULT-062 Where a diaspora tongue is at least 2 % of a province with a market, the culture system shall add +10 % trade value there and allow one extra trader from that tongue. [culture §5.3]
- CULT-063 When a trading people is persecuted or expelled (an event or a religion choice), the culture system shall end their bonus and send them as refugees to a neighbour, who gains the bonus. [culture §5.3]
- CULT-064 The culture system shall count a neighbour of the same family double toward the research cap of 60 % for inventions known by neighbours and trade partners. [culture §5.3]
- CULT-065 The culture system shall settle foreign scholars first in realms of their own family. [culture §5.3]
- CULT-066 The culture system shall give diplomacy two inputs: rulers of the same family start one step warmer, of the same court tongue two; after nationalism, a country holding many people of your court tongue is a natural rival. [culture §5.4]

### 5.11 History and nationalism
- CULT-067 When an event applies `spread: {kind: culture, id: <family>}`, the culture system shall raise the leading tongue of that family in each province of `where`, or the tongue named in `family_default_by_region`. [culture §6.1]
- CULT-068 Every 5 years the culture system shall run the engine-raised checks (court goes native, new tongue abroad, merge without event). [culture §9]
- CULT-069 When a country's court tongue has been under 20 % of its people for 50 years and one other tongue is over half, the culture system shall raise *The court goes native* with the choices *Take their tongue* and *Keep ours*. [culture §6.2, §11.4]
- CULT-070 When *Take their tongue* is chosen, the culture system shall make the majority tongue the court tongue, make old-tongue lords waver a step, and reclassify the old tongue's people as cousins or strangers. [culture §6.2]
- CULT-071 When *Keep ours* is chosen, the culture system shall change nothing and run the check again in 25 years. [culture §6.2]
- CULT-072 When settlers of a tongue with a `splits_to` entry have been the majority for 100 years in a map region on another continent (another top-level map region) than their court's capital, the culture system shall split their tongue into its `splits_to` tongue in that region, which counts as cousin to the old court and the old court to it. [culture §6.3; D-CULT-10]
- CULT-073 The culture system shall read nationalism from the event tree's per-province `ideology_support` and never set it. [culture §6.4]
- CULT-074 While nationalism in a province is 0.3 or more, the culture system shall count that province's cousins as strangers (*Foreign rule* in their homeland, drift toward the court ×0.25, *Free a people* opens). [culture §6.4]
- CULT-075 While nationalism in a province is 0.5 or more, the culture system shall make homeland risings demand a new country, and a released country take the catalogue record whose first culture is that people's tongue, or, if none fits, a generated one named after the tongue, with that tongue as court tongue and the form of the country it left. [culture §6.4; D-CULT-16]
- CULT-076 When a nation-building event runs `merge_tongues`, the culture system shall merge the named tongues into their national tongue (`merges_into`). [culture §6.4]
- CULT-077 When a nation state (a country whose court tongue is the `merges_into` of some tongue) has kept Impose for 50 years, the culture system shall merge, in its provinces, the tongues whose `merges_into` is its court tongue, without an event. [culture §6.4; config engine_events.merge_without_event; D-CULT-2]
- CULT-078 The culture system shall provide the event effects `tongue_spread`, `set_court_tongue`, `merge_tongues` and `move_people`, and the triggers `court_tongue`, `tongue_share`, `kin_of`, `cousin_of`, `stranger_to`. [culture §6.5]
- CULT-079 When `move_people` runs, the culture system shall have people of the tongue leave `from` as refugees and settle in `to`. [culture §6.5]

### 5.12 What the player sees
- CULT-080 The culture system shall show a coloured dot on each tongue of the province card's Tongue line: green kin, yellow cousin, red stranger, grey trading people. [culture §7.1]
- CULT-081 When the player taps the Tongue line, the culture system shall show this year's drift, which way it pulls and why. [culture §7.1]
- CULT-082 When the player taps the country card's Tongue line, the culture system shall open the Peoples screen. [culture §7.1]
- CULT-083 The culture system shall show the Peoples screen as one row per tongue in the realm, sorted by people, with relation, provinces, homeland, grievances, lords, charter and drift; grouped by family and folded shut; with the Tongue policy selector. [culture §1.1, §7.2]
- CULT-084 When the player taps a Peoples row, the culture system shall light its provinces on the map; a long-press shall show its lords, its officials and any rising. [culture §7.2]
- CULT-085 The culture system shall colour the Tongue lens by family at far zoom and by tongue at regional zoom, with a toggle to kin / cousin / stranger colours for the player's realm, and outline homelands of peoples without a country. [culture §7.3]

### 5.13 Data
- CULT-086 The culture system shall seed each province's top three tongues from its owner's catalogue `cultures` and `internal_divisions`, weighted to the homeland data. [culture §9]
- CULT-087 The culture system shall store per country the court tongue, Tongue policy and per-province overrides, and per province only one new byte for the *Own tongue* charter. [culture §9]
- CULT-088 The culture system shall work out Tongue % and the Peoples screen when opened. [culture §9]
- CULT-089 The culture system shall keep every family, tongue, rate, multiplier, threshold, policy effect and event hook in config (`culture.yaml`). [culture §9]

### 5.13a Decided rules (17 October)
- CULT-092 The culture system shall count a province as steppe for herding tongues when its ground is grassland or drylands, as deep forest for forest tongues when its ground is forest or jungle, and as islands for seafaring tongues when it touches the sea. [culture §3.2; config drift.way_of_life_lands; D-CULT-9]
- CULT-093 The culture system shall let every government form choose any Tongue policy; only *Impose*'s need for *Printing* or the chancery tradition limits it. [government v2; D-CULT-2]

### 5.14 AI
- CULT-090 The culture system shall let AI countries choose Tongue policy by personality: hegemon seeker and expansionist *Teach*, then *Impose* once they have printing; isolationist and mercantile *Let be*; opportunist and zealot *Teach*. [culture §8]
- CULT-091 The culture system shall let AI countries use the levers listed per personality: settlers into conquered border provinces and *Gather our kin* after 1789 (hegemon seeker, expansionist); *Own tongue* charters and welcoming trading peoples (isolationist, mercantile); *Free a people* against neighbours with stranger homelands in revolt (opportunist); expelling trading peoples of another faith (zealot). [culture §8]

## 6. Commands

| Command | Who | Preconditions | Result | Events emitted |
|---|---|---|---|---|
| `SetTonguePolicy(country, policy)` | player / AI | Impose needs *Printing* or chancery tradition | Realm policy set | `TonguePolicyChanged` |
| `SetProvinceTonguePolicy(country, province, policy)` | player / AI | Own province; Impose as above | Override set | `TonguePolicyChanged` |
| `GrantOwnTongueCharter(country, province)` | player / AI / system (demand) | Own province | Charter stands | `OwnTongueCharterGranted` |
| `RevokeOwnTongueCharter(country, province)` | player / AI | Charter stands | Charter gone; *Broken charter* | `OwnTongueCharterRevoked` |
| `AnswerCourtGoesNative(country, choice)` | player / AI | Event raised | Take their tongue / Keep ours | `CourtTongueChanged` (take) |
| `ApplyCultureEffect(verb, params)` | system (events) | Event effect | Spread, set court tongue, merge, move people | `TongueMixChanged`, `CourtTongueChanged`, `TonguesMerged` |

## 7. Domain events

| Event | When | Payload | Consumed by |
|---|---|---|---|
| `TongueDriftApplied` | Yearly per province | province, pull tongue, moved shares | province, map-presentation |
| `TongueMixChanged` | Drift, movement, verbs | province, top three | realm (Tongue %), map-presentation |
| `CourtTongueChanged` | Dynasty, event, court goes native | country, old, new | audio, realm, diplomacy |
| `TonguePolicyChanged` | Policy set | country, province?, policy | province (*Banned tongue*), realm (lords waver), buildings (school upkeep) |
| `BannedTongueStarted` / `Ended` | §5.6 | province | province, rebellions |
| `OwnTongueCharterGranted` / `Revoked` | §5.7 | province | province |
| `CourtGoesNativeRaised` | Check passes | country, majority tongue | events, game-shell |
| `TongueSplitAbroad` | 100 years settler majority | region, old, new tongue | revolutions, diplomacy |
| `TonguesMerged` | Event or 50 years Impose | ids, into, where | province, events |

## 8. Policies (reactions to other contexts)
- When the throne passes to a dynasty of another tongue (realm), then CULT sets the court tongue.
- When people move (province: settlers, refugees, homeless, soldiers home), then CULT adds their tongue to the destination mix.
- When an event applies `spread` (kind culture), `tongue_spread`, `set_court_tongue`, `merge_tongues` or `move_people` (events), then CULT applies it.
- When nationalism support in a province crosses 0.3 or 0.5 (events), then CULT reclassifies cousins and changes rising demands.
- When a trading people is persecuted or expelled (religion or events), then CULT ends their bonus and moves them as refugees.
- When a revolutionary regime pushes the state tongue (revolutions), then CULT applies `set_court_tongue`; the creole republic adopts the creole tongue as court tongue.
- When a school is built (buildings), then CULT reads its teaching tongue for drift.

## 9. Monthly step
- Not monthly. Yearly (in the turn in which 1 January falls, X-18): drift in every province after births and deaths (needs province population, officials, lords, schools, policy, charters, nationalism, inventions).
- Every 5 years: engine-raised checks (court goes native, new tongue abroad, merge without event).
- On demand: Tongue % and Peoples screen when opened.
- Immediate: policy changes, charters, event verbs.

## 10. Configuration

All numbers are placeholders (culture-config.example.yaml: "Placeholder numbers for balancing"); `culture.json` lists them in its `_provisional` array.

| Key | Meaning | Value in the design | Placeholder? | Config file |
|---|---|---|---|---|
| `families_added` | New families | celtic, baltic, caucasian, hebrew | no (decided 16 Oct) | culture.yaml |
| `relation.kin/cousin/stranger/trading.tongue_share_weight` | Weight toward Tongue % | 1.0 / 0.5 / 0.0 / 0.0 | yes | culture.yaml |
| `relation.*.foreign_rule` | Gives *Foreign rule* | cousin false, stranger true, trading false | yes | culture.yaml |
| `relation.cousin.drift_multiplier` | Cousin drift | 2.0 | yes | culture.yaml |
| `drift.base_rate_per_year` | Base drift | 0.005 | yes | culture.yaml |
| `drift.court_pull_needs_years_held` | Years for court pull | 20 | yes | culture.yaml |
| `drift.court_pull_needs` | Governed by | own_official, lord_of_court_tongue | yes | culture.yaml |
| `drift.drop_below_share` | Remove tongue below | 0.01 | yes | culture.yaml |
| `drift.multipliers.*` | town 2.0, school 1.5, schoolmaster 2.0, homeland 0.5, way of life 0.5, diaspora 0.25, nationalism 0.25, own-tongue charter 0.0, inventions 1.25 each (printing, mass schooling, newspapers, railways) | as listed | yes | culture.yaml |
| `policy.let_be/teach/impose.drift` | 0.5 / 1.0 / 2.0 | as listed | yes | culture.yaml |
| `policy.teach.school_upkeep` | 1.10 | | yes | culture.yaml |
| `policy.impose` | grievance banned_tongue, stranger_lords_waver 1, needs printing or chancery tradition | | yes | culture.yaml |
| `start_flag_chancery_tradition` | ming, joseon, castile, ottoman | | no (decided) | culture.yaml |
| `officials.years_to_full_effect` | kin 5, cousin 7, stranger 10, local_tongue 5 | | yes | culture.yaml |
| `effects.trading_people` | min_share 0.02, needs market, trade_value 0.10, extra_traders 1 | | yes | culture.yaml |
| `effects.family_neighbour_research_weight` | 2.0 | | yes | culture.yaml |
| `effects.national_levy` | needs_nationalism 0.5, kin_refill 1.25, stranger_refill 0.75, from age_of_revolutions | | yes | culture.yaml |
| `risings.homeland_draw` | Homeland rising draws this share of the tongue | 0.08 | yes (D-CULT-13) | culture.json |
| (design) locals know the land | +10 % defenders | 0.10 | yes | province (`localsBonus`) |
| `refugees.settle_after_years` | Refugees count in the mix after | 2 | yes (D-CULT-13) | culture.json |
| `drift.way_of_life_lands` | herding: grassland, drylands; forest: forest, jungle; seafaring: coastal | as listed | yes (D-CULT-9) | culture.json |
| `schools.learned_tongues` | Latin, Classical Arabic: no teaching tongue for drift | as listed | no (D-CULT-15) | culture.json |
| `nationalism.cousins_become_strangers_at` | 0.3 | | yes | culture.yaml |
| `nationalism.homeland_demands_country_at` | 0.5 | | yes | culture.yaml |
| `engine_events.court_goes_native` | court_share_below 0.20, for_years 50, other_tongue_above 0.5, recheck_years 25 | | yes | culture.yaml |
| `engine_events.new_tongue_abroad` | settler_majority_years 100; region = a map region; separated by sea = another top-level map region than the court's capital | | yes (D-CULT-10) | culture.json |
| `engine_events.merge_without_event` | needs_policy impose, years 50; nation state = court tongue is some tongue's `merges_into` | | yes (D-CULT-2) | culture.json |
| `engine_events.check_every_years` | Engine checks run every 5 years from 1444 | 5 | yes (D-CULT-13) | culture.json |
| `family_default_by_region` | cushitic: ethiopian_highlands → oromo; latin: iberia, americas → castilian | sample | yes | culture.yaml |
| `tongues[]` | id, name, family, way_of_life, diaspora, merges_into, splits_to, local_names (sample of 28; full ~600) | | yes | culture.yaml |

## 11. Seams

| Other context | Direction | Pattern | What crosses |
|---|---|---|---|
| province | partnership | Shared Kernel | Tongue mix (top three), homeland, years held, officials and their tongue, charters (*Own tongue*), grievances (*Banned tongue*, *Foreign rule*); proposed changes to 6.4, 10.2, 10.4, 12.1 |
| realm | downstream | Customer–Supplier | Tongue % on the country card (cousins half, D-CULT-6); lords' loyalty: "shares your tongue" cause for kin, stranger starts a step lower (D-CULT-8), one waver when Impose is set (D-CULT-7), court goes native; dynasty changes upstream |
| government | downstream | Customer–Supplier | Settled: no capacity weight by tongue (D-CULT-1) and no limits on Tongue policy by form (D-CULT-2); culture reads the form only for a released country |
| religion | partnership | Partnership | Same shapes (mix, buildings, charter); trading peoples of another faith; persecution/expulsion of a trading people |
| buildings | upstream | Customer–Supplier | Schools carry a teaching tongue; Teach raises their upkeep 10 % |
| research | partnership | Customer–Supplier | Printing (Impose), printing/mass schooling/newspapers/railways (drift); family neighbours count double toward the 60 % cap; scholars settle by family |
| events | upstream | Published Language | `culture_groups` enum (+4 families), `spread`, nationalism `ideology_support`, new verbs and triggers, migrations, the culture effects for events in §6.1 |
| rebellions | downstream | Customer–Supplier | Homeland risings draw 8 %, demand a new country at ≥ 0.5 (released country per D-CULT-16); demands for *Own tongue* charter; *Banned tongue* not given under a local official (D-CULT-11) |
| warfare | downstream | Customer–Supplier | Garrison bribes; locals know the land |
| diplomacy | downstream | Published Language | Family warmth (+1 / +2 steps), natural rival after nationalism, marriages make lords kin; diplomacy owns the war aims *Gather our kin* and *Free a people*, culture supplies their conditions (D-CULT-12) |
| recruiting | downstream | Customer–Supplier | *National levy* refill ±25 % |
| trade | downstream | Customer–Supplier | Trading peoples: +10 % trade value, one extra trader |
| subjects | downstream | Customer–Supplier | Subject of your court tongue integrates faster; a stranger subject's independence war draws its people |
| national-strengths | upstream | Customer–Supplier | Tongue-based strengths (trading network, chancery tradition) |
| revolutions | partnership | Customer–Supplier | Creole tongues and nationalism thresholds as signs; regimes use `set_court_tongue` |
| naval | downstream | Conformist | Seafaring tongues drift slowly on islands; sailors keep their tongue |
| audio | downstream | Published Language | Music palette follows the court tongue's family; palettes for the 4 new families |
| map-presentation | downstream | Published Language | Tongue lens at three zooms, dots, outlines |
| world-map | upstream | Conformist | Ground and coast for the way-of-life lands (D-CULT-9); map regions and their top-level region for new tongues abroad (D-CULT-10) |
| scenario-setup | downstream | Published Language | Court tongue and province top three tongues at start |
| time-and-turns | upstream | Conformist | Yearly drift slot after births and deaths; 5-yearly checks |

## 12. AI

As CULT-090 and CULT-091: the AI reads the same counts and chooses by catalogue personality (hegemon seeker /
expansionist: Teach, then Impose with printing, settlers into conquered border provinces, *Gather our kin* after
1789; isolationist / mercantile: Let be, *Own tongue* charters, welcomes trading peoples; opportunist: Teach,
*Free a people* against neighbours with stranger homelands in revolt; zealot: Teach, usually follows religion's
choices, expels trading peoples of another faith).

## 13. Decisions and open questions

Decided on 17 October 2026 under DECISIONS.md (latest decision wins, simpler rule, no new mechanics, provisional numbers in `culture.json`).

- **D-CULT-1** (was OQ-CULT-1) Capacity weight: dropped. A province's tongue adds no weight to the officials or lords caps; a stranger province costs only through its officials' 10-year learning time (CULT-050). Government v2, the later design, counts officials and lords, not provinces.
- **D-CULT-2** (was OQ-CULT-2) Nation state and form limits: no government form limits the Tongue policy (CULT-093). A "nation state" for merging without an event is a country whose court tongue is the `merges_into` of some tongue (Italian, German); after 50 years of *Impose* it merges, in its provinces, the tongues whose `merges_into` is its court tongue. Government v2 has no such limits and no nation-state form, and the tongue data already names the national tongues.
- **D-CULT-3** (was OQ-CULT-3) Family count: 43 families, the event tree's 39 `culture_groups` plus celtic, baltic, caucasian and hebrew; English and Dutch get the family germanic in the data. The data is the count; "38 + 4 = 42" was a miscount.
- **D-CULT-4** (was OQ-CULT-4) Nationalism for drift: the province's own nationalism support (the event tree's per-province value) is read; at 0.3 or more every drift in the province is multiplied by 0.25. The event tree stores nationalism per province, not per tongue.
- **D-CULT-5** (was OQ-CULT-5) Fourth tongue: one rule for tongues and faiths. A newcomer enters only if larger than the smallest of the three; the smallest group of the four (the old smallest, or the newcomers) joins the majority. One storage rule should have one behaviour, and nobody is lost.
- **D-CULT-6** (was OQ-CULT-6) Changes for other designs: culture's rules are followed where the older province and country stats text differs: Tongue % counts cousins half, *Foreign rule* is for strangers' homelands (cousins from nationalism 0.3), officials learn by relation, settlers may go to any own province with free tiles, and the four new event verbs and five triggers exist. The music palettes for the new families follow the culture proposal (celtic 1, baltic 2, caucasian 2, hebrew 3) for audio to take. Culture's design is the later one on these points.
- **D-CULT-7** (was OQ-CULT-7) Lords waver under *Impose*: once, when the policy turns to *Impose*, stranger lords first; keeping it costs nothing more. The simpler rule, and the yearly cost is already the *Banned tongue* grievance.
- **D-CULT-8** (was OQ-CULT-8) Lords' tongue and loyalty: a kin lord (or one of a house the ruler married into) has the realm's rising cause "sharing your tongue"; a stranger lord starts one step lower; a cousin lord has neither. Country stats §5.5 already lists sharing your tongue as a loyalty cause.
- **D-CULT-9** (was OQ-CULT-9) Own kind of land: steppe is grassland or drylands ground, deep forest is forest or jungle ground, islands is any province touching the sea (CULT-092). These are the world map's own grounds and coasts; no new terrain is needed.
- **D-CULT-10** (was OQ-CULT-10) New tongue abroad: the region is a map region; it is separated by sea when its top-level map region (continent) differs from that of the court's capital. Only tongues with a `splits_to` entry split, and the split tongue and the old court count each other as cousins. The map's region tree already exists.
- **D-CULT-11** (was OQ-CULT-11) Local official: while an official of the province's majority tongue serves in a stranger province, *Banned tongue* is not given there; *Foreign rule* stays. Grievances are counts, so "not made worse" means one grievance fewer.
- **D-CULT-12** (was OQ-CULT-12) *Gather our kin*: diplomacy owns it as a war aim, like *Free a people*; culture supplies the condition. War aims live in diplomacy.
- **D-CULT-13** (was OQ-CULT-13) Missing keys: `risings.homeland_draw` 0.08, `refugees.settle_after_years` 2 and `engine_events.check_every_years` 5 (counted from 1444) are in `culture.json` and listed as provisional. The design says every threshold lives in config.
- **D-CULT-14** (was OQ-CULT-14) Trading people and Tongue %: confirmed weight 0; they are neither kin nor stranger for grievances. They are not of the court's tongue, and the design only shields them from grievances.
- **D-CULT-15** (was OQ-CULT-15) Schools of a learned tongue: a school teaching Latin or Classical Arabic has no teaching tongue and speeds no drift; other schools carry a tongue id. Nobody's home tongue is Latin, so such a school can never be in the pull tongue.
- **D-CULT-16** (was OQ-CULT-16) Released country: it takes the catalogue record whose first culture is the tongue (X-13 keeps such records as reference data); if none fits, a generated country named after the tongue, with that tongue as court tongue and the form of the country it left. The fewest new parts.
- **D-CULT-17** (was OQ-CULT-17) Court pull: any official of the country counts, whatever his tongue. The config's `own_official` says so, and the official's tongue already works through learning time.

## 14. Traceability

| Requirement | Feature file | Scenario |
|---|---|---|
| CULT-001 … CULT-008 | tongues-and-relations.feature | Families; Two levels; Catalogue strings; Tongue fields |
| CULT-009 … CULT-011 | tongues-and-relations.feature | Court tongue at the start; A new dynasty |
| CULT-012 … CULT-015 | tongues-and-relations.feature | Relation to the court; Tongue % for France; Trading peoples; Foreign rule before nationalism |
| CULT-016 … CULT-033 | drift.feature | Troyes; Pull tongue; Multipliers; Charter stops drift; Small shares; Fourth tongue; A school in a learned tongue |
| CULT-034 … CULT-037 | drift.feature | People carry their tongue |
| CULT-038 … CULT-049 | tongue-policy.feature | Policy effects; Impose needs printing; Banned tongue; Own tongue charter; levers |
| CULT-050 … CULT-061 | culture-effects.feature | Officials; A local official keeps Banned tongue away; A province's tongue does not weigh on the government caps; Lords and tongue; risings; war |
| CULT-062 … CULT-066 | culture-effects.feature | Trading peoples; research; diplomacy |
| CULT-067 … CULT-079 | culture-history.feature | Spread; court goes native; New tongues abroad; Settlers who stay keep their tongue; nationalism; Merging by event; Merging without an event; verbs |
| CULT-080 … CULT-085 | peoples-screen.feature | Dots; Peoples screen; lens |
| CULT-086 … CULT-089 | tongues-and-relations.feature | Starting tongues; config (CULT-087, CULT-089: storage and config, checked by data review rather than play: presentation of data only) |
| CULT-090, CULT-091 | culture-ai.feature | AI tongue policy by personality |
| CULT-092 | drift.feature | A way of life's own kind of land |
| CULT-093 | tongue-policy.feature | Any form may choose any Tongue policy |
