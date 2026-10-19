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

  # Plague in the game (Leroy, 18 October 2026): PROV-342 to PROV-350. Troyes stands in Aube and Reims
  # in Marne, two provinces of France next to each other. Plague weeks are days 7, 14, 21 and 28.

  @PROV-342 @placeholder
  Scenario: Plague breaks out now and then, most in crowded towns
    # plague.start_chance_year 0.003 and the crowding numbers are provisional.
    Given a new campaign with no plague anywhere
    When 40 years of plague weeks pass
    Then each of the largest realms had plague somewhere in some years, but not in most
    And a province with more townsfolk is more likely to catch it

  @PROV-343 @placeholder
  Scenario: Plague spreads to land next door, less into a closed province
    Given the province "Troyes" has a plague outbreak in the game
    Then the chance it reaches "Reims" this plague week is the road's chance times the crowding of "Reims"
    When the country "France" closes "Reims"
    Then the chance it reaches "Reims" this plague week is a quarter of that

  @PROV-343
  Scenario: Nothing leaves a closed province by trade
    Given the province "Troyes" has a plague outbreak in the game
    And the country "France" closes "Troyes"
    When a plague week passes in which every road, river and sea route would carry plague
    Then no province next to "Troyes" catches it
    When the country "France" lifts the quarantine on "Troyes"
    And a plague week passes in which every road, river and sea route would carry plague
    Then every healthy province next to "Troyes" catches it

  @PROV-344
  Scenario: An army carries plague
    Given the province "Troyes" has a plague outbreak in the game
    And an army of "France" stands in "Troyes" on a plague week
    When the army stands in "Reims" on a plague week in which every army would carry plague
    Then the province "Reims" has plague "rumour"

  @PROV-345 @PROV-349
  Scenario: Plague runs its weeks in the game
    Given plague breaks out in the player's province "Troyes"
    Then the province "Troyes" has plague "rumour"
    And the player hears that plague reached "Troyes"
    When 4 plague weeks pass
    Then the province "Troyes" has plague "outbreak"
    When plague weeks pass until the plague in "Troyes" is gone
    Then its outbreak lasted a season or two
    And the player hears once that the plague in "Troyes" burned out
    And plague cannot break out in "Troyes" again for 12 years

  @PROV-346
  Scenario: Plague kills townsfolk first in the game
    Given the province "Troyes" has a plague outbreak in the game
    When a plague week passes
    Then the townsfolk of "Troyes" die faster than its countryfolk
    And the dead of the plague in "Troyes" are counted

  @PROV-347
  Scenario: Closing a province against plague
    Given the province "Troyes" has a trade ratio of 40 in the game
    When the country "France" closes "Troyes"
    Then the trade ratio of "Troyes" is 0
    And "Troyes" pays at most half its tax
    When the country "France" lifts the quarantine on "Troyes"
    Then "Troyes" is open

  @PROV-348
  Scenario: The AI closes its crowded towns
    Given "Troyes" is a crowded town of an AI realm with plague "rumour"
    When 4 plague weeks pass
    Then its realm has closed "Troyes"
    When plague weeks pass until the plague in "Troyes" is gone
    Then its realm has opened "Troyes" again

  @PROV-350
  Scenario: Plague is kept in the save
    Given the province "Troyes" has a plague outbreak in the game
    And the country "France" closes "Reims"
    When the plague game is saved and loaded
    Then the province "Troyes" has plague "outbreak"
    And "Reims" is closed

  @PROV-301 @placeholder
  Scenario Outline: Sickness by land
    Given an army of 10,000 men in land with <sickness> sickness
    When a month passes
    Then it loses <lost> men to sickness

    Examples:
      | sickness   | lost |
      | Low        | 0    |
      | Medium     | 100  |
      | High       | 200  |
      | Heat       | 200  |
      | Cold       | 200  |
      | fever land | 200  |
