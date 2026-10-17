@context-diplomacy
Feature: Diplomacy screen and lens
  As a player
  I want a map lens and a country card for diplomacy
  So that I see my relations at a glance and act from one place

  @DIPL-183
  Scenario Outline: Lens colours
    Given the player plays "Hungary"
    And the country "<country>" is <relation> to "Hungary"
    When the player opens the diplomacy lens
    Then the country "<country>" is coloured "<colour>"

    Examples:
      | country      | relation                         | colour                     |
      | Ragusa       | a subject                        | the colour of Hungary      |
      | Wallachia    | an ally                          | blue                       |
      | Moldavia     | pledged                          | light blue                 |
      | Poland       | Close                            | green                      |
      | Bohemia      | Warm                             | pale green                 |
      | Venice       | Cool                             | grey                       |
      | Portugal     | nothing recorded                 | grey                       |
      | Serbia       | Cold                             | orange                     |
      | Milan        | a Rival                          | orange                     |
      | Austria      | Hostile                          | red                        |
      | Ottomans     | at war                           | red, hatched               |

  @DIPL-183
  Scenario: A league against you has a red border
    Given a league against "Hungary" exists
    When the player opens the diplomacy lens
    Then the league's members are shown with a red border

  @DIPL-184
  Scenario Outline: What each zoom shows
    Given an envoy of "Hungary" is on the road to "Venice"
    And the country "Hungary" holds a war aim against "Ottomans"
    When the diplomacy lens is at "<zoom>" zoom
    Then <shown>

    Examples:
      | zoom     | shown                                                                    |
      | world    | only the colours show                                                    |
      | regional | the envoy rider and its dotted route show, and a crossed sword over "Ottomans" |

  @DIPL-185 @DIPL-082
  Scenario: The country diplomacy card of Venice
    Given the diplomacy rules are in force
    When the player taps "Venice" on the diplomacy lens
    Then the card shows "Toward you: Cool (+10)" and "You toward them: Cool"
    And the card lists the tie "Same faith (Catholic)" at +10 and no wrongs
    And the card shows "at war with Ottomans · allied with Florence"
    And the card shows "Your war aims on them: none"
    And the card shows "Last answer: Alliance, NO (-13)" with a "Why?" button
    And the action buttons show no prediction

  @DIPL-185
  Scenario: Why? opens the reasons
    Given the last answer of "Venice" was "no" at -13
    When the player taps "Why?"
    Then the full reasons list with every number is shown

  @DIPL-186
  Scenario: The envoy picker
    Given the diplomacy rules are in force
    When the player taps "Alliance" on the card of "Venice"
    Then the envoy picker shows each available official, the days on the road, and which province loses its official meanwhile

  @DIPL-187
  Scenario: Landscape layout
    Given the screen is in landscape
    When the player opens the card of "Venice"
    Then the card sits on the right of the map instead of covering it

  @DIPL-188
  Scenario: The envoys strip
    Given the country "Hungary" has 3 seats: one free, one on the road to "Venice" with 14 days left, one resident in "Rome"
    When the game evaluates it
    Then the envoys strip shows "free", "Venice 14 days" and "resident Rome"
