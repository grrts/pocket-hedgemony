@context-audio
Feature: The music director
  As a player
  I want the music to follow peace, war and crisis without flicker
  So that the soundtrack tells me how my realm is doing

  @AUD-036
  Scenario: The director never touches the simulation
    Given the same save and the same orders
    When the turn is played with music on and with music off
    Then the engine gives the same result

  @AUD-037 @AUD-038
  Scenario Outline: The highest rule that holds wins
    Given <situation>
    When the turn ends
    Then the music state is "<state>"

    Examples:
      | situation | state |
      | the player is at war and losing badly while a plague chain is active | war_losing |
      | the player besieges a castle with no field battle in the last 3 turns and unrest is high | war_siege |
      | a crisis chain is active and the player is at peace with high stability | crisis |
      | the player is at peace with nothing special | peace rotation |

  # war score and stability are not defined in warfare and realm (OQ-AUD-2).
  @AUD-040 @placeholder @open-question
  Scenario Outline: State thresholds from music.yaml
    Given <facts>
    Then the music state "<state>" holds

    Examples:
      | facts | state |
      | the war score is -45 | war_losing |
      | the capital is occupied | war_losing |
      | 60 % of the great powers are at war in Era V | world_war |
      | war was declared 1 turn ago and no battle has been fought | war_mobilize |
      | 25 % of provinces are above the unrest threshold | unrest |
      | stability is 2, the treasury is rising and the realm has been at peace for 10 years | prosperity |

  @AUD-039
  Scenario: Unchanged screens keep the state
    Given the music state is "war_campaign"
    When the player opens the "turn_report" screen
    Then the music state stays "war_campaign"

  @AUD-041
  Scenario: A stinger is not a state
    Given the music state is "war_campaign"
    When a stinger plays over the music
    Then the music ducks by 6 dB under it
    And the music state stays "war_campaign"

  @AUD-042
  Scenario: No change mid-turn
    Given the music state is peace rotation
    When a war starts during the player's turn without a screen change
    Then the state does not change until the turn ends or the screen changes

  @AUD-043 @placeholder
  Scenario Outline: Changes wait for musical boundaries
    Given the music state changes to "<state>"
    Then the change waits for <boundary>
    And it crossfades over one bar

    Examples:
      | state | boundary |
      | war_campaign | the next bar line |
      | crisis | the next bar line |
      | peace rotation | the next phrase end, at most 8 bars |

  @AUD-044 @placeholder
  Scenario: A minimum time in a state
    Given the music state became "war_campaign" 30 seconds ago
    When the war ends at the turn end
    Then the "war_won" or "war_lost" stinger plays
    And the state does not leave "war_campaign" before 45 seconds have passed

  @AUD-045 @placeholder
  Scenario: Going down plays stinger, silence, intro
    Given the music state is "war_campaign"
    When peace is signed with a gain
    Then "war_won" plays
    And 3 to 6 seconds of silence follow
    And the new state starts from its intro

  @AUD-046
  Scenario: Going up cuts in at the next bar
    Given the music state is peace rotation
    When war is declared on the player
    Then "war_mobilize" cuts in at the next bar

  @AUD-047
  Scenario: Event popups only duck
    Given the music state is peace rotation
    When an event tagged "event_bad" opens
    Then the stinger "event_bad" plays with the music ducked under it
    And the state stays peace rotation
