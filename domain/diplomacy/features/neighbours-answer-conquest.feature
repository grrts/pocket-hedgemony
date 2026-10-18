@context-diplomacy
Feature: Neighbours answer conquest
  As a country near a conqueror
  I want to remember the land it grabs, band together against it and trust it less
  So that war is balanced through diplomacy

  # Leroy, 18 Oct (X-20). Config keys: leagues, diplomacy.wrongs.grabbed_land_near_us

  @DIPL-221
  Scenario: The league check runs each year
    Given the date is 1 January 1460
    And the country "Venice" has taken 9 provinces since 1440, 2 of them before 1 January 1440
    When the yearly steps run
    Then Venice counts 7 Lands taken
    And the countries that border Venice or a province it took make the count Join a league against Venice

  @DIPL-222 @placeholder
  Scenario: Grabbed land near us
    Given the country "France" takes 2 provinces from "Burgundy" in a peace
    And "Savoy" borders a ceded province and "Castile" is allied with France
    When the peace is signed
    Then Savoy holds the wrong Grabbed land near us at −10 toward France, fading over 20 years
    And Castile holds no such wrong
    And Burgundy holds Took our land and not Grabbed land near us

  @DIPL-223
  Scenario: The AI counts notoriety
    Given the country "Venice" has notoriety 40
    When the AI country "Milan" counts an alliance with Venice
    Then the count has −8 for Venice's notoriety
    When Milan counts joining a league against Venice
    Then the count has +8 for Venice's notoriety

  @DIPL-224
  Scenario: A whole realm is gained by diplomacy
    Given the country "Lithuania" is a subject of "Poland" with 14 provinces
    When Poland folds Lithuania in
    Then all 14 provinces become Poland's
    And the peace limit does not apply

  @DIPL-225 @DIPL-226
  Scenario: Your name abroad
    Given the player's realm "Venice" has notoriety 55, 6 Lands taken in era I and a league against it of 3 members
    When the player opens their own Diplomacy tab
    Then the Your name abroad card shows "Feared", "6 of 8 before a league" and the league with its members and soldiers first
    And its rows are at least 44 points tall and open their reasons on tap
