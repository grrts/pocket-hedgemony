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
   setting; how a campaign is won (world domination or leading economy, power or technology); one month per turn (since replaced by one week per turn, X-18);
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
| Envoy | An official sent abroad on one mission; the card counts Envoy seats | Trader |
| Score | Economy, Power or Technology | |
| World domination | Owning or holding as subjects half of the world's settled land provinces, checked each January | Score victory |

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
- **Loyalty evaluator**: applies loyalty causes each month.
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
- REALM-015: The tax rate shall be set per province with a realm default, both on the five steps none, light, normal, heavy and crushing (province §8); a revolt can force it down one step; heavy taxes fill the treasury but make lords waver and provinces revolt. [§2, province §8, D-REALM-8]

### 5.4 Food: province food stats
- REALM-020: Food shall live in provinces: each province grows, stores and eats its own, and castles are the hubs that collect and spread it. [§3]
- REALM-021: Each province shall have a harvest (bumper, good, normal, poor, failed) gained by farmland, people working it, inventions and peace, and worsened by weather rolls, armies marching through, devastation (burned tiles), plague killing farmers and cold periods (the event tree's climate stats); it is the province's main food income each autumn. [§3.1]
- REALM-022: Each province shall have a local store in months of food, filled by what is left after collection and by castle deliveries, and emptied by people eating, armies refilling their reserve, yearly rot and raids. [§3.1]
- REALM-023: If a province's local store hits zero, then the province shall starve. [§3.1]
- REALM-024: Pastoral provinces shall have herds in thousands of head, grown on good pasture, by raiding and tribute, and lost to drought, hard winters, raids, disease and slaughter in famine; pastoral peoples eat from herds; herds move with their owners and cannot be besieged. [§3.1]
- REALM-025: Coastal provinces shall have a steady fish catch from fishing boats, improved by salting inventions and lost to blockade and war at sea. [§3.1]
- REALM-026: Grain shall have one fixed price in gold from the rules data (provisional 0.5 gold a food); bad or good harvests, war, blockades and trade routes do not move it; grain is sold to and bought from the realm's own treasury (REALM-157). [§3.1, X-6, D-REALM-1]

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
- REALM-045: Army refill shall decide how armies refill their own food reserve at home: castles hand out first (default, then the locals), locals only (from the province's local store), or no refill in lords' lands. [§3.3, warfare §18, D-REALM-3]
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
- REALM-063: Officials shall be gained by hiring (gold up front, wages yearly) and school graduates, with inventions raising how many provinces one official can run (REALM-169), and lost by dismissal, unpaid wages and war in their province. [§4, research tree, D-REALM-14]
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
- REALM-089: Loyalty shall fall with heavy or crushing taxes, seizing land from him or another lord, lost wars and battles, a child ruler, a disputed heir or a new ruler, requisitioning his grain, a foreign rival's bribes and promises, and the crown borrowing (REALM-189). [§5.5, feedback 61]

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
- REALM-109: The chance of women in roles shall be multiplied as the event tree's ages arrive: ×1.5 in the Age of Revolutions, ×2 in the Age of Industrialization, ×3 in the Age of World Wars (the Age of Decolonization is out of scope); events and reforms can raise one country's chance earlier (×2). [§8.1, gap-lists, X-14, D-REALM-7]
- REALM-110: Women who held roles in 1444 or appear in events shall be placed as they were; chances apply only to characters the game generates. [§8.1]
- REALM-111: The women-in-roles chances shall be config: `women_in_roles` per country or culture per role, and `age_multipliers` per age. [§8.1]
- REALM-112: Inheritance law shall come from the realm's government form (REALM-161) and, for whether a daughter can inherit the crown, from the country's history; the player cannot choose it; events and reforms (a new form) can change it. [§8.2, government §3, D-REALM-4, D-REALM-5]
- REALM-113: Inheritance law shall decide who takes the throne (eldest son, eldest child, a brother or the eldest of the house, the strongest claimant among the lords, or an election by lords or a council) and whether a lord's land passes to one heir or is split among the sons. [§8.2]

### 5.12 Abroad
- REALM-120: Allies shall be gained by an envoy's alliance mission, marriages and peace terms, and lost by breaking the alliance, war between you and a rival bribing them away; they are called into your wars. [§9]
- REALM-121: Enemies shall be countries at war with you, gained by declaring war or being attacked and lost by making peace. [§9]
- REALM-122: Rivals shall be countries competing with you for a named thing (a throne, a province, a trade city), gained by a contested claim or border dispute and lost when it is settled or one side is destroyed; the AI targets them and wars against them please your lords. [§9]
- REALM-123: Subjects (vassals, tributaries, unions, marches, colonies and protectorates) shall be gained by forcing it in a peace or a weak neighbour asking for protection, and lost by their independence war, release or annexation; they give tribute in gold or grain, and troops. [§9, subjects §12, X-8, D-REALM-9]
- REALM-124: Oaths broken shall count broken truces, abandoned allies and debt defaults in the last 30 years; others refuse alliances and loans. [§9]
- REALM-125: Lands taken shall count provinces seized in the last 20 years, lowered by giving land back; when high, neighbours band together against you. [§9]
- REALM-126: Envoys shall be officials sent abroad, one mission each (alliance, marriage, peace, gift); the card counts **Envoy seats** and envoys abroad; while abroad an envoy runs no province, so his province pays half until he returns; envoys are lost when the mission ends or they are killed or held abroad. [§9, diplomacy §18, D-REALM-2]
- REALM-127: Merchants (trading agents placed in trade cities, hired for gold or provided by merchant lords, thrown out by a city's owner or war) are replaced by trade v2's traders and trade ships (REALM-157). [§9, trade §14, X-6, D-REALM-1]

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
- REALM-152: Power shall be provinces held (subjects count half) plus army power (soldiers weighted by kind, warships, commanders), as REALM-160 states. [§12, D-REALM-6]
- REALM-153: Technology shall be inventions known, each weighted by its era cost in the research tree; nothing removes a known invention. [§12]
- REALM-154: When a realm owns or holds as subjects half of the world's settled land provinces (land provinces with people) in the turn in which 1 January falls, it shall win by world domination at once. [§12, X-12, D-REALM-6]
- REALM-155: When the campaign's end date (31 August 1939) arrives, every realm that leads the Economy, Power or Technology score shall win in that score, with no margin; leading earlier wins nothing. [§12, gap-lists, X-12, D-REALM-6]
- REALM-156: The country card shall show the country's rank in each score. [§12]

### 5.16 Decided rules (17 October 2026)
- REALM-157: The card shall show **Traders** and **Trade ships** instead of Merchants; Gold's trade income shall be deposits from traders, market fees and tolls; `trade_access` shall set starting traders; surplus grain shall be sold to the realm's own treasury and bought from it at the fixed grain price (0.5 gold a food), with no market. [trade §14, X-6, D-REALM-1]
- REALM-158: The card shall also show Envoy seats (and envoys abroad), Leagues against you, Pretenders at court, Arms store, Powder store, Prisoners, Victories / Defeats, Troop cap, Peace voices on the Enemies line, Preachers in Abroad, and the Subjects row "Vassals, tributaries, unions, marches, colonies and protectorates"; Faith counts the state faith or a faith layered with it; Tongue counts cousins as half; building upkeep is a loss of Gold. [diplomacy §18, warfare §18, religion §18, culture, subjects §12, buildings §18, D-REALM-2, D-REALM-3, D-REALM-9]
- REALM-159: Events shall read `war_weariness` as Fallen and peace voices, `prestige` as victories and lands taken, `admin_capacity` as the officials cap (government), `trade_access` as starting traders, and `opinion`, `trust` and `notoriety` from diplomacy. [warfare §18, government, diplomacy §11, D-REALM-3, D-REALM-4]
- REALM-160: Army power shall be (foot × 1 + horse × 2 + guns × 3 + warships × 100 + commanders × 1,000) ÷ 1,000. [D-REALM-6]
- REALM-161: The throne law shall follow the government form's succession: eldest heir and named heir give eldest son (eldest child where the country's history lets a daughter inherit the crown), strongest son gives strongest claimant, eldest of the house and the chief's lineage give eldest of the house, and every form where a body chooses gives election. [government §3, D-REALM-4, D-REALM-5]
- REALM-162: A lord with 4 to 7 provinces shall have one *Great lord* reason and one with 8 or more two; each reason means one more loyalty-raising cause is needed for each step up. [government §2, D-REALM-4]
- REALM-163: A generated character shall be a woman with a chance per role: lord 5 %, commander 2 %, official 2 %, scholar 5 % (a ruler only by succession), per country where the data says otherwise, times the age multiplier and the reform multiplier; students are men taken from recruits. [§8.1, D-REALM-7, D-RSCH-15]
- REALM-164: Debt interest shall be 10 % a year, ×0.8 with T7 and ×0.7 with T12; a lender shall lend at most one year's income (three with T10); lenders are realms that know T7 (banks), lords with wealth and other rulers; a lender or would-be ally refuses with a chance of 10 % per oath broken. [§2, research tree, D-REALM-13]
- REALM-165: A lord shall lend in exchange for favours at no interest; while the ruler owes him money, his loyalty counts one step lower than it stands. [§2, D-REALM-13]
- REALM-166: Starting counts shall come from the catalogue's assessment levels (very low to very high) through the realm data's tables, each spread by a seeded random factor of ±25 % (low confidence), ±10 % (medium) or ±5 % (high); major countries start with the great houses the realm data lists from the catalogue (France: Alençon, Anjou, Armagnac, Bourbon, Foix, Nevers, Orléans), other countries with one generated lord per 4 provinces, and a one-province country with none. [§10, X-13, D-REALM-10]
- REALM-167: The harvest shall come in September in the north and March in the south; each region rolls its weather once per harvest (1 in 6 bad, 1 in 6 good); food moving between castles loses 2 % for every province it travels; stores rot 5 % a season, 2.5 % with a granary; a castle's reach is 1 ring on a track or no road, 2 on a road or paved road, 3 on a turnpike, 4 on a railway; Frontier first and Capital first count the favoured castles' people double. [§3.4, X-4, D-REALM-11]
- REALM-168: Fallen, Oaths broken and Lands taken shall be hard windows: an entry counts while younger than 10, 30 or 20 years and then drops out whole. [§6, §9, D-REALM-12]
- REALM-169: One official shall run 1 province with G1, 2 with G9, 3 with G16, plus one more for each of B2, G11 and T14. [§4, research tree, D-REALM-14]
- REALM-170: A child ruler (under 16) shall have the queen mother as regent where she lives, otherwise the most loyal lord, then the one with most provinces, then by name. [§8, §8.1, D-REALM-17]
- REALM-171: The AI shall use the food preset Feed the people in peace and War footing at war, set the tax default normal in peace and heavy at war, take a loan only when its gold is below zero, give a gift to a disloyal lord when it has 20 gold, and grant as fiefs the royal provinces its officials cannot run. [D-REALM-16]
- REALM-172: The default army refill shall be "Castles hand out first". [warfare §18, D-REALM-3]
- REALM-173: Scores shall be worked out each January for the realm book; world domination is checked in the turn in which 1 January falls and the player may keep playing after it; at the end date tied leaders share the win, and a campaign without a win shows the final scores and the player's rank. [X-12, D-REALM-6]
- REALM-174: The tax steps shall be none, light, normal, heavy and crushing; a revolt forces light down to none. [province §8, D-REALM-8]
- REALM-175: Commanders shall come from the origins warfare §4 gives (ruler or heir, lord, hired captain, risen from the ranks, academy graduate, exile, commissioned official), each with Might, Cunning and Logistics. [warfare §4, X-7, D-REALM-18]

### Playtest feedback (17 October 2026)
Leroy's playtest feedback (DECISIONS.md, F-1 to F-22). It is the latest decision, so it replaces the requirements it names.

- REALM-176: The country card's General tab shall hold REALM-005's lines except Allies, Enemies and Oaths broken, which move to its Diplomacy tab; trade lines go to the Trade tab and soldiers, commanders and ships to the Army tab (game-shell SHELL-139). [F-12]

### 5.17 Tax rates and the treasury ledger (milestone 3)
The game's first working treasury, built to the milestone 3 plan (slice 2). It replaces the single monthly income with the rules above put to work.

- REALM-177: Each province shall pay tax at its own rate, or at its owner's realm default while it has none; a new realm's default is normal and no province starts with its own rate. A province pays its people's tax times the rate's factor: none nothing, light half, normal once, heavy one and a half, crushing double (`economy.taxRateFactor`, provisional); half while its official's post stands empty (RECR-083), and half while it riots or plots (PROV-162); a lord's province gives the crown only its share of both tax and trade (REALM-072). At heavy it has the *Heavy taxes* grievance, counted twice at crushing (PROV-167). [REALM-015, PROV-160, PROV-162, PROV-167, milestone 3]
- REALM-187: When a rate is raised so that a lord's province pays heavy or crushing, that lord shall take the *heavy taxes* loyalty cause once, whether the province's own rate or the realm default was raised (an AI realm going to war included). [REALM-015, PROV-165, milestone 3]
- REALM-178: Trade and market gold (the province's wealth) shall reach the holder whatever the tax rate, halved while the official's post stands empty. [REALM-010, PROV-161, milestone 3]
- REALM-179: The treasury shall keep a ledger for the month with the lines Tax, Trade, Army pay, Officials, Interest, Works (the upkeep of the realm's works, milestone 4, BLD-170), Schools (RSCH-087), Grain (grain sold to the treasury, REALM-209) and Tribute (paid by a Tributary to its overlord, DIPL-206); the month's income is their sum, and it is paid into the treasury when a new month begins. [REALM-010, milestone 3]
- REALM-180: Officials' wages shall be one wage a month (`economy.officialWagePerMonth`, provisional) for each province whose official is at his post, paid by the owner even while the province is occupied; a commissioned official draws no wage here. Wages and debt interest are paid in twelfths each month, not once a year (default chosen so that the monthly ledger shows every cost). [REALM-063, REALM-012, milestone 3]
- REALM-181: Lenders shall lend up to one year's tax and trade, less what the realm already owes, at 10 % a year paid monthly; gold can be repaid at any time up to what is owed and what the treasury holds. Until banks are invented (T7, T10, T12) every lender gives these terms. [REALM-164, milestone 3]
- REALM-182: Each month an AI realm shall set its tax default to normal at peace and heavy at war; borrow only while its gold is below zero, enough to bring it back above zero as far as lenders allow; and repay once its gold is more than a year's army pay and wages. [REALM-171, milestone 3]

#### How the player uses it: tax and the treasury
- REALM-183: The player sets one province's rate on its card: the province Overview tab shows a Tax line (its rate, whether it follows the realm default, and the gold it pays a month) with a row of buttons, Realm default, None, Light, Normal, Heavy and Crushing; the chosen one is marked. [X-19]
- REALM-184: Everything about the realm's gold sits on one tab, the Treasury tab of the player's country card, next to General: gold and its change a month, the month's ledger line by line, the realm tax default with the same row of rate buttons, and the debt with its interest, what lenders would still give, and buttons to borrow and repay. [X-19]
- REALM-185: The gold plaque at the top of the screen is the treasury's overview: it shows gold and its change a month, and tapping it opens the Treasury tab; the General tab's Treasury line opens it too. [X-19]
- REALM-186: On a phone in landscape the Treasury tab and the Tax line fit the side panel in the Wide and Tall layouts: the tab row scrolls sideways, the rate buttons wrap onto two rows of three, every button is at least 44 points high, and nothing needs hover (each button names what it does). [X-19]

#### How the player uses it: lords and who governs a province
- REALM-190: A province's Overview opens with the realm that rules it (its flag, opening the realm) and what kind of province it is (seat and land, then river and coast, such as "Town in farmland · river"). Who governs it comes next, above the siege view and the facts: a "Governed by" card with the lord who holds it (portrait, house, loyalty, and buttons to his screen and to seize the land) or "Royal land", saying outright that it is not granted to any lord (with a Grant as fief button that opens the realm's lords, neighbours first), and the province's official. A lord's official is shown as serving the lord, with no button to the official's screen, so he cannot be commissioned. [F-60, F-62, F-70, F-78, X-19]
- REALM-191: The Lords tab of the country card is the lords' overview: a bar of royal land against the lords' land, the count by loyalty, and a row per lord (portrait, name, house, provinces, people, loyalty as a coloured tag, gold a month to the crown), the least loyal first; tapping a row opens the lord's screen. [F-64, F-65, X-19]
- REALM-192: A lord's screen shows his portrait, house, loyalty and what it means, his lands (people, gold to the crown), a Gift button while he is not loyal, his provinces as rows with a picture of each (tap to open it on the map, Seize beside it), and the realm's royal provinces to grant him, nearest his lands first (six, with Show all). A button lights his lands on the map: the rest of the land fades to grey, the map frames his provinces, and a chip over the map names him with buttons to reopen his screen and to stop; on a phone the panel folds away so the map shows. [F-67, F-70, X-19]
- REALM-193: On the map, a lord's land carries a fine pattern of small crosses and a dashed border where it meets royal land or another lord's land; the Lords lens colours the player's royal land gold and each lord's land in his own colour, other realms faded. [F-68, X-19]
- REALM-194: The Provinces tab lists every province as a row with a picture of the province, its mood, who governs it (lord's house, or royal with the official's post or "no official"), people, food and tax a month, sortable by trouble, people, food or tax; tapping a row opens the province and centres the map on it, and its Map button shows it on the map with the panel folded away. [F-63, X-19]
- REALM-195: On a phone in landscape these screens fit the side panel in the Wide and Tall layouts: rows and their buttons are at least 44 points high, the lord's grants and lands wrap to one column, and nothing needs hover. [X-19]

### 5.18 Starting armies and borrowing (milestone 3 playtest)
Leroy's milestone 3 playtest (feedback 59, 61, 71). It is the latest decision, so it replaces what REALM-181 says a loan owes.

- REALM-188: A loan shall add to the debt at once the gold borrowed plus a year's interest on it (10 %, `debt.interest_added_at_once_years`), and the debt keeps costing 10 % a year paid monthly while it is owed. Lenders let a realm owe up to a year's tax and trade, so the most it can borrow is what is left under that, less the new loan's interest. [REALM-164, REALM-181, feedback 61]
- REALM-189: Borrowing beyond repayment and interest shall cost the crown its lords' trust: when a realm takes a loan, each of its lords takes the *crown borrowed* loyalty cause and falls a step (none below Disloyal), at most once in twelve months (`debt.lords_waver_once_per_months`); further loans inside that time cost only their interest. The AI's loans count the same. [REALM-089, feedback 61; default chosen: the lords' loyalty, the realm's existing measure of how the crown is seen]
- REALM-196: A realm's men under arms at the start (REALM-130: its 1444 figure, else a quarter of its troop cap) shall all stand in armies under a commander, never as garrison troops without one and never in one stack: one army per starting commander, the thousands dealt out as evenly as they go, the first in the capital and the others spread evenly over its land outward from the capital. A small realm has as many armies as it has thousands of men, at most, and a one-province realm keeps them in its capital. [feedback 59; Leroy, 17 October: starting troops are always under a commander]
- REALM-197: A realm shall start with one commander for each `starting_armies.men_per_commander` (8,000) men under arms, rounded, at least one and at most `starting_armies.most_commanders` (8), yet enough that no starting army holds more than 30,000: the commanders the data names first, then new ones of its own culture with skills of 1 to 3 picked by the campaign's data. Each leads one of the starting armies. [REALM-130, REALM-175, feedback 59]

#### How the player uses it: the Treasury tab
- REALM-198: The Treasury tab (REALM-184) reads at a glance from top to bottom: (1) the purse, a card with the coin, gold in large type, its change a month in green or red, and how many months the gold lasts while it falls; (2) the month as one bar split into gold in and gold out, then each ledger line as a labelled bar, income first, with the change a month as the total; (3) the realm tax row; (4) the debt as a meter of what is owed against what lenders allow, with the interest a month, then one line saying what a loan costs before you tap (the gold plus 10 % added to the debt at once, and, when it applies, that every lord falls a step), and Borrow buttons that each name the gold and what you will owe. Borrowing or repaying keeps the tab open; the lords' loyalty news goes to the news list. On a phone in landscape it fits the side panel in the Wide and Tall layouts with every button at least 44 points high and nothing that needs hover; the gold plaque stays the overview (REALM-185). Starting armies need no screen of their own: they show on the map and in the Military tab as before. [X-19, feedback 71]

### 5.19 Stability (playtest feedback, 17 October)
Leroy's feedback F-75: stability is a meaningful reading of the state of lords, subjects and officials. It stays a reading, not a stored number (D-AUD-2: there is no stability stat); events keep reading stability as REALM-140 maps it.

- REALM-199: A realm's stability shall be read from four pillars, lords, subjects, officials and provinces, each on one of the steps Steady, Uneasy, Troubled and Crumbling (`stability.steps`); the realm stands at the step of its weakest pillar. [F-75, REALM-140, D-AUD-2]
- REALM-200: The lords pillar shall count the realm's lords who hold land, and the subjects pillar its subjects, by loyalty: Crumbling while any is In revolt, Troubled while any is Disloyal, Uneasy while fewer than half are Loyal (`stability.loyal_share_for_steady`), else Steady; no lords or no subjects is Steady. Until the subjects context's seasonal count is built, a subject's loyalty is its 1444 starting step (SUBJ-036). [F-75, REALM-086, SUBJ-026, SUBJ-036]
- REALM-201: The officials pillar shall count the realm's royal provinces whose official's post stands empty (REALM-064): none Steady, up to a quarter Uneasy, up to a half Troubled, more Crumbling (`stability.empty_posts_share`, provisional). A lord's provinces are run by his own officials (PROV-202) and are not counted. Officials over the officials cap reach stability through the *Grasping officials* grievance (GOV-005) and a judge through the riot bar (PROV-236), both in the provinces pillar. [F-75, REALM-063, REALM-064]
- REALM-202: The provinces pillar shall count the realm's provinces rioting or plotting (PROV-230 to PROV-236): none Steady, any rioting Uneasy, any plotting or a tenth of the provinces Troubled, a quarter Crumbling (`stability.restless_share`, provisional; a quarter as D-AUD-2's unrest). [F-75, REALM-067, D-AUD-2]

#### How the player uses it: stability and the top bar
- REALM-203: The stability plaque in the top bar is stability's overview: it shows the step in words with the crown icon, plain at Steady, amber at Uneasy, in red cloth at Troubled and blinking at Crumbling, and tapping it opens the General tab of the player's country card. [F-75, X-19]
- REALM-204: The General tab of the player's country card shall open with a Stability section: the step, one line on what it means, and one row per pillar (Lords and Subjects by loyalty, Officials as royal posts filled or standing empty, Provinces by mood) with that pillar's step; tapping a row opens the tab that mends it: Lords, Diplomacy, Officials or Provinces. [F-75, X-19]
- REALM-205: The top bar shall show, in this order, the realm's flag and name, the date, gold with its change a month, stability, the war plaque while at war, and dispatches; every plaque is the same height (36 px drawn, 44 px to tap) and type, and the troop count moves off the bar to the Military tab, where it is already shown. On a phone the game plays in landscape (the turn-your-phone notice covers portrait), and the bar fits the width of a landscape phone. [F-74, X-19]

### 5.20 Castles share food, surplus and granaries (feedback 84, 85)
Leroy's food feedback (84, 85) puts the castle network of §5.5 to §5.7 to work in the game. Exchanges between castles (castle shares, REALM-042) and army refill (REALM-045) wait for armies eating from the land (feedback 83), and traders carrying food waits for the trade milestone; until then each castle keeps what it collects.

- REALM-206: Every province with a castle of any step (an earthwork ring fort or better; a capital always has one) that its realm holds shall be a food castle. Each month the realm's provinces are given to the nearest castle ring by ring over the realm's own land, as far as the castle's reach: 1 ring without a road or with a track at the castle, 2 with a road (D-REALM-11). A province no castle reaches lives on its own harvest (REALM-033). [feedback 84, REALM-030, REALM-032]
- REALM-207: An enemy army standing on the realm's land, a province held by an enemy and a besieged province shall stop food: no castle reaches it or the land past it, and the castle whose reach it falls in counts its roads as cut. A besieged castle collects and hands out nothing; its own province eats from its store, reserve included, whenever its own store is under a month. A castle taken by an enemy loses its store. [feedback 84, REALM-055, REALM-056]
- REALM-208: In each province's harvest month the collection share (lowered on a lord's land by his loyalty, REALM-048) of its store over a year's eating (`castleFood.keepMonths`, 12) shall go to its castle, losing 2 % for every ring it travels. In the castle's own harvest month the castle hands out its store over the siege reserve by the spread pattern, each ring's share split by people and no province filled past its cap; a ring the castle doesn't reach leaves its share in the castle. Each month a province under the famine rule's months is fed up to it from its castle's store over the reserve. Castle stores rot 5 % a season, 2.5 % with a granary. [feedback 84, REALM-041, REALM-043, REALM-044, REALM-046, REALM-053]
- REALM-209: A province's own store shall hold at most 18 months of its eating (`castleFood.localStoreCapMonths`) and a castle's 6 months of its own province's eating, 18 with a granary (`castleStoreMonths`, `granaryStoreMonths`, all provisional). Food over a cap goes by the surplus rule: Keep (it spoils), Sell to the treasury (at the grain price, `grain_price_gold_per_food` × `castleFood.grainGoldScale`: a month's food for a thousand people sells for 0.004 gold, about what they pay in tax a month) or Send to the capital castle (into its store, where its own cap applies). Send to subjects or allies waits for the subjects context. Gold from grain is the ledger's Grain line. [feedback 85, REALM-026, REALM-031, REALM-047]
- REALM-210: The granary shall be a work: part of the castle, 30 gold of the buildings data and 6 months, taking no slot; it can be built only where a castle stands, and the AI builds one after its other works. [feedback 85, BLD-008]
- REALM-211: Every realm shall start on the *Feed the people* preset with the famine rule at 1 month, and each castle with its siege reserve in store (default chosen so castles help from the start). A preset sets the realm's collection, castle shares, spread, siege reserve, army refill and surplus where it names one, and clears the castles' own values. A castle may keep its own collection and siege reserve. [feedback 84, REALM-040, REALM-049]

#### How the player uses it: the Food tab
- REALM-212: Everything about food sits on one tab, Food, of the player's country card, next to Treasury. It reads top to bottom: (1) the overview, three counts side by side (provinces hungry under a month, running low under three, provinces fed by castles of all) and one line on the food sold this year for how much gold and the food that spoiled, suggesting selling when food spoils under Keep; (2) the four presets, each naming what it sets, the one in force marked; (3) one row of buttons per setting, Collection, Spread (Tight, Even, Wide, each with its three ring shares), Siege reserve, Famine rule and Surplus, each with one line on what it does and, where it matters, what holds it back (castles reaching one ring without roads, castles without a granary holding 6 months); (4) the castles, besieged and cut off first and then the emptiest, each a row with its picture, name, provinces it feeds, reach, tags (Besieged, Roads cut, Granary, Own policy) and its store as a bar against what it holds with the siege reserve marked; tapping a row opens the province; under each row a fold "Its own settings" holds the castle's collection and siege reserve with a Realm button to follow the realm again, and Build a granary here, which opens the province's Build tab; (5) the provinces outside every castle's reach, as buttons that open them. Every choice keeps the tab open. [feedback 84, 85, X-19]
- REALM-213: The overview at a glance is the General tab's Food line (hungry and running-low counts, or "All provinces fed"), which opens the Food tab. A province's Overview shows under its harvest either its castle store (months of how many, granary or not, besieged, roads cut) or the castle that feeds it and its ring, or "No castle in reach: its own harvest", each opening the Food tab for the player's own land. The Treasury tab shows grain sold as a ledger line. [feedback 84, 85, X-19]
- REALM-214: On a phone in landscape the Food tab fits the side panel in the Wide and Tall layouts: each row of choices fits one line of up to five buttons and presets two to a row, every button and fold is at least 44 points high, the chosen button is marked with a dot as well as pressed in, and nothing needs hover. [X-19]

### 5.21 Harvests and army supply (feedback 82, 83)
Leroy's feedback 82 and 83 (17 October), after the food research found that harvests almost never failed and armies never ate from the land. It is the latest decision, so it adds to REALM-021, REALM-050, REALM-054 and REALM-057.

- REALM-215: Each province shall roll its own harvest at each of its harvests, before weather and war: poor 10 %, normal 70 %, good 15 %, bumper 5 % (`food_year.base_harvest`, provisional). Its region's weather, an enemy in the province and the realm's harvest inventions then move it a band each, so a failed harvest comes from a poor roll in a bad year, or bad weather with an enemy in the province. [REALM-021, REALM-050, feedback 82]
- REALM-216: A region shall roll its weather once per harvest, and each province shall read that roll by its harvest climate: temperate lands 1 in 6 bad weather and 1 in 6 good; dry lands (desert, drylands, savanna) 1 in 4 drought and 1 in 8 good; monsoon lands (the rice lands and the tropical monsoon of Asia) 1 in 5 floods and 1 in 6 good (`food_year.weather`, `food_year.climate_weather`, provisional). The roll is shared, so where the temperate land suffers, the dry land beside it suffers too. [REALM-050, REALM-167, feedback 82]
- REALM-217: A province shall harvest once a year in its harvest month (REALM-167). Rice lands, the wet lowlands from India to South China and the Indies (68° to 146° east, 11° south to 30° north, not desert, drylands, mountains or tundra; `food_year.rice_lands`, provisional), harvest in March and in September once their realm knows *F2 Wet-rice terracing*, each harvest bringing half the year's food. The tundra grows no crops, so its farmers bring in nothing. Herders, woodsmen and seafolk bring food every month whatever the season. [REALM-057, D-TIME-5, feedback 82]
- REALM-218: An army shall eat from its wagons every day: a man eats a month of food a month at home and double on campaign, and a horse eats like three men (REALM-054). An army is on campaign while its realm is at war or while it stands outside its own land. The wagons carry `march.monthsCarried` (2) months of food on campaign. [REALM-054, feedback 83]
- REALM-219: An army shall refill its wagons from the local store of the province where it stands (REALM-022): in a month it can take what its foragers find on that ground (`march.foraging`) of the store above a reserve. In its own or any province not at war with it, the locals keep `march.homeReserveMonths` (2, provisional) months of eating; in an enemy's province nothing is kept back. What it takes leaves the province's store, so a long stay or a march through poor land brings hunger to the province and, when the store runs dry, to the army. Castles handing food to armies (REALM-045) comes later; for now every refill comes from the locals. [REALM-022, REALM-045, feedback 83]
- REALM-220: A realm shall hear of failed harvests in its provinces: one dispatch for each harvest month, naming them. [feedback 82]

#### How the player uses it: harvests and army supply
- REALM-221: The Overview tab of the province card shows the food lines: months stored; the last harvest in words with its cause (drought, floods or bad weather in the region, or good weather) and when it comes in (each September, twice a year in March and September, or none in the tundra); and, while armies stand there, how many months of the store they eat a month. The Provinces tab of the country card is the overview: its top line counts the last harvests (good or bumper, normal, poor or failed) and each row marks a poor or failed harvest beside its months of food. The Food lens of the map shows how many men on campaign each province's store could feed. On a phone in landscape these are lines of the side panel in the Wide and Tall layouts, nothing needs hover, and opening a row or a province is a tap of at least 44 points. [feedback 82, X-19]
- REALM-222: An army's supply line, on the army rows of the province card and on the commander's screen, shows the months of food in its wagons, "on campaign, men eat double" while it is, and what the land where it stands gives it a month: what the locals can spare above their reserve, or what foragers can take in enemy land, with a warning when that is less than the army eats. [feedback 83, X-19]

### 5.22 Starting numbers from the catalogue (scenario setup)
The world builds each realm's purse, levies, officials and envoys from its catalogue assessments (REALM-130, REALM-166, SETUP-020). It is the latest decision, so it sets how the tables read for these five counts; a realm with no assessment keeps the engine's flat start (SETUP-047).

- REALM-230: A realm's starting gold shall be `starting.gold_months_of_income` months of its tax and trade by its economic strength (very low 1, low 2, moderate 3, high 5, very high 8; at least `starting.gold_floor`, 10), and its starting debt that gold times `starting.debt_share_of_gold` by its fiscal resilience (1.5, 1, 0.5, 0.25, 0), never more than lenders would let it owe (REALM-188). Its recruits shall start at `starting.levies_share_of_ceiling` of each province's levy ceiling by its manpower potential (0.5, 0.65, 0.8, 0.9, 1). Its royal provinces shall start with `starting.officials_per_royal_province` officials each by its administrative capacity (0.5, 0.7, 0.9, 1, 1.2; at most one per province, at least the capital's): the posts farthest from the capital stand empty. Its court shall start with `starting.envoys_at_court` extra envoys by its diplomatic influence (0, 1, 1, 2, 3), each an extra envoy seat (DIPL-048). Gold, recruits and officials spread by the assessment's own confidence (REALM-166), with a seed of the campaign's own, so the same seed gives the same start; an unknown level counts as moderate (D-SETUP-6). [REALM-130, REALM-166, D-REALM-10; all provisional] A realm's starting ships are naval's starting fleet by its naval capability (NAVY-132, F-115), not the realm data's ships per thousand people.
- REALM-231: An AI realm at war shall not call men while it has neither a commander free nor the gold to commission one (`recruit.commanderGold`), since men with no one to lead them only stand as garrisons. [feedback 28, REALM-230]

#### How the player uses it: the starting numbers
- REALM-232: The starting numbers show where the player already reads each of them, with no screen of their own: gold and debt on the Treasury tab and the gold plaque (REALM-198), levies on the Military tab, empty posts on the province card and the Provinces tab, envoy seats on the Diplomacy tab. The Heritage tab of the country card is the overview of why: each assessment that sets a starting number says which under its bar (Economy "starting gold", Finances "starting debt", Manpower "levies at the start", Reach of rule "officials at their posts", Standing abroad "envoys at court"), and a question mark marks an uncertain one, whose start varies more between campaigns. On a phone in landscape the Heritage tab is the side panel in the Wide and Tall layouts; the caption wraps under the label, and nothing needs hover. [X-19]

## 6. Commands

| Command | Who issues it | Preconditions | Result | Events emitted |
|---|---|---|---|---|
| SetFoodPolicy(setting, value) | player / AI | Value from the allowed list | Realm default changed | FoodPolicyChanged |
| OverrideCastlePolicy(castle, setting, value) | player / AI | Own castle | Castle override | FoodPolicyChanged |
| ApplyFoodPreset(preset) | player / AI | — | All settings filled | FoodPolicyChanged |
| SetTaxDefault(rate) | player / AI | One of the five steps | Every province without its own rate pays at it | TaxRateChanged |
| TakeLoan(lender, amount) | player / AI | Lender willing (oaths broken lowers it); within the loan cap (REALM-181, REALM-188) | Gold up; debt up by the gold plus a year's interest; lords fall a step, once a year (REALM-189) | LoanTaken |
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

## 9. Monthly step

A turn is one week (X-18). The steps below are monthly: they run once, in the turn in which a new month begins.

Reads first: province sums (people, recruits, stores, tax), war state and battles (warfare), diplomacy results.
Each month: pay soldiers (monthly gold), add income, desertion if unpaid or unfed; apply loyalty causes; check ruler
death and succession. Each January: work out the scores and check world domination (REALM-173).
Each season: eating and rot of castle and local stores; famine rule releases.
At the harvest (September north, March south): harvest roll (by region weather), collection, castle shares, spread (REALM-167).
Each year: debt interest; officials' wages; recruits refill; ruler and lords age; years on throne; Fallen, Oaths broken and Lands taken drop entries older than their windows.
Each New Year: lords-over-cap loyalty loss (government).

## 10. Configuration

All numbers are placeholders ("Numbers are placeholders for config"). The file is `packages/rules/data/domain/realm.json`
(D-REALM-15); its `_provisional` list names the provisional values.

| Key | Meaning | Value in the design | Placeholder? | Config file |
|---|---|---|---|---|
| food.collection.options | Collection shares | 0 / 25 / 50 / 75 % | yes | realm config |
| food.castle_shares.options | Castle share rules | by people, frontier first, capital first, equal, custom (sum 100 %) | no | realm config |
| food.spread.default / presets | Spread by ring | 50/30/20; Tight 80/20/0; Wide 30/35/35 | yes | realm config |
| food.siege_reserve.options | Months kept | 0 / 3 / 6 / 12 | yes | realm config |
| food.army_refill.options | Army refill | castles hand out first (default), locals only, no refill in lords' lands | no | realm.json |
| food.famine_rule.options | Famine release threshold | off / 1 / 3 months | yes | realm config |
| food.surplus.options | Surplus | keep, sell to the treasury, send to capital castle, send to subjects or allies | no | realm.json |
| food.lords_castles | Following by loyalty | loyal all, wavering half, disloyal none | yes | realm config |
| food.presets | Presets | Feed the people; Fortress realm; War footing; Merchant (see REALM-049) | yes | realm config |
| food.campaign_eat | Soldiers on campaign eat | ×2 | yes | realm config |
| food.horse_eats | A horse eats like | 3 men | yes | realm config |
| food_year.transfer_loss_per_province | Loss moving food between castles | 2 % per province | yes | realm.json |
| food_year.rot_per_season | Store rot | 5 % a season, 2.5 % with a granary | yes | realm.json |
| tax_rates | Tax steps | none / light / normal / heavy / crushing | no | realm.json |
| officials.no_official_share | Royal province without official | half tax, half recruits | yes | realm config |
| lords.tax_share | Lord keeps | half | yes | realm config |
| fallen.window_years | Fallen window | 10 | yes | realm config |
| oaths.window_years | Oaths broken window | 30 | yes | realm config |
| lands_taken.window_years | Lands taken window | 20 | yes | realm config |
| women_in_roles | Chance per country or culture per role (ruler, lord, commander, official, scholar) | lord 5 %, commander 2 %, official 2 %, scholar 5 % | yes | realm.json |
| age_multipliers | Factor per event-tree age | 1.5, 2, 3 | yes | realm.json |
| win.domination_share | World domination share of settled land provinces | 50 % (X-12) | no | realm.json |
| win.army_weights, warship_men, commander_men | Army power weights | foot 1, horse 2, guns 3; warship 100; commander 1,000 | yes | realm.json |
| win.subject_province_weight | Subjects' provinces in Power | ½ | yes | realm config |
| campaign.end_date | End date (one setting) | 31 August 1939 | no (decided) | time-and-turns / settings |
| grain_price_gold_per_food | Fixed grain price | 0.5 gold a food | yes | realm.json |
| food_year.weather, harvest_month, reach_by_road, favoured_weight | Weather odds, harvest month, castle reach, favoured castles | 1 in 6 bad and good; Sep / Mar; 1–4 rings; ×2 | yes | realm.json |
| food_year.base_harvest | A province's own harvest roll (REALM-215) | poor 10 %, normal 70 %, good 15 %, bumper 5 % (feedback 82) | yes | realm.json |
| food_year.climate_weather, dry_terrains, no_harvest_terrains, rice_lands | Weather by climate, which grounds are dry, which grow no crops, where rice lands lie (REALM-216, REALM-217) | dry 1 in 4 drought, 1 in 8 good; monsoon 1 in 5 floods, 1 in 6 good; desert, drylands, savanna; tundra; 68°–146° E, 11° S–30° N (feedback 82) | yes | realm.json |
| march.homeReserveMonths | Months of eating the locals keep back when an army refills (REALM-219) | 2 (feedback 83) | yes | defines.json |
| debt | Interest, loan cap, refusal per oath, interest added at once, months between the lords' grumbling | 10 %; 1 year's income (3 with T10); 10 points; 1 year; 12 months | yes | realm.json |
| starting_armies | Men per starting commander, most commanders | 8,000; 8 | yes | realm.json |
| economy.taxRateFactor | Gold at each tax step against normal | 0, ½, 1, 1½, 2 (not in the design) | yes | defines.json |
| economy.officialWagePerMonth | An official's wage a month | 0.1 gold (not in the design) | yes | defines.json |
| starting | Assessment level tables and confidence spread | tables; ±25 / 10 / 5 % | yes | realm.json |
| starting_lords | Great houses and generated lords | France's seven houses; 1 per 4 provinces | yes | realm.json |
| officials_per_province | Provinces one official runs | G1 1, G9 2, G16 3, +1 B2, G11, T14 | no | realm.json |
| great_lord | Great lord reasons | 4 to 7 provinces one, 8+ two | no | realm.json |
| succession_by_form | Throne law per government succession | table | no | realm.json |
| ai | Realm AI | presets, tax, loan, gift, fiefs | yes | realm.json |

## 11. Seams

| Other context | Direction | Pattern | What crosses |
|---|---|---|---|
| province | upstream | Customer–Supplier | Province sums (§13), tax reaching you, local stores, harvests, grievance-driven lord wavering; realm sends food policy, castle deliveries, fief grants |
| research | downstream | Customer–Supplier | Gold for schools, the recruit pool for students; research sends inventions known for the Technology score and officials-per-province effects |
| buildings | upstream | Customer–Supplier | Castles, granaries, building costs and upkeep in gold |
| warfare | downstream | Partnership | Soldiers by kind, horses, commanders (warfare §4), Fallen, army food refill (castles first), castles in sieges, victories; arms store, powder store, prisoners, troop cap, peace voices on the card (REALM-158) |
| recruiting | downstream | Customer–Supplier | Recruits and gold for levies; commanders from commissioned officials |
| diplomacy | downstream | Customer–Supplier | Allies, enemies, rivals, oaths broken, lands taken (diplomacy's leagues), envoy seats, pretenders, opinion, trust and notoriety, marriages, ruler traits, soldiers counted for strength |
| subjects | downstream | Customer–Supplier | Subjects and tribute; loyalty steps mirrored from lords; folding a subject in makes its ruler a lord |
| government | upstream | Customer–Supplier | Officials and lords caps, *Great lord* loyalty reason (REALM-162), succession by form (REALM-161), `admin_capacity` → officials cap |
| trade | upstream | Customer–Supplier | Trade income (deposits, fees, tolls); traders and trade ships replace merchants (REALM-157) |
| religion | upstream | Customer–Supplier | Faith %, faith steps in lord loyalty, preachers abroad |
| culture | upstream | Customer–Supplier | Tongue %, cousins counted half, kin lords' loyalty |
| rebellions | downstream | Customer–Supplier | Disloyal lords, lords' retinues and wealth for risings, in revolt counts |
| revolutions | upstream | Conformist | Regimes set forms; émigré pretenders |
| events | upstream | Anti-Corruption Layer | Event-tree country stats mapped by §11; ages driving women-in-roles multipliers |
| scenario-setup | upstream | Customer–Supplier | Starting counts from catalogue assessments and the relations file |
| national-strengths | upstream | Conformist | Levers such as `lord_loyalty_shield` |
| naval | downstream | Customer–Supplier | Ships counts (war and trade) |
| time-and-turns | upstream | Conformist | Weekly turn with monthly steps (X-18), seasons, end date for score judging |
| game-shell | downstream | Published Language | Scores, ranks and the campaign result for end-of-campaign screens |
| map-presentation | downstream | Published Language | Country card fields |

## 12. AI

- AI countries read the same counts as the player and do not cheat on food (country stats §11; warfare §15 cited for food).
- Opportunist: attacks when a neighbour's lords waver or its soldiers drop. Isolationist: fills its schools and avoids war. Hegemon seeker: keeps recruits for the army (§11).
- Rivals are targeted by the AI (§9).
- AI lords choose by traits and wants (§5.1); a disloyal lord can rebel or defect (§5.2).
- The realm AI picks its food preset by war or peace, sets its tax default, borrows only to cover a deficit, gifts a disloyal lord and grants fiefs it cannot staff (REALM-171).

## 13. Decisions and open questions

- **D-REALM-1** (was OQ-REALM-1) Trade v2 on the card: the card shows Traders and Trade ships instead of Merchants, Gold's trade income is deposits from traders, market fees and tolls, and `trade_access` gives starting traders; there is no grain market: surplus grain is sold to the realm's own treasury and grain bought from it at one fixed price (provisional 0.5 gold a food), which harvests, war, blockades and trade routes do not move. X-6 settles it.
- **D-REALM-2** (was OQ-REALM-2) Diplomacy's card edits: adopted; the card counts Envoy seats and envoys abroad, and shows Leagues against you and Pretenders at court; `opinion`, `trust` and `notoriety` are read from diplomacy. They are later designs adding lines for things diplomacy already runs.
- **D-REALM-3** (was OQ-REALM-3) Warfare's card edits and army refill: adopted; the card shows Arms store, Powder store, Prisoners, Victories / Defeats, Troop cap and Peace voices, soldiers are counted by kind, `war_weariness` reads Fallen and peace voices and `prestige` victories and lands taken; the default army refill becomes "Castles hand out first". Warfare is the later design and already runs these counts.
- **D-REALM-4** (was OQ-REALM-4) Succession, Great lord, admin capacity: the throne law follows the government form's succession (with daughters inheriting where the country's history allows); a lord with 4–7 provinces has one *Great lord* reason and 8+ two, each needing one more raising cause per step up; `admin_capacity` reads the officials cap. Government is the later design and says it settles inheritance.
- **D-REALM-5** (was OQ-REALM-5) Inheritance law: §8.2 stands as the decision for daughters and lords' land, with the throne law taken from the government form (D-REALM-4). The gap-list item is closed.
- **D-REALM-6** (was OQ-REALM-6) Win scores: two ways to win as X-12 says; army power is (foot × 1 + horse × 2 + guns × 3 + warships × 100 + commanders × 1,000) ÷ 1,000; settled provinces are land provinces with people; allies-by-marriage do not count; scores are worked out each January, domination wins at once and play may go on, at the end date the leader of each score wins with no margin and ties share. X-12 settles the rules; the weights are provisional.
- **D-REALM-7** (was OQ-REALM-7) Women in roles: base chances lord 5 %, commander 2 %, official 2 %, scholar 5 % (rulers only by succession), age multipliers ×1.5, ×2 and ×3 for the Ages of Revolutions, Industrialization and World Wars, and ×2 for a country an event or reform has raised; the Age of Decolonization is never reached; students stay men from recruits and scholars named to a role use the scholar chance. Provisional numbers that follow the 16 October decision's shape.
- **D-REALM-8** (was OQ-REALM-8) Tax scale: five steps, none, light, normal, heavy and crushing, set per province with a realm default. Province §8 is the later design and says it replaces the country rate.
- **D-REALM-9** (was OQ-REALM-9) Other designs' edits: all adopted: Faith counts the state faith or a faith layered with it, Preachers appear in Abroad and faith steps count in loyalty; Tongue counts cousins as half; the Subjects row names the six kinds (X-8); commanders can come from commissioned officials (X-7); building upkeep is a loss of Gold on the treasury card. Each is a later design's change to text this spec already holds.
- **D-REALM-10** (was OQ-REALM-10) Starting values: the catalogue's five assessment levels pick values from tables in the realm data (months of tax and trade for gold and a share of the levy ceiling for recruits, REALM-230; per thousand people for soldiers, horses, ships and scholars; shares for royal provinces, loyal lords and provinces in revolt; counts for commanders, traders and envoys), each spread by a factor drawn from the campaign's seeded Rng: ±25 % for low confidence, ±10 % medium, ±5 % high; major countries start with the great houses the data lists from the catalogue, others with one generated lord per 4 provinces. One table keeps balancing in data and the seed keeps every start reproducible.
- **D-REALM-11** (was OQ-REALM-11) Food year numbers: the harvest comes in September in the north and March in the south (X-4); each region rolls its weather once per harvest, 1 in 6 bad and 1 in 6 good; transfers lose 2 % per province; stores rot 5 % a season (2.5 % with a granary); reach is 1 ring (track or none), 2 (road, paved road), 3 (turnpike), 4 (railway); Frontier first and Capital first count the favoured castles' people double. Provisional numbers for every gap the food year had.
- **D-REALM-12** (was OQ-REALM-12) Windows: hard windows of 10, 30 and 20 years; "fading" means old entries drop out. The simpler rule and already what the code does.
- **D-REALM-13** (was OQ-REALM-13) Debt: interest 10 % a year, ×0.8 with T7 and ×0.7 with T12; a loan of at most one year's income (three with T10); lenders are banks (realms knowing T7), lords with wealth and other rulers; a lord lends for favours at no interest, and while owed his loyalty counts one step lower; each oath broken adds 10 % to the chance a lender or would-be ally refuses. Provisional numbers on the design's own lenders and effects.
- **D-REALM-14** (was OQ-REALM-14) Officials per province: one official runs 1 province with G1, 2 with G9, 3 with G16, plus one each for B2, G11 and T14, with no distance rule. The research tree is the later, more detailed text; dropping "near or far from the capital" keeps it simple.
- **D-REALM-15** (was OQ-REALM-15) Config file: `packages/rules/data/domain/realm.json`, with the keys of §10 and a `_provisional` list. The repo already holds it.
- **D-REALM-16** (was OQ-REALM-16) AI: Feed the people in peace and War footing at war; tax default normal in peace and heavy at war; a loan only when gold is below zero; a 20-gold gift to a disloyal lord when it can afford it; fiefs only for royal provinces its officials cannot run. The simplest rules that use the presets and counts the player sees.
- **D-REALM-17** (was OQ-REALM-17) Regency: the queen mother where she lives, otherwise the most loyal lord (then most provinces, then name); a ruler under 16 is a child. Both texts hold, in that order.
- **D-REALM-18** (was OQ-REALM-18) Commanders: the realm counts commanders from the origins warfare §4 lists, with Might, Cunning and Logistics; the repo pointer is dropped. X-7 settles it.

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
| REALM-155 | win-scores.feature | Leading by a wide margin does not end the campaign early |
| REALM-155 | win-scores.feature | Leading a score when the campaign ends |
| REALM-156 | country-card.feature | The card shows the rank in each score |
| REALM-157 | province-food.feature | The grain price is fixed; Grain is sold to and bought from the treasury |
| REALM-157 | abroad.feature | Merchants are replaced by traders |
| REALM-158 | abroad.feature | The card lines other designs added; The Subjects row names the six kinds; An envoy is an official abroad |
| REALM-159 | events-and-ai.feature | Event-tree country stats become concrete stats |
| REALM-160 | win-scores.feature | The Power score counts subjects at half |
| REALM-161 | ruler-and-family.feature | The government form sets the throne law; The player cannot choose the inheritance law |
| REALM-162 | ruler-and-family.feature | Great lords are harder to keep loyal |
| REALM-163 | women-in-roles.feature | Base chances per role; The chance rises with the ages; A reform raises one country's chance early |
| REALM-164 | treasury.feature | Interest and loan size; Broken oaths make others refuse |
| REALM-165 | treasury.feature | A lord who is owed money gets more demanding |
| REALM-166 | starting-values.feature | Catalogue assessments set starting counts; Low confidence widens the random range |
| REALM-166 | lords.feature | Starting lords |
| REALM-167 | food-year.feature | The harvest comes in by hemisphere; Weather odds per region; A castle's reach follows its roads; Food moving between castles loses some of its load; Stores rot each season, less with granaries |
| REALM-167 | food-policy.feature | Frontier and capital castles count double |
| REALM-168 | army-and-navy.feature | The window is hard |
| REALM-169 | people-and-land.feature | How many provinces one official runs |
| REALM-170 | ruler-and-family.feature | Who is regent |
| REALM-171 | events-and-ai.feature | What the AI does with its realm |
| REALM-172 | food-policy.feature | Armies at home take from their castle first by default |
| REALM-173 | win-scores.feature | World domination; Leading by a wide margin does not end the campaign early; Tied leaders share the win; A campaign that ends without a win |
| REALM-174 | treasury.feature | Five tax steps |
| REALM-175 | army-and-navy.feature | Commanders |
| REALM-176 | country-card.feature | The country card's General tab |
| REALM-177 | treasury-ledger.feature | Each province pays at its own rate or the realm default; Five rates, five sums |
| REALM-178 | treasury-ledger.feature | Trade does not follow the tax rate |
| REALM-179 | treasury-ledger.feature | The month's ledger |
| REALM-180 | treasury-ledger.feature | Officials are paid while they hold their posts |
| REALM-181 | treasury-ledger.feature | Borrowing up to a year's income; Repaying |
| REALM-182 | treasury-ledger.feature | The AI's treasury |
| REALM-183 | treasury-ledger.feature | Setting a province's rate from its card |
| REALM-184 | treasury-ledger.feature | The Treasury tab |
| REALM-185 | treasury-ledger.feature | The gold plaque opens the Treasury tab |
| REALM-187 | — | Covered by engine test (packages/engine/test/treasury.test.ts: tax and the lords) |
| REALM-186 | — | Presentation only: checked on phone screenshots in landscape (apps/client/scripts/treasury-shots.mjs) |
| REALM-190 | — | Presentation only: checked on phone screenshots in landscape (apps/client/scripts/lords-shots.mjs) |
| REALM-191 | — | Presentation only: checked on phone screenshots in landscape (apps/client/scripts/lords-shots.mjs) |
| REALM-192 | — | Presentation only: checked on phone screenshots in landscape (apps/client/scripts/lords-shots.mjs) |
| REALM-193 | — | Presentation only: checked on phone screenshots in landscape (apps/client/scripts/lords-shots.mjs) |
| REALM-194 | — | Presentation only: checked on phone screenshots in landscape (apps/client/scripts/lords-shots.mjs) |
| REALM-195 | — | Presentation only: checked on phone screenshots in landscape (apps/client/scripts/lords-shots.mjs) |
| REALM-188 | treasury-ledger.feature | Borrowing adds the interest to the debt at once; Repaying |
| REALM-189 | treasury-ledger.feature | Borrowing unsettles the lords, once a year |
| REALM-196 | starting-values.feature | Starting men spread over the realm, with commanders for its strength |
| REALM-197 | starting-values.feature | Starting men spread over the realm, with commanders for its strength |
| REALM-198 | — | Presentation only: checked on phone screenshots in landscape (apps/client/scripts/treasury-shots.mjs) |
| REALM-215 | harvests-and-supply.feature | Each province rolls its own harvest |
| REALM-216 | harvests-and-supply.feature | The region's weather is read by climate |
| REALM-217 | harvests-and-supply.feature | When a province harvests |
| REALM-218 | harvests-and-supply.feature | Armies eat more on campaign |
| REALM-219 | harvests-and-supply.feature | Armies refill from the province's store |
| REALM-220 | harvests-and-supply.feature | Failed harvests are reported |
| REALM-221 | — | Presentation only: checked on phone screenshots in landscape (apps/client/scripts/food-shots.mjs) |
| REALM-222 | — | Presentation only: checked on phone screenshots in landscape (apps/client/scripts/food-shots.mjs) |
| REALM-230 | starting-values.feature | The world starts each realm from its assessments |
| REALM-231 | starting-values.feature | AI realms call men only with someone to lead them |
| REALM-232 | — | Presentation only: the Heritage tab captions (apps/client/src/ui/heritage.test.ts) |
