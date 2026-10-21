# Recruiting data

Every value in the game's recruiting config, exactly as the game reads it. This page is made from `packages/rules/data/domain/recruiting.json` each time the config changes, so it always matches the game. How these values are used is explained on [Recruiting](Recruiting).

Keys are written as in the config file. Shares are fractions (0.25 is 25 %), and values marked (provisional) are placeholders that may still change in balancing. Inventions are shown by id and name; see [Research data](Data-Research#inventions).

> Recruiting (domain/recruiting/spec.md, recruiting design v3, decisions D-RECR-1..24). This file is the recruiting config (D-RECR-19). Every number is a design value or a provisional one for balancing; the provisional keys are listed in \_provisional.
>
> `levyUnit`: RECR-105, F-18: a levy is called in whole thousands (recruiting.levy\_unit, provisional).
>
> `aiCommissionMinMen`: RECR-115, F-28: the AI commissions an official only for at least this many men without a commander (recruiting.ai\_commission\_min\_men, provisional).
>
> `payGroupOfArm`: D-RECR-9: foot are arms without shot, gunners are foot with firearms, horse are other mounted arms, knights are the heavy mounted arms.
>
> `chaplain`: The design gives the chaplain only its trait rule (Beloved when most of the army shares the ruler's faith); its skills are not in the scenarios.
>
> `logisticsFoodCutPerPoint`: Recruiting design §8 worked example: 'The army eats 20 % less (5 % per Logistics point)'.
>
> `students`: D-RECR-13: students are called like a class at the clerks' share (provisional).
>
> `seasonMonthsByClimate`: D-RECR-14: months 1-12. North and south follow X-4 (harvest in September, March); the harvest season is the harvest month and the month before. Rice lands have two crops a year.

| Key | Value |
|---|---|
| `fightingAgeShare` (provisional) | 0.25 |
| `standingRegimentsInvention` | [W12 Standing regiments](Data-Research#inventions) |
| `railwayMobilizationInvention` | [W18 Railway mobilization](Data-Research#inventions) |
| `fallenFadePerYear` (provisional) | 0.1 |
| `fallenYears` | 10 |
| `veteransFadePerYear` (provisional) | 0.1 |
| `birthsCutPerFallenPercent` (provisional) | 0.2 |
| `birthsCutYears` | 10 |
| `levyUnit` (provisional) | 1000 |
| `aiCommissionMinMen` (provisional) | 1000 |
| `levyMoneyPer1000` (provisional) | 20 |
| `freeMonths` | 3 |
| `levyPay` (provisional) | 0.15 |
| `standingPayMultiplier` (provisional) | 1.5 |
| `castles` | earthwork ring fort, stone castle, bastion fort, star fort |
| `veteranTimeFactor` (provisional) | 0.5 |
| `paySpentAtHome` (provisional) | 0.2 |
| `commissionCost` (provisional) | 50 |
| `releaseYearsFactor` | 0.5 |
| `logisticsFoodCutPerPoint` (provisional) | 0.05 |
| `freeMonthsStart` | gathered |
| `riotCallableShare` (provisional) | 0.5 |
| `yearlyMonth` | 1 |
| `landRequestVictories` (provisional) | 6 |
| `lootHomeSplit` | by men taken |

## Call shares (provisional)

| Key | Value |
|---|---|
| `homeless` | 0.24 |
| `herders` | 0.16 |
| `farmers` | 0.12 |
| `woodsmen` | 0.12 |
| `miners` | 0.08 |
| `seafolk` | 0.08 |
| `craftsmen` | 0.08 |
| `market folk` | 0.06 |
| `clerks` | 0.04 |
| `clergy` | 0 |
| `scholars` | 0 |
| `students` | 0.04 |

## Mass conscription

| Key | Value |
|---|---|
| `invention` | [W15 Mass conscription](Data-Research#inventions) |
| `callShareMultiplier` (provisional) | 1.5 |

## Refill per year (provisional)

| Key | Value |
|---|---|
| `base` | 0.25 |
| `musterMaster` | 0.333333 |

## Conscription (provisional)

> `rule`: D-RECR-10: measured on Recruits here after the levy against the ceiling; with W15 the tenth applies even with fallen.

| Key | Value |
|---|---|
| `base` | 0.25 |
| `withFallen` | 0.333333 |
| `massConscription` | 0.1 |

## Gathering

| Key | Value |
|---|---|
| `days` | 14 |
| `months` | 0.5 |
| `railwayDays` (provisional) | 3 |

## Pay by group (provisional)

| Key | Value |
|---|---|
| `foot` | 0.2 |
| `gunners` | 0.25 |
| `horse` | 0.4 |
| `knights` | 0.6 |

## Gun crew (provisional)

| Key | Value |
|---|---|
| `men` | 15 |
| `payPerCrew` | 1 |

## Pay group of arm (provisional)

| Key | Value |
|---|---|
| `levy foot` | levy |
| `pikes` | foot |
| `armoured foot` | foot |
| `archers` | foot |
| `hand gunners` | gunners |
| `pike and shot` | gunners |
| `musketeers` | gunners |
| `line infantry` | gunners |
| `riflemen` | gunners |
| `light horse` | horse |
| `camel riders` | horse |
| `horse archers` | horse |
| `knights and lancers` | knights |
| `war elephants` | knights |
| `gun crews` | gun crews |

## Rations (provisional)

| Key | Value |
|---|---|
| `gathering` | 1 |
| `home` | 1 |
| `camp` | 1.5 |
| `campaign` | 2 |
| `horse` | 3 |

## Harvest loss (provisional)

| Key | Value |
|---|---|
| `farmerShareMultiplier` | 2 |
| `harvestMultiplier` | 1.5 |

## Season months by climate (provisional)

| Name | sowing | harvest |
|---|---|---|
| north | 3, 4 | 8, 9 |
| south | 9, 10 | 2, 3 |
| rice | 5, 6, 11, 12 | 2, 3, 8, 9 |

## Training room (provisional)

| Key | Value |
|---|---|
| `earthwork ring fort` | 1000 |
| `stone castle` | 3000 |
| `bastion fort` | 5000 |
| `star fort` | 8000 |
| `drill yard` | 1500 |
| `barracks` | 4000 |

## Arms (provisional)

| Name | months | gold | needs | also |
|---|---|---|---|---|
| levy foot | 0 | 0 | none |  |
| armoured foot | 2 | 80 | arms: 10 |  |
| pikes | 3 | 60 | arms: 10 |  |
| archers | 4 | 60 | arms: 10 |  |
| hand gunners | 3 | 120 | arms: 10; powder: 10 |  |
| pike and shot | 4 | 150 | arms: 20; powder: 10 |  |
| musketeers | 5 | 180 | arms: 20; powder: 20 |  |
| line infantry | 6 | 220 | arms: 20; powder: 20 |  |
| riflemen | 6 | 300 | arms: 30; powder: 30 |  |
| light horse | 3 | 100 | horses: 1000 |  |
| camel riders | 3 | 100 | camels: 1000 |  |
| horse archers | 6 | 150 | horses: 1000; arms: 10 |  |
| knights and lancers | 9 | 300 | horses: 1500; arms: 20 |  |
| war elephants | 6 | 400 | elephants: 125 |  |
| gun crews | 4 | 200 | powder: 20 | the guns, horses or oxen for them |

## Retrain (provisional)

| Key | Value |
|---|---|
| `months` | 0.5 |
| `gold` | 0.5 |

## Marshal (provisional)

| Key | Value |
|---|---|
| `trainingSpeedUp` | 0.25 |
| `drill` | 4 |
| `hireMultiplier` | 3 |
| `wageMultiplier` | 2 |
| `idleYears` | 10 |
| `idleSkillLoss` | 1 |
| `wonBattlesForOffer` | 3 |

## Trained (provisional)

| Key | Value |
|---|---|
| `drill` | 3 |
| `breakPoint` | 0.3 |

## Untrained (provisional)

| Key | Value |
|---|---|
| `drill` | 0 |
| `breakPoint` | 0.25 |

## Goes home (provisional)

| Key | Value |
|---|---|
| `afterMonths` | 6 |
| `sharePerMonth` | 0.05 |

## Settlers (provisional)

| Key | Value |
|---|---|
| `clearingFactor` | 2 |
| `extraRiotGrievances` | 1 |
| `years` | 10 |
| `becomes` | farmers |

## Loot home (provisional)

| Key | Value |
|---|---|
| `share` | 0.1 |
| `years` | 1 |

## Sickness home (provisional)

| Key | Value |
|---|---|
| `withinMonths` | 3 |
| `oneIn` | 4 |

## Official to commander (provisional)

| Name | might | cunning | logistics | traits | faithful army only |
|---|---|---|---|---|---|
| Warden | 2 | 1 | 1 | Steady, Siege master |  |
| Steward | 0 | 1 | 3 | Careful |  |
| Muster master | 1 | 1 | 2 | Beloved, Old soldier |  |
| Master of works | 0 | 1 | 2 | Siege master |  |
| Tax collector | 0 | 2 | 2 | Greedy |  |
| Customs officer | 0 | 3 | 1 | Careful |  |
| Judge | 1 | 2 | 1 | Steady, Cruel |  |
| Schoolmaster | 0 | 2 | 1 | Old soldier |  |
| Marshal | 2 | 2 | 2 | Any |  |
| Chaplain |  |  |  | Beloved | yes |

## Years served bonus (provisional)

| Key | Value |
|---|---|
| `atYears` | 5, 10 |
| `max` | 5 |

## Field wage multiplier (provisional)

| Key | Value |
|---|---|
| `commander` | 3 |
| `captain` | 2 |

## Staff (provisional)

| Key | Value |
|---|---|
| `commander` | 100 |
| `captain` | 50 |
| `rations` | 2 |
| `commanderHorses` | 30 |
| `horseRations` | 3 |
| `captainHorses` | 15 |

## Deputy (provisional)

| Key | Value |
|---|---|
| `clerksNeeded` | 20 |
| `goldPerMonth` | 1 |

## Empty province

| Name | tax | recruits | state | moved effect | type effect | recruits to retinue | tax to lord | loyalty steps |
|---|---|---|---|---|---|---|---|---|
| Leave it | 0.5 | 0.5 | Ungoverned |  |  |  |  |  |
| Move another official in |  |  |  | 0.5 |  |  |  |  |
| Name a deputy | 1 | 1 |  |  | 0 |  |  |  |
| Ask the lord next door |  |  |  |  |  | 1 | 0.5 | 1 |

## Return bonus (provisional)

| Key | Value |
|---|---|
| `victories` | 3 |
| `factor` | 1.5 |

## Lord training

| Key | Value |
|---|---|
| `Warlike` | knights and lancers, armoured foot |
| `Greedy` | none |

## Ai

| Key | Value |
|---|---|
| `commissionFirst` | Steward, Warden |
| `keepInSeat` | Tax collector |
| `harvestMonthsAvoided` | harvest |

### Personalities

| Name | levy | trains | hires |
|---|---|---|---|
| militarist | deep | expensive arms |  |
| merchant republic | little | nothing | yes |
| steppe realm | normal | horse archers |  |

## Pastoral (provisional)

| Key | Value |
|---|---|
| `herdShareMultiplier` | 2 |

### Spring move

| Key | Value |
|---|---|
| `north` | 3, 4, 5 |
| `south` | 9, 10, 11 |

## Official victory (provisional)

| Key | Value |
|---|---|
| `lordLoyaltySteps` | 1 |
| `rulerVictories` | 1 |

## Their man (provisional)

| Key | Value |
|---|---|
| `victories` | 8 |
| `years` | 5 |
