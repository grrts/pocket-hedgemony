@context-events
Feature: Effects and execution
  As the game
  I want event effects to apply in tiers, over durations, through declared effect types
  So that events change the world in ways every system can read

  @EVT-045
  Scenario Outline: Effect tiers
    Given an option has a "<tier>" effect
    When the option is chosen
    Then the effect applies <when>

    Examples:
      | tier      | when                                         |
      | immediate | at once                                      |
      | delayed   | after its years                              |
      | ongoing   | each turn while the event runs               |
      | long_term | as a permanent structural change             |

  @EVT-045
  Scenario: A delayed annexation (the Anglo-Zulu war)
    Given the option "invade" of "anglo_zulu_war" starts a war and annexes "zulu_kingdom" after 1 year if its war weariness is 10 or more
    When the option is chosen
    Then the war starts at once
    And 1 year later "zulu_kingdom" is annexed if its war weariness is 10 or more

  @EVT-037
  Scenario: A duration event ends when maintain fails
    Given the event "samori_toure_resistance" runs for 16 years while "wassoulou_empire" exists
    When "wassoulou_empire" ceases to exist in its fifth year
    Then the event ends
    And its ongoing effects stop

  @EVT-037
  Scenario: cancel_if aborts a running event
    Given a running event is cancelled if the period "p_atlantic_slave_trade" is not active
    When the period "p_atlantic_slave_trade" ends
    Then the event is aborted

  @EVT-038
  Scenario: event_active reads a running event
    Given the event "samori_toure_resistance" is running
    When the condition "event_active samori_toure_resistance" is evaluated
    Then it is true

  @EVT-046
  Scenario Outline: Declared effect types
    When an event applies the effect "<effect>"
    Then <result>

    Examples:
      | effect                                                        | result                                                          |
      | transfer where area:punjab from $invader to marathas          | ownership of the provinces in the area moves                    |
      | create_country entity south_africa subject_of britain         | the polity is created as a subject                              |
      | annex who britain target boer_republics                       | the target ceases to exist                                      |
      | vassalize who x target y type tributary                       | a subject relation is created                                   |
      | spread kind ideology id liberalism where region:europe 0.1    | liberalism support in Europe rises by 0.1                       |
      | population on region:caribbean change -8% group taino         | the Taino population falls by 8 percent                         |
      | set_flag on x id y years 10                                   | the flag is set for 10 years                                    |
      | trade_route from lisbon to malabar open                       | the trade link opens                                            |
      | colony who x where y type trading_post                        | colonial control is established                                 |

  @EVT-047
  Scenario Outline: Stat changes
    Given the country "France" has debt 3000 and stability 0
    When the effect "stat on France <change>" applies
    Then "France" has <result>

    Examples:
      | change        | result      |
      | stability +1  | stability 1 |
      | debt -30%     | debt 2100   |

  @EVT-048 @placeholder
  Scenario Outline: A rebels effect is a spark that starts a rising
    # config: rebel_sizes
    Given the province "Paris" has a recruit pool of 1000
    When the effect "rebels on Paris type revolutionary size <size>" applies
    Then a rising of <men> men starts in "Paris"
    And the recruit pool of "Paris" is <left>

    Examples:
      | size   | men  | left |
      | small  | 125  | 875  |
      | medium | 250  | 750  |
      | large  | 500  | 500  |
      | huge   | 1000 | 0    |

  @EVT-048
  Scenario: rebels_active reads anticolonial risings
    Given a rising of the type "anticolonial" is under way in "Algeria"
    When the condition "rebels_active who Algeria type anticolonial" is evaluated
    Then it is true

  @EVT-068
  Scenario Outline: The end of a tagged rising applies its tier
    Given "France" answered a revolution event whose option has the rising_won effect "stability -2" and the rising_crushed effect "stability +1"
    And the stability of "France" is 0
    When the rising tagged with that event is <outcome>
    Then "France" has stability <stability>

    Examples:
      | outcome | stability |
      | won     | -2        |
      | crushed | 1         |

  @EVT-049
  Scenario: A war started by an event can be tested by id
    Given the event "french_revolutionary_wars" starts the war "war_coalitions"
    When the condition "war_ongoing war_coalitions" is evaluated during the war
    Then it is true

  @EVT-050
  Scenario: A new effect type needs one evaluator
    Given a sibling design adds the effect type "faith_wave" to the vocabulary
    When the engine supports it
    Then only one new evaluator is added
    And events, balance and modifiers stay data only
