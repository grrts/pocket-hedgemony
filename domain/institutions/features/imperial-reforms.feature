@context-institutions
Feature: The Diet and the imperial reforms
  As the Emperor
  I want to win the members over to reforms one at a time
  So that the Empire keeps the peace inside and settles quarrels without war

  @INST-040 @placeholder
  Scenario Outline: When the Diet may be called
    # config: empire.diet
    Given the Empire has hold <hold>
    And the last Diet sat <years> years ago
    Then the Emperor <may> call the Diet

    Examples:
      | hold | years | may     |
      | 50   | 5     | may     |
      | 49   | 10    | may not |
      | 80   | 4     | may not |

  @INST-041 @placeholder
  Scenario: Electors count twice
    # config: empire.diet
    Given a Diet sits on the Public Peace with 15 members, 7 of them electors
    And 5 electors and 2 other members vote yes
    When the Diet ends
    Then the votes are 12 yes to 10 no
    And the Public Peace passes and the hold falls by 30

  @INST-041 @placeholder
  Scenario: A failed reform
    Given a Diet sits on the Imperial Court with hold 55
    And over half the votes are no
    When the Diet ends
    Then the Imperial Court has not passed
    And the Empire's hold is 45

  @INST-042
  Scenario: Breaker of the Peace
    Given the Public Peace has passed
    When "Brandenburg" declares war on "Pomerania"
    Then "Brandenburg" is a Breaker of the Peace
    And the Emperor and every member hold a war aim on "Brandenburg"
    And the Emperor is called to defend "Pomerania"

  @INST-043
  Scenario: Taking it to court
    Given the Imperial Court has passed
    And "Bavaria" holds a war aim on a province of "Württemberg"
    When "Bavaria" takes it to court and the ruling is for "Bavaria"
    Then the province moves to "Bavaria" with no war

  @INST-043
  Scenario: Refusing a ruling
    Given the Imperial Court has ruled that "Hesse" hands a province to "Palatinate"
    When "Hesse" refuses the ruling
    Then "Hesse" is a Breaker of the Peace

  @INST-044
  Scenario: Circles defend their own
    Given the Circles reform has passed
    And "Saxony" and "Brandenburg" are in the same circle
    When "Poland" declares war on "Brandenburg"
    Then "Saxony" joins the defence of "Brandenburg"

  @INST-045 @placeholder
  Scenario: Common Tax
    # config: empire.common_tax
    Given the Common Tax has passed
    And "Saxony" collects 100 gold of tax in a month
    When the month ends
    Then "Saxony" pays 5 gold to the Emperor
    And the Emperor receives no dues

  @INST-046 @placeholder
  Scenario: Imperial Army
    # config: empire.contingent
    Given the Imperial Army has passed
    And "Saxony" has 10000 soldiers
    When the Emperor defends the Empire in a war
    Then the Emperor commands a contingent of 1000 soldiers of "Saxony" until the peace

  @INST-047
  Scenario: Hereditary Crown
    Given the Hereditary Crown has passed
    When the Emperor's realm gets a new ruler
    Then no election is held and the new ruler holds the crown

  @INST-048 @placeholder
  Scenario: One Realm
    # config: empire.one_realm_hold
    Given the six reforms before One Realm have passed and hold is 80
    When One Realm passes
    Then the ruler of every other member is a great lord of the Emperor with his land, Wavering
    And the Empire has ended

  @INST-040
  Scenario: Reforms pass in order
    Given the Public Peace has not passed
    Then the Diet can only be called on the Public Peace
