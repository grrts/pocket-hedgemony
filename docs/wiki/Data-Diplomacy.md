# Diplomacy data

Every value in the game's diplomacy config, exactly as the game reads it. This page is made from `packages/rules/data/domain/diplomacy.json` each time the config changes, so it always matches the game. How these values are used is explained on [Diplomacy](Diplomacy).

Keys are written as in the config file. Shares are fractions (0.25 is 25 %), and values marked (provisional) are placeholders that may still change in balancing. Inventions are shown by id and name; see [Research data](Data-Research#inventions).

> Diplomacy context config. 'relations' is copied from country-relations/config/relation-rules.json (relation model, matrix, actions, durations); the rest from diplomacy/diplomacy-rules.json. Every number is a placeholder balancing knob owned by game design. Subject kinds: the engine reads relations.subject\_kinds only for labels; joining wars and own diplomacy follow the six kinds of subjects.json (X-8, D-DIPL-10).

| Key | Value |
|---|---|
| `schema_version` | 1.0 |
| `campaign_end` | 1939-08-31 |
| `oaths_broken_years` | 30 |
| `lands_taken_years` | 20 |

## Relations

| Key | Value |
|---|---|
| `default_stance` | neutral |
| `autonomy_levels` | very\_low, low, moderate, high, very\_high |
| `reference_date` | 1444-11-11 |

### Layers

| Name | types | rule |
|---|---|---|
| hierarchy | subject | A country has at most one direct overlord. Chains are allowed (a subject may have subjects); cycles are not. |
| state | at\_war, truce, alliance | At most one state relation per unordered pair. |
| stance | friendly, neutral, rival, hostile | At most one stance per perspective (A towards B). A mutual stance record fills both perspectives; a one-way record fills only source towards target. With no stance stored, the game uses the default stance, which is not a historical claim. |

### Implied stance

> Effective stance when none is stored for a perspective: at war reads as hostile, allies read as friendly, everything else falls back to default\_stance.

| Key | Value |
|---|---|
| `at_war` | hostile |
| `alliance` | friendly |

### Types

| Name | label | layer | direction | stored | definition | applies when | duration | establish actions | terminate actions | more |
|---|---|---|---|---|---|---|---|---|---|---|
| alliance | Alliance | state | mutual | yes | A formal, mutual commitment to support one another in war. | There is a treaty, sworn league or documented joint war effort binding both sides. Friendship, marriage or a shared enemy alone is not enough. | kind: open\_ended; default\_months: none; expires\_on\_end\_date: no | form\_alliance, peace\_term\_force\_alliance | break\_alliance, declare\_war, make\_subject, country\_destroyed | ai: (call\_to\_arms\_weight: 1; attack\_ally\_weight: -1); modifiers: alliance |
| friendly | Friendly | stance | mutual\_or\_one\_way | yes | Active cooperation or warm diplomatic relations without a binding war commitment. | Documented cooperation: a peace treaty kept in good faith, dynastic or political partnership, joint diplomacy, or protection without formal subjection. | kind: open\_ended; decay\_months: 240 | improve\_relations, royal\_marriage, gift, event\_outcome | insult, declare\_war, set\_rival, event\_outcome, decay | ai: (alliance\_candidate\_weight: 0.5); modifiers: friendly |
| neutral | Neutral | stance | mutual\_or\_one\_way | yes | No significant alignment or hostility. | Store it only when neutrality is itself a documented, meaningful fact (a declared neutrality, a deliberate abstention from a war both sides tried to draw the country into). Otherwise leave the pair empty and let the game apply the default stance. | kind: open\_ended | declare\_neutrality, decay | any\_stance\_change | ai: (none); modifiers: neutral |
| rival | Rival | stance | mutual\_or\_one\_way | yes | Competition for territory, power, a throne, influence or trade. | A documented contested object: a disputed province, crown, trade route, sphere or office. Neighbourhood alone never makes a rivalry. | kind: open\_ended; min\_months\_before\_change: 120 | set\_rival, event\_outcome, peace\_term\_claim\_left\_open | drop\_rival, country\_destroyed, contested\_object\_resolved | ai: (war\_target\_weight: 0.6; ally\_against\_weight: 0.5); modifiers: rival |
| hostile | Hostile | stance | mutual\_or\_one\_way | yes | Serious antagonism or an ongoing dispute that may lead to war: raiding, feuds, a revolt-in-waiting, a broken treaty. | Documented raids, open disputes, recent betrayal, or a subject openly working against its overlord. Stronger than rivalry; the two never coexist in one perspective. | kind: open\_ended; decay\_months: 120; decays\_to: rival | insult, border\_raid, break\_truce, event\_outcome, war\_ends\_without\_reconciliation | improve\_relations, peace\_with\_reconciliation, decay | ai: (war\_target\_weight: 1; border\_fort\_weight: 0.5); modifiers: hostile |
| at\_war | At War | state | mutual | yes | The two countries are actively fighting. | A declared war or campaign is in progress on the reference date, or a state of war continues with no peace or truce concluded. | kind: until\_peace; war\_exhaustion\_peace\_months: 60 | declare\_war, join\_war\_as\_ally, join\_war\_as\_subject, independence\_war, event\_outcome | make\_peace, white\_peace, country\_destroyed | ai: (none); modifiers: at\_war |
| subject | Subject | hierarchy | directed | yes | The source country is politically subordinate to the target and owes defined obligations (tribute, troops, homage, investiture). | A documented obligation exists: tribute actually owed, fief held, investiture received, estate within a composite crown. Influence, protection or cultural sway is not subjection. | kind: open\_ended | peace\_term\_vassalize, diplomatic\_vassalize, inheritance\_union, event\_outcome | independence\_war\_won, release\_subject, annex\_subject, overlord\_destroyed, event\_outcome | ai: (none); modifiers: subject; source role: subject; target role: overlord; kinds: subject\_kinds |
| overlord | Overlord | hierarchy | directed | no | The country that holds authority over a subject. Always derived by reading a subject record from the other end; never stored. | Exactly when a subject record names this country as target. |  |  |  | derived from: subject |
| truce | Truce | state | mutual | yes | A temporary agreement not to resume hostilities after a conflict. | A truce or peace treaty concluded after a conflict is in force on the reference date. Use the treaty's own term as expires\_on when one is recorded. | kind: fixed; default\_months: 60; historical\_term\_overrides\_default: yes | make\_peace, white\_peace, negotiate\_truce, event\_outcome | expires, break\_truce, form\_alliance, make\_subject | ai: (break\_truce\_weight: -1); modifiers: truce |

### Subject kinds

| Name | label | obligations | can conduct own diplomacy | joins overlord wars | note |
|---|---|---|---|---|---|
| vassal | Vassal | military\_service, homage | yes | defensive |  |
| tributary | Tributary | tribute | yes | never |  |
| personal\_union | Junior partner in a personal union | shared\_ruler | no | always |  |
| estate | Constituent estate of a composite realm | taxes, military\_service | no | always | Kingdoms, principalities, magnate blocs or leagues inside a larger crown that the catalogue records as separate actors. |
| appanage | Appanage or princely apanage | homage, military\_service | no | always |  |
| fief | Fief held from a sovereign suzerain | homage, census\_or\_investiture | yes | never | For example a kingdom held as a papal fief: real legal obligation, very high autonomy. |
| colony | Overseas or colonial dependency | governor\_appointed, trade\_monopoly | no | always |  |
| frontier\_commandery | Frontier commandery or guard under imperial titles | tribute\_missions, border\_service | yes | never |  |

### Compatibility

> Pair-level rules, read regardless of direction. Pairs not listed are allowed. 'forbidden' is a validation error; 'redundant' is a warning (store only the stronger relation); 'allowed\_with\_note' must carry a note in the record.

#### Rules

| Name | a | b | result | note |
|---|---|---|---|---|
| 1 | alliance | at\_war | forbidden |  |
| 2 | alliance | truce | forbidden |  |
| 3 | at\_war | truce | forbidden |  |
| 4 | subject | at\_war | forbidden | A subject that fights its overlord has left the hierarchy: record the independence war, not both. |
| 5 | subject | truce | forbidden |  |
| 6 | subject | alliance | forbidden | The subject's obligations already cover what an alliance would. |
| 7 | subject | neutral | forbidden |  |
| 8 | alliance | hostile | forbidden |  |
| 9 | alliance | neutral | forbidden |  |
| 10 | alliance | friendly | redundant | Alliance already implies a friendly stance. |
| 11 | alliance | rival | allowed\_with\_note | Allies may compete over a contested object (for example a throne or a frontier). |
| 12 | at\_war | friendly | forbidden |  |
| 13 | at\_war | neutral | forbidden |  |
| 14 | subject | friendly | redundant | A loyal subject is the default; store friendly only if it says more than loyalty. |
| 15 | subject | hostile | allowed\_with\_note | A disloyal subject; feeds the revolt risk. |
| 16 | subject | rival | allowed\_with\_note | A subject competing with its overlord for power. |

### Precedence

> When gameplay creates a relation that is incompatible with an existing one, the newer relation wins and ends the older one, except where an action is blocked by 'requires'. When two stored historical records conflict, validation fails: precedence never silently fixes data.

| Key | Value |
|---|---|
| `order` | at\_war, truce, subject, alliance, hostile, rival, friendly, neutral |

### Actions

| Name | requires | ends | sets stance if missing | note | actor | creates | sets stance | stance after | penalty | more |
|---|---|---|---|---|---|---|---|---|---|---|
| declare\_war | no\_relation: alliance, truce; not\_subject\_of\_target: yes | friendly, neutral | hostile | Breaking an alliance or truce first is a separate action with its own cost. |  |  |  |  |  |  |
| independence\_war |  | subject |  |  | subject | at\_war | hostile |  |  | on overlord victory: restore\_subject |
| make\_peace |  | at\_war |  |  |  | truce |  | keep\_or\_hostile |  | truce months from: truce.duration.default\_months; may create: subject |
| white\_peace |  | at\_war |  |  |  | truce |  | rival\_if\_hostile |  |  |
| extend\_truce | relation: truce |  |  | Prolongs an existing truce; history did this repeatedly (England-France 1444-49). |  |  |  |  |  | sets: expires\_on |
| break\_truce |  | truce |  |  |  |  | hostile |  | truce\_breaking |  |
| form\_alliance | stance\_not: hostile; no\_relation: at\_war; not\_subject\_pair: yes | truce, neutral |  |  |  | alliance |  |  |  |  |
| break\_alliance |  | alliance |  |  |  |  |  |  | alliance\_breaking |  |
| make\_subject |  | alliance, truce, at\_war, neutral |  |  |  | subject |  |  |  |  |
| release\_subject |  | subject |  |  |  |  | friendly |  |  |  |
| set\_rival | contested\_object: yes | friendly, neutral |  |  |  | rival |  |  |  |  |
| insult |  | friendly |  |  |  | hostile |  |  |  |  |
| improve\_relations |  |  |  |  |  |  |  |  |  | steps: hostile, rival, neutral, friendly |
| truce\_expires |  | truce |  |  |  |  |  |  |  |  |
| country\_destroyed |  | all |  |  |  |  |  |  |  |  |

### Fact types

> Diplomatic facts are optional context attached to a pair. They are not relations, never block or imply a relation type, and feed modifiers only.

| Name | direction | source role | target role | note |
|---|---|---|---|---|
| royal\_marriage | mutual |  |  |  |
| dynastic\_claim | directed | claimant | claimed |  |
| territorial\_claim | directed | claimant | holder |  |
| trade\_agreement | mutual\_or\_one\_way |  |  |  |
| secondary\_tribute | directed | payer | receiver | Tribute paid to a power other than the single direct overlord (dual tributaries), or protection money. |
| shared\_ruler | mutual |  |  | Same ruler, no subordination recorded (or subordination recorded elsewhere). |
| membership | directed | member | institution |  |
| religious\_authority | directed | follower | authority |  |

### Confidence levels

| Key | Value |
|---|---|
| `high` | Stated in standard scholarship; dates and parties secure. |
| `medium` | Supported by scholarship, but the exact status, date or classification is debated or simplified for the game. |
| `low` | Plausible and attested, but thinly or indirectly; listed in the uncertainty report. |

### Origin values

| Key | Value |
|---|---|
| `historical_start` | Present at the start date from the historical dataset. Mutable in play unless locked. |
| `gameplay` | Created during play. Never written back to the historical dataset. |

### Modifiers

| Name | border raid chance per month | trade access |
|---|---|---|
| hostile | 0.02 |  |
| at\_war |  | -1 |

### Proposed fact types

#### Protection pledge

| Key | Value |
|---|---|
| `direction` | directed |
| `source_role` | protector |
| `target_role` | protected |
| `note` | Proposed by diplomacy 6.6 (OQ-DIPL-7). |

## Envoys

| Key | Value |
|---|---|
| `source` | official |
| `source_without_officials` | lord |
| `lord_loyalty_step_lost_if_mission_months_over` | 12 |
| `days_per_crossing_unit` (provisional) | 2 |
| `months_at_court` | 1 |
| `instant_if_both_know` | [T14 telegraphy](Data-Research#inventions) |
| `instant_excludes` | arrange\_marriage, make\_resident |
| `passage_denied_blocks_months` (provisional) | 24 |

### Seats

| Key | Value |
|---|---|
| `base` | 1 |
| `inventions_never_lost` | yes |

#### Extra if provinces over

| Key | Value |
|---|---|
| `provinces` | 10 |
| `seats` | 1 |

#### Inventions

| Key | Value |
|---|---|
| `G5` | 1 |
| `G8` | 1 |

### Official type bonus

| Name | actions | reason | only if | gift multiplier |
|---|---|---|---|---|
| judge | peace\_offer, demand, swear\_peace | 10 |  |  |
| customs\_officer | trade\_pact, ask\_passage | 10 |  |  |
| chaplain | \* | 10 | same\_faith |  |
| steward | send\_gift |  |  | 1.25 |
| tax\_collector | send\_gift |  |  | 1.25 |
| marshal | propose\_alliance, call\_to\_arms | 10 |  |  |
| warden | propose\_alliance, call\_to\_arms | 10 |  |  |
| muster\_master | propose\_alliance, call\_to\_arms | 10 |  |  |
| schoolmaster | arrange\_marriage, court\_lord | 10 |  |  |
| master\_of\_works | none | 0 |  |  |

### Years served bonus

| Key | Value |
|---|---|
| `at_years` | 10 |
| `reason` | 5 |

### Resident years bonus

| Key | Value |
|---|---|
| `at_years` | 5 |
| `reason` | 5 |

### Resident

| Key | Value |
|---|---|
| `requires_invention` | [G8 Resident ambassadors](Data-Research#inventions) |
| `reveals` | soldiers, treasury\_rounded\_100, lord\_loyalty |
| `war_warning_months` | 1 |

### Held

| Key | Value |
|---|---|
| `on_war_with_host` | yes |
| `peace_envoy_never_held` | yes |
| `refused_demand_by_hostile_chance` | 0.1 |

## Ledger

| Key | Value |
|---|---|
| `max_entries_per_pair` | 12 |
| `fade` | linear\_yearly |
| `merged_entry_name` | Old matters |
| `standing_limit` (provisional) | 200 |
| `resident_envoy_season_months` | 3 |

### Stance lines

| Key | Value |
|---|---|
| `alliance` | 50 |
| `friendly` | 30 |
| `neutral` | 0 |
| `rival` | -30 |
| `hostile` | -75 |
| `at_war` | -100 |
| `truce` | -10 |

### Ties

| Name | weight | max | lasts | name | weight per gold | fade years | weight per season | fade years after | owner |
|---|---|---|---|---|---|---|---|---|---|
| married\_houses | 15 | 30 | while\_marriage | Married houses |  |  |  |  |  |
| gift |  | 30 |  | Gift | 0.2 | 10 |  |  |  |
| courtesy\_visit | 15 |  |  | Courtesy visit |  | 5 |  |  |  |
| resident\_envoy |  | 30 | while\_resident | Resident envoy |  |  | 5 | 5 |  |
| fought\_side\_by\_side | 15 |  |  | Fought side by side |  | 20 |  |  |  |
| answered\_our\_call | 20 |  |  | Answered our call |  | 20 |  |  |  |
| share\_a\_rival | 15 |  | while\_true | Share a rival |  |  |  |  |  |
| same\_faith | 10 |  | while\_true | Same faith |  |  |  |  | religion |
| same\_culture\_group | 5 |  | while\_true | Same culture group |  |  |  |  | culture |
| trade\_pact | 10 |  | while\_true | Trade pact |  |  |  |  |  |
| pledged\_to\_protect\_us | 15 |  | while\_true | Pledged to protect us |  |  |  |  |  |
| freed\_us | 40 |  |  | Freed us |  | 30 |  |  |  |
| backed\_our\_revolution (provisional) | 25 |  |  | Backed our revolution |  | 30 |  |  |  |

### Wrongs

| Name | weight per province | fade years | name | weight | names | lasts | weight range | owner | weight per notoriety |
|---|---|---|---|---|---|---|---|---|---|
| took\_our\_land | -10 | 20 | Took our land |  |  |  |  |  |  |
| broke\_truce\_or\_alliance |  | 30 | Broke a truce with us / broke our alliance | -40 | truce: Broke a truce with us; alliance: Broke our alliance |  |  |  |  |
| abandoned\_us |  | 30 | Abandoned us | -30 |  |  |  |  |  |
| insulted\_us |  | 10 | Insulted us | -20 |  |  |  |  |  |
| threatened\_us |  | 10 | Threatened us | -15 |  |  |  |  |  |
| holds\_claim\_on\_us |  |  | Holds a claim on our land or throne | -20 |  | while\_true |  |  |  |
| courted\_our\_lord |  | 10 | Courted our lord | -25 |  |  |  |  |  |
| embargo\_against\_us |  |  | Embargo against us | -15 |  | while\_true |  |  |  |
| hostile\_faith |  |  | Different faith |  |  | while\_true | -25, -10 | religion |  |
| notorious\_deed |  | 30 | Notorious deed |  |  |  |  |  | -10 |
| stirred\_revolt\_in\_our\_land |  | 20 | Stirred revolt in our land | -50 |  |  |  |  |  |
| grabbed\_land\_near\_us (provisional) | -5 | 20 | Grabbed land near us |  |  |  |  |  |  |

### Standing words

| Name | min | word |
|---|---|---|
| 1 | 100 | close |
| 2 | 30 | warm |
| 3 | -29 | cool |
| 4 | -99 | cold |
| 5 | -200 | bitter |

## Reasons

| Key | Value |
|---|---|
| `standing_divisor` | 4 |
| `per_oath_broken` | -10 |
| `relies_on_word` | propose\_alliance, swear\_peace, arrange\_marriage, trade\_pact, offer\_overlordship |
| `share_an_enemy` | 25 |
| `frontier_threat_per_province` | -5 |

### Strength

| Key | Value |
|---|---|
| `allies_counted_at` | 0.5 |
| `binding_asks` | propose\_alliance, pledge\_protection, offer\_overlordship, ask\_protection |
| `you_are_stronger_per_multiple` | 10 |
| `you_are_stronger_max` | 40 |
| `we_are_stronger_per_multiple` | -10 |
| `we_are_stronger_max` | -40 |
| `cannot_beat_you_per_multiple_beyond_1` | 15 |
| `cannot_beat_you_max` | 60 |
| `strong_friends_factor` | -0.5 |
| `already_at_war_new_commitment` | -30 |

### Distance

| Key | Value |
|---|---|
| `no_shared_border_or_neighbour` | -15 |

#### Envoy days over

| Key | Value |
|---|---|
| `days` | 60 |
| `reason` | -15 |

### Allies beyond free

| Key | Value |
|---|---|
| `free` | 2 |
| `per_extra` | -10 |

### Ruler traits

| Key | Value |
|---|---|
| `pious_same_faith` | 10 |
| `warlike_vs_swear_peace` | -10 |
| `greedy_with_gift` | 10 |

## Actions

### Propose alliance

| Key | Value |
|---|---|
| `envoy` | yes |
| `base` | -40 |
| `relations_action` | form\_alliance |

### Call to arms

| Key | Value |
|---|---|
| `envoy` | no |
| `aim_is_our_concern` | 30 |
| `enemy_stronger_per_multiple` | -10 |
| `enemy_stronger_max` | -40 |
| `separate_peace_when_peace_voices_over` | 0.5 |

#### Defensive

| Key | Value |
|---|---|
| `base` | -20 |
| `refusal.ends` | alliance |
| `refusal.oath_broken` | yes |
| `refusal.wrong` | abandoned\_us |

#### Offensive

| Key | Value |
|---|---|
| `base` | -50 |
| `refusal.ends` | none |

### Break alliance

| Key | Value |
|---|---|
| `envoy` | no |
| `relations_action` | break\_alliance |
| `oath_broken` | yes |
| `wrong` | broke\_truce\_or\_alliance |

### Arrange marriage

| Key | Value |
|---|---|
| `envoy` | yes |
| `base` | -15 |
| `their_house_greater` | 10 |
| `per_existing_marriage` | -10 |
| `claim_chance_per_heirless_death` | 0.1 |

### Demand

| Key | Value |
|---|---|
| `envoy` | yes |
| `base` | -60 |
| `heartland_province` | -30 |
| `wrong_to_target` | threatened\_us |

#### Kinds

| Name | grants aim |
|---|---|
| hand\_over\_province | take\_land |
| pay\_tribute | tribute |
| recognise\_pretender | seat\_pretender |
| release\_subject | break\_subject |
| tolerate\_faith | defend\_faith |
| apologise\_and\_pay | punish |
| expel\_envoy\_or\_cut\_alliance | punish |

#### On refusal

| Key | Value |
|---|---|
| `aim_years` | 5 |
| `provoked_by_target` | yes |
| `our_offensive_call_bonus` | 20 |
| `lords_not_warlike_waver` | no |

### Ask passage

| Key | Value |
|---|---|
| `envoy` | yes |
| `base` | -10 |
| `months` | 24 |
| `revocable` | yes |
| `marching_on_our_friend` | -40 |
| `marching_on_our_enemy` | 20 |
| `requires_invention` | [G8 Resident ambassadors](Data-Research#inventions) |
| `before_invention` | closed\_except\_allies\_and\_subjects |

#### Entering without

| Key | Value |
|---|---|
| `grants_aim_to_owner` | punish |

### Trade pact

| Key | Value |
|---|---|
| `envoy` | yes |
| `base` | -10 |
| `relations_fact` | trade\_agreement |
| `tolls_waived` | yes |

### Embargo

| Key | Value |
|---|---|
| `envoy` | no |
| `closes_paths` | yes |

### Pledge protection

| Key | Value |
|---|---|
| `envoy` | no |
| `relations_fact` | protection\_pledge |
| `refusal_is_oath_broken` | yes |

### Swear peace

| Key | Value |
|---|---|
| `envoy` | yes |
| `base` | -20 |
| `truce_months` | 120 |
| `we_fear_you_per_multiple` | 10 |
| `we_want_your_land` | -30 |

### Offer overlordship

| Key | Value |
|---|---|
| `envoy` | yes |
| `base` | -80 |
| `need_protector_per_threat` | 20 |
| `already_pledged` | 20 |
| `proud_per_castle_beyond_2` | -10 |
| `owner` | subject\_management |

### Ask protection

| Key | Value |
|---|---|
| `envoy` | yes |
| `base` | -10 |
| `owner` | subject\_management |

### Court lord

| Key | Value |
|---|---|
| `envoy` | yes |
| `requires_lord_loyalty` | wavering, disloyal |
| `loyalty_steps_per_season` | 1 |
| `defect_after_months` | 12 |
| `defect_needs_border` | yes |
| `discovery_chance_per_season` | 0.25 |

### Send gift

| Key | Value |
|---|---|
| `envoy` | yes |

### Courtesy visit

| Key | Value |
|---|---|
| `envoy` | yes |

### Make resident

| Key | Value |
|---|---|
| `envoy` | yes |
| `requires_invention` | [G8 Resident ambassadors](Data-Research#inventions) |

### Insult

| Key | Value |
|---|---|
| `envoy` | no |
| `relations_action` | insult |
| `grants_target_aim` | punish |

### Declare rival

| Key | Value |
|---|---|
| `envoy` | no |
| `relations_action` | set\_rival |
| `requires_contested_object` | yes |

### Fund rebels

| Key | Value |
|---|---|
| `envoy` | yes |
| `secret` | yes |
| `target` | a revolution card in the target realm |
| `needs_revolution_signs` | 1 |
| `gold_share_of_target_yearly_income` (provisional) | 0.01 |
| `flag` | revolution\_funded |
| `caught_chance_per_month` (provisional) | 0.03 |

#### On caught

| Key | Value |
|---|---|
| `envoy` | held |
| `wrong` | stirred\_revolt\_in\_our\_land |
| `grants_target_aim` | punish |
| `aim_years` | 5 |

#### If revolution wins

| Key | Value |
|---|---|
| `tie` | backed\_our\_revolution |
| `unless_regime_hostile_to_funder_form` | yes |

## War aims

| Key | Value |
|---|---|
| `held_province_years` | 50 |
| `refused_demand_years` | 5 |
| `punish_years` | 5 |
| `tribute_by_strength_multiple` | 3 |
| `no_aim_wrong_to_neighbours` | threatened\_us |
| `regency_allows` | defensive, raid |

## Truce

| Key | Value |
|---|---|
| `base_months` | 60 |
| `extra_months_if_land_or_subject` | 60 |
| `white_peace_months` | 60 |

## Leagues

| Key | Value |
|---|---|
| `check` | yearly |
| `base` | -30 |
| `standing_divisor` | -4 |
| `took_our_land_per_province` | 10 |
| `lands_taken_per_province` | 3 |
| `per_member` | 5 |
| `same_faith` | -10 |
| `min_members` | 2 |
| `refusal_leaves_league` | yes |
| `dissolve_below_share_of_threshold` | 0.5 |

### Threshold by era

| Key | Value |
|---|---|
| `I` | 8 |
| `II` | 8 |
| `III` | 8 |
| `IV` | 6 |
| `V` | 6 |
| `VI` | 4 |
| `VII` | 4 |

### Could crush us per multiple

| Key | Value |
|---|---|
| `balancer` | 10 |
| `bandwagoner` | -10 |

## Eras

| Name | unlocks | or event | ties | envoy instant invention | mobilisation pact auto answers defensive call | mobilisation pact delivered as | mobilisation event | pact offensive call bonus |
|---|---|---|---|---|---|---|---|---|
| III | many\_sided\_peace | peace\_of\_westphalia |  |  |  |  |  |  |
| IV |  |  | married\_houses: (weight: 10) |  |  |  |  |  |
| V |  |  |  | [T14 telegraphy](Data-Research#inventions) |  |  |  |  |
| VI | mobilisation\_pact |  |  |  | yes | event | Our pact partner is attacked: we mobilise | 10 |
| VII |  |  | gift: (weight\_per\_gold: 0.1) |  |  |  |  |  |

## Ai

| Key | Value |
|---|---|
| `horizon` | neighbours, neighbours\_of\_neighbours, relation\_or\_fact\_holders, enemies\_of\_rivals |
| `candidates_per_free_seat` | 5 |
| `gift_first_if_total_at_least` | -20 |
| `demand_before_war` | yes |
| `estimates_counts_with_player_limits` | yes |
| `notoriety_per_reason` | 5 |
| `notoriety_restraint` (provisional) | 50 |

### Posture

| Name | alliance with stronger | ask protection | league vs strong per multiple | join war on stronger side | defensive call vs stronger | own view per oath broken | courts lords | funds rebels if grievances at least | propose alliance | more |
|---|---|---|---|---|---|---|---|---|---|---|
| mixed |  |  |  |  |  |  |  |  |  |  |
| bandwagoner | 20 | 20 | -10 |  |  |  |  |  |  |  |
| opportunist |  |  |  | 20 | -20 | -5 | yes | 2 |  |  |
| isolationist |  |  |  |  |  |  |  |  | -30 | call to arms: -30; swear peace: 20; trade pact: 20; ask passage: -20 |
| balancer |  |  | 10 |  |  |  |  |  |  | alliance vs strongest neighbour: 20 |
| client\_seeker |  |  |  |  |  |  |  |  |  | offer overlordship from stronger warm: 30; pledge from stronger warm: 30; asks protection when threatened: yes |
| hegemon\_seeker | -20 |  |  |  |  |  |  | 2 |  | makes demands: yes; offers pledges and overlordship: yes |

### Negotiation

| Key | Value |
|---|---|
| `very_high` | 15 |
| `high` | 10 |
| `moderate` | 0 |
| `low` | -10 |
| `very_low` | -20 |
| `unknown` | 0 |
| `very_high_gift_multiplier` | 1.25 |

## Event tree mapping

| Key | Value |
|---|---|
| `new_effects` | war\_aim, league, pretender |

### Opinion

| Key | Value |
|---|---|
| `becomes` | event\_tie\_or\_wrong |
| `default_fade_years` | 10 |

### Trust

| Key | Value |
|---|---|
| `derived` | 100 - 10 \* oaths\_broken |
| `write` | adds\_oath\_broken |

### Notoriety

| Key | Value |
|---|---|
| `derived` | 5 \* lands\_taken + notorious\_deeds |
| `cap` | 100 |
| `write` | notorious\_deed\_with\_all\_known |

### Relation

| Key | Value |
|---|---|
| `alliance` | form\_alliance |
| `truce` | swear\_peace |
| `rivalry` | set\_rival |
| `war` | declare\_war |
| `trade_pact` | trade\_pact |
| `embargo` | embargo |
| `guarantee` | pledge\_protection |
| `non_aggression` | swear\_peace |
| `subject` | subject\_management |
| `overlord` | subject\_management |
| `personal_union` | subject\_management |

## Answers

> No preview of the count: the asker learns yes or no, with the full reasons list, a month after the answer is given. Before sending, an ask the reasons decide shows one word (DIPL-229): Likely when the count as it stands now is at least \`hint.likely\_from\`, Unlikely when it is at most \`hint.unlikely\_to\`, else Unsure. Placeholders for balance.

| Key | Value |
|---|---|
| `delay_months` | 1 |
| `preview_before_sending` | no |

### Hint

| Key | Value |
|---|---|
| `likely_from` | 15 |
| `unlikely_to` | -15 |

## Eras by year

| Name | era | from |
|---|---|---|
| 1 | I | 1378 |
| 2 | II | 1500 |
| 3 | III | 1600 |
| 4 | IV | 1700 |
| 5 | V | 1800 |
| 6 | VI | 1870 |
| 7 | VII | 1914 |
