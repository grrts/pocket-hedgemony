@context-achievements
Feature: Rules the achievement list follows
  As the game
  I want the achievement list to stay inside every store's limits and the project's own rules
  So that one list fits Steam, Game Center and Google Play and never rewards harm

  @ACH-001
  Scenario: Achievements give nothing inside the game
    Given the achievement "treasury_10000" has unlocked
    Then the country gains no bonus, no unlocked nation and no cosmetic

  @ACH-002
  Scenario: One list for every store
    When the store lists are built from the YAML
    Then Steam, Game Center and Google Play each receive the same 71 achievements

  @ACH-003
  Scenario: Every achievement is original
    Given an achievement row in the list
    Then its name, condition and icon are written for Pocket Hegemony's own systems
    And none is taken from another commercial game

  @ACH-004
  Scenario: No test names a country
    Given the achievement list
    Then no test names a country
    And only "japan_whole_1600" and "sahel_whole_1600" name a region
    And "walls_held_1453" names the event role "defender" of the event "fall_of_constantinople"

  @ACH-005
  Scenario: Harm is never rewarded
    Given an event marked "narrative_only"
    Then no achievement test reads that event
    And no achievement rewards conquering a named people, sacking or scorching land

  @ACH-006
  Scenario Outline: Every test names its source
    Given the achievement "<id>"
    Then its refs name "<ref>"

    Examples:
      | id | ref |
      | full_granaries | province-stats 6.2 |
      | tribute_5 | gap-lists 7 |
      | ocean_crossed | gap-lists 14 |

  @ACH-008 @ACH-010 @ACH-011
  Scenario: The list stays inside the store limits
    Given the launch achievement list
    Then it holds 71 achievements worth 680 points
    And every achievement's points are a multiple of 5 and at most 40
    And 29 slots and 320 points are kept for updates
    And the list can never hold more than 100 achievements or 1000 points

  @ACH-009
  Scenario Outline: Tier gives points
    Given an achievement of tier "<tier>"
    Then it is worth <points> points on Game Center and Google Play
    And the launch list has <count> achievements of that tier

    Examples:
      | tier | points | count |
      | copper | 5 | 38 |
      | silver | 10 | 21 |
      | gold | 20 | 10 |
      | crown | 40 | 2 |

  @ACH-012
  Scenario: An update keeps a reserve
    Given the list has 71 achievements worth 680 points
    When an update adds 20 achievements worth 230 points
    Then 9 slots remain, fewer than the 10 that must stay in reserve
    And the update is refused

  @ACH-013
  Scenario Outline: Names and texts fit a phone toast
    Given an achievement with a name of <name_length> characters and a text of <text_length> characters
    Then the list check <result>

    Examples:
      | name_length | text_length | result |
      | 24 | 100 | passes |
      | 25 | 80 | fails |
      | 20 | 101 | fails |

  @ACH-029 @ACH-030
  Scenario: Hidden achievements
    Given no achievement is hidden at launch
    When a later update adds a hidden achievement for an event chain
    Then before it is earned the list shows it as "Hidden achievement" with its tier
    And its name and text stay secret until it is earned
