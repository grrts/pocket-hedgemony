@context-onboarding
Feature: How the first Janissaries were raised
  As a new player
  I want to see where the first Janissaries came from and what it cost
  So that the tutorial shows history honestly without rewarding harm

  @TUT-050
  Scenario: Where do these men come from?
    Given the Janissaries have joined the army in chapter 4
    When the step opens the Janissary regiment's card and the "Why?" on its men
    Then the recruits line reads "War captives: the bey's fifth of every haul (the pençik), trained as the new troops (yeniçeri)."
    And the lesson dates the pençik and the first yeniçeri to Murad's reign, c.1360s-1380s
    When the player taps the recruits line
    Then the camera moves to the border lands the raids took captives from

  @TUT-051
  Scenario: A vignette, not a choice
    When the pençik vignette opens
    Then it is marked depiction narrative_only
    And it has three panels: the captives brought back from a raid, the young man's years of training, the soldier he becomes
    And its only buttons are "Continue" and "Read more"
    And no button gives the player anything

  @TUT-052
  Scenario: The cost on the map
    When the vignette closes
    Then the card of a raided border province opens
    And its People line shows the captives taken
    And its grievances show "Sons taken"
    And the province's Orthodox lords sit one step lower in loyalty
    And the vizier says "The corps is strong. This is what it costs the villages that fill it."

  @TUT-053
  Scenario: Read more opens a sourced Almanac entry
    When the player presses "Read more"
    Then the Almanac's pençik entry opens
    And its sources come from the catalogue's Ottoman record and standard histories, with no invented numbers
