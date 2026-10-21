@context-achievements
Feature: Which campaigns earn achievements
  As the game
  I want only unbroken, cheat-free ironman campaigns played as the starting realm to earn achievements
  So that achievements stay honest on every store

  @ACH-034 @ACH-038
  Scenario Outline: An ironman campaign earns at any difficulty and with either kind of events
    Given the campaign was started as ironman and has never left it
    And the campaign's difficulty is "<difficulty>"
    And the campaign uses "<events>" events
    And the campaign is not cheat-marked
    And the player still plays the realm they started with
    When the moment "harvest" occurs for the first time
    Then the achievement "first_harvest" unlocks

    Examples:
      | difficulty | events |
      | easiest | historical |
      | hardest | free |

  @ACH-035
  Scenario: A normal campaign earns nothing, for good
    Given the campaign was started without ironman
    When the moment "harvest" occurs for the first time
    Then no achievement unlocks
    And the campaign can never earn achievements

  @ACH-036
  Scenario: A cheat marks the save for good
    Given the campaign was started as ironman and has never left it
    When the player uses a "free play" cheat once
    Then the save is cheat-marked for good
    And no achievement unlocks from that save, in-game or on any store

  @ACH-036
  Scenario Outline: Every kind of cheat marks the save
    Given the campaign was started as ironman and has never left it
    When the player uses a "<cheat>" cheat once
    Then the save is cheat-marked for good

    Examples:
      | cheat |
      | debug |
      | editor |
      | free play |

  @ACH-037
  Scenario: Playing on as another country after game over stops achievements
    Given the campaign was started as ironman and has never left it
    And the player's realm "France" has been annexed and the game is over
    When the player plays on as the country "Burgundy"
    Then no achievement unlocks from that moment on
    And achievements earned before the switch are kept

  @ACH-039
  Scenario: The tutorial earns nothing
    Given the player is playing the tutorial "Murad's Frontier"
    When the moment "harvest" occurs for the first time
    Then no achievement unlocks

  @ACH-040
  Scenario: The save carries the three flags achievements read
    Given a new ironman campaign is started
    Then its save has the flag "ironman_unbroken" set to true
    And its save has the flag "cheat_marked" set to false
    And its save has the flag "switched_country" set to false

  @ACH-041
  Scenario: Lifetime counters only count eligible campaigns
    Given the player has 3 distinct realms played for 10 years in the profile
    And the campaign as the country "Portugal" is cheat-marked
    When the country "Portugal" completes 10 years of play
    Then the lifetime counter "distinct_realms_played_10_years" stays at 3

  @ACH-042
  Scenario Outline: The game says whether the campaign can earn achievements
    Given the campaign <state>
    When the player opens the "<screen>"
    Then the screen shows that the campaign <can> earn achievements

    Examples:
      | state | screen | can |
      | is an unbroken ironman campaign | pause menu | can |
      | is cheat-marked | pause menu | cannot |
      | is about to start without ironman | new game screen | cannot |

  @ACH-043
  Scenario Outline: The game warns once before an action ends eligibility
    Given the campaign is eligible for achievements
    When the player chooses to "<action>"
    Then the game warns once that achievements end for this campaign
    And the action only goes ahead after the player confirms

    Examples:
      | action |
      | turn on a cheat |
      | play on as another country after game over |
