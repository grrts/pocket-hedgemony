@context-buildings
Feature: Starting buildings and data
  As the game
  I want 1444 buildings set from the map, catalogue and history
  So that every province starts with what stood there

  @BLD-148
  Scenario Outline: Map wealth sets starting buildings
    Given the province "<province>" has map wealth <wealth>
    When the campaign starts
    Then <result>

    Examples:
      | province | wealth | result                                                          |
      | Lapland  | 1      | a farm or ranch stands on a third of its tiles                   |
      | Venice   | 10     | every tile is built and its town buildings are at step 2         |

  @BLD-149
  Scenario Outline: Regional templates fill town slots
    Given the province "<province>" is a "<template>" town
    When the campaign starts
    Then its town slots are filled with <buildings>

    Examples:
      | province | template              | buildings                       |
      | Troyes   | European market town  | market, church, loom house      |
      | Timbuktu | Sahel trade town      | market, mosque, caravanserai    |

  @BLD-150
  Scenario: The catalogue and start inventions
    Given the buildings config of the design
    When the campaign starts
    Then houses of worship take their faith from the country catalogue
    And lords' provinces hold the lords' buildings
    And only buildings and steps of known start inventions exist

  @BLD-151
  Scenario: Ports in 1444
    Given the buildings config of the design
    When the campaign starts
    Then 236 provinces from the naval ports-1444 list have a harbour with its step
    And the 31 provinces with a great port of the time have harbour step 3

  @BLD-152
  Scenario Outline: Geography anchors
    Given the buildings config of the design
    When the campaign reaches <date>
    Then "<anchor>" is <state>

    Examples:
      | date        | anchor          | state                      |
      | 11 Nov 1444 | Kutná Hora mine | on the map                 |
      | 11 Nov 1444 | Falun mine      | on the map                 |
      | 11 Nov 1444 | Bruges market   | on the map                 |
      | 1545        | Potosí mine     | founded by its event        |

  @BLD-153 @BLD-154
  Scenario: Small data per building
    Given a province with 12 town buildings
    When the building rules are applied
    Then each building stores type, step, owner, condition and filled jobs
    And sites are kept in one realm-level list
    And adding a building type is adding one config entry
