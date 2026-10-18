@context-national-strengths
Feature: Who gets heritage, and how it is generated
  As the game
  I want every playable country to have heritage, hand-written or generated
  So that all 706 playable countries play differently

  @HER-051 @HER-052
  Scenario Outline: Heritage by group
    Given a country in the group "<group>"
    When heritage is built
    Then it gets <heritage>

    Examples:
      | group                                   | heritage                                                         |
      | tier A playable                         | hand-written birthright, 2–3 golden ages, 5–7 ambitions and a weakness |
      | tier B and C playable                   | generated heritage by archetype                                  |
      | decentralised polity                    | generated heritage with a decentralised archetype                |
      | background or non-state actor           | no heritage                                                      |

  @HER-052
  Scenario: Build counts
    Given the country catalogue
    When heritage is built
    Then 706 countries have heritage: 58 hand-written and 648 generated
    And 257 have none

  @HER-053 @HER-054 @HER-055
  Scenario: Igbo village-group societies are generated as forest people
    Given "Igbo village-group societies" is a decentralised polity matching the archetype "forest people"
    When heritage is built
    Then its birthright "paths of the forest" makes foot fight harder and march faster in forest and makes conquerors' Foreign rule last longer
    And its golden age "forest refuge" belongs to the "Age of Atlantic Empires" and is active while at war
    And its ambitions include outlasting "Benin" and enduring as an independent people to 1600

  @HER-054
  Scenario Outline: The first age whose regions cover the country
    Given a forest people in "<region>"
    When its golden age is generated
    Then the golden age belongs to the "<age>"

    Examples:
      | region         | age                       |
      | the Americas   | Age of Atlantic Empires   |
      | West Africa    | Age of Atlantic Empires   |
      | Southeast Asia | Age of Exploration        |
      | Central Asia   | Age of Gunpowder Empires  |

  @HER-056
  Scenario: Decentralised polities take crownless archetypes only
    Given a decentralised polity
    When it is scored against archetypes
    Then it can only take forest, hill, herding, steppe, desert, island, mountain, ocean, chiefdom, commune, raiders or segmentary archetypes

  @HER-057
  Scenario: Best and second-best archetypes
    Given two sea-trading cities in different regions
    When heritage is generated
    Then each takes its birthright and weakness from its best archetype
    And its second-best archetype may add a golden age, so the two differ

  @HER-058
  Scenario: Authored overrides generated
    Given a generated country gets a file in data/authored defining only its birthright
    When heritage is built
    Then its birthright is the authored one
    And its other parts stay generated

  @HER-075 @HER-076 @HER-077
  Scenario: Build and report
    Given the heritage tools extract_vocab.py, make_archetypes.py and build_heritage.py
    When heritage is built
    Then build/report.md lists budget overruns, unknown ids and place names still to bind
    And nothing outside the national-strengths folder is changed
    And "build_heritage.py --check FILE.json" checks one authored file
