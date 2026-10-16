@context-audio
Feature: Many sounds at once
  As a player whose turn resolved forty battles
  I want to hear only the few results that matter
  So that the turn is readable, not noise

  @AUD-083 @placeholder
  Scenario: At most five results, the player's first
    Given a new turn brings 12 results with sound
    And 3 of them happened to the player's own armies, castles or ruler
    And 4 of them are in view of the camera
    When the new turn is shown
    Then 5 sounds play, 150 ms apart
    And the 3 player results play first, highest priority first
    And then 2 results in view
    And the rest are shown in the turn report and toasts without sound

  @AUD-084 @placeholder
  Scenario Outline: The batch sound
    Given <count> notifications arrive in one turn
    Then <result>

    Examples:
      | count | result |
      | 4 | each notification plays its own sound |
      | 5 | only "notify_batch" plays |

  @AUD-085
  Scenario Outline: Voice stealing by priority
    Given all three effect voices are busy and the lowest playing priority is <playing>
    When a sound of priority <new> starts
    Then <result>

    Examples:
      | playing | new | result |
      | 4 | 2 | the new sound takes the priority 4 sound's voice |
      | 2 | 2 | the new sound is dropped |
      | 1 | 3 | the new sound is dropped |

  @AUD-086 @placeholder
  Scenario Outline: Cooldowns
    Given "<id>" started <ms> ms ago
    When "<id>" is triggered again
    Then it <result>

    Examples:
      | id | ms | result |
      | ui_tap | 30 | does not restart |
      | ui_tap | 60 | plays |
      | ui_scroll_tick | 30 | does not restart |
      | notify_alert | 1500 | does not restart |
      | notify_alert | 2100 | plays |

  @AUD-087
  Scenario Outline: Small variation, except meaningful pitch
    When "<id>" plays twenty times
    Then its pitch <variation>

    Examples:
      | id | variation |
      | battle_shoot_volley | shifts by up to one semitone with a new noise seed each time |
      | ui_confirm | never varies |
      | turn_ready | never varies |

  @AUD-088 @placeholder
  Scenario Outline: Distance and pan
    Given an army sound happens <where>
    Then it plays at <volume> with pan following its screen position up to 30 %

    Examples:
      | where | volume |
      | at the screen centre | full volume |
      | at the screen edge | 0.4 volume |
      | beyond the visible area | no volume |

  @AUD-088
  Scenario: Notifications are always centred
    When "notify_battle_far" plays for a battle off screen
    Then it plays centred and is not muted

  @AUD-089
  Scenario Outline: Zoom decides which map sounds play
    Given the camera is at <zoom> zoom
    When an army order, a battle start and a melee happen on screen
    Then <heard>

    Examples:
      | zoom | heard |
      | world | none of them play from the map, only notifications |
      | regional | the army order and the battle start play, the melee does not |
      | local | all three play |
