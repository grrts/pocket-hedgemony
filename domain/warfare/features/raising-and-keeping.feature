@context-warfare
Feature: Raising and keeping an army
  As a player
  I want to call the lords, hire free companies, pay and feed my army and send it home
  So that an army costs gold, food and goodwill while it exists

  # The levy and training belong to recruiting; this feature covers the army side only.
  # Config keys: warfare.levy_gather_days, warfare.lords.loyal_days, warfare.lords.wavering_days,
  # warfare.lords.wavering_stay, warfare.free_companies, warfare.rations.soldier_campaign,
  # warfare.rations.horse, warfare.rations.prisoner

  @WAR-037 @placeholder
  Scenario: Levies arrive from recruiting as levy foot
    Given recruiting levies 5000 men in the region "Champagne"
    When 2 weeks pass
    Then 5000 men of kind "levy" and arm "levy foot" with drill 0 stand at "Troyes"

  @WAR-037 @placeholder
  Scenario: With railway mobilization the levy gathers in days
    Given the country "Prussia" knows "W18 Railway mobilization"
    When recruiting levies men in a province on a railway
    Then they gather in days instead of 2 weeks

  @WAR-038 @placeholder
  Scenario Outline: Lords answer the summons by loyalty
    Given the lord "<lord>" is <loyalty> with a retinue of 2000 men
    When the country "France" calls the lords
    Then <answer>

    Examples:
      | lord             | loyalty   | answer                                                                     |
      | Duke of Bourbon  | loyal     | he brings 2000 men in 3 weeks and may lead them as a captain               |
      | Count of Foix    | wavering  | he brings 1000 men in 6 weeks and goes home after 6 months                 |
      | Duke of Burgundy | disloyal  | he refuses and calling him again makes him angrier                          |
      | Duke of Burgundy | in revolt | his retinue is a rebel army                                                 |

  @WAR-039
  Scenario: A lord whose Want is the war aim comes and stays
    Given the lord "Count of Foix" is wavering
    And the war aim of "France" is his Want
    When the country "France" calls the lords
    Then he brings his retinue and stays to the end of the war

  @WAR-040
  Scenario: A lord leaves to defend his occupied lands
    Given the lord "Duke of Bourbon" serves with his retinue in the army of "France"
    When the enemy occupies one of his provinces
    Then he leaves with his retinue to defend his lands

  @WAR-041
  Scenario: Free companies are found where they historically gathered
    Given the country "Milan" looks for free companies
    When the country looks for soldiers
    Then it is offered Italian condottieri, each with a captain, men, arm, drill, scars and a price

  @WAR-042
  Scenario: Hiring a free company takes no recruits
    Given the country "Venice" signs a contract for 6 months with a Swiss free company
    When the contract is signed
    Then the company sets out for Venice's land, led by its own captain
    And Venice pays gold up front and monthly pay
    And no recruits are taken from its provinces

  @WAR-043
  Scenario Outline: Losing a hired company
    Given the country "Venice" has a hired free company
    When <event>
    Then the free company leaves Venice's service

    Examples:
      | event                                        |
      | its contract ends                            |
      | an enemy outbids Venice                      |

  @WAR-044
  Scenario Outline: Who is paid from the treasury
    Given a company of kind "<kind>" that has been out <months> months
    When the month ends
    Then the treasury <pays> its pay

    Examples:
      | kind              | months | pays         |
      | levy              | 2      | does not pay |
      | levy              | 4      | pays         |
      | retinue           | 4      | does not pay |
      | hired company     | 1      | pays         |
      | standing regiment | 1      | pays         |

  @WAR-045 @placeholder
  Scenario Outline: An army eats rations by where it stands
    Given an army of 10000 soldiers, 2000 horses and 100 prisoners
    And the army stands <where>
    When a turn is played
    Then it eats 6090 rations from <source>
    And a month's rations are 26100

    Examples:
      | where                | source                    |
      | in its own province  | the province it stands in |
      | in an enemy province | its food reserve          |

  @WAR-046
  Scenario: Disbanded men go home
    Given a levy company of 800 men from "Troyes" carrying 8 loads of arms
    When the company is disbanded
    Then 800 men return to the recruit pool of "Troyes"
    And 8 loads of arms return to the arms store

  @WAR-047
  Scenario: A disbanded standing regiment loses its drill and scars
    Given a standing regiment with drill 12 and scars 4
    When the company is disbanded
    Then its drill and scars are reset

  @WAR-048
  Scenario: Soldiers home from a long war with no slot become homeless
    Given 2000 men disband into the province "Troyes" whose slots filled while they were away
    When they come home
    Then the province "Troyes" receives them as homeless

  @WAR-210 @feedback-19
  Scenario: A hired company arrives after its march
    Given the country "Venice" hires a Swiss free company
    When the contract is signed
    Then Venice pays the gold up front
    And the hire screen shows the days the company needs to march to the capital "Venezia"
    And the company is not on the map until it arrives

  @WAR-210 @feedback-19
  Scenario: No company comes to a besieged capital
    Given the capital "Venezia" is under siege
    When the country "Venice" tries to hire a Swiss free company
    Then the order is refused

  @WAR-211 @feedback-19
  Scenario: A hired company brings its own commander
    Given the country "Venice" has hired a Swiss free company
    Then the company is led by its own captain as the commander of its own army
    And none of Venice's commanders is taken
