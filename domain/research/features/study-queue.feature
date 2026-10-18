@context-research
Feature: A queue of studies
  As a player
  I want to line up what my scholars study next
  So that research carries on without asking me after every invention

  @RSCH-108 @placeholder
  Scenario: The next queued study starts by itself
    # config: research.queue_length
    Given the country "France" studies "W5 gunpowder_infantry" with its queue "B5 bastion_fortification", "W8 Field artillery"
    When "W5 gunpowder_infantry" is learned from the queue
    Then the queue moves on to "B5 bastion_fortification" with no alert to choose
    And the study queue holds "W8 Field artillery"

  @RSCH-108
  Scenario: A queued invention that cannot be studied yet waits
    Given the country "France" studies "C5 Glass and lenses" with its queue "W7 Pike and shot", "C9 Clockmaking"
    And it does not know "W6 Pike squares"
    When "C5 Glass and lenses" is learned from the queue
    Then the queue moves on to "C9 Clockmaking" with no alert to choose
    And "W7 Pike and shot" stays queued and marked waiting

  @RSCH-109
  Scenario: Queue the path
    Given the country "Kongo" has an empty study queue and knows "C01 Iron smelting"
    When the player queues the path to "W2 Heavy armoured cavalry"
    Then the study queue holds, in an order that can be studied, "C02 Steel forging", "F03 Riding and pack animals" and "W2 Heavy armoured cavalry"

  @RSCH-109
  Scenario: A full queue takes no path
    Given the country "France" has 4 inventions in its study queue
    When the player queues the path to an invention that needs 2 more steps
    Then nothing is added to the study queue and the sheet says the queue is full
