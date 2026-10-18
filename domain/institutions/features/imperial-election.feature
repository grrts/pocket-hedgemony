@context-institutions
Feature: Electing the Emperor
  As a member of the Empire
  I want to win the seats' votes
  So that my ruler can wear the crown

  @INST-020
  Scenario: Seven seats in 1444
    Given a new campaign starts on 11 November 1444
    Then the Empire has 7 seats
    And "Cologne", "Bohemia", "Palatinate", "Saxony" and "Brandenburg" hold a seat each
    And "Mainz" and "Trier" are church seats

  @INST-021
  Scenario: A church seat follows the head of the faith
    Given the "Papal States" hold their highest standing toward "Bohemia" among the candidates
    When an election is held
    Then the church seats vote for "Bohemia"

  @INST-022
  Scenario: A seat stands vacant until granted
    Given "Brandenburg" holds a seat
    When "Brandenburg" ends
    Then the seat of "Brandenburg" is vacant
    When the Emperor grants it to "Hesse"
    Then "Hesse" holds the seat

  @INST-022
  Scenario: No realm holds two seats
    Given "Saxony" holds a seat
    Then the Emperor cannot grant a vacant seat to "Saxony"

  @INST-023 @placeholder
  Scenario: An election when the Emperor's realm gets a new ruler
    # config: empire.election_years_without_rulers
    Given "Austria" is the Emperor's realm
    When "Austria" gets a new ruler
    Then the Empire holds an election

  @INST-024
  Scenario: Who may stand
    Given the three members with the most soldiers are "Austria", "Bohemia" and "Brandenburg"
    And the ruler of "Saxony" stands for the crown
    When an election is held
    Then the candidates are "Austria", "Bohemia", "Brandenburg" and "Saxony"

  @INST-025
  Scenario: Most votes win, a tie goes to the sitting house
    Given "Austria" holds the crown
    And 3 seats vote for "Austria" and 3 for "Bohemia" and the eighth seat is vacant
    When the election ends
    Then "Austria" keeps the crown

  @INST-026 @placeholder
  Scenario: Seeking a vote
    # config: empire.seek_vote.tie
    Given "Bavaria" has a free envoy seat and gold for a gift
    When "Bavaria" sends an envoy to seek the vote of "Saxony"
    Then on arrival "Saxony" holds the tie "Sought our vote" of +15 toward "Bavaria", fading over 10 years
    And it counts in the reasons of the seat of "Saxony"
