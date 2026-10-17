@context-realm
Feature: The country card
  As a player
  I want one card with every count that matters to my country
  So that I can see my realm at a glance and know why each number moved

  @REALM-001 @REALM-005
  Scenario: France in 1444
    Given the country "France" is ruled by King Charles VII, 41, 23 years on the throne, with 2 heirs
    And the country "France" has 310 gold, 9.5 m people, 22,000 soldiers and 48,000 recruits
    When the player opens the country card of "France"
    Then the card shows "Gold 310", "People 9.5 m" and "Soldiers 22,000 (+48,000 recruits)"
    And it shows food as castles feeding a number of the provinces and how many are hungry
    And it shows horses, ships war and trade, castles, officials for royal provinces, lords by loyalty, schools with students, scholars and the current study
    And it shows faith, tongue, in revolt, allies, enemies, oaths broken and Fallen in 10 years
    And every count opens its list of how it is gained and how it is lost

  @REALM-156
  Scenario: The card shows the rank in each score
    Given the country "France" ranks 2nd in Economy, 1st in Power and 4th in Technology
    When the player opens the country card of "France"
    Then the card shows those three ranks
