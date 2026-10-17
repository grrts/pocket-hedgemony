@context-naval
Feature: Fleets and hulls
  As a player or AI country
  I want my ships counted one by one with crew, hull, supply and age
  So that wear, rot and short crews show on every ship

  @NAVY-058 @NAVY-059
  Scenario: The fleet of the Algarve
    Given the country "Portugal" has 3 caravels and 1 carrack at sea under the admiral "Rui Vaz"
    When the fleet card is read
    Then the fleet has one admiral and 4 ships
    And the fleet shows crew 135 of 135
    And each ship has a crew, a hull step, supply left and an age in years

  @NAVY-059
  Scenario: Ships age each year
    Given a carrack was launched 3 years ago
    When a year passes
    Then the carrack has age 4

  @NAVY-060 @placeholder
  Scenario Outline: Hulls wear by time at sea
    # config: naval.rot
    Given a ship with a hull "<before>" has been <months> months at sea since its last hull step
    When the month ends
    Then the ship has a hull "<after>"

    Examples:
      | before | months | after   |
      | sound  | 6      | worn    |
      | worn   | 6      | leaking |
      | sound  | 5      | sound   |

  @NAVY-060
  Scenario: Battle hits lower a hull
    # depends on OQ-NAVY-6: how many hits make a hull step is not given
    Given a galleon with a hull "sound"
    When it takes hits in a sea battle without sinking
    Then its hull falls one or more steps

  @NAVY-061 @placeholder
  Scenario Outline: Refit in a berth
    # config: naval.refit_months
    Given a ship with a hull "<hull>" is in a berth of a port at harbour step 2 <yard>
    When <months> months pass
    Then the ship has a hull "sound"

    Examples:
      | hull    | yard               | months |
      | worn    | without a shipyard | 1      |
      | leaking | without a shipyard | 3      |
      | leaking | with a shipyard    | 1.5    |
      | worn    | with a shipyard    | 0.5    |

  @NAVY-062
  Scenario Outline: What each hull step means at sea
    Given a ship with a hull "<hull>" at sea
    When <event>
    Then <result>

    Examples:
      | hull    | event                   | result                                         |
      | worn    | it sails a zone         | it sails at its normal days                    |
      | leaking | it sails a zone         | it needs twice the days                        |
      | leaking | a storm hits its zone   | its hull falls to "wrecked"                    |
      | wrecked | it is ordered to sail   | it may only limp into the nearest port         |
      | wrecked | a storm hits its zone   | it sinks                                       |

  @NAVY-063
  Scenario: A half-crewed galleon fights at half strength and sails at half speed
    Given a galleon with 100 sailors of its crew of 200
    When it sails a zone and fights a sea battle
    Then it fights with half its strength
    And it needs twice the days per zone

  @NAVY-064 @placeholder
  Scenario Outline: Below a quarter of its crew a ship cannot leave port
    # config: naval.min_crew_to_sail
    Given a galleon in port with <crew> sailors of its crew of 200
    When it is ordered to sail
    Then the order is <result>

    Examples:
      | crew | result  |
      | 49   | refused |
      | 50   | allowed |
      | 200  | allowed |
