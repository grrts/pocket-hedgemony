@context-naval
Feature: Buying ships
  As a player or AI country
  I want to buy ships where their crew is already waiting in port
  So that my fleet is never bigger than the seafaring people I can put aboard

  @NAVY-042 @NAVY-043
  Scenario: Crew, slipway and materials in the same port
    Given the port "Lagos" has 60 sailors in port
    And the port "Lagos" has a free slipway at shipyard step 2
    And the country "Portugal" knows S4 "Carrack and caravel"
    And the country "Portugal" has 100 gold and 20 timber in reach of the port "Lagos"
    When the country "Portugal" orders a carrack in the port "Lagos"
    Then the country "Portugal" pays 60 gold and 12 timber at once
    And 60 sailors are assigned to the hull and help build it
    And the port "Lagos" has 0 sailors in port

  @NAVY-044 @NAVY-134
  Scenario: A ship ordered waits in the queue for a slipway and its crew
    Given the port "Lagos" has 20 sailors in port
    And the port "Lagos" has a free slipway at shipyard step 2
    When the country "Portugal" orders a carrack in the port "Lagos"
    Then the country "Portugal" pays 60 gold and 12 timber at once
    And the carrack waits in the port's queue for its crew
    When 40 more sailors come in to the port "Lagos"
    Then 60 sailors are assigned to the hull and help build it

  @NAVY-045
  Scenario Outline: Only unlocked ship types can be bought
    Given the country "<country>" <knows> the invention "<invention>"
    When the country "<country>" orders a "<ship>" in a port with the right slipway and crew
    Then the order is <result>

    Examples:
      | country  | knows         | invention               | ship          | result  |
      | Portugal | knows         | S4 Carrack and caravel  | carrack       | allowed |
      | England  | does not know | S4 Carrack and caravel  | carrack       | refused |
      | Portugal | does not know | S6 Ship-mounted cannon  | armed carrack | refused |

  @NAVY-045 @NAVY-046
  Scenario: Exploration ships also need the exploration unlock
    Given the country "Ming" does not know S4 "Carrack and caravel"
    When the country "Ming" orders a caravel
    Then the order is refused

  @NAVY-046 @placeholder
  Scenario Outline: Supply carried by family
    # config: naval.supply_by_family
    Given a ship of the type "<ship>" of the family "<family>"
    When it leaves port with full supply
    Then it carries <supply> zones of supply

    Examples:
      | ship    | family      | supply |
      | cog     | trade       | 15     |
      | galleon | military    | 15     |
      | galley  | military    | 6      |
      | caravel | exploration | 60     |

  @NAVY-047 @placeholder
  Scenario Outline: What each ship takes
    # config: naval.ships
    Given a ship type "<ship>"
    When its cost is read from the ship table
    Then it needs <crew> sailors, <gold> gold, <timber> timber and <months> months, and costs <upkeep> gold a month

    Examples:
      | ship             | crew | gold | timber | months | upkeep |
      | small craft      | 6    | 2    | 0      | 1      | 0      |
      | war canoe fleet  | 100  | 10   | 2      | 2      | 0.5    |
      | voyaging canoe   | 20   | 5    | 1      | 1      | 0.5    |
      | cog              | 30   | 25   | 6      | 3      | 1      |
      | caravel          | 25   | 25   | 4      | 3      | 1      |
      | galley           | 180  | 40   | 6      | 4      | 2      |
      | carrack          | 60   | 60   | 12     | 6      | 3      |
      | armed carrack    | 120  | 120  | 14     | 7      | 5      |
      | galleon          | 200  | 200  | 20     | 9      | 8      |
      | fluyt            | 20   | 40   | 10     | 4      | 1.5    |
      | turtle ship      | 120  | 150  | 12     | 8      | 6      |
      | ship of the line | 600  | 600  | 60     | 18     | 25     |

  @NAVY-048 @NAVY-134 @placeholder
  Scenario: The Lagos caravels, two on slipways and one waiting its turn
    # config: naval.game.queues (D-NAVY-33)
    Given the country "Portugal" has the exploration unlock
    And the port "Lagos" has shipyard step 2 with 2 free slipways
    And the port "Lagos" has 75 sailors in port
    When the country "Portugal" orders 3 caravels in the port "Lagos"
    Then the country "Portugal" pays 75 gold and 12 timber
    And 2 caravels are built on the slipways in 3 months
    And 1 caravel waits in the queue for a slipway
    When 3 months pass in the port "Lagos"
    Then the waiting caravel is laid down on a slipway

  @NAVY-048 @NAVY-132
  Scenario: A harbour without a shipyard builds no ship
    Given the port "Funchal" has a harbour and no shipyard
    And the port "Funchal" has 60 sailors in port
    When the country "Portugal" orders 2 cogs in the port "Funchal"
    Then every order is refused because the port needs a shipyard

  @NAVY-134 @placeholder
  Scenario: The ship queue holds five ships, and the last can be taken off
    # config: naval.game.queues.shipQueueMax
    Given the port "Lagos" has 0 sailors in port
    When the country "Portugal" orders 6 cogs in the port "Lagos"
    Then 5 cogs wait in the queue and the sixth order is refused because the queue is full

  @NAVY-135 @placeholder
  Scenario Outline: A port offers only the newest ship on each upgrade path
    # config: naval.upgrades (D-NAVY-33)
    Given a port whose shipyard builds "<buildable>"
    Then the "<ship>" is <offered>

    Examples:
      | buildable                      | ship          | offered                       |
      | cog, galley                    | cog           | offered                       |
      | cog, carrack, galley           | cog           | replaced by the carrack       |
      | cog, carrack, fluyt            | carrack       | replaced by the fluyt         |
      | cog, carrack, fluyt            | cog           | replaced by the fluyt         |
      | galley, armed carrack, galleon | galley        | replaced by the galleon       |
      | galley, armed carrack, galleon | armed carrack | replaced by the galleon       |
      | caravel, carrack, fluyt        | caravel       | offered                       |
      | turtle ship, ship of the line  | turtle ship   | replaced by the ship of the line |

  @NAVY-049
  Scenario Outline: The 1444 trade ship follows the sea
    Given a port on the "<sea>"
    When a cog, junk or dhow is ordered there
    Then the ship built is a "<ship>"

    Examples:
      | sea                          | ship |
      | coasts of Europe             | cog  |
      | East and Southeast Asia      | junk |
      | Indian Ocean and Red Sea     | dhow |

  @NAVY-050
  Scenario: Ships that shoot need guns and powder
    Given the country "Portugal" knows S6 "Ship-mounted cannon"
    When the country "Portugal" orders an armed carrack
    Then the armed carrack also needs its guns, cast or bought as for gun crews
    And it needs powder for each voyage

  @NAVY-051
  Scenario: A blockaded port keeps building but nothing leaves
    Given an enemy fleet is in the sea zone of the port "Lagos"
    When the country "Portugal" orders a caravel in the port "Lagos"
    Then the order is allowed
    But no ship leaves the port "Lagos" without a sea battle

  @NAVY-052
  Scenario: A taken port loses its hulls on the slipways
    Given the port "Lagos" has 2 caravels on its slipways
    When the country "Castile" takes the port "Lagos"
    Then the 2 hulls on the slipways belong to the country "Castile"

  @NAVY-053 @placeholder
  Scenario: Buying a hull abroad in Venice
    Given the country "Venice" holds a great port with a shipyard
    And the country "Hungary" is at peace with the country "Venice"
    And the country "Venice" agrees to sell
    And 60 sailors of the country "Hungary" wait in the port "Venice"
    When the country "Hungary" orders a carrack in the port "Venice"
    Then the country "Hungary" pays 90 gold
    And the carrack is built on a Venetian slipway
    And the Hungarian sailors waiting in Venice are paid double

  @NAVY-053
  Scenario: No crew abroad, no hull abroad
    Given the country "Venice" agrees to sell a hull to the country "Hungary"
    And no sailors of the country "Hungary" wait in the port "Venice"
    When the country "Hungary" orders a carrack in the port "Venice"
    Then the order is refused

  @NAVY-054
  Scenario: Small craft at a canoe landing
    Given the province "Arguin" has seafolk and no harbour
    When the country owning "Arguin" buys 5 small craft there
    Then 30 sailors crew them
    And each small craft carries 10 men or a load of goods along coastal zones only
    And the small craft serve as the fishery's boats

  @NAVY-055
  Scenario: Small craft never fight
    Given small craft of the country "Portugal" plan to enter a zone with an enemy war fleet
    When the route is planned
    Then the zone is closed to them

  @NAVY-056
  Scenario Outline: Outrigger voyaging opens the ocean to small craft
    Given a country <knows> S3 "Outrigger voyaging"
    When its small craft plan a route across an ocean zone
    Then the route is <result>

    Examples:
      | knows         | result  |
      | knows         | allowed |
      | does not know | refused |

  @NAVY-056
  Scenario: War canoe fleets and voyaging canoes are built at a shipyard too
    # D-NAVY-33 (Leroy): without a shipyard no ship is built; small craft stay the fishery's boats
    Given a country knows S3 "Outrigger voyaging"
    And it holds a beach with seafolk and no harbour
    When it orders a war canoe fleet and a voyaging canoe there
    Then both orders are refused

  @NAVY-057
  Scenario Outline: Other ways to get ships
    Given the country "Portugal" has no ship of that kind
    When <way>
    Then the country "Portugal" <gets>

    Examples:
      | way                                                  | gets                                                    |
      | it captures a ship and puts a prize crew aboard      | the captured ship                                       |
      | a loyal lord with a port is called                   | the lord's ships until his service ends                 |
      | it hires a privateer                                 | a ship, crew and commander for a season                 |
      | an event gives a treasure fleet                      | the ships the event names                               |

  @NAVY-123
  Scenario Outline: Which ships can trade
    # D-NAVY-8: one upkeep, naval's; the caravel explores
    Given a "<ship>"
    Then it <can> be set to trade

    Examples:
      | ship    | can    |
      | cog     | can    |
      | galleon | can    |
      | caravel | cannot |
