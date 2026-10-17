# Recruiting (RECR)

## 1. Purpose and scope

Recruiting decides how a realm turns the people of its provinces into soldiers (the **levy**), trains those
levies into **regiments** of one arm, signs regiments on as **standing regiments**, and turns its
**officials** into commanders (the **commission**), and what each of these costs in gold, food, work and
goodwill. It also owns the three per-province stats that count soldiers: **Recruits here** (as recruiting
defines its ceiling), **Fallen from here** and **Veterans here**.

**In scope**
- Men who can be called per province: fighting-age men, call shares per class, the hard ceiling.
- The levy: one slider, every class and every province by its share, gathering, levy money, gathering food.
- The recruit pool: refill, *Fallen from here*, *Veterans here*, the *Conscription* thresholds.
- The costs of a levy at home: lost tax from empty slots, lost harvest by season, fewer births.
- Training: training places and training room, what each arm takes, veterans, retraining, interruption,
  what a regiment is when it finishes.
- Standing regiments (signing on, housing in a barracks).
- Lords' retinues, raised by the same rules.
- What recruiting gives back and takes (pay spent at home, soldier settlers, loot home, coming home,
  armed veterans, sickness brought home, schools emptied).
- Commanders from officials: commission, the Marshal official type, commission costs, the empty province,
  the effects of official commanders.
- The AI's recruiting choices.

**Not in scope (owned by …)**
- Arms, kinds, companies, drill, break points in battle, troop cap, upkeep rules in general, commanders' stats
  and how they change, generals who grow too big, hired companies, calling the lords: **warfare**.
- Where an army marches, rally points and "new regiments go to": **troop-movement**.
- Classes, job slots, homeless, officials and their types in a province, grievances, births: **province**.
- Gold, food stores, the Food policy screen, lords and their loyalty and traits, schools and academies:
  **realm**.
- The drill yard, barracks and castle buildings themselves (cost, slot, steps): **buildings**.
- Inventions W12, W14, W15, W18 as research items: **research**.
- Mustering sailors and admirals (which reuse the levy and the commission): **naval**.
- The order of systems in a turn and in its monthly steps: **time-and-turns**.

## 2. Sources

Newest decision first.
1. `recruiting/recruiting-design.md` version 3 (all sections 1–11; v3 change: drill yard and barracks; v2 change:
   one-step levy, classes only count toward the ceiling, levies always arrive untrained).
2. `planning/gap-lists.md` version 2 (16 Oct 2026), "Decisions already made" and item 5 (recruiting 11 still open).
3. `buildings/buildings-design.md` 7.8 (drill yard, barracks, castle steps) — used as written.
4. `domain/DECISIONS.md` (17 Oct 2026): X-2 (turn order, yearly steps in January), X-4 (seasons, harvest month), X-7
   (recruiting v3 followed everywhere), X-9 (rebels drawn from the recruit pool); and section 13 below.
5. Cross-checked; recruiting v3 wins where they differ (X-7): `warfare/warfare-design.md` 2.3, 3.1, 3.4, 3.5, 4.4, 4.6, 6.1;
   `province-stats/province-stats-design.md` 6.6, 10.2; `country-stats/country-stats-design.md` 6 (Commanders row);
   `country-stats/research-tree.md` (W12, W14, W15, W18); `naval/naval-design.md` 2 (mustering sailors), 5 (admirals).
6. Engine code (for comparison only): `packages/rules/data/defines.json` blocks `levies`, `military`, `march`;
   `packages/engine/src/turn.ts` `runLevies`, `runEconomy`; `packages/engine/src/world.ts` `recomputeMaxLevies`.

## 3. Ubiquitous language

| Term | Meaning | Not to be confused with |
|---|---|---|
| Levy (the act) | Calling men up from one or more provinces; one slider, no class or province settings | Calling the lords (warfare 3.2) |
| Levies (the men) | Untrained men with farm tools, fighting as levy foot | A trained regiment that is still of the levy kind |
| Levy foot | The weakest arm; what levies are before training (strength 1.0) | — |
| Regiment | A warfare company whose arm is set by training | A standing regiment (a regiment signed on) |
| Arm | What a regiment fights as (pikes, archers, light horse …), warfare 2.2 | Kind |
| Kind | Where soldiers come from: levy, retinue, hired company, standing regiment, garrison (warfare 2.3); training does not change it | Arm |
| Fighting-age men | About a quarter of a province's people; the only people who can be called | Men who can be called |
| Call share | The share of a class's fighting-age men that can be called | — |
| Men who can be called (ceiling) | Sum over classes of fighting-age men × call share; a hard ceiling | Recruits here (the current pool) |
| Recruits here (the pool) | Men who can be called now, up to the ceiling | Students here |
| Fallen from here | Men from this province killed in the last 10 years | — |
| Veterans here | Men home from war who were trained or stood in a battle | — |
| Conscription | The province grievance (province 12.1) given when a province's pool is drawn too low | W15 Mass conscription |
| Gathering / muster | The 2 weeks (3 days with W18) in which levied men gather as levies, as one army in the drawn province that gives the most men | — |
| Pay group | Foot, gunners, horse, knights or gun crews: what an arm is paid (D-RECR-9) | Arm |
| Levy money | Gold paid up front for food on the road to the muster | Pay |
| Free months | The first 3 months a levy serves without pay, counted from the day it has gathered (warfare 2.3, D-RECR-8) | — |
| Training place | A castle or a drill yard (or its barracks step) of yours | — |
| Training room | How many men a training place trains at once | Garrison room |
| Retraining | Training a regiment to a newer arm, at half months and half gold, keeping drill and scars | — |
| Signing on | Making a trained regiment a standing regiment (needs W12) | — |
| Soldiers quartered | The burden of soldiers quartered on the people (warfare 6.6) | — |
| Official | A crown appointee running a province, with a type and years served (province 10.2) | Lord |
| Commission | Taking an official out of their province to lead an army or stand as a captain | — |
| Commander / captain | Leader of an army / of one sector in it (warfare 4.5) | — |
| Marshal | A new official type trained for war | Muster master |
| Years served | Years an official has run provinces; sets commander skill bonuses | — |
| Empty province | The province an official leaves when commissioned | Ungoverned (its effect if left) |
| Deputy | A clerk from the province's own clerks class who runs it while the official is away | — |
| Staff | Guards, grooms and clerks travelling with a commander or captain | — |
| Soldier settlers | Disbanded men sent to a frontier or colony province with free tiles | — |

## 4. Domain model

### Aggregates

**ProvinceRecruitment** (identity: province id; one per province)
- Holds: ceiling (derived), Recruits here, Fallen from here (with the year each man fell, to fade), Veterans here,
  the training under way at its training places, whether a Marshal or muster master is its official.
- INV-RECR-1: Recruits here is never above the ceiling; no levy, war or invention ever takes a province past it.
- INV-RECR-2: The ceiling is the sum over classes of (fighting-age men of that class × its call share); clergy and
  scholars add 0.
- INV-RECR-3: Recruits here, Fallen from here and Veterans here are never negative.
- INV-RECR-4: Men in training at a training place never exceed its total training room (castle room + drill yard room).

**Levy** (identity: levy id; created by the Levy command)
- Holds: men by province and by class, owner, gathering place, day gathered, months served, months paid.
- INV-RECR-5: Men taken from each class are proportional to that class's share of the men who can be called;
  men taken from each province of a region are proportional to that province's share of the region's men.
- INV-RECR-6: A levy is always of arm levy foot when it arrives.

**TrainingOrder** (identity: training order id)
- Holds: training place, arm, men (and their veteran share), months left, gold paid, loads, horses or animals taken.
- INV-RECR-7: Only arms the realm has unlocked can be ordered.
- INV-RECR-8: Until the order is done, its men are levies.

**Regiment** (a warfare company; recruiting holds only its training-related facts)
- Holds: arm, drill, kind, whether signed on, housed-in barracks.
- INV-RECR-9: Training does not change a regiment's kind.

**Commission** (identity: official id while commissioned)
- Holds: official, army, role (commander or captain), the province left and the choice made for it, deputy or
  stand-in, victories, years served at the moment of commission.
- INV-RECR-10: A commissioned official runs no province while commissioned.
- INV-RECR-11: A lord can't be commissioned to command a royal army.

### Entities and value objects
- **CallShareTable**: class → call share of its fighting-age men (2.2 table).
- **ArmTrainingNeeds**: arm → months, gold per 1,000 men, needs per 1,000 men (4.2 table).
- **TrainingRoom**: training place type → men (4.1 table).
- **PayByArm**: foot 0.2, gunners 0.25, horse 0.4, knights 0.6, gun crews 1 per crew of 15 (gold a month).
- **OfficialToCommander**: official type → starting Might, Cunning, Logistics and trait offer (7.1 table).
- **SeasonCalendar**: per climate, sowing and harvest months (config).
- **EmptyProvinceChoice**: Leave it · Move another official in · Name a deputy · Ask the lord next door.

### Domain services
- **LevyCalculator**: given provinces and men, returns men by class and province, gold, food, pay, harvest loss,
  pool left and the Conscription warning. One calculation when tapped.
- **TrainingPlanner**: given levies, arm, men and training place, returns months (veterans, Marshal), gold, loads,
  animals and food.
- **CommissionService**: turns an official into a commander with skills from type and years served.

## 5. Requirements

### Who can be called
- RECR-001 The recruiting system shall count only fighting-age men, a quarter of a province's people (config), as people who can be called; the levy takes men only, with the same share in every realm. [recruiting §2.2; D-RECR-1, D-RECR-2]
- RECR-002 The recruiting system shall let each class give at most its call share of its fighting-age men: homeless 24 %, herders 16 %, farmers 12 %, woodsmen 12 %, miners 8 %, seafolk 8 %, craftsmen 8 %, market folk 6 %, clerks 4 %, clergy and scholars 0. [recruiting §2.2]
- RECR-003 The recruiting system shall set a province's men who can be called (its ceiling) to the sum over its classes of fighting-age men times call share. [recruiting §2.2]
- RECR-004 If any levy, war or invention would take a province's men who can be called past its ceiling, then the recruiting system shall hold it at the ceiling. [recruiting §2.2]
- RECR-005 The recruiting system shall make every levied man levy foot regardless of the class he came from. [recruiting §2.2, v2 change]
- RECR-006 Where the realm has W15 Mass conscription, the recruiting system shall raise every class's call share by half (homeless 36 %, farmers 18 % …), keeping the ceiling a share of fighting-age men. [recruiting §2.5]
- RECR-007 Students shall be callable from the same pool as levies, as a class with the clerks' call share of 4 % of their fighting-age men, while clergy and scholars shall not. [recruiting §2.2, §6.2; D-RECR-13]

### The levy
- RECR-008 When the player taps Levy on a province, a region or the country card, the recruiting system shall show one slider for men and the costs: gold now, food now, pay, harvest, pool left, ready in, with the season and a harvest warning. [recruiting §2.1] *Replaced in part by RECR-104, RECR-105 (playtest feedback).*
- RECR-009 The recruiting system shall show, for every cost line on the levy screen, its gain and lose list. [recruiting §2.1]
- RECR-010 When a levy is made, the recruiting system shall take men from every class in proportion to that class's share of the men who can be called, with no player setting. [recruiting §2.3]
- RECR-011 When a levy is drawn from a region, the recruiting system shall take men from every province in the region by its share of the region's men. [recruiting §2.3] *Replaced in part by RECR-104 (playtest feedback).*
- RECR-012 When a levy is made, the recruiting system shall include veterans by their share of the pool. [recruiting §2.4]
- RECR-013 When a levy is made, the recruiting system shall have the men gather in 2 weeks as levies who can march and fight at once as levy foot. [recruiting §1, §2.1] *Replaced in part by RECR-106, RECR-107 (playtest feedback).*
- RECR-014 Where the realm has W18 Railway mobilization, the recruiting system shall have levies gather in 3 days instead of 2 weeks. [recruiting §2.5; D-RECR-12] *Replaced in part by RECR-106 (playtest feedback).*
- RECR-015 When a levy is made, the recruiting system shall charge levy money of 20 gold per 1,000 men up front. [recruiting §3.1]
- RECR-016 While a levy gathers, the recruiting system shall have it eat 1 ration per man a month from the province's local store. [recruiting §3.2]
- RECR-017 The recruiting system shall pay no wage for a levy's first 3 months and 0.15 gold per man a month from the 4th month, counted as RECR-101 says. [recruiting §3.1, §4.3]
- RECR-018 While levied men are away, the recruiting system shall leave their job slots empty, so a building under half filled goes fallow and pays no tax and makes no wares. [recruiting §3.1, §6.2]

### Recruit pool and Conscription
- RECR-019 In the turn in which 1 January falls, the recruiting system shall refill each province's Recruits here by a quarter of the gap to the ceiling, or a third with a muster master. [recruiting §2.4; D-RECR-3, D-RECR-11]
- RECR-020 The recruiting system shall raise Recruits here when disbanded men come home, and let a growing population raise the ceiling. [recruiting §2.4]
- RECR-021 The recruiting system shall lower Recruits here for levies, students enrolling, famine, plague, men dying in war, and rebels drawing from it when a rising starts (X-9). [recruiting §2.4]
- RECR-022 While a province riots, the recruiting system shall let only half its Recruits here be called; the ceiling does not change, and the whole pool can be called again when the riot ends. [recruiting §2.4; D-RECR-24]
- RECR-023 When a levy leaves a province's Recruits here below a quarter of its ceiling, the recruiting system shall give that province the Conscription grievance. [recruiting §2.4, §6.2, §2.1; D-RECR-10]
- RECR-024 While a province has Fallen from here, the recruiting system shall give Conscription at a third of the ceiling instead of a quarter. [recruiting §2.4]
- RECR-025 Where the realm has W15 Mass conscription, the recruiting system shall give Conscription only below a tenth of the ceiling, whether or not the province has Fallen from here. [recruiting §2.5; D-RECR-10]
- RECR-026 When a soldier levied in a province dies, the recruiting system shall add one to that province's Fallen from here, and shall fade a tenth of it each January. [recruiting §2.4; D-RECR-11]
- RECR-027 The recruiting system shall cut births in a province by 0.2 % for 10 years for each 1 % of its people fallen. [recruiting §2.4, §3.2]
- RECR-028 When disbanded regiments and levies who were trained or stood in a battle come home, the recruiting system shall add them to that province's Veterans here. [recruiting §2.4]
- RECR-029 The recruiting system shall lower Veterans here by old age (a tenth each January), dying and leaving as settlers. [recruiting §2.4; D-RECR-11]
- RECR-030 While a province's fighting-age men are away, the recruiting system shall cut its births by the share of fighting-age men away. [recruiting §3.2]

### Food and the harvest
- RECR-031 While men are in a training camp, the recruiting system shall feed them 1.5 rations a man a month and 3 a horse, from the training castle's store first, then its province. [recruiting §3.2, §4.4]
- RECR-032 The recruiting system shall count 2 rations a man on campaign and 1 at home. [recruiting §3.2, §4.4]
- RECR-033 Before an army can march abroad, the recruiting system shall fill its reserve with reserve size × 2 rations a man a month, from the castle store first, then the locals. [recruiting §3.2]
- RECR-034 When men are levied in a sowing or harvest season, the recruiting system shall cut the harvest by twice the share of farmers taken, times 1.5 at harvest. [recruiting §3.2]
- RECR-035 Where a province has rice lands, the recruiting system shall count two harvests and two bad seasons: sowing in May–June and November–December, harvest in February–March and August–September, each lost by RECR-034's rule. [recruiting §3.2; D-RECR-14]
- RECR-036 Where a province is pastoral, the recruiting system shall cut herd growth instead of harvest by twice the share of herders taken when they are away in the spring move (March–May in the north, September–November in the south). [recruiting §3.2; D-RECR-14]
- RECR-037 The recruiting system shall read sowing and harvest months per climate from config: in the north sowing in March–April and harvest in August–September, in the south sowing in September–October and harvest in February–March, so a winter levy costs no harvest. [recruiting §3.2; X-4; D-RECR-14]
- RECR-038 While the season is wrong for a levy, the levy screen shall show a warning sign. [recruiting §2.1, §3.2]

### Training
- RECR-039 The recruiting system shall train levies only at a castle or a drill yard of the realm. [recruiting §4.1]
- RECR-040 The recruiting system shall give each training place its training room: earthwork ring fort 1,000, stone castle 3,000, bastion fort 5,000, star fort 8,000, drill yard 1,500 of any arm, barracks 4,000 of any arm. [recruiting §4.1]
- RECR-041 Where a province has both a castle and a drill yard, the recruiting system shall add their training rooms together. [recruiting §4.1]
- RECR-042 If levies are ordered to train from a town with neither castle nor drill yard, then they shall march to the nearest place that can train. [recruiting §4.1]
- RECR-043 When the player trains levies, the recruiting system shall let them pick the arm, how many men and the castle or drill yard, and the men walk there and start. [recruiting §4.1] *Replaced in part by RECR-109 (playtest feedback).*
- RECR-044 The recruiting system shall allow training only into arms the realm has unlocked. [recruiting §4.2]
- RECR-045 When training starts, the recruiting system shall take the months, gold, loads of arms, powder and animals per 1,000 men in the arm table (4.2) from the stores. [recruiting §4.2]
- RECR-046 Where a Marshal is the official in a province, the recruiting system shall make training there 25 % faster. [recruiting §4.1, §7.2]
- RECR-047 The recruiting system shall train veterans among the levies in half the time, so a regiment mostly of veterans finishes early. [recruiting §4.2, §2.4]
- RECR-048 When a regiment retrains to a newer arm, the recruiting system shall take half the months and half the gold and keep its drill and scars. [recruiting §4.2]
- RECR-049 If levies are called out of training to fight, then they shall go as levy foot and lose the months spent. [recruiting §4.2]
- RECR-050 While a castle or town is under siege, the recruiting system shall stop all training in it. [recruiting §4.2]
- RECR-051 When training finishes, the regiment shall have its arm, drill 3 (4 if trained under a Marshal), pay by its arm's pay group (RECR-102), and break point 30 % plus troop level, keeping its kind. [recruiting §4.3, §7.2, §1]
- RECR-052 The recruiting system shall leave untrained levies at drill 0 and break point 25 %. [recruiting §4.3]
- RECR-053 The recruiting system shall send trained levy regiments home like levies: after 6 months, 5 % a month unless paid double. [recruiting §4.3] *Replaced by RECR-113 (playtest feedback).*
- RECR-054 If training runs past the 3 free months, then the recruiting system shall charge pay for those months. [recruiting §4.4]

### Standing regiments and retinues
- RECR-055 Where the realm has W12 Standing regiments, the recruiting system shall let a trained regiment be signed on, staying under arms in peace, keeping drill and scars, paid 1.5 times all year. [recruiting §4.5]
- RECR-056 While a regiment is signed on, its men shall be gone from their province's pool and their slots stay empty. [recruiting §4.5]
- RECR-057 While a standing regiment is housed in a barracks in peace, the recruiting system shall give no Soldiers quartered to the province; without a barracks, it is quartered on the people like any army in winter. [recruiting §4.5, §4.1]
- RECR-058 The recruiting system shall let a lord levy and train his retinue from his lands by the same rules, with his own wealth and at his own castles. [recruiting §4.6]
- RECR-059 The recruiting system shall have a lord's traits decide what he trains: Warlike knights and armoured foot, Greedy keeps levies. [recruiting §4.6]

### What recruiting gives back
- RECR-060 When a levy takes homeless men, the province shall have less theft and begging and may lose the Homeless state. [recruiting §6.1]
- RECR-061 While men serve abroad, their home province shall feed fewer people. [recruiting §6.1]
- RECR-062 Each month, the recruiting system shall spend a fifth of the pay of soldiers training, standing or quartered in one of the realm's provinces in that province, as trade for its market folk, and raise its tax owed by the same amount. [recruiting §6.1]
- RECR-063 When disbanded men are sent as soldier settlers to a frontier or colony province with free tiles, they shall clear tiles twice as fast as other settlers, become farmers, and the province shall need one grievance more to riot for 10 years. [recruiting §6.1]
- RECR-064 When an army disbands, the recruiting system shall send a tenth of its loot to the provinces its men came from, raising their local store and tax owed for a year. [recruiting §6.1]

### What recruiting takes
- RECR-065 When men are disbanded, the recruiting system shall put them back into the emptiest slots of their province, and make homeless those for whom no slot is free. [recruiting §6.2]
- RECR-066 When an army disbands, the recruiting system shall send its arms back to the realm's store; the player makes no choice about the arms. [recruiting §6.2; X-7, Leroy 17 Oct]
- RECR-067 When an army disbands within 3 months of a plague or high-sickness campaign, the recruiting system shall bring a plague rumour home to 1 in 4 of the provinces it disbands into. [recruiting §6.2]
- RECR-068 When students are called to arms, research from them shall stop. [recruiting §6.2]

### Commanders from officials
- RECR-069 The recruiting system shall let any official be commissioned to lead an army or to stand in it as a captain, leaving the province they ran. [recruiting §7.1]
- RECR-070 When an official is commissioned, the recruiting system shall start them with the Might, Cunning, Logistics and trait offer of their type (7.1 table). [recruiting §7.1]
- RECR-071 When an official is commissioned, the recruiting system shall add +1 to the type's highest skill at 5 years served and +1 more at 10, never past 5; on a tie the bonus goes to Logistics, then Cunning, then Might. [recruiting §7.1; D-RECR-17]
- RECR-072 When an official is commissioned, the player shall pick the type's offered trait or keep the one rolled. [recruiting §7.1]
- RECR-073 When a commander is commissioned, the recruiting system shall give them the realm's current style for their era and country; a Marshal may take any style the realm has seen in a battle it fought. [recruiting §7.1]
- RECR-074 The recruiting system shall count years served where the official was assigned. [recruiting §7.1]
- RECR-075 The recruiting system shall offer the Marshal as an official type from an academy, by hiring at three times a normal official, or by raising a captain who stood in 3 won battles (one offer per won battle). [recruiting §7.2]
- RECR-076 While a Marshal runs a province, training there shall be 25 % faster and regiments shall leave with drill 4. [recruiting §7.2]
- RECR-077 The recruiting system shall pay a Marshal twice an official's wage, war or peace. [recruiting §7.2]
- RECR-078 If a Marshal stays 10 years in a province with no war, then they shall lose 1 from their best skill. [recruiting §7.2]
- RECR-079 When an official is commissioned, the recruiting system shall charge 10 gold once. [recruiting §7.3] *Replaced in part by RECR-114 (playtest feedback): the commission costs 50 gold.*
- RECR-080 While commissioned, an official shall be paid their wage ×3 as commander or ×2 as captain. [recruiting §7.3]
- RECR-081 The recruiting system shall attach a staff of 100 (commander) or 50 (captain) who eat 2 rations each a month from the army's reserve, and the staff horses, 30 for a commander and 15 for a captain, eat 3 each; staff are not soldiers and do not count toward the forage limit or the column size. [recruiting §7.3; D-RECR-18]
- RECR-082 When an official is commissioned, the recruiting system shall ask how the province is run: Leave it, Move another official in, Name a deputy, or Ask the lord next door. [recruiting §7.4]
- RECR-083 If the province is left, then it shall have half tax, half recruits and be Ungoverned. [recruiting §7.4]
- RECR-084 If another official is moved in, then that official shall start at half effect and their old province becomes the empty one. [recruiting §7.4]
- RECR-085 If a deputy is named, then the province shall have full tax and recruits but no type effect, for 1 gold a month; this needs 20 clerks in the province. [recruiting §7.4]
- RECR-086 If a loyal neighbouring lord is asked, then the province's recruits shall go to his retinue, half its tax to him, his loyalty rises a step, and he may ask for it as a fief when the war ends. [recruiting §7.4]
- RECR-087 When a commissioned official is released, the recruiting system shall return them to a province of the player's choice, with years served restarting at half unless they return to the province they left and it was run by a deputy. [recruiting §7.1, §7.4]

### Effects of official commanders
- RECR-088 An official commander shall never refuse a command, never go home with his men mid-war, and never defect with land. [recruiting §7.5]
- RECR-089 When an army under an official wins a battle, every lord's loyalty shall rise one step (up to Loyal; a lord in revolt is not moved) and the ruler's Victories shall rise by one, and no single lord grows from it. [recruiting §7.5; D-RECR-20]
- RECR-090 When an official returns with 3 or more victories, they shall give 1.5 times their type's effect where they serve, for as long as they hold that post. [recruiting §7.5; D-RECR-20]
- RECR-091 While a Proud lord serves as captain under an official, he shall waver a step each season. [recruiting §7.5]
- RECR-092 If an army is commanded by an official, then a Proud lord shall refuse to bring his retinue unless the war aim is his Want. [recruiting §7.5]
- RECR-093 An official commander shall bring no retinue of their own. [recruiting §7.5]
- RECR-094 If an official commander is killed or captured, then the realm shall lose a commander and an official; ransom brings both back. [recruiting §7.5]
- RECR-095 When any commander with 8 victories has led the same regiments 5 years, they shall become "their man"; a commissioned official with 6 victories shall ask for land; refusing makes them Ambitious; granting turns them into a lord with their old soldiers as his retinue. [recruiting §7.5; warfare 4.6; D-RECR-16]
- RECR-096 The recruiting system shall let the ruler and heirs lead, lords lead only their own retinues (as a captain in a royal army), hired captains come with their free companies, and exiles who ask to serve become officials of the type closest to their past; the other origins and their catches are warfare's (X-7). [recruiting §7.6; X-7]

### AI and phone
- RECR-097 The AI shall use the same levy and training commands, with its catalogue personality setting how much of its pool it levies and what it trains. [recruiting §9]
- RECR-098 The AI shall avoid levying in harvest months unless an enemy army is in its land. [recruiting §9]
- RECR-099 The AI shall commission stewards and wardens first, keeping tax collectors in their seats. [recruiting §9]
- RECR-100 The recruiting system shall update each province once a month (training months ticking down), run the yearly rules (pool refill, Fallen and Veterans fading) once in the turn in which 1 January falls, and compute a levy as one calculation when tapped. [recruiting §9; X-2; D-RECR-11]

### Decided rules (17 October 2026)
- RECR-101 The recruiting system shall count a levy's 3 free months from the day it has gathered, so training that ends within 3 months owes no pay and knights (9 months) owe 6 months. [recruiting §4.4; D-RECR-8]
- RECR-102 The recruiting system shall pay each arm by its pay group: foot (armoured foot, pikes, archers) 0.2, gunners (hand gunners, pike and shot, musketeers, line infantry, riflemen) 0.25, horse (light horse, camel riders, horse archers) 0.4, knights (knights and lancers, war elephants) 0.6 gold a man a month, gun crews 1 gold per crew of 15. [recruiting §4.3; D-RECR-9]
- RECR-103 When a levy is made, the recruiting system shall gather it as one army in the drawn province that gives the most men (ties: the first by id), and, where the realm has set "New regiments go to", order the gathered army to march there. [recruiting §2.1; warfare 3.1; troop-movement §8; D-RECR-15] *Replaced in part by RECR-104, RECR-107 (playtest feedback).*

### Playtest feedback (17 October 2026)
Leroy's playtest feedback (DECISIONS.md, F-1 to F-22). It is the latest decision, so it replaces the requirements it names.

- RECR-104 The recruiting system shall raise a levy from one province at a time, opened from that province's card, taking the chosen number of men from that province's people by class share (RECR-010); there is no region or country levy. [F-14]
- RECR-105 The recruiting system shall call a levy in whole thousands (`recruiting.levy_unit` 1,000, provisional), and the levy screen shall show the thousands chosen as a percent of the province's men who can be called. [F-18]
- RECR-106 When a levy is made, the recruiting system shall gather it one thousand at a time, `recruiting.gather_days_per_thousand` days each (14, provisional; 3 with W18 Railway mobilization), each gathered thousand joining the province's garrison troops, so 10,000 men cannot be ready at once. [F-18]
- RECR-107 The recruiting system shall keep gathered recruits in their province as its garrison troops, shown on the province card's Garrison tab (province PROV-302); they man the province's castle if it has one, and cannot march, fight in the field or train until a commander picks them up. [F-15; F-17]
- RECR-108 When a commander in a province picks up garrison troops, the recruiting system shall move the thousands chosen into his army, taking 1 day as joining does (MOVE-039). [F-15]
- RECR-109 The recruiting system shall order training from the commander screen, for the levies in that commander's army: the player picks the arm, how many thousand and the castle or drill yard, and the army marches there (RECR-039 to RECR-043). [F-14]
- RECR-110 The commander screen shall show the army's stats (men by arm and kind, drill, break point, the commander's skills), its companies with split, merge and leave-as-garrison actions, its food reserve and food used a day and a month, its pay a month, and any training under way. [F-14]
- RECR-111 The recruiting system shall give the player new commanders only by commissioning officials (RECR-069 onward), and shall attach no commander to an army by default; rulers and heirs may still lead, lords lead only their own retinues, and hired companies bring their own commander (WAR-211); a captain risen from the ranks, an academy graduate or an exile first enters service as an official. [F-16; X-7]
- RECR-113 The recruiting system shall never send trained or untrained levies home on their own; they stay under arms until the player disbands them or leaves them as garrison troops (RECR-112). [F-23]
- RECR-114 When an official is commissioned, the recruiting system shall charge `recruiting.commission_gold` (50 gold, provisional) once. [F-28]
- RECR-115 The AI shall commission an official only when it has at least `recruiting.ai_commission_min_men` (1,000, provisional) men without a commander and no free commander to send, and shall never keep more commanders than its armies need. [F-28]
- RECR-112 When a commander leaves troops in a province of his realm, the recruiting system shall make them that province's garrison troops (RECR-107); an army keeps at least its commander's own company. [F-13]
- RECR-116 The province's Garrison tab shall offer one "Recruit 1,000 men" button; each press joins the province's recruit queue, shown one row per thousand with the weeks until it has gathered, at most `recruit.queueMax` (10) per province; the last row can be cancelled for its levy money and men back. [F-38]

## 6. Commands

| Command | Who issues it | Preconditions | Result | Events emitted |
|---|---|---|---|---|
| Levy(provinces or region, men) | player / AI | men ≤ sum of Recruits here in the chosen provinces; provinces are the realm's (royal) | Men taken by class and province share; gold and gathering food charged; levies gather | LevyRaised, ConscriptionGrievanceGiven (if threshold crossed) |
| Train(levies, arm, men, training place) | player / AI | arm unlocked; training place is the realm's castle or drill yard; room free; stores hold arms, powder, animals | Men walk to the place and start; months, gold, needs taken | TrainingStarted |
| Retrain(regiment, newer arm, place) | player / AI | as Train; regiment already trained | Half months, half gold; drill and scars kept | TrainingStarted |
| CallOutOfTraining(order) | player / AI | order under way | Men go as levy foot; months lost | TrainingAbandoned |
| SignOn(regiment) | player / AI | W12; regiment trained | Becomes standing; pay 1.5×; men leave pool for good | RegimentSignedOn |
| Disband(army, arms choice, settle to?) | player / AI | — | Men home or to a settler province; arms choice applied | ArmyDisbanded |
| Commission(official, army, role, empty-province choice) | player / AI | official not commissioned; for deputy: 20 clerks; for lord: a loyal neighbouring lord | Commander or captain with type skills; 10 gold; province run as chosen | OfficialCommissioned |
| Release(commander, province) | player / AI | commissioned | Back to chosen province; years served per RECR-087 | OfficialReleased |
| HireMarshal(province) | player / AI | gold for 3× a normal official | A Marshal official | MarshalAppointed |
| RaiseToMarshal(captain) | player / AI | captain stood in 3 won battles; an offer is open | Captain becomes a Marshal official | MarshalAppointed |
| PickTrait(commission, trait) | player | offered by type | Trait set | — |

## 7. Domain events

| Event | When | Payload | Consumed by (context) |
|---|---|---|---|
| LevyRaised | Levy made | owner, men by province and class, gathering place, ready date | province (slots, births), realm (gold, food), troop-movement (new regiments go to), warfare (new company) |
| LeviesGathered | 2 weeks (W18: days) later | levy id, place | troop-movement, warfare |
| ConscriptionGrievanceGiven | Pool below threshold after a levy | province | province, rebellions |
| HarvestCut | Levy in sowing/harvest season | province, share | province, realm (food) |
| TrainingStarted / TrainingFinished / TrainingAbandoned | as named | order, arm, men, drill | warfare (company arm, drill), realm (stores) |
| RegimentSignedOn | SignOn | regiment | warfare (kind), province (pool) |
| ArmyDisbanded | Disband | men home by province, veterans, arms choice, loot share | province (slots, homeless, store, tax), rebellions (armed veterans), events (plague rumour) |
| SoldierFell | A soldier from a province dies | province | province (births) |
| OfficialCommissioned / OfficialReleased | as named | official, army, role, province choice | warfare (commander), province (governance), realm (wages, lords' loyalty) |
| MarshalAppointed | as named | official, how | province, realm |

## 8. Policies (reactions to other contexts)

- When warfare reports a soldier killed, then recruiting adds to *Fallen from here* of the soldier's home province.
- When warfare reports a battle won under an official commander, then recruiting counts the victory toward the
  1.5× return effect, Marshal offers for captains, and the land request at 6 victories.
- When warfare lays siege to a castle or town, then recruiting stops all training there.
- When province reports a riot, then recruiting halves what can be called there.
- When province reports famine or plague, then recruiting lowers Recruits here.
- When province reports students enrolling, then recruiting lowers Recruits here.
- When rebellions draw rebels from a province, then recruiting lowers Recruits here.
- When research grants W12, W15 or W18, then recruiting unlocks signing on, raises call shares and lowers the
  Conscription threshold, or shortens gathering.
- When buildings completes a drill yard or its barracks step, or a castle step, then recruiting updates training room.
- When warfare reports loot taken by an army, then recruiting keeps a tenth for its men's home provinces at disband.

## 9. Monthly steps

A turn is one week (X-18). The monthly steps below keep their size and run once, at the end of the turn in which a new month begins; yearly steps run in the turn in which 1 January falls.


Each month, per province: training months ticking down (and finished regiments emitted), births cut by men away
and fallen, pay for levies past their 3 free months, a fifth of pay spent where soldiers are, the empty province's
tax and recruit effects, Marshal idleness counting. In the turn in which 1 January falls only: pool refill toward the ceiling,
*Fallen from here* and *Veterans here* fading (D-RECR-11). A levy itself is computed when commanded, not in the monthly steps.

Reads first: current population per class (province), store levels (realm), sieges (warfare), season/climate
(time-and-turns, world-map), inventions known (research), who is official in each province (province).
Recruiting runs in the monthly steps after buildings and before realm (X-2); the yearly rules run in the turn in which 1 January falls.

## 10. Configuration

The config file is `packages/rules/data/domain/recruiting.json` (D-RECR-19); its `_provisional` list names the keys
still to balance. The `levies` and `military` blocks of `defines.json` are replaced by it.

| Key | Meaning | Value in the design | Placeholder? | Config file |
|---|---|---|---|---|
| fighting-age share | Share of people who are fighting-age men | a quarter, men only, every realm | yes | recruiting config |
| call share per class | Share of a class's fighting-age men callable | homeless 24 %, herders 16 %, farmers 12 %, woodsmen 12 %, miners 8 %, seafolk 8 %, craftsmen 8 %, market folk 6 %, clerks 4 %, clergy/scholars 0 | yes | recruiting config |
| W15 call share multiplier | Rise of call shares | ×1.5 | yes | recruiting config |
| pool refill per year | Share of gap to ceiling refilled yearly | 1/4; with muster master 1/3 | yes | recruiting config |
| Conscription threshold | Pool share of ceiling | 1/4; 1/3 with Fallen; 1/10 with W15 | yes | recruiting config |
| fallen fade / veterans fade | Yearly fade | a tenth / a tenth | yes | recruiting config |
| births cut per fallen | Births cut per 1 % people fallen | 0.2 % for 10 years | yes | recruiting config |
| gathering time | Days to gather | 2 weeks; W18 days | yes | recruiting config |
| levy money | Gold per 1,000 men up front | 20 | yes | recruiting config |
| free months | Months without pay | 3 | yes (from warfare 2.3) | recruiting config |
| levy pay | Gold per man a month | 0.15 | yes | recruiting config |
| pay by arm | Gold per man a month | foot 0.2, gunners 0.25, horse 0.4, knights 0.6, gun crews 1 per crew of 15 | yes | recruiting config |
| standing pay multiplier | | 1.5 | yes | recruiting config |
| rations gathering / camp / campaign / home | per man a month | 1 / 1.5 / 2 / 1; horse 3 | yes | recruiting config |
| lost-harvest multiplier | | ×2 share of farmers taken; ×1.5 at harvest | yes | recruiting config |
| season months per climate | sowing and harvest months | north 3–4 / 8–9; south 9–10 / 2–3; rice 5–6, 11–12 / 2–3, 8–9 (D-RECR-14) | provisional | recruiting config |
| pastoral spring move | months herders are away; herd loss multiplier | north 3–5, south 9–11; ×2 (D-RECR-14) | provisional | recruiting config |
| W18 gathering | days | 3 (D-RECR-12) | provisional | recruiting config |
| riots | share of Recruits here callable | half (D-RECR-24) | provisional | recruiting config |
| students | call share | 4 % (D-RECR-13) | provisional | recruiting config |
| official victory | lord loyalty steps; ruler's Victories | 1; +1 (D-RECR-20) | provisional | recruiting config |
| training room | per place | ring fort 1,000; stone castle 3,000; bastion fort 5,000; star fort 8,000; drill yard 1,500; barracks 4,000 | yes | recruiting config |
| months, gold, needs per arm | 4.2 table | see 4.2 / feature training.feature | yes | recruiting config |
| veteran training factor | | half the time | yes | recruiting config |
| retraining factor | | half months, half gold | yes | recruiting config |
| Marshal training speed / drill | | 25 % faster; drill 4 | yes | recruiting config |
| trained drill / break point | | drill 3; 30 % + troop level (levies 25 %) | yes | recruiting config |
| goes home | | dropped: levies stay until disbanded (F-23) | — | recruiting config |
| pay spent at home | share of pay | a fifth | yes | recruiting config |
| soldier settler clearing / riot threshold | | ×2; +1 grievance for 10 years | yes | recruiting config |
| loot home | share of loot | a tenth, for a year | yes | recruiting config |
| armed veterans garrison bonus | | +10 % for 5 years | yes | recruiting config |
| sickness brought home | | within 3 months; 1 in 4 provinces | yes | recruiting config |
| official-to-commander skills and traits | 7.1 table | see commissioning feature | yes | recruiting config |
| years served bonus | | +1 at 5, +1 at 10, max 5 | yes | recruiting config |
| commission cost (`recruiting.commission_gold`) | | 50 gold (was 10; F-28, provisional) | yes | recruiting config |
| AI commission threshold (`recruiting.ai_commission_min_men`) | | 1,000 men without a commander (F-28, provisional) | yes | recruiting config |
| field wage multiplier | | ×3 commander, ×2 captain | yes | recruiting config |
| staff | | 100 (50 captain), 2 rations each; 30 horses (15 captain) at 3 rations | yes (captain horses provisional, D-RECR-18) | recruiting config |
| deputy rules | | 20 clerks needed; 1 gold a month | yes | recruiting config |
| Marshal hire / wage / idleness | | 3× hire; 2× wage; −1 best skill after 10 years without war | yes | recruiting config |
| official return bonus | | ≥3 victories → 1.5× type effect | yes | recruiting config |
| land request / their man | | 6 victories (officials); 8 victories + 5 years (any commander) | yes | recruiting config |
| Engine today | realm-wide pool and upkeep | `levies.menPerThousandPeople` 4, `levies.monthlyRecoveryFraction` 0.0167, `military.upkeepPerThousandMenPerMonth` 0.2, `march.rationsPerSoldier` 2, `march.monthsCarried` 2, `march.logisticsRationCut` 0.05 | code | `packages/rules/data/defines.json` |

## 11. Seams

| Other context | Direction | Pattern | What crosses |
|---|---|---|---|
| province | upstream | Customer–Supplier | Classes and people per class, job slots, homeless, officials and types (Marshal, deputy: X-7), grievances, births, local stores; recruiting writes back empty slots, Conscription, births cut, Recruits/Fallen/Veterans (X-7) |
| realm | upstream | Customer–Supplier | Gold, food and arms stores, lords and their traits/loyalty, schools/academies, officials' wage; receives levy money, pay, commission costs |
| warfare | downstream | Customer–Supplier | Recruiting produces companies (arm, drill, kind, break point by training), commanders with skills/traits/style (a commissioned official counts as an academy graduate for style, X-7); warfare reports deaths, victories, loot, sieges, generals too big. Warfare follows recruiting v3 for the levy, commanders and disbanding (X-7) |
| buildings | upstream | Conformist | Castle steps, drill yard, barracks and their training room (used as written) |
| research | upstream | Conformist | W12, W15, W18 (and arms unlocked via warfare-eras) |
| troop-movement | downstream | Customer–Supplier | Gathered levies and trained regiments become movers; a levy gathers in its biggest province and is then ordered to the "new regiments go to" rally point (RECR-103); levies walk to the training place |
| naval | downstream | Shared Kernel | Mustering sailors uses the levy (fighting-age men, shares) but has its own seafolk ceiling; sailors away are not at home, so they leave the levy's seafolk count (D-RECR-21); admirals use the commission and the empty province (7.1, 7.4) |
| rebellions | downstream | Published Language | Armed veterans, a rising's men drawn from the pool (X-9), Conscription grievance |
| events | downstream | Published Language | Plague rumour brought home; generals too big events |
| time-and-turns | upstream | Conformist | Week turn (X-18), month tick, seasons (X-4), the order of the monthly steps: recruiting after buildings, yearly rules in January (X-2) |
| government | upstream | Conformist | Ungoverned, lords' fiefs (granting land) |
| diplomacy | upstream | Conformist | War aim (a lord's Want), exiles asking to serve |

## 12. AI

- The AI uses the same levy and training commands and screens (RECR-097).
- Its catalogue personality sets how much of its pool it dares to levy and what it trains: a militarist levies deep
  and trains expensive arms; a merchant republic levies little and hires companies instead; a steppe realm trains
  horse archers.
- It avoids levying in harvest months unless an enemy army is in its land (RECR-098).
- It commissions stewards and wardens first, keeping tax collectors in their seats (RECR-099), and only when at least 1,000 of its men have no commander and no free commander can go (RECR-115).
- Lords train by their traits (RECR-059).

## 13. Decisions and open questions

Decided on 17 October 2026 (domain/DECISIONS.md). None of recruiting's questions is a release task, so none stays open.

- **D-RECR-1** (was OQ-RECR-1) Fighting-age share and call shares: the design's values stand (a quarter; 24 % homeless down to 4 % clerks, 0 clergy and scholars) and are listed as provisional in `recruiting.json` for the balancing pass against the troop cap. Missing numbers get a provisional value and balancing finds them there.
- **D-RECR-2** (was OQ-RECR-2) Women in the levy: the levy takes men only, with the same fighting-age share in every realm; women commanders follow each country's history (warfare). The simpler rule adds no per-country share.
- **D-RECR-3** (was OQ-RECR-3) Muster master refill: a third of the gap a year instead of a quarter. It is the number in recruiting v3's own stat table, the latest design.
- **D-RECR-4** (was OQ-RECR-4) Warfare and recruiting v3: warfare follows recruiting v3 for the levy (every class by its share, no homeless first, arms taken at training), commanders and disbanding (arms always back to the store, no player choice; soldier settlers), as X-7 decides. The latest decision wins.
- **D-RECR-5** (was OQ-RECR-5) Province and recruiting v3: province takes the per-province ceiling by class share, Fallen from here, Veterans here, the muster master's faster refill only, the Marshal type and the deputy; disbanded men go to the emptiest slots first and become homeless only when none is free (X-7). The latest decision wins.
- **D-RECR-6** (was OQ-RECR-6) Country stats: the Commanders row gains "commissioning an official" (X-7). The latest decision wins.
- **D-RECR-7** (was OQ-RECR-7) Engine: the per-province pool, pay by arm after 3 free months and rations by place in this context's rules replace the realm-wide pool, flat upkeep and flat rations of `turn.ts` and `defines.json`; moving the engine core onto them is a request to the game build. The domain spec is the newer design.
- **D-RECR-8** (was OQ-RECR-8) Free months: the 3 free months count from the day the levy has gathered (RECR-101), so pikes and light horse train free and knights owe 6 months. It makes both of the design's examples hold.
- **D-RECR-9** (was OQ-RECR-9) Pay groups: foot = armoured foot, pikes, archers; gunners = hand gunners, pike and shot, musketeers, line infantry, riflemen; horse = light horse, camel riders, horse archers; knights = knights and lancers, war elephants; gun crews = gun crews (RECR-102). Each arm goes to the group it most resembles, with no new group.
- **D-RECR-10** (was OQ-RECR-10) Conscription threshold: measured on Recruits here after the levy against the ceiling; with W15 the threshold is a tenth even when the province has fallen, otherwise a third with fallen and a quarter without. The later invention replaces the rule it was made to relax.
- **D-RECR-11** (was OQ-RECR-11) Yearly rules: refill, Fallen and Veterans fading run once, in the turn in which 1 January falls (X-2 yearly steps, X-18); training ticks monthly; births stay cut for 10 years from the year men fell. Running a yearly rule once a year needs no monthly split.
- **D-RECR-12** (was OQ-RECR-12) W18 Railway mobilization: levies gather in 3 days instead of 14 (provisional); W18's +1 % troop cap in warfare is a separate effect and also applies. Recruiting is the latest design and only needed a number.
- **D-RECR-13** (was OQ-RECR-13) Students: students are their own class outside clergy and scholars, called at the clerks' share of 4 % of their fighting-age men (provisional), and research from called students stops. It reuses the existing call-share rule.
- **D-RECR-14** (was OQ-RECR-14) Seasons by climate: north sows in March–April and harvests in August–September, south sows in September–October and harvests in February–March (X-4's harvest month and the month before); rice lands sow in May–June and November–December and harvest in February–March and August–September, each crop lost by the same formula; pastoral lands lose herd growth of twice the share of herders taken in the spring move (March–May north, September–November south). All provisional. It reuses the harvest formula and X-4's seasons.
- **D-RECR-15** (was OQ-RECR-15) Where levies gather: a levy gathers as one army in the drawn province that gives the most men, and is then ordered to the realm's "New regiments go to" rally point if one is set (RECR-103). It matches the levy screen ("Ready at Troyes") and needs no new order.
- **D-RECR-16** (was OQ-RECR-16) Generals who grow too big: "their man" (8 victories, same regiments 5 years) applies to any commander; the land request at 6 victories applies to commissioned officials only. Warfare 4.6 already covers the others, and only officials hold no land.
- **D-RECR-17** (was OQ-RECR-17) Years served tie: the bonus goes to Logistics, then Cunning, then Might; 5 is the skill's cap, not the bonus's. The design says Logistics comes from years spent running provinces.
- **D-RECR-18** (was OQ-RECR-18) Staff: a captain's staff has 15 horses (provisional, half a commander's 30); staff are not soldiers and count toward neither the forage limit nor the column size, but they do eat. The worked example's 11,500 rations count soldiers only.
- **D-RECR-19** (was OQ-RECR-19) Config: `packages/rules/data/domain/recruiting.json` is the recruiting config, with the key names of section 10; it replaces `defines.json`'s `levies` and `military` blocks. One file per context is the project's convention.
- **D-RECR-20** (was OQ-RECR-20) Missing amounts: a victory under an official moves every lord one loyalty step up (to Loyal at most; not out of revolt) and adds 1 to the ruler's Victories; a tenth of the loot is split among home provinces by the men each gave; the 1.5× effect lasts as long as the official holds that post; theft and begging fall by province's own homeless rule. Loyalty only moves in steps, so a step is the smallest "little".
- **D-RECR-21** (was OQ-RECR-21) Seafolk: the naval muster keeps its own seafolk ceiling; sailors away at sea are not at home, so the levy's seafolk count falls by itself and the levy ceiling stays hard. Two pools of the same people need no new rule.
- **D-RECR-22** (was OQ-RECR-22) Barracks: recruiting v3 and buildings 7.8 answer the gap list (drill yard, barracks step with W12); the gap-list item is closed. The latest decision wins.
- **D-RECR-23** (was OQ-RECR-23) "Others" and region levies: the screen names the larger classes and sums the rest as "others", which is presentation only; a region or country levy draws only royal provinces, since lords' recruits are their retinues. Warfare 3.1 and the screen already say so.
- **D-RECR-24** (was OQ-RECR-24) Riots: while a province riots only half its Recruits here can be called; the ceiling is untouched and the full pool can be called again when the riot ends. Halving the pool is the reading that keeps the ceiling hard.

## 14. Traceability

| Requirement | Feature file | Scenario |
|---|---|---|
| RECR-001, 002, 003 | who-can-be-called.feature | Men who can be called per class / Troyes can give one man in eight |
| RECR-004 | who-can-be-called.feature | The ceiling is never passed |
| RECR-005 | who-can-be-called.feature | Classes give the same soldier |
| RECR-006 | who-can-be-called.feature | Mass conscription raises the call shares by half |
| RECR-007 | who-can-be-called.feature | Clergy and scholars can't be levied but students can |
| RECR-008, 009 | levy.feature | The levy screen for Champagne |
| RECR-010, 011 | levy.feature | A levy takes every class by its share |
| RECR-012 | levy.feature | A levy includes veterans by their share |
| RECR-013, 014 | levy.feature | Levies gather / Railway mobilization |
| RECR-103 | levy.feature | A region levy gathers where most men come from / Gathered levies march on to the rally point |
| RECR-015, 016 | levy.feature | Levy money and gathering food |
| RECR-017 | levy.feature | Levy pay starts in the 4th month |
| RECR-018 | levy.feature | Empty slots stop a building |
| RECR-019, 020, 021 | recruit-pool.feature | Pool refill / gain and loss |
| RECR-022 | recruit-pool.feature | Riots halve what can be called |
| RECR-023, 024, 025 | recruit-pool.feature | Conscription thresholds |
| RECR-026, 027 | recruit-pool.feature | Fallen from here |
| RECR-028, 029 | recruit-pool.feature | Veterans here |
| RECR-030 | levy-costs.feature | Births fall while men are away |
| RECR-031–038 | levy-costs.feature | Food and harvest scenarios; Rice lands have two harvests; Pastoral lands lose herd growth |
| RECR-039–054 | training.feature | Training scenarios |
| RECR-101 | training.feature | The free months count from the day the levy has gathered |
| RECR-102 | training.feature | Pay by arm after training / Every arm has a pay group |
| RECR-055–059 | standing-regiments-and-retinues.feature | Standing regiments, retinues |
| RECR-060–068 | coming-home.feature | Effects scenarios |
| RECR-069–087 | commissioning-officials.feature | Commission scenarios |
| RECR-088–096 | official-commanders.feature | Effects of official commanders |
| RECR-097–099 | ai-recruiting.feature | AI scenarios |
| RECR-100 | recruit-pool.feature | The monthly update ticks training down / The yearly step runs when January begins |
| Worked example (§5, §8) | champagne-1444.feature | Champagne late summer 1444 |
| RECR-104–107 | levy.feature | The levy screen for Troyes; Levies gather a thousand at a time; Gathered levies wait as garrison troops |
| RECR-108–110, 112 | training.feature | A commander picks up garrison troops; Giving a training order; The commander screen; Leaving troops as a garrison |
| RECR-111 | commissioning-officials.feature | New commanders come from officials |
| RECR-113 | training.feature | Trained levies stay until sent home |
| RECR-114, 115 | commissioning-officials.feature; ai-recruiting.feature | A commission costs 50 gold; The AI commissions only for troops it has |
