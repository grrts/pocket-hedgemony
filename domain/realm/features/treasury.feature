@context-realm
Feature: Treasury
  As a player or AI country
  I want gold and debt counted with where they come from and where they go
  So that I can pay for everything and see the cost of borrowing

  @REALM-010
  Scenario Outline: Gold comes in
    Given the country "France" has 300 gold
    When it gains gold from <source>
    Then the country "France" has more than 300 gold

    Examples:
      | source                              |
      | taxes from royal provinces          |
      | a share of lords' taxes             |
      | trade                               |
      | tribute from subjects               |
      | selling grain                       |
      | loot and ransoms                    |
      | selling titles                      |

  @REALM-010
  Scenario Outline: Gold goes out
    Given the country "France" has 300 gold
    When it pays for <cost>
    Then the country "France" has less than 300 gold

    Examples:
      | cost                    |
      | soldiers' pay           |
      | officials' wages        |
      | school upkeep           |
      | building                |
      | debt interest           |
      | gifts and bribes        |
      | buying grain            |

  @REALM-011 @REALM-012
  Scenario: A loan brings gold and yearly interest
    Given the country "Castile" has no debt
    When the country "Castile" takes a loan from a bank
    Then the country "Castile" owes that bank
    And each year it pays interest on the debt

  @REALM-011
  Scenario Outline: Debt goes away
    Given the country "France" owes 200 gold to <lender>
    When <cause>
    Then the country "France" no longer owes that debt

    Examples:
      | lender                 | cause                                       |
      | a bank                 | it repays 200 gold                          |
      | the lord "Armagnac"      | the lender dies                             |
      | the city "Genoa"       | the lender is conquered                     |

  @REALM-013
  Scenario: Default wipes the debt and breaks an oath
    Given the country "Castile" owes 500 gold to the city "Genoa"
    When the country "Castile" defaults
    Then the country "Castile" owes nothing to "Genoa"
    And the country "Castile" has one more oath broken

  @REALM-014
  Scenario: A lord who is owed money gets more demanding
    Given the lord "Armagnac" has lent 100 gold to the country "France"
    When the lord "Armagnac" makes demands of the ruler
    Then the lord "Armagnac" is more demanding than if he were not owed money

  @REALM-015 @open-question
  Scenario: Heavy taxes fill the treasury but stir the realm
    # OQ-REALM-8: four or five tax steps
    Given the country "France" has the realm tax default "normal"
    When the country "France" raises the realm tax default to "heavy"
    Then more gold reaches the treasury
    And lords waver
    And provinces become more likely to revolt

  @REALM-015
  Scenario: A revolt forces the tax down
    Given the province "Troyes" of "France" is taxed "heavy"
    When rebels in "Troyes" force the tax down
    Then the tax rate of "Troyes" is lower
