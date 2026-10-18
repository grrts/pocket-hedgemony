@context-national-strengths
Feature: Heritage in play
  As a player
  I want my realm's heritage to live in the campaign
  So that its strengths, hidden goals and burden change what my realm can do as history moves

  @HER-078
  Scenario: Heritage is evaluated each month in the game
    Given a new campaign as "France"
    When the campaign plays to the 1st of January 1445
    Then "France" has 3 ambitions open, at least one of them historical
    And every awake heyday of "France" has served 2 months

  @HER-084
  Scenario: Nothing is settled on the first day
    Given a new campaign as "France"
    Then no realm has an ambition fulfilled or lost
    And no realm has shed its burden or earned a legacy

  @HER-088
  Scenario: A birthright's tax reaches the treasury, and a burden's holds it back
    # France: the taille permanente, +15 % tax over the realm; the great princes, -15 % in lords' land.
    Given a new campaign as "France"
    Then every royal province "France" holds sends it 15 % more tax
    And every lord's province "France" holds sends it what it always did
    And the provinces of "England" send it what they always did

  @HER-088
  Scenario: A dormant birthright pulls no lever
    Given a new campaign as "Muscovy"
    When "Muscovy" no longer holds Moscow and a month begins
    Then the birthright of "Muscovy" is dormant
    And officials' wages in "Muscovy" are as they always were

  @HER-089
  Scenario: Heritage reads places, areas and seas from the map
    Given a new campaign as "France"
    Then the birthright of "Venice" is in force
    And the birthright of "Aragon" is in force
    And the birthright of "Muscovy" is in force

  @HER-085
  Scenario: The Heritage tab shows heritage in play
    Given a new campaign as "France"
    When the player reads the Heritage tab of "France"
    Then it shows 3 ambitions with their hints, never their plain goals
    And it shows each heyday's state
    When the player reads the Heritage tab of "England"
    Then it counts 3 sealed ambitions and shows none of them

  @HER-086
  Scenario: A choice waits on the Heritage tab
    Given a new campaign as "France"
    And a third heyday of "France" would wake
    When the player reads the Heritage tab of "France"
    Then it asks which heyday sleeps, with one button for each of the 3
    When the player chooses the waking heyday
    Then no choice waits and 2 heydays are awake
