# Provinces

The province is where your realm actually lives. Gold is taxed here, food grows here, recruits are raised here, lords and officials govern here, and armies burn it. Each province is a row of 4 to 16 tiles with real people working real buildings, and every number on its card is something you can count or point at, with a list of how you gain it and how you lose it. Your country card is mostly the sum of your provinces.

## How it works

### The principles

- **Everything is countable.** Tiles, buildings, workers, men, days. There are no abstract levels or meters.
- **Every stat explains itself.** Tap any line on the province card and you get its gain and lose list, so you can always see why a number moved.
- **One config file.** All rates and limits (jobs per building, food per worker, ground tables, slots per town size, toll effects, grievance thresholds) live in one province config file. Every number on this page is a placeholder until balanced.

### Our running example: Troyes in 1444

Troyes is a royal province of France, 3 days from Paris, on farmland with 12 tiles: four farms, one burned field, two ranches, a lumber camp, a second woods tile with no building, a fishery, the castle and the town. It has 72,000 people, a tax collector of 6 years, and Duke Philip of Burgundy as a pretender. We will come back to it throughout this page.

### Tiles

A province is a row of **tiles**: 4 for the smallest province on the map, 16 for the largest. Each tile has one **use**, and most uses can hold one building:

| Use | How it changes |
|---|---|
| **Fields** | Turned to pasture in one season. Left unworked 10 years, they grow back into woods. Salted or overgrazed, they become waste. |
| **Pasture** | Ploughed back into fields. Lost to drought and overgrazing (becomes waste). Grassland, savanna and steppe provinces start with many. |
| **Woods** | Cleared into fields in 3 years for gold, giving one load of timber. Gained by fields growing back and, later, replanting; lost by clearing, cutting timber faster than it regrows, and fire. |
| **Marsh** | Drained into fields with *Polder drainage*. Floods and dykes broken in war turn tiles into marsh. |
| **Waste** | Irrigated into fields with *Qanat and canal irrigation*. |
| **Shore** | 1 to 3 tiles, only for provinces on a coast, lake or navigable river. Never lost, but a blockade or a silted harbour stops their buildings working. |
| **Town** | Every settled province has one. At 40,000 townsfolk the town takes a second tile, built over fields, and a great city a third. If the town shrinks below a tile's limit, that tile goes back to fields. |
| **Castle** | Placed on any land tile except the Town; that tile stops producing. A destroyed castle leaves waste for 5 years, then fields. |

**Tile states.** A tile can have at most one state at a time:

| State | Cause | Effect | Ends |
|---|---|---|---|
| **Burned** | An army forages or loots, you burn your own fields (scorched earth), raiders raid, or rebels act | Its building is wrecked, it gives nothing, its workers become refugees or die | With people and peace, one burned tile is rebuilt a year, faster with gold |
| **Fallow** | A building has fewer than half its workers | Works not at all | Enough workers return |
| **Worn** | Fields farmed for decades with more people than needed and no rotation inventions; overgrazed pasture; later, mines and factories | Half output | Five years without use. *Three-field rotation*, *Fodder crops* and *Four-field rotation* make wearing rarer |

War damage is shown as burned tiles, never as a meter.

### Ground

Each province has one **ground**, taken from the [World Map](World-Map)'s terrain. It sets the starting tile mix and how troops fight, how buildings work and how people work without buildings.

**Ground and troops** (strength changes in %):

| Ground | Foot | Horse | Guns | Defender | Days to cross | Foraging | Sickness |
|---|---|---|---|---|---|---|---|
| Farmland | 0 | +10 | 0 | 0 | 1 | Rich | Low |
| Grassland | 0 | +25 | 0 | −10 | 1 | Fair | Low |
| Savanna | 0 | +15 | 0 | 0 | 1 | Fair | Medium |
| Drylands | 0 | +10 | 0 | 0 | 1.5 | Poor | Low |
| Desert | −10 | −10 (camels 0) | −10 | +10 | 2 | Almost none | Heat |
| Hills | +10 | −15 | −10 | +15 | 1.5 | Fair | Low |
| Mountains | 0 | −40 | −30 | +30 | 3 | Poor | Cold |
| Forest | 0 | −25 | −20 | +15 | 2 | Fair | Low |
| Jungle | −10 | −40 | −30 | +25 | 3 | Poor | High |
| Marsh | −10 | −30 | −30 | +20 | 3 | Poor | High |
| Tundra | 0 | −10 | −10 | +10 | 2 | Almost none | Cold |

On top of that:

- An attacker coming over a river shore tile fights at −20 %, unless the province has a bridge.
- The defender gets +5 % for every two woods tiles, up to +15 %.
- A defending army of the province's homeland language gets a further +10 % in hills, mountains, forest, jungle and marsh.
- If the province has a castle tile, the defender fights from the walls (see [Warfare](Warfare)).
- **Foraging** is how much an army can take from the tiles before it starts burning them. Burned tiles give nothing to forage.
- An army that stays in a province loses its ground's **sickness** each month, worst for soldiers not born on that ground.

**Ground and the economy** (build cost, building output, output of people working without a building):

| Ground | Build cost | Building output | People output |
|---|---|---|---|
| Farmland | 100 % | +25 % | 100 % |
| Grassland | 100 % | 100 % | +50 % herding |
| Savanna | 100 % | 100 % | +25 % herding |
| Drylands | 125 % | −25 % until irrigated | 100 % |
| Desert | 150 % | −50 % except mines and irrigation works | 100 % herding and caravans |
| Hills | 125 % | 100 % (mines +25 %) | 100 % |
| Mountains | 200 % | farms −50 %, mines +50 % | −25 % |
| Forest | 150 % | 100 % (lumber +50 %) | +25 % hunting and gathering |
| Jungle | 200 % | −25 % | +25 % gathering |
| Marsh | 200 % | −50 % until drained | +25 % fishing |
| Tundra | 150 % | −50 % | 100 % herding |

### Buildings in the province

[Buildings](Buildings) owns the full building rules; here is how they sit in a province.

- Every building stands on a tile, and the castle is a building too. Each land tile holds at most one building.
- Each building has **job slots** for one class. With all slots filled it works fully, with fewer people in proportion, and below half it is fallow.
- Buildings are gained by building them (cost times the ground's build cost), by conquest, by events, and some appear by themselves. They are lost when their tile burns, when the town is sacked, when upkeep goes unpaid, when demolished by you or a peace treaty, or when their tile changes use.
- A tile with **no building** still has slots for up to 3,000 people of the matching class, working at the ground's people output.
- **Mines** show the years of digging left in their ore deposit. Ore deposits are gained by prospecting events and mining inventions and lost every year the mine is dug. A mine that runs out closes; its miners overflow into other slots or become homeless, and the town shrinks.
- **Shipyards and mines need timber** from a lumber camp in the same province or within reach (one ring, more with roads and rivers). Without timber no ships are built.
- The **Town tile** has building slots by town size:

| Town size | Hamlet | Village | Market town | Town | City | Great city |
|---|---|---|---|---|---|---|
| Building slots | 1 | 2 | 4 | 6 | 9 | 12 |

- An **almshouse** shelters 3,000 homeless, who then stop counting toward theft, the *Homeless* grievance and shanty camps, at a cost in gold upkeep and clergy.
- While a town has a market, homeless people and the raw ware nearby, **craft buildings** now and then appear by themselves. Craftsmen fleeing persecution abroad may found one too.

Job slots per building (people, with their families): farm 12,000; rice paddy 18,000; terrace, raised fields and plantation 12,000; ranch and horse stud 3,000; lumber camp 1,500; mine 6,000; irrigation works 1,500; fishery 3,000; saltworks 1,500; harbour 1,500; shipyard 3,000; loom house, forge, kiln and tannery 1,500; press 900; brewery or winery 900; market 1,500; caravanserai or warehouse 900; house of worship 600; seat 300 plus the official; almshouse 600; powder mill 900; hospital, wells and drains 600; factory 6,000; rail station 600.

### Food

The province's **harvest** is the sum of its food tiles. Each gives: people in its slots × food per person × the ground's output × the harvest roll × inventions.

| Food tile | People fed per worker | Rolls a harvest? |
|---|---|---|
| Farm, terrace, raised fields | 1.5 | Yes |
| Rice paddy | 1.5, two harvests (rolled twice) | Yes |
| Ranch | 1.33 | No: drought and hard winter events instead |
| Fishery | 1.33 | No: storms and blockades instead |
| Empty fields, woods, pasture | 0.67 × the ground's people output | Fields yes; woods and pasture no |

| Harvest roll | Bumper | Good | Normal | Poor | Failed |
|---|---|---|---|---|---|
| Food × | 1.3 | 1.15 | 1 | 0.7 | 0.3 |

*Three-field rotation*, *Fodder crops*, *Seed drill* and *Four-field rotation* each make the harvest one step better. With *Maize, potato and cassava*, a failed harvest becomes poor.

**Troyes, a normal year:**

- 4 farms × 12,000 farmers × 1.5 × 1.25 (farmland) = 90,000 fed
- 2 ranches × 3,000 herders × 1.33 = 8,000 fed
- 1 fishery × 3,000 seafolk × 1.33 = 4,000 fed
- The second woods tile has no building: 3,000 woodsmen hunt and gather, 3,000 × 0.67 = 2,000 fed. The burned field gives nothing.
- **Total: about 104,000 fed**, for 72,000 eaters.

A good year in Troyes feeds the castle; a failed one, with a field burned, leaves Troyes hungry. Burn two more fields and it can't feed itself.

### Wares

Every non-food ware is made by the people in a building's slots × the ground's building output × inventions. Craft buildings that turn raw wares into finished ones add value: wool into cloth is worth three times as much. Wares made fall with burned and fallow tiles, plague killing workers, missing inputs (a forge without iron stops) and a mine running out.

The ware list lives in config: grain, rice, wine, olive oil, wool, cloth, flax, linen, silk, cotton, salt, fish, timber, furs, hides, leather, horses, iron, tools, arms, copper, tin, silver, gold, gems, spices, pepper, sugar, tea, coffee, cocoa, tobacco, incense, ivory, pottery, porcelain, dyes, paper, books, saltpetre and powder; later eras add coal, rubber and oil. Enslaved people are never a ware.

### People: births, deaths and famine

Each month every class gains births and loses deaths from yearly base rates:

| Class | Births a year | Deaths a year |
|---|---|---|
| Land classes | 4.0 % | 3.0 % |
| Miners | 3.5 % | 4.0 % |
| Craftsmen, market folk, clerks | 3.0 % | 3.5 % |
| Clergy | 0.5 % where clergy don't marry, otherwise as townsfolk | 3.0 % |
| Scholars | 1.0 % | 3.0 % |
| Homeless | 4.0 % | 5.0 % |

**Birth rate** goes up with a food store above 6 months (+0.5) and 10 years of peace in the province (+0.5), and down with a store under 3 months (−1), the *Hungry* grievance (−2), war in the province (−1), plague (−1) and, in later eras, in towns by era.

**Death rate** goes up with plague (+5 % at rumour, +15 % at outbreak, +30 % at its worst), war in the province (+1 %), each burned tile (+0.5 %), fever land for people born elsewhere, and smoke (+1 % for town classes). It goes down with hospitals, wells and drains (−0.5 % in town) and with sanitation and vaccination (each −0.5 %).

Troyes, with 72,000 people, well fed and at peace, has about 2,800 births and 2,200 deaths a year, so it grows by about 600 a year until the food runs short.

**Famine.** Each season the province compares the food it has (its share of the harvest, its local store and castle deliveries) with the people who must eat. If there is enough, everyone eats and the rest goes to the store. If not, the people the food can't feed die that season, spread over the classes by size, except that a quarter of them flee as refugees if a neighbouring province has food. If Troyes has food for 64,000 one season, 8,000 can't be fed: 2,000 flee to Sens, which has food to spare, and 6,000 die. With no fed neighbour, all 8,000 die. A year's famine never kills more than a fifth of a province, so even two failed harvests in a row kill at most about a third of its people; past that the unfed go hungry instead.

### Classes and job slots

Every person belongs to one class, and each class works in certain slots:

| Class | Their slots are in |
|---|---|
| Farmers | Farms, rice paddies, terraces, raised fields, plantations, irrigation works, empty fields |
| Herders | Ranches, horse studs, empty pasture |
| Woodsmen | Lumber camps, empty woods |
| Miners | Mines, saltworks |
| Seafolk | Fisheries, harbours, shipyards, empty shore; fleet crews are raised from them |
| Craftsmen | Loom houses, forges, kilns, tanneries, presses, breweries, factories, rail stations |
| Market folk | Markets, caravanserais, warehouses |
| Clergy | Houses of worship, almshouses, hospitals |
| Clerks | Seats |
| Scholars | Schools |
| Homeless | No slots |

How people move:

- Newborns join their parents' class the month they are born.
- When a class has more people than slots, the extra move to the class whose slots are **least filled** (lowest share filled), ties going to food classes first. This is **overflow**.
- Overflow never goes into scholars or soldiers. Scholars only come from graduating students, and soldiers only from raised recruits.
- When every slot in the province is full, overflow becomes **homeless**.
- When a slot opens (a new building, deaths, plague, a levy), homeless people move into it first.
- Each month a share of the homeless moves to the neighbouring province with the least-filled slots, in your own realm first.
- A class with fewer people than slots leaves them empty until overflow arrives.

In Troyes the farms are full. A new loom house opens 1,500 craftsman slots, now the least filled. The 3,600 homeless move in first: 1,500 become weavers and 2,100 stay homeless. From then on the farmers' extra people overflow into whichever slots are emptiest, or join the homeless.

**Countryfolk and townsfolk** are shown, not stored. Town size comes from townsfolk, and townsfolk grow no food.

### Homeless

Homeless people eat from the local store, make nothing, pay no tax, and die at 5 % a year. They come from overflow with every slot full, burned tiles, buildings closing, and soldiers and refugees returning with no slot free. They leave through new slots, rebuilt tiles, almshouses, levies, settlers sent to a colony or a frontier with free tiles, and drift to neighbours or abroad.

| Homeless share | Effect |
|---|---|
| Over 5 % | Theft: for every 5 % homeless, 5 % less tax reaches you and 5 % fewer traders pass |
| Over 10 % | The *Homeless* grievance |
| Over 20 % (shanty camps) | *Homeless* counts as two; plague starts here first and spreads twice as fast; town classes die 1 % faster; each year a town building may burn |

Rebels muster from the province's recruits, like any levy.

### Other people

- **People** is everyone in the province, summed over classes.
- **Refugees** shelter outside the classes, eat without working at first, go home when it is safe, and after 2 years settle and overflow into slots (or become homeless). Fleeing craftsmen and scholars keep their class if a slot is free. If 2,000 refugees from Troyes shelter in Sens, they go home once Troyes is safe.
- **Faith and language mix** store the top three of each; the country's Faith and Language percentages are their people-weighted sums. Persecution makes people flee and take their faith and crafts elsewhere. See [Religion](Religion) and [Culture](Culture).

### Recruits, students and scholars

- Each year the province adds to **recruits here** a share of every class except clergy and scholars, more from homeless men. Recruits of royal provinces go to the ruler; a lord's go to his retinue. Raised recruits leave their class slots; soldiers who come home rejoin as homeless and overflow.
- While recruits are below a quarter of the pool, the province has the *Conscription* grievance, ending when refilled to half.
- Local recruits fill local school seats first, then the realm's. **Students** are lost by graduating, being called to arms, plague and the school being sacked.
- **Scholars** are gained by graduation and by foreign scholars settling in towns with schools and peace, and lost by old age, war here, persecution and a richer neighbour hiring them. See [Research](Research) and [Recruiting](Recruiting).

### Tolls

The owner sets a toll rate of none, low or high on each **toll point**: a bridge, ford, pass, river mouth or strait. A free-trade charter sets it to none. Tolls count as trade income; see [Trade](Trade).

### Tax

Each province has its own **tax rate**: none, light, normal, heavy or crushing. It defaults to the realm default set on the Tax screen and can be overridden per province. Presets such as *Even*, *Spare the frontier*, *Squeeze the towns* and *War chest* fill in every rate at once.

- **Tax owed** is the gold the province owes each year at its rate, from the value of what its buildings make and its townsfolk. It falls with burned and fallow tiles, homeless people, and riots (half).
- **Reaches you** is the part that arrives: half without an official, half kept by a lord, a share lost for every day of travel beyond 5, less with enemy armies on the road, and nothing while occupied.
- In a lord's province, the rate is what you demand from the lord. He keeps half of what is collected either way, and a heavy or crushing demand makes him waver.
- Riots or rebels may force the rate down, and a tax cap charter keeps it at light or below.
- A heavy rate gives the *Heavy taxes* grievance; crushing counts as two.

Troyes, at normal tax, owes 11 gold a year and all 11 reach you: it is 3 days from Paris and its official is a full-strength tax collector. Tax is paid a twelfth each month. Each day of travel beyond 5 loses 5 % of it, a tax collector makes up to 20 % back, and you never get more than the province owes.

### Roads, rivers and days to capital

- Each province has **one road step**: track, road, paved road, turnpike, railway. Each step is unlocked by an invention and built for gold × the ground's build cost. Roads are lost by neglect without upkeep, fighting and floods.
- A **navigable river** is fixed and shown as shore tiles; canals add one (*Grand canals*, *Canal locks*), and a wrecked canal or silting removes it. River provinces count one ring closer for castle food spread.
- **Days to capital** is the travel time to the capital or nearest seat by the fastest road, river or sea route, longer in winter, with enemy armies, broken roads or a sea route closed in war. Above a limit (for example 30 days), the province has *Far from the throne*.

### Who owns and governs it

- **Owner**: gained by conquest, inheritance, purchase, a lord joining with his land or a colony; lost by losing a war, a lord defecting, rebels breaking away or ceding it.
- **Governed by** one of:

| Governed by | Effect |
|---|---|
| An official | Full tax and recruits, plus the effect of his type |
| A lord | Half tax; recruits go to his retinue; run by his own officials |
| No one | Half of everything, and the *Ungoverned* grievance |
| A subject ruler | See [Subjects](Subjects) |
| Occupied | Tax, recruits, food and trade go to the occupier |

- When a lord's line dies out, his province returns to royal and needs an official.
- **Officials at work.** Who governs a province is the first thing on its card. Each official's type helps the province he runs: a tax collector brings in more tax, a steward more food from the harvest, a muster master refills recruits faster, a customs officer adds trade, a warden makes the garrison harder to storm, a judge keeps riots down. He gives half his effect in his first year and all of it after 5 years there, shown as five pips. The country card's **Officials** tab lists every official with his post, province, effect and years; open one and **Move to another province** lists your royal provinces, the best fit for his type first, to swap him with the official there or move him into an empty post. Whoever moves starts again at half. A lord's officials serve the lord: you can't move or commission them.
- **Occupied**: while an enemy holds the castle, or holds a province with no castle for a season. Months of occupation are counted.
- **Years held** counts years since this owner gained it. The longer it is held, the faster language and faith shift and the faster *Foreign rule* fades.
- **Homeland of**: set at start from the catalogue; a people gains it by making up most of the province for 100 years and loses it after being gone 100 years. A homeland held by a ruler of another language has *Foreign rule*, and separatist events start there.
- **Pretenders** are gained by inheritance and marriage, by losing the province in war (the old ruler keeps a right for 50 years) and by buying a title; lost by death without heirs, renouncing in a peace, marrying into your house, and time.

### Officials

Every official has a **type** and runs **one province**; a seat needs one of its own. He gives half his effect in his first year in a province, rising to full after 5 years there. Moving him starts him again at half: a tax collector of 6 years moved from Troyes to Rouen is back to half.

| Type | Effect in his province |
|---|---|
| Tax collector | +20 % of tax owed reaches you |
| Steward | +10 % food from the tiles; local store rots half as fast |
| Judge | Riots need one grievance more; *Broken charter* fades twice as fast |
| Master of works | Buildings and roads 25 % cheaper and twice as fast; burned tiles rebuilt twice as fast |
| Muster master | Recruits refill 25 % faster |
| Customs officer | +15 % trade gains |
| Chaplain | Faith mix moves twice as fast toward the ruler's faith |
| Schoolmaster | Language mix moves twice as fast toward the ruler's language; students graduate a year sooner |
| Warden | Garrison fights 25 % better; walls repair twice as fast; castle store rots half as fast |
| Colonial governor | No effect of his own: founds a colony, then becomes its ordinary official. Needs a colonial governor slot and doesn't count against the officials cap while holding one |

Officials are gained by **hiring** one of a chosen type (gold up front, wages yearly; a foreign specialist costs more), by **school graduates** (a madrasa gives judges and chaplains, a university judges and stewards, an academy masters of works and wardens), and by a lord's line dying out. They are lost to old age and death, dismissal, unpaid wages, being killed when rebels or an enemy take their province, and a richer neighbour hiring them away. Your country card's Officials count is the sum of your officials.

### Lords in the province

- A lord always holds at least one province; someone with no land is a **courtier**. A lord who loses his last province stays at court as a courtier who can be granted land again, or, if you took it by force, flees abroad and becomes a pretender to it.
- A lord hires and pays his own officials from his wealth. A lord's province with none of his officials pays him half and has *Ungoverned*.
- You can **lend a lord** one of your officials: it costs your wage and wins his loyalty, and the official works for him until called back.
- Lords spend their own wealth on buildings by their traits: Builder the most, Greedy markets and mines, Pious houses of worship, Warlike castles.
- If you pay for a building in a lord's province, it is his, and his loyalty rises one step (unless he is in revolt). When a lord's land comes back to you, its buildings come with it.

More on lords in [Your Realm](Your-Realm).

### Charters

The ruler may grant a **charter** to one province or town:

| Charter | Gain | Cost |
|---|---|---|
| Market charter | A market that can grow into a yearly fair | A little gold |
| Tax cap | Tax rate no higher than light | Tax from it |
| Town law | Townsfolk run the town; it needs no official | Nothing may be seized there without breaking it |
| No quartering | No armies winter there | Winter quarters there |
| Faith tolerance | Its minority faith worships openly | Clergy lords' loyalty; *Wrong faith* ends there |
| Free trade | No tolls | Toll gold |
| Mining right | A merchant house runs the mine, digging faster and finding new ore deposits | Half the mine's output |

Charters are granted, demanded by lords and towns for loyalty or a loan, or forced by rebels. Revoking one gives *Broken charter* for 20 years, and every lord notices. A conqueror may keep or revoke the charters of a province he takes.

### Defence

- **Castle**: none, earthwork ring fort, stone castle, bastion fort or star fort. Gained by building or upgrading (gold × build cost, and years) or conquest; lost by siege, demolition in a peace, or one step per 10 years without upkeep. An enemy must besiege it to take the province; on hills or mountains it is far harder to take; on a shore tile it can be supplied by sea.
- **Walls**: whole or with 1 to 3 breaches. Repaired with gold and months; breached by siege guns, mining and earthquakes. Each breach shortens a siege and allows an assault.
- **Garrison**: soldiers inside, counted from the army. A castle with no garrison falls at once.
- **The Garrison tab**: the province card lists the troops in the province without a commander (by thousand, troop type and drill), levies still gathering with the days left, and the commanders here who can pick them up. Freshly raised levies wait here and man the castle until a commander takes them.

See [Warfare](Warfare) for sieges.

### Grievances and rebels

There is no anger meter. A province has a list of **grievances**, each a named cause you can point at and fix:

| Grievance | Starts when | Ends when |
|---|---|---|
| Heavy taxes | The rate is heavy (crushing counts as two) | The rate drops; a tax cap charter |
| Hungry | Local food store under 1 month | Above 3 months for a full season |
| Homeless | Homeless over a tenth of the people (two above a fifth) | New buildings, an almshouse, people leaving or sent as settlers |
| Soldiers quartered | Any army stays more than a season | It leaves; a no-quartering charter |
| Burned homes | Any burned tile | All tiles rebuilt |
| Conscription | Recruits below a quarter of the pool | Refilled to half |
| Foreign rule | A homeland held by a ruler of another language | Enough years held; a lord of the local language; the majority changes |
| Wrong faith | Most people don't share the ruler's faith | Conversion; a faith tolerance charter |
| Ungoverned | No official (a royal province without yours, or a lord's without his) | An official is assigned |
| Harsh lord | The lord is Cruel or Greedy, or hostile to the people's faith or language | The lord changes |
| Broken charter | A charter revoked in the last 20 years | Time |
| Far from the throne | Days to capital above the limit | A seat nearby; roads; moving the capital |
| Plague | An outbreak here | It burns out |
| Bloodshed | A rising of the same faith or language was massacred in the last 20 years | Time |
| Requisitioned | An army, yours or anyone's, takes food from the store | A season after the last taking |
| Neighbour in revolt | A neighbouring province has rebels with a grievance this one shares | Those rebels are beaten or satisfied |

| Grievances | Mood |
|---|---|
| 0 or 1 | Calm |
| 2 | Grumbling: growth slows; scholars and craftsmen start to leave |
| 3 | Riots: tax and recruits halved; traders avoid it; the lord wavers |
| 4 or more | Rebels: a share of the recruits take up arms each month under a named leader, with a demand from their biggest grievance |

Under a judge, riots need one grievance more.

**Rebels** are gained from four or more grievances, a disloyal lord raising his retinue, a pretender landing, or foreign gold. They melt away when beaten, when their demand is granted, when grievances are fixed, or when their leader is killed or bribed. Rebel armies fight as the *Rebel band* kind under the battle rules. A province with riots or rebels counts toward your country's **In revolt**. At 4 or more grievances a province is *Plotting*: each month it may rise, with a 5 % chance at 4 grievances, 15 % at 5 and 30 % at 6 or more (an event can spark a rising at 3). The rebels are men from the province's recruits. More on [Rebellions](Rebellions).

### Health and the land

- **Plague**: none, rumour, outbreak, burning out. It spreads with traders along roads, rivers and sea routes, and with armies and refugees; crowded towns catch it first. It burns out after a season or two. Quarantine (you close the province) stops trade; hospitals, wells and drains slow it. It kills townsfolk first, then countryfolk, and buildings go fallow. It runs weekly while an outbreak lasts.
- **Fever land**: none, mild, harsh or deadly, set by ground and climate, with marsh tiles adding to it. Lowered by draining marsh and later inventions (quinine, sanitation). Soldiers and settlers from elsewhere die there; locals mostly don't.
- **Smoke**: from era V, factories and coal mines make smoke. Townsfolk get sick and tiles become worn. Closing them and later inventions reduce it, and smoke feeds the event tree's climate stats.

### Colonies and the people already there

- A colony is founded only in a province **no country owns**. Land held by any country, tribal countries included, is gained only by war, treaty, marriage or a lord joining.
- A colony takes only the **free tiles** that nobody works. Tiles the local people work stay theirs, with their buildings and lords; once the province is owned they can be taken only by conquest or treaty, and each tile taken adds grievances and starts resistance events.
- **Settlement**: none, trading post, settlement or colony. A trading post is a market that draws traders without taking a tile. Settlement is gained by founding a colony, founding a post (envoy and gold), settlers arriving, or a treaty; lost to the local people driving it out, disease, abandonment, or another power taking it.
- **Settlers** are sent from provinces with homeless people, live on the colony's free tiles, and stop the colony growing when those are full. They are lost to fever land, war with the local people, and leaving.

See [Exploration and Colonies](Exploration-and-Colonies).

### Adding up to the country card

Each province supplies your country card's sums: gold income, people (people plus refugees), recruits (royal provinces only), food, horses, ships, castles, faith and language, in revolt, schools, students and scholars, and officials. See [Your Realm](Your-Realm).

### When events touch a province

The event tree speaks in abstract province stats, and each becomes a concrete change:

| Event stat | Example | Lands as |
|---|---|---|
| population | −10 % | People −10 %, townsfolk first in plague events |
| prosperity | +2 | Two new buildings that fit the province |
| devastation | +30 | 30 % of tiles burned |
| unrest | +20 | One named grievance from the event |
| control | −20 | The official flees, or the road breaks |
| fort_level | +1 | Castle one step up |
| infrastructure | +1 | Road one step up |
| industry | +1 | One factory |
| food_security | −0.3 | Harvest two steps worse |
| disease_burden | +40 | Plague outbreak |

### Starting values

At the start each province takes its tile count from its size on the map, its ground from terrain, its tile mix from ground, its shore tiles from coast and rivers, its people from population, and how many buildings start built (and its town size) from wealth. Wealth then stops being a live stat. The rest comes from the catalogue, the research tree, region tables and event anchors; see [The 1444 Start](The-1444-Start).

### What is stored and when it updates

A province stores about 95 small numbers and works out food made, wares made, tax owed and reaching you, town size and country sums when needed.

| Cadence | What happens |
|---|---|
| Monthly | Births and deaths; overflow and homeless drift; rebels take up arms; sickness for armies staying; occupation months; grievances evaluated |
| Each season | Food check and famine; *Hungry*, *Requisitioned* and *Soldiers quartered* timers |
| Each autumn (twice for rice) | Harvest roll |
| Yearly | Recruits refill; tax owed; years held and years served; one burned tile rebuilt; worn tile checks; mine ore deposits fall; woods regrow after 10 unworked years; refugees settle after 2 years |
| Weekly, during an outbreak | Plague |

## In the game now: the land

Every province is laid out in **4 to 16 tiles** from the map: bigger provinces have more. One is the **Town**, a coast gives 1 to 3 **Shore** tiles, and the rest are **Fields**, **Pasture**, **Woods**, **Marsh** or **Waste** in the share of the ground under the province (farmland is mostly fields, mountains mostly waste and pasture, forest mostly woods).

**Food comes from the tiles.** A farm in the province works all its fields: each fields tile has work for 30,000 farmers, who feed 1.1 people each at a plain farm, 1.3 at a mill farm and 1.5 at an enclosed farm. Farmers past that, or with no farm at all, work bare land and feed 0.67 each. Ranches do the same for herders on pasture and fisheries for seafolk on the shore (1.33 each). The ground matters too: farmland farms better, mountains and marsh worse.

**In 1444** every province about feeds itself: its people's own ways of working the land (terraces, ditches, herding on the move) make up what its buildings leave short of 110 % of its needs in a normal year. That stays fixed, so as the people grow, a better farm or another ranch is what feeds them. A poor harvest bites.

**Hunting.** Woodsmen hunt in the woods: each woods tile has room for 3,750 hunters, who feed 0.67 each, more in the northern forests and tundra, less in thin woods. Woodsmen past that room scrape by on half. Crowd the woods and the game thins, year by year, down to a third; fewer hunters let it come back. A **hunting lodge** makes the hunters in the woods bring in half as much again, and gives furs in the north. In the north a **hard winter** (about one year in five or eight) cuts the catch to 0.6.

**Changing a tile.** You can clear woods into fields (3 years), turn fields to pasture or plough pasture back (a season each), drain marsh (3 years, needs *Polder drainage*) and irrigate dry waste (2 years, needs *Qanat and canal irrigation*). Each costs gold up front, more on hard ground; a province changes one tile at a time, and stopping gives half the gold back. The ground itself never changes. Lords change their own land, and other countries change theirs, by a simple rule: a province that can't feed itself drains, irrigates or clears woods.

**Mines and salt.** A province in hills or mountains may have an ore deposit under its waste: iron, copper, tin, silver, gold or rock salt, with so many years of digging left. Tap the waste tile on the Land tab to see it. A mine needs the ore deposit and timber from a lumber camp in the province or next door; it gives work for 6,000 miners and adds trade, three times as much for silver or gold. Each January it digs a year off the deposit, and when it runs out the mine closes. Kutná Hora's silver (in Středočeský) and Falun's copper (in Dalarna) are already dug in 1444. On a dry or warm coast, saltworks on the shore make salt and add trade too.

**How you use it.** Tap one of your provinces, then its **Land** tab. The first line says how much of its people the land feeds in a normal year, in red under 100 %. Below is the grid of tiles, each coloured by its use and naming the building that works it. Tap a tile to see who works it, what it feeds or gives a year, and the building that would work it better, with its **Build** button or why it can't be built yet. Under the sheet are the one to three changes that tile allows, each with its gold and time. On the country card, **Provinces → Short of food** lists the provinces whose land doesn't feed them and what would fix each; tap one to open its Land tab.

## What you see

**The province card**, when you tap a province at close zoom:

```
 TROYES                        France · royal province · 3 days to Paris
 Official: tax collector, 6 yrs Pretender: Duke Philip of Burgundy
 Ground: farmland · 12 tiles
 [Farm][Farm][Farm][Farm][burned][Ranch][Ranch][Lumber][woods][Fishery][Castle][Town]
 People    72,000                 born 2,800 · died 2,200 a year · growing
 Classes   farmers 48k · herders 6k · woodsmen 4.5k · seafolk 3k · craftsmen 4.5k · others 2.4k · homeless 3.6k
 Food      feeds 104,000 a year   72,000 eat · 7 months in store
 Town      market town            6 slots: market, 3 loom houses, church, school
 Tax       normal                 11 gold owed · 9 reach you
 Recruits  1,100                  40 at school
 Castle    stone · 300 garrison   walls whole · 6 months siege store
 Faith     Catholic 100 %         Language French 94 % · Flemish 6 %
 Grievances (2): soldiers quartered, burned homes          Rebels: none
```

The tile row is the province: tap a tile to see its building, its workers and what it makes. Tap any other line to open its gain and lose list.

**The Tax screen** sets the realm default rate, overrides per province and presets. The province map modes (Food, Tax reaching you, Days to capital, Grievances, Ground, Recruits) and what shows at each zoom are on [Map and Map Modes](Map-and-Lenses).

**Things you can do**: set a province's tax rate, the realm default or a preset; set a toll; change a tile's use (clear woods, fields to pasture and back, drain marsh, irrigate waste); burn your own fields; pay to rebuild a burned tile faster; assign, dismiss and hire officials; lend an official to a lord and recall him; pay for a building in a lord's province; grant or revoke a charter; build a road; quarantine a province; assign a garrison; repair walls; send settlers.

## How it connects

- [World Map](World-Map): ground, size (tile count), coast, rivers, neighbours.
- [The 1444 Start](The-1444-Start): starting values for every province.
- [Time and Turns](Time-and-Turns): monthly, seasonal, yearly and weekly ticks.
- [Buildings](Buildings): building list, slots, construction, upkeep and owners; the province supplies tiles, ground and classes.
- [Research](Research): inventions unlock buildings, tile changes, harvest steps, road and castle steps.
- [Your Realm](Your-Realm): sums for the country card; food policy, castle deliveries, lords and fiefs.
- [Trade](Trade): wares, toll points and rates, customs officer, homeless penalty, quarantine.
- [Warfare](Warfare): ground modifiers, castles, walls, garrison, occupation; burned tiles, sacks, requisition and quartering come back.
- [Troop Movement](Troop-Movement): days to cross, foraging, roads, rivers, bridges.
- [Recruiting](Recruiting): recruits here, classes, homeless, muster master.
- [Rebellions](Rebellions): grievances, homeless share and leaders; owns how risings start.
- [Revolutions](Revolutions): grievances and class shares read as signs.
- [Religion](Religion): faith mix, houses of worship, chaplains, *Wrong faith*.
- [Culture](Culture): language mix, *Foreign rule*, officials' language.
- [Government](Government): caps on officials and lords; seats.
- [Exploration and Colonies](Exploration-and-Colonies): colonial governors and founding colonies.
- [Subjects](Subjects): provinces governed by a subject ruler; colony stages.
- [Diplomacy](Diplomacy): an official sent as envoy leaves his province at half until he returns.
- [Naval](Naval): seafolk crews, harbours, shipyards, timber.
- [National Strengths](National-Strengths): levers on tax reach, harvest, officials, grievances and building cost.
- [Historical Events](Historical-Events): event province stats translated as above.
- [Map and Map Modes](Map-and-Lenses): card fields, tile row, zoom content and map modes.

## Numbers

All province numbers are placeholders, kept in one province data file.

| Value | Config key | Design value |
|---|---|---|
| Tiles per province | `province.tiles.min` / `max` | 4 / 16 |
| Shore tiles | `province.shore_tiles` | 1 to 3 |
| Clearing woods | `province.clear_woods.years` | 3 years |
| Fields back to woods | `province.fields_to_woods.years` | 10 years |
| Destroyed castle as waste | `province.castle_ruin.waste_years` | 5 years |
| Second town tile | `province.town.second_tile_townsfolk` | 40,000 townsfolk |
| Worn recovery | `province.worn.recovery_years` | 5 years |
| Burned tiles rebuilt | `province.burned.rebuild_per_year` | 1 a year |
| Ground and troops | `province.ground.troops` | table above |
| River crossing penalty | `province.river_crossing_penalty` | −20 % |
| Woods ambush | `province.woods_ambush` | +5 % per two woods, cap +15 % |
| Locals in rough ground | `province.locals_rough_bonus` | +10 % |
| Ground and economy | `province.ground.economy` | table above |
| Job slots | `province.buildings.slots` | list above |
| Bare tile slots | `province.bare_tile.slots` | 3,000 |
| Town building slots | `province.town.building_slots` | 1 / 2 / 4 / 6 / 9 / 12 |
| Mill bonus | `province.mill.gold_bonus` | +25 % gold from grain |
| Almshouse | `province.almshouse.shelters` | 3,000 |
| Food per worker | `province.food.per_worker` | 1.5 / 1.33 / 0.67 |
| Harvest roll | `province.harvest.multipliers` | 1.3 / 1.15 / 1 / 0.7 / 0.3 |
| Craft value | `province.wares.craft_value` | ×3 |
| Births and deaths | `province.births` / `deaths` | table above |
| Birth and death modifiers | `province.births.modifiers`, `province.deaths.modifiers` | lists above |
| Famine flee share | `province.famine.flee_share` | a quarter |
| Homeless drift | `province.homeless.drift_share` | not given |
| Homeless thresholds | `province.homeless.thresholds` | 5 % / 10 % / 20 % |
| Homeless deaths | `province.homeless.deaths` | 5 % a year |
| Homeless rebel rate | `province.homeless.rebel_rate` | ×2 |
| Shanty town deaths | `province.shanty.town_death_extra` | +1 % |
| Refugees settle | `province.refugees.settle_years` | 2 years |
| Conscription | `province.recruits.conscription` | below 1/4, ends at 1/2 |
| Tax without official / lord's share | `province.tax.no_official`, `province.tax.lord_share` | half / half |
| Free travel days for tax | `province.tax.free_travel_days` | 5 |
| Far from the throne | `province.far_from_throne.days` | 30 (example) |
| Official full effect | `province.officials.full_effect_years` | 5 years (half in the first) |
| Official effects | `province.officials.effects` | table above |
| Homeland | `province.homeland.years` | 100 years |
| Pretender's right | `province.pretender.years` | 50 years |
| Broken charter | `province.charter.broken_years` | 20 years |
| Castle neglect | `province.castle.neglect_years` | 10 years a step |
| Wall breaches | `province.walls.max_breaches` | 3 |
| Grievance levels | `province.grievances.levels` | 0–1 / 2 / 3 / 4+ |

## Decided since the first draft

- Tax is paid monthly, loses 5 % per day of travel beyond 5, and never exceeds what is owed.
- Provinces have 4 to 16 tiles by their size on the map. A town is a village from 1,000 townsfolk, a market town from 3,000, a town from 8,000, a city from 20,000 and a great city from 40,000. It takes a second tile at 40,000 and a third at 100,000.
- Each class except clergy and scholars gives 1 % of its people a year as recruits. The homeless are not taken first, and rebels come from the recruit pool.
- Birth and death modifiers are percentage points: +0.5 turns a 4 % birth rate into 4.5 %.
- Each harvest step makes the harvest one band better, up to bumper, and steps add up.
- An unpaid month leaves a building neglected at half output; ten neglected years drop it a step.
- Land of peoples with no state of their own counts as unowned, so it can be colonised on its free tiles.
- A customs officer adds 15 % to trade gains; fees and tolls are collected in full with or without him.
- A judge raises the bar for riots by one grievance.
- Armies lose men to sickness each month: none in healthy land, 1 % at medium, 2 % in high, hot, cold or fever land.
- An official learns a province in 5 years among his own people, 7 among a related language and 10 among a foreign one. One official runs more provinces as you learn the right government inventions.

## Still open

Nothing. Every question about provinces has been decided; the numbers marked as placeholders are tuned during balancing.


## For developers

- Spec: [`domain/province/spec.md`](https://github.com/grrts/pocket-hedgemony/blob/claude/domain-specs-bdd-ebdpmx/domain/province/spec.md), requirement code **PROV** (PROV-001 to PROV-292).
- Features: `domain/province/features/` (26 files, from tiles, tile-states and ground-troops to grievances, colonies and country-aggregation).
- Code: rules code for this context goes in `packages/engine/src/domain/province/`, with balance numbers in `packages/rules/data/domain/province.json`. Today's engine keeps per-province owner, population and wealth in `packages/engine/src/world.ts`.
