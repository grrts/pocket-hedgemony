@context-revolutions
Feature: Funding a revolution abroad
  As a rival country
  I want to fund a revolution brewing in another country
  So that it breaks out sooner, at the risk of being caught (decided 16 Oct 2026)

  @REVO-060 @open-question
  Scenario Outline: Only a brewing revolution seen through a diplomat can be funded
    # OQ-REVO-1: diplomacy 6.11 designs the same action with other numbers
    Given the country "England" <diplomat> a diplomat in "France"
    And the revolution "french_revolution" is at the stage "<stage>" for "France"
    When "England" tries to fund the revolution "french_revolution" in "France"
    Then the funding is <result>

    Examples:
      | diplomat     | stage   | result  |
      | has          | Brewing | allowed |
      | has          | Ready   | allowed |
      | has          | Quiet   | refused |
      | does not have| Brewing | refused |

  @REVO-061 @REVO-062 @placeholder @open-question
  Scenario: Funding costs gold and speeds the revolution
    # config: foreign_backing.cost, foreign_backing.mult, foreign_backing.joins_mult; OQ-REVO-1
    Given the yearly income of "France" is 1000 gold
    And "England" funds the revolution "french_revolution" in "France"
    When the month is processed
    Then "England" pays 10 gold
    And "France" has the flag "revolution_funded"
    And the spark "Foreign gold backs the movement" multiplies the chance by 2
    And if the revolution becomes a rising its camp's join shares are multiplied by 1.5

  @REVO-063 @REVO-064 @placeholder @open-question
  Scenario: Being caught
    # config: foreign_backing.catch_chance; OQ-REVO-1
    Given "England" funds the revolution "french_revolution" in "France"
    When the caught roll of 3 percent succeeds
    Then the funding ends
    And "France" no longer has the flag "revolution_funded"
    And "France" gains the opinion reason "Funded a revolution against us" toward "England"
    And "France" gains a reason to fight "England"
    And the card of "french_revolution" names "England" as the funder

  @REVO-063
  Scenario Outline: The caught chance rises with officials and peace
    Given "England" funds a revolution in "France"
    And "France" <state>
    When the caught chance is computed
    Then it is higher than the base chance

    Examples:
      | state                         |
      | has more officials            |
      | is at peace                   |

  @REVO-065 @placeholder
  Scenario Outline: A funded revolution that wins remembers its friend
    # config: foreign_backing.win_opinion
    Given "England" funded the revolution "french_revolution" in "France"
    And the regime "<regime>" applies to "France"
    When the opinion of "France" toward "England" is computed
    Then it <change>

    Examples:
      | regime                 | change                                                     |
      | crown_and_assembly     | starts at +25                                              |
      | revolutionary_republic | gets no +25, because the regime is hostile to monarchies    |
