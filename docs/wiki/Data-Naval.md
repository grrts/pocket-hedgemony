# Naval data

Every value in the game's naval config, exactly as the game reads it. This page is made from `packages/rules/data/domain/naval.json` each time the config changes, so it always matches the game. How these values are used is explained on [Naval](Naval).

Keys are written as in the config file. Shares are fractions (0.25 is 25 %), and values marked (provisional) are placeholders that may still change in balancing. Inventions are shown by id and name; see [Research data](Data-Research#inventions).

> Naval (domain/naval/spec.md, naval design v1). The design names one naval config file; keys follow spec section 10. Every number is a design placeholder. Not given by the design (left out): bounty per sailor, muster time, fish-lost formula (OQ-NAVY-14), wind calendars, storm and freeze seasons, pirate season length (OQ-NAVY-23).
>
> `decided`: 17 October: D-NAVY-1..29. Numbers below are provisional where listed in \_provisional.

| Key | Value |
|---|---|
| `arsenalStep` | 4 |
| `arsenalBuildsAsStep` | 3 |
| `arsenalTown` | Venice |
| `berthsPerLargeShip` | 2 |
| `largeShips` | ship of the line |
| `drawnUp` | galley, cog, junk, dhow, small craft |
| `fallowBelow` | 0.5 |
| `smallTownHarbour` | 1 |
| `fightingAgeShare` | 0.25 |
| `wageInPort` | 0.1 |
| `wageAtSea` | 0.2 |
| `rationInPort` | 1 |
| `foreignWageMultiplier` | 2 |
| `foreignCrewsFromHarbourStep` | 2 |
| `prizeCrewDesertion` | 0.25 |
| `wagesSpentAshore` | 0.2 |
| `harbourBuildMonthsMultiplier` | 1.5 |
| `abroadPriceMultiplier` | 1.5 |
| `explorationUnlock` | exploration unlock |
| `refitFromHarbourStep` | 2 |
| `hullSteps` | sound, worn, leaking, wrecked |
| `laidUpWreckYears` | 10 |
| `laidUpUpkeepShare` | 0.1 |
| `fitOutMonths` | 1 |
| `minCrewToSail` | 0.25 |
| `resupplyFoodPerZone` | 0.1 |
| `resupplyGoldPerZone` | 0.01 |
| `refitCostForeignMultiplier` | 1.5 |
| `leakingDaysMultiplier` | 2 |
| `oceanReachWithS1` | 3 |
| `prizeCrewShare` | 0.25 |
| `sunkSurvivorsShare` | 0.333333 |
| `pirateGrowthPerSeason` | 1 |
| `pirateReach` | 1 |
| `lighthouseStormFactor` | 0.5 |
| `seaBattleMaxSectors` | 3 |
| `battleHullStepsLost` | 1 |
| `foreignCrewsPerPortPerYear` (provisional) | 100 |
| `coalPerMonthAtSea` (provisional) | 1 |
| `powderPerVoyage` (provisional) | 1 |

## Berths by harbour step (provisional)

| Key | Value |
|---|---|
| `1` | 10 |
| `2` | 25 |
| `3` | 50 |

## Slipways by shipyard step (provisional)

| Key | Value |
|---|---|
| `1` | 1 |
| `2` | 2 |
| `3` | 2 |
| `4` | 3 |

## Harbour allows

| Key | Value |
|---|---|
| `1` | muster, buy, resupply |
| `2` | muster, buy, resupply, refit, foreign crews |
| `3` | muster, buy, resupply, refit, foreign crews, coaling |

## Tier rank

| Key | Value |
|---|---|
| `landing` | 0 |
| `small` | 1 |
| `port` | 2 |
| `great` | 3 |

## Start harbour by tier

| Key | Value |
|---|---|
| `great` | 2 |
| `port` | 2 |
| `small` | 1 |
| `landing` | 0 |

## Start shipyard

| Key | Value |
|---|---|
| `marked` | 1 |
| `withInvention` | 2 |
| `invention` | [S4 Carrack and caravel](Data-Research#inventions) |

## Muster share (provisional)

| Key | Value |
|---|---|
| `seafolk` | 0.666667 |
| `homeless` | 0.333333 |
| `other` | 0.05 |

## Drift home

| Key | Value |
|---|---|
| `afterMonths` | 6 |
| `share` | 0.1 |

## Pressing

| Key | Value |
|---|---|
| `invention` | [S9 Line-of-battle tactics](Data-Research#inventions) |
| `grievance` | Pressed |
| `years` | 1 |

## Skilled service

| Key | Value |
|---|---|
| `years` | 2 |
| `fishBonus` | 0.1 |
| `tradersBonus` | 0.1 |
| `lastsYears` | 10 |

## Widows

| Key | Value |
|---|---|
| `share` | 0.1 |
| `windowYears` | 5 |
| `birthsYears` | 10 |
| `grievance` | Lost at sea |
| `grievanceYears` | 2 |

## Ships

| Name | family | unlock | built at | crew | gold | timber | months | upkeep | step days | more |
|---|---|---|---|---|---|---|---|---|---|---|
| small craft | small craft | none | any shore | 6 | 2 | 0 | 1 | 0 | sea: 1; ocean: 2 | ocean needs: [S3 Outrigger voyaging](Data-Research#inventions) |
| war canoe fleet | military | [S3 Outrigger voyaging](Data-Research#inventions) | any shore | 100 | 10 | 2 | 2 | 0.5 | sea: 1; ocean: 2 | ocean needs: [S3 Outrigger voyaging](Data-Research#inventions) |
| voyaging canoe | exploration | [S3 Outrigger voyaging](Data-Research#inventions) | any shore | 20 | 5 | 1 | 1 | 0.5 | sea: 1; ocean: 2 | ocean needs: [S3 Outrigger voyaging](Data-Research#inventions); colony stores: 100 |
| cog | trade | none | harbour | 30 | 25 | 6 | 3 | 1 | sea: 2; ocean: 3 | hold: 2; purse: 30 |
| junk | trade | none | harbour | 30 | 25 | 6 | 3 | 1 | sea: 2; ocean: 3 | hold: 2; purse: 30 |
| dhow | trade | none | harbour | 30 | 25 | 6 | 3 | 1 | sea: 2; ocean: 3 | hold: 2; purse: 30 |
| caravel | exploration | [S4 Carrack and caravel](Data-Research#inventions) | harbour | 25 | 25 | 4 | 3 | 1 | sea: 1.5; ocean: 2 | colony stores: 300; needs exploration unlock: yes |
| galley | military | none | 1 | 180 | 40 | 6 | 4 | 2 | sea: 1; ocean: none | hold: 2; purse: 25; galley: yes |
| carrack | trade | [S4 Carrack and caravel](Data-Research#inventions) | 2 | 60 | 60 | 12 | 6 | 3 | sea: 2; ocean: 2 | hold: 3; purse: 50 |
| armed carrack | military | [S6 Ship-mounted cannon](Data-Research#inventions) | 2 | 120 | 120 | 14 | 7 | 5 | sea: 2; ocean: 2 | shoots: yes |
| galleon | military | [S7 Galleon](Data-Research#inventions) | 2 | 200 | 200 | 20 | 9 | 8 | sea: 2; ocean: 2 | hold: 3; purse: 60; shoots: yes |
| fluyt | trade | [S7 Galleon](Data-Research#inventions) | 2 | 20 | 40 | 10 | 4 | 1.5 | sea: 2; ocean: 2 | hold: 4; purse: 70 |
| turtle ship | military | [S8 Turtle and armoured ships](Data-Research#inventions) | 2 | 120 | 150 | 12 | 8 | 6 | sea: 2; ocean: 2 | shoots: yes |
| ship of the line | military | [S9 Line-of-battle tactics](Data-Research#inventions) | 3 | 600 | 600 | 60 | 18 | 25 | sea: 2; ocean: 2 | shoots: yes |
| steamer | trade | [S13 Steamships](Data-Research#inventions) | 3 | 40 | 200 | 20 | 8 | 3 | sea: 1; ocean: 1 | hold: 6; purse: 150; iron: 40; steam: yes |

## Trade ship by sea

| Key | Value |
|---|---|
| `coasts of Europe` | cog |
| `East and Southeast Asia` | junk |
| `Indian Ocean and Red Sea` | dhow |

## Supply by family

| Key | Value |
|---|---|
| `trade` | 15 |
| `military` | 15 |
| `galley` | 6 |
| `exploration` | 60 |

## Refit months

| Key | Value |
|---|---|
| `worn` | 1 |
| `leaking` | 3 |
| `shipyardFactor` | 0.5 |

## Rot months

| Key | Value |
|---|---|
| `at sea` | 6 |
| `in port` | 36 |
| `laid up` | 24 |
| `anchorage` | 6 |

## Out of supply

| Key | Value |
|---|---|
| `crewLossPerZone` | 0.1 |
| `strengthCap` | 0.5 |

## Wind multiplier

| Key | Value |
|---|---|
| `with` | 0.5 |
| `against` | 2 |
| `none` | 1 |

## Sea inventions

| Key | Value |
|---|---|
| `compass` | [S1 Magnetic compass and sea charts](Data-Research#inventions) |
| `ocean` | [S5 ocean\_navigation](Data-Research#inventions) |
| `outrigger` | [S3 Outrigger voyaging](Data-Research#inventions) |

## Admiral

| Key | Value |
|---|---|
| `mightHits` | 0.05 |
| `mightBoarding` | 0.1 |
| `cunningDays` | 0.05 |
| `cunningSightZones` | 1 |
| `logisticsStorm` | 0.1 |
| `supplyFreeEveryZones` | 10 |
| `supplyFreeFromLogistics` | 3 |
| `logisticsGainYears` | 3 |
| `portYearsMultiplier` | 2 |
| `viceAdmiralsMax` | 2 |

## Admirals by official

| Name | might | cunning | logistics | trait |
|---|---|---|---|---|
| customs officer | 0 | 3 | 1 | Careful |
| warden | 2 | 1 | 1 | Steady |
| steward | 0 | 1 | 3 | Careful |
| muster master | 1 | 1 | 2 | Beloved |
| tax collector | 0 | 2 | 1 | Greedy |
| judge | 1 | 2 | 0 | Cruel |
| master of works | 0 | 1 | 2 | none |
| chaplain | 0 | 1 | 1 | none |
| schoolmaster | 0 | 1 | 1 | none |
| marshal | 2 | 2 | 1 | any |

## Pirate coasts

| Name | sea | catalogue record |
|---|---|---|
| wokou | East China Sea | yes |
| Barbary corsairs | Barbary coast | no |
| Aegean corsairs | Aegean | no |
| Orang Laut | Malacca strait | yes |

## Small craft

| Key | Value |
|---|---|
| `crew` | 6 |
| `carriesMen` | 10 |
| `carriesLoads` | 1 |

## Room

| Key | Value |
|---|---|
| `horse` | 4 |
| `gun` | 20 |

## Ai

| Key | Value |
|---|---|
| `fleetAiRadiusZones` | 10 |
| `seaPowerSeafolkAtSea` (provisional) | 0.25 |

## Muster

| Key | Value |
|---|---|
| `bountyPerSailor` (provisional) | 0.05 |
| `days` (provisional) | 14 |
| `fishingShareOfSeafolk` (provisional) | 0.333333 |
| `byShare` | yes |

## Admiral commission

| Key | Value |
|---|---|
| `gold` | 10 |
| `wageAtSeaMultiplier` | 3 |
| `notCommissioned` | colonial governor |

## Storm

| Key | Value |
|---|---|
| `chancePerMonth` (provisional) | 0.05 |
| `hullStepsLost` | 1 |

## Canoe landing (provisional)

| Key | Value |
|---|---|
| `extraSeafolk` | 100 |
| `smallCraft` | 5 |

## Monsoon

| Key | Value |
|---|---|
| `needs` | [T5 Monsoon sailing calendars](Data-Research#inventions) |
| `ships` | junk, dhow |
| `seas` | Arabian Sea, Bay of Bengal, Gulf of Aden, Red Sea, Persian Gulf, Indian Ocean, South China Sea, Java Sea |

## Pirates (provisional)

| Key | Value |
|---|---|
| `seasonMonths` | 3 |
| `startShips` | 2 |

### Bases

| Key | Value |
|---|---|
| `wokou` | Tsushima |
| `Barbary corsairs` | Algiers |
| `Aegean corsairs` | Mani |
| `Orang Laut` | Riau |

## Later ships (provisional)

| Name | family | crew | gold | iron | months | upkeep |
|---|---|---|---|---|---|---|
| ironclad | military | 300 | 300 | 80 | 12 | 6 |
| dreadnought | military | 800 | 1200 | 300 | 24 | 20 |
| submarine | military | 40 | 250 | 40 | 12 | 4 |
| aircraft carrier | military | 1500 | 1500 | 300 | 30 | 25 |

## Frozen seas (provisional)

> X-17: provisional until world-map's frozen lookup exists

| Key | Value |
|---|---|
| `months` | 12, 1, 2, 3 |
| `zones` | Gulf of Bothnia, Bay of Bothnia, Gulf of Finland, White Sea, Barents Sea, Kara Sea |

## Sea engage (provisional)

> Feedback 127: hostile fleets meet only in the same sea zone, once their tiles come within the seeking fleet's sighting range: base tiles plus perCunning per point of its leader's Cunning, at most max (armies 10 to 15).

| Key | Value |
|---|---|
| `base` | 20 |
| `perCunning` | 1 |
| `max` | 30 |

## Admiral posts (provisional)

> Feedback 124: a fleet's leader holds one post. mightShare is the share of his Might counted in sea battles.

| Name | name | does | might share | trade gain | prize factor | chart rings | colony start |
|---|---|---|---|---|---|---|---|
| admiral | Admiral | War: his Might and Cunning count in full in sea battles. | 1 |  |  |  |  |
| commodore | Commodore | Trade: his realm's trade ships pass enemy blockades where his fleet lies, ports beside it gain trade 25 % faster, and his blockades take 1.5 times the prize money. | 0.5 | 0.25 | 1.5 |  |  |
| viceroy | Viceroy | Exploration and colonies: his fleet charts two rings of sea around it, and a colony founded from it starts 10 points ahead. | 0.5 |  |  | 2 | 10 |

## Blockade (provisional)

> Feedback 123: a fleet with a warship and a leader lying still in a sea zone at war closes the enemy's coastal provinces beside it, and the zone to the enemy's trade ships. Each month its realm takes prizeShare of each closed port's sea trade value (its value to ships times its trade ratio); each closed port counts peaceWeight as if occupied when the blocked side weighs peace.

| Key | Value |
|---|---|
| `prizeShare` | 0.5 |
| `peaceWeight` | 0.5 |

## Starting fleets (provisional)

> F-115: realms that had ships in 1444 start with them, by the catalogue's naval\_capability (very\_low, low, moderate, high, very\_high). Warships are the strongest the realm could order in its best port; transports are its sea's trade ship. Ages are drawn up to maxAgeYears. Ports west of noShipsWestOfLon (the Americas, whose 1444 realms had canoes and rafts, not cogs, junks or dhows) start with none. Provisional.

| Key | Value |
|---|---|
| `levels` | very\_low, low, moderate, high, very\_high |
| `warships` | 0, 0, 1, 3, 6 |
| `transports` | 0, 1, 1, 2, 3 |
| `maxAgeYears` | 15 |
| `noShipsWestOfLon` | -30 |

## Hired fleets (provisional)

> F-115: fleets for hire, as free companies are for the land (WAR-213). forHire free fleets at once, each moving on at moveOnChance a month; one comes when it can reach a port of the hirer within reachDays. Pay a month is the ships' upkeep and crews' wages at sea times payMultiplier (free) or lentPayMultiplier (a realm's own fleet, the gold going to that realm). Realms whose naval\_capability is in lenderLevels lend an idle fleet in port with at least lenderMinWarships warships. The AI hires when at war and outgunned, keeping reserveMonths of pay. Captains bring skills of 1 to captainSkillMax. Provisional.

| Key | Value |
|---|---|
| `forHire` | 4 |
| `moveOnChance` | 0.1667 |
| `reachDays` | 112 |
| `payMultiplier` | 3 |
| `lentPayMultiplier` | 2 |
| `lenderLevels` | high, very\_high |
| `lenderMinWarships` | 2 |
| `captainSkillMax` | 3 |
| `aiReserveMonths` | 6 |

### Groups

| Name | group | seas | ships | names | captains |
|---|---|---|---|---|---|
| 1 | Genoese galley masters | Northwest Tyrrhenian Sea | galley: 2, 4; cog: 0, 1 | Doria galleys, Grimaldi galleys, Spinola galleys, Fieschi galleys, Lomellini galleys | Antonio Doria, Giovanni Grimaldi, Battista Spinola, Luca Fieschi, Napoleone Lomellini |
| 2 | Catalan corsairs | Northeast Balearic Sea, East Balearic Sea | galley: 1, 3 | Corsairs of Mallorca, Barcelona privateers, Valencian corsairs | Bernat de Vilamarí, Galceran de Requesens, Joan de Montpalau, Pere Joan Sala |
| 3 | Basque shipmasters | Bay of Biscay | cog: 2, 5 | Bilbao shipmasters, Bermeo ships, San Sebastián ships, Ships of the Brotherhood of the Marshes | Juan de Arteaga, Martín de Zarauz, Pedro de Larrea, Íñigo de Mendoza |
| 4 | English West Country privateers | West English Channel | cog: 1, 3 | Fowey gallants, Dartmouth privateers, Plymouth privateers | Hankyn Seelander, Thomas Treffry, John Hawley, Robert Wenyngton |
| 5 | Holland and Zeeland shipmasters | North Sea | cog: 2, 4 | Veere ships, Amsterdam ships, Zierikzee ships | Hendrik van Borselen, Jan Adriaensz, Claes Pietersz, Willem Florisz |
| 6 | Hanseatic peace ships | Baltic Sea | cog: 2, 5 | Lübeck peace ships, Danzig convoy, Stralsund cogs, Wismar cogs | Bernd Pawest, Paul Beneke, Eler Bokelmann, Bartholomäus Voet |
| 7 | Barbary corsairs | Southwest Balearic Sea, West Alboran Sea | galley: 1, 3 | Corsairs of Bougie, Corsairs of Algiers, Corsairs of Oran | Rais Hasan, Rais Ali, Rais Murad, Rais Mustafa |
| 8 | Aegean corsairs | Aegean Sea | galley: 1, 2 | Corsairs of Naxos, Corsairs of Mani, Corsairs of Chios | Nikolaos Kalergis, Giorgio Sanudo, Manuel Notaras, Ioannis Laskaris |
| 9 | Dalmatian ship-owners | Adriatic Sea | galley: 1, 2; cog: 1, 2 | Ragusan ships, Zara galleys, Sebenico ships, Spalato ships | Marin Gundulić, Nikola Sorkočević, Ivan Menčetić, Pavao Gučetić |
| 10 | Japanese sea clans | East Korea Strait, Southwest Korea Strait | junk: 2, 4 | Noshima band, Kurushima band, Matsura band, Gotō band | Murakami Yoshimitsu, Kurushima Michiyasu, Matsura Shigenobu, Gotō Morinao |
| 11 | Fujian sea traders | South Taiwan Strait, North Taiwan Strait | junk: 2, 5 | Zhangzhou junks, Quanzhou junks, Yuegang junks | Lin Daoqian, Chen Zuyi, Xu Dong, Wang Zhi |
| 12 | Orang Laut | Southeast Strait of Malacca | war canoe fleet: 2, 4 | Orang Laut of Bintan, Orang Laut of Lingga, Orang Laut of Riau | Batin Sekam, Batin Ali, Batin Daud, Batin Hitam |
| 13 | Gujarati ship-owners | Gulf of Khambhät | dhow: 2, 4 | Cambay ships, Diu ships, Rander ships | Nakhuda Ali, Nakhuda Hasan, Nakhuda Ibrahim, Nakhuda Yusuf |
| 14 | Malabar sea captains | Laccadive Sea | dhow: 2, 3 | Calicut ships, Ponnani ships, Kollam ships | Marakkar Ali, Marakkar Kunhi, Koya Pakki, Marakkar Musa |

## Game (provisional)

> Fits naval's numbers to this game's treasury, as defines' goldScale does for recruiting and works: ship gold and upkeep times goldScale, sailors' wages and bounty times wageScale, so a sailor costs about what a soldier does (D-NAVY-30). Sea battles (D-NAVY-31): each 4-hour round (X-1) a side deals its ships' strength times roundHits, the first ship of the other side's line taking them; a side whose strength falls to breakShare of its start runs for port. Docking takes dockDays; landing an army a day per menLandedPerDay men (warfare 11.3). All provisional.

| Key | Value |
|---|---|
| `goldScale` | 0.1 |
| `wageScale` | 0.01 |
| `roundHits` | 0.08 |
| `roundSpread` | 0.25 |
| `breakShare` | 0.5 |
| `maxRounds` | 18 |
| `dockDays` | 0.5 |
| `menLandedPerDay` | 5000 |

### Ai

| Key | Value |
|---|---|
| `reserveGold` | 20 |
| `portsPerShip` | 2 |
| `maxShips` | 4 |
| `huntZones` | 8 |
| `huntEdge` | 1.2 |

### Queues

> Build queues in a port (D-NAVY-33): sailors are mustered a batch at a time, each batch muster.days after the one before, at most musterQueueMax batches waiting; ships ordered wait in the port's queue, paid when ordered, and are laid down in turn when a slipway is free and their crew waits in port, at most shipQueueMax waiting. Provisional.

| Key | Value |
|---|---|
| `musterBatch` | 50 |
| `musterQueueMax` | 10 |
| `shipQueueMax` | 5 |

## Upgrades (provisional)

> The upgrade path (D-NAVY-33): a port no longer offers a ship type once it can build the type that replaces it, or any type further along. Trade: the sea's cog, junk or dhow, then carrack, fluyt, steamer. War: galley or war canoe fleet, then armed carrack, galleon, ship of the line; the turtle ship gives way to the ship of the line. Exploration ships have no successor yet. Provisional.

| Key | Value |
|---|---|
| `cog` | carrack |
| `junk` | carrack |
| `dhow` | carrack |
| `carrack` | fluyt |
| `fluyt` | steamer |
| `galley` | armed carrack |
| `war canoe fleet` | armed carrack |
| `armed carrack` | galleon |
| `galleon` | ship of the line |
| `turtle ship` | ship of the line |
