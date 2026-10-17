@context-events
Feature: Selection and pacing
  As the game
  I want eligible events to fire immediately, by a pool roll, or as an offered decision, at a steady pace
  So that history unfolds without flooding a country

  @EVT-029
  Scenario: An immediate event fires when eligible
    Given an event with the selection mode "immediate"
    When it becomes eligible
    Then it fires the same month

  @EVT-030 @placeholder
  Scenario: A pool event rolls every month against its mean wait
    # config: selection.pool_roll_interval_months
    Given the event "french_revolution" is eligible with the selection mode "pool" and a mean wait of 4 years
    And its selection modifiers multiply its chance by 2
    And a follow-up boost of 1.5 is active on it
    When the month's pool roll is made
    Then its chance comes from a mean wait of 4 years multiplied by 2 and by 1.5

  @EVT-031
  Scenario: A decision event is offered to its chooser
    Given the event "napoleon_invades_iberia" has the selection mode "decision"
    And the role "invader" is bound to the country "France"
    When the event becomes eligible
    Then the event is offered to the controller of "France"

  @EVT-032 @placeholder @open-question
  Scenario: An unanswered decision lapses and re-enters the pool
    # config: selection.decision_expiry_years; OQ-EVT-8: the player never has events answered for them
    Given a decision event was offered to an AI country 10 years ago and left unanswered
    And the event is still eligible
    When the month is processed
    Then the decision lapses
    And the event re-enters the pool

  @EVT-033 @placeholder
  Scenario: At most two pool events per country per year
    # config: selection.max_pool_events_per_country_year
    Given the country "France" has had 2 pool events this year
    And a third pool event for "France" wins its roll
    When the month is processed
    Then the third event does not fire for "France" this year

  @EVT-034 @placeholder
  Scenario Outline: Follow-up boosts
    # config: follow_ups.max_boost, follow_ups.boost_decay_years
    Given the event "french_revolution" fired in 1789 with the follow-up "french_revolutionary_wars" delay 1 to 5 years and boost 3.0
    When the weight of "french_revolutionary_wars" is computed in <year>
    Then the boost is <boost>

    Examples:
      | year | boost                          |
      | 1789 | none, before the delay window  |
      | 1792 | 3.0                            |
      | 1799 | fading linearly toward none    |
      | 1805 | none, faded over 10 years      |

  @EVT-034
  Scenario: Boosts are capped and never bypass a trigger
    Given three follow-ups boost the same event by 3.0 each
    And the event's trigger does not hold
    When the month's pool roll is made
    Then the boost counts at most 5.0
    And the event does not fire

  @EVT-035 @placeholder
  Scenario Outline: Alternate history presets
    # config: selection.alternate_history_mode
    Given the game rule alternate history is "<mode>"
    When selection weights are computed
    Then follow-up boosts are multiplied by <boost>
    And historical options are multiplied by <historical>
    And mean waits are multiplied by <wait>

    Examples:
      | mode       | boost | historical | wait |
      | historical | 1.5   | 2.0        | 0.8  |
      | plausible  | 1.0   | 1.0        | 1.0  |
      | divergent  | 0.6   | 0.5        | 1.3  |

  @EVT-036 @placeholder
  Scenario: The historical lean rule
    # config: selection.historical_weight_bonus
    Given the game rule "historical lean" is on
    And an option marked historical has an AI weight of 40
    When the AI weighs its options
    Then the historical option's weight is 50
