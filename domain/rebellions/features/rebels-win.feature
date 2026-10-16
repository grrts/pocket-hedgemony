@context-rebellions
Feature: If the rebels win
  As the game
  I want rebels who hold out to win what their cause asked for
  So that ignoring a rising has a real price

  @REBL-056 @placeholder
  Scenario Outline: When rebels win
    # config: rebellions.win_hold_months
    Given a rising holds its provinces of the country "France"
    And <condition>
    When the month is processed
    Then the rising is won

    Examples:
      | condition                                                    |
      | the rising has held them for 12 months with no army defeating it |
      | the rebels take the capital                                   |

  @REBL-056
  Scenario: Eleven months is not enough
    Given a rising has held its provinces for 11 months with no army defeating it
    And the rebels do not hold the capital
    When the month is processed
    Then the rising is not yet won

  @REBL-057 @placeholder
  Scenario Outline: What each cause wins
    # config: rebellions.outcomes, rebellions.tax_win_years
    Given a rising with the cause "<cause>" holds the province "Troyes"
    When the rising is won
    Then <result>

    Examples:
      | cause    | result                                                                                         |
      | Hunger   | the castle's food is handed out, "Hungry" ends and the lord of "Troyes" turns disloyal         |
      | Tax      | the tax rate in the rebels' provinces is fixed at light for 10 years                           |
      | Faith    | every province the rebels held gets a faith tolerance charter                                  |
      | Town     | "Troyes" gets a town law charter and the quartered army leaves                                 |
      | New ideas| the government of the owner changes to the rebels' through the event tree's revolution events  |

  @REBL-057
  Scenario: A faith great revolt puts a ruler of their faith on the throne
    Given a faith rising of the country "France" is a "Great revolt"
    When the rising is won
    Then "France" gets a ruler of the rebels' faith

  @REBL-057
  Scenario Outline: Lord and pretender risings
    Given a rising with the cause "<cause>" holds the province "Troyes"
    When the rising is won
    Then one of these happens: <results>

    Examples:
      | cause     | results                                                                                     |
      | Lord      | the lord gets his want; or he leaves the realm with his land as his own country or under a neighbour |
      | Pretender | the pretender takes the throne in a great revolt; or the province passes to the pretender  |

  @REBL-057 @REBL-058
  Scenario Outline: A homeland rising breaks away as a new country
    Given a homeland rising of the people "<people>" holds the provinces "<provinces>"
    When the rising is won
    Then the provinces "<provinces>" break away as a new country
    And the new country is <country>

    Examples:
      | people  | provinces          | country                                                    |
      | Breton  | Rennes, Nantes     | the catalogue entity for that people, because one fits     |
      | a people with no catalogue entity | their homeland's provinces | a new country named for the homeland, because none fits |
