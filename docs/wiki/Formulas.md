# Formulas

These are the formulas the game computes today, taken from the engine code and not from the design documents. Each formula names the engine file and function it comes from, and each number names its config key and its current value. Where a design rule is not in the engine yet, this page says so. The rules in words are on the system pages ([Warfare](Warfare), [Trade](Trade), [Research](Research), [Provinces](Provinces), [Troop movement](Troop-Movement), [Rebellions](Rebellions), [Your realm](Your-Realm)). Every config value is listed on the data pages, such as [Warfare data](Data-Warfare) and [Core values](Data-Defines).

**Gold** below is treasury gold, the gold your purse shows; where a config file counts gold in a larger unit, the scale is named. **Food** in a store is counted in thousands of people fed for a month, and a **ration** is one person's food for a month. **People** are counted in thousands.

## Battles

A battle is worked out in full the moment it starts, bell by bell, with no dice. The losses are then dealt out over the battle's rounds on the map. The rules are in [Warfare](Warfare); the numbers are in [Warfare data](Data-Warfare) and [Core values](Data-Defines).

### When two armies fight

An army looks for enemies within its engagement range, in tiles, and only fights an enemy army in the same province.

```
range = min(war.engageMax, max(war.engageMin, war.engageBase + Cunning))
```

Here `war.engageBase` (defines.json) is (9), `war.engageMin` (10) and `war.engageMax` (15). An army with no commander uses `war.engageMin` (10). Garrison troops in the province join the side they belong to.

Source: `packages/engine/src/war.ts` (engageRange, engage, joinGarrisons)

### What each side brings

Each side's armies are turned into companies of at most `warfare.company_size.max` (warfare.json) (1000) men per arm. Every company takes its army's kind and drill. Companies start with no scars, so in the game today a company reaches troop level 2 (Drilled) at most. The side is led by the commander with the highest Might among its armies.

The field is a fixed row of sectors chosen by the ground of the defender's tile:

| Ground | Sectors |
|---|---|
| Forest, jungle | Woods, Fields, Woods, Woods, Fields, Woods |
| Hills, mountains | Waste, Pasture, Waste, Fields, Waste |
| Marsh | Marsh, Fields, Marsh, Marsh |
| Desert, drylands, tundra | Waste, Waste, Pasture, Waste, Waste |
| Any other | Pasture, Fields, Fields, Town, Fields, Fields, Pasture |

At most the middle `warfare.battle.max_sectors` (7) sectors are used. A sector's room is `warfare.sectors.<Sector>.room` times `warfare.era_scale.<era>.room` (1 in eras I to V, 0.5 in VI, 0.25 in VII).

Source: `packages/engine/src/war.ts` (battleArmy, battleRow, resolve); `packages/engine/src/domain/warfare/battle.ts` (battlefield, sectorOf)

### Troop level

A company's level comes from its drill and scars, by era:

```
level 2 when drill >= Drilled months
level 3 when drill >= Seasoned months and scars >= 1
level 4 when level 3 and scars >= 3
level 5 when level 4, scars >= 5 and drill >= Elite months
```

The months are `warfare.levels_by_era.<era>.drill` (I: 2, 4, 8; II: 3, 6, 12; III: 4, 8, 12; IV: 6, 12, 18). The scar counts are `warfare.level_scars` (Seasoned 1, Veteran 3, Elite 5). In era I a levy stops at level 3.

Source: `packages/engine/src/domain/warfare/companies.ts` (levelOf)

### Hits per bell

Every company in a sector with an enemy deals hits each bell:

```
hits = share × men × strength × obsolete × (1 + level hits) × (1 + Might bonus)
       × (1 + sector and ground) × inventions × tired × hungry × forced march
```

- `share` is `warfare.hits_per_bell.base` (0.04), at least `era_VI` (0.06) in era VI and `era_VII` (0.08) in era VII.
- `strength` is `warfare.arms.<arm>.strength`, for example levy foot (1.0), knights and lancers (3.5), bombards (5).
- `obsolete` is 0.5 when the enemy knows the invention that made the arm obsolete, else 1.
- `level hits` is `warfare.levels_by_era.<era>.hits` at the company's level (era I and II: −0.10, 0, +0.10, +0.20, +0.30).
- `Might bonus` is `warfare.might_by_era.<era>.hits` × Might (era I: 0.08, II: 0.07, III and IV: 0.05, V: 0.04). Up to era V it counts only in the leader's sector, the sector where his side stood with the most men at the start. In eras VI and VII it counts for the whole army.
- `sector and ground` adds up: the sector's `all` (marsh −0.25); the ground's change for the arm from `province.ground.troops` (province.json), for example horse on grassland +0.25, horse in mountains −0.40; pasture's horse bonus `warfare.sectors.Pasture.horse` (+0.10); the town's `defender` (+0.50) for the defender; a shore's `attack_across` (−0.20) for the attacker.
- `inventions` is `1 + strength %/100`. In the game today this is 0.8 for a realm that does not know C01 *Iron smelting* (`research.without.C01.strength_pct`, −20), else 1.
- `tired` is `1 − warfare.tired.penalty × max(0, bell in a row − warfare.tired.after_bells)`, so −0.10 for each bell past the 3rd in a row.
- `hungry` is `1 + warfare.hunger_hits` (0.8) and `forced march` is `1 + warfare.forced_march.first_day_strength` (0.9). The game does not set either for its battles yet, so both are 1.

Shot fires for a number of bells, then refills for one bell:

```
ammunition bells = warfare.logistics_by_era.<era>.ammo_base + Logistics
```

The battle reads era III's base (3) for eras I and II, so it is 3 + Logistics up to era IV.

Source: `packages/engine/src/domain/warfare/battle.ts` (hitsOf, hitsShare, tiredness, mightEffect, ammunitionBells); `packages/engine/src/domain/warfare/resolver.ts` (fightRounds)

### Charges, braces and shooting

```
charge (Shock, open sector, first contact):   hits × warfare.roles.shock.first_contact (2)
charge into Brace:                            chargers deal × warfare.roles.brace.chargers_deal (0.5)
                                              and take enemy hits × (warfare.roles.brace.chargers_take − 1) (1) more
shooting into a target:                       hits × sector cover × Brace factor × Heavy factor
```

Cover is `warfare.sectors.<Sector>.cover` (Woods and Town 0.5, else 1). Brace targets take `warfare.roles.brace.shot_taken` (×1.5). Heavy targets take half from arrows and spears. Guns hit their own sector and `warfare.roles.guns.reach` (1) sector on each side. The first bell is shooting only, unless a side's approach is Assault, which skips shooting and multiplies all losses by `warfare.assault_losses` (1.25).

Source: `packages/engine/src/domain/warfare/battle.ts` (chargeOf, shotInto, gunTargets, firstBell); `packages/engine/src/domain/warfare/resolver.ts` (fightRounds)

### Who takes the hits

A sector's hits are spread over the enemy companies there by their men. Each hit takes one man out:

```
taken from a company = min(its men, hits × loss multiplier × its men ÷ men targeted)
fled    = taken × flee share
killed  = (taken − fled) ÷ 2
wounded = (taken − fled) ÷ 2
```

The loss multiplier is 1.25 when either side fights by Assault, times `warfare.traits.Reckless.losses` (1.3) for each Reckless commander.

Source: `packages/engine/src/domain/warfare/resolver.ts` (fightRounds, hit); `packages/engine/src/domain/warfare/battle.ts` (splitHits)

### Flee share

```
flee share = warfare.flee.base − warfare.flee.content_factor × content
           = 0.5 − 0.3 × content
```

Hired companies flee at `warfare.flee.hired` (0.3) plus `warfare.flee.per_month_owed` (0.1) per month of pay owed. Rebel bands flee at `warfare.flee.rebel` (0.5). In the game today a battle does not pass the realm's content share, so content counts as 1 and most companies flee at 0.2.

Source: `packages/engine/src/domain/warfare/battle.ts` (fleeShare, fleeFromContent)

### Break point and breaking

```
break point = warfare.kinds.<kind>.break_point + level break + Might break
              + homeland + hungry + pay owed + traits
```

- Base by kind: levy (0.25), retinue (0.35), hired company (0.35), standing regiment (0.30), garrison (0.40), rebel band (0.20).
- `level break` is `warfare.levels_by_era.<era>.break` at levels 3 to 5 (era I and II: +0.05, +0.10, +0.15), none below.
- `Might break` is `warfare.might_by_era.<era>.break` × Might (era I and II: 0.03) in the leader's sector.
- `homeland` is `warfare.break.homeland` (+0.05) when the side's realm owns the battle province.
- `pay owed` is `warfare.break.pay_owed` (−0.05) per month owed; `hungry` is `warfare.break.hungry` (−0.10).
- Traits: `warfare.traits.Steady.army_break` (+0.05), `warfare.traits.Reckless.army_break` (−0.05).

A company breaks when `killed + wounded + fled > men at start × break point`. Its remaining men count as fled.

An army breaks when any of these is true:

```
sectors lost > sectors it started in ÷ 2
losses > men at start × (men-weighted average break point)
camp taken and sectors lost >= sectors started ÷ 3
every company broken
```

If both break in the same bell, the one further past its line breaks:

```
how far past = max(losses ÷ (men × break point), sectors lost ÷ (sectors started ÷ 2))
```

Source: `packages/engine/src/domain/warfare/companies.ts` (breakPoint); `packages/engine/src/domain/warfare/battle.ts` (armyBreaks, whoBreaks); `packages/engine/src/domain/warfare/resolver.ts` (fightRounds)

### Orders, rotation and night

```
orders per bell = warfare.cunning_by_era.<era>.orders[Cunning]
```

The table runs from Cunning 0 to 5: era I (1, 1, 2, 2, 2, 2), eras II to V (1, 1, 2, 2, 3, 3). The commander with less Cunning gives his orders first. Each bell a side swaps up to Logistics tired companies (3 bells or more in a row) for fresh ones from reserve. After `warfare.battle.bells_per_day` (6) bells, night falls: half of each unbroken company's fled men come back (`warfare.after.fled_return`, 0.5). After `warfare.era_scale.<era>.max_days` (3 in eras I to V) days with no break, the attacker pulls back and the defender holds the field.

Source: `packages/engine/src/domain/warfare/battle.ts` (ordersPerBell, overnight); `packages/engine/src/domain/warfare/resolver.ts` (fightRounds)

### Losses on the map

The battle's result is dealt out over rounds of 4 hours:

```
rounds = max(1, ceil((attacker men + defender men) ÷ war.menPerBattleRound))
```

`war.menPerBattleRound` (defines.json) is (6000). Each round a side loses its share of its final losses. The final loss of a side is:

```
side that holds the field: killed + wounded × (1 − 2/3) + fled × (1 − 0.5)
side that loses:           killed + wounded + fled × (1 − 0.5)
```

The field-holder's wounded come back at `warfare.after.wounded_return` (2/3); the loser's wounded become prisoners. Half of the fled (`warfare.after.fled_return`, 0.5) come back. A beaten army with fewer than `war.disperseBelow` (100) men scatters; half its men go home to the recruit pools.

Source: `packages/engine/src/war.ts` (resolve, fightRound, shareLosses, fallBack, disperse); `packages/engine/src/domain/warfare/battle.ts` (woundedAfter, fledAfter)

## Sieges and storming

Sieges are explained in [Warfare](Warfare). In the game today a siege has no guns: the besiegers always mine.

### Walls and garrison

A province has walls when it has a castle work. Every capital has a stone castle.

```
walls = stone castle (capital, or castle step 2) or earthwork ring fort (castle step 1)
garrison room = war.garrison.capital (1500), war.garrison.castle (1000) or war.garrison.fort (500), × heritage
refill a month = garrison room × war.garrisonRecoveryPerMonth (0.1), when no enemy stands there
walls bonus = (warfare.castles.<castle>.walls + warfare.castle_ground.<ground>) × max(0, 1 − breaches ÷ 3)
```

Stone castle walls are (1.00), earthwork ring forts (0.50); hills add (0.25) and mountains (0.50).

Source: `packages/engine/src/war.ts` (wallsOf, maxGarrison, refillGarrison); `packages/engine/src/domain/warfare/sieges.ts` (wallsBonus, wallsWithBreaches)

### A siege month

A siege month is every 28 days. The castle store starts at `garrison × war.castleStoreMonths` (6) rations.

```
closed      = besiegers >= garrison × warfare.siege.close_ratio (3)
eaten       = garrison × warfare.siege.ration (1)
hunger loss = garrison × warfare.siege.hunger_loss (0.10), when the store runs short
mining      = +1 month of mining; one breach every warfare.castles.<castle>.mining_months
```

Stone castles take (4) months per breach, earthwork ring forts (2). A castle that is not closed gets its food back each month.

Source: `packages/engine/src/war.ts` (runOccupation); `packages/engine/src/domain/warfare/sieges.ts` (siegeMonth, isClosed, breachSpeed)

### Terms and storming

After each siege month the garrison gives up when it has a breach, or less than `warfare.ai_honours.food_months` (1) month of food:

```
food months = store ÷ (garrison × 1)
```

It surrenders as prisoners when starving, otherwise it marches out with honours. If it holds, the besiegers storm when the walls allow it (a breach, or an earthwork ring fort, which can be scaled) and:

```
besiegers >= garrison × warden × war.stormRatio (4)
stormers lost = garrison × warden × storm losses × (1 + walls bonus)
```

`warden` is 1 + `province.officials.effects.warden.garrison` (0.25) × his effect share, else 1. Storm losses are `warfare.storm.losses` (1.5), or `warfare.storm.scaling` (2) when scaling an earthwork ring fort. A province with no walls is occupied after `war.holdWeeks` (4) weeks of holding it.

Source: `packages/engine/src/war.ts` (runOccupation); `packages/engine/src/domain/warfare/sieges.ts` (aiAcceptsHonours, stormable, storm, foodMonths)

## Food

Harvests, stores and castles are explained in [Your realm](Your-Realm) and [Provinces](Provinces). Their numbers are in [Province data](Data-Province), [Realm data](Data-Realm) and [Core values](Data-Defines).

### What the land feeds

Each food class (farmers, herders, seafolk, woodsmen) feeds people a year:

```
food = ((workers − in slots) × bare rate + (in slots − on worn fields × 0.5) × building rate) × land yield
bare rate = province.food.bare_per_worker (0.67) × the ground's people output
building rate = farm rate (or food_per_worker) × the ground's building output, halved toward bare while works are neglected
slots = tiles of the class's use × buildings.land.<building>.slots ÷ 1000 × works.slotScale (2.5)
```

A farm's rate is `works.farmRates` (defines.json) by its step (1.1, 1.3, 1.5). A ranch and a fishery give `food_per_worker` (1.33). Land yield is set once at the start so a province about feeds `works.seedFoodShare` (1.1) of its people, at most `works.maxLandYield` (3). Without a building, all workers are on bare land.

Source: `packages/engine/src/land.ts` (classFood); `packages/engine/src/works.ts` (worksFood, seedWorks)

### The harvest

The harvest comes in month `realm.food_year.harvest_month.north` (9) north of the equator and `south` (3) south of it. Rice lands of a realm that knows *Wet-rice terracing* harvest in both months; the tundra has none.

```
band = base roll + weather + war + harvest steps   (kept between failed and bumper)
harvest food = farmers' food × province.food.harvest.<band> × 12 ÷ harvests a year × steward
```

- Base roll: `realm.food_year.base_harvest`: poor (0.1), normal (0.7), good (0.15), bumper (0.05).
- Weather, rolled once per region of about 10 degrees: −1 band for bad, +1 for good. Bad weather is 1 in `bad_one_in` (temperate 6, dry 4, monsoon 5); good is 1 in `good_one_in` (temperate 6, dry 8, monsoon 6).
- War: −1 band while the province is occupied or besieged.
- Harvest steps: +1 band per harvest invention known; −1 without F01 *Ox plough*.
- Bands: `province.food.harvest`: failed (0.3), poor (0.7), normal (1.0), good (1.15), bumper (1.3).
- Steward: 1 + `province.officials.effects.steward.food` (0.10) × his effect share.

Source: `packages/engine/src/food.ts` (monthlyFood, harvestMonthsOf); `packages/engine/src/domain/realm/index.ts` (rollBaseHarvest, weatherFor)

### Eating and rot

Every month:

```
store = store + herders' + seafolk's + woodsmen's food − people
```

In March, June, September and December a province store loses `realm.food_year.rot_per_season` (0.05). A castle store loses the same, or `rot_per_season_with_granary` (0.025) with a granary.

Source: `packages/engine/src/food.ts` (monthlyFood); `packages/engine/src/castleFood.ts` (shareFood)

### Castles collect and hand out

At a province's harvest its castle collects:

```
sent = (store − people × castleFood.keepMonths) × collection % × lord share
arrives = sent × (1 − realm.food_year.transfer_loss_per_province × ring)
```

`castleFood.keepMonths` (defines.json) is (12). The collection share is your food policy (0, 25, 50 or 75 %). A lord's share is `realm.food.lords_castles` by his loyalty (Loyal 1, Wavering 0.5, else 0). The loss is (0.02) per ring. A province store above `castleFood.localStoreCapMonths` (18) months goes by the surplus rule. Food sold to the treasury pays:

```
gold = food × realm.grain_price_gold_per_food (0.5) × castleFood.grainGoldScale (0.008)
```

Source: `packages/engine/src/castleFood.ts` (shareFood, disposeSurplus)

### Relief and famine

A province with a negative store first takes food from neighbours of the same realm that hold more than `living.reliefAboveMonths` (3) months. What is still missing starves:

```
unfed = min(shortfall ÷ 3, people ÷ 3, room ÷ (1 − flee))
room  = (people + starved this year) × province.famine.year_share (0.2) − starved this year
flee  = 0.25 if a neighbour holds more than 3 months of food, else 0
```

The fled quarter become homeless in that neighbour. Every class shrinks by the same share.

Source: `packages/engine/src/food.ts` (monthlyFood, neighbourWithFood)

### Feeding an army

An army eats each day a thirtieth of its monthly rations:

```
rations a month = (men × march.rationsPerSoldier × campaign + horses × march.rationsPerHorse)
                  × max(0, 1 − Logistics × march.logisticsRationCut)
wagons hold     = rations a month on campaign × march.monthsCarried × food carried %
```

`march.rationsPerSoldier` (1), `march.rationsPerHorse` (3), `march.logisticsRationCut` (0.05) and `march.monthsCarried` (2) are in defines.json. `campaign` is `realm.food.campaign_eat` (2) while the realm is at war or the army stands outside its land, else 1. Food carried is 50 % without B01 *Wheel and carts* (`research.without.B01.food_carried_pct`).

The army refills its wagons each day from the store where it stands:

```
refill a month = max(0, store × 1000 − reserve) × march.foraging.<ground>
reserve        = people × 1000 × march.homeReserveMonths (2) at home or in neutral land; 0 in enemy land
```

Foraging runs from desert and tundra (0.1) to farmland (1). An army with empty wagons goes hungry:

```
men lost a day = men × march.hungerLossPerMonth (0.28) ÷ 30 × share of the day's food missing
```

Horses are lost at the same rate. Of the men lost, `warfare.hunger.die ÷ (die + desert)` (2/7) count as dead.

Sickness on campaign and camp fever in sieges are not in the game yet.

Source: `packages/engine/src/march.ts` (monthlyRations, wagonRations, refillRations); `packages/engine/src/turn.ts` (feedArmies, refillHere, campaigning)

## Money

The treasury and tax are explained in [Your realm](Your-Realm). The numbers are in [Core values](Data-Defines), [Realm data](Data-Realm) and [Recruiting data](Data-Recruiting).

### The monthly ledger

On the 1st of each month:

```
change = tax + trade + grain + tribute + furs − army pay − officials − interest − works − schools − navy
```

Source: `packages/engine/src/treasury.ts` (runLedger, sumLedger)

### Tax

```
tax a month = people × economy.goldPerThousandPeoplePerMonth × rate × crown share
              × tax collector × faith × heritage × trade × quarantine
```

- `economy.goldPerThousandPeoplePerMonth` (defines.json) is (0.004).
- `rate` is `economy.taxRateFactor` for none, light, normal, heavy, crushing (0, 0.5, 1, 1.5, 2).
- `crown share` = no official × mood × lord. No official is `recruiting.emptyProvince."Leave it".tax` (0.5). Mood is `province.tax.riots_factor` (0.5) while rioting or plotting, 0 while rebels hold the province. A Loyal or Wavering lord keeps `realm.lords.tax_share` (0.5); a Disloyal lord or one in revolt sends nothing.
- `tax collector` is 1 + `province.officials.effects.tax collector.tax_reach` (0.20) × his effect share.
- `faith` is the province's faith tax factor: more for a Restricted faith, nothing for a Persecuted one, else 1. `heritage` is your heritage's tax reach, 1 without one.
- `trade` is `1 + floor(trade ratio ÷ trade.effects.tax_per_ratio_points.points) × tax`, so +1 % per 4 points of ratio.
- `quarantine` is `province.plague.quarantine_tax_factor` (0.5) while the province is closed.

An occupier collects `warfare.occupation.tax_share` (0.5) of what the province would pay its owner.

An official's effect share grows with his years served:

```
share = 0.5 in his first year, then 0.5 + 0.5 × (years − 1) ÷ 4, and 1 from 5 years
```

These are `province.officials.first_year_share` (0.5) and `full_effect_years` (5). His years count at half pace in a realm of low Tongue %.

Source: `packages/engine/src/treasury.ts` (provinceTax, crownTake, heldTax); `packages/engine/src/lords.ts` (crownShare); `packages/engine/src/moods.ts` (moodShare); `packages/engine/src/officials.ts` (officialBonus); `packages/engine/src/domain/province/rule.ts` (officialEffectShare)

### Army pay

```
pay a month = sum over arms (men of the arm × pay per man of its group) × kind multiplier × recruit.goldScale
```

- Pay per man: `recruiting.levyPay` (0.15) for levy foot; `recruiting.payByGroup` foot (0.2), gunners (0.25), horse (0.4), knights (0.6); gun crews `gunCrew.payPerCrew` (1) per `gunCrew.men` (15).
- Kind multiplier: `warfare.kinds.<kind>.pay.multiplier`: levy (1), retinue (0), hired company (3), standing regiment (1.5), garrison (1).
- `recruit.goldScale` (defines.json) is (0.004).
- A levy is free while it has been out `warfare.levy.free_months` (3) months or less and its realm is at peace.

Men over the troop cap are paid twice:

```
realm pay = pay + (pay ÷ men) × min(men over the cap, men)
```

Calling a levy costs `men ÷ 1000 × recruiting.levyMoneyPer1000 (20) × recruit.goldScale (0.004)` at once.

Source: `packages/engine/src/recruit.ts` (armyPay, allNationPay, withOverCap, recruit); `packages/engine/src/domain/recruiting/index.ts` (regimentPay, levyMoney)

### Troop cap and desertion

```
troop cap = sum over royal provinces you hold of people × 1000 × warfare.troop_cap.without
```

`warfare.troop_cap.without` is (0.01). W12 adds `w12` (0.005), W15 multiplies by `w15` (2), W18 adds `w18` (0.01). Lords' provinces and occupied provinces add nothing. Every soldier in an army counts against it except retinues, and so do men still gathering and hired companies under contract.

Each month an army loses men to desertion:

```
share lost = over-cap desertion + unpaid desertion
```

Over-cap desertion is `warfare.over_cap.desertion` (0.05) for levies while the realm is over its cap. Unpaid desertion is `recruit.unpaidDesertion` (defines.json) (0.05) for every army while the treasury is below zero.

Source: `packages/engine/src/recruit.ts` (recomputeCap, monthlyRecruits); `packages/engine/src/domain/warfare/stats.ts` (capShare, overCap)

### Recruits

```
ceiling = people × levies.menPerThousandPeople (30) × (1 + works.drillYardRecruits (0.15) × drill yard step)
refill a month = (ceiling − recruits) × refillPerYear.base ÷ 12 × muster master × heritage × fallen × no official × mood
```

`recruiting.refillPerYear.base` is (0.25). A muster master adds `province.officials.effects.muster master.recruit_refill` (0.25) × his share. The fallen factor is `max(realm.fallen.refill_floor (0.5), 1 − fallen in 10 years ÷ ceiling × refill_slow_per_ceiling (0.5))`.

Source: `packages/engine/src/recruit.ts` (monthlyRecruits); `packages/engine/src/works.ts` (refreshRecruitCeiling); `packages/engine/src/fallen.ts` (refillPaces)

### Officials, loans and schools

```
official wage a month = economy.officialWagePerMonth (0.1) × heritage
interest a month      = debt × realm.debt.interest_pct (10) ÷ 100 ÷ 12
debt added by a loan  = gold × (1 + 10 ÷ 100 × realm.debt.interest_added_at_once_years (1))
most you can borrow   = (12 × (tax + trade) × realm.debt.loan_cap_years_income (1) − debt) ÷ 1.1
school upkeep a month = sum of research.school_upkeep.<school> ÷ 12, changed by inventions
```

School upkeep is temple or monastery school (2), madrasa (4), university (4), academy (6) a year.

Source: `packages/engine/src/treasury.ts` (runLedger, monthlyInterest, loanDebt, canBorrow); `packages/engine/src/research.ts` (schoolUpkeepMonthly)

### Buildings

```
cost   = data gold × works.goldScale (0.2) × (1 − works.materialsAtHandSaving (0.2)) per material at hand × heritage
upkeep a month = (step upkeep a year, or works.defaultUpkeepPerYear (0.25)) × works.goldScale (0.2) ÷ 12
```

Timber is at hand with a lumber camp, stone or bricks with a quarry. While your treasury is below zero your works are neglected and give half their effect.

What works do in the game today:

- Farm: farmers in its slots feed `works.farmRates` (1.1, 1.3, 1.5) by step.
- Road: march hours in the province × `1 − works.roadSpeed (0.15) × step`.
- Drill yard: recruit ceiling × `1 + 0.15 × step`.
- Market: trade weight and visits served (see Trade); harbour: +0.25 weight for ships.

Source: `packages/engine/src/works.ts` (workCost, workUpkeep, provinceUpkeep, judgeNeglect, roadHours)

## Trade

Trade is explained in [Trade](Trade). The numbers are in [Trade data](Data-Trade).

### Trade value

```
goods value a year = sum over wares (loads × price per load)
trade value a month = goods value × (1 + weights) ÷ 12 × trade.game.value_scale (0.08)
```

- Wares: what the province's works make; the food surplus `max(0, yearly food − people) × trade.game.food_loads_per_thousand_fed (1)` as grain; craftsmen (thousands) × `crafts_loads_per_thousand` (1) as crafts.
- Prices: `trade.value.price_per_load`: staples (1), raw (2), finished (5), luxury (10), precious (12). Crafts count as finished.
- Weights: the market step (`weekly_market` 0.25, `yearly_fair` 0.5, `trading_house` 1.0), plus `harbour` (0.25) for ships. Weights are halved while your works are neglected.

Values are counted again each January.

Source: `packages/engine/src/trade.ts` (provinceWares, warePrice, weights, tradeValueAt, refreshTradeValues)

### Collecting

Each time a trader enters a province:

```
collected = trade value × ratio ÷ 100 × hold × trade.collect.visit_share (0.2) × min(1, served ÷ visits this month)
purse     = min(purse cap, purse + collected)
purse cap = trader purse × trade.game.purse_scale (0.2)
```

- Hold: `trade.land_traders.<kind>.hold` (pack caravan 1.0, camel caravan 1.5, river barge 1.5) or `sea_traders.cog_junk_dhow.hold` (2.0).
- Served visits: 2 with no market (`serves_without_market`), then 4, 8, 16 by market step.
- In another realm's province the owner takes `trade.collect.foreign_market_fee` (0.1) of it. Unclaimed and occupied provinces pay nothing.

The trader empties its purse into your treasury in any trade city of yours it enters.

Source: `packages/engine/src/trade.ts` (walk, served, kindRow, depositsAt)

### Ratio gain and decay

At the end of each month:

```
gain      = trade.ratio.gain_per_trader (3) × traders passing × (1 − ratio ÷ 100) × modifier
new ratio = min(100, max(0, ratio + gain − ratio × trade.ratio.decay_share (0.1)))
modifier  = max(0, 1 + customs officer + riots + commodore)
```

- A trader counts once per province per month. A ship sailing a sea lane counts `trade.ratio.sea_lane_trader_weight` (0.5) for each port on that lane.
- Customs officer: `province.officials.effects.customs officer.trade_ratio_gain` (0.15) × his share.
- Riots: `trade.ratio.modifiers.riots` (−0.5) while rioting or plotting.
- Commodore lying off the port: `naval.admiralPosts.commodore.tradeGain` (0.25).
- The modifier is 0 while the province is occupied, besieged or blockaded. A quarantined province's ratio is set to 0.

With one trader passing every month the ratio settles where gain equals decay: `3 × (1 − r/100) = 0.1 × r`, so about 23.

Source: `packages/engine/src/trade.ts` (updateRatios)

### Traders on the road and their cost

A trader walks `march.daysPerMonth` (30) days a month, plus what it had left over.

```
land step days = march.daysToCross.<ground> × march.daysPerCrossing (6) × road hours × step factor
```

Step factors: pack caravan (0.75), camel caravan (0.75, or 0.5 in desert and drylands), river barge (0.4, rivers only). A cog takes `naval.ships.cog.stepDays` sea (2) or ocean (3) days a zone, and 1 day into a port.

```
trade line = deposits + market fees received − upkeep
upkeep a month = trade.land_traders.<kind>.upkeep × works.goldScale (0.2)
```

Pack caravan upkeep is (0.5), so 0.1 gold a month. A cog's is `naval.ships.cog.upkeep` (1) × 0.2. A trader unpaid for `trade.upkeep.unpaid_months_to_lose` (6) months in a row is lost.

Source: `packages/engine/src/trade.ts` (stepDays, monthlyTrade, tradeLine, kindRow)

## Research

Research is explained in [Research](Research). The numbers are in [Research data](Data-Research).

### Scholar-years

```
scholar-years a month = (scholars × research.scholar_rate (1) + students × research.student_rate (0.2)) ÷ 12
progress on a study  += scholar-years × study share × (1 + research bonus % ÷ 100)
```

The study share is `research.second_study_share` (0.5) with two studies, else 1. Research stops while no school is open, or after students were called to arms until they enrol again.

Source: `packages/engine/src/domain/research/index.ts` (researchPerYear, researchMonth, addProgress, researchBonusPct)

### Invention cost

```
era cost = research.era_cost.<era> × era I pace
ahead    = era cost × research.ahead_multiplier (2) ^ eras ahead of the date
behind   = ahead × (1 − min(research.behind_discount_cap_pct (50), research.behind_discount_pct_per_era (25) × eras behind) ÷ 100)
cost     = max(era cost × research.cost_floor_share (0.2), behind × (1 − spread % ÷ 100))
```

- Era costs: Ancient (10), Medieval (15), I (20), II (40), III (80), IV (150), V (250), VI (400), VII (650).
- Era I pace: `max(1, (research.era_dates.II − start year) ÷ research.era_pace.reference_years (56))`. A 1378 start gives (1500 − 1378) ÷ 56 ≈ 2.18. Other eras are ×1.
- The era of the date: I from 1378, II from 1500, III from 1600, IV from 1700, V from 1800, VI from 1870, VII from 1914 (`research.era_dates`).

So in Era I an Ancient invention costs 10 × 0.5 = 5 before spread, and a Medieval one 15 × 0.75 = 11.25.

Source: `packages/engine/src/domain/research/index.ts` (eraCostFor, eraPace, costBeforeDiscounts, behindDiscountPct, discountedCost, studyCostFor)

### Spread

```
spread % = min(research.spread_cap_pct (60), per neighbour % × neighbours who know it)
per neighbour % = research.spread_per_partner_pct (10) × (1 + spread bonus % of known inventions ÷ 100)
```

In the game today a neighbour is a realm that owns a province bordering one of yours by land. Neighbours are counted again each January. Trade partners do not count yet.

Source: `packages/engine/src/domain/research/index.ts` (spreadPerPartnerPct, studyCostFor); `packages/engine/src/research.ts` (refreshNeighbours, partnersKnowing)

### Schools, students and scholars

```
seats    = sum over open schools of research.school_seats.<school>
students wanted = min(seats you set, seats) − students
```

Seats: temple or monastery school (20), madrasa (30), university (60), academy (100). Students come out of your royal provinces' recruit pools, each giving the same share. Each January:

```
graduates   = every cohort enrolled research.graduation_years (5) or more years ago
scholars lost to old age = floor(scholars ÷ research.old_age_one_in (30))
```

Inventions such as L10 raise `old_age_one_in`. The Schoolmaster's year sooner is not in the game yet.

Source: `packages/engine/src/research.ts` (enrol, takeRecruits, monthlyResearch); `packages/engine/src/domain/research/index.ts` (seats, fillSeats, graduateYear, oldAgeLoss)

### Without the past inventions

A realm that lacks a past invention pays for it elsewhere (`research.without`):

- Without F01: −1 harvest step.
- Without F03: no horse arms and no camel caravans.
- Without B01: wagons hold 50 % of the food.
- Without C01: hits × 0.8 in battle.

Source: `packages/engine/src/domain/research/index.ts` (without); `packages/engine/src/research.ts` (withoutOf)

## Movement

Marching is explained in [Troop movement](Troop-Movement). The numbers are in [Core values](Data-Defines) under `march`.

### Hours to cross a tile

An army walks over the map's tiles. Each step onto a land tile takes:

```
pace  = march.daysPerCrossing × 24 ÷ march.tilesPerCrossing ÷ (1 + march.horseSpeedBonus × horses ÷ men)
hours = pace × (march.daysToCross.<ground> + column) × across × (1 + march.snowSlowdown × snow) × road
        + march.riverCrossingDays × 24 when stepping onto a river from a tile without one
```

- `march.daysPerCrossing` (6), `march.tilesPerCrossing` (14) and `march.horseSpeedBonus` (0.5): a foot army crosses a farmland tile in about 10.3 hours, a horse-only army in about 6.9.
- `march.daysToCross`: farmland, grassland, savanna (1); drylands, hills (1.5); desert, forest, tundra (2); mountains, jungle, marsh (3).
- `column` is `march.bigArmyExtraCrossings` (1) when the army has more men than the province's forage limit, else 0.
- `across` is 1 north or south, the row's east-west width on the map going east or west, and the diagonal of the two going slantwise.
- `road` is `1 − works.roadSpeed (0.15) × road step` of the province.
- `march.riverCrossingDays` is (1), whatever the army's size.

Snow comes from the province's temperature today, cooled 6.5 °C per km of the tile's height:

```
t    = clamp((1 − temperature) ÷ 6, 0, 1)
snow = t × t × (3 − 2t)
```

So there is no snow at 1 °C or warmer, and full snow, doubling the hours, at −5 °C or colder.

Forced march, march orders, the Cunning bonus, the guns penalty and great rivers are not in the game yet.

Source: `packages/engine/src/march.ts` (tileStepHours, tilePace, forageLimitOf); `packages/engine/src/climate.ts` (snowCover); `packages/engine/src/works.ts` (roadHours)

### Forage limit and route days

```
forage limit = people × 1000 × march.rationsStoredPerPerson (0.5) × march.foraging.<ground> ÷ march.rationsPerSoldier (1)
```

The route planner first picks the provinces to pass through with the same numbers counted per province (half of each ground's crossing, the column and the river), then walks the tiles.

Source: `packages/engine/src/march.ts` (forageLimit, stepDays, planRoute)

## Population, unrest and rebellion

People and moods are explained in [Provinces](Provinces); risings in [Rebellions](Rebellions). The numbers are in [Province data](Data-Province) and [Rebellions data](Data-Rebellions).

### Births and deaths

Each month every class changes by a twelfth of its yearly rate:

```
net  = province.births.<class> − province.deaths.<class> − war − plague
rate = net × heritage growth, when net is above 0; net otherwise
class people = class people × (1 + rate ÷ 12)
```

- Births: farmers, herders, woodsmen, seafolk (0.036); homeless (0.04); miners (0.035); craftsmen, market folk, clerks (0.03); clergy (0.005); scholars (0.01).
- Deaths: land classes and clergy and scholars (0.03); miners (0.04); craftsmen, market folk, clerks (0.035); homeless (0.05).
- War: `province.death_modifiers.war` (0.01) while the province is occupied, besieged or fought in.
- Plague: `province.decided.birth_points.plague` (−1 point, so 0.01) while plague is in the province.

Food does not change births: a hungry province goes on having children, and its shortage shows as famine. Other birth and death changes (peace, burned tiles) are not in the game yet. Famine deaths are under Food.

Source: `packages/engine/src/living.ts` (monthlyPeople); `packages/engine/src/domain/province/people.ts` (birthRate, deathRate, deathModifiers)

### Grievances and mood

```
count = grievances held + (taxWeight − 1 when Heavy taxes is held) + 1 more when Persecuted
```

`taxWeight` is `province.tax.heavy_weight` (heavy 1, crushing 2). The mood follows the count: grumbling at `province.grievances.levels.grumbling` (2), rioting at `riots` (3, one more with a judge, `province.decided.judge_riots_extra`), plotting at `province.decided.plotting_at` (4).

Some grievances start and end by thresholds:

- Hungry: starts under `province.grievances.hungry.starts_below_months` (1) month of food, ends above `ends_above_months` (3).
- Conscription: starts when recruits fall under `province.recruits.conscription_below` (0.25) of the ceiling, ends at `conscription_ends_at` (0.5).
- Soldiers quartered: an army stood there longer than one season (3 months).
- Bloodshed: a battle there in the last `province.grievances.bloodshed_years` (20) years.

Source: `packages/engine/src/moods.ts` (grievanceCount, taxWeight, moodIndex, monthlyMoods); `packages/engine/src/domain/province/decided.ts` (moodOf)

### The chance to rise

A plotting province rolls each month:

```
chance = province.decided.rise_chance.<count>   (4: 0.05, 5: 0.15, 6 or more: 0.30)
         × realm.belief.revolt_factor (1.5) for a Faith or Homeland cause in a realm of low Faith or Tongue
         + rebellions.provisional.grant_points (5) ÷ 100 while a granted demand of the same cause emboldens the realm
```

A Faith rising's chance also changes by the ruler's traits. A low share is under `realm.belief.low_percent` (50). A spark (a raised tax, a lost battle nearby) starts a rising at once in a rioting province.

Source: `packages/engine/src/moods.ts` (risingChance); `packages/engine/src/domain/province/decided.ts` (riseChance); `packages/engine/src/rebels.ts` (risingChanceIn, monthlyRebels, spark); `packages/engine/src/belief.ts` (beliefRevoltFactor)

### A rising's band

```
men joining a month = floor(recruits × join share)
join share = sum over classes (people of the class × rebellions.join_share for it) ÷ people
spread chance = rebellions.provisional.spread_chance_per_month (0.1) to each neighbour of the realm with 3 or more grievances
```

Join shares are `rebellions.join_share`: homeless (0.3), the class the cause belongs to (0.1), faith or tongue causes (0.08), others (0.02). A band eats `men ÷ 1000` from the store where it stands. A band that holds no castle and has no lord or foreign backer loses `rebellions.starving_loss` (0.1) of its men a month when it has no food or fights only with tools. It melts away under `rebellions.provisional.melts_below_men` (200) men.

Source: `packages/engine/src/rebels.ts` (joinShare, muster, monthlyBand)
