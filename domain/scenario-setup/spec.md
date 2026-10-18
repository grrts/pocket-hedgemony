# Scenario setup (SETUP)

## 1. Purpose and scope

This context owns the 1444 start: which political entities exist (the country catalogue's 963 records),
what kind of actor each is in the game (its representation), how the catalogue is put onto the map (137
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
- Campaign rules chosen at new game (difficulty, AI temper, fog, events, ironman, end date) as setup data.

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
13. Repository: `README.md` (the world map, 137 nations); `tools/mapgen/nations-1444.json`,
    `owners-1444.json`, `owners.ts`, `config.json` (`settlement`, `palette`);
    `packages/rules/data/defines.json` (`economy.startingTreasury`, `levies`, `march.startingHorseShare`).

## 3. Ubiquitous language

| Term | Meaning | Not to be confused with |
|---|---|---|
| Catalogue | The 963 researched records of 1444 political entities, with no numeric game statistics | The map's 137 nations |
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
| Map nation | One of the 137 nations in `nations-1444.json` that own provinces on today's map | A record |
| Owner rule | A rule in `owners-1444.json` handing provinces to a map nation; first match wins | — |
| Stand-in rule | A placeholder rule (castles, wealth) used until the province data is researched | — |
| Campaign rules | Options chosen at new game and saved with the campaign: difficulty, AI temper, fog, events, ironman, end date | Settings |
| Free tier | The realms playable without buying: the Ottomans and France | The Steam demo (one way to reach it) |
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
- difficulty, AI temper (aggression), fog, events (historical or free), ironman, end date (default
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

- SETUP-020 (Ubiquitous): Each country's starting counts shall be set from the catalogue's assessments: economic strength and fiscal resilience → Gold and Debt; manpower potential → Recruits; military capability → Soldiers, Commanders, Horses; naval capability → Ships; administrative capacity → Officials and how many provinces start as royal land; political stability and unrest risk → lords' starting loyalty and provinces in revolt; territorial cohesion → number of lords, the land they hold, and Tongue; institutional development → Schools, Scholars, starting inventions; trade access → Merchants and grain price access; diplomatic influence → extra officials at court ready to go abroad. [country-stats §10] (D-SETUP-6)
- SETUP-021 (Ubiquitous): A `low` confidence in the catalogue shall give a wider random range for the starting counts, so each campaign starts a little differently. [country-stats §10]
- SETUP-022 (Ubiquitous): Allies, Rivals, Subjects and Enemies shall come straight from `country-relations/data/relations-1444.json` (280 relations and 19 facts on 11 November 1444). [country-stats §10; country-relations README]
- SETUP-023 (Ubiquitous): Lords for major countries shall come from the great houses the catalogue's history names; a country with only one province has no lords. [country-stats §10; government §6]
- SETUP-024 (Ubiquitous): Starting traders shall follow `trade_access`: very high 6, high 4, moderate 2, low 1, very low or unknown 0; trade ships for coastal countries with ports, caravans or barges inland. [trade §13.1] @placeholder
- SETUP-025 (Ubiquitous): Starting trade ratios shall be set by running the starting traders for 24 months before the first turn. [trade §13.1; D-SETUP-12] It uses the campaign's one seed and does not move the date.
- SETUP-026 (Ubiquitous): Each record's ruler's faith, people's majority faith and other communities shall be read from the catalogue (`build/catalogue-faiths.json`). [religion §2.3]
- SETUP-027 (Ubiquitous): In 1444, Portugal, Castile, Genoa and Venice shall start able to explore (they know S4 and sit in the Age of Exploration); Ming China knows S1 and S2 but not S4. [exploration §2]

### 5.4 Province starting values

- SETUP-028 (Ubiquitous): Each province's tile count shall come from its size on the map, its ground from terrain, its tile mix from ground, its shore tiles from coast and rivers, its people from population, and how many buildings start built (and town size) from wealth. [province-stats §16]
- SETUP-029 (Ubiquitous): The catalogue shall set each province's owner, which provinces belong to which named lord, Homeland of, the Faith and Tongue mix, and (by `administrative_capacity`) how many royal provinces start with an official. [province-stats §16]
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

- SETUP-040 (Ubiquitous): The map's 1444 setup shall list 137 nations, each with a capital (longitude and latitude), a colour and commanders (name, might, cunning, logistics). [README; nations-1444.json]
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

### 5.7 Playable realms and campaign rules

- SETUP-051 (Ubiquitous): The free tier shall offer the Ottomans and France; the tutorial is played as the Ottomans. [gap-lists decisions, item 2, List 3 item 2; tutorial §3.1]
- SETUP-052 (State-driven): While the full game is not owned, the realm picker shall show other realms with a padlock and a button to the Unlock screen; returning from a purchase keeps the realm chosen. [screen-flow S5]
- SETUP-053 (Ubiquitous): The realm picker shall offer realms on the map at world zoom, with filters by region, difficulty and free or locked, and a short list of suggested realms. [screen-flow S5]
- SETUP-054 (Ubiquitous): New game shall set the campaign rules difficulty, AI temper, fog, historical or free events, ironman and end date (default 31 August 1939), with presets that fill the whole step. [screen-flow S5; settings §4.3]
- SETUP-055 (Ubiquitous): Campaign rules shall be saved with the campaign and shown read-only under Pause → Campaign rules. [settings §4.3]
- SETUP-056 (Ubiquitous): A new game shall start from a seed, the player's nation and the options, and get a random campaign id. [save-system §2.1, §9]
- SETUP-057 (Ubiquitous): Each save header shall record the player's nation and whether it needs the full game. [save-system §4.2, §6.1]
- SETUP-058 (Ubiquitous): Quick start shall skip to Begin with the last options used and the realm last tapped (or the first suggested realm). [screen-flow S5]

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
| free realms | Free tier | Ottomans, France | No | store config |

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
| culture | downstream | Customer–Supplier | Tongue mix; homelands |
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

## 13. Decisions and open questions

- **D-SETUP-1** (was OQ-SETUP-1) Catalogue against the map: the map's 137 nations are the realms; the 37 ids that differ are matched to catalogue records through a rename table in `scenario-setup.json` (`ottomans` → `ottoman`, `korea` → `joseon`, `aztecs` → `triple_alliance` …), and ids with no record keep the map's own data. X-13 settles it.
- **D-SETUP-2** (was OQ-SETUP-2) What becomes a country: only a representation that owns map provinces is a realm; the map's ownership is kept as built, so unowned land stays unowned and colonisable, and other records are reference data events may draw on. X-13 settles it.
- **D-SETUP-3** (was OQ-SETUP-3) Playable at launch: every realm on the map is playable, with the free tier as already decided. X-13 makes the map's nations the playable list.
- **D-SETUP-4** (was OQ-SETUP-4) Start date: every campaign and the tutorial start on 11 November 1444, so the catalogue's and relations' rulers, wars and unions apply as they stand that day (Mehmed II rules the Ottomans, the Poland–Hungary union has lapsed). X-5 settles it.
- **D-SETUP-5** (was OQ-SETUP-5) Province starting values: the map build's people, wealth and castles are the start values, marked provisional for balancing. They are the only complete set.
- **D-SETUP-6** (was OQ-SETUP-6) Assessment levels: each level becomes a factor on the base start value (very low 0.5, low 0.75, medium 1, high 1.25, very high 1.5), `unknown` counts as medium, and low confidence widens the random range to ±20 % (all provisional in `scenario-setup.json`). Missing numbers get provisional values.
- **D-SETUP-7** (was OQ-SETUP-7) Events option: "historical" uses the `historical` preset and "free" the `plausible` preset; `divergent` is not offered. Two options map onto two presets with the least change.
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
