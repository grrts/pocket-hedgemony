# Time and turns data

Every value in the game's time and turns config, exactly as the game reads it. This page is made from `packages/rules/data/domain/time-and-turns.json` each time the config changes, so it always matches the game. How these values are used is explained on [Time and Turns](Time-and-Turns).

Keys are written as in the config file. Shares are fractions (0.25 is 25 %), and values marked (provisional) are placeholders that may still change in balancing. Inventions are shown by id and name; see [Research data](Data-Research#inventions).

> Time and turns (domain/time-and-turns/spec.md). Turn order from DECISIONS X-2, weeks X-3, seasons X-4, start date X-25 (the start scenario's day, packages/rules/data/scenarios), victory timing X-12, the 1939 cut X-14. Wet seasons are placeholders; ages from event-tree/data/ages.yaml.

| Key | Value |
|---|---|
| `endDate` | 1939-08-31 |
| `campaignRules` | difficulty, aiAggression, fogOfWar, events, ironman, endDate, musicEras |
| `dayPhases` | move, stopChecks, contact, battles, standingOrders |
| `turnStages` | apply orders, day loop, monthly steps, seasonal steps, yearly steps, events, checks, achievements, autosave, advance the date |
| `monthlyContextOrder` | warfare, naval, exploration, province, buildings, recruiting, realm, research, trade, subjects, government, diplomacy, culture, religion, rebellions, revolutions |
| `afterTurnChecks` | attention and tutorial checks |
| `lastOfTurn` | achievement tests |
| `yearlyMonth` | 1 |
| `fiveYearlyEvery` | 5 |
| `ageStartsOnPostEndEvent` | age\_of\_decolonization |
| `battleStepsPerDay` | 6 |
| `turnDays` | 7 |

## Mover kind order

- army
- fleet
- trader, trade ship
- exploration ship

## Battle days

| Key | Value |
|---|---|
| `min` | 1 |
| `max` | 3 |

## Cadences

| Name | step | context | cadence | phase | kind | aka | after day loop |
|---|---|---|---|---|---|---|---|
| 1 | where movers stand | troop-movement | daily | move |  |  |  |
| 2 | armies marching | troop-movement | daily | move | army |  |  |
| 3 | fleets sailing | naval | daily | move | fleet |  |  |
| 4 | traders travelling | trade | daily | move | trader |  |  |
| 5 | who meets whom | troop-movement | daily | contact |  |  |  |
| 6 | armies set to attack looking at visible enemies | troop-movement | daily | standingOrders |  |  |  |
| 7 | an army abroad eats from its reserve | warfare | weekly |  |  |  |  |
| 8 | an army at home takes its week's meals | warfare | weekly |  |  |  |  |
| 9 | hunger in an army with no food | warfare | weekly |  |  |  |  |
| 10 | plunder burning one tile | warfare | weekly |  |  |  |  |
| 11 | a raid burning one tile and moving on | warfare | weekly |  |  |  |  |
| 12 | forced-march desertion of 2 % of levies | warfare | weekly |  |  |  |  |
| 13 | plague while an outbreak runs | province | weekly |  |  |  |  |
| 14 | births, deaths and overflow | province | monthly |  |  |  |  |
| 15 | building upkeep and construction sites | buildings | monthly |  |  |  |  |
| 16 | AI looks at one province per country for building | buildings | monthly |  |  |  |  |
| 17 | siege month | warfare | monthly |  |  | sieges |  |
| 18 | sickness on campaign | warfare | monthly |  |  | sickness |  |
| 19 | pay owed, months out, drill | warfare | monthly |  |  | pay |  |
| 20 | reserve rot | warfare | monthly |  |  |  |  |
| 21 | storms at sea in storm season | naval | monthly |  |  |  |  |
| 22 | trade ratio gain and decay | trade | monthly |  |  |  | yes |
| 23 | trader upkeep | trade | monthly |  |  |  |  |
| 24 | colony progress and colony food | exploration | monthly |  |  |  |  |
| 25 | recruit pool refill | recruiting | monthly |  |  |  |  |
| 26 | realm treasury and lords | realm | monthly |  |  |  |  |
| 27 | research progress | research | monthly |  |  |  |  |
| 28 | government monthly step | government | monthly |  |  |  |  |
| 29 | culture monthly step | culture | monthly |  |  |  |  |
| 30 | religion monthly step | religion | monthly |  |  |  |  |
| 31 | rising chance in plotting provinces | rebellions | monthly |  |  |  |  |
| 32 | subject tribute | subjects | monthly |  |  |  |  |
| 33 | fund rebels caught roll | diplomacy | monthly |  |  |  |  |
| 34 | fund a revolution caught roll | revolutions | monthly |  |  |  |  |
| 35 | AI diplomatic actions | diplomacy | monthly |  |  |  |  |
| 36 | sailors in port and ship states | naval | monthly |  |  |  |  |
| 37 | pool events roll | events | monthly |  |  |  |  |
| 38 | famine check in every province | province | seasonal |  |  |  |  |
| 39 | farms, groves and fisheries make food | buildings | seasonal |  |  |  |  |
| 40 | subject loyalty worked out | subjects | seasonal |  |  |  |  |
| 41 | resident envoy tie +5 | diplomacy | seasonal |  |  |  |  |
| 42 | pirate fleets grow by one ship | naval | seasonal |  |  |  |  |
| 43 | lords lose loyalty while an army takes their grain | warfare | seasonal |  |  |  |  |
| 44 | world domination check | realm | yearly |  |  |  |  |
| 45 | harvest | realm | harvest |  |  |  |  |
| 46 | wares made | buildings | yearly |  |  |  |  |
| 47 | building neglect years counted | buildings | yearly |  |  |  |  |
| 48 | building advice | buildings | yearly |  |  |  |  |
| 49 | culture drift | culture | yearly |  |  |  |  |
| 50 | faith mix | religion | yearly |  |  |  |  |
| 51 | diplomacy fades | diplomacy | yearly |  |  |  |  |
| 52 | league checks | diplomacy | yearly |  |  |  |  |
| 53 | culture checks for the court going native, new languages abroad and merges | culture | five-yearly |  |  |  |  |

## Seasons

| Key | Value |
|---|---|
| `startMonths` | 3, 6, 9, 12 |
| `paddyHarvestMonths` | 3, 9 |

### Winter

| Key | Value |
|---|---|
| `northern` | 12, 1, 2 |
| `southern` | 6, 7, 8 |

### Snow pass closed

| Key | Value |
|---|---|
| `northern` | 12, 1, 2, 3 |
| `southern` | 6, 7, 8, 9 |

### Wet season (provisional)

| Key | Value |
|---|---|
| `monsoon_asia` | 6, 7, 8, 9 |
| `sahel_and_savanna` | 7, 8, 9 |
| `amazon` | 12, 1, 2, 3, 4, 5 |

### Names

| Name | 3 | 6 | 9 | 12 |
|---|---|---|---|---|
| northern | spring | summer | autumn | winter |
| southern | autumn | winter | spring | summer |

### Harvest month

| Key | Value |
|---|---|
| `northern` | 9 |
| `southern` | 3 |

## Autosave

| Name | every month | month | never |
|---|---|---|---|
| every month | yes |  |  |
| every 12 months |  | 1 |  |
| off |  |  | yes |

## Out of scope

| Key | Value |
|---|---|
| `ages` | age\_of\_decolonization, cold\_war, age\_of\_globalization |
| `events` | second\_world\_war |

## Ages

| id | name | window | force start | force end |
|---|---|---|---|---|
| age\_of\_gunpowder\_empires | Age of Gunpowder Empires | 1444, 1760 | 1444 | 1760 |
| age\_of\_exploration | Age of Exploration | 1444, 1680 | 1444 | 1680 |
| age\_of\_reformations | Age of Reformations | 1480, 1700 | 1530 | 1700 |
| age\_of\_atlantic\_empires | Age of Atlantic Empires | 1480, 1880 | 1520 | 1880 |
| age\_of\_crisis\_and\_absolutism | Age of Crisis and Absolutism | 1590, 1790 | 1640 | 1790 |
| age\_of\_revolutions | Age of Revolutions | 1750, 1880 | 1800 | 1880 |
| age\_of\_industrialization | Age of Industrialization | 1700, 1950 | 1830 | 1950 |
| age\_of\_imperialism | Age of Imperialism | 1800, 1945 | 1860 | 1945 |
| age\_of\_world\_wars | Age of World Wars | 1890, 1960 | 1925 | 1960 |
| age\_of\_decolonization | Age of Decolonization | 1919, 1997 | 1955 | 1997 |
| cold\_war | Cold War | 1945, 2000 | 1950 | 2000 |
| age\_of\_globalization | Age of Globalization | 1978, none | 1995 | none |

## Eras

| Name | era | from |
|---|---|---|
| 1 | I | 1378 |
| 2 | II | 1500 |
| 3 | III | 1600 |
| 4 | IV | 1700 |
| 5 | V | 1800 |
| 6 | VI | 1870 |
| 7 | VII | 1914 |

## Victory

| Key | Value |
|---|---|
| `dominationShare` | 0.5 |
| `checkMonth` | 1 |
| `ways` | world domination, best at the end |
| `scores` | Economy, Power, Technology |

## Engine phases

| Key | Value |
|---|---|
| `apply orders` | apply orders |
| `marches` | day loop |
| `economy` | monthly steps |
| `levies` | monthly steps |
| `advance the date` | advance the date |
