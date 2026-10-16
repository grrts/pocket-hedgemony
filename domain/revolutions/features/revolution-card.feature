@context-revolutions
Feature: The revolution card
  As a player
  I want a card that shows a coming revolution's signs and how to ease them
  So that I can plan before it breaks out

  Background:
    Given the revolution "french_revolution" needs 4 of 6 signs and warns at 3
    And the revolution "french_revolution" requires its country to be a monarchy

  @REVO-001 @REVO-003 @REVO-006 @REVO-078
  Scenario: The card appears once a sign is lit (France 1789)
    Given the country "France" is a monarchy
    And the country "France" has debt above 2000 gold
    And a quarter of the people of "France" want a constitution
    And the crown of "France" is distrusted
    When the turn's signs are evaluated
    Then the country screen of "France" shows the card "FRENCH REVOLUTION" as "brewing"
    And the card says "Breaks out at 4 of 6 signs"
    And the lit signs "Debt above 2,000 gold", "A quarter want a constitution" and "The crown is distrusted" are listed first
    And each lit sign shows how to ease it, such as "Cut court and army; tax lords"
    And the card lists the sparks "volcanic winter x2" and "revolution abroad won x1.5"
    And the card fits a phone width of about 40 characters

  @REVO-002
  Scenario: A republic never sees the card
    Given the country "Venice" is a merchant republic
    And the country "Venice" has debt above 2000 gold
    When the turn's signs are evaluated
    Then no card for "french_revolution" is shown for "Venice"

  @REVO-001
  Scenario: No sign lit, no card
    Given the country "France" is a monarchy
    And no sign of "french_revolution" is lit for "France"
    When the turn's signs are evaluated
    Then no card for "french_revolution" is shown for "France"

  @REVO-004 @placeholder
  Scenario Outline: The bar colour follows warn_at and need
    # config: revolutions.french_revolution.signs.warn_at, .need
    Given the country "France" is a monarchy
    And <lit> signs of "french_revolution" are lit for "France"
    When the turn's signs are evaluated
    Then the card's bar is "<colour>"

    Examples:
      | lit | colour  |
      | 1   | neutral |
      | 2   | neutral |
      | 3   | amber   |
      | 4   | red     |
      | 6   | red     |

  @REVO-005
  Scenario: The player can see what happens before it breaks out
    Given the card "french_revolution" is shown for "France"
    When the player opens "What happens if it breaks out"
    Then the stances are listed with the regime each leads to
    And "Proclaim the new order" leads to the regime "revolutionary_republic"
    And "Grant a constitution" leads to the regimes "crown_and_assembly" and "emancipation"
    And "Restore order" leads to a rising that ends in "revolutionary_republic" if won or "reaction" if crushed
