@context-rebellions
Feature: Severity and spread
  As the game
  I want risings to do harm and spread by clear tiers and factors
  So that the player sees how bad a rising is and where it will go next

  @REBL-034
  Scenario Outline: Severity tier by size
    Given a rising holds <provinces> provinces
    And the rising <capital> the capital's province
    And the rising <lord_land> a whole lord's land
    And the rising <army> a rebel army
    When its severity is set
    Then its severity tier is "<tier>"

    Examples:
      | provinces | capital         | lord_land       | army         | tier         |
      | 1         | does not hold   | does not hold   | has no       | Riot         |
      | 1         | does not hold   | does not hold   | has          | Rising       |
      | 2         | does not hold   | does not hold   | has          | Rebellion    |
      | 5         | does not hold   | does not hold   | has          | Rebellion    |
      | 6         | does not hold   | does not hold   | has          | Great revolt |
      | 1         | holds           | does not hold   | has          | Great revolt |
      | 3         | does not hold   | holds           | has          | Great revolt |

  @REBL-044 @open-question
  Scenario: A rising next to the capital is a great revolt at once
    # OQ-REBL-8: "the capital's province" (4.1) against "in or next to the capital" (4.3)
    Given the province "Brie" borders the capital "Paris"
    When a rising starts in the province "Brie"
    Then its severity tier is "Great revolt"

  @REBL-035
  Scenario: Rebels holding a province cut it off
    Given a rising holds the province "Troyes" with a rebel army
    When the month is processed
    Then no tax, recruits, food or trade reach the owner from "Troyes"
    And the official of "Troyes" has fled

  @REBL-036
  Scenario: A rebellion makes neighbouring lords waver and besieges castles
    Given a faith rising holds 3 provinces of the country "France"
    And the lord "Count of Armagnac" holds a neighbouring province and shares the rebels' faith
    When the month is processed
    Then the lord "Count of Armagnac" wavers
    And the rebels besiege castles in the provinces they hold

  @REBL-037
  Scenario: A great revolt is a civil war
    Given a rising of the country "France" is a "Great revolt"
    When the month is processed
    Then every lord of "France" picks a side by his loyalty
    And the allies of "France" may stay out
    And rival AIs may attack "France"

  @REBL-038 @REBL-039
  Scenario Outline: Spread factors
    Given a tax rising holds the province "Troyes"
    And the neighbouring province "Sens" <condition>
    When the spread roll for "Sens" is made
    Then the chance to spread to "Sens" is <direction>

    Examples:
      | condition                                                 | direction |
      | has the same grievance                                    | higher    |
      | shares the rebels' faith                                  | higher    |
      | is joined to "Troyes" by a road, a river and traders      | higher    |
      | has many homeless                                         | higher    |
      | is owned by a country whose army is away at war           | higher    |
      | is owned by a country that answered the last rising with a massacre | higher |
      | lies where a rival is paying the rebels                    | higher    |
      | has no shared grievance                                   | lower     |
      | is behind a garrisoned castle on the road from "Troyes"   | lower     |
      | is run by a judge                                         | lower     |
      | is owned by a country whose army is in the region         | lower     |
      | is owned by a country that pardoned the last rising       | lower     |
      | has an almshouse                                          | lower     |

  @REBL-039
  Scenario: A neighbour with a shared grievance gets Neighbour in revolt
    Given a tax rising holds the province "Troyes"
    And the neighbouring province "Sens" has the grievance "Heavy taxes"
    When the month is processed
    Then the province "Sens" has the grievance "Neighbour in revolt"
    When the rising in "Troyes" is beaten
    Then the province "Sens" no longer has the grievance "Neighbour in revolt"

  @REBL-040
  Scenario: A disloyal lord of the rebels' faith joins with his retinue
    Given a faith rising holds the province "Troyes"
    And the lord "Count of Armagnac" is "Disloyal" and shares the rebels' faith
    When "Count of Armagnac" joins the rising with his retinue
    Then the rising becomes a lord's revolt
    And the rising carries "Soldiers"

  @REBL-042
  Scenario: Rebels loot, drive out officials and make scholars flee
    Given a rising holds the province "Troyes" for a season
    And the province "Troyes" has a market and a loom house
    When the season ends
    Then the rebels loot the market first
    And the officials of "Troyes" are killed or driven out
    And the scholars of "Troyes" flee

  @REBL-043
  Scenario: A long rising keeps pulling in men
    Given a tax rising has held the province "Troyes" for 6 months
    And "Heavy taxes" still holds in "Troyes"
    When the month is processed
    Then more men join the rising

  @REBL-044
  Scenario: A rising in the capital is a great revolt at once
    Given the capital of the country "France" is the province "Paris"
    When a rising starts in the province "Paris"
    Then its severity tier is "Great revolt"
