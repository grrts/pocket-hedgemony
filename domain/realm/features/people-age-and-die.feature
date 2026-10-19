@context-realm
Feature: People age and die
  As the game
  I want every person it names to age and die by one model
  So that lords, officials and generals come and go like rulers do

  @REALM-270
  Scenario: One table of ages for everyone
    Then a person of 75 is likelier to die this year than one of 45
    And a lord and a ruler of 55 are as likely to die

  @REALM-271 @REALM-274
  Scenario: Everyone grows a year older each January
    Given a new game
    And nobody dies this year
    When a January passes
    Then every lord and official of "France" is a year older

  @REALM-273
  Scenario: A lord's heir takes his lands
    Given a lord of "France" with an heir
    When the lord dies
    Then his heir holds his lands under his own name

  @REALM-273
  Scenario: A lord's line dies out
    Given a lord of "France" with no heir
    And the player plays "France"
    When the lord dies
    Then his lands return to the crown with their posts empty

  @REALM-275
  Scenario: A dead official's post stands empty for the player
    Given the player plays "France"
    When the official of a royal province of "France" dies
    Then that post stands empty

  @REALM-276
  Scenario: A dead commander leaves his army without a leader
    Given an army of "France" with a commander
    When its commander dies
    Then the army has no commander

  @REALM-272
  Scenario: An heir may die before his father
    Given a ruler with an heir
    When the heir dies
    Then the ruler has no heir
