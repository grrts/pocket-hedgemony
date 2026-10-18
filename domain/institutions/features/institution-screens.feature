@context-institutions
Feature: Institutions on screen
  As a player on a phone or a desktop
  I want one card per institution and one row that sums them up
  So that I can follow the crown, the votes and the houses without hunting through panels

  @INST-080
  Scenario: The Institutions row
    Given the player plays "Saxony"
    When the player opens their country card's Diplomacy tab
    Then an Institutions row reads "The Empire · Emperor: Austria · Hold 35 Weak · You: Elector"
    And tapping it opens the Empire card

  @INST-080
  Scenario: A member's badge
    When the player opens the country card of "Brandenburg"
    Then it shows the badge "Elector"
    And tapping the badge opens the Empire card

  @INST-081
  Scenario: The Empire card's folds
    When the player opens the Empire card
    Then it shows the Emperor, the hold bar with number and word, and the player's role
    And it has the folds Election, Reforms, Members and Hold

  @INST-081
  Scenario: Seeing why a seat votes as it does
    Given the player opens the Election fold
    When the player taps the seat of "Saxony"
    Then the reasons list of "Saxony" for each candidate opens
    And a "Seek their vote" button is shown, or why not

  @INST-082
  Scenario: The Shogunate card warns before the break
    Given the player plays "Japan" and the Shogunate's hold is Weak
    When the player opens the Shogunate card
    Then it has the folds Houses, The Court and Hold
    And it shows the line "At hold 0 the houses break away"

  @INST-083
  Scenario Outline: What asks the player
    When <ask> concerns the player
    Then an answer card with two 44-point buttons waits in the dispatches and on Needs attention
    And silence counts as "<silence>"

    Examples:
      | ask                         | silence |
      | a Diet vote                 | no      |
      | a call to defend the Empire | refusal |
      | a request to swear an oath  | refusal |

  @INST-084
  Scenario: The Institutions lens
    When the player picks the Institutions lens
    Then the Emperor's land is gold and members' land light gold
    And seats carry a mark and imperial land held by outsiders is hatched
    And the lens reads with patterns as well as colours

  @INST-085
  Scenario Outline: The cards on a phone
    Given the window has the <layout> layout
    When the player opens the Empire card
    Then it sits as a <sheet> inside the safe areas
    And every fold header, row and button is at least 44 points high
    And nothing needs hover

    Examples:
      | layout | sheet        |
      | Wide   | side sheet   |
      | Tall   | bottom sheet |
