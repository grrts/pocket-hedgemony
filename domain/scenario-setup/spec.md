# Scenario setup (SETUP)

## 1. Purpose and scope

This context owns the 1444 start: which political entities exist (the country catalogue's 963 records),
what kind of actor each is in the game (its representation), how the catalogue is put onto the map (237
map nations today), each country's start form of government, the qualitative starting assessments and how
they become starting counts, each province's starting values and where they come from, the campaign rules
chosen at new game, and which realms can be played (the free tier). It turns research data into a starting
world; it does not run anything after the first turn.

**In scope**
- The country catalogue as the source of entities: inclusion rules, identifiers, representation modes,
  tiers, confidence, the qualitative assessment scale, AI personality as data.
- The start form of government for every record (rules and results).
- Starting values of countries (country stats §10) and provinces (province stats §16; buildings §15.2) as
  *sources and mappings*; the 1444 map setup (owners, population, wealth, castles, nations, capitals,
  colours, commanders).
- Mapping catalogue records to map nations and provinces (gap item 25), and province starting values
  (gap item 26).
- The relations snapshot used at start (country-relations, 1444 data).
- Playable realms, the free tier (the Ottomans and France), and the realm picker's data.
- Campaign rules chosen at new game (difficulty, AI temper, fog, events, ironman, end date) as setup data, and what each difficulty level changes in play (SETUP-099 to SETUP-103).

**Not in scope (owned by …)**
- How government forms behave, reforms (government); lords, rulers and loyalty rules (realm).
- How relations change during play, diplomatic actions (diplomacy); subject rules (subjects).
- What a province stat does (province); what buildings do (buildings).
- Ports in 1444 placement rules (naval); starting traders and routes (trade); 1444 faiths (religion);
  charted start (exploration); start inventions (research). This context lists them as seams.
- The new campaign screens, unlock and store screens (game-shell); save headers and the free-tier lock on
  load (saves).
- The geography of the map (world-map); the start date itself (time-and-turns).

## 2. Sources

Newest decision first.

0. `domain/DECISIONS.md` X-20 (Leroy, 18 Oct): African starts, more historical states and peoples on the map with as
   little change to the rules of play as possible (§5.8).
1. `planning/gap-lists.md` v2 (16 Oct): decisions (campaign span); List 1 item 2 (playable nations; free
   tier the Ottomans and France, tutorial the Ottomans), item 8 (big institutions), item 25 (catalogue
   against the map), item 26 (province starting values); List 3 item 2.
2. `government/government-design.md` v2 §6; `government/config/start-forms.yaml`;
   `government/build/start-forms-summary.md`.
3. `exploration/exploration-design.md` §2, §3.1, §5.1, §10 (stateless land decided).
4. `trade/trade-design.md` §13.1 (starting traders, 24-month warm-up).
5. `naval/naval-design.md` §1.3 (ports in 1444), §13.
6. `religion/religion-design.md` §2.3 (1444 faiths from the catalogue).
7. `buildings/buildings-design.md` §15.2 (starting buildings).
8. `country-stats/country-stats-design.md` v3 §10 (starting values), §12 (win scores, for context).
9. `province-stats/province-stats-design.md` v3 §16 (starting values), §12.3.
10. `country-catalogue/README.md`, `schema/country.schema.json`, `build/stats.json`, `build/catalogue.json`.
11. `country-relations/README.md`; `data/relations-1444.json` (reference date 1444-11-11, 280 relations,
    19 facts).
12. `screen-flow/screen-flow-design.md` S5 (new campaign); `settings/settings-design.md` §4.3 (campaign
    rules); `save-system/README.md` §4.2, §6.1, §9 (`newGame`); `tutorial/tutorial-design.md` §3.
13. Repository: `README.md` (the world map, 237 nations); `tools/mapgen/nations-1444.json`,
    `owners-1444.json`, `owners.ts`, `config.json` (`settlement`, `palette`);
    `packages/rules/data/defines.json` (`economy.startingTreasury`, `levies`, `march.startingHorseShare`).

## 3. Ubiquitous language

| Term | Meaning | Not to be confused with |
|---|---|---|
| Catalogue | The 963 researched records of 1444 political entities, with no numeric game statistics | The map's 237 nations |
| Record | One catalogue entry, with a stable snake_case `id` | A map nation |
| Reference day | 11 November 1444, the day the catalogue and relations describe | The campaign start date |
| Representation | How a record appears in the game: playable country, playable subject, decentralised polity, collective institution, non-state actor, internal estate, background only | Sovereignty (a historical classification) |
| Playable country | A record with its own AI that can be played, not under an overlord | Playable at launch |
| Playable subject | A country with its own AI but under an overlord | A subject relation |
| Decentralised polity | A society without a state, recorded as such (stateless, segmentary lineage …); never a forced nation-state | Unowned land |
| Collective institution | The Empire (HRE), the Hanse, confederacies, councils as institutions | A league in diplomacy |
| Internal estate | Simulated as a faction or region inside another country | A lord |
| Background only | Flavour or territory holder without AI | — |
| Group record | A named record standing for many micro-polities (`silesia`, `tusi_group`); never implies one state | — |
| Detail tier | A (major powers), B (significant secondary), C (minor); sets prose depth only | — |
| Assessment | A qualitative starting level per dimension: very low, low, moderate, high, very high, unknown, with justification and confidence | A number |
| Start form | The government form a record starts with in 1444 | A reform |
| Map nation | One of the 237 nations in `nations-1444.json` that own provinces on today's map | A record |
| Owner rule | A rule in `owners-1444.json` handing provinces to a map nation; first match wins | — |
| Stand-in rule | A placeholder rule (castles, wealth) used until the province data is researched | — |
| Campaign rules | Options chosen at new game and saved with the campaign: difficulty, AI temper, fog, events, ironman, end date | Settings |
| Free tier | The realms playable without buying: the Ottomans and France | The Steam demo (one way to reach it) |
| African nation | A catalogue record of the African regions put on the map by X-20: a playable country or subject, or a people's small realm | The 13 African map nations of before |
| Ways to grow | The realm picker's line on how a realm can grow from its start: tributaries, free land, trade | Strengths at a glance |
| Warm-up | Running the starting traders for 24 months before the first turn so busy roads start busy | A turn |

## 4. Domain model

### Aggregates

**Country catalogue** (identity: the catalogue build; 963 records)
- Holds every record: meta (region, subregion, tier, research status, last updated, `eu4_tag` always
  null), names, classification (entity type, sovereignty, independence degree, inclusion certainty),
  existence, historical sections (identity, leadership 1444, government, geography with capital, society
  with population ranges, economy, military, diplomacy context), gameplay (representation, AI personality,
  starting assessment), event connections, sources, confidence, open questions.
- INV-SETUP-1: Every record has a unique, stable, never-reused snake_case `id`.
- INV-SETUP-2: Every record carries every section, whatever its tier.
- INV-SETUP-3: The catalogue holds no numeric game statistics; population only as a published range with a
  source; no army sizes or budgets unless directly sourced.
- INV-SETUP-4: Each record belongs to exactly one region (by its 1444 core or seat).
- INV-SETUP-5: Relationships live only in the relationship files, never inside records.
- INV-SETUP-6: `meta.eu4_tag` is always null: no data from commercial games.

**Starting world** (identity: campaign id, built at new game)
- Holds: countries (from records with a representation the game simulates), their start forms, starting
  counts, owned provinces, capitals, colours, rulers and commanders; provinces with starting values;
  starting relations; starting traders, ports, faiths, buildings, inventions, charted maps.
- INV-SETUP-7: Every owned province has exactly one owner country; land no country owns stays unowned.
- INV-SETUP-8: Every country in play has exactly one start form.
- INV-SETUP-9: Every start form a country starts with is a 1444 form; absolute monarchy, constitutional
  monarchy, constitutional republic, military junta, party state and company rule are never start forms.
- INV-SETUP-10: The same seed and the same campaign rules give the same starting world.

**Campaign rules** (value object saved with the campaign)
- difficulty, AI temper (aggression), fog, events (historical, plausible or free, D-SETUP-21), ironman, end date (default
  31 August 1939).
- INV-SETUP-11: Campaign rules can't be changed after the campaign starts (read-only under Campaign rules).

### Entities and value objects

- **Representation mode** (value): see glossary; counts in the current build: playable country 274,
  playable subject 218, decentralised polity 214, background only 115, non-state actor 68, internal estate
  58, collective institution 16.
- **Collective institutions** (the 16): `kalmar_union`, `hanseatic_league`, `hre`, `council_of_basel`,
  `decapolis`, `swabian_league_cities`, `swiss_confederation`, `livonian_confederation`, `league_of_lezhe`,
  `mount_athos`, `gelug_monasteries`, `karmapa`, `sakya`, `japan_imperial_court`, `kamakura_kubo`,
  `triple_alliance`.
- **Assessment dimension** (value): size-dependent on a global scale (`economic_strength`,
  `manpower_potential`, `military_capability`, `naval_capability`, `diplomatic_influence`,
  `trade_access`); quality relative to the entity's own size and type (`political_stability`,
  `administrative_capacity`, `fiscal_resilience`, `institutional_development`, `territorial_cohesion`,
  `long_term_potential`); risk, higher is worse (`unrest_risk`, `external_threat_exposure`). No overall
  power score.
- **Start form rule** (value): override → text rule → entity type → kingdom by region → default.
- **Map nation** (entity): id, name, capital (longitude, latitude), colour, commanders (name, might,
  cunning, logistics).
- **Owner rule** (value): nation, modern countries, region names, bounding box.
- **Settlement region** (value): name, box, density (people per km²), wealth (1–10).
- **Province starting record** (value): owner, population (thousands of people), wealth (1–10), castle (none, fort, castle),
  terrain, coastal, river, neighbours (the current `ProvinceDef`).

### Domain services

- **Start form assigner** (`government/tools/assign_start_forms.py`): reads the catalogue and
  `start-forms.yaml`, writes `start-forms-summary.md` and `start-forms.csv`.
- **1444 map setup** (`tools/mapgen/owners.ts`): hands provinces to map nations, sets population, wealth,
  castles, nation colours.
- **Starting world builder** (to be designed): applies the catalogue, relations and every system's start
  data at new game.

## 5. Requirements

### 5.1 The catalogue as source

- SETUP-001 (Ubiquitous): The catalogue shall describe the political entities of the world on the reference day, 11 November 1444, and hold no numeric game statistics. [country-catalogue README]
- SETUP-002 (Ubiquitous): An entity shall be included only if it existed in the 1440s with the identity recorded (date test); entities founded later or ended just before shall be listed as `excluded_anachronistic`. [country-catalogue README §1.1]
- SETUP-003 (Ubiquitous): Subordinate entities shall be included when their internal politics mattered (agency test); pure administrative subdivisions shall be `excluded_not_distinct` or `merged_into_other`. [country-catalogue README §1.2]
- SETUP-004 (Ubiquitous): Where hundreds of micro-polities existed, the significant ones shall be catalogued individually and the rest as a named group record that never implies a single state. [country-catalogue README §1.3]
- SETUP-005 (Ubiquitous): Decentralised societies shall be recorded as such (stateless, segmentary lineage …), with representation `decentralized_polity` or `non_state_actor`, never forced into nation-states. [country-catalogue README §1.4]
- SETUP-006 (Ubiquitous): Disputed existence or classification shall be kept as `included_disputed` with the dispute described, never resolved silently. [country-catalogue README §1.5]
- SETUP-007 (Ubiquitous): Each record shall have a stable snake_case id that is never reused; a renamed seed id goes into the inventory's aliases. [country-catalogue README §2]
- SETUP-008 (Ubiquitous): Hierarchical relationship edges shall be stored with the subordinate party and symmetric edges with party `a`; cross-region duplicates are removed at build. [country-catalogue README §2]
- SETUP-009 (Ubiquitous): Starting assessments shall use the levels very low, low, moderate, high, very high and unknown, each with a justification and a confidence; there shall be no overall power score. [country-catalogue README §4]
- SETUP-010 (Ubiquitous): Size-dependent dimensions shall be judged on one global scale, quality dimensions relative to the entity's own size and type, and risk dimensions with higher meaning worse. [country-catalogue README §4]
- SETUP-011 (Ubiquitous): The catalogue shall hold 963 records in 29 regions, with these representations: 274 playable countries, 218 playable subjects, 214 decentralised polities, 115 background only, 68 non-state actors, 58 internal estates, 16 collective institutions. [build/stats.json; gap-lists item 2]
- SETUP-012 (Ubiquitous): Each record's `gameplay.ai_personality` shall be historically informed tendencies (priorities, expansion modes, diplomatic style, economic focus, doctrine, risk tolerance, constraints, opportunities, failure conditions, adaptation), not scripts. Risk tolerance is read as low, medium or high: very low and low are low, moderate (and unknown) is medium, high and very high are high. [country-catalogue README §5]
- SETUP-013 (Ubiquitous): The catalogue shall carry no tags, statistics, values, mechanic names or text from commercial games; `meta.eu4_tag` is always null. [country-catalogue README §3; schema]

### 5.2 Start forms of government

- SETUP-014 (Ubiquitous): Each country shall start with its historical form, assigned by rules tried in order: hand-set overrides, then text rules on the catalogue's government form text, then the entity type, then the default `chiefdom`. [government §6; start-forms.yaml]
- SETUP-015 (Ubiquitous): A record of entity type `kingdom` shall take its form from its region: Latin Europe and Anatolia–Caucasus feudal realm; Levant–Egypt–Arabia, Iran–Transoxiana and North Africa household realm; South Asia and China–Inner Asia feudal realm; steppe and Siberia horde; Japan–Korea warlord domain; Southeast Asia tribute empire for tiers A and B and paramount chiefdom for tier C; the rest of Africa, the Americas and Oceania paramount chiefdom. [start-forms.yaml `kingdom_by_region`]
- SETUP-016 (Ubiquitous): Text rules shall be tried in order on the lower-cased government form text, honouring each rule's `only_types` and `skip_types`. [start-forms.yaml `text_rules`]
- SETUP-017 (Ubiquitous): The 75 hand-set overrides shall win over every other rule, each with its reason (for example the Ottomans household realm, the Mamluks soldier emirs, Venice merchant republic, England diet monarchy, Hungary elective monarchy). [start-forms.yaml `overrides`; government §6]
- SETUP-018 (Ubiquitous): No country shall start as an absolute monarchy, constitutional monarchy, constitutional republic, military junta, party state or company rule; those forms are reached by reform, revolution or events. [start-forms-summary.md]
- SETUP-019 (Ubiquitous): The start-form summary shall be generated, not edited by hand; changes go into `start-forms.yaml` and the tool is rerun. [start-forms-summary.md]

### 5.3 Country starting values

- SETUP-020 (Ubiquitous): Each country's starting counts shall be set from the catalogue's assessments: economic strength and fiscal resilience → Gold and Debt; manpower potential → Recruits; military capability → Soldiers, Commanders, Horses; naval capability → Ships; administrative capacity → Officials and how many provinces start as royal land; political stability and unrest risk → lords' starting loyalty and provinces in revolt; territorial cohesion → number of lords, the land they hold, and Language; institutional development → Schools, Scholars, starting inventions; trade access → Merchants and grain price access; diplomatic influence → extra officials at court ready to go abroad. [country-stats §10] (D-SETUP-6)
- SETUP-021 (Ubiquitous): A `low` confidence in the catalogue shall give a wider random range for the starting counts, so each campaign starts a little differently. [country-stats §10]
- SETUP-022 (Ubiquitous): Allies, Rivals, Subjects and Enemies shall come straight from `country-relations/data/relations-1444.json` (280 relations and 19 facts on 11 November 1444). [country-stats §10; country-relations README]
- SETUP-023 (Ubiquitous): Lords for major countries shall come from the great houses the catalogue's history names; a country with only one province has no lords. [country-stats §10; government §6]
- SETUP-024 (Ubiquitous): Starting traders shall follow `trade_access`: very high 6, high 4, moderate 2, low 1, very low or unknown 0; trade ships for coastal countries with ports, caravans or barges inland. [trade §13.1] @placeholder
- SETUP-025 (Ubiquitous): Starting trade ratios shall be set by running the starting traders for 24 months before the first turn. [trade §13.1; D-SETUP-12] It uses the campaign's one seed and does not move the date.
- SETUP-026 (Ubiquitous): Each record's ruler's faith, people's majority faith and other communities shall be read from the catalogue (`build/catalogue-faiths.json`). [religion §2.3]
- SETUP-027 (Ubiquitous): In 1444, Portugal, Castile, Genoa and Venice shall start able to explore (they know S4 and sit in the Age of Exploration); Ming China knows S1 and S2 but not S4. [exploration §2]

### 5.4 Province starting values

- SETUP-028 (Ubiquitous): Each province's tile count shall come from its size on the map, its ground from terrain, its tile mix from ground, its shore tiles from coast and rivers, its people from population, and how many buildings start built (and town size) from wealth. [province-stats §16]
- SETUP-029 (Ubiquitous): The catalogue shall set each province's owner, which provinces belong to which named lord, Homeland of, the Faith and Language mix, and (by `administrative_capacity`) how many royal provinces start with an official. [province-stats §16]
- SETUP-030 (Ubiquitous): The research tree's start inventions shall decide which buildings, castle steps and road steps exist at start. [province-stats §16; buildings §15.2]
- SETUP-031 (Ubiquitous): Region tables in config shall set which wares each ground makes, fever land and crops. [province-stats §16]
- SETUP-032 (Ubiquitous): Event-tree geography anchors (Constantinople, Potosí, Malacca …) shall fix mines, toll points, castles and markets at the named places. [province-stats §16; buildings §15.2]
- SETUP-033 (Ubiquitous): The relations file shall set trade pacts, occupations and pretenders from 1444 wars and claims. [province-stats §16]
- SETUP-034 (Ubiquitous): Starting buildings shall follow the map's wealth: wealth 1 has a farm or ranch on a third of its tiles; wealth 10 has every tile built and town buildings at step 2. [buildings §15.2]
- SETUP-035 (Ubiquitous): Town size shall follow the map's population, and town slots shall fill by a regional template (a European market town: market, church, loom house; a Sahel trade town: market, mosque, caravanserai). [buildings §15.2]
- SETUP-036 (Ubiquitous): Harbours and shipyards shall come from the naval design's 1444 port list (`start-ports.json`): great port harbour 2; port harbour 2 or 1; small harbour 1; canoe landing no harbour, extra seafolk and small craft. [naval §1.3; buildings §15.2]
- SETUP-037 (Ubiquitous): The province starting mix of faiths shall follow the record that owns the province, adjusted by the region table in config. [religion §2.3]
- SETUP-038 (Ubiquitous): `population`, `wealth` (1–10), `terrain`, `coastal` and `neighbors` shall stay as starting inputs; `wealth` stops being a live stat once the buildings are placed. [province-stats §16]
- SETUP-039 (Ubiquitous): Every country's charted map shall start as every province within 6 steps of its lands plus every sea zone touching them. [exploration §3.1]

### 5.5 The 1444 map setup (today's build)

- SETUP-040 (Ubiquitous): The map's 1444 setup shall list 237 nations (137 placed by hand, 100 added from the catalogue by SETUP-060, SETUP-061 and TRIBE-002), each with a capital (longitude and latitude), a colour and commanders (name, might, cunning, logistics). [README; nations-1444.json]
- SETUP-041 (Ubiquitous): Provinces shall be handed to nations by owner rules checked in order, the first match winning, by modern country, region name, or a longitude and latitude box; borders are an approximation of 1444, not an atlas. [README; owners-1444.json]
- SETUP-042 (Unwanted): If a nation ends up with no province, then it shall not be in the built nation list. [owners.ts]
- SETUP-043 (Ubiquitous): Each nation's colour shall be a palette colour (32 colours) not taken by a neighbouring nation. [owners.ts; config.json `palette`]
- SETUP-044 (Ubiquitous): A province's 1444 population (stored in thousands of people) shall be its land area × the density of the first matching settlement region (default 0.8 people per km²), ×0.35 in mountains, desert and tundra, ×1.3 in farmland and marsh, ×2.5 for a capital, spread by 0.7 to 1.3 per province; unowned land is capped at twice the default density. [owners.ts; config.json `settlement`]
- SETUP-045 (Ubiquitous): A province's 1444 wealth shall be the first matching settlement region's wealth (default 1; 1 for unowned land), +1 if owned and coastal, +2 for a capital, spread by 0.75 to 1.25 and kept between 1 and 10. [owners.ts; config.json]
- SETUP-046 (Ubiquitous): Until the province data names real castles, the stand-in rule shall wall capitals and provinces of 400 thousand people or more in stone; frontier provinces in stone on high ground with 30 thousand or more or anywhere with 200 thousand or more, in earth otherwise; about 15 % of other owned provinces with an old ring fort; unowned provinces with none. [owners.ts; warfare §8.1; gap-lists item 25]
- SETUP-047 (Ubiquitous): A realm with no catalogue assessment shall start with the engine's configured treasury (50 gold), levies of 4 men per thousand people, and 20 % horse in starting armies; a realm with an assessment starts from it (SETUP-020). [defines.json; D-SETUP-11] @placeholder

### 5.6 Catalogue to map

- SETUP-048 (Ubiquitous): The map's nations shall be the realms and the playable list; capitals, colours and commanders come from the map nations data, and rulers from the matched catalogue record. [gap-lists item 25; X-13; D-SETUP-1, D-SETUP-3, D-SETUP-13]
- SETUP-049 (Ubiquitous): The map setup shall use catalogue ids for countries. [country-relations README; trade §13.1; religion §2.3; X-13] The 37 map ids that differ are matched through the rename table in `scenario-setup.json` (D-SETUP-1).
- SETUP-050 (Ubiquitous): A colony shall be founded only in a province no country owns; land of a tribe that is a country (a chiefdom or clan council in the 1444 list) can only be taken by war or treaty. [exploration §5.1, §10; province-stats §12.3; X-13] Only a representation that owns map provinces is a country (D-SETUP-2).
- SETUP-059 (Ubiquitous): Each realm shall carry its catalogue `administrative_capacity` as a rank from 1 (very low) to 5 (very high), 0 where it has no record, for the contexts that read how far its rule reaches (subjects). [X-13; D-SETUP-1; national-strengths D-HER-18]

### 5.7 Playable realms and campaign rules

- SETUP-051 (Ubiquitous): The free tier shall offer the Ottomans and France; the tutorial is played as the Ottomans. [gap-lists decisions, item 2, List 3 item 2; tutorial §3.1]
- SETUP-052 (State-driven): While the full game is not owned, the realm picker shall show other realms with a padlock and a button to the Unlock screen; returning from a purchase keeps the realm chosen. [screen-flow S5]
- SETUP-053 (Ubiquitous): The realm picker shall offer realms on the map at world zoom, with filters by region, difficulty and free or locked, and a short list of suggested realms. [screen-flow S5]
- SETUP-054 (Ubiquitous): New game shall set the campaign rules difficulty, AI temper, fog, historical, plausible or free events (D-SETUP-21), ironman and end date (default 31 August 1939), with presets that fill the whole step. [screen-flow S5; settings §4.3]
- SETUP-055 (Ubiquitous): Campaign rules shall be saved with the campaign and shown read-only under Pause → Campaign rules. [settings §4.3]
- SETUP-056 (Ubiquitous): A new game shall start from a seed, the player's nation and the options, and get a random campaign id. [save-system §2.1, §9]
- SETUP-057 (Ubiquitous): Each save header shall record the player's nation and whether it needs the full game. [save-system §4.2, §6.1]
- SETUP-058 (Ubiquitous): Quick start shall skip to Begin with the last options used and the realm last tapped (or the first suggested realm). [screen-flow S5]

### 5.8 African starts (Leroy, 18 October; X-20)

Africa in 1444 is a land of many realms and peoples, not empty space. Today's map puts 13 realms there and leaves
365 of the 439 sub-Saharan land provinces unowned and unwalled, while the catalogue holds 60 playable countries,
12 playable subjects and 48 stateless peoples for the same lands. These rules put those records on the map so an
African start has neighbours to make tributaries of, court, trade with and fight, and so it can play well. They
change who owns the land and how it is walled at the start, and nothing in the rules of play (Leroy: "don't change
too much in terms of gameplay").

- SETUP-060 (Ubiquitous): Every catalogue record of the African regions (`af_west`, `af_central_south`,
  `af_northeast_east`, `af_north_sahara`) whose representation is playable country or playable subject shall be a map
  nation, with a capital placed by hand in the map nations data from the record's capital or core region and a note
  of where it was read. [X-20; country-catalogue README §2]
- SETUP-061 (Ubiquitous): Every record of those regions represented as a decentralised polity, and every non-state
  actor that holds a homeland (for example the San, the Maasai, the equatorial forest societies), shall be a map
  nation too: a small realm of that people, taking its start form by the start-form rules (GOV-043), so most start
  as a clan council or chiefdom. Non-state actors that are migrations, raiders or rebels (the Fulbe herders, the
  Juhayna Arabs, the Nilotic herders, the Banu Kanz, the Beta Israel) and background-only records stay reference data
  for events, as do group records whose land another realm owns. [X-20; SETUP-005; D-SETUP-9]
- SETUP-062 (Ubiquitous): A record that becomes a map nation shall keep its catalogue id (so no rename is needed), its
  assessments, its faith and its relations: a playable subject starts under the overlord the relations file names
  (Sine under Jolof; Sofala under Kilwa; Hadiya under Ethiopia; the Canarian lordship under Castile), or
  independent where the relations file names none (D-SETUP-10). Kayor, Baol and Waalo have their capitals in Jolof's
  one province and Mafia in Kilwa's, so they stay reference data (SETUP-064). [X-20; SETUP-022]
- SETUP-063 (Ubiquitous): A new African nation shall take only land no realm owns: first the provinces its owner rule
  names, if it has one, then, from all new capitals at once, one unowned neighbouring province per nation per round
  in ascending nation index (the one with the most people, the lowest id on a tie), until each has its size from its
  `manpower_potential` (very low 1, low 2, moderate 3, high 5, very high 8, unknown 2 provinces) or no unowned
  neighbour is left. A new nation's own owner rules come before every other rule, so it can take back land a broad
  modern-country rule gave a neighbour (the Hausa towns from Kano, Timbuktu from Songhai, the Guanche islands from
  Castile); they decide owners only, never how provinces are cut, so every province keeps its id. [X-20]
  @placeholder `scenario_setup.africa.size_by_manpower`
- SETUP-064 (Unwanted): If a new nation's capital lies in a province another realm owns and no owner rule gives it
  land, then it shall stay reference data, and the map build's report shall list it. [X-20; SETUP-042]
- SETUP-065 (Ubiquitous): African land still unowned after SETUP-063 (most of the deep Sahara and parts of the
  rainforest) shall stay land of a people with no country, colonisable by the exploration rules as today. [X-20;
  D-EXPL-2]
- SETUP-066 (Ubiquitous): Each new nation shall get a colour by SETUP-043 and one commander named from its tongue's
  name list, his skills set from `military_capability` like any realm's starting counts (SETUP-020). [X-20; F-13]
- SETUP-067 (Ubiquitous): In sub-Saharan Africa (the map's Sub-Saharan Africa macro-region, MAP-039) the stand-in
  castle rule (SETUP-046) shall be: every capital walled with an earthwork ring fort, about 15 % of other owned
  provinces with an old ring fort, and stone only where a geography anchor names a stone castle (for example Great
  Zimbabwe, Kilwa, Mombasa); the frontier and population steps to stone do not apply there. Earthworks are what
  most of these lands built (Benin's walls, Kano's walls), and a war there is won by holding the land a season, not
  by sieges. [X-20; SETUP-046; research B4; PROV-184]
- SETUP-068 (Ubiquitous): The geography anchors (SETUP-032) shall name Africa's gold fields as gold mines (Bambuk,
  Bure, the Akan forest, the Zimbabwe plateau and Manyika) and its trade towns (Timbuktu, Djenne, Gao, Kano, Agadez,
  Kilwa, Mombasa, Mogadishu) with their regional town template and 1444 port tier, so African realms start with the
  wealth they had. [X-20; SETUP-032; SETUP-035; SETUP-036]
- SETUP-069 (Ubiquitous): African nations shall start from their assessments by the same rules as every realm
  (SETUP-020, SETUP-021): no bonus and no penalty of their own. Whether they can play well is checked by the
  balance targets (SETUP-070) and tuned in the numbers, not with a new rule. [X-20; rule 2 of DECISIONS]

#### Balance targets

- SETUP-070 (Ubiquitous): The balancing model shall check African starts in seeded AI-only campaigns to 1600, and a
  missed target shall be tuned in the numbers (sizes, assessment factors, AI temper) rather than with a new rule:
  (a) at least a quarter of the African nations of 1444 still exist in 1600; (b) no one realm holds more than a
  third of the settled sub-Saharan provinces in 1600; (c) at most 15 % of sub-Saharan coastal provinces are other
  continents' colonies in 1600; (d) in at least one seeded run each, a clan council or chiefdom of one or two
  provinces grows to five or more by 1550, by tributaries, folding in or war. [X-20] @placeholder
  `balance.africa.*`
- SETUP-071 (Ubiquitous): The extra nations shall keep the week's turn inside the phone's turn budget (performance
  design): the AI's work steps for a realm of one or two provinces at peace stay a small share of the turn, counted
  in work steps (X-15). [X-20; X-15]

#### How the player uses it

- SETUP-072 Where: an African realm is chosen in the realm picker (SETUP-053, SHELL-031) like any other. The region
  filter has Sub-Saharan Africa and North Africa; with a region chosen, the picker zooms the map to it so small
  realms are big enough to tap, and the list beside the map (Wide) or under it (Tall) lists every realm of the
  region by name, one 44-point row each, so a realm of one province is never only a speck to hit. [X-19; X-20]
- SETUP-073 The realm's card in the picker, the same card for every realm, shows its form, provinces, people and
  strengths at a glance, and one line **Ways to grow** read from the start: how many smaller neighbours could become
  tributaries, how much free land borders it, and its trade (gold fields, caravan towns, ports). The player sees
  before Begin how the realm plays. [X-19; X-20; SHELL-031]
- SETUP-074 Grouping and overview: nothing new is added to play. An African realm is played with the same country
  card (General, Diplomacy, Trade, Army), the Subjects lens and tab for its tributaries, and the Diplomacy tab for
  its neighbours; the new nations are ordinary realms, so every existing overview shows them. The suggested realms
  in the picker gain one African start per part of Africa (Mali, Benin, Kongo, Ethiopia, Kilwa in 1444; in 1378, where
  Kongo is not yet founded, Mali, Benin, Tio, Ethiopia and Kilwa); each start lists its own in `scenario.json`
  (`suggested`). [X-19; X-20; X-25]
- SETUP-075 The map and the phone: new nations are drawn and named like every realm (realm names stay at every zoom,
  F-22); free land keeps the unowned colour. On a phone, held sideways or upright, the region list, the realm card
  and the Ways to grow line fit the Wide and Tall layouts inside the safe areas, every row and button is at least 44
  points high, and nothing needs hover. [X-19; X-20]

### 5.9 Sleeping realms (Leroy, 18 October; X-24)

Realms that history founds after 1444 (Spain, the Dutch Republic, the Mughals, Qing …) and realms nobody can name
ahead (a homeland that breaks away, a house of a broken Shogunate) are in every campaign from the start, asleep.

- SETUP-080 (Ubiquitous): The game shall hold, besides the map nations, a list of **sleeping realms**, each with an
  id, a name, a colour, a flag, its event-tree ids, a capital province and its home land (a list of provinces), in
  the scenario-setup data. [X-24]
- SETUP-081 (Ubiquitous): The game shall also hold spare sleeping realms with no name of their own (`spare_count`),
  for realms that wake where no listed sleeper fits. [X-24] @placeholder `sleeping_realms.spare_count`
- SETUP-082 (State-driven): While a realm sleeps, it shall hold no land, armies, fleets, lords, treasury,
  relations or subjects, shall not be drawn, named or listed anywhere (map, realm picker, play on, Diplomacy,
  dispatches), shall take no turn and shall not count as gone. [X-24]
- SETUP-083 (Event-driven): When a sleeping realm wakes, the game shall give it land, a capital, a ruler, a start
  form of government, peoples' faith and tongue from its land, starting gold, the levies its land can call and
  standing at neutral with every realm, and from then on it is an ordinary realm. [X-24]
- SETUP-084 (Event-driven): When a realm wakes, its land shall be, in this order: the land of the realms it is
  formed from, when it is formed from realms (a union); else the provinces the waking names; else its home land.
  Only land a realm that is not the waking one's overlord holds is taken; a province taken leaves its old owner's
  lord and siege as a province handed over without a war does. [X-24; DIPL-113]
- SETUP-085 (Event-driven): When a realm is formed from other realms (a union), every one of them shall end in it:
  their land passes to it, their subjects and allies become its own, and they are gone. If the player's realm is
  one of them, the player plays on as the formed realm and is told so. [X-24; SHELL-095]
- SETUP-086 (Event-driven): When a realm breaks away from another (a release, a revolt, a split), the realm it
  broke from keeps every province not taken, and the two hold a truce. [X-24]
- SETUP-087 (Event-driven): When a realm wakes as a subject of another (`subject_of`), the other shall be its
  overlord with the kind the waking names, else a vassal. [X-24; SUBJ-022]
- SETUP-088 (Event-driven): When no listed sleeper fits the waking (a homeland that breaks away, a house of a broken
  Shogunate), the game shall wake the first spare sleeper, named for its people or house and coloured apart from
  its neighbours. When none is left the waking shall fall back to what the waking context decides without one.
  [X-24]
- SETUP-089 (Event-driven): A gone map realm shall wake again the same way when an event founds it anew (Poland in
  1918). [X-24]
- SETUP-090 (Unwanted): If a sleeping realm's land has no province to give it, then it shall stay asleep and the
  waking shall change nothing on the map. [X-24]
- SETUP-091 (Ubiquitous): Saves shall keep which realms sleep and what each woken realm is called and coloured. [X-24]

#### How the player uses it

- SETUP-092 Where: the player sees a realm wake on the map and in the dispatches, never in a menu. A founding is a
  major dispatch card with the new realm's flag and name and one line of what it was made from ("Spain is founded
  from Castile and Aragon"); a tap on the card centres the map on the new realm, whose land takes its colour at
  once. Sleeping realms are never shown or listed. [X-19; X-24]
- SETUP-093 Grouping and overview: a woken realm has the same country card (General, Diplomacy, Trade, Army) as
  every realm, and the Realms list and Diplomacy map mode show it like the others. When the player's own realm is
  formed into another, a dispatch says "Your realm is now Spain" and the top bar shows the new flag and name. No new
  screen. [X-19; X-24]
- SETUP-094 Phone: the founding card is a dispatch card with the usual 44-point buttons (Show on the map, Close) in
  the Wide and Tall layouts inside the safe areas; nothing needs hover. [X-19; X-24]

### 5.10 The 1378 start (X-25; milestone 10, steps 5 and 7)

The regions' 1378 data (`scenarios/1378/regions/`) is joined into one playable start (step 5), and new campaigns start
from it (step 7, the switch-over). 1444 stays as the main history checkpoint and the world the tests read.

**How the player uses it.** The player sees nothing new to learn: Play or New campaign opens the realm picker over the
1378 map, titled "Autumn 1378", with the start's suggested realms (Murad's Ottomans, Byzantium, Venice, Hungary, the
Horde, Timur, Delhi, Ming and the rest, SETUP-074), and the realm's card before Begin names its ruler on the start day
and the day the campaign begins, 20 September 1378 (SHELL-034). The loading screen is titled "Autumn 1378" and its tips
include the world on the start day. A campaign begun in 1444 before the switch keeps playing in its own world: opening
its save reopens the game in 1444 and loads it (SAVE-111), and leaving it for the start screen returns to 1378. No new
screen, card or control is added, so the phone layouts (Wide and Tall, safe areas, 44-point targets, nothing that needs
hover) are the existing ones; the map simply carries about 315 realms instead of 237. A tester opens the 1444 checkpoint
with `?start=1444` in the address (or `#start=1444`).

- SETUP-095 (Ubiquitous): The game shall start new campaigns from the 1378 scenario: its day (20 September 1378), its
  map nations, owners, rulers, tongues and faiths, relations, subjects, ports, sleeping realms and suggested realms;
  where the address asks for `start=1444` (`PH_START=1444` for headless runs and the test configs), it shall start from
  the 1444 checkpoint instead. [X-25; plan-1378 §6 steps 5 and 7]
- SETUP-096 (Ubiquitous): The 1378 scenario's files shall be generated by joining its region folders in the order the
  scenario lists them, the first owner rule matching winning across regions, and its map built from them by the map
  generator; region data is fixed in the region and the join re-run. [X-25; tools/domain-data/build-1378.py]
- SETUP-097 (Ubiquitous): Sleeping realms and port towns of a generated start shall be given by longitude and latitude or
  owner-rule selector and placed on the generated map's provinces; a port is placed only in a coastal province its
  holder owns on the start day, and waits unplaced otherwise (NAVY-013). [X-24; X-25]
- SETUP-098 (Ubiquitous): Until each rule is moved to the 1378 map's own data, rules that name 1444 provinces shall read,
  in the 1378 start, the province of the 1378 map under each 1444 province's centre. [X-25] @placeholder `world/from-1444.json`

### 5.11 Difficulty (Leroy, 19 October)

Difficulty was a campaign rule the game kept and showed but nothing played by. It now changes three things, each a
factor on a rule that already exists, applied at one point, with no new random draw: how readily the AI looks for a
war, how much gold AI realms' income pays in, and how often the player's plotting provinces rise. On **normal** every
factor is 1, so the game plays exactly as balanced. The numbers are provisional, in
`scenario-setup.json` `campaign_rules.difficulty.effects`:

| Level | AI looks for a war (`ai_war_chance`) | AI income paid in (`ai_income`) | Player's provinces rise (`player_rising_chance`) |
|---|---|---|---|
| easy | × 0.5 | × 0.8 | × 0.75 |
| normal | × 1 | × 1 | × 1 |
| hard | × 1.5 | × 1.25 | × 1.25 |

**How the player uses it.** The player picks Easy, Normal or Hard on the new game options step (step 2, SHELL-033),
where Normal is chosen and a line under the rules says what the chosen level changes ("AI realms fight and earn as balanced";
"AI realms are slower to war and poorer, your provinces calmer"; "AI realms are quicker to war and richer, your
provinces more restless"); a preset fills it with the rest of the step. It is one row of three buttons among the
campaign rules, not a card of its own, since it is chosen once. Afterwards it is fixed: the save library shows it on
each campaign's row with the realm and date (SAVE header `options.difficulty`), and Settings → Campaign rules shows it
read-only (SET-032). Nothing in play names it: the AI's wars, its treasury and the player's rising chances read as
they always do, the rising chance on a province card already including the factor. On a phone in landscape the row
is three 44-point buttons with their line under them in the options step's column, Wide and Tall alike, inside the
safe areas, and nothing needs hover.

- SETUP-099 (Ubiquitous): A campaign shall keep its difficulty, easy, normal or hard (the save library's names), in
  the world from new game on and in every save; a save from before difficulty was kept, or an unknown level, plays
  on normal. [Leroy 19 Oct; SETUP-054, SETUP-055]
- SETUP-100 (Ubiquitous): On normal every difficulty factor shall be 1, so the game plays as balanced. [Leroy 19 Oct]
  @placeholder `campaign_rules.difficulty.effects`
- SETUP-101 (Ubiquitous): The AI's monthly chance to look for a war (`war.aiDeclareChancePerMonth`, with its goals'
  pull) shall be multiplied by the difficulty's `ai_war_chance`: 0.5 on easy, 1.5 on hard. The price of war (WAR-228)
  still decides whether it declares. [Leroy 19 Oct; WAR-228] @placeholder
- SETUP-102 (Ubiquitous): When a new month pays each realm's income into its treasury, an AI realm's income shall be
  multiplied by the difficulty's `ai_income` (0.8 on easy, 1.25 on hard); the player's income, and a realm's
  deficit, shall be paid as they are. The ledger lines are not changed. [Leroy 19 Oct; REALM ledger] @placeholder
- SETUP-103 (Ubiquitous): The monthly chance that a plotting province of the player's realm rises (X-9, with faith and
  tongue, REALM-238) shall be multiplied by the difficulty's `player_rising_chance` (0.75 on easy, 1.25 on hard), at
  most 1; AI realms' provinces rise as balanced. [Leroy 19 Oct; X-9] @placeholder

### 5.12 The options step: how the player uses it (X-19)

- SETUP-104 Where: choosing a realm, by tapping a suggested realm on the *Choose your realm* sheet or **Rule** on a
  realm's card, turns the sheet into one card, **Rules of the campaign**: the realm's banner, name and start day at the
  top, then one row per rule, then one big **Begin as …** button. Close on the card goes back to the realms with the
  choices kept. The options step and the Begin step of SHELL-030 are this one card, so a new game is still two taps
  from the suggested realms (realm, Begin). [X-19; SETUP-054; SHELL-033, SHELL-034]
- SETUP-105 The rules on the card and their defaults: **Difficulty** Easy, Normal or Hard (Normal); **Events**
  Historical, Plausible or Free (Plausible); **Fog of war** On or Off (On); **Ironman** Off or On (Off); **Ends** 31 August of a
  year from 1494 to 1939 (1939, D-SHELL-14). The card starts from the choices of the player's last new game on this
  device, or these defaults (SETUP-058). Under the rows, a few short lines say what the chosen rules mean (Ironman: one
  save after every week, achievements count; not ironman: achievements are earned only in ironman campaigns), since a
  phone has no hover; the first says what the chosen difficulty changes (5.11). AI temper and the presets are not on the card yet (OQ-SETUP-22). [SETUP-054; D-SETUP-20;
  D-SETUP-21]
- SETUP-106 What each rule does once the campaign begins: difficulty is saved as the campaign option `difficulty`
  (`easy`, `normal`, `hard`) in every save header and kept on the world as `campaign.difficulty`, where it plays
  as SETUP-099 to SETUP-103 say; Events picks the event tree's
  preset (historical, plausible or divergent, EVT-036, D-SETUP-21), which also shakes the realms' goals; Fog of war off
  shows every land from the start and the map mode menu's *Hide unexplored lands* switch gives way to a line saying
  so (the AI's information is the same either way, SET-033); Ironman keeps one save line written after every week and
  on exit, with no Save in the game menu and no earlier point of the campaign in Load (SAVE-010, SAVE-087), and only
  an ironman campaign earns achievements (ACH-034); the end date ends the campaign (SHELL-100). [SETUP-055, SETUP-056]
- SETUP-107 Overview: the game menu shows the campaign's rules read-only in one line under the date (*Hard · historical
  events · no fog · ironman · ends 31 Aug 1800*), with a reminder in ironman that it saves after every week. The rules
  cannot be changed in the campaign (SETUP-055, SET-032). [X-19; D-SET-11]
- SETUP-108 The phone: on a phone held sideways (Wide) the card is a side sheet about two thirds of the width, the rules
  two to a row with each label above its buttons, so every rule and Begin fit on 390 points without scrolling; on a
  tall screen the sheet rises from the bottom, one rule per row. Every button and the end-year select are 44 points
  tall, Begin stays at the foot of the sheet however far the lines above it scroll, the sheet keeps clear of the safe
  areas like the realm picker, and nothing needs hover. [X-19; SHELL-146]

## 6. Commands

| Command | Who issues it | Preconditions | Result | Events emitted |
|---|---|---|---|---|
| `AssignStartForms()` | System (build tool) | Catalogue and `start-forms.yaml` valid | Start form per record; summary regenerated | `StartFormsAssigned` |
| `BuildMapSetup()` | System (`mapgen`) | Map built; owner rules and nations | Owners, population, wealth, castles, nation colours | `MapSetupBuilt` |
| `ChooseRealm(nation)` | Player | Realm is playable; unlocked or in the free tier | Realm chosen for the new campaign | — |
| `SetCampaignRules(rules)` | Player | On the new campaign screen | Rules held for Begin | — |
| `NewGame(seed, playerNation, options)` | Player (Begin) | Realm chosen; rules set | Starting world built; warm-up run; campaign starts | `StartingWorldBuilt`, `CampaignStarted` |

## 7. Domain events

| Event | When | Payload | Consumed by (context) |
|---|---|---|---|
| `StartFormsAssigned` | Start-form tool run | form per record | government |
| `MapSetupBuilt` | Map setup written | owners, population, wealth, castles, nations | province, warfare, buildings |
| `StartingWorldBuilt` | New game, before the first turn | countries, provinces, relations, seeds of each system | realm, province, diplomacy, subjects, trade, naval, religion, culture, exploration, research, government, buildings |
| `RealmWoke` | A sleeping realm wakes | realm, how (founded, formed, broke away, revived), from realms, provinces | realm, diplomacy, events, game-shell, map-presentation |
| `CampaignStarted` | Starting world built | campaign id, seed, player nation, rules | time-and-turns, saves, game-shell, achievements |

## 8. Policies (reactions to other contexts)

- When `world-map` emits `MapBuilt` with a rename table, then the map setup is rebuilt and the owner rules
  reapplied.
- When `saves` loads a save of a realm that needs the full game and it is not owned, then the realm asks to
  be unlocked (saves 6.1); the save is never deleted.
- When `government` changes its form list, then the start-form tool is rerun.

## 9. Each turn

Nothing after the start. Before the first turn: build the starting world, then the 24-month trader warm-up
(trade §13.1).

## 10. Configuration

| Key | Meaning | Value in the design | Placeholder? | Config file |
|---|---|---|---|---|
| `default` | Start form when no rule matches | chiefdom | No | `government/config/start-forms.yaml` |
| `kingdom_by_region` | Start form of kingdoms per region | see SETUP-015 | No | `start-forms.yaml` |
| `entity_type` | Start form per entity type | 52 entries | No | `start-forms.yaml` |
| `text_rules` | Ordered text matches | 12 rules | No | `start-forms.yaml` |
| `overrides` | Hand-set start forms with reasons | 75 | No | `start-forms.yaml` |
| starting traders by `trade_access` | 6 / 4 / 2 / 1 / 0 | very high … very low | Yes | trade config |
| warm-up months | Trader warm-up before turn 1 | 24 | Yes | trade config |
| starting routes | Hand-made routes (Venice, Genoa, Lübeck, Florence, Mali/Timbuktu, Kilwa, Calicut and Gujarat, Malacca, Ryukyu) | listed | Yes | trade config |
| charted start | Steps from your lands | 6 | Yes | exploration config |
| `settlement[]` | Density and wealth per region | e.g. Low Countries … 30/6; Africa 3/2 | Yes (rough) | `tools/mapgen/config.json` |
| `defaultDensity`, `defaultWealth` | Outside any region | 0.8, 1 | Yes | `config.json` |
| `palette` | Nation colours | 32 | No | `config.json` |
| `economy.startingTreasury` | Gold at start | 50 | Yes | `defines.json` |
| `levies.menPerThousandPeople` | Levies per 1,000 people | 4 | Yes | `defines.json` |
| `march.startingHorseShare` | Horse in starting armies | 0.2 | Yes | `defines.json` |
| low-confidence range | Wider random start for `low` confidence | not given | Yes | country config |
| world domination share | (country stats 12) | 60 % | Yes | country config |
| `scenario_setup.africa.size_by_manpower` | Provinces a new African nation takes by `manpower_potential` | very low 1, low 2, moderate 3, high 5, very high 8, unknown 2 (X-20) | Yes | `scenario-setup.json` |
| `balance.africa.*` | Balance targets of African starts | SETUP-070 (X-20) | Yes | balancing model |
| free realms | Free tier | Ottomans, France | No | store config |
| `campaign_rules.difficulty.levels`, `.default` | Difficulty levels and the default | easy, normal, hard; normal | No | `scenario-setup.json` |
| `campaign_rules.difficulty.effects` | Factors per level on the AI's war chance, AI income paid in, the player's rising chance (SETUP-100 to SETUP-103) | easy 0.5, 0.8, 0.75; normal 1, 1, 1; hard 1.5, 1.25, 1.25 | Yes | `scenario-setup.json` |

## 11. Seams

| Other context | Direction | Pattern | What crosses |
|---|---|---|---|
| world-map | upstream | Conformist | Provinces, size, terrain, coast, rivers, neighbours; rename table |
| government | downstream | Published Language | Start form per record |
| realm | downstream | Customer–Supplier | Starting counts from assessments; lords from great houses; ruler from leadership 1444 |
| province | downstream | Customer–Supplier | Province starting values; owner; lords' provinces; officials |
| buildings | downstream | Customer–Supplier | Starting buildings from wealth, population, templates, ports, anchors |
| diplomacy | downstream | Published Language | 1444 relations and facts (280 + 19) |
| subjects | downstream | Customer–Supplier | Subject relations and playable subjects |
| trade | downstream | Customer–Supplier | Starting traders by `trade_access`; starting routes; warm-up |
| naval | downstream | Customer–Supplier | 1444 ports and shipyards (`start-ports.json`) |
| religion | downstream | Customer–Supplier | Catalogue faiths per record; province faith mix |
| culture | downstream | Customer–Supplier | Language mix; homelands |
| exploration | downstream | Customer–Supplier | Charted start; exploration unlock in 1444; unowned land |
| research | upstream | Customer–Supplier | Start inventions per country |
| events | upstream | Shared Kernel | Catalogue `event_key`s linked to event-tree ids (260 of 1,175); geography anchors |
| time-and-turns | downstream | Customer–Supplier | Start date, seed, campaign rules (end date) |
| saves | downstream | Customer–Supplier | Header: player nation, needs full game; campaign id |
| game-shell | downstream | Customer–Supplier | Realm picker data, locks, presets, quick start |
| national-strengths | downstream | Customer–Supplier | Records whose strengths are shown "at a glance" |
| rebellions | downstream | Customer–Supplier | Provinces in revolt at start from stability and unrest risk |
| warfare | downstream | Customer–Supplier | Castles at start; commanders |
| onboarding | downstream | Conformist | The Ottomans 1444 for the tutorial |

## 12. AI

- Each record's AI personality (tendencies, not scripts) is data the AI contexts read (country-catalogue
  README §5; `build/ai-personalities.md`).
- Background-only records have no AI; playable subjects have their own AI under an overlord (schema).
- The campaign's difficulty scales how readily AI realms look for a war and how much of their income pays in
  (SETUP-101, SETUP-102); the AI's rules are otherwise the same at every level.

## 13. Decisions and open questions

- **D-SETUP-1** (was OQ-SETUP-1) Catalogue against the map: the map's 137 nations are the realms; the 37 ids that differ are matched to catalogue records through a rename table in `scenario-setup.json` (`ottomans` → `ottoman`, `korea` → `joseon`, `aztecs` → `triple_alliance` …), and ids with no record keep the map's own data. X-13 settles it.
- **D-SETUP-2** (was OQ-SETUP-2) What becomes a country: only a representation that owns map provinces is a realm; the map's ownership is kept as built, so unowned land stays unowned and colonisable, and other records are reference data events may draw on. X-13 settles it.
- **D-SETUP-3** (was OQ-SETUP-3) Playable at launch: every realm on the map is playable, with the free tier as already decided. X-13 makes the map's nations the playable list.
- **D-SETUP-4** (was OQ-SETUP-4) Start date: every campaign and the tutorial start on 11 November 1444, so the catalogue's and relations' rulers, wars and unions apply as they stand that day (Mehmed II rules the Ottomans, the Poland–Hungary union has lapsed). X-5 settles it.
- **D-SETUP-5** (was OQ-SETUP-5) Province starting values: the map build's people, wealth and castles are the start values, marked provisional for balancing. They are the only complete set.
- **D-SETUP-6** (was OQ-SETUP-6) Assessment levels: each level becomes a factor on the base start value (very low 0.5, low 0.75, medium 1, high 1.25, very high 1.5), `unknown` counts as medium, and low confidence widens the random range to ±20 % (all provisional in `scenario-setup.json`). Missing numbers get provisional values.
- **D-SETUP-7** (was OQ-SETUP-7) Events option: "historical" uses the `historical` preset and "free" the `plausible` preset; `divergent` is not offered. Two options map onto two presets with the least change. *Replaced by D-SETUP-21: three choices, as the events spec has them.*
- **D-SETUP-8** (was OQ-SETUP-8) Collective institutions: they are not realms unless a map nation is matched to them (`switzerland` → `swiss_confederation`, `aztecs` → `triple_alliance`), in which case that realm takes the record's start form; the rest are reference data. X-13 settles it.
- **D-SETUP-9** (was OQ-SETUP-9) Group records: a group record is reference data; its provinces belong to whatever map nation owns them. X-13 settles it.
- **D-SETUP-10** (was OQ-SETUP-10) Two relationship sets: the relations dataset wins at start, and the catalogue's edges are reference only. Country stats 10 already reads the relations dataset, and it is the curated, later set.
- **D-SETUP-11** (was OQ-SETUP-11) Flat engine starts: country stats 10's gold, debt and recruits from assessments replace the flat 50 gold and levies, with the engine's defines kept only for a realm with no assessment. The later design wins.
- **D-SETUP-12** (was OQ-SETUP-12) Warm-up and the clock: the warm-up uses the campaign's one seed, does not move the date and changes only trade ratios. D-TIME-11 settles it.
- **D-SETUP-13** (was OQ-SETUP-13) Capitals and commanders: capitals and commander numbers come from the map nations data, the only source with numbers, so Dunois has Cunning 3; troop movement's Cunning 4 is an illustration. Keep what the game already does.
- **D-SETUP-14** (was OQ-SETUP-14) Lords for minor countries: tier B and C countries start with no great houses; they get lords only through the realm's own rules in play. No new mechanic.
- **D-SETUP-15** (was OQ-SETUP-15) Province names: modern region names stay. D-MAP-6 settles it.
- **D-SETUP-16** (was OQ-SETUP-16) Coverage and certainty: a disputed, partial or stub record enters play only if it owns map provinces, and low confidence only widens its start range (D-SETUP-6). X-13 settles it.
- **D-SETUP-17** (was OQ-SETUP-17) Population scale: the map's figure is the province's people in thousands (Aube 305 thousand); the Troyes card's 72,000 is a town-sized illustration, not data. The map is the only complete set.
- **D-SETUP-19** Sleeping realms (Leroy, 18 Oct; X-24): realms founded after 1444 are listed from the start and asleep until they wake (SETUP-080 to SETUP-094). D-SETUP-2's "only a representation that owns map provinces is a realm" now reads "is a realm on the map in 1444"; a record that owns no province may be a sleeping realm.
- **D-SETUP-18** African starts (Leroy, 18 Oct; X-20): in the four African regions, D-SETUP-2's "only a representation that owns map provinces is a realm" now applies after the catalogue's playable countries, subjects and peoples are given the unowned land around their capitals (SETUP-060 to SETUP-065); elsewhere D-SETUP-2 stands. Leroy asked for more of the historical states and tribes, even very small ones, and as little change to the rules of play as possible.
- **D-SETUP-19** Added realms and the province grid (18 Oct; X-20, D-TRIBE-3): realms added from the catalogue (`grows` in the map nations data) take provinces as the map already cuts them, and never keep a piece of land apart the way the hand-placed capitals do, so every province keeps its id and every file that names provinces (ports, event places, anchors) stays valid. Sub-Saharan provinces are large (about 50,000 km² each), so where two capitals fall in one province the first in nation order keeps it and the other stays reference data (Kayor, Baol and Waalo in Jolof's province; Lamu and Pate in Mombasa's). The build lists them in `scenario-setup-report.json`. A finer African grid is a map change of its own. The start-date plan (1378) extends the same rows: a realm's capital, its own owner rules and `grows`.
- **OQ-SETUP-22** AI temper and presets: SETUP-054 also asks for AI temper and presets that fill the whole step, but no design gives AI temper's values or what it does, nor the presets' names and values. They are left off the options step until the AI difficulty work defines them; the save header already has room for `aiTemper` (D-SAVE-8).

- **D-SETUP-20** Difficulty (Leroy, 19 Oct): difficulty changes the AI's readiness for war, the gold AI realms' income pays in and the player's rising chances, each as a provisional factor at one point, 1 on normal (SETUP-099 to SETUP-103). The rising factor is the player's only, since difficulty is about the player's game and AI realms' unrest shapes the world's history; the income factor is the AI's only, so the player's treasury always reads as its ledger. The war factor applies to every AI realm's monthly look for a war, not only toward the player, as no design names the player as a special target. This is the one place where the AI's numbers differ from the player's (DECISIONS rule 3), chosen by the player at new game.
- **D-SETUP-21** (was OQ-SETUP-21; confirmed by Leroy, 20 Oct 2026) Events choice: this spec and game shell offered "historical or free" (D-SETUP-7, SHELL-033) while events offers Historical, Plausible and Free with Plausible the default (EVT-036, D-EVT-9). The options step follows the events spec, the owner of the presets: three choices, Historical → historical, Plausible → plausible, Free → divergent (`events_presets` in `scenario-setup.json`), Plausible by default, so a default game plays as before; this replaces D-SETUP-7's two-choice mapping. A world made without the options step (tests, balance runs) keeps the plausible preset.

## 14. Traceability

| Requirement | Feature file | Scenario |
|---|---|---|
| SETUP-001 | catalogue.feature | The catalogue describes the reference day and holds no game numbers |
| SETUP-002 | catalogue.feature | Entities outside the 1440s are excluded as anachronistic |
| SETUP-003 | catalogue.feature | Subordinate entities are included when their politics mattered |
| SETUP-004 | catalogue.feature | Micro-polities are grouped without implying one state |
| SETUP-005 | catalogue.feature | Decentralised societies are never forced into nation-states |
| SETUP-006 | catalogue.feature | Disputed entities keep their dispute |
| SETUP-007 | catalogue.feature | Ids are stable and never reused |
| SETUP-008 | catalogue.feature | Relationship edges are stored once by their kind |
| SETUP-009 | catalogue.feature | Assessments are levels judged on the right scale |
| SETUP-009 | catalogue.feature | There is no overall power score |
| SETUP-010 | catalogue.feature | Assessments are levels judged on the right scale |
| SETUP-011 | catalogue.feature | The catalogue holds 963 records by representation |
| SETUP-012 | catalogue.feature | AI personalities are tendencies, not scripts |
| SETUP-012 | catalogue.feature | Risk tolerance is read in three steps |
| SETUP-013 | catalogue.feature | Nothing comes from commercial games |
| SETUP-014 | start-forms.feature | Hand-set overrides win |
| SETUP-014 | start-forms.feature | Text rules apply in order on the government form text |
| SETUP-014 | start-forms.feature | Entity types set the form when no text rule matches |
| SETUP-014 | start-forms.feature | A record no rule matches is a chiefdom |
| SETUP-015 | start-forms.feature | Kingdoms take their form from their region |
| SETUP-016 | start-forms.feature | Text rules apply in order on the government form text |
| SETUP-016 | start-forms.feature | A text rule limited to some types is skipped for others |
| SETUP-017 | start-forms.feature | Hand-set overrides win |
| SETUP-018 | start-forms.feature | Later forms are never start forms |
| SETUP-019 | start-forms.feature | The summary is generated from the config |
| SETUP-020 | country-start.feature | Assessments set starting counts |
| SETUP-020 | country-start.feature | Each assessment level is a factor on the base start value |
| SETUP-020 | country-start.feature | Low confidence widens the starting range |
| SETUP-021 | country-start.feature | Low confidence widens the starting range |
| SETUP-022 | country-start.feature | Starting allies, rivals, subjects and enemies come from the relations file |
| SETUP-023 | country-start.feature | Lords come from the great houses |
| SETUP-024 | country-start.feature | Starting traders follow trade access |
| SETUP-024 | country-start.feature | Coastal countries trade by ship and inland ones by land |
| SETUP-025 | country-start.feature | Busy roads start busy |
| SETUP-026 | country-start.feature | Faiths come from the catalogue |
| SETUP-027 | country-start.feature | Four realms can explore from the first day |
| SETUP-028 | province-start.feature | The map sets tiles, ground, shore, people and starting buildings |
| SETUP-029 | province-start.feature | The catalogue sets owner, lords' provinces, homeland and mixes |
| SETUP-030 | province-start.feature | Start inventions decide which buildings exist |
| SETUP-031 | province-start.feature | Region tables set wares, fever land and crops |
| SETUP-032 | province-start.feature | Anchors fix named places |
| SETUP-033 | province-start.feature | Relations set trade pacts, occupations and pretenders |
| SETUP-034 | province-start.feature | Wealth and population set the first buildings and town |
| SETUP-035 | province-start.feature | Wealth and population set the first buildings and town |
| SETUP-036 | province-start.feature | Ports start by their 1444 tier |
| SETUP-037 | province-start.feature | The faith mix follows the owner, adjusted by region |
| SETUP-038 | province-start.feature | The map sets tiles, ground, shore, people and starting buildings |
| SETUP-039 | province-start.feature | The charted map starts six steps out |
| SETUP-040 | map-setup.feature | A map nation has a capital, a colour and commanders |
| SETUP-041 | map-setup.feature | The first matching owner rule wins |
| SETUP-042 | map-setup.feature | A nation with no province is left out |
| SETUP-043 | map-setup.feature | Neighbouring nations get different colours |
| SETUP-044 | map-setup.feature | Population follows settlement, ground and capitals |
| SETUP-044 | map-setup.feature | Unowned land is sparsely peopled |
| SETUP-045 | map-setup.feature | Wealth follows the region, the coast and capitals |
| SETUP-046 | map-setup.feature | Castles follow the stand-in rule |
| SETUP-047 | map-setup.feature | The engine's flat start values serve only realms with no assessment |
| SETUP-048 | catalogue-to-map.feature | The map's nations are the realms and the playable list |
| SETUP-049 | catalogue-to-map.feature | Map nations use catalogue ids |
| SETUP-050 | catalogue-to-map.feature | Only land no realm on the map owns can be colonised |
| SETUP-050 | catalogue-to-map.feature | A catalogue record that owns no map province is not a realm |
| SETUP-059 | catalogue-to-map.feature | Each realm carries its administrative capacity |
| SETUP-051 | new-campaign.feature | The free tier offers the Ottomans and France |
| SETUP-051 | new-campaign.feature | The tutorial is played as the Ottomans |
| SETUP-052 | new-campaign.feature | A locked realm leads to Unlock and comes back chosen |
| SETUP-053 | new-campaign.feature | The realm picker filters realms on the map |
| SETUP-054 | new-campaign.feature | Campaign rules are set once and shown read-only |
| SETUP-054 | new-campaign.feature | A preset fills the whole options step |
| SETUP-055 | new-campaign.feature | Campaign rules are set once and shown read-only |
| SETUP-056 | new-campaign.feature | A new game starts from a seed with a new campaign id |
| SETUP-057 | new-campaign.feature | The save header records whether the realm needs the full game |
| SETUP-058 | new-campaign.feature | Quick start skips to Begin |
| SETUP-060 | african-starts.feature | The catalogue's African countries and subjects are on the map |
| SETUP-061 | african-starts.feature | Stateless peoples with a homeland become small realms |
| SETUP-061 | african-starts.feature | Migrations, raiders and background records stay reference data |
| SETUP-062 | african-starts.feature | A playable subject starts under the overlord the relations file names |
| SETUP-063 | african-starts.feature | New nations take unowned land around their capitals by size |
| SETUP-063 | african-starts.feature | A new nation's own owner rule comes before a broad rule |
| SETUP-064 | african-starts.feature | A capital inside another realm leaves the record as reference data |
| SETUP-065 | african-starts.feature | Land left over stays free and colonisable |
| SETUP-066 | african-starts.feature | A new nation gets a colour and a commander |
| SETUP-067 | african-starts.feature | Sub-Saharan castles are earthworks except named stone castles |
| SETUP-068 | african-starts.feature | Gold fields and trade towns are anchored |
| SETUP-069 | african-starts.feature | African nations start by the same rules as every realm |
| SETUP-070 | african-starts.feature | Balance targets for African starts |
| SETUP-071 | — | Checked by the performance budget, not a scenario |
| SETUP-072 | african-starts.feature | Choosing a region lists every realm in it |
| SETUP-073 | african-starts.feature | The realm card shows how the realm can grow |
| SETUP-074 | african-starts.feature | African starts join the suggested realms |
| SETUP-075 | — | Presentation and phone layout (checked by screenshots) |
| SETUP-095 | — | rules unit tests `start-default.test.ts` (new campaigns start in 1378) and `start-1378.test.ts` (a valid 1378 ruleset) |
| SETUP-096 | — | rules unit test `scenario-1378.test.ts` (the regions checked together) |
| SETUP-097 | — | rules unit test `start-1378.test.ts` (sleeping realms and ports on 1378 provinces) |
| SETUP-098 | — | start.ts (no scenario yet) |
| SETUP-099 | difficulty.feature | A new campaign keeps its difficulty |
| SETUP-099 | difficulty.feature | A save from before difficulty was kept plays on normal |
| SETUP-100 | difficulty.feature | Normal plays as balanced |
| SETUP-101 | difficulty.feature | The AI looks for a war by the difficulty |
| SETUP-102 | difficulty.feature | AI income pays in by the difficulty, the player's never |
| SETUP-103 | difficulty.feature | The player's plotting provinces rise by the difficulty |
| SETUP-104 | — | How the player uses it; checked by `apps/client/scripts/new-game-options-shots.mjs` and `apps/client/src/ui/newGame.test.ts` |
| SETUP-105 | — | engine unit test `newGameOptions.test.ts` (the choices and defaults) and `newGame.test.ts` (the card) |
| SETUP-106 | — | engine unit test `newGameOptions.test.ts` (options on the world and in saves, events preset, end date, achievements only in ironman) |
| SETUP-107 | — | checked by `apps/client/scripts/new-game-options-shots.mjs` (the game menu's rules line, no Save in ironman) |
| SETUP-108 | — | Presentation and phone layout (checked by screenshots) |
