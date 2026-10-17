@context-province
Feature: Tile states
  As the game
  I want war damage, empty farms and tired land shown as tile states
  So that the player sees damage on the map instead of as a meter

  @PROV-030
  Scenario: A tile carries at most one state
    Given the province "Troyes" has a fallow fields tile
    When an army burns that tile
    Then the tile's state is "Burned"
    And the tile has no other state

  @PROV-031
  Scenario Outline: Tiles burn
    Given the province "Troyes" has a farm tile with 12,000 farmers
    When <cause>
    Then the tile's state is "Burned"
    And the tile gives nothing
    And its workers become refugees or die

    Examples:
      | cause                                         |
      | an army forages beyond the foraging limit     |
      | an army loots the province                    |
      | the country "France" burns its own fields     |
      | raiders raid the province                     |
      | rebels burn the province                      |

  @PROV-032 @placeholder
  Scenario Outline: Burned tiles are rebuilt in peace
    # config: province.burned.rebuild_per_year
    Given the province "Troyes" has 2 burned tiles
    And the province "Troyes" <condition>
    When a year passes
    Then the province "Troyes" has <left> burned tiles

    Examples:
      | condition                    | left |
      | has people and is at peace   | 1    |
      | has war in the province      | 2    |

  @PROV-033
  Scenario: A building with fewer than half its workers is fallow
    Given the province "Troyes" has a farm with 12,000 job slots
    When plague leaves the farm with 5,000 farmers
    Then the farm tile's state is "Fallow"
    When farmers return and the farm has 6,000 farmers
    Then the farm tile is no longer "Fallow"

  @PROV-034 @PROV-035
  Scenario: Overworked fields wear out and recover
    Given the province "Troyes" has a fields tile farmed for decades with more people than the farm needs
    And the country "France" knows no rotation invention
    When the year ends
    Then the tile's state is "Worn"
    And the tile gives half its output
    When the tile goes 5 years without use
    Then the tile is no longer "Worn"

  @PROV-035
  Scenario: Rotation inventions make wearing rarer
    Given the country "France" knows the invention "F1 Three-field rotation"
    When the game works out the province's stats
    Then fields in French provinces wear out less often than without it

  @PROV-036
  Scenario: War damage is burned tiles, not a meter
    Given the province "Troyes" has 3 burned tiles of 12
    When the player looks at the province "Troyes"
    Then the damage is shown as 3 burned tiles
    And no devastation meter exists
