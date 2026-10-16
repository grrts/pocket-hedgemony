# Rebellions (REBL)

## 1. Purpose and scope

This context decides how a province's grievances turn into a rising, how strong a rising is (how hard it is
to beat in the field), how severe it is (how much damage it does and how far it spreads), how the ruler can
answer it, and what the rebels get if they win.

**In scope**
- The four steps from grievances to a rising (grumbling, riots, plotting, rising) and the monthly rising roll.
- Sparks: single happenings that tip a rioting province into a rising.
- The rising's cause, demand, leader, the men who join it, its arms, its food.
- Severity tiers (riot, rising, rebellion, great revolt), monthly spread, what makes a rising worse.
- The ruler's answers (grant, talk, bribe, wait, attack) and the treatment after a victory (pardon, punish,
  massacre).
- Prevention levers that belong to the rising itself (judge, almshouse, garrisoned castle, loyal lords).
- What rebels win per cause.
- Resistance of local people in colonies (the same machinery under another name).
- The rebellion card.

**Not in scope (owned by …)**
- The list of grievances, when each starts and ends, homeless shares, officials, charters, castles:
  **province** (province stats 6.4, 10, 11, 12.1).
- Lords, their loyalty steps, wants, retinues: **realm** (country stats 5).
- How rebel bands fight (battle rules, *Rebel band* kind, break point, troop level): **warfare**.
- How a rising is tagged by a revolution, the camps that replace the join table, and the regime applied when
  a tagged rising wins or is crushed: **revolutions** (the hook is a seam, see 11 and OQ-REBL-4).
- The secret "fund rebels" action itself, its gold and its chance of being caught: **diplomacy**.
- Faith policy rows, preachers, houses of worship: **religion**. Tongues and nationalism: **culture**.
- Independence wars of subjects: **subjects** (8.2), which are ordinary wars, not risings.
- The global order of the monthly turn: **time-and-turns**.
- How risings are drawn on the map at each zoom: **map-presentation**.

## 2. Sources

Newest decision first.

1. `revolutions/revolutions-design.md` §4, §5, §11, §14 and `revolutions/changes-for-other-designs.md`
   "Rebellions" (16 Oct 2026): tagged risings, camps, `rising_won` / `rising_crushed` (proposed changes to this
   context; not yet adopted by rebellions v1).
2. `diplomacy/diplomacy-design.md` §6.11 and §18 (16 Oct): funding rebels; asks this design for the grievances
   *Foreign agitators* and *Foreign meddling* (not yet adopted).
3. `religion/religion-design.md` §5.2, §6, §11, §18 (16 Oct): faith risings' demand, preachers, sparks
   (not yet adopted).
4. `culture/culture-design.md` §5.2, §6.4 (16 Oct): homeland risings and nationalism.
5. `province-stats/province-stats-design.md` v3 §6.4, §10.2, §10.4, §12.1, §12.3, §15 (16 Oct, 22:54).
6. `province-stats/rebellions-design.md` v1, all sections (the main source).
7. `country-stats/country-stats-design.md` v3 §5 (lords, loyalty, wants).
8. `warfare/warfare-design.md` §2.3 (*Rebel band*), §7 (battle), troop level table (rebels are *Raw*).
9. `recruiting/recruiting-design.md` (armed veterans start a rising armed and drilled).
10. `buildings/buildings-design.md` (rebels loot a town building a season; town walls).
11. `trade/trade-design.md` (bandits; rebels holding a province act as an enemy army for trade).
12. `event-tree/data/balance.yaml` `rebel_sizes`, `rebel_thresholds`; `event-tree/data/vocabulary.yaml`
    `rebels`, `rebels_active`.

## 3. Ubiquitous language

| Term | Meaning | Not to be confused with |
|---|---|---|
| Grievance | A named cause of anger in one province (province stats 12.1). There is no anger meter. | Event tree `unrest` (an abstract 0–100 stat this game does not use; it maps to grievances) |
| Grumbling | Step at 2 grievances: growth slows, scholars and craftsmen start to leave. | Riots |
| Riots | Step at 3 grievances: tax and recruits halved, traders avoid it, the lord wavers. Also the lowest severity tier. | A rising |
| Plotting | Step at 4 or more grievances: the province may rise by itself each month. | Rising |
| Rising | A province where rebels have mustered; the rebellion card appears. Also the severity tier "one province with a rebel army". | Rebellion (the 2–5 province tier) |
| Spark | A single happening that turns a rioting province (3+ grievances) into a rising at once. | Revolution sparks (multipliers on a revolution's chance, revolutions context) |
| Cause | Hunger, Tax, Faith, Homeland, Town, Lord, Pretender or New ideas: what the rising is about. Taken from the heaviest grievance. | Event tree rebel `type` |
| Demand | What the rebels ask for; set by the cause. | |
| Leader | The named person at the head of a rising, with Might, Cunning and Logistics like a commander. | Commander (warfare) |
| Plotter | The named person shown on the card while a province is plotting. | Leader |
| Men | Rebels, taken out of their classes; their job slots go empty. | Recruits (men who join rebels are no longer recruits) |
| Arms | Step that multiplies strength: Tools ×0.4, Old weapons ×0.6, Armed ×0.8, Soldiers ×1.0. | |
| Strength | Men × Arms × Leader × Ground: how hard a rising is to beat. | Severity |
| Severity | How much harm a rising does and how far it spreads: Riot, Rising, Rebellion, Great revolt. | Strength |
| Great revolt | More than 5 provinces, or the capital's province, or a whole lord's land: civil war. | Rebellion |
| Lord's revolt | A rising led by a lord whose loyalty is *In revolt*, with his retinue. | |
| Resistance | A rising of local people in a colony whose tiles settlers took; same rules, demand is their tiles back. | Rebels |
| Bloodshed | Grievance for 20 years in every province of the same faith or tongue after a massacre. | |
| Neighbour in revolt | Grievance a province gets when a neighbouring province has rebels with a grievance it shares. | |
| Pardon / Punish the leaders / Massacre | The three treatments after beating a rising. | |
| Rebel band | The warfare kind rebels fight as. | |

## 4. Domain model

### Aggregates

**Rising** (identity: rising id; one per rising, can span several provinces)
- Holds: cause, demand, leader, spark or roll that started it, provinces held, men by class of origin, arms
  step and the sources behind it, food (months), severity tier, backer (who pays it, if anyone), months
  held without defeat, whether a lord with his retinue has joined, whether it is a resistance.
- INV-REBL-1: every rising has exactly one cause and one named leader at any time (a bribed leader is
  replaced or the rising splits or melts away; a faith rising finds a new preacher).
- INV-REBL-2: the arms step never exceeds what its sources give; each step above Tools needs one source.
- INV-REBL-3: a man counted as a rebel is not in a class slot and not a recruit.
- INV-REBL-4: severity tier follows its size: one province with no army = Riot; one province with a rebel
  army = Rising; 2 to 5 provinces = Rebellion; more than 5, or the capital's province, or a whole lord's land
  = Great revolt.
- INV-REBL-5: a rising in or next to the capital is a great revolt.
- INV-REBL-6: hunger and tax risings end when their need is met; faith, homeland and pretender risings do
  not end by gold or grain.

**Province unrest state** (identity: province id; lives with the province, this context reads it)
- Holds: count of grievances (with *Homeless* counting two above a fifth homeless), current step
  (calm, grumbling, riots, plotting, risen), named plotter while plotting, monthly rising chance,
  no-rising locks (10 years per cause after Punish; 20 years for any cause after Massacre).
- INV-REBL-7: step is a function of the effective grievance count: 0–1 calm, 2 grumbling, 3 riots,
  4+ plotting (a judge raises each bar by one).
- INV-REBL-8: while an almshouse shelters them, the homeless do not count toward the trouble.

### Entities and value objects

- **Leader** (entity): name, kind (local, preacher, veteran, the lord himself, the pretender), Might, Cunning,
  Logistics.
- **Cause** (value): one of the 8 causes, with its grievances, demand, who joins most, what it wins.
- **Spark** (value): kind (new burden, failed harvest, insult to faith, death or execution, defeat, outsider,
  the ruler) and the concrete happening.
- **Arms step** (value): Tools, Old weapons, Armed, Soldiers, with multiplier.
- **Join share** (value): share of a class's men who join each month while the rising grows.
- **Severity tier** (value).
- **Victory treatment** (value): Pardon, Punish the leaders, Massacre.

### Domain services

- **Rising roll**: each month, for each plotting province, roll its chance.
- **Spread roll**: each month, for each rising and each neighbouring province, roll the spread chance with the
  factors of 4.2.
- **Muster**: each month while the rising grows, move join shares of each class into the rising.
- **Outcome resolver**: when rebels win, apply the cause's result.

## 5. Requirements

### 5.1 From grievances to a rising

- REBL-001 The game shall set a province's step from its grievance count: 2 grievances Grumbling, 3 Riots,
  4 or more Plotting. [rebellions §2.1; province stats §12.1]
- REBL-002 While a province is Grumbling, the game shall slow its growth and start scholars and craftsmen
  leaving, with no danger of a rising. [rebellions §2.1]
- REBL-003 While a province is in Riots, the game shall halve its tax and recruits, make traders avoid it and
  make its lord waver. [rebellions §2.1, §4.1]
- REBL-004 When a spark happens in a province with 3 or more grievances, the game shall turn it into a rising
  at once. [rebellions §2.1, §2.2]
- REBL-005 While a province is Plotting, each month the game shall roll for it to rise by itself: 5 % with 4
  grievances, 15 % with 5, 30 % with 6 or more. [rebellions §2.1]
- REBL-006 While a province is Plotting, the game shall show the monthly chance and a named plotter on its
  card. [rebellions §2.1]
- REBL-007 When a province rises, the game shall muster rebels (5.4) and show the rebellion card. [rebellions §2.1]
- REBL-008 The game shall show each of the four steps on the map. [rebellions §2.1]
- REBL-009 The game shall count the *Homeless* grievance fully toward these steps, and as two grievances
  where homeless are above a fifth of the people. [rebellions §2.1; province stats §6.4, §12.1]

### 5.2 Sparks

- REBL-010 The game shall treat as sparks: a new burden (the province's tax rate raised; a levy called at
  harvest time; an army quartered for the winter; an army requisitioning food while the province is already
  *Hungry*); a failed harvest roll while the province already has *Hungry*; an insult to faith (a house of
  worship of the majority faith demolished; a faith tolerance charter revoked); a death or execution (the
  province's lord executed, or dying without an accepted heir; a popular official dismissed); a defeat (your
  army loses a battle in or next to the province; the capital falls); an outsider (a pretender lands with
  men; a rival's envoy arrives with gold; a preacher of a new faith arrives); the ruler dying with a child
  heir or none. [rebellions §2.2]
- REBL-011 When a rising begins from a spark, the game shall show the spark as the reason the rising began.
  [rebellions §2.2]
- REBL-012 When an event-tree event acts as a spark directly, the game shall treat it as a spark; when a
  revolution event fires, the game shall start a rising in every province that meets its conditions.
  [rebellions §2.2, §7]

### 5.3 Cause, demand and leader

- REBL-013 When a rising begins, the game shall take its cause from the province's heaviest grievance:
  *Hungry* → Hunger; *Heavy taxes* or *Conscription* → Tax; *Wrong faith* or a faith *Broken charter* → Faith;
  *Foreign rule* or *Far from the throne* → Homeland; *Homeless*, *Broken charter* or *Soldiers quartered* →
  Town; *Harsh lord*, or a disloyal lord's own choice → Lord; a pretender with a right to the province plus
  any grievance → Pretender; in later eras, any grievance plus the event tree's ideology support → New ideas.
  [rebellions §2.3]
- REBL-014 The game shall set the demand by cause: Hunger – food, the castle granary opened to them; Tax –
  the tax rate back down and the levy ended; Faith – a faith tolerance charter, or a ruler of their faith;
  Homeland – self-rule, then independence; Town – a town law charter, work, the soldiers gone; Lord – the
  lord's want (land, an office, lower taxes, independence); Pretender – the pretender on the throne, or the
  province handed to them; New ideas – a new kind of government. [rebellions §2.3]
- REBL-015 The game shall draw most joiners by cause: Hunger – farmers and homeless; Tax – farmers, craftsmen,
  market folk; Faith – everyone of that faith; Homeland – everyone of the homeland's tongue; Town – homeless,
  craftsmen, market folk; Lord – the lord's retinue and officials plus the people of his land who share his
  faith and tongue; Pretender – lords who back the pretender plus anyone with a grievance; New ideas –
  townsfolk and scholars first. [rebellions §2.3]
- REBL-016 When settlers take local people's tiles in a colony, the game shall raise a resistance of the
  local people instead of rebels: the same rules, with their own named leaders and the demand to get their
  tiles back; a resistance can win. [rebellions §2.3; province stats §12.3]
- REBL-017 The game shall give every rising a named leader drawn from the province: a local (dyer, miller,
  village elder) for hunger, tax and town risings, bringing Cunning and little Might; a preacher for faith
  risings; a veteran in any province with returned soldiers among the homeless, bringing Might; the lord
  himself in a lord's revolt, bringing his retinue, wealth and officials; the pretender in a pretender's war,
  bringing the lords who back them and foreign help. [rebellions §2.4]
- REBL-018 While a preacher leads a faith rising, the game shall spread that faith to neighbours twice as
  fast. [rebellions §2.4; religion §6]
- REBL-019 While a veteran leads a rising, the game shall make the rebels fight as if better armed by one
  step. [rebellions §2.4]
- REBL-020 The game shall give leaders Might, Cunning and Logistics as commanders have, and their Might and
  Cunning shall work as a commander's. [rebellions §2.4, §3.3]

### 5.4 Strength

- REBL-021 The game shall compute a rising's strength as Men × Arms × Leader × Ground, with food deciding
  how long they last. [rebellions §3]
- REBL-022 In battle, the game shall field rebels as the *Rebel band* kind under the warfare battle rules,
  carrying the arms of their arms step. [rebellions §3; warfare §2.3, §7]
- REBL-023 When men join a rising, the game shall take them out of their classes and leave their job slots
  empty. [rebellions §3.1]
- REBL-024 While a rising grows, each month the game shall draw these shares of each class's men: homeless
  30 %; the class the cause speaks to 10 %; everyone sharing the faith or tongue (faith and homeland risings)
  8 %; other classes 2 %; clergy and scholars only in faith and new-ideas risings; a lord's retinue all of it
  at once. [rebellions §3.1]
- REBL-025 When a rising has drawn its share, or its cause is fixed, the game shall stop it growing.
  [rebellions §3.1]
- REBL-026 The game shall count men who join the rebels as no longer recruits for the owner.
  [rebellions §3.1]
- REBL-027 The game shall set arms by sources: Tools ×0.4 in any rising; Old weapons ×0.6 from a forge in the
  province or a veteran leader; Armed ×0.8 from a forge and a market, a captured castle's store, or foreign
  gold; Soldiers ×1.0 from a lord's retinue, deserters, a rival's troops or a pretender's army.
  [rebellions §3.2]
- REBL-028 If a rising has no source for a higher arms step, then the game shall keep it at the highest step
  its sources give, each step up needing one source. [rebellions §3.2]
- REBL-029 While rebels fight in hills, mountains, forest, jungle or marsh of their province, the game shall
  give them the province's *Locals know the land* bonus. [rebellions §3.3; province stats §3.1]
- REBL-030 While rebels hold a castle, the game shall let them fight from its walls. [rebellions §3.3]
- REBL-031 The game shall feed rebels from the local store of the provinces they hold, then by foraging,
  which burns tiles. [rebellions §3.4]
- REBL-032 While rebels have no food, the game shall remove a tenth of their men each month to hunger and
  desertion. [rebellions §3.4]
- REBL-033 When tiles are burned to starve a rising, the game shall add *Burned homes* wherever the burning
  happens. [rebellions §3.4]

### 5.5 Severity and spread

- REBL-034 The game shall set a rising's severity tier by INV-REBL-4. [rebellions §4.1]
- REBL-035 While a province is held by a rising (tier Rising or above), the game shall send none of its tax,
  recruits, food or trade to the owner, and its official shall flee. [rebellions §4.1]
- REBL-036 While a rising is a Rebellion, the game shall apply the Rising effects in each province, make
  neighbouring lords of the same faith or tongue waver, and let rebels besiege castles. [rebellions §4.1]
- REBL-037 While a rising is a Great revolt, the game shall run it as a civil war: every lord picks a side by
  loyalty, allies may stay out, and rival AIs may attack. [rebellions §4.1]
- REBL-038 Each month the game shall roll for each rising to spread to each neighbouring province, with a
  higher chance when the neighbour has the same grievance (and it gets *Neighbour in revolt*), shares the
  rebels' faith or tongue, is connected by roads, rivers and traders, has many homeless, when the owner's army
  is away at war, when the owner answered with a massacre, and when a rival pays the rebels; and a lower
  chance when the neighbour shares no grievance, a garrisoned castle sits on the road between, a judge runs
  the neighbour (riots there need one more grievance), the owner's army is in the region, the owner pardoned
  the last rising, or an almshouse stands in the neighbour. [rebellions §4.2]
- REBL-039 When a neighbouring province has rebels with a grievance a province shares, the game shall give
  that province *Neighbour in revolt* until those rebels are beaten or satisfied. [rebellions §4.2;
  province stats §12.1]
- REBL-040 When a disloyal lord whose faith or tongue matches the rebels joins with his retinue, the game shall
  turn the rising into a lord's revolt with Soldiers' arms. [rebellions §4.3]
- REBL-041 When a rising is answered with a massacre, the game shall add *Bloodshed* for 20 years to every
  province of the same faith or tongue. [rebellions §4.3, §5.1; province stats §12.1]
- REBL-042 While rebels hold a province, the game shall loot one town building a season (the market first),
  kill or drive out officials, burn tiles when they forage, and make scholars flee. [rebellions §4.3;
  buildings]
- REBL-043 While a rising lasts, the game shall pull in more men every month until the cause is fixed.
  [rebellions §4.3]
- REBL-044 When a rising starts in or next to the capital, the game shall make it a great revolt at once.
  [rebellions §4.3]

### 5.6 Answering a rebellion

- REBL-045 When the owner grants the demand, the game shall charge what was asked (the tax lowered, a
  charter, granary food, the lord's want), end the rising at once, send the rebels back to their classes,
  remove the grievance, and make other provinces with the same grievance more likely to rise and ask for the
  same. [rebellions §5.1]
- REBL-046 When the owner talks with the rebels, the game shall charge an envoy or a judge and some gold and
  reach a partial deal of half the demand, which works on hunger, tax and town risings and rarely on faith
  or homeland risings. [rebellions §5.1]
- REBL-047 When the owner bribes the leader, the game shall charge gold (more for a lord or a pretender),
  remove the leader and the leader's bonus, and let the rebels split or melt away; a faith rising finds a
  new preacher quickly. [rebellions §5.1]
- REBL-048 While the owner waits, the game shall cost the owner the lost tax and output each month, shrink
  rebels who have no food or arms, and not shrink rebels who hold a castle, have a lord or have foreign gold.
  [rebellions §5.1]
- REBL-049 When the owner's army beats the rebels in battle, the game shall scatter them: a third die, a third
  flee abroad, a third go home as homeless. [rebellions §5.1]
- REBL-050 After a victory over a rising, the game shall let the owner choose Pardon (survivors return to their
  classes, the province calms faster, the leader may rise again), Punish the leaders (the leader is executed;
  that province gets no new rising from the same cause for 10 years) or Massacre (no rising in that province
  for 20 years; *Bloodshed* across every province of the same faith or tongue; lords of that faith or tongue
  waver). [rebellions §5.1]

### 5.7 Preventing risings

- REBL-051 When a grievance ends (province stats 12.1), the game shall count it no longer toward a rising.
  [rebellions §5.2]
- REBL-052 While a judge runs a restless province, the game shall raise each step's bar by one grievance.
  [rebellions §5.2; province stats §10.2]
- REBL-053 While an almshouse shelters a province's homeless, the game shall not count them toward the
  trouble. [rebellions §5.2; province stats §6.4]
- REBL-054 While a garrisoned castle stands on the main road, the game shall limit the rising's spread along it
  and give the rebels a siege to fight. [rebellions §5.2]
- REBL-055 The game shall keep loyal lords out of risings; their retinues fight for the owner. [rebellions §5.2]

### 5.8 If the rebels win

- REBL-056 When rebels have held their provinces for 12 months with no army defeating them, or take the
  capital, the game shall declare the rising won. [rebellions §6]
- REBL-057 When a rising is won, the game shall apply its cause's result: Hunger – the castle's food handed
  out, *Hungry* ends, the province's lord turns disloyal; Tax – the rate in their provinces fixed at light for
  10 years; Faith – a faith tolerance charter in every province they held, or in a great revolt a ruler of
  their faith; Homeland – their provinces break away as a new country; Town – a town law charter and the
  quartered army leaves; Lord – the lord gets his want, or leaves the realm with his land as his own country
  or under a neighbour; Pretender – the pretender takes the throne (a great revolt) or the province passes
  to them; New ideas – the government changes to theirs (event tree revolution events). [rebellions §6]
- REBL-058 When a homeland rising wins, the game shall form the new country from a catalogue entity if one
  fits, otherwise a new one named for the homeland. [rebellions §6]

### 5.9 How other systems use it

- REBL-059 The game shall count provinces with riots or rebels as the country card's *In revolt*.
  [rebellions §7; province stats §12.1, §13]
- REBL-060 The game shall treat a lord at loyalty *In revolt* as a lord's revolt, and in a great revolt let
  lords pick sides by loyalty. [rebellions §7]
- REBL-061 The game shall land event-tree `unrest` effects as named grievances, let `separatism_risk` read
  homeland risings, and let revolution and reformation events act as sparks or set the cause.
  [rebellions §7; province stats §15]
- REBL-062 Where a rival pays a country's rebels, the game shall treat it as a hostile act the victim can find
  out about through envoys. [rebellions §7; diplomacy §6.11]

### 5.10 The card

- REBL-063 While a rising lasts, the game shall show a rebellion card with: the rising's name, cause, demand,
  leader and a skill, who joined, men, arms and multiplier, what it holds, food in months, severity with its
  province count and neighbours sharing the grievance, who backs it, where it may spread next month, and the
  five answers (Grant demand, Talk, Bribe leader, Wait, Attack). [rebellions §1]

### 5.11 Configuration

- REBL-064 The game shall read from the province config: the grievance counts per step, the monthly rising
  chances, the sparks, join shares per class and cause, arms steps and their sources, spread chances, how long
  rebels must hold out to win, the *Bloodshed* length, and what each cause wins. [rebellions §8]

## 6. Commands

| Command | Who issues it | Preconditions | Result | Events emitted |
|---|---|---|---|---|
| GrantDemand(rising) | player / AI | Rising active; owner can pay what was asked | Demand paid; rising ends; grievance removed; same-grievance provinces more likely to rise | RisingEnded(granted), DemandGranted |
| TalkWithRebels(rising, envoy or judge, gold) | player / AI | Rising active; an envoy or judge free; gold | Half the demand; works on hunger, tax, town (rarely faith, homeland) | TalksHeld, RisingEnded(talked) or TalksFailed |
| BribeLeader(rising, gold) | player / AI | Rising active; gold (more for a lord or pretender) | Leader leaves; bonus lost; rising may split or melt away | LeaderBribed, RisingSplit / RisingEnded(melted) |
| WaitOut(rising) | player / AI | Rising active | No action this month; costs lost tax and output | (none) |
| AttackRebels(army, rising) | player / AI | An army that can reach the rebels (movement and battle owned by troop-movement and warfare) | Battle under warfare rules; on win rebels scatter 1/3 die, 1/3 abroad, 1/3 homeless | RebelsDefeated |
| TreatDefeatedRebels(rising, Pardon or Punish or Massacre) | player / AI | Rising just beaten | Pardon, Punish or Massacre effects | RebelsPardoned / LeaderExecuted / MassacreCommitted |

The secret "fund rebels" order is a diplomacy command (diplomacy 6.11); this context consumes its result.

## 7. Domain events

| Event | When | Payload | Consumed by (context) |
|---|---|---|---|
| ProvinceStepChanged | Grievance count crosses a step | province, old step, new step | province, map-presentation, realm (lord wavers) |
| RisingStarted | A spark at 3+ or the monthly roll at 4+ | province, cause, demand, leader, spark or roll | map-presentation, realm, revolutions, events, AI |
| RisingSpread | A spread roll succeeds | rising, new province | province (*Neighbour in revolt*), map-presentation |
| SeverityTierChanged | Tier changes (incl. great revolt) | rising, tier | realm (lords pick sides), diplomacy (allies, rivals), warfare |
| LordJoinedRising | A disloyal lord joins with his retinue | rising, lord | realm, warfare |
| ProvinceLooted | Rebels loot a town building (one a season) | province, building | buildings, province |
| RebelsDefeated | An army beats the rebels | rising, battle | warfare, province (homeless), revolutions (crushed) |
| RisingEnded | Granted, talked, bribed and melted, starved, or scattered | rising, how | province, revolutions (`rising_crushed` for a tagged rising) |
| MassacreCommitted | Massacre chosen | rising, faith, tongue | province (*Bloodshed* ×20 years), realm (lords waver) |
| RebelsWon | 12 months held or capital taken | rising, cause, provinces | province, realm, government (new ideas), subjects/scenario (new country), revolutions (`rising_won`) |
| ResistanceStarted | Settlers take local people's tiles | colony province, people | exploration, province |

## 8. Policies (reactions to other contexts)

- When a grievance starts or ends in a province (province), then recount the step (REBL-001).
- When a tax rate is raised, a levy is called at harvest, an army winters or requisitions food in a *Hungry*
  province, a harvest fails in a *Hungry* province (province, realm, warfare), then treat it as a spark.
- When a house of worship of the majority faith is demolished or a faith tolerance charter is revoked
  (buildings, province, religion), then treat it as a spark.
- When a province's lord is executed or dies without an accepted heir, or a popular official is dismissed
  (realm, province), then treat it as a spark.
- When the owner's army loses a battle in or next to the province, or the capital falls (warfare), then treat
  it as a spark.
- When a pretender lands with men, a rival's envoy arrives with gold, or a preacher of a new faith arrives
  (diplomacy, religion, events), then treat it as a spark.
- When the ruler dies with a child heir or none (realm), then treat it as a spark.
- When a revolution event fires (events / revolutions), then start a rising in every province meeting its
  conditions, tagged with the revolution (see OQ-REBL-4).
- When a lord's loyalty reaches *In revolt* (realm), then start a lord's revolt.
- When settlers take local people's tiles (province, exploration), then start a resistance.
- When a rival funds rebels in a province (diplomacy 6.11), then count the rising's arms as Armed from foreign
  gold and do not shrink it while the owner waits.

## 9. Monthly turn

Reads first: the province's grievances, homeless share, officials (judge), almshouse, local and castle stores,
castles and garrisons, lords' loyalty, armies in the region, battles fought this month, funding by rivals.

1. Recount each province's step from its grievances.
2. Apply sparks that happened this month (from other contexts' steps earlier in the turn).
3. Roll the rising chance for each plotting province.
4. Muster: draw join shares into each growing rising.
5. Feed rebels (store, then forage); apply hunger losses.
6. Roll spread for each rising to each neighbour; apply *Neighbour in revolt*.
7. Apply damage while holding provinces (looting is once a season).
8. Advance months held; check win conditions.

The order of these steps against battles, food and events is owned by time-and-turns (gap list item 20).

## 10. Configuration

All in the province config (rebellions §8). Key names below are this spec's labels; the design names only the
groups.

| Key | Meaning | Value in the design | Placeholder? | Config file |
|---|---|---|---|---|
| rebellions.steps.grumbling | Grievances for Grumbling | 2 | yes | province config |
| rebellions.steps.riots | Grievances for Riots | 3 | yes | province config |
| rebellions.steps.plotting | Grievances for Plotting | 4 | yes | province config |
| rebellions.rising_chance | Monthly rising chance by grievances | 4: 5 %, 5: 15 %, 6+: 30 % | yes | province config |
| rebellions.sparks | Spark list | §2.2 table | yes | province config |
| rebellions.join_share.homeless | Monthly join share, homeless | 30 % | yes | province config |
| rebellions.join_share.cause_class | Class the cause speaks to | 10 % | yes | province config |
| rebellions.join_share.faith_or_tongue | Faith and homeland risings | 8 % | yes | province config |
| rebellions.join_share.other | Other classes | 2 % | yes | province config |
| rebellions.arms | Arms multipliers | Tools 0.4, Old weapons 0.6, Armed 0.8, Soldiers 1.0 | yes | province config |
| rebellions.starving_loss | Men lost per month with no food | a tenth | yes | province config |
| rebellions.spread | Spread chances and factors | not given | yes | province config |
| rebellions.win_hold_months | Months held to win | 12 | yes | province config |
| rebellions.bloodshed_years | *Bloodshed* length | 20 | yes | province config |
| rebellions.punish_lock_years | No rising from the same cause after Punish | 10 | yes | province config |
| rebellions.massacre_lock_years | No rising in the province after Massacre | 20 | yes | province config |
| rebellions.scatter | Shares after defeat: die, flee, homeless | 1/3 each | yes | province config |
| rebellions.talk_share | Share of the demand a talk gives | half | yes | province config |
| rebellions.tax_win_years | Tax fixed at light after a won tax rising | 10 | yes | province config |
| rebellions.outcomes | What each cause wins | §6 table | yes | province config |

## 11. Seams

| Other context | Direction | Pattern | What crosses |
|---|---|---|---|
| province | upstream | Customer–Supplier | Grievances (12.1), homeless share, classes and slots, local store, officials (judge), almshouse, charters, castles; this context writes *Neighbour in revolt*, *Bloodshed*, *Burned homes*, empties slots, adds homeless |
| realm | upstream / downstream (partnership) | Partnership | Lords' loyalty, wants, retinues, wealth, officials; *In revolt* country count; lords waver or pick sides |
| warfare | upstream | Conformist | *Rebel band* kind, battle rules, break point, troop level *Raw*; battle results; sieges |
| troop-movement | upstream | Customer–Supplier | Armies in or away from the region; attacking rebels |
| revolutions | downstream | Customer–Supplier | Tagged risings (`revolution: <event>`), camp join shares that replace 5.4 for that rising, `rising_won` / `rising_crushed` hook (proposed, OQ-REBL-4) |
| events | upstream | Published Language | `rebels` effect, `rebels_active` condition, `unrest` → grievances, sparks from events, `separatism_risk` |
| diplomacy | upstream | Customer–Supplier | Fund rebels (secret), *Foreign agitators* / *Foreign meddling* (OQ-REBL-3), envoy flees when the host country falls to rebels |
| religion | upstream | Customer–Supplier | Faith risings' demand, preachers as leaders, sparks from faith policy and houses (OQ-REBL-2) |
| culture | upstream | Customer–Supplier | Homeland risings draw 8 % of the tongue; with nationalism 0.5+ they demand a new country; *Banned tongue* grievance |
| government | downstream | Customer–Supplier | A won New ideas rising sets a form; over-cap lords become disloyal |
| subjects | downstream | Customer–Supplier | A lord leaving with his land (rebellions 6) |
| recruiting | upstream | Customer–Supplier | Recruits lost to rebels; armed veterans start a rising armed and drilled (OQ-REBL-14) |
| buildings | downstream | Customer–Supplier | Looting one town building a season, market first; town walls stop looting without storming |
| trade | downstream | Customer–Supplier | Riots: traders avoid; bandits where riots or rebels; rebels holding a province act as an enemy army |
| scenario-setup | downstream | Customer–Supplier | A new country for a won homeland rising (catalogue entity or generated) |
| exploration | upstream | Customer–Supplier | Colonies and local people's tiles; resistance (OQ-REBL-13) |
| map-presentation | downstream | Published Language | Steps on the map, rising icons, *Grievances* lens |
| time-and-turns | upstream | Conformist | Monthly order of steps |

## 12. AI

- Rivals and opportunists pay rebels (raising their arms) and attack countries in a great revolt.
  [rebellions §7]
- Cautious AIs grant demands early; harsh AIs massacre. [rebellions §7]
- Opportunists and hegemon seekers fund rebels in a rival's provinces that already have two or more
  grievances, when they have a free envoy seat and gold to spare. [diplomacy §12]
- AI answers use the same commands as the player.

## 13. Open questions and contradictions

- OQ-REBL-1: Province stats 12.1 says at 4 or more grievances "a share of the recruits take up arms each
  month under a named leader"; rebellions 2.1 says a plotting province rises only on a monthly roll (5 / 15 /
  30 %) or a spark, and men then join by class shares (3.1), not from recruits. Which rule forms rebels?
  Province stats is the newer file but points to rebellions for "how risings start". Blocks REBL-005, REBL-024.
- OQ-REBL-2: Religion 18 asks rebellions 2.3 and 5.1 to change the faith demand to "their faith Tolerated, or a
  house of their faith (accepted in a Talk)", and adds the grievance *Persecuted* and new sparks (a faith
  policy step toward Persecuted; taking over a house). Rebellions v1 still says "faith tolerance charter, or a
  ruler of their faith". Not adopted. Blocks REBL-010, REBL-014, REBL-046, REBL-057.
- OQ-REBL-3: Diplomacy 6.11 and 18 ask rebellions to add the grievances *Foreign agitators* (riots need one
  grievance fewer while funded) and *Foreign meddling* (a year after funding is caught). Neither rebellions nor
  province stats 12.1 (nor revolutions' reference list) has them. Not adopted.
- OQ-REBL-4: Revolutions asks rebellions to carry `revolution: <event id>` on a rising, replace the 3.1 join
  table with the family's camps for that rising, and apply `rising_won` / `rising_crushed` when it wins, is
  beaten or melts away. Rebellions v1 has none of this. Revolutions also says a province where the revolution
  camp holds the castle "counts as Risen (rebellions 5)"; rebellions has no *Risen* state (closest: the
  *Rising* tier, 4.1). Revolutions' reference.yaml says a Fight "becomes a great revolt"; its design says "a
  tagged rising". Which is it?
- OQ-REBL-5: The event tree spawns rebels by `type` (peasant, religious, noble, separatist, revolutionary,
  independence, anticolonial) and `size` (small 0.5 … huge 4.0 × the province's `manpower_yield`), with
  `unrest_spawn` 60 and `unrest_guaranteed` 90. No design maps these to the 8 causes, to men drawn by class, or
  to grievances (province stats 15 maps `unrest` only). How does a `rebels` effect become a rising, and what do
  `rebels_active {type}` conditions read?
- OQ-REBL-6: No numbers for: spread chances and each factor; "some gold" for a talk; the bribe price;
  how much "more likely" other provinces become after a grant; how much faster a pardoned province calms;
  how fast a faith rising finds a new preacher; how far lords "waver" after a massacre (one step?).
- OQ-REBL-7: The cause table covers only some grievances. Which cause do *Burned homes*, *Ungoverned*,
  *Plague*, *Bloodshed*, *Requisitioned*, *Neighbour in revolt* and the newer *Persecuted* (religion),
  *Banned tongue* (culture), *Grasping officials* (government) give when they are the heaviest? How is
  "heaviest" measured (counts-as-two, ties)?
- OQ-REBL-8: 4.1 makes "the capital's province" a great revolt; 4.3 makes a rising "in or next to the capital"
  a great revolt at once. Next-to is broader; which governs?
- OQ-REBL-9: When does a disloyal lord choose to revolt (the Lord cause "a disloyal lord's own choice")? Country
  stats 5.2 says a disloyal lord "can rebel or defect"; no rule or chance is given.
- OQ-REBL-10: What does a leader's Logistics do for rebels, and what Might and Cunning values do "Cunning,
  little Might" leaders get?
- OQ-REBL-11: Culture 5.2/6.4: homeland risings with nationalism 0.5+ demand a new country, "not self-rule".
  Rebellions says "self-rule, then independence". How does the two-stage demand work below 0.5 (what is
  self-rule as an outcome)? The won-homeland outcome (6) already breaks away regardless.
- OQ-REBL-12: The New ideas cause needs "the event tree's ideology support" and "later eras": which ideology
  and which threshold, and from which era?
- OQ-REBL-13: Exploration replaces "native uprisings as separate stats and events" with a local aggression roll
  that lowers colony progress, while rebellions keeps resistance when settlers take local tiles. Province stats
  12.3 says colonies only take free tiles, so resistance only starts after conquest or treaty. Do both exist?
- OQ-REBL-14: Recruiting says veterans who keep their arms start any rising "armed and drilled". The arms
  table has no "armed veterans" source (only a veteran leader → Old weapons). Which step do they give?
- OQ-REBL-15: Severity *Riot* is "one province, no army"; the step *Riots* is 3 grievances. Is a riot province
  with no rising a rising object at all (the card appears only on rising)?

## 14. Traceability

| Requirement | Feature file | Scenario |
|---|---|---|
| REBL-001, 002, 003 | rising-steps.feature | Grievance count sets the step |
| REBL-004, 011 | sparks.feature | A spark in a rioting province starts a rising at once |
| REBL-005, 006 | rising-steps.feature | A plotting province rolls to rise each month |
| REBL-007 | rising-steps.feature | A rising musters rebels and shows the card |
| REBL-008 | rising-steps.feature | Each step shows on the map |
| REBL-009 | rising-steps.feature | Homeless count twice above a fifth |
| REBL-010 | sparks.feature | Sparks |
| REBL-012 | sparks.feature | A revolution event starts risings |
| REBL-013, 014, 015 | cause-and-leader.feature | The heaviest grievance sets cause, demand and joiners |
| REBL-016 | cause-and-leader.feature | Settlers taking local tiles start a resistance |
| REBL-017, 020 | cause-and-leader.feature | Leader drawn by cause |
| REBL-018 | cause-and-leader.feature | A preacher spreads the faith twice as fast |
| REBL-019 | strength.feature | A veteran leader raises arms one step |
| REBL-021, 022 | strength.feature | Strength is men times arms times leader times ground |
| REBL-023, 024, 025, 026 | strength.feature | Men join by class shares each month |
| REBL-027, 028 | strength.feature | Arms follow their sources |
| REBL-029, 030 | strength.feature | Ground and walls |
| REBL-031, 032, 033 | strength.feature | Rebels without food shrink |
| REBL-034, 044 | severity-and-spread.feature | Severity tier by size |
| REBL-035, 036, 037 | severity-and-spread.feature | Tier effects |
| REBL-038, 039 | severity-and-spread.feature | Spread factors |
| REBL-040 | severity-and-spread.feature | A disloyal lord joins |
| REBL-041 | answering.feature | Massacre spreads Bloodshed |
| REBL-042, 043 | severity-and-spread.feature | Damage while holding |
| REBL-045 – 050 | answering.feature | The five answers; after a victory |
| REBL-051 – 055 | prevention.feature | Prevention levers |
| REBL-056, 057, 058 | rebels-win.feature | What rebels win |
| REBL-059, 060, 061, 062 | other-systems.feature | Other systems |
| REBL-063 | other-systems.feature | The rebellion card (Troyes) |
| REBL-064 | none | Configuration only; checked by the config schema, not by behaviour |
