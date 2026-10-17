@context-province
Feature: Health and the land's condition
  As the game
  I want plague, fever land and smoke counted per province
  So that disease and pollution follow trade, ground and industry

  @PROV-240
  Scenario Outline: Plague spreads along roads, rivers and the sea
    Given the province "Genoa" has a plague outbreak
    And the province "<target>" is joined to it by <link>
    When plague spreads
    Then the province "<target>" may catch the plague

    Examples:
      | target     | link                        |
      | Milan      | a road carrying traders     |
      | Marseille  | a sea route                 |
      | Piedmont   | an army marching from Genoa |
      | Savoy      | refugees fleeing Genoa      |

  @PROV-240
  Scenario: Crowded towns catch plague first
    Given plague reaches a region
    When the game works out the province's stats
    Then its crowded towns catch it before its countryside

  @PROV-240 @PROV-241
  Scenario: Plague runs its steps and burns out
    Given the province "Genoa" has a plague "rumour"
    When the plague grows
    Then it becomes an "outbreak"
    And after a season or two it is "burning out"
    And then the province has no plague

  @PROV-241
  Scenario: Quarantine closes the province
    Given the province "Genoa" has a plague outbreak
    When the country "Genoa" quarantines the province
    Then trade with "Genoa" stops
    And the plague spreads more slowly

  @PROV-242
  Scenario: Plague kills townsfolk first and leaves buildings fallow
    Given the province "Genoa" has a plague outbreak
    When the game works out the province's stats
    Then townsfolk die before countryfolk
    And buildings that lose half their workers go fallow

  @PROV-243
  Scenario Outline: Fever land
    Given the province "<province>" has the ground "<ground>" and <marsh> marsh tiles
    Then its fever land is set by ground and climate, made worse by marsh tiles
    When <change>
    Then its fever land falls

    Examples:
      | province | ground | marsh | change                                  |
      | Guinea   | jungle | 0     | the country knows quinine               |
      | Holland  | marsh  | 3     | the marsh tiles are drained             |

  @PROV-243
  Scenario: Locals mostly survive fever land
    Given the province "Guinea" has "deadly" fever land
    When the game works out the province's stats
    Then soldiers and settlers from elsewhere die there
    And locals mostly don't

  @PROV-244
  Scenario: Factories make smoke from era V
    Given the province "Lancashire" has 2 factories and a coal mine in era V
    Then the province "Lancashire" has smoke
    And its townsfolk get sick
    And its tiles become worn
    And the smoke feeds the event tree's climate stats
    When the factories and the coal mine close
    Then the smoke goes
