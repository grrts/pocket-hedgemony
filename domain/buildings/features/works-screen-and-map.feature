@context-buildings
Feature: Works screen, map and notifications
  As a player
  I want one place to see every site, every problem and advice
  So that I can run the realm's building from one screen

  @BLD-132
  Scenario Outline: Buildings by zoom
    Given the buildings config of the design
    When the map is at <zoom> zoom
    Then buildings show as <shown>

    Examples:
      | zoom   | shown                                                                                          |
      | world  | only landmarks as small icons                                                                  |
      | region | castle, town size, harbour anchor, a hammer for sites, a cracked icon for neglected or damaged |
      | local  | each tile's building sprite and step, town buildings in the town, scaffolding, ash on ruins     |

  @BLD-133
  Scenario Outline: Works and Jobs lenses
    Given the player opens the "<lens>" lens
    When the building rules are applied
    Then provinces are coloured by <colouring>

    Examples:
      | lens  | colouring                                                          |
      | Works | sites green, neglected or damaged amber, ruined red                |
      | Jobs  | empty job slots against homeless people                            |

  @BLD-134
  Scenario: The Works screen
    Given the country "France" has 6 sites running and 84 gold of upkeep a year
    When the player opens the Works screen
    Then it shows "Upkeep 84 gold a year · 6 sites running"
    And it lists sites with months done and crew
    And it lists needs with "Pay" and "Rebuild" actions
    And it lists advice

  @BLD-135
  Scenario: At most five advice lines a year
    Given the country "France" has 9 provinces with homeless and empty tiles
    When the year begins
    Then the Works screen shows at most 5 advice lines

  @BLD-136
  Scenario: Build all advised
    Given the Works screen shows 3 advice lines costing 30, 40 and 60 gold
    And the player has set aside 75 gold
    When the player orders "Build all advised"
    Then every suggestion that fits within 75 gold is queued

  @BLD-137
  Scenario: Batch order
    Given the buildings config of the design
    When the player orders "a granary at every castle"
    Then a granary site starts at every castle where it fits

  @BLD-138
  Scenario Outline: Turn report lines
    Given the buildings config of the design
    When <event>
    Then the turn report has one line saying so

    Examples:
      | event                                   |
      | a building is finished                  |
      | a building is lost                      |
      | upkeep first goes unpaid in a month     |
