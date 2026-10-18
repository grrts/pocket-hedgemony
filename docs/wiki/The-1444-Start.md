# The 1444 Start

Every campaign begins in 1444 with a world built from research: a catalogue of 963 political entities of the time, from great kingdoms to stateless societies, put onto the map with their governments, their strengths and weaknesses, their friends and enemies. This page explains where that starting world comes from, how a country's starting gold, soldiers and officials are worked out, how each province gets its starting people, wealth and castles, which realms you can play, and which campaign rules you pick before you begin. Once the first turn starts, other systems take over.

## How it works

### The country catalogue

The starting world comes from the **country catalogue**: 963 researched records of the political entities that existed on the **reference day, 11 November 1444**, the day after the battle of Varna. The catalogue is history, not game balance: it holds no numeric game statistics at all. Population appears only as a published range with a source, and army sizes or budgets only when they are directly sourced.

**Who gets in.** The catalogue follows a few inclusion rules:

- **Date test**: an entity is included only if it existed in the 1440s with the identity recorded. Entities founded later, or that ended just before, are listed as `excluded_anachronistic`.
- **Agency test**: subordinate entities are included when their internal politics mattered. Pure administrative subdivisions are `excluded_not_distinct` or `merged_into_other`.
- **Groups**: where hundreds of micro-polities existed, the significant ones get their own record and the rest go into a named **group record** (such as `silesia` or `tusi_group`), which never implies a single state.
- **No forced states**: societies without a state are recorded as such (stateless, segmentary lineage and so on), as a decentralised polity or a non-state actor, never forced into a nation-state.
- **Disputes are kept**: where existence or classification is disputed, the record is kept as `included_disputed` with the dispute described, never resolved silently.

**Ids.** Every record has a stable snake_case id that is never reused (for example `ottoman`, `mamluk`, `joseon`). A renamed id goes into an alias list. Relationship edges live in separate relationship files, never inside records: a hierarchical edge is stored with the subordinate party and a symmetric one with party `a`.

**Nothing from commercial games.** The catalogue carries no tags, statistics, values, mechanic names or text from commercial games.

Every record carries every section, whatever its importance: region, names, classification, existence, identity, leadership in 1444, government, geography with capital, society, economy, military, diplomacy, gameplay data, event links, sources, confidence and open questions. Each record belongs to exactly one of 29 regions, by its 1444 core or seat.

**Detail tiers** set only how much prose a record has: A for major powers, B for significant secondary states, C for minor ones.

### Representations: what each record becomes in the game

| Representation | What it is | Records |
|---|---|---|
| Playable country | Has its own AI, can be played, not under an overlord | 274 |
| Playable subject | Has its own AI but sits under an overlord | 218 |
| Decentralised polity | A society without a state, recorded as such | 214 |
| Background only | Flavour or territory holder without AI | 115 |
| Non-state actor | For example a movement or order | 68 |
| Internal estate | Simulated as a faction or region inside another country | 58 |
| Collective institution | The Empire, the Hanse, confederacies, councils | 16 |

The 16 collective institutions are the Kalmar Union, the Hanseatic League, the Holy Roman Empire, the Council of Basel, the Decapolis, the Swabian League cities, the Swiss Confederation, the Livonian Confederation, the League of Lezhë, Mount Athos, the Gelug monasteries, the Karmapa, the Sakya, the Japanese imperial court, the Kamakura kubō and the Triple Alliance. They are not realms of their own, unless a map nation stands for one: Switzerland plays as the Swiss Confederation and the Aztecs as the Triple Alliance. The rest are background that events can draw on.

### Starting assessments

Instead of numbers, each record has a **qualitative assessment** on a set of dimensions, each one very low, low, moderate, high, very high or unknown, with a justification and a confidence. There is deliberately **no overall power score**.

| Kind of dimension | Dimensions | Judged… |
|---|---|---|
| Size-dependent | economic strength, manpower potential, military capability, naval capability, diplomatic influence, trade access | on one global scale |
| Quality | political stability, administrative capacity, fiscal resilience, institutional development, territorial cohesion, long-term potential | relative to the entity's own size and type |
| Risk (higher is worse) | unrest risk, external threat exposure | as risks |

Each record also has an **AI personality**: historically informed tendencies (priorities, ways of expanding, diplomatic style, economic focus, doctrine, risk tolerance, constraints, opportunities, failure conditions, how it adapts). These are tendencies the AI reads, not scripts.

### Start forms of government

Every country starts with its historical form of government, assigned by rules tried in order:

1. **Hand-set overrides** (75 of them, each with a reason), which win over everything else. Examples: the Ottomans as a household realm, the Mamluks as soldier emirs, Venice as a merchant republic, England as a diet monarchy, Hungary as an elective monarchy.
2. **Text rules** (12), tried in order on the lower-cased government text in the catalogue, honouring each rule's allowed and skipped entity types.
3. **Entity type** (52 entries). A record of type `kingdom` takes its form from its region:

| Region | Kingdom starts as |
|---|---|
| Latin Europe; Anatolia and the Caucasus | feudal realm |
| Levant, Egypt and Arabia; Iran and Transoxiana; North Africa | household realm |
| South Asia; China and Inner Asia | feudal realm |
| The steppe and Siberia | horde |
| Japan and Korea | warlord domain |
| Southeast Asia | tribute empire (tiers A and B), paramount chiefdom (tier C) |
| The rest of Africa, the Americas and Oceania | paramount chiefdom |

4. **Default**: `chiefdom`.

No country ever starts as an absolute monarchy, constitutional monarchy, constitutional republic, military junta, party state or company rule. Those forms are reached later by reform, revolution or events (see [Government](Government)). The summary of start forms is generated by a tool, never edited by hand.

### Starting counts for each country

Each country's starting counts are set from its assessments:

| Assessment | Sets |
|---|---|
| Economic strength and fiscal resilience | Gold and Debt |
| Manpower potential | Recruits |
| Military capability | Soldiers, Commanders, Horses |
| Naval capability | Ships |
| Administrative capacity | Officials, and how many provinces start as royal land |
| Political stability and unrest risk | Lords' starting loyalty, and provinces in revolt |
| Territorial cohesion | Number of lords, the land they hold, and Tongue |
| Institutional development | Schools, Scholars, starting inventions |
| Trade access | Merchants and access to grain prices |
| Diplomatic influence | Extra officials at court ready to go abroad |

A **low confidence** in the catalogue gives a wider random range for the starting counts, so each campaign starts a little differently. Each level multiplies the starting count: very low by 0.5, low by 0.75, medium by 1, high by 1.25 and very high by 1.5, and an unknown level counts as medium. Low confidence lets the count vary by up to 20 % either way.

Other starting facts:

- **Relations**: allies, rivals, subjects and enemies come straight from the 1444 relations data: 280 relations and 19 facts on 11 November 1444. See [Diplomacy](Diplomacy) and [Subjects](Subjects).
- **Lords**: for major countries, lords come from the great houses the catalogue's history names. A country with only one province has no lords. See [Your Realm](Your-Realm).
- **Traders**: starting traders follow trade access (very high 6, high 4, moderate 2, low 1, very low or unknown 0); trade ships for coastal countries with ports, caravans or barges inland. Starting trade ratios are set by running the starting traders for **24 months before the first turn**, so busy roads start busy. See [Trade](Trade).
- **Faiths**: each record's ruler's faith, its people's majority faith and other communities come from the catalogue. See [Religion](Religion).
- **Exploration**: in 1444 Portugal, Castile, Genoa and Venice can already explore; Ming China knows the first two sea inventions but not the one needed. See [Exploration and Colonies](Exploration-and-Colonies).

### Province starting values

| Province value | Comes from |
|---|---|
| Tile count | Size on the map |
| Ground and tile mix | Terrain |
| Shore tiles | Coast and rivers |
| People | Population |
| Buildings built and town size | Wealth |
| Owner, which provinces belong to which named lord, Homeland of, Faith and Tongue mix | The catalogue |
| Royal provinces that start with an official | Administrative capacity |
| Which buildings, castle steps and road steps exist | The research tree's start inventions |
| Wares each ground makes, fever land, crops | Region tables in config |
| Fixed mines, toll points, castles and markets | Event-tree geography anchors (Constantinople, Potosí, Malacca …) |
| Trade pacts, occupations, pretenders | The 1444 relations file |

**Starting buildings** follow the map's wealth: a wealth 1 province has a farm or ranch on a third of its tiles; a wealth 10 province has every tile built and its town buildings at step 2. Town size follows population, and town slots fill by a regional template, for example a European market town gets a market, a church and a loom house, and a Sahel trade town a market, a mosque and a caravanserai. See [Buildings](Buildings).

**Ports** come from the naval design's 1444 port list: a great port gets harbour 2; a port harbour 2 or 1; a small harbour 1; a canoe landing no harbour but extra seafolk and small craft. See [Naval](Naval).

The province faith mix follows the record that owns it, adjusted by a region table.

Population, wealth (1 to 10), terrain, coast and neighbours stay as **starting inputs**. Wealth stops being a live stat once the buildings are placed.

**Charted map**: every country starts having charted every province within 6 steps of its lands, plus every sea zone touching them.

### The 1444 map today

Until the catalogue is fully mapped, today's build uses a simpler setup:

- **137 map nations**, each with a capital (longitude and latitude), a colour and commanders with might, cunning and logistics (for example France's Jean de Dunois).
- **Owner rules** hand provinces to nations, checked in order, first match wins, by modern country, region name or a longitude and latitude box. Borders are an approximation of 1444, not an atlas.
- A nation that ends up with no province is left out.
- Each nation's colour is one of 32 palette colours not taken by a neighbouring nation.

**Population** of a province, in thousands of people:

- Land area times the density of the first matching settlement region (default 0.8 people per km²),
- ×0.35 in mountains, desert and tundra; ×1.3 in farmland and marsh; ×2.5 for a capital,
- spread by 0.7 to 1.3 per province,
- unowned land capped at twice the default density.

**Wealth** of a province:

- The first matching settlement region's wealth (default 1; always 1 for unowned land),
- +1 if owned and coastal, +2 for a capital,
- spread by 0.75 to 1.25 and kept between 1 and 10.

Settlement regions range from dense, rich ones (the Low Countries at 30 people per km² and wealth 6) to sparse ones (Africa at 3 and 2).

**Castles** (a stand-in until real castles are researched):

| Province | Castle |
|---|---|
| Capitals, and provinces of 400 thousand people or more | Stone |
| Frontier provinces on high ground with 30 thousand or more, or anywhere with 200 thousand or more | Stone |
| Other frontier provinces | Earth |
| About 15 % of other owned provinces | An old ring fort |
| Unowned provinces | None |

The engine starts every nation with 50 gold, levies of 4 men per thousand people, and 20 % horse in starting armies (all placeholders). A realm's men under arms all start in armies under a commander, spread over its land: one army per commander, the first in the capital. It gets one commander for every 8,000 men, at least one and at most eight (more only if an army would pass 30,000).

### From catalogue to map

A mapping plan will say which catalogue record owns which provinces, with capitals, colours, rulers and commanders, and the map setup will use catalogue ids for countries. The 137 nations on the map are the realms. Where a map nation's id differs from the catalogue (for example Korea is Joseon), a rename table links the two. A catalogue record that owns no province on the map is background only, and land nobody owns stays free to settle.

A **colony** can be founded only in a province no country owns. Land of a tribe that is a country (a chiefdom or clan council in the 1444 list) can only be taken by war or treaty.

### Playable realms and the free tier

- The **free tier** offers the **Ottomans and France**. The tutorial is played as the Ottomans.
- Without the full game, the realm picker shows other realms with a padlock and a button to the Unlock screen. Coming back from a purchase keeps the realm you chose.
- Every realm on the map is playable.

### Campaign rules

At new game you set the **campaign rules**: difficulty, AI temper, fog, historical or free events, ironman, and the end date (default 31 August 1939). Presets fill the whole step at once. The rules are saved with the campaign, can't be changed afterwards, and are shown read-only under Pause, Campaign rules.

A new game starts from a **seed**, your nation and the options, and gets a random campaign id. The same seed and the same rules always give the same starting world. Each save header records your nation and whether it needs the full game. Loading a save of a locked realm asks you to unlock it; the save is never deleted.

## What you see

- **Realm picker**: realms on the map at world zoom, filters by region, difficulty and free or locked, and a short list of suggested realms. Locked realms show a padlock and a button to Unlock.
- **Campaign rules step**: difficulty, AI temper, fog, events, ironman and end date, with presets.
- **Quick start**: skips to Begin with the last options used and the realm last tapped (or the first suggested one).
- **Pause, Campaign rules**: the rules of the running campaign, read-only.

The screens themselves are on [Screens and Navigation](Screens-and-Navigation).

## How it connects

- [World Map](World-Map): provinces, size, terrain, coast, rivers, neighbours; a rebuild with a rename table reapplies the owner rules.
- [Government](Government): the start form of every record.
- [Your Realm](Your-Realm): starting counts from assessments; lords from great houses; ruler from 1444 leadership.
- [Provinces](Provinces): province starting values, owners, lords' provinces, officials.
- [Buildings](Buildings): starting buildings from wealth, population, templates, ports and anchors.
- [Diplomacy](Diplomacy): the 1444 relations and facts.
- [Subjects](Subjects): subject relations and playable subjects.
- [Trade](Trade): starting traders, starting routes and the 24-month warm-up.
- [Naval](Naval): 1444 ports and shipyards.
- [Religion](Religion): catalogue faiths and province faith mix.
- [Culture](Culture): tongue mix and homelands.
- [Exploration and Colonies](Exploration-and-Colonies): the charted start, who can explore in 1444, unowned land.
- [Research](Research): start inventions per country.
- [Historical Events](Historical-Events): catalogue event keys linked to event-tree ids (260 of 1,175) and geography anchors.
- [Time and Turns](Time-and-Turns): start date, seed and campaign rules including the end date.
- [Saving](Saving): save header with player nation and full-game flag; campaign id.
- [Screens and Navigation](Screens-and-Navigation): realm picker data, locks, presets, quick start.
- [National Strengths](National-Strengths): which records show their strengths at a glance.
- [Rebellions](Rebellions): provinces in revolt at start.
- [Warfare](Warfare): castles and commanders at start.
- [Tutorial and Help](Tutorial-and-Help): the Ottomans in 1444 for the tutorial.

## Numbers

| Value | Config key | Design value | Provisional? |
|---|---|---|---|
| Default start form | `default` (`start-forms.yaml`) | chiefdom | No |
| Kingdom forms by region | `kingdom_by_region` | see table above | No |
| Forms by entity type | `entity_type` | 52 entries | No |
| Text rules | `text_rules` | 12 | No |
| Hand-set overrides | `overrides` | 75 | No |
| Starting traders by trade access | trade config | 6 / 4 / 2 / 1 / 0 | Yes |
| Trader warm-up | trade config | 24 months | Yes |
| Starting routes | trade config | Venice, Genoa, Lübeck, Florence, Mali and Timbuktu, Kilwa, Calicut and Gujarat, Malacca, Ryukyu | Yes |
| Charted start | exploration config | 6 steps | Yes |
| Settlement regions | `settlement[]` (`tools/mapgen/config.json`) | Low Countries 30/6 … Africa 3/2 | Yes (rough) |
| Outside any region | `defaultDensity`, `defaultWealth` | 0.8, 1 | Yes |
| Nation colours | `palette` | 32 | No |
| Starting gold | `economy.startingTreasury` | 50 | Yes |
| Levies | `levies.menPerThousandPeople` | 4 | Yes |
| Horse in starting armies | `march.startingHorseShare` | 0.2 | Yes |
| Men per starting commander, most commanders | `starting_armies` (realm.json) | 8,000; 8 | Yes |
| Low-confidence range | `scenario-setup.json` | ±20 % | Yes |
| Free realms | store config | the Ottomans, France | No |

## How the start is settled

- **The date.** Every campaign, and the tutorial, starts on 11 November 1444. Mehmed II rules the Ottomans, and the union of Poland and Hungary has ended.
- **Provinces.** People, wealth and castles come from the map. A province's people are counted in thousands, so Aube (Troyes) has 305 thousand.
- **Strengths and reach.** Each realm carries its record's assessments and heritage, shown on its card's Heritage tab ([National Strengths](National-Strengths)), and its administrative capacity as a rank from 1 to 5 (0 without a record), which subjects will read for how far its rule reaches.
- **Treasury and armies.** Each realm's starting gold, debt and recruits come from its assessment; the flat 50 gold and levies apply only to a realm without one.
- **Relations.** Alliances, rivalries and wars at the start come from the relations list.
- **Events.** "Historical" events follow history closely; "free" events allow plausible changes.
- **Commanders.** Commander numbers come from the map's nation data, so Dunois has Cunning 3.
- **Minor countries.** Small countries start with no great houses.
- **Warm-up.** The trade warm-up before the first turn uses the campaign's seed, changes only trade, and does not move the date.

## Still open

Nothing about the start is left open. The assessment factors and the ±20 % range are first values that balancing may change.

## For developers

- Spec: [`domain/scenario-setup/spec.md`](https://github.com/grrts/pocket-hedgemony/blob/claude/domain-specs-bdd-ebdpmx/domain/scenario-setup/spec.md), requirement code **SETUP**.
- Features: `domain/scenario-setup/features/` (catalogue, start-forms, country-start, province-start, map-setup, catalogue-to-map, new-campaign).
- Code and data: the 1444 map setup is built by `tools/mapgen/owners.ts` from `tools/mapgen/nations-1444.json`, `owners-1444.json` and `config.json`; start values the engine uses today are in `packages/rules/data/defines.json`; start forms come from `government/tools/assign_start_forms.py` and `government/config/start-forms.yaml` in the designs. Rules code for this context goes in `packages/engine/src/domain/scenario-setup/`.
