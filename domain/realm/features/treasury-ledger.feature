@context-realm
Feature: Tax rates and the treasury ledger
  As a player or AI country
  I want each province taxed at a rate I choose and a monthly ledger of my gold
  So that I can see where the gold comes from and goes, and borrow when I must

  @REALM-177 @placeholder
  Scenario: Each province pays at its own rate or the realm default
    # config: economy.taxRateFactor
    Given the game starts with the country "France"
    Then the realm tax default of "France" is "normal"
    And the province "Yvelines" follows the realm default
    When "France" taxes the province "Yvelines" "heavy"
    And "France" sets the realm tax default to "light"
    Then the province "Yvelines" pays at "heavy"
    And a province of "France" without its own rate pays at "light"
    When "France" puts the province "Yvelines" back on the realm default
    Then the province "Yvelines" pays at "light"

  @REALM-177 @placeholder
  Scenario Outline: Five rates, five sums
    # config: economy.taxRateFactor
    Given the game starts with the country "France"
    When "France" taxes the province "Yvelines" "<rate>"
    Then the province "Yvelines" pays <factor> times its tax at "normal"

    Examples:
      | rate     | factor |
      | none     | 0      |
      | light    | 0.5    |
      | normal   | 1      |
      | heavy    | 1.5    |
      | crushing | 2      |

  @REALM-177
  Scenario: Only the owner sets a province's rate
    Given the game starts with the country "France"
    When "France" taxes the province "Cambridgeshire" "heavy"
    Then the order is refused with "not your province"

  @REALM-178
  Scenario: Trade does not follow the tax rate
    Given the game starts with the country "France"
    When "France" sets the realm tax default to "none"
    Then the ledger of "France" shows no tax
    And the ledger of "France" shows trade

  @REALM-179
  Scenario: The month's ledger
    Given the game starts with the country "France"
    Then the ledger of "France" has the lines "tax", "trade", "army pay", "officials", "interest", "works", "schools" and "grain"
    And the monthly income of "France" is the sum of its ledger
    When a new month begins
    Then the month's income is paid into the treasury of "France"

  @REALM-180 @placeholder
  Scenario: Officials are paid while they hold their posts
    # config: economy.officialWagePerMonth
    Given the game starts with the country "France"
    Then the officials line of "France" is one wage for each official at his post
    When "France" commissions the official of "Yvelines"
    Then the officials line of "France" is one wage smaller

  @REALM-181 @REALM-188 @placeholder
  Scenario: Borrowing adds the interest to the debt at once
    # config: debt.interest_pct, debt.loan_cap_years_income, debt.interest_added_at_once_years
    Given the game starts with the country "Castile"
    Then lenders would let "Castile" owe a year's tax and trade
    When "Castile" borrows 100 gold
    Then "Castile" has 100 gold more and owes 110 gold
    And the interest line of "Castile" is 10 % of 110 gold a year, paid monthly
    And lenders would let "Castile" owe 110 gold less
    When "Castile" borrows more than lenders would give
    Then the order is refused

  @REALM-181 @REALM-188
  Scenario: Repaying
    Given the game starts with the country "Castile"
    And "Castile" borrows 100 gold
    When "Castile" repays 40 gold
    Then "Castile" owes 70 gold
    When "Castile" repays 1000 gold
    Then "Castile" owes nothing
    When "Castile" repays 10 gold
    Then the order is refused with "nothing owed"

  @REALM-189 @placeholder
  Scenario: Borrowing unsettles the lords, once a year
    # config: debt.lords_waver_once_per_months
    Given the game starts with the country "France"
    When "France" borrows 10 gold
    Then every lord of "France" is a step less loyal
    When "France" borrows 10 gold
    Then the lords of "France" are as loyal as before that loan

  @REALM-182 @REALM-171
  Scenario Outline: The AI's treasury
    Given the game starts with the AI country "Hungary"
    And "Hungary" is <state> with <gold> gold
    When the AI plans its treasury
    Then the realm tax default of "Hungary" is "<tax>"
    And "Hungary" <loan>

    Examples:
      | state    | gold | tax    | loan                                 |
      | at peace | 100  | normal | owes nothing                         |
      | at war   | -50  | heavy  | borrows enough to bring its gold above zero |

  @REALM-183
  Scenario: Setting a province's rate from its card
    Given the player rules "France"
    When the player opens the Overview tab of the province "Yvelines"
    Then it shows a Tax line with the rate, whether it follows the realm default, and the gold it pays a month
    And a row of buttons sets the rate to Realm default, None, Light, Normal, Heavy or Crushing

  @REALM-184
  Scenario: The Treasury tab
    Given the player rules "France"
    When the player opens the Treasury tab of the country card
    Then it shows gold, its change a month and the month's ledger line by line
    And it sets the realm tax default
    And it shows the debt, its interest and what lenders would still give, with buttons to borrow and repay

  @REALM-185
  Scenario: The gold plaque opens the Treasury tab
    Given the player rules "France"
    When the player taps the gold plaque
    Then the Treasury tab of the country card opens
