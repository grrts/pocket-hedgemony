@context-revolutions
Feature: Revolutions and the AI
  As an AI country
  I want to ease signs, choose stances and fund revolutions by my personality
  So that computer players treat revolutions the way a player could

  @REVO-070
  Scenario Outline: The AI eases signs by personality
    Given the AI country "<country>" has an amber card with the lit signs "<signs>"
    And its ruler is "<trait>"
    When the AI plans its turn
    Then it eases "<eased>" first

    Examples:
      | country | trait   | signs                                    | eased                  |
      | Mughals | pious   | a faith sign, a tax sign                 | the faith sign         |
      | France  | miserly | a tax sign, a debt sign                  | the debt sign, not by cutting taxes |

  @REVO-071
  Scenario: The AI weights options
    Given the event "french_revolution" fires for the AI country "France"
    When the AI weighs its options
    Then the historical option's weight is multiplied by 3
    And the Fight option is weighted by the army of "France" against the rising's expected size
    And the Lead option is weighted up when the ruler's ideology matches the cause

  @REVO-072
  Scenario: An émigré court funds its pretender
    Given the AI country "Austria" hosts the émigré court of "France"'s old dynasty
    And "Austria" is a rival of the revolutionary state "France"
    When the AI plans its turn
    Then "Austria" funds the pretender abroad

  @REVO-073
  Scenario: Stronger monarchies use the counter-revolution reason
    Given the AI monarchy "Prussia" holds a counter-revolution reason against "France"
    And "Prussia" is stronger than "France"
    When the AI plans its turn
    Then "Prussia" may use the counter-revolution reason to go to war

  @REVO-074
  Scenario Outline: The AI funds a rival's revolution
    Given the AI country "England" is a rival of "France"
    And the card of "french_revolution" in "France" is "<colour>"
    And "England" and "France" <allied>
    When the AI plans its turn
    Then "England" <funds> the revolution

    Examples:
      | colour  | allied          | funds        |
      | amber   | are not allied  | funds        |
      | red     | are not allied  | funds        |
      | neutral | are not allied  | does not fund|
      | red     | are allied      | does not fund|
