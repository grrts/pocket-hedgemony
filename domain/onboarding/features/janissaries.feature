@context-onboarding
Feature: How the Janissaries were raised
  As a new player
  I want to see where the Janissaries came from and what it cost
  So that the tutorial shows history honestly without rewarding harm

  @TUT-050
  Scenario: Where do these men come from?
    Given the Janissaries have joined the army in chapter 4
    When the step opens the Janissary regiment's card and the "Why?" on its men
    Then the recruits line reads "Boys taken from Christian families in Rumelia (the devshirme), and war captives."
    When the player taps the recruits line
    Then the camera moves to the Rumelian provinces the corps drew from

  @TUT-051
  Scenario: A vignette, not a choice
    When the devshirme vignette opens
    Then it is marked depiction narrative_only
    And it has three panels: the officials arriving in a village, the boy's years of training, the soldier he becomes
    And its only buttons are "Continue" and "Read more"
    And no button gives the player anything

  @TUT-052
  Scenario: The cost on the map
    When the vignette closes
    Then a Rumelian province's card opens
    And its People line shows the boys taken
    And its grievances show "Sons taken"
    And the province's Orthodox lords sit one step lower in loyalty
    And the vizier says "The corps is strong. This is what it costs the villages that fill it."

  @TUT-053
  Scenario: Read more opens a sourced Almanac entry
    When the player presses "Read more"
    Then the Almanac's devshirme entry opens
    And its sources come from the catalogue's Ottoman record and standard histories, with no invented numbers
