# Culture (CULT)

## 1. Purpose and scope

Culture is **language**: the people a person belongs to, the speech they share, and the land they see as theirs.
This context decides what a language and a family are, which language a country's court has, how every person relates
to that court (same language, related, foreign, or trading people), how languages **drift** each year, the player's levers
(Language policy, the *Own language* charter), the effects of language on officials, lords, order, war, trade, research
and diplomacy, and how languages move through history (court goes native, new languages abroad, nationalism, merging).

**In scope**
- Languages (about 600) and families (42), the court language, same language / related / foreign / trading people.
- Language % on the country card (the formula), the Language mix rules (drift and its multipliers).
- Language policy (Let be / Teach / Impose), the *Own language* charter, the *Banned language* grievance's start and end.
- Culture's inputs to other contexts (learning time of officials, loyalty steps, risings, war aims, levy, trade,
  research, diplomacy).
- Engine-raised culture events, nationalism thresholds, language merges and splits, the four new event verbs.
- The Peoples screen, language dots and the Language lens content.

**Not in scope (owned by …)**
- Storing the province's top three languages, homeland, years held, officials, charters and grievances (province).
- Moving people as settlers, refugees, homeless and soldiers (province); event migrations as events (events).
- Lords and loyalty steps (realm); risings (rebellions); war aims and garrisons (warfare, diplomacy);
  recruit refill (recruiting); trade value and traders (trade); research cost (research).
- Nationalism support values (events: `ideology_support`). Music palettes (audio).
- Faith: kept separate on purpose (religion).

## 2. Sources

Newest decision first.
1. `culture/culture-design.md` §11 "Decisions (16 October)": four new families; early *Impose* for chancery-tradition states; about 600 languages; two courts dropped.
2. `culture/culture-design.md` version 1, all sections 1–10 (including "Changes for other files").
3. `culture/culture-config.example.yaml` (example config, version 1).
4. Read for seams only: event-tree `data/enums.yaml` (culture_groups), province-stats 10.1, 10.2, 12.1, country-stats 4,
   government-design v2, religion-design, revolutions changes-for-other-designs (culture).

## 3. Ubiquitous language

| Term | Meaning | Not to be confused with |
|---|---|---|
| Language (was Tongue) | One people: what a province counts and the province card shows (French, Occitan, Mandinka) | Family |
| Family | A broad group of related languages; uses the event tree's `culture_groups` ids, plus celtic, baltic, caucasian, hebrew | Faith family (religion); form family (government) |
| Court language (was Court tongue) | The language of the ruler's house and court; one per country | The majority language |
| Same language (was Kin) | People of your court language; `kin` in config and code | "Kin faith" (religion) |
| Related (was Cousin) | People of another language of your court language's family; `cousin` in config and code | — |
| Foreign (was Stranger) | People of a language of another family; `stranger` in config and code | — |
| Trading people | A diaspora language; never foreign for grievances | — |
| Diaspora | Language flag for peoples who live scattered among others as merchants and craftsmen | — |
| Language % (was Tongue %) | Share of the realm's people of the same language, plus half of those of a related one | Language mix |
| Language mix (was Tongue mix) | A province's top three languages and their shares (stored by province) | — |
| Drift | The yearly move of a share of people from one language to another | Conversion of faith (religion "drift") |
| Pull language (was Pull tongue) | The one language a province's people drift toward this year; the player reads "the language it drifts toward" | Faith pull (religion) |
| Homeland | Provinces a language sees as its own (province stats 10.1 *Homeland of*) | — |
| Way of life | settled, herding, forest, seafaring or trading | — |
| Language policy (was Tongue policy) | Realm-wide setting Let be / Teach / Impose, with per-province overrides | Faith policy (religion) |
| *Own language* (was *Own tongue*) | Charter: the local language is used in courts and schools | *Faith tolerance* charter |
| *Banned language* (was *Banned tongue*) | Grievance from *Impose* in a foreign-language province | *Foreign rule* |
| *Foreign rule* | Existing grievance in a homeland held by a ruler of a foreign language (related ones once nationalism ≥ 0.3) | — |
| Chancery tradition | Start flag letting a state *Impose* from 1444 (Ming, Joseon, Castile, the Ottomans) | The chancery building |
| Nationalism | The event tree's per-province `ideology_support` for nationalism, 0 to 1; culture only reads it | — |
| Court goes native | Engine-raised event when the court language is a small minority for long | — |
| New language abroad (was New tongue abroad) | A settler language splitting into its `splits_to` language | — |
| Merge languages (was Merge tongues) | Folding languages into their `merges_into` national language | — |
| Peoples screen | One row per language in the realm | — |

## 4. Domain model

### Aggregates

**Language** (reference data; identity: language id)
- Holds: name, family, homeland provinces, way of life, diaspora flag, `merges_into`, `splits_to`, local names.
- INV-CULT-1: every language belongs to exactly one family, and every family is a `culture_groups` id or one of the four added.
- INV-CULT-2: only two levels exist (family, language); no sub-languages.
- INV-CULT-3: a `splits_to` language is in the `creole_atlantic` family (all listed splits are).

**CountryCulture** (identity: country id)
- Holds: court language, Language policy, per-province policy overrides; derived Language %.
- INV-CULT-4: a country has exactly one court language.
- INV-CULT-5: Language % = (same-language people + ½ related-language people) ÷ realm people; computed on opening, never stored.
- INV-CULT-6: *Impose* may be set only with *Printing* or the chancery-tradition flag.

**ProvinceTongues** (identity: province id; storage owned by province)
- Holds (read/written through the province): top three languages and shares, homeland, years held, *Own language* charter (one byte).
- INV-CULT-7: at most three languages per province; a language under 1 % is removed.
- INV-CULT-8: each year a province has exactly one pull language.

### Entities and value objects
- **Relation** (value): same language | related | foreign | trading (`kin` | `cousin` | `stranger` | `trading` in code), between a person's language and a court language, modified by nationalism.
- **DriftRate** (value): base rate × applicable multipliers.
- **TonguePolicy** (value): let_be | teach | impose.
- **EngineCultureCheck** (entity, per country): timers for court goes native (50 years, recheck 25), merge without event (50 years of *Impose*); per region: settler-majority years for new language abroad (100).

### Domain services
- **RelationService**: same language / related / foreign / trading for a language and a court, given the province's nationalism.
- **DriftService**: yearly pull language and drift per province.
- **TongueShareService**: Language % and Peoples screen rows on demand.
- **CultureEventService**: the 5-yearly engine checks and the four effect verbs.

## 5. Requirements

### 5.1 Languages and families
- CULT-001 The culture system shall give every person a language and every language one family. [culture §1.1]
- CULT-002 The culture system shall use the event tree's `culture_groups` ids as families, plus `celtic`, `baltic`, `caucasian` and `hebrew` (43 in all: the event tree's 39 groups plus the four). [culture §1.1, §11.1; D-CULT-3]
- CULT-003 The culture system shall have exactly two levels, family and language, with about 600 languages in config. [culture §1.1, §11.3]
- CULT-004 The culture system shall map the catalogue's culture strings (1,468) onto languages once, folding only near-duplicates, and keep the original string as the language's local name in tooltips. [culture §1.1, §9]
- CULT-005 If a catalogue culture string cannot be mapped, then the culture system shall put it on a review list. [culture §9]
- CULT-006 The culture system shall keep apart languages where history turns on the split (French and Occitan, Castilian and Catalan, Great Russian and Ruthenian) and regional peoples until a nation-building merge. [culture §1.1]
- CULT-007 The culture system shall give each language an id, name, family, homeland, way of life (settled, herding, forest, seafaring or trading), a diaspora flag, and optionally `merges_into` and `splits_to`. [culture §1.2]
- CULT-008 The culture system shall have no culture meter, no "cultural power" and no list of accepted cultures. [culture intro]

### 5.2 Court language
- CULT-009 The culture system shall give every country one court language, starting as the first culture in its catalogue record mapped to a language (event tree `primary_culture`). [culture §1.3, §9]
- CULT-010 When a new dynasty of another language takes the throne (by conquest, inheritance, marriage or a lord's revolt), the culture system shall set the court language to that dynasty's language. [culture §1.3]
- CULT-011 When the court language changes, the culture system shall recompute who shares the court language and which lords share it, and the music palette shall change from the next track. [culture §1.3]

### 5.3 Same language, related, foreign and trading peoples
- CULT-012 The culture system shall classify every person as of the same language (the court language), related (another language of the same family) or foreign (a language of another family). [culture §2]
- CULT-013 The culture system shall work out Language % as the share of the realm's people of the same language plus half of those of a related one. [culture §1.3, §2; config relation]
- CULT-014 The culture system shall treat a trading people (diaspora language) as never foreign for grievances, counting neither as the same language nor foreign for grievances. [culture §2, §5.3]
- CULT-015 While nationalism in a province is under 0.3, the culture system shall give *Foreign rule* only for homelands of foreign languages, never for related ones. [culture §2, §5.2]

### 5.4 Drift
- CULT-016 When a year ends, the culture system shall run drift in every province, after births and deaths. [culture §3, §9]
- CULT-017 The culture system shall make the court language a province's pull language if the province has been held 20 years or more and is governed by any official of the country, whatever his language, or by a lord of the court language. [culture §3.1; config drift.court_pull_needs; D-CULT-17]
- CULT-018 Otherwise the culture system shall make the province's majority language its pull language. [culture §3.1]
- CULT-019 The culture system shall move no people already of the pull language, and move people of every other language toward it at the drift rate. [culture §3.1]
- CULT-020 The culture system shall set the yearly drift rate to a base 0.5 % of the other languages' people, times every multiplier that applies. [culture §3.2]
- CULT-021 The culture system shall multiply drift by 2 for town classes (craftsmen, market folk, clerks, scholars). [culture §3.2]
- CULT-022 The culture system shall multiply drift by 2 for a language related to the pull language. [culture §2, §3.2]
- CULT-023 Where a school in the province teaches in the pull language, the culture system shall multiply drift by 1.5; a school of another language counts for that language, and a school in a learned language (Latin, Classical Arabic) counts for no language. [culture §3.2, §4.3; D-CULT-15]
- CULT-024 Where a Schoolmaster official serves in the province, the culture system shall multiply drift by 2. [culture §3.2]
- CULT-025 The culture system shall multiply drift by 0.5 / 1 / 2 under the Language policy Let be / Teach / Impose. [culture §3.2, §4.1]
- CULT-026 Where the province is the homeland of the drifting language, the culture system shall multiply its drift by 0.5. [culture §3.2]
- CULT-027 Where a herding, forest or seafaring language lives in its own kind of land (steppe, deep forest, islands, as CULT-092 maps them), the culture system shall multiply its drift by 0.5. [culture §3.2]
- CULT-028 The culture system shall multiply a trading people's drift by 0.25. [culture §3.2]
- CULT-029 Where an *Own language* charter stands in the province, the culture system shall stop drift toward the court language there. [culture §3.2, §4.2]
- CULT-030 Where the province's nationalism support (the event tree's per-province value) is 0.3 or more, the culture system shall multiply every drift in that province by 0.25. [culture §3.2, §6.4; D-CULT-4]
- CULT-031 The culture system shall multiply drift by 1.25 for each of the inventions printing, mass schooling, newspapers and railways the country has. [culture §3.2]
- CULT-032 If a language falls below 1 % of a province, then the culture system shall remove it from that province. [culture §3.1]
- CULT-033 When a fourth language arrives in a province, the culture system shall let it replace the smallest of the three only if it is larger, and shall fold whichever group is the smallest of the four into the majority language (the same rule as RELG-024). [culture §3.3; D-CULT-5]

### 5.5 People moving
- CULT-034 When people move as settlers, refugees, homeless, returning soldiers or in an event migration, the culture system shall have them carry their language into the destination's Language mix. [culture §3.3]
- CULT-035 The culture system shall let settlers carry the court language into any of the country's own provinces with free tiles, not only colonies. [culture §3.3, §10 change 3]
- CULT-036 When refugees have stayed 2 years, the culture system shall count them in the Language mix. [culture §3.3]
- CULT-037 When soldiers come home, the culture system shall return them to their home language. [culture §3.3]

### 5.6 Language policy
- CULT-038 The culture system shall give each country one realm-wide Language policy (Let be, Teach or Impose), Teach by default, with a per-province override. [culture §4.1]
- CULT-039 While the Language policy is Teach, the culture system shall raise the upkeep of schools teaching in the court language by 10 %. [culture §4.1]
- CULT-040 While the Language policy is Impose, the culture system shall give the grievance *Banned language* in every province where most people speak a foreign language, and where most speak a related language once nationalism there is 0.3 or more. [culture §4.1, §5.2]
- CULT-041 When a country sets Impose (realm-wide or for a province) while it was not Impose before, the culture system shall make lords of the affected languages waver one step, foreign-language lords first, once; keeping Impose costs no further steps. [culture §4.1, §5.1; D-CULT-7]
- CULT-042 If a country has neither the *Printing* invention nor the chancery-tradition flag, then the culture system shall refuse the Impose policy. [culture §4.1, §11.2]
- CULT-043 The culture system shall give the chancery-tradition flag from 1444 to Ming, Joseon, Castile and the Ottomans (config list). [culture §4.1, §11.2]
- CULT-044 When the Language policy becomes Let be or Teach, an *Own language* charter is granted, or the majority comes to speak the court language, the culture system shall end *Banned language* in that province. [culture §5.2]

### 5.7 The *Own language* charter and other levers
- CULT-045 Where an *Own language* charter stands, the culture system shall end *Foreign rule* and *Banned language* in that province and require officials there to be of the local language. [culture §4.2]
- CULT-046 The culture system shall let the *Own language* charter be granted by the ruler, or be demanded by the province's lords, its towns or a homeland rising. [culture §4.2]
- CULT-047 When an *Own language* charter is revoked, the culture system shall give *Broken charter* as for any charter. [culture §4.2]
- CULT-048 Where a lord of the local language holds a homeland province, the culture system shall end *Foreign rule* there (the lord's language is the people's). [culture §4.3]
- CULT-049 When the ruler marries into a local house, the culture system shall count that house's lords as the same language for loyalty. [culture §4.3]

### 5.8 Officials and lords
- CULT-050 The culture system shall bring an official to full effect after 5 years among the same language, 7 among a related one and 10 among a foreign one, and after 5 if the official is of the province's own language. [culture §5.1; config officials.years_to_full_effect]
- CULT-051 The culture system shall give an official the language of the province where he was hired, or of the school he graduated from, and let the player hire officials of any language in the realm. [culture §5.1]
- CULT-052 Where an official of the province's majority language serves in a foreign-language province, the culture system shall not give *Banned language* there; *Foreign rule* stays. [culture §5.1; D-CULT-11]
- CULT-053 The culture system shall add no weight to the government's officials or lords caps for a province's language; a foreign-language province weighs only through its officials' longer learning time (CULT-050). [culture §5.1; D-CULT-1]
- CULT-054 The culture system shall give a same-language lord (or a lord of a house the ruler married into) the realm's rising loyalty cause "shares your language", a foreign-language lord a start one step lower, and a related-language lord neither. [culture §5.1; country-stats §5.5; D-CULT-8]

### 5.9 Order and war
- CULT-055 When a homeland rising starts, the culture system shall have it draw 8 % of everyone of the language. [culture §5.2]
- CULT-056 While nationalism in a homeland is 0.5 or more, the culture system shall make its risings demand a new country, not self-rule. [culture §5.2, §6.4]
- CULT-057 The culture system shall give defenders of the homeland language, rebels included, +10 % in rough ground. [culture §5.2]
- CULT-058 The culture system shall allow a garrison captain of another language than his ruler to be bribed, related languages only after nationalism. [culture §5.2]
- CULT-059 The culture system shall allow the *Free a people* war aim on a foreign homeland, or a related homeland once nationalism there is 0.3 or more. [culture §5.2, §6.4]
- CULT-060 From the age of revolutions, the culture system shall supply diplomacy, which owns the war aim, the condition for *Gather our kin*: a province whose majority is the court language held by another country, and taking it gives no *Foreign rule*. [culture §5.2; D-CULT-12]
- CULT-061 From the age of revolutions, the culture system shall make same-language provinces with nationalism 0.5 or more refill recruits 25 % faster and foreign-language provinces 25 % slower (*National levy*). [culture §5.2; config effects.national_levy]

### 5.10 Trade, research and diplomacy
- CULT-062 Where a diaspora language is at least 2 % of a province with a market, the culture system shall add +10 % trade value there and allow one extra trader from that language. [culture §5.3]
- CULT-063 When a trading people is persecuted or expelled (an event or a religion choice), the culture system shall end their bonus and send them as refugees to a neighbour, who gains the bonus. [culture §5.3]
- CULT-064 The culture system shall count a neighbour of the same family double toward the research cap of 60 % for inventions known by neighbours and trade partners. [culture §5.3]
- CULT-065 The culture system shall settle foreign scholars first in realms of their own family. [culture §5.3]
- CULT-066 The culture system shall give diplomacy two inputs: rulers of the same family start one step warmer, of the same court language two; after nationalism, a country holding many people of your court language is a natural rival. [culture §5.4]

### 5.11 History and nationalism
- CULT-067 When an event applies `spread: {kind: culture, id: <family>}`, the culture system shall raise the leading language of that family in each province of `where`, or the language named in `family_default_by_region`. [culture §6.1]
- CULT-068 Every 5 years the culture system shall run the engine-raised checks (court goes native, new language abroad, merge without event). [culture §9]
- CULT-069 When a country's court language has been under 20 % of its people for 50 years and one other language is over half, the culture system shall raise *The court goes native* with the choices *Take their language* and *Keep ours*. [culture §6.2, §11.4]
- CULT-070 When *Take their language* is chosen, the culture system shall make the majority language the court language, make old-language lords waver a step, and reclassify the old language's people as related or foreign. [culture §6.2]
- CULT-071 When *Keep ours* is chosen, the culture system shall change nothing and run the check again in 25 years. [culture §6.2]
- CULT-072 When settlers of a language with a `splits_to` entry have been the majority for 100 years in a map region on another continent (another top-level map region) than their court's capital, the culture system shall split their language into its `splits_to` language in that region, which counts as related to the old court and the old court to it. [culture §6.3; D-CULT-10]
- CULT-073 The culture system shall read nationalism from the event tree's per-province `ideology_support` and never set it. [culture §6.4]
- CULT-074 While nationalism in a province is 0.3 or more, the culture system shall count that province's related languages as foreign (*Foreign rule* in their homeland, drift toward the court ×0.25, *Free a people* opens). [culture §6.4]
- CULT-075 While nationalism in a province is 0.5 or more, the culture system shall make homeland risings demand a new country, and a released country take the catalogue record whose first culture is that people's language, or, if none fits, a generated one named after the language, with that language as court language and the form of the country it left. [culture §6.4; D-CULT-16]
- CULT-076 When a nation-building event runs `merge_tongues`, the culture system shall merge the named languages into their national language (`merges_into`). [culture §6.4]
- CULT-077 When a nation state (a country whose court language is the `merges_into` of some language) has kept Impose for 50 years, the culture system shall merge, in its provinces, the languages whose `merges_into` is its court language, without an event. [culture §6.4; config engine_events.merge_without_event; D-CULT-2]
- CULT-078 The culture system shall provide the event effects `tongue_spread`, `set_court_tongue`, `merge_tongues` and `move_people`, and the triggers `court_tongue`, `tongue_share`, `kin_of`, `cousin_of`, `stranger_to`. [culture §6.5]
- CULT-079 When `move_people` runs, the culture system shall have people of the language leave `from` as refugees and settle in `to`. [culture §6.5]

### 5.12 What the player sees
- CULT-080 The culture system shall show a coloured dot on each language of the province card's Language line: green same language, yellow related, red foreign, grey trading people. [culture §7.1]
- CULT-081 When the player taps the Language line, the culture system shall show this year's drift, which way it pulls and why. [culture §7.1]
- CULT-082 When the player taps the country card's Language line, the culture system shall open the Peoples screen. [culture §7.1]
- CULT-083 The culture system shall show the Peoples screen as one row per language in the realm, sorted by people, with relation, provinces, homeland, grievances, lords, charter and drift; grouped by family and folded shut; with the Language policy selector. [culture §1.1, §7.2]
- CULT-084 When the player taps a Peoples row, the culture system shall light its provinces on the map; a long-press shall show its lords, its officials and any rising. [culture §7.2]
- CULT-085 The culture system shall colour the Language lens by family at far zoom and by language at regional zoom, with a toggle to same language / related / foreign colours for the player's realm, and outline homelands of peoples without a country. [culture §7.3]

### 5.13 Data
- CULT-086 The culture system shall seed each province's top three languages from its owner's catalogue `cultures` and `internal_divisions`, weighted to the homeland data. [culture §9]
- CULT-087 The culture system shall store per country the court language, Language policy and per-province overrides, and per province only one new byte for the *Own language* charter. [culture §9]
- CULT-088 The culture system shall work out Language % and the Peoples screen when opened. [culture §9]
- CULT-089 The culture system shall keep every family, language, rate, multiplier, threshold, policy effect and event hook in config (`culture.yaml`). [culture §9]

### 5.13a Decided rules (17 October)
- CULT-092 The culture system shall count a province as steppe for herding languages when its ground is grassland or drylands, as deep forest for forest languages when its ground is forest or jungle, and as islands for seafaring languages when it touches the sea. [culture §3.2; config drift.way_of_life_lands; D-CULT-9]
- CULT-093 The culture system shall let every government form choose any Language policy; only *Impose*'s need for *Printing* or the chancery tradition limits it. [government v2; D-CULT-2]

### 5.14 AI
- CULT-090 The culture system shall let AI countries choose Language policy by personality: hegemon seeker and expansionist *Teach*, then *Impose* once they have printing; isolationist and mercantile *Let be*; opportunist and zealot *Teach*. [culture §8]
- CULT-091 The culture system shall let AI countries use the levers listed per personality: settlers into conquered border provinces and *Gather our kin* after 1789 (hegemon seeker, expansionist); *Own language* charters and welcoming trading peoples (isolationist, mercantile); *Free a people* against neighbours with foreign homelands in revolt (opportunist); expelling trading peoples of another faith (zealot). [culture §8]

### 5.15 Languages in the game (first slice)
Every province now holds its languages and every realm its court language and Language policy in the game; languages drift each New Year and give their grievances to the province's mood (D-CULT-18). Schools' teaching languages, town classes, ways of life, nationalism, charters, lords' and officials' own languages, people moving and the engine-raised events come with their contexts.

- CULT-094 When a campaign starts, the game shall give every map realm its court language and every land province it owns up to three languages with shares, from the realm's catalogue culture strings mapped once onto languages (`scenarios/1444/culture-start.json`, shares provisional); the province's largest language is its homeland. [CULT-009, CULT-086; D-CULT-18]
- CULT-095 In the turn in which 1 January falls, the game shall run drift in every owned land province by CULT-016 to CULT-033 with the multipliers the game can read: related languages, Language policy, homeland, trading people and the inventions printing, mass schooling and railways. [CULT-016 … CULT-033; D-CULT-18]
- CULT-096 Until lords and officials carry a language, the game shall count any official of the realm and any lord as governing for the court (CULT-017), and a realm's 1444 owner as having held its land 20 years or more; a province that changes hands is held from that year. [CULT-017; D-CULT-17; D-CULT-18]
- CULT-097 The game shall give *Foreign rule* by CULT-015 to a province whose homeland language is foreign to its owner's court, except in land the realm has held since before 1444, and *Banned language* by CULT-040; both count as grievances in the province's mood. [CULT-015, CULT-040, CULT-044; D-CULT-18]
- CULT-098 A realm may set its Language policy at any time (Impose only with *Printing* or a chancery tradition); the policy takes effect at once. The AI keeps *Teach* until its language levers come. [CULT-038, CULT-042, CULT-043]
- CULT-099 Every province's languages, homeland and years held, and every realm's court language and Language policy, shall be kept in the save. [CULT-087]

#### How the player uses it
- CULT-100 Where: every province's overview (tap it on the map) has a **Language** line under its mood: each language with a coloured dot (green same language, yellow related, red foreign, grey trading people) and its share. Tapping the line, a 44-point button, opens below it this year's drift: the pull language and why (held since when, governed for the court, or the majority), and each other language's yearly rate with its reasons; tapping again folds it. The player's realm card has a **Peoples** tab next to Government: the court language and Language %, a key to the dots, the languages in folds by family (the court's family open) with each language's share, people, relation, provinces where it is most, and how many of its homelands are aggrieved; then the Language policy as three buttons (Let be, Teach, Impose; Impose greyed with its need when locked) and one sentence on what the chosen policy does. [X-19, CULT-080 … CULT-083]
- CULT-101 Grouping and overview: languages and faiths share the one Peoples tab, since they have the same shape (a mix per province, a policy per realm) and the player weighs them together. The General tab of every realm card has a **Language** line (court language, Language %, number of languages) which on the player's card opens the Peoples tab. The map has a **Languages** lens colouring each province by the family of its largest language, with a key of the families most seen. *Foreign rule* and *Banned language* show in the province's grievances with what ends them. Phone: the line and its reasons fit the side panel in the Wide and Tall layouts; folds, policy buttons and lines are at least 44 points high; nothing needs hover (dots carry a title only as an extra); the panel never scrolls sideways; a phone held upright is asked to turn sideways, as for the whole game. [X-19, CULT-085, SHELL-108, SHELL-109, SHELL-114]

## 6. Commands

| Command | Who | Preconditions | Result | Events emitted |
|---|---|---|---|---|
| `SetTonguePolicy(country, policy)` | player / AI | Impose needs *Printing* or chancery tradition | Realm policy set | `TonguePolicyChanged` |
| `SetProvinceTonguePolicy(country, province, policy)` | player / AI | Own province; Impose as above | Override set | `TonguePolicyChanged` |
| `GrantOwnTongueCharter(country, province)` | player / AI / system (demand) | Own province | Charter stands | `OwnTongueCharterGranted` |
| `RevokeOwnTongueCharter(country, province)` | player / AI | Charter stands | Charter gone; *Broken charter* | `OwnTongueCharterRevoked` |
| `AnswerCourtGoesNative(country, choice)` | player / AI | Event raised | Take their language / Keep ours | `CourtTongueChanged` (take) |
| `ApplyCultureEffect(verb, params)` | system (events) | Event effect | Spread, set court language, merge, move people | `TongueMixChanged`, `CourtTongueChanged`, `TonguesMerged` |

## 7. Domain events

| Event | When | Payload | Consumed by |
|---|---|---|---|
| `TongueDriftApplied` | Yearly per province | province, pull language, moved shares | province, map-presentation |
| `TongueMixChanged` | Drift, movement, verbs | province, top three | realm (Language %), map-presentation |
| `CourtTongueChanged` | Dynasty, event, court goes native | country, old, new | audio, realm, diplomacy |
| `TonguePolicyChanged` | Policy set | country, province?, policy | province (*Banned language*), realm (lords waver), buildings (school upkeep) |
| `BannedTongueStarted` / `Ended` | §5.6 | province | province, rebellions |
| `OwnTongueCharterGranted` / `Revoked` | §5.7 | province | province |
| `CourtGoesNativeRaised` | Check passes | country, majority language | events, game-shell |
| `TongueSplitAbroad` | 100 years settler majority | region, old, new language | revolutions, diplomacy |
| `TonguesMerged` | Event or 50 years Impose | ids, into, where | province, events |

## 8. Policies (reactions to other contexts)
- When the throne passes to a dynasty of another language (realm), then CULT sets the court language.
- When people move (province: settlers, refugees, homeless, soldiers home), then CULT adds their language to the destination mix.
- When an event applies `spread` (kind culture), `tongue_spread`, `set_court_tongue`, `merge_tongues` or `move_people` (events), then CULT applies it.
- When nationalism support in a province crosses 0.3 or 0.5 (events), then CULT reclassifies related languages and changes rising demands.
- When a trading people is persecuted or expelled (religion or events), then CULT ends their bonus and moves them as refugees.
- When a revolutionary regime pushes the state language (revolutions), then CULT applies `set_court_tongue`; the creole republic adopts the creole language as court language.
- When a school is built (buildings), then CULT reads its teaching language for drift.

## 9. Monthly step
- Not monthly. Yearly (in the turn in which 1 January falls, X-18): drift in every province after births and deaths (needs province population, officials, lords, schools, policy, charters, nationalism, inventions).
- Every 5 years: engine-raised checks (court goes native, new language abroad, merge without event).
- On demand: Language % and Peoples screen when opened.
- Immediate: policy changes, charters, event verbs.

## 10. Configuration

All numbers are placeholders (culture-config.example.yaml: "Placeholder numbers for balancing"); `culture.json` lists them in its `_provisional` array.

| Key | Meaning | Value in the design | Placeholder? | Config file |
|---|---|---|---|---|
| `families_added` | New families | celtic, baltic, caucasian, hebrew | no (decided 16 Oct) | culture.yaml |
| `relation.kin/cousin/stranger/trading.tongue_share_weight` | Weight toward Language % | 1.0 / 0.5 / 0.0 / 0.0 | yes | culture.yaml |
| `relation.*.foreign_rule` | Gives *Foreign rule* | cousin false, stranger true, trading false | yes | culture.yaml |
| `relation.cousin.drift_multiplier` | Drift of a related language | 2.0 | yes | culture.yaml |
| `drift.base_rate_per_year` | Base drift | 0.005 | yes | culture.yaml |
| `drift.court_pull_needs_years_held` | Years for court pull | 20 | yes | culture.yaml |
| `drift.court_pull_needs` | Governed by | own_official, lord_of_court_tongue | yes | culture.yaml |
| `drift.drop_below_share` | Remove language below | 0.01 | yes | culture.yaml |
| `drift.multipliers.*` | town 2.0, school 1.5, schoolmaster 2.0, homeland 0.5, way of life 0.5, diaspora 0.25, nationalism 0.25, own-language charter 0.0, inventions 1.25 each (printing, mass schooling, newspapers, railways) | as listed | yes | culture.yaml |
| `policy.let_be/teach/impose.drift` | 0.5 / 1.0 / 2.0 | as listed | yes | culture.yaml |
| `policy.teach.school_upkeep` | 1.10 | | yes | culture.yaml |
| `policy.impose` | grievance banned_tongue, stranger_lords_waver 1, needs printing or chancery tradition | | yes | culture.yaml |
| `start_flag_chancery_tradition` | ming, joseon, castile, ottoman | | no (decided) | culture.yaml |
| `officials.years_to_full_effect` | kin 5, cousin 7, stranger 10, local_tongue 5 | | yes | culture.yaml |
| `effects.trading_people` | min_share 0.02, needs market, trade_value 0.10, extra_traders 1 | | yes | culture.yaml |
| `effects.family_neighbour_research_weight` | 2.0 | | yes | culture.yaml |
| `effects.national_levy` | needs_nationalism 0.5, kin_refill 1.25, stranger_refill 0.75, from age_of_revolutions | | yes | culture.yaml |
| `risings.homeland_draw` | Homeland rising draws this share of the language | 0.08 | yes (D-CULT-13) | culture.json |
| (design) locals know the land | +10 % defenders | 0.10 | yes | province (`localsBonus`) |
| `refugees.settle_after_years` | Refugees count in the mix after | 2 | yes (D-CULT-13) | culture.json |
| `drift.way_of_life_lands` | herding: grassland, drylands; forest: forest, jungle; seafaring: coastal | as listed | yes (D-CULT-9) | culture.json |
| `schools.learned_tongues` | Latin, Classical Arabic: no teaching language for drift | as listed | no (D-CULT-15) | culture.json |
| `nationalism.cousins_become_strangers_at` | 0.3 | | yes | culture.yaml |
| `nationalism.homeland_demands_country_at` | 0.5 | | yes | culture.yaml |
| `engine_events.court_goes_native` | court_share_below 0.20, for_years 50, other_tongue_above 0.5, recheck_years 25 | | yes | culture.yaml |
| `engine_events.new_tongue_abroad` | settler_majority_years 100; region = a map region; separated by sea = another top-level map region than the court's capital | | yes (D-CULT-10) | culture.json |
| `engine_events.merge_without_event` | needs_policy impose, years 50; nation state = court language is some language's `merges_into` | | yes (D-CULT-2) | culture.json |
| `engine_events.check_every_years` | Engine checks run every 5 years from 1444 | 5 | yes (D-CULT-13) | culture.json |
| `family_default_by_region` | cushitic: ethiopian_highlands → oromo; latin: iberia, americas → castilian | sample | yes | culture.yaml |
| `tongues[]` | id, name, family, way_of_life, diaspora, merges_into, splits_to, local_names (sample of 28; full ~600) | | yes | culture.yaml |

## 11. Seams

| Other context | Direction | Pattern | What crosses |
|---|---|---|---|
| province | partnership | Shared Kernel | Language mix (top three), homeland, years held, officials and their language, charters (*Own language*), grievances (*Banned language*, *Foreign rule*); proposed changes to 6.4, 10.2, 10.4, 12.1 |
| realm | downstream | Customer–Supplier | Language % on the country card (related languages half, D-CULT-6); lords' loyalty: "shares your language" cause for the same language, foreign starts a step lower (D-CULT-8), one waver when Impose is set (D-CULT-7), court goes native; dynasty changes upstream |
| government | downstream | Customer–Supplier | Settled: no capacity weight by language (D-CULT-1) and no limits on Language policy by form (D-CULT-2); culture reads the form only for a released country |
| religion | partnership | Partnership | Same shapes (mix, buildings, charter); trading peoples of another faith; persecution/expulsion of a trading people |
| buildings | upstream | Customer–Supplier | Schools carry a teaching language; Teach raises their upkeep 10 % |
| research | partnership | Customer–Supplier | Printing (Impose), printing/mass schooling/newspapers/railways (drift); family neighbours count double toward the 60 % cap; scholars settle by family |
| events | upstream | Published Language | `culture_groups` enum (+4 families), `spread`, nationalism `ideology_support`, new verbs and triggers, migrations, the culture effects for events in §6.1 |
| rebellions | downstream | Customer–Supplier | Homeland risings draw 8 %, demand a new country at ≥ 0.5 (released country per D-CULT-16); demands for *Own language* charter; *Banned language* not given under a local official (D-CULT-11) |
| warfare | downstream | Customer–Supplier | Garrison bribes; locals know the land |
| diplomacy | downstream | Published Language | Family warmth (+1 / +2 steps), natural rival after nationalism, marriages make lords count as the same language; diplomacy owns the war aims *Gather our kin* and *Free a people*, culture supplies their conditions (D-CULT-12) |
| recruiting | downstream | Customer–Supplier | *National levy* refill ±25 % |
| trade | downstream | Customer–Supplier | Trading peoples: +10 % trade value, one extra trader |
| subjects | downstream | Customer–Supplier | Subject of your court language integrates faster; a foreign-language subject's independence war draws its people |
| national-strengths | upstream | Customer–Supplier | Language-based strengths (trading network, chancery tradition) |
| revolutions | partnership | Customer–Supplier | Creole languages and nationalism thresholds as signs; regimes use `set_court_tongue` |
| naval | downstream | Conformist | Seafaring languages drift slowly on islands; sailors keep their language |
| audio | downstream | Published Language | Music palette follows the court language's family; palettes for the 4 new families |
| map-presentation | downstream | Published Language | Language lens at three zooms, dots, outlines |
| world-map | upstream | Conformist | Ground and coast for the way-of-life lands (D-CULT-9); map regions and their top-level region for new languages abroad (D-CULT-10) |
| scenario-setup | downstream | Published Language | Court language and province top three languages at start |
| time-and-turns | upstream | Conformist | Yearly drift slot after births and deaths; 5-yearly checks |

## 12. AI

As CULT-090 and CULT-091: the AI reads the same counts and chooses by catalogue personality (hegemon seeker /
expansionist: Teach, then Impose with printing, settlers into conquered border provinces, *Gather our kin* after
1789; isolationist / mercantile: Let be, *Own language* charters, welcomes trading peoples; opportunist: Teach,
*Free a people* against neighbours with foreign homelands in revolt; zealot: Teach, usually follows religion's
choices, expels trading peoples of another faith).

## 13. Decisions and open questions

Decided on 17 October 2026 under DECISIONS.md (latest decision wins, simpler rule, no new mechanics, provisional numbers in `culture.json`).

- **D-CULT-1** (was OQ-CULT-1) Capacity weight: dropped. A province's language adds no weight to the officials or lords caps; a foreign-language province costs only through its officials' 10-year learning time (CULT-050). Government v2, the later design, counts officials and lords, not provinces.
- **D-CULT-2** (was OQ-CULT-2) Nation state and form limits: no government form limits the Language policy (CULT-093). A "nation state" for merging without an event is a country whose court language is the `merges_into` of some language (Italian, German); after 50 years of *Impose* it merges, in its provinces, the languages whose `merges_into` is its court language. Government v2 has no such limits and no nation-state form, and the language data already names the national languages.
- **D-CULT-3** (was OQ-CULT-3) Family count: 43 families, the event tree's 39 `culture_groups` plus celtic, baltic, caucasian and hebrew; English and Dutch get the family germanic in the data. The data is the count; "38 + 4 = 42" was a miscount.
- **D-CULT-4** (was OQ-CULT-4) Nationalism for drift: the province's own nationalism support (the event tree's per-province value) is read; at 0.3 or more every drift in the province is multiplied by 0.25. The event tree stores nationalism per province, not per language.
- **D-CULT-5** (was OQ-CULT-5) Fourth language: one rule for languages and faiths. A newcomer enters only if larger than the smallest of the three; the smallest group of the four (the old smallest, or the newcomers) joins the majority. One storage rule should have one behaviour, and nobody is lost.
- **D-CULT-6** (was OQ-CULT-6) Changes for other designs: culture's rules are followed where the older province and country stats text differs: Language % counts related languages half, *Foreign rule* is for homelands of foreign languages (related ones from nationalism 0.3), officials learn by relation, settlers may go to any own province with free tiles, and the four new event verbs and five triggers exist. The music palettes for the new families follow the culture proposal (celtic 1, baltic 2, caucasian 2, hebrew 3) for audio to take. Culture's design is the later one on these points.
- **D-CULT-7** (was OQ-CULT-7) Lords waver under *Impose*: once, when the policy turns to *Impose*, foreign-language lords first; keeping it costs nothing more. The simpler rule, and the yearly cost is already the *Banned language* grievance.
- **D-CULT-8** (was OQ-CULT-8) Lords' language and loyalty: a same-language lord (or one of a house the ruler married into) has the realm's rising cause "sharing your language"; a foreign-language lord starts one step lower; a related-language lord has neither. Country stats §5.5 already lists sharing your language as a loyalty cause.
- **D-CULT-9** (was OQ-CULT-9) Own kind of land: steppe is grassland or drylands ground, deep forest is forest or jungle ground, islands is any province touching the sea (CULT-092). These are the world map's own grounds and coasts; no new terrain is needed.
- **D-CULT-10** (was OQ-CULT-10) New language abroad: the region is a map region; it is separated by sea when its top-level map region (continent) differs from that of the court's capital. Only languages with a `splits_to` entry split, and the split language and the old court count each other as related. The map's region tree already exists.
- **D-CULT-11** (was OQ-CULT-11) Local official: while an official of the province's majority language serves in a foreign-language province, *Banned language* is not given there; *Foreign rule* stays. Grievances are counts, so "not made worse" means one grievance fewer.
- **D-CULT-12** (was OQ-CULT-12) *Gather our kin*: diplomacy owns it as a war aim, like *Free a people*; culture supplies the condition. War aims live in diplomacy.
- **D-CULT-13** (was OQ-CULT-13) Missing keys: `risings.homeland_draw` 0.08, `refugees.settle_after_years` 2 and `engine_events.check_every_years` 5 (counted from 1444) are in `culture.json` and listed as provisional. The design says every threshold lives in config.
- **D-CULT-14** (was OQ-CULT-14) Trading people and Language %: confirmed weight 0; they are neither the same language nor foreign for grievances. They are not of the court's language, and the design only shields them from grievances.
- **D-CULT-15** (was OQ-CULT-15) Schools of a learned language: a school teaching Latin or Classical Arabic has no teaching language and speeds no drift; other schools carry a language id. Nobody's home language is Latin, so such a school can never be in the pull language.
- **D-CULT-16** (was OQ-CULT-16) Released country: it takes the catalogue record whose first culture is the language (X-13 keeps such records as reference data); if none fits, a generated country named after the language, with that language as court language and the form of the country it left. The fewest new parts.
- **D-CULT-18** First game slice (provisional): each map realm's 1444 languages come from its catalogue culture strings, mapped once onto about 190 languages by hand (merchant colonies, captives and peoples the catalogue says live in a separate record left out), up to three per realm, every province of the realm taking the realm's mix; per-province homelands wait on the homeland data. A province's homeland is its 1444 majority language. Lords and officials carry no language yet, so a lord counts as of the court language and any official governs for the court. A realm's own 1444 land counts as held long enough for the court's pull and is never under *Foreign rule*, as the game already did ("the people were not yours in 1444"): a court that ruled them for generations is not foreign there, and nobody starts with the grievance. Without this, 394 provinces of thirteen realms (the Timurids, Lithuania, the Mamluks …) would start under *Foreign rule*.
- **D-CULT-17** (was OQ-CULT-17) Court pull: any official of the country counts, whatever his language. The config's `own_official` says so, and the official's language already works through learning time.

## 14. Traceability

| Requirement | Feature file | Scenario |
|---|---|---|
| CULT-001 … CULT-008 | tongues-and-relations.feature | Families; Two levels; Catalogue strings; Language fields |
| CULT-009 … CULT-011 | tongues-and-relations.feature | Court language at the start; A new dynasty |
| CULT-012 … CULT-015 | tongues-and-relations.feature | Relation to the court; Language % for France; Trading peoples; Foreign rule before nationalism |
| CULT-016 … CULT-033 | drift.feature | Troyes; Pull language; Multipliers; Charter stops drift; Small shares; Fourth language; A school in a learned language |
| CULT-034 … CULT-037 | drift.feature | People carry their language |
| CULT-038 … CULT-049 | tongue-policy.feature | Policy effects; Impose needs printing; Banned language; Own-language charter; levers |
| CULT-050 … CULT-061 | culture-effects.feature | Officials; A local official keeps Banned language away; A province's language does not weigh on the government caps; Lords and language; risings; war |
| CULT-062 … CULT-066 | culture-effects.feature | Trading peoples; research; diplomacy |
| CULT-067 … CULT-079 | culture-history.feature | Spread; court goes native; New languages abroad; Settlers who stay keep their language; nationalism; Merging by event; Merging without an event; verbs |
| CULT-080 … CULT-085 | peoples-screen.feature | Dots; Peoples screen; lens |
| CULT-086 … CULT-089 | tongues-and-relations.feature | Starting languages; config (CULT-087, CULT-089: storage and config, checked by data review rather than play: presentation of data only) |
| CULT-090, CULT-091 | culture-ai.feature | AI language policy by personality |
| CULT-092 | drift.feature | A way of life's own kind of land |
| CULT-093 | tongue-policy.feature | Any form may choose any Language policy |
| CULT-094 … CULT-099 | — | Engine: packages/engine/test/peoples.test.ts (1444 languages, Foreign rule and Banned language, drift and Impose, Peoples tab, save) and moods.test.ts |
| CULT-100, CULT-101 | — | Presentation: apps/client/src/ui/belief.ts, the Language line, Peoples tab and Languages lens; screenshots from apps/client/scripts/belief-shots.mjs |
