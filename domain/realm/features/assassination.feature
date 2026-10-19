@context-realm
Feature: Sending an assassin after a lord
  As a player
  I want to have a troublesome lord killed
  So that I am rid of him, at the price of every other lord's trust

  Background:
    Given the game starts with the country "France"

  @REALM-280 @placeholder
  Scenario: The assassin is paid whether or not he succeeds
    # config: lords.assassination.gold
    Given the treasury of "France" holds 100 gold
    When "France" sends an assassin after one of its lords and he is caught
    Then the treasury of "France" is down to 75 gold

  @REALM-280
  Scenario: Only the realm's own lords
    Given the treasury of "France" holds 100 gold
    When "France" sends an assassin after a lord of another realm
    Then the order is refused as "not your lord"

  @REALM-280 @placeholder
  Scenario: Not without the gold
    # config: lords.assassination.gold
    Given the treasury of "France" holds 10 gold
    When "France" sends an assassin after one of its lords
    Then the order is refused as "needs 25 gold"

  @REALM-281 @placeholder
  Scenario Outline: Great lords are better guarded
    # config: lords.assassination.chance, lords.assassination.great_lord_penalty, lords.assassination.min_chance
    Given a lord holds <provinces> provinces
    Then an assassin sent after him succeeds <chance> % of the time

    Examples:
      | provinces | chance |
      | 1         | 60     |
      | 4         | 45     |
      | 8         | 30     |

  @REALM-282 @placeholder
  Scenario: The assassin succeeds
    # config: lords.assassination.land_goes_to, lords.assassination.heir_loyalty, lords.assassination.others_steps
    Given every lord of "France" is "Loyal"
    When "France" sends an assassin after one of its lords and he succeeds
    Then that lord is dead and an heir of his house holds his lands, "Wavering"
    And every other lord of "France" is "Wavering"

  @REALM-282 @placeholder
  Scenario: His house turns on the crown
    # config: lords.assassination.house_turns_disloyal
    Given every lord of "France" is "Loyal"
    And two lords of "France" are of one house
    When "France" sends an assassin after one of them and he succeeds
    Then the other lord of his house is "Disloyal"

  @REALM-283 @placeholder
  Scenario: The assassin is caught
    # config: lords.assassination.target_on_failure, lords.assassination.others_steps_on_failure
    Given every lord of "France" is "Loyal"
    When "France" sends an assassin after one of its lords and he is caught
    Then that lord is "Disloyal"
    And every other lord of "France" is "Wavering"

