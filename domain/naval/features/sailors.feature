@context-naval
Feature: Sailors
  As a player or AI country
  I want to muster sailors from the people of my ports
  So that my ships have crews, at the cost of empty boats and slots at home

  Background:
    Given the province "Lagos" is a port of the country "Portugal"

  @NAVY-022 @NAVY-023
  Scenario: Mustering changes people into sailors who leave their slots empty
    Given the province "Lagos" has 4600 seafolk
    When the country "Portugal" musters 75 sailors in the province "Lagos"
    Then the province "Lagos" has 4525 seafolk
    And 75 seafolk slots in the province "Lagos" stay empty until the sailors are released
    And each of the 75 sailors counts the same toward a ship's crew

  @NAVY-024
  Scenario: Only provinces with a harbour can be picked for a muster
    Given the province "Arguin" has no harbour
    When the country "Portugal" opens Muster sailors from the country card
    Then the province "Lagos" can be picked
    And the province "Arguin" cannot be picked

  @NAVY-025 @placeholder
  Scenario Outline: Who can be called, by class
    # config: naval.muster_share, naval.fighting_age_share
    Given the province "Lagos" has <people> people of the class "<class>"
    When the game counts who of the class "<class>" can be called to sea
    Then <callable> of them can be called

    Examples:
      | class    | people | callable |
      | seafolk  | 4800   | 800      |
      | homeless | 600    | 50       |
      | farmers  | 2000   | 25       |

  @NAVY-026 @open-question
  Scenario: Seafolk are taken first
    # depends on OQ-NAVY-29: the design's preview shows "seafolk 280 · homeless 15 · others 5" for 300
    Given the province "Lagos" has 830 men who can be called, of whom 770 are seafolk
    When the country "Portugal" musters 300 sailors in the province "Lagos"
    Then seafolk are taken before men of any other class

  @NAVY-027
  Scenario: A man at sea cannot be levied
    Given the province "Lagos" has 75 men away as sailors
    When the country "Portugal" opens the levy in the province "Lagos"
    Then the levy pool of the province "Lagos" shows 75 sailors already gone
    And those 75 men cannot be levied

  @NAVY-028 @placeholder @open-question
  Scenario: The Lagos muster
    # depends on OQ-NAVY-14: bounty rate, muster time and fish-lost formula are only given by example
    Given the province "Lagos" has 4600 seafolk
    And the province "Lagos" has 1150 fighting-age men, of whom about 770 can go to sea
    When the country "Portugal" musters 75 sailors in the province "Lagos"
    Then the country "Portugal" pays 4 gold of bounty
    And the province "Lagos" loses 5 percent of its fish while they serve
    And the 75 sailors are sailors in port at Lagos when the muster is ready

  @NAVY-029 @placeholder
  Scenario: Sailors in port eat and are paid
    # config: naval.wage_in_port, naval.ration_in_port
    Given the port "Lagos" has 75 sailors in port
    When a month passes
    Then the province "Lagos" store loses 75 rations
    And the country "Portugal" pays 7.5 gold in wages

  @NAVY-030 @placeholder
  Scenario Outline: Sailors waiting too long drift home
    # config: naval.drift_home_after_months
    Given the port "Lagos" has 100 sailors in port who have waited <months> months
    And <building> ship is being built for them in the port "Lagos"
    When a month passes
    Then <home> of them return to their slots

    Examples:
      | months | building | home |
      | 5      | no       | 0    |
      | 7      | no       | 10   |
      | 7      | a        | 0    |

  @NAVY-031 @placeholder
  Scenario Outline: Hiring foreign crews needs harbour 2
    Given the port "Lagos" has a harbour at step <step>
    And Genoese ships call at the port "Lagos"
    When the country "Portugal" hires a Genoese crew in the port "Lagos"
    Then the hire is <result>

    Examples:
      | step | result  |
      | 1    | refused |
      | 2    | allowed |

  @NAVY-031 @placeholder
  Scenario: Foreign crews cost twice the wage and leave unpaid
    # config: naval.foreign_wage_multiplier
    Given the port "Lagos" has 30 hired Genoese sailors in port
    When a month passes and the country "Portugal" cannot pay them
    Then the 30 Genoese sailors leave

  @NAVY-032
  Scenario: A loyal lord musters his own crews
    Given a loyal lord of the country "Portugal" holds the port "Porto"
    When the lord musters sailors in the port "Porto"
    Then the sailors and the ships they crew stay the lord's
    And the lord brings his ships when the country "Portugal" calls him

  @NAVY-033 @placeholder
  Scenario: Prize crews taken into service desert at a friendly port
    Given the country "Portugal" captured a ship with 40 sailors aboard
    When the country "Portugal" takes the 40 sailors into its service
    And their ship next enters a port friendly to them
    Then 10 of them desert

  @NAVY-034
  Scenario Outline: Pressing seafolk after S9
    Given the country "Portugal" <knows> S9 "Line-of-battle tactics"
    When the country "Portugal" presses 100 seafolk in the port "Lagos"
    Then the pressing is <result>

    Examples:
      | knows         | result                                                         |
      | knows         | done without bounty and Lagos has the grievance "Pressed" for a year |
      | does not know | refused                                                        |

  @NAVY-035
  Scenario Outline: Sailors move like people
    Given the port "Lagos" has 50 sailors in port
    When the country "Portugal" moves them to the port "Lisbon" <way>
    Then they travel <how>

    Examples:
      | way                    | how                                              |
      | by road                | at levy marching pace and eat on the way         |
      | aboard a ship with room | as passengers counted as men carried            |

  @NAVY-036
  Scenario: Sailors paid off come home to nothing
    Given 60 sailors from the province "Lagos" crew a carrack
    And the fisheries of the province "Lagos" were filled by others while they were at sea
    When the carrack is laid up
    Then the 60 sailors walk home to the province "Lagos"
    And they come back as homeless

  @NAVY-036
  Scenario: Sailors paid off refill the emptiest slots
    Given 60 sailors from the province "Lagos" crew a carrack
    And the province "Lagos" has 60 empty seafolk slots
    When the fleet is disbanded
    Then the 60 sailors walk home and refill the emptiest slots of the province "Lagos"

  @NAVY-037 @placeholder
  Scenario: Sailors come home skilled
    Given men of the province "Lagos" have served 2 years at sea
    When the game checks the province "Lagos"
    Then the province "Lagos" has +10 percent fish and +10 percent traders by sea for 10 years

  @NAVY-038 @placeholder
  Scenario: Wages spent ashore
    Given the port "Lagos" has sailors in port paid 10 gold this month
    When the month ends
    Then 2 gold is spent in the port "Lagos" as trade for its market folk

  @NAVY-039
  Scenario: Empty boats leave a fishery fallow
    Given the fishery of the province "Lagos" has more than half its slots emptied by sailors away
    When the month's fish is counted
    Then the fishery of the province "Lagos" is fallow and gives no fish

  @NAVY-040
  Scenario: Mustering all the seafolk stops the slipways
    Given the shipyard of the province "Lagos" fills its slots from seafolk
    When the country "Portugal" musters every seafolk man who can be called in the province "Lagos"
    Then the slipways of the province "Lagos" stop

  @NAVY-041 @placeholder
  Scenario: Widows' ports
    Given the province "Lagos" has lost more than a tenth of its seafolk at sea in 5 years
    When the game checks the province "Lagos"
    Then the province "Lagos" has fewer births for 10 years
    And the province "Lagos" has the grievance "Lost at sea" for 2 years
