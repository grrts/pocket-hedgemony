@context-diplomacy
Feature: Gifts, insults and rivals
  As a country
  I want simple ways to warm or sour a relation
  So that I can prepare an ask or a quarrel

  @DIPL-131 @placeholder
  Scenario Outline: Gifts
    # config: ledger.ties.gift
    Given the diplomacy rules are in force
    When the country "A" sends the country "B" a gift of <gold> gold
    Then the ledger of "B" toward "A" gains "Gift" at <weight> fading over 10 years

    Examples:
      | gold | weight |
      | 50   | 10     |
      | 100  | 20     |
      | 150  | 30     |
      | 400  | 30     |

  @DIPL-132 @DIPL-036
  Scenario: An insult
    Given the lord "Count Pál" of "Hungary" is Warlike and wants a war with "Austria"
    When the country "Hungary" insults the country "Austria"
    Then the stance of "Austria" toward "Hungary" is "hostile"
    And the ledger of "Austria" toward "Hungary" holds "Insulted us" at -20
    And the loyalty of "Count Pál" rises one step
    And the country "Austria" holds the war aim "Punish" against "Hungary"

  @DIPL-133 @DIPL-014
  Scenario Outline: Declaring a rival needs a contested object
    Given the diplomacy rules are in force
    When the country "England" declares the country "France" a rival over <object>
    Then the declaration is <result>

    Examples:
      | object              | result   |
      | the crown of France | accepted |
      | nothing named       | refused  |
