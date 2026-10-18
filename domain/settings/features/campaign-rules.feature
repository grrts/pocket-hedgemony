@context-settings
Feature: Campaign rules are not settings
  As a player
  I want rules that change the game fixed in the campaign and shown read-only
  So that ironman and achievements stay honest

  @SET-006 @SET-032
  Scenario Outline: Campaign rules are read-only in the campaign
    Given a campaign was begun with "<rule>" set to "<value>"
    When the player opens Settings → Campaign rules
    Then "<rule>" shows "<value>"
    And it cannot be changed

    Examples:
      | rule                         | value             |
      | difficulty                   | normal            |
      | AI temper                    | chosen at start   |
      | music eras                   | calendar          |
      | fog of war                   | on                |
      | events                       | historical        |
      | ironman                      | on                |
      | campaign end date            | 31 August 1939    |

  @SET-032
  Scenario: The music era rule is a campaign rule
    Given music eras following the calendar or technology is a choice
    When the player begins a campaign
    Then it is chosen on the new game screen as a campaign rule
    And it is not offered in Settings

  @SET-006
  Scenario Outline: No setting changes the simulation
    Given two campaigns with the same seed and the same orders
    And one is played with "<setting>" set to "<value>"
    When both play 12 turns
    Then both worlds have the same hash

    Examples:
      | setting                | value     |
      | Map detail             | Low       |
      | Animations             | Off       |
      | Battle playback speed  | 4×        |
      | Colour vision          | No colour |

  @SET-033
  Scenario: Parchment fog stays a display switch
    Given the map mode menu has "Hide unexplored lands"
    When the player turns it off
    Then unknown lands are drawn without parchment
    And no campaign rule changes
    And the AI's information is unchanged
