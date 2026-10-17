@context-map-presentation
Feature: Seasons on the map
  As a player
  I want the map to change with the seasons
  So that I can see winter, harvest time and the wet season at a glance

  @VIEW-072 @placeholder
  Scenario Outline: Each province takes its season's palette
    Given a province at latitude <latitude><kind>
    When the map is drawn in <month>
    Then its tiles take the "<palette>" palette

    Examples:
      | latitude | kind                          | month    | palette      |
      | 60       |                               | January  | snow         |
      | 48       |                               | January  | base         |
      | 45       | , a mountain province         | January  | snow         |
      | 48       |                               | April    | spring green |
      | 48       |                               | July     | base         |
      | 48       |                               | October  | autumn gold  |
      | -55      |                               | July     | snow         |
      | -30      |                               | October  | spring green |
      | 15       | , a dry land of monsoon_asia  | July     | wet season   |
      | 15       | , a dry land of monsoon_asia  | January  | base         |

  @VIEW-073
  Scenario: Palettes swap once a month and cannot be turned off
    Given 3 provinces at latitudes 60, 48 and 45
    When the month turns from November to December
    Then each province's palette is chosen once for December
    And no setting turns the season palettes off
