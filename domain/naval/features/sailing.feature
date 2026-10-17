@context-naval
Feature: Sailing
  As a player or AI country
  I want fleets to cross sea zones in days set by ship, water, wind and admiral
  So that the map's zones measure travel time and research opens the oceans

  @NAVY-089
  Scenario: Fleets are movers on sea zones and ports
    Given a fleet of the country "Portugal" in the port "Lagos"
    When the shared planner plans its route
    Then the route uses only sea zones and port provinces entered through their harbour

  @NAVY-090 @placeholder
  Scenario Outline: Days per zone by ship and water
    # config: naval.step_days
    Given a fleet of only "<ship>" ships with full crews and an admiral with Cunning 0
    And there is no wind effect
    When it crosses one "<water>" zone
    Then it needs <days> days

    Examples:
      | ship             | water | days |
      | galley           | sea   | 1    |
      | small craft      | sea   | 1    |
      | cog              | sea   | 2    |
      | cog              | ocean | 3    |
      | caravel          | sea   | 1.5  |
      | caravel          | ocean | 2    |
      | carrack          | ocean | 2    |
      | ship of the line | ocean | 2    |
      | steamer          | ocean | 1    |

  @NAVY-090
  Scenario: A fleet sails at the pace of its slowest ship
    Given a fleet of a caravel and a cog
    When it crosses one "ocean" zone with no wind effect
    Then it needs 3 days

  @NAVY-091
  Scenario Outline: Research opens the sea
    Given the country "<country>" knows <research>
    When its carrack plans a route into an ocean zone <distance> zones from a coast
    Then the route is <result>

    Examples:
      | country  | research    | distance | result  |
      | England  | neither S1 nor S5 | 1  | refused |
      | Portugal | S1 only     | 3        | allowed |
      | Portugal | S1 only     | 4        | refused |
      | Portugal | S1 and S5   | 10       | allowed |

  @NAVY-092
  Scenario: Galleys never enter the ocean
    Given the country "Venice" knows S5 "Ocean navigation"
    When its galley plans a route into an ocean zone
    Then the route is refused

  @NAVY-092
  Scenario Outline: Junks and dhows sail their own monsoon seas with T5
    # config: naval.monsoon (D-NAVY-20); T5's start regions know it in 1444
    Given the date is 1444
    And a dhow of a Gujarati country that <knows> T5 "Monsoon sailing calendars"
    When it plans a route into the ocean zone "<zone>"
    Then the route is <result>

    Examples:
      | knows          | zone             | result  |
      | knows          | Arabian Sea      | allowed |
      | does not know  | Arabian Sea      | refused |
      | knows          | Atlantic Ocean   | refused |

  @NAVY-093 @placeholder
  Scenario Outline: Winds
    # config: naval.wind_multiplier, naval.wind_calendars
    Given a fleet of caravels that needs 2 days per ocean zone
    When it sails <wind>
    Then it needs <days> days per ocean zone

    Examples:
      | wind                         | days |
      | with the wind                | 1    |
      | against the wind             | 4    |

  @NAVY-093
  Scenario: Steamships ignore the wind
    Given a fleet of steamers
    When it sails against the wind
    Then it needs 1 day per zone

  @NAVY-094 @NAVY-008
  Scenario: Storms in the storm season, halved by a lighthouse
    Given a sea zone is in its storm season
    And a lighthouse stands in that sea zone
    When ships at sea there suffer storm losses
    Then the losses are half those of the same zone without a lighthouse

  @NAVY-095
  Scenario: Ice in the Baltic
    Given it is winter and the Baltic zones are frozen
    When a fleet plans a route into a Baltic zone
    Then the route is refused
    And a fleet caught in a Baltic zone when it freezes is iced into the nearest port

  @NAVY-125 @placeholder
  Scenario Outline: Frozen northern seas from December to March
    # config: naval.frozenSeas (X-17; provisional until world-map's frozen lookup)
    Given it is <month>
    When a fleet plans a route into the "<zone>"
    Then the route is <result>
    And a port on the "<zone>" <can> launch or take in ships

    Examples:
      | month    | zone            | result  | can    |
      | January  | Gulf of Bothnia | refused | cannot |
      | March    | White Sea       | refused | cannot |
      | April    | Gulf of Bothnia | allowed | can    |
      | January  | North Sea       | allowed | can    |

  @NAVY-096 @placeholder
  Scenario: The room an army takes aboard
    # config: naval.room.horse, naval.room.gun
    Given an army of 1000 men, 100 horses and 5 guns with its food reserve
    When it boards ships in a port
    Then it takes the room of 1500 men plus its food reserve as loads

  @NAVY-097 @NAVY-055
  Scenario: Small craft carry an army only along the coast
    Given an army aboard small craft
    When the route crosses an ocean zone or a zone with an enemy war fleet
    Then the route is refused

  @NAVY-090 @NAVY-091 @NAVY-093 @NAVY-070 @placeholder
  Scenario: Lagos to Arguin with the trades
    Given the country "Portugal" knows S1 and S4
    And a fleet of 3 caravels under an admiral with Cunning 5 in the port "Lagos"
    And the route to "Arguin" is 1 coastal zone and 9 ocean zones, all within 3 zones of the African coast
    And the north-east trade winds are with the fleet
    When the fleet sails to "Arguin"
    Then the crossing takes about 7 days
    And each caravel uses 10 supply and has 50 left
    And the fleet cannot dock at "Arguin" because it is a canoe landing
