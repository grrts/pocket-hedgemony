# Troop movement data

Every value in the game's troop movement config, exactly as the game reads it. This page is made from `packages/rules/data/domain/troop-movement.json` each time the config changes, so it always matches the game. How these values are used is explained on [Troop Movement](Troop-Movement).

Keys are written as in the config file. Shares are fractions (0.25 is 25 %), and values marked (provisional) are placeholders that may still change in balancing. Inventions are shown by id and name; see [Research data](Data-Research#inventions).

> Troop movement (domain/troop-movement/spec.md, troop-movement design v1, decisions D-MOVE-1..20). The march block of defines.json keeps daysPerMonth, daysPerCrossing, daysToCross, horseSpeedBonus and bigArmyExtraCrossings; this file holds the keys of the design's section 13 and the decided ones. Provisional keys are listed in \_provisional.
>
> `turnDays`: X-18: a turn is one week; the weekly steps run at the end of every turn.
>
> `fordMonths`: D-MOVE-10: summer and autumn by the province's hemisphere (X-4).
>
> `moverKindOrder`: X-2: each day armies move, then fleets, then traders (by land and by sea), each kind in ascending id.

| Key | Value |
|---|---|
| `battleStepChoices` | change standing orders, retreat, switch battle |
| `turnDays` | 7 |
| `passRoad` | road |
| `gunsFactor` | 1.25 |
| `gunsGrounds` | hills, mountains, forest, jungle, marsh |
| `cunningSpeed` (provisional) | 0.05 |
| `riverDaysPer10kMen` (provisional) | 1 |
| `greatRiverDaysPer10kMen` (provisional) | 2 |
| `ferryDaysPer10kMen` (provisional) | 2 |
| `retreatMaxProvinces` (provisional) | 3 |
| `splitDays` (provisional) | 2 |
| `joinDays` (provisional) | 1 |
| `refillDaysPer10Pct` (provisional) | 1 |
| `replaySecondsPer10Days` (provisional) | 1 |
| `menPerBoardingDay` (provisional) | 5000 |
| `landingNoPortFactor` (provisional) | 2 |
| `escapeCunning` (provisional) | 4 |
| `foodYellowUnder` (provisional) | 0.5 |
| `passes` (provisional) | Great St Bernard, Khyber, Brenner, Roncesvalles |
| `fords` (provisional) | Ebro at Tortosa, Danube at Vidin |
| `straitCrossings` (provisional) | Bosporus, Øresund, Messina, Kerch, Gibraltar |
| `floodMonths` (provisional) | 3 |
| `greatRiverScaleRanks` (provisional) | 0, 1 |
| `dunesDaysToCross` (provisional) | 3 |
| `raidDaysPerProvince` (provisional) | 7 |
| `moverKindOrder` | army, fleet, trader, trade ship |
| `frontStretch` | even |

## Frozen rivers (provisional)

> `rule`: X-17: rivers at latitude 55 or more freeze December to March and are crossed like a bridge.

| Key | Value |
|---|---|
| `minLatitude` | 55 |
| `months` | 12, 1, 2, 3 |

## Battle steps

> `rule`: X-1: while a player battle runs the day is six 4-hour steps; a battle with no round rule lasts 6 rounds (provisional).

| Key | Value |
|---|---|
| `perDay` | 6 |
| `hours` | 4 |
| `defaultRounds` (provisional) | 6 |

## Road factor (provisional)

| Key | Value |
|---|---|
| `track` | 1 |
| `road` | 0.75 |
| `paved road` | 0.5 |
| `turnpike` | 0.4 |
| `railway` | 0.1 |

## Season factor (provisional)

| Name | factor | grounds |
|---|---|---|
| winter | 2 | tundra, mountains, forest |
| wet | 1.25 | paddies, marsh, jungle |

## Order factor (provisional)

| Key | Value |
|---|---|
| `Normal` | 1 |
| `Forced` | 0.67 |
| `Careful` | 1.33 |
| `Raid` | 0.67 |

## Winter months (provisional)

| Key | Value |
|---|---|
| `north` | 12, 1, 2 |
| `south` | 6, 7, 8 |

## Snow closed months (provisional)

| Key | Value |
|---|---|
| `north` | 12, 1, 2, 3 |
| `south` | 6, 7, 8, 9 |

## Wet season months (provisional)

| Key | Value |
|---|---|
| `monsoon Asia` | 6, 7, 8, 9 |
| `Sahel` | 7, 8, 9 |
| `savanna` | 7, 8, 9 |
| `Amazon` | 12, 1, 2, 3, 4, 5 |

## Ford months (provisional)

| Key | Value |
|---|---|
| `north` | 6, 7, 8, 9, 10, 11 |
| `south` | 12, 1, 2, 3, 4, 5 |
