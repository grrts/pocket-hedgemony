@context-realm
Feature: Castles as food hubs
  As a player
  I want castles to collect, store and spread food
  So that building castles extends the land I can feed

  @REALM-030
  Scenario Outline: The castle store fills and empties
    Given the castle of "Troyes" holds 6 months of food
    When <cause>
    Then the castle store of "Troyes" is <direction>

    Examples:
      | cause                                              | direction |
      | collection arrives from nearby provinces           | higher    |
      | another castle delivers food                       | higher    |
      | the country buys grain for it                      | higher    |
      | its garrison eats                                  | lower     |
      | it spreads food to the land around it              | lower     |
      | it hands out food to an army refilling at home     | lower     |
      | rot takes its share                                | lower     |
      | the castle is captured                             | emptied for its owner |

  @REALM-031
  Scenario Outline: Granary size
    Given the castle of "Troyes" has a granary
    When <cause>
    Then its granary size is <direction>

    Examples:
      | cause                                                   | direction |
      | the country builds a bigger granary for gold            | larger    |
      | the country learns "F7 Ever-normal granaries"           | larger    |
      | a siege damages it                                      | smaller   |
      | it is neglected                                         | smaller   |

  @REALM-032
  Scenario Outline: Reach in rings
    Given the castle of "Troyes" reaches 1 ring of provinces
    When <cause>
    Then its reach is <direction>

    Examples:
      | cause                                        | direction |
      | a road is built to the next ring             | longer    |
      | wagons and horses are added                  | longer    |
      | an invention improves transport              | longer    |
      | an enemy army cuts the road                  | shorter   |
      | winter comes                                 | shorter   |
      | the land is devastated                       | shorter   |

  @REALM-033
  Scenario: A province outside every castle's reach lives on its own harvest
    Given the province "Gascony" is outside the reach of every French castle
    When the year of food runs
    Then "Gascony" receives no castle food
    And it lives or starves on its own harvest
