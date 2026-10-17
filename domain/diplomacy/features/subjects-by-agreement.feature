@context-diplomacy
Feature: Subjects by agreement
  As a strong or a threatened country
  I want to offer overlordship or ask for protection by envoy
  So that a subject can be made without war

  @DIPL-126 @placeholder @open-question
  Scenario Outline: Offering overlordship
    # config: actions.offer_overlordship; OQ-DIPL-32 on the subjects design's fixed acceptance rule
    Given the country "B" has <threats> neighbours Hostile toward it or holding a claim on it
    And the country "A" <pledge> pledged protection to "B"
    And the country "B" has <castles> castles
    When the country "A" offers overlordship to the country "B"
    Then the offer's own reasons total <number>

    Examples:
      | threats | pledge   | castles | number |
      | 0       | has not  | 2       | -80    |
      | 2       | has      | 2       | -20    |
      | 1       | has      | 5       | -70    |

  @DIPL-126
  Scenario: The subjects context picks the kind
    Given the diplomacy rules are in force
    When the country "B" accepts the overlordship of the country "A"
    Then the subjects context makes "B" a subject of "A" with a kind it allows for that pair

  @DIPL-127 @placeholder
  Scenario: Asking a stronger country for protection
    # config: actions.ask_protection.base
    Given the diplomacy rules are in force
    When the country "Ragusa" asks the country "Hungary" for protection
    Then the count of "Hungary" holds the base -10
    And on yes the subjects context makes "Ragusa" a subject of "Hungary"
