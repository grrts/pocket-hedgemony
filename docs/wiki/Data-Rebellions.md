# Rebellions data

Every value in the game's rebellions config, exactly as the game reads it. This page is made from `packages/rules/data/domain/rebellions.json` each time the config changes, so it always matches the game. How these values are used is explained on [Rebellions](Rebellions).

Keys are written as in the config file. Shares are fractions (0.25 is 25 %), and values marked (provisional) are placeholders that may still change in balancing. Inventions are shown by id and name; see [Research data](Data-Research#inventions).

| Key | Value |
|---|---|
| `judge_raises_bars_by` | 1 |
| `riots_factor` | 0.5 |
| `sparks_needing_hungry` | an army requisitions food, the harvest roll comes up failed |
| `faith_or_tongue_causes` | Faith, Homeland |
| `clergy_scholars_causes` | Faith, New ideas |
| `clergy_scholars` | clergy, scholars |
| `preacher_faith_spread` | 2 |
| `veteran_arms_steps` | 1 |
| `battle_kind` | Rebel band |
| `locals_bonus_name` | Locals know the land |
| `starving_loss` | 0.1 |
| `loot_first` | market |
| `bribe_costs_more` | the lord himself, the pretender |
| `punish_lock_years` | 10 |
| `massacre_lock_years` | 20 |
| `bloodshed_years` | 20 |
| `win_hold_months` | 12 |
| `tax_win_years` | 10 |
| `tax_win_rate` | light |
| `unrest_grievances_per_effect` | 1 |
| `great_revolt_near_capital` | yes |

## Steps

| Key | Value |
|---|---|
| `grumbling` | 2 |
| `riots` | 3 |
| `plotting` | 4 |

## Rising chance

| Name | grievances | percent |
|---|---|---|
| 1 | 4 | 5 |
| 2 | 5 | 15 |
| 3 | 6 | 30 |

## Step effects

| Key | Value |
|---|---|
| `calm` | none |
| `grumbling` | growth slows, scholars and craftsmen start to leave |
| `riots` | tax halved, recruits halved, traders avoid it, the lord wavers |
| `plotting` | tax halved, recruits halved, traders avoid it, the lord wavers, may rise |

## Sparks

| Key | Value |
|---|---|
| `new burden` | the tax rate of the province is raised, a levy is called at harvest time, an army is quartered for the winter, an army requisitions food |
| `failed harvest` | the harvest roll comes up failed |
| `insult to faith` | a house of worship of the majority faith is demolished, a faith tolerance charter is revoked |
| `death or execution` | the province's lord is executed, the province's lord dies without an accepted heir, a popular official is dismissed |
| `defeat` | the owner's army loses a battle in or next to the province, the capital falls |
| `outsider` | a pretender lands with men, a rival's envoy arrives with gold, a preacher of a new faith arrives |
| `the ruler` | the ruler dies with a child heir, the ruler dies with no heir |

## Causes

| Name | grievances | demand | joiners | classes | leader |
|---|---|---|---|---|---|
| Hunger | Hungry | the castle granary opened to them | farmers, homeless | farmers, homeless | local |
| Tax | Heavy taxes, Conscription | the tax rate back down; the levy ended | farmers, craftsmen, market folk | farmers, craftsmen, market folk | local |
| Faith | Wrong faith, Broken charter (faith) | a faith tolerance charter, or a ruler of their faith | everyone of that faith | none | preacher |
| Homeland | Foreign rule, Far from the throne | self-rule, then independence | everyone of the homeland's language | none | local |
| Town | Homeless, Broken charter, Soldiers quartered | a town law charter; work; the soldiers gone | homeless, craftsmen, market folk | homeless, craftsmen, market folk | local |
| Lord | Harsh lord | the lord's want | the lord's retinue and officials, and his people of his faith and language | none | the lord himself |
| Pretender | none | the pretender on the throne, or the province handed to them | lords who back the pretender, and anyone with a grievance | none | the pretender |
| New ideas | none | a new kind of government | townsfolk and scholars | craftsmen, market folk, clergy, clerks, scholars | local |

## Other grievance causes

| Key | Value |
|---|---|
| `Burned homes` | Hunger |
| `Plague` | Hunger |
| `Requisitioned` | Hunger |
| `Bloodshed` | Hunger |
| `Persecuted` | Hunger |
| `Ungoverned` | Tax |
| `Grasping officials` | Tax |
| `Banned language` | Homeland |
| `Newly taken` | Homeland |

## Join share

| Key | Value |
|---|---|
| `homeless` | 0.3 |
| `cause_class` | 0.1 |
| `faith_or_tongue` | 0.08 |
| `other` | 0.02 |

## Leaders

| Name | roles | brings |
|---|---|---|
| local | dyer, miller, village elder | Cunning, little Might |
| preacher |  | faith spreads to neighbours twice as fast |
| veteran |  | Might |
| the lord himself |  | his retinue, his wealth and his officials |
| the pretender |  | the lords who back them; foreign help |

## Arms

| Key | Value |
|---|---|
| `steps` | Tools, Old weapons, Armed, Soldiers |

### Multiplier

| Key | Value |
|---|---|
| `Tools` | 0.4 |
| `Old weapons` | 0.6 |
| `Armed` | 0.8 |
| `Soldiers` | 1 |

### Sources

#### Old weapons

- forge
- veteran leader

#### Armed

- forge, market
- captured castle store
- foreign gold

#### Soldiers

- lord's retinue
- deserters
- rival's troops
- pretender's army

## Severity

| Key | Value |
|---|---|
| `rebellion_min` | 2 |
| `rebellion_max` | 5 |

## Spread

| Key | Value |
|---|---|
| `higher` | same grievance, shares faith or language, roads, rivers and traders, many homeless, owner's army away at war, owner massacred last rising, rival pays the rebels |
| `lower` | no shared grievance, garrisoned castle on the road, judge, owner's army in the region, owner pardoned last rising, almshouse |

## Talk

| Key | Value |
|---|---|
| `share` | 0.5 |
| `usually_works` | Hunger, Tax, Town |
| `rarely_works` | Faith, Homeland |

## Scatter

| Key | Value |
|---|---|
| `die` | 0.333333 |
| `flee` | 0.333333 |
| `homeless` | 0.333333 |

## Outcomes

| Key | Value |
|---|---|
| `Hunger` | the castle's food is handed out, Hungry ends, the lord turns disloyal |
| `Tax` | tax fixed at light |
| `Faith` | faith tolerance charter in every held province |
| `Faith great revolt` | a ruler of their faith |
| `Homeland` | their provinces break away as a new country |
| `Town` | town law charter, the quartered army leaves |
| `Lord` | the lord gets his want, he leaves the realm with his land as his own country or under a neighbour |
| `Pretender` | the pretender takes the throne in a great revolt, the province passes to the pretender |
| `New ideas` | the government changes through the event tree's revolution events |

## Card

| Key | Value |
|---|---|
| `answers` | Grant demand, Talk, Bribe leader, Wait, Attack |

### Demand

| Key | Value |
|---|---|
| `Tax` | tax back to normal |

### Arms

| Key | Value |
|---|---|
| `Tools` | tools |
| `Old weapons` | tools and old weapons |
| `Armed` | armed |
| `Soldiers` | soldiers |

## New ideas

| Key | Value |
|---|---|
| `ideologies` | liberalism, socialism, communism, nationalism |
| `min_support` (provisional) | 0.3 |
| `from_age` | revolutions |

## Provisional

| Key | Value |
|---|---|
| `spread_chance_per_month` (provisional) | 0.1 |
| `talk_gold_per_province` (provisional) | 10 |
| `bribe_gold_per_100_rebels` (provisional) | 1 |
| `grant_points` (provisional) | 5 |
| `grant_months` (provisional) | 12 |
| `pardon_calm_factor` (provisional) | 2 |
| `new_preacher_after_months` (provisional) | 12 |
| `disloyal_lord_revolt_chance` (provisional) | 0.05 |
| `leader_cunning` (provisional) | 3 |
| `leader_might` (provisional) | 1 |
| `talk_usually_chance` (provisional) | 0.75 |
| `talk_rarely_chance` (provisional) | 0.15 |
| `talk_other_chance` (provisional) | 0.3 |
| `bribe_melt_chance` (provisional) | 0.5 |
| `melts_below_men` (provisional) | 200 |
| `march_days_per_province` (provisional) | 7 |
| `grant_food_months` (provisional) | 4 |
| `light_tax_years_granted` (provisional) | 10 |
