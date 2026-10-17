@context-diplomacy
Feature: Marriages and pretenders
  As a ruler
  I want marriages between ruling houses that can bring claims, pretenders and crowns
  So that dynasties are people, not points

  @DIPL-104
  Scenario Outline: A marriage needs a free heir or child on each side
    Given the ruling house of "A" <a_has>
    And the ruling house of "B" <b_has>
    When the country "A" proposes a marriage to the country "B"
    Then the proposal is <result>

    Examples:
      | a_has                     | b_has                     | result  |
      | has an unmarried daughter | has an unmarried heir     | sent    |
      | has no unmarried child    | has an unmarried heir     | refused |

  @DIPL-104
  Scenario: Houses of hostile faiths need the tolerance rule
    # The tolerance rule itself belongs to the religion context
    Given the ruling houses of "A" and "B" follow hostile faiths
    And the religion rules do not allow the marriage
    When the country "A" proposes a marriage to the country "B"
    Then the proposal is refused

  @DIPL-105 @placeholder
  Scenario Outline: The marriage count's own reasons
    # config: actions.arrange_marriage
    Given the realm of "A" has <people> the people of "B"
    And the houses of "A" and "B" are already bound by <marriages> marriages
    When the country "A" proposes a marriage to the country "B"
    Then the marriage's own reasons total <number>

    Examples:
      | people    | marriages | number |
      | more than | 0         | -5     |
      | fewer than| 0         | -15    |
      | more than | 1         | -15    |

  @DIPL-106
  Scenario: A marriage is agreed
    Given the diplomacy rules are in force
    When the country "B" agrees to a marriage with the country "A"
    Then the fact "royal_marriage" exists between "A" and "B"
    And each ledger between them holds "Married houses"

  @DIPL-107 @placeholder
  Scenario: A heirless death may raise a claim
    # config: actions.arrange_marriage.claim_chance_per_heirless_death
    Given the houses of "Castile" and "Aragon" are bound by 1 living marriage
    When the ruler of "Aragon" dies without a direct heir
    And the 1 in 10 roll comes up
    Then the fact "dynastic_claim" from "Castile" to "Aragon" exists
    And a pretender to the throne of "Aragon" sits at the court of "Castile"

  @DIPL-108
  Scenario Outline: Where pretenders come from
    Given <source>
    When the game evaluates it
    Then the country "<court>" holds a pretender to the throne of "<throne>"
    And the country "<court>" holds the war aim "Seat a pretender" against "<throne>"

    Examples:
      | source                                                        | court   | throne  |
      | Austria holds Ladislaus V at its court in 1444                | Austria | Hungary |
      | an exile of "B" flees to "A" after a lost succession war      | A       | B       |
      | an event places a pretender of "B" at the court of "A"        | A       | B       |

  @DIPL-109
  Scenario Outline: When a pretender dies
    Given the pretender "Duke Rupert" to the throne of "B" sits at the court of "A"
    When "Duke Rupert" dies <heir>
    Then <result>

    Examples:
      | heir               | result                                   |
      | leaving a son      | his son becomes the pretender            |
      | with no heir       | the claim lapses                         |

  @DIPL-110
  Scenario: Inheriting a crown
    Given the ruler of "Aragon" dies with no heir at all
    And the house of "Castile" holds the most marriages with the house of "Aragon"
    When the succession is resolved
    Then the realm of "Aragon" passes to the ruler of "Castile"
    And the union is handed to the subjects context as "personal_union"
    And each Wavering or Disloyal lord of "Aragon" rolls to rise for a local claimant as a succession war
