@context-scenario-setup
Feature: The 1444 map setup in today's build
  As the game
  I want the map's nations, owners, people, wealth and castles set by clear rules
  So that a 1444 world exists on the map until the catalogue plan replaces it

  @SETUP-040
  Scenario: A map nation has a capital, a colour and commanders
    Given the map nation "france"
    When the map setup is read
    Then it has the capital at longitude 2.35 and latitude 48.85
    And it has a colour and the commander "Jean de Dunois" with might, cunning and logistics

  @SETUP-041
  Scenario: The first matching owner rule wins
    Given an owner rule giving modern "FRA" inside a box around Calais to "england"
    And a later rule giving "Hauts-de-France" in a larger box to "burgundy"
    When the map setup hands out provinces
    Then the Calais province belongs to England

  @SETUP-042
  Scenario: A nation with no province is left out
    Given a nation whose owner rules match no province
    When the map setup is built
    Then that nation is not in the nation list

  @SETUP-043
  Scenario: Neighbouring nations get different colours
    Given "france" and "burgundy" are neighbours
    When nation colours are chosen from the 32-colour palette
    Then France and Burgundy have different colours

  @SETUP-044 @placeholder
  Scenario Outline: Population follows settlement, ground and capitals
    Given an owned <ground> province of <km2> km² in a region of density <density>
    And it <capital> a capital
    When its 1444 population is set
    Then its population is about <people> thousand people before the spread of 0.7 to 1.3

    Examples:
      | ground    | km2   | density | capital | people  |
      | farmland  | 10000 | 30      | is not  | 390     |
      | mountains | 10000 | 30      | is not  | 105     |
      | farmland  | 10000 | 30      | is      | 975     |

  @SETUP-044
  Scenario: Unowned land is sparsely peopled
    Given an unowned province in a region of density 30
    When its 1444 population is set
    Then its density is at most 1.6 people per km²

  @SETUP-045 @placeholder
  Scenario Outline: Wealth follows the region, the coast and capitals
    Given a province in a region of wealth <base> that is <owned>, <coast> and <capital>
    When its 1444 wealth is set
    Then its wealth is <wealth> before the spread of 0.75 to 1.25, kept between 1 and 10

    Examples:
      | base | owned   | coast       | capital         | wealth |
      | 6    | owned   | coastal     | not a capital   | 7      |
      | 6    | owned   | coastal     | a capital       | 9      |
      | 6    | unowned | coastal     | not a capital   | 1      |
      | 4    | owned   | inland      | not a capital   | 4      |

  @SETUP-046
  Scenario Outline: Castles follow the stand-in rule
    Given an <owned> province that is <situation>
    When its 1444 walls are set
    Then it has <walls>

    Examples:
      | owned   | situation                                       | walls                        |
      | owned   | its nation's capital                            | a stone castle               |
      | owned   | inland with 450 thousand people                 | a stone castle               |
      | owned   | on a frontier in hills with 40 thousand people  | a stone castle               |
      | owned   | on a frontier on farmland with 120 thousand people | an earthwork ring fort    |
      | unowned | anything                                        | no walls                     |

  @SETUP-047 @placeholder
  Scenario: The engine's flat start values serve only realms with no assessment
    Given the config values "economy.startingTreasury" 50, "levies.menPerThousandPeople" 30 and "march.startingHorseShare" 0.2
    When a new campaign starts
    Then every nation with no catalogue assessment has 50 gold
    And its levies are 30 men per thousand people
    And its starting armies are one fifth horse
