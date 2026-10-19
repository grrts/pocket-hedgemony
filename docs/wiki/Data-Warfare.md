# Warfare data

Every value in the game's warfare config, exactly as the game reads it. This page is made from `packages/rules/data/domain/warfare.json` each time the config changes, so it always matches the game. How these values are used is explained on [Warfare](Warfare).

Keys are written as in the config file. Shares are fractions (0.25 is 25 %), and values marked (provisional) are placeholders that may still change in balancing. Inventions are shown by id and name; see [Research data](Data-Research#inventions).

> Warfare (domain/warfare/spec.md). One warfare config file (WAR-199). Every value is a placeholder from warfare-design v5, warfare-eras and warfare-styles (spec §10); key names follow spec §10. Era VIII and the part of era VII after 31 August 1939 are out of scope.
>
> `decisions`: D-WAR-1..21 (spec §13). Standing regiments break at 30 % (D-WAR-15), the Shore sector costs -20 % across a river (D-WAR-5), drill runs to 24 (D-WAR-9).

| Key | Value |
|---|---|
| `battle_step_choices` | change standing orders, retreat, switch battle |
| `drill_max` (provisional) | 24 |
| `scars_max` | 5 |
| `scar_fade_years` | 5 |
| `days_per_week` | 7 |
| `days_per_month` | 30 |
| `arms_rust` | 0.02 |
| `powder_damp` | 0.05 |
| `victories_window_years` | 20 |
| `levy_gather_days` | 14 |
| `reserve_sizes` | 1, 2, 3 |
| `forage_limit_rations` | 2 |
| `season_months` | 3 |
| `rumour_error` | 0.333333 |
| `levels` | Raw, Drilled, Seasoned, Veteran, Elite |
| `w10_ammo` | 1 |
| `hunger_hits` | -0.2 |
| `assault_losses` | 1.25 |
| `capture_chance` | 0.1 |
| `might_victories_per_point` | 2 |
| `second_trait_victories` | 10 |
| `second_style_victories` | 10 |
| `captain_learns_style_wins` | 3 |
| `max_captains` | 2 |
| `prisoner_enlist_level` | 1 |
| `relief_bonus` | 0.1 |
| `raid_war_months` | 12 |
| `style_learn_years` | 3 |

## Arms

| Name | label | strength | unit | needs | roles | unlock | foot | shoots | horse | more |
|---|---|---|---|---|---|---|---|---|---|---|
| levy foot | Levy infantry (spears, bows, farm tools) | 1 | man | none | Line | start | yes |  |  |  |
| armoured foot |  | 1.3 | man | arms: 1 | Line, Heavy | start | yes |  |  | next down: levy foot |
| archers |  | 1.1 | man | arms: 1 | Shot | start | yes | arrows |  |  |
| pikes |  | 1.2 | man | arms: 1 | Brace | [W6 Pike squares](Data-Research#inventions) | yes |  |  | spears: yes |
| hand gunners |  | 1.4 | man | arms: 1; powder: 1; powder\_per: battle | Shot | [W5 gunpowder\_infantry](Data-Research#inventions) | yes | hand guns |  |  |
| pike and shot |  | 1.6 | man | arms: 2; powder: 1; powder\_per: battle | Brace, Shot | [W7 Pike and shot](Data-Research#inventions) | yes | hand guns |  |  |
| musketeers | Musketeers (volley) | 2 | man | arms: 2; powder: 2; powder\_per: battle | Shot | [W9 Volley fire drill](Data-Research#inventions) | yes | hand guns |  |  |
| line infantry | Line infantry (flintlock) | 2.6 | man | arms: 2; powder: 2; powder\_per: battle | Line, Brace, Shot | [W11 Flintlock and bayonet](Data-Research#inventions) | yes | hand guns |  |  |
| riflemen |  | 3.5 | man | arms: 3; powder: 3; powder\_per: battle | Shot, Light | [W16 Rifled musket](Data-Research#inventions) | yes | rifles |  | strength with: (W17: 5) |
| light horse |  | 2 | man | horses: 100 | Shock, Light | start |  |  | yes | rider: yes |
| horse archers |  | 2.5 | man | horses: 100; arms: 1 | Shot, Light | [W1 Composite-bow horse archery](Data-Research#inventions) |  | arrows | yes | rider: yes; shock against broken: yes |
| knights and lancers |  | 3.5 | man | horses: 100; remounts: 50; arms: 2 | Shock, Heavy | [W2 Heavy armoured cavalry](Data-Research#inventions) |  |  | yes | spears: yes |
| camel riders |  | 2 | man | camels: 100 | Shock, Light | start |  |  | yes | rider: yes; start regions: desert, Sahel; no desert penalty: yes |
| war elephants |  | 6 | man | elephants: from studs | Shock, Heavy | start |  |  |  | start regions: South Asia, Southeast Asia; men per animal: 8; ground: (forest: -0.5; jungle: -0.5); panic: 0.1 |
| bombards |  | 5 | gun | crew: 20; horses: 8; oxen\_instead: yes; powder: 1; powder\_per: month firing | Guns | [W3 Bombards](Data-Research#inventions) |  |  |  | siege shot: 2; no mountains without road: yes |
| field guns |  | 25 | gun | crew: 15; horses: 6; powder: 2; powder\_per: battle | Guns | [W8 Field artillery](Data-Research#inventions) |  |  |  | siege shot: 1 |
| light field guns |  | 25 | gun | crew: 10; horses: 4; powder: 2; powder\_per: battle | Guns | [W13 Light field artillery](Data-Research#inventions) |  |  |  | no march penalty: yes |

## Later arms (provisional)

> Machine guns, tanks and aircraft follow the arms table; their strength and needs are provisional (D-WAR-17), and tanks and aircraft draw on the powder store (D-WAR-20).

| Name | strength | unit | needs | roles | unlock |
|---|---|---|---|---|---|
| machine guns | 30 | gun | crew: 6; powder: 4; powder\_per: battle | Brace, Shot | [W19 Machine gun](Data-Research#inventions) |
| tanks | 60 | tank | crew: 6; arms: 10; powder: 10; powder\_per: battle | Shock | [W21 Tanks](Data-Research#inventions) |
| aircraft | 40 | plane | crew: 4; arms: 10; powder: 10; powder\_per: battle | Air | [W22 Military aircraft](Data-Research#inventions) |

## Kinds (provisional)

| Name | break point | pay | counts toward cap | needs | min level | on walls |
|---|---|---|---|---|---|---|
| levy | 0.25 | by: treasury; multiplier: 1; free\_months: 3 | yes |  |  |  |
| retinue | 0.35 | by: lord; multiplier: 0 | no |  |  |  |
| hired company | 0.35 | by: treasury; multiplier: 3 | yes |  |  |  |
| standing regiment | 0.3 | by: treasury; multiplier: 1.5; all\_year: yes | yes | [W12 Standing regiments](Data-Research#inventions) | 2 |  |
| garrison | 0.4 | by: treasury; multiplier: 1 | above room |  |  | yes |
| rebel band | 0.2 | by: loot; multiplier: 0 | no |  |  |  |

## Battle

| Key | Value |
|---|---|
| `bells_per_day` | 6 |
| `max_days` | 3 |
| `max_sectors` | 7 |
| `max_sectors_sea` | 3 |
| `bell_order` | orders, shooting, charges, melee, breaking, depth and rotation |
| `locals_rough` | 0.1 |

## Hits per bell (provisional)

| Key | Value |
|---|---|
| `base` | 0.04 |
| `era_VI` | 0.06 |
| `era_VII` | 0.08 |

### By invention

| Name | needs | share |
|---|---|---|
| 1 | [W19 Machine gun](Data-Research#inventions) | 0.08 |
| 2 | [W17 Breech-loading rifle](Data-Research#inventions) | 0.06 |
| 3 | [W16 Rifled musket](Data-Research#inventions) | 0.05 |

## Skill growth

> WAR-158, D-WAR-13: the staff college is the academy of eras VI-VII.

| Name | III | IV | V | VI | VII | eras | min cunning | skill | max | every |
|---|---|---|---|---|---|---|---|---|---|---|
| academy | Might, Cunning | Might, Cunning | Might, Cunning | Might, Cunning, Logistics | Might, Cunning, Logistics |  |  |  |  |  |
| captain under |  |  |  |  |  | III, IV, V | 4 | Cunning |  |  |
| wargames |  |  |  |  |  | VI, VII |  | Cunning |  |  |
| peace command year |  |  |  |  |  | VI, VII |  | Logistics | 3 |  |
| victories |  |  |  |  |  | VI, VII |  | Might |  | 4 |

## Origins

| Key | Value |
|---|---|
| `the ruler or an heir` | his death or capture can start a succession crisis |
| `a lord` | he may refuse to serve under a lower-born commander |
| `a hired captain` | he leaves when unpaid, like his company |
| `risen from the ranks` | Proud lords waver when he commands them |
| `an academy graduate` | he starts with +1 Cunning or Logistics and no victories |
| `an exile` | his old ruler sees it as an insult |
| `a commissioned official` | he counts as an academy graduate: +1 Cunning or Logistics and no victories |

## Amounts (provisional)

| Key | Value |
|---|---|
| `wagon_gold` | 10 |
| `hired_pay_multiplier` | 2 |
| `season_months` | 3 |
| `fever_sickness` | 2 |
| `levy_gold_per_1000` | 20 |

### Ransom

| Key | Value |
|---|---|
| `commander` | 100 |
| `captain` | 25 |

## Company size

| Key | Value |
|---|---|
| `min` | 500 |
| `max` | 1000 |

## Obsolete

| Name | arm | by | what | keeps | field only | role | keeps role |
|---|---|---|---|---|---|---|---|
| 1 | armoured foot | [W5 gunpowder\_infantry](Data-Research#inventions) | Plate armour (Heavy role on foot) |  |  |  |  |
| 2 | knights and lancers | [W9 Volley fire drill](Data-Research#inventions) | Knights and gendarmes |  |  |  |  |
| 3 | pikes | [W11 Flintlock and bayonet](Data-Research#inventions) | Pikes |  |  |  |  |
| 4 | archers | [W9 Volley fire drill](Data-Research#inventions) | Bows and crossbows |  |  |  |  |
| 5 | horse archers | [W11 Flintlock and bayonet](Data-Research#inventions) | Horse archers | scouting, raiding |  |  |  |
| 6 | bombards | [W8 Field artillery](Data-Research#inventions) | Bombards in the field |  | yes |  |  |
| 7 | line infantry | [W17 Breech-loading rifle](Data-Research#inventions) | Close-order line infantry |  |  |  |  |
| 8 | light horse | [W19 Machine gun](Data-Research#inventions) | Cavalry as Shock |  |  | Shock | Light |
| 9 | knights and lancers | [W19 Machine gun](Data-Research#inventions) | Cavalry as Shock |  |  | Shock |  |
| 10 | camel riders | [W19 Machine gun](Data-Research#inventions) | Cavalry as Shock |  |  | Shock | Light |

## Break

| Key | Value |
|---|---|
| `homeland` | 0.05 |
| `hungry` | -0.1 |
| `pay_owed` | -0.05 |

## Levy

| Key | Value |
|---|---|
| `free_months` | 3 |
| `go_home_after` | 6 |
| `go_home_rate` | 0.05 |
| `w15_go_home_after` | 12 |

## Hired

| Key | Value |
|---|---|
| `no_fight_owed` | 1 |
| `loot_owed` | 2 |

## Troop cap (provisional)

| Key | Value |
|---|---|
| `with_official` | 0.02 |
| `muster_master` | 0.03 |
| `without` | 0.01 |
| `w12` | 0.005 |
| `w15` | 2 |
| `w18` | 0.01 |

## Over cap

| Key | Value |
|---|---|
| `pay` | 2 |
| `desertion` | 0.05 |

## Lords

| Key | Value |
|---|---|
| `loyal_days` | 21 |
| `wavering_days` | 42 |
| `wavering_stay_months` | 6 |
| `wavering_share` | 0.5 |
| `min_men` (provisional) | 100 |
| `retinue_horse_share` (provisional) | 0.2 |
| `retinue_horse_arm` (provisional) | knights and lancers |

## Free companies

| Name | group | people | regions |
|---|---|---|---|
| 1 | Swiss and German foot | Swiss Confederacy | Swiss Confederacy, the Empire |
| 2 | Italian condottieri | Italian states | Italy |
| 3 | Scottish and Irish gallowglass | Scottish Highland clans | Scotland, Ireland |
| 4 | Turkic and Afghan horse | Afghan | Central Asia, Afghanistan |
| 5 | Javanese and Japanese sword bands | Japanese clans | Java, Japan |

## Rations

| Key | Value |
|---|---|
| `soldier_campaign` | 2 |
| `horse` | 3 |
| `prisoner` | 1 |
| `winter_field` | 2.5 |
| `quarters` | 1 |

## Logistics

| Key | Value |
|---|---|
| `food_cut` | 0.05 |
| `sickness_cut` | 0.1 |
| `dig_speed` | 0.1 |

## Reserve

| Key | Value |
|---|---|
| `rot` | 0.05 |
| `rot_slow_logistics` | 3 |
| `rot_slow_factor` | 0.5 |

## Wagon

| Key | Value |
|---|---|
| `rations` | 1000 |
| `horses` | 2 |
| `w10_load` | 1.5 |

## Foraging rating

| Key | Value |
|---|---|
| `Rich` | 1 |
| `Fair` | 0.6 |
| `Poor` | 0.3 |
| `Almost none` | 0.1 |

## Hunger

| Key | Value |
|---|---|
| `desert` | 0.05 |
| `die` | 0.02 |
| `horses` | 0.1 |
| `strength` | -0.2 |
| `break` | -0.1 |
| `desert_order` | levy, hired company, retinue, garrison, rebel band, standing regiment |

## Sickness

| Key | Value |
|---|---|
| `Low` | 0.005 |
| `Medium` | 0.01 |
| `High` | 0.03 |
| `Heat` | 0.02 |
| `Cold` | 0.02 |
| `cold_only_in_winter` | yes |

## Forced march

| Key | Value |
|---|---|
| `sickness` | 2 |
| `levy_desertion_week` | 0.02 |
| `first_day_strength` | -0.1 |

## Requisition

| Key | Value |
|---|---|
| `hungry_below_months` | 1 |

## Scouting

| Key | Value |
|---|---|
| `base_range` | 1 |
| `riders_per_province` | 500 |
| `careful_range` | 2 |
| `w22_range` | 4 |

## Era scale (provisional)

| Name | bell | max days | room |
|---|---|---|---|
| I | 2 hours | 3 | 1 |
| II | 2 hours | 3 | 1 |
| III | 2 hours | 3 | 1 |
| IV | 2 hours | 3 | 1 |
| V | 2 hours | 3 | 1 |
| VI | half a day | 10 | 0.5 |
| VII | a day | 30 | 0.25 |

## Sectors

| Name | room | charge | horse | cover | hide | all | open grounds | rough grounds | attack across | more |
|---|---|---|---|---|---|---|---|---|---|---|
| Fields | 3000 | yes |  |  |  |  |  |  |  |  |
| Pasture | 3000 | yes | 0.1 |  |  |  |  |  |  |  |
| Burned | 3000 | yes |  |  |  |  |  |  |  |  |
| Woods | 1000 | no |  | 0.5 | yes |  |  |  |  |  |
| Marsh | 500 | no |  |  | yes | -0.25 |  |  |  |  |
| Waste | 1500 | by ground |  |  |  |  | drylands, desert | hills, mountains |  |  |
| Shore | 1000 | yes |  |  |  |  |  |  | -0.2 |  |
| Town | 1500 | no |  | 0.5 | yes |  |  |  |  | defender: 0.5; burns town: yes |
| Castle | garrison | no |  |  |  |  |  |  |  | walls: yes |

## Roles

| Name | chargers take | chargers deal | shot taken | first contact | open only | halves | reach | melee |
|---|---|---|---|---|---|---|---|---|
| brace | 2 | 0.5 | 1.5 |  |  |  |  |  |
| shock |  |  |  | 2 | yes |  |  |  |
| heavy |  |  |  |  |  | arrows, spears |  |  |
| guns |  |  |  |  |  |  | 1 | no |

## Level scars

| Key | Value |
|---|---|
| `Seasoned` | 1 |
| `Veteran` | 3 |
| `Elite` | 5 |

## Levels by era (provisional)

| Name | drill | hits | break |
|---|---|---|---|
| I | 2, 4, 8 | -0.1, 0, 0.1, 0.2, 0.3 | 0.05, 0.1, 0.15 |
| II | 3, 6, 12 | -0.1, 0, 0.1, 0.2, 0.3 | 0.05, 0.1, 0.15 |
| III | 4, 8, 12 | -0.15, 0, 0.15, 0.25, 0.35 | 0.05, 0.1, 0.15 |
| IV | 6, 12, 18 | -0.2, 0, 0.15, 0.3, 0.45 | 0.05, 0.1, 0.2 |
| V | 3, 6, 18 | -0.15, 0, 0.15, 0.25, 0.4 | 0.05, 0.1, 0.2 |
| VI | 6, 12, 24 | -0.25, 0, 0.2, 0.35, 0.5 | 0.1, 0.15, 0.2 |
| VII | 6, 12, 24 | -0.3, 0, 0.25, 0.45, 0.7 | 0.1, 0.15, 0.25 |

## Level abilities

| Name | fall back breaks | fall back | light step back | shift same bell | line half brace | free orders |
|---|---|---|---|---|---|---|
| 1 | yes |  |  |  |  |  |
| 2 |  | yes | yes |  |  |  |
| 3 |  | yes |  | yes |  |  |
| 4 |  | yes |  | yes | yes |  |
| 5 |  | yes |  | yes | yes | 1 |

## Era notes

| Name | knights and lancers | armoured foot | era | level | fights as | needs | shot |
|---|---|---|---|---|---|---|---|
| start\_level | era: I; level: 3 | era: I; level: 3 |  |  |  |  |  |
| levy\_cap |  |  | I | 3 |  |  |  |
| pike\_and\_shot\_below |  |  | II | 2 | levy foot |  |  |
| musketeers\_below |  |  | III | 2 |  | [W9 Volley fire drill](Data-Research#inventions) | 0.5 |
| linear\_shift\_level |  |  | IV | 2 |  |  |  |
| reservists |  |  | VI | 2 |  | [W18 Railway mobilization](Data-Research#inventions) |  |
| infiltrate |  |  | VII | 4 |  |  |  |

## Might by era

| Name | hits | break | scope | risk | risk if | drive |
|---|---|---|---|---|---|---|
| I | 0.08 | 0.03 | sector | 0.2 |  |  |
| II | 0.07 | 0.03 | sector | 0.2 |  |  |
| III | 0.05 | 0.02 | sector | 0.2 |  |  |
| IV | 0.05 | 0.02 | sector | 0.2 |  |  |
| V | 0.04 | 0.02 | sector | 0.1 |  |  |
| VI | 0.03 | 0.01 | army |  | camp taken |  |
| VII | 0.02 | 0.01 | army |  | camp taken | 0.1 |

## Cunning by era

| Name | orders | messenger from | captains order |
|---|---|---|---|
| I | 1, 1, 2, 2, 2, 2 | 1 |  |
| II | 1, 1, 2, 2, 3, 3 | 3 |  |
| III | 1, 1, 2, 2, 3, 3 |  |  |
| IV | 1, 1, 2, 2, 3, 3 |  |  |
| V | 1, 1, 2, 2, 3, 3 |  |  |
| VI | 2, 2, 2, 2, 3, 3 |  | yes |
| VII | 2, 2, 3, 3, 4, 4 |  | yes |

## Order inventions

| Key | Value |
|---|---|
| `W14` | 1 |
| `W23` | 1 |

## Logistics by era

| Name | ammo base | who | rotation | powder wagons | without ammo | fuel | depth per point |
|---|---|---|---|---|---|---|---|
| I | 4 | bows |  |  |  |  |  |
| II | 3 | Shot |  |  |  |  |  |
| III | 3 | Shot and guns | 1 |  |  |  |  |
| IV | 3 | Shot and guns | 1 |  |  |  |  |
| V | 2 | Shot and guns | 1 | yes |  |  |  |
| VI | 1 | all | 2 |  | 0.5 |  |  |
| VII | 1 | tanks and aircraft | 1 |  |  | yes | 0.1 |

## Role changing inventions

### W11

| Key | Value |
|---|---|
| `foot` | yes |
| `becomes` | Brace |

## Tired

| Key | Value |
|---|---|
| `after_bells` | 3 |
| `penalty` | 0.1 |

## Dug in

| Key | Value |
|---|---|
| `defender` | 0.5 |

## Orders

| Name | reserve enters | to neighbour | same bell level | from won | into | hits | enemy break | takes | frees prisoners | more |
|---|---|---|---|---|---|---|---|---|---|---|
| Commit reserve | yes |  |  |  |  |  |  |  |  |  |
| Shift |  | yes | 3 |  |  |  |  |  |  |  |
| Turn |  |  |  | yes | neighbour | 1.5 | -0.1 |  |  |  |
| Drive |  |  |  | yes | camp |  |  | wagons, food reserve | yes | spikes guns: yes; enemy army break: -0.1 |
| Fall back |  |  |  |  |  |  |  |  |  | no hits: yes; raw breaks: yes |
| Rally |  |  |  |  |  |  |  |  |  | fled return: 0.5 |
| Spring |  |  |  |  |  | 1.5 | -0.1 |  |  | ambush only: yes; reveals: yes |
| Rotate |  |  |  |  |  |  |  |  |  | swap tired: yes; beyond free: yes |

## Approaches

| Name | orders | needs | shines | struggles | reserve | min sectors | centre level | hidden | attacking as | line back bells |
|---|---|---|---|---|---|---|---|---|---|---|
| Breakthrough | Turn, Drive, Commit reserve | Shock; an open sector | Against Line and Shot in open fields | Against Brace; narrow, wooded fields |  |  |  |  |  |  |
| Steadfast | Commit reserve, Rotate, Rally | Plenty of Line; Logistics | Defending; against Breakthrough and Assault | Slow to win | 0.25 |  |  |  |  |  |
| Envelopment | Fall back, Turn | Level 2+ in the centre; at least 5 sectors | Against Breakthrough and Assault | Against Skirmish and Bombardment |  | 5 | 2 |  |  |  |
| Skirmish | Fall back, Drive | Light troops; open sectors with room | Against Line and Brace in open country | Against Shock; woods, marsh, towns | 0 |  |  |  |  |  |
| Ambush | Spring, Turn, Fall back | Cover sectors; Cunning higher than the enemy's | Broken, wooded or swampy fields | Open plains |  |  |  | 0.5 |  |  |
| Entrenchment | Rotate, Commit reserve, Rally | Shot or guns; being attacked | Dug-in sectors | Attacking (fights as Steadfast) |  |  |  |  | Steadfast |  |
| Bombardment | Shift, Commit reserve | Guns | Against Brace, Entrenchment, any army that stands still | Before W8; against Skirmish and Assault |  |  |  |  |  | 2 |
| Assault | Drive, Turn | Many men | Against Shot and Bombardment | Against Brace and Steadfast; losses x1.25 for both sides | 0 |  |  |  |  |  |

## Flee (provisional)

| Key | Value |
|---|---|
| `base` | 0.5 |
| `content_factor` | 0.3 |
| `hired` | 0.3 |
| `per_month_owed` | 0.1 |
| `rebel` | 0.5 |

## Traits

| Name | army break | strength | losses | wound mul | never retreats | death more | never ambushed careful | spot bonus | retreat | more |
|---|---|---|---|---|---|---|---|---|---|---|
| Steady | 0.05 |  |  |  |  |  |  |  |  |  |
| Reckless | -0.05 | 0.1 | 1.3 | 2 | yes | yes |  |  |  |  |
| Careful |  |  |  |  |  |  | yes | 1 | 3 to 2 |  |
| Beloved |  |  |  |  |  |  |  |  |  | desertion: 0.5; levy extra months: 3 |
| Cruel |  |  |  |  |  |  |  |  |  | sack: 1.5; burned homes faster: yes; terms refused: yes |
| Siege master |  |  |  |  |  |  |  |  |  | breach speed: 1.25 |
| Horse lord |  |  |  |  |  |  |  |  |  | shock: 0.1; turn shock hits: 2 |
| Old soldier |  |  |  |  |  |  |  |  |  | drill per month: 2 |
| Greedy |  |  |  |  |  |  |  |  |  | loot share: 0.1; takes bribes: yes |
| Ambitious |  |  |  |  |  |  |  |  |  | their man throne: yes |

## Wound chance

| Key | Value |
|---|---|
| `lost` | 0.1 |
| `won` | 0.05 |

## Death chance

| Key | Value |
|---|---|
| `loser` | 0.05 |

## Age

| Key | Value |
|---|---|
| `might_from` | 60 |
| `cunning_from` | 65 |
| `logistics_from` | 65 |
| `step_years` | 5 |

## Their man

| Key | Value |
|---|---|
| `victories` | 8 |
| `years` | 5 |

## Named commanders

### Jean de Dunois

| Key | Value |
|---|---|
| `country` | France |
| `might` | 3 |
| `cunning` | 4 |
| `logistics` | 2 |
| `styles` | Three battles |
| `traits` | Careful |
| `victories` | 6 |
| `defeats` | 1 |
| `wounds` | 1 |
| `age` | 47 |
| `origin` | a lord |

## After

| Key | Value |
|---|---|
| `wounded_return` | 0.666667 |
| `wounded_weeks` | 5 |
| `fled_return` | 0.5 |
| `fled_weeks` | 2 |
| `pursuit` | 0.25 |
| `camp_share` | 0.5 |

## Capture warfare

| Key | Value |
|---|---|
| `share` | 0.5 |
| `regions` | Mesoamerica, forest zone |

## Castles

| Name | invention | walls | shot per breach | mining months | room | scaling | bombards nearly useless |
|---|---|---|---|---|---|---|---|
| earthwork ring fort | [B4 Earthwork ring forts](Data-Research#inventions) | 0.5 | 30 | 2 | 1000 | yes |  |
| stone castle | [B1 Stone castles](Data-Research#inventions) | 1 | 20 | 4 | 2000 |  |  |
| bastion fort | [B5 bastion\_fortification](Data-Research#inventions) | 1 | 80 | 6 | 3000 |  | yes |
| star fort | [B6 Star forts](Data-Research#inventions) | 1.5 | 150 | 8 | 5000 |  | yes |

## Castle ground

| Key | Value |
|---|---|
| `hills` | 0.25 |
| `mountains` | 0.5 |

## Siege

| Key | Value |
|---|---|
| `close_ratio` | 3 |
| `b7_multiplier` | 1.5 |
| `repair_men` | 200 |
| `sally_share` | 0.333333 |
| `hunger_loss` | 0.1 |
| `hunger_break` | -0.1 |
| `fever_after_months` | 3 |
| `fever_mul` | 2 |
| `ration` | 1 |

## Castle supply

> Castles starve besiegers (Leroy, 19 Oct; WAR-263 to WAR-269): a held castle gathers the land's food behind its walls, so enemy foragers find less in its province (by castle step: earthwork, stone, bastion, star, concrete) and reach\_share of that in the provinces it reaches by road; armies besieging it eat more by its step.

| Key | Value |
|---|---|
| `provisional` | yes |
| `forage_cut_by_step` | 0.3, 0.45, 0.6, 0.7, 0.8 |
| `reach_share` | 0.5 |
| `besieger_eat_by_step` | 1.15, 1.25, 1.3, 1.35, 1.4 |

## Storm

| Key | Value |
|---|---|
| `room_per_breach` | 500 |
| `losses` | 1.5 |
| `scaling` | 2 |
| `bells` | 6 |

## Sack

| Key | Value |
|---|---|
| `plunder_tax_years` | 1 |
| `town_buildings` | 0.333333 |
| `townsfolk` | 0.1 |
| `cruel` | 1.5 |

## Ai honours

| Key | Value |
|---|---|
| `relief_days` | 10 |
| `food_months` | 1 |

## Bribe

| Key | Value |
|---|---|
| `pay_owed_months` | 2 |
| `greedy_outside_share` | 0.1 |

## Raid

| Key | Value |
|---|---|
| `riders_per_load` | 50 |
| `tiles_per_week` | 1 |

## Occupation

> WAR-224 (X-21): an occupier gets this share of an occupied province's tax and none of its trade; the rest is lost to the war.

| Key | Value |
|---|---|
| `hold_months` | 3 |
| `tax_share` (provisional) | 0.5 |

## Peace

> X-21 (Leroy, 18 Oct): long\_war\_years (WAR-223) and max\_ceded\_share (WAR-227) are provisional, for the balance model to tune.

| Key | Value |
|---|---|
| `capital_share` | 0.333333 |
| `warlike_ignore` | 0.25 |
| `half` | 0.5 |
| `three_quarters` | 0.75 |
| `tribute_years` | 20 |
| `open_roads_years` | 10 |
| `royal_grievances` | Conscription, Soldiers quartered, Burned homes, Hungry, Heavy taxes |
| `royal_grievances_needed` | 2 |
| `refuse_desertion` | 2 |
| `long_war_years` (provisional) | 2 |
| `max_ceded_share` (provisional) | 0.333333 |

## Settlement

> Peace settlement scoring (WAR-240..WAR-251, Leroy X-23). Each province has a demand cost; the war's outcome gives the winner a capacity in the same points; demands that fit are signed, the AI counters or refuses the rest. All values provisional.

| Key | Value |
|---|---|
| `gold_per_point` | 25 |

### Province cost

| Key | Value |
|---|---|
| `base` | 2 |
| `per_sqrt_thousand_people` | 0.5 |
| `per_wealth` | 1 |
| `castle` | 2 |
| `coastal` | 1 |
| `river` | 0.5 |
| `capital_multiplier` | 1.5 |
| `not_bordering_multiplier` | 1.25 |

### Capacity weights

| Key | Value |
|---|---|
| `land_held` | 0.5 |
| `capital_held` | 0.15 |
| `battles` | 0.15 |
| `armies` | 0.1 |
| `will_to_fight` | 0.25 |

### Surrender

| Key | Value |
|---|---|
| `peace_share` | 0.75 |
| `army_ratio` | 0.25 |
| `land_share` | 0.5 |

## Notifications

| Key | Value |
|---|---|
| `battle lost` | battle lost, with its one-line reason |
| `breach` | a breach |
| `terms offered` | terms offered |
| `peace voices passing half` | peace voices passing half |
| `pay owed` | pay owed |
| `army hungry` | an army hungry |

## War aims

| Key | Value |
|---|---|
| `Take land` | those provinces |
| `Seat a pretender` | their ruler replaced, realm your ally or subject |
| `Tribute` | yearly gold or grain |
| `Free a people` | a new country released |
| `Break a subject` | it becomes independent |
| `Defend the faith` | a faith tolerance charter there, or the province |
| `Punish` | gold and a humbled ruler |
| `Raid` | ends after 12 months, raids only |

## Inventions outside battle

| Name | castle | siege | road | wagon load | magazines | ammo | standing min level | split join days | orders | more |
|---|---|---|---|---|---|---|---|---|---|---|
| B1 | stone castle |  |  |  |  |  |  |  |  |  |
| B4 | earthwork ring fort |  |  |  |  |  |  |  |  |  |
| B5 | bastion fort |  |  |  |  |  |  |  |  |  |
| B6 | star fort |  |  |  |  |  |  |  |  |  |
| B7 |  | 1.5 |  |  |  |  |  |  |  |  |
| B2 |  |  | road |  |  |  |  |  |  |  |
| B9 |  |  | turnpike |  |  |  |  |  |  |  |
| W10 |  |  |  | 1.5 | yes | 1 |  |  |  |  |
| W12 |  |  |  |  |  |  | 2 |  |  |  |
| W14 |  |  |  |  |  |  |  | 1 | 1 |  |
| W15 |  |  |  |  |  |  |  |  |  | levy months: 12 |
| W18 |  |  |  |  |  |  |  |  |  | levy gather: days |
| W22 |  |  |  |  |  |  |  |  |  | scout range: 4; bomb: castles, wagons |

## Ai

| Key | Value |
|---|---|
| `raids_at` (provisional) | high |
| `war_chest_months` (provisional) | 6 |

### Kinds raised

| Key | Value |
|---|---|
| `Castile` | noble retinues, frontier light horse |
| `city republic` | hired companies |

### Peace at

| Key | Value |
|---|---|
| `low risk` | 0.333333 |
| `hegemon seeker` | forced |

### Standing orders (provisional)

| Name | order | retreat |
|---|---|---|
| low | wait | 1 to 1 |
| medium | attack | 3 to 2 |
| high | attack | 2 to 1 |

## Style region fallback

| Key | Value |
|---|---|
| `Sahel` | Furusiyya |
| `Andes` | Three battles |

## Adoption

| Key | Value |
|---|---|
| `officers` | 3 |
| `years` | 5 |
| `lessons` | 3 |
| `lessons_years` | 10 |
| `alliance_battles` | 3 |
| `first_battle_strength` | 0.5 |

## Styles

| era | name | from | needs | approach | rule | effects | stale | kind | more |
|---|---|---|---|---|---|---|---|---|---|
| I | Charge en haie | France, Burgundy, England, Castile, Aragon, Portugal, the Empire's princes, Hungary, Naples | [W2 Heavy armoured cavalry](Data-Research#inventions) | Breakthrough | Shock charges x2.5 instead of x2 | charge: 2.5 | (pikes in sector), ([W9 Volley fire drill](Data-Research#inventions)) | horse |  |
| I | Three battles | Most settled realms of Europe and the Mediterranean | none | Steadfast | The reserve adds +5 % break point to the whole army, not only while waiting | reserve\_army\_break: 0.05 | (W3 field), ([W8 Field artillery](Data-Research#inventions)) | foot |  |
| I | Herse | England, Wales | none | Entrenchment | Dug sectors also double the first bell's Shot | dug\_first\_bell\_shot: 2 | (W3 field), (W8 field) | foot |  |
| I | Gewalthaufen | Swiss Confederacy; Landsknechte of the Empire from 1490 | [W6 Pike squares](Data-Research#inventions) | Assault | Pikes advance in the first bell without their charge being reversed by Shock | pikes\_advance\_first\_bell: yes; pikes\_not\_reversed: yes | (W8 massed), (Shot behind field works) | foot |  |
| I | Wagenburg | Bohemia, Hungary, Poland-Lithuania | [W4 Wagon fort](Data-Research#inventions) | Entrenchment | Can dig in even on a day it marched; dug sectors block Turn and Drive | dig\_after\_march: yes; dug\_block\_turn\_drive: yes | ([W8 Field artillery](Data-Research#inventions)) | foot |  |
| I | Braccesca | Italian states | none | Breakthrough | Rotates Shock for free: a charged-out company is replaced by a fresh one each bell | free\_shock\_rotation: yes | ([W7 Pike and shot](Data-Research#inventions)) | horse |  |
| I | Sforzesca | Milan, Italian states | none | Steadfast | Commit reserve gives x1.5 hits in the bell it arrives | commit\_reserve\_hits: 1.5 | ([W9 Volley fire drill](Data-Research#inventions)) | foot |  |
| I | A la jineta | Castile, Granada, Portugal | none | Skirmish | Light horse can Drive into the camp from any won sector | light\_drive\_any\_won: yes | ([W11 Flintlock and bayonet](Data-Research#inventions)) | horse |  |
| I | Furusiyya | Mamluk Sultanate | [W1 Composite-bow horse archery](Data-Research#inventions) | Skirmish | Horse archers can also charge as Shock in the same battle | horse\_archers\_shock: yes | (W5 massed, W3 field) | horse |  |
| I | Feigned flight | Great Horde, Crimea, Kazan, Uzbeks, Timurids, Oirats, Kazakhs, Nogais | [W1 Composite-bow horse archery](Data-Research#inventions) | Skirmish | Shock that charges horse archers and misses is -25 % next bell | missed\_charge\_penalty: -0.25 | ([W11 Flintlock and bayonet](Data-Research#inventions)) | horse |  |
| I | Tabur cengi | Ottomans | [W3 Bombards](Data-Research#inventions) | Bombardment | The centre counts as dug in | centre\_dug: yes | ([W9 Volley fire drill](Data-Research#inventions)) | foot |  |
| I | Chezhan | Ming China, Joseon Korea | [W4 Wagon fort](Data-Research#inventions) | Entrenchment | Guns may stand in dug sectors and Shift with them | guns\_in\_dug: yes | ([W8 Field artillery](Data-Research#inventions)) | foot |  |
| I | Shenjiying | Ming China | [W5 gunpowder\_infantry](Data-Research#inventions) | Bombardment | Shot fire in rotation: no ammunition limit for the first 6 bells | unlimited\_ammo\_bells: 6 | ([W9 Volley fire drill](Data-Research#inventions)) | foot |  |
| I | Gyorin and Hōshi | Japanese clans | none | Breakthrough | Turn hits x2 instead of x1.5 | turn\_hits: 2 | (W5 massed) | horse |  |
| I | Kakuyoku | Japanese clans | none | Envelopment | End sectors get +25 % room | end\_room: 1.25 | ([W9 Volley fire drill](Data-Research#inventions)) | foot |  |
| I | Saka | Rajput states | none | Assault | When the army would break, it fights one more bell at x1.5 instead | last\_stand\_bells: 1; last\_stand\_hits: 1.5 | (W5 massed, [W3 Bombards](Data-Research#inventions)) | foot |  |
| I | Xochiyaoyotl | Aztec Triple Alliance, Tlaxcala and neighbours | none | Assault | Half of the enemy's killed are taken as prisoners instead | killed\_to\_prisoners: 0.5 | ([W5 gunpowder\_infantry](Data-Research#inventions), [W2 Heavy armoured cavalry](Data-Research#inventions)) | foot |  |
| II | Tercio | Spain, the Habsburg lands, Spanish Italy | [W7 Pike and shot](Data-Research#inventions) | Steadfast | Brace and Shot in one company; it can't Shift | brace\_and\_shot: yes; no\_shift: yes | ([W9 Volley fire drill](Data-Research#inventions), [W8 Field artillery](Data-Research#inventions)) | foot |  |
| II | Coronelía and field works | Spain | [W5 gunpowder\_infantry](Data-Research#inventions) | Entrenchment | Dug sectors double Shot | dug\_shot: 2 | (W8 massed) | foot |  |
| II | Caracole | Protestant German princes, Huguenot France | [W5 gunpowder\_infantry](Data-Research#inventions) | Skirmish | Horse acts as Shot as well as Shock | horse\_shoots: yes | (pikes in sector), ([W9 Volley fire drill](Data-Research#inventions)) | horse |  |
| II | Countermarch | Dutch Republic, England, Sweden, German Protestant states | [W9 Volley fire drill](Data-Research#inventions) | Steadfast | Shot keeps its first-bell bonus every bell | first\_bell\_bonus\_every\_bell: yes | (W8 massed) | foot |  |
| II | Szarża husarii | Poland-Lithuania | [W2 Heavy armoured cavalry](Data-Research#inventions) | Breakthrough | Charges not reversed by Brace in the first contact; can charge a second time without a bell out of contact | first\_contact\_not\_reversed: yes; second\_charge: yes | ([W11 Flintlock and bayonet](Data-Research#inventions)) | horse |  |
| II | Hussar raiding | Hungary, Croatia, the Military Frontier | none | Skirmish | Light can Drive into the camp from any sector | light\_drive\_any: yes | ([W11 Flintlock and bayonet](Data-Research#inventions)) | horse |  |
| II | Gulyay-gorod | Muscovy | [W4 Wagon fort](Data-Research#inventions) | Entrenchment | Dug sectors take half from Shot too | dug\_half\_shot: yes | ([W8 Field artillery](Data-Research#inventions)) | foot |  |
| II | Rumi dastur and tulughma | Mughals, Timurid princes | [W3 Bombards](Data-Research#inventions) | Envelopment | Centre counts as dug in; end-sector horse Turn also hits the enemy reserve | centre\_dug: yes; turn\_hits\_reserve: yes | ([W9 Volley fire drill](Data-Research#inventions)) | horse |  |
| II | Qizilbash charge | Safavid Persia | [W2 Heavy armoured cavalry](Data-Research#inventions) | Breakthrough | Charges into Raw companies x3 | charge\_raw: 3 | ([W5 gunpowder\_infantry](Data-Research#inventions), [W3 Bombards](Data-Research#inventions)) | horse |  |
| II | Sandan-uchi | Oda, Japanese clans | [W5 gunpowder\_infantry](Data-Research#inventions) | Entrenchment | Shot fires every bell at first-bell strength | first\_bell\_bonus\_every\_bell: yes | ([W8 Field artillery](Data-Research#inventions)) | foot |  |
| II | Yuanyang zhen | Ming China | none | Steadfast | Its companies take no extra hits from Turn and can't be Sprung on | turn\_proof: yes; spring\_proof: yes | (W9 massed) | foot |  |
| II | Hwacha battery | Joseon Korea | [W3 Bombards](Data-Research#inventions) | Bombardment | Guns hit every sector within 2 in the first bell | guns\_reach\_first\_bell: 2 | ([W8 Field artillery](Data-Research#inventions)) | foot |  |
| II | Skulking way of war | Haudenosaunee, peoples of the eastern woodlands | none | Ambush | Hidden companies can Spring in any sector with woods, not only next to cover | spring\_any\_woods: yes | ([W22 Military aircraft](Data-Research#inventions)) | foot |  |
| II | Malón | Mapuche | none | Skirmish | After a won battle, the pursuit takes horses and food reserve as well | pursuit\_takes\_horses\_food: yes | ([W17 Breech-loading rifle](Data-Research#inventions)) | horse |  |
| III | Swedish brigade | Sweden | [W8 Field artillery](Data-Research#inventions), [W9 Volley fire drill](Data-Research#inventions) | Breakthrough | Horse may charge in the same bell Shot fires; regimental guns stand with Line | charge\_with\_shot: yes; guns\_with\_line: yes | ([W11 Flintlock and bayonet](Data-Research#inventions)) | horse |  |
| III | Highland charge | Scottish Highland clans, Jacobites, Irish armies | none | Assault | The defender's Shot fires only once before contact | defender\_shot\_once: yes | ([W11 Flintlock and bayonet](Data-Research#inventions), level3+) | foot |  |
| III | Tabor | Zaporozhian Cossacks | [W4 Wagon fort](Data-Research#inventions) | Entrenchment | Can dig in on a day it marched | dig\_after\_march: yes | ([W8 Field artillery](Data-Research#inventions)) | foot |  |
| III | Ganimi kava | Marathas | none | Ambush | Hidden companies can also attack enemy armies marching through, outside battle (raiding their food reserve) | raid\_marching: yes | ([W13 Light field artillery](Data-Research#inventions)) | horse |  |
| III | Eight Banners | Manchu Later Jin, Qing | [W1 Composite-bow horse archery](Data-Research#inventions), [W2 Heavy armoured cavalry](Data-Research#inventions) | Breakthrough | Horse archers and Shock in the same company | horse\_archers\_shock: yes | ([W11 Flintlock and bayonet](Data-Research#inventions)) | horse |  |
| III | Attaque en règle | France | [B7 Siege parallels](Data-Research#inventions) | Bombardment | Sieges: breaches x1.5; storming losses halved | breaches: 1.5; storm\_losses: 0.5 | ([B6 Star forts](Data-Research#inventions), relief army) | siege |  |
| III | Kuruc raiding | Hungarian kuruc rebels | none | Skirmish | Light can fight dismounted as Shot | light\_dismount: yes | ([W13 Light field artillery](Data-Research#inventions)) | horse |  |
| IV | Schiefe Schlachtordnung | Prussia | [W11 Flintlock and bayonet](Data-Research#inventions) | Breakthrough | One end sector gets double room for one bell; Turn from it x2 | end\_room\_one\_bell: 2; turn\_from\_end: 2 | ([W14 Army divisions](Data-Research#inventions)) | foot |  |
| IV | Platoon fire | Britain, Dutch Republic | [W11 Flintlock and bayonet](Data-Research#inventions) | Steadfast | Line companies rotate for free | line\_free\_rotation: yes | ([W16 Rifled musket](Data-Research#inventions)) | foot |  |
| IV | Redoubt line | Russia under Peter I | [W11 Flintlock and bayonet](Data-Research#inventions), [B4 Earthwork ring forts](Data-Research#inventions) | Entrenchment | Dug sectors break Turn and Drive | dug\_block\_turn\_drive: yes | ([W13 Light field artillery](Data-Research#inventions)) | foot |  |
| IV | Nauka pobezhdat | Russia | [W11 Flintlock and bayonet](Data-Research#inventions) | Assault | Line charging with bayonets: first contact x1.5 | bayonet\_first\_contact: 1.5 | ([W16 Rifled musket](Data-Research#inventions)) | foot |  |
| IV | Grenzer | Habsburg Military Frontier | [W11 Flintlock and bayonet](Data-Research#inventions) | Skirmish | Light foot in rough sectors: enemy Shot against them halved | light\_rough\_shot\_taken: 0.5 | ([W16 Rifled musket](Data-Research#inventions)) | foot |  |
| IV | Zamburak | Durrani Afghanistan, Persia under Nader Shah | [W5 gunpowder\_infantry](Data-Research#inventions) | Skirmish | Light can carry guns: they Shift and shoot like Guns | light\_guns: yes | ([W13 Light field artillery](Data-Research#inventions)) | horse |  |
| IV | Mysorean rocket corps | Mysore | [W8 Field artillery](Data-Research#inventions) | Bombardment | Guns hit the enemy camp from the first bell | guns\_hit\_camp: yes | (W13 massed) | foot |  |
| IV | Asante war formation | Asante | [W5 gunpowder\_infantry](Data-Research#inventions) | Envelopment | End sectors move through woods without losing a bell | ends\_through\_woods: yes | ([W17 Breech-loading rifle](Data-Research#inventions)) | foot |  |
| IV | Nizam-ı Cedid | Ottomans | [W11 Flintlock and bayonet](Data-Research#inventions) | Steadfast | Levels rise one step faster | levels\_faster: yes | ([W16 Rifled musket](Data-Research#inventions)) | foot | adopted only: yes |
| V | Ordre mixte | France | [W14 Army divisions](Data-Research#inventions) | Breakthrough | Line can Shift two sectors a bell; one sector may advance in the first bell | line\_shift\_two: yes | ([W16 Rifled musket](Data-Research#inventions)) | foot |  |
| V | Grande batterie | France | [W13 Light field artillery](Data-Research#inventions) | Bombardment | All guns fire into one sector for two bells: its defenders -15 % break point | massed\_fire\_bells: 2; target\_break: -0.15 | ([W16 Rifled musket](Data-Research#inventions)) | foot |  |
| V | Thin red line | Britain | [W11 Flintlock and bayonet](Data-Research#inventions) | Steadfast | Line attacked by Shock becomes Brace for that bell; enemy guns -50 % in the first two bells | line\_brace\_vs\_shock: yes; enemy\_guns\_first\_bells: -0.5 | ([W17 Breech-loading rifle](Data-Research#inventions)) | foot |  |
| V | La guerrilla | Spain, Portugal, Haiti | none | Ambush | In occupied homeland provinces, hidden bands raid the occupier's food reserve each month | raid\_occupier\_food: yes | none | foot | weakened by: [W18 Railway mobilization](Data-Research#inventions) |
| V | Impondo zankomo | Zulu kingdom, the Nguni peoples it drew in | none | Envelopment | From the second bell, both enemy end sectors count as Turned on | ends\_turned\_from\_bell: 2 | ([W17 Breech-loading rifle](Data-Research#inventions), [W19 Machine gun](Data-Research#inventions)) | foot |  |
| V | Pā warfare | Māori | [W5 gunpowder\_infantry](Data-Research#inventions) | Entrenchment | Dug sectors halve all hits, guns included | dug\_halve\_all: yes | ([W19 Machine gun](Data-Research#inventions)) | foot |  |
| V | Khalsa drill | Sikh Empire | [W11 Flintlock and bayonet](Data-Research#inventions), [W13 Light field artillery](Data-Research#inventions) | Steadfast | Guns rotate for free | guns\_free\_rotation: yes | ([W17 Breech-loading rifle](Data-Research#inventions)) | foot |  |
| V | Rifle pit and entrenchment | United States, Confederate States, Russia | [W16 Rifled musket](Data-Research#inventions) | Entrenchment | Shot from dug sectors x1.5 | dug\_shot: 1.5 | ([W19 Machine gun](Data-Research#inventions)) | foot |  |
| VI | Auftragstaktik | Prussia, Germany | [W17 Breech-loading rifle](Data-Research#inventions), [W18 Railway mobilization](Data-Research#inventions) | Breakthrough | Captains give their own orders in their sectors (+1 order per captain) | captain\_orders: 1 | (W19 entrenched) | foot |  |
| VI | Kesselschlacht | Germany | [W18 Railway mobilization](Data-Research#inventions) | Envelopment | An army whose two end sectors are lost can't withdraw; when it breaks, all its men become prisoners | ends\_lost\_no\_withdraw: yes; all\_prisoners: yes | ([W22 Military aircraft](Data-Research#inventions)) | foot |  |
| VI | Offensive à outrance | France, Russia | [W17 Breech-loading rifle](Data-Research#inventions) | Assault | Flee share halved for the attacker | attacker\_flee: 0.5 | ([W19 Machine gun](Data-Research#inventions)) | foot |  |
| VI | Osman Pasha's redoubts | Ottomans | [W17 Breech-loading rifle](Data-Research#inventions) | Entrenchment | Shot from dug sectors x1.5; the line can be held by half the men | dug\_shot: 1.5; half\_men\_hold: yes | (W20 massed) | foot |  |
| VI | Commando | Boer republics | [W17 Breech-loading rifle](Data-Research#inventions) | Skirmish | Light fight dismounted as Shot and remount to step back two sectors | light\_dismount: yes; step\_back: 2 | ([W22 Military aircraft](Data-Research#inventions)) | horse |  |
| VI | Ansar charge | Mahdist Sudan | none | Assault | +25 % hits in the first contact | first\_contact\_hits: 1.25 | ([W19 Machine gun](Data-Research#inventions)) | foot |  |
| VII | Creeping barrage and bite and hold | Britain, the Dominions, France | [W20 Smokeless powder](Data-Research#inventions), [W23 Field radio](Data-Research#inventions) | Bombardment | Before an attack the defender's first-bell hits are halved; won sectors can't be counter-attacked for a bell | defender\_first\_bell: 0.5 | (style:Elastische Verteidigung) | foot |  |
| VII | Stoßtrupptaktik | Germany | [W19 Machine gun](Data-Research#inventions) | Breakthrough | Level 4+ companies can Drive through a sector that is still held | drive\_through\_level: 4 | (style:Elastische Verteidigung), ([W21 Tanks](Data-Research#inventions)) | foot |  |
| VII | Elastische Verteidigung | Germany | [W19 Machine gun](Data-Research#inventions) | Steadfast | Front sector held lightly; when lost, Turn and Drive from it don't work for a bell, and the reserve counter-attacks x1.5 | counter\_attack: 1.5 | ([W21 Tanks](Data-Research#inventions), [W22 Military aircraft](Data-Research#inventions), [W23 Field radio](Data-Research#inventions)) | foot |  |
| VII | Bataille conduite | France | [W19 Machine gun](Data-Research#inventions), [W20 Smokeless powder](Data-Research#inventions) | Bombardment | Every sector dug in; no order can be given to more than one sector per bell | all\_dug: yes | ([W21 Tanks](Data-Research#inventions), [W23 Field radio](Data-Research#inventions)) | foot | after 1939: yes |
| VII | Bewegungskrieg | Germany | [W21 Tanks](Data-Research#inventions), [W22 Military aircraft](Data-Research#inventions), [W23 Field radio](Data-Research#inventions) | Breakthrough | Tanks that win a sector can Drive two sectors deep in one bell | tank\_drive\_deep: 2 | (deep defence, [W22 Military aircraft](Data-Research#inventions)) | foot | after 1939: yes |
| VII | Glubokiy boy | Soviet Union | [W21 Tanks](Data-Research#inventions), [W22 Military aircraft](Data-Research#inventions), [W23 Field radio](Data-Research#inventions) | Breakthrough | After a breakthrough, a second wave enters from depth: Drive orders cost no order | free\_drive: yes | (air superiority) | foot | after 1939: yes |
| VII | Motti | Finland | none | Ambush | Sprung companies split an enemy sector in two: each half fights alone | split\_sector: yes | ([W22 Military aircraft](Data-Research#inventions)) | foot | after 1939: yes |
| VII | People's war | Chinese communists, Yugoslav partisans, other partisans | none | Ambush | In occupied homeland provinces, rebel bands form for you each month | rebel\_bands\_occupied: yes | none | foot | after 1939: yes |
| VII | Banzai charge | Japan | none | Assault | Breaks are delayed by one bell; losses x2 for both sides | break\_delay\_bells: 1; losses: 2 | ([W19 Machine gun](Data-Research#inventions)) | foot | after 1939: yes |

## Ships

> Warfare 11.1 (warfare owns ships' fighting strength and room, D-NAVY-5): what each ship fights with and how many men it carries. Turtle ships fight 80 near their home coast and 20 at sea; until home coasts exist they count 20. Caravel and fluyt are naval's proposal (naval §10); steamer, small craft and voyaging canoe are provisional.

| Name | fights | carries |
|---|---|---|
| galley | 20 | 200 |
| cog | 5 | 300 |
| junk | 5 | 300 |
| dhow | 5 | 300 |
| war canoe fleet | 8 | 100 |
| carrack | 15 | 400 |
| armed carrack | 40 | 300 |
| galleon | 60 | 500 |
| turtle ship | 20 | 0 |
| ship of the line | 150 | 0 |
| caravel | 8 | 60 |
| fluyt | 2 | 300 |
| steamer | 5 | 600 |
| small craft | 0 | 10 |
| voyaging canoe | 0 | 20 |
