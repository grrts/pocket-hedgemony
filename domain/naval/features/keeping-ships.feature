@context-naval
Feature: Keeping ships
  As a player or AI country
  I want to choose between a crewed fleet that costs wages and a laid-up one that costs little
  So that peace-time readiness is a real choice, and supply ties fleets to friendly ports

  @NAVY-076 @placeholder
  Scenario Outline: The three ship states
    # config: naval.wage_at_sea, naval.wage_in_port, naval.laid_up_upkeep_share, naval.rot
    Given a carrack with a crew of 60 is <state>
    When a month passes
    Then the country pays <wages> gold in wages and <upkeep> gold in upkeep
    And the port's province gives <rations> rations
    And the carrack loses a hull step every <rot>

    Examples:
      | state            | wages | upkeep | rations | rot      |
      | at sea           | 12    | 3      | 0       | 6 months |
      | in port, crewed  | 6     | 3      | 60      | 3 years  |
      | laid up          | 0     | 0.3    | 0       | 2 years  |

  @NAVY-009 @placeholder
  Scenario: A naval base keeps a crewed fleet without wages
    Given a carrack with a crew of 60 is in port, crewed, in a berth at a naval base
    When a month passes
    Then the country pays 0 gold in wages and 3 gold in upkeep
    And the port's province gives 60 rations

  @NAVY-077 @placeholder
  Scenario: A ship laid up 10 years is wrecked
    Given a galley has been laid up for 10 years
    When the month ends
    Then the galley is wrecked

  @NAVY-078
  Scenario: Laying a ship up releases its crew
    Given a carrack with a crew of 60 in the port "Lisbon"
    When the country "Portugal" lays the carrack up
    Then the 60 sailors are released and walk home

  @NAVY-079 @placeholder
  Scenario Outline: Fitting out needs the crew back in that port, plus a month
    Given a laid-up carrack in the port "Lisbon"
    And the port "Lisbon" has <sailors> sailors in port
    When the country "Portugal" fits the carrack out
    Then <result>

    Examples:
      | sailors | result                                     |
      | 60      | the carrack is crewed and ready after a month |
      | 30      | the order is refused                       |

  @NAVY-080
  Scenario: Ships beyond the berths ride at the anchorage
    Given a port with 10 berths has 10 ships berthed
    When an 11th ship puts in
    Then the 11th ship rides at the anchorage
    And it can resupply but not refit
    And it rots as if at sea and faces storms as if at sea

  @NAVY-081
  Scenario Outline: Where a fleet may dock
    Given the country "Portugal" has a fleet next to a port of the country "<owner>"
    And the country "<owner>" is <relation> of the country "Portugal"
    When the fleet tries to dock
    Then docking is <result>

    Examples:
      | owner    | relation                         | result                 |
      | Portugal | the realm                        | allowed, paid in food  |
      | England  | an ally                          | allowed, paid in food  |
      | Genoa    | at peace and not a rival         | allowed, paid in gold  |
      | Castile  | a rival                          | refused                |
      | Morocco  | at war                           | refused                |

  @NAVY-082 @NAVY-083 @placeholder
  Scenario Outline: The cost of resupply
    # config: naval.resupply_food_per_zone, naval.resupply_gold_per_zone
    Given a carrack with a crew of 60 has 5 of its 15 supply left
    When it docks in a <port> port
    Then it is refilled to 15 supply in one day
    And it pays <cost>

    Examples:
      | port     | cost                           |
      | friendly | 60 rations from the province   |
      | neutral  | 6 gold to the port's country   |

  @NAVY-083
  Scenario: A province with too little food fills ships only as far as it goes
    Given a carrack with a crew of 60 has 5 of its 15 supply left
    And the friendly port's province has 30 rations
    When the carrack docks there
    Then the carrack is refilled to 10 supply

  @NAVY-084 @placeholder
  Scenario Outline: Where hulls refit, and at what cost
    Given a worn ship docks in a <port>
    When it refits
    Then the refit is <result>

    Examples:
      | port                                     | result                       |
      | friendly berth at harbour 1, no shipyard | refused                      |
      | friendly berth at harbour 2              | done at the upkeep cost      |
      | friendly port with a shipyard            | done at the upkeep cost      |
      | neutral berth at harbour 2               | done at 1.5 times upkeep     |

  @NAVY-085
  Scenario Outline: Supply used at sea
    Given a fleet of carracks with 15 supply
    When it <does>
    Then it has <left> supply left

    Examples:
      | does                                           | left |
      | sails 4 zones                                  | 11   |
      | holds one coastal zone blockading for 8 days   | 11   |

  @NAVY-086
  Scenario: Only exploration ships enter uncharted zones
    Given a fleet of a carrack and a caravel
    And the next zone of its route is uncharted
    When the fleet plans its route
    Then the route avoids the uncharted zone

  @NAVY-087 @placeholder
  Scenario: Colony stores are loaded at resupply cost, apart from supply
    Given a caravel docks in a friendly port with 60 supply and 0 colony stores
    When it loads 300 rations of colony stores
    Then the caravel has 300 colony stores and still 60 supply
    And the stores are paid as resupply is paid there: food from the province

  @NAVY-088 @placeholder
  Scenario: Out of supply
    Given a carrack with a crew of 60 has 0 supply
    When it sails 1 zone
    Then it has a crew of 54
    And it fights at no more than half strength until it docks
