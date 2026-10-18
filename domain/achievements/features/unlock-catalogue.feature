@context-achievements
Feature: Unlock the catalogue
  As a player in an eligible ironman campaign
  I want each achievement to unlock when its moment comes and its test holds
  So that every goal in the list can be earned exactly as written

  # Every number in a test is a placeholder for balancing (achievements.yaml header).

  Background:
    Given the campaign is ironman and has never left ironman
    And the campaign is not cheat-marked
    And the player still plays the realm they started with

  @ACH-015 @ACH-016 @placeholder
  Scenario Outline: First steps achievement "<name>" unlocks on its moment
    Given the achievement "<id>" is locked
    And its test <test> holds
    When the moment "<moment>" occurs
    Then the achievement "<id>" unlocks
    And it is worth <points> points as tier "<tier>"
    And its scope is "<scope>"

    Examples:
      | id | name | moment | test | tier | points | scope |
      | first_harvest | First Harvest | harvest | {harvests_seen: 1} | copper | 5 | campaign |
      | food_policy_set | Set the Table | food_policy_changed | {food_policy_changed: true} | copper | 5 | campaign |
      | first_regiment | Mustered | regiment_trained | {regiments_trained: 1} | copper | 5 | campaign |
      | first_invention | Ink and Candle | invention_done | {inventions_done: 1} | copper | 5 | campaign |
      | first_castle | Stone upon Stone | castle_gained | {castles_gained: 1} | copper | 5 | campaign |
      | first_alliance | A Letter Sealed | relation_changed | {relation_formed: alliance} | copper | 5 | campaign |
      | first_peace | Ink on the Treaty | war_end | {war_ended_by: peace_treaty, player_signed: true} | copper | 5 | campaign |
      | first_year | A Year in the Ledger | turn_end | {months_played: 12} | copper | 5 | campaign |

  @ACH-015 @ACH-017 @placeholder
  Scenario Outline: Realm achievement "<name>" unlocks on its moment
    Given the achievement "<id>" is locked
    And its test <test> holds
    When the moment "<moment>" occurs
    Then the achievement "<id>" unlocks
    And it is worth <points> points as tier "<tier>"
    And its scope is "<scope>"

    Examples:
      | id | name | moment | test | tier | points | scope |
      | full_granaries | Full Granaries | turn_end | {provinces_min: 10, months_no_hungry_province: 60} | silver | 10 | campaign |
      | famine_averted | Famine Relief   | year_end | {famine_rule_released_to_province: true, famine_deaths_in_that_province: 0} | copper | 5 | campaign |
      | seven_good_harvests | Seven Fat Years | harvest | {capital_harvest_at_least: good, years_in_a_row: 7} | copper | 5 | campaign |
      | debt_repaid | Clean Books | loan_closed | {loan_size_min: 1000, closed_by: repaid} | copper | 5 | campaign |
      | treasury_10000 | Counting House | turn_end | {gold_min: 10000} | silver | 10 | campaign |
      | people_10m | Many Hearths | turn_end | {people_min: 10000000} | silver | 10 | campaign |
      | trade_hub_held | Where Roads Meet | province_gained | {owns_trade_hub: 1} | copper | 5 | campaign |
      | castle_reach_3 | Long Reach | turn_end | {any_castle_reach_min: 3} | copper | 5 | campaign |
      | harvests_10 | Ten Harvests | harvest | {provinces_harvested_min: 10} | copper | 5 | lifetime |
      | harvests_100 | A Hundred Harvests | harvest | {provinces_harvested_min: 100} | silver | 10 | lifetime |
      | harvests_1000 | A Thousand Harvests | harvest | {provinces_harvested_min: 1000} | gold | 20 | lifetime |
      | harvests_10000 | Ten Thousand Harvests | harvest | {provinces_harvested_min: 10000} | crown | 40 | lifetime |

  @ACH-015 @ACH-018 @placeholder
  Scenario Outline: Lords and rule achievement "<name>" unlocks on its moment
    Given the achievement "<id>" is locked
    And its test <test> holds
    When the moment "<moment>" occurs
    Then the achievement "<id>" unlocks
    And it is worth <points> points as tier "<tier>"
    And its scope is "<scope>"

    Examples:
      | id | name | moment | test | tier | points | scope |
      | lord_raised | Raised Up | lord_created | {lords_created: 1} | copper | 5 | campaign |
      | all_lords_loyal | Not One Waverer | turn_end | {lords_min: 10, lords_wavering: 0, lords_disloyal: 0} | silver | 10 | campaign |
      | officials_30 | A Clerk in Every Town | turn_end | {royal_provinces_with_official_min: 30} | copper | 5 | campaign |
      | charters_5 | Chartered Towns | charter_granted | {charters_in_force_min: 5} | copper | 5 | campaign |
      | long_reign | Long Live the Ruler | year_end | {ruler_years_min: 40} | copper | 5 | campaign |
      | peaceful_succession | The Crown Passes | succession_plus_12_months | {new_rebellions_since_succession: 0} | copper | 5 | campaign |

  @ACH-015 @ACH-019 @placeholder
  Scenario Outline: Learning achievement "<name>" unlocks on its moment
    Given the achievement "<id>" is locked
    And its test <test> holds
    When the moment "<moment>" occurs
    Then the achievement "<id>" unlocks
    And it is worth <points> points as tier "<tier>"
    And its scope is "<scope>"

    Examples:
      | id | name | moment | test | tier | points | scope |
      | schools_5 | Halls of Learning | turn_end | {schools_min: 5} | copper | 5 | campaign |
      | scholars_100 | A Hundred Pens | turn_end | {scholars_min: 100} | copper | 5 | campaign |
      | quiet_years | Quiet Years | invention_done | {inventions_since_last_war_min: 10} | silver | 10 | campaign |
      | first_in_world | First in the World | invention_done | {invention_era_min: III, first_in_world: true} | silver | 10 | campaign |
      | era_iv_invention | Age of Reason's Tools | invention_done | {invention_era_min: IV} | copper | 5 | campaign |
      | era_vi_invention | Steam and Wire | invention_done | {invention_era_min: VI} | silver | 10 | campaign |
      | whole_tree | The Whole Tree | invention_done | {inventions_known_all_in_scope: true} | crown | 40 | campaign |

  @ACH-015 @ACH-020 @placeholder
  Scenario Outline: War achievement "<name>" unlocks on its moment
    Given the achievement "<id>" is locked
    And its test <test> holds
    When the moment "<moment>" occurs
    Then the achievement "<id>" unlocks
    And it is worth <points> points as tier "<tier>"
    And its scope is "<scope>"

    Examples:
      | id | name | moment | test | tier | points | scope |
      | outnumbered_win | Fewer, Better | battle_end | {player_won: true, enemy_to_player_men_ratio_min: 2.0} | silver | 10 | campaign |
      | castle_by_terms | Open the Gates | siege_end | {siege_result: terms} | copper | 5 | campaign |
      | castle_by_storm | Over the Walls | siege_end | {siege_result: stormed} | copper | 5 | campaign |
      | castle_by_gold | A Purse at the Gate | siege_end | {siege_result: bought} | copper | 5 | campaign |
      | wintered_well | Wintered Well | spring_start | {army_men_min: 10000, winter_quarters: true, winter_loss_share_max: 0.05} | copper | 5 | campaign |
      | marshal_victory | The Marshal | battle_end | {player_won: true, commander_kind: marshal} | copper | 5 | campaign |
      | style_adopted | A New Way of War | style_adopted | {styles_adopted: 1} | silver | 10 | campaign |
      | defend_every_province | Not One Field | war_end | {player_role: defender, player_won: true, enemy_to_player_people_ratio_min: 2.0, provinces_lost: 0} | gold | 20 | campaign |

  @ACH-015 @ACH-021 @placeholder
  Scenario Outline: Sea and the wider world achievement "<name>" unlocks on its moment
    Given the achievement "<id>" is locked
    And its test <test> holds
    When the moment "<moment>" occurs
    Then the achievement "<id>" unlocks
    And it is worth <points> points as tier "<tier>"
    And its scope is "<scope>"

    Examples:
      | id | name | moment | test | tier | points | scope |
      | sea_battle_won | Master of the Swell | sea_battle_end | {player_won: true} | copper | 5 | campaign |
      | trade_ships_100 | Merchant Fleet | turn_end | {trade_ships_min: 100} | silver | 10 | campaign |
      | ocean_crossed | Beyond the Horizon | fleet_home | {fleet_crossed_ocean_and_returned: true} | copper | 5 | campaign |
      | first_contact | Strangers on the Shore | contact_made | {contact_by: sea, other_macro_region: true} | copper | 5 | campaign |
      | colony_by_treaty | Treaty on the Shore | colony_founded | {founded_with_consent_of_local_people: true} | silver | 10 | campaign |
      | around_the_world | All the Way Round | fleet_home | {fleet_circumnavigated: true} | gold | 20 | campaign |

  @ACH-015 @ACH-022 @placeholder
  Scenario Outline: Order achievement "<name>" unlocks on its moment
    Given the achievement "<id>" is locked
    And its test <test> holds
    When the moment "<moment>" occurs
    Then the achievement "<id>" unlocks
    And it is worth <points> points as tier "<tier>"
    And its scope is "<scope>"

    Examples:
      | id | name | moment | test | tier | points | scope |
      | demand_granted | Heard Them Out | rebellion_end | {ended_by: demand_granted} | copper | 5 | campaign |
      | great_revolt_beaten | The Realm Holds | rebellion_end | {severity: great_revolt, rebels_won: false} | silver | 10 | campaign |
      | quiet_land | A Quiet Land | turn_end | {provinces_min: 20, months_no_unrest_tier: 300} | gold | 20 | campaign |

  @ACH-015 @ACH-023 @placeholder
  Scenario Outline: Abroad achievement "<name>" unlocks on its moment
    Given the achievement "<id>" is locked
    And its test <test> holds
    When the moment "<moment>" occurs
    Then the achievement "<id>" unlocks
    And it is worth <points> points as tier "<tier>"
    And its scope is "<scope>"

    Examples:
      | id | name | moment | test | tier | points | scope |
      | allies_3 | Friends in Many Courts | relation_changed | {alliances_min: 3} | copper | 5 | campaign |
      | rival_to_ally | Old Grudges Buried | relation_changed | {relation_from: rival, relation_to: alliance, same_partner: true} | silver | 10 | campaign |
      | oath_kept_century | My Word Is Iron | year_end | {years_played_min: 100, oaths_broken: 0} | silver | 10 | campaign |
      | independence_won | Our Own Banner | relation_changed | {started_as_subject: true, subject_of_anyone: false} | silver | 10 | campaign |
      | tribute_5 | Tribute Roads | turn_end | {tributaries_min: 5} | silver | 10 | campaign |

  @ACH-015 @ACH-024 @placeholder
  Scenario Outline: History achievement "<name>" unlocks on its moment
    Given the achievement "<id>" is locked
    And its test <test> holds
    When the moment "<moment>" occurs
    Then the achievement "<id>" unlocks
    And it is worth <points> points as tier "<tier>"
    And its scope is "<scope>"

    Examples:
      | id | name | moment | test | tier | points | scope |
      | history_kept | As It Was Written | event_choice | {historical_choices_min: 25} | copper | 5 | campaign |
      | history_rewritten | Another Ending | event_choice | {nonhistorical_choices_in_major_events_min: 10} | silver | 10 | campaign |
      | paths_not_taken | Paths Not Taken | event_choice | {distinct_nonhistorical_options_min: 50} | gold | 20 | lifetime |
      | walls_held_1453 | The Walls Held | date | {date: 1460-12-31, event_role: {event: fall_of_constantinople, role: defender}, owns: city:constantinople} | gold | 20 | campaign |
      | four_quarters_hold | The Four Quarters Hold | date | {date: 1600-12-31, event_role: {event: inca_expansion, role: any}, owns: city:cusco, subject_of_anyone: false} | gold | 20 | campaign |
      | never_colonised | Unconquered | date | {date: 1914-01-01, start_macro_region_not: europe, capital_never_occupied_by_other_macro_region: true} | gold | 20 | campaign |
      | printing_early | The Presses Roll | invention_done | {invention: printing, before: 1470-01-01} | copper | 5 | campaign |
      | abolition_early | Chains Broken | event_choice | {realm_flag_set: slavery_abolished, before: 1800-01-01} | silver | 10 | campaign |
      | kept_out_great_war | Stayed Home | event_end | {event: world_war_i, provinces_min: 50, at_war_during_event: false} | silver | 10 | campaign |
      | crash_weathered | Weathered the Crash | event_end | {event: great_depression, affected: true, defaulted_during_event: false} | copper | 5 | campaign |
      | japan_whole_1600 | One Island Realm | province_gained | {owns_all: region:japan, before: 1600-01-01} | gold | 20 | campaign |
      | sahel_whole_1600 | Lord of the River Bend | province_gained | {owns_all: area:niger_bend, before: 1600-01-01} | gold | 20 | campaign |

  @ACH-015 @ACH-025 @placeholder
  Scenario Outline: Campaign achievement "<name>" unlocks on its moment
    Given the achievement "<id>" is locked
    And its test <test> holds
    When the moment "<moment>" occurs
    Then the achievement "<id>" unlocks
    And it is worth <points> points as tier "<tier>"
    And its scope is "<scope>"

    Examples:
      | id | name | moment | test | tier | points | scope |
      | reach_1500 | New Century | date | {date: 1500-01-01} | copper | 5 | campaign |
      | reach_1700 | Halfway Through Time | date | {date: 1700-01-01} | copper | 5 | campaign |
      | reach_1900 | The New Machine Age | date | {date: 1900-01-01} | silver | 10 | campaign |
      | campaign_complete | The Long Road | campaign_end | {reached_end_date: true} | crown | 40 | campaign |
      | from_one_hall | From One Hall | province_gained | {start_provinces_max: 1, provinces_min: 50} | gold | 20 | campaign |
      | decentralised_1500 | Many Tents, One People | date | {date: 1500-01-01, start_polity_kind: decentralised} | copper | 5 | campaign |
      | many_crowns | Many Crowns | year_end | {distinct_realms_played_10_years_min: 10} | copper | 5 | lifetime |
      | every_macro_region | Crowns of the World | year_end | {distinct_world_regions_played_10_years_min: 6} | silver | 10 | lifetime |

  @ACH-026
  Scenario: A test that is not met leaves the achievement locked
    Given the achievement "treasury_10000" is locked
    And the country holds 9999 gold in its treasury
    When the moment "turn_end" occurs
    Then the achievement "treasury_10000" stays locked

  @ACH-017 @placeholder
  Scenario: Counting House needs the gold at once, at turn end
    Given the country holds 10000 gold in its treasury
    When the moment "turn_end" occurs
    Then the achievement "treasury_10000" unlocks

  @ACH-020 @placeholder
  Scenario Outline: The way a castle is taken picks one of three war achievements
    Given the player's army ends a siege with the result "<result>"
    When the moment "siege_end" occurs
    Then the achievement "<id>" unlocks

    Examples:
      | result | id |
      | terms | castle_by_terms |
      | stormed | castle_by_storm |
      | bought | castle_by_gold |
