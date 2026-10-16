@context-world-map
Feature: Map versions and credits
  As the game
  I want the map to come from the build, with a hash and a rename table
  So that saves stay small and old saves still load on a changed map

  @MAP-041
  Scenario: Map data is never saved
    Given a campaign in "May 1492"
    When it is saved
    Then the save holds no adjacency, terrain, water, rivers or province shapes

  @MAP-042
  Scenario: Splitting a province writes a rename table
    Given the province "Schleswig-Holstein" holds the ports of Lübeck, Hamburg, Kiel and Flensburg
    When the map generator splits it into two provinces
    Then a rename table maps the old id to the two new ids with their shares

  @MAP-043
  Scenario: A save records the map it was made on
    Given a campaign on the built map
    When it is saved
    Then the save header records the map's hash

  @MAP-044
  Scenario Outline: The map credits its data sources
    Given the credits of the game
    When the map's sources are listed
    Then "<source>" is credited under "<licence>"

    Examples:
      | source                                         | licence        |
      | Natural Earth                                  | public domain  |
      | Köppen-Geiger maps (Beck et al. 2018)          | CC BY 4.0      |
      | WWF terrestrial ecoregions (Olson et al. 2001) | cited source   |
