@context-tribes
Feature: The tribal AI and hunting grounds
  As an AI country
  I want to claim, take in and ask for hunting grounds by the same orders as the player
  So that the tribes of the computer grow and colonial powers deal with them

  @TRIBE-031
  Scenario: The AI claims the most-peopled land it may
    Given the AI country "Huron" has a free place in its range and no claim under way
    And it may claim "Southwest Québec 2" with 49 people and "Southeast Ontario 5" with 31 people
    When the monthly step runs
    Then "Huron" claims "Southwest Québec 2"

  @TRIBE-032
  Scenario: The AI takes in each January within its officials cap
    Given the AI country "Creek" has 2 hunting grounds held 10 years or more
    And "Creek" has room under its officials cap for one official
    And one of those grounds needs an official and the other does not
    When the turn in which 1 January falls ends
    Then "Creek" takes in both grounds, oldest first, while it stays within its officials cap

  @TRIBE-033 @placeholder
  Scenario: A colonial AI asks first
    Given the AI country "Castile" wants to found a colony in "Southeast Mississippi"
    And "Southeast Mississippi" is a hunting ground of "Creek"
    And "Castile" holds at least 20 gold
    Then "Castile" asks "Creek" for "Southeast Mississippi" offering 10 gold
    And "Castile" founds there only after "Creek" has answered
