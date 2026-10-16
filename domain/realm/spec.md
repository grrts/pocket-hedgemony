# Realm (REALM)

## 1. Purpose and scope

The realm is the country as a whole: its card, its treasury, its food network of castles, its people and land, its
named lords, the summary of its army and navy, its ruler and ruling family, its standing abroad, its starting counts,
how events and the AI read its stats, and how a campaign is won.

**In scope**
- The country card (country stats §1).
- Treasury: gold, debt, the tax rate default (§2).
- Food: province food stats, castle food stats, the Food policy screen, the year of food, famine consequences (§3).
- People and land as country stats: people, provinces, royal provinces, officials, faith, tongue, in revolt (§4).
- Named lords: card, lords versus officials, how lords are gained and lost, loyalty (§5).
- Army and navy summary stats (§6).
- Ruler and family, women in roles (16 Oct decision), inheritance law (§8).
- Abroad stats (§9).
- Rules for starting values (§10; the data belongs to scenario-setup).
- How events and the AI use these stats (§11).
- Win scores and how a campaign is won (§12; gap-lists decision 1).

**Not in scope (owned by …)**
- Schools, students, scholars, research and the invention tree (§7): **research**.
- Per-province tiles, people, tax, officials' types, grievances: **province**.
- Battles, sieges, army food reserves, commanders' styles: **warfare**; levies and training: **recruiting**.
- Diplomatic actions, envoy missions, marriages as actions: **diplomacy**; subject kinds and loyalty: **subjects**.
- Government forms and the officials and lords caps: **government**.
- Traders and trade income (replaces *Merchants*): **trade**.
- Faith and tongue drift: **religion**, **culture**.
- Risings: **rebellions**; regime changes: **revolutions**.
- End date as a setting and turn order: **time-and-turns**; end-of-campaign screens: **game-shell**.
- Starting data per country: **scenario-setup**.

## 2. Sources

Newest decision first.
1. `planning/gap-lists.md` "Decisions already made" and List 1 A.1 (16 Oct 2026): campaign to 31 August 1939 as one
   setting; how a campaign is won (world domination or leading economy, power or technology); one month per turn;
   multiplayer-friendly; women can be rulers, lords and commanders following history and more likely in later ages;
   inheritance law "still open".
2. `trade/trade-design.md` v2 §6.2, §14; `diplomacy/diplomacy-design.md` §18; `warfare/warfare-design.md` §18;
   `government/government-design.md` v2 §2 and "Changes needed elsewhere"; `religion/religion-design.md` §18;
   `culture/culture-design.md` "Changes for other files"; `subjects/subjects-design.md` §12; `recruiting/recruiting-design.md`
   changes; `buildings/buildings-design.md` §18.
3. `country-stats/country-stats-design.md` version 3, all sections except §7 (§8.1 is the 16 Oct decision on women).

## 3. Ubiquitous language

| Term | Meaning | Not to be confused with |
|---|---|---|
| Country card | The one-screen summary of a country's counts | Province card |
| Gold | Coins in the treasury | Wealth (a lord's own gold) |
| Debt | Gold owed, and to whom | Trade debt (dropped by trade v2) |
| Harvest | A province's crop for the year: bumper, good, normal, poor, failed | Harvest step (research) |
| Local store | Food kept in a province, in months of food for its people | Castle store |
| Castle store | Food held inside a castle | Local store |
| Granary size | How much a castle can hold | |
| Reach | How many rings of provinces around a castle it can feed | Colonial range |
| Ring | The provinces at one step of distance around a castle | |
| Food policy | Realm-wide food rules with per-castle overrides | Tax screen |
| Collection | Share of each province's surplus sent to the nearest castle | Tax |
| Spread pattern | How a castle hands out food by ring, in percent | |
| Siege reserve | Months of food a castle keeps and never spreads | Army food reserve (warfare) |
| Royal province | A province held directly, without a lord | Lord's province |
| Official | A person who runs one royal province; also the source of envoys | Lord |
| Lord | A named holder of land with his own retinue, wealth, traits, want, loyalty and heir | Courtier; subject ruler |
| Retinue | A lord's own soldiers raised from his lands | Levy |
| Loyalty | Loyal, Wavering, Disloyal, In revolt | Opinion (diplomacy) |
| Want | One concrete goal a lord has | |
| Ruler | The head of the country, with age, years on throne, heirs, traits, marriages | |
| Regent | A lord (or queen mother) ruling for a child ruler | |
| Inheritance law | The rule for who takes the throne and how a lord's land passes | Government form |
| Fallen | Your soldiers killed in the last 10 years | |
| Oaths broken | Broken truces, abandoned allies and debt defaults in the last 30 years | |
| Lands taken | Provinces seized in the last 20 years | |
| Envoy | An official sent abroad on one mission | Merchant/trader |
| Score | Economy, Power or Technology | |
| World domination | Holding a set share of the world's settled provinces with subjects and allies-by-marriage | Score victory |

## 4. Domain model

### Aggregates

**Country** (identity: catalogue country id)
Holds: gold, debt (amounts and lenders), tax default, food policy (realm values and per-castle overrides), provinces
(by reference), royal provinces, officials (by reference), lords (by reference), soldiers, recruits, horses, ships,
castles, commanders, Fallen (dated), ruler, heirs, marriages, inheritance law, allies, enemies, rivals, subjects,
oaths broken (dated), lands taken (dated), envoys, merchants (superseded), scores and ranks.
- INV-REALM-1: country totals of people, recruits, food, horses, ships, castles, faith, tongue, in revolt, schools and officials are sums over provinces (province §13), never stored separately.
- INV-REALM-2: a royal province without an official pays half taxes and gives half recruits.
- INV-REALM-3: each realm-wide food setting has a default; a castle override replaces it for that castle only.
- INV-REALM-4: custom castle shares sum to 100 %.
- INV-REALM-5: Fallen counts only the last 10 years, Oaths broken the last 30, Lands taken the last 20.
- INV-REALM-6: a known invention is never lost.

**Lord** (identity: named character)
Holds: lands (≥1 province), retinue, wealth, two traits, one want, loyalty, heir, house, label (noble, merchant house, bishop or abbot, clan chief, elder or lineage head), his own officials.
- INV-REALM-7: a lord always holds at least one province (province §10.3).
- INV-REALM-8: loyalty is one of Loyal, Wavering, Disloyal, In revolt.

**Ruler and dynasty** (identity: country + ruling house)
Holds: ruler (age, years on throne, traits, sex), heirs in line, marriages, inheritance law.
- INV-REALM-9: inheritance law is set by culture and history; the player cannot choose it.

**Castle food node** (entity of a castle building; identity: province)
Holds: castle store, granary size, reach, overrides of food policy.

### Entities and value objects
- **Food policy** (value): collection, castle shares, spread pattern, siege reserve, army refill, famine rule, surplus, lords' castles.
- **Loan** (entity): lender, amount, yearly interest.
- **Marriage** (value): two houses, living or ended.
- **Women-in-roles table** (value): chance per country or culture per role, age multipliers.
- **Score** (value): economy, power, technology values and ranks.

### Domain services
- **Food year runner**: harvest, collection, castle shares, spread, eating and rot.
- **Loyalty evaluator**: applies loyalty causes each turn.
- **Succession resolver**: picks the new ruler by inheritance law; succession war if no heir.
- **Character generator**: generates rulers, lords, commanders, officials, scholars with the women-in-roles chances.
- **Score keeper**: computes the three scores, ranks, world domination share and victory.
- **Event mapper**: event-tree country stats ↔ realm stats (§11).

## 5. Requirements

### 5.1 Principles
- REALM-001: The realm shall express every stat as something countable (coins, sacks, soldiers, ships, castles, named lords, scholars), each with how it is gained and how it is lost; nothing is taken from EU4 and all numbers are config placeholders. [country-stats intro]

### 5.2 Country card
- REALM-005: The country card shall show the ruler (title, name, age, years on throne, heirs), Gold, Food (castles feeding how many of the provinces, hungry count), People, Soldiers (plus recruits), Horses, Ships (war / trade), Castles, Officials (for how many royal provinces), Lords (named, by loyalty), Schools (students, scholars, current study and progress), Faith, Tongue, In revolt, Allies, Enemies, Oaths broken and Fallen (10 years). [§1]

### 5.3 Treasury
- REALM-010: Gold shall be gained by taxes from royal provinces, a share of lords' taxes, trade, tribute from subjects, selling grain, loot and ransoms, and selling titles; and lost by soldiers' pay, officials' wages, school upkeep, building, debt interest, gifts and bribes, and buying grain. [§2]
- REALM-011: Debt shall record gold owed and to whom (a bank, a merchant city, a lord, another ruler); gained by taking a loan or lords lending in exchange for favours; lost by repaying, the lender dying or being conquered, or default. [§2]
- REALM-012: Debt shall cost yearly interest. [§2]
- REALM-013: When the country defaults, its debt shall be wiped and it shall count an oath broken. [§2, §9]
- REALM-014: While a lord is owed money by the country, he shall be more demanding. [§2]
- REALM-015: The tax rate shall be set per province with a realm default (province §8); a revolt can force it down; heavy taxes fill the treasury but make lords waver and provinces revolt. [§2] (scale: OQ-REALM-8)

### 5.4 Food: province food stats
- REALM-020: Food shall live in provinces: each province grows, stores and eats its own, and castles are the hubs that collect and spread it. [§3]
- REALM-021: Each province shall have a harvest (bumper, good, normal, poor, failed) gained by farmland, people working it, inventions and peace, and worsened by weather rolls, armies marching through, devastation (burned tiles), plague killing farmers and cold periods (the event tree's climate stats); it is the province's main food income each autumn. [§3.1]
- REALM-022: Each province shall have a local store in months of food, filled by what is left after collection and by castle deliveries, and emptied by people eating, armies refilling their reserve, yearly rot and raids. [§3.1]
- REALM-023: If a province's local store hits zero, then the province shall starve. [§3.1]
- REALM-024: Pastoral provinces shall have herds in thousands of head, grown on good pasture, by raiding and tribute, and lost to drought, hard winters, raids, disease and slaughter in famine; pastoral peoples eat from herds; herds move with their owners and cannot be besieged. [§3.1]
- REALM-025: Coastal provinces shall have a steady fish catch from fishing boats, improved by salting inventions and lost to blockade and war at sea. [§3.1]
- REALM-026: Each market shall have a grain price per sack, rising with bad harvests across the region, war and blockades, and falling with good harvests and trade routes; grain can be bought and sold for gold. [§3.1] (OQ-REALM-1)

### 5.5 Food: castles
- REALM-030: Each castle shall have a castle store, filled by collection from nearby provinces, deliveries from other castles and buying, and emptied by feeding its garrison, spreading to the land around it, handing out to armies refilling at home, rot and capture. [§3.2]
- REALM-031: Each castle shall have a granary size, raised by building granaries (gold) and inventions like *Ever-normal granaries*, and lowered by siege damage and neglect; bigger granaries hold more and rot less. [§3.2]
- REALM-032: Each castle shall have a reach in rings of provinces, raised by roads, rivers, canals, wagons (horses) and research, and cut by enemy armies on the roads, winter and devastation. [§3.2]
- REALM-033: A province outside every castle's reach shall depend on its own harvest. [§3.2, §3.5]

### 5.6 Food policy screen
- REALM-040: The realm shall have one Food policy with a realm-wide default for every setting, and any castle may be given its own value. [§3.3]
- REALM-041: Collection shall be the share of each province's surplus sent to the nearest castle (0 %, 25 %, 50 %, 75 %); the rest stays in the local store. [§3.3]
- REALM-042: Castle shares shall divide collected food between castles: by people, frontier first, capital first, equal, or custom (a slider per castle summing to 100 %). [§3.3]
- REALM-043: The spread pattern shall set percentages by ring: default 50/30/20 (own province / next ring / ring beyond), presets Tight 80/20/0 and Wide 30/35/35. [§3.3]
- REALM-044: The siege reserve shall be months of food each castle keeps and never spreads: 0, 3, 6 or 12. [§3.3]
- REALM-045: Army refill shall decide how armies refill their own food reserve at home: locals only (default, from the province's local store), castles hand out first, or no refill in lords' lands. [§3.3] (OQ-REALM-3)
- REALM-046: The famine rule shall be off, 1 month or 3 months; when a province drops below it, its castle releases food to it first, ignoring the spread pattern. [§3.3]
- REALM-047: Surplus above granary size shall be kept (it rots), sold on the market, sent to the capital castle, or sent to subjects or allies. [§3.3]
- REALM-048: Lords' castles shall follow the policy by loyalty: loyal lords follow it, wavering lords follow half of it, disloyal lords keep their food. [§3.3]
- REALM-049: Presets shall fill the whole screen at once: Feed the people (25 %, by people, Wide, 3 months, castles hand out first); Fortress realm (50 %, frontier first, Tight, 12 months, locals only); War footing (75 %, frontier first, 50/30/20, 6 months, castles hand out first); Merchant (50 %, capital first, 50/30/20, 3 months, no refill in lords' lands, surplus sold). [§3.3]

### 5.7 The year of food
- REALM-050: Each autumn every province shall roll its harvest, with weather rolled by region so neighbours suffer together and grain prices rise for all of them. [§3.4]
- REALM-051: After the harvest, the collection share of each province's surplus shall go to its nearest castle in reach. [§3.4]
- REALM-052: Castles shall then exchange food until each holds its share; food moving between castles loses some of the load for every province it travels. [§3.4]
- REALM-053: Each castle shall then keep its siege reserve and hand out the rest to the rings around it by the spread pattern. [§3.4]
- REALM-054: Through the year people shall eat; soldiers on campaign eat double and a horse eats like three men; stores rot a little each season, less with granaries. [§3.4]
- REALM-055: While a castle is besieged, it shall stop spreading and live on its own store. [§3.5]
- REALM-056: If an enemy army sits between a castle and its outer ring, then food shall not spread past it. [§3.5]
- REALM-057: Rice lands shall get two harvests on irrigated land that depend on canals war can wreck; maize, potatoes and cassava arrive through the research tree after Atlantic contact. [§3.5]
- REALM-058: When a province runs out of food, people shall die, survivors flee to neighbouring provinces or abroad, revolts become likely, and the lord of that land turns disloyal; the event tree's famine events read the same stores. [§3.5]
- REALM-059: The player shall be able to burn their own fields ahead of an invader (scorched earth). [§3.5, province §2.2]

### 5.8 People and land
- REALM-060: People shall be population in thousands summed over provinces, gained by growth when fed and at peace, migrants fleeing famine or war elsewhere, and conquest; lost to famine, plague, war deaths, refugees leaving and forced migration events. [§4]
- REALM-061: Provinces held shall be gained by conquest, inheritance, purchase, a lord joining with his land and colonies, and lost by losing wars, a lord defecting, revolts breaking away and ceding in peace; each needs an official or a lord to pay properly. [§4]
- REALM-062: Royal provinces shall be gained when a lord's line dies out, by seizing a lord's land, and by conquest kept for yourself, and lost by granting land to make a new lord; they give full taxes and recruits but each needs an official. [§4]
- REALM-063: Officials shall be gained by hiring (gold up front, wages yearly) and school graduates, with inventions raising how many provinces one official can run, and lost by dismissal, unpaid wages and war in their province. [§4] (OQ-REALM-14)
- REALM-064: If a royal province has no official, then it shall pay half taxes and give half recruits. [§4]
- REALM-065: Faith shall be the % of people sharing the ruler's religion, gained by missionaries and clergy, schools of your faith, migrants of your faith and conversion events, and lost by conquering other faiths, reformations and foreign missionaries; a low share means religious revolts and wavering clergy lords. [§4]
- REALM-066: Tongue shall be the % of people sharing the ruler's culture, gained by slow assimilation, settlers and schools, and lost by conquest, migration and separatist movements; a low share means separatist revolts and slower officials. [§4]
- REALM-067: In revolt shall count provinces with rebels or riots, raised by heavy taxes, famine, foreign faith or tongue, disloyal lords stirring and lost wars, and lowered by defeating rebels, giving in, lowering taxes and food; it loses taxes and recruits and spreads to neighbours. [§4]

### 5.9 Lords
- REALM-070: Each lord shall have a card with lands (at least one province, run by his own officials), retinue, wealth, two traits, one want, loyalty and heir. [§5.1]
- REALM-071: The lord card shall be the same for every society; only the label changes: nobles, merchant houses in city republics, bishops and abbots in theocracies, clan chiefs on the steppe, elders and lineage heads in chiefdoms and stateless societies. [§5.1]
- REALM-072: A lord shall cost no gold, keep half the taxes of his provinces, keep their recruits as his retinue, obey by his loyalty, and be removable only by force, a trial or his line dying out. [§5.2]
- REALM-073: A loyal lord shall bring his retinue when called. [§5.1]
- REALM-074: A lord's wealth shall let him lend to the ruler or fund a revolt. [§5.1]
- REALM-075: When the ruler grants a fief of one or more royal provinces to a commander, relative, favourite or loyal official, the realm shall create a new loyal lord whose provinces no longer need an official. [§5.3]
- REALM-076: When the ruler keeps a defeated local ruler after a conquest, he shall become a lord who starts disloyal, with no officials needed and the people calm. [§5.3]
- REALM-077: When the ruler sells a title, a rich merchant shall buy a province as a fief: gold now and a weak but loyal lord. [§5.3]
- REALM-078: A marriage shall be able to bring a foreign or local house in as a lord with its land. [§5.3]
- REALM-079: When a lord dies with several sons, his lands shall pass by the realm's inheritance law, possibly split between them. [§5.3, §8.2]
- REALM-080: A disloyal lord across the border shall be able to defect to you with his land. [§5.3]
- REALM-081: At the start, major countries shall have their historical great houses from the catalogue, and smaller countries a few generated lords sized to their realm. [§5.3, §10]
- REALM-082: When a lord's line dies out, his land shall return as royal provinces needing officials. [§5.4]
- REALM-083: When the ruler seizes a lord's land by decree, other lords shall waver and he may rebel. [§5.4]
- REALM-084: When a disloyal lord is tried and executed, all lords of his house shall become disloyal. [§5.4]
- REALM-085: When a lord's revolt is defeated, his land shall return to the ruler or to a loyal claimant the ruler picks. [§5.4]
- REALM-086: A disloyal lord shall be able to defect to a neighbour with his provinces, or rebel. [§5.2, §5.4]
- REALM-087: When two lords' houses join by marriage, they shall merge into one bigger lord. [§5.4]
- REALM-088: Loyalty shall rise with granting his want, gifts of gold, offices at court, marriages into the ruling house, victories he took part in, a long secure reign with a clear heir, feeding his lands in famine, and sharing your faith and tongue. [§5.5]
- REALM-089: Loyalty shall fall with heavy or crushing taxes, seizing land from him or another lord, lost wars and battles, a child ruler, a disputed heir or a new ruler, requisitioning his grain, and a foreign rival's bribes and promises. [§5.5]

### 5.10 Army and navy summary
- REALM-090: Soldiers (foot, horse and later guns) shall be gained by raising recruits (gold), hiring paid companies, and lords bringing retinues; lost by battle deaths, disease and hunger on campaign, desertion when unpaid or unfed, and disbanding; they cost gold every month and eat grain. [§6]
- REALM-091: Recruits shall refill each year from people in royal provinces and from students leaving school, and be used up by raising soldiers, sending young men to school, famine and plague; the army and schools share them. [§6]
- REALM-092: Horses shall be gained by breeding on grassland, buying from steppe and Arabian traders, herds and capture, and lost in battle, to fodder shortages and disease; they cap how many horsemen you field, and wagons move grain. [§6]
- REALM-093: Ships (war and trade) shall be gained by building in ports (timber provinces help), capture and hiring, and lost in battle, storms, rot without upkeep and blockade; warships fight and blockade, trade ships earn gold and fish and carry armies. [§6]
- REALM-094: Castles shall be gained by building and conquest, and lost in sieges, by neglect without upkeep, or demolished in a peace. [§6]
- REALM-095: Commanders shall be named generals with Might, Cunning and Logistics, gained by hiring, a lord or heir taking command and promotion after victory, and lost by death in battle, old age and capture. [§6]
- REALM-096: Fallen shall count your soldiers killed in battles and sieges in the last 10 years; many dead push people and lords toward peace and slow recruit refills. [§6]

### 5.11 Ruler and family
- REALM-100: The ruler's age shall rise each year; old rulers die; a child ruler needs a regent (a lord rules for them). [§8]
- REALM-101: Years on throne shall rise each year and reset on death, deposition or abdication; new rulers start with more wavering lords. [§8]
- REALM-102: Heirs shall be gained by births, marriages and adopting or naming an heir, and lost by death, marrying daughters abroad and heirs going over to a rebel lord. [§8]
- REALM-103: If the ruler dies with no heir, then the realm shall fall into a succession war among the lords. [§8]
- REALM-104: The ruler shall have two traits (e.g. Pious, Warlike, Builder, Greedy), given at birth and sometimes gained or rarely changed by events, giving small bonuses and leaning event options. [§8]
- REALM-105: Marriages shall be living ties to other ruling houses and your own lords, arranged with an heir or a princess, ended by death, divorce events and war between the houses, and give goodwill, loyalty and a path to inheriting another realm. [§8]
- REALM-106: Women shall be able to hold every role (ruler, lord, commander, official, scholar), with a chance per country (or culture) per role taken from the catalogue's history and succession customs. [§8.1, gap-lists A.5]
- REALM-107: Where the crown passes only through men (e.g. France), no woman shall inherit the throne, though a duke's daughter can inherit his duchy; where a daughter could inherit (e.g. Castile, Navarre), a queen regnant is possible. [§8.1]
- REALM-108: Wherever a ruler is a child, a queen mother shall be able to be regent. [§8.1]
- REALM-109: The chance of women in roles shall be multiplied as the event tree's ages arrive: a little in the Age of Revolutions, more in the Age of Industrialization, more again in the Age of World Wars (and close to even in the Age of Decolonization, which is out of scope); events and reforms can raise one country's chance earlier. [§8.1, gap-lists] (OQ-REALM-7)
- REALM-110: Women who held roles in 1444 or appear in events shall be placed as they were; chances apply only to characters the game generates. [§8.1]
- REALM-111: The women-in-roles chances shall be config: `women_in_roles` per country or culture per role, and `age_multipliers` per age. [§8.1]
- REALM-112: Inheritance law shall be fixed by each country's culture and history from the catalogue; the player cannot choose it; events and reforms can change it. [§8.2] (OQ-REALM-4, OQ-REALM-5)
- REALM-113: Inheritance law shall decide who takes the throne (eldest son, eldest child, a brother or the eldest of the house, the strongest claimant among the lords, or an election by lords or a council) and whether a lord's land passes to one heir or is split among the sons. [§8.2]

### 5.12 Abroad
- REALM-120: Allies shall be gained by an envoy's alliance mission, marriages and peace terms, and lost by breaking the alliance, war between you and a rival bribing them away; they are called into your wars. [§9]
- REALM-121: Enemies shall be countries at war with you, gained by declaring war or being attacked and lost by making peace. [§9]
- REALM-122: Rivals shall be countries competing with you for a named thing (a throne, a province, a trade city), gained by a contested claim or border dispute and lost when it is settled or one side is destroyed; the AI targets them and wars against them please your lords. [§9]
- REALM-123: Subjects (vassals and tributaries) shall be gained by forcing it in a peace or a weak neighbour asking for protection, and lost by their independence war, release or annexation; they give tribute in gold or grain, and troops. [§9] (OQ-REALM-9)
- REALM-124: Oaths broken shall count broken truces, abandoned allies and debt defaults in the last 30 years; others refuse alliances and loans. [§9]
- REALM-125: Lands taken shall count provinces seized in the last 20 years, lowered by giving land back; when high, neighbours band together against you. [§9]
- REALM-126: Envoys shall be officials sent abroad, one mission each (alliance, marriage, peace, gift); while abroad an envoy runs no province, so his province pays half until he returns; envoys are lost when the mission ends or they are killed or held abroad. [§9] (OQ-REALM-2)
- REALM-127: Merchants (trading agents placed in trade cities, hired for gold or provided by merchant lords, thrown out by a city's owner or war) are replaced by trade v2's traders and trade ships. [§9, trade §14] (OQ-REALM-1)

### 5.13 Starting values (rules)
- REALM-130: The catalogue's qualitative assessments shall set starting counts: economic strength and fiscal resilience → gold and debt; manpower potential → recruits; military capability → soldiers, commanders, horses; naval capability → ships; administrative capacity → officials and how many provinces start royal; political stability and unrest risk → lords' starting loyalty and provinces in revolt; territorial cohesion → number of lords, their land, tongue; institutional development → schools, scholars, starting inventions; trade access → merchants and grain price access; diplomatic influence → extra officials at court ready as envoys. [§10]
- REALM-131: A `low` confidence in the catalogue shall give a wider random range, so each campaign starts a little differently. [§10]
- REALM-132: Allies, rivals, subjects and enemies shall come from `country-relations/data/relations-1444.json`; lords for major countries from the catalogue's history text. [§10]

### 5.14 Events and AI
- REALM-140: When an event reads or changes an event-tree country stat, the realm shall use the mapped stats: legitimacy → loyal lords, heirs, years on throne; stability → loyal lords and provinces in revolt; war_weariness → Fallen; prestige → battles won and lands taken; admin_capacity → officials; tech_* and innovation → inventions; literacy → scholars and schools per thousand people; food_security → local store, castle store, harvest, herds; debt and treasury → debt and gold; navy_strength and naval_reach → warships; army_strength and manpower → soldiers and recruits. [§11]
- REALM-141: The AI shall read the same counts as the player. [§11]
- REALM-142: An opportunist AI shall attack when a neighbour's lords waver or its soldiers drop; an isolationist AI shall fill its schools and avoid war; a hegemon seeker shall keep recruits for the army. [§11]

### 5.15 Win scores
- REALM-150: A campaign shall be won by world domination or by leading one of three scores (Economy, Power, Technology), each built only from realm stats. [§12, gap-lists A.1]
- REALM-151: Economy shall be yearly income (taxes, lords' share, trade, tribute) plus the bank (gold minus debt). [§12]
- REALM-152: Power shall be provinces held (subjects count half) plus army power (soldiers weighted by kind, warships, commanders). [§12] (OQ-REALM-6)
- REALM-153: Technology shall be inventions known, each weighted by its era cost in the research tree; nothing removes a known invention. [§12]
- REALM-154: When you, your subjects and your allies-by-marriage hold a set share (placeholder 60 %) of the world's settled provinces, the realm shall win by world domination. [§12]
- REALM-155: When a country leads a score by a set margin (placeholder 50 % ahead of second) for a set number of years (placeholder 25), or leads it when the campaign's end date (default 31 August 1939) arrives, it shall win by that score. [§12, gap-lists]
- REALM-156: The country card shall show the country's rank in each score. [§12]

## 6. Commands

| Command | Who issues it | Preconditions | Result | Events emitted |
|---|---|---|---|---|
| SetFoodPolicy(setting, value) | player / AI | Value from the allowed list | Realm default changed | FoodPolicyChanged |
| OverrideCastlePolicy(castle, setting, value) | player / AI | Own castle | Castle override | FoodPolicyChanged |
| ApplyFoodPreset(preset) | player / AI | — | All settings filled | FoodPolicyChanged |
| TakeLoan(lender, amount) | player / AI | Lender willing (oaths broken lowers it) | Gold up, debt up | LoanTaken |
| RepayDebt(loan, amount) | player / AI | Gold | Debt down | DebtRepaid |
| DefaultOnDebt(loan) | player / AI | Debt | Debt wiped; oath broken | DebtDefaulted, OathBroken |
| HireOfficial(type) / DismissOfficial | player / AI | Gold | Official count changes | OfficialHired / OfficialDismissed |
| GrantFief(provinces, person) | player / AI | Royal provinces; a commander, relative, favourite or official | New loyal lord | LordCreated |
| KeepLocalRuler(province) | player / AI | Just conquered | New disloyal lord | LordCreated |
| SellTitle(province) | player / AI | Royal province; a buyer | Gold; weak loyal lord | LordCreated, GoldChanged |
| SeizeLordLand(lord, provinces) | player / AI | — | Land royal; lords waver | LordLandSeized, LordLoyaltyChanged |
| PutLordOnTrial(lord) | player / AI | Lord disloyal | Lord removed; his house disloyal | LordExecuted |
| GiftToLord(lord, gold / office / marriage) | player / AI | Gold or an office or a marriage candidate | Loyalty up | LordLoyaltyChanged |
| GrantLordWant(lord) | player / AI | Want is grantable | Loyalty up | LordLoyaltyChanged |
| CallRetinue(lord) | player / AI | Lord loyal | Retinue joins | RetinueCalled |
| NameHeir(person) | player / AI | — | Heir set | HeirChanged |
| BurnOwnFields(province) | player / AI | Own province | Province tiles burned | (province) TileBurned |

## 7. Domain events

| Event | When | Payload | Consumed by |
|---|---|---|---|
| HarvestSeasonCompleted | After autumn harvest and collection | per province, per castle | province, events |
| CastleFoodDistributed | Spread done | castle, rings, amounts | province |
| ProvinceStarved | Local store at zero | province | province, rebellions, events |
| FoodPolicyChanged | Command | setting, value, castle | AI, map-presentation |
| LoanTaken / DebtRepaid / DebtDefaulted | Commands | lender, amount | diplomacy (oaths), events |
| OathBroken | Default, broken truce, abandoned ally | kind, date | diplomacy, AI |
| LordCreated / LordRemoved | Fief, keep local ruler, sale, marriage, split / line dies, seizure, trial, defection, merger | lord, provinces | province, government |
| LordLoyaltyChanged | Any loyalty cause | lord, from, to, cause | rebellions, province, AI |
| LordDefected | Disloyal lord leaves | lord, provinces, to | diplomacy, province |
| RulerDied / RulerCrowned | Death; succession | ruler, heir, law | events, diplomacy, rebellions |
| SuccessionWarBegan | No heir | claimants (lords) | warfare, rebellions |
| HeirBorn / HeirLost | Births, marriages, deaths | person | diplomacy |
| ScoresUpdated | Score evaluation | three scores, ranks | game-shell, achievements |
| CampaignWon | Domination or score victory | country, kind | game-shell, achievements, saves |

## 8. Policies (reactions to other contexts)

- When province reports taxes collected, then add the royal share and lords' share to gold.
- When province reports a famine in a lord's land, then turn that lord disloyal.
- When province reports a riot, then the province's lord wavers (province §12.1).
- When province reports a heavy or crushing demand on a lord's province, then that lord wavers.
- When the player pays for a building in a lord's province, then raise his loyalty one step unless in revolt (province §10.3).
- When warfare reports a battle won or lost with a lord's participation, then raise or lower his loyalty.
- When warfare reports soldiers killed, then add them to Fallen.
- When diplomacy reports an alliance, marriage, peace or rival declared, then update allies, marriages, enemies and rivals.
- When diplomacy reports a foreign envoy courting a lord, then lower his loyalty (a rival's bribes).
- When research reports an invention, then add it to the Technology score and apply its realm effects (e.g. officials per province).
- When trade reports deposits, fees and tolls, then add them to gold (trade §6.2).
- When government reports lords over the cap at New Year, then drop one loyalty step per lord over the cap (government §2).
- When subjects report tribute, then add gold, or grain to the nearest castle.
- When events change a mapped stat (§11), then apply it to the concrete stats.

## 9. Monthly turn

Reads first: province sums (people, recruits, stores, tax), war state and battles (warfare), diplomacy results.
Each month: pay soldiers (monthly gold), add income, desertion if unpaid or unfed; apply loyalty causes; check ruler
death and succession; check score victory (OQ-REALM-6 on frequency).
Each season: eating and rot of castle and local stores; famine rule releases.
Each autumn: harvest roll (by region weather), collection, castle shares, spread.
Each year: debt interest; officials' wages; recruits refill; ruler and lords age; years on throne; Fallen, Oaths broken and Lands taken drop entries older than their windows.
Each New Year: lords-over-cap loyalty loss (government).

## 10. Configuration

All numbers are placeholders ("Numbers are placeholders for config"). Key names other than `women_in_roles` and
`age_multipliers` are proposed by this spec (OQ-REALM-15).

| Key | Meaning | Value in the design | Placeholder? | Config file |
|---|---|---|---|---|
| food.collection.options | Collection shares | 0 / 25 / 50 / 75 % | yes | realm config |
| food.castle_shares.options | Castle share rules | by people, frontier first, capital first, equal, custom (sum 100 %) | no | realm config |
| food.spread.default / presets | Spread by ring | 50/30/20; Tight 80/20/0; Wide 30/35/35 | yes | realm config |
| food.siege_reserve.options | Months kept | 0 / 3 / 6 / 12 | yes | realm config |
| food.army_refill.options | Army refill | locals only (default), castles hand out first, no refill in lords' lands | no | realm config |
| food.famine_rule.options | Famine release threshold | off / 1 / 3 months | yes | realm config |
| food.surplus.options | Surplus | keep, sell, send to capital castle, send to subjects or allies | no | realm config |
| food.lords_castles | Following by loyalty | loyal all, wavering half, disloyal none | yes | realm config |
| food.presets | Presets | Feed the people; Fortress realm; War footing; Merchant (see REALM-049) | yes | realm config |
| food.campaign_eat | Soldiers on campaign eat | ×2 | yes | realm config |
| food.horse_eats | A horse eats like | 3 men | yes | realm config |
| food.transfer_loss_per_province | Loss moving food between castles | not given | yes | realm config |
| food.rot_per_season | Store rot | not given ("a little") | yes | realm config |
| tax.rates | Tax steps | light / normal / heavy / crushing (province: plus none) | yes | realm config |
| officials.no_official_share | Royal province without official | half tax, half recruits | yes | realm config |
| lords.tax_share | Lord keeps | half | yes | realm config |
| fallen.window_years | Fallen window | 10 | yes | realm config |
| oaths.window_years | Oaths broken window | 30 | yes | realm config |
| lands_taken.window_years | Lands taken window | 20 | yes | realm config |
| women_in_roles | Chance per country or culture per role (ruler, lord, commander, official, scholar) | not given | yes | realm config |
| age_multipliers | Factor per event-tree age | not given | yes | realm config |
| win.domination_share | World domination share of settled provinces | 60 % | yes | realm config |
| win.score_margin | Lead over second place | 50 % | yes | realm config |
| win.score_years | Years leading | 25 | yes | realm config |
| win.subject_province_weight | Subjects' provinces in Power | ½ | yes | realm config |
| campaign.end_date | End date (one setting) | 31 August 1939 | no (decided) | time-and-turns / settings |

## 11. Seams

| Other context | Direction | Pattern | What crosses |
|---|---|---|---|
| province | upstream | Customer–Supplier | Province sums (§13), tax reaching you, local stores, harvests, grievance-driven lord wavering; realm sends food policy, castle deliveries, fief grants |
| research | downstream | Customer–Supplier | Gold for schools, the recruit pool for students; research sends inventions known for the Technology score and officials-per-province effects |
| buildings | upstream | Customer–Supplier | Castles, granaries, building costs and upkeep in gold |
| warfare | downstream | Partnership | Soldiers, horses, commanders, Fallen, army food refill, castles in sieges, victories; warfare asks for arms store, powder store, prisoners, troop cap, peace voices |
| recruiting | downstream | Customer–Supplier | Recruits and gold for levies; commanders from commissioned officials |
| diplomacy | downstream | Customer–Supplier | Allies, enemies, rivals, oaths broken, lands taken, envoys (officials), marriages, ruler traits, soldiers counted for strength |
| subjects | downstream | Customer–Supplier | Subjects and tribute; loyalty steps mirrored from lords; folding a subject in makes its ruler a lord |
| government | upstream | Customer–Supplier | Officials and lords caps, *Great lord* loyalty reason, succession by form, `admin_capacity` → officials cap |
| trade | upstream | Customer–Supplier | Trade income (deposits, fees, tolls); traders and trade ships replace merchants |
| religion | upstream | Customer–Supplier | Faith %, faith steps in lord loyalty, preachers abroad |
| culture | upstream | Customer–Supplier | Tongue %, cousins counted half, kin lords' loyalty |
| rebellions | downstream | Customer–Supplier | Disloyal lords, lords' retinues and wealth for risings, in revolt counts |
| revolutions | upstream | Conformist | Regimes set forms; émigré pretenders |
| events | upstream | Anti-Corruption Layer | Event-tree country stats mapped by §11; ages driving women-in-roles multipliers |
| scenario-setup | upstream | Customer–Supplier | Starting counts from catalogue assessments and the relations file |
| national-strengths | upstream | Conformist | Levers such as `lord_loyalty_shield` |
| naval | downstream | Customer–Supplier | Ships counts (war and trade) |
| time-and-turns | upstream | Conformist | Monthly turn, seasons, end date for score judging |
| game-shell | downstream | Published Language | Scores, ranks and the campaign result for end-of-campaign screens |
| map-presentation | downstream | Published Language | Country card fields |

## 12. AI

- AI countries read the same counts as the player and do not cheat on food (country stats §11; warfare §15 cited for food).
- Opportunist: attacks when a neighbour's lords waver or its soldiers drop. Isolationist: fills its schools and avoids war. Hegemon seeker: keeps recruits for the army (§11).
- Rivals are targeted by the AI (§9).
- AI lords choose by traits and wants (§5.1); a disloyal lord can rebel or defect (§5.2).
- Food policy presets give the AI ready settings (no AI choice rule is stated: OQ-REALM-16).

## 13. Open questions and contradictions

- **OQ-REALM-1:** Trade v2 (§14) asks country stats to: add "🐫 Traders" to the card; change Gold's "trade from merchants" to "deposits from traders, market fees and tolls"; replace *Merchants* with *Traders* and *Trade ships*; map `trade_access` to starting traders. Not adopted. Trade v2 also drops the rule that a city buys grain through trade, while §3.1 *Grain price* and the Food policy *Surplus: sell on the market* still buy and sell grain on "the nearest market" — which market and price mechanism remains?
- **OQ-REALM-2:** Diplomacy §18 asks: rename *Envoys* to **Envoy seats**; add "📯 Envoys n of m abroad" and "⛓ Leagues against you" to the card; add **Pretenders at court**; read `opinion`, `trust`, `notoriety` per diplomacy §11. Not adopted.
- **OQ-REALM-3:** Warfare §18 asks: link soldiers' four kinds; commanders from warfare §4; add **Arms store**, **Powder store**, **Prisoners**, **Victories / Defeats**, **Troop cap**; show **Peace voices** on the Enemies line; map `war_weariness` to Fallen and peace voices and `prestige` to Victories. Not adopted. Army refill: warfare says armies at home take what they need from their castle first, then the locals; country stats keeps "Locals only" as default.
- **OQ-REALM-4:** Government asks for succession by government form (country stats 8) and a *Great lord* loyalty reason (lords with 4–7 provinces one reason, 8+ two); §8.2 says succession is fixed by culture and history. Not adopted. Government also maps `admin_capacity` to the officials cap, while §11 maps it to Officials.
- **OQ-REALM-5:** Gap-lists still lists "Country stats 12: inheritance law" as open (being explained in the planning round); §8.2 now defines it. Is §8.2 the decision?
- **OQ-REALM-6:** Win scores: how "soldiers weighted by kind" and commanders are weighted; what "allies-by-marriage" and "settled provinces" are; whether leading at the end date needs the margin; ties and several winners; how often scores are judged; whether the campaign ends or continues on a win. Gap-lists said these were "still to design"; §12 answers part.
- **OQ-REALM-7:** Women in roles: base chances and age multipliers are not given; the Age of Decolonization (where chances become close to even) is out of scope (ends 1939); country stats §7.1 says students are "young men taken from recruits" while scholars can be women.
- **OQ-REALM-8:** Tax rate scale: country stats §2 lists light/normal/heavy/crushing; province §8 adds *None* and says it replaces the country rate.
- **OQ-REALM-9:** Other designs' edits not adopted: religion (Faith = "state faith or a faith layered with it", *Preachers* in Abroad, faith loyalty steps); culture (Tongue % counts cousins as half); subjects (Subjects row reads "Vassals, tributaries, unions, marches, colonies and protectorates"); recruiting (commanders by commissioning an official); buildings (building upkeep in Gold's losses and on the treasury card).
- **OQ-REALM-10:** Starting values: the mapping from qualitative assessments to numbers, and the width of the "wider random range" for low confidence, are not given; randomness must be seeded for multiplayer determinism (gap-lists A.4).
- **OQ-REALM-11:** Food year: "each autumn" for the whole world (southern hemisphere, monsoon lands) is not discussed; weather odds per region, transfer loss per province, rot per season and the reach of each road step are not given.
- **OQ-REALM-12:** Fallen, Oaths broken and Lands taken are defined as "in the last N years" but "each year fades the old count" — a hard window or a gradual fade?
- **OQ-REALM-13:** Debt: interest rates, loan sizes, which lenders exist and what "lords lending in exchange for favours" gives are not stated; how "a lord who is owed money gets more demanding" works is not stated.
- **OQ-REALM-14:** Officials per province: country stats §4 and the research tree (G1 1, G9 2, G16 3, B2/G11/T14 +1) let one official run several provinces; province §10.2 says one official runs one province.
- **OQ-REALM-15:** Realm config file and keys are not named except `women_in_roles` and `age_multipliers`.
- **OQ-REALM-16:** No AI rule for food policy, debt, lord handling, fiefs or tax; gap-lists item 18 (the AI as a whole) is open.
- **OQ-REALM-17:** Child ruler regency: §8 says "a lord rules for them", §8.1 says a queen mother can be regent; who is picked is not stated.
- **OQ-REALM-18:** Commanders "with Might, Cunning and Logistics (from the repo)": warfare asks to replace the repo pointer with warfare §4; commander gain/lose lists differ.

## 14. Traceability

Every requirement has at least one scenario. REALM-005 and REALM-156 are also presentation (card layout).

| Requirement | Feature file | Scenario |
|---|---|---|
| REALM-001 | country-card.feature | France in 1444 |
| REALM-005 | country-card.feature | France in 1444 |
| REALM-010 | treasury.feature | Gold comes in |
| REALM-010 | treasury.feature | Gold goes out |
| REALM-011 | treasury.feature | A loan brings gold and yearly interest |
| REALM-011 | treasury.feature | Debt goes away |
| REALM-012 | treasury.feature | A loan brings gold and yearly interest |
| REALM-013 | treasury.feature | Default wipes the debt and breaks an oath |
| REALM-014 | treasury.feature | A lord who is owed money gets more demanding |
| REALM-015 | treasury.feature | Heavy taxes fill the treasury but stir the realm |
| REALM-015 | treasury.feature | A revolt forces the tax down |
| REALM-020 | province-food.feature | Food lives in provinces and castles are the hubs |
| REALM-021 | province-food.feature | What makes a harvest better or worse |
| REALM-022 | province-food.feature | The local store runs out and the province starves |
| REALM-022 | province-food.feature | The local store fills and empties |
| REALM-023 | province-food.feature | The local store runs out and the province starves |
| REALM-024 | province-food.feature | Herds grow and shrink |
| REALM-024 | province-food.feature | Herds cannot be besieged |
| REALM-025 | province-food.feature | Fish |
| REALM-026 | province-food.feature | The grain price follows harvests, war and trade |
| REALM-030 | castle-food.feature | The castle store fills and empties |
| REALM-031 | castle-food.feature | Granary size |
| REALM-032 | castle-food.feature | Reach in rings |
| REALM-033 | castle-food.feature | A province outside every castle's reach lives on its own harvest |
| REALM-040 | food-policy.feature | A castle overrides the realm default |
| REALM-041 | food-policy.feature | Collection sends a share of the surplus to the castle |
| REALM-042 | food-policy.feature | Castle shares divide the collected food |
| REALM-042 | food-policy.feature | Custom shares must sum to 100 % |
| REALM-043 | food-policy.feature | Spread patterns by ring |
| REALM-044 | food-policy.feature | The siege reserve is never spread |
| REALM-045 | food-policy.feature | Army refill at home |
| REALM-046 | food-policy.feature | The famine rule |
| REALM-047 | food-policy.feature | Surplus above the granary |
| REALM-048 | food-policy.feature | Lords' castles follow the policy by loyalty |
| REALM-049 | food-policy.feature | Presets fill the whole screen |
| REALM-049 | food-policy.feature | The Merchant preset sells the surplus |
| REALM-050 | food-year.feature | Weather is rolled by region |
| REALM-051 | food-year.feature | Collection goes to the nearest castle in reach |
| REALM-052 | food-year.feature | Food moving between castles loses some of its load |
| REALM-053 | food-year.feature | The spread keeps the reserve and hands out the rest by rings |
| REALM-054 | food-year.feature | Campaigning soldiers and horses eat more |
| REALM-054 | food-year.feature | Stores rot each season, less with granaries |
| REALM-055 | food-year.feature | A besieged castle stops spreading |
| REALM-056 | food-year.feature | Cutting the roads starves the outer ring without a battle |
| REALM-057 | food-year.feature | Rice lands harvest twice, and war can wreck their canals |
| REALM-057 | food-year.feature | New crops arrive after Atlantic contact |
| REALM-058 | food-year.feature | Famine |
| REALM-059 | food-year.feature | Scorched earth starves an invader |
| REALM-060 | people-and-land.feature | People grow and shrink |
| REALM-061 | people-and-land.feature | Provinces are gained and lost |
| REALM-062 | people-and-land.feature | Royal provinces |
| REALM-063 | people-and-land.feature | Officials are hired, trained and lost |
| REALM-064 | people-and-land.feature | A royal province without an official pays half |
| REALM-065 | people-and-land.feature | A low faith share brings religious revolts |
| REALM-065 | people-and-land.feature | Faith rises and falls |
| REALM-066 | people-and-land.feature | Tongue rises and falls |
| REALM-066 | people-and-land.feature | A low tongue share brings separatists and slower officials |
| REALM-067 | people-and-land.feature | In revolt |
| REALM-067 | people-and-land.feature | Revolt spreads to neighbours |
| REALM-070 | lords.feature | The lord card |
| REALM-071 | lords.feature | The same card, a different label |
| REALM-072 | lords.feature | Lords versus officials |
| REALM-073 | lords.feature | Calling a lord's retinue |
| REALM-074 | lords.feature | A lord's wealth |
| REALM-075 | lords.feature | Granting a fief makes a new loyal lord |
| REALM-076 | lords.feature | Keeping the local ruler |
| REALM-077 | lords.feature | Selling a title |
| REALM-078 | lords.feature | A marriage brings a house in as a lord |
| REALM-079 | lords.feature | A lord's land on his death |
| REALM-080 | lords.feature | A neighbour's disloyal lord defects with his land |
| REALM-081 | lords.feature | Starting lords |
| REALM-082 | lords.feature | A line dies out |
| REALM-083 | lords.feature | Seizing a lord's land by decree |
| REALM-084 | lords.feature | Trial and execution |
| REALM-085 | lords.feature | Defeating a lord's revolt |
| REALM-086 | lords.feature | A neighbour's disloyal lord defects with his land |
| REALM-087 | lords.feature | Two houses merge |
| REALM-088 | lords.feature | Loyalty goes up |
| REALM-089 | lords.feature | Loyalty goes down |
| REALM-090 | army-and-navy.feature | Soldiers are raised and lost |
| REALM-090 | army-and-navy.feature | Soldiers cost gold every month and eat grain |
| REALM-091 | army-and-navy.feature | Recruits refill and are spent |
| REALM-092 | army-and-navy.feature | Horses cap the horsemen |
| REALM-092 | army-and-navy.feature | Horses come and go |
| REALM-093 | army-and-navy.feature | Ships |
| REALM-094 | army-and-navy.feature | Castles |
| REALM-095 | army-and-navy.feature | Commanders |
| REALM-096 | army-and-navy.feature | The fallen of the last ten years |
| REALM-100 | ruler-and-family.feature | A child ruler needs a regent |
| REALM-100 | ruler-and-family.feature | The ruler ages each year and old rulers die |
| REALM-101 | ruler-and-family.feature | Years on throne reset with a new ruler |
| REALM-102 | ruler-and-family.feature | Heirs |
| REALM-103 | ruler-and-family.feature | No heir means a succession war |
| REALM-104 | ruler-and-family.feature | Traits lean the ruler's choices |
| REALM-105 | ruler-and-family.feature | Marriages |
| REALM-105 | ruler-and-family.feature | A marriage can lead to inheriting a realm |
| REALM-106 | women-in-roles.feature | Each country has its own chance per role |
| REALM-107 | women-in-roles.feature | Each country has its own chance per role |
| REALM-107 | women-in-roles.feature | A duke's daughter inherits his duchy in France |
| REALM-108 | women-in-roles.feature | A queen mother can be regent |
| REALM-109 | women-in-roles.feature | The chance rises with the ages |
| REALM-109 | women-in-roles.feature | A reform raises one country's chance early |
| REALM-110 | women-in-roles.feature | Real people first |
| REALM-111 | women-in-roles.feature | The chances live in config |
| REALM-112 | ruler-and-family.feature | The player cannot choose the inheritance law |
| REALM-113 | lords.feature | A lord's land on his death |
| REALM-113 | ruler-and-family.feature | Who takes the throne |
| REALM-120 | abroad.feature | Allies |
| REALM-120 | abroad.feature | Allies are called into wars |
| REALM-121 | abroad.feature | Enemies |
| REALM-122 | abroad.feature | Rivals compete for a named thing |
| REALM-123 | abroad.feature | Subjects |
| REALM-123 | abroad.feature | Subjects pay tribute and send troops |
| REALM-124 | abroad.feature | Oaths broken in the last 30 years |
| REALM-124 | abroad.feature | Others refuse a breaker of oaths |
| REALM-125 | abroad.feature | Lands taken make neighbours band together |
| REALM-126 | abroad.feature | An envoy is an official abroad |
| REALM-126 | abroad.feature | An envoy can be killed or held abroad |
| REALM-127 | abroad.feature | Merchants are replaced by traders |
| REALM-130 | starting-values.feature | Catalogue assessments set starting counts |
| REALM-131 | starting-values.feature | Low confidence widens the random range |
| REALM-132 | starting-values.feature | Relations and lords come from the 1444 files |
| REALM-140 | events-and-ai.feature | Event-tree country stats become concrete stats |
| REALM-141 | events-and-ai.feature | AI personalities read the same counts |
| REALM-142 | events-and-ai.feature | AI personalities read the same counts |
| REALM-150 | win-scores.feature | The Economy score |
| REALM-151 | win-scores.feature | The Economy score |
| REALM-152 | win-scores.feature | The Power score counts subjects at half |
| REALM-153 | win-scores.feature | The Technology score weighs inventions by era cost |
| REALM-154 | win-scores.feature | World domination |
| REALM-155 | win-scores.feature | Leading a score long enough |
| REALM-155 | win-scores.feature | Leading a score when the campaign ends |
| REALM-156 | country-card.feature | The card shows the rank in each score |
