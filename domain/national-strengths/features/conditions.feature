@context-national-strengths
Feature: Heritage conditions
  As the heritage system
  I want conditions in the event tree's language plus six of my own
  So that needs, wakes, stir, goal and shed can be tested

  @HER-040 @HER-041
  Scenario Outline: Heritage condition types
    Given the country "<country>" <state>
    When the condition "<condition>" is tested with this as "<country>"
    Then it holds

    Examples:
      | country  | state                                       | condition                                  |
      | Muscovy  | knows "R1"                                  | knows R1                                   |
      | Venice   | owns the province holding "Cyprus"          | holds_place Cyprus                         |
      | Portugal | owns a province with a harbour on the Atlantic | coastal atlantic                        |
      | Ming     | has 30 officials                            | count officials >= 30                      |
      | Portugal | has done the ambition "portugal_beyond_the_cape" | heritage portugal_beyond_the_cape done |
      | Muscovy  | has no overlord                             | independent                                |

  @HER-042
  Scenario: Reading relation
    Given "Wallachia" is a subject of "Hungary"
    When the condition relation who "Wallachia" other "Hungary" type "subject" is tested
    Then it holds
    And relation who "Hungary" other "Wallachia" type "overlord" holds

  @HER-043 @placeholder
  Scenario Outline: Counting buildings relative to the start
    Given the country "Castile" began the campaign with 6 markets
    And it now has <markets> markets
    When the condition count "building:market" >= "start*2" is tested
    Then it <holds>

    Examples:
      | markets | holds          |
      | 11      | does not hold  |
      | 12      | holds          |

  @HER-044
  Scenario: Place names are bound to provinces
    Given a heritage condition uses the place "Kilwa"
    When its place names are bound to the map
    Then "Kilwa" is bound to the one land province nearest the place

  @HER-044
  Scenario: A place the map does not hold stays unbound
    Given a heritage condition uses the place "Atlantis"
    When its place names are bound to the map
    Then "Atlantis" stays on the list of places to bind
    And a holds_place condition on it does not hold
