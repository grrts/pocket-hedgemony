@context-time-and-turns
Feature: Determinism and seeded randomness
  As the game
  I want every turn to depend only on the world, the orders and the seed
  So that replays, save checks and later multiplayer give the same result everywhere

  @TIME-032 @TIME-034
  Scenario: The same world and orders give the same world hash
    Given two copies of the same world with the same Rng state
    When the same orders are processed on both
    Then both worlds have the same world hash

  @TIME-035
  Scenario Outline: The Rng gives the same sequence from the same seed on every platform
    Given the Rng is seeded with <seed> on "<platform>"
    When 1000 numbers are drawn
    Then the sequence equals the reference sequence for seed <seed>

    Examples:
      | seed | platform |
      | 1444 | android  |
      | 1444 | ios      |
      | 1444 | desktop  |
      | 1444 | web      |

  @TIME-035
  Scenario: The Rng's whole state is four 32-bit words
    Given a new campaign with the seed 1444
    When the Rng is seeded
    Then its state is four unsigned 32-bit words spread from the seed with splitmix32

  @TIME-036
  Scenario: A loaded campaign continues the same random sequence
    Given a campaign saved at a turn boundary with its Rng state
    When the save is loaded and the next turn is processed with the same orders
    Then the result equals the result of processing that turn without saving

  @TIME-033 @TIME-056
  Scenario: A turn runs its stages in a fixed order
    Given a turn of "March 1445" with a step in every stage
    When the turn plan is run
    Then the stages run in this order:
      | stage            |
      | apply orders     |
      | day loop         |
      | monthly steps    |
      | seasonal steps   |
      | yearly steps     |
      | events           |
      | checks           |
      | achievements     |
      | autosave         |
      | advance the date |

  @TIME-056
  Scenario: Monthly steps run in a fixed order of contexts
    Given a monthly step of each of these contexts, given in this order:
      | context     |
      | revolutions |
      | culture     |
      | realm       |
      | province    |
      | trade       |
      | rebellions  |
      | buildings   |
      | diplomacy   |
      | research    |
      | subjects    |
      | religion    |
      | recruiting  |
      | government  |
    When the turn plan is run
    Then the monthly steps run in this order of contexts:
      | context     |
      | province    |
      | buildings   |
      | recruiting  |
      | realm       |
      | research    |
      | trade       |
      | subjects    |
      | government  |
      | diplomacy   |
      | culture     |
      | religion    |
      | rebellions  |
      | revolutions |

  @TIME-033 @TIME-056
  Scenario: The engine's own phases sit in the turn order
    Given a world with armies, provinces and nations
    When a turn is processed
    Then the phases run in this order:
      | phase            | stage            |
      | apply orders     | apply orders     |
      | marches          | day loop         |
      | economy          | monthly steps    |
      | levies           | monthly steps    |
      | advance the date | advance the date |

  @TIME-070
  Scenario: Setup and warm-up draw from the campaign's one Rng without moving the date
    Given a new campaign with the seed 1444
    When 24 months of warm-up run before the first turn
    Then the date is still "November 1444" and the turn counter is 0
    And the warm-up drew its numbers from the campaign's Rng

  @TIME-037 @TIME-038
  Scenario Outline: Nothing outside the engine changes the simulation
    Given two copies of the same world
    And on one copy "<outside change>"
    When the same orders are processed on both
    Then both worlds have the same world hash

    Examples:
      | outside change                      |
      | the music track changed             |
      | the battery saver setting is on     |
      | the colour vision setting changed   |
      | the interface scale changed         |

  @TIME-038
  Scenario: Rules that change the simulation are campaign rules
    Given a new campaign is set up with difficulty "normal" and events "historical"
    When the campaign is started
    Then difficulty and events are saved in the campaign
    And they can't be changed from Settings

  @TIME-040
  Scenario: A save only represents a turn boundary
    Given the turn is being processed
    When a save is requested
    Then nothing halfway through the turn is saved
    And the last turn-boundary save stays valid

  @TIME-041
  Scenario: A turn interrupted by the phone is processed again with the same result
    Given End turn was given with 4 queued orders
    And the app was killed while the turn was processed
    When the campaign is resumed
    Then the turn is processed again from the last turn-boundary save with the same 4 orders
    And the resulting world hash is the same as an uninterrupted turn

  @TIME-042
  Scenario: A balance change applies from the next turn on
    Given a campaign saved in "May 1492" under the old rules
    When it is loaded with changed rules
    Then the turn of "May 1492" is processed under the changed rules
    And the save loads without damage
