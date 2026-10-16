@context-realm
Feature: How events and the AI use the realm's stats
  As the game
  I want the event tree and the AI to read the same counts the player sees
  So that nothing abstract hides behind the numbers

  @REALM-140 @open-question
  Scenario Outline: Event-tree country stats become concrete stats
    # OQ-REALM-3 (war_weariness, prestige), OQ-REALM-4 (admin_capacity)
    Given an event reads the country stat "<event_stat>"
    When the event is evaluated
    Then it reads <realm_stats>

    Examples:
      | event_stat              | realm_stats                                        |
      | legitimacy              | loyal lords, heirs and years on throne             |
      | stability               | loyal lords and provinces in revolt                |
      | war_weariness           | Fallen                                             |
      | prestige                | battles won and lands taken                        |
      | admin_capacity          | officials                                          |
      | tech_* and innovation   | inventions from the research tree                  |
      | literacy                | scholars and schools per thousand people           |
      | food_security           | local store, castle store, harvest and herds       |
      | debt                    | debt                                               |
      | treasury                | gold                                               |
      | navy_strength           | warships                                           |
      | naval_reach             | warships                                           |
      | army_strength           | soldiers                                           |
      | manpower                | recruits                                           |

  @REALM-141 @REALM-142
  Scenario Outline: AI personalities read the same counts
    Given the AI country "<ai>" has the personality "<personality>"
    And its neighbour "<neighbour>" <state>
    When the AI plans its turn
    Then it <action>

    Examples:
      | ai       | personality      | neighbour | state                              | action                              |
      | Ottomans | opportunist      | Hungary   | has wavering lords                 | considers attacking "Hungary"       |
      | Ottomans | opportunist      | Hungary   | has just lost many soldiers        | considers attacking "Hungary"       |
      | Korea    | isolationist     | Ming      | is strong                          | fills its schools and avoids war    |
      | France   | hegemon seeker   | England   | is weak                            | keeps its recruits for the army     |
