@context-map-presentation
Feature: Frame and turn budgets
  As a player on a mid-range phone
  I want the map smooth and turns quick
  So that the game feels light in short sessions

  @VIEW-052 @VIEW-053 @VIEW-055 @VIEW-056 @VIEW-064
  Scenario Outline: Frame budgets hold while panning and zooming
    Given the built game runs in mobile Chromium
    When the perf script pans the map at every zoom and ends three turns
    Then "<measure>" is within <budget>
    And a broken budget fails CI

    Examples:
      | measure                                      | budget                      |
      | frame rate while panning and zooming         | 60 fps                      |
      | overlay time per frame, average              | 2.5 ms                      |
      | overlay time per frame, 95th percentile      | 5 ms                        |
      | longest main-thread task while playing       | 50 ms                       |
      | frames redrawn while armies march            | at least 90 %               |

  @VIEW-054
  Scenario Outline: The map canvas shades per CSS pixel and the overlay per device pixel
    Given a phone with a device pixel ratio of 3
    And Sharpness is <sharpness>
    When the map is drawn
    Then the map canvas shades 1 pixel per CSS pixel
    And the overlay canvas draws <overlay> pixels per CSS pixel

    Examples:
      | sharpness | overlay |
      | Battery   | 1       |
      | Balanced  | 2       |
      | Native    | 3       |

  @VIEW-057
  Scenario: The draw loop does no heavy work
    Given the map is being panned
    When a frame is drawn
    Then no layout is read
    And text and sprites come from cached bitmaps
    And no route is planned and the province graph is not walked

  @VIEW-058 @VIEW-062 @VIEW-064
  Scenario Outline: Engine turns stay within budget as the world grows
    Given a synthetic world of <provinces> provinces and <nations> nations
    When the bench processes a turn
    Then it takes at most <ms> ms
    And AI nations run in the same worker turn

    Examples:
      | provinces | nations | ms  |
      | 5000      | 500     | 25  |
      | 20000     | 2000    | 100 |

  @VIEW-059 @VIEW-061
  Scenario: The worker answers quickly and the answer applies in one frame
    Given the real map
    When End turn is given
    Then the worker answers within 250 ms with transferred typed arrays
    And applying the answer takes at most 16 ms with one redraw
    And only open panels re-render

  @VIEW-060
  Scenario Outline: The turn runs in the background where it can
    Given the platform <support> a module worker
    When a turn is processed
    Then it runs <where>

    Examples:
      | support      | where                 |
      | supports     | in the worker         |
      | can't start  | on the main thread    |

  @VIEW-063
  Scenario Outline: Route planning stays within budget
    Given a synthetic world of <provinces> provinces
    When the slowest route is planned
    Then it takes at most <ms> ms

    Examples:
      | provinces | ms |
      | 5000      | 8  |
      | 20000     | 32 |

  @VIEW-065
  Scenario: Targets are measured at phone defaults and once with Battery saver
    Given the phone device profile with its defaults
    When the performance targets are measured
    Then they are measured at Sharpness Balanced, 60 fps cap, Map detail Medium and Animations Full
    And measured once more with Battery saver on

  @VIEW-066
  Scenario: Battery saver turns the display knobs down and leaves the AI alone
    Given Battery saver is on
    When the map is shown and a turn is processed
    Then the frame rate is capped at 30
    And Sharpness is Battery and animations are reduced
    And the map redraws only on change
    And the AI turn has the same work-step budget as with Battery saver off

  @VIEW-067
  Scenario: A still map is not redrawn
    Given the frame rate cap is 60
    And nothing on the map moves
    When a second passes
    Then the map is not redrawn

  @VIEW-068
  Scenario Outline: Map detail steps
    Given Map detail is "<detail>"
    When the map is drawn close in
    Then <result>

    Examples:
      | detail | result                                                          |
      | Low    | tiles stay at 4 × 4 with no surf and no forest blending         |
      | Medium | tiles are 8 × 8 with still water                                |
      | High   | everything is drawn                                             |

  @VIEW-069
  Scenario Outline: Animation steps
    Given Animations is "<animations>"
    When a battle result is shown
    Then <result>

    Examples:
      | animations | result                                  |
      | Full       | the battle plays with full motion       |
      | Reduced    | the battle plays with reduced motion    |
      | Off        | the result is shown as still frames     |
