# Rebellions

Rebellions turn a province's grievances into a rising. There is no anger meter: a province simply counts its named grievances, and as the count grows it grumbles, riots, plots and finally rises. This page covers how a rising starts, how strong and how severe it is, how you can answer it, and what the rebels get if they win.

## How it works

### From grievances to a rising

Every province counts its grievances (the list, and when each starts and ends, is on [Provinces](Provinces)). The count sets the province's step:

| Grievances | Step | What happens |
|---|---|---|
| 0 to 1 | Calm | Nothing |
| 2 | Grumbling | Growth slows, scholars and craftsmen start to leave. No danger of a rising yet. |
| 3 | Riots | Tax and recruits are halved, traders avoid the province, and its lord wavers. A spark now starts a rising at once. |
| 4 or more | Plotting | The province may rise by itself each month. Its card shows the monthly chance and a named plotter. |

Each step shows on the map. The *Homeless* grievance counts fully, and as two grievances where the homeless are above a fifth of the people.

While a province is plotting, it rolls each month to rise by itself:

| Grievances | Chance each month |
|---|---|
| 4 | 5 % |
| 5 | 15 % |
| 6 or more | 30 % |

When a province rises, rebels muster and the rebellion card appears.

### Sparks

A **spark** is a single happening that turns a rioting province (3 or more grievances) into a rising at once. The rebellion card shows the spark as the reason the rising began. In a grumbling province with only 2 grievances, a spark does nothing.

| Kind | Sparks |
|---|---|
| A new burden | The province's tax rate raised; a levy called at harvest time; an army quartered for the winter; an army requisitioning food while the province is already *Hungry* |
| A failed harvest | A failed harvest roll while the province already has *Hungry* |
| An insult to faith | A house of worship of the majority faith demolished; a faith tolerance charter revoked |
| A death or execution | The province's lord executed, or dying without an accepted heir; a popular official dismissed |
| A defeat | Your army loses a battle in or next to the province; the capital falls |
| An outsider | A pretender lands with men; a rival's envoy arrives with gold; a preacher of a new faith arrives |
| The ruler | The ruler dies with a child heir or none |

An event can also act as a spark directly. When a revolution event fires, a rising starts in every province that meets its conditions: if the French revolution fires and Paris and Troyes meet its conditions but Rouen doesn't, Paris and Troyes rise at once and Rouen stays quiet.

### Cause, demand and who joins

A rising's **cause** comes from the province's heaviest grievance. The cause sets what the rebels demand and who joins them most:

| Cause | From | Demand | Who joins most |
|---|---|---|---|
| Hunger | *Hungry* | Food, the castle granary opened to them | Farmers and homeless |
| Tax | *Heavy taxes* or *Conscription* | The tax rate back down and the levy ended | Farmers, craftsmen, market folk |
| Faith | *Wrong faith* or a faith *Broken charter* | A faith tolerance charter, or a ruler of their faith | Everyone of that faith |
| Homeland | *Foreign rule* or *Far from the throne* | Self-rule, then independence | Everyone of the homeland's language |
| Town | *Homeless*, *Broken charter* or *Soldiers quartered* | A town law charter, work, the soldiers gone | Homeless, craftsmen, market folk |
| Lord | *Harsh lord*, or a disloyal lord's own choice | The lord's want (land, an office, lower taxes, independence) | The lord's retinue and officials, plus people of his land who share his faith and language |
| Pretender | A pretender with a right to the province, plus any grievance | The pretender on the throne, or the province handed to them | Lords who back the pretender, plus anyone with a grievance |
| New ideas | From the age of revolutions, any grievance plus support of 0.3 or more for liberalism, socialism, communism or nationalism | A new kind of government | Townsfolk and scholars first |

**Resistance.** When settlers take local people's tiles in a colony, the local people raise a **resistance** instead of rebels. It works by the same rules, with its own named leaders, and its demand is to get their tiles back. A resistance can win.

### The leader

Every rising has a named leader drawn from the province, with Might, Cunning and Logistics like a commander:

| Leader | When | Brings |
|---|---|---|
| A local (dyer, miller, village elder) | Hunger, tax and town risings | Cunning and little Might |
| A preacher | Faith risings | The faith spreads to neighbours twice as fast |
| A veteran | Any province with returned soldiers among the homeless | Might; the rebels fight as if one arms step better |
| The lord himself | A lord's revolt | His retinue, wealth and officials |
| The pretender | A pretender's war | The lords who back them and foreign help |

### Strength: how hard a rising is to beat

**Strength = Men × Arms × Leader × Ground**, and food decides how long they last. In battle, rebels fight as the *Rebel band* kind under the [Warfare](Warfare) battle rules.

**Men.** Rebels are taken out of their classes, their job slots go empty, and they are no longer recruits for you. While a rising grows, each month it draws these shares of each class's men:

| Who | Share each month |
|---|---|
| Homeless | 30 % |
| The class the cause speaks to | 10 % |
| Everyone sharing the faith or language (faith and homeland risings) | 8 % |
| Other classes | 2 % |
| Clergy and scholars | only in faith and new-ideas risings |
| A lord's retinue | all of it at once |

So in Troyes with 1,000 men in a class: a town rising draws 300 homeless or 100 craftsmen, a hunger rising draws 100 farmers but only 20 craftsmen, and a tax rising draws no clergy. A rising stops growing once it has drawn its share or its cause is fixed.

**Arms.** Each step above Tools needs one source:

| Arms step | Multiplier | Sources |
|---|---|---|
| Tools | × 0.4 | Any rising |
| Old weapons | × 0.6 | A forge in the province, or a veteran leader |
| Armed | × 0.8 | A forge and a market, a captured castle's store, or foreign gold |
| Soldiers | × 1.0 | A lord's retinue, deserters, a rival's troops, or a pretender's army |

**Ground and walls.** Rebels fighting in the hills, mountains, forest, jungle or marsh of their own province get the province's *Locals know the land* bonus. Rebels holding a castle fight from its walls.

**Food.** Rebels eat from the local store of the provinces they hold, then by foraging, which burns tiles. With no food, a tenth of their men are lost each month to hunger and desertion. If you burn tiles to starve a rising, *Burned homes* is added wherever the burning happens.

*Worked example.* A rising in Troyes has 3,400 men carrying Old weapons. Its strength is 3,400 × 0.6 × its leader factor × its ground factor.

### Severity: how much harm it does

Severity is separate from strength. It follows the rising's size:

| Tier | Size | What happens |
|---|---|---|
| Riot | One province, no rebel army | |
| Rising | One province with a rebel army | The province sends you no tax, recruits, food or trade, and its official flees |
| Rebellion | 2 to 5 provinces | Rising effects in each province; neighbouring lords of the same faith or language waver; rebels can besiege castles |
| Great revolt | More than 5 provinces, in or next to the capital's province, or a whole lord's land | Civil war: every lord picks a side by loyalty, allies may stay out, and rival AIs may attack |

A rising that starts in or next to the capital is a great revolt at once.

**Spreading.** Each month a rising may spread to each neighbouring province. The chance is higher when the neighbour:

- has the same grievance (it also gets *Neighbour in revolt* until those rebels are beaten or satisfied),
- shares the rebels' faith or language,
- is connected by roads, rivers and traders,
- has many homeless,

and when your army is away at war, you answered the last rising with a massacre, or a rival pays the rebels. The chance is lower when the neighbour shares no grievance, a garrisoned castle sits on the road between, a judge runs the neighbour, your army is in the region, you pardoned the last rising, or an almshouse stands in the neighbour.

**What makes it worse.**

- A disloyal lord whose faith or language matches the rebels may join with his retinue, turning the rising into a lord's revolt with Soldiers' arms.
- While rebels hold a province, they loot one town building a season (the market first), kill or drive out officials, burn tiles when they forage, and make scholars flee.
- A rising keeps pulling in more men every month until its cause is fixed.
- A massacre adds *Bloodshed* for 20 years to every province of the same faith or language.

### Answering a rising

You have five answers:

| Answer | Cost | What happens |
|---|---|---|
| **Grant demand** | What was asked (the tax lowered, a charter, granary food, the lord's want) | The rising ends at once, rebels go back to their classes, the grievance goes. Other provinces with the same grievance become more likely to rise and ask for the same. |
| **Talk** | An envoy or a judge, and some gold | A partial deal of half the demand. Usually works on hunger, tax and town risings; rarely on faith or homeland risings. |
| **Bribe leader** | Gold, more for a lord or a pretender | The leader and his bonus are gone, and the rebels may split or melt away. A faith rising finds a new preacher quickly. |
| **Wait** | The lost tax and output each month | Rebels with no food or arms shrink. Rebels who hold a castle, have a lord or have foreign gold don't. |
| **Attack** | An army that can reach them | A battle under the warfare rules. If you win, the rebels scatter: a third die, a third flee abroad, a third go home as homeless. |

Hunger and tax risings end when their need is met. Faith, homeland and pretender risings don't end by gold or grain.

*Worked example.* With a tax rising in Troyes and *Heavy taxes* also in nearby Sens, granting the demand lowers Troyes's tax rate, ends the rising at once, sends the rebels home and removes *Heavy taxes* from Troyes. Sens becomes more likely to rise and ask for the same.

**After a victory** you choose how to treat the beaten rebels:

| Treatment | Effect |
|---|---|
| Pardon | Survivors return to their classes and the province calms faster, but the leader may rise again |
| Punish the leaders | The leader is executed; that province gets no new rising from the same cause for 10 years |
| Massacre | No rising in that province for 20 years; *Bloodshed* across every province of the same faith or language; lords of that faith or language waver |

### Preventing risings

- End grievances: once a grievance ends, it no longer counts.
- A **judge** running a restless province raises each step's bar by one grievance.
- An **almshouse** sheltering the homeless keeps them from counting toward the trouble.
- A **garrisoned castle** on the main road limits the spread along it and gives the rebels a siege to fight.
- **Loyal lords** stay out of risings, and their retinues fight for you.

### If the rebels win

Rebels win when they have held their provinces for 12 months with no army beating them, or when they take the capital. What they win depends on the cause:

| Cause | Result |
|---|---|
| Hunger | The castle's food is handed out, *Hungry* ends, and the province's lord turns disloyal |
| Tax | The tax rate in their provinces is fixed at light for 10 years |
| Faith | A faith tolerance charter in every province they held, or in a great revolt a ruler of their faith |
| Homeland | Their provinces break away as a new country, from the catalogue if a record fits, or a new one named for the homeland |
| Town | A town law charter, and the quartered army leaves |
| Lord | The lord gets his want, or leaves the realm with his land as his own country or under a neighbour |
| Pretender | The pretender takes the throne (in a great revolt) or the province passes to them |
| New ideas | The government changes to theirs (through the event tree's revolution events) |

### How other systems use it

- The country card's *In revolt* counts provinces with riots or rebels.
- A lord whose loyalty reaches *In revolt* starts a lord's revolt, and in a great revolt lords pick sides by loyalty.
- An event's `unrest` lands as a named grievance (for example "unrest +20" on Troyes gives Troyes one named grievance), `separatism_risk` reads homeland risings, and revolution and reformation events act as sparks or set the cause.
- A rival paying your rebels is a hostile act you can find out about through envoys. While a rival funds a rising, its arms count as Armed from foreign gold and it doesn't shrink while you wait.

### The computer players

AI countries use the same answers as you. Rivals and opportunists pay rebels and attack countries in a great revolt. Opportunists and hegemon seekers fund rebels in a rival's provinces that already have two or more grievances, when they have a free envoy seat and gold to spare. Cautious AIs grant demands early; harsh AIs massacre.

### Each month

A turn is one week, so these steps run once a month, in the turn in which a new month begins.

1. Recount each province's step from its grievances.
2. Apply this month's sparks.
3. Roll the rising chance for each plotting province.
4. Draw new men into each growing rising.
5. Feed the rebels (store, then forage) and apply hunger losses.
6. Roll spread to each neighbour and apply *Neighbour in revolt*.
7. Apply damage in held provinces (looting once a season).
8. Count months held and check whether the rebels have won.

## What you see

- **Steps on the map**: each province's step (grumbling, riots, plotting, risen) shows on the map, with rising icons and a *Grievances* lens.
- **The province card**: while plotting, the monthly chance to rise and the named plotter.
- **The rebellion card**: the rising's name, cause and demand, its leader and a skill, who joined, men, arms and multiplier, what it holds, food in months, severity with its province count and neighbours sharing the grievance, who backs it, where it may spread next month, and the five answers.

*Worked example: the Troyes weavers' rising.* A tax rising holds Troyes town but not the castle, led by Jehan the Dyer (Cunning 3), with craftsmen, homeless and some farmers. The card shows:

- Cause "Heavy taxes", demand "tax back to normal".
- "Men 3,400" and "Arms: tools and old weapons (x0.6)".
- "Holds Troyes town (not the castle)" and "Food: 2 months".
- "Severity Rising · 1 province · 2 neighbours share the grievance".
- "Backed by nobody yet", and where it may spread next month.
- The buttons Grant demand, Talk, Bribe leader, Wait and Attack.

### In the game today

The first slice plays risings on the eight grievances the game tracks, so the risings you meet are hunger, tax, homeland and town ones. They start from a plotting province's monthly roll, or at once in a rioting province when you raise its tax or your army loses a battle in or next to it.

- **Where**: an alert over the map says a rising has begun, with Go there. The province's card opens with the rebellion card, and the five answers under it as big buttons with their gold and odds. Grant asks once more before it gives anything up; Attack sends your nearest free army; Wait folds the card.
- **On the map**: the band stands in its province as a dark rider with its men, and the land it holds is hatched dark. It besieges the castles of its land; once it holds two or more provinces it marches a province a week on the nearest castle beside its land. A taken castle arms it.
- **What it costs you**: a province the rebels hold sends you no tax and no recruits, and its men are taken from its recruits.
- **Beating them**: march an army with a commander onto the band. If you win, the rebels scatter and the same card asks for your verdict: Pardon, Punish the leaders or Massacre. Massacre asks once more. An army that stands four weeks in a held province the band has left takes it back.
- **Overview**: your realm's Provinces tab opens with a Risings block listing every rising and every beaten rising waiting on you, and the General tab has a red Risings line that opens it. A plotting province's mood line gives its chance to rise each month.
- **Answers today**: granting a tax demand puts the tax back to normal and ends the musters there. A hunger demand opens the castle granary (up to 4 months of food). A homeland demand gives self-rule, so *Foreign rule* no longer counts there and the tax stays light for good. A town demand sends your armies out of their land. Talks cost 10 gold a province, once a month. A bribe costs 1 gold per 100 rebels.
- **If they win** (a year held, or the capital's castle taken): tax and town risings keep their tax light for 10 years; hunger risings empty the castles into their stores and turn their lords disloyal; a homeland rising breaks away to the realm that held it in 1444.

## How it connects

- [Provinces](Provinces): grievances, homeless, classes and slots, the local store, judges, almshouses, charters and castles; rebellions writes *Neighbour in revolt*, *Bloodshed* and *Burned homes*.
- [Your-Realm](Your-Realm): lords' loyalty, wants and retinues; the *In revolt* count; lords waver or pick sides.
- [Warfare](Warfare): the *Rebel band* kind, battle rules, break point and sieges.
- [Troop-Movement](Troop-Movement): armies in or away from the region, and marching to attack rebels.
- [Revolutions](Revolutions): risings tagged by a revolution, its camps, and what happens when they win or are crushed.
- [Historical-Events](Historical-Events): the `rebels` effect, `rebels_active`, `unrest` as grievances, sparks from events.
- [Diplomacy](Diplomacy): secretly funding rebels, and envoys fleeing when a host falls to rebels.
- [Religion](Religion): faith risings' demands, preachers as leaders, sparks from faith policy and houses.
- [Culture](Culture): homeland risings draw 8 % of the language and, with nationalism 0.5 or more, demand a new country; *Banned language*.
- [Government](Government): a won New ideas rising sets a form; over-cap lords become disloyal.
- [Subjects](Subjects): a lord leaving with his land.
- [Recruiting](Recruiting): recruits lost to rebels.
- [Buildings](Buildings): looting one town building a season; town walls stop looting without storming.
- [Trade](Trade): traders avoid riots, bandits appear, and rebels act as an enemy army for trade.
- [The-1444-Start](The-1444-Start): a new country for a won homeland rising.
- [Exploration-and-Colonies](Exploration-and-Colonies): colonies, local people's tiles and resistance.
- [Map-and-Lenses](Map-and-Lenses): steps on the map, rising icons and the *Grievances* lens.
- [Time-and-Turns](Time-and-Turns): where the monthly steps sit in the turn.

## Numbers

All numbers are **placeholders** in the province config. The key names are the spec's own labels, since the design names only the groups.

| Key | Value |
|---|---|
| `rebellions.steps.grumbling` / `riots` / `plotting` | 2 / 3 / 4 grievances |
| `rebellions.rising_chance` | 4: 5 %, 5: 15 %, 6+: 30 % |
| `rebellions.sparks` | the sparks table |
| `rebellions.join_share.homeless` | 30 % |
| `rebellions.join_share.cause_class` | 10 % |
| `rebellions.join_share.faith_or_tongue` | 8 % |
| `rebellions.join_share.other` | 2 % |
| `rebellions.arms` | Tools 0.4, Old weapons 0.6, Armed 0.8, Soldiers 1.0 |
| `rebellions.starving_loss` | a tenth a month |
| `rebellions.spread` | not given yet |
| `rebellions.win_hold_months` | 12 |
| `rebellions.bloodshed_years` | 20 |
| `rebellions.punish_lock_years` | 10 |
| `rebellions.massacre_lock_years` | 20 |
| `rebellions.scatter` | a third each: die, flee, homeless |
| `rebellions.talk_share` | half |
| `rebellions.tax_win_years` | 10 |
| `rebellions.outcomes` | the "if the rebels win" table |

## Settled details

- A province with 4 or more grievances is plotting and rises on a monthly roll: 5 % at 4 grievances, 15 % at 5 and 30 % at 6 or more. A spark can start a rising at 3. The rebels come from the province's recruits.
- Faith risings ask for their faith to be tolerated where they hold, or for a house of their own. *Persecuted* counts as two grievances, and persecuting or taking over a house is a spark.
- Rivals stir trouble only through funding rebels: while funded, sparks count double and more people join. A rival caught doing it gives you a reason to go to war.
- When a revolution event fires, every province that meets its conditions rises at once, and those risings follow the revolution's camps.
- Rebels from events start at once, with a size from small (half the province's recruits) to huge (four times as many).
- The heaviest grievance is the one that counts most. Ties go in the cause table's order.
- A disloyal lord revolts on a 5 % roll each month.
- A local leader has Cunning 3 and Might 1, and his Logistics works like any commander's.
- Below nationalism 0.5, a homeland rising wants its own language in the provinces it holds. At 0.5 or more it wants a country of its own.
- Exploration's local attacks cover new colonies. A resistance covers settled land taken by conquest or treaty.
- Armed veterans who kept their arms start at *Old weapons*.
- A riot is just a province state. The rebellion card appears only when a rising starts.
- Provisional numbers that may still be tuned: risings spread 10 % a month to neighbours with 3 or more grievances; a talk costs 10 gold per province; a bribe costs 1 gold per 100 rebels; a grant raises other plotting provinces' chance by 5 points for 12 months; a pardon calms twice as fast; a faith rising finds a new preacher after 12 months; after a massacre lords waver one step.

## Still open

Nothing. Every question about rebellions has been decided.

## For developers

- Spec: `domain/rebellions/spec.md` in the game repository.
- Features: `domain/rebellions/features/`: `rising-steps.feature`, `sparks.feature`, `cause-and-leader.feature`, `strength.feature`, `severity-and-spread.feature`, `answering.feature`, `prevention.feature`, `rebels-win.feature` and `other-systems.feature` (the Troyes rebellion card).
- Code: `packages/engine/src/domain/rebellions/`, with its numbers in `packages/rules/data/domain/rebellions.json`.
