# Culture data

Every value in the game's culture config, exactly as the game reads it. This page is made from `packages/rules/data/domain/culture.json` each time the config changes, so it always matches the game. How these values are used is explained on [Culture](Culture).

Keys are written as in the config file. Shares are fractions (0.25 is 25 %), and values marked (provisional) are placeholders that may still change in balancing. Inventions are shown by id and name; see [Research data](Data-Research#inventions).

> Culture config (domain/culture/spec.md §10), from culture/culture-config.example.yaml version 1. All numbers are placeholders; '\_provisional' lists the keys still being balanced. 'tongues\_added' are tongues the design or the feature files name with their family.

| Key | Value |
|---|---|
| `families_event_tree` | latin, germanic, slavic, hellenic, turkic, iranian, arab, berber, cushitic, semitic\_ethiopian, mande, akan, yoruba\_edo, hausa\_fulani, bantu, khoisan, nilotic, indo\_aryan, dravidian, tibeto\_burman, tai, austroasiatic, austronesian, sinitic, japonic, koreanic, mongolic, tungusic, uralic, nahua, maya, andean, tupi\_guarani, algonquian, iroquoian, creole\_atlantic, polynesian, melanesian, aboriginal\_australian |
| `families_added` | celtic, baltic, caucasian, hebrew |
| `start_flag_chancery_tradition` | ming, joseon, castile, ottoman |
| `charter_brought_by` | the ruler, its lords, its towns, a homeland rising |

## Relation (provisional)

| Name | tongue share weight | foreign rule | drift multiplier |
|---|---|---|---|
| kin | 1 |  |  |
| cousin | 0.5 | no | 2 |
| stranger | 0 | yes |  |
| trading | 0 | no |  |

## Drift

| Key | Value |
|---|---|
| `base_rate_per_year` (provisional) | 0.005 |
| `court_pull_needs_years_held` (provisional) | 20 |
| `court_pull_needs` | own\_official, lord\_of\_court\_tongue |
| `drop_below_share` (provisional) | 0.01 |

### Multipliers (provisional)

| Key | Value |
|---|---|
| `town_classes` | 2 |
| `school_in_pull_tongue` | 1.5 |
| `schoolmaster_official` | 2 |
| `homeland_of_drifting_tongue` | 0.5 |
| `way_of_life_in_own_land` | 0.5 |
| `diaspora` | 0.25 |
| `nationalism_0_3` | 0.25 |
| `own_tongue_charter` | 0 |

#### Inventions

| Key | Value |
|---|---|
| `printing` | 1.25 |
| `mass_schooling` | 1.25 |
| `newspapers` | 1.25 |
| `railways` | 1.25 |

### Way of life lands (provisional)

| Key | Value |
|---|---|
| `herding` | grassland, drylands |
| `forest` | forest, jungle |
| `seafaring` | coastal |

## Policy (provisional)

| Name | drift | school upkeep | grievance | stranger lords waver | needs any |
|---|---|---|---|---|---|
| let\_be | 0.5 |  |  |  |  |
| teach | 1 | 1.1 |  |  |  |
| impose | 2 |  | banned\_tongue | 1 | invention:printing, start\_flag:chancery\_tradition |

## Officials

### Years to full effect (provisional)

| Key | Value |
|---|---|
| `kin` | 5 |
| `cousin` | 7 |
| `stranger` | 10 |
| `local_tongue` | 5 |

## Effects (provisional)

| Key | Value |
|---|---|
| `family_neighbour_research_weight` | 2 |

### Trading people

| Key | Value |
|---|---|
| `min_share` | 0.02 |
| `needs` | market |
| `trade_value` | 0.1 |
| `extra_traders` | 1 |

### National levy

| Key | Value |
|---|---|
| `needs_nationalism` | 0.5 |
| `kin_refill` | 1.25 |
| `stranger_refill` | 0.75 |
| `from_age` | age\_of\_revolutions |

## Nationalism (provisional)

| Key | Value |
|---|---|
| `cousins_become_strangers_at` | 0.3 |
| `homeland_demands_country_at` | 0.5 |

## Engine events (provisional)

| Key | Value |
|---|---|
| `check_every_years` | 5 |

### Court goes native

| Key | Value |
|---|---|
| `court_share_below` | 0.2 |
| `for_years` | 50 |
| `other_tongue_above` | 0.5 |
| `recheck_years` | 25 |

### New tongue abroad

| Key | Value |
|---|---|
| `settler_majority_years` | 100 |
| `region` | map macro-region |
| `separated_by_sea` | top-level map region differs from the court capital's |

### Merge without event

| Key | Value |
|---|---|
| `needs_policy` | impose |
| `years` | 50 |
| `nation_state` | court tongue is the merges\_into of some tongue |

## Family default by region (provisional)

| Name | ethiopian highlands | iberia | americas |
|---|---|---|---|
| cushitic | oromo |  |  |
| latin |  | castilian | castilian |

## Tongues

| id | name | family | way of life | splits to | merges into | local names | diaspora |
|---|---|---|---|---|---|---|---|
| french | French | latin | settled |  |  |  |  |
| occitan | Occitan | latin | settled |  |  |  |  |
| castilian | Castilian | latin | settled | criollo |  |  |  |
| portuguese | Portuguese | latin | seafaring | brazilian |  |  |  |
| criollo | Criollo | creole\_atlantic | settled |  |  |  |  |
| brazilian | Brazilian | creole\_atlantic | settled |  |  |  |  |
| tuscan | Tuscan | latin | settled |  | italian |  |  |
| lombard | Lombard | latin | settled |  | italian |  |  |
| neapolitan | Neapolitan | latin | settled |  | italian |  |  |
| italian | Italian | latin | settled |  |  |  |  |
| high\_german | High German | germanic | settled |  | german | Swabians, Franconians, Bavarians, Alemannic Swiss Germans |  |
| low\_german | Low German | germanic | settled |  | german | Westphalians, German (Eastphalian Low Saxon) |  |
| german | German | germanic | settled |  |  |  |  |
| flemish | Flemish | germanic | settled |  |  |  |  |
| breton | Breton | celtic | seafaring |  |  |  |  |
| gaelic\_irish | Irish | celtic | settled |  |  | Gaelic Irish |  |
| mandinka | Mandinka | mande | settled |  |  | Mandinka (Maninka) |  |
| bamana | Bamana | mande | settled |  |  |  |  |
| dyula | Dyula | mande | trading |  |  | Dyula and other Mande traders | yes |
| fulbe | Fulbe | hausa\_fulani | herding |  |  |  |  |
| armenian | Armenian | caucasian | trading |  |  |  | yes |
| jewish | Jewish | hebrew | trading |  |  | Jewish communities, Jews | yes |
| oromo | Oromo | cushitic | herding |  |  |  |  |
| manchu | Manchu | tungusic | forest |  |  |  |  |
| han | Han | sinitic | settled |  |  |  |  |
| lithuanian | Lithuanian | baltic | forest |  |  |  |  |
| georgian | Georgian | caucasian | settled |  |  |  |  |
| nahua | Nahua | nahua | settled |  |  |  |  |

## Tongues added

| id | name | family | way of life | splits to |
|---|---|---|---|---|
| swahili | Swahili | bantu | settled |  |
| latvian | Latvian | baltic | settled |  |
| catalan | Catalan | latin | settled |  |
| anglo\_american | Anglo-American | creole\_atlantic | settled |  |
| afrikaans | Afrikaans | creole\_atlantic | settled |  |
| english | English | germanic | settled | anglo\_american |
| dutch | Dutch | germanic | settled | afrikaans |
| great\_russian | Great Russian | none | settled |  |
| ruthenian | Ruthenian | none | settled |  |
| russian | Russian | none | settled |  |
| andalusi\_arabic | Andalusi Arabic | none | settled |  |
| basque | Basque | none | settled |  |
| norman | Norman | none | settled |  |
| cherokee | Cherokee | none | settled |  |
| galician | Galician | none | settled |  |
| swedish | Swedish | germanic | settled |  |
| bosnian | Bosnian | slavic | settled |  |

## Merge events

| Name | into |
|---|---|
| italian\_unification | italian |
| german\_unification | german |

## Age of revolutions

> event-tree data/ages.yaml age\_of\_revolutions window

| Key | Value |
|---|---|
| `earliest_start` | 1750 |
| `force_start` | 1800 |

## Dots

| Key | Value |
|---|---|
| `kin` | green |
| `cousin` | yellow |
| `stranger` | red |
| `trading` | grey |

## Lens

| Key | Value |
|---|---|
| `far` | family |
| `regional` | language |
| `realm_toggle` | same language, related or foreign for the player's realm |

## Ai

| Name | hegemon seeker | expansionist | isolationist | mercantile | opportunist | zealot |
|---|---|---|---|---|---|---|
| policy | policy: teach; with\_printing: impose | policy: teach; with\_printing: impose | policy: let\_be | policy: let\_be | policy: teach | policy: teach |
| levers | settlers into conquered border provinces, the war aim "Gather our kin" after 1789 | settlers into conquered border provinces, the war aim "Gather our kin" after 1789 | "Own language" charters to keep foreign peoples calm, a welcome for trading peoples | "Own language" charters to keep foreign peoples calm, a welcome for trading peoples | "Free a people" against neighbours with foreign homelands in revolt | expulsion of trading peoples of another faith |

## Risings

| Key | Value |
|---|---|
| `homeland_draw` (provisional) | 0.08 |

## Refugees

| Key | Value |
|---|---|
| `settle_after_years` (provisional) | 2 |

## Schools

| Key | Value |
|---|---|
| `learned_tongues` | Latin, Classical Arabic |
