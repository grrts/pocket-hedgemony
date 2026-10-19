# Trade data

Every value in the game's trade config, exactly as the game reads it. This page is made from `packages/rules/data/domain/trade.json` each time the config changes, so it always matches the game. How these values are used is explained on [Trade](Trade).

Keys are written as in the config file. Shares are fractions (0.25 is 25 %), and values marked (provisional) are placeholders that may still change in balancing. Inventions are shown by id and name; see [Research data](Data-Research#inventions).

> `comment\_sea\_traders`: D-TRADE-5: a ship trades only if naval gives its type a hold and purse (the caravel does not); its upkeep is naval's ship upkeep.

| Key | Value |
|---|---|
| `s2_hold_bonus` (provisional) | 0.5 |

## Ratio

| Key | Value |
|---|---|
| `gain_per_trader` (provisional) | 3 |
| `decay_share` (provisional) | 0.1 |
| `max` | 100 |
| `sea_lane_trader_weight` (provisional) | 0.5 |
| `modifiers_combine` | add |
| `better_road_than` | every\_neighbour |
| `shrine_pilgrims_passing` (provisional) | 1 |

### Modifiers (provisional)

| Key | Value |
|---|---|
| `customs_officer` | 0.15 |
| `better_road_than_neighbours` | 0.1 |
| `peace_10_years` | 0.1 |
| `riots` | -0.5 |
| `homeless_per_5pct_over_5pct` | -0.05 |
| `enemy_army_or_siege` | -1 |

#### Quarantine

| Key | Value |
|---|---|
| `set_ratio` | 0 |
| `closed` | yes |

## Value

> `comment\_food\_surplus`: D-TRADE-19: food surplus = food made − food the province's people eat that year, never below 0; a full store does not change it.

| Key | Value |
|---|---|
| `months_per_year` | 12 |
| `traded_food` | surplus\_only |
| `food_wares` | grain, rice, fish |
| `craft_buildings` | loom\_house, forge, kiln, tannery, press, brewery |
| `serves_without_market` (provisional) | 2 |
| `city_size_is_city` | city, great\_city |
| `trading_post_is_city` | yes |
| `silver_after_flood` (provisional) | 6 |

### Price per load (provisional)

| Name | price | wares |
|---|---|---|
| staples | 1 | grain, rice, fish, salt, timber, hides, pottery |
| raw | 2 | wool, flax, cotton, iron, copper, tin, horses, saltpetre, dyes |
| finished | 5 | cloth, linen, leather, tools, arms, beer\_wine, paper, powder |
| luxury | 10 | silk, silk\_cloth, spices, pepper, sugar, tea, coffee, cocoa, tobacco, incense, ivory, porcelain, furs, gems, books |
| precious | 12 | silver, gold |

### Building weights (provisional)

| Name | weight | serves | is city | applies to | stops bandits | foreign deposits | each |
|---|---|---|---|---|---|---|---|
| weekly\_market | 0.25 | 4 | yes |  |  |  |  |
| yearly\_fair | 0.5 | 8 | yes |  |  |  |  |
| trading\_house | 1 | 16 | yes |  |  |  |  |
| caravanserai | 0.25 |  |  | land | yes |  |  |
| warehouse | 0.25 |  |  |  |  |  |  |
| harbour | 0.25 |  |  | sea |  |  |  |
| counting\_house | 0.1 |  |  |  |  | yes |  |
| bank | 0.25 |  |  |  |  | yes |  |
| craft\_building | 0.05 |  |  |  |  |  | yes |

## Collect

| Key | Value |
|---|---|
| `when` | on\_enter |
| `visit_share` (provisional) | 0.2 |
| `ships_collect_at_sea` | no |
| `foreign_market_fee` (provisional) | 0.1 |
| `trade_pact_fee` | 0 |

## Deposit

| Key | Value |
|---|---|
| `own_royal_city` | 1 |
| `bills_of_exchange_fee` (provisional) | 0.1 |
| `needs_invention_for_abroad` | [T3 Bills of exchange](Data-Research#inventions) |

### Lord city

| Key | Value |
|---|---|
| `to_treasury` | 1 |

## Route

> D-TRADE-21: a route is a start and an end, walked there and back; the planner finds the way, drawn toward the most populated land: a province's days count divided by 1 + busy\_weight x its people over the world's average, at most busy\_cap times the average.

| Key | Value |
|---|---|
| `min_stops` | 2 |
| `max_stops` | 2 |
| `default_mode` | there\_and\_back |
| `toll_counts_as_days` (provisional) | 2 |
| `busy_weight` (provisional) | 1 |
| `busy_cap` (provisional) | 3 |

## Tolls

| Key | Value |
|---|---|
| `none` | 0 |
| `low` (provisional) | 0.2 |
| `high` (provisional) | 0.5 |

## Danger (provisional)

| Key | Value |
|---|---|
| `bandit_chance_per_month` | 0.05 |
| `raid_trader_escapes` | 0.5 |
| `t1_bandit_chance_factor` | 0.5 |
| `t11_lost_purse_refund` | 0.5 |

### Bandit when

| Key | Value |
|---|---|
| `riots` | yes |
| `rebels` | yes |
| `homeless_share_over` | 0.2 |

## Upkeep

> D-TRADE-11: land traders and trade ships alike are lost after 6 unpaid months.

| Key | Value |
|---|---|
| `unpaid_months_to_lose` (provisional) | 6 |

## Land traders (provisional)

| Name | era | step factor | hold | purse | crew | found | upkeep | desert step factor | needs | more |
|---|---|---|---|---|---|---|---|---|---|---|
| pack\_caravan | 1 | 0.75 | 1 | 10 | class: market\_folk; count: 50 | 15 | 0.5 |  |  |  |
| camel\_caravan | 1 | 0.75 | 1.5 | 15 | class: market\_folk; count: 50 | 20 | 0.6 | 0.5 | T1\_or\_desert\_home | desert grounds: desert, drylands |
| river\_barge | 1 | 0.4 | 1.5 | 15 | class: market\_folk; count: 50 | 15 | 0.4 |  |  | river only: yes |
| wagon\_train | 4 | 0.6 | 2 | 25 | class: market\_folk; count: 80 | 30 | 0.8 |  | [B9 Turnpike roads](Data-Research#inventions) |  |
| rail\_freight | 5 |  | 6 | 80 | class: craftsmen; count: 120 | 80 | 2 |  | rail\_station\_both\_ends | step: rail |

## Sea traders (provisional)

| Name | naval type | hold | purse | enclosed seas only | needs coal port |
|---|---|---|---|---|---|
| cog\_junk\_dhow | cog | 2 | 30 |  |  |
| galley | galley | 2 | 25 | yes |  |
| carrack | carrack | 3 | 50 |  |  |
| galleon | galleon | 3 | 60 |  |  |
| fluyt | fluyt | 4 | 70 |  |  |
| steamer | steamer | 6 | 150 |  | yes |

## Research (provisional)

| Key | Value |
|---|---|
| `t2_collect_bonus` | 0.1 |
| `t6_extra_served_visits` | 2 |
| `t9_ship_cost_factor` | 0.75 |
| `t5_indian_ocean_storm_factor` | 0.5 |
| `t6_unlocks_yearly_fair` | yes |
| `t5_indian_ocean_zones` | Arabian Sea, Bay of Bengal, Gulf of Aden, Red Sea, Persian Gulf, Indian Ocean |

## Peace terms

| Key | Value |
|---|---|
| `open_the_roads_years` (provisional) | 10 |

## Effects (provisional)

| Key | Value |
|---|---|
| `crafts_appear_min_ratio` | 30 |
| `missing_input_output` | 0.5 |

### Tax per ratio points

| Key | Value |
|---|---|
| `points` | 4 |
| `tax` | 0.01 |

## Start

| Key | Value |
|---|---|
| `warmup_months` (provisional) | 24 |

### Traders by trade access (provisional)

| Key | Value |
|---|---|
| `very_high` | 6 |
| `high` | 4 |
| `moderate` | 2 |
| `low` | 1 |
| `very_low` | 0 |
| `unknown` | 0 |

### Routes

| Name | country | label | stops |
|---|---|---|---|
| 1 | Venice | galley line | Venice, Alexandria |
| 2 | Venice |  | Constantinople, Tana |
| 3 | Genoa |  | Genoa, Caffa |
| 4 | Lübeck |  | Lübeck, Bergen |
| 5 | Lübeck |  | Lübeck, Bruges |
| 6 | Lübeck | caravan | Lübeck, Novgorod |
| 7 | Florence | caravan | Florence, Venice |
| 8 | Mali | camel caravan | Timbuktu, Sijilmasa |
| 9 | Kilwa | dhow | Kilwa, Sofala |
| 10 | Kilwa | dhow | Kilwa, Malindi |
| 11 | Calicut | dhow | Calicut, Aden |
| 12 | Malacca | junk | Malacca, Ayutthaya |
| 13 | Malacca |  | Malacca, Calicut |
| 14 | Ryukyu | junk | Naha, Fuzhou |
| 15 | Ryukyu | junk | Naha, Hakata |

## Ai (provisional)

| Key | Value |
|---|---|
| `caravan_reach_provinces` | 12 |
| `ship_reach_sea_zones` | 40 |
| `found_margin` | 1.25 |
| `reroute_every_months` | 12 |
| `dismiss_after_losing_months` | 12 |
| `near_front_provinces` | 2 |

## Found

> D-TRADE-2: an own city with any market step (weekly market or better), or a trading post once T8 is known.

| Key | Value |
|---|---|
| `needs` | market\_or\_trading\_post\_with\_T8 |

## Visibility

> D-TRADE-13: a country sees the trade value and ratio of its own provinces and of every province its traders entered (last seen values); with T13 every known province, current values. The route preview counts unseen provinces as 0.

| Key | Value |
|---|---|
| `t13_sees_all` | yes |

## Hubs (provisional)

> D-TRADE-17: a hub is the province or sea zone it is named after (two for bruges\_antwerp, the lower Volga for volga); labels for event triggers only. Provisional.

| Name | provinces | sea zones |
|---|---|---|
| alexandria | Alexandria | none |
| amsterdam | Amsterdam | none |
| malacca\_strait | Malacca | Strait of Malacca |
| venice | Venice | none |
| genoa | Genoa | none |
| seville | Seville | none |
| bruges\_antwerp | Bruges, Antwerp | none |
| tabriz | Tabriz | none |
| aleppo | Aleppo | none |
| volga | Astrakhan, Kazan | none |

## Event mapping

> D-TRADE-17: trade\_index = trade income over the last 12 months ÷ 100 gold × 100 for every country (provisional).

| Key | Value |
|---|---|
| `trade_index_reference_per_year` (provisional) | 100 |
| `hub_window_months` | 12 |

## Heritage levers

> X-6: trade\_balance\_pct and traders\_passing\_pct are a percentage on ratio gain in the realm's provinces; trader\_gain\_pct a percentage on each deposit; trader\_count extra starting traders.

| Key | Value |
|---|---|
| `trade_balance_pct` | ratio\_gain |
| `traders_passing_pct` | ratio\_gain |
| `trader_gain_pct` | deposit |
| `trader_count` | starting\_traders |

## Materials

> X-6: materials at the ware's price per load, 25 % dearer where no trade route touches the province: no trader route has it as a stop and no trader passed it in the last 12 months.

| Key | Value |
|---|---|
| `no_route_markup` (provisional) | 0.25 |
| `route_memory_months` | 12 |

## Game (provisional)

> D-TRADE-20, the game's first slice of trade (provisional). value\_scale turns goods gold into the treasury's gold so the world's trade income in 1444 is about what the old flat trade line paid; purse\_scale does the same for purses. Craftsmen make crafts (finished goods) and the food surplus is grain until the craft and food buildings make their own wares. The AI looks for loops within its reach in days, counts a quiet road as this ratio, and founds at most one trader a year while it has fewer than this many times its starting traders, plus one. A loop bringing at least ai\_keep\_route\_over\_upkeep times its upkeep is kept at the yearly look.

| Key | Value |
|---|---|
| `value_scale` | 0.08 |
| `purse_scale` | 0.2 |
| `food_loads_per_thousand_fed` | 1 |
| `crafts_loads_per_thousand` | 1 |
| `leg_max_days` | 150 |
| `ai_reach_days_land` | 60 |
| `ai_reach_days_sea` | 60 |
| `ai_ratio_floor` | 20 |
| `ai_candidates` | 8 |
| `ai_max_traders_per_start` | 2 |
| `ai_found_reserve` | 3 |
| `ai_keep_route_over_upkeep` | 4 |
