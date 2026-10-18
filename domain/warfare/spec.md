# Warfare (WAR)

## 1. Purpose and scope

Warfare decides how a realm's soldiers are organised into companies and armies, what they cost to keep, how
they are fed, who leads them and in what style, how a battle is fought bell by bell, how castles fall, what
holding enemy land means, how raids work, how the war itself moves toward peace (peace voices), and how all of
this changes from era I to era VII as inventions arrive.

**In scope**
- Companies: men, drill, scars, arms, pay owed, months out; arms (troop types) and their needs; kinds (levy,
  retinue, hired company, standing regiment, garrison, rebel band); elephants and camels as their own types.
- The realm's soldier stats: soldiers, arms store, powder store, prisoners, victories and defeats, troop cap.
- The army side of raising and keeping an army: calling the lords, hiring free companies, upkeep, pay,
  desertion, disbanding.
- Commanders and captains: skills, traits, origins (the warfare side), wounds, age, death, defection;
  commander styles, their approaches, adoption, staleness and learning.
- Seeing the enemy: scouts, rumours, hidden companies.
- Supply: rations, the food reserve, wagons, taking food at home, plunder abroad, the forage limit, hunger,
  sickness, winter quarters, scorched earth.
- Battle (one battle at a time): when it happens, the battlefield on the tile row, roles, troop levels,
  approaches, skills, orders, the bell, hits and the flee share, breaking, inventions in battle, night and
  withdrawal, aftermath, prisoners, standing orders, the battle report.
- Sieges: castles' war numbers, closing, the monthly siege, breaches, storming, terms, sacks, bribes.
- Occupation and raids.
- War state: peace voices, the war-state preconditions of peace terms, how a war ends without a treaty,
  breaking a truce, the war-aim effects table (shared with diplomacy, see §11).
- Inventions' war effects (W, B branches; S branch only as handed to naval).
- Warfare by era (I to VII, cut at 31 August 1939): battle scale, obsolescence, level thresholds, skills.
- The war AI (standing orders, kinds raised, besiege or raid, peace threshold).

**Not in scope (owned by …)**
- Marching: routes, days per step, march-order speeds, the day loop, contact timing, castles stopping a
  march, retreat of a broken army, interception, passage, boarding and landing (**troop-movement**). Only the
  seam is recorded here (§11.2).
- The levy itself, training regiments, the recruit pool, commissioning officials as commanders, the Marshal,
  the drill yard and barracks (**recruiting**).
- War at sea: ships, sailors, admirals, fleets, sea battles' crew, boarding and prize rules, blockade, carrying,
  hunting, escort, storms (**naval**, which uses this context's bell rules; §11.3).
- How a war aim is obtained, declaring war, calls to arms and allies' answers, leagues, truce length, the
  envoy carrying peace, many-sided peace (**diplomacy**, v2 §6.1, §7, §8).
- Subject kinds, independence wars (**subjects**); succession wars (**realm** / **government**).
- Ground and tile numbers (foot, horse, guns, defender, days to cross, foraging, sickness) (**world-map** /
  **province**); grievances and their effects (**province** / **rebellions**); how rebel bands form (**rebellions**).
- What the player sees at each zoom and the battle screen's art (**map-presentation**, warfare §14).
- Out of scope for the whole game: warfare era VIII (1960 on: AirLand Battle, Airmobile, Operational
  manoeuvre group, All-tank doctrine, Foco, insurgency, Rapid dominance, W24 Guided missiles, the proposed
  Helicopters and Anti-tank and anti-air missiles inventions), and the part of era VII after 31 August 1939.

## 2. Sources

Newest decision first.
1. planning/gap-lists.md "Decisions already made" (16 Oct): campaign 1444 to 31 August 1939; era VIII and
   1939–1960 of era VII out of scope; one month per turn, now one week per turn by X-18; battles simulated one at a time; elephants and camels
   are their own unit types; women can be commanders following each country's history, more likely in later
   ages; warfare 19 (hits per bell, break points, troop cap) still open.
2. diplomacy/diplomacy-design.md v2 (16 Oct): §6.1 calls to arms (replaces warfare 10.2's refusal rule),
   §7 war aims and declaring, §8 truce length (replaces warfare 10.4's 10 years), §18 changes asked of warfare.
3. naval/naval-design.md v1: §7.4, §8 (crew counts, boarding, prizes, ports at war), §13 changes asked of warfare.
4. troop-movement/troop-movement-design.md v1: §3.1 (decided: guns are one ×1.25 per army, not per gun; 6 days per
   crossing), §5.2 (castles always block, decided by Leroy), §6 meeting the enemy, §15 decisions.
5. recruiting/recruiting-design.md v3: §1, §4 (training, break point of trained regiments), §7 (commanders
   from officials), §10 changes asked of warfare.
6. warfare/warfare-design.md v5 (all sections, §1–§19).
7. warfare/warfare-styles.md (all sections).
8. warfare/warfare-eras.md (all sections).
9. Read for seams only: province-stats §3.1, §11, §12.1; rebellions-design; country-stats; research-tree;
   terrain.md; buildings-design; country-catalogue/build/ai-personalities.md.

## 3. Ubiquitous language

| Term | Meaning | Not to be confused with |
|---|---|---|
| Company | A group of usually 500 to 1,000 men of one kind and one arm, keeping its own counts | Army (a body of companies under one commander) |
| Regiment | Recruiting's word for a company whose arm was set by training | — |
| Arm | How a company fights (levy foot, pikes, knights …), with a strength per man, needs and roles; the troop type | Kind |
| Kind | Where soldiers come from: levy, retinue, hired company, standing regiment, garrison, rebel band | Arm |
| Strength per man | An arm's fighting worth per man, by era (config) | Hits |
| Role | What an arm does in a sector: Line, Brace, Shock, Shot, Light, Heavy, Guns, Air (era VII) | Approach |
| Drill | Months a company has trained together (0 to 24, D-WAR-9) | Scars |
| Scars | Battles a company stood through without breaking (0 to 5) | Victories |
| Troop level | 1 Raw, 2 Drilled, 3 Seasoned, 4 Veteran, 5 Elite, read from drill and scars | — |
| Load of arms | One unit of the arms store: pikes, armour, hand guns, lances | Powder |
| Load of powder | One unit of the powder store | — |
| Break point | The share of men a company (or army) can lose in one battle before it runs | Flee share |
| Flee share | The share of each hit that runs away instead of being killed or wounded | Break point |
| Content share | The share of a realm's people living in calm provinces (0 or 1 grievances) | — |
| Troop cap | The most soldiers the whole realm may keep under arms | Forage limit |
| Ration | Food for one person for one month | — |
| Food reserve | Rations an army carries in its wagons, shown as days of food | Castle store |
| Wagon | A cart holding 1,000 rations, pulled by 2 horses | — |
| Reserve size | The number of months of food (1, 2 or 3) an army tries to keep; a standing order | — |
| Forage limit | How many soldiers a province can feed for a month from its local store | Troop cap |
| Plunder | Eating from a foreign province's local store, then its standing crop, once the reserve is empty | Sack |
| Winter quarters | An army stopped for winter in a province with a town | — |
| Commander | The leader of an army; stands in one sector | Captain, admiral |
| Captain | One of up to two sub-leaders of an army, each standing in one sector | Company captain, hired captain |
| Might, Cunning, Logistics | The three commander skills, 0 to 5 | — |
| Trait | One of Steady, Reckless, Careful, Beloved, Cruel, Siege master, Horse lord, Old soldier, Greedy, Ambitious | Style |
| Style | A real, named way of war tied to countries and eras (for example *Charge en haie*) | Approach |
| Approach | One of eight battle behaviours behind every style: Breakthrough, Steadfast, Envelopment, Skirmish, Ambush, Entrenchment, Bombardment, Assault | Style |
| Stale | A style facing the enemy inventions or styles that historically beat it | Obsolete |
| Obsolete | An arm replaced by an invention the enemy knows | Stale |
| Adopted style | A style taken by a country not in its *From* list | — |
| Battlefield | The row of up to 7 sectors taken from the province's middle tiles | — |
| Sector | One tile of the battlefield, with a room and effects | — |
| Room | How many men can fight in a sector at once | Garrison room, training room |
| Depth | Men beyond a sector's room, standing behind it | Reserve |
| Reserve | Companies held back by the approach to be committed by order | Food reserve |
| Camp | The area behind an army: wagons, food reserve, wounded, guns not placed | Siege camp |
| Bell | One round of battle (about two hours in eras I–V) | — |
| Order | One of Commit reserve, Shift, Turn, Drive, Fall back, Rally, Spring, Rotate | March order, standing order |
| Hits | Men a company takes out of the enemy line each bell | — |
| Won sector | A sector the other side has left | — |
| Dug-in sector | A sector an Entrenchment commander dug in (stakes, ditches, wagons) | — |
| Standing orders | Per-army orders for every battle: retreat if outnumbered, attack or wait, reserve size | March orders |
| Clean withdrawal | A night withdrawal with no pursuit | — |
| Prisoner | An enemy soldier, lord or commander held | — |
| Capture warfare | A realm that takes half the enemy's killed as prisoners | — |
| Castle | A building on a tile with walls bonus, shot per breach, mining months, garrison room | — |
| Walls bonus | The defender strength bonus of a castle | — |
| Shot | Siege damage from guns, counted toward breaches | Shot (role) |
| Breach | A hole in the walls: each takes a third off the walls bonus | — |
| Closed castle | A castle besieged by at least 3 men per garrison man | — |
| Sally | A one-bell battle by a third of the garrison against the siege camp | — |
| Terms | Honours of war or surrender offered or asked | Peace terms |
| Sack | Plunder of a stormed castle's town | Plunder (supply) |
| Occupation | Holding an enemy province by taking its castle or holding it a season | — |
| Raid (army) | A horse-only army that burns and loots instead of besieging or occupying | Raid (war aim) |
| Peace voices | The people who count in a realm, each saying peace or war | War score (not used) |
| Victories / Defeats | Battles won and lost (country: last 20 years; commander: lifetime record) | Scars |
| Fallen | All killed, counted on the country (country 6) | — |
| Era | Research era I 1444–1500, II 1500–1600, III 1600–1700, IV 1700–1800, V 1800–1870, VI 1870–1914, VII 1914–1939 (cut) | — |

## 4. Domain model

### Aggregates

**Army** (identity: army id; owner country)
- Holds: companies; commander; up to two captains; food reserve (rations); wagons; reserve size; standing
  orders (retreat ratio, attack or wait); march order (from troop-movement); location (one province);
  sick and wounded counts with return dates; prisoners carried.
- INV-WAR-1: An army has exactly one commander and at most two captains.
- INV-WAR-2: There is no cap on the number of men in one army.
- INV-WAR-3: The food reserve never exceeds the wagons' load (1,000 rations per wagon, +50 % with W10).
- INV-WAR-4: The reserve size is 1, 2 or 3 months.
- INV-WAR-5: An army stands in exactly one province (troop-movement 2.2).

**Company** (identity: company id; part of an army, a garrison, or a lord's retinue)
- Holds: kind; arm; men; drill (0–24, D-WAR-9); scars (0–5); loads of arms carried; pay owed (months);
  months out; home province(s); level (derived).
- INV-WAR-6: A company has exactly one kind and one arm.
- INV-WAR-7: Scars are between 0 and 5.
- INV-WAR-8: Level is derived from drill and scars and is between 1 and 5; a standing regiment (W12) is never below level 2.
- INV-WAR-9: A company short of its arm's loads of arms fights as the next arm down.

**Commander** (identity: person id; country)
- Holds: Might, Cunning, Logistics (each 0–5); style(s) (one, a second at 10 victories); trait(s) (one, a
  second can come at 10 victories); victories; defeats; wounds; age; origin; army led; "their man" companies.
- INV-WAR-10: Each skill is between 0 and 5.
- INV-WAR-11: A commander knows at most two styles and has at most two traits.
- INV-WAR-12: Victories, defeats and wounds never decrease.

**Realm war stats** (identity: country)
- Holds: soldiers; arms store; powder store; prisoners; victories and defeats (last 20 years); troop cap;
  known styles (own and adopted); content share.
- INV-WAR-13: Levies, hired companies and standing regiments, plus garrisons above their castles' room,
  count toward the troop cap; lords' retinues and allies' armies do not.

**Siege** (identity: castle and besieging side)
- Holds: castle type; garrison; castle store; siege reserve; breaches; shot accumulated; mining months;
  months besieged; closed or not; besieging armies.
- INV-WAR-14: A castle with no garrison cannot be besieged: it falls at once.
- INV-WAR-15: Each breach takes a third off the walls bonus.

**Battle** (identity: province and day)
- Holds: two sides (armies, castle garrison), battlefield sectors, bells fought, days fought, deployment,
  orders given, losses (killed, wounded, fled), result, one-line reason.
- INV-WAR-16: A battlefield has at most 7 sectors (3 at sea).
- INV-WAR-17: A battle day has 6 bells; the longest battle is 3 days in eras I–V.
- INV-WAR-18: Battles are resolved one at a time.

**War** (identity: war id)
- Holds: sides (leaders, allies who joined, subjects), war aim (from diplomacy), victories in this war,
  occupied provinces, peace voices per side, start date.
- INV-WAR-19: Each side's peace voices are recomputed from the current state, never stored as a score.

### Entities and value objects

- **Arm definition** (value): name, strength per man by era, needs per 100 men, roles, unlocked by, obsolete by.
- **Kind definition** (value): pay rule, base break point, special rules, content share rule.
- **Sector** (value): tile use, room, effects (charges allowed, cover, defender bonus, crossing penalty).
- **Castle type** (value): walls bonus, shot per breach, months of mining per breach, garrison room.
- **Style** (value): name, from, needs, approach, special rule, stale against, era.
- **Approach** (value): deployment rule, order priority list, needs, shines, struggles.
- **Peace voice** (value): holder (lord, royal province, capital, ruler), weight, says peace / war / none.
- **Prisoner** (entity): person or company, rank, owner, ration eaten.
- **Free company** (entity): name, captain, men, arm, drill, scars, price, contract months, region.
- **Rumour** (value): approximate size and place of an unseen army, wrong by up to a third.

### Domain services

- **Battle resolver**: resolves one battle bell by bell from the two armies, the tile row and the ground;
  produces the result, losses and report before the report is shown (watching is playback).
- **Supply service**: monthly food eaten, refilled, plundered; hunger and sickness.
- **Siege service**: monthly siege steps.
- **Peace voices counter**: recomputes each side's voices.
- **Troop cap calculator**.
- **Level reader**: level from drill and scars by the realm's era.

### Reference data: arms (v5 §2.2, eras I–IV; roles §7.3)

| Arm | Strength per man | Needs per 100 men | Roles | Unlocked by |
|---|---|---|---|---|
| Levy foot (spears, bows, farm tools) | 1.0 | Nothing | Line | Start |
| Armoured foot | 1.3 | 1 load of arms | Line, Heavy | Start |
| Archers | 1.1 | 1 load of arms | Shot | Start |
| Pikes | 1.2 | 1 load of arms | Brace | W6 Pike squares |
| Hand gunners | 1.4 | 1 arms, 1 powder a battle | Shot | W5 Gunpowder infantry |
| Pike and shot | 1.6 | 2 arms, 1 powder | Brace, Shot | W7 Pike and shot |
| Musketeers (volley) | 2.0 | 2 arms, 2 powder | Shot | W9 Volley fire drill |
| Line infantry (flintlock) | 2.6 | 2 arms, 2 powder | Line, Brace, Shot | W11 Flintlock and bayonet |
| Riflemen | 3.5 → 5.0 | 3 arms, 3 powder | Shot, Light | W16, W17 |
| Light horse | 2.0 | 100 horses | Shock, Light | Start |
| Horse archers | 2.5 | 100 horses, 1 arms | Shot, Light (Shock against broken enemies) | W1 Composite-bow horse archery |
| Knights and lancers | 3.5 | 100 horses (+50 remounts), 2 arms | Shock, Heavy | W2 Heavy armoured cavalry |
| Camel riders | 2.0 | 100 camels (as horses) | Shock, Light; no desert penalty | Desert and Sahel realms at start |
| War elephants | 6.0 per man (8 men to an elephant); −50 % in forest and jungle | Elephants from studs in South and Southeast Asia | Shock, Heavy; panic | Start there |
| Bombards | 5 per gun in battle; 2 shot a month in a siege | 20 crew, 8 horses or oxen, 1 powder a month firing | Guns | W3 Bombards |
| Field guns | 25 per gun | 15 crew, 6 horses, 2 powder a battle | Guns | W8 Field artillery |
| Light field guns | 25 per gun, no march penalty | 10 crew, 4 horses, 2 powder a battle | Guns | W13 Light field artillery |
| Later arms (machine guns, tanks, aircraft) | In config, same table shape | — | Brace/Shot (machine guns), Shock (tanks, W21), Air (aircraft, W22) | W19, W21, W22 |

### Reference data: arms by role and era (eras §3; era VIII out of scope)

| Role | I | II | III | IV | V | VI | VII (to 1939) |
|---|---|---|---|---|---|---|---|
| Line | Levy foot, armoured foot | Armoured foot | Musketeers | Line infantry | Line infantry | Riflemen | Infantry |
| Brace | Pikes (W6), dismounted men-at-arms | Pike and shot (W7) | Pike and shot | Line infantry with bayonets (W11) | Infantry squares | Entrenched riflemen | Machine gunners, anti-tank teams |
| Shot | Archers, crossbows, longbows, hand gunners (W5) | Arquebusiers | Musketeers (W9) | Line infantry | Riflemen (W16) | Breech-loading riflemen (W17), machine guns (W19) | Infantry, machine guns |
| Shock | Knights (W2), elephants, camel riders | Gendarmes, lancers | Cuirassiers, hussars | Dragoons, cuirassiers | Cuirassiers, lancers | Cavalry (obsolete against W19) | Tanks (W21) |
| Light | Light horse, horse archers (W1) | Horse archers, light horse | Hussars, Cossacks | Light infantry, hussars | Skirmishers, riflemen | Mounted rifles | Reconnaissance troops |
| Heavy | Plate armour (knights, men-at-arms) | Plate (fading: Shot ignores Heavy from W5) | Cuirass | none | none | none | Armour plating (tanks) |
| Guns | Bombards (W3) | Field guns (W8), Ottoman and Mughal cart guns | Regimental guns | Field artillery | Massed artillery, horse artillery (W13) | Quick-firing artillery (W20) | Howitzers firing beyond sight |
| Air | — | — | — | — | — | — | Aircraft (W22): hit any sector or camp, ignore cover |

### Reference data: obsolescence (eras §3)

| Obsolete | Made obsolete by (the enemy must know it) |
|---|---|
| Plate armour (Heavy role on foot) | W5 Gunpowder infantry |
| Knights and gendarmes | W9 Volley fire drill |
| Pikes | W11 Flintlock and bayonet |
| Bows and crossbows | W9 Volley fire drill |
| Horse archers | W11 (they keep scouting and raiding) |
| Bombards in the field | W8 Field artillery |
| Close-order line infantry | W17 Breech-loading rifle |
| Cavalry as Shock | W19 Machine gun (horse stays as Light until W21) |
| Foot without cover | W19 Machine gun |
| Tanks without air cover | W22 Military aircraft on the enemy side |

### Reference data: sectors (v5 §7.2)

| Sector (tile use) | Room | Effects |
|---|---|---|
| Fields, pasture, burned | 3,000 | Open: horse can charge; pasture +10 % for horse |
| Woods | 1,000 | No charges; shooting into it halved (cover); companies can hide (Ambush) |
| Marsh | 500 | No charges; everyone −25 % |
| Waste (rock, sand) | 1,500 | Open in drylands and desert; rough (no charges) on hills and mountains |
| Shore (river bank) | 1,000 | Attacking across it −20 % unless the province has a bridge or its river is frozen (X-17, MOVE-117) |
| Town | 1,500 | Defender +50 %, shooting into it halved, no charges; fighting here burns town buildings |
| Castle | Its garrison | The garrison can join from the walls (walls bonus) |

### Reference data: castles (v5 §8.1)

| Castle | Walls bonus | Shot per breach | Months of mining per breach | Garrison room |
|---|---|---|---|---|
| Earthwork ring fort (B4) | +50 % | 30 | 2 | 1,000 |
| Stone castle (B1) | +100 % | 20 | 4 | 2,000 |
| Bastion fort (B5) | +100 % | 80 | 6 | 3,000 |
| Star fort (B6) | +150 % | 150 | 8 | 5,000 |

### Reference data: approaches (v5 §7.5, styles §1)

| Approach | Deployment | Orders in priority | Needs | Shines | Struggles |
|---|---|---|---|---|---|
| Breakthrough | All Shock massed in the best one or two open sectors; Line thin elsewhere; small reserve | Turn winners into the next sector · Drive into the camp · Commit reserve | Shock; an open sector | Against Line and Shot in open fields | Against Brace; narrow, wooded fields |
| Steadfast | Line evenly in every sector; Shot behind; a quarter of the army in reserve | Commit reserve to the sector closest to breaking · Rotate · Rally | Plenty of Line; Logistics | Defending; against Breakthrough and Assault | Slow to win |
| Envelopment | Strong end sectors, thin Drilled centre | Fall back in the centre when pressed · Turn the ends inward | Level 2+ in the centre; at least 5 sectors | Against Breakthrough and Assault | Against Skirmish and Bombardment |
| Skirmish | Light and Shot spread over open sectors; Shock waiting behind; no reserve | Step back and shoot · Charge with Shock once an enemy sector breaks or runs out of ammunition · Drive | Light troops; open sectors with room | Against Line and Brace in open country | Against Shock; woods, marsh, towns |
| Ambush | Up to half the army hidden in woods, marsh and town sectors; rest holds thinly | Spring (hits ×1.5 that bell, enemy there −10 % break point) · Turn · Fall back | Cover sectors; Cunning higher than the enemy's | Broken, wooded or swampy fields | Open plains |
| Entrenchment | First bell spent digging in | Rotate · Commit reserve · Rally; never advances | Shot or guns; being attacked | Dug-in sectors: defender +50 %, charges reversed as against Brace | Attacking (fights as Steadfast) |
| Bombardment | Guns massed in the centre, Line guarding them | Keep the line back 2 bells while guns fire · Shift Line to cover the guns · Commit reserve | Guns | Against Brace, Entrenchment, any army that stands still | Before W8; against Skirmish and Assault |
| Assault | Everyone in front, no reserve | Advance everything in the first bell (no shooting phase for either side) · Drive · Turn | Many men | Against Shot and Bombardment | Against Brace and Steadfast; losses ×1.25 for both sides |

### Reference data: style catalogue (styles §3; eras I–VII; era VIII out of scope)

| Era | Style | From | Needs | Approach | Special rule | Stale against |
|---|---|---|---|---|---|---|
| I | Charge en haie | France, Burgundy, England, Castile, Aragon, Portugal, the Empire's princes, Hungary, Naples | W2 | Breakthrough | Shock charges ×2.5 instead of ×2 | Pikes (W6) in the sector charged; W9 |
| I | Three battles | Most settled realms of Europe and the Mediterranean | — | Steadfast | The reserve adds +5 % break point to the whole army, not only while waiting | W3 used in the field; W8 |
| I | Herse | England, Wales | — | Entrenchment | Dug sectors also double the first bell's Shot | Guns in the field (W3, W8) |
| I | Gewalthaufen | Swiss Confederacy; Landsknechte of the Empire from 1490 | W6 | Assault | Pikes advance in the first bell without their charge being reversed by Shock | W8 massed; Shot behind field works |
| I | Wagenburg | Bohemia, Hungary, Poland-Lithuania | W4 | Entrenchment | Can dig in even on a day it marched; dug sectors block Turn and Drive | W8 |
| I | Braccesca | Italian states (condottieri) | — | Breakthrough | Rotates Shock for free: a charged-out company is replaced by a fresh one each bell | W7 |
| I | Sforzesca | Milan and Italian states (condottieri) | — | Steadfast | Commit reserve gives ×1.5 hits in the bell it arrives | W9 |
| I | A la jineta | Castile, Granada, Portugal | — | Skirmish | Light horse can Drive into the camp from any won sector | W11 |
| I | Furusiyya | Mamluk Sultanate | W1 | Skirmish | Horse archers can also charge as Shock in the same battle | W5 massed with W3 in the field |
| I | Feigned flight | Great Horde, Crimea, Kazan, Uzbeks, Timurids, Oirats, Kazakhs, Nogais | W1 | Skirmish | Shock that charges horse archers and misses is −25 % next bell | W11 |
| I | Tabur cengi | Ottomans | W3 | Bombardment | The centre counts as dug in | W9 on the enemy side |
| I | Chezhan | Ming China, Joseon Korea | W4 | Entrenchment | Guns may stand in dug sectors and Shift with them | W8 |
| I | Shenjiying | Ming China | W5 | Bombardment | Shot fire in rotation: no ammunition limit for the first 6 bells | W9 on the enemy side |
| I | Gyorin and Hōshi | Japanese clans | — | Breakthrough | Turn hits ×2 instead of ×1.5 | W5 massed |
| I | Kakuyoku | Japanese clans | — | Envelopment | End sectors get +25 % room | W9 |
| I | Saka | Rajput states | — | Assault | When the army would break, it fights one more bell at ×1.5 instead | W5 massed with W3 |
| I | Xochiyaoyotl | Aztec Triple Alliance, Tlaxcala and neighbours | — | Assault | Half of the enemy's killed are taken as prisoners instead | W5 with W2 on the enemy side |
| II | Tercio | Spain, the Habsburg lands, Spanish Italy | W7 | Steadfast | Brace and Shot in one company; it can't Shift | W9 with W8 |
| II | Coronelía and field works | Spain | W5 | Entrenchment | Dug sectors double Shot | W8 massed |
| II | Caracole | Protestant German princes, Huguenot France | W5 | Skirmish | Horse acts as Shot as well as Shock | Pikes (W6), W9 |
| II | Countermarch | Dutch Republic; later England, Sweden, German Protestant states | W9 | Steadfast | Shot keeps its first-bell bonus every bell | W8 massed |
| II | Szarża husarii | Poland-Lithuania | W2 | Breakthrough | Charges not reversed by Brace in the first contact; can charge a second time without a bell out of contact | W11 |
| II | Hussar raiding | Hungary, Croatia, the Military Frontier | — | Skirmish | Light can Drive into the camp from any sector | W11 |
| II | Gulyay-gorod | Muscovy | W4 | Entrenchment | Dug sectors take half from Shot too | W8 |
| II | Rumi dastur and tulughma | Mughals, Timurid princes | W3 | Envelopment | Centre counts as dug in; end-sector horse Turn also hits the enemy reserve | W9 |
| II | Qizilbash charge | Safavid Persia | W2 | Breakthrough | Charges into Raw companies ×3 | W5 with W3 |
| II | Sandan-uchi | Oda and other Japanese clans | W5 | Entrenchment | Shot fires every bell at first-bell strength | W8 |
| II | Yuanyang zhen | Ming China | — | Steadfast | Its companies take no extra hits from Turn and can't be Sprung on | W9 massed |
| II | Hwacha battery | Joseon Korea | W3 | Bombardment | Guns hit every sector within 2 in the first bell | W8 on the enemy side |
| II | Skulking way of war | Haudenosaunee and peoples of the eastern woodlands | — | Ambush | Hidden companies can Spring in any sector with woods, not only next to cover | W22 |
| II | Malón | Mapuche | — | Skirmish | After a won battle, the pursuit takes horses and food reserve as well | W17 |
| III | Swedish brigade | Sweden; adopted by Brandenburg, Saxony and others | W8, W9 | Breakthrough | Horse may charge in the same bell Shot fires; regimental guns stand with Line | W11 |
| III | Highland charge | Scottish Highland clans, Jacobites, Irish armies | — | Assault | The defender's Shot fires only once before contact | W11 with level 3+ defenders |
| III | Tabor | Zaporozhian Cossacks | W4 | Entrenchment | Can dig in on a day it marched | W8 |
| III | Ganimi kava | Marathas | — | Ambush | Hidden companies can also attack enemy armies marching through, outside battle (raiding their food reserve) | W13 |
| III | Eight Banners | Manchu Later Jin and Qing | W1, W2 | Breakthrough | Horse archers and Shock in the same company | W11 |
| III | Attaque en règle | France | B7 | Bombardment | Sieges: breaches ×1.5; storming losses halved | B6 with a relief army |
| III | Kuruc raiding | Hungarian kuruc rebels | — | Skirmish | Light can fight dismounted as Shot | W13 |
| IV | Schiefe Schlachtordnung | Prussia | W11 | Breakthrough | One end sector gets double room for one bell; Turn from it ×2 | W14 |
| IV | Platoon fire | Britain, Dutch Republic | W11 | Steadfast | Line companies rotate for free | W16 |
| IV | Redoubt line | Russia under Peter I | W11, B4 | Entrenchment | Dug sectors break Turn and Drive | W13 |
| IV | Nauka pobezhdat | Russia | W11 | Assault | Line charging with bayonets: first contact ×1.5 | W16 |
| IV | Grenzer | Habsburg Military Frontier | W11 | Skirmish | Light foot in rough sectors: enemy Shot against them halved | W16 |
| IV | Zamburak | Durrani Afghanistan, Persia under Nader Shah | W5 | Skirmish | Light can carry guns: they Shift and shoot like Guns | W13 |
| IV | Mysorean rocket corps | Mysore | W8 | Bombardment | Guns hit the enemy camp from the first bell | W13 massed |
| IV | Asante war formation | Asante | W5 | Envelopment | End sectors move through woods without losing a bell | W17 |
| IV | Nizam-ı Cedid | Ottomans (adopted) | W11 | Steadfast | Levels rise one step faster | W16 |
| V | Ordre mixte | France | W14 | Breakthrough | Line can Shift two sectors a bell; one sector may advance in the first bell | W16 |
| V | Grande batterie | France | W13 | Bombardment | All guns fire into one sector for two bells: its defenders −15 % break point | W16 |
| V | Thin red line | Britain | W11 | Steadfast | Line attacked by Shock becomes Brace for that bell; enemy guns −50 % in the first two bells | W17 |
| V | La guerrilla | Spain, Portugal, Haiti, then any homeland under occupation | — | Ambush | In occupied homeland provinces, hidden bands raid the occupier's food reserve each month | Weakened by W18 |
| V | Impondo zankomo | Zulu kingdom and the Nguni peoples it drew in | — | Envelopment | From the second bell, both enemy end sectors count as Turned on | W17 with W19 |
| V | Pā warfare | Māori | W5 | Entrenchment | Dug sectors halve all hits, guns included | W19 |
| V | Khalsa drill | Sikh Empire | W11, W13 | Steadfast | Guns rotate for free | W17 |
| V | Rifle pit and entrenchment | United States, Confederate States, Russia | W16 | Entrenchment | Shot from dug sectors ×1.5 | W19 |
| VI | Auftragstaktik | Prussia and Germany; adopted by Japan | W17, W18 | Breakthrough | Captains give their own orders in their sectors (+1 order per captain) | W19 entrenched on a full front |
| VI | Kesselschlacht | Germany | W18 | Envelopment | An army whose two end sectors are lost can't withdraw; when it breaks, all its men become prisoners | W22 on the enemy side |
| VI | Offensive à outrance | France, Russia in 1914 | W17 | Assault | Flee share halved for the attacker | W19 |
| VI | Osman Pasha's redoubts | Ottomans | W17 | Entrenchment | Shot from dug sectors ×1.5; the line can be held by half the men | W20 massed |
| VI | Commando | Boer republics | W17 | Skirmish | Light fight dismounted as Shot and remount to step back two sectors | W22 |
| VI | Ansar charge | Mahdist Sudan | — | Assault | +25 % hits in the first contact | W19 |
| VII | Creeping barrage and bite and hold | Britain, the Dominions, France | W20, W23 | Bombardment | Before an attack the defender's first-bell hits are halved; won sectors can't be counter-attacked for a bell | Elastic defence |
| VII | Stoßtrupptaktik | Germany | W19 | Breakthrough | Level 4+ companies can Drive through a sector that is still held | Elastic defence; W21 on the enemy side |
| VII | Elastische Verteidigung | Germany | W19 | Steadfast | Front sector held lightly; when lost, Turn and Drive from it don't work for a bell, and the reserve counter-attacks ×1.5 | W21 with W22 and W23 |
| VII | Bataille conduite | France | W19, W20 | Bombardment | Every sector dug in; no order can be given to more than one sector per bell | W21 with W23 |
| VII | Bewegungskrieg | Germany | W21, W22, W23 | Breakthrough | Tanks that win a sector can Drive two sectors deep in one bell | Deep defence with W22 parity |
| VII | Glubokiy boy | Soviet Union | W21, W22, W23 | Breakthrough | After a breakthrough, a second wave enters from depth: Drive orders cost no order | Air superiority on the enemy side |
| VII | Motti | Finland | — | Ambush | Sprung companies split an enemy sector in two: each half fights alone | W22 |
| VII | People's war | Chinese communists, Yugoslav and other partisans | — | Ambush | In occupied homeland provinces, rebel bands form for you each month | Nothing; slowed by calm provinces |
| VII | Banzai charge | Japan | — | Assault | Breaks are delayed by one bell; losses ×2 for both sides | W19 |

(Era VII styles first seen after 31 August 1939 are dropped: D-WAR-12, X-14.)

## 5. Requirements

### 5.1 Companies and arms

- WAR-001 The warfare system shall make every army out of companies, each of one kind and one arm, usually 500 to 1,000 men (config), each keeping its own men, drill, scars, arms, pay owed and months out. [warfare §2.1]
- WAR-002 The warfare system shall add men to a company by raising or refilling from recruits, by wounded coming back and by enlisting prisoners, and shall remove men killed, wounded, fled, deserting, sick, hungry or disbanded. [warfare §2.1]
- WAR-003 When a month passes with a company in camp, garrison or winter quarters and not marching, the warfare system shall add 1 drill (up to 24, D-WAR-9); while it is a standing regiment, it shall drill all year. [warfare §2.1]
- WAR-004 When new men join a company, the warfare system shall set its drill to drill × old men ÷ all men, and dilute its scars the same way. [warfare §2.1]
- WAR-005 When a company has a hungry month, the warfare system shall take 1 drill from it. [warfare §2.1, §7.4]
- WAR-006 When a company stands through a battle without breaking, the warfare system shall add 1 scar, and 1 more if its side won (to a maximum of 5). [warfare §2.1, §7.12]
- WAR-007 When 5 years pass without a battle for a company, the warfare system shall take 1 scar from it. [warfare §2.1, §7.4]
- WAR-008 When a company is disbanded, the warfare system shall reset its drill (and scars). [warfare §2.1, §3.5, §7.4]
- WAR-009 The warfare system shall add loads of arms to a company when issued from the store at raising and when captured on a won field, and remove them with killed and fled men, when left on a lost field, and when sold at disbanding. [warfare §2.1]
- WAR-010 If a company carries fewer loads of arms than its arm needs, then the warfare system shall have it fight as the next arm down (armoured foot as levy foot). [warfare §2.1]
- WAR-011 The warfare system shall give each arm a strength per man by era, its needs per 100 men, its roles and the invention that unlocks it, as in the arms table (config). [warfare §2.2, §7.3]
- WAR-012 The warfare system shall treat war elephants and camel riders as their own arms: elephants at 6.0 per man, 8 men to an elephant, −50 % in forest and jungle, from studs in South and Southeast Asia; camel riders at 2.0 with 100 camels per 100 men and no desert penalty, known at start in desert and Sahel realms. [warfare §2.2, §7.3, §19; gap-lists 16 Oct]
- WAR-013 Where a company's arm uses powder, the warfare system shall take its powder per battle (or per month of siege firing for bombards) from the realm's powder store, and if the store has none, then its guns and hand guns shall not fire in battle. [warfare §2.2, §2.4, §3.4]
- WAR-014 The warfare system shall make later-era arms (machine guns, tanks, aircraft) arms of the same shape in config, each with strength, needs and invention. [warfare §2.2]

### 5.2 Kinds and break points

- WAR-015 The warfare system shall give each kind its pay rule and base break point: levy 25 % (free for the first 3 months, then normal pay); retinue 35 % (paid by the lord); hired company 35 % (three times normal pay); standing regiment 30 % (1.5 times normal pay, all year, needs W12); garrison 40 % on the walls (normal pay); rebel band 20 % (loot). [warfare §2.3]
- WAR-016 When a levy company has been out 6 months, the warfare system shall send 5 % of its men home each month unless it is paid double. [warfare §2.3] *Replaced by WAR-212 (playtest feedback).*
- WAR-017 While levies are away at harvest, the warfare system shall report that share of farmers away to the province so its harvest falls by that share. [warfare §2.3]
- WAR-018 While a lord is wavering, the warfare system shall allow him to take his retinue home mid-war. [warfare §2.3, §3.2]
- WAR-019 If a hired company is owed 1 month of pay, then it shall not fight; if owed 2 months, then it shall loot the province it stands in or take the enemy's offer if it is higher. [warfare §2.3]
- WAR-020 The warfare system shall let standing regiments keep drill and scars through peace. [warfare §2.3]
- WAR-021 The warfare system shall count garrisons against their castle's room. [warfare §2.3, §8.1]
- WAR-022 The warfare system shall make rebel bands fight by these battle rules, whatever the rebellion design decides about how they form. [warfare §2.3, §18]
- WAR-023 The warfare system shall modify a company's break point by its troop level, by the leader's Might in its sector, +5 % when defending its own homeland, −10 % if hungry, −5 % per month of pay owed, and by commander traits. [warfare §2.3]

### 5.3 The realm's soldier stats

- WAR-024 The warfare system shall count the realm's soldiers as the men in all companies, garrisons included. [warfare §2.4]
- WAR-025 The warfare system shall add loads to the arms store from forges, buying, captured fields and companies handing them back, and remove them when issued, lost in battle, by rust of 2 % a year, and by selling. [warfare §2.4]
- WAR-026 The warfare system shall add loads to the powder store from powder mills and buying, and remove them by firing, by damp of 5 % a year, and when a castle magazine is captured. [warfare §2.4]
- WAR-027 The warfare system shall add prisoners from battles won, sieges ended by surrender and pursuit, and remove them by ransom, release, exchange, enlisting and escape; each prisoner eats 1 ration a month. [warfare §2.4, §3.4]
- WAR-028 The warfare system shall count the realm's victories and defeats over the last 20 years and publish them for lords' loyalty, neighbours' fear and the event tree's `prestige`. [warfare §2.4, §18]

### 5.4 Troop cap

- WAR-029 The warfare system shall set the realm's troop cap to 2 % of the people in royal provinces with an official (3 % with a muster master) + 1 % of the people in royal provinces without one + the garrison room of its castles. [warfare §2.5]
- WAR-030 The warfare system shall count levies, hired companies and standing regiments toward the troop cap, and garrisons only above their castle's room. [warfare §2.5]
- WAR-031 The warfare system shall count nothing toward the troop cap from provinces occupied by the enemy or in revolt. [warfare §2.5]
- WAR-032 Where the realm knows W12 the troop cap shares shall rise by 0.5 % of people; where it knows W15 the shares shall double; where it knows W18 they shall rise by 1 % of people. [warfare §2.5, §12]
- WAR-033 The warfare system shall not count lords' retinues toward the realm's cap; each lord shall have his own cap by the same rule on his lands (2 % of people with one of his officials, 1 % without), and his retinue shall not grow past it. [warfare §2.5]
- WAR-034 The warfare system shall count allies' armies only against their own cap. [warfare §2.5]
- WAR-035 While the realm is over its troop cap, the warfare system shall forbid raising and hiring, charge double pay for every soldier over the cap, and make levies desert 5 % a month until it is back under. [warfare §2.5]
- WAR-036 The warfare system shall put no cap on the size of one army; food is its limit. [warfare §2.5, §4.5]

### 5.5 Raising and keeping an army

- WAR-037 When levies are raised (recruiting), the warfare system shall receive them as levy-kind companies of levy foot, gathered in the province's castle or town after 2 weeks (days with W18 along railways). [warfare §3.1, §12; recruiting §1, §2.5]
- WAR-038 When the player or AI calls the lords, the warfare system shall answer each lord by loyalty: loyal brings his whole retinue in 3 weeks and may lead it as a captain; wavering brings half, after 6 weeks, and goes home after 6 months unless the war aim is his Want; disloyal refuses and calling him again makes him angrier; a lord in revolt's retinue is a rebel army. [warfare §3.2]
- WAR-039 When the war aim is a lord's Want, the warfare system shall bring him even when wavering and keep him to the end. [warfare §3.2]
- WAR-040 When a lord's lands are occupied by the enemy, the warfare system shall send him and his retinue to defend them. [warfare §3.2]
- WAR-041 The warfare system shall offer named free companies with a captain in the regions where they historically gathered (config), each showing men, arm, drill, scars and price. [warfare §3.3]
- WAR-042 When a contract is signed, the warfare system shall add the free company for the contracted months for gold up front plus monthly pay, using no recruits. [warfare §3.3] *Replaced in part by WAR-210, WAR-211 (playtest feedback).*
- WAR-043 When a hire contract ends, its pay is owed as in WAR-019, or an enemy outbids, the warfare system shall remove the free company. [warfare §3.3]
- WAR-044 Each month, the warfare system shall charge the treasury pay for every company except retinues and levies in their first 3 months. [warfare §3.4]
- WAR-045 At the weekly step at the end of every turn (X-18), the warfare system shall feed an army a week's share (7 ÷ 30) of its monthly rations (2 per soldier on campaign, 3 per horse and 1 per prisoner a month), from the province at home and from its food reserve abroad. [warfare §3.4, §6.1; X-3, X-18]
- WAR-046 When a company is disbanded, the warfare system shall return its men to their home province's recruit pool and its arms to the store. [warfare §3.5]
- WAR-047 When a standing regiment is disbanded, the warfare system shall reset all its drill and scars. [warfare §3.5]
- WAR-048 When soldiers come home from a long war with no slot free, the warfare system shall hand them to the province as homeless (a source of rebels). [warfare §3.5]

### 5.6 Commanders and captains

- WAR-049 The warfare system shall give every commander Might, Cunning and Logistics from 0 to 5, a style, one trait, victories, defeats, wounds, age and origin. [warfare §4.1, §4.2, §18]
- WAR-050 When a commander has won 2 more battles, the warfare system shall add 1 Might (to 5); when he wins a battle while outnumbered, it shall add 1 Might at once. [warfare §4.2]
- WAR-051 When a commander takes a serious wound, the warfare system shall take 1 Might; with age it shall take 1 Might every 5 years past 60. [warfare §4.2]
- WAR-052 When a commander wins a battle in which he gave more orders than the enemy commander, or makes a clean withdrawal from a lost battle, the warfare system shall add 1 Cunning. [warfare §4.2]
- WAR-053 The warfare system shall take 1 Cunning every 5 years past 65, and 1 when he is ambushed and loses. [warfare §4.2]
- WAR-054 When a commander spends a full year in the field without a hungry month, the warfare system shall add 1 Logistics; years as a steward or warden official before command shall also add it. [warfare §4.2]
- WAR-055 The warfare system shall take Logistics with age past 65, and 1 when an army starves under him (a month at no food). [warfare §4.2]
- WAR-056 The warfare system shall give academy graduates +1 Cunning or Logistics at start and no victories. [warfare §4.2, §4.4]
- WAR-057 The warfare system shall give each commander a serious wound with a 1 in 10 chance per lost battle and 1 in 20 per won one (twice as likely if Reckless); wounds never heal. [warfare §4.2]
- WAR-058 The warfare system shall apply the traits: Steady +5 % break point for his army; Reckless +10 % strength, −5 % break point, losses ×1.3 for both sides, wounds twice as likely; Careful never ambushed while marching Careful and spots hidden companies as with +1 Cunning; Beloved halves desertion and keeps levies 3 months longer; Cruel makes sacks pay 50 % more, gives *Burned homes* faster where he occupies, and enemy garrisons won't accept his terms; Siege master breaches 25 % faster; Horse lord +10 % Shock and Turn with Shock hits ×2 instead of ×1.5; Old soldier raises his companies' drill 2 a month instead of 1; Greedy keeps a tenth of all loot and takes bribes from garrisons; Ambitious as in WAR-064. [warfare §4.3]
- WAR-059 When a commander reaches 10 victories, the warfare system may give him a second trait. [warfare §4.3]
- WAR-060 Where the player has not set an army's standing orders, the warfare system shall set them from the commander's trait (Reckless never retreats; Careful retreats at 3 to 2). [warfare §4.3]
- WAR-061 The warfare system shall allow commanders from the ruler or an heir, a lord, a hired captain, a captain risen from the ranks after a victory (one offer per won battle), an academy graduate and a foreign exile, with the catches of each origin (succession crisis on the ruler's death or capture; Proud lords refusing a lower-born commander; a hired captain leaving when unpaid; the exile's old ruler insulted). A commissioned official counts as an academy graduate. [warfare §4.4; X-7; D-WAR-6] *Replaced in part by RECR-111 (playtest feedback).*
- WAR-062 The warfare system shall lose commanders by death in battle (1 in 20 for the loser's commander, more under Reckless), capture, old age, dismissal (a dismissed lord wavers), defection, or a grant of land after which he leads only his retinue. [warfare §4.4]
- WAR-063 The warfare system shall let an army have one commander and up to two captains, each standing in one sector; a captain who wins 3 battles under a commander learns his style. [warfare §4.5]
- WAR-064 When a commander with 8 or more victories has led the same standing regiments or hired companies for 5 years, the warfare system shall mark those companies as "his men", following him before the crown; if he is Ambitious, pay is owed, or the ruler is a child or newly crowned, it shall let events offer him the throne or a march on the capital. [warfare §4.6]
- WAR-065 The warfare system shall allow women as commanders where the country's history supports it, more often in later eras, by the same rule as rulers and lords. [warfare §19; gap-lists 16 Oct]

### 5.7 March effects and seeing the enemy

- WAR-066 While an army is on forced march, the warfare system shall double its sickness, make its levies desert 2 % a week, and give it −10 % strength for the first day of a battle it arrives into. [warfare §5.1, §7.8]
- WAR-067 While an army marches Careful, the warfare system shall not let it be ambushed and shall let its scouts see two provinces ahead. [warfare §5.1]
- WAR-068 The warfare system shall show a realm the enemy armies in its own provinces, in provinces next to its armies and castles, and as far as its scouts ride: every 500 light horse, horse archers or camel riders see one province further. [warfare §5.4]
- WAR-069 The warfare system shall show armies further away as rumours of their size and place that can be wrong by up to a third. [warfare §5.4]
- WAR-070 The warfare system shall work out rumours and scouting only for armies near the player. [warfare §16]

### 5.8 Supply

- WAR-071 The warfare system shall count food in rations and cut what an army eats by 5 % per point of its commander's Logistics. [warfare §6.1, §4.2]
- WAR-072 While an army stands in its own realm's provinces, the warfare system shall have it take only what it needs (each week's meals plus what its reserve is missing until full), from its own castle store first down to the castle's siege reserve, then from the local store. [warfare §6.2, §6.3]
- WAR-073 While an army stands anywhere else (enemy, neutral or an ally's land, or at sea), the warfare system shall have it eat from its reserve, shrinking every week. [warfare §6.2; troop-movement §11.3]
- WAR-074 If an army outside its own land has an empty reserve, then the warfare system shall have it plunder: first the local store at the ground's foraging rating (rich 100 %, fair 60 %, poor 30 %, almost none 10 %), then the standing crop, one tile a week turning burned and giving one season of that tile's food at once; plunder shall never refill the reserve. [warfare §6.2, §6.3]
- WAR-075 The warfare system shall add to the food reserve by refilling at home, by capturing an enemy army's wagons when it breaks, and by taking a castle's store when the castle falls, and remove it by eating abroad, by losing half the wagons when the army breaks or by raids, and by rot of 5 % a month (half as fast with Logistics 3 or more). [warfare §6.2, §4.2]
- WAR-076 The warfare system shall hold the reserve in wagons of 1,000 rations each, needing 2 horses that eat; wagons are gained by building (gold, timber) and capture and lost in defeats, raids and when horses die; W10 adds +50 % load. [warfare §6.2, §12]
- WAR-077 The warfare system shall let the player set a reserve size of 1, 2 or 3 months as a standing order. [warfare §6.2]
- WAR-078 When an army takes food from the local store of a province, the warfare system shall give that province *Requisitioned* for a season, and *Hungry* if it drops under a month of food. [warfare §6.3; province §12.1]
- WAR-079 When an army takes grain (or castle store) from a lord's province in a season, the warfare system shall lower the lord one step of loyalty. [warfare §6.3]
- WAR-080 When an army takes food from a province with a no-quartering charter, the warfare system shall also count *Broken charter* there. [warfare §6.3]
- WAR-081 The warfare system shall compute a province's forage limit as its local store × foraging rating ÷ 2 rations, and show it when an army is dragged over the province. [warfare §6.3]
- WAR-082 When an army takes an enemy castle, the warfare system shall put the castle's store into its reserve. [warfare §6.3, §6.2]
- WAR-083 While an army has no food, each week the warfare system shall make 5 % of its men desert (levies first, then hired, then retinues, standing regiments last), kill 2 % of men, eat 1 in 10 horses, and make it fight at −20 % strength and −10 % break point. [warfare §6.4]
- WAR-084 Each month, the warfare system shall lose men to the ground's sickness (low 0.5 %, medium 1 %, high 3 %, heat or cold 2 %, cold only in winter), plus the fever land rate for men not born on that ground, cut by 10 % per Logistics point, and count the sick for the player. [warfare §6.5]
- WAR-085 When an army stops for the winter in a province with a town, the warfare system shall quarter it: it eats 1 ration a man from that province's store and drills, and the province gains *Soldiers quartered* after a season; a province with a no-quartering charter shall refuse. [warfare §6.6]
- WAR-086 While it is winter, the warfare system shall feed armies in the field 2.5 rations a man. [warfare §6.6]
- WAR-087 When the player orders *Burn the fields* in a province of their own, the warfare system shall burn all its food tiles, move the local store to the nearest castle or destroy it, and give the province *Burned homes* and *Hungry*. [warfare §9.3]
- WAR-088 Where the realm knows W10, the warfare system shall let magazines be built in occupied provinces where the army refills its reserve as if at home. [warfare §12]

### 5.9 Battle: setting

- WAR-089 When the day loop brings two hostile armies into the same province, the warfare system shall start a battle unless one withdraws first; an army may slip away before battle if its commander's Cunning is higher than the enemy's and it isn't trapped. [warfare §7.1; troop-movement §6.1; X-1]
- WAR-090 The warfare system shall run a battle day as 6 bells and end a battle after at most 3 days (eras I–V), when the attacker pulls back. [warfare §7.1; eras §2]
- WAR-091 The warfare system shall build the battlefield from up to 7 sectors, the middle 7 tiles of the province's tile row (all of them if fewer), each sector with its room and effects (sector table), and put each army's camp (wagons, food reserve, wounded, unplaced guns) behind it. [warfare §7.2]
- WAR-092 The warfare system shall apply the province's ground on top of the sectors: foot, horse and guns modifiers, the defender bonus, and +10 % for locals in rough country. [warfare §7.2; province §3.1]
- WAR-093 The warfare system shall stand men beyond a sector's room behind it as depth, and at the end of every bell move depth forward to fill the room. [warfare §7.2]
- WAR-094 The warfare system shall decide a battle from the commander's style and skills, the troop types and levels, the realm's inventions, and the place (tiles, ground, food, content), with no dice and no player orders during it. [warfare §7, §17]

### 5.10 Battle: roles, levels, approaches, skills

- WAR-095 The warfare system shall give each arm its roles and apply each role: Line holds and fights hand to hand; Brace reverses a charge into it (chargers take double, deal half) but takes ×1.5 from shooting; Shock doubles hits in the first bell it meets an enemy and again after a bell out of contact, only in open sectors; Shot shoots before the lines meet and every bell after while it has ammunition; Light can step back a sector without counting as fleeing and shoot again, and scouts; Heavy halves arrows and spears against it (not hand guns or later shot); Guns shoot into their own and the neighbouring sectors and have no melee. [warfare §7.3]
- WAR-096 When a war elephant company's sector loses a bell badly, the warfare system shall make the elephants panic and trample their own side for −10 % of its men. [warfare §7.3]
- WAR-097 The warfare system shall read each company's level 1 to 5 from its drill and scars by the realm's era (eras §4), and apply era I–II effects: Raw −10 % hits and can't fall back without breaking; Drilled can fall back a sector on orders, Light can step back; Seasoned +10 % hits, +5 % break point, can shift to a neighbouring sector within one bell; Veteran +20 % hits, +10 % break point, Line counts as half Brace; Elite +30 % hits, +15 % break point and one free order of its own each bell. [warfare §7.4]
- WAR-098 The warfare system shall make level thresholds (era I–II): Drilled at 3 months of drill, Seasoned at 6 months and 1 scar, Veteran at 3 scars, Elite at 5 scars and 12 months of drill; other eras use their own drill months from the eras table (era I 2/4/8) with the same scars, and drill is capped at 24 months. [warfare §7.4; eras §4; D-WAR-9]
- WAR-099 The warfare system shall drop a company's level when new men dilute it, after 5 years without a battle, when hungry, and all at once when disbanded; standing regiments (W12) shall never drop below level 2. [warfare §7.4, §7.10]
- WAR-100 The warfare system shall give every commander a style that belongs to him (not picked per battle), each using one of eight approaches that sets deployment and the priority of his orders (approach table). [warfare §7.5; styles §1]
- WAR-101 While an Entrenchment commander attacks, the warfare system shall have him fight as Steadfast. [warfare §7.5]
- WAR-102 While an Entrenchment commander defends, the warfare system shall have him spend the first bell digging in; dug-in sectors give the defender +50 % and reverse charges as against Brace. [warfare §7.5]
- WAR-103 While an Assault commander fights, the warfare system shall advance everything in the first bell with no shooting phase for either side, and multiply losses by 1.25 for both sides. [warfare §7.5]
- WAR-104 The warfare system shall place the commander and each captain in one sector chosen by the approach, giving men there +5 % hits and +2 % break point per point of Might (era III–IV values); if that sector is lost, the leader may be wounded, captured or killed. [warfare §7.6]
- WAR-105 The warfare system shall give a commander 1 order per bell, +1 at Cunning 2 and +1 at Cunning 4 (era III–IV), and have the commander with less Cunning give his orders first. [warfare §7.6]
- WAR-106 The warfare system shall reveal hidden companies to a commander whose Cunning is at least the Ambush commander's. [warfare §7.6, §7.5]
- WAR-107 The warfare system shall let Shot and guns shoot for 3 bells + 1 per Logistics point (+1 with W10) before falling back to the camp for a bell to refill (era III–IV). [warfare §7.6]
- WAR-108 Each bell, the warfare system shall let up to Logistics sectors swap a tired company for a fresh one from depth for free. [warfare §7.6]
- WAR-109 When a company has fought 3 bells in a row, the warfare system shall take 10 % from its hits for each further bell until it is rotated. [warfare §7.6]
- WAR-110 The warfare system shall offer exactly these orders: Commit reserve, Shift (Seasoned or better arrives the same bell), Turn (from a won sector into a neighbour: hits ×1.5, enemy −10 % break point), Drive (from a won sector into the enemy camp: take its wagons and food reserve, free prisoners, spike guns there, enemy army −10 % break point), Fall back (no hits that bell; Raw companies break instead), Rally (half the men who fled from one sector this bell return), Spring (Ambush only: reveal hidden companies, hits ×1.5 that bell, enemy there −10 % break point), Rotate (beyond the free rotation). [warfare §7.6, §7.5]

### 5.11 Battle: the bell, hits, breaking

- WAR-111 The warfare system shall run each bell in order: orders (less Cunning first, then the other, then Elite free orders); shooting; charges; melee; breaking; depth and rotation. [warfare §7.7]
- WAR-112 In the first bell, the warfare system shall allow only shooting, unless an Assault commander advances. [warfare §7.7]
- WAR-113 The warfare system shall compute each company's hits per bell as 4 % (by era) × men in the front × strength per man × roles × level × leader Might in its sector × sector and ground × inventions × tired (−10 % a bell) × hungry (−20 %) × forced march (−10 % on the first day). [warfare §7.8]
- WAR-114 The warfare system shall make each hit take one man out of the line, and split it into fled by the flee share and the rest evenly into killed and wounded. [warfare §7.8]
- WAR-115 The warfare system shall compute the flee share as 50 % − 30 % × the content share, where the content share is the share of people living in calm provinces (0 or 1 grievances). [warfare §7.8]
- WAR-116 The warfare system shall take the content share by kind: levies and standing regiments from their home provinces; retinues from the lord's lands (half for a wavering lord, zero for a disloyal one); hired companies always 30 % flee share +10 % per month of pay owed; garrisons from their home provinces, fully content defending their own province's castle; rebel bands 50 % flee share. [warfare §7.8]
- WAR-117 The warfare system shall count fled men toward the break point like any loss. [warfare §7.8]
- WAR-118 When a company's losses (killed, wounded, fled) pass its break point, the warfare system shall remove it from the line and count it as fled for the pursuit. [warfare §7.9]
- WAR-119 When no company of one side stands in a sector, the warfare system shall count the sector as lost by that side and won by the other, whose companies may Turn or Drive next bell. [warfare §7.7, §7.9]
- WAR-120 The warfare system shall break an army when it has lost more than half the sectors it started in, or its total losses pass its men-weighted average break point, or its camp is taken by Drive and it has lost at least a third of its sectors. [warfare §7.9]
- WAR-121 If both armies break in the same bell, then the warfare system shall break only the one further past. [warfare §7.9]

### 5.12 Inventions in battle

- WAR-122 The warfare system shall apply W inventions in battle: W1 horse archers and +1 order per bell for Skirmish-approach commanders with horse archers; W2 knights and Breakthrough charges ×2.5 instead of ×2; W3 bombards (5 per gun in the field), enabling Bombardment commanders; W4 dug sectors of Entrenchment commanders also block Turn and Drive; W5 hand gunners and Shot ignores Heavy; W6 pikes; W7 pike and shot, Brace mixed with its own shot no longer takes ×1.5 from shooting; W8 field guns reach neighbouring sectors and Bombardment hits ×1.5; W9 Shot hits ×1.5 in the first bell of each day; W10 +1 bell of ammunition; W11 line infantry, every foot company becomes Brace, pikes obsolete; W12 standing regiments never below level 2; W13 guns can Shift with the line and Bombardment keeps the line back only 1 bell; W14 +1 order per bell for every commander; W16/W17 riflemen, hits 5 % then 6 % of the front per bell; W19 shooting from dug-in sectors ×2 and charges into them always fail; W20 Ambush companies can shoot from woods without being spotted; W21 tanks, a Shock arm that ignores dug-in sectors and machine guns; W22 every commander sees hidden companies and aircraft hit any sector or camp; W23 +1 order per bell and captains give orders in their own sector. Each invention's era is the research tree's. [warfare §7.10; D-WAR-11]

### 5.13 Night, aftermath, prisoners

- WAR-123 When 6 bells pass without an army breaking, the warfare system shall bring night: either side may withdraw by its standing orders; the withdrawal is clean if its commander's Cunning is at least the enemy's, otherwise it counts as breaking with half the pursuit. [warfare §7.11]
- WAR-124 Overnight, the warfare system shall return fled men who will come back to their companies and refill ammunition. [warfare §7.11]
- WAR-125 After a battle, the warfare system shall return two thirds of the field-holder's wounded after 5 weeks if the army is fed (the rest die), and make the broken side's wounded the winner's prisoners. [warfare §7.12]
- WAR-126 After a battle, the warfare system shall return half of the field-holder's fled men within 2 weeks and send half home to recruits; of the broken side's fled, half return if the army reaches a friendly castle and half go home. [warfare §7.12]
- WAR-127 After a battle, the warfare system shall let the field-holder's Shock and Light companies that didn't break pursue: 1 in 4 of their men catches one fleeing man, killed or taken prisoner. [warfare §7.12]
- WAR-128 After a battle, the warfare system shall give the field-holder the arms of the loser's killed and wounded, and half the loser's wagons and food reserve (all if the camp was taken). [warfare §7.12]
- WAR-129 After a battle, the warfare system shall give each captain and the commander of the broken side a 1 in 10 chance of capture (more if pursued). [warfare §7.12]
- WAR-130 After a battle, the warfare system shall add a victory to the winning commander and country and a defeat to the loser's, and award scars (WAR-006); companies that broke gain none. [warfare §7.12]
- WAR-131 The warfare system shall count all killed into Fallen. [warfare §7.12]
- WAR-132 The warfare system shall let prisoners be ransomed (gold from their ruler by rank), exchanged, released (they go home, a gift that wins goodwill), enlisted (as a hired company at level 1), or held (they eat). [warfare §7.12]
- WAR-133 Where a realm has capture warfare (Mesoamerica and some forest-zone realms at the start), the warfare system shall take half of the enemy's killed as prisoners instead. [warfare §7.12]

### 5.14 Standing orders and the battle report

- WAR-134 The warfare system shall give each army standing orders that apply to every battle: retreat if outnumbered 2 to 1, 3 to 2, or never (checked before the battle and each night); attack or wait. [warfare §7.14]
- WAR-135 The warfare system shall fight every running battle one round per step, in the order the battles started, with each result ready before its report shows. [warfare §7.15, §16; X-1]
- WAR-136 While a battle the player's army or fleet is in is running, the warfare system shall fight it one round (one bell) per 4-hour step of the day loop, let the player change its standing orders, order a retreat or switch to another running battle at every step, offer no Skip to result, and after it ends show a battle report (who fought, where, the result, the losses and the one-line reason) that can be replayed later. [warfare §7.15; X-1; D-WAR-2]
- WAR-137 When a battle involves no player, the warfare system shall fight its six rounds a day at once inside the day loop, never slowing the game, and put its report in the log; other armies may join it at the start of a day. [warfare §7.15; X-1]

### 5.15 Commander styles: origin, adoption, staleness, learning

- WAR-138 The warfare system shall give each country a list of its styles: catalogue styles whose *From* names it or its people and whose inventions it knows. [styles §2.1]
- WAR-139 When a new commander appears, the warfare system shall give him one of his country's styles by origin: a noble or lord the country's horse style if it has one; a risen or hired captain its foot style; an academy graduate the style the academy teaches. A commissioned official takes the academy graduate's style. [styles §2.1; X-7; D-WAR-6]
- WAR-140 The warfare system shall make a hired captain bring his own people's style wherever he serves. [styles §2.1; warfare §7.5]
- WAR-141 If a country has no named style of its own in an era, then the warfare system shall use the nearest one from its region by a config table by culture group. [styles §2.1]
- WAR-142 When a country that knows a style's inventions hires 3 commanders or captains who use it and 5 years pass, or sets an academy to teach it with one teacher who knows it, or loses 3 battles to it within 10 years, or fights beside an ally using it in 3 battles, or takes the capital of a country that uses it, the warfare system shall add the style to its list as adopted. [styles §2.2]
- WAR-143 The warfare system shall make an adopted style work as at home, except that a commander learning it has its special rule at half strength for his first battle. [styles §2.2]
- WAR-144 While a commander's style is stale against the enemy (the enemy has the listed inventions or styles), the warfare system shall remove his special rule and one order per bell, and say why in the battle report. [styles §2.3]
- WAR-145 The warfare system shall let a commander know one style, and a second at 10 victories, and learn a newer style of his country's list 3 years after it enters the list if he served in that time, at once by graduating from an academy that teaches it, or at once after losing a battle to it. [styles §2.4; warfare §7.5]
- WAR-146 The warfare system shall apply each style's special rule as in the style catalogue (§4). [styles §3]

### 5.16 Warfare through the eras

- WAR-147 The warfare system shall fight each realm by the inventions it knows (W, B, S), with no world clock, so armies of different eras can meet on one field. [eras intro]
- WAR-148 The warfare system shall scale battles by era: eras I–IV a bell is 2 hours, longest battle 3 days, room as in the sector table, hits 4 %; era V the same with 5 % at W16 and 6 % at W17; era VI a bell is half a day, longest battle 10 days, room halved, hits 6 % (8 % with W19); era VII a bell is a day, longest battle 30 days, room a quarter, hits 8 %. A battle longer than 3 days keeps its armies in the battle and carries over into the next month. [eras §2; D-WAR-10]
- WAR-149 While an enemy knows the invention that made an arm obsolete, the warfare system shall have that arm fight at half strength against him. [eras §3]
- WAR-150 When a realm learns the invention that makes one of its arms obsolete, the warfare system shall no longer let it raise that arm. [eras §3]
- WAR-151 When a company re-arms to a new arm, the warfare system shall take its loads of arms and powder and drop it one level. [eras §3]
- WAR-152 The warfare system shall use the era's drill months and level bonuses: I 2/4/8, −10/0/+10/+20/+30, +5/+10/+15; II 3/6/12, same bonuses; III 4/8/12, −15/0/+15/+25/+35, +5/+10/+15; IV 6/12/18, −20/0/+15/+30/+45, +5/+10/+20; V 3/6/18, −15/0/+15/+25/+40, +5/+10/+20; VI 6/12/24, −25/0/+20/+35/+50, +10/+15/+20; VII 6/12/24, −30/0/+25/+45/+70, +10/+15/+25 (drill months for Drilled/Seasoned/Elite; hits at levels 1–5; break point at levels 3–5). [eras §4]
- WAR-153 The warfare system shall apply the era notes on levels: era I knights and men-at-arms start at level 3 and levies can't pass level 3 without becoming standing troops; era II pike and shot below level 2 fight as levy foot; era III musketeers below level 2 shoot at half with W9; era IV linear tactics need level 2 to change sector in a bell; era VI a realm with W18 can call up former soldiers at level 2 (reservists); era VII level 4 and 5 companies can infiltrate (*Stoßtrupptaktik*). [eras §4]
- WAR-154 When a realm learns an invention that changes a company's arm or role, the warfare system shall drop that company one level until it has drilled the new era's Drilled months. [eras §4]
- WAR-155 The warfare system shall apply Might by era: I +8 % hits and +3 % break point per point in his sector, with a 1 in 5 chance of wound, capture or death if his sector is lost; II +7 % and +3 %; III–IV +5 % and +2 %; V +4 % and +2 % with a 1 in 10 risk; VI no sector, +3 % hits and +1 % break point to the whole army per point, at risk only if the camp is taken; VII +2 % and +1 % for the army and +10 % per point to Drive orders. [eras §6]
- WAR-156 The warfare system shall apply Cunning by era as orders at Cunning 0–1 / 2–3 / 4–5: I 1/2/2 with orders to other sectors arriving next bell; II 1/2/3 with orders to sectors 3+ away arriving next bell; III–IV 1/2/3 all the same bell; V 1/2/3, +1 with W14; VI 2/2/3, captains give their own orders; VII 2/3/4, +1 with W23. [eras §6]
- WAR-157 The warfare system shall apply Logistics by era: I bows 4 bells + Logistics; II Shot 3 + Logistics; III–IV 3 + Logistics with rotation; V Shot and guns 2 + Logistics, guns needing powder wagons in the camp; VI ammunition 1 + Logistics, each bell without ammunition a company fights at half, rotation up to Logistics × 2 sectors; VII ammunition and fuel (tanks and Air need fuel from the camp, 1 bell + Logistics, then stop), losses replaced from depth at 10 % per point per bell. [eras §6]
- WAR-158 The warfare system shall grow skills by era: I–II as in WAR-050 to WAR-055; III–V also +1 Might and Cunning from academy training, +1 Cunning from serving as a captain under a Cunning 4+ commander, and Logistics from years as a steward or warden; VI–VII Might mostly from academy and staff college with victories giving +1 only every 4, Cunning +1 from staff college and from wargames (a peacetime year of training, once per era), Logistics +1 from staff college and +1 per year commanding a standing army in peace (up to 3). The staff college is the academy of eras VI–VII. [eras §6; D-WAR-13]

### 5.17 Sieges

- WAR-159 The warfare system shall give each castle its walls bonus, shot per breach, months of mining per breach and garrison room (castle table), +25 % walls bonus on hills and +50 % on mountains, its castle store and its siege reserve. [warfare §8.1]
- WAR-160 When an army in an enemy province with a garrisoned castle is ordered to besiege, the warfare system shall start a siege; if the castle has no garrison, it shall fall at once. [warfare §8.2]
- WAR-161 While besiegers number at least 3 men per garrison man (config), the warfare system shall count the castle closed: no food or men reach it; otherwise it can be fed by road from its own side, and by sea if it stands on a shore tile and the sea isn't blockaded. [warfare §8.2]
- WAR-162 Each month of a siege, the warfare system shall have the garrison eat 1 ration a man from the castle store, and the castle tile's townsfolk too unless the commander drives them out (adding refugees and *Burned homes* next door). [warfare §8.3]
- WAR-163 Each month of a siege, the warfare system shall have the besiegers eat from their own supply. [warfare §8.3]
- WAR-164 Each month of a siege, the warfare system shall add shot (each bombard 2, each field gun 1, later siege guns more by config; ×1.5 with B7), or without guns add mining months, and open a breach for each castle's shot per breach or mining months; Siege master breaches 25 % faster and Logistics digs 10 % faster per point. [warfare §8.3, §4.2, §4.3, §12]
- WAR-165 When the garrison has a warden or 200 spare men, the warfare system shall repair one breach a month. [warfare §8.3]
- WAR-166 Once a month, the warfare system shall let the garrison sally with a third of its men: a one-bell battle against the siege camp. [warfare §8.3]
- WAR-167 When the castle store is empty, the warfare system shall make the garrison lose 10 % a month to hunger and desertion and drop its break point 10 %. [warfare §8.3]
- WAR-168 After 3 months of siege, the warfare system shall double the besiegers' sickness. [warfare §8.3, §6.5]
- WAR-169 When a castle has at least one breach, or is an earthwork ring fort (scaling at double losses), the warfare system shall let the besieger storm: up to 6 bells on one sector (the breach, room 500 per breach), the garrison getting the walls bonus less a third per breach, stormers' losses ×1.5. [warfare §8.4]
- WAR-170 The warfare system shall end a siege by honours of war (garrison marches out with arms to the nearest friendly castle, castle taken whole; terms kept build trust, breaking them is an oath broken), surrender (garrison become prisoners), storm (garrison killed or taken; besieger chooses Spare, Plunder or Raze), relief (a castle-side army wins against the besiegers; the garrison joins as a reserve with +10 % strength), or lifting (the besiegers leave). [warfare §8.5]
- WAR-171 When a stormed castle is plundered, the warfare system shall give gold equal to a year of the province's tax owed, burn 1 in 3 town buildings, kill or drive off 10 % of townsfolk, and add *Burned homes*; when it is razed, it shall destroy the castle. [warfare §8.5; province §11]
- WAR-172 The warfare system shall have an AI garrison accept honours when it has a breach or under a month of food and no relief army within 10 days; it shall never accept terms from a Cruel commander. [warfare §8.5]
- WAR-173 The warfare system shall let a besieger bribe the garrison's captain only when its pay is owed 2 months or more, the castle belongs to a disloyal or wavering lord, or the captain's tongue differs from his ruler's; a Greedy commander inside takes it; a Greedy commander outside pockets a tenth. [warfare §8.6]
- WAR-174 When an army takes a castle, the warfare system shall give it the castle store and the province's food spread (castle as food hub). [warfare §8.7, §6.3]

### 5.18 Occupation and raids

- WAR-175 When an army takes a province's castle, or holds a province with no castle for a season, the warfare system shall mark the province occupied: the occupier gets its tax, recruits, food and trade, and its lord wavers toward the side holding his land. [warfare §9.1]
- WAR-220 When armies of more than one realm besiege or hold the same province, the warfare system shall give it to the realm that began the siege or the hold, not to the strongest; the strongest takes over only when several arrive on the same day or the first realm's armies leave. How the player uses it: the dispatch "X lays siege to Y" names who will take the province, and the province's siege view (F-32) shows the same realm as the besieger. [F-45]
- WAR-176 While an army is a horse-only army with orders Raid, the warfare system shall not let it besiege or occupy; each week in a province it burns one tile and takes loot (gold from market and town, herds and horses from pasture) up to 1 load per 50 riders, then moves on; castles there may sally. [warfare §9.2, §5.1]

### 5.19 War state and peace

- WAR-177 The warfare system shall show each war's aim to everyone, and use it to decide which lords come (Want) and peace voices. [warfare §10.1; diplomacy §7.2]
- WAR-178 When a war is fought with no fitting aim, the warfare system shall count Lands taken for every province taken in it, make the realm's lords who aren't Warlike waver, and not oblige allies to join. [warfare §10.1; diplomacy §7.1]
- WAR-179 When a realm breaks a truce, the warfare system shall count an oath broken and make every lord waver one step. [warfare §10.1]
- WAR-180 The warfare system shall give each side peace voices: each lord one per province he holds (peace when any of his provinces is occupied, his retinue has lost half its men, he is wavering or disloyal, or his lands are hungry; war when he is Warlike, the aim is his Want, or he is loyal and his side has more victories in this war); each royal province one (peace with 2 or more of *Conscription*, *Soldiers quartered*, *Burned homes*, *Hungry*, *Heavy taxes*, or when occupied; otherwise no voice); the capital a third of all voices (peace when occupied or besieged); a Warlike ruler ignores a quarter of the peace voices; a child ruler's regent counts as a lord. [warfare §10.3]
- WAR-181 While over half the peace voices say peace, the warfare system shall oblige the ruler to accept a peace asking only for provinces the enemy occupies and gold up to the treasury; a player who refuses shall lose a step of loyalty from every lord each season and levies shall desert twice as fast. [warfare §10.3]
- WAR-182 While over three quarters say peace, the warfare system shall also oblige the ruler to accept tribute, a pretender, or becoming a subject. [warfare §10.3]
- WAR-183 The warfare system shall let the AI make and accept peace by the same counts. [warfare §10.3]
- WAR-184 The warfare system shall check peace terms' war-state preconditions: Cede a province only for a province the asker occupies (or a swap); Pay gold up to the treasury or as debt; Tribute (yearly gold or grain up to 20 years) only with over three quarters peace voices or as overlord; Seat a pretender only with their capital occupied; Become a subject only with over three quarters peace voices; Demolish a castle names a castle in a province they keep; Open the roads means no tolls for 10 years; Give back occupied provinces, ransom or exchange prisoners, a marriage and white peace by either side; Renounce a claim by a pretender. [warfare §10.4; diplomacy §8]
- WAR-185 When one side has no soldiers and no castles left, the warfare system shall end the war with the winner taking all it occupies. [warfare §10.5]
- WAR-186 When a Raid war reaches 12 months, the warfare system shall end it by itself; during it only raids, no occupation. [warfare §10.1, §10.5]
- WAR-187 When the ruler on one side dies with no heir and the lords fall into a succession war, the warfare system shall end the foreign war as a white peace unless the enemy backs a claimant. [warfare §10.5]
- WAR-188 When a peace is signed, the warfare system shall end the war and apply the truce length set by diplomacy (5 years, +5 if provinces moved or a subject was made). [warfare §10.4, §10.5; diplomacy §8]
- WAR-189 The warfare system shall publish the war-aim effects table: Take land → those provinces; Seat a pretender → their ruler replaced, realm your ally or subject; Tribute → yearly gold or grain; Free a people → a new country released; Break a subject → it becomes independent; Defend the faith → a faith tolerance charter there, or the province; Punish → gold and a humbled ruler; Raid → ends after 12 months, raids only. [warfare §10.1; diplomacy §7.1]

### 5.20 Inventions outside battle

- WAR-190 The warfare system shall apply B inventions: B1 stone castles and B4 earthwork ring forts as castle types; B5 bastion and B6 star forts as castle types against which bombards are nearly useless; B7 siege parallels shot and mining ×1.5; B2 roads, B9 turnpikes and railways as road factors (troop-movement). [warfare §12]
- WAR-191 Where the realm knows W14, the warfare system shall let armies split and join in a day (troop-movement owns the timing). [warfare §12; troop-movement §3.3]
- WAR-192 Where the realm knows W15, the warfare system shall let levies serve 12 months before going home (and recruiting raises its shares). [warfare §12; recruiting §2.5]
- WAR-193 Where the realm knows W22, the warfare system shall let its scouts see 4 provinces and let it bomb castles (shot) and wagons. [warfare §12]

### 5.21 AI

- WAR-194 The warfare system shall set an AI country's standing orders from its catalogue risk tolerance (low: wait, retreat at 1 to 1; medium: attack, retreat at 3 to 2; high: attack, retreat at 2 to 1) and its commanders' starting styles from the era's styles of its culture group. [warfare §15; D-WAR-14]
- WAR-195 The warfare system shall have the AI choose which kinds it raises (for example Castile noble retinues and frontier light horse; a city republic hired companies) and whether it besieges or raids, from its personality. [warfare §15] A high-risk AI raids with horse-only armies; the others besiege. [D-WAR-14]
- WAR-196 The warfare system shall set the share of peace voices an AI needs before it makes peace from its risk tolerance (a low-risk AI offers peace at a third; a hegemon seeker only when forced). [warfare §15]
- WAR-197 The warfare system shall give the AI only the forage limits, food reserves and peace voices the player sees; it shall not cheat on food. [warfare §15]

### 5.22 Speed and configuration

- WAR-198 The warfare system shall update sieges and supply once a month. [warfare §16]
- WAR-199 The warfare system shall keep all rates (strength per man, hits per bell, break points, roles, levels, styles and their order priorities, invention bonuses, the flee share formula, castle table, rations, sickness, pay) in one warfare config file. [warfare §16, intro]
- WAR-204 The warfare system shall give no national bonus card: how different peoples fight (steppe horse, Swiss pikes, wagon forts, feudal retinues, guns behind carts, forest ambush, highland narrow fields, island fleets, city republics' hired companies, South and Southeast Asian elephants) shall fall out of styles, troop types and ground alone. [warfare §13]
- WAR-205 When a side orders a retreat during a running battle, the warfare system shall end the battle at the start of the next round with that side withdrawing, cleanly if its commander's Cunning is at least the enemy's, otherwise counted as breaking with half the pursuit. [X-1; WAR-123]
- WAR-206 When an army marches into a province where a battle is running, the warfare system shall add its companies to the reserve of the side it is allied with from the next round (at any step for a player battle, at the start of a day for an AI battle). [X-1]
- WAR-200 The warfare system shall not use a morale bar, discipline, combat width, dice, leader pips, manpower, force limit, attrition percentage, fort zone of control, siege dice, casus belli, war score, war exhaustion or aggressive expansion. [warfare §17]

### 5.23 Presentation (owned by map-presentation; listed so nothing is lost)

- WAR-201 The warfare system shall publish for the army card: name, owner, place, destination, commander and skills, captains, men by foot/horse/guns, companies by kind and levels, food days and reserve size, pay and months owed, break point and flee share, orders, sick and wounded; every line opens its gain and lose list. [warfare §1]
- WAR-202 The warfare system shall publish the battle as a playback: tile row, companies as blocks with level chevrons, camps, and a one-line commander action per bell ("Dunois commits his knights to the pastures"). [warfare §7.15]
- WAR-203 The warfare system shall raise notifications for battle won or lost (with the one-line reason), a breach, terms offered, peace voices passing half, pay owed and an army hungry. [warfare §14]

### Playtest feedback (17 October 2026)
Leroy's playtest feedback (DECISIONS.md, F-1 to F-22). It is the latest decision, so it replaces the requirements it names.

- WAR-207 The warfare system shall fight every battle one round per 4-hour step (X-1) and publish after each round each side's men, morale and losses so far; no battle is resolved in one go. [F-8; X-1]
- WAR-208 The warfare system shall publish each siege's progress (days held, breaches, garrison left, food left in the castle) whenever it changes, for the map and the siege view. [F-9]
- WAR-209 The warfare system shall never let an army exist without a commander: soldiers with no commander are their province's garrison troops (recruiting RECR-107), not an army. If an army loses its commander and no captain can take over, then it shall halt; in its own realm's land it becomes the garrison troops of the province it stands in, and abroad it waits there until a commander joins it. [F-13]
- WAR-210 When a contract with a free company is signed, the warfare system shall take the gold up front and have the company arrive at the realm's capital after the days it needs to march there from where it gathers, shown on the hire screen; until it arrives it is not on the map and cannot fight. While the capital is besieged or occupied, no company can be hired. [F-19; playtest feedback]
- WAR-212 The warfare system shall give levies no service term: a levy company, trained or not, never goes home on its own and stays until its realm disbands it or leaves it as a garrison; lords' retinues and hired companies keep their own rules. [F-23]
- WAR-211 The warfare system shall have every hired company led by its own captain as the commander of its own army, who leaves with the company when the contract ends; a hired company never takes one of the realm's commanders. [F-19]
- WAR-213 The warfare system shall offer free companies of the age's groups, each gathered where its group historically gathered, with a random size between the age's smallest and largest company (300 to 3,000 men, config) and a random mix of arms within its group's ranges; about six are for hire at once, some move on each month and new ones gather, and a realm may hire those that reach its capital within 16 weeks. A hired company arrives with exactly the men and arms it was offered with. [F-53; replaces the fixed 1,000-man company of milestone 2]

#### How the player uses it: free companies
- WAR-214 Where: the player opens their country card's Military tab and taps its Free companies button, which opens the companies' page with a Back to Military button (no tab of its own, feedback 114); each company for hire is a card with a Hire button, which is greyed with the reason when the capital is besieged or the treasury is short. [F-52; X-19]
- WAR-215 Grouping: the page holds everything about free companies and nothing else: "Your companies" (in service, with a Command button, and on the way, with the weeks left) above "For hire". Each card shows the company's name and group, a bar of its arms with the men of each, its men and captain, the weeks to the capital and its pay a month. [F-52; X-19]
- WAR-216 Overview: the top of the page gives the companies in service, their men and their pay a month; the Military tab keeps one line ("Free companies: 2 in service, 1 on the way, 5 for hire") that opens the companies' page, and the Military tab stays lit while it is open. [F-52; F-114; X-19]
- WAR-217 Phone: in landscape the cards are one column across the panel, the Hire and Command buttons are at least 44 × 44 points, the tabs wrap rather than scroll, and nothing needs hover. [F-52; X-19]

### 5.24 The price of war (X-21, Leroy 18 Oct)
Leroy, 18 October: war has too few downsides and feels overpowered; it should be balanced through diplomacy. These
rules are the latest decision and replace what they name; the balance model (BAL-014 to BAL-017) checks them.

- WAR-221 The warfare system shall count each side's peace voices in the game by WAR-180, from lords, royal provinces and the capital, in place of the stand-in share of people occupied, and shall apply WAR-181 and WAR-182 to player and AI alike: an obliged ruler who refuses loses a step of loyalty from every lord each season, and levies desert twice as fast. [X-21; WAR-180 to WAR-182]
- WAR-222 The warfare system shall apply WAR-178 (a war with no fitting aim makes lords who aren't Warlike waver) and WAR-179 (breaking a truce makes every lord waver a step) in the game. [X-21]
- WAR-223 When a war has lasted `warfare.peace.long_war_years` (2, provisional), every lord of a war leader who isn't Warlike and whose Want is not the war's aim shall say peace with all his voices until the war ends. [X-21]
- WAR-224 While a province is occupied, the warfare system shall give the occupier `warfare.occupation.tax_share` (half, provisional) of its tax and none of its trade; the rest is lost to the war. This replaces the tax and trade part of PROV-184; recruits and food stay as PROV-184 says. [X-21]
- WAR-225 While its realm is at war, a levy company shall be paid from its first month; the three free months (F-23) count only for levies kept while the realm is at peace. [X-21; F-23]
- WAR-226 Men killed in battle, in a siege or a storm, or dead of hunger or sickness shall be taken from the people of the province and class they were levied from, besides counting in *Fallen from here* (X-7), so a war lowers that province's people, tax and recruits for years. [X-21; X-7]
- WAR-227 A peace shall cede at most `warfare.peace.max_ceded_share` (a third, provisional, rounded up) of the loser's provinces, chosen by the asker among those it occupies, and the loser's capital only when it is the loser's last province; a realm is taken whole only by diplomacy (subjects, unions and folding in, DIPL-224). [X-21]
- WAR-228 The AI shall declare war only when all of these hold: its side's strength, with the allies that would answer its calls, beats the target's side, with the target's allies, pledgers and every league member against the AI, by `warfare.ai.declare_strength_ratio`; its treasury covers `warfare.ai.war_chest_months` (6, provisional) of the pay its armies would draw at war; its own peace voices would not say peace on the day it declares; and its notoriety is under `diplomacy.ai.notoriety_restraint` (50, provisional) unless its personality is Warlike or a hegemon seeker. [X-21; WAR-196; DIPL-174]

#### How the player uses it: the price of war
- WAR-229 Where: Declare war on another realm's Diplomacy tab opens the declare sheet, which shows a *Price of war* block above Confirm: who will be called against you (allies, pledgers, league members, each with soldiers), the neighbours who will hold *Threatened us* and how many, your lords who will waver, a truce you would break, the monthly pay of your armies at war, and the most land one peace can take ("at most 4 of their 11 provinces"). Lines that hurt are marked in red with an icon, and each opens its reason on tap. [X-21; X-19]
- WAR-230 Grouping: everything about a running war sits on its war card in the Diplomacy tab, reached also from the war plaque: the aim, both sides' peace voices as a bar with the half mark, months at war and the long-war mark, provinces occupied each way, and the most one peace can take now. No war fact is spread over other tabs. [X-21; X-19; F-11]
- WAR-231 Overview: the war plaque in the top bar (REALM-205) shows each war's peace voices for your side as a small bar that turns amber past a third and red past half, when a peace becomes obliged; tapping it opens the war card. [X-21; X-19]
- WAR-232 Phone: in landscape the declare sheet is two columns in the Wide layout (price on the left, terms on the right) and one scrolling column in the Tall layout, with Confirm pinned inside the safe area; every line and button is at least 44 points tall, bars carry their number as text so colour is never the only sign, and nothing needs hover. [X-21; X-19]

## 6. Commands

| Command | Who issues it | Preconditions | Result | Events emitted |
|---|---|---|---|---|
| CallLords(lords?) | player / AI | At war or preparing | Lords answer by loyalty (WAR-038) | LordAnswered |
| HireCompany(company, months) | player / AI | Free company offered in reach; under troop cap; gold | Company joins; gold paid | CompanyHired |
| PayArrears(army) | player / AI | Gold | Pay owed cleared | — |
| DisbandCompany(company) | player / AI | — | Men to recruits, arms to store | CompanyDisbanded |
| AppointCommander(army, person) / AppointCaptain | player / AI | Person available | Leads the army / a sector | CommanderAppointed |
| DismissCommander(commander) | player / AI | — | Removed; a lord wavers | CommanderDismissed |
| PromoteFromRanks(company captain) | player | A won battle (one offer each) | New commander | CommanderAppointed |
| SetStandingOrders(army, retreatRatio, attackOrWait, reserveSize) | player / AI | — | Orders stored | — |
| Besiege(army) | player / AI | Enemy garrisoned castle in province | Siege starts | SiegeStarted |
| Storm(siege) | player / AI | A breach, or earthwork ring fort | Storm battle | CastleStormed / StormRepulsed |
| OfferTerms(siege) / AskTerms(siege) | player / AI | Siege running | Honours or surrender if accepted | TermsOffered, CastleSurrendered |
| ChooseSackOutcome(siege, Spare|Plunder|Raze) | player / AI | Castle stormed | Sack applied | CastleSacked / CastleRazed |
| BribeGarrison(siege, gold) | player / AI | Bribe conditions (WAR-173) | Castle handed over | CastleBribed |
| DriveOutTownsfolk(siege) | defending player / AI | Under siege | Townsfolk leave | RefugeesCreated |
| Sally(siege) | defending player / AI | Once a month | One-bell battle | BattleFought |
| SetRaid(army) | player / AI | Horse-only army | Raid mode | — |
| BurnTheFields(province) | player / AI | Own province | Food tiles burned | FieldsBurned |
| DecidePrisoner(prisoner, ransom|exchange|release|enlist|hold) | player / AI | Holds prisoner | As chosen | PrisonerRansomed … |
| WatchBattle / SkipBattle / ReplayBattle(report) | player | Battle report exists | Playback | — |
| SetAcademyStyle(academy, style) | player / AI | Academy; teacher who knows the style | Adoption path | StyleAdopted (later) |
| CommissionWargames(commander) | player / AI | Era VI+; peace | +1 Cunning after a year, once per era | — |
| AcceptPeace(terms) / RefusePeace | player / AI | Offer received (diplomacy) | War ends / loyalty penalties | WarEnded |

Re-arming a company (WAR-151) is ordered through recruiting's retraining. March, Raid speed, Besiege as a march
order, Board, Land and Split/Join are troop-movement commands.

## 7. Domain events

| Event | When | Payload | Consumed by |
|---|---|---|---|
| BattleFought | A battle resolves | province, day, sides, losses (killed, wounded, fled), result, reason | map-presentation, realm (Fallen, victories), events, game-shell (report), troop-movement (broken army retreat), province (town buildings burned) |
| ArmyBroken | An army breaks | army, province | troop-movement (retreat 6.2) |
| CommanderWounded / Killed / Captured | After battle | person | realm (succession), government |
| PrisonersTaken | Battle, surrender, pursuit | count, ranks | realm, diplomacy (ransom terms) |
| SiegeStarted / BreachOpened / TermsOffered | Siege steps | castle, breaches | map-presentation, game-shell notifications |
| CastleTaken (honours, surrender, stormed, bribed) | Castle falls | castle, province, new holder, store | province, troop-movement (road opens), naval (ships in port taken) |
| CastleSacked / CastleRazed | Storm outcome | province, gold, buildings burned, townsfolk lost | province, buildings |
| ProvinceOccupied / ProvinceLiberated | Occupation changes | province, occupier | province, realm, trade, recruiting, diplomacy (peace terms) |
| ProvinceRequisitioned | Army takes local food | province | province (grievance) |
| SoldiersQuartered | Winter quarters a season | province | province |
| TilesBurned | Plunder, raid, scorched earth, town fighting | province, tiles | province, world-map |
| LootTaken | Raid or sack | gold, herds, horses | realm, recruiting (a tenth home on disband) |
| PeaceVoicesChanged / PeaceVoicesPassedHalf / PassedThreeQuarters | Recomputed | war, side, shares | diplomacy, game-shell |
| WarEnded | Peace or other ending | war, ending kind | diplomacy (truce), realm |
| LevyDeserted / CompanyDeserted | Desertion | company, men | recruiting (men home), province |
| FieldsBurned | Burn the fields | province | province |
| StyleAdopted / StyleLearned | Adoption or learning | country / commander, style | map-presentation |
| OathBroken (terms broken, truce broken) | Breaking terms or truce | country | realm, diplomacy |
| LordLoyaltyChanged | Requisition, call, defeat, dismissal | lord, step | realm, government |

## 8. Policies (reactions to other contexts)

- When recruiting delivers levies or a trained regiment, then warfare adds it as a company (levy foot, drill 0;
  trained regiment at drill 3, or 4 from a Marshal's province).
- When recruiting commissions an official, then warfare makes a commander with the given skills, trait and style.
- When troop-movement reports two hostile armies in one province at the end of a day, then warfare runs the
  withdraw check and the battle.
- When troop-movement reports an army entering a province with a hostile garrisoned castle, then warfare offers
  Besiege.
- When diplomacy reports a war declared (aim, sides) or an ally joining, then warfare opens the war and counts
  peace voices; when diplomacy reports a peace signed, warfare ends the war.
- When diplomacy reports a separate peace by an ally, warfare removes the ally's armies from the war.
- When province reports a grievance change, then warfare recomputes the content share and the royal province's voice.
- When research reports an invention learned, then warfare applies its war effects (WAR-122, 147–157, 190–193),
  marks arms obsolete and drops affected companies a level.
- When realm reports a ruler's death with no heir and a succession war, then warfare ends foreign wars (WAR-187).
- When a lord's lands are occupied (from this context) or his loyalty changes (realm), then warfare updates his
  retinue (WAR-040, WAR-018).
- When naval reports an army's ships lost at sea, then warfare removes the army.
- When rebellions forms a rebel band, then warfare treats it as companies of kind Rebel band.

## 9. Each turn and each month

A turn is one week (X-18). The monthly steps below keep their size and run once, at the end of the turn in which a new month begins; yearly steps run in the turn in which 1 January falls.


Read first: provinces (people, officials, grievances, local stores, castle stores, siege reserve), treasury,
research (inventions), realm (lords' loyalty, ruler), diplomacy (wars, truces), troop-movement (where armies
stood each day, contacts).

During the turn (inside troop-movement's day loop): contacts → withdraw check → battle (1 to 3 days, eras I–V),
running battles fought a round per step in the order they started (WAR-135), a player battle in 4-hour steps with
its report (WAR-136); at the end of every turn, the weekly steps: raids burn one tile; armies on forced march lose
levies; hungry armies desert and die; supply: weekly meals and refills.

At the end of the turn in which a new month begins, in order:
1. Pay (WAR-044), pay owed and its effects (WAR-019, WAR-023), over-cap double pay and desertion (WAR-035).
2. Supply: reserve rot, quarters, Requisitioned and Hungry flags (WAR-071–086).
3. Sickness (WAR-084), wounded returning.
4. Sieges: each step of WAR-162–168; terms; AI garrison decision.
5. Occupation by holding a season (WAR-175).
6. Drill +1, months out +1, levy going home (WAR-003, WAR-016), lords going home (WAR-038).
7. Troop cap recompute (WAR-029).
8. Peace voices recompute (WAR-180); peace obligations (WAR-181).
9. Yearly (in the turn in which 1 January falls): arms rust 2 %, powder damp 5 %, scars fade after 5 years without battle, ageing and skill loss,
    victories older than 20 years drop off the country count.
The global order relative to other contexts lives in time-and-turns.

## 10. Configuration

All values are placeholders (warfare §16, eras intro, styles intro). Config file: the single warfare config
file `packages/rules/data/domain/warfare.json` (D-WAR-17).

| Key | Meaning | Value in the design | Placeholder? | Config file |
|---|---|---|---|---|
| warfare.company_size_min / max | Usual company men | 500 / 1,000 | yes | warfare |
| warfare.drill_max | Max drill | 12 | yes | warfare |
| warfare.scars_max | Max scars | 5 | yes | warfare |
| warfare.scar_fade_years | Years without battle per −1 scar | 5 | yes | warfare |
| warfare.arms | Arms table (strength, needs, roles, unlock) | §4 | yes | warfare |
| warfare.guns_march_penalty | Guns slow an army | +25 % per gun (warfare 2.2) / ×1.25 per army (troop-movement, decided) | yes | march (troop-movement) |
| warfare.kinds.<kind>.break_point | Base break point | levy 25 %, retinue 35 %, hired 35 %, standing 30 %, garrison 40 %, rebel 20 % | yes | warfare |
| warfare.kinds.levy.free_months | Free service | 3 | yes | warfare |
| warfare.kinds.levy.go_home_after / rate | Levies going home | dropped (F-23: no service term) | — | warfare |
| warfare.kinds.hired.pay_multiplier | Hired pay | 3 | yes | warfare |
| warfare.kinds.standing.pay_multiplier | Standing pay | 1.5 | yes | warfare |
| warfare.break.homeland / hungry / pay_owed | Break point modifiers | +5 % / −10 % / −5 % a month | yes | warfare |
| warfare.arms_rust / powder_damp | Store losses | 2 % / 5 % a year | yes | warfare |
| warfare.victories_window_years | Country victories window | 20 | yes | warfare |
| warfare.troop_cap.with_official / muster_master / without | Cap shares | 2 % / 3 % / 1 % | yes | warfare |
| warfare.troop_cap.w12 / w15 / w18 | Invention changes | +0.5 % / ×2 / +1 % | yes | warfare |
| warfare.over_cap.pay / desertion | Over cap | ×2 / 5 % a month | yes | warfare |
| warfare.levy_gather_days | Muster time | 2 weeks | yes | warfare (recruiting) |
| warfare.lords.loyal_days / wavering_days / wavering_stay | Lords' summons | 3 weeks / 6 weeks / 6 months; wavering brings half | yes | warfare |
| warfare.free_companies | Named companies by region | Swiss and German foot, Italian condottieri, Scottish and Irish gallowglass, Turkic and Afghan horse, Javanese and Japanese sword bands … | yes | warfare |
| warfare.rations.soldier_campaign / horse / prisoner / winter_field / quarters | Rations | 2 / 3 / 1 / 2.5 / 1 | yes | warfare |
| warfare.logistics.food_cut / sickness_cut / dig_speed | Per Logistics point | 5 % / 10 % / 10 % | yes | warfare |
| warfare.reserve.rot / rot_slow_logistics | Rot | 5 % a month / half at Logistics 3+ | yes | warfare |
| warfare.wagon.rations / horses | Wagon | 1,000 / 2 | yes | warfare |
| warfare.reserve_sizes | Reserve sizes | 1, 2, 3 months | yes | warfare |
| warfare.foraging_rating | Plunder by rating | rich 100 %, fair 60 %, poor 30 %, almost none 10 % | yes | warfare |
| warfare.hunger.desert / die / horses / strength / break | Hunger per week | 5 % / 2 % / 1 in 10 / −20 % / −10 % | yes | warfare |
| warfare.sickness | By ground | low 0.5 %, medium 1 %, high 3 %, heat/cold 2 % | yes | warfare |
| warfare.forced_march | Effects | sickness ×2, levies −2 % a week, −10 % first day | yes | warfare |
| warfare.scouting.riders_per_province | Scout range | 500 riders per province | yes | warfare |
| warfare.rumour_error | Rumour error | up to a third | yes | warfare |
| warfare.battle.bells_per_day / max_days | Bells | 6 / 3 (eras I–V), 10 (VI), 30 (VII) | yes | warfare |
| warfare.battle.max_sectors | Sectors | 7 (3 at sea) | yes | warfare |
| warfare.sectors | Sector table | §4 | yes | warfare |
| warfare.hits_per_bell | Hits share of front | 4 % (I–IV), 5 %/6 % W16/W17, 6 %/8 % W19 (VI), 8 % (VII) | yes | warfare |
| warfare.room_by_era | Room multiplier | 1 (I–V), ½ (VI), ¼ (VII) | yes | warfare |
| warfare.flee.base / content_factor | Flee share | 50 % / 30 % | yes | warfare |
| warfare.flee.hired / per_month_owed / rebel | Flee share | 30 % / +10 % / 50 % | yes | warfare |
| warfare.levels_by_era | Drill months and bonuses | eras §4 table | yes | warfare |
| warfare.might_by_era / cunning_by_era / logistics_by_era | Skills | eras §6 tables | yes | warfare |
| warfare.tired_after_bells / tired_penalty | Tiredness | 3 / −10 % a bell | yes | warfare |
| warfare.approaches | Approach deployments and priorities | §4 | yes | warfare |
| warfare.styles | Style catalogue | §4 | yes | warfare |
| warfare.styles.region_fallback | Nearest style by culture group | e.g. Sahel → Furusiyya, Andes → Three battles until contact | yes | warfare |
| warfare.adoption.officers / years / lessons / lessons_years / alliance_battles | Adoption | 3 / 5 / 3 / 10 / 3 | yes | warfare |
| warfare.style_learn_years | Learning delay | 3 | yes | warfare |
| warfare.traits | Trait effects | §5.6 | yes | warfare |
| warfare.wound_chance.lost / won | Wounds | 1 in 10 / 1 in 20 | yes | warfare |
| warfare.death_chance.loser | Death in battle | 1 in 20 | yes | warfare |
| warfare.capture_chance | Leader capture | 1 in 10 | yes | warfare |
| warfare.might_victories_per_point | Might growth | 2 | yes | warfare |
| warfare.age.might_from / cunning_from / step_years | Ageing | 60 / 65 / 5 | yes | warfare |
| warfare.second_trait_victories / second_style_victories | Second trait/style | 10 / 10 | yes | warfare |
| warfare.their_man.victories / years | Generals grow too big | 8 / 5 | yes | warfare |
| warfare.captain_learns_style_wins | Captain learns style | 3 | yes | warfare |
| warfare.after.wounded_return / weeks | Wounded | two thirds / 5 weeks | yes | warfare |
| warfare.after.fled_return / weeks | Fled | half / 2 weeks | yes | warfare |
| warfare.after.pursuit | Catch rate | 1 in 4 | yes | warfare |
| warfare.after.camp_share | Camp taken | half (all if camp taken) | yes | warfare |
| warfare.prisoner_enlist_level | Enlisted prisoners | level 1 | yes | warfare |
| warfare.capture_warfare_realms | Capture warfare | Mesoamerica and some forest-zone realms | yes | warfare |
| warfare.castles | Castle table | §4 | yes | warfare |
| warfare.castles.hills / mountains | Walls bonus | +25 % / +50 % | yes | warfare |
| warfare.siege.close_ratio | Men per garrison man | 3 | yes | warfare |
| warfare.siege.shot_per_month | Shot | bombard 2, field gun 1, later siege guns more | yes | warfare |
| warfare.siege.b7_multiplier | Siege parallels | ×1.5 | yes | warfare |
| warfare.siege.repair_men | Spare men to repair | 200 | yes | warfare |
| warfare.siege.sally_share | Sally | a third | yes | warfare |
| warfare.siege.hunger_loss / hunger_break | Garrison hunger | 10 % / −10 % | yes | warfare |
| warfare.siege.fever_after_months | Camp fever | 3 (×2 sickness) | yes | warfare |
| warfare.storm.room_per_breach / losses / scaling | Storm | 500 / ×1.5 / ×2 | yes | warfare |
| warfare.sack.plunder | Plunder | 1 year tax, 1 in 3 town buildings, 10 % townsfolk | yes | warfare |
| warfare.relief_bonus | Relieved garrison | +10 % | yes | warfare |
| warfare.ai_honours_relief_days | AI garrison | 10 days | yes | warfare |
| warfare.bribe.pay_owed_months | Bribe | 2 | yes | warfare |
| warfare.raid.loot_per_riders | Raid carrying | 1 load per 50 riders | yes | warfare |
| warfare.occupation.hold_season | Season to occupy | a season | yes | warfare |
| warfare.peace.capital_share | Capital voices | a third of all voices | yes | warfare |
| warfare.peace.warlike_ignore | Warlike ruler | a quarter | yes | warfare |
| warfare.peace.half / three_quarters | Thresholds | 50 % / 75 % | yes | warfare |
| warfare.peace.tribute_years / open_roads_years | Terms | 20 / 10 | yes | warfare |
| warfare.raid_war_months | Raid war length | 12 | yes | warfare |
| diplomacy.truce_years | Truce | 5 (+5 if provinces moved or subject made); replaces warfare's 10 | yes | diplomacy |
| warfare.peace.long_war_years | Years before lords who aren't Warlike say peace (WAR-223) | 2 | yes | warfare |
| warfare.occupation.tax_share | Share of an occupied province's tax the occupier gets (WAR-224) | half | yes | warfare |
| warfare.peace.max_ceded_share | Most of the loser's provinces one peace cedes (WAR-227) | a third, rounded up | yes | warfare |
| warfare.ai.war_chest_months | Months of war pay the AI must hold to declare (WAR-228) | 6 | yes | warfare |
| warfare.ai.declare_strength_ratio | How much stronger the AI's side must be to declare (WAR-228; the engine's `war.aiDeclareStrengthRatio`) | 2 | yes | warfare |

## 11. Seams

| Other context | Direction | Pattern | What crosses |
|---|---|---|---|
| troop-movement | downstream (MOVE consumes WAR rules) / upstream (MOVE supplies contacts) | Partnership | WAR → MOVE: march-order effects, scouting range, standing orders, battle start/withdraw rule, forage limit, food reserve, castle garrisoned state, broken army. MOVE → WAR: daily positions, contacts, arrival in castle province, days walked, march order. |
| recruiting | upstream | Customer–Supplier | Levies (levy foot, drill 0), trained regiments (arm, drill 3/4), standing regiments signed on, commissioned officials as commanders (skills, trait, style), retinues trained by lords; WAR returns disbanded men, deserters and Fallen |
| naval | downstream | Published Language | Bell rules (§7) for sea battles on 3 sectors; approaches usable at sea (Breakthrough, Steadfast, Skirmish, Bombardment); commander skills/traits for admirals; prisoners; food reserve aboard; castle capture taking ships in port; blockade cutting sea supply to a castle |
| diplomacy | upstream (aims, declarations, peace offers, truce) / downstream (peace voices, occupation, victories) | Customer–Supplier | DIPL → WAR: war declared with aim, sides, allies joined, separate peace, peace terms signed, truce length. WAR → DIPL: peace voices, occupied provinces, capital occupied, prisoners, Lands taken from no-aim wars, oaths broken (terms, truce) |
| province | upstream / downstream | Customer–Supplier | PROV → WAR: ground table (3.1), tile row, local store, foraging rating, sickness, castle store, grievances (content), people, officials. WAR → PROV: Requisitioned, Hungry, Soldiers quartered, Burned homes, burned tiles, sack effects, occupation, homeless from returning soldiers |
| world-map | upstream | Conformist | Tile row of each province, ground, shore tiles, bridges |
| realm | upstream / downstream | Customer–Supplier | REALM → WAR: treasury, lords and loyalty, ruler/heirs, Food policy siege reserve, academies. WAR → REALM: Fallen, victories/defeats, arms and powder stores, prisoners, troop cap, oaths broken |
| research | upstream | Conformist | W, B (and S) inventions known |
| buildings | upstream | Conformist | Castle types (B1, B4, B5, B6), garrison room, powder mill, forges, drill yard/barracks, magazines |
| rebellions | upstream | Customer–Supplier | Rebel bands formed (kind Rebel band); WAR → REBL battles |
| government | upstream | Conformist | Ruler warlike, regency, succession war |
| subjects | upstream | Conformist | Subject armies joining by kind; "Break a subject", "Become a subject" terms |
| culture | upstream | Conformist | Homeland tongue (+10 % locals, +5 % break point, guerrilla styles), culture group for style fallback, captain's tongue for bribes |
| religion | upstream | Conformist | Persecution flag for *Defend the faith* |
| events | downstream | Published Language | `prestige` ← victories, `war_weariness` ← Fallen and peace voices; events offering the throne to "their man" generals |
| scenario-setup | upstream | Conformist | Risk tolerance for AI standing orders (D-WAR-14); starting styles per country (*From* column), capture warfare realms, starting castles, start inventions |
| map-presentation | downstream | Published Language | Army card fields, banners, food bars, rumours, battle playback, siege view, burned tiles |
| game-shell | downstream | Published Language | Player battles watched in 4-hour steps with standing orders, retreat and switching between battles (X-1, D-WAR-2), battle reports and replay, notifications |
| time-and-turns | upstream | Conformist | Week turn (X-18), monthly steps, day loop (battles on the day of contact, X-1/X-2), weekly army food at the end of every turn (X-18), battle resolution order |
| trade | downstream | Published Language | Occupier takes trade; Open the roads term |

### 11.1 Rules handed to diplomacy (DIPL owns; recorded so nothing is lost)

- Allies called when war is declared on you or when you declare and they agree; v2 replaces "an ally who
  refuses breaks the alliance" with: only a refused **defensive** call breaks it (diplomacy §6.1). [warfare §10.2]
- War aim needs (warfare §10.1) are replaced by diplomacy §7.1 "how you hold each aim". Truce length 10 years
  (warfare §10.4) is replaced by diplomacy §8. An envoy carries the peace and is never held; many-sided peace
  from era III (diplomacy §8).

### 11.2 Rules handed to troop-movement (MOVE owns)

- March orders and speeds: Normal, Forced 1.5×, Careful 0.75×, Raid 1.5× for horse-only armies. [warfare §5.1]
- Days to cross: ground × road factor (track 1, road 0.75, paved 0.5, turnpike 0.4, railway 0.1) × guns ×
  winter (×2 in tundra, mountains, forest); snow peaks close passes December–March without a road; river
  without a bridge +1 day (MOVE scales by army size). [warfare §5.2]
- Guns penalty: warfare says +25 % per gun beyond light field guns in hills, mountains, forest, jungle and
  marsh; troop-movement decided one ×1.25 per army. Bombards can't cross mountains without a road. [warfare §2.2]
- Big armies over the forage limit are slower. Each adds 1 crossing (D-WAR-4, D-MOVE-2). [warfare §5.3]
- An enemy garrisoned castle stops armies in its province: back the way they came or onward once it falls;
  besieging with part of the army doesn't open the road; an ungarrisoned castle doesn't block; allies' castles
  block their enemies; landed armies must take castles to move inland. [warfare §5.5; troop-movement §5.2]
- Retreat of a broken army to a refuge, interception, chasing. [troop-movement §6]

### 11.3 Rules handed to naval (NAVY owns war at sea)

- Ship types by era with fight, carry, crew (seafolk) and notes: galley, cog/junk/dhow, war canoe fleet,
  carrack, armed carrack, galleon, turtle ship, ship of the line; later steamships, ironclads, dreadnoughts,
  submarines, carriers. [warfare §11.1]
- Sea battles by these bell rules on 3 open-water sectors, admirals' styles with Breakthrough, Steadfast,
  Skirmish or Bombardment approaches; matchups (galleys ×1.5 enclosed / ×0.5 ocean; shooting ships ×1.5 first
  bell each day; turtle ships ×1.5 within one zone of home); damage follows naval's rule (D-NAVY-6): a ship that takes
  hits and stays afloat loses one hull step, and hits equal to its strength sink or take it;
  higher-Cunning admiral slips away at night; repairs in harbour (shipyard ×2); soldiers aboard a lost ship
  drown or are captured. [warfare §11.2]
- Fleet orders Blockade, Carry (landing a day per 5,000 men), Hunt, Escort; storms follow naval's rule (D-NAVY-7):
  1 in 20 ships a month at sea in storm season, a struck ship losing one hull step and a wrecked one sinking. [warfare §11.3]
- Naval adds crew share, boarding (on Close order or ram, land bell rules on one sector), prizes, sunk crews,
  pirates and ports at war. [naval §8]

### 11.4 Changes this design asks of other contexts (warfare §18, eras §8, styles §4)

| Target | Change | Adopted? |
|---|---|---|
| realm (country-stats §6) | Link kinds; commanders link; add Arms store, Powder store, Prisoners, Victories/Defeats, Troop cap rows; Food policy *Army supply* no longer fits; Peace voices on the Enemies line; `war_weariness` → Fallen and peace voices, `prestige` → Victories | Held by warfare in the realm's war record and shown read-only (D-WAR-7) |
| province (wares 5.2) | Saltpetre and powder wares; powder mill | Adopted (province, buildings) |
| province (castle 11) | Walls bonus, shot per breach, mining, garrison room; castles block; sack effects | Adopted (linked) |
| province (12.1) | Requisitioned grievance | Adopted |
| rebellions | Rebel band kind and battle rules | Adopted |
| province (6.3) | Fleet crews from seafolk | Owned by naval now |
| world-map / terrain | Steppe +10 % horse, dunes (guns need camels), snow peaks, paddies | Snow peaks, dunes, glacier, paddies adopted by troop-movement; steppe dropped; none of them counts in battle (D-WAR-8) |
| research | Era VIII Helicopters and missiles; staff college school type | Era VIII out of scope; staff college is the academy (D-WAR-13) |
| scenario-setup (catalogue) | Starting styles per country from *From* column | Era styles of the realm's culture group (D-WAR-14) |
| code `types.ts` | `UnitDef` → arm + kind + level; `CommanderDef` gains style, trait, victories, defeats, wounds, age, origin | Not yet (code has might/cunning/logistics only) |

## 12. AI

- Uses the same counts, orders and peace voices as the player (WAR-183, WAR-197).
- Military doctrine and risk tolerance from the catalogue's AI personalities set standing orders, commanders'
  starting styles, which kinds it raises, besiege or raid, and its peace threshold (WAR-194–196).
- AI garrisons accept honours on a breach or under a month of food with no relief within 10 days, never from
  a Cruel commander (WAR-172).
- Recruiting's AI (what to levy and train, which officials to commission) and diplomacy's AI (when to declare,
  demand first) are owned by those contexts.

## 13. Decisions and open questions

Decided on 17 October 2026 (domain/DECISIONS.md). None of warfare's questions is a release task, so none stays open.

- **D-WAR-1** (was OQ-WAR-1) Balancing values: hits per bell 4 %, break points 25–40 %, the flee share formula and the troop cap shares stay as they are and are listed as provisional in `warfare.json` `_provisional`. Balancing tunes data, not rules.
- **D-WAR-2** (was OQ-WAR-2) Battle timing: as X-1 (Leroy, 17 Oct), a battle starts on the day the day loop brings the armies together and is fought over time, one round (one bell) per 4-hour step while the player's army or fleet is in it; the player can change standing orders, retreat (WAR-205) or switch battles at every step, and the result cannot be skipped; other armies can march in and join (WAR-206); AI-only battles fight their six rounds a day at once and never slow the game. X-1 decides it.
- **D-WAR-3** (was OQ-WAR-3) Guns on the march: one ×1.25 for the whole army with any guns beyond light field guns, not 25 % per gun. Troop-movement's decision is the newer one.
- **D-WAR-4** (was OQ-WAR-4) Big armies: an army bigger than the entered province's forage limit adds 1 crossing (6 days), not one day (D-MOVE-2). Troop-movement is newer.
- **D-WAR-5** (was OQ-WAR-5) River in battle: attacking across a river with no bridge costs −20 % once, through the Shore sector; it does not stack with a ground penalty. Province and troop-movement agree on −20 % and one rule is simpler. A river frozen under X-17 (December to March, latitude 55° or more) is crossed like a bridge, so the −20 % does not apply.
- **D-WAR-6** (was OQ-WAR-6) Commander origins: as X-7, commanders are the ruler or an heir, a lord, a hired captain, risen from the ranks, an academy graduate, an exile or a commissioned official, each with §4.4's catch; a commissioned official counts as an academy graduate; a new commander's style follows WAR-139 (by origin); the levy is recruiting's levy-then-train. X-7 decides it.
- **D-WAR-7** (was OQ-WAR-7) War stats: the arms store, powder store, prisoners, victories and defeats, troop cap and peace voices are held by warfare in the realm's war record and shown read-only on the realm card; the food policy is the army's supply order. The context that changes a number holds it.
- **D-WAR-8** (was OQ-WAR-8) Tile terrain in battle: steppe gives no bonus, and dunes and paddies count for movement only (D-MOVE-11); battle terrain is the province's sectors. No new mechanic is added.
- **D-WAR-9** (was OQ-WAR-9) Level thresholds: the main table (Drilled 3, Seasoned 6, Elite 12 months) is era II; each era uses its own row from the eras table (era I 2/4/8); drill is capped at 24 months, the highest Elite threshold; the scar thresholds are the same in every era. The eras table is the later, era-wide rule.
- **D-WAR-10** (was OQ-WAR-10) Long battles: an era VI battle lasts up to 10 days and an era VII battle up to 30, six rounds a day in the day loop; its armies stay in the battle and a battle not over at the turn's last day carries into the next turn; a province still holds one battle at a time, which others join. Troop-movement's 1 to 3 days are the length in eras I–V.
- **D-WAR-11** (was OQ-WAR-11) Invention eras: an invention's era is the research tree's; W20 Smokeless powder lets Ambush companies shoot from woods unseen (warfare 7.10). Research owns the tree and warfare its battle effect.
- **D-WAR-12** (was OQ-WAR-12) Styles after 1939: dropped, as X-14 (Bewegungskrieg, Glubokiy boy, Banzai charge, People's war); Motti and Bataille conduite, seen in 1939, stay. X-14 decides it.
- **D-WAR-13** (was OQ-WAR-13) Staff college: it is the academy of eras VI–VII, with no new school type; a commander who graduates gains +1 Logistics, and a first peacetime year of wargames in an era gives +1 Cunning. It reuses the academy that X-7 already has.
- **D-WAR-14** (was OQ-WAR-14) AI personality: risk tolerance sets the standing orders (low: wait, retreat at 1 to 1; medium: attack, retreat at 3 to 2; high: attack, retreat at 2 to 1), and a high-risk realm raids with horse-only armies while the others besiege; starting styles are the era's styles of the realm's culture group from the style catalogue; peace thresholds stay as WAR-196. The catalogue's level field is the only structured input.
- **D-WAR-15** (was OQ-WAR-15) Break point: by kind, with recruiting's numbers: a levy breaks at 25 % and a trained (standing) regiment at 30 % instead of 40 %, and the level adds its bonus as before; retinues and hired companies keep 35 %. Recruiting v3 is the later design.
- **D-WAR-16** (was OQ-WAR-16) War at sea: naval owns it, the Close order, the ship list and ship damage included (a ship that takes hits and stays afloat loses one hull step; hits equal to its strength sink or take it; storms strike hull steps, D-NAVY-6/7); warfare's eight orders are land orders and warfare keeps no naval damage rule of its own. Naval is the later design and §11.3 hands sea war over.
- **D-WAR-17** (was OQ-WAR-17) Missing amounts: pay is recruiting's pay by group; levy gold is 20 per 1,000 men; a wagon costs 10 gold, a hired company costs its standing pay ×2 a month, a season is 3 months, the config file is `warfare.json`, later siege guns shoot like bombards, ransom is 100 gold for a commander and 25 for a captain, and fever land doubles sickness. All provisional except the ones recruiting decides.
- **D-WAR-18** (was OQ-WAR-18) War aims: diplomacy owns declaring war and choosing the war aim; warfare keeps the war-aim effects table, the peace terms and the war-state preconditions (WAR-184, WAR-189), and diplomacy refers to them. Diplomacy v2 itself says peace "is warfare 10.3 to 10.5".
- **D-WAR-19** (was OQ-WAR-19) Storming an earthwork without a breach: stormers' losses are ×2 instead of ×1.5, not stacked, and the castle's full walls bonus applies. The simpler reading.
- **D-WAR-20** (was OQ-WAR-20) Fuel: there is no fuel ware; tanks and aircraft draw on the powder store; Logistics era VI rotation stays at up to Logistics × 2 sectors. No new store is added.
- **D-WAR-21** (was OQ-WAR-21) Cunning orders: each era uses its own row of the eras table (era I 1/2/2 by Cunning 0–1, 2–3, 4+; eras II–V 1/2/3, the main formula; eras VI–VII as listed), and W14 and W23 each add +1 order in every era once known. The eras table is the later and fuller rule, and one invention rule for every era is the simpler one.

## 14. Traceability

| Requirement | Feature file | Scenario |
|---|---|---|
| WAR-001 | features/companies-and-arms.feature | A company has one kind and one arm and its own counts |
| WAR-002 | features/companies-and-arms.feature | Men join and leave a company |
| WAR-003 | features/companies-and-arms.feature | Drill rises in camp, garrison or winter quarters |
| WAR-004 | features/companies-and-arms.feature | New men dilute drill and scars |
| WAR-005 | features/companies-and-arms.feature | A hungry month costs drill |
| WAR-006 | features/companies-and-arms.feature | Scars from standing through a battle |
| WAR-007 | features/companies-and-arms.feature | Scars fade in a long peace |
| WAR-008 | features/companies-and-arms.feature | Disbanding resets drill |
| WAR-009 | features/companies-and-arms.feature | Loads of arms a company carries |
| WAR-010 | features/companies-and-arms.feature | A company short of arms fights as the next arm down |
| WAR-011 | features/companies-and-arms.feature | Arms have a strength, needs, roles and an unlock |
| WAR-012 | features/companies-and-arms.feature | Elephants and camels are their own troop types; Camel riders are known at start in desert and Sahel realms |
| WAR-013 | features/companies-and-arms.feature | No powder, no guns; Guns take powder from the store |
| WAR-014 | features/companies-and-arms.feature | Later-era arms follow the same table |
| WAR-015 | features/kinds-and-break-points.feature | Each kind has its pay and break point; Standing regiments need W12 |
| WAR-016 | features/kinds-and-break-points.feature | Levies go home after 6 months unless paid double |
| WAR-017 | features/kinds-and-break-points.feature | Levies away at harvest cost the harvest |
| WAR-018 | features/kinds-and-break-points.feature | A wavering lord takes his retinue home mid-war |
| WAR-019 | features/kinds-and-break-points.feature | Unpaid hired companies |
| WAR-020 | features/kinds-and-break-points.feature | Standing regiments keep drill and scars through peace |
| WAR-021 | features/kinds-and-break-points.feature | Garrisons count against their castle's room |
| WAR-022 | features/kinds-and-break-points.feature | Rebel bands fight by the battle rules |
| WAR-023 | features/kinds-and-break-points.feature | Break point modifiers |
| WAR-024 | features/troop-cap-and-soldier-stats.feature | Soldiers include garrisons |
| WAR-025 | features/troop-cap-and-soldier-stats.feature | The arms store |
| WAR-026 | features/troop-cap-and-soldier-stats.feature | The powder store |
| WAR-027 | features/troop-cap-and-soldier-stats.feature | Prisoners eat |
| WAR-028 | features/troop-cap-and-soldier-stats.feature | Victories count over 20 years |
| WAR-029 | features/troop-cap-and-soldier-stats.feature | France's troop cap in 1444; A muster master counts 3 % instead of 2 % |
| WAR-030 | features/kinds-and-break-points.feature | Garrisons count against their castle's room |
| WAR-030 | features/troop-cap-and-soldier-stats.feature | What counts toward the troop cap |
| WAR-031 | features/troop-cap-and-soldier-stats.feature | Occupied and revolting provinces count nothing |
| WAR-032 | features/troop-cap-and-soldier-stats.feature | Inventions raise the troop cap |
| WAR-033 | features/troop-cap-and-soldier-stats.feature | The Duke of Burgundy's own cap |
| WAR-034 | features/troop-cap-and-soldier-stats.feature | Allies count on their own cap |
| WAR-035 | features/troop-cap-and-soldier-stats.feature | Over the cap |
| WAR-036 | features/troop-cap-and-soldier-stats.feature | One army has no size cap |
| WAR-037 | features/raising-and-keeping.feature | Levies arrive from recruiting as levy foot; With railway mobilization the levy gathers in days |
| WAR-038 | features/raising-and-keeping.feature | Lords answer the summons by loyalty |
| WAR-039 | features/raising-and-keeping.feature | A lord whose Want is the war aim comes and stays |
| WAR-040 | features/raising-and-keeping.feature | A lord leaves to defend his occupied lands |
| WAR-041 | features/raising-and-keeping.feature | Free companies are found where they historically gathered |
| WAR-042 | features/raising-and-keeping.feature | Hiring a free company takes no recruits |
| WAR-043 | features/raising-and-keeping.feature | Losing a hired company |
| WAR-044 | features/raising-and-keeping.feature | Who is paid from the treasury |
| WAR-045 | features/raising-and-keeping.feature | An army eats rations by where it stands |
| WAR-046 | features/raising-and-keeping.feature | Disbanded men go home |
| WAR-047 | features/raising-and-keeping.feature | A disbanded standing regiment loses its drill and scars |
| WAR-048 | features/raising-and-keeping.feature | Soldiers home from a long war with no slot become homeless |
| WAR-049 | features/commanders.feature | The commander card of Jean de Dunois |
| WAR-050 | features/commanders.feature | Might grows with victories |
| WAR-051 | features/commanders.feature | Might fades with wounds and age |
| WAR-052 | features/commanders.feature | Cunning grows from outthinking the enemy |
| WAR-053 | features/commanders.feature | Cunning fades |
| WAR-054 | features/commanders.feature | Logistics grows |
| WAR-055 | features/commanders.feature | Logistics fades when an army starves under him; Logistics fades with age past 65 |
| WAR-056 | features/commanders.feature | An academy graduate starts with a bonus and no victories |
| WAR-057 | features/commanders.feature | Wound chances |
| WAR-058 | features/commanders.feature | Trait effects; A Cruel occupier burns homes faster |
| WAR-059 | features/commanders.feature | A second trait at 10 victories |
| WAR-060 | features/commanders.feature | Traits set default standing orders |
| WAR-061 | features/commanders.feature | Where commanders come from; Risen from the ranks is offered once per won battle |
| WAR-062 | features/commanders.feature | Losing commanders; A commander granted land leads only his retinue; A dismissed lord wavers |
| WAR-063 | features/commanders.feature | Captains stand in sectors and learn the style |
| WAR-064 | features/commanders.feature | A general grows too big |
| WAR-065 | features/commanders.feature | Women commanders follow each country's history |
| WAR-066 | features/scouting-and-march-effects.feature | Forced march costs sickness, levies and the first day of battle |
| WAR-067 | features/scouting-and-march-effects.feature | A careful march can't be ambushed |
| WAR-068 | features/scouting-and-march-effects.feature | Where you see enemy armies; Enemy armies in your own provinces and next to your castles are seen |
| WAR-069 | features/scouting-and-march-effects.feature | Armies further away are rumours |
| WAR-070 | features/scouting-and-march-effects.feature | Scouting is worked out only near the player |
| WAR-071 | features/supply.feature | Logistics cuts what an army eats |
| WAR-072 | features/supply.feature | At home an army eats from its castle first, then the locals; At home an army refills only what its reserve is missing; The castle store is used only down to its siege reserve |
| WAR-073 | features/supply.feature | Abroad an army eats its reserve |
| WAR-074 | features/supply.feature | Plunder when the reserve is empty; When the local store is gone the crop burns |
| WAR-075 | features/supply.feature | The reserve grows and shrinks; Good logistics halves rot |
| WAR-076 | features/supply.feature | Wagons limit the reserve |
| WAR-077 | features/supply.feature | Reserve size is a standing order |
| WAR-078 | features/supply.feature | Taking food from the locals makes them Requisitioned |
| WAR-079 | features/supply.feature | A lord resents an army eating his grain |
| WAR-080 | features/supply.feature | A no-quartering charter is broken by taking |
| WAR-081 | features/supply.feature | The forage limit |
| WAR-082 | features/supply.feature | A taken enemy castle's store goes into the reserve |
| WAR-083 | features/supply.feature | Hunger |
| WAR-084 | features/supply.feature | Sickness by ground; Logistics cuts sickness; Men not born on the ground suffer fever land too |
| WAR-085 | features/supply.feature | Winter quarters; A no-quartering charter refuses winter quarters |
| WAR-086 | features/supply.feature | Armies in the field eat more in winter |
| WAR-087 | features/supply.feature | Burn the fields ahead of an invader |
| WAR-088 | features/supply.feature | Magazines in occupied provinces |
| WAR-089 | features/battle-bells.feature | Worked example: Troyes, 1450 |
| WAR-089 | features/battle-setup.feature | Two hostile armies in one province fight unless one slips away |
| WAR-090 | features/battle-setup.feature | A battle day has 6 bells and a battle at most 3 days |
| WAR-091 | features/battle-setup.feature | The battlefield is the province's middle tiles: Troyes 1450; A province with fewer tiles uses all of them; Sector room and effects; Waste is open or rough by ground; Fighting in the town burns town buildings |
| WAR-092 | features/battle-setup.feature | The ground applies on top of the sectors |
| WAR-093 | features/battle-setup.feature | The battlefield is the province's middle tiles: Troyes 1450; Depth steps forward; A narrow field favours the small army |
| WAR-094 | features/battle-setup.feature | No dice and no orders from the player during battle |
| WAR-095 | features/battle-setup.feature | Roles; Shock charges again after a bell out of contact; Guns have no melee |
| WAR-096 | features/battle-setup.feature | Elephants panic |
| WAR-097 | features/battle-setup.feature | Troop levels in battle (eras I and II) |
| WAR-098 | features/battle-setup.feature | Reaching a level (main table, era II) |
| WAR-099 | features/battle-setup.feature | A standing regiment never drops below level 2; Losing levels |
| WAR-100 | features/battle-setup.feature | The approach behind each style sets deployment; A style belongs to the commander, not to the battle |
| WAR-101 | features/battle-setup.feature | Entrenchment digs in only when attacked |
| WAR-102 | features/battle-setup.feature | Entrenchment digs in only when attacked |
| WAR-103 | features/battle-setup.feature | Assault closes at once |
| WAR-104 | features/battle-setup.feature | Might counts where the leader stands (eras III and IV) |
| WAR-105 | features/battle-bells.feature | Worked example: Troyes, 1450 |
| WAR-105 | features/battle-setup.feature | Cunning gives orders and the more cunning acts second (eras III and IV); The more cunning commander answers moves |
| WAR-106 | features/battle-setup.feature | Spotting hidden companies |
| WAR-107 | features/battle-setup.feature | Ammunition (eras III and IV) |
| WAR-108 | features/battle-setup.feature | Rotation and tiredness |
| WAR-109 | features/battle-setup.feature | Rotation and tiredness |
| WAR-110 | features/battle-bells.feature | Worked example: Troyes, 1450 |
| WAR-110 | features/battle-setup.feature | The orders; A Raw company told to fall back breaks |
| WAR-111 | features/battle-bells.feature | The order of a bell |
| WAR-112 | features/battle-bells.feature | The first bell is for shooting |
| WAR-113 | features/battle-bells.feature | Hits of a company; Hit modifiers |
| WAR-114 | features/battle-bells.feature | The flee share follows how content the realm is |
| WAR-115 | features/battle-bells.feature | The flee share follows how content the realm is |
| WAR-116 | features/battle-bells.feature | The content share used by each kind |
| WAR-117 | features/battle-bells.feature | Fled men count toward the break point |
| WAR-118 | features/battle-bells.feature | Fled men count toward the break point |
| WAR-119 | features/battle-bells.feature | A sector left by one side is won by the other |
| WAR-120 | features/battle-bells.feature | When an army breaks |
| WAR-121 | features/battle-bells.feature | Both break in the same bell |
| WAR-122 | features/inventions-in-war.feature | W inventions in battle |
| WAR-123 | features/battle-aftermath.feature | Withdrawing at night |
| WAR-123 | features/battle-bells.feature | Worked example: Troyes, 1450 |
| WAR-124 | features/battle-aftermath.feature | Overnight, fled men return and ammunition refills |
| WAR-125 | features/battle-aftermath.feature | The wounded after a battle |
| WAR-126 | features/battle-aftermath.feature | The fled after a battle |
| WAR-127 | features/battle-aftermath.feature | Pursuit |
| WAR-128 | features/battle-aftermath.feature | The winner takes arms and the camp |
| WAR-129 | features/battle-aftermath.feature | Leaders of the broken side may be captured |
| WAR-130 | features/battle-aftermath.feature | Records after a battle |
| WAR-131 | features/battle-aftermath.feature | The killed are Fallen |
| WAR-132 | features/battle-aftermath.feature | What to do with prisoners |
| WAR-133 | features/battle-aftermath.feature | Capture warfare |
| WAR-134 | features/battle-aftermath.feature | Standing orders: retreat if outnumbered; Retreat if outnumbered is checked each night; Attack or wait |
| WAR-135 | features/battle-aftermath.feature | Battles are resolved one at a time in the turn |
| WAR-136 | features/battle-aftermath.feature | A player battle is fought round by round |
| WAR-137 | features/battle-aftermath.feature | Battles between other countries don't stop the turn |
| WAR-138 | features/commander-styles.feature | A country's own styles |
| WAR-139 | features/commander-styles.feature | A new commander takes a style by his origin; An academy graduate takes the style the academy teaches |
| WAR-140 | features/commander-styles.feature | Hired captains carry their people's style abroad |
| WAR-141 | features/commander-styles.feature | A country with no named style uses its region's |
| WAR-142 | features/commander-styles.feature | Adopting a foreign style; A style can't be adopted without its inventions |
| WAR-143 | features/commander-styles.feature | An adopted style's rule is at half strength in a commander's first battle with it |
| WAR-144 | features/commander-styles.feature | Stale styles; A stale style loses its rule and an order; Worked example: Isandlwana and Ulundi, 1879 |
| WAR-144 | features/warfare-eras.feature | Worked example: a French noble commander, three times |
| WAR-145 | features/commander-styles.feature | How a commander learns a newer style; A second style at 10 victories |
| WAR-146 | features/commander-styles.feature | Special rules of styles; La guerrilla raids the occupier's food; People's war raises rebel bands; Ganimi kava raids outside battle; Worked example: Isandlwana and Ulundi, 1879 |
| WAR-147 | features/warfare-eras.feature | Armies from different eras on one field |
| WAR-148 | features/warfare-eras.feature | Battle scale by era |
| WAR-149 | features/warfare-eras.feature | Obsolete arms fight at half strength against an enemy who knows the replacement; Cavalry stays as Light after the machine gun; Horse archers keep scouting and raiding when obsolete; Obsolete arms fight normally against an enemy who lacks the invention |
| WAR-150 | features/warfare-eras.feature | Obsolete arms can't be raised once your own realm knows the replacement |
| WAR-151 | features/warfare-eras.feature | Re-arming costs arms and powder and a level |
| WAR-152 | features/warfare-eras.feature | Drill months for levels by era; Level worth by era |
| WAR-153 | features/warfare-eras.feature | Era notes on levels |
| WAR-154 | features/warfare-eras.feature | A new invention drops a company a level until it drills again |
| WAR-155 | features/warfare-eras.feature | Might by era; Worked example: a French noble commander, three times |
| WAR-156 | features/warfare-eras.feature | Cunning by era; Messengers in early eras; Captains give their own orders from era VI |
| WAR-157 | features/warfare-eras.feature | Logistics by era |
| WAR-158 | features/warfare-eras.feature | How skills grow by era |
| WAR-159 | features/sieges.feature | Castle numbers |
| WAR-160 | features/sieges.feature | An empty castle falls at once |
| WAR-161 | features/sieges.feature | Closing a castle; An open castle can be fed |
| WAR-162 | features/sieges.feature | The garrison and the townsfolk eat; Driving out the townsfolk |
| WAR-163 | features/sieges.feature | The besiegers eat from their own supply |
| WAR-164 | features/sieges.feature | Shot and breaches; Mining without guns; A Siege master breaches faster; Worked example: the castle of Troyes |
| WAR-165 | features/sieges.feature | Repairing breaches |
| WAR-166 | features/sieges.feature | A sally |
| WAR-167 | features/sieges.feature | A starving garrison |
| WAR-168 | features/sieges.feature | Camp fever |
| WAR-169 | features/sieges.feature | Storming; The storm |
| WAR-170 | features/sieges.feature | How a siege ends; Breaking terms is an oath broken; Worked example: the castle of Troyes |
| WAR-171 | features/sieges.feature | After a storm |
| WAR-172 | features/sieges.feature | When an AI garrison accepts honours |
| WAR-173 | features/sieges.feature | Gold at the gate; Greedy commanders and bribes |
| WAR-174 | features/sieges.feature | Worked example: the castle of Troyes |
| WAR-175 | features/occupation-and-raids.feature | Occupying a province; The lord of an occupied province wavers toward the occupier |
| WAR-176 | features/occupation-and-raids.feature | A horse raid burns and loots; Castles can sally against raiders; A raiding army can't besiege |
| WAR-177 | features/war-and-peace-voices.feature | The war aim is shown to everyone |
| WAR-178 | features/war-and-peace-voices.feature | A war with no fitting aim |
| WAR-179 | features/war-and-peace-voices.feature | Breaking a truce |
| WAR-180 | features/war-and-peace-voices.feature | A lord's voices; A royal province's voice; The capital is a third of all voices; A Warlike ruler ignores a quarter of the peace voices; A child ruler's regent counts as a lord |
| WAR-181 | features/war-and-peace-voices.feature | What the peace voices oblige; A player who refuses an obliged peace |
| WAR-182 | features/war-and-peace-voices.feature | What the peace voices oblige |
| WAR-183 | features/war-and-peace-voices.feature | The AI makes peace by the same counts |
| WAR-184 | features/war-and-peace-voices.feature | Peace terms' war-state preconditions |
| WAR-185 | features/war-and-peace-voices.feature | A side with no soldiers and no castles left |
| WAR-186 | features/war-and-peace-voices.feature | A Raid war ends by itself |
| WAR-187 | features/war-and-peace-voices.feature | A succession war ends a foreign war |
| WAR-188 | features/war-and-peace-voices.feature | A signed peace starts the diplomacy truce |
| WAR-189 | features/war-and-peace-voices.feature | What winning each war aim means |
| WAR-190 | features/inventions-in-war.feature | B inventions in war |
| WAR-191 | features/inventions-in-war.feature | Army divisions let armies split and join in a day |
| WAR-192 | features/inventions-in-war.feature | Mass conscription keeps levies longer |
| WAR-193 | features/inventions-in-war.feature | Military aircraft scout and bomb |
| WAR-194 | features/war-ai.feature | Risk tolerance sets standing orders; Starting styles come from the style catalogue |
| WAR-195 | features/war-ai.feature | Personality sets which kinds it raises; Personality sets whether it besieges or raids |
| WAR-196 | features/war-ai.feature | Risk sets when the AI talks peace |
| WAR-197 | features/war-ai.feature | The AI doesn't cheat on food |
| WAR-198 | features/sieges.feature | Sieges update once a month |
| WAR-199 | — | Not testable as behaviour: structural rule (all rates in one warfare config file); checked by config review. |
| WAR-205 | features/battle-aftermath.feature | A side can retreat at any round |
| WAR-206 | features/battle-aftermath.feature | An army that marches in joins a running battle |
| WAR-200 | — | Not testable as behaviour: a negative design rule (no EU4 mechanics); checked by design review. |
| WAR-201 | — | Presentation only (army card, owned by map-presentation). |
| WAR-202 | features/battle-aftermath.feature | The battle playback says what each commander did |
| WAR-203 | features/battle-aftermath.feature | Notifications for short sessions |
| WAR-204 | — | Not testable on its own: an emergent property of styles, arms and ground (covered by those scenarios). |
| WAR-207 | features/battle-setup.feature | A battle is fought round by round with its state published |
| WAR-208 | features/sieges.feature | A siege publishes its progress |
| WAR-209 | features/commanders.feature | No army without a commander |
| WAR-210, 211 | features/raising-and-keeping.feature | Hiring a free company takes no recruits; A hired company arrives after its march |
| WAR-212 | features/kinds-and-break-points.feature | Levies stay until the realm sends them home |
| WAR-213 | features/raising-and-keeping.feature | Free companies of the age, each its own size and mix |
| WAR-214 to 217 | features/raising-and-keeping.feature | The free companies page |
| WAR-221 … WAR-228 | features/price-of-war.feature | Peace voices in the game; Refusing an obliged peace costs the ruler; A war with no fitting aim in the game; Lords tire of a long war; Occupation does not pay for the war; Levies at war are paid at once; The dead are missed at home; One peace cannot swallow a realm; The AI counts the price before declaring |
| WAR-229 … WAR-232 | features/price-of-war.feature | The declare sheet shows the price of war; The war card |
