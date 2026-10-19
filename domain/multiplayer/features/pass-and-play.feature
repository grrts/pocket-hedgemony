@context-multiplayer
Feature: Pass and play
  As two to four people around one device
  I want to plan in turn without seeing the others' orders
  So that we play one campaign on one phone or tablet

  @MP-060
  Scenario Outline: Two to four realms
    When the players choose <count> realms
    Then <result>

    Examples:
      | count | result                   |
      | 1     | Start stays disabled      |
      | 2     | the game can start        |
      | 4     | the game can start        |
      | 5     | the fifth is refused      |

  @MP-061
  Scenario: The cover hides the map while the device changes hands
    Given a Pass and play campaign with "Castile" and "Portugal"
    When Castile's player presses Ready
    Then the cover says "Pass to Portugal" and hides the map
    When Portugal's player taps "Plan as Portugal"
    Then Portugal plans from the week's start without Castile's orders
