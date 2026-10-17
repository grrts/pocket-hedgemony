@context-revolutions
Feature: A stopped revolution comes back
  As the game
  I want a stopped revolution to return while its causes remain
  So that bending or crushing only buys time unless the player fixes the causes (decided 16 Oct 2026)

  @REVO-032
  Scenario Outline: Stopping a revolution re-arms it
    Given the revolution "<revolution>" was answered by <outcome>
    When the outcome is applied
    Then the revolution "<revolution>" re-arms
    And its card stays up marked "Stopped, not solved"

    Examples:
      | revolution       | outcome                                        |
      | french_revolution| the Bend option                                |
      | french_revolution| a Fight rising that was crushed                |
      | dutch_revolt     | a Path option that applies no regime           |

  @REVO-033 @REVO-034 @placeholder
  Scenario Outline: The grace period, then the normal selection
    # config: rearm.grace_years
    Given the revolution "french_revolution" re-armed for "France" <years> years ago
    And 4 signs of "french_revolution" are lit for "France"
    When the monthly step runs
    Then the revolution "french_revolution" <can> break out through the normal selection with its sparks

    Examples:
      | years | can     |
      | 1     | cannot  |
      | 2     | cannot  |
      | 3     | can     |
      | 10    | can     |

  @REVO-035
  Scenario: Easing signs below need disarms it
    Given the revolution "french_revolution" is re-armed for "France"
    And the grace period has passed
    When the lit signs of "french_revolution" fall to 3
    Then the revolution "french_revolution" is disarmed
    And no fixed cooldown applies

  @REVO-036
  Scenario: The same event returns with the same stances
    Given "France" bent to the revolution "french_revolution" once
    When the event "french_revolution" fires again for "France"
    Then "France" may choose Lead, Bend or Fight again

  @REVO-037
  Scenario: A won revolution does not re-arm
    Given the regime "revolutionary_republic" was applied to "France" by "french_revolution"
    When the outcome is applied
    Then the revolution "french_revolution" does not re-arm

  @REVO-038
  Scenario: A one-time event can fire again after a listed outcome
    Given the event "kaga_ikko_ikki" has repeat "one_time"
    And its revolution block lists the outcome "suppress_the_league: rising_crushed" under rearm
    And the league's rising was crushed
    When the grace period has passed and the signs are lit
    Then the event "kaga_ikko_ikki" may fire again
