@context-institutions
Feature: The Emperor's duties and rights
  As the Emperor
  I want to defend the members and be paid for it
  So that the crown is worth holding and outsiders think twice before attacking a member

  @INST-030 @placeholder
  Scenario Outline: Defend the Empire
    # config: empire.defence.answer, empire.defence.refuse
    Given "Austria" is the Emperor with hold 40
    When "France" declares war on the member "Lorraine"
    Then "Austria" is called to defend "Lorraine"
    When "Austria" <answer>
    Then the Empire's hold is <hold>

    Examples:
      | answer             | hold |
      | answers the call   | 50   |
      | refuses the call   | 25   |
      | does not answer    | 25   |

  @INST-030
  Scenario: Refusing leaves a wrong
    Given "France" has declared war on the member "Lorraine"
    When the Emperor refuses the call to defend "Lorraine"
    Then "Lorraine" and every elector hold the wrong "Left us to our fate" toward the Emperor

  @INST-031
  Scenario: Restore imperial land
    Given "Burgundy" is not a member and holds imperial land
    Then the Emperor holds the war aim "Restore imperial land" on "Burgundy"

  @INST-032 @placeholder
  Scenario: Dues
    # config: empire.dues_per_member
    Given the Empire has 18 members and hold 50
    When a new month begins
    Then the Emperor receives 9 gold in dues

  @INST-033 @placeholder
  Scenario: A year of war between members
    # config: empire.hold_year
    Given "Saxony" and "Brandenburg", both members, are at war all year
    And no non-member holds imperial land
    When January begins
    Then the hold record shows -3 for the war between "Saxony" and "Brandenburg"
    And no gain for peace in the Empire

  @INST-034
  Scenario: The Emperor is bound by the Public Peace
    Given the Public Peace has passed
    When the Emperor declares war on the member "Bavaria"
    Then the Emperor is a Breaker of the Peace
