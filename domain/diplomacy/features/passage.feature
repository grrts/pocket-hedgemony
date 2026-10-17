@context-diplomacy
Feature: Passage
  As a country
  I want my armies to cross foreign land only when I may
  So that marching through a neighbour is a diplomatic matter or an act of war

  @DIPL-116
  Scenario Outline: Who may enter a foreign country
    Given the country "A" and the country "B" <relation>
    When the game evaluates it
    Then the armies of "A" <may> enter the country "B"

    Examples:
      | relation                          | may     |
      | are at war                        | may     |
      | have B as a subject of A          | may     |
      | are allied                        | may     |
      | have passage granted by B to A    | may     |
      | are at peace with nothing else    | may not |

  @DIPL-117 @placeholder
  Scenario Outline: Asking for passage needs G8
    # config: actions.ask_passage.requires_invention
    Given the country "Savoy" <knows> "G8"
    When the country "Savoy" asks the country "Milan" for passage
    Then the ask is <result>

    Examples:
      | knows         | result  |
      | knows         | sent    |
      | does not know | refused |

  @DIPL-117 @placeholder
  Scenario Outline: The passage count
    # config: actions.ask_passage
    Given the likely target of the army of "A" is <target>
    When the country "A" asks the country "B" for passage
    Then the passage's own reasons total <number>

    Examples:
      | target                         | number |
      | a country Friendly with "B"    | -50    |
      | a country allied with "B"      | -50    |
      | an enemy of "B"                | 10     |
      | nobody "B" cares about         | -10    |

  @DIPL-118 @placeholder
  Scenario: Passage lasts two years and may be revoked
    # config: actions.ask_passage.months
    Given the date is "1520-03"
    When the country "Milan" grants passage to the country "Savoy"
    Then the passage lasts until "1522-03"
    When the country "Milan" revokes it in "1521-01"
    Then the passage ends that day
    And the country "Milan" gains no Oath broken

  @DIPL-119
  Scenario: Entering without passage is an act of war
    Given the country "A" has no passage through the country "B"
    When an army of "A" enters the country "B"
    Then the country "B" may declare war on "A" with the aim "Punish" this turn
    And the defensive calls of "B" count as answered to a war started by "A"
