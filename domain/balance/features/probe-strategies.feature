@context-balance
Feature: Probe realms and strategies
  As the game's developers
  I want chosen realms to follow one fixed way of playing
  So that we can tell whether war, building or diplomacy pays best

  # Config keys: balance.probes

  @BAL-007 @placeholder
  Scenario Outline: Probe realms by size band
    Given the default probe list
    Then the probe realm "<realm>" is in the size band "<band>"

    Examples:
      | realm       | band   |
      | France      | large  |
      | Ottomans    | large  |
      | Castile     | medium |
      | Mali        | medium |
      | Brandenburg | small  |
      | Ayutthaya   | small  |

  @BAL-008
  Scenario Outline: Four strategies
    Given the probe realm "Castile" is played by the strategy "<strategy>"
    When a year is played
    Then it <behaviour>

    Examples:
      | strategy  | behaviour                                                                                     |
      | Conqueror | declares war on its weakest neighbour it may whenever it is at peace and not in debt         |
      | Builder   | declares no war and spends on works and learning                                              |
      | Diplomat  | declares war only with a held war aim and spends on envoys, marriages, alliances and subjects |
      | Court     | is played by the AI like every other realm                                                    |

  @BAL-009
  Scenario: Probes send only player commands
    Given the probe realm "Brandenburg" is played by the strategy "Conqueror"
    When a run is played
    Then every change it made came from a command the player could send
    And it answered every call to arms, peace offer and ask sent to it
