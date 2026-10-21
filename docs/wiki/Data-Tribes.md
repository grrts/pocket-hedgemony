# Tribes data

Every value in the game's tribes config, exactly as the game reads it. This page is made from `packages/rules/data/domain/tribes.json` each time the config changes, so it always matches the game. How these values are used is explained on [Tribes and Hunting Grounds](Tribes-and-Hunting-Grounds).

Keys are written as in the config file. Shares are fractions (0.25 is 25 %), and values marked (provisional) are placeholders that may still change in balancing. Inventions are shown by id and name; see [Research data](Data-Research#inventions).

> Tribes (domain/tribes/spec.md, TRIBE): tribal realms of North America and their hunting grounds. Values from the tribes design of 18 October 2026; every number is a placeholder balancing knob (DECISIONS rule 4). region\_bounds draws each region of tribes.regions as a box of longitude and latitude, read against a realm's capital on the map, since map realms carry no catalogue region. new\_tribe\_regions, new\_tribe\_representations, new\_tribe\_provinces and new\_tribes\_left\_out say which catalogue records the 1444 map adds as new tribes (TRIBE-002 to TRIBE-005); their home points are in packages/rules/data/scenarios/1444/map-nations.json (grows).

| Key | Value |
|---|---|
| `regions` | am\_north |
| `tribal_forms` | clan\_council, chiefdom, confederation |
| `new_tribe_regions` | am\_north |
| `new_tribe_representations` | decentralized\_polity |
| `claim_months` | 3 |
| `reclaim_years` | 5 |
| `furs_gold` | 0.5 |
| `take_in_years` | 10 |
| `settlers_punish_years` | 10 |
| `land_price` | 10 |
| `given_reclaim_years` | 10 |

## Region bounds

### Am north

| Key | Value |
|---|---|
| `west` | -170 |
| `east` | -50 |
| `south` | 24.5 |
| `north` | 84 |

## New tribe provinces

| Key | Value |
|---|---|
| `B` | 2 |
| `C` | 1 |

## New tribes left out

> D-TRIBE-2: decentralised polities of am\_north that did not exist on 11 November 1444, or are already map realms under another id.

| Key | Value |
|---|---|
| `susquehannock` | a people that formed c. 1450 |
| `paquime` | background only; abandoned c. 1450 |
| `haudenosaunee` | the map's iroquois |
| `wendat` | the map's huron |
| `pueblo_rio_grande` | the map's pueblo |

## Range size

| Key | Value |
|---|---|
| `clan_council` | 2 |
| `chiefdom` | 3 |
| `confederation` | 4 |

## Settlers wrong

| Key | Value |
|---|---|
| `weight` | -30 |
| `fade_years` | 20 |

## Ask

| Key | Value |
|---|---|
| `base` | -5 |
| `per_gold` | 1 |
| `gold_max` | 40 |
| `standing_divisor` | 4 |
| `settlers_held` | -25 |
| `hostile` | -30 |
| `one_ground_left` | -10 |
| `last_ground` | -100 |
| `answer_months` | 1 |

## Ai

| Key | Value |
|---|---|
| `ask_when_gold_times` | 2 |
| `answered_years` | 10 |
