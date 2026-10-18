@context-naval
Feature: Starting fleets
  As a player or AI country
  I want the realms that had ships in 1444 to start with them
  So that the sea powers of the age are sea powers from the first day

  @NAVY-132 @placeholder
  Scenario Outline: Sea powers start with their ships
    # config: naval.startingFleets
    Given the country "<country>" has naval capability "<level>" and a port
    When the campaign starts
    Then the country "<country>" has a fleet of <warships> warships and <transports> transports

    Examples:
      | country | level     | warships | transports |
      | Venice  | very_high | 6        | 3          |
      | Genoa   | high      | 3        | 2          |
      | England | moderate  | 1        | 1          |
      | Sweden  | low       | 0        | 1          |

  @NAVY-132
  Scenario: No port, no fleet
    Given the country "Hungary" holds no port
    When the campaign starts
    Then the country "Hungary" has no fleet

  @NAVY-132 @placeholder
  Scenario: No cogs in the Americas in 1444
    # config: naval.startingFleets.noShipsWestOfLon
    Given the country "Chimor" has a port on the Pacific coast of the Americas
    When the campaign starts
    Then the country "Chimor" has no fleet

  @NAVY-133
  Scenario: The starting fleet's port and ships
    Given the country "Venice" has its Arsenal port and other ports
    When the campaign starts
    Then the fleet of the country "Venice" lies in the port with the Arsenal
    And its warships are galleys and its transports are cogs

  @NAVY-133
  Scenario: No warship to order, transports instead
    Given the country "Sweden" has naval capability "moderate" and no shipyard
    When the campaign starts
    Then the country "Sweden" has a fleet of 0 warships and 2 transports

  @NAVY-134
  Scenario: Starting crews come from the port
    Given the country "Venice" starts with a fleet of 6 galleys and 3 cogs
    Then 1,170 of the port's people are serving as sailors
    And the fleet has no admiral
    And every ship has a sound hull and full supply
