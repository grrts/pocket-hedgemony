# Events data

Every value in the game's events config, exactly as the game reads it. This page is made from `packages/rules/data/domain/events.json` each time the config changes, so it always matches the game. How these values are used is explained on [Historical Events](Historical-Events).

Keys are written as in the config file. Shares are fractions (0.25 is 25 %), and values marked (provisional) are placeholders that may still change in balancing. Inventions are shown by id and name; see [Research data](Data-Research#inventions).

> Event tree rules (domain/events/spec.md). balance = event-tree/data/balance.yaml; vocabulary, enums and statistics are the event tree's closed lists. All balance values are placeholders.

| Key | Value |
|---|---|
| `effect_tiers` | immediate, delayed, ongoing, long\_term, rising\_won, rising\_crushed |
| `layers` | history\_reference, ages, periods, event\_definitions, triggers, selection, execution, choices, ai, effects, modifiers, statistics, balance, localization.en |
| `system_flags` | ruler\_died, succession\_crisis, succession\_dispute, regency, female\_succession, ruler\_led\_campaign, emperor, empire\_member, atlantic\_island\_bases, potato\_blight, commercial\_crisis, claim\_on\_spain, claim\_on\_milan, claim\_on\_naples, catholic\_heir, church\_corruption\_scandal, inquisition\_established, religious\_persecution\_active, missionary\_persecution, colonial\_dispute, confederation\_policy, cotton\_famine\_or\_sugar\_boom, doctrine\_of\_lapse, forced\_cash\_crops, french\_pacific\_claims, opium\_ban\_enforced, penal\_transport\_needed, rubber\_boom, sepoy\_grievance, settler\_land\_pressure, transit\_of\_venus, witwatersrand\_gold |
| `rebel_size_stat` | recruit\_pool |

## Campaign

> D-EVT-1: events whose history starts after end\_date are dropped when a campaign loads; out\_of\_scope\_ages never start (X-14).

| Key | Value |
|---|---|
| `end_date` | 1939-08-31 |
| `out_of_scope_ages` | age\_of\_decolonization, cold\_war, age\_of\_globalization |

### Events choice

> D-EVT-9: the new-game 'Events' choice; its value picks the alternate history preset.

| Key | Value |
|---|---|
| `default` | Plausible |

#### Values

| Key | Value |
|---|---|
| `Historical` | historical |
| `Plausible` | plausible |
| `Free` | divergent |

## Balance

| Key | Value |
|---|---|
| `validation_checks` | Every referenced id (age, period, event, entity, region, area, province, modifier, source, stat, flag) exists., Every condition and effect type is declared in vocabulary.yaml with known parameters., Roles referenced as $role are declared in the event; every event has at least one role., Each event has 2+ options, exactly one historical option, and unique option ids., narrative\_only events offer no option with a positive stat or prestige payoff to the perpetrator., Mandatory prerequisite graph (requires / event conditions in triggers) has no cycles (Tarjan SCC)., Earliest possible date propagated through prerequisites never exceeds an event's latest date (no impossible triggers)., Mutually exclusive events are never both mandatory prerequisites of a third event., Entities referenced in a trigger exist at the event's date or are created by a reachable earlier event., Flags read by triggers are set by some effect or declared as system flags., Ages and periods have start and end conditions; periods lie inside at least one of their ages., Coverage: events per macro-region per age, and agency share per region. |

### Selection

| Key | Value |
|---|---|
| `pool_roll_interval_months` | 1 |
| `max_pool_events_per_country_year` | 3 |
| `decision_expiry_years` | 10 |

#### Alternate history mode

| Name | follow up boost mult | historical option mult | mean years mult |
|---|---|---|---|
| historical | 1.5 | 2 | 0.8 |
| plausible | 1 | 1 | 1 |
| divergent | 0.6 | 0.5 | 1.3 |

### Follow ups

| Key | Value |
|---|---|
| `max_boost` | 5 |
| `boost_decay_years` | 10 |

### Ai factors

| Key | Value |
|---|---|
| `at_war` | Country is at war. |
| `low_treasury` | Treasury below one year of expenses. |
| `high_unrest` | More than half the country's provinces have 4 or more grievances (Plotting). |
| `same_religion` | Other party shares state religion. |
| `rival` | Other party is a rival. |
| `great_power` | Country ranks in the top 8 by great\_power\_score. |
| `threatened` | A hostile neighbour has more than 1.5x army\_strength. |

### Rebel sizes (provisional)

> D-EVT-5: share of the province's recruit pool that rises (X-9). Same 1:2:4:8 steps as the tree's sizes.

| Key | Value |
|---|---|
| `small` | 0.125 |
| `medium` | 0.25 |
| `large` | 0.5 |
| `huge` | 1 |

### Modifier rules

| Key | Value |
|---|---|
| `default_stacking` | refresh |
| `max_stacks` | 3 |
| `exponential_half_life_share` | 0.5 |

### Coverage

| Key | Value |
|---|---|
| `min_events_per_region_age` | 2 |
| `min_agency_share` | 0.35 |

### Date binding

> EVT-019: approximate events weigh their pool chance toward the history date; mandatory events fire in their last year if the trigger holds.

| Key | Value |
|---|---|
| `approximate_peak_mult` (provisional) | 2 |
| `approximate_spread_years` (provisional) | 10 |

### Options

> D-EVT-7

| Key | Value |
|---|---|
| `min` | 2 |
| `max` (provisional) | 4 |

## Enums

| Key | Value |
|---|---|
| `religions` | catholic, protestant, anglican, orthodox, oriental\_christian, sunni, shia, ibadi, jewish, hindu, sikh, theravada, mahayana, vajrayana, shinto, confucian\_ritual, daoist, indigenous\_american, african\_traditional, pacific\_traditional, siberian\_steppe\_traditional, secular |
| `governments` | monarchy, elective\_monarchy, theocracy, republic, merchant\_republic, tribal, confederation, nomadic\_empire, company, colonial\_administration, constitutional\_monarchy, liberal\_democracy, one\_party\_state, communist, fascist, military\_junta |
| `innovations` | printing, bombards, humanist\_learning, bastion\_fortification, gunpowder\_infantry, ocean\_navigation, joint\_stock\_finance, public\_debt\_markets, experimental\_science, steam\_power, mechanized\_textiles, railways, telegraphy, vaccination\_and\_sanitation, electrification, mass\_literacy\_schooling, chemical\_industry, motor\_and\_air\_transport |
| `ideologies` | humanism, devotional\_reform, religious\_zeal, religious\_tolerance, qizilbash\_messianism, islamic\_reformism, sinocentric\_order, parliamentarism, liberalism, nationalism, abolitionism, humanitarianism, militarism, socialism, communism, fascism, anticolonialism, pan\_africanism, pan\_arabism, pan\_islamism |
| `culture_groups` | latin, germanic, slavic, hellenic, turkic, iranian, arab, berber, cushitic, semitic\_ethiopian, mande, akan, yoruba\_edo, hausa\_fulani, bantu, khoisan, nilotic, indo\_aryan, dravidian, tibeto\_burman, tai, austroasiatic, austronesian, sinitic, japonic, koreanic, mongolic, tungusic, uralic, nahua, maya, andean, tupi\_guarani, algonquian, iroquoian, creole\_atlantic, polynesian, melanesian, aboriginal\_australian, celtic, baltic, caucasian, hebrew |
| `rebel_types` | peasant, religious, noble, separatist, revolutionary, independence, anticolonial, any |
| `relation_types` | alliance, rivalry, subject, overlord, truce, trade\_pact, guarantee, personal\_union, embargo, non\_aggression |
| `period_kinds` | political, war, religious, economic, colonial, demographic, environmental, intellectual |
| `entity_kinds` | polity, company, movement, population\_group, organization |

## Statistics

### Province

| Name | kind | unit | range |
|---|---|---|---|
| population | stored | thousands of people |  |
| culture\_share | stored | map culture\_id -\> share 0-1 | 0, 1 |
| religion\_share | stored | map religion\_id -\> share 0-1 | 0, 1 |
| prosperity | stored | integer level 1-60 | 1, 60 |
| infrastructure | stored | level 0-10 | 0, 10 |
| industry | stored | level 0-10 | 0, 10 |
| trade\_good | stored | id (grain, fish, wool, cloth, sugar, spices, silver, gold, cotton, coal, iron, oil, rubber, ...); enslaved people are never a trade good, see redundancy\_notes |  |
| trade\_access | derived | 0-1 | 0, 1 |
| resource\_output | derived | goods units / year |  |
| devastation | stored | 0-100 | 0, 100 |
| unrest | stored | 0-100 | 0, 100 |
| control | stored | 0-100 | 0, 100 |
| colonial\_status | stored | enum none \| trading\_post \| settlement \| plantation \| protectorate \| colony \| occupied \| mandate |  |
| disease\_burden | stored | 0-100 | 0, 100 |
| fort\_level | stored | 0-5 | 0, 5 |
| terrain | stored (static) | enum |  |
| local\_supply | derived | regiments supportable |  |
| manpower\_yield | derived | men / year |  |
| urbanization | derived | 0-1 | 0, 1 |
| food\_security | derived | 0-1 | 0, 1 |
| innovation\_presence | stored | map institution\_id -\> 0-1 | 0, 1 |
| environmental\_degradation | stored | 0-100 | 0, 100 |

### Country

| Name | kind | unit | range | owner | lands as |
|---|---|---|---|---|---|
| treasury | stored | gold (era-normalized currency) |  |  |  |
| debt | stored | gold |  |  |  |
| income | derived | gold / year |  |  |  |
| expenses | derived | gold / year |  |  |  |
| economic\_output | derived | index |  |  |  |
| trade\_power | derived | share per trade node |  |  |  |
| industrial\_capacity | derived | index |  |  |  |
| manpower | stored pool with derived max | men |  |  |  |
| army\_strength | derived | index |  |  |  |
| military\_quality | derived | 0-100 | 0, 100 |  |  |
| navy\_strength | derived | index |  |  |  |
| naval\_reach | derived | sea zones |  |  |  |
| admin\_capacity | stored | 0-100 | 0, 100 |  |  |
| integration\_strain | derived | 0-200 % | 0, 200 |  |  |
| stability | stored | integer -3..+3 | -3, 3 |  |  |
| legitimacy | stored | 0-100 | 0, 100 |  |  |
| war\_weariness | stored | 0-20 | 0, 20 |  |  |
| prestige | stored | -100..100 | -100, 100 |  |  |
| notoriety | derived | 0-100 | 0, 100 | diplomacy | notorious\_deed |
| great\_power\_score | derived | index |  |  |  |
| tech\_state | stored | level 1-40 | 1, 40 |  |  |
| tech\_economy | stored | level 1-40 | 1, 40 |  |  |
| tech\_military | stored | level 1-40 | 1, 40 |  |  |
| innovations | stored | set of institution ids |  |  |  |
| literacy | stored | 0-100 | 0, 100 |  |  |
| ideology\_support | stored | map ideology\_id -\> 0-1 | 0, 1 |  |  |
| cohesion | derived | 0-1 | 0, 1 |  |  |
| separatism\_risk | derived | 0-1 | 0, 1 |  |  |
| public\_health | derived | 0-1 | 0, 1 |  |  |
| resource\_dependency | derived | 0-1 | 0, 1 |  |  |
| government | stored | enum |  |  |  |
| state\_religion | stored | id |  |  |  |
| primary\_culture | stored | id |  |  |  |

### Global

| Name | kind | unit | range |
|---|---|---|---|
| global\_tension | stored | 0-100 | 0, 100 |
| climate\_anomaly | stored | degrees C relative to 1850-1900 baseline (scenario values) | 1850, 1900 |
| world\_trade\_index | derived | index |  |
| innovation\_spread | derived | map institution\_id -\> share of world prosperity |  |

### Relationships

| Name | kind | unit | range | owner | lands as |
|---|---|---|---|---|---|
| opinion | stored | -200..200 | -200, 200 |  |  |
| trust | derived | 0-100 | 0, 100 | diplomacy | oath\_broken |

## Ai factor rules

> The numbers in balance.yaml ai\_factors' descriptions. high\_unrest (D-EVT-5): more than high\_unrest\_share of the chooser's provinces have high\_unrest\_grievances or more grievances.

| Key | Value |
|---|---|
| `great_power_top` | 8 |
| `threatened_ratio` | 1.5 |
| `low_treasury_years_of_expenses` | 1 |
| `high_unrest_share` (provisional) | 0.5 |
| `high_unrest_grievances` | 4 |

## Modifier changes

> modifiers.yaml header: plain numbers hold on level stats and apply per year on accumulating stats.

| Key | Value |
|---|---|
| `accumulating` | prestige, literacy, prosperity, tech\_state, tech\_economy, tech\_military |

## Rise is cost

> Statistics whose rise is a burden in statistics.yaml (narrative\_only payoff check).

| Key | Value |
|---|---|
| `stats` | unrest, devastation, war\_weariness, debt, notoriety, integration\_strain, disease\_burden, environmental\_degradation, separatism\_risk, expenses |

## System flag owners

> D-EVT-16: flags other contexts set by their own rules; the rest are set by the engine or the scenario.

| Key | Value |
|---|---|
| `religious_persecution_active` | religion |
| `missionary_persecution` | religion |
| `inquisition_established` | religion |

## Stat mapping

> D-EVT-4: the anti-corruption mapping. Event data keeps the tree's names; each change lands as the owning context's concrete change. per\_point: amount per point of change; fixed: amount for any rise; scale: multiplies a fractional change.

| Name | owner | lands as | per point | fixed | scale | per tenth | read as |
|---|---|---|---|---|---|---|---|
| population | province | people\_pct | 1 |  |  |  |  |
| prosperity | province | fitting\_buildings | 1 |  |  |  |  |
| devastation | province | burned\_tiles\_pct | 1 |  |  |  |  |
| unrest | province | named\_grievance |  | 1 |  |  |  |
| control | province | official\_flees\_or\_road\_breaks |  | 1 |  |  |  |
| fort\_level | province | castle\_steps | 1 |  |  |  |  |
| infrastructure | province | road\_steps | 1 |  |  |  |  |
| industry | province | factories | 1 |  |  |  |  |
| trade\_access | trade | trade\_ratio\_gain\_pct |  |  | 100 |  |  |
| food\_security | province | harvest\_steps\_worse |  |  |  | 0.67 |  |
| disease\_burden | province | plague\_outbreak |  | 1 |  |  |  |
| legitimacy | realm | lord\_loyalty\_points | 1 |  |  |  |  |
| stability | realm | lord\_loyalty\_and\_revolt | 1 |  |  |  |  |
| war\_weariness | realm | fallen | 1 |  |  |  |  |
| trade\_index | trade | trade\_ratio\_pct | 1 |  |  |  |  |
| trust | diplomacy | oath\_broken |  | 1 |  |  |  |
| notoriety | diplomacy | notorious\_deed | 1 |  |  |  |  |
| integration\_strain | events | read\_only |  |  |  |  | share of the realm's provinces with one or more grievances, in % |

## Derived formulas

> EVT-054: derived province values the tree recomputes each tick (statistics.yaml), with provisional k values.

| Key | Value |
|---|---|
| `k_supply` (provisional) | 1 |
| `good_base_yield` (provisional) | 1 |
| `tech_economy_bonus` (provisional) | 0 |
| `terrain_supply_mult` (provisional) | 1 |

## Innovations from research

> D-EVT-19: the tree's innovations a realm has adopted include the research inventions it knows, by this table (tree innovation -\> research invention).

| Key | Value |
|---|---|
| `bombards` | [W3 Bombards](Data-Research#inventions) |
| `gunpowder_infantry` | [W5 gunpowder\_infantry](Data-Research#inventions) |
| `ocean_navigation` | [S4 Carrack and caravel](Data-Research#inventions) |
| `printing` | [L5 printing](Data-Research#inventions) |
| `humanist_learning` | [L6 humanist\_learning](Data-Research#inventions) |

## Goals

> Realms' historical goals (EVT-100 to EVT-108). Provisional (plan-1378 §2).

| Key | Value |
|---|---|
| `shake_low` | 0.5 |
| `shake_high` | 1.5 |
| `lead_years` | 5 |
| `lapse_years` | 10 |
| `war_chance_per_pull` | 1 |
| `target_weight_per_pull` | 4 |
| `envoy_points_per_pull` | 10 |

### Weights

| Key | Value |
|---|---|
| `weak` | 0.5 |
| `normal` | 1 |
| `strong` | 2 |

### Deviate share

| Key | Value |
|---|---|
| `historical` | 0.1 |
| `plausible` | 0.25 |
| `divergent` | 0.5 |

### Preset mult

| Key | Value |
|---|---|
| `historical` | 1.5 |
| `plausible` | 1 |
| `divergent` | 0.5 |

## Chronicle

> The Chronicle card (EVT-109 to EVT-111). Provisional.

| Key | Value |
|---|---|
| `on_course_years` | 10 |
| `horizon_years` | 25 |
