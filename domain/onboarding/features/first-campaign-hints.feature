@context-onboarding
Feature: First-campaign hints
  As a player in my first campaign
  I want one short hint at a time that points at what to tap
  So that I find the main systems: a realm, its provinces and book, the map modes, armies, turns, news, research, recruiting, building, lords, gold and envoys

  @TUT-121
  Scenario: The hints come one at a time, in order
    Given a player with no hints done
    And the setting "Tutorial hints" is on
    Then the hint shown is "realm"
    And the open hints are "realm, province, realm_book, lens, move, end_turn, news, study, recruit, build, lords, treasury, envoy"

  @TUT-122
  Scenario Outline: Doing the action ticks its hint off
    Given a player with no hints done
    When the player does "<action>"
    Then the hint "<hint>" is done

    Examples:
      | action      | hint     |
      | realm chosen    | realm      |
      | province opened | province   |
      | realm opened    | realm_book |
      | lens            | lens       |
      | move            | move       |
      | turn ended      | end_turn   |
      | news opened     | news       |
      | setStudy        | study      |
      | recruit         | recruit    |
      | build           | build      |
      | lords opened    | lords      |
      | treasury opened | treasury   |
      | sendEnvoy       | envoy      |

  @TUT-122
  Scenario: A later action ticks its hint off before its turn
    Given a player with no hints done
    When the player does "build"
    Then the hint shown is "realm"
    And the hint "build" is done

  @TUT-122
  Scenario: Another order ticks nothing
    Given a player with no hints done
    When the player does "declareWar"
    Then no hint is done

  @TUT-123
  Scenario: Dismissing a hint shows the next
    Given a player with no hints done
    When the player dismisses the hint "realm"
    Then the hint shown is "province"

  @TUT-124
  Scenario: Hints carry over and end for good
    Given a player with the hints "realm, province, realm_book, lens, move, end_turn, news, study, recruit, build" done
    When the player starts another campaign
    Then the hint shown is "lords"
    When the player does "lords opened"
    And the player does "treasury opened"
    And the player does "sendEnvoy"
    Then no hint is shown
    And the Settings row reads "13 of 13 done"

  @TUT-125
  Scenario: The setting hides the hints and Reset opens them again
    Given a player with the hints "realm, province" done
    When the player turns "Tutorial hints" off
    Then no hint is shown
    When the player turns "Tutorial hints" on
    Then the hint shown is "realm_book"
    When the player picks "Reset tutorial and hints"
    Then the hint shown is "realm"

  @TUT-126
  Scenario Outline: Held back while the map is not the player's
    Given a player with no hints done
    When <moment>
    Then no hint is shown

    Examples:
      | moment |
      | an event card is open |
      | a turn plays |
