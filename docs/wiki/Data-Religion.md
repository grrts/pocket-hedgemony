# Religion data

Every value in the game's religion config, exactly as the game reads it. This page is made from `packages/rules/data/domain/religion.json` each time the config changes, so it always matches the game. How these values are used is explained on [Religion](Religion).

Keys are written as in the config file. Shares are fractions (0.25 is 25 %), and values marked (provisional) are placeholders that may still change in balancing. Inventions are shown by id and name; see [Research data](Data-Research#inventions).

> Religion config (domain/religion/spec.md §10), from religion/config/religion.yaml version 1; every number is a first-pass placeholder. 'patches' and 'event\_options' are copied from religion/event-tree-additions (patches.yaml, religion-events.yaml). 'holy\_place\_names' and 'holder\_names' are the display names the feature files use.

| Key | Value |
|---|---|
| `event_tree_religions` | catholic, protestant, anglican, orthodox, oriental\_christian, sunni, shia, ibadi, jewish, hindu, sikh, theravada, mahayana, vajrayana, shinto, confucian\_ritual, daoist, indigenous\_american, african\_traditional, pacific\_traditional, siberian\_steppe\_traditional, secular |
| `catalogue_minorities_not_faiths` | Yazidi, Druze, Zoroastrian |

## Added faiths

| Key | Value |
|---|---|
| `religions` | hussite, jain, asian\_traditional, baltic\_traditional |

## Faiths

| Name | family | house | clergy marry | rules | carried by trade | layered | rooted |
|---|---|---|---|---|---|---|---|
| catholic | christian | church, cathedral | no | monastic\_land, inquisition |  |  |  |
| protestant | christian | church, minster | yes | print\_and\_school\_pull |  |  |  |
| anglican | christian | church, cathedral | yes | crown\_heads\_church |  |  |  |
| hussite | christian | church, cathedral | no | merges\_into\_protestant |  |  |  |
| orthodox | christian | church, cathedral | yes | monastic\_land |  |  |  |
| oriental\_christian | christian | church, cathedral | yes |  |  |  |  |
| sunni | islamic | mosque, great mosque | yes | protected\_communities | yes |  |  |
| shia | islamic | mosque, great mosque | yes | protected\_communities | yes |  |  |
| ibadi | islamic | mosque, great mosque | yes | protected\_communities | yes |  |  |
| jewish | jewish | synagogue, great synagogue | yes |  |  |  |  |
| hindu | indic | temple, great temple | yes | temple\_town |  |  |  |
| sikh | indic | gurdwara, great gurdwara | yes | langar |  |  |  |
| jain | indic | temple, great temple | no |  |  |  |  |
| theravada | buddhist | monastery, great stupa | no | monastery\_school |  |  |  |
| mahayana | buddhist | temple, great temple | no |  |  | yes |  |
| vajrayana | buddhist | monastery, great monastery | no | lama\_lords |  |  |  |
| shinto | east\_asian | shrine, grand shrine | yes |  |  | yes |  |
| confucian\_ritual | east\_asian | ancestral hall, temple of Confucius | yes |  |  | yes |  |
| daoist | east\_asian | temple, great temple | yes |  |  | yes |  |
| indigenous\_american | traditional | shrine, great temple | yes |  |  |  | yes |
| african\_traditional | traditional | shrine, great shrine | yes |  |  |  | yes |
| pacific\_traditional | traditional | marae, great marae | yes |  |  |  | yes |
| siberian\_steppe\_traditional | traditional | shrine, great shrine | yes |  |  |  | yes |
| asian\_traditional | traditional | shrine, great shrine | yes |  |  |  | yes |
| baltic\_traditional | traditional | shrine, great shrine | yes |  |  |  | yes |
| secular | none | none |  | secular\_state |  |  |  |

## Relations

| Key | Value |
|---|---|
| `layered_group` | shinto, mahayana, confucian\_ritual, daoist |
| `traditional_layers_after_years` (provisional) | 100 |
| `kin_serves_community_below` (provisional) | 0.2 |

## Mix (provisional)

| Key | Value |
|---|---|
| `max_faiths_per_province` | 3 |
| `drift_per_year` | 0.03 |
| `hold_per_share` | 4 |
| `rooted_hold_per_share` | 8 |
| `rooted_sacred_places_pull` | 1 |
| `rooted_sacred_places_min_share` | 0.25 |
| `vanish_below` | 0.01 |
| `hidden_believers_floor` | 0.02 |
| `hidden_believers_years` | 100 |
| `update` | yearly |

## Pull (provisional)

| Key | Value |
|---|---|
| `house_steps` | 1, 1.5, 2 |
| `minority_house` | 0.5 |
| `monastery` | 1 |
| `pilgrimage_shrine` | 1 |
| `fallow_multiplier` | 0.5 |
| `preacher` | 2 |
| `school_of_faith` | 0.5 |
| `capital` | 1 |
| `lord_of_faith` | 0.5 |
| `traders_per_100` | 0.5 |
| `traders_max` | 2 |
| `restricted_escape_tax` | 1 |
| `chaplain_multiplier` | 2 |
| `persecution_multiplier` | 2 |
| `inquisition` | 1 |

### Landmark house

| Key | Value |
|---|---|
| `here` | 3 |
| `realm_within_rings` | 3 |
| `there` | 0.5 |

## Houses (provisional)

| Key | Value |
|---|---|
| `minority_house_needs_share` | 0.1 |
| `preacher_per_monastery_or_religious_school` | 1 |
| `tithe_gold_per_10000_people` | 1 |
| `preacher_founds_house_after_years` | 10 |
| `convert_cost_share_of_build` | 0.5 |
| `take_over_spark` | insult\_to\_faith |
| `take_over_old_faith_lords` | -1 |

### Take over gold

| Key | Value |
|---|---|
| `per_step` | 20 |
| `monastic_land_multiplier` | 2 |

## Communities (provisional)

| Key | Value |
|---|---|
| `min_share` | 0.1 |
| `wrong_faith_min_share` | 0.33 |

## Policies (provisional)

| Key | Value |
|---|---|
| `established` | none |
| `change_takes_effect` | next\_new\_year |
| `harsher_step_is_spark` | yes |

### Tolerated

| Key | Value |
|---|---|
| `pious_lords_waver_if_faith_share_of_realm` | 0.1 |

### Restricted

| Key | Value |
|---|---|
| `faith_tax` | 0.25 |
| `new_houses` | no |
| `wrong_faith_where_majority` | yes |
| `their_lords_loyalty_steps` | -1 |

### Persecuted

| Key | Value |
|---|---|
| `houses` | close\_or\_take\_over |
| `flee_per_year` | 0.02 |
| `grievance` | persecuted |
| `grievance_weight` | 2 |
| `their_lords_loyalty_steps` | -2 |
| `sets_flag` | religious\_persecution\_active |
| `gives_war_aim_to_bordering_rulers_of_faith` | defend\_the\_faith |

## Expulsion (provisional)

| Key | Value |
|---|---|
| `leave_share` | 0.7 |
| `within_months` | 12 |
| `bloodshed_grievance` | yes |

## Inquisition

| Key | Value |
|---|---|
| `upkeep_gold_per_year` (provisional) | 10 |
| `skilled_leave_per_year` (provisional) | 0.01 |
| `sets_flag` | inquisition\_established |
| `removes_hidden_believers_floor` | yes |

### Allowed for

> D-RELG-8: the government forms of the family "rule by a house"

| Key | Value |
|---|---|
| `state_faith` | catholic |
| `forms` | feudal\_realm, diet\_monarchy, household\_realm, bureaucratic\_empire, elective\_monarchy, absolute\_monarchy, constitutional\_monarchy |

## Preachers

| Key | Value |
|---|---|
| `per_houses_of_state_faith` (provisional) | 5 |
| `per_holy_place_held` (provisional) | 1 |
| `upkeep_gold_per_year` (provisional) | 1 |
| `foreign_without_leave_expel_chance_per_year` (provisional) | 0.25 |
| `sets_flag_when_expelled` | missionary\_persecution |

## State faith change

| Key | Value |
|---|---|
| `capital_share_min` (provisional) | 0.3 |
| `realm_share_min` (provisional) | 0.4 |
| `cooldown_years` (provisional) | 30 |
| `cuius_regio_after_event` | peace\_of\_augsburg |
| `cuius_regio_faiths` | catholic, protestant |
| `reformed_faiths` | protestant, anglican, hussite |

## Lords (provisional)

| Key | Value |
|---|---|
| `build_or_pay_house_of_his_faith` | 1 |
| `pious_or_clergy_on_toleration` | -1 |
| `pious_or_clergy_on_take_over` | 1 |
| `state_faith_changes_away` | -1 |
| `state_faith_changes_to_his` | 1 |

## Faith rules (provisional)

| Name | per press | per school | take over gold multiplier | clergy lords ignore faith policy | kin of | from event | merge at end of | merge latest year | else into | more |
|---|---|---|---|---|---|---|---|---|---|---|
| print\_and\_school\_pull | 0.5 | 0.5 |  |  |  |  |  |  |  |  |
| monastic\_land |  |  | 2 |  |  |  |  |  |  |  |
| crown\_heads\_church |  |  |  | yes |  |  |  |  |  |  |
| merges\_into\_protestant |  |  |  |  | protestant | protestant\_reformation | p\_protestant\_reformation | 1620 | catholic | merge when: the end of p\_protestant\_reformation or merge\_latest\_year, whichever comes first (D-RELG-14) |
| protected\_communities |  |  |  |  |  |  |  |  |  | restricted served no wrong faith: yes |
| temple\_town |  |  |  |  |  |  |  |  |  | step3 temple traders per year: 150 |
| langar |  |  |  |  |  |  |  |  |  | homeless sheltered per house: 1000 |
| monastery\_school |  |  |  |  |  |  |  |  |  | student seats per house: 20 |
| lama\_lords |  |  |  |  |  |  |  |  |  | step3 house or monastery can be fief: yes |
| secular\_state |  |  |  |  |  |  |  |  |  | allowed policies: tolerated, restricted; town school pull after year: 1850; town school pull: 0.5; needs innovation: mass\_literacy\_schooling; needs building: factory |

## Holy places

| id | faiths | province | holder 1444 | note | appears with event | earliest | moves |
|---|---|---|---|---|---|---|---|
| rome | catholic | Rome | papal\_states |  |  |  |  |
| jerusalem | catholic, orthodox, oriental\_christian, jewish, sunni, shia | Jerusalem | mamluk |  |  |  |  |
| mecca\_medina | sunni, shia, ibadi | Hejaz | hejaz | Held by the Sharifs (Hejaz), who own the province; the Mamluk overlord does not hold it (D-RELG-23) |  |  |  |
| karbala\_najaf | shia | Karbala | qara\_qoyunlu |  |  |  |  |
| constantinople | orthodox | Constantinople | byzantium |  |  |  |  |
| echmiadzin | oriental\_christian | Yerevan | qara\_qoyunlu |  |  |  |  |
| aksum | oriental\_christian | Aksum | ethiopia |  |  |  |  |
| varanasi | hindu | Varanasi | jaunpur |  |  |  |  |
| amritsar | sikh | Amritsar | none |  | sikh\_panth\_founded | 1577 |  |
| lhasa | vajrayana | Lhasa | tibet |  |  |  |  |
| temple\_of\_the\_tooth | theravada | Kotte | kotte | Follows the relic: Kandy from 1592 (D-RELG-16, provisional year) |  |  | (from\_year: 1592; province: Kandy) |
| mount\_wutai | mahayana | Shanxi | ming |  |  |  |  |
| qufu | confucian\_ritual | Shandong | ming |  |  |  |  |
| santiago | catholic | Galicia | castile |  |  |  |  |
| bodh\_gaya | theravada, mahayana, vajrayana | Gaya | jaunpur | Contested with Bengal in 1444; in decline until restoration from 1880 |  |  |  |
| ise | shinto | Ise | japan |  |  |  |  |

## Holy place effects (provisional)

| Name | preachers | pilgrim traders per year | war aim for rulers of faith | policy | house of faith in province |
|---|---|---|---|---|---|
| same\_faith | 1 | 200 |  |  |  |
| other\_faith |  |  | defend\_the\_faith |  |  |
| pilgrims\_still\_come\_if |  |  |  | tolerated | yes |

## Waves

| Key | Value |
|---|---|
| `carriers` | presses, schools, towns, traders, rule, army, preachers |
| `town_min_size` | market\_town |
| `max_active` (provisional) | 8 |

## Ai (provisional)

| Key | Value |
|---|---|
| `build_state_house_where_state_share_below` | 0.5 |
| `tolerate_faith_above_realm_share` | 0.2 |
| `zealous_personalities_restrict` | yes |
| `persecute_only_after_event_or_religious_war` | yes |
| `adopt_faith_without_event_above_realm_share` | 0.6 |

## Start (provisional)

| Key | Value |
|---|---|
| `source` | ../build/catalogue-faiths.json |
| `ruler_faith_share_where_people_majority_differs` | 0.15 |
| `community_default_share` | 0.05 |

### Overrides

| Name | where | owner | mix | towns only | mix add |
|---|---|---|---|---|---|
| 1 | region:balkans | ottoman | orthodox: 0.85; sunni: 0.15 |  |  |
| 2 | area:bohemia |  | hussite: 0.7; catholic: 0.27; jewish: 0.03 |  |  |
| 3 | area:granada |  | sunni: 0.95; jewish: 0.03; catholic: 0.02 |  |  |
| 4 | area:poland |  |  | yes | jewish: 0.05 |
| 5 | area:north\_java\_coast |  | hindu: 0.55; sunni: 0.25; asian\_traditional: 0.2 |  |  |
| 6 | area:punjab |  | hindu: 0.55; sunni: 0.45 |  |  |
| 7 | region:persia |  | sunni: 0.8; shia: 0.2 |  |  |
| 8 | area:egypt |  | sunni: 0.88; oriental\_christian: 0.1; jewish: 0.02 |  |  |

### Record faith overrides

> D-RELG-12: records with no faith id of their own; the named minority stays in the catalogue

| Key | Value |
|---|---|
| `wokou` | mahayana |
| `guanahatabey` | indigenous\_american |
| `yazidi_communities` | sunni |
| `druze_maan` | sunni |

## Patches

- event: protestant\_reformation; option: protect\_the\_reformer; tier: immediate; add: ((faith\_wave: (id: reformation; faith: protestant; from: $reform\_centre; carriers: presses, schools, towns; pull: 1.5; reach\_per\_year: 0.5; limit: region:europe; until\_period: p\_protestant\_reformation)))
- event: council\_of\_trent; option: confessional\_reform; tier: immediate; add: ((preachers: (on: $catholic\_powers; faith: catholic; amount: 2; years: 80)), (faith\_wave: (id: catholic\_renewal; faith: catholic; from: $papacy; carriers: schools, preachers; pull: 1; reach\_per\_year: 1; limit: region:europe; until\_period: p\_catholic\_reformation)))
- event: safavid\_rise; option: impose\_twelver\_shiism; tier: immediate; add: ((faith\_wave: (id: safavid\_shiism; faith: shia; from: $order; carriers: rule, preachers; pull: 2; reach\_per\_year: 1; limit: region:middle\_east; years: 150)))
- event: sikh\_panth\_founded; option: new\_panth; tier: immediate; add: ((faith\_wave: (id: sikh\_panth; faith: sikh; from: area:punjab; carriers: preachers, towns; pull: 0.5; reach\_per\_year: 0.2; limit: region:north\_india; years: 200)))
- event: futa\_jallon\_jihad; option: almamate; tier: immediate; add: ((faith\_wave: (id: futa\_jallon; faith: sunni; from: $movement; carriers: rule, army; pull: 1.5; reach\_per\_year: 0.5; limit: region:west\_africa; years: 80)))
- event: sokoto\_jihad; option: caliphate; tier: immediate; add: ((faith\_wave: (id: sokoto; faith: sunni; from: $reformers; carriers: rule, army, preachers; pull: 1.5; reach\_per\_year: 0.5; limit: region:sub\_saharan\_africa; years: 100)))

## Event options

### Princes adopt the reformation

#### Adopt and take church lands

| Name | religion | on | modifier | faith policy |
|---|---|---|---|---|
| 1 | on: $prince; set: protestant |  |  |  |
| 2 |  | $prince | dissolution\_of\_monasteries |  |
| 3 |  |  |  | on: $prince; faith: catholic; set: restricted |

#### Adopt and keep church lands

| Name | religion | faith policy | on | stat |
|---|---|---|---|---|
| 1 | on: $prince; set: protestant |  |  |  |
| 2 |  | on: $prince; faith: catholic; set: tolerated |  |  |
| 3 |  |  | $prince | stability: -1 |

#### Stay with rome

| Name | preachers | faith policy |
|---|---|---|
| 1 | on: $prince; faith: catholic; amount: 1; years: 30 |  |
| 2 |  | on: $prince; faith: protestant; set: restricted |

### Expulsion of the moriscos

#### Expel

| Name | move population | on | modifier | set flag |
|---|---|---|---|---|
| 1 | group: mudejar\_morisco\_population; from: $crown; to: $host; amount: 70% |  |  |  |
| 2 |  | $crown | loss\_of\_skilled\_minority |  |
| 3 |  | $host | skilled\_refugees |  |
| 4 |  |  |  | on: $crown; id: religious\_persecution\_active; years: 20 |

#### Leave them be

- on: $crown; stat: (stability: -1)

### Altan khan and the dalai lama

#### Patron of the gelug

- religion: (on: $khan; set: vajrayana)
- on: $khan; modifier: lama\_patronage
- faith\_wave: (id: mongol\_conversion; faith: vajrayana; from: $khan; carriers: rule, preachers; pull: 1.5; reach\_per\_year: 0.5; limit: region:central\_asia; years: 70)

#### Keep the old rites

- on: $khan; stat: (stability: 1)

### Jizya reimposed

#### Reimpose the tax

| Name | faith policy | on | modifier |
|---|---|---|---|
| 1 | on: $emperor; faith: hindu; set: restricted |  |  |
| 2 |  | $emperor | faith\_tax\_revenue |

#### Keep akbars settlement

- on: $emperor; modifier: religious\_tolerance\_policy

### Raskol old believers

#### Enforce the new rites

| Name | on | modifier | rebels | move population |
|---|---|---|---|---|
| 1 | $state | church\_schism |  |  |
| 2 |  |  | on: $state; type: religious; size: medium |  |
| 3 |  |  |  | group: old\_believers; from: $state; to: region:siberia; amount: 5% |

#### Allow both rites

- on: $state; stat: (legitimacy: -5)

### Revolution and the church

#### Concordat

| Name | on | modifier | faith policy |
|---|---|---|---|
| 1 | $realm | concordat\_settlement |  |
| 2 |  |  | on: $realm; faith: protestant; set: tolerated |
| 3 |  |  | on: $realm; faith: jewish; set: tolerated |

#### Civic religion

| Name | religion | faith policy | rebels |
|---|---|---|---|
| 1 | on: $realm; set: secular |  |  |
| 2 |  | on: $realm; faith: catholic; set: restricted |  |
| 3 |  |  | on: $realm; type: religious; size: large |

### Separation of church and state

#### Separate

| Name | religion | on | modifier |
|---|---|---|---|
| 1 | on: $state; set: secular |  |  |
| 2 |  | $state | secular\_state |

#### Keep the established church

- on: $state; stat: (stability: 1)

### Missionary societies

#### Found societies

- preachers: (on: $sender; amount: 3; years: 60)

#### No state support

- preachers: (on: $sender; amount: 1; years: 60)

### Court conversion islam

#### Embrace islam

| Name | religion | on | modifier |
|---|---|---|---|
| 1 | on: $ruler; set: sunni |  |  |
| 2 |  | $ruler | muslim\_trade\_network |

#### Keep the old faith

- on: $ruler; stat: (legitimacy: 5)

### Court conversion christian

#### Embrace christianity

| Name | religion | on | modifier |
|---|---|---|---|
| 1 | on: $ruler; set: protestant |  |  |
| 2 |  | $ruler | mission\_schools |

#### Expel the missionaries

| Name | set flag | on | stat |
|---|---|---|---|
| 1 | on: $ruler; id: missionary\_persecution; years: 20 |  |  |
| 2 |  | $ruler | legitimacy: 5 |

## Event dates

| Key | Value |
|---|---|
| `princes_adopt_the_reformation` | 1525, 1563 |
| `expulsion_of_the_moriscos` | 1609, 1614 |
| `altan_khan_and_the_dalai_lama` | 1578 |
| `jizya_reimposed` | 1679 |
| `raskol_old_believers` | 1653, 1667 |
| `revolution_and_the_church` | 1790, 1802 |
| `separation_of_church_and_state` | 1905, 1928 |
| `missionary_societies` | 1792, 1914 |
| `court_conversion_islam` | 1460, 1605 |
| `court_conversion_christian` | 1815, 1869 |

## Holy place names

| Key | Value |
|---|---|
| `rome` | Rome |
| `jerusalem` | Jerusalem |
| `mecca_medina` | Mecca and Medina |
| `karbala_najaf` | Karbala and Najaf |
| `constantinople` | Constantinople |
| `echmiadzin` | Echmiadzin |
| `aksum` | Aksum |
| `varanasi` | Varanasi |
| `amritsar` | Amritsar |
| `lhasa` | Lhasa |
| `temple_of_the_tooth` | Temple of the Tooth |
| `mount_wutai` | Mount Wutai |
| `qufu` | Qufu |
| `santiago` | Santiago de Compostela |
| `bodh_gaya` | Bodh Gaya |
| `ise` | Ise |

## Holder names

| Key | Value |
|---|---|
| `papal_states` | Papal States |
| `mamluk` | Mamluk Sultanate |
| `qara_qoyunlu` | Qara Qoyunlu |
| `byzantium` | Byzantium |
| `ethiopia` | Ethiopia |
| `jaunpur` | Jaunpur |
| `tibet` | Tibet |
| `kotte` | Kotte |
| `ming` | Ming |
| `japan` | Japan |
| `castile` | Castile |
| `hejaz` | Hejaz |

## Lens

> religion §12

| Name | colour by | hatched at community share | holy place icons | houses | preachers | waves | faith line with pulls |
|---|---|---|---|---|---|---|---|
| world | majority faith | 0.3 | yes |  |  |  |  |
| region |  |  |  | town sprites | walking figures | spreading tint |  |
| local |  |  |  |  |  |  | yes |

## Event triggers (provisional)

> D-RELG-5: what offers the court-conversion events

| Name | faith | capital share min | realm share min |
|---|---|---|---|
| court\_conversion\_islam | sunni | 0.3 |  |
| court\_conversion\_christian | protestant |  | 0.15 |

## Church heads

> RELG-085: marked only, no rules (big institutions gap)

| Name | name | place | from |
|---|---|---|---|
| pope | the Pope | rome |  |
| ecumenical\_patriarch | the Ecumenical Patriarch | constantinople |  |
| caliph | a Caliph's claim | mecca\_medina |  |
| dalai\_lama | the Dalai Lama | lhasa | 1578 |

## Faith heads

> Heads of the faith (RELG-135 to RELG-156, D-RELG-26; design religion/faith-heads-design.md). All numbers provisional. Gold is the design's; the game multiplies it by defines works.goldScale. seat\_provinces and holy\_place\_provinces are the map provinces nearest each place (the map's provinces are finer than the holy place list's regions).

| Key | Value |
|---|---|
| `crown_headed` | anglican, protestant |

### Heads

| id | name | faith | seat | way | seat realm | from | created by event |
|---|---|---|---|---|---|---|---|
| pope | the Pope | catholic | rome | chosen | papal\_states |  |  |
| ecumenical\_patriarch | the Ecumenical Patriarch | orthodox | constantinople | held |  |  |  |
| catholicos | the Catholicos | oriental\_christian | echmiadzin | held |  |  |  |
| caliph | the Caliph | sunni | mecca\_medina | claimed |  |  |  |
| dalai\_lama | the Dalai Lama | vajrayana | lhasa | held |  | 1578 | altan\_khan\_and\_the\_dalai\_lama |

### No head reasons

| Key | Value |
|---|---|
| `shia` | Twelvers wait for the hidden Imam; the learned guide them |
| `ibadi` | its imam is the ruler of Oman |
| `hindu` | many orders and teachers, no single head |
| `jain` | many orders and teachers, no single head |
| `sikh` | the scripture and the Khalsa lead it |
| `theravada` | kings protect the monks; no single head |
| `mahayana` | kings protect the monks; no single head |
| `shinto` | the Emperor in Kyoto belongs to the shogunate |
| `default` | no single head leads it |

### Seat provinces

| Key | Value |
|---|---|
| `rome` | p1624 |
| `constantinople` | p1662 |
| `echmiadzin` | p1705 |
| `mecca_medina` | p2932, p2721 |
| `lhasa` | p2614 |

### Holy place provinces

| Key | Value |
|---|---|
| `rome` | p1624 |
| `jerusalem` | p2237 |
| `mecca_medina` | p2932 |
| `karbala_najaf` | p2262 |
| `constantinople` | p1662 |
| `echmiadzin` | p1705 |
| `aksum` | p3258 |
| `varanasi` | p2786 |
| `amritsar` | p2323 |
| `lhasa` | p2614 |
| `temple_of_the_tooth` | p3433 |
| `mount_wutai` | p1799 |
| `qufu` | p2083 |
| `santiago` | p1325 |
| `bodh_gaya` | p2789 |
| `ise` | p2110 |

### Start 1444

> RELG-153, D-RELG-25: the Pope has no patron; the held seats follow their owners; the Mamluks hold the Caliph's claim as if they had taken the decision.

| Key | Value |
|---|---|
| `caliph` | mamluks |

### Conclave

> `cardinals\_stand\_in`: Houses of worship have no steps in the game yet: a Catholic house counts as step 3 or more where its province has at least this many thousand people.

| Key | Value |
|---|---|
| `months` | 1 |
| `cardinals_per_house_step3` | 1 |
| `cardinal_stand_in_min_people` | 300 |
| `gold_per_vote` | 100 |
| `gold_votes_max_share_of_cardinals` | 1 |
| `rome_votes` | 10 |
| `ai_spare_months_of_income` | 6 |

### Patron

| Key | Value |
|---|---|
| `tie` | 15 |
| `tie_name` | {head} favours us |
| `preachers` | 1 |

### Betrayed

| Key | Value |
|---|---|
| `weight` | -30 |
| `fade_years` | 30 |
| `name` | Betrayed the faith |

### Seized

| Key | Value |
|---|---|
| `weight` | -20 |
| `fade_years` | 20 |
| `name` | Seized the seat |

### Freed

| Key | Value |
|---|---|
| `weight` | 20 |
| `fade_years` | 20 |
| `name` | Freed the seat |

### Censure

> `aims`: D-RELG-26: No aim is censured too, since it is the plainest war for gain and the only aim the game declares with until the declare sheet offers aims.

| Key | Value |
|---|---|
| `aims` | take\_land, tribute, raid, no\_aim |
| `weight` | -25 |
| `fade_years` | 10 |
| `name` | Censured by {head} |
| `lord_cause` | censured\_by\_head |

### Own patriarch

> `step4\_stand\_in`: Houses of worship have no steps yet: an Orthodox house in the capital stands for the step-4 house.

| Key | Value |
|---|---|
| `gold` | 200 |
| `preachers` | 1 |
