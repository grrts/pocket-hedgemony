@context-realm
Feature: Food in the provinces
  As the game
  I want each province to grow, store and eat its own food
  So that hunger is local and visible

  @REALM-020
  Scenario: Food lives in provinces and castles are the hubs
    Given the country "France" has 52 provinces and 9 castles
    When the year of food runs
    Then each province grows, stores and eats its own food
    And the castles collect and spread food to the land around them

  @REALM-021
  Scenario Outline: What makes a harvest better or worse
    Given the province "Troyes" would have a "normal" harvest
    When <cause>
    Then its harvest is <direction>

    Examples:
      | cause                                         | direction |
      | the country knows a rotation invention        | better    |
      | the province is at peace                      | better    |
      | the weather roll for its region is bad        | worse     |
      | an army marches through                       | worse     |
      | its tiles are burned                          | worse     |
      | plague kills its farmers                      | worse     |
      | a cold period of the event tree's climate stats begins | worse |

  @REALM-022 @REALM-023
  Scenario: The local store runs out and the province starves
    Given the province "Troyes" has 1 month of food in its local store
    And no castle delivers food to it
    When a month passes with its people eating
    Then the local store of "Troyes" is at zero
    And the province "Troyes" starves

  @REALM-022
  Scenario Outline: The local store fills and empties
    Given the province "Troyes" has 5 months of food in its local store
    When <cause>
    Then its local store is <direction>

    Examples:
      | cause                                              | direction |
      | the harvest leaves a surplus after collection      | higher    |
      | a castle delivers food                             | higher    |
      | an army refills its food reserve there             | lower     |
      | the yearly rot takes its share                     | lower     |
      | raiders strike                                     | lower     |

  @REALM-024
  Scenario Outline: Herds grow and shrink
    Given the steppe province "Kazan" has 40 thousand head of herds
    When <cause>
    Then its herds are <direction>

    Examples:
      | cause                         | direction |
      | a year on good pasture        | larger    |
      | a raid brings animals home    | larger    |
      | a drought strikes             | smaller   |
      | a hard winter strikes         | smaller   |
      | disease strikes               | smaller   |
      | famine forces slaughter       | smaller   |

  @REALM-024
  Scenario: Herds cannot be besieged
    Given the people of "Kazan" eat from their herds
    When an enemy army besieges the castle of "Kazan"
    Then the herds move with their owners and are not besieged

  @REALM-025
  Scenario Outline: Fish
    Given the coastal province "Lisboa" has a steady fish catch
    When <cause>
    Then its fish catch is <direction>

    Examples:
      | cause                                | direction |
      | more fishing boats are built          | higher    |
      | the country learns a salting invention | higher   |
      | an enemy fleet blockades the coast    | lower     |
      | war at sea reaches the coast          | lower     |

  @REALM-026 @open-question
  Scenario Outline: The grain price follows harvests, war and trade
    # OQ-REALM-1: the market mechanism after trade v2
    Given the grain price on the market nearest "Troyes" is steady
    When <cause>
    Then the grain price there <direction>

    Examples:
      | cause                                     | direction |
      | the harvests across the region are bad    | rises     |
      | war closes the roads                      | rises     |
      | a blockade closes the port                | rises     |
      | the harvests are good                     | falls     |
      | a trade route opens to the market         | falls     |
