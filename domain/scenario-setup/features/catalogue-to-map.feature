@context-scenario-setup
Feature: Putting the catalogue on the map
  As the game
  I want each catalogue record matched to its land on the map
  So that the 963 researched entities own the provinces they held

  @SETUP-048
  Scenario: The map's nations are the realms and the playable list
    Given the map's 237 nations
    When the starting world is built
    Then every map nation is a realm with provinces, a capital, a colour and commanders
    And every map nation is playable
    And 200 of them are catalogue ids and the other 37 go through the rename table

  @SETUP-049
  Scenario Outline: Map nations use catalogue ids
    Given the map nation "<map id>"
    When it is matched to the catalogue
    Then it is the record "<record>"

    Examples:
      | map id   | record              |
      | france   | france              |
      | ottomans | ottoman             |
      | mamluks  | mamluk              |
      | korea    | joseon              |
      | timurids | timurid_empire      |
      | aztecs   | triple_alliance     |
      | ireland  | none                |

  @SETUP-050
  Scenario Outline: Only land no realm on the map owns can be colonised
    Given a coastal province <held>
    When a colonial governor of "Castile" tries to found a colony there
    Then the colony <result>

    Examples:
      | held                         | result                       |
      | owned by no country          | can be founded on free tiles |
      | owned by the realm "Mali"    | can't be founded             |

  @SETUP-050
  Scenario: A catalogue record that owns no map province is not a realm
    Given the catalogue record "silesia" owns no map province
    When the starting world is built
    Then it is reference data and not a realm

  @SETUP-059
  Scenario Outline: Each realm carries its administrative capacity
    Given the map nation "<map id>"
    When the starting world is built
    Then the realm's administrative capacity is <rank>

    Examples:
      | map id   | rank |
      | france   | 4    |
      | venice   | 5    |
      | mali     | 3    |
      | ireland  | 0    |
