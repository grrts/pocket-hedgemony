# Subjects data

Every value in the game's subjects config, exactly as the game reads it. This page is made from `packages/rules/data/domain/subjects.json` each time the config changes, so it always matches the game. How these values are used is explained on [Subjects](Subjects).

Keys are written as in the config file. Shares are fractions (0.25 is 25 %), and values marked (provisional) are placeholders that may still change in balancing. Inventions are shown by id and name; see [Research data](Data-Research#inventions).

> Placeholder balance values for subjects-design.md. Loyalty steps are the lords' steps (country stats 5.5). No percentage meter. Copied from subjects/config/subject-rules.json. Keys under reasons marked from\_design are the design's own numbers (subjects-design 4, 5) that the source config does not list.

| Key | Value |
|---|---|
| `schema_version` | 1 |

## Gift

| Key | Value |
|---|---|
| `months_of_income` (provisional) | 6 |

## Loyalty

| Key | Value |
|---|---|
| `steps` | loyal, wavering, disloyal, in\_revolt |
| `check_every_months` | 3 |
| `step_up_at` | 2 |
| `step_down_at` | -2 |
| `min_months_between_same_direction_steps` | 12 |
| `start_1444_hostile_stance_steps_down` | 1 |

### Effects

| Name | pays | call | foreign envoys | can fold in | goes home after months | hides army | state |
|---|---|---|---|---|---|---|---|
| loyal | 1 | full\_at\_once | refused | yes |  |  |  |
| wavering | 0.5 | half\_late | listens |  | 6 |  |  |
| disloyal | 0 | refuses | seeks\_backer |  |  | yes |  |
| in\_revolt | 0 |  |  |  |  |  | independence\_war |

### Start 1444 by autonomy

| Key | Value |
|---|---|
| `very_low` | loyal |
| `low` | loyal |
| `moderate` | loyal |
| `high` | wavering |
| `very_high` | wavering |

### Tint by step

| Key | Value |
|---|---|
| `loyal` | green |
| `wavering` | yellow |
| `disloyal` | orange |
| `in_revolt` | red |
| `from_design` | 10.3 |

## Kinds

### Vassal

| Key | Value |
|---|---|
| `icon` | shield |
| `pays_share` | 0.1 |
| `fights` | when\_called\_by\_loyalty |
| `own_diplomacy` | limited |
| `own_subjects` | yes |
| `overlord_owes` | defence |
| `reach_weight` | 1 |
| `drift` | 0 |
| `fold_in` | lord |

### Tributary

| Key | Value |
|---|---|
| `icon` | chest |
| `pays_share` | 0.15 |
| `fights` | never |
| `own_diplomacy` | full |
| `own_subjects` | yes |
| `overlord_owes` | defence\_except\_from\_overlord |
| `reach_weight` | 0.5 |
| `drift` | -1 |
| `fold_in` | tighten\_first |

### Union

| Key | Value |
|---|---|
| `icon` | two\_crowns |
| `pays_share` | 0.05 |
| `fights` | always\_if\_loyal\_or\_wavering |
| `own_diplomacy` | none |
| `own_subjects` | yes |
| `overlord_owes` | defence, shared\_ruler |
| `reach_weight` | 1 |
| `drift` | 0 |
| `fold_in` | merge\_crowns |
| `merge_requires_years` | 50 |

### March

| Key | Value |
|---|---|
| `icon` | watchtower |
| `pays_share` | 0 |
| `fights` | own\_frontier\_only |
| `own_diplomacy` | no\_alliances |
| `own_subjects` | no |
| `overlord_owes` | yearly\_stipend |
| `reach_weight` | 0.5 |
| `drift` | -1 |
| `fold_in` | lord |

### Colony

| Key | Value |
|---|---|
| `icon` | anchor |
| `pays_share` | 0.25 |
| `fights` | defends\_self |
| `own_diplomacy` | none |
| `own_subjects` | no |
| `overlord_owes` | defence, sea\_route |
| `reach_weight` | 1 |
| `drift` | 0 |
| `fold_in` | royal\_land |

#### Stages

| Name | pays share | min provinces | militia | min years | fold in |
|---|---|---|---|---|---|
| outpost | 0.25 |  |  |  |  |
| settled | 0.25 | 5 | yes |  |  |
| self\_governing | 0.1 | 10 |  | 50 | never |

### Protectorate

| Key | Value |
|---|---|
| `icon` | key |
| `pays_share` | 0.1 |
| `fights` | when\_called\_by\_loyalty |
| `own_diplomacy` | none |
| `own_subjects` | no |
| `overlord_owes` | defence |
| `reach_weight` | 1 |
| `drift` | -1 |
| `fold_in` | lord |
| `min_era` | VI |
| `min_era_overseas_trade_empire` | IV |
| `overseas_trade_empire_min_regions` (provisional) | 2 |

## Ties

| Name | loyalty | claim on overlord throne if line ends | pays share | fights | reach weight | second master share | loyalty if harmed |
|---|---|---|---|---|---|---|---|
| kin | 1 | yes |  |  |  |  |  |
| held\_of\_the\_church |  |  | 0.01 | never |  |  |  |
| held\_in\_fief |  |  | 0.01 | never | 0.5 |  |  |
| second\_master |  |  |  |  |  | 0.05 |  |
| hostage\_at\_court | 1 |  |  |  |  |  | -2 |

## Reasons

| Name | arrow | test | unless | months | also | min years | per subject over reach to furthest | note | vassal max province share | from design |
|---|---|---|---|---|---|---|---|---|---|---|
| much\_stronger | 1 | overlord\_soldiers \>= 3 \* subject\_soldiers |  |  |  |  |  |  |  |  |
| not\_much\_stronger | -1 | subject\_soldiers \>= 0.5 \* overlord\_soldiers |  |  |  |  |  |  |  |  |
| same\_faith | 1 |  |  |  |  |  |  |  |  |  |
| different\_faith | -1 |  |  |  |  |  |  |  |  |  |
| persecuted\_faith | -2 |  |  |  |  |  |  |  |  |  |
| same\_people | 1 |  |  |  |  |  |  |  |  |  |
| different\_people | -1 |  | accepted\_culture |  |  |  |  |  |  |  |
| defended | 1 |  |  | 240 |  |  |  |  |  |  |
| left\_alone | -1 |  |  | 240 | oath\_broken |  |  |  |  |  |
| gift | 1 |  |  | 60 |  |  |  |  |  |  |
| marriage | 1 |  |  |  |  |  |  |  |  |  |
| resident\_at\_court | 1 |  |  |  |  |  |  |  |  |  |
| courted | -1 |  |  |  |  |  |  |  |  |  |
| common\_enemy | 1 |  |  |  |  |  |  |  |  |  |
| long\_held | 1 |  |  |  |  | 30 |  |  |  |  |
| light\_tribute | 1 |  |  |  |  |  |  |  |  |  |
| heavy\_tribute | -1 |  |  |  |  |  |  |  |  |  |
| crushing\_tribute | -2 |  |  |  |  |  |  |  |  |  |
| lost\_war | -1 |  |  | 120 |  |  |  |  |  |  |
| new\_overlord\_ruler | -1 |  |  | 60 |  |  |  |  |  |  |
| stretched\_thin (provisional) | -1 |  |  |  |  |  | -1 | Every subject -1; the N furthest subjects -1 more each, N = reach used beyond reach rounded up (D-SUBJ-7) |  |  |
| far\_away | -1 |  |  |  |  |  |  |  |  |  |
| outgrown | -1 |  |  |  |  |  |  |  | 0.5 |  |
| hostile\_stance | -2 |  |  |  |  |  |  |  |  |  |
| rival\_stance | -1 |  |  |  |  |  |  |  |  |  |
| given\_a\_crown | 1 |  |  | 120 |  |  |  |  |  |  |
| loosened | 2 |  |  | 120 |  |  |  |  |  |  |
| force\_used\_on\_other\_subject | -1 |  |  | 60 |  |  |  |  |  |  |
| deposed\_other\_subject | -1 |  |  | 60 |  |  |  |  |  |  |
| lapse\_annexation | -1 |  |  | 120 |  |  |  |  |  |  |
| refused\_call\_again | -1 |  |  | 12 |  |  |  |  |  |  |
| missed\_stipend | -1 |  |  | 12 |  |  |  |  |  |  |
| master\_of\_others | -3 | subject has subjects of its own |  |  |  |  |  |  |  |  |
| lent\_official | 1 |  |  |  |  |  |  |  |  | 4: Lend an official, +1 |
| left\_other\_subject\_alone | -1 |  |  | 60 |  |  |  |  |  | 5: your other subjects take a -1 reason for 5 years |
| quarrel\_forbidden | -1 |  |  | 60 |  |  |  |  |  | 5: forbid it (both get -1 for 5 years) |
| kin | 1 |  |  |  |  |  |  |  |  | ties.kin |
| withholds\_tribute | -2 |  |  |  |  |  |  | While the subject withholds its tribute; it also steps one toward Disloyal each season end (SUBJ-132, D-SUBJ-31) |  |  |

## Tribute levels

| Key | Value |
|---|---|
| `none` | 0 |
| `light` | 0.5 |
| `normal` | 1 |
| `heavy` | 1.5 |
| `crushing` | 2 |

## Reach by administrative capacity

| Key | Value |
|---|---|
| `very_low` | 2 |
| `low` | 3 |
| `moderate` | 5 |
| `high` | 7 |
| `very_high` | 9 |

## Raise lord

| Key | Value |
|---|---|
| `min_provinces` | 3 |
| `allowed_loyalty` | loyal, wavering |
| `kinds` | vassal, march |

## Fold in

| Key | Value |
|---|---|
| `min_loyal_years` | 10 |
| `min_years_as_subject` | 20 |
| `needs_path` | yes |
| `needs_lord_capacity` | yes |
| `envoy_months_per_province` | 1 |
| `foreign_rule_grievance_years` | 10 |
| `start_1444_years_if_unknown` | 20 |

## Tighten

| Key | Value |
|---|---|
| `envoy_months` | 6 |
| `requires` | loyal |
| `refusal_steps_down` | 1 |
| `order` | tributary, vassal |

## Loosen

### Order

| Key | Value |
|---|---|
| `vassal` | tributary |
| `protectorate` | tributary |

## Rising

| Key | Value |
|---|---|
| `needs_backer_or_overlord_losing` | yes |
| `overlord_losing_peace_voice_share` | 0.5 |
| `disloyal_neighbours_join` | yes |

## Mapping 1444

| Name | vassal | fief | appanage | tributary | personal union | frontier commandery | colony | estate | protectorate | more |
|---|---|---|---|---|---|---|---|---|---|---|
| relations\_subject\_kind | vassal | vassal, held\_in\_fief\_or\_held\_of\_the\_church\_if\_overlord\_is\_religious\_head | vassal, kin | tributary | union | march | colony | lord |  |  |
| event\_vassalize\_type | vassal |  |  | tributary | union |  | colony |  | protectorate | puppet: protectorate; dominion: colony, self\_governing |

## Subjects with subjects

| Key | Value |
|---|---|
| `reach_multiplier` | 3 |
| `reach_per_own_subject` | 1 |
| `overlord_can_act_on_sub_subjects` | no |

## Crowns

> Personal unions in the game (SUBJ-126, SUBJ-127, D-SUBJ-30, REALM-272): when a ruler dies without a direct heir (people.death\_per\_year), no\_heir\_share of those deaths leave no heir at all; a claim lasts claim\_years.

| Key | Value |
|---|---|
| `no_heir_share` | 0.25 |
| `claim_years` | 20 |

## Playing as subject

> The player's side of the tie in the game (SUBJ-131 … SUBJ-139, D-SUBJ-31). Placeholders.

| Name | dimensions | levels | needs | peace voice share over | kind with land path | kind otherwise |
|---|---|---|---|---|---|---|
| cautious\_when | unrest\_risk, external\_threat\_exposure | high, very\_high |  |  |  |  |
| turn\_the\_tables |  |  | outgrown: more provinces than the overlord | 0.75 | vassal | tributary |

## Map

> How subjects are drawn on the map (subjects-design 10.3, SUBJ-093): at world zoom a subject is washed in its direct overlord's colour with a diagonal hatch this many map pixels wide in its own colour.

| Key | Value |
|---|---|
| `world_zoom_hatch_px` | 2 |
