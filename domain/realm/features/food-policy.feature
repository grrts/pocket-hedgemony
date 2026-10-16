@context-realm
Feature: The Food policy screen
  As a player
  I want to set the food rules once for the whole realm, with overrides per castle
  So that I never move sacks by hand

  @REALM-040
  Scenario: A castle overrides the realm default
    Given the country "France" has the realm collection set to 25 %
    When the country "France" sets the castle of "Calais" to collect 75 %
    Then the castle of "Calais" collects 75 %
    And every other French castle collects 25 %

  @REALM-041 @placeholder
  Scenario Outline: Collection sends a share of the surplus to the castle
    Given the province "Troyes" has a surplus of 32,000 people's food for a year
    And the realm collection is <share>
    When the collection runs
    Then <sent> goes to the nearest castle and the rest stays in the local store

    Examples:
      | share | sent   |
      | 0 %   | 0      |
      | 25 %  | 8,000  |
      | 50 %  | 16,000 |
      | 75 %  | 24,000 |

  @REALM-042
  Scenario Outline: Castle shares divide the collected food
    Given the country "France" has collected food in 9 castles
    When the castle shares are set to "<rule>"
    Then each castle's share is <share>

    Examples:
      | rule           | share                                                    |
      | By people      | in proportion to the people around it                    |
      | Frontier first | larger for border castles                                |
      | Capital first  | larger for the capital's castle                          |
      | Equal          | the same for every castle                                |
      | Custom         | the slider per castle, summing to 100 %                  |

  @REALM-042
  Scenario: Custom shares must sum to 100 %
    Given the country "France" sets custom castle shares
    When the sliders sum to 90 %
    Then the shares are not accepted until they sum to 100 %

  @REALM-043 @placeholder
  Scenario Outline: Spread patterns by ring
    Given the castle of "Troyes" has 100 sacks to hand out after its reserve
    When its spread pattern is "<pattern>"
    Then its own province gets <own>, the next ring shares <next> and the ring beyond shares <beyond>

    Examples:
      | pattern  | own | next | beyond |
      | 50/30/20 | 50  | 30   | 20     |
      | Tight    | 80  | 20   | 0      |
      | Wide     | 30  | 35   | 35     |

  @REALM-044 @placeholder
  Scenario Outline: The siege reserve is never spread
    Given the castle of "Calais" holds 14 months of food
    When its siege reserve is <reserve> months and the spread runs
    Then it keeps at least <reserve> months

    Examples:
      | reserve |
      | 0       |
      | 3       |
      | 6       |
      | 12      |

  @REALM-045 @open-question
  Scenario Outline: Army refill at home
    # OQ-REALM-3: warfare takes from the castle first, then the locals
    Given a French army refills its food reserve at home in "Troyes", a lord's province "Dijon" or a royal province
    When the army refill rule is "<rule>"
    Then <result>

    Examples:
      | rule                       | result                                                 |
      | Locals only                | it is taken from the province's local store            |
      | Castles hand out first     | the castle hands it out before the locals give         |
      | No refill in lords' lands  | it cannot refill in "Dijon"                            |

  @REALM-046 @placeholder
  Scenario Outline: The famine rule
    Given the province "Sens" has <months> months of food in store
    And the famine rule is "<rule>"
    When the castle of "Troyes" spreads its food
    Then "Sens" <result>

    Examples:
      | months | rule     | result                                            |
      | 0.5    | 1 month  | is fed first, ignoring the spread pattern         |
      | 2      | 3 months | is fed first, ignoring the spread pattern         |
      | 2      | 1 month  | gets its share by the spread pattern              |
      | 0.5    | Off      | gets its share by the spread pattern              |

  @REALM-047
  Scenario Outline: Surplus above the granary
    Given the castle of "Troyes" holds more than its granary size
    When the surplus rule is "<rule>"
    Then the food above the granary size <result>

    Examples:
      | rule                         | result                          |
      | Keep                         | stays and rots                  |
      | Sell on the market           | is sold for gold                |
      | Send to the capital castle   | goes to the castle of the capital |
      | Send to subjects or allies   | goes to subjects or allies      |

  @REALM-048 @placeholder
  Scenario Outline: Lords' castles follow the policy by loyalty
    Given the lord "Philip of Burgundy" is "<loyalty>"
    When the country "France" sets collection to 50 %
    Then his castles collect <collection>

    Examples:
      | loyalty  | collection                   |
      | Loyal    | 50 %                         |
      | Wavering | 25 %                         |
      | Disloyal | nothing for you; he keeps his food |

  @REALM-049 @placeholder
  Scenario Outline: Presets fill the whole screen
    Given the country "France" has its own food settings
    When the country "France" picks the food preset "<preset>"
    Then collection is <collection>, castle shares "<shares>", spread "<spread>", siege reserve <reserve> months and army refill "<refill>"

    Examples:
      | preset           | collection | shares         | spread   | reserve | refill                     |
      | Feed the people  | 25 %       | By people      | Wide     | 3       | Castles hand out first     |
      | Fortress realm   | 50 %       | Frontier first | Tight    | 12      | Locals only                |
      | War footing      | 75 %       | Frontier first | 50/30/20 | 6       | Castles hand out first     |
      | Merchant         | 50 %       | Capital first  | 50/30/20 | 3       | No refill in lords' lands  |

  @REALM-049
  Scenario: The Merchant preset sells the surplus
    Given the country "Venice" keeps its surplus
    When the country "Venice" picks the food preset "Merchant"
    Then its surplus rule is "Sell on the market"
