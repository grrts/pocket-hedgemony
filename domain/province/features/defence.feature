@context-province
Feature: Castle, walls and garrison
  As a player or AI country
  I want castles, walls and garrisons counted per province
  So that an invader must besiege or bypass them

  @PROV-220
  Scenario Outline: Castle steps
    Given the province "Troyes" has the castle "<from>"
    When <cause>
    Then the province "Troyes" has the castle "<to>"

    Examples:
      | from          | cause                                        | to            |
      | none          | the country builds an earthwork ring fort    | earthwork ring fort |
      | stone castle  | the country upgrades it with B5 known        | bastion fort  |
      | stone castle  | it goes 10 years without upkeep              | earthwork ring fort |
      | bastion fort  | a peace demolishes it                        | none          |
      | stone castle  | it is destroyed in a siege                   | none          |

  @PROV-220
  Scenario: Conquering a province takes its castle
    Given the province "Calais" has a stone castle
    When the country "England" conquers "Calais"
    Then the country "England" holds the stone castle of "Calais"

  @PROV-221
  Scenario Outline: Where the castle stands matters
    Given the province "<province>" has a castle and the ground "<ground>"
    When the game works out the province's stats
    Then the castle <effect>

    Examples:
      | province  | ground    | effect                               |
      | Savoy     | mountains | is far harder to take                |
      | Calais    | farmland  | must be besieged to take the province |

  @PROV-221
  Scenario: A castle on a shore tile can be supplied by sea
    Given the province "Calais" has a castle on a shore tile
    When an enemy besieges it by land
    Then the castle can be supplied by sea

  @PROV-222 @placeholder
  Scenario Outline: Walls are breached and repaired
    # config: province.walls.max_breaches
    Given the castle of "Troyes" has <before> breaches
    When <cause>
    Then the castle of "Troyes" has <after> breaches

    Examples:
      | before | cause                                     | after |
      | 0      | siege guns breach the walls               | 1     |
      | 1      | mining opens another breach               | 2     |
      | 2      | an earthquake strikes                     | 3     |
      | 3      | siege guns fire again                     | 3     |
      | 2      | the country pays gold and waits months     | 1     |

  @PROV-223
  Scenario: A castle with no garrison falls at once
    Given the castle of "Troyes" has no garrison
    When an enemy army enters "Troyes"
    Then the castle falls at once

  @PROV-302 @feedback-17
  Scenario: The Garrison tab
    Given the province "Troyes" has 2000 garrison troops and 1000 levies still gathering
    When the player opens the Garrison tab of "Troyes"
    Then it lists the 2000 troops by arm and drill
    And it lists the gathering levies with the days left
    And it lists the commanders present who can pick them up
