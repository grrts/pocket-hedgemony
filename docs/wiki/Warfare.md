# Warfare

Warfare is everything that happens once your soldiers are under arms: how they are organised into companies and armies, what they cost, how they are fed, who leads them and in what style, how a battle is fought bell by bell, how castles fall, what holding enemy land means, and how a war drifts toward peace. It runs from era I (from the start on 20 September 1378) to the end of the campaign on 31 August 1939, changing as inventions arrive.

## How it works

### Companies, troop types and kinds

Every army is made of **companies** of usually 500 to 1,000 men. Each company has exactly one **troop type** (how it fights, such as pikes or knights) and one **kind** (where its men come from). A company keeps its own men, drill, scars, loads of arms, pay owed and months out.

- **Drill** is months spent training together, from 0 to 24. A company in camp, garrison or winter quarters and not marching gains 1 drill a month; standing regiments drill all year. A hungry month takes 1 drill away. When new men join, drill and scars are diluted: drill becomes drill × old men ÷ all men. Disbanding resets drill and scars.
- **Scars** are battles stood through without breaking, from 0 to 5. A company gains 1 scar for standing through a battle and 1 more if its side won. Five years without a battle takes one away.
- **Loads of arms** come from the store at raising and from won fields, and are lost with killed and fled men, on a lost field, or sold at disbanding. A company short of the loads its troop type needs fights as the next troop type down (heavy infantry as levy infantry).
- Men join by raising, refilling from recruits, wounded coming back and enlisted prisoners, and leave by being killed, wounded, fleeing, deserting, falling sick, going hungry or being disbanded.

**Troop level** is read from drill and scars: 1 Raw, 2 Drilled, 3 Seasoned, 4 Veteran, 5 Elite. In eras I and II, Drilled comes at 3 months of drill, Seasoned at 6 months and 1 scar, Veteran at 3 scars, and Elite at 5 scars and 12 months of drill. Levels drop when new men dilute a company, after 5 years without a battle, when hungry, and all at once on disbanding. Standing regiments (W12) never drop below level 2.

**The troop types of eras I to IV:**

| Arm | Strength per man | Needs per 100 men | Roles | Unlocked by |
|---|---|---|---|---|
| Levy infantry | 1.0 | nothing | Line | start |
| Heavy infantry | 1.3 | 1 load of arms | Line, Heavy | start |
| Archers | 1.1 | 1 load of arms | Shot | start |
| Pikes | 1.2 | 1 load of arms | Brace | W6 Pike squares |
| Hand gunners | 1.4 | 1 arms, 1 powder a battle | Shot | W5 Gunpowder infantry |
| Pike and shot | 1.6 | 2 arms, 1 powder | Brace, Shot | W7 Pike and shot |
| Musketeers | 2.0 | 2 arms, 2 powder | Shot | W9 Volley fire drill |
| Line infantry | 2.6 | 2 arms, 2 powder | Line, Brace, Shot | W11 Flintlock and bayonet |
| Riflemen | 3.5 rising to 5.0 | 3 arms, 3 powder | Shot, Light | W16, W17 |
| Light cavalry | 2.0 | 100 horses | Shock, Light | start |
| Horse archers | 2.5 | 100 horses, 1 arms | Shot, Light (Shock against broken enemies) | W1 Composite-bow horse archery |
| Knights and lancers | 3.5 | 100 horses (+50 remounts), 2 arms | Shock, Heavy | W2 Heavy armoured cavalry |
| Camel riders | 2.0 | 100 camels | Shock, Light; no desert penalty | desert and Sahel realms at start |
| War elephants | 6.0 per man (8 men to an elephant); −50 % in forest and jungle | elephants from studs in South and Southeast Asia | Shock, Heavy; panic | start there |
| Bombards | 5 per gun in battle; 2 shot a month in a siege | 20 crew, 8 horses or oxen, 1 powder a month firing | Guns | W3 Bombards |
| Field guns | 25 per gun | 15 crew, 6 horses, 2 powder a battle | Guns | W8 Field artillery |
| Light field guns | 25 per gun, no march penalty | 10 crew, 4 horses, 2 powder a battle | Guns | W13 Light field artillery |

Later troop types (machine guns, tanks, aircraft) follow the same shape in config. Elephants and camel riders are their own troop types. If the powder store is empty, guns and hand guns do not fire.

**Kinds** set pay and base break point:

| Kind | Base break point | Pay |
|---|---|---|
| Levy | 25 % | free for 3 months, then normal pay |
| Retinue | 35 % | paid by the lord |
| Hired company | 35 % | three times normal pay |
| Standing regiment | 30 % | 1.5 times normal pay, all year (needs W12) |
| Garrison | 40 % on the walls | normal pay |
| Rebel band | 20 % | loot |

Levies have no service term: once raised they stay until you disband them or leave them as a garrison. Levies away at harvest cost their province that share of its harvest. A wavering lord may take his retinue home mid-war. A hired company owed 1 month of pay won't fight; owed 2 months, it loots the province it stands in or takes the enemy's offer if higher. Standing regiments keep drill and scars through peace. Garrisons count against their castle's room. Rebel bands fight by the same battle rules whatever the rebellion rules decide about how they form.

A company's break point is changed by its troop level, the Might of the leader in its sector, +5 % defending its own homeland, −10 % if hungry, −5 % per month of pay owed, and commander traits.

### The realm's soldier stats

- **Soldiers**: all men in all companies, garrisons included.
- **Arms store**: fed by forges, buying, captured fields and companies handing arms back; emptied by issuing, battle losses, rust of 2 % a year and selling.
- **Powder store**: fed by powder mills and buying; emptied by firing, damp of 5 % a year and a castle magazine being captured.
- **Prisoners**: from battles won, surrenders and pursuit; each eats 1 ration a month.
- **Victories and defeats** over the last 20 years, which feed lords' loyalty, neighbours' fear and the event tree's prestige.

### The troop cap

The **troop cap** is the most soldiers your realm may keep: 2 % of the people in royal provinces with an official (3 % with a muster master), plus 1 % of the people in royal provinces without one, plus the garrison room of your castles. Levies, hired companies and standing regiments count toward it, and garrisons only above their castle's room. Provinces occupied by the enemy or in revolt count nothing. W12 adds 0.5 % of people, W15 doubles the shares, W18 adds 1 %.

Lords' retinues don't count: each lord has his own cap by the same rule on his lands (2 % with one of his officials, 1 % without), and allies count only against their own. Over the cap you can't raise or hire, every soldier over it costs double pay, and levies desert 5 % a month until you are back under. There is no cap on the size of one army; food is its limit.

**France, 1444** (on the 1444 checkpoint world). With 4,000,000 people in royal provinces with an official, 1,500,000 without and 31 castles, France's cap is 95,000 plus the garrison room of the 31 castles. The Duke of Burgundy's 6 provinces of about 430,000 people, all with his officials, give him a retinue cap of about 9,000, outside France's cap.

### Raising and keeping an army

Levies come from [Recruiting](Recruiting) as levy-kind companies of levy infantry, gathered a thousand at a time in their province, where they wait as its garrison until a commander picks them up. **No army exists without a commander**: soldiers without one are a province's garrison. An army that loses its commander with no captain to step up halts; in your own land it becomes that province's garrison, abroad it waits for a commander to join it.

**Calling the lords.** Each lord answers by his loyalty. A loyal lord brings his whole retinue in 3 weeks and may lead it as a captain. A wavering lord brings half, after 6 weeks, and goes home after 6 months unless the war aim is his Want. A disloyal lord refuses, and calling him again makes him angrier. A lord in revolt's retinue is a rebel army. When the war aim is his Want, a lord comes even when wavering and stays to the end, and a lord whose lands are occupied leaves to defend them.

**Mercenary companies.** Named companies with a captain are offered in the regions where they historically gathered (Swiss and German foot, Italian condottieri, Scottish and Irish gallowglass, Turkic and Afghan horse, Javanese and Japanese sword bands and others). Each shows men, troop type, drill, scars and price. A contract brings the company for the agreed months for gold up front plus monthly pay, using no recruits. The company isn't there at once: it marches from where it gathers to your capital, and the hire screen shows how many days that takes. It always comes led by its own captain as its commander, and he leaves with it. It leaves when the contract ends, when pay is owed as above, or when an enemy outbids you.

**Keeping.** Each month the treasury pays every company except retinues and levies in their first 3 months. An army eats 2 rations per soldier on campaign, 3 per horse and 1 per prisoner, from the province at home and from its reserve abroad. Disbanded men go back to their home province's recruit pool and their arms to the store; a disbanded standing regiment loses all its drill and scars; soldiers home from a long war with no free slot become homeless, a source of rebels.

### Commanders and captains

Every commander has **Might**, **Cunning** and **Logistics** from 0 to 5, a style, one trait, victories, defeats, wounds, age and origin. Jean de Dunois of France has Might 3, Cunning 4 and Logistics 2, the style Three battles and the trait Careful, with 6 victories, 1 defeat, 1 wound and age 47.

How skills move:

| Skill | Grows | Fades |
|---|---|---|
| Might | +1 per 2 more victories; +1 at once for a win while outnumbered | −1 for a serious wound; −1 every 5 years past 60 |
| Cunning | +1 for a win where he gave more orders than the enemy, or a clean withdrawal from a lost battle | −1 every 5 years past 65; −1 when ambushed and beaten |
| Logistics | +1 for a full year in the field without a hungry month; years as a steward or warden before command | with age past 65; −1 when an army starves under him |

Academy graduates, and officials you commission as commanders, start with +1 Cunning or Logistics and no victories. A commander takes a serious wound with a 1 in 10 chance per lost battle and 1 in 20 per won one (twice as likely if Reckless), and wounds never heal.

**Traits:**

| Trait | Effect |
|---|---|
| Steady | +5 % break point for his army |
| Reckless | +10 % strength, −5 % break point, losses ×1.3 for both sides, wounds twice as likely; never retreats |
| Careful | never ambushed while marching Careful; spots hidden companies as with +1 Cunning; retreats at 3 to 2 |
| Beloved | halves desertion, keeps levies 3 months longer |
| Cruel | sacks pay 50 % more, Burned homes come faster where he occupies, enemy garrisons won't accept his terms |
| Siege master | breaches 25 % faster |
| Horse lord | +10 % Shock; Turn with Shock hits ×2 instead of ×1.5 |
| Old soldier | his companies drill 2 a month instead of 1 |
| Greedy | keeps a tenth of all loot; takes bribes from garrisons |
| Ambitious | may grow too big (see below) |

At 10 victories a commander may gain a second trait. If you have not set an army's standing orders, the commander's trait sets them.

**Where commanders come from**: the ruler or an heir, a lord, a hired captain, a captain risen from the ranks after a victory (one offer per won battle), an academy graduate, a foreign exile, or one of your officials commissioned as a commander (who counts as an academy graduate), each with its catch (a succession crisis if the ruler dies or is captured, Proud lords refusing a lower-born commander, a hired captain leaving when unpaid, the exile's old ruler insulted). Women can be commanders where the country's history supports it, more often in later eras. [Recruiting](Recruiting) adds commissioned officials.

Commanders are lost to death in battle (1 in 20 for the loser's commander, more if Reckless), capture, old age, dismissal (a dismissed lord wavers), defection, or a grant of land after which he leads only his retinue.

An army has one commander and up to two **captains**, each standing in one sector. A captain who wins 3 battles under a commander learns his style.

**Generals who grow too big.** A commander with 8 or more victories who has led the same standing regiments or hired companies for 5 years makes them "his men", who follow him before the crown. If he is Ambitious, pay is owed, or the ruler is a child or newly crowned, events may offer him the throne or a march on the capital.

### Seeing the enemy and marching

You see enemy armies in your own provinces, next to your armies and castles, and as far as your scouts ride: every 500 light cavalry, horse archers or camel riders see one province further. Armies further away show as rumours of size and place that can be wrong by up to a third. Scouting and rumours are only worked out near the player.

A **forced march** doubles sickness, makes levies desert 2 % a week, and gives −10 % strength for the first day of a battle the army arrives into. A **Careful** march can't be ambushed and its scouts see two provinces ahead. An army with guns heavier than light field guns marches ×1.25 slower into rough ground (once for the whole army), and an army too big for a province's forage limit takes one extra crossing (6 days) to enter it. The march itself belongs to [Troop-Movement](Troop-Movement).

### Supply

Food is counted in rations (food for one person for a month). A commander cuts what his army eats by 5 % per point of Logistics.

**In the game today** (feedback 83): men eat 1 ration a month at home and 2 on campaign (at war or abroad), and a horse eats 3. Every day an army eats from its wagons, which hold two months of campaign food, and refills them from the store of the province where it stands: in friendly land the locals keep two months for themselves, in enemy land the foragers take what they find on that ground. The food leaves the province's store. Castle stores, plunder of the standing crop and the Requisitioned and Hungry marks below are still to come. See [Your-Realm](Your-Realm) for what the province and army cards show.

- **At home** an army takes only what it needs (each week's meals plus what its reserve is missing), from its own castle store first, down to the castle's siege reserve, then from the local store.
- **Anywhere else** (enemy, neutral or allied land, or at sea) it eats from its **food reserve**, which shrinks every week.
- **Plunder**: abroad with an empty reserve, an army takes from the local store at the ground's foraging rating (rich 100 %, fair 60 %, poor 30 %, almost none 10 %), then from the standing crop, one tile a week turning burned and giving one season of that tile's food at once. Plunder never refills the reserve.
- The reserve sits in **wagons** of 1,000 rations, each pulled by 2 horses that eat. Wagons are built (gold, timber) or captured, and lost in defeats, raids and when horses die; W10 adds 50 % to their load. You set the **reserve size** at 1, 2 or 3 months as a standing order.
- The reserve grows by refilling at home, capturing an enemy's wagons when it breaks, and taking a fallen castle's store. It shrinks by eating abroad, losing half the wagons when the army breaks or is raided, and rot of 5 % a month (half as fast with Logistics 3 or more).
- Taking food from a province's local store makes it **Requisitioned** for a season, and **Hungry** if it drops under a month of food. Taking a lord's grain lowers him a step of loyalty, and taking from a province with a no-quartering charter also counts Broken charter.
- The **forage limit** of a province is its local store × foraging rating ÷ 2 rations, shown when you drag an army over it.
- **Hunger**: each week with no food, 5 % of men desert (levies first, then hired, then retinues, standing regiments last), 2 % die, 1 horse in 10 is eaten, and the army fights at −20 % strength and −10 % break point.
- **Sickness** each month by ground: low 0.5 %, medium 1 %, high 3 %, heat or cold 2 % (cold only in winter), plus the fever land rate for men not born on that ground, cut by 10 % per Logistics point.
- **Winter quarters**: an army stopped for winter in a province with a town eats 1 ration a man from its store and drills, and the province gets Soldiers quartered after a season. A no-quartering charter refuses. Armies left in the field in winter eat 2.5 rations a man.
- **Burn the fields** in your own province burns all its food tiles, moves the local store to the nearest castle or destroys it, and leaves Burned homes and Hungry.
- With W10 you can build **magazines** in occupied provinces, where an army refills as if at home.

### Battle

A battle starts when two hostile armies end a day in the same province, unless one withdraws first. An army may slip away before battle if its commander's Cunning is higher than the enemy's and it isn't trapped. A battle day has **6 bells** (about two hours each in eras I to V), and a battle lasts at most 3 days. Battles are decided by the commanders' styles and skills, the troop types and levels, the realm's inventions and the place, with **no dice and no player orders during the fight**.

**The battlefield** is the middle 7 tiles of the province's tile row (all of them if fewer), each a **sector** with a room:

| Sector | Room | Effects |
|---|---|---|
| Fields, pasture, burned | 3,000 | open: horse can charge; pasture +10 % for horse |
| Woods | 1,000 | no charges; shooting into it halved; companies can hide |
| Marsh | 500 | no charges; everyone −25 % |
| Waste (rock, sand) | 1,500 | open in drylands and desert; rough on hills and mountains |
| Shore (river bank) | 1,000 | attacking across it −20 % without a bridge, none when the river is frozen |
| Town | 1,500 | defender +50 %, shooting into it halved, no charges; fighting burns town buildings |
| Castle | its garrison | the garrison joins from the walls |

The province's ground applies on top (foot, horse and gun modifiers, the defender bonus, +10 % for locals in rough country). Men beyond a sector's room stand behind it as **depth** and step forward at the end of each bell. Each army has a **camp** behind it with its wagons, food reserve, wounded and unplaced guns. A narrow field favours the small army.

**Roles:**

- **Line** holds and fights hand to hand.
- **Brace** reverses a charge into it (chargers take double and deal half) but takes ×1.5 from shooting.
- **Shock** doubles hits the first bell it meets an enemy and again after a bell out of contact, only in open sectors.
- **Shot** shoots before the lines meet and every bell after while it has ammunition.
- **Light** can step back a sector without counting as fleeing and shoot again, and scouts.
- **Heavy** halves arrows and spears against it (not hand guns or later shot).
- **Guns** shoot into their own and neighbouring sectors and have no melee.
- **Air** (era VII) hits any sector or camp.

War elephants whose sector loses a bell badly panic and trample their own side for −10 % of their men.

**Troop levels in eras I and II:** Raw −10 % hits and can't fall back without breaking; Drilled can fall back a sector on orders; Seasoned +10 % hits, +5 % break point, can shift to a neighbouring sector within one bell; Veteran +20 % hits, +10 % break point, Line counts as half Brace; Elite +30 % hits, +15 % break point and one free order of its own each bell.

**Approaches.** Every commander has a style of his own (not picked per battle), and every style rests on one of eight approaches that sets how he deploys and which orders he gives first:

| Approach | How it deploys | Shines | Struggles |
|---|---|---|---|
| Breakthrough | all Shock massed in the best one or two open sectors | against Line and Shot in open fields | against Brace; narrow, wooded fields |
| Steadfast | Line evenly in every sector, Shot behind, a quarter in reserve | defending; against Breakthrough and Assault | slow to win |
| Envelopment | strong end sectors, thin Drilled centre; needs 5+ sectors | against Breakthrough and Assault | against Skirmish and Bombardment |
| Skirmish | Light and Shot over open sectors, Shock waiting behind | against Line and Brace in open country | against Shock; woods, marsh, towns |
| Ambush | up to half hidden in woods, marsh and town sectors | broken, wooded or swampy fields | open plains |
| Entrenchment | spends the first bell digging in; never advances | dug-in sectors: defender +50 %, charges reversed | attacking (fights as Steadfast) |
| Bombardment | guns massed in the centre, Line guarding them | against Brace, Entrenchment, any army that stands still | before W8; against Skirmish and Assault |
| Assault | everyone in front, no reserve, no shooting phase | against Shot and Bombardment | against Brace and Steadfast; losses ×1.25 for both sides |

**Leaders in battle.** The commander and each captain stand in one sector, where men get +5 % hits and +2 % break point per point of Might (era III and IV values); if that sector is lost the leader may be wounded, captured or killed. A commander gives 1 order per bell, +1 at Cunning 2 and +1 at Cunning 4, and the one with less Cunning gives his orders first, so the cleverer one answers. A commander whose Cunning is at least the Ambush commander's sees hidden companies. Shot and guns shoot for 3 bells + 1 per Logistics point (+1 with W10) before falling back to the camp for a bell. Each bell up to Logistics sectors swap a tired company for a fresh one for free; a company that has fought 3 bells in a row loses 10 % of its hits for each further bell until rotated.

**The orders:** Commit reserve; Shift (Seasoned or better arrives the same bell); Turn (from a won sector into a neighbour: hits ×1.5, enemy −10 % break point); Drive (from a won sector into the enemy camp: take wagons and food, free prisoners, spike guns, enemy army −10 % break point); Fall back (no hits that bell; Raw companies break instead); Rally (half the men who fled from one sector this bell return); Spring (Ambush only: reveal hidden companies, hits ×1.5, enemy there −10 % break point); Rotate.

**The bell** runs in order: orders (less Cunning first, then the other, then Elite free orders), shooting, charges, melee, breaking, then depth and rotation. The first bell is shooting only, unless an Assault commander advances.

**Hits.** Each company takes out 4 % (by era) × men in the front × strength per man × roles × level × leader's Might in its sector × sector and ground × inventions × tired × hungry (−20 %) × forced march (−10 % on the first day). Each hit takes one man out of the line: a share flees and the rest are split evenly between killed and wounded.

**The flee share** is 50 % − 30 % × the content share, where the content share is the share of your people living in calm provinces (0 or 1 grievances). Levies and standing regiments use their home provinces; retinues use the lord's lands (half for a wavering lord, zero for a disloyal one); hired companies always flee at 30 % plus 10 % per month of pay owed; garrisons use their home provinces and are fully content defending their own castle; rebel bands flee at 50 %. Fled men count toward the break point.

**Breaking.** A company whose losses pass its break point leaves the line. A sector with no company of one side is lost by that side and won by the other, who may Turn or Drive next bell. An army breaks when it has lost more than half the sectors it started in, or its total losses pass its men-weighted break point, or its camp is taken by Drive and it has lost at least a third of its sectors. If both break in the same bell, only the one further past breaks.

**Night.** After 6 bells without a break, night falls. Either side may withdraw by its standing orders; the withdrawal is clean if its commander's Cunning is at least the enemy's, otherwise it counts as breaking with half the pursuit. Overnight, fled men who will come back return and ammunition refills.

**Troyes, 1450.** Troyes' sectors are Fields, Fields, Fields, Pasture, Pasture, Woods, Town. Dunois defends for France in Three battles (Might 3, Cunning 4, Logistics 2) with 4,000 levy infantry, 2,000 archers and 1,000 knights. The Bastard of Burgundy attacks in Charge en haie (Might 3, Cunning 2, Logistics 1) with 5,000 hired heavy infantry and 2,000 knights. With 70 % of the French living in calm provinces, the French flee share is 29 %. In bell 2 the Burgundian knights charge the pastures and both pasture sectors break. In bell 3 Burgundy gives 2 orders first and France 3 after. After bell 6 neither army has broken; at night the Burgundian withdrawal counts as breaking with half the pursuit because his Cunning is lower, and France holds the field.

Battles play out over time, a round every 4 hours. On the map and in the battle viewer you see each side's men and a bar of men and morale left, updated every round, so you can follow the fight and decide when to retreat.

### After the battle

- Two thirds of the field-holder's wounded return after 5 weeks if the army is fed; the rest die. The broken side's wounded become the winner's prisoners.
- Half the field-holder's fled return within 2 weeks and half go home to recruits; of the broken side's fled, half return if the army reaches a friendly castle and half go home.
- The winner's Shock and Light companies that didn't break pursue: 1 in 4 of their men catches one fleeing man, killed or taken.
- The field-holder takes the arms of the loser's killed and wounded, and half the loser's wagons and food reserve (all if the camp was taken).
- Each captain and the commander of the broken side has a 1 in 10 chance of capture, more if pursued.
- Victories and defeats are added to the commanders and countries, scars are awarded, and all killed count as Fallen.
- **Prisoners** can be ransomed (gold by rank), exchanged, released (a gift that wins goodwill), enlisted as a hired company at level 1, or held (they eat). Realms with capture warfare (Mesoamerica and some forest-zone realms at the start) take half the enemy's killed as prisoners instead.

**Standing orders** apply to every battle: retreat if outnumbered 2 to 1, 3 to 2, or never (checked before battle and each night), and attack or wait. Battles start on the day two hostile armies meet and are fought over time: each bell is one round of 4 hours on the map, six a day. While one of your battles runs, the map slows to those 4-hour steps; at every step you can change standing orders, order a retreat (it takes effect at once, cleanly if your commander's Cunning is at least the enemy's) or switch between your battles, and the result can't be skipped. Armies that march in join their side's reserve. Afterwards the battle report shows, and any battle can be replayed later from its notice. Battles between other realms never slow the game: they fight their six rounds a day at once and go to the log.

### Commander styles

Each country has its own list of styles: catalogue styles whose *From* names it or its people and whose inventions it knows. A new commander takes one by origin: a noble or lord takes the country's horse style if it has one, a risen or hired captain its foot style, an academy graduate the style the academy teaches. Hired captains bring their own people's style wherever they serve. A country with no named style in an era uses the nearest one from its region by culture group (for example Sahel takes Furusiyya, the Andes Three battles until contact).

**Adopting** a style needs its inventions, plus one of: hiring 3 commanders or captains who use it and waiting 5 years, setting an academy to teach it with a teacher who knows it, losing 3 battles to it within 10 years, fighting beside an ally using it in 3 battles, or taking the capital of a country that uses it. An adopted style works as at home, except its special rule is at half strength in a commander's first battle with it.

A style is **stale** when the enemy has the inventions or styles that historically beat it: the commander loses its special rule and one order per bell, and the report says why. A commander knows one style, a second at 10 victories, and learns a newer style from his country's list 3 years after it arrives if he served in that time, or at once by graduating from an academy that teaches it, or after losing a battle to it.

**The style catalogue** (approach in brackets; each has its own special rule and stale-against list in the spec):

| Era | Styles |
|---|---|
| I | Charge en haie (Breakthrough), Three battles (Steadfast), Herse (Entrenchment), Gewalthaufen (Assault), Wagenburg (Entrenchment), Braccesca (Breakthrough), Sforzesca (Steadfast), A la jineta (Skirmish), Furusiyya (Skirmish), Feigned flight (Skirmish), Tabur cengi (Bombardment), Chezhan (Entrenchment), Shenjiying (Bombardment), Gyorin and Hōshi (Breakthrough), Kakuyoku (Envelopment), Saka (Assault), Xochiyaoyotl (Assault) |
| II | Tercio (Steadfast), Coronelía and field works (Entrenchment), Caracole (Skirmish), Countermarch (Steadfast), Szarża husarii (Breakthrough), Hussar raiding (Skirmish), Gulyay-gorod (Entrenchment), Rumi dastur and tulughma (Envelopment), Qizilbash charge (Breakthrough), Sandan-uchi (Entrenchment), Yuanyang zhen (Steadfast), Hwacha battery (Bombardment), Skulking way of war (Ambush), Malón (Skirmish) |
| III | Swedish brigade (Breakthrough), Highland charge (Assault), Tabor (Entrenchment), Ganimi kava (Ambush), Eight Banners (Breakthrough), Attaque en règle (Bombardment), Kuruc raiding (Skirmish) |
| IV | Schiefe Schlachtordnung (Breakthrough), Platoon fire (Steadfast), Redoubt line (Entrenchment), Nauka pobezhdat (Assault), Grenzer (Skirmish), Zamburak (Skirmish), Mysorean rocket corps (Bombardment), Asante war formation (Envelopment), Nizam-ı Cedid (Steadfast) |
| V | Ordre mixte (Breakthrough), Grande batterie (Bombardment), Thin red line (Steadfast), La guerrilla (Ambush), Impondo zankomo (Envelopment), Pā warfare (Entrenchment), Khalsa drill (Steadfast), Rifle pit and entrenchment (Entrenchment) |
| VI | Auftragstaktik (Breakthrough), Kesselschlacht (Envelopment), Offensive à outrance (Assault), Osman Pasha's redoubts (Entrenchment), Commando (Skirmish), Ansar charge (Assault) |
| VII | Creeping barrage and bite and hold (Bombardment), Stoßtrupptaktik (Breakthrough), Elastische Verteidigung (Steadfast), Bataille conduite (Bombardment), Bewegungskrieg (Breakthrough), Glubokiy boy (Breakthrough), Motti (Ambush), People's war (Ambush), Banzai charge (Assault) |

A few examples of special rules: Charge en haie charges at ×2.5 instead of ×2; Wagenburg can dig in on a day it marched; La guerrilla's hidden bands raid the occupier's food each month in occupied homeland provinces; People's war raises rebel bands for you in occupied homeland provinces.

**A French noble commander, three times.** In Charge en haie he meets the English Herse at Formigny in 1450 when the French have culverins: the Herse is stale and his charge finishes the archers. At Marignano in 1515 he meets the Swiss Gewalthaufen with massed French guns: it is stale and his charges break the pikes. At Pavia in 1525 he meets the Spanish Tercio with arquebusiers knowing W9 in wooded ground: now his style is stale, he loses an order per bell and his knights are shot down.

**Isandlwana and Ulundi, 1879.** A Zulu commander in Impondo zankomo against a British thin line spread over many sectors with its ammunition far back: from the second bell both British end sectors count as Turned on. Against a British square knowing W19 and W17 his style is stale and the horns never reach the ends.

There is no national bonus card: how different peoples fight falls out of styles, troop types and ground alone.

### Inventions in battle

| Invention | Effect in war |
|---|---|
| W1 | horse archers; +1 order a bell for Skirmish commanders with horse archers |
| W2 | knights; Breakthrough charges ×2.5 instead of ×2 |
| W3 | bombards (5 per gun in the field); Bombardment commanders possible |
| W4 | Entrenchment's dug sectors also block Turn and Drive |
| W5 | hand gunners; Shot ignores Heavy |
| W6 | pikes |
| W7 | pike and shot; Brace mixed with its own shot no longer takes ×1.5 from shooting |
| W8 | field guns reach neighbouring sectors; Bombardment hits ×1.5 |
| W9 | Shot hits ×1.5 in the first bell of each day |
| W10 | +1 bell of ammunition; wagons +50 %; magazines |
| W11 | line infantry; every foot company becomes Brace; pikes obsolete |
| W12 | standing regiments never below level 2; troop cap +0.5 % |
| W13 | guns can Shift with the line; Bombardment keeps the line back only 1 bell |
| W14 | +1 order a bell for every commander; armies split and join in a day |
| W15 | troop cap shares doubled; levies serve 12 months before going home |
| W16, W17 | riflemen; hits 5 % then 6 % of the front per bell |
| W18 | troop cap +1 %; levies gather in days along railways |
| W19 | shooting from dug-in sectors ×2; charges into them always fail |
| W20 | Ambush companies shoot from woods unseen |
| W21 | tanks, a Shock troop type that ignores dug-in sectors and machine guns |
| W22 | every commander sees hidden companies; aircraft hit any sector or camp; scouts see 4 provinces; can bomb castles and wagons |
| W23 | +1 order a bell; captains give orders in their own sector |

Building inventions: B1 stone castles and B4 earthwork ring forts; B5 bastion and B6 star forts, against which bombards are nearly useless; B7 siege parallels multiply shot and mining by 1.5; B2 roads, B9 turnpikes and railways speed marching.

### Warfare through the eras

Each realm fights by the inventions it knows, with no world clock, so armies of different eras can meet on one field.

| Era | Years | A bell | Longest battle | Sector room | Hits per bell |
|---|---|---|---|---|---|
| I to IV | 1378 to 1800 | 2 hours | 3 days | as the table | 4 % |
| V | 1800 to 1870 | 2 hours | 3 days | as the table | 5 % with W16, 6 % with W17 |
| VI | 1870 to 1914 | half a day | 10 days | halved | 6 % (8 % with W19) |
| VII | 1914 to 1939 | a day | 30 days | a quarter | 8 % |

A battle of 10 or 30 days keeps its armies in place while it lasts and simply carries on into the next turn. An invention belongs to the era the research tree gives it. Styles first seen after 31 August 1939 are not in the game.

**Obsolete troop types.** When the enemy knows the invention that replaced a troop type, that troop type fights at half strength against him, and once your own realm learns it you can no longer raise it. Plate armour on foot falls to W5; knights and gendarmes, bows and crossbows to W9; pikes and horse archers to W11 (horse archers keep scouting and raiding); bombards in the field to W8; close-order line infantry to W17; cavalry as Shock and foot without cover to W19 (horse stays Light until W21); tanks without air cover to W22 on the enemy side. Re-arming costs loads of arms and powder and drops the company a level; an invention that changes a company's troop type or role drops it a level until it has drilled the new era's Drilled months.

**Levels by era** (drill months for Drilled / Seasoned / Elite; hits at levels 1 to 5; break point at levels 3 to 5):

| Era | Drill months | Hits | Break point |
|---|---|---|---|
| I | 2 / 4 / 8 | −10 / 0 / +10 / +20 / +30 | +5 / +10 / +15 |
| II | 3 / 6 / 12 | same as I | +5 / +10 / +15 |
| III | 4 / 8 / 12 | −15 / 0 / +15 / +25 / +35 | +5 / +10 / +15 |
| IV | 6 / 12 / 18 | −20 / 0 / +15 / +30 / +45 | +5 / +10 / +20 |
| V | 3 / 6 / 18 | −15 / 0 / +15 / +25 / +40 | +5 / +10 / +20 |
| VI | 6 / 12 / 24 | −25 / 0 / +20 / +35 / +50 | +10 / +15 / +20 |
| VII | 6 / 12 / 24 | −30 / 0 / +25 / +45 / +70 | +10 / +15 / +25 |

Era notes: in era I knights and men-at-arms start at level 3 and levies can't pass level 3 without becoming standing troops; in era II pike and shot below level 2 fight as levy infantry; in era III musketeers below level 2 shoot at half with W9; in era IV linear tactics need level 2 to change sector in a bell; in era VI a realm with W18 can call up former soldiers at level 2 as reservists; in era VII level 4 and 5 companies can infiltrate.

**Skills by era.** Might gives +8 % hits and +3 % break point per point in era I (with a 1 in 5 risk to the leader if his sector is lost), +7 % and +3 % in II, +5 % and +2 % in III and IV, +4 % and +2 % in V (1 in 10 risk); in era VI there is no sector and it gives +3 % hits and +1 % break point to the whole army, and in VII +2 % and +1 % plus +10 % per point to Drive orders. Orders at Cunning 0 to 1 / 2 to 3 / 4 to 5 are 1/2/2 in era I (orders to other sectors arrive next bell), 1/2/3 in II (orders 3+ sectors away arrive next bell), 1/2/3 in III and IV, 1/2/3 in V (+1 with W14), 2/2/3 in VI (captains give their own orders), and 2/3/4 in VII (+1 with W23). Logistics sets ammunition bells: bows 4 + Logistics in era I, Shot 3 + Logistics in II to IV, Shot and guns 2 + Logistics in V with guns needing powder wagons, 1 + Logistics in VI (a company without ammunition fights at half, rotation up to Logistics × 2 sectors), and in VII ammunition for tanks and aircraft, drawn from the powder store, with losses replaced from depth at 10 % per point per bell. From era III skills also grow from academy training and serving under a Cunning 4+ commander; in eras VI and VII the academy becomes the staff college (+1 Might, Cunning and Logistics on graduating), victories give +1 Might only every 4, Cunning can grow from wargames (a peacetime year of training, once per era), and each peacetime year commanding a standing army gives +1 Logistics, up to 3. In every era W14 and W23 each add an order per bell. Drill counts up to 24 months, enough for Elite in every era.

### Sieges

| Castle | Walls bonus | Shot per breach | Mining months per breach | Garrison room |
|---|---|---|---|---|
| Earthwork ring fort (B4) | +50 % | 30 | 2 | 1,000 |
| Stone castle (B1) | +100 % | 20 | 4 | 2,000 |
| Bastion fort (B5) | +100 % | 80 | 6 | 3,000 |
| Star fort (B6) | +150 % | 150 | 8 | 5,000 |

Walls gain +25 % on hills and +50 % on mountains. A castle with no garrison falls at once. A castle besieged by at least 3 men per garrison man is **closed**: nothing reaches it. Otherwise it can be fed by road from its own side, and by sea if it stands on a shore tile and the sea isn't blockaded.

Each month of a siege:

- The garrison eats 1 ration a man from the castle store, and so do the castle tile's townsfolk unless the commander drives them out (adding refugees and Burned homes next door). Besiegers eat from their own supply.
- Guns add shot (each bombard 2, each field gun 1, ×1.5 with B7); without guns the besiegers mine. Each castle's shot or mining months per breach opens a breach, and each breach takes a third off the walls bonus. A Siege master breaches 25 % faster and Logistics digs 10 % faster per point.
- A garrison with a warden or 200 spare men repairs one breach a month, and may sally once a month with a third of its men in a one-bell battle against the siege camp.
- An empty castle store costs the garrison 10 % a month to hunger and desertion and −10 % break point.
- After 3 months the besiegers' sickness doubles.

**Storming** needs a breach, or an earthwork ring fort (scaled at double losses). It is up to 6 bells on one sector with room 500 per breach; the garrison gets the walls bonus less a third per breach, and stormers' losses are ×1.5.

A siege ends by **honours of war** (the garrison marches out armed to the nearest friendly castle and the castle is taken whole; keeping terms builds trust, breaking them is an oath broken), **surrender** (the garrison become prisoners), **storm** (the garrison killed or taken; you choose Spare, Plunder or Raze), **relief** (an army from the castle's side beats the besiegers and the garrison joins as a reserve at +10 %) or **lifting** (the besiegers leave). Plunder gives gold equal to a year of the province's tax owed, burns 1 in 3 town buildings, kills or drives off 10 % of townsfolk and adds Burned homes; Raze destroys the castle.

An AI garrison accepts honours when it has a breach or under a month of food and no relief army within 10 days, and never from a Cruel commander. A besieger can bribe the garrison's captain only when its pay is owed 2 months or more, the castle belongs to a disloyal or wavering lord, or the captain's language differs from his ruler's. A Greedy commander inside takes the bribe; a Greedy commander outside pockets a tenth. Taking a castle gives you its store and the province's food spread.

**The castle of Troyes.** A stone castle with a garrison of 300 and 6 months of store is besieged by Burgundy with 6,000 men and 4 bombards. It is closed, and the besiegers add 8 shot a month. After 3 months it has 1 breach and a walls bonus of about +67 %. Burgundy offers honours, no French relief army is within 10 days, so the garrison accepts and marches to Reims, and Burgundy takes the castle whole with its store and control of food spread in Champagne.

A siege shows its progress on the map: how long the castle has held, its breaches, and the garrison and food left inside.

### Occupation and raids

Taking a province's castle, or holding a province with no castle for a season, **occupies** it: you get its tax, recruits, food and trade, and its lord wavers toward the side holding his land. A horse-only army set to **Raid** can't besiege or occupy; each week it burns one tile and takes loot (gold from market and town, herds and horses from pasture) up to 1 load per 50 riders, then moves on, and castles there may sally.

### War and peace

Every war's aim is shown to everyone; it decides which lords come and how peace voices speak. A war with no fitting aim counts Lands taken for every province taken, makes your non-Warlike lords waver, and doesn't oblige allies to join. Breaking a truce counts an oath broken and makes every lord waver a step.

**Peace voices** are recomputed from the war's current state, never stored as a score:

- Each **lord** has one voice per province he holds. He says peace when any of his provinces is occupied, his retinue has lost half its men, he is wavering or disloyal, or his lands are hungry; war when he is Warlike, the aim is his Want, or he is loyal and his side has more victories in this war.
- Each **royal province** says peace with 2 or more of Conscription, Soldiers quartered, Burned homes, Hungry or Heavy taxes, or when occupied; otherwise it has no voice.
- The **capital** is a third of all voices, saying peace when occupied or besieged.
- A **Warlike ruler** ignores a quarter of the peace voices; a child ruler's regent counts as a lord.

With over half saying peace, the ruler must accept a peace asking only for provinces the enemy occupies and gold up to the treasury. A player who refuses loses a step of loyalty from every lord each season and levies desert twice as fast. With over three quarters, the ruler must also accept tribute, a pretender, or becoming a subject. The AI makes and accepts peace by the same counts.

**Peace terms and what they need:** Cede a province only one the asker occupies (or a swap); Pay gold up to the treasury or as debt; Tribute (yearly gold or grain for up to 20 years) only with over three quarters peace voices or as overlord; Seat a pretender only with their capital occupied; Become a subject only with over three quarters peace voices; Demolish a castle in a province they keep; Open the roads means no tolls for 10 years; Give back occupied provinces, ransom or exchange prisoners, a marriage and white peace are open to either side; Renounce a claim by a pretender.

**What each war aim gives:** Take land gives those provinces; Seat a pretender replaces their ruler and makes the realm your ally or subject; Tribute gives yearly gold or grain; Free a people releases a new country; Break a subject makes it independent; Defend the faith gives a faith tolerance charter there, or the province; Punish gives gold and a humbled ruler; Raid ends after 12 months with raids only.

**Wars also end** when one side has no soldiers and no castles left (the winner takes all it occupies), when a Raid war reaches 12 months, or when a ruler dies with no heir and his lords fall into a succession war (a white peace unless the enemy backs a claimant). A signed peace starts the truce set by [Diplomacy](Diplomacy): 5 years, +5 if provinces moved or a subject was made.

### The price of war

Every war costs gold, men, people and your lords' patience, and one peace takes only part of a realm, so war is a choice with a price and not the best answer to everything.

- **The declare sheet.** *Declare war* on a realm's Diplomacy tab no longer acts at once: it opens a sheet with the **Price of war** above *Confirm*. It lists who will be called against you (each realm with its soldiers and how it comes in: an ally, a protection pledge, a league against you or a subject), your allies who will come to your side, both sides' soldiers, the neighbours who will hold *Threatened us* for a war with no aim, how many of your lords (or boyars, beys, daimyo: your realm's own word) will waver, a truce you would break and when it would have ended, the monthly pay of your armies at war, and the most one peace can take ("at most 5 of their 14 provinces"). Lines that hurt are red with a "!" mark, and every line opens its reason when you tap it. A faith head's censure warning sits above *Confirm*, and a button opens your *Your name abroad* card. On a phone held sideways the price sits on the left and the terms on the right; in the Tall layout it is one scrolling column. *Confirm* stays pinned at the foot; with a truce it reads *Break the truce and declare war*.
- **Levies at war are paid from their first month** (in peace they serve three months free), and occupied provinces pay their occupier only half their tax and no trade, so occupation doesn't pay for the war.
- **The dead are missed at home**: men killed in a levy are lost from their province's peasants and counted among its fallen.
- **One peace takes at most a third** of the loser's provinces, rounded up, and the capital only with the last one. Swallowing a realm takes several wars.
- **Long wars tire lords**: after 2 years, lords who aren't Warlike, and whose Want the aim doesn't name, all say peace.
- **The war card.** Each running war has a card on your Diplomacy tab (and on the enemy's): the aim, both war leaders' **peace voices** as bars with a mark at half and the numbers written beside them, months at war and the long-war mark, provinces occupied each way, and how many provinces one peace could take from each side now. The **At war** plaque in the top bar carries a small bar of your side's peace voices with its number: amber past a third, red past half, when you must take a fair peace. Tapping the plaque opens the war card.
- **The computer counts the same price**: it declares only when its side, with the allies who will answer, is clearly stronger than everyone who will be called against it, when it holds gold for some months of war pay, when its own people don't want peace, and (unless Warlike) when its notoriety is under 50.

### The computer players

The AI's risk tolerance sets its standing orders: a careful realm waits and retreats when outnumbered at all, a middling one attacks and retreats at 3 to 2, and a bold one attacks and retreats only at 2 to 1. Only a bold realm sends horse-only armies raiding instead of besieging. Its commanders start with its country's styles from the style catalogue. Its personality also sets which kinds it raises (Castile noble retinues and frontier light cavalry, a city republic hired companies) and how many peace voices it needs before talking peace (a low-risk AI offers at a third, a hegemon seeker only when forced). It sees only the forage limits, food reserves and peace voices the player sees, and doesn't cheat on food.

### Each turn and each month

During the turn, inside the day loop: contacts, the withdraw check and battles; raids burn a tile a week; forced marches and hunger cost men weekly; weekly meals and refills at the end of every turn (a turn is one week; each meal is 7/30 of the month's rations). Monthly rules keep their size and run at the end of the turn in which a new month begins, in order: pay and pay owed; supply (rot, quarters, Requisitioned and Hungry); sickness and wounded returning; sieges; occupation by holding a season; drill, months out, levies and lords going home; the troop cap; peace voices. Yearly: arms rust, powder damp, scars fade, ageing, and victories older than 20 years drop off.

## What you see

- **The army card**: name, owner, place, destination, commander and skills, captains, men by foot, horse and guns, companies by kind and level, food days and reserve size, pay and months owed, break point and flee share, orders, sick and wounded. Every line opens its gain and lose list.
- **Your running battles**: shown step by step every 4 hours, with standing orders, retreat and a switch between battles.
- **The battle report**: who fought, where, the result, the losses and a one-line reason. Any battle can be replayed later from its notice.
- **The battle playback**: the tile row, companies as blocks with level chevrons, the camps, and a one-line action per bell ("Dunois commits his knights to the pastures").
- **The forage limit**, shown when you drag an army over a province.
- **Rumours** of unseen armies.
- **Notifications** for battle won or lost (with the reason), a breach, terms offered, peace voices passing half, pay owed and an army hungry.
- **The war aim**, shown to everyone.

## How it connects

- [Troop-Movement](Troop-Movement): supplies daily positions and contacts; warfare supplies march effects, scouting, standing orders, the battle-start rule, forage limit and the broken army.
- [Recruiting](Recruiting): delivers levies, trained regiments and commissioned commanders; gets back disbanded men, deserters and Fallen.
- [Naval](Naval): uses warfare's bell rules for sea battles on 3 sectors, and its commanders' skills for admirals; naval decides ship damage (a ship hit and still afloat loses one hull step, hits equal to its strength sink or take it) and storms.
- [Diplomacy](Diplomacy): declares wars with aims and sides, carries peace and sets the truce; receives peace voices, occupation and oaths broken.
- [Provinces](Provinces): supplies ground, tile rows, stores, sickness and grievances; receives Requisitioned, Hungry, Soldiers quartered, Burned homes, burned tiles and sacks.
- [World-Map](World-Map): tile rows, ground, shore tiles and bridges.
- [Your-Realm](Your-Realm): treasury, lords and loyalty, ruler, the siege reserve and academies; receives Fallen, victories, stores, prisoners and the troop cap.
- [Research](Research): the W, B and S inventions known.
- [Buildings](Buildings): castle types, powder mills, forges, drill yards and magazines.
- [Rebellions](Rebellions): rebel bands fight as the Rebel band kind.
- [Government](Government): Warlike rulers, regencies and succession wars.
- [Subjects](Subjects): subject armies and the Break a subject and Become a subject terms.
- [Culture](Culture): homeland language, culture group for style fallback, a captain's language for bribes.
- [Religion](Religion): persecution for the Defend the faith aim.
- [Historical-Events](Historical-Events): prestige from victories, war weariness from Fallen and peace voices, throne offers to generals.
- [The 1378 Start](The-1378-Start): starting styles, capture warfare realms, starting castles and inventions.
- [Map and Map Modes](Map-and-Lenses) and [Screens-and-Navigation](Screens-and-Navigation): army cards, battle playback, reports and notifications.
- [Trade](Trade): occupiers take trade; the Open the roads term.
- [Time-and-Turns](Time-and-Turns): the weekly turn, the day loop and the order battles resolve in.

## Numbers

All warfare values live in `packages/rules/data/domain/warfare.json`; most are provisional and tuned in balancing. Amounts the designs left out are set as: a wagon costs 10 gold, a hired company costs twice standing pay, a season is 3 months, a ransom is 100 gold for a commander and 25 for a captain, and fever land doubles sickness. Key values:

| Key | Value |
|---|---|
| `warfare.company_size_min` / `max` | 500 / 1,000 |
| `warfare.drill_max`, `warfare.scars_max`, `warfare.scar_fade_years` | 12, 5, 5 |
| `warfare.kinds.<kind>.break_point` | levy 25 %, retinue 35 %, hired 35 %, standing 30 %, garrison 40 %, rebel 20 % |
| `warfare.kinds.levy.free_months` | 3 (levies no longer go home on their own) |
| `warfare.kinds.hired.pay_multiplier`, `warfare.kinds.standing.pay_multiplier` | 3, 1.5 |
| `warfare.break.homeland` / `hungry` / `pay_owed` | +5 % / −10 % / −5 % a month |
| `warfare.arms_rust` / `powder_damp` | 2 % / 5 % a year |
| `warfare.victories_window_years` | 20 |
| `warfare.troop_cap.with_official` / `muster_master` / `without` | 2 % / 3 % / 1 % |
| `warfare.troop_cap.w12` / `w15` / `w18` | +0.5 % / ×2 / +1 % |
| `warfare.over_cap.pay` / `desertion` | ×2 / 5 % a month |
| `warfare.lords.loyal_days` / `wavering_days` / `wavering_stay` | 3 weeks / 6 weeks / 6 months |
| `warfare.rations.*` | campaign 2, horse 3, prisoner 1, winter field 2.5, quarters 1 |
| `warfare.logistics.food_cut` / `sickness_cut` / `dig_speed` | 5 % / 10 % / 10 % per point |
| `warfare.reserve.rot` | 5 % a month, half at Logistics 3+ |
| `warfare.wagon.rations` / `horses` | 1,000 / 2 |
| `warfare.foraging_rating` | 100 / 60 / 30 / 10 % |
| `warfare.hunger.*` | desert 5 %, die 2 %, horses 1 in 10, −20 % strength, −10 % break point |
| `warfare.sickness` | 0.5 / 1 / 3 %, heat or cold 2 % |
| `warfare.scouting.riders_per_province`, `warfare.rumour_error` | 500, up to a third |
| `warfare.battle.bells_per_day` / `max_days` / `max_sectors` | 6 / 3 (10, 30) / 7 (3 at sea) |
| `warfare.hits_per_bell`, `warfare.room_by_era` | see the eras table |
| `warfare.flee.base` / `content_factor`; `hired` / `per_month_owed` / `rebel` | 50 % / 30 %; 30 % / +10 % / 50 % |
| `warfare.tired_after_bells` / `tired_penalty` | 3 / −10 % a bell |
| `warfare.adoption.*` | 3 officers, 5 years, 3 lessons in 10 years, 3 alliance battles |
| `warfare.style_learn_years` | 3 |
| `warfare.wound_chance.lost` / `won`, `warfare.death_chance.loser`, `warfare.capture_chance` | 1 in 10 / 1 in 20, 1 in 20, 1 in 10 |
| `warfare.their_man.victories` / `years` | 8 / 5 |
| `warfare.after.*` | wounded two thirds after 5 weeks; fled half in 2 weeks; pursuit 1 in 4 |
| `warfare.castles.hills` / `mountains` | +25 % / +50 % |
| `warfare.siege.close_ratio`, `shot_per_month`, `b7_multiplier` | 3; bombard 2, field gun 1; ×1.5 |
| `warfare.siege.repair_men`, `sally_share`, `fever_after_months` | 200, a third, 3 |
| `warfare.storm.room_per_breach` / `losses` / `scaling` | 500 / ×1.5 / ×2 |
| `warfare.raid.loot_per_riders` | 1 load per 50 riders |
| `warfare.peace.capital_share` / `warlike_ignore` / `half` / `three_quarters` | a third / a quarter / 50 % / 75 % |
| `warfare.peace.tribute_years` / `open_roads_years`, `warfare.raid_war_months` | 20 / 10, 12 |
| `diplomacy.truce_years` | 5 (+5) |

## Still open

Nothing in warfare is waiting on a decision; the provisional numbers are tuned in balancing. War at sea, including the Close order, belongs to [Naval](Naval).

## For developers

- Spec: `domain/warfare/spec.md` in the game repository.
- Features: `domain/warfare/features/`, 17 files including `battle-bells.feature` (Troyes 1450), `sieges.feature` (the castle of Troyes), `troop-cap-and-soldier-stats.feature` (France 1444), `commander-styles.feature` and `warfare-eras.feature`.
- Code: `packages/engine/src/domain/warfare/` (companies, commanders, styles, battle, resolver, sieges, supply, war, ai), with all values in `packages/rules/data/domain/warfare.json`.
