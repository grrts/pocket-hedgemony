@context-research
Feature: Other systems read research
  As the game
  I want events and scores to read research as counts
  So that literacy and technology are concrete

  @RSCH-060
  Scenario: Literacy reads scholars and schools per thousand people
    Given the country "Venice" has 35 scholars and 4 schools for 1.5 m people
    When an event reads "literacy"
    Then it reads scholars and schools per thousand people of "Venice"

  @RSCH-061
  Scenario: The Technology score reads inventions weighted by era cost
    Given the country "Korea" knows 30 inventions of era I and 5 of era II
    When the realm works out the Technology score
    Then research supplies 35 inventions with era costs 20 and 40
