@context-events
Feature: When an event can happen
  As the game
  I want availability, prerequisites, triggers and invalidation to decide eligibility
  So that events happen only when the world makes them possible

  @EVT-018
  Scenario Outline: Outside its years an event cannot fire
    Given the event "french_revolution" is available from 1750 to 1880
    And the trigger of "french_revolution" holds for "France"
    And the date is <year>
    When eligibility is evaluated
    Then the event "french_revolution" is <state>

    Examples:
      | year | state        |
      | 1749 | not eligible |
      | 1789 | eligible     |
      | 1881 | not eligible |

  @EVT-019
  Scenario Outline: How strongly the date binds
    Given an event with the availability mode "<mode>"
    When it is eligible inside its window
    Then <binding>

    Examples:
      | mode        | binding                                                     |
      | mandatory   | it fires in the window if its trigger holds                 |
      | approximate | its chance is weighted toward the historical date           |
      | reference   | the date is only a guide                                    |

  @EVT-019 @placeholder
  Scenario Outline: An approximate event leans toward its history year
    # config: date_binding.approximate_peak_mult, date_binding.approximate_spread_years
    Given the event "death_of_suleiman" has the availability mode "approximate" and the history year 1566
    When its pool chance is weighed in <year>
    Then its date factor is <factor>

    Examples:
      | year | factor |
      | 1566 | 2.0    |
      | 1561 | 1.5    |
      | 1571 | 1.5    |
      | 1576 | 1.0    |
      | 1600 | 1.0    |

  @EVT-020
  Scenario Outline: Repeating events
    Given an event with repeat "<repeat>"
    When it has fired once
    Then <after>

    Examples:
      | repeat     | after                                                          |
      | one_time   | it never fires again                                           |
      | recurring  | it may fire again after its cooldown years                     |
      | process    | it may fire for other countries as the diffusion spreads      |

  @EVT-020
  Scenario: The Bengal famine can recur after its cooldown
    Given the event "bengal_famine_1770" is recurring with a cooldown of 30 years
    And it fired in 1770
    When the food security of "area:bengal" falls below 0.4 in 1790
    Then the event "bengal_famine_1770" cannot fire yet
    When the same happens in 1801
    Then the event "bengal_famine_1770" can fire again

  @EVT-021
  Scenario Outline: Prerequisite chains
    Given an event requires "<requires>"
    And the events that happened are "<happened>"
    When eligibility is evaluated
    Then the event is <state>

    Examples:
      | requires                     | happened | state        |
      | all of A and B               | A, B     | eligible     |
      | all of A and B               | A        | not eligible |
      | any of A or B                | B        | eligible     |
      | not A                        | A        | not eligible |
      | at least 2 of A, B and C     | A, C     | eligible     |
      | at least 2 of A, B and C     | C        | not eligible |

  @EVT-021
  Scenario: The revolutionary wars need the radical republic
    Given the event "french_revolutionary_wars" requires "french_revolution" with the outcome "radical_republic"
    And "french_revolution" ended with the outcome "constitutional_monarchy"
    When eligibility is evaluated
    Then the event "french_revolutionary_wars" is not eligible

  @EVT-022
  Scenario: Optional events only raise the weight
    Given the event "french_revolution" lists "american_revolution" as optional with weight 1.5
    And "american_revolution" has happened
    When the pool roll for "french_revolution" is made
    Then its weight is multiplied by 1.5
    And "american_revolution" was not needed for it to be eligible

  @EVT-023
  Scenario: Exclusive branches
    Given the events "branch_a" and "branch_b" are exclusive with each other
    When "branch_a" fires
    Then "branch_b" cannot fire

  @EVT-024
  Scenario: Invalidation removes an event for good, and re-emergence re-opens it
    Given the event "french_revolution" is invalidated if "France" is not a monarchy
    When "France" becomes a republic by another path
    Then the event "french_revolution" is removed for good
    And a branch removed because its entity vanished can re-open when a later event creates that entity again

  @EVT-025 @EVT-026
  Scenario: The trigger is a condition tree over world state
    Given the trigger of "french_revolution" is all of: "$realm" is a monarchy, debt of "$realm" is 2000 or more, liberalism in "$realm" is 0.25 or more, and any of stability -1 or less, legitimacy under 40, or "laki_eruption" happened
    And "France" is a monarchy with debt 2100, liberalism 0.3, stability 0 and legitimacy 35
    When the trigger is evaluated with "$realm" bound to "France"
    Then it is true

  @EVT-025
  Scenario: An undeclared condition type is not allowed
    Given an event's trigger uses the condition type "mood"
    When the event tree is built
    Then the build reports an error

  @EVT-027
  Scenario: No condition reads whether a country is played by a person
    Given an event's selection weights use "is_human"
    When the event tree is built
    Then the build reports that "is_human" is not a declared condition type

  @EVT-028
  Scenario Outline: The event condition
    Given the event "french_revolution" fired <years> years ago with the outcome "radical_republic" for "France"
    When the condition "<condition>" is evaluated
    Then it is <result>

    Examples:
      | years | condition                                                                  | result |
      | 3     | event french_revolution                                                    | true   |
      | 3     | event french_revolution outcome radical_republic                           | true   |
      | 3     | event french_revolution outcome royal_reaction                             | false  |
      | 12    | event french_revolution within_years 10                                    | false  |
