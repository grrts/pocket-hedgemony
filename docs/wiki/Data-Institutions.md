# Institutions data

Every value in the game's institutions config, exactly as the game reads it. This page is made from `packages/rules/data/domain/institutions.json` each time the config changes, so it always matches the game. How these values are used is explained on [Institutions](Institutions).

Keys are written as in the config file. Shares are fractions (0.25 is 25 %), and values marked (provisional) are placeholders that may still change in balancing. Inventions are shown by id and name; see [Research data](Data-Research#inventions).

> Institutions (domain/institutions/spec.md, INST): the Empire and the Shogunate. Values from the institutions design of 18 October 2026 (/mnt/project-files/institutions/institutions-design.md). Every number is a placeholder balancing knob. members\_1444 is the design's worked X-13 match of the catalogue's imperial estates to map realms (OQ-INST-1: the Teutonic Order, nominal in the catalogue, is left out as the design lists it).

## Hold

### Words

| Name | min | word |
|---|---|---|
| 1 | 80 | Strong |
| 2 | 50 | Firm |
| 3 | 20 | Weak |
| 4 | 0 | Hollow |

## Empire

| Key | Value |
|---|---|
| `name` | The Empire |
| `office` | Emperor |
| `holder_1444` | austria |
| `members_1444` | austria, bavaria, bohemia, brandenburg, cologne, hamburg, hesse, lorraine, luneburg, mecklenburg, palatinate, pomerania, saxony, wurttemberg, switzerland, milan, savoy, modena |
| `faith` | catholic |
| `head_of_faith` | papal\_states |
| `hold_start` | 35 |
| `election_years_without_rulers` | 25 |
| `election_months` | 1 |
| `candidates_by_soldiers` | 3 |
| `dues_per_member` | 1 |
| `common_tax` | 0.05 |
| `contingent` | 0.1 |
| `one_realm_hold` | 80 |
| `dissolve_years_at_zero` | 5 |
| `dissolve_min_era` | IV |

### Seats 1444

| name | church | realm |
|---|---|---|
| Mainz | yes |  |
| Cologne |  | cologne |
| Trier | yes |  |
| Bohemia |  | bohemia |
| Palatinate |  | palatinate |
| Saxony |  | saxony |
| Brandenburg |  | brandenburg |

### Seek vote

| Key | Value |
|---|---|
| `gift_gold` | 30 |
| `tie` | 15 |
| `fade_years` | 10 |

### Vote

| Key | Value |
|---|---|
| `standing_divisor` | 4 |
| `same_faith` | 10 |
| `sitting_house` | 15 |
| `strength_per_multiple` | 5 |
| `strength_max` | 20 |
| `at_war` | -50 |

### Defence

| Key | Value |
|---|---|
| `answer` | 10 |
| `refuse` | -15 |
| `wrong` | -25 |
| `wrong_fade_years` | 20 |
| `answer_months` | 1 |

### Hold year

| Key | Value |
|---|---|
| `peace` | 2 |
| `member_war` | -3 |
| `outsider_province` | -2 |
| `outsider_max` | -10 |
| `member_left` | -5 |
| `other_faith` | -1 |
| `augsburg_factor` | 0.5 |

### Admit

| Key | Value |
|---|---|
| `base` | 0 |
| `standing_divisor` | 4 |
| `same_faith` | 10 |
| `emperor_stronger` | 10 |

### Diet

| Key | Value |
|---|---|
| `min_hold` | 50 |
| `years_between` | 5 |
| `months` | 1 |
| `pass_cost` | 30 |
| `fail_cost` | 10 |
| `elector_weight` | 2 |

#### Reasons

| Key | Value |
|---|---|
| `hold_divisor` | 10 |
| `standing_divisor` | 4 |
| `same_faith` | 10 |
| `outsider_next` | 15 |
| `size_per_multiple` | 5 |
| `size_max` | 20 |

### Reforms

| id | name | base | effect |
|---|---|---|---|
| public\_peace | Public Peace | 10 | A member that makes war on another member becomes a Breaker of the Peace. |
| imperial\_court | Imperial Court | 5 | Members take quarrels over land to court instead of to war. |
| circles | Circles | 5 | Every member of a circle joins the defence when an outsider attacks one of them. |
| common\_tax | Common Tax | -10 | Every member pays 5 in 100 of its tax to the Emperor in place of the dues. |
| imperial\_army | Imperial Army | -10 | In a war to defend the Empire the Emperor commands a tenth of every member's soldiers. |
| hereditary\_crown | Hereditary Crown | -25 | The Emperor's heir takes the crown; no more elections. |
| one\_realm | One Realm | -40 | Every member's ruler becomes a great lord of the Emperor, and the Empire becomes one realm. |

### Breaker

| Key | Value |
|---|---|
| `aim_years` | 10 |

### Court

| Key | Value |
|---|---|
| `base` | -5 |
| `aim` | 20 |
| `standing_divisor` | 4 |
| `hold_divisor` | 10 |
| `answer_months` | 1 |

### Circles

> OQ-INST-2 default: the historical circles of 1512 matched to map members; Bohemia, Switzerland and the Italian members sat in no circle.

| Key | Value |
|---|---|
| `Austrian` | austria |
| `Bavarian` | bavaria |
| `Swabian` | wurttemberg |
| `Upper Rhenish` | hesse, lorraine |
| `Electoral Rhenish` | cologne, palatinate |
| `Lower Saxon` | luneburg, mecklenburg, hamburg |
| `Upper Saxon` | saxony, brandenburg, pomerania |

## Shogunate

> INST-060 to INST-069 (institutions design §4). The Court's province is the map's Mie (p2110), which holds Kyoto and Japan's 1444 capital. Japan's land is Japan's 1444 provinces. The houses and their land are the realm data's starting\_lords.house\_lands (D-INST-1). The oath counts are placeholders in the reasons count's own scale.

| Key | Value |
|---|---|
| `name` | The Shogunate |
| `office` | Shogun |
| `holder_1444` | japan |
| `court_province` | p2110 |
| `hold_start` | 30 |
| `appointed_hold` | 40 |
| `summon_wealth_loss` | 0.1 |
| `confirm_cost` | 5 |
| `restoration_min_era` | V |

### Hold year

| Key | Value |
|---|---|
| `no_revolt` | 3 |
| `per_revolt` | -5 |
| `no_heir` | -10 |
| `unhappy_war` | -3 |
| `summoned` | 1 |

### Closed country

| Key | Value |
|---|---|
| `min_era` | III |
| `hold_per_year` | 2 |

### Oath

| Key | Value |
|---|---|
| `base` | -10 |
| `standing_divisor` | 4 |
| `stronger_per_multiple` | 10 |
| `stronger_max` | 30 |
| `hold_divisor` | 5 |
| `answer_months` | 1 |
