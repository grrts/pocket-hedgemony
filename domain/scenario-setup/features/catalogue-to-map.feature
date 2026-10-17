@context-scenario-setup
Feature: Putting the catalogue on the map
  As the game
  I want each catalogue record matched to its land on the map
  So that the 963 researched entities own the provinces they held

  @SETUP-048 @open-question
  # OQ-SETUP-1: no mapping plan exists yet
  Scenario: Each owning record has provinces, a capital, a colour, a ruler and commanders
    Given the catalogue-to-map plan
    When the starting world is built
    Then every record that owns land has its provinces, capital, colour, ruler and commanders

  @SETUP-049 @open-question
  # OQ-SETUP-1: 37 map ids are not catalogue ids
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

  @SETUP-050 @open-question
  # OQ-SETUP-2: which representations own land on the map
  Scenario Outline: Only land no country owns can be colonised
    Given a coastal province <held>
    When a colonial governor of "Castile" tries to found a colony there
    Then the colony <result>

    Examples:
      | held                                          | result                      |
      | owned by no country                           | can be founded on free tiles |
      | held by a chiefdom that is a country          | can't be founded            |
      | held by a clan council that is a country      | can't be founded            |
