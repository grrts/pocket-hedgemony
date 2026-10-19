# National strengths data

Every value in the game's national strengths config, exactly as the game reads it. This page is made from `packages/rules/data/domain/national-strengths.json` each time the config changes, so it always matches the game. How these values are used is explained on [National Strengths](National-Strengths).

Keys are written as in the config file. Shares are fractions (0.25 is 25 %), and values marked (provisional) are placeholders that may still change in balancing. Inventions are shown by id and name; see [Research data](Data-Research#inventions).

> National strengths (domain/national-strengths/spec.md). Copied from national-strengths/config: heritage-rules.json (rules), levers.json (levers, scope\_cost, where\_values, units) and archetypes.json (archetypes); ages and their regions from event-tree/data/ages.yaml. Every number is a placeholder for tuning.

| Key | Value |
|---|---|
| `where_values` | realm, capital, coast, core, royal, lords, frontier, terrain:\<id\>, culture:\<group\>, faith:\<id\>, area:\<id\>, region:\<id\> |
| `provisional_levers` | tribute\_pct, official\_capacity, lord\_capacity, ship\_build\_pct, crew\_pct, sea\_days\_pct, faith\_shift\_pct, tongue\_shift\_pct, envoy\_count, opinion\_steps |
| `heritage_conditions` | knows, holds\_place, coastal, count, heritage, independent |
| `heritage_states` | awake, done, lost, shed, held |
| `themes` | land, sea, trade, faith, crown, learning, survival, wealth |
| `size_dims` | economic\_strength, manpower\_potential, military\_capability, naval\_capability, diplomatic\_influence, trade\_access |

## Rules

> Heritage system rules and balance. Every number is a placeholder for tuning; nothing here is taken from another game.

### Budget

> Points a part may spend, from levers.json point costs. Small countries get a bonus so a county's birthright matters as much to it as an empire's does to the empire. size\_class is the mean of the catalogue's size-dependent assessments (economic\_strength, manpower\_potential, military\_capability, naval\_capability, diplomatic\_influence, trade\_access) on very\_low=1 .. very\_high=5.

| Key | Value |
|---|---|
| `birthright` | 3 |
| `heyday` | 3 |
| `legacy` | 2 |
| `great_legacy` | 3 |
| `burden` | -2 |
| `tolerance` | 0.6 |
| `size_bonus_applies_to` | birthright, heyday |

#### Size bonus

| Name | size class min | bonus |
|---|---|---|
| 1 | 4.5 | 0 |
| 2 | 3.5 | 0.5 |
| 3 | 2.5 | 1 |
| 4 | 1.5 | 1.5 |
| 5 | 0 | 2 |

### Stat points

| Key | Value |
|---|---|
| `legitimacy` | 0.1 |
| `stability` | 1 |
| `prestige` | 1 |
| `notoriety` | 0.5 |
| `admin_capacity` | 0.1 |
| `literacy` | 0.2 |
| `cohesion` | 0.1 |

### Birthright

> `comment\_dormant`: A birthright whose 'needs' condition fails (Venice without the lagoon, a steppe horde without pasture) goes dormant and wakes again when it holds.

| Key | Value |
|---|---|
| `per_country` | 1 |
| `dormant_if_condition_false` | yes |

### Heydays

> A heyday wakes when its age is active and its 'wakes' condition holds. It sleeps while 'wakes' fails, and ends for good when its age ends or 'ends' holds. A heyday that ran 25 years in total leaves a mark: a permanent echo worth a third of its points (the 'mark' block, or its first lever at a third of its value).
>
> `comment\_mark`: D-HER-14: a mark is a legacy and counts toward max\_legacies.

| Key | Value |
|---|---|
| `max_per_country` | 3 |
| `max_active` | 2 |
| `mark_after_years` | 25 |
| `mark_share` | 0.333333 |

### Ambitions

> `comment\_envoy`: D-HER-11: a resident envoy (diplomacy) kept this many years at a foreign court learns the hint and warmth of one of that country's active ambitions, never its plain goal.
>
> `comment\_legacies`: A sixth legacy asks the player which one to let go.
>
> `comment\_pool`: D-HER-10: a pool holds pool\_min\_\* to pool\_max entries; age ambitions join on top and do not count.

| Key | Value |
|---|---|
| `active` | 3 |
| `pool_min_authored` | 5 |
| `pool_min_generated` | 4 |
| `guaranteed_historical` | 1 |
| `redraw_on_complete_or_fail` | yes |
| `age_ambitions_join_pool_when_age_starts` | yes |
| `envoy_reveal_years` | 2 |
| `max_legacies` | 5 |
| `never_revealed` | yes |
| `pool_max` (provisional) | 7 |

#### Counsel

> Have the court read one ambition: it stirs at once and shows its warmth. Its words stay a hint; ambitions are never fully revealed while open.

| Key | Value |
|---|---|
| `cooldown_years` | 10 |
| `gold_by_era` | 30, 50, 80, 120, 180, 260, 380 |

#### History mode setting

> drawn: 3 drawn from the pool with one historical guaranteed. historical\_only: only ambitions tagged historical. No setting reveals ambitions.

| Key | Value |
|---|---|
| `values` | drawn, historical\_only |
| `default` | drawn |

#### Warmth bands

> D-HER-13: cold under a third, warm under two thirds, hot from two thirds.

| Key | Value |
|---|---|
| `cold` | 0 |
| `warm` | 0.333333 |
| `hot` | 0.666667 |

### Burden

> A burden is a historical weakness. When its 'shed' condition holds, it is removed and its 'turned' legacy is granted.

| Key | Value |
|---|---|
| `per_country_max` | 1 |
| `turned_legacy` | yes |

### Inheritance

> What happens to heritage when countries change hands.

| Key | Value |
|---|---|
| `annexed_birthright` | dormant\_claim |
| `dormant_claim_wakes_if` | owns the annexed country's capital and has held a majority of its homeland provinces for claim\_years (D-HER-1: no culture test) |
| `max_birthrights` | 2 |
| `released_country` | gets its own catalogue heritage, or the generated heritage of its archetype if it is not in the catalogue |
| `formed_country` | keeps the forming country's own birthright and legacies, gains the formed country's authored heritage if any (its birthright second), and draws ambitions from both pools; any other birthright of the forming country becomes a dormant claim again (D-HER-17) |
| `subject` | keeps its full heritage; an overlord's legacies never apply to subjects |
| `claim_years` (provisional) | 30 |

### Ai

> The AI treats its active ambitions (it always sees them) as goals with this weight next to its catalogue ai\_personality priorities. An AI that completes one gets its legacy like a player.
>
> `comment\_choices`: D-HER-12: the AI sleeps the awake heyday, and lets go the legacy, with the fewest lever points; ties go to the one held longest.

| Key | Value |
|---|---|
| `ambition_goal_weight` | 1.5 |
| `sleep_heyday` (provisional) | fewest\_points |
| `let_go_legacy` (provisional) | fewest\_points |

### Timing

> D-HER-9, X-18: heritage is evaluated once per turn (one week), in the events step after the event tree, and counts time in months by the date: a month is added only in the turn in which a new month begins.

| Key | Value |
|---|---|
| `months_per_year` | 12 |

## Units

| Key | Value |
|---|---|
| `pct` | Percent change relative to the base rule (+10 = ten percent more). Negative means less. |
| `steps` | Whole steps on a ladder the owning design defines (harvest steps, loyalty steps, troop levels, road steps). |
| `count` | Whole things: envoys, officials, ships, rings, months, years. |
| `flag` | On or off; value is true. Names a rule switch or an access. |

## Levers

| Name | group | unit | points | params | owner | meaning | better |
|---|---|---|---|---|---|---|---|
| tax\_reach\_pct | treasury | pct | 0.1 | where | province-stats 8 | Share of tax owed that reaches the treasury. | higher |
| trade\_balance\_pct | treasury | pct | 0.1 | where | trade v2 (X-6) | Percent on the trade ratio gain in the affected provinces. | higher |
| toll\_gold\_pct | treasury | pct | 0.05 | where | province-stats 7.2 | Gold per trader at your toll points (bridges, passes, straits). | higher |
| loan\_interest\_pct | treasury | pct | 0.03 | none | country-stats 2 | Yearly interest on your debt (negative is cheaper). | lower |
| tribute\_pct | treasury | pct | 0.05 | none | country-stats 9; subjects design (provisional) | Gold and grain your subjects and tributaries send. | higher |
| loot\_pct | treasury | pct | 0.03 | none | warfare 8.5, 9.2 | Gold from sacks, raids and ransoms. | higher |
| ware\_output\_pct | economy | pct | 0.06 | ware, where | province-stats 5.2 | Loads made of one named ware (or all wares if no ware is given, at triple cost). | higher |
| harvest\_steps | food | steps | 1.2 | where, tile | province-stats 5.1 | Harvest rolls one step better (normal becomes good) on the affected food tiles. | higher |
| herd\_growth\_pct | food | pct | 0.04 | none | country-stats 3.1 | Yearly growth of herds; also softens drought losses by the same share. | higher |
| fish\_pct | food | pct | 0.03 | none | province-stats 5.1 | Food from fisheries. | higher |
| store\_rot\_pct | food | pct | 0.02 | none | country-stats 3.2 | Rot of local and castle stores (negative rots less). | lower |
| castle\_reach\_rings | food | count | 1 | none | country-stats 3.2 | Rings of provinces each castle can feed. | higher |
| growth\_pct | people | pct | 0.1 | where | province-stats 6.1 | Yearly population growth. | higher |
| migrants\_pct | people | pct | 0.03 | class | country-stats 4, 7.1 | Share of refugees, craftsmen and scholars fleeing abroad who choose you. | higher |
| class\_slots\_pct | people | pct | 0.05 | class | province-stats 6.3 | Job slots of one class (seafolk, herders, market folk ...) in your buildings. | higher |
| official\_wage\_pct | rule | pct | 0.06 | none | country-stats 4 | Yearly wage of officials (negative is cheaper). | lower |
| official\_type\_pct | rule | pct | 0.05 | type | province-stats 10.2 | Strength of one official type's effect where assigned (a tax collector's +20 % becomes +30 % at +50). | higher |
| official\_years\_to\_full | rule | count | 0.6 | none | province-stats 10.2 | Years an official needs to reach full effect (base 5; negative is faster). | lower |
| official\_capacity | rule | count | 0.5 | none | government design (provisional) | Officials the government can support before strain. | higher |
| lord\_capacity | rule | count | 0.5 | none | government design (provisional) | Named lords the government can support before strain. | higher |
| lord\_loyalty\_start\_steps | rule | steps | 1 | lord\_kind | country-stats 5.5 | Lords start one step more loyal (wavering becomes loyal). | higher |
| lord\_loyalty\_shield | rule | flag | 1 | cause | country-stats 5.5 | One named cause no longer lowers lords' loyalty (for example 'new\_ruler' or 'heavy\_taxes'). | higher |
| retinue\_pct | rule | pct | 0.05 | none | warfare 3.2 | Men lords bring when called. | higher |
| grievance\_shield | rule | flag | 1.5 | grievance, where | province-stats 12.1 | One named grievance does not count in the affected provinces. | higher |
| days\_to\_capital\_pct | rule | pct | 0.05 | none | province-stats 9 | Days to capital or seat (negative is closer). | lower |
| integration\_years\_pct | rule | pct | 0.04 | none | province-stats 12.1 (Foreign rule) | Years before Foreign rule fades in conquered land (negative is faster). | lower |
| recruit\_refill\_pct | army | pct | 0.06 | none | country-stats 6 | Yearly refill of recruits. | higher |
| troop\_cap\_share | army | count | 2 | none | warfare 2.5 | Percentage points added to the troop cap share of royal provinces with an official (base 2). | higher |
| levy\_free\_months | army | count | 0.5 | none | warfare 2.3 | Months a levy serves before pay is due (base 3). | higher |
| break\_point\_pct | army | pct | 0.15 | kind, arm | warfare 2.3 | Break point of the named kind or arm, in percentage points. | higher |
| hits\_pct | army | pct | 0.08 | arm, terrain | warfare 7.8 | Hits dealt by the named arm (optionally only on the named ground). | higher |
| horses\_pct | army | pct | 0.05 | none | country-stats 6 | Horses bred each year. | higher |
| march\_days\_pct | army | pct | 0.06 | terrain | warfare 5.2 | Days to cross (negative is faster), optionally only on the named ground. | lower |
| forage\_pct | army | pct | 0.04 | none | warfare 6.3 | Food your armies can take from the locals without causing Requisitioned. | higher |
| siege\_pct | army | pct | 0.06 | none | warfare 8.3 | Speed of your sieges (breaches and mining). | higher |
| garrison\_pct | army | pct | 0.05 | none | warfare 8.1 | Strength of garrisons on your walls. | higher |
| hired\_company\_cost\_pct | army | pct | 0.04 | none | warfare 3.3 | Pay of hired companies (negative is cheaper). | lower |
| commander\_style | army | flag | 1 | style | warfare-styles 2.1 | Your commanders may take this style even before its inventions are known. | higher |
| commander\_skill | army | count | 1.2 | skill, origin | warfare 4.2 | New commanders of the named origin start with this many extra points in the named skill. | higher |
| ship\_build\_pct | navy | pct | 0.06 | ship | warfare 11.1; naval design (provisional) | Months to build ships (negative is faster). | lower |
| crew\_pct | navy | pct | 0.05 | none | warfare 11.1; naval design (provisional) | Sailors raised per thousand seafolk in port provinces. | higher |
| ship\_hits\_pct | navy | pct | 0.07 | ship, sea | warfare 11.2 | Hits dealt by your ships. | higher |
| sea\_days\_pct | navy | pct | 0.05 | sea | naval design (provisional) | Days to cross a sea zone (negative is faster). | lower |
| storm\_loss\_pct | navy | pct | 0.03 | none | warfare 11.3 | Ships lost in storms (negative loses fewer). | lower |
| trader\_count | trade | count | 1 | none | trade v2 (X-6) | Extra traders at the campaign start. | higher |
| trader\_gain\_pct | trade | pct | 0.08 | route\_kind | trade v2 (X-6) | Percent on each deposit a trader makes (land, river or sea). | higher |
| traders\_passing\_pct | trade | pct | 0.06 | where | trade v2 (X-6) | Percent on the trade ratio gain in the affected provinces. | higher |
| invention\_cost\_pct | learning | pct | 0.08 | bough, inventions | research-tree | Scholar-years an invention costs (negative is cheaper). Bough R1-R4 or a list of invention ids. | lower |
| scholar\_output\_pct | learning | pct | 0.1 | none | country-stats 7.3 | Research made by each scholar and student. | higher |
| school\_seats\_pct | learning | pct | 0.04 | school | country-stats 7.1 | Student seats in your schools. | higher |
| spread\_discount\_cap | learning | count | 0.1 | none | research-tree | Percentage points added to the 60 % cap on spread discounts. | higher |
| faith\_shift\_pct | belief | pct | 0.05 | where | province-stats 4.3 (house of worship); religion design (provisional) | Speed at which houses of worship and chaplains move the faith mix. | higher |
| tongue\_shift\_pct | belief | pct | 0.05 | where | country-stats 4; culture design (provisional) | Speed of assimilation toward the ruler's tongue. | higher |
| envoy\_count | abroad | count | 1.2 | none | country-stats 9; diplomacy design (provisional) | Envoys you can send at once. | higher |
| opinion\_steps | abroad | steps | 0.8 | of | country-relations; diplomacy design (provisional) | Opinion of the named group of countries toward you (same faith, same culture group, neighbours, a named country). | higher |
| oath\_fade\_pct | abroad | pct | 0.03 | none | country-stats 9 | Years before broken oaths fade (negative fades faster). | lower |
| lands\_taken\_pct | abroad | pct | 0.04 | where | country-stats 9 | How much each province you seize counts toward Lands taken (negative alarms neighbours less). | lower |
| building\_cost\_pct | building | pct | 0.04 | building | buildings design | Gold and time for the named building (negative is cheaper). | lower |
| building\_unlock | building | flag | 1.5 | building | buildings design | The named building, or a unique variant from buildings 9.2 (D-HER-7), can be built before its invention is known. | higher |
| invention\_known | learning | flag | 1.5 | invention | research-tree | The named invention is known (granted once). | higher |
| event\_weight | events | pct | 0.01 | event | event-tree selection | Selection weight of the named event for this country (+100 doubles it). | higher |
| event\_option | events | flag | 0.5 | event, option | event-tree options | Makes the named option available to this country (overrides the option's allowed test). | higher |
| stat | events | count | 0 | stat | events (stat\_mapping, D-EVT-4) | Compatibility lever for the event tree's abstract stats (legitimacy, stability, prestige). Each unit costs the points set in heritage-rules.json stat\_points. | higher |
| homeland\_resistance\_pct | rule | pct | 0.03 | none | province-stats 12.1 (Foreign rule) | Years Foreign rule lasts in your homeland provinces while a conqueror holds them (+ is longer, which is good for you). | higher |

## Scope cost

> Cost multiplier for a scoped lever. Factors multiply; the result is never below 0.25.

| Key | Value |
|---|---|
| `terrain_param` | 0.5 |
| `sea_param` | 0.5 |
| `floor` | 0.25 |

### Where

| Key | Value |
|---|---|
| `realm` | 1 |
| `capital` | 0.5 |
| `coast` | 0.5 |
| `core` | 0.5 |
| `royal` | 0.5 |
| `lords` | 0.5 |
| `frontier` | 0.5 |
| `terrain` | 0.5 |
| `culture` | 0.5 |
| `faith` | 0.5 |
| `region` | 0.5 |
| `area` | 0.25 |
| `place` | 0.25 |

## Levels

| Key | Value |
|---|---|
| `very_low` | 1 |
| `low` | 2 |
| `moderate` | 3 |
| `high` | 4 |
| `very_high` | 5 |

## Groups

| Name | modes | heritage | count |
|---|---|---|---|
| tier\_a | playable\_country, playable\_subject | authored | 58 |
| tier\_b\_c | playable\_country, playable\_subject | generated | 434 |
| decentralised | decentralized\_polity | generated\_decentralised | 214 |
| background | background, non\_state\_actor, internal\_estate, collective\_institution | none | 257 |

## Ages

| id | name | regions |
|---|---|---|
| age\_of\_gunpowder\_empires | Age of Gunpowder Empires | middle\_east, south\_asia, central\_asia, east\_asia, europe, north\_africa, sub\_saharan\_africa |
| age\_of\_exploration | Age of Exploration | europe, sub\_saharan\_africa, south\_asia, southeast\_asia, east\_asia, caribbean, central\_america, south\_america, north\_africa, oceania |
| age\_of\_reformations | Age of Reformations | europe, middle\_east, south\_asia, east\_asia, central\_asia |
| age\_of\_atlantic\_empires | Age of Atlantic Empires | europe, sub\_saharan\_africa, caribbean, north\_america, central\_america, south\_america |
| age\_of\_crisis\_and\_absolutism | Age of Crisis and Absolutism | europe, east\_asia, south\_asia, middle\_east, central\_asia, sub\_saharan\_africa, north\_america |
| age\_of\_revolutions | Age of Revolutions | europe, north\_america, caribbean, central\_america, south\_america, sub\_saharan\_africa, middle\_east, north\_africa |
| age\_of\_industrialization | Age of Industrialization | europe, north\_america, east\_asia, south\_asia, south\_america, middle\_east |
| age\_of\_imperialism | Age of Imperialism | sub\_saharan\_africa, north\_africa, south\_asia, southeast\_asia, east\_asia, central\_asia, oceania, middle\_east, europe, north\_america |
| age\_of\_world\_wars | Age of World Wars | europe, east\_asia, southeast\_asia, north\_africa, middle\_east, south\_asia, sub\_saharan\_africa, oceania, north\_america |
| age\_of\_decolonization | Age of Decolonization | south\_asia, southeast\_asia, sub\_saharan\_africa, north\_africa, middle\_east, caribbean, oceania |
| cold\_war | Cold War | europe, north\_america, east\_asia, southeast\_asia, south\_asia, middle\_east, sub\_saharan\_africa, central\_america, south\_america, caribbean, central\_asia |
| age\_of\_globalization | Age of Globalization | europe, north\_america, east\_asia, south\_asia, southeast\_asia, middle\_east, sub\_saharan\_africa, south\_america, central\_america, central\_asia, oceania, north\_africa, caribbean |

## Macro regions

| Key | Value |
|---|---|
| `eu_` | europe |
| `as_anatolia_caucasus` | middle\_east |
| `as_levant_egypt_arabia` | middle\_east, north\_africa |
| `as_iran_transoxiana` | middle\_east, central\_asia |
| `as_steppe_siberia` | central\_asia |
| `as_china_inner_asia` | east\_asia, central\_asia |
| `as_japan_korea` | east\_asia |
| `as_se_asia` | southeast\_asia |
| `as_south_asia` | south\_asia |
| `af_north_sahara` | north\_africa |
| `af_west` | sub\_saharan\_africa |
| `af_central_south` | sub\_saharan\_africa |
| `af_northeast_east` | sub\_saharan\_africa, north\_africa |
| `am_north` | north\_america |
| `am_mesoamerica_caribbean` | central\_america, caribbean |
| `am_south` | south\_america |
| `oc_oceania` | oceania |

## Path theme

| Key | Value |
|---|---|
| `territorial_expansion` | land |
| `consolidation` | crown |
| `union_or_merger` | crown |
| `exploration` | sea |
| `trade_competition` | trade |
| `independence` | survival |
| `political_reform` | crown |
| `economic_transformation` | wealth |
| `military_reform` | land |
| `religious_transformation` | faith |

## Path hint

| Key | Value |
|---|---|
| `land` | A border history once moved. |
| `crown` | A crown history once shaped. |
| `sea` | A course history once sailed. |
| `trade` | A market history once fought over. |
| `survival` | A freedom history once won. |
| `wealth` | A fortune history once made. |
| `faith` | A faith history once remade. |

## Archetypes

> Archetypes for generated heritage (national-strengths-design.md 6.1). detect: entity\_type (catalogue classification), focus\_any (ai\_personality.economic\_priorities.focus), modes\_any (expansion.modes), seas (true = must have sea access, false = must not), rivers\_min, naval\_min (naval\_capability level 1-5), size\_min (size class), text\_any (words in geography, economy and history text), region\_any (catalogue region), religion\_any (words in the main religion), mode (representation mode). Placeholders in text: {name} {capital} {goods} {sea} {river} {woods} {terrain\_words}. Heyday age\_options: first age whose regions cover the country is used. Effects are written for a size bonus of 0; percentages scale with the country's budget.

| Key | Value |
|---|---|
| `decentralized_allowed` | segmentary\_society, forest\_chiefdom, hill\_chieftaincy, pastoral\_people, steppe\_horde, desert\_caravan, ocean\_voyagers, chiefly\_society, peasant\_republic, raiders, island\_realm, mountain\_folk, andean\_realm |

### Archetypes

- id: sea\_trading\_city; label: Sea-trading city; detect: (entity\_type: city\_state, merchant\_republic, republic, free\_imperial\_city, trading\_post, league; seas: yes; focus\_any: trade, maritime\_commerce, banking\_and\_finance); birthright: (name: Wharves of {capital}; text: Traders at sea gather 20 % more; 15 % more traders pass the capital; ports raise 20 % more sailors.; why: {name} lived from the sea trade through {capital} ({goods}).; effects: ((lever: trader\_gain\_pct; value: 20; route\_kind: sea), (lever: traders\_passing\_pct; value: 15; where: capital), (lever: crew\_pct; value: 20)); needs: (coastal: (who: this))); heydays: ((age\_options: age\_of\_exploration, age\_of\_gunpowder\_empires, age\_of\_atlantic\_empires; name: Carrying trade; text: One more trader; traders at sea gather 15 % more; customs officers 20 % stronger.; why: Inferred: a free port's chance came when ocean routes multiplied the goods to carry.; wakes: (all: ((coastal: (who: this)), (independent: (who: this)))); effects: ((lever: trader\_count; value: 1), (lever: trader\_gain\_pct; value: 15; route\_kind: sea), (lever: official\_type\_pct; value: 20; type: customs\_officer)))); burden: (name: Few hands; text: Recruits refill 20 % slower, and levies serve one month less before pay.; why: A city's people are craftsmen and sailors, not soldiers (inferred from the catalogue's small manpower).; effects: ((lever: recruit\_refill\_pct; value: -20), (lever: levy\_free\_months; value: -1)); shed: (count: (who: this; thing: provinces; op: \>=; value: start\*3)); shed\_text: Hold three times the provinces you began with.; turned: (name: Mainland domain; text: Recruits refill 15 % faster and the troop cap share is half a point higher.; effects: ((lever: recruit\_refill\_pct; value: 15), (lever: troop\_cap\_share; value: 0.5)))); ambition\_themes: trade, wealth, sea
- id: inland\_trade\_city; label: Inland trading city; detect: (entity\_type: city\_state, free\_imperial\_city, republic, merchant\_republic, league; seas: no; focus\_any: trade, manufacturing, banking\_and\_finance); birthright: (name: Fairs of {capital}; text: 20 % more traders pass the capital; trade profit +15 %; markets cost a quarter less.; why: {capital} was a market and craft town ({goods}).; effects: ((lever: traders\_passing\_pct; value: 20; where: capital), (lever: trade\_balance\_pct; value: 15), (lever: building\_cost\_pct; value: -25; building: market))); heydays: ((age\_options: age\_of\_reformations, age\_of\_gunpowder\_empires, age\_of\_crisis\_and\_absolutism; name: Presses and counting houses; text: Presses cost 30 % less, scholars work 10 % better, and record-keeping inventions cost 10 % less.; why: Inferred: rich towns were where printing, bookkeeping and schools took hold.; wakes: (independent: (who: this)); effects: ((lever: building\_cost\_pct; value: -30; building: press), (lever: scholar\_output\_pct; value: 10), (lever: invention\_cost\_pct; value: -10; bough: R3)))); burden: (name: Walls without fields; text: Harvests roll a step worse at home, and stores rot 20 % faster.; why: The town bought its grain from the countryside (inferred).; effects: ((lever: harvest\_steps; value: -1; where: core), (lever: store\_rot\_pct; value: 20)); shed: (count: (who: this; thing: provinces; op: \>=; value: start\*2)); shed\_text: Hold twice the provinces you began with.; turned: (name: Contado; text: Harvests a step better at home and the people grow 10 % faster.; effects: ((lever: harvest\_steps; value: 1; where: core), (lever: growth\_pct; value: 10)))); ambition\_themes: trade, learning, wealth
- id: maritime\_realm; label: Seafaring realm; detect: (seas: yes; focus\_any: maritime\_commerce, trade; naval\_min: 3; entity\_type: kingdom, sultanate, duchy, principality, county, lordship, emirate, mandala\_polity); birthright: (name: Sailors of the {sea}; text: Ships build 15 % faster, ports raise 20 % more sailors, and fisheries feed 30 % more.; why: {name} faced the {sea}; its coasts lived from fishing and shipping.; effects: ((lever: ship\_build\_pct; value: -15), (lever: crew\_pct; value: 20), (lever: fish\_pct; value: 30)); needs: (coastal: (who: this))); heydays: ((age\_options: age\_of\_exploration, age\_of\_atlantic\_empires, age\_of\_gunpowder\_empires; name: Open ocean; text: Sea crossings 15 % shorter, ships build 15 % faster, traders at sea gather 15 % more.; why: Inferred: seafaring realms gained most when ocean sailing spread.; wakes: (all: ((coastal: (who: this)), (knows: (who: this; invention: [S4 Carrack and caravel](Data-Research#inventions))))); effects: ((lever: sea\_days\_pct; value: -15), (lever: ship\_build\_pct; value: -15), (lever: trader\_gain\_pct; value: 15; route\_kind: sea)))); burden: (name: Thin soil; text: Harvests roll a step worse at home and the people grow 10 % slower.; why: Inferred from the catalogue's reliance on the sea over farmland.; effects: ((lever: harvest\_steps; value: -1; where: core), (lever: growth\_pct; value: -10)); shed: (knows: (who: this; invention: [F12 Fodder crops (clover, turnips)](Data-Research#inventions))); shed\_text: Learn Fodder crops.; turned: (name: Improved fields; text: Harvests a step better at home, stores rot 30 % less, growth +5 %.; effects: ((lever: harvest\_steps; value: 1; where: core), (lever: store\_rot\_pct; value: -30), (lever: growth\_pct; value: 5)))); ambition\_themes: sea, trade, land
- id: island\_realm; label: Island realm; detect: (text\_any: island, islands, archipelago, isle; seas: yes); birthright: (name: Sea-girt {name}; text: Conquerors' Foreign rule lasts 40 % longer here; garrisons 20 % stronger; fisheries feed 30 % more.; why: {name}'s core lay on islands: the sea was its wall and its larder.; effects: ((lever: homeland\_resistance\_pct; value: 40), (lever: garrison\_pct; value: 20), (lever: fish\_pct; value: 30)); needs: (coastal: (who: this))); heydays: ((age\_options: age\_of\_exploration, age\_of\_atlantic\_empires, age\_of\_gunpowder\_empires; name: Harbour of the seas; text: 20 % more traders pass the coast, harbours cost a quarter less, ports raise 20 % more sailors.; why: Inferred: island harbours became waypoints once ocean routes grew.; wakes: (coastal: (who: this)); effects: ((lever: traders\_passing\_pct; value: 20; where: coast), (lever: building\_cost\_pct; value: -25; building: harbour), (lever: crew\_pct; value: 20)))); burden: (name: Far from the mainland; text: Inventions cost 10 % more and 15 % fewer traders pass.; why: Inferred: distance slowed the spread of new techniques.; effects: ((lever: invention\_cost\_pct; value: 10), (lever: traders\_passing\_pct; value: -15)); shed: (knows: (who: this; invention: [S4 Carrack and caravel](Data-Research#inventions))); shed\_text: Learn Carrack and caravel.; turned: (name: Island roads; text: Sea crossings 20 % shorter, 15 % more traders on the coast, 10 % more sailors.; effects: ((lever: sea\_days\_pct; value: -20), (lever: traders\_passing\_pct; value: 15; where: coast), (lever: crew\_pct; value: 10)))); ambition\_themes: sea, survival, trade
- id: steppe\_horde; label: Steppe horde; detect: (entity\_type: khanate, horde, nomadic\_confederation, tribal\_confederation; focus\_any: pastoralism, plunder, tribute; text\_any: steppe, horse, nomad); birthright: (name: Remounts of the steppe; text: Horses breed 30 % faster, herds grow 10 % faster, horse archers hit 15 % harder on grassland, and armies march 10 % faster.; why: {name}'s strength was its herds and its riders.; effects: ((lever: horses\_pct; value: 30), (lever: herd\_growth\_pct; value: 10), (lever: hits\_pct; value: 15; arm: horse\_archers; terrain: grassland), (lever: march\_days\_pct; value: -10))); heydays: ((age\_options: age\_of\_gunpowder\_empires; name: The last great ride; text: Horse archers hit 15 % harder, loot +30 %, recruits refill 15 % faster, until you learn massed hand guns.; why: Inferred: steppe armies kept their edge until gunpowder infantry and field guns spread.; wakes: (not: (knows: (who: this; invention: [W5 gunpowder\_infantry](Data-Research#inventions)))); effects: ((lever: hits\_pct; value: 15; arm: horse\_archers), (lever: loot\_pct; value: 30), (lever: recruit\_refill\_pct; value: 15)))); burden: (name: Divided ulus; text: Lords start a step less loyal and officials take a year longer to settle in.; why: Steppe power was shared among clans and princes (catalogue constraints).; effects: ((lever: lord\_loyalty\_start\_steps; value: -1), (lever: official\_years\_to\_full; value: 1)); shed: (count: (who: this; thing: loyal\_lords; op: \>=; value: start\*2)); shed\_text: Have twice as many loyal lords as at the start.; turned: (name: One khan; text: A new ruler no longer shakes the lords; retinues 15 % larger.; effects: ((lever: lord\_loyalty\_shield; value: yes; cause: new\_ruler), (lever: retinue\_pct; value: 15)))); ambition\_themes: land, wealth, crown
- id: desert\_caravan; label: Desert and caravan people; detect: (text\_any: desert, sahara, oasis, oases, camel; focus\_any: trade, pastoralism); birthright: (name: Masters of the wells; text: Armies cross desert 25 % faster, tolls pay 30 % more, and armies forage 20 % more.; why: {name} held wells and caravan roads ({goods}).; effects: ((lever: march\_days\_pct; value: -25; terrain: desert), (lever: toll\_gold\_pct; value: 30), (lever: forage\_pct; value: 20))); heydays: ((age\_options: age\_of\_gunpowder\_empires, age\_of\_exploration; name: Caravan peace; text: 25 % more traders pass, and traders on land gather 15 % more.; why: Inferred: caravan traffic peaked while the great land routes stayed safe.; wakes: (independent: (who: this)); effects: ((lever: traders\_passing\_pct; value: 25), (lever: trader\_gain\_pct; value: 15; route\_kind: land)))); burden: (name: Thirsty land; text: People grow 10 % slower and harvests roll a step worse at home.; why: Inferred from the catalogue's dry ground.; effects: ((lever: growth\_pct; value: -10), (lever: harvest\_steps; value: -1; where: core)); shed: (count: (who: this; thing: building:irrigation\_works; op: \>=; value: 3)); shed\_text: Build three irrigation works.; turned: (name: Qanats and channels; text: Harvests a step better on drylands and the people grow 10 % faster.; effects: ((lever: harvest\_steps; value: 1; where: terrain:drylands), (lever: growth\_pct; value: 10)))); ambition\_themes: trade, survival, wealth
- id: mountain\_folk; label: Mountain realm; detect: (text\_any: mountain, highland, alpine, alps, plateau; entity\_type: confederation, peasant\_republic, lordship, county, principality, kingdom); birthright: (name: Passes of {name}; text: Garrisons 25 % stronger, conquerors' Foreign rule lasts 40 % longer, tolls pay 10 % more.; why: {name}'s land was {terrain\_words}: easy to hold, hard to take.; effects: ((lever: garrison\_pct; value: 25), (lever: homeland\_resistance\_pct; value: 40), (lever: toll\_gold\_pct; value: 10))); heydays: ((age\_options: age\_of\_gunpowder\_empires, age\_of\_reformations; name: Hired valour; text: Hired companies cost 20 % less, levies break 5 points later, recruits refill 20 % faster.; why: Inferred: mountain peoples sold their soldiering when armies grew.; wakes: (independent: (who: this)); effects: ((lever: hired\_company\_cost\_pct; value: -20), (lever: break\_point\_pct; value: 5; kind: levy), (lever: recruit\_refill\_pct; value: 20)))); burden: (name: Poor valleys; text: Tax reaching you −10 %, and harvests roll a step worse at home.; why: Inferred: mountain farms fed few.; effects: ((lever: tax\_reach\_pct; value: -10), (lever: harvest\_steps; value: -1; where: core)); shed: (count: (who: this; thing: building:mine; op: \>=; value: start+2)); shed\_text: Open two more mines.; turned: (name: Mountain ore; text: Silver mines yield 30 % more.; effects: ((lever: ware\_output\_pct; value: 30; ware: silver)))); ambition\_themes: survival, land, wealth
- id: river\_kingdom; label: River kingdom; detect: (rivers\_min: 1; focus\_any: agriculture, taxation; entity\_type: kingdom, sultanate, empire, principality, grand\_duchy, duchy; text\_any: river, delta, flood, floodplain, irrigat, basin, doab); birthright: (name: Gifts of the {river}; text: Harvests a step better at home, 15 % fewer days to the capital, 20 % more traders, growth +5 %.; why: The {river} carried {name}'s grain and trade.; effects: ((lever: harvest\_steps; value: 1; where: core), (lever: days\_to\_capital\_pct; value: -15), (lever: traders\_passing\_pct; value: 20), (lever: growth\_pct; value: 5))); heydays: ((age\_options: age\_of\_crisis\_and\_absolutism, age\_of\_gunpowder\_empires, age\_of\_atlantic\_empires; name: Granaries of the river; text: Stores rot 30 % less, castles feed one more ring, growth +10 %, while at peace.; why: Inferred: river kingdoms flourished in long peace.; wakes: (not: (at\_war: (who: this))); effects: ((lever: store\_rot\_pct; value: -30), (lever: castle\_reach\_rings; value: 1), (lever: growth\_pct; value: 10)))); burden: (name: Floods and fevers; text: Stores rot 30 % faster and growth −5 %.; why: Inferred: river plains flooded and bred fevers.; effects: ((lever: store\_rot\_pct; value: 30), (lever: growth\_pct; value: -5)); shed: (count: (who: this; thing: building:granary; op: \>=; value: 3)); shed\_text: Build three granaries.; turned: (name: Embanked river; text: Castles feed one more ring and stores rot 30 % less.; effects: ((lever: castle\_reach\_rings; value: 1), (lever: store\_rot\_pct; value: -30)))); ambition\_themes: land, wealth, crown
- id: great\_empire; label: Great empire; detect: (entity\_type: empire, sultanate, kingdom, khanate; size\_min: 4); birthright: (name: Imperial muster; text: Troop cap share +0.5 points, tax collectors 25 % stronger, one more envoy.; why: {name}: among the largest states of its world.; effects: ((lever: troop\_cap\_share; value: 0.5), (lever: official\_type\_pct; value: 25; type: tax\_collector), (lever: envoy\_count; value: 1))); heydays: ((age\_options: age\_of\_gunpowder\_empires, age\_of\_crisis\_and\_absolutism; name: Fiscal-military state; text: Sieges 20 % faster, officials settle a year sooner, troop cap share +0.5.; why: Inferred: large states that mastered guns and taxes pulled ahead.; wakes: (knows: (who: this; invention: [W3 Bombards](Data-Research#inventions))); effects: ((lever: siege\_pct; value: 20), (lever: official\_years\_to\_full; value: -1), (lever: troop\_cap\_share; value: 0.5)))); burden: (name: Overstretched; text: Days to the capital +20 %, and conquered land takes 20 % longer to settle.; why: Inferred: size slowed orders and integration.; effects: ((lever: days\_to\_capital\_pct; value: 20), (lever: integration\_years\_pct; value: 20)); shed: (knows: (who: this; invention: [G11 Postal service](Data-Research#inventions))); shed\_text: Learn Postal service.; turned: (name: Post riders; text: Days to the capital −20 %, conquered land settles 20 % faster.; effects: ((lever: days\_to\_capital\_pct; value: -20), (lever: integration\_years\_pct; value: -20)))); ambition\_themes: land, crown, wealth
- id: church\_state; label: Church state; detect: (entity\_type: prince\_bishopric, prince\_archbishopric, imperial\_abbey, theocracy, sharifate, imamate; focus\_any: pilgrimage\_and\_religious\_revenue); birthright: (name: Altar and see; text: Faith spreads 30 % faster, one step better opinion from your faith, school seats +20 %.; why: {name}: ruled by its clergy.; effects: ((lever: faith\_shift\_pct; value: 30), (lever: opinion\_steps; value: 1; of: same\_faith), (lever: school\_seats\_pct; value: 20))); heydays: ((age\_options: age\_of\_reformations, age\_of\_gunpowder\_empires; name: Defenders of the faith; text: Faith spreads 30 % faster, one step better opinion from your faith, school seats +15 %.; why: Inferred: church states gained weight when religion divided rulers.; wakes: (independent: (who: this)); effects: ((lever: faith\_shift\_pct; value: 30), (lever: opinion\_steps; value: 1; of: same\_faith), (lever: school\_seats\_pct; value: 15)))); burden: (name: Swords for hire; text: Recruits refill 20 % slower and hired companies cost 15 % more.; why: A clerical lord raised few men of his own (inferred).; effects: ((lever: recruit\_refill\_pct; value: -20), (lever: hired\_company\_cost\_pct; value: 15)); shed: (count: (who: this; thing: castles; op: \>=; value: start+2)); shed\_text: Build two more castles.; turned: (name: Church militia; text: Recruits refill 15 % faster and garrisons 20 % stronger.; effects: ((lever: recruit\_refill\_pct; value: 15), (lever: garrison\_pct; value: 20)))); ambition\_themes: faith, learning, survival
- id: crusading\_order; label: Military order; detect: (entity\_type: military\_order); birthright: (name: Brethren of the order; text: Break point +5 points, new commanders start with one more Might, garrisons 20 % stronger.; why: {name}: a brotherhood of knights.; effects: ((lever: break\_point\_pct; value: 5), (lever: commander\_skill; value: 1; skill: might), (lever: garrison\_pct; value: 20))); heydays: ((age\_options: age\_of\_gunpowder\_empires, age\_of\_reformations; name: Bulwark of the frontier; text: Garrisons 25 % stronger, castles cost a quarter less, recruits refill 10 % faster.; why: Inferred: the orders' castles mattered most on contested frontiers.; wakes: (independent: (who: this)); effects: ((lever: garrison\_pct; value: 25), (lever: building\_cost\_pct; value: -25; building: castle), (lever: recruit\_refill\_pct; value: 10)))); burden: (name: Celibate brethren; text: Recruits refill 20 % slower and hired companies cost 20 % more.; why: An order recruited brothers, not families (catalogue constraints).; effects: ((lever: recruit\_refill\_pct; value: -20), (lever: hired\_company\_cost\_pct; value: 20)); shed: (count: (who: this; thing: lords; op: \>=; value: start+3)); shed\_text: Grant land to three new lords.; turned: (name: Secular duchy; text: Lords start a step more loyal and recruits refill 15 % faster.; effects: ((lever: lord\_loyalty\_start\_steps; value: 1), (lever: recruit\_refill\_pct; value: 15)))); ambition\_themes: faith, land, survival
- id: frontier\_march; label: Frontier march; detect: (entity\_type: margraviate, voivodeship, despotate, beylik; text\_any: frontier, march, border; modes\_any: raiding); birthright: (name: Wardens of the march; text: Garrisons 20 % stronger and wardens 40 % stronger.; why: {name} sat on a contested border.; effects: ((lever: garrison\_pct; value: 20), (lever: official\_type\_pct; value: 40; type: warden))); heydays: ((age\_options: age\_of\_gunpowder\_empires, age\_of\_reformations; name: Border levies; text: Levies serve two months more before pay, recruits refill 20 % faster, armies forage 15 % more.; why: Inferred: frontier societies lived armed.; wakes: (at\_war: (who: this)); effects: ((lever: levy\_free\_months; value: 2), (lever: recruit\_refill\_pct; value: 20), (lever: forage\_pct; value: 15)))); burden: (name: Burned border; text: Growth −10 % and stores rot 20 % faster.; why: Raids kept the border poor (inferred).; effects: ((lever: growth\_pct; value: -10), (lever: store\_rot\_pct; value: 20)); shed: (count: (who: this; thing: castles; op: \>=; value: start\*2)); shed\_text: Have twice the castles you began with.; turned: (name: Settled border; text: Growth +10 % and harvests a step better on the frontier.; effects: ((lever: growth\_pct; value: 10), (lever: harvest\_steps; value: 1; where: frontier)))); ambition\_themes: land, survival, crown
- id: feudal\_realm; label: Feudal realm; detect: (entity\_type: kingdom, duchy, county, principality, grand\_duchy, electorate, landgraviate, margraviate, lordship; religion\_any: christ, catholic, orthodox); birthright: (name: Sworn vassals; text: Noble lords start a step more loyal, retinues 20 % larger, levies serve a month longer, castles 15 % cheaper.; why: {name}'s power rested on its sworn nobility.; effects: ((lever: lord\_loyalty\_start\_steps; value: 1; lord\_kind: noble), (lever: retinue\_pct; value: 20), (lever: levy\_free\_months; value: 1), (lever: building\_cost\_pct; value: -15; building: castle))); heydays: ((age\_options: age\_of\_crisis\_and\_absolutism, age\_of\_gunpowder\_empires, age\_of\_reformations; name: Royal government; text: Officials settle a year sooner and cost 15 % less, tax reaching you +5 %, and seizing land no longer shakes the lords.; why: Inferred: crowns that paid their own officials outgrew their lords.; wakes: (count: (who: this; thing: officials; op: \>=; value: start\*2)); effects: ((lever: official\_years\_to\_full; value: -1), (lever: official\_wage\_pct; value: -15), (lever: tax\_reach\_pct; value: 5), (lever: lord\_loyalty\_shield; value: yes; cause: seized\_land)))); burden: (name: Overmighty lords; text: Noble lords start a step less loyal and bring 20 % fewer men.; why: Great houses rivalled the crown (catalogue constraints).; effects: ((lever: lord\_loyalty\_start\_steps; value: -1; lord\_kind: noble), (lever: retinue\_pct; value: -20)); shed: (count: (who: this; thing: officials; op: \>=; value: start\*2)); shed\_text: Have twice the officials you began with.; turned: (name: Royal justice; text: Judges 30 % stronger, and heavy taxes no longer shake the lords.; effects: ((lever: official\_type\_pct; value: 30; type: judge), (lever: lord\_loyalty\_shield; value: yes; cause: heavy\_taxes)))); ambition\_themes: crown, land, wealth
- id: sultanate\_court; label: Sultanate court; detect: (entity\_type: sultanate, emirate, atabegate, beylik, khanate; religion\_any: islam, sunni, shi, ibadi, zaydi); birthright: (name: Court of {capital}; text: Officials cost 15 % less, judges 30 % stronger, 20 % more fleeing scholars choose you.; why: {capital} was a court of scholars, judges and soldiers.; effects: ((lever: official\_wage\_pct; value: -15), (lever: official\_type\_pct; value: 30; type: judge), (lever: migrants\_pct; value: 20; class: scholars))); heydays: ((age\_options: age\_of\_gunpowder\_empires, age\_of\_crisis\_and\_absolutism; name: Patronage of the learned; text: 40 % more fleeing scholars choose you, scholars work 10 % better, schools cost a quarter less.; why: Inferred: Islamic courts competed for scholars in this age.; wakes: (independent: (who: this)); effects: ((lever: migrants\_pct; value: 40; class: scholars), (lever: scholar\_output\_pct; value: 10), (lever: building\_cost\_pct; value: -25; building: school)))); burden: (name: Contested throne; text: Lords start a step less loyal and stability −0.5.; why: Successions were fought among princes (catalogue constraints).; effects: ((lever: lord\_loyalty\_start\_steps; value: -1), (lever: stat; value: -0.5; stat: stability)); shed: (count: (who: this; thing: loyal\_lords; op: \>=; value: start\*2)); shed\_text: Have twice as many loyal lords as at the start.; turned: (name: Settled dynasty; text: A new ruler or a disputed heir no longer shakes the lords.; effects: ((lever: lord\_loyalty\_shield; value: yes; cause: disputed\_heir), (lever: lord\_loyalty\_shield; value: yes; cause: new\_ruler)))); ambition\_themes: faith, learning, land
- id: warrior\_domain; label: Warrior house; detect: (entity\_type: shugo\_domain, shogunate); birthright: (name: House of the bow; text: New commanders from the ruling house start with one more Might, retinues break 5 points later and are 20 % larger.; why: {name}: a house of mounted warriors and retainers.; effects: ((lever: commander\_skill; value: 1; skill: might; origin: ruler), (lever: break\_point\_pct; value: 5; kind: retinue), (lever: retinue\_pct; value: 20))); heydays: ((age\_options: age\_of\_gunpowder\_empires; name: Warring provinces; text: New commanders start with one more Cunning, recruits refill 15 % faster, sieges 10 % faster, while at war.; why: Inferred: the age of warring provinces rewarded houses that fought.; wakes: (at\_war: (who: this)); effects: ((lever: commander\_skill; value: 1; skill: cunning), (lever: recruit\_refill\_pct; value: 15), (lever: siege\_pct; value: 10)))); burden: (name: Restless retainers; text: Lords start a step less loyal and recruits refill 10 % slower.; why: Retainers and deputies could turn on their lord (catalogue constraints).; effects: ((lever: lord\_loyalty\_start\_steps; value: -1), (lever: recruit\_refill\_pct; value: -10)); shed: (count: (who: this; thing: victories; op: \>=; value: 10)); shed\_text: Win ten battles.; turned: (name: Bound retainers; text: Lords start a step more loyal and retinues are 15 % larger.; effects: ((lever: lord\_loyalty\_start\_steps; value: 1), (lever: retinue\_pct; value: 15)))); ambition\_themes: land, crown, wealth
- id: hill\_chieftaincy; label: Hill chieftaincy; detect: (entity\_type: tusi\_chieftaincy, chiefdom, paramount\_chiefdom; text\_any: hill, mountain, highland, upland); birthright: (name: Hill chiefs; text: Conquerors' Foreign rule lasts 40 % longer, foot fights 15 % harder in hills, and Far from the throne does not count.; why: {name} held the hills on its own terms.; effects: ((lever: homeland\_resistance\_pct; value: 40), (lever: hits\_pct; value: 15; arm: foot; terrain: hills), (lever: grievance\_shield; value: yes; grievance: far\_from\_the\_throne))); heydays: ((age\_options: age\_of\_gunpowder\_empires, age\_of\_exploration, age\_of\_atlantic\_empires; name: Valued auxiliaries; text: Retinues 25 % larger, one step better opinion from neighbours, foot 15 % harder in hills.; why: Inferred: empires paid hill chiefs for soldiers.; wakes: (not: (at\_war: (who: this))); effects: ((lever: retinue\_pct; value: 25), (lever: opinion\_steps; value: 1; of: neighbours), (lever: hits\_pct; value: 15; arm: foot; terrain: hills)))); burden: (name: Under another's seal; text: Neighbours think a step less of you and tax reaching you −10 %.; why: {name} answered to an overlord's seal (catalogue).; effects: ((lever: opinion\_steps; value: -1; of: neighbours), (lever: tax\_reach\_pct; value: -10)); shed: (independent: (who: this)); shed\_text: Be independent.; turned: (name: Our own seal; text: One more envoy and tax reaching you +5 %.; effects: ((lever: envoy\_count; value: 1), (lever: tax\_reach\_pct; value: 5)))); ambition\_themes: survival, land, crown
- id: mesoamerican\_city; label: Mesoamerican city-state; detect: (entity\_type: altepetl, hueyaltepetl, kuchkabal, cacicazgo; region\_any: am\_mesoamerica\_caribbean); birthright: (name: Calpolli of {capital}; text: Tribute +30 %, levies serve a month longer, harvests a step better at home, raised fields 15 % cheaper.; why: {capital}'s wards and fields fed a dense city.; effects: ((lever: tribute\_pct; value: 30), (lever: levy\_free\_months; value: 1), (lever: harvest\_steps; value: 1; where: core), (lever: building\_cost\_pct; value: -15; building: raised\_fields))); heydays: ((age\_options: age\_of\_exploration, age\_of\_gunpowder\_empires; name: Flower of the valley; text: Tribute +20 %, markets a quarter cheaper, growth +10 %, while independent.; why: Inferred: the fifteenth century was the height of Mesoamerican city-states.; wakes: (independent: (who: this)); effects: ((lever: tribute\_pct; value: 20), (lever: building\_cost\_pct; value: -25; building: market), (lever: growth\_pct; value: 10)))); burden: (name: Tribute owed; text: Tax reaching you −15 %.; why: Much of its surplus went to an overlord (inferred from the catalogue's tributary ties).; effects: ((lever: tax\_reach\_pct; value: -15)); shed: (all: ((independent: (who: this)), (subject\_count: (who: this; op: \>=; value: 1)))); shed\_text: Be independent with a subject of your own.; turned: (name: Tribute taken; text: Tribute +30 % and levies serve a month longer.; effects: ((lever: tribute\_pct; value: 30), (lever: levy\_free\_months; value: 1)))); ambition\_themes: land, faith, survival
- id: andean\_realm; label: Andean realm; detect: (region\_any: am\_south; text\_any: andes, andean, highland, puna, terrace, quechua, aymara); birthright: (name: Terraces and storehouses; text: Harvests a step better in the mountains, stores rot 30 % less, terraces a quarter cheaper, days to the capital −10 %.; why: {name} farmed the high valleys on terraces.; effects: ((lever: harvest\_steps; value: 1; where: terrain:mountains), (lever: store\_rot\_pct; value: -30), (lever: building\_cost\_pct; value: -25; building: terrace), (lever: days\_to\_capital\_pct; value: -10))); heydays: ((age\_options: age\_of\_exploration, age\_of\_atlantic\_empires; name: Roads of the mountains; text: Days to the capital −20 %, armies march 15 % faster, stores rot 25 % less, castles feed one more ring.; why: Inferred: Andean states held their valleys together by roads and stores.; wakes: (independent: (who: this)); effects: ((lever: days\_to\_capital\_pct; value: -20), (lever: march\_days\_pct; value: -15), (lever: store\_rot\_pct; value: -25), (lever: castle\_reach\_rings; value: 1)))); burden: (name: Knotted records; text: Record-keeping inventions cost 10 % more; officials take a year longer to settle in.; why: Inferred: administration ran on cords and memory.; effects: ((lever: invention\_cost\_pct; value: 10; bough: R3), (lever: official\_years\_to\_full; value: 1)); shed: (knows: (who: this; invention: [G3 Tax registers](Data-Research#inventions))); shed\_text: Learn Tax registers.; turned: (name: Counted realm; text: Officials settle a year sooner, tax reaching you +10 %.; effects: ((lever: official\_years\_to\_full; value: -1), (lever: tax\_reach\_pct; value: 10)))); ambition\_themes: survival, land, crown
- id: forest\_chiefdom; label: Forest people; detect: (entity\_type: chiefdom, paramount\_chiefdom, stateless\_society, confederation, tribal\_confederation; text\_any: forest, jungle, rainforest, woodland, woods); birthright: (name: Paths of the {woods}; text: Foot fights 20 % harder and marches 20 % faster in {woods}; conquerors' Foreign rule lasts 40 % longer; foraging +10 %.; why: {name} lived in {woods} country.; effects: ((lever: hits\_pct; value: 20; arm: foot; terrain: {woods}), (lever: march\_days\_pct; value: -20; terrain: {woods}), (lever: homeland\_resistance\_pct; value: 40), (lever: forage\_pct; value: 10))); heydays: ((age\_options: age\_of\_atlantic\_empires, age\_of\_exploration, age\_of\_gunpowder\_empires; name: Forest refuge; text: Conquerors' Foreign rule lasts 50 % longer, foot fights 20 % harder and marches 20 % faster in {woods}, while at war.; why: Inferred: forest peoples resisted larger powers by retreat and ambush.; wakes: (at\_war: (who: this)); effects: ((lever: homeland\_resistance\_pct; value: 50), (lever: hits\_pct; value: 20; arm: foot; terrain: {woods}), (lever: march\_days\_pct; value: -20; terrain: {woods})))); burden: (name: Small villages; text: Recruits refill 15 % slower and tax reaching you −10 %.; why: Settlements were small and scattered (inferred).; effects: ((lever: recruit\_refill\_pct; value: -15), (lever: tax\_reach\_pct; value: -10)); shed: (count: (who: this; thing: building:market; op: \>=; value: 2)); shed\_text: Build two markets.; turned: (name: Market villages; text: 20 % more traders and tax reaching you +5 %.; effects: ((lever: traders\_passing\_pct; value: 20), (lever: tax\_reach\_pct; value: 5)))); ambition\_themes: survival, trade, land
- id: sahel\_kingdom; label: Savanna trading kingdom; detect: (region\_any: af\_west, af\_north\_sahara; focus\_any: trade, tribute; entity\_type: kingdom, empire, sultanate); birthright: (name: Gold and salt roads; text: Trade profit +10 %, 15 % more traders, horses breed 20 % faster.; why: {name} sat on the trade between savanna and desert ({goods}).; effects: ((lever: trade\_balance\_pct; value: 10), (lever: traders\_passing\_pct; value: 15), (lever: horses\_pct; value: 20))); heydays: ((age\_options: age\_of\_gunpowder\_empires, age\_of\_atlantic\_empires; name: Scholars of the bend; text: 30 % more fleeing scholars choose you, schools a quarter cheaper, 15 % more traders.; why: Inferred: Sahel towns drew scholars and merchants in this age.; wakes: (independent: (who: this)); effects: ((lever: migrants\_pct; value: 30; class: scholars), (lever: building\_cost\_pct; value: -25; building: school), (lever: traders\_passing\_pct; value: 15)))); burden: (name: The dry season; text: Harvests a step worse at home, stores rot 30 % faster, growth −5 %.; why: Inferred: rainfall decided every year.; effects: ((lever: harvest\_steps; value: -1; where: core), (lever: store\_rot\_pct; value: 30), (lever: growth\_pct; value: -5)); shed: (count: (who: this; thing: building:granary; op: \>=; value: 3)); shed\_text: Build three granaries.; turned: (name: Full granaries; text: Stores rot 40 % less, harvests a step better at home, growth +5 %.; effects: ((lever: store\_rot\_pct; value: -40), (lever: harvest\_steps; value: 1; where: core), (lever: growth\_pct; value: 5)))); ambition\_themes: trade, faith, land
- id: peasant\_republic; label: Free commune; detect: (entity\_type: peasant\_republic, confederation, league); birthright: (name: Free valleys; text: Levies serve two months longer, break 5 points later, and conquerors' Foreign rule lasts 40 % longer.; why: {name} governed itself through its communes.; effects: ((lever: levy\_free\_months; value: 2), (lever: break\_point\_pct; value: 5; kind: levy), (lever: homeland\_resistance\_pct; value: 40))); heydays: ((age\_options: age\_of\_reformations, age\_of\_gunpowder\_empires; name: Common men's war; text: Levies break 5 points later and serve two months longer; recruits refill 15 % faster.; why: Inferred: communal levies were at their best before standing armies.; wakes: (independent: (who: this)); effects: ((lever: break\_point\_pct; value: 5; kind: levy), (lever: levy\_free\_months; value: 2), (lever: recruit\_refill\_pct; value: 15)))); burden: (name: No standing host; text: Hired companies cost 20 % more and sieges are 20 % slower.; why: Communes fought at home and seldom took castles (inferred).; effects: ((lever: hired\_company\_cost\_pct; value: 20), (lever: siege\_pct; value: -20)); shed: (knows: (who: this; invention: [W6 Pike squares](Data-Research#inventions))); shed\_text: Learn Pike squares.; turned: (name: Pike squares; text: Levies break 10 points later; sieges 5 % faster.; effects: ((lever: break\_point\_pct; value: 10; kind: levy), (lever: siege\_pct; value: 5)))); ambition\_themes: survival, trade, land
- id: segmentary\_society; label: Society without a crown; detect: (mode: decentralized\_polity); birthright: (name: No crown to take; text: Conquerors' Foreign rule lasts 60 % longer, and Ungoverned does not count in your land.; why: {name} had no single ruler a conqueror could depose.; effects: ((lever: homeland\_resistance\_pct; value: 60), (lever: grievance\_shield; value: yes; grievance: ungoverned))); heydays: ((age\_options: age\_of\_atlantic\_empires, age\_of\_exploration, age\_of\_gunpowder\_empires; name: Melting away; text: Conquerors' Foreign rule lasts 50 % longer, armies march 15 % faster, loot +20 %, while at war.; why: Inferred: decentralised peoples resisted by moving and raiding.; wakes: (at\_war: (who: this)); effects: ((lever: homeland\_resistance\_pct; value: 50), (lever: march\_days\_pct; value: -15), (lever: loot\_pct; value: 20)))); burden: (name: No single voice; text: One envoy fewer.; why: Many councils, no single voice abroad (inferred).; effects: ((lever: envoy\_count; value: -1)); shed: (count: (who: this; thing: allies; op: \>=; value: 3)); shed\_text: Have three allies.; turned: (name: Council of many; text: One more envoy, and neighbours think a step better of you.; effects: ((lever: envoy\_count; value: 1), (lever: opinion\_steps; value: 1; of: neighbours)))); ambition\_themes: survival, trade, faith
- id: pastoral\_people; label: Herding people; detect: (focus\_any: pastoralism; text\_any: cattle, herd, pastoral, camel, sheep); birthright: (name: Herds of {name}; text: Herds grow 25 % faster, herder slots +20 %, armies forage 20 % more.; why: {name}'s wealth was counted in animals.; effects: ((lever: herd\_growth\_pct; value: 25), (lever: class\_slots\_pct; value: 20; class: herders), (lever: forage\_pct; value: 20))); heydays: ((age\_options: age\_of\_crisis\_and\_absolutism, age\_of\_gunpowder\_empires, age\_of\_atlantic\_empires; name: Cattle wealth; text: Herds grow 25 % faster, horses 20 % faster, recruits refill 15 % faster.; why: Inferred: herding peoples grew strong in good grazing years.; wakes: (independent: (who: this)); effects: ((lever: herd\_growth\_pct; value: 25), (lever: horses\_pct; value: 20), (lever: recruit\_refill\_pct; value: 15)))); burden: (name: Drought years; text: Herds grow 20 % slower and people 5 % slower.; why: Inferred: drought struck herds first.; effects: ((lever: herd\_growth\_pct; value: -20), (lever: growth\_pct; value: -5)); shed: (count: (who: this; thing: building:ranch; op: \>=; value: start+3)); shed\_text: Build three more ranches.; turned: (name: Wells and grazing law; text: Herds grow 25 % faster and stores rot 25 % less.; effects: ((lever: herd\_growth\_pct; value: 25), (lever: store\_rot\_pct; value: -25)))); ambition\_themes: wealth, survival, land
- id: raiders; label: Raiding power; detect: (focus\_any: plunder; modes\_any: raiding); birthright: (name: Swift raiders; text: Loot +40 %, armies march 10 % faster, light troops hit 15 % harder.; why: {name} lived partly by raiding (catalogue).; effects: ((lever: loot\_pct; value: 40), (lever: march\_days\_pct; value: -10), (lever: hits\_pct; value: 15; arm: light))); heydays: ((age\_options: age\_of\_gunpowder\_empires, age\_of\_atlantic\_empires; name: Raiding season; text: Loot +40 %, armies march 10 % faster, horses breed 20 % faster, while at war.; why: Inferred: raiding peaked while frontiers were open.; wakes: (at\_war: (who: this)); effects: ((lever: loot\_pct; value: 40), (lever: march\_days\_pct; value: -10), (lever: horses\_pct; value: 20)))); burden: (name: Feared by all; text: Neighbours think a step less of you, and each province taken counts 20 % more toward Lands taken.; why: Raids made enemies of neighbours (inferred).; effects: ((lever: opinion\_steps; value: -1; of: neighbours), (lever: lands\_taken\_pct; value: 20)); shed: (count: (who: this; thing: allies; op: \>=; value: 2)); shed\_text: Have two allies.; turned: (name: Honoured guests; text: Neighbours think a step better of you, 15 % more traders.; effects: ((lever: opinion\_steps; value: 1; of: neighbours), (lever: traders\_passing\_pct; value: 15)))); ambition\_themes: land, wealth, survival
- id: ocean\_voyagers; label: Ocean voyagers; detect: (region\_any: oc\_oceania); birthright: (name: Wayfinders; text: Sea crossings 20 % shorter, storms sink 40 % fewer ships, fisheries feed 30 % more.; why: {name}'s people crossed open ocean by stars and swells.; effects: ((lever: sea\_days\_pct; value: -20), (lever: storm\_loss\_pct; value: -40), (lever: fish\_pct; value: 30))); heydays: ((age\_options: age\_of\_exploration, age\_of\_atlantic\_empires; name: Long voyages; text: Sea crossings 15 % shorter, ports raise 25 % more sailors, fisheries feed 30 % more.; why: Inferred: voyaging links between islands carried power and goods.; wakes: (coastal: (who: this)); effects: ((lever: sea\_days\_pct; value: -15), (lever: crew\_pct; value: 25), (lever: fish\_pct; value: 30)))); burden: (name: Far from everyone; text: Inventions cost 15 % more and 10 % fewer traders pass.; why: Distance kept new techniques far away (inferred).; effects: ((lever: invention\_cost\_pct; value: 15), (lever: traders\_passing\_pct; value: -10)); shed: (count: (who: this; thing: allies; op: \>=; value: 1)); shed\_text: Have an ally.; turned: (name: Many harbours; text: 15 % more traders on the coast and one more trader.; effects: ((lever: traders\_passing\_pct; value: 15; where: coast), (lever: trader\_count; value: 1)))); ambition\_themes: sea, survival, faith
- id: chiefly\_society; label: Chiefdom; detect: (entity\_type: chiefdom, paramount\_chiefdom, cacicazgo, tribal\_confederation, confederation); birthright: (name: Kin and chiefs; text: Tribute +20 %, levies serve a month longer, and conquerors' Foreign rule lasts 30 % longer.; why: {name}: held together by chiefs, kin and gifts.; effects: ((lever: tribute\_pct; value: 20), (lever: levy\_free\_months; value: 1), (lever: homeland\_resistance\_pct; value: 30))); heydays: ((age\_options: age\_of\_atlantic\_empires, age\_of\_exploration, age\_of\_gunpowder\_empires; name: Feasts and alliances; text: One step better opinion from neighbours, retinues 20 % larger, tribute +15 %, while independent.; why: Inferred: chiefs grew strong by gifts and marriage ties with neighbours.; wakes: (independent: (who: this)); effects: ((lever: opinion\_steps; value: 1; of: neighbours), (lever: retinue\_pct; value: 20), (lever: tribute\_pct; value: 15)))); burden: (name: Rival lineages; text: Lords start a step less loyal and stability −0.5.; why: Chiefly succession was open to many kin (inferred).; effects: ((lever: lord\_loyalty\_start\_steps; value: -1), (lever: stat; value: -0.5; stat: stability)); shed: (count: (who: this; thing: loyal\_lords; op: \>=; value: start\*2)); shed\_text: Have twice as many loyal lords as at the start.; turned: (name: Paramount line; text: A new ruler no longer shakes the lords; retinues 15 % larger.; effects: ((lever: lord\_loyalty\_shield; value: yes; cause: new\_ruler), (lever: retinue\_pct; value: 15)))); ambition\_themes: survival, land, trade
- id: settled\_realm; label: Settled realm; detect: (none); birthright: (name: Old fields of {name}; text: Harvests a step better at home, growth +10 %, tax reaching you +10 %.; why: {name}'s farmland was its strength ({goods}).; effects: ((lever: harvest\_steps; value: 1; where: core), (lever: growth\_pct; value: 10), (lever: tax\_reach\_pct; value: 10))); heydays: ((age\_options: age\_of\_crisis\_and\_absolutism, age\_of\_gunpowder\_empires, age\_of\_exploration, age\_of\_atlantic\_empires; name: Good harvest years; text: Harvests a step better at home, growth +10 %, stores rot 25 % less, tax reaching you +10 %, while at peace.; why: Inferred: long peace let farming realms grow.; wakes: (not: (at\_war: (who: this))); effects: ((lever: harvest\_steps; value: 1; where: core), (lever: growth\_pct; value: 10), (lever: store\_rot\_pct; value: -25), (lever: tax\_reach\_pct; value: 10)))); burden: (name: Old quarrels; text: Lords start a step less loyal, broken oaths fade 20 % slower.; why: Inferred from the catalogue's internal divisions.; effects: ((lever: lord\_loyalty\_start\_steps; value: -1), (lever: oath\_fade\_pct; value: 20)); shed: (count: (who: this; thing: officials; op: \>=; value: start\*2)); shed\_text: Have twice the officials you began with.; turned: (name: Peace of the land; text: Lost wars no longer shake the lords; growth +5 %.; effects: ((lever: lord\_loyalty\_shield; value: yes; cause: lost\_wars), (lever: growth\_pct; value: 5)))); ambition\_themes: crown, land, wealth

### Theme ambitions

| Name | name | hint | text | stir | goal | fail | window |
|---|---|---|---|---|---|---|---|
| wealth | A full treasury | Coin that counts itself. | Hold five times the gold you began with and owe nothing. | count: (who: this; thing: gold; op: \>=; value: start\*2) | all: ((count: (who: this; thing: gold; op: \>=; value: start\*5)), (count: (who: this; thing: debt; op: ==; value: 0))) |  |  |
| sea | Masters of the harbour | Sails beyond counting. | Have three times the trade ships you began with. | count: (who: this; thing: trade\_ships; op: \>=; value: start\*2) | count: (who: this; thing: trade\_ships; op: \>=; value: start\*3) |  |  |
| trade | Market of the region | Where every road ends. | Have three more markets than at the start. | count: (who: this; thing: building:market; op: \>=; value: start+1) | count: (who: this; thing: building:market; op: \>=; value: start+3) |  |  |
| learning | House of learning | Ink that outlasts swords. | Have two more schools and three times the scholars you began with. | count: (who: this; thing: schools; op: \>=; value: start+1) | all: ((count: (who: this; thing: schools; op: \>=; value: start+2)), (count: (who: this; thing: scholars; op: \>=; value: start\*3))) |  |  |
| faith | Houses of worship | Bells, drums or calls to prayer in every valley. | Have four more houses of worship than at the start. | count: (who: this; thing: building:house\_of\_worship; op: \>=; value: start+2) | count: (who: this; thing: building:house\_of\_worship; op: \>=; value: start+4) |  |  |
| survival | Endure | Still standing when the world has changed. | Be independent in 1600. | at\_war: (who: this) | all: ((independent: (who: this)), (date: (min: 1600))) | not: (independent: (who: this)) | 1444, 1600 |
| crown | A loyal realm | Every banner turned the same way. | Have twice as many loyal lords as at the start. | count: (who: this; thing: loyal\_lords; op: \>=; value: start\*1.5) | count: (who: this; thing: loyal\_lords; op: \>=; value: start\*2) |  |  |
| land | Wider borders | More land than your fathers knew. | Hold twice the provinces you began with. | count: (who: this; thing: provinces; op: \>=; value: start\*1.5) | count: (who: this; thing: provinces; op: \>=; value: start\*2) |  |  |

### Legacies

#### Land

| name | text | effects |
|---|---|---|
| Marcher lords | Each province taken counts 20 % less toward Lands taken; conquered land settles 25 % faster. | (lever: lands\_taken\_pct; value: -20), (lever: integration\_years\_pct; value: -25) |
| Veteran captains | New commanders start with one more Might; break point +5 points. | (lever: commander\_skill; value: 1; skill: might), (lever: break\_point\_pct; value: 5) |

#### Sea

| name | text | effects |
|---|---|---|
| Dockyard tradition | Ships build 15 % faster and ports raise 20 % more sailors. | (lever: ship\_build\_pct; value: -15), (lever: crew\_pct; value: 20) |
| Charted coasts | Sea crossings 15 % shorter and storms sink 30 % fewer ships. | (lever: sea\_days\_pct; value: -15), (lever: storm\_loss\_pct; value: -30) |

#### Trade

| name | text | effects |
|---|---|---|
| Merchant houses | One more trader and trade profit +10 %. | (lever: trader\_count; value: 1), (lever: trade\_balance\_pct; value: 10) |
| Fair towns | 20 % more traders pass; markets cost 20 % less. | (lever: traders\_passing\_pct; value: 20), (lever: building\_cost\_pct; value: -20; building: market) |

#### Faith

| name | text | effects |
|---|---|---|
| Pious foundations | Faith spreads 25 % faster; one step better opinion from your faith. | (lever: faith\_shift\_pct; value: 25), (lever: opinion\_steps; value: 1; of: same\_faith) |
| Learned clergy | School seats +20 % and chaplains 25 % stronger. | (lever: school\_seats\_pct; value: 20), (lever: official\_type\_pct; value: 25; type: chaplain) |

#### Crown

| name | text | effects |
|---|---|---|
| Loyal houses | Lords start a step more loyal; retinues 20 % larger. | (lever: lord\_loyalty\_start\_steps; value: 1), (lever: retinue\_pct; value: 20) |
| Royal clerks | Officials cost 15 % less, settle a year sooner; tax reaching you +5 %. | (lever: official\_wage\_pct; value: -15), (lever: official\_years\_to\_full; value: -1), (lever: tax\_reach\_pct; value: 5) |

#### Learning

| name | text | effects |
|---|---|---|
| Patrons of learning | Scholars work 10 % better; 30 % more fleeing scholars choose you. | (lever: scholar\_output\_pct; value: 10), (lever: migrants\_pct; value: 30; class: scholars) |
| Copyists and presses | Inventions cost 10 % less; school seats +25 %. | (lever: invention\_cost\_pct; value: -10), (lever: school\_seats\_pct; value: 25) |

#### Survival

| name | text | effects |
|---|---|---|
| Unbowed | Conquerors' Foreign rule lasts 40 % longer; garrisons 15 % stronger. | (lever: homeland\_resistance\_pct; value: 40), (lever: garrison\_pct; value: 15) |
| Hard people | Recruits refill 15 % faster; armies forage 25 % more. | (lever: recruit\_refill\_pct; value: 15), (lever: forage\_pct; value: 25) |

#### Wealth

| name | text | effects |
|---|---|---|
| Sound coin | Debt interest −30 %; tax reaching you +10 %. | (lever: loan\_interest\_pct; value: -30), (lever: tax\_reach\_pct; value: 10) |
| Thrifty court | Officials cost 15 % less; buildings cost 20 % less. | (lever: official\_wage\_pct; value: -15), (lever: building\_cost\_pct; value: -20) |
