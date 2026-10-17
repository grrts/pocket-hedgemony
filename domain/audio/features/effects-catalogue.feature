@context-audio
Feature: The effects catalogue
  As a player
  I want a short, readable sound for each thing that happens
  So that I know what happened without looking

  @AUD-070 @placeholder
  Scenario Outline: Sounds on their moments
    When <moment>
    Then the sound "<id>" plays with priority <pri>

    Examples:
      | moment | id | pri |
      | the player taps a button | ui_tap | 3 |
      | the player confirms a choice that costs something | ui_confirm | 2 |
      | a store unlock completes | ui_purchase | 1 |
      | the player presses End turn | turn_end | 1 |
      | the turn that starts January is ready | turn_month_new_year | 2 |
      | the player taps a province they own | map_select_own | 3 |
      | the player calls the levy | army_levy_call | 2 |
      | a regiment finishes training | army_trained | 3 |
      | a battle begins and the screen opens | battle_start | 1 |
      | a breach opens in a siege | siege_breach | 1 |
      | a ship sinks | sea_sink | 2 |
      | a building finishes | econ_build_done | 3 |
      | an outbreak reaches a province of the player | realm_plague | 2 |
      | an event follows from an earlier choice | event_chain_next | 2 |
      | a battle of the player starts off screen | notify_battle_far | 2 |

  @AUD-070
  Scenario Outline: Aliases point to another sound
    When <moment>
    Then the sound "ui_error" plays

    Examples:
      | moment |
      | a route can't be taken |
      | the player can't afford an action |

  @AUD-070
  Scenario: The catalogue size
    Given the effects catalogue
    Then the catalogue counts 129 sounds in 12 groups
    And aliases and "turn_autosave" are listed but not counted

  @AUD-071
  Scenario: Stinger moments get no effect of their own
    When an invention is adopted
    Then the stinger "innovation" plays
    And no effect marks the moment

  @AUD-072
  Scenario: Autosave is silent
    When an autosave finishes
    Then no sound plays

  @AUD-073 @placeholder
  Scenario Outline: The working tick
    When the engine takes <ms> ms to compute the turn after End turn
    Then "turn_working" <result>

    Examples:
      | ms | result |
      | 400 | never plays |
      | 1700 | ticks every 500 ms from 600 ms until the turn is ready |

  @AUD-074
  Scenario Outline: Border changes on screen
    When a province on screen changes hands <how>
    Then "map_border_change" <result>

    Examples:
      | how | result |
      | to the player | plays two rising bell notes |
      | away from the player | plays two falling bell notes |
      | between two other realms | is silent |

  @AUD-075
  Scenario: Hunger warns again only when it gets worse
    Given "army_hungry" played for an army with 14 days of food
    When the next turn the same army still has 14 days of food
    Then "army_hungry" does not play
    When the army's food falls to 8 days
    Then "army_hungry" plays

  @AUD-076
  Scenario: One sound per bell step at normal speed
    Given the battle screen plays at normal speed with three sectors fighting
    When a bell's shooting step comes
    Then the shooting sound of the sector closest to the screen centre plays
    And other sectors' sounds play only if a voice is free

  @AUD-077
  Scenario: Skipping a battle
    When the player skips ahead in a battle
    Then only "battle_start", "battle_rout" and the music stinger play

  @AUD-078
  Scenario: Plunder is quiet
    When the player's army plunders a province
    Then "realm_fire" plays at low volume
    And no bright sound plays
