# Your Realm

Your realm is your country as a whole: the treasury, the food network that runs through your castles, your people and land, your named lords, your army and navy at a glance, your ruler and family, your standing abroad, and how a campaign is won. Most of what the realm shows is the sum of its [Provinces](Provinces), gathered on one country card where every number is something you can count, with a list of how you gain it and how you lose it.

## How it works

### The country card

The country card has four tabs: **General** first, then **Diplomacy**, **Trade** and **Army**. Your own realm's card is the Realm book, in six sections that open on the Overview (see [Screens and Navigation](Screens-and-Navigation)); another realm's card keeps these tabs. General is the one-screen summary of your country; Allies, Enemies and Oaths broken sit on the Diplomacy tab, where war and peace are declared, trade lines on Trade, and soldiers, commanders and ships on Army. France's General tab at the start might look like this:

```
 FRANCE                     King Charles V, 40 · 14 years on throne · 1 heir
 Gold      310          Food      9 castles feeding 41 of 52 provinces · 3 hungry
 People    9.5 m        Soldiers  22,000      (+48,000 recruits)
 Horses    6,000        Ships     12 war / 60 trade
 Castles   31           Officials 40 for 18 royal provinces
 Lords     11 named: 7 loyal, 3 wavering, 1 disloyal
 Schools   4 (200 students, 35 scholars) · studying: Bastion forts 62 %
 Faith     96 %         Language   71 %        In revolt 2
 Allies 2  Enemies 1  Oaths broken 0       Fallen (10 yrs) 31,000
```

It shows the ruler (title, name, age, years on throne, heirs), Gold, Food (how many castles feed how many provinces, and how many are hungry), People, Soldiers (plus recruits), Horses, Ships (war and trade), Castles, Officials (for how many royal provinces), Lords (named, by loyalty), Schools (students, scholars, current study and progress), Faith, Language, In revolt, Allies, Enemies, Oaths broken, Fallen in the last 10 years, and your rank in each win score.

People, recruits, food, horses, ships, castles, faith, language, in revolt, schools and officials are always **sums over your provinces**, never stored separately. Every number here is a placeholder until balanced.

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

Every province pays at its own tax rate or, until you give it one, at your realm's default, which starts at normal. Against normal, **none** pays nothing, **light** half, **heavy** one and a half times and **crushing** double. A province whose official has been made a commander pays half, and so does one that riots or plots. Heavy tax gives the province the *Heavy taxes* grievance, and crushing counts as two. A lord's province gives you only your share, and raising its rate to heavy or crushing makes its lord waver. A busy province owes more: every 4 points of its trade ratio add 1 %. Trade itself comes from your traders (see [Trade](Trade)), whatever the rate.

The treasury keeps a **ledger** for the month: Tax and Trade coming in, Army pay, Officials and Interest going out. Their sum is your change a month, paid in on the 1st. Each official at his post earns 0.1 gold a month; a commissioned official draws no wage while he commands. Wages and interest are paid a twelfth each month.

Lenders let you owe up to **one year's tax and trade**. A loan costs at once: the gold you borrow **plus 10 % interest** goes onto your debt the moment you take it, and the debt keeps costing **10 % a year** while you owe it. Borrowing also makes the crown look weak: **every lord falls a step in loyalty**, at most once a year. You can repay any part at any time.

AI realms tax at normal in peace and heavy at war, borrow only when their gold falls below zero, and repay once they hold a year's army pay and wages.

Where to find it: the gold plaque at the top of the screen shows your gold and change a month; tap it for the **Treasury** tab of your country card: your purse with how long the gold lasts, the month's gold in and out as bars, the realm tax default, and your debt as a meter against what lenders allow, with Borrow buttons that say what you will owe before you tap. To tax one province differently, open it: its Overview tab has a Tax line and a row of rate buttons, from *Realm default* to *Crushing*.

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

One **Food policy** sets realm-wide defaults on the realm's **Food** tab, and a castle can have its own collection and siege reserve. Set those on the castle's own province, under **Castle food** on its Overview; tapping a castle on the Food tab takes you there, and **Realm** puts it back on the realm's setting. The Food page shows how many provinces are hungry or running low and the presets; the five settings sit in a **Customise** fold whose line reads your current choices, and the castles in a **Castles** fold that opens by itself while one is besieged or its roads are cut.

| Setting | Options |
|---|---|
| **Collection**: share of each province's surplus sent to the nearest castle | 0 %, 25 %, 50 %, 75 % |
| **Castle shares**: how collected food is divided between castles | by people, frontier first, capital first, equal, or custom (a slider per castle, summing to 100 %) |
| **Sharing out**: how a castle hands out food by ring (own province / next ring / ring beyond) | default 50/30/20; Tight 80/20/0; Wide 30/35/35 |
| **Siege reserve**: months a castle keeps and never spreads | 0, 3, 6, 12 |
| **Army refill**: how armies refill their own reserve at home | locals only (default, from the local store), castles hand out first, no refill in lords' lands |
| **Famine relief**: below this, a province's castle feeds it first, ignoring how food is shared out | off, 1 month, 3 months |
| **Surplus** above granary size | keep (it rots), sell on the market, send to the capital castle, send to subjects or allies |

**Lords' castles** follow the policy by loyalty: loyal lords follow it, wavering lords half of it, disloyal lords keep their food.

**Presets** fill the whole screen at once:

| Preset | Collection | Castle shares | Sharing out | Siege reserve | Army refill |
|---|---|---|---|---|---|
| Feed the people | 25 % | by people | Wide | 3 months | castles hand out first |
| Fortress realm | 50 % | frontier first | Tight | 12 months | locals only |
| War footing | 75 % | frontier first | 50/30/20 | 6 months | castles hand out first |
| Merchant | 50 % | capital first | 50/30/20 | 3 months | no refill in lords' lands; surplus sold |

### The year of food

1. **Autumn**: every province rolls its harvest. Weather is rolled by region, so neighbours suffer together and grain prices rise for all of them.
2. **Collection**: the collection share of each province's surplus goes to its nearest castle in reach.
3. **Castle shares**: castles exchange food until each holds its share. Food moving between castles loses some of its load for every province it travels.
4. **Sharing out**: each castle keeps its siege reserve and hands out the rest to the rings around it by its sharing-out pattern.
5. **Through the year** people eat. Soldiers on campaign eat double, and a horse eats like three men. Stores rot a little each season, less with granaries.

**Under pressure:**

- A besieged castle stops spreading and lives on its own store.
- An enemy army sitting between a castle and its outer ring stops food spreading past it, so cutting the roads starves the outer ring without a battle.
- Rice lands get two harvests on irrigated land, but war can wreck their canals. Maize, potatoes and cassava arrive through the research tree after Atlantic contact.
- When a province runs out of food, people die, survivors flee to neighbours or abroad, revolts become likely, and the lord of that land turns disloyal. The event tree's famine events read the same stores.
- You can burn your own fields ahead of an invader (scorched earth) to starve him.

### Harvests and army supply in the game today

- **Each province rolls its own harvest**: 1 in 10 poor, 7 in 10 normal, 15 in 100 good and 1 in 20 bumper. Its region's weather, an enemy in the province and your harvest inventions then move it a step each, so a failed harvest comes from a poor roll in a bad year, or bad weather with an enemy at the gates.
- **Weather depends on the climate.** A region rolls once, and each province reads it by its climate: temperate land has bad weather 1 year in 6, dry land (desert, drylands, savanna) a drought 1 in 4, and the monsoon lands of Asia floods 1 in 5. Neighbours still suffer together.
- **When the harvest comes in**: once a year in September in the north and March in the south. Rice lands from India to South China and the Indies harvest in both March and September once their realm knows *Wet-rice terracing*, each harvest bringing half the year's food, so one bad season costs only half. The tundra grows no crops; it lives on herds, hunting and fishing, which bring food every month.
- **Armies eat from the land.** A man eats a month of food a month at home, double on campaign (while your realm is at war or the army is abroad), and a horse like three men. An army refills its wagons from the store of the province where it stands. In your own or friendly land the locals keep two months for themselves; in enemy land the foragers take what they find on that ground. What an army takes leaves the store, so a long stay or a march through poor land brings hunger to the province, and then to the army.
- **Where you see it**: the province card's Overview shows the last harvest and why ("poor · drought in the region"), when it comes in, and how many months of the store the armies standing there eat a month. The Provinces tab counts your last harvests and marks poor and failed ones on each row. A failed harvest sends a news item. The army's supply line says how long its wagons last, whether it eats double on campaign, and what the land there gives it. The Food map mode shows how many men on campaign each province could feed.

### People and land

| Stat | Gained by | Lost by |
|---|---|---|
| **People** (thousands, summed over provinces) | Growth when fed and at peace; migrants fleeing famine or war elsewhere; conquest | Famine, plague, war deaths, refugees leaving, forced migration events |
| **Provinces held** | Conquest, inheritance, purchase, a lord joining with his land, colonies | Losing wars, a lord defecting, revolts breaking away, ceding in peace |
| **Royal provinces** | A lord's line dying out, seizing a lord's land, conquest kept for yourself | Granting land to make a new lord |
| **Officials** | Hiring (gold up front, wages yearly), school graduates | Dismissal, unpaid wages, war in their province |
| **Faith** (% sharing the ruler's religion) | Missionaries and clergy, schools of your faith, migrants of your faith, conversion events | Conquering other faiths, reformations, foreign missionaries |
| **Language** (% sharing the ruler's culture) | Slow assimilation, settlers, schools | Conquest, migration, separatist movements |
| **In revolt** (provinces with riots or rebels) | Heavy taxes, famine, foreign faith or language, disloyal lords stirring, lost wars | Defeating rebels, giving in, lowering taxes, food |

Each province needs an official or a lord to pay properly. A royal province gives full taxes and recruits, but **without an official it pays half taxes and gives half recruits**. One official runs one province with G1, two with G9 and three with G16, plus one more each for B2, G11 and T14. A low Faith share means religious revolts and wavering clergy lords; a low Language share means separatist revolts and slower officials. Provinces in revolt lose taxes and recruits and spread trouble to neighbours. Under half counts as low: risings of that kind come half again as often, the lords seated among another faith waver each January (in a theocracy, all of them), and with a low Tongue officials' years count at half pace. The General tab marks a low Faith or Tongue with a warning line under it. A rising spreads to a restless neighbour at about a tenth a month.

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

**Where you find them.** Open a province and the first thing on it is who governs it: its lord, with his loyalty and buttons to open him or seize the land, or *Royal land* with a **Grant as fief** button that lists your lords, neighbours first. Its official sits under him; a lord's official serves the lord, so you can't make him a commander. The country card's **Lords** tab is the overview: how much of the realm is royal land, and a row per lord with his portrait, house, lands and loyalty. Tap a lord to open his screen: his lands as a list, a gift while he is not loyal, royal provinces you can grant him (nearest first), and **Show his lands on the map**, which fades the rest of the map and frames his provinces. On the map a lord's land always carries a fine pattern of crosses and a dashed border, and the **Lords** map mode colours each of your lords' lands in his own colour.

**Lords versus officials.** A lord costs no gold, but keeps half the taxes of his provinces and keeps their recruits as his retinue. He obeys according to his loyalty, and can be removed only by force, a trial, an assassin or his line dying out. At war you call his retinue from the Army tab or his screen, and he leads it himself (see [Warfare](Warfare)); each row of the Lords tab shows his men's state beside his loyalty.

**Sending an assassin.** A lord who grows too troublesome can be killed. On his screen, **Assassinate…** opens a card that shows the cost (25 gold, spent either way), the chance it works (60 %, 15 points less for each Great lord reason, never below 20 %) and what follows. If it works he dies: his heir takes his lands as a wavering lord (with no heir, a kinsman may, or the lands return to the crown), the rest of his house turns disloyal, and every other lord of yours falls a step of loyalty. If the assassin is caught, the lord turns disloyal and every other lord still falls a step. Murder at court is never a secret, so use it when one lord costs you more than the trust of all the others. The computer players never send assassins. All the numbers are in `lords.assassination` in the realm data.

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
| Sharing your faith and language | |

Paying for a building in a lord's province raises his loyalty one step. A famine in his land turns him disloyal; riots or a heavy demand on his province make him waver. At New Year, each lord over the government's cap drops one loyalty step (see [Government](Government)).

### What your lords and officials are called

Every realm names its lords and officials in its own words. A Russian prince has boyars and voivodes, the Ottomans beys and subashis, Japan daimyo and daikan, Ethiopia rases and shums, the Inca kurakas and tocricocs, and the peoples of the Americas and much of Africa chiefs and headmen. The word comes from the family of your court's language, and a realm ruled by kin calls them chiefs and headmen where its language has no word of its own. Everyone else keeps lords and officials.

The words show on the country card's tabs, the Stability pillars, the Lords map mode, a lord's and an official's screen and a province's "Governed by" card. Another realm's card uses its own words. Only the words change: chiefs and daimyo follow exactly the same rules as lords, and post types such as Warden or Tax collector stay the same everywhere.

### Stability

Stability tells you at a glance how well your realm holds together. It is not a hidden number: it reads four pillars, and your realm is only as steady as the weakest of them.

| Pillar | What it reads | Steady | Uneasy | Troubled | Crumbling |
|---|---|---|---|---|---|
| Lords | Your landed lords by loyalty | Half or more Loyal, none Disloyal | Fewer than half Loyal | Any Disloyal | Any In revolt |
| Subjects | Your subjects by loyalty (their standing at the start for now) | Half or more Loyal, none Disloyal | Fewer than half Loyal | Any Disloyal | Any In revolt |
| Officials | Royal provinces whose official's post stands empty | None | Up to a quarter | Up to a half | More |
| Provinces | Provinces rioting or plotting | None | Any rioting | Any plotting, or a tenth | A quarter |

Officials matter twice: an empty post shows in the officials pillar, and the *Ungoverned* grievance it brings (and *Grasping officials* over the cap) pushes provinces toward riots. A judge holds riots off one grievance longer. Lords' own provinces are run by their own officials and do not count.

The stability plaque in the top bar shows the step (amber when Uneasy, red when Troubled, blinking when Crumbling). Tap it to open your Realm book's Overview, where each pillar has a row; tap a row to open the Lords, Diplomacy, Officials or Provinces tab and mend it.

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

The Fallen line on your Military section's Army page says what your dead are doing: with a quarter of your recruit ceiling fallen, about a sixteenth more of your voices want peace (at most a quarter), and with half of it fallen recruits refill at three quarters of their pace (never under half).

The details live in [Recruiting](Recruiting), [Warfare](Warfare) and [Naval](Naval).

### Ruler and family

- **Age** rises each year, and old rulers die. A child ruler needs a regent: a lord, or a queen mother.
- **Years on throne** rise each year and reset on death, deposition or abdication. New rulers start with more wavering lords.
- **Heirs** are gained by births, marriages and adopting or naming an heir; lost by death, marrying daughters abroad, and heirs going over to a rebel lord. If the ruler dies with no heir, the realm falls into a **succession war** among the lords.
- **Traits**: two (for example Pious, Warlike, Builder, Greedy), given at birth and sometimes gained or rarely changed by events. They give small bonuses and lean event options.
- **Marriages** are living ties to other ruling houses and your own lords, arranged with an heir or a princess, ended by death, divorce events and war between the houses. They give goodwill, loyalty and a path to inheriting another realm.

**In the game now.** Your ruler is on the Overview of your Realm book, under the section tiles: name, age, years on the throne, the regent while a child rules, the two traits with what each does, and the heir (or who would follow under your law). Most realms start with their real ruler of 20 September 1378. Each January rulers and heirs grow a year older and may die, by the table below that every person shares. The heir takes the throne and every lord wavers a little; with no heir a kinsman takes it and the lords dispute it. An heirless ruler of 18 to 50 may have a child. A dispatch with the crown tells you of a death, a birth or a child coming of age, in your realm and on your borders. Traits: **Pious** makes faith risings a quarter rarer, **Warlike** refills recruits 10 % faster, **Builder** makes works 10 % cheaper and **Greedy** brings 5 % more tax to you; each also leans the choices an AI ruler makes in events.


**Everyone ages and dies.** Not only the ruler: every person the game names grows a year older each January and may die, by one table for all of them (about 3 in 100 a year for a small child, 1 under 40, 2 in their forties, 4 in their fifties, 8 in their sixties, 16 older). A battle can kill the losing commander (1 in 20, more if he is Reckless), and other causes, an assassin or an event, end a life the same way.

| Who | Where you see his age | When he dies |
|---|---|---|
| Your heir | General tab, beside the ruler | Your ruler has no heir until a child is born; die then, and the lords dispute the throne. Abroad, a ruler who dies without a son may give married houses a claim |
| A lord | His row on the Lords tab; his age and heir on his screen | His heir takes his lands, loyalty and want; with no heir, a kinsman of his house half the time. Otherwise his line dies out and his lands come back to you as royal land, with their posts empty |
| An official | His card on the province and the Officials tab | His post stands empty: fill it from the province card. AI realms and lords fill theirs at once |
| A commander or admiral | With his skills on the Military tab and the army card | He leaves your service and his army or fleet has no commander until you name another. Past 60 his Might falls, past 65 his Cunning. A lord leading his own retinue is the lord himself: if he falls, his heir leads the men on, and with no heir they go home |
| A colonial governor | The Exploration tab | His colony is lost if he was founding one |

Each death in your realm reaches your dispatches in one line saying what follows.

**Women in roles.** Women can hold every role: ruler, lord, commander, official, scholar. The chance is set per country (or culture) per role from the catalogue's history and succession customs. Where the crown passes only through men (France), no woman inherits the throne, though a duke's daughter can inherit his duchy; where a daughter could inherit (Castile, Navarre), a queen regnant is possible. Wherever a ruler is a child, a queen mother can be regent. The chance rises as history's ages arrive: a little in the Age of Revolutions, more in the Age of Industrialization, more again in the Age of World Wars, and events and reforms can raise one country's chance earlier. Women who held roles at the start (Joanna I of Naples, say) or appear in events are placed as they were; the chances apply only to characters the game generates.

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

At the start, the catalogue's assessments set your counts: economic strength and fiscal resilience give gold and debt; manpower potential recruits; military capability soldiers, commanders and horses; naval capability ships; administrative capacity officials and royal provinces; political stability and unrest risk lords' loyalty and provinces in revolt; territorial cohesion the number of lords, their land and language; institutional development schools, scholars and inventions; trade access starting trade; diplomatic influence extra officials ready as envoys. A low-confidence record starts with a wider random range. Allies, rivals, subjects and enemies come from the 1378 relations file. See [The 1378 Start](The-1378-Start).

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

- **World domination**: you and your subjects hold half of the world's settled land provinces (land with people) in the turn in which 1 January falls. Allies by marriage do not count.
- **Score victory**: lead a score when the campaign's end date (default 31 August 1939) arrives. Leading earlier wins nothing, however wide the margin.

Army power counts foot as 1, horse as 2, guns as 3, a warship as 100 men and a commander as 1,000, all over 1,000; the weights are provisional. Scores are worked out at the start and every January. A domination win happens at once and you may keep playing. At the end date the leader of each score wins, and ties share the win.

**Where you see it.** Every realm's General tab has a **Score** line: its Economy, Power and Technology with its rank in each. On your own card the line opens the **Score** tab: how each of your scores is made (income and bank; provinces and army power; inventions), your rank of how many realms still stand, and the five leading realms beside you. When the campaign ends the clock stops and the end card opens by itself (see [Screens and navigation](Screens-and-Navigation)).

### Each month

A turn is one week. These steps run once a month, in the turn in which a new month begins.

| Cadence | What happens |
|---|---|
| Monthly | Pay soldiers; add income; desertion if unpaid or unfed; apply loyalty causes; check the ruler's death and succession; check score victory |
| Each season | Eating and rot of castle and local stores; famine relief releases |
| Each autumn | Harvest roll by region, collection, castle shares, sharing out |
| Yearly | Debt interest; officials' wages; recruits refill; ruler and lords age; years on throne; old entries drop out of Fallen, Oaths broken and Lands taken |
| New Year | Lords over the cap lose a loyalty step |

## What you see

- **The country card**, as above, including your rank in each score.
- **The lord card** for each named lord.
- **The Food policy screen**, with realm defaults, per-castle overrides and the four presets.
- **The treasury**: gold, debt and lenders.
- **The top bar**: your realm, the date, gold and its change a month, stability, the war plaque while at war, and the News button.

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
- [Religion](Religion) and [Culture](Culture): faith and language shares and their effects on lords.
- [Rebellions](Rebellions): disloyal lords, retinues and wealth for risings, in revolt counts.
- [Revolutions](Revolutions): regimes set forms; émigré pretenders.
- [Historical Events](Historical-Events): event country stats mapped as above; ages raise women-in-roles chances.
- [The 1378 Start](The-1378-Start): starting counts from assessments and relations.
- [National Strengths](National-Strengths): levers such as a lord loyalty shield.
- [Naval](Naval): ship counts.
- [Time and Turns](Time-and-Turns): weekly turns with monthly steps, seasons, the end date for judging scores.
- [Screens and Navigation](Screens-and-Navigation): scores, ranks and the campaign result for the end screens.
- [Achievements](Achievements): score updates and campaign wins.
- [Map and Map Modes](Map-and-Lenses): country card fields.

## Numbers

Every value the game uses, made from its config so it always matches the game: [Realm data](Data-Realm). How they combine: [Formulas](Formulas).

All realm numbers are placeholders, kept in one realm data file.

| Value | Config key | Design value | Provisional? |
|---|---|---|---|
| Collection options | `food.collection.options` | 0 / 25 / 50 / 75 % | Yes |
| Castle share rules | `food.castle_shares.options` | by people, frontier first, capital first, equal, custom | No |
| Sharing-out patterns | `food.spread.default` / `presets` | 50/30/20; Tight 80/20/0; Wide 30/35/35 | Yes |
| Siege reserve | `food.siege_reserve.options` | 0 / 3 / 6 / 12 months | Yes |
| Army refill | `food.army_refill.options` | locals only, castles first, no refill in lords' lands | No |
| Famine relief | `food.famine_rule.options` | off / 1 / 3 months | Yes |
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
- The harvest comes in September in the north and in March in the south. Each region rolls its weather once a harvest: 1 in 6 bad, 1 in 6 good in temperate land, 1 in 4 drought in dry land and 1 in 5 floods in monsoon land. Each province also rolls its own harvest first (feedback 82).
- A child ruler, under 16, rules through the queen mother, or else through the most loyal lord.
- Starting counts come from each country's assessments, with a seeded spread for countries we know less about.

## Still open

Nothing. Every question about the realm has been decided; numbers marked as placeholders are tuned during balancing.


## For developers

- Spec: [`domain/realm/spec.md`](https://github.com/grrts/pocket-hedgemony/blob/claude/domain-specs-bdd-ebdpmx/domain/realm/spec.md), requirement code **REALM** (REALM-001 to REALM-156).
- Features: `domain/realm/features/` (country-card, treasury, province-food, castle-food, food-policy, food-year, people-and-land, lords, army-and-navy, ruler-and-family, women-in-roles, abroad, starting-values, events-and-ai, win-scores).
- Code: rules code for this context goes in `packages/engine/src/domain/realm/`, balance numbers in `packages/rules/data/domain/realm.json`. Today's engine keeps each nation's treasury and levies in `packages/engine/src/world.ts` and runs income and upkeep in `runEconomy` in `packages/engine/src/turn.ts`.
