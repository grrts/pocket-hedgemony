# Recruiting

Recruiting is how your realm turns the people of its provinces into soldiers. You call men up with one slider (the levy), train them into regiments of one arm at a castle or drill yard, keep the best as standing regiments, and take officials out of their provinces to lead your armies. Every step has a price in gold, food, work at home and goodwill, and this page explains each one.

## How it works

### Who can be called

Only fighting-age men can be called, and they are about a quarter of a province's people. Each class gives at most a share of its fighting-age men, its call share:

| Class | Call share |
|---|---|
| Homeless | 24 % |
| Herders | 16 % |
| Farmers | 12 % |
| Woodsmen | 12 % |
| Miners | 8 % |
| Seafolk | 8 % |
| Craftsmen | 8 % |
| Market folk | 6 % |
| Clerks | 4 % |
| Clergy and scholars | 0 |

Add these up over a province's classes and you get its **men who can be called**, the ceiling. The ceiling is hard: no levy, war or invention ever takes a province past it. In Troyes that works out at about one man in eight of the fighting-age men. Students can be called from the same pool, while clergy and scholars cannot.

The class a man comes from does not change the soldier he becomes. Every levied man arrives as **levy foot**, the weakest arm, with farm tools. Classes only matter for how many men you can call and what you lose at home when they leave.

With the invention W15 Mass conscription every class's call share rises by half (homeless 36 %, farmers 18 % and so on), and the ceiling stays a share of the fighting-age men.

### The levy

Tap Levy on a province, a region or the country card and you get one slider for how many men, with the costs underneath:

- **Gold now**: levy money of 20 gold per 1,000 men, paid up front for food on the road.
- **Food now**: while they gather, levies eat 1 ration a man a month from the province's local store.
- **Pay**: free for the first 3 months, then 0.15 gold per man a month.
- **Harvest**: how much of the harvest you lose by taking farmers.
- **Pool left**: how much of each province's recruit pool remains.
- **Ready in**: where and when the men will be ready.

A warning sign shows when the season is wrong, and every cost line opens its own gain and lose list so you can see where the number comes from.

There are no class or province settings. A levy takes men from every class in proportion to its share of the men who can be called, and from every province of a region by its share of the region's men. Veterans come along by their share of the pool too: if Troyes has 2,000 recruits of whom 400 are veterans, a levy of 1,000 brings 200 veterans.

The men gather in 2 weeks (in days once you know W18 Railway mobilization) and can march and fight at once as levy foot. While they are away their job slots stay empty, so a building that falls under half filled goes fallow and pays no tax and makes no wares.

**Champagne, late summer 1444.** France is at war with Burgundy. Champagne has 4 royal provinces, about 260,000 people, 65,000 fighting-age men and 7,900 men who can be called, 65 % of them farmers. It is 3 weeks before harvest. A levy of 5,000 costs 100 gold and 2,500 rations, cuts the Champagne harvest by 6 %, and leaves each province 37 % of its pool. The levy takes 3,250 farmers, 550 herders, 500 homeless, 300 woodsmen, 200 craftsmen, 150 seafolk and 50 others. The screen reads "Ready in 2 weeks at Troyes" as 5,000 levies, with a harvest warning. Push the slider to 6,000 and each province keeps only 24 % of its pool, so all four get the Conscription grievance.

### The recruit pool

Each province keeps three soldier counts:

- **Recruits here**: the men who can be called right now, never above the ceiling.
- **Fallen from here**: men from this province killed in the last 10 years.
- **Veterans here**: men home from war who were trained or stood in a battle.

The pool refills each year by a quarter of the gap to the ceiling, or a third with a muster master as official. It grows when disbanded men come home, and a growing population raises the ceiling. It shrinks for levies, students enrolling, famine, plague, men dying in war and rebels drawing from it. While a province riots, what can be called there is halved.

**Conscription.** If a levy draws a province's pool below a quarter of its ceiling, the province gets the Conscription grievance. If the province has Fallen from here, the line is a third instead. With W15 Mass conscription it is only below a tenth.

**The fallen.** Each soldier levied in a province who dies adds one to its Fallen from here, which fades by a tenth each year. For each 1 % of a province's people fallen, its births fall by 0.2 % for 10 years.

**Veterans.** Disbanded regiments and levies who were trained or stood in a battle come home as Veterans here. They fade by a tenth a year from old age, and also leave by dying or going off as settlers.

### What a levy costs at home

- **Births**: while fighting-age men are away, births fall by the share of them away.
- **The harvest**: a levy in the sowing or harvest season cuts the harvest by twice the share of farmers taken, and by 1.5 times that at harvest. Sowing and harvest months come from config per climate, so a winter levy costs almost no harvest. Rice lands count two harvests and two bad seasons. In a pastoral province, taking herders during the spring move cuts herd growth instead.
- **Food**: men in a training camp eat 1.5 rations a month and horses 3, from the training castle's store first and then its province. A man eats 2 rations on campaign and 1 at home. Before an army marches abroad it fills a reserve of reserve size × 2 rations per man per month, from the castle store first, then the locals.

### Training

Levies can only be trained at a **training place**: a castle or a drill yard of yours. Each has a training room, the number of men it trains at once:

| Training place | Training room |
|---|---|
| Earthwork ring fort | 1,000 |
| Stone castle | 3,000 |
| Bastion fort | 5,000 |
| Star fort | 8,000 |
| Drill yard | 1,500 of any arm |
| Barracks (drill yard step) | 4,000 of any arm |

A castle and a drill yard in the same province add their rooms together. You pick the arm, how many men and the place; the men walk there and start. If you order training from a town with neither, the men march to the nearest place that can train. You can only train into arms your realm has unlocked, and training takes the months, gold and goods in this table (per 1,000 men):

| Arm | Months | Gold | Needs |
|---|---|---|---|
| Levy foot | 0 | 0 | nothing |
| Armoured foot | 2 | 80 | 10 loads of arms |
| Pikes | 3 | 60 | 10 loads of arms |
| Archers | 4 | 60 | 10 loads of arms |
| Hand gunners | 3 | 120 | 10 loads of arms, 10 powder |
| Pike and shot | 4 | 150 | 20 arms, 10 powder |
| Musketeers | 5 | 180 | 20 arms, 20 powder |
| Line infantry | 6 | 220 | 20 arms, 20 powder |
| Riflemen | 6 | 300 | 30 arms, 30 powder |
| Light horse | 3 | 100 | 1,000 horses |
| Camel riders | 3 | 100 | 1,000 camels |
| Horse archers | 6 | 150 | 1,000 horses, 10 arms |
| Knights and lancers | 9 | 300 | 1,500 horses, 20 arms |
| War elephants | 6 | 400 | 125 elephants |
| Gun crews | 4 | 200 | the guns, horses or oxen for them, 20 powder |

Some things speed training up or change it:

- A **Marshal** as the province's official makes training there 25 % faster.
- **Veterans** train in half the time, so a regiment made mostly of veterans finishes early.
- **Retraining** a regiment to a newer arm takes half the months and half the gold, and it keeps its drill and scars.
- Until the order is done the men are still levies. If you **call them out of training** to fight, they go as levy foot and the months spent are lost.
- A castle or town **under siege** stops all training in it.
- If training runs past the **3 free months**, you pay for those months. Pikes and light horse (3 months) finish inside the free months; knights (9 months) cost 6 months of pay.

When training finishes, the regiment has its arm, drill 3 (drill 4 if trained under a Marshal), pay by its arm and a break point of 30 % plus its troop level. Untrained levies stay at drill 0 and break at 25 %. Training never changes a regiment's kind: a trained levy regiment still goes home like levies, after 6 months at 5 % a month unless paid double.

Pay by arm, per 1,000 men a month: foot 200 gold, gunners 250, horse 400, knights 600, and gun crews 10 gold per crew of 15.

**Champagne continued.** Of the 5,000 levies, 2,500 train into pikes at the castle of Troyes and 500 into light horse at Reims, while 2,000 march at once as levies. The pikes cost 150 gold and 25 loads of arms and eat 11,250 rations in 3 months. The light horse cost 50 gold and 500 horses and eat 6,750 rations. Training eats 18,000 rations from the castle stores at Troyes and Reims, and no pay is owed. Filling a 2-month reserve then takes 23,000 rations. From the 4th month the army costs 1,000 gold a month in pay and eats 11,500 rations a month on campaign, about 6,500 more than the men would eat at home.

### Standing regiments and retinues

With W12 Standing regiments you can **sign on** a trained regiment. It stays under arms in peace, keeps its drill and scars, and is paid 1.5 times, all year round. Its men are gone from their province's pool and their slots stay empty. Housed in a barracks in peace, a standing regiment gives the province no Soldiers quartered; without a barracks it is quartered on the people like any army in winter.

Lords raise their retinues by the same rules, with their own wealth and at their own castles. Their traits decide what they train: a Warlike lord trains knights and armoured foot, a Greedy one keeps levies.

### What recruiting gives back

- Taking homeless men means less theft and begging, and the province may lose the Homeless state.
- While men serve abroad, their home province has fewer mouths to feed.
- Each month a fifth of the pay of soldiers training, standing or quartered in one of your provinces is spent there, as trade for its market folk, and its tax owed rises by the same amount.
- Disbanded men can go as **soldier settlers** to a frontier or colony province with free tiles. They clear tiles twice as fast as other settlers and become farmers, and that province needs one grievance more to riot for 10 years.
- When an army disbands, a tenth of its loot goes to the provinces its men came from, raising their local store and tax owed for a year.

### What recruiting takes

- Disbanded men go back into the emptiest slots of their province; those with no free slot become homeless.
- On disbanding you choose **Keep the arms** (they go back to the store) or **Let them keep them**: no carting, the garrison fights 10 % better for 5 years, but veterans start any rising there armed and drilled.
- An army that disbands within 3 months of a plague or high-sickness campaign brings a plague rumour home to 1 in 4 of the provinces it disbands into.
- Students called to arms stop making research.

### Commanders from officials

Any official can be **commissioned** to lead an army or stand in one as a captain. They leave the province they ran and start with the skills and trait offer of their type:

| Official type | Might | Cunning | Logistics | Trait offered |
|---|---|---|---|---|
| Warden | 2 | 1 | 1 | Steady or Siege master |
| Steward | 0 | 1 | 3 | Careful |
| Muster master | 1 | 1 | 2 | Beloved or Old soldier |
| Master of works | 0 | 1 | 2 | Siege master |
| Tax collector | 0 | 2 | 2 | Greedy |
| Customs officer | 0 | 3 | 1 | Careful |
| Judge | 1 | 2 | 1 | Steady or Cruel |
| Schoolmaster | 0 | 2 | 1 | Old soldier |
| Marshal | 2 | 2 | 2 | Any |

At 5 years served the type's highest skill gains +1, and +1 more at 10, up to 5. You pick the offered trait or keep the one rolled. A commander gets the realm's current style for their era and country; a Marshal may take any style your realm has seen in a battle it fought. Years served count where the official was assigned.

**The costs.** A commission costs 10 gold once. In the field an official earns their wage ×3 as commander or ×2 as captain. They bring a staff of 100 (commander) or 50 (captain) who eat 2 rations each a month from the army's reserve, and a commander's 30 staff horses eat 3 each.

**The empty province.** When you commission an official you choose how their province is run:

| Choice | Effect |
|---|---|
| Leave it | Half tax, half recruits, and the province is Ungoverned |
| Move another official in | The moved official starts at half effect, and their old province becomes the empty one |
| Name a deputy | Full tax and recruits, no type effect, for 1 gold a month; needs 20 clerks in the province |
| Ask the lord next door | A loyal neighbouring lord takes the recruits for his retinue and half the tax, grows a step more loyal, and may ask for it as a fief when the war ends |

When you release the official you send them to a province of your choice. Their years served restart at half, unless they return to the province they left and a deputy ran it.

**The steward of Reims.** The steward of Reims has 8 years served and Reims has at least 20 clerks. Commissioned as commander with a deputy named, the steward has Might 0, Cunning 1, Logistics 4 and the trait Careful, the deputy costs 1 gold a month, and the army eats 20 % less. When the lords are called, the Proud Count of Foix refuses to bring his retinue and the Duke of Bourbon comes. After two wins the army comes home in spring with 700 of the 5,000 dead: the steward returns to Reims at full effect at once, Troyes' births dip for a decade, and 1,400 veterans return to Troyes who will train in half the time.

### The Marshal

The Marshal is an official type trained for war. You get one from an academy, by hiring one at three times a normal official's price, or by raising a captain who stood in 3 won battles (one offer per won battle). While a Marshal runs a province, training there is 25 % faster and regiments leave with drill 4. A Marshal is paid twice an official's wage in war or peace, and one who spends 10 years in a province with no war loses 1 from their best skill.

### What official commanders mean

- They never refuse a command, never go home with their men mid-war, and never defect with land.
- When their army wins, every lord's loyalty and the ruler's standing rise a little, and no single lord grows from it.
- An official who returns with 3 or more victories gives 1.5 times their type's effect where they serve.
- A Proud lord serving as captain under an official wavers a step each season, and refuses to bring his retinue unless the war aim is his Want.
- An official commander brings no retinue of their own.
- If one is killed or captured you lose a commander and an official; a ransom brings both back.
- An official with 8 victories who has led the same regiments for 5 years becomes "their man". At 6 victories they ask for land: refusing makes them Ambitious, granting turns them into a lord with their old soldiers as his retinue.

Other leaders: the ruler and heirs can lead, lords lead only their own retinues as captains, hired captains come with their free companies, and exiles who ask to serve become officials of the type closest to their past.

### The computer players

The AI uses the same levy and training commands. Its catalogue personality sets how much of its pool it dares to levy and what it trains: a militarist levies deep and trains expensive arms, a merchant republic levies little and hires companies instead, a steppe realm trains horse archers. It avoids levying in harvest months unless an enemy army is in its land, and it commissions stewards and wardens first, keeping tax collectors in their seats.

### Each month

Each province is updated once a month: the pool refills toward the ceiling, Fallen and Veterans fade, training months tick down and finished regiments come out, births are cut by men away and fallen, pay starts for levies past their free months, a fifth of pay is spent where soldiers are, the empty province's effects apply, and Marshal idleness counts up. A levy itself is worked out in one calculation when you tap it.

## What you see

- **The levy screen**, opened from a province, a region or the country card: one men slider; Gold now, Food now, Pay, Harvest, Pool left and Ready in; a season and harvest warning sign; a gain and lose list behind every cost line.
- **The training choice**: arm, number of men and training place (castle or drill yard).
- **The disbanding choice**: Keep the arms or Let them keep them, and where to settle men.
- **The commission choice**: commander or captain, the trait to pick, and the four ways to run the empty province.
- **Province stats**: Recruits here, Fallen from here and Veterans here.

## How it connects

- [Provinces](Provinces): classes, job slots, homeless, officials, grievances and births; recruiting writes back empty slots, Conscription and the three soldier counts.
- [Your-Realm](Your-Realm): gold, food and arms stores, lords and their loyalty, officials' wages, schools and academies.
- [Warfare](Warfare): takes the companies and commanders recruiting makes, and reports deaths, victories, loot and sieges back.
- [Buildings](Buildings): castle steps, the drill yard and its barracks step set training room.
- [Research](Research): W12, W15 and W18 unlock signing on, raise call shares and speed gathering.
- [Troop-Movement](Troop-Movement): gathered levies and trained regiments become movers, and levies walk to their training place.
- [Naval](Naval): mustering sailors reuses the levy, and admirals reuse the commission and the empty province.
- [Rebellions](Rebellions): armed veterans, rebels drawing from the pool, and the Conscription grievance.
- [Historical-Events](Historical-Events): plague rumours brought home and generals who grow too big.
- [Time-and-Turns](Time-and-Turns): the month tick, the seasons and the order of monthly steps.
- [Government](Government): the Ungoverned state and lords' fiefs.
- [Diplomacy](Diplomacy): war aims (a lord's Want) and exiles asking to serve.

## Numbers

The design names one recruiting config file but no key names yet (OQ-RECR-19), so the keys below are described. Every value is a **placeholder** waiting for a balancing pass.

| Value | Design number |
|---|---|
| Fighting-age share | about a quarter of people |
| Call shares | see table above; W15 raises them ×1.5 |
| Pool refill a year | 1/4 of the gap; 1/3 with a muster master |
| Conscription line | 1/4 of ceiling; 1/3 with Fallen; 1/10 with W15 |
| Fallen and Veterans fade | a tenth a year each |
| Births cut per 1 % fallen | 0.2 % for 10 years |
| Gathering | 2 weeks; days with W18 |
| Levy money | 20 gold per 1,000 men |
| Free months | 3 |
| Levy pay | 0.15 gold per man a month |
| Pay by arm (per man a month) | foot 0.2, gunners 0.25, horse 0.4, knights 0.6; gun crews 1 per crew of 15 |
| Standing pay | ×1.5 |
| Rations | gathering 1, camp 1.5, campaign 2, home 1; horse 3 |
| Lost harvest | ×2 share of farmers taken, ×1.5 at harvest |
| Training room, arm table | see tables above |
| Veterans / retraining | half the time / half months and half gold |
| Marshal | 25 % faster, drill 4, hired at 3×, paid 2×, −1 skill after 10 idle years |
| Drill and break point | trained 3 and 30 % + troop level; levies 0 and 25 % |
| Pay spent at home | a fifth |
| Soldier settlers | clear ×2; +1 grievance to riot for 10 years |
| Loot home | a tenth, for a year |
| Armed veterans | garrison +10 % for 5 years |
| Sickness brought home | within 3 months; 1 in 4 provinces |
| Years served bonus | +1 at 5 years, +1 at 10, up to 5 |
| Commission | 10 gold; wage ×3 commander, ×2 captain |
| Staff | 100 or 50, 2 rations each; 30 horses at 3 rations |
| Deputy | 20 clerks; 1 gold a month |
| Returning official | 3+ victories gives 1.5× effect |
| Land request / "their man" | 6 victories / 8 victories and 5 years |

The engine today uses simpler realm-wide values in `packages/rules/data/defines.json`: `levies.menPerThousandPeople` 4, `levies.monthlyRecoveryFraction` 0.0167, `military.upkeepPerThousandMenPerMonth` 0.2, `march.rationsPerSoldier` 2, `march.monthsCarried` 2 and `march.logisticsRationCut` 0.05.

## Still open

- **OQ-RECR-1**: the fighting-age share and call shares need balancing against the troop cap.
- **OQ-RECR-2**: whether women are in the levy is not designed.
- **OQ-RECR-3**: muster master refill is "a third of the gap" in one place and "25 % faster" in two others.
- **OQ-RECR-4, 5, 6**: warfare, province stats and country stats have not yet taken in recruiting v3 (muster master, levy then train, commissioned officials, disbanding choice).
- **OQ-RECR-7**: the engine keeps one realm-wide pool and flat upkeep, unlike the design.
- **OQ-RECR-8**: when the 3 free months start (at the levy or when gathering ends).
- **OQ-RECR-9**: which pay group archers, musketeers, horse archers, elephants and other arms belong to.
- **OQ-RECR-10**: how the Conscription line is measured, and how the Fallen and W15 lines combine.
- **OQ-RECR-11**: how yearly rules are split across monthly updates.
- **OQ-RECR-12**: W18 gathering "in days" has no number, and other designs word it differently.
- **OQ-RECR-13**: how many students a levy takes.
- **OQ-RECR-14**: rice-land and pastoral harvest losses and season months have no values.
- **OQ-RECR-15**: where a region or country levy gathers, and how that fits "new regiments go to".
- **OQ-RECR-16**: whether the land request at 6 victories applies to all commanders or only officials.
- **OQ-RECR-17**: tie rule for "+1 to the highest skill", and whether 5 is the skill cap.
- **OQ-RECR-18**: a captain's staff horses, and whether staff count toward forage and column size.
- **OQ-RECR-19**: the config file and key names are not named.
- **OQ-RECR-20**: several amounts are missing ("a little" loyalty, loot split, how long the 1.5× effect lasts).
- **OQ-RECR-21**: whether naval mustering counts against the recruiting ceiling.
- **OQ-RECR-22**: the gap list still lists the barracks as open though it is now answered.
- **OQ-RECR-23**: the "others" class in the Champagne example, and whether a region levy draws lords' provinces.
- **OQ-RECR-24**: whether riots halve the pool or the ceiling, and for how long.

## For developers

- Spec: `domain/recruiting/spec.md` in the game repository, requirement code **RECR** (RECR-001 to RECR-100).
- Features: `domain/recruiting/features/`, including `levy.feature`, `training.feature`, `commissioning-officials.feature` and the worked example `champagne-1444.feature`.
- Code: there is no `packages/engine/src/domain/recruiting/` yet. Today's levy code is `runLevies` and `runEconomy` in `packages/engine/src/turn.ts` and `recomputeMaxLevies` in `packages/engine/src/world.ts`, with values in `packages/rules/data/defines.json`.
