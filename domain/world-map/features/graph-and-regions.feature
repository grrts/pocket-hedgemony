@context-world-map
Feature: The province graph and regions
  As the game
  I want one graph of provinces and sea zones and named regions over it
  So that every mover plans on the same map and events can name places

  @MAP-036 @MAP-037
  Scenario: Land and sea are one graph
    Given a coastal province touching a sea zone
    When the graph is read
    Then the province and the sea zone are neighbours
    And the province is marked coastal

  @MAP-038
  Scenario: Neighbour lists are symmetric
    Given the built map
    When every neighbour list is checked
    Then whenever a place lists another, the other lists it back

  @MAP-039
  Scenario Outline: The event tree's macro-regions are used
    Given the macro-region "<region>"
    When the regions are read
    Then it exists with its sub-regions and areas

    Examples:
      | region                               |
      | Europe                               |
      | Middle East                          |
      | North Africa                         |
      | Sub-Saharan Africa                   |
      | South Asia                           |
      | Central and North Asia               |
      | East Asia                            |
      | Southeast Asia                       |
      | Oceania                              |
      | North America                        |
      | Mesoamerica and Central America      |
      | The Caribbean                        |
      | South America                        |

  @MAP-040
  Scenario Outline: Each anchor province resolves to one map province
    Given the event-tree anchor "<anchor>" in the area "<area>"
    When it is resolved on the map
    Then exactly one province is returned
    And it is the province "<province>"

    Examples:
      | anchor         | area              | province            |
      | Constantinople | thrace            | Istanbul            |
      | Potosí         | upper_peru        | Northeast Potosí    |
      | Malacca        | malaya_and_borneo | Selangor            |
      | Timbuktu       | niger_bend        | Southeast Timbuktu  |
      | Kyoto          | kinai             | Mie                 |
      | Vienna         | lower_austria     | Wien                |

  @MAP-040
  Scenario: Every anchor of the event tree is on the map
    Given the event tree's 25 anchor provinces
    When they are resolved on the map
    Then each resolves to one land province
