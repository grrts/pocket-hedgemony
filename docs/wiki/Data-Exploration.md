# Exploration data

Every value in the game's exploration config, exactly as the game reads it. This page is made from `packages/rules/data/domain/exploration.json` each time the config changes, so it always matches the game. How these values are used is explained on [Exploration and Colonies](Exploration-and-Colonies).

Keys are written as in the config file. Shares are fractions (0.25 is 25 %), and values marked (provisional) are placeholders that may still change in balancing. Inventions are shown by id and name; see [Research data](Data-Research#inventions).

> Exploration (EXPL) config, from exploration/exploration-design.md v1 sections 2-8 and its section 10 decisions. Every number is a placeholder of the design except unlock\_age (decided). Numbers that belong to naval (supply, reach, out-of-supply loss, docking, the exploration ship rows) are repeated under 'naval' as this context reads them (naval-design 3.3, 6.3, 6.4, 7.2). Colonial range per government form is government's (government.json forms.\*.colonial\_range).
>
> `comment\_unlock\_later\_ages`: D-EXPL-3: a region outside unlock\_age's region list opens with the first age that starts later than unlock\_age and covers it (age\_of\_atlantic\_empires for north\_america, age\_of\_reformations for middle\_east and central\_asia), read from exploration-regions.json.
>
> `comment\_governor\_slots`: D-EXPL-4: the base is 2 with S5, else 1 with S3; T8 and T9 each add 1 to any base.

| Key | Value |
|---|---|
| `unlock_age` | age\_of\_exploration |
| `unlock_inventions` | [S4 Carrack and caravel](Data-Research#inventions), [S3 Outrigger voyaging](Data-Research#inventions) |
| `colonial_unlock_invention` | [S5 ocean\_navigation](Data-Research#inventions) |
| `s3_invention` | [S3 Outrigger voyaging](Data-Research#inventions) |
| `s3_min_range` (provisional) | 10 |
| `start_charted_reach` (provisional) | 6 |
| `progress_start` (provisional) | 10 |
| `progress_founded` | 100 |
| `progress_lost` | 0 |
| `progress_gain` (provisional) | 5 |
| `pressure_roll_max_factor` (provisional) | 2 |
| `food_per_month` (provisional) | 20 |
| `no_food_progress_loss` (provisional) | 10 |
| `governor_hire_gold` (provisional) | 20 |
| `governor_wage_per_year` (provisional) | 5 |
| `governor_age_when_hired` (provisional) | 30 |
| `unload_days` (provisional) | 1 |
| `founded_settlement` | settlement |
| `low_supply_choices` | Turn back, Carry on |
| `default_low_supply` | Turn back |

## Governor slots (provisional)

| Key | Value |
|---|---|
| `S5` | 2 |
| `T8` | 1 |
| `T9` | 1 |
| `S3` | 1 |

## Aggression (provisional)

| Name | level | chance pct | average loss |
|---|---|---|---|
| 1 | Peaceful | 30 | 0 |
| 2 | Wary | 30 | 1 |
| 3 | Hostile | 25 | 2 |
| 4 | Fierce | 15 | 3 |

## Colony stores (provisional)

| Key | Value |
|---|---|
| `caravel` | 300 |
| `voyaging_canoe` | 100 |

## Ai

> Exploration design 8: a country explores when its catalogue personality favours expansion by sea; the catalogue's only expansion mode by sea is 'colonization'.

| Key | Value |
|---|---|
| `sea_expansion_modes` | colonization |
| `stores_margin` (provisional) | 1.25 |

## Naval

| Key | Value |
|---|---|
| `supply_per_zone` | 1 |
| `out_of_supply_crew_loss` | 0.1 |
| `undockable_port_tiers` | landing |

### Exploration ships

| Name | supply | invention | crew | gold | timber | months | needs harbour | built on | open ocean from start |
|---|---|---|---|---|---|---|---|---|---|
| caravel | 60 | [S4 Carrack and caravel](Data-Research#inventions) |  |  |  |  |  |  |  |
| voyaging\_canoe | 60 | [S3 Outrigger voyaging](Data-Research#inventions) | 20 | 5 | 1 | 1 | no | any shore with seafolk | yes |

### Other ships

| Name | family | supply |
|---|---|---|
| carrack | military | 15 |
| galleon | military | 15 |
| cog | trade | 15 |

### Reach

| Key | Value |
|---|---|
| `coast_only_before` | [S1 Magnetic compass and sea charts](Data-Research#inventions) |
| `ocean_within_zones_of_coast` | 3 |
| `ocean_with` | [S1 Magnetic compass and sea charts](Data-Research#inventions) |
| `any_ocean_with` | [S5 ocean\_navigation](Data-Research#inventions) |

### Docking

| Key | Value |
|---|---|
| `realm` | food |
| `lord` | food |
| `subject` | food |
| `ally` | food |
| `peace` | gold |
| `war` | none |
| `rival` | none |

## Game

> The game's first slice (EXPL-075, D-EXPL-20): a realm's region for the age gate where the event tree's 1444 polity list has no entry, by the catalogue's region group; what the AI does with its exploration ships.

| Key | Value |
|---|---|
| `fallback_region` | europe |

### Catalogue regions

| Key | Value |
|---|---|
| `eu_` | europe |
| `as_anatolia_caucasus` | middle\_east |
| `as_levant_egypt_arabia` | middle\_east |
| `as_iran_transoxiana` | middle\_east |
| `as_steppe_siberia` | central\_asia |
| `as_china_inner_asia` | east\_asia |
| `as_japan_korea` | east\_asia |
| `as_se_asia_` | southeast\_asia |
| `as_south_asia_` | south\_asia |
| `af_north_sahara` | north\_africa |
| `af_` | sub\_saharan\_africa |
| `am_north` | north\_america |
| `am_mesoamerica_caribbean` | central\_america |
| `am_south` | south\_america |
| `oc_` | oceania |

### Ai (provisional)

| Key | Value |
|---|---|
| `ship` | caravel |
| `explorers` | 1 |
| `most_zones_out` | 25 |
| `reserve_gold` | 20 |
