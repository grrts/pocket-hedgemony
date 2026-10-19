# Realm data

Every value in the game's realm config, exactly as the game reads it. This page is made from `packages/rules/data/domain/realm.json` each time the config changes, so it always matches the game. How these values are used is explained on [Your Realm](Your-Realm).

Keys are written as in the config file. Shares are fractions (0.25 is 25 %), and values marked (provisional) are placeholders that may still change in balancing. Inventions are shown by id and name; see [Research data](Data-Research#inventions).

> Realm (domain/realm/spec.md), from country stats v3. Every number is a placeholder for config. Each stat lists the causes that gain it and the causes that lose it (REALM-001); amounts come from the context that owns the cause.

| Key | Value |
|---|---|
| `harvest_steps` | failed, poor, normal, good, bumper |
| `tax_rates` | none, light, normal, heavy, crushing |
| `grain_price_gold_per_food` (provisional) | 0.5 |
| `subject_kinds` | vassals, tributaries, unions, marches, colonies, protectorates |
| `daughters_inherit_crown` (provisional) | castile, navarre, aragon, portugal, england, scotland, naples, hungary, poland |
| `women_reform_multiplier` (provisional) | 2 |

## Stats

| Name | gain | lose |
|---|---|---|
| gold | royal\_taxes, lords\_tax\_share, trade, tribute, grain\_sold, loot\_and\_ransoms, titles\_sold, loan | soldiers\_pay, officials\_wages, school\_upkeep, building, debt\_interest, gifts\_and\_bribes, grain\_bought, repayment |
| debt | loan\_taken, lord\_lends | repaid, lender\_died, lender\_conquered, default |
| harvest | farmland, farmers, inventions, peace | weather, army\_marching, devastation, plague, cold\_period |
| local\_store | harvest\_surplus, castle\_delivery | eating, army\_refill, rot, raid |
| herds | good\_pasture, raiding, tribute | drought, hard\_winter, raided, disease, famine\_slaughter |
| fish | fishing\_boats, salting\_invention | blockade, war\_at\_sea |
| grain\_price | bad\_harvests, war, blockade | good\_harvests, trade\_route |
| castle\_store | collection, castle\_delivery, grain\_bought | garrison, spread, army\_refill, rot, capture |
| granary | granary\_built, invention | siege\_damage, neglect |
| reach | road, river, canal, wagons, research | enemy\_on\_road, winter, devastation |
| people | growth, migrants, conquest | famine, plague, war\_deaths, refugees, forced\_migration |
| provinces | conquest, inheritance, purchase, lord\_joins, colony | lost\_war, ceded, lord\_defects, breakaway |
| royal\_provinces | line\_dies\_out, seized\_from\_lord, conquest\_kept | fief\_granted |
| officials | hired, graduated | dismissed, wages\_unpaid, war\_in\_province |
| faith | missionaries\_and\_clergy, schools, migrants, conversion\_event | conquest, reformation, foreign\_missionaries |
| tongue | assimilation, settlers, schools | conquest, migration, separatists |
| in\_revolt | heavy\_taxes, famine, foreign\_faith\_or\_tongue, disloyal\_lords, lost\_war | rebels\_defeated, demands\_given, taxes\_lowered, food |
| lords | fief\_granted, local\_ruler\_kept, title\_sold, marriage, land\_split, defector | line\_dies\_out, land\_seized, trial, revolt\_defeated, defected, merged |
| soldiers | raised, paid\_company, retinue | battle, disease\_and\_hunger, desertion, disbanded |
| recruits | yearly\_refill, students\_leave\_school | soldiers\_raised, sent\_to\_school, famine, plague |
| horses | breeding, bought, herds, captured | battle, fodder\_shortage, disease |
| ships | built, captured, hired | battle, storm, rot, blockade |
| castles | built, conquered | siege, neglect, demolished\_in\_peace |
| commanders | hired, lord\_or\_heir\_commands, promoted | battle\_death, old\_age, captured |
| fallen | battle\_deaths, siege\_deaths | time |
| heirs | birth, marriage, named | death, married\_abroad, joined\_rebel |
| allies | alliance\_mission, marriage, peace\_term | alliance\_broken, war\_between, bribed\_away |
| enemies | war\_declared, attacked | peace |
| rivals | contested\_claim, border\_dispute | settled, destroyed |
| subjects | forced\_in\_peace, asked\_for\_protection | independence\_war, released, annexed |
| oaths\_broken | truce\_broken, ally\_abandoned, debt\_default | time |
| lands\_taken | conquest | time, land\_given\_back |
| envoys | sent | mission\_ended, killed, held |

## Loyalty

| Key | Value |
|---|---|
| `steps` | Loyal, Wavering, Disloyal, In revolt |
| `up` | want\_granted, gift\_of\_gold, office\_at\_court, marriage\_into\_ruling\_house, victory\_taken\_part, long\_secure\_reign, fed\_in\_famine, shared\_faith\_and\_tongue, war\_against\_rival |
| `down` | heavy\_taxes, land\_seized\_from\_him, land\_seized\_from\_another, war\_lost, battle\_lost, child\_ruler, disputed\_heir, new\_ruler, grain\_requisitioned, foreign\_bribes, crown\_borrowed, massacre, faith\_not\_shared, censured\_by\_head, slighted\_at\_court |

## Food

| Key | Value |
|---|---|
| `collection_options` | 0, 25, 50, 75 |
| `castle_share_rules` | By people, Frontier first, Capital first, Equal, Custom |
| `spread_default` | 50/30/20 |
| `siege_reserve_options` | 0, 3, 6, 12 |
| `army_refill_options` | Locals only, Castles hand out first, No refill in lords' lands |
| `army_refill_default` | Castles hand out first |
| `surplus_options` | Keep, Sell to the treasury, Send to the capital castle, Send to subjects or allies |
| `surplus_default` | Keep |
| `campaign_eat` | 2 |
| `horse_eats` | 3 |
| `months_per_year` | 12 |

### Spread patterns

| Key | Value |
|---|---|
| `50/30/20` | 50, 30, 20 |
| `Tight` | 80, 20, 0 |
| `Wide` | 30, 35, 35 |

### Famine rule options

| Key | Value |
|---|---|
| `Off` | none |
| `1 month` | 1 |
| `3 months` | 3 |

### Lords castles

| Key | Value |
|---|---|
| `Loyal` | 1 |
| `Wavering` | 0.5 |
| `Disloyal` | 0 |
| `In revolt` | 0 |

### Presets

| Name | collection | castle shares | spread | siege reserve | army refill | surplus |
|---|---|---|---|---|---|---|
| Feed the people | 25 | By people | Wide | 3 | Castles hand out first |  |
| Fortress realm | 50 | Frontier first | Tight | 12 | Locals only |  |
| War footing | 75 | Frontier first | 50/30/20 | 6 | Castles hand out first |  |
| Merchant | 50 | Capital first | 50/30/20 | 3 | No refill in lords' lands | Sell to the treasury |

## Officials

| Key | Value |
|---|---|
| `no_official_share` | 0.5 |

## Lords

| Key | Value |
|---|---|
| `tax_share` | 0.5 |

### Labels

| Key | Value |
|---|---|
| `feudal kingdom` | noble |
| `city republic` | merchant house |
| `theocracy` | bishop or abbot |
| `steppe realm` | clan chief |
| `chiefdom or stateless society` | elder or lineage head |

## Windows

| Key | Value |
|---|---|
| `fallen` | 10 |
| `oaths_broken` | 30 |
| `lands_taken` | 20 |

## Inheritance

| Key | Value |
|---|---|
| `throne_laws` | eldest son, eldest child, eldest of the house, strongest claimant, election by lords |
| `land_laws` | to one heir, split among the sons |

## Win

| Key | Value |
|---|---|
| `domination_share` | 0.5 |
| `subject_province_weight` | 0.5 |
| `checked_month` | 1 |
| `warship_men` (provisional) | 100 |
| `commander_men` (provisional) | 1000 |
| `army_power_per_men` (provisional) | 1000 |

### Army weights (provisional)

| Key | Value |
|---|---|
| `foot` | 1 |
| `horse` | 2 |
| `guns` | 3 |

## Campaign end

| Key | Value |
|---|---|
| `year` | 1939 |
| `month` | 8 |
| `day` | 31 |

## Succession by form

| Key | Value |
|---|---|
| `Eldest heir` | eldest son |
| `Strongest son` | strongest claimant |
| `Named heir` | eldest son |
| `Lords elect` | election by lords |
| `Council picks` | election by lords |
| `Assembly picks` | election by lords |
| `Elections` | election by lords |
| `Chapter elects` | election by lords |
| `Brothers elect` | election by lords |
| `Clergy choose` | election by lords |
| `Elders choose` | election by lords |
| `From the chief's lineage` | eldest of the house |
| `Royal kin choose` | election by lords |
| `Eldest of the house` | eldest of the house |
| `Members take turns` | election by lords |
| `Heir or adopted son` | eldest son |
| `Emirs choose` | election by lords |
| `Generals choose` | election by lords |
| `The party chooses` | election by lords |
| `Owners appoint` | election by lords |
| `Overlord appoints` | election by lords |

## Great lord (provisional)

| Key | Value |
|---|---|
| `one_reason_from` | 4 |
| `two_reasons_from` | 8 |

## Event stat map

| Key | Value |
|---|---|
| `legitimacy` | loyal lords, heirs, years on throne |
| `stability` | loyal lords, provinces in revolt |
| `war_weariness` | Fallen, peace voices |
| `prestige` | victories, lands taken |
| `admin_capacity` | the officials cap |
| `tech_* and innovation` | inventions from the research tree |
| `literacy` | scholars and schools per thousand people |
| `food_security` | local store, castle store, harvest, herds |
| `debt` | debt |
| `treasury` | gold |
| `navy_strength` | warships |
| `naval_reach` | warships |
| `army_strength` | soldiers |
| `manpower` | recruits |
| `trade_access` | starting traders |
| `opinion` | opinion |
| `trust` | trust |
| `notoriety` | notoriety |

## Women in roles (provisional)

| Name | ruler | lord | commander | official | scholar |
|---|---|---|---|---|---|
| default | 0 | 0.05 | 0.02 | 0.02 | 0.05 |
| by\_country |  |  |  |  |  |

## Age multipliers (provisional)

| Key | Value |
|---|---|
| `Age of Revolutions` | 1.5 |
| `Age of Industrialization` | 2 |
| `Age of World Wars` | 3 |

## Starting (provisional)

| Key | Value |
|---|---|
| `levels` | very\_low, low, moderate, high, very\_high |
| `gold_months_of_income` | 1, 2, 3, 5, 8 |
| `gold_floor` | 10 |
| `levies_share_of_ceiling` | 0.5, 0.65, 0.8, 0.9, 1 |
| `debt_share_of_gold` | 1.5, 1, 0.5, 0.25, 0 |
| `commanders` | 1, 1, 2, 3, 4 |
| `royal_share` | 0.3, 0.4, 0.5, 0.6, 0.7 |
| `officials_per_royal_province` | 0.5, 0.7, 0.9, 1, 1.2 |
| `lords_loyal_share` | 0.2, 0.4, 0.6, 0.8, 0.9 |
| `revolt_share` | 0.2, 0.1, 0.05, 0.02, 0 |
| `lords_per_provinces` | 2, 3, 4, 6, 8 |
| `schools_per_million` | 0, 1, 2, 4, 6 |
| `traders` | 0, 1, 2, 3, 4 |
| `envoys_at_court` | 0, 1, 1, 2, 3 |

### Per thousand people

| Key | Value |
|---|---|
| `soldiers` | 1, 1.5, 2.5, 3.5, 5 |
| `horses` | 0.2, 0.4, 0.8, 1.2, 1.6 |
| `ships` | 0, 0.002, 0.005, 0.01, 0.02 |
| `scholars` | 0, 0.002, 0.004, 0.006, 0.01 |

### Spread by confidence

| Key | Value |
|---|---|
| `low` | 0.25 |
| `medium` | 0.1 |
| `high` | 0.05 |

## Starting armies (provisional)

| Key | Value |
|---|---|
| `men_per_commander` | 8000 |
| `most_commanders` | 8 |

## Starting lords (provisional)

| Key | Value |
|---|---|
| `great_house_types` | duchy, county, lordship, principality, march, margraviate, earldom, barony |
| `generated_one_per_provinces` | 4 |

### Great houses

| Key | Value |
|---|---|
| `france` | alencon, anjou, armagnac, bourbon, foix, nevers, orleans |

### House lands

> D-INST-1 (was OQ-INST-3): a realm whose great houses the data seats on named land; the rest is royal. Japan: fourteen of the catalogue's shugo and Tohoku houses on the prefecture-sized provinces nearest their 1444 seats (the catalogue's Rokkaku, Isshiki and Togashi held land the map draws inside other provinces). The shogunate's lords cap is 14.

#### Japan

| Name | name | provinces |
|---|---|---|
| hosokawa | Hosokawa | p2108, p2106, p2436 |
| hatakeyama | Hatakeyama | p2111 |
| shiba | Shiba | p2109 |
| yamana | Yamana | p2107 |
| ouchi | Ōuchi | p2104, p2432 |
| uesugi | Uesugi | p2116, p1828, p2115, p2117, p2119 |
| imagawa | Imagawa | p2114 |
| toki | Toki | p2112 |
| kyogoku | Kyōgoku | p2105 |
| otomo | Ōtomo | p2435, p2430 |
| shimazu | Shimazu | p2433, p2434 |
| takeda | Takeda | p2113 |
| date | Date | p1832, p1829, p2118 |
| nanbu | Nanbu | p1831, p1833, p1830 |

## Food year (provisional)

| Key | Value |
|---|---|
| `favoured_weight` | 2 |
| `dry_terrains` | desert, drylands, savanna |
| `no_harvest_terrains` | tundra |
| `transfer_loss_per_province` | 0.02 |
| `rot_per_season` | 0.05 |
| `rot_per_season_with_granary` | 0.025 |

### Harvest month

| Key | Value |
|---|---|
| `north` | 9 |
| `south` | 3 |

### Weather

| Key | Value |
|---|---|
| `bad_one_in` | 6 |
| `good_one_in` | 6 |
| `bad_name` | bad weather |

### Climate weather

| Name | bad one in | good one in | bad name |
|---|---|---|---|
| dry | 4 | 8 | drought |
| monsoon | 5 | 6 | floods |

### Rice lands

| Key | Value |
|---|---|
| `lon` | 68, 146 |
| `lat` | -11, 30 |
| `not_on` | desert, drylands, mountains, tundra |

### Base harvest

| Key | Value |
|---|---|
| `poor` | 0.1 |
| `normal` | 0.7 |
| `good` | 0.15 |
| `bumper` | 0.05 |

### Reach by road

| Key | Value |
|---|---|
| `none` | 1 |
| `track` | 1 |
| `road` | 2 |
| `paved road` | 2 |
| `turnpike` | 3 |
| `railway` | 4 |

## Debt (provisional)

| Key | Value |
|---|---|
| `interest_pct` | 10 |
| `loan_cap_years_income` | 1 |
| `loan_cap_years_income_with_T10` | 3 |
| `refusal_pct_per_oath` | 10 |
| `lord_loan_interest_pct` | 0 |
| `interest_added_at_once_years` | 1 |
| `lords_waver_once_per_months` | 12 |

## Officials per province

| Key | Value |
|---|---|
| `plus_one` | [B2 Roads and post stations](Data-Research#inventions), [G11 Postal service](Data-Research#inventions), [T14 telegraphy](Data-Research#inventions) |

### Steps

| Key | Value |
|---|---|
| `G1` | 1 |
| `G9` | 2 |
| `G16` | 3 |

## Ai (provisional)

| Key | Value |
|---|---|
| `food_preset_at_peace` | Feed the people |
| `food_preset_at_war` | War footing |
| `tax_at_peace` | normal |
| `tax_at_war` | heavy |
| `loan_when_gold_below` | 0 |
| `repay_when_gold_above_years_upkeep` | 1 |
| `gift_to_disloyal_lord_gold` | 20 |

## Stability

> REALM-199 to REALM-202 (F-75): stability is read from four pillars, lords, subjects, officials and provinces, each Steady, Uneasy, Troubled or Crumbling; the realm stands at its weakest pillar.

| Key | Value |
|---|---|
| `steps` | Steady, Uneasy, Troubled, Crumbling |
| `loyal_share_for_steady` | 0.5 |

### Empty posts share (provisional)

| Key | Value |
|---|---|
| `uneasy_up_to` | 0.25 |
| `troubled_up_to` | 0.5 |

### Restless share (provisional)

| Key | Value |
|---|---|
| `troubled_from` | 0.1 |
| `crumbling_from` | 0.25 |

## Titles (provisional)

> What lords and officials are called: the court language's family first, then the government form's family, then the default (REALM-242). Words only: no rule reads them.

| Name | lord | lords | official | officials | kin | slavic | hellenic | turkic | iranian | more |
|---|---|---|---|---|---|---|---|---|---|---|
| default | lord | lords | official | officials |  |  |  |  |  |  |
| by\_form\_family |  |  |  |  | lord: chief; lords: chiefs; official: headman; officials: headmen |  |  |  |  |  |
| by\_language\_family |  |  |  |  |  | lord: boyar; lords: boyars; official: voivode; officials: voivodes | lord: archon; lords: archons; official: kephale; officials: kephales | lord: bey; lords: beys; official: subashi; officials: subashis | lord: khan; lords: khans; official: darugha; officials: darughas | arab: (lord: emir; lords: emirs; official: wali; officials: walis); berber: (lord: sheikh; lords: sheikhs; official: qaid; officials: qaids); cushitic: (lord: garad; lords: garads; official: wali; officials: walis); semitic ethiopian: (lord: ras; lords: rases; official: shum; officials: shums); mande: (lord: chief; lords: chiefs; official: farba; officials: farbas); akan: (lord: ohene; lords: ahene; official: headman; officials: headmen); yoruba edo: (lord: chief; lords: chiefs; official: ilari; officials: ilaris); hausa fulani: (lord: sarki; lords: sarakuna; official: hakimi; officials: hakimai); bantu: (lord: chief; lords: chiefs; official: headman; officials: headmen); khoisan: (lord: headman; lords: headmen; official: elder; officials: elders); nilotic: (lord: chief; lords: chiefs; official: elder; officials: elders); indo aryan: (lord: thakur; lords: thakurs; official: amil; officials: amils); dravidian: (lord: nayaka; lords: nayakas; official: adhikari; officials: adhikaris); tibeto burman: (lord: myosa; lords: myosas; official: myothugyi; officials: myothugyis); tai: (lord: chao; lords: chaos; official: khun; officials: khuns); austronesian: (lord: datu; lords: datus; official: punggawa; officials: punggawas); sinitic: (lord: prince; lords: princes; official: magistrate; officials: magistrates); japonic: (lord: daimyo; lords: daimyo; official: daikan; officials: daikan); koreanic: (lord: yangban; lords: yangban; official: magistrate; officials: magistrates); mongolic: (lord: noyan; lords: noyans; official: darughachi; officials: darughachi); tungusic: (lord: beile; lords: beile; official: amban; officials: ambans); nahua: (lord: tlatoani; lords: tlatoque; official: calpixqui; officials: calpixque); maya: (lord: ajaw; lords: ajaws; official: batab; officials: batabs); andean: (lord: kuraka; lords: kurakas; official: tocricoc; officials: tocricocs); tupi guarani: (lord: chief; lords: chiefs; official: elder; officials: elders); algonquian: (lord: sachem; lords: sachems; official: headman; officials: headmen); iroquoian: (lord: chief; lords: chiefs; official: headman; officials: headmen); polynesian: (lord: chief; lords: chiefs; official: steward; officials: stewards); melanesian: (lord: big man; lords: big men; official: elder; officials: elders); aboriginal australian: (lord: elder; lords: elders; official: headman; officials: headmen); caucasian: (lord: prince; lords: princes; official: mouravi; officials: mouravis) |

## Ruler (provisional)

> REALM-233 to REALM-237: rulers in play. Each January the ruler and heir age a year; a ruler dies with the chance of his age (people.death\_per\_year, REALM-270); an heirless ruler of an age to have children gains one; traits lean the AI's event choices (words matched in an option's effects) and give small bonuses (percent levers, as heritage's).

| Key | Value |
|---|---|
| `heir_at_start` | 0.75 |
| `heir_age_gap` | 18, 32 |
| `birth_per_year` | 0.15 |
| `birth_ages` | 18, 50 |
| `kinsman_age` | 20, 50 |
| `child_under` | 16 |
| `daughter_heir` | 0.2 |
| `lean_factor` | 1.5 |

### Start age

| Key | Value |
|---|---|
| `accession_from` | 14 |
| `accession_to` | 40 |
| `oldest` | 75 |
| `unknown_since_years` | 2, 20 |

### Traits

| Name | leans | bonus |
|---|---|---|
| Pious | religion, convert, conversion, catholic, protestant, orthodox, islam, sikh, church, clergy, mission | faith\_revolts\_pct: -25 |
| Warlike | "war", annex, vassalize, casus\_belli, conquest, militar, manpower, army | recruit\_refill\_pct: 10 |
| Builder | admin\_capacity, prosperity, canal, industrial, railway, telegraph, tech\_, reform | building\_cost\_pct: -10 |
| Greedy | treasury, income, trade\_route, revenue, extraction, "debt" | tax\_reach\_pct: 5 |

## People (provisional)

> REALM-270 to REALM-279: one ageing and death model for every person the game names. Each January everyone ages a year and dies with the chance of his age band (age under the first number, chance a year), times his kind's death\_mult. Battle and assassination deaths go through the same path. start\_age draws a person's age when the game first meets him (a seeded lord or commander, a newly hired official); a lord aged birth\_ages without an heir gains one at birth\_per\_year; a lord starts with an heir at heir\_at\_start; a lord who dies heirless is followed by a kinsman (kinsman\_age) at kinsman\_share, else his line dies out. With ai\_refills\_posts an AI realm, or a lord, fills a dead official's post at once with a new man of his type.

| Key | Value |
|---|---|
| `ai_refills_posts` | yes |

### Death per year

- 5, 0.03
- 16, 0.01
- 40, 0.01
- 50, 0.02
- 60, 0.04
- 70, 0.08
- 999, 0.16

### Kinds

| Name | death mult | start age | heir at start | heir age gap | birth per year | birth ages | kinsman share | kinsman age | hire age |
|---|---|---|---|---|---|---|---|---|---|
| ruler | 1 |  |  |  |  |  |  |  |  |
| heir | 1 |  |  |  |  |  |  |  |  |
| lord | 1 | 20, 65 | 0.75 | 18, 32 | 0.25 | 18, 50 | 0.5 | 18, 45 |  |
| official | 1 | 25, 60 |  |  |  |  |  |  | 22, 40 |
| commander | 1 | 25, 60 |  |  |  |  |  |  |  |
| governor | 1 |  |  |  |  |  |  |  |  |

### Battle death

| Key | Value |
|---|---|
| `loser` | 0.05 |
| `reckless_mult` | 2 |

## Fallen (provisional)

> REALM-238: the fallen of the last 10 years (windows.fallen) push the realm's voices toward peace and slow its recruits' refill, both read against its recruit ceiling.

| Key | Value |
|---|---|
| `peace_share_per_ceiling` | 0.25 |
| `peace_share_cap` | 0.25 |
| `refill_slow_per_ceiling` | 0.5 |
| `refill_floor` | 0.5 |

## Belief (provisional)

> REALM-239: under this Faith % or Tongue % a realm's faith or tongue risings start more often; low faith makes its lords seated among another faith waver each January, low tongue makes its officials' effect grow more slowly.

| Key | Value |
|---|---|
| `low_percent` | 50 |
| `revolt_factor` | 1.5 |
| `official_slow` | 0.5 |
