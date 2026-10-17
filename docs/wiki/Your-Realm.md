# Your Realm

Your realm is your country as a whole: the treasury, the food network that runs through your castles, your people and land, your named lords, your army and navy at a glance, your ruler and family, your standing abroad, and how a campaign is won. Most of what the realm shows is the sum of its [Provinces](Provinces), gathered on one country card where every number is something you can count, with a list of how you gain it and how you lose it.

## How it works

### The country card

The country card has four tabs: **General** first, then **Diplomacy**, **Trade** and **Army**. General is the one-screen summary of your country; Allies, Enemies and Oaths broken sit on the Diplomacy tab, where war and peace are declared, trade lines on Trade, and soldiers, commanders and ships on Army. France's General tab in 1444 might look like this:

```
 FRANCE                     King Charles VII, 41 · 23 years on throne · 2 heirs
 Gold      310          Food      9 castles feeding 41 of 52 provinces · 3 hungry
 People    9.5 m        Soldiers  22,000      (+48,000 recruits)
 Horses    6,000        Ships     12 war / 60 trade
 Castles   31           Officials 40 for 18 royal provinces
 Lords     11 named: 7 loyal, 3 wavering, 1 disloyal
 Schools   4 (200 students, 35 scholars) · studying: Bastion forts 62 %
 Faith     96 %         Tongue   71 %        In revolt 2
 Allies 2  Enemies 1  Oaths broken 0       Fallen (10 yrs) 31,000
```

It shows the ruler (title, name, age, years on throne, heirs), Gold, Food (how many castles feed how many provinces, and how many are hungry), People, Soldiers (plus recruits), Horses, Ships (war and trade), Castles, Officials (for how many royal provinces), Lords (named, by loyalty), Schools (students, scholars, current study and progress), Faith, Tongue, In revolt, Allies, Enemies, Oaths broken, Fallen in the last 10 years, and your rank in each win score.

People, recruits, food, horses, ships, castles, faith, tongue, in revolt, schools and officials are always **sums over your provinces**, never stored separately. Every number here is a placeholder until balanced.

### Treasury

**Gold** is the coins in your treasury.

| You gain gold by | You lose gold by |
|---|---|
| Taxes from royal provinces | Soldiers' pay (every month) |
| A share of lords' taxes | Officials' wages |
| Trade | School upkeep |
| Tribute from subjects | Building |
| Selling grain | Debt interest |
| Loot and ransoms | Gifts and bribes |
| Selling titles | Buying grain |

**Debt** records how much you owe and to whom: a bank, a merchant city, a lord or another ruler. You take it on with a loan, or when lords lend in exchange for favours. It goes away when you repay it, when the lender dies or is conquered, or when you **default**. Debt costs yearly interest. Defaulting wipes the debt but counts as an **oath broken**. A lord you owe money to gets more demanding.

**Tax** is set per province, with a realm default (see [Provinces](Provinces)). A revolt can force it down. Heavy taxes fill the treasury but make lords waver and provinces revolt.

#### Tax and the treasury in play

Every province pays at its own tax rate or, until you give it one, at your realm's default, which starts at normal. Against normal, **none** pays nothing, **light** half, **heavy** one and a half times and **crushing** double. A province whose official has been made a commander pays half. Trade from the province's wealth comes in whatever the rate.

The treasury keeps a **ledger** for the month: Tax and Trade coming in, Army pay, Officials and Interest going out. Their sum is your change a month, paid in on the 1st. Each official at his post earns 0.1 gold a month; a commissioned official draws no wage while he commands. Wages and interest are paid a twelfth each month.

Lenders give up to **one year's tax and trade**, less what you already owe, at **10 % a year**. You can repay any part at any time.

AI realms tax at normal in peace and heavy at war, borrow only when their gold falls below zero, and repay once they hold a year's army pay and wages.

Where to find it: the gold plaque at the top of the screen shows your gold and change a month; tap it for the **Treasury** tab of your country card, with the ledger, the realm tax default, your debt and the Borrow and Repay buttons. To tax one province differently, open it: its Overview tab has a Tax line and a row of rate buttons, from *Realm default* to *Crushing*.

### Food: provinces grow it, castles move it

Food lives in provinces: each grows, stores and eats its own. **Castles are the hubs** that collect it and spread it.

**In each province:**

- **Harvest**: bumper, good, normal, poor or failed. Better with farmland, people working it, inventions and peace; worse with weather, armies marching through, burned tiles, plague killing farmers and cold periods. It is the province's main food each autumn.
- **Local store**, in months of food: filled by what is left after collection and by castle deliveries; emptied by people eating, armies refilling their reserve, yearly rot and raids. When it hits zero, the province starves.
- **Herds** (pastoral provinces), in thousands of head: grown on good pasture, by raiding and tribute; lost to drought, hard winters, raids, disease and slaughter in famine. Pastoral peoples eat from herds, which move with their owners and can't be besieged.
- **Fish** (coastal provinces): a steady catch, improved by salting inventions, lost to blockade and war at sea.
- **Grain price** at each market, per sack: up with bad harvests across the region, war and blockades; down with good harvests and trade routes. You can buy and sell grain for gold.

**In each castle:**

- **Castle store**: filled by collection, deliveries from other castles and buying; emptied by feeding the garrison, spreading to the land around, handing out to armies refilling at home, rot and capture.
- **Granary size**: raised by building granaries (gold) and inventions such as *Ever-normal granaries*; lowered by siege damage and neglect. Bigger granaries hold more and rot less.
- **Reach**, in rings of provinces: raised by roads, rivers, canals, wagons (horses) and research; cut by enemy armies on the roads, winter and burned land.

A province outside every castle's reach lives on its own harvest.

### The Food policy screen

One **Food policy** sets realm-wide defaults, and any castle can have its own value for any setting.

| Setting | Options |
|---|---|
| **Collection**: share of each province's surplus sent to the nearest castle | 0 %, 25 %, 50 %, 75 % |
| **Castle shares**: how collected food is divided between castles | by people, frontier first, capital first, equal, or custom (a slider per castle, summing to 100 %) |
| **Spread pattern**: how a castle hands out food by ring (own province / next ring / ring beyond) | default 50/30/20; Tight 80/20/0; Wide 30/35/35 |
| **Siege reserve**: months a castle keeps and never spreads | 0, 3, 6, 12 |
| **Army refill**: how armies refill their own reserve at home | locals only (default, from the local store), castles hand out first, no refill in lords' lands |
| **Famine rule**: below this, a province's castle feeds it first, ignoring the spread | off, 1 month, 3 months |
| **Surplus** above granary size | keep (it rots), sell on the market, send to the capital castle, send to subjects or allies |

**Lords' castles** follow the policy by loyalty: loyal lords follow it, wavering lords half of it, disloyal lords keep their food.

**Presets** fill the whole screen at once:

| Preset | Collection | Castle shares | Spread | Siege reserve | Army refill |
|---|---|---|---|---|---|
| Feed the people | 25 % | by people | Wide | 3 months | castles hand out first |
| Fortress realm | 50 % | frontier first | Tight | 12 months | locals only |
| War footing | 75 % | frontier first | 50/30/20 | 6 months | castles hand out first |
| Merchant | 50 % | capital first | 50/30/20 | 3 months | no refill in lords' lands; surplus sold |

### The year of food

1. **Autumn**: every province rolls its harvest. Weather is rolled by region, so neighbours suffer together and grain prices rise for all of them.
2. **Collection**: the collection share of each province's surplus goes to its nearest castle in reach.
3. **Castle shares**: castles exchange food until each holds its share. Food moving between castles loses some of its load for every province it travels.
4. **Spread**: each castle keeps its siege reserve and hands out the rest to the rings around it by the spread pattern.
5. **Through the year** people eat. Soldiers on campaign eat double, and a horse eats like three men. Stores rot a little each season, less with granaries.

**Under pressure:**

- A besieged castle stops spreading and lives on its own store.
- An enemy army sitting between a castle and its outer ring stops food spreading past it, so cutting the roads starves the outer ring without a battle.
- Rice lands get two harvests on irrigated land, but war can wreck their canals. Maize, potatoes and cassava arrive through the research tree after Atlantic contact.
- When a province runs out of food, people die, survivors flee to neighbours or abroad, revolts become likely, and the lord of that land turns disloyal. The event tree's famine events read the same stores.
- You can burn your own fields ahead of an invader (scorched earth) to starve him.

### People and land

| Stat | Gained by | Lost by |
|---|---|---|
| **People** (thousands, summed over provinces) | Growth when fed and at peace; migrants fleeing famine or war elsewhere; conquest | Famine, plague, war deaths, refugees leaving, forced migration events |
| **Provinces held** | Conquest, inheritance, purchase, a lord joining with his land, colonies | Losing wars, a lord defecting, revolts breaking away, ceding in peace |
| **Royal provinces** | A lord's line dying out, seizing a lord's land, conquest kept for yourself | Granting land to make a new lord |
| **Officials** | Hiring (gold up front, wages yearly), school graduates | Dismissal, unpaid wages, war in their province |
| **Faith** (% sharing the ruler's religion) | Missionaries and clergy, schools of your faith, migrants of your faith, conversion events | Conquering other faiths, reformations, foreign missionaries |
| **Tongue** (% sharing the ruler's culture) | Slow assimilation, settlers, schools | Conquest, migration, separatist movements |
| **In revolt** (provinces with riots or rebels) | Heavy taxes, famine, foreign faith or tongue, disloyal lords stirring, lost wars | Defeating rebels, giving in, lowering taxes, food |

Each province needs an official or a lord to pay properly. A royal province gives full taxes and recruits, but **without an official it pays half taxes and gives half recruits**. One official runs one province with G1, two with G9 and three with G16, plus one more each for B2, G11 and T14. A low Faith share means religious revolts and wavering clergy lords; a low Tongue share means separatist revolts and slower officials. Provinces in revolt lose taxes and recruits and spread trouble to neighbours.

### Lords

Each lord is a named character with a card:

```
 Duke Philip of Burgundy        House Valois-Burgundy, age 48
 Lands: 6 provinces    Retinue: 4,000 men    Wealth: 220 gold
 Traits: Ambitious, Rich       Loyalty: Wavering
 Wants: the county of Champagne
```

| Field | Meaning |
|---|---|
| Lands | Provinces he governs, always at least one, run by his own officials |
| Retinue | His own soldiers from his lands; he brings them when called, if loyal |
| Wealth | His own gold; he can lend to you or fund a revolt |
| Traits | Two words that shape what he wants and how he reacts |
| Want | One concrete goal: a province, an office, a marriage, lower taxes, a war against someone |
| Loyalty | Loyal, Wavering, Disloyal, In revolt |
| Heir | Who inherits his land |

The lord card is the same in every society; only the label changes: nobles, merchant houses in city republics, bishops and abbots in theocracies, clan chiefs on the steppe, elders and lineage heads in chiefdoms and stateless societies.

**Lords versus officials.** A lord costs no gold, but keeps half the taxes of his provinces and keeps their recruits as his retinue. He obeys according to his loyalty, and can be removed only by force, a trial or his line dying out.

**How you gain lords:**

- **Grant a fief** of one or more royal provinces to a commander, relative, favourite or loyal official: a new loyal lord, whose provinces no longer need an official.
- **Keep a defeated local ruler** after a conquest: he becomes a lord who starts disloyal, with no officials needed and the people calm.
- **Sell a title**: a rich merchant buys a province as a fief, giving gold now and a weak but loyal lord.
- **Marriage** can bring a foreign or local house in as a lord with its land.
- When a lord dies with several sons, his lands pass by the realm's inheritance law, possibly split between them.
- A disloyal lord across the border can **defect to you** with his land.
- At the start, major countries have their historical great houses from the catalogue, and smaller countries a few generated lords sized to their realm.

**How you lose lords:**

- His line dies out: his land returns as royal provinces needing officials.
- You **seize his land** by decree: other lords waver, and he may rebel.
- You **try and execute** a disloyal lord: all lords of his house become disloyal.
- His revolt is defeated: his land returns to you, or to a loyal claimant you pick.
- A disloyal lord **defects** to a neighbour with his provinces, or rebels.
- Two lords' houses join by marriage and merge into one bigger lord.

**Loyalty:**

| Rises with | Falls with |
|---|---|
| Granting his want | Heavy or crushing taxes |
| Gifts of gold, offices at court | Seizing land from him or another lord |
| Marriages into the ruling house | Lost wars and battles |
| Victories he took part in | A child ruler, a disputed heir or a new ruler |
| A long secure reign with a clear heir | Requisitioning his grain |
| Feeding his lands in famine | A foreign rival's bribes and promises |
| Sharing your faith and tongue | |

Paying for a building in a lord's province raises his loyalty one step. A famine in his land turns him disloyal; riots or a heavy demand on his province make him waver. At New Year, each lord over the government's cap drops one loyalty step (see [Government](Government)).

### Army and navy at a glance

| Stat | Gained by | Lost by |
|---|---|---|
| **Soldiers** (foot, horse, later guns) | Raising recruits (gold), hiring paid companies, lords bringing retinues | Battle deaths, disease and hunger on campaign, desertion when unpaid or unfed, disbanding. They cost gold every month and eat grain |
| **Recruits** | Each year from people in royal provinces, and students leaving school | Raising soldiers, sending young men to school, famine, plague. The army and schools share them |
| **Horses** | Breeding on grassland, buying from steppe and Arabian traders, herds, capture | Battle, fodder shortages, disease. They cap how many horsemen you field, and wagons move grain |
| **Ships** (war and trade) | Building in ports (timber provinces help), capture, hiring | Battle, storms, rot without upkeep, blockade. Warships fight and blockade; trade ships earn gold and fish and carry armies |
| **Castles** | Building, conquest | Sieges, neglect, demolition in a peace |
| **Commanders** (Might, Cunning, Logistics) | Hiring, a lord or heir taking command, promotion after victory | Death in battle, old age, capture |
| **Fallen** | Your soldiers killed in battles and sieges in the last 10 years | Many dead push people and lords toward peace and slow recruit refills |

The details live in [Recruiting](Recruiting), [Warfare](Warfare) and [Naval](Naval).

### Ruler and family

- **Age** rises each year, and old rulers die. A child ruler needs a regent: a lord, or a queen mother.
- **Years on throne** rise each year and reset on death, deposition or abdication. New rulers start with more wavering lords.
- **Heirs** are gained by births, marriages and adopting or naming an heir; lost by death, marrying daughters abroad, and heirs going over to a rebel lord. If the ruler dies with no heir, the realm falls into a **succession war** among the lords.
- **Traits**: two (for example Pious, Warlike, Builder, Greedy), given at birth and sometimes gained or rarely changed by events. They give small bonuses and lean event options.
- **Marriages** are living ties to other ruling houses and your own lords, arranged with an heir or a princess, ended by death, divorce events and war between the houses. They give goodwill, loyalty and a path to inheriting another realm.

**Women in roles.** Women can hold every role: ruler, lord, commander, official, scholar. The chance is set per country (or culture) per role from the catalogue's history and succession customs. Where the crown passes only through men (France), no woman inherits the throne, though a duke's daughter can inherit his duchy; where a daughter could inherit (Castile, Navarre), a queen regnant is possible. Wherever a ruler is a child, a queen mother can be regent. The chance rises as history's ages arrive: a little in the Age of Revolutions, more in the Age of Industrialization, more again in the Age of World Wars, and events and reforms can raise one country's chance earlier. Women who held roles in 1444 or appear in events are placed as they were; the chances apply only to characters the game generates.

**Inheritance law** is fixed by each country's culture and history from the catalogue. You can't choose it, though events and reforms can change it. It decides who takes the throne (eldest son, eldest child, a brother or the eldest of the house, the strongest claimant among the lords, or an election by lords or a council) and whether a lord's land passes to one heir or is split among his sons.

### Abroad

| Stat | Gained by | Lost by |
|---|---|---|
| **Allies** | An envoy's alliance mission, marriages, peace terms | Breaking the alliance, war between you, a rival bribing them away. Called into your wars |
| **Enemies** | Declaring war or being attacked | Making peace |
| **Rivals** (competing for a throne, a province, a trade city) | A contested claim or border dispute | Settling it, or one side destroyed. The AI targets them, and wars against them please your lords |
| **Subjects** (vassals and tributaries) | Forcing it in a peace; a weak neighbour asking for protection | Their independence war, release, annexation. They give tribute in gold or grain, and troops |
| **Oaths broken** (last 30 years) | Broken truces, abandoned allies, debt defaults | Time. Others refuse alliances and loans |
| **Lands taken** (last 20 years) | Provinces seized | Giving land back, time. When high, neighbours band together against you |
| **Envoys** | Officials sent abroad, one mission each (alliance, marriage, peace, gift) | The mission ending; killed or held abroad |

While an envoy is abroad he runs no province, so his province pays half until he returns. The old *Merchants* stat is replaced by [Trade](Trade)'s traders and trade ships.

### Starting values

At the start, the catalogue's assessments set your counts: economic strength and fiscal resilience give gold and debt; manpower potential recruits; military capability soldiers, commanders and horses; naval capability ships; administrative capacity officials and royal provinces; political stability and unrest risk lords' loyalty and provinces in revolt; territorial cohesion the number of lords, their land and tongue; institutional development schools, scholars and inventions; trade access starting trade; diplomatic influence extra officials ready as envoys. A low-confidence record starts with a wider random range. Allies, rivals, subjects and enemies come from the 1444 relations file. See [The 1444 Start](The-1444-Start).

### Events and the AI

The event tree's abstract country stats each map to concrete realm stats: legitimacy to loyal lords, heirs and years on throne; stability to loyal lords and provinces in revolt; war weariness to Fallen; prestige to battles won and lands taken; administrative capacity to officials; technology and innovation to inventions; literacy to scholars and schools per thousand people; food security to stores, harvest and herds; debt and treasury to debt and gold; navy strength and naval reach to warships; army strength and manpower to soldiers and recruits.

The AI reads the same counts as you and doesn't cheat on food. An **opportunist** (the Ottomans eyeing Hungary) attacks when a neighbour's lords waver or its soldiers drop; an **isolationist** (Korea) fills its schools and avoids war; a **hegemon seeker** (France) keeps its recruits for the army.

### How a campaign is won

You win by **world domination** or by **leading one of three scores**, each built only from realm stats:

| Score | Built from |
|---|---|
| **Economy** | Yearly income (taxes, lords' share, trade, tribute) plus the bank (gold minus debt) |
| **Power** | Provinces held (subjects' provinces count half) plus army power (soldiers weighted by kind, warships, commanders) |
| **Technology** | Inventions known, each weighted by its era cost; nothing removes a known invention |

- **World domination**: you, your subjects and your allies-by-marriage hold 60 % of the world's settled provinces.
- **Score victory**: lead a score by 50 % over second place for 25 years, or lead it when the campaign's end date (default 31 August 1939) arrives.

All three thresholds are placeholders. Army power counts foot as 1, horse as 2, guns as 3, a warship as 100 men and a commander as 1,000. Scores are checked every January. A domination win happens at once and you may play on. At the end date the leader of each score wins, and ties share the win.

### Each month

A turn is one week. These steps run once a month, in the turn in which a new month begins.

| Cadence | What happens |
|---|---|
| Monthly | Pay soldiers; add income; desertion if unpaid or unfed; apply loyalty causes; check the ruler's death and succession; check score victory |
| Each season | Eating and rot of castle and local stores; famine rule releases |
| Each autumn | Harvest roll by region, collection, castle shares, spread |
| Yearly | Debt interest; officials' wages; recruits refill; ruler and lords age; years on throne; old entries drop out of Fallen, Oaths broken and Lands taken |
| New Year | Lords over the cap lose a loyalty step |

## What you see

- **The country card**, as above, including your rank in each score.
- **The lord card** for each named lord.
- **The Food policy screen**, with realm defaults, per-castle overrides and the four presets.
- **The treasury**: gold, debt and lenders.

Things you can do: set food policy, override a castle, apply a food preset; take a loan, repay or default; hire and dismiss officials; grant a fief, keep a local ruler, sell a title; seize a lord's land, put a disloyal lord on trial; give a lord gold, an office or a marriage, or grant his want; call a loyal lord's retinue; name an heir; burn your own fields.

## How it connects

- [Provinces](Provinces): province sums, tax reaching you, stores and harvests, grievances that make lords waver; the realm sends food policy, castle deliveries and fief grants.
- [Research](Research): gold for schools and the recruit pool for students; inventions feed the Technology score and officials-per-province effects.
- [Buildings](Buildings): castles, granaries, building costs and upkeep.
- [Warfare](Warfare): soldiers, horses, commanders, Fallen, army food refill, sieges, victories.
- [Recruiting](Recruiting): recruits and gold for levies; commanders.
- [Diplomacy](Diplomacy): allies, enemies, rivals, oaths broken, lands taken, envoys, marriages.
- [Subjects](Subjects): subjects and tribute; folding a subject in makes its ruler a lord.
- [Government](Government): officials and lords caps, succession by form, lords over the cap.
- [Trade](Trade): trade income (deposits, fees, tolls); traders and trade ships replace merchants.
- [Religion](Religion) and [Culture](Culture): faith and tongue shares and their effects on lords.
- [Rebellions](Rebellions): disloyal lords, retinues and wealth for risings, in revolt counts.
- [Revolutions](Revolutions): regimes set forms; émigré pretenders.
- [Historical Events](Historical-Events): event country stats mapped as above; ages raise women-in-roles chances.
- [The 1444 Start](The-1444-Start): starting counts from assessments and relations.
- [National Strengths](National-Strengths): levers such as a lord loyalty shield.
- [Naval](Naval): ship counts.
- [Time and Turns](Time-and-Turns): weekly turns with monthly steps, seasons, the end date for judging scores.
- [Screens and Navigation](Screens-and-Navigation): scores, ranks and the campaign result for the end screens.
- [Achievements](Achievements): score updates and campaign wins.
- [Map and Lenses](Map-and-Lenses): country card fields.

## Numbers

All realm numbers are placeholders, kept in one realm data file.

| Value | Config key | Design value | Provisional? |
|---|---|---|---|
| Collection options | `food.collection.options` | 0 / 25 / 50 / 75 % | Yes |
| Castle share rules | `food.castle_shares.options` | by people, frontier first, capital first, equal, custom | No |
| Spread patterns | `food.spread.default` / `presets` | 50/30/20; Tight 80/20/0; Wide 30/35/35 | Yes |
| Siege reserve | `food.siege_reserve.options` | 0 / 3 / 6 / 12 months | Yes |
| Army refill | `food.army_refill.options` | locals only, castles first, no refill in lords' lands | No |
| Famine rule | `food.famine_rule.options` | off / 1 / 3 months | Yes |
| Surplus | `food.surplus.options` | keep, sell, capital castle, subjects or allies | No |
| Lords' castles | `food.lords_castles` | loyal all, wavering half, disloyal none | Yes |
| Presets | `food.presets` | four, as above | Yes |
| Soldiers on campaign eat | `food.campaign_eat` | ×2 | Yes |
| A horse eats like | `food.horse_eats` | 3 men | Yes |
| Loss moving food between castles | `food.transfer_loss_per_province` | not given | Yes |
| Store rot | `food.rot_per_season` | "a little" | Yes |
| Tax steps | `tax.rates` | none / light / normal / heavy / crushing | No |
| Gold at each tax step | `economy.taxRateFactor` | not given; 0, ½, 1, 1½, 2 times normal | Yes |
| An official's wage | `economy.officialWagePerMonth` | not given; 0.1 gold a month | Yes |
| Loans | `debt` | 10 % a year; up to a year's income | Yes |
| Royal province without official | `officials.no_official_share` | half tax, half recruits | Yes |
| Lord keeps | `lords.tax_share` | half | Yes |
| Fallen window | `fallen.window_years` | 10 years | Yes |
| Oaths broken window | `oaths.window_years` | 30 years | Yes |
| Lands taken window | `lands_taken.window_years` | 20 years | Yes |
| Women in roles | `women_in_roles` | not given | Yes |
| Age multipliers | `age_multipliers` | not given | Yes |
| World domination | `win.domination_share` | 60 % | Yes |
| Score lead | `win.score_margin` | 50 % | Yes |
| Years leading | `win.score_years` | 25 | Yes |
| Subjects in Power | `win.subject_province_weight` | ½ | Yes |
| End date | `campaign.end_date` | 31 August 1939 | No (decided) |

## Decided since the first draft

- Tax has five steps: none, light, normal, heavy and crushing. You set them per province, with a realm default.
- There is no grain market: surplus grain is sold to your own treasury, and missing grain is bought from it, at a fixed price.
- Armies refill from castles first by default.
- The throne passes by your government form's succession rule. A lord with 4 to 7 provinces has one *Great lord* reason to waver; one with 8 or more has two.
- Women can be lords (5 %), commanders (2 %), officials (2 %) or scholars (5 %). These chances grow ×1.5, ×2 and ×3 in the last three ages.
- Loans cost 10 % a year, less with banking inventions, and are capped at one year's income (three with T10). Each broken oath adds 10 % to the chance a lender refuses.
- The harvest comes in September in the north and in March in the south. Each region rolls its weather once a harvest: 1 in 6 bad, 1 in 6 good.
- A child ruler, under 16, rules through the queen mother, or else through the most loyal lord.
- Starting counts come from each country's assessments, with a seeded spread for countries we know less about.

## Still open

Nothing. Every question about the realm has been decided; numbers marked as placeholders are tuned during balancing.


## For developers

- Spec: [`domain/realm/spec.md`](https://github.com/grrts/pocket-hedgemony/blob/claude/domain-specs-bdd-ebdpmx/domain/realm/spec.md), requirement code **REALM** (REALM-001 to REALM-156).
- Features: `domain/realm/features/` (country-card, treasury, province-food, castle-food, food-policy, food-year, people-and-land, lords, army-and-navy, ruler-and-family, women-in-roles, abroad, starting-values, events-and-ai, win-scores).
- Code: rules code for this context goes in `packages/engine/src/domain/realm/`, balance numbers in `packages/rules/data/domain/realm.json`. Today's engine keeps each nation's treasury and levies in `packages/engine/src/world.ts` and runs income and upkeep in `runEconomy` in `packages/engine/src/turn.ts`.
