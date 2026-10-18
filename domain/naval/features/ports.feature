@context-naval
Feature: Ports
  As the game
  I want ports to be provinces with a harbour, with berths and slipways by building step
  So that ships can only be bought, crewed and sheltered where a realm has built for the sea

  @NAVY-132
  Scenario: A port needs a shipyard to muster sailors and build ships
    Given the port "Funchal" has a harbour and no shipyard
    Then no sailors can be mustered in the port "Funchal"
    And no ship can be ordered in the port "Funchal"

  @NAVY-001 @NAVY-002
  Scenario: A province with a harbour on a shore tile is a port
    Given the province "Lagos" has a harbour at step 2 on a shore tile
    When the game checks what the province "Lagos" allows at sea
    Then the province "Lagos" is a port
    And sailors can be mustered in the province "Lagos"
    And ships can be bought and berthed in the province "Lagos"

  @NAVY-003 @NAVY-002
  Scenario: A coastal province without a harbour is a plain shore
    Given the province "Arguin" is coastal and has no harbour
    And the province "Arguin" has seafolk
    When the game checks what the province "Arguin" allows at sea
    Then the province "Arguin" is a plain shore
    And no sailors can be mustered in the province "Arguin"
    And no ship can be bought, berthed or crewed in the province "Arguin" except small craft
    And its seafolk fish from the beach
    And an army can land in the province "Arguin"

  @NAVY-004 @placeholder
  Scenario Outline: Berths by harbour step
    Given a port has a harbour at step <step>
    When the game counts the port's berths
    Then the port has <berths> berths
    # config: naval.berths_by_harbour_step

    Examples:
      | step | berths |
      | 1    | 10     |
      | 2    | 25     |
      | 3    | 50     |

  @NAVY-005 @placeholder
  Scenario Outline: Slipways by shipyard step
    Given a port has a shipyard at step <step>
    When the game counts the port's slipways
    Then the port has <slipways> slipways
    # config: naval.slipways_by_shipyard_step

    Examples:
      | step | slipways |
      | 1    | 1        |
      | 2    | 2        |
      | 3    | 2        |
      | 4    | 3        |

  @NAVY-006
  Scenario Outline: What each harbour step allows
    Given a port has a harbour at step <step>
    When the game checks what the port allows
    Then mustering, buying and resupply are <basic>
    And refit and hiring foreign crews are <refit>
    And coaling for steamships is <coaling>

    Examples:
      | step | basic   | refit       | coaling     |
      | 1    | allowed | not allowed | not allowed |
      | 2    | allowed | allowed     | not allowed |
      | 3    | allowed | allowed     | allowed     |

  @NAVY-007
  Scenario Outline: Which hulls each shipyard step builds
    Given a port has a shipyard at step <step>
    When the country orders a "<ship>" there on a slipway
    Then the order is <result>

    Examples:
      | step | ship             | result  |
      | 1    | galley           | allowed |
      | 1    | carrack          | refused |
      | 2    | carrack          | allowed |
      | 2    | fluyt            | allowed |
      | 2    | ship of the line | refused |
      | 3    | ship of the line | allowed |
      | 4    | ship of the line | allowed |

  @NAVY-010
  Scenario Outline: Berths taken by ship size
    Given a port has 10 berths and 0 ships berthed
    When a "<ship>" is berthed in the port
    Then the port has <free> free berths

    Examples:
      | ship             | free |
      | carrack          | 9    |
      | galleon          | 9    |
      | ship of the line | 8    |

  @NAVY-011
  Scenario Outline: Drawn-up ships take no berth but rot at the anchorage rate
    Given a port has 10 berths and 0 ships berthed
    When a "<ship>" is drawn up on the beach in the port
    Then the port has 10 free berths
    And the "<ship>" rots at the anchorage rate

    Examples:
      | ship        |
      | galley      |
      | cog         |
      | small craft |

  @NAVY-012
  Scenario: Several port towns in one province take the highest tier and any shipyard
    Given the towns "Genoa", "Savona", "La Spezia" and "Finale" fall in the province "Genova"
    And the town "Genoa" is a great port with a shipyard
    When the 1444 ports are placed
    Then the province "Genova" is a great port with a shipyard

  @NAVY-013 @NAVY-014 @NAVY-015
  Scenario Outline: Starting harbour and shipyard by tier in 1444
    Given the date is 1444
    And the province "<province>" holds a 1444 port town of tier "<tier>"
    And the town's holder "<holder>" <knows> S4 "Carrack and caravel"
    When the campaign starts
    Then the province "<province>" has harbour step <harbour> and shipyard step <shipyard>

    Examples:
      | province | tier    | holder      | knows      | harbour | shipyard |
      | Lagos    | port    | portugal    | knows      | 2       | 2        |
      | Seville  | great   | castile     | knows      | 2       | 2        |
      | London   | great   | england     | does not know  | 2       | 1        |
      | Venice   | great   | venice      | knows      | 2       | 4        |
      | Funchal  | small   | portugal    | knows      | 1       | 0        |
      | Arguin   | landing | sanhaja_zenaga | does not know | 0     | 0        |

  @NAVY-013
  Scenario: A port-tier town too small for harbour 2 starts at harbour 1
    Given the date is 1444
    And a province holds a 1444 port town of tier "port"
    And the town is smaller than the market town harbour step 2 needs
    When the campaign starts
    Then the province has harbour step 1

  @NAVY-013
  @placeholder
  Scenario: A canoe landing starts with no harbour and extra seafolk
    # config: naval.canoeLanding (D-NAVY-10)
    Given the date is 1444
    And the province "Arguin" holds a 1444 port town of tier "landing"
    When the campaign starts
    Then the province "Arguin" has no harbour
    And the province "Arguin" has 100 extra seafolk and 5 small craft only

  @NAVY-015
  Scenario: The 1444 ports data adds up
    Given the 1444 ports data
    When the ports are placed on the current map
    Then 315 of 317 towns are placed in 248 provinces
    And 51 of those provinces have a shipyard
    And the start ports table lists 236 provinces with a harbour

  @NAVY-016
  Scenario Outline: A town on no land of the current map is not placed
    Given the 1444 port town "<town>" falls on no land of the current map
    When the 1444 ports are placed
    Then the town "<town>" is listed as not placed

    Examples:
      | town  |
      | Melos |
      | Male  |

  @NAVY-017
  Scenario: A realm builds a new port on its own shore
    Given the country "Portugal" holds a shore tile with no harbour in the province "Nagasaki"
    When the country "Portugal" builds a harbour there by the buildings rules
    Then the province "Nagasaki" is a port

  @NAVY-018
  Scenario: A burned harbour falls a step
    Given a port has a harbour at step 2
    When the harbour is burned in a raid
    Then the port has a harbour at step 1
    And the port has 10 berths

  @NAVY-018 @NAVY-039
  Scenario: A fallow harbour halves its berths
    Given a port has a harbour at step 2
    And the harbour's slots are under half filled because its seafolk are at sea
    When the game counts the port's berths
    Then the port has half of its 25 berths

  @NAVY-019
  Scenario Outline: Slipways stand idle
    Given a port has a shipyard at step 2
    When <cause>
    Then the port's slipways build nothing

    Examples:
      | cause                                      |
      | the shipyard is burned                     |
      | no timber is in reach                      |
      | the shipyard's slots fall under half filled |

  @NAVY-020 @NAVY-021
  Scenario: Sailors and ships in port go up and down
    Given the port "Lagos" has 0 sailors in port and 0 ships in port
    When 75 sailors are mustered in the port "Lagos"
    And a caravel is launched in the port "Lagos" with 25 of them aboard
    Then the port "Lagos" has 50 sailors in port
    And the port "Lagos" has 1 ship in port
    When the caravel sails
    Then the port "Lagos" has 0 ships in port
