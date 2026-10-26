# Core values data

Every value in the game's core values config, exactly as the game reads it. This page is made from `packages/rules/data/defines.json` each time the config changes, so it always matches the game.

Keys are written as in the config file. Shares are fractions (0.25 is 25 %), and values marked (provisional) are placeholders that may still change in balancing. Inventions are shown by id and name; see [Research data](Data-Research#inventions).

> Global balance numbers. Every value here can be tuned without touching engine code.

## Economy

> `taxRateFactor`: Milestone 3: gold a province pays at each tax step (none, light, normal, heavy, crushing) against normal. Provisional: the design names the steps but no amounts.
>
> `officialWagePerMonth`: Milestone 3: an official's wage, paid monthly while he runs his province (REALM-063 wages). Provisional: the design gives no amount.

| Key | Value |
|---|---|
| `goldPerThousandPeoplePerMonth` | 0.004 |
| `goldPerWealthPerMonth` | 0.06 |
| `startingTreasury` | 50 |
| `taxRateFactor` | 0, 0.5, 1, 1.5, 2 |
| `officialWagePerMonth` | 0.1 |

## Works

> Milestone 4, works (first slice of the buildings context). goldScale turns the buildings data's gold into the treasury's gold. The effects are stand-ins for the jobs-and-wares model (BLD-002, BLD-005) on numbers the game already simulates; all provisional.
>
> `slots`: Leroy, 17 Oct: a province's slots come from its people, one kind of slot for every work. baseSlots plus one for each townPeople step passed (thousands of people), which also sets the town's size: hamlet, village, market town, town, city, great city.

| Key | Value |
|---|---|
| `goldScale` | 0.2 |
| `defaultUpkeepPerYear` | 0.25 |
| `materialsAtHandSaving` | 0.2 |
| `seedFoodShare` | 1.1 |
| `slotScale` | 2.5 |
| `farmRates` | 1.1, 1.3, 1.5 |
| `maxLandYield` | 3 |
| `marketTrade` | 0.5 |
| `harbourTrade` | 0.25 |
| `roadTrade` | 0.05 |
| `campTrade` | 0.05 |
| `drillYardRecruits` | 0.15 |
| `roadSpeed` | 0.15 |
| `aiReserveGold` | 10 |
| `baseSlots` | 2 |
| `townPeople` | 10, 30, 100, 300, 1000 |

## Levies

> Men who can be called per thousand people: the recruiting context's fighting-age share (0.25) times the farmers' call share (0.12).

| Key | Value |
|---|---|
| `menPerThousandPeople` | 30 |
| `monthlyRecoveryFraction` | 0.0167 |

## Military

| Key | Value |
|---|---|
| `upkeepPerThousandMenPerMonth` | 0.2 |

## March

> Marching and feeding armies, after the warfare design (sections 5 and 6) and the province design (section 3.1). One crossing unit in the design's days-to-cross table is daysPerCrossing real days here, since a province on this map is about 100 km and a 1444 army marched 15-20 km a day.

| Key | Value |
|---|---|
| `daysPerMonth` | 30 |
| `daysPerCrossing` | 6 |
| `horseSpeedBonus` | 0.5 |
| `bigArmyExtraCrossings` | 1 |
| `riverCrossingDays` | 1 |
| `tilesPerCrossing` | 14 |
| `snowSlowdown` | 1 |
| `rationsPerSoldier` | 1 |
| `rationsPerHorse` | 3 |
| `rationsStoredPerPerson` | 0.5 |
| `monthsCarried` | 2 |
| `homeReserveMonths` | 2 |
| `logisticsRationCut` | 0.05 |
| `hungerLossPerMonth` | 0.28 |
| `startingHorseShare` | 0.2 |

### Days to cross

| Key | Value |
|---|---|
| `grassland` | 1 |
| `farmland` | 1 |
| `savanna` | 1 |
| `drylands` | 1.5 |
| `hills` | 1.5 |
| `desert` | 2 |
| `forest` | 2 |
| `tundra` | 2 |
| `mountains` | 3 |
| `jungle` | 3 |
| `marsh` | 3 |

### Foraging

| Key | Value |
|---|---|
| `grassland` | 0.6 |
| `farmland` | 1 |
| `savanna` | 0.6 |
| `drylands` | 0.3 |
| `hills` | 0.6 |
| `desert` | 0.1 |
| `forest` | 0.6 |
| `tundra` | 0.1 |
| `mountains` | 0.3 |
| `jungle` | 0.3 |
| `marsh` | 0.3 |

## War

> Milestone 1, war and conquest. Battles, sieges and peace use the warfare and diplomacy contexts' own numbers; these only fit them to the weekly turn.

| Key | Value |
|---|---|
| `holdWeeks` | 4 |
| `engageBase` | 9 |
| `engageMin` | 10 |
| `engageMax` | 15 |
| `garrisonRecoveryPerMonth` | 0.1 |
| `castleStoreMonths` | 6 |
| `stormRatio` | 4 |
| `disperseBelow` | 100 |
| `aiDeclareChancePerMonth` | 0.01 |
| `aiDeclareStrengthRatio` | 2 |

### Garrison

| Key | Value |
|---|---|
| `capital` | 1500 |
| `castle` | 1000 |
| `fort` | 500 |

## Recruit

> Milestone 2, armies that cost something. Pay, training costs, the levy and the troop cap come from domain/recruiting.json and domain/warfare.json; these fit them to this game's economy and weekly turn. goldScale turns the domain's gold into the treasury's gold (one domain gold is 0.004 here).

| Key | Value |
|---|---|
| `goldScale` | 0.004 |
| `queueMax` | 10 |
| `armsAtStart` | levy foot, armoured foot, pikes, archers, light horse, knights and lancers |
| `freeCompaniesForHire` | 6 |
| `unpaidDesertion` | 0.05 |
| `mercenaryWeeks` | 4 |
| `commanderNames` | Juan, Pedro, Rodrigo, Jean, Guillaume, Louis, Henry, Richard, Thomas, Heinrich, Konrad, Albrecht, Giovanni, Niccolò, Mehmed, Ali, Ivan, Dmitri, Jan, Erik, Olaf, Andrzej, János, Duarte |

### Free company men

> A free company's size in this age: never more than max men, some much smaller (Leroy: no fixed 1,000).

| Key | Value |
|---|---|
| `min` | 300 |
| `max` | 3000 |

### Free companies

| Name | group | homes | names | captains | mix |
|---|---|---|---|---|---|
| 1 | Swiss and German foot | switzerland, wurttemberg, bavaria | Reisläufer of Uri, Bernese free company, Company of Schwyz, Swabian foot, Zürich free company | Hans, Ulrich, Konrad, Rudolf | pikes: 0.6, 0.85; armoured foot: 0.1, 0.3; archers: 0, 0.1 |
| 2 | Italian condottieri | milan, florence, papal\_states, naples, venice | The Braccheschi, The Sforzeschi, Company of the Star, Company of Saint George, The Black Company | Niccolò, Bartolomeo, Jacopo, Francesco | knights and lancers: 0.35, 0.6; armoured foot: 0.2, 0.4; archers: 0.1, 0.25; light horse: 0, 0.1 |
| 3 | Genoese crossbowmen | genoa | Genoese crossbowmen, Ligurian crossbow company | Ottone, Antonio | archers: 0.7, 0.9; armoured foot: 0.1, 0.3 |
| 4 | English mercenary companies | england | The White Company, Company of the Rose, Gascon archers | John, Thomas, Robert | archers: 0.6, 0.75; armoured foot: 0.25, 0.4 |
| 5 | Bohemian field companies | bohemia | Brethren of the wagon fort, Tábor field company | Jan, Prokop | armoured foot: 0.3, 0.5; archers: 0.3, 0.5; pikes: 0, 0.2; light horse: 0, 0.1 |
| 6 | Scottish and Irish gallowglass | scotland, ireland | MacSweeney gallowglass, MacDonald redshanks, Clan Sheehy axes | Donnchadh, Alasdair, Eoin | armoured foot: 0.6, 0.9; archers: 0.1, 0.3; light horse: 0, 0.1 |
| 7 | Albanian and Greek stradioti | albania, byzantium | Stradioti of Morea, Albanian riders | Gjon, Theodoros | light horse: 0.9, 1; armoured foot: 0, 0.1 |
| 8 | Catalan almogavars | aragon | Almogavars of the Pyrenees, Catalan company | Bernat, Ramon | levy foot: 0.3, 0.5; armoured foot: 0.3, 0.5; light horse: 0, 0.2 |
| 9 | Turkic and Afghan horse | timurids, uzbek\_khanate, delhi | Lodi horse, Chagatai riders, Turkmen horse | Bahlul, Timur, Ali | light horse: 0.7, 1; archers: 0, 0.2; armoured foot: 0, 0.1 |
| 10 | Javanese and Japanese sword bands | japan, majapahit | Ronin band, Wako sword band, Javanese keris company | Saburō, Gajah | armoured foot: 0.5, 0.8; archers: 0.2, 0.4; pikes: 0, 0.1 |

## Living

> Milestone 3, people by class. Each province's people are seeded into the province context's classes from its population, ground, coast and wealth (the context gives the classes and their birth and death rates but no 1444 mix, so these shares are provisional).

| Key | Value |
|---|---|
| `townShareBase` | 0.03 |
| `townSharePerWealth` | 0.025 |
| `townShareMax` | 0.35 |
| `homelessShare` | 0.02 |
| `coastalSeafolk` | 0.12 |
| `startingStoreMonths` | 4 |
| `reliefAboveMonths` | 3 |
| `lordGiftGold` | 5 |

### Town mix

| Key | Value |
|---|---|
| `craftsmen` | 0.42 |
| `market folk` | 0.3 |
| `clergy` | 0.12 |
| `clerks` | 0.13 |
| `scholars` | 0.03 |

### Country mix

| Name | farmers | herders | woodsmen | miners |
|---|---|---|---|---|
| grassland | 0.7 | 0.2 | 0.1 |  |
| farmland | 0.85 | 0.1 | 0.05 |  |
| hills | 0.55 | 0.25 | 0.1 | 0.1 |
| mountains | 0.4 | 0.4 | 0.1 | 0.1 |
| drylands | 0.5 | 0.45 |  | 0.05 |
| marsh | 0.55 | 0.15 | 0.3 |  |
| forest | 0.5 | 0.1 | 0.4 |  |
| desert | 0.3 | 0.65 |  | 0.05 |
| tundra | 0.05 | 0.6 | 0.35 |  |
| jungle | 0.55 | 0.05 | 0.4 |  |
| savanna | 0.5 | 0.45 | 0.05 |  |

## Castle food

> Feedback 84 and 85: castles collect a share of each province's surplus at the harvest, keep a siege reserve and spread the rest by rings; stores are capped (a province's own at localStoreCapMonths, a castle's at castleStoreMonths, granaryStoreMonths with a granary) and the surplus rule decides what happens to the rest. The realm data gives the grain price (0.5 gold a food); grainGoldScale turns it into the treasury's gold for the engine's food (a thousand people fed for a month), so a month's food sells for about what its eaters pay in tax a month. All provisional.

| Key | Value |
|---|---|
| `localStoreCapMonths` | 18 |
| `castleStoreMonths` | 6 |
| `granaryStoreMonths` | 18 |
| `keepMonths` | 12 |
| `grainGoldScale` | 0.008 |
