@context-buildings
Feature: The build queue
  As a player
  I want to order builds in a province even while its sites are busy
  So that I can plan a province's works once and let them follow one after another

  @BLD-162
  Scenario: A build waits for a busy site
    Given the province "Troyes" has a land site and a town site running
    When the player queues a "forge" in "Troyes"
    Then the forge waits first in the queue of "Troyes"
    And no gold is paid for it yet

  @BLD-163
  Scenario: At most ten builds wait in a province
    Given the province "Troyes" has a land site and a town site running
    And 10 builds wait in the queue of "Troyes"
    When the player queues a "forge" in "Troyes"
    Then it is refused

  @BLD-163
  Scenario: A build that could never start is refused
    Given the province "Troyes" has a land site and a town site running
    When the player queues a "palace" in "Troyes"
    Then it is refused

  @BLD-164
  Scenario: The next build starts when a site is done
    Given the province "Troyes" has a land site and a town site running
    And the player has queued a "forge" in "Troyes"
    When the town site is done
    Then a forge site is running in "Troyes"
    And the queue of "Troyes" is empty

  @BLD-164
  Scenario: A build that can no longer be built leaves the queue
    Given the province "Troyes" has a land site and a town site running
    And the player has queued a "market" in "Troyes"
    And an event founds a market in "Troyes"
    When the town site is done
    Then the queue of "Troyes" is empty
    And the turn report says the market left the queue

  @BLD-165
  Scenario: Cancelling and reordering queued builds
    Given the province "Troyes" has a land site and a town site running
    And the player has queued a "forge" in "Troyes"
    And the player has queued a "kiln" in "Troyes"
    When the player moves the queued kiln earlier
    Then the queue of "Troyes" holds the kiln and then the forge
    When the player cancels the queued forge
    Then the queue of "Troyes" holds the kiln
