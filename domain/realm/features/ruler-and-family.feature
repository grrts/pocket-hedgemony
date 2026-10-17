@context-realm
Feature: Ruler and family
  As the game
  I want a ruler who ages, reigns, marries and leaves heirs under the realm's inheritance law
  So that succession shapes the loyalty of the lords

  @REALM-100
  Scenario: A child ruler needs a regent
    Given the ruler of "France" dies and his heir is 7 years old
    When the heir takes the throne
    Then a regent rules for him
    And lords lose loyalty for a child ruler

  @REALM-100
  Scenario: The ruler ages each year and old rulers die
    Given King Charles VII of "France" is 41
    When a year passes
    Then he is 42
    And an old ruler may die

  @REALM-101
  Scenario Outline: Years on throne reset with a new ruler
    Given King Charles VII has reigned 23 years
    When he <ends>
    Then the new ruler has 0 years on the throne
    And more lords are wavering

    Examples:
      | ends             |
      | dies             |
      | is deposed       |
      | abdicates        |

  @REALM-102
  Scenario Outline: Heirs
    Given the ruler of "France" has 2 heirs
    When <cause>
    Then the ruler of "France" has <count> heirs

    Examples:
      | cause                                         | count |
      | a child is born                               | 3     |
      | the ruler names a relative as heir            | 3     |
      | an heir dies                                  | 1     |
      | a daughter marries abroad                     | 1     |
      | an heir goes over to a rebel lord             | 1     |

  @REALM-103
  Scenario: No heir means a succession war
    Given the ruler of "Navarre" has no heir
    When the ruler dies
    Then the lords of "Navarre" fight a succession war

  @REALM-104
  Scenario: Traits lean the ruler's choices
    Given the ruler of "France" has the traits "Pious" and "Builder"
    When an event offers him options
    Then he leans toward the options that fit "Pious" and "Builder"
    And he gets small bonuses from those traits

  @REALM-105
  Scenario Outline: Marriages
    Given the ruler of "France" has an unmarried princess
    When <cause>
    Then <result>

    Examples:
      | cause                                                | result                                          |
      | she marries into the ruling house of "Castile"       | "France" and "Castile" have a living marriage tie, with goodwill |
      | she marries into the house of the lord "Armagnac"    | the lord "Armagnac" gains loyalty               |
      | she dies                                             | the marriage tie ends                           |
      | "France" and "Castile" go to war                     | the marriage tie ends                           |

  @REALM-105
  Scenario: A marriage can lead to inheriting a realm
    Given the ruling house of "France" is married into the ruling house of "Brittany"
    When the ruler of "Brittany" dies and the marriage gives "France" the strongest claim
    Then the realm of "Brittany" may pass to the ruler of "France"

  @REALM-112 @open-question
  Scenario: The player cannot choose the inheritance law
    # OQ-REALM-4 (government asks for succession by form), OQ-REALM-5 (gap-lists still lists it as open)
    Given the country "France" passes the crown only through men
    When the player looks for a way to change it
    Then no command changes the inheritance law
    But an event or a reform can change it

  @REALM-113
  Scenario Outline: Who takes the throne
    Given the inheritance law of "<country>" is "<law>"
    When the ruler of "<country>" dies
    Then the throne goes to <who>

    Examples:
      | country               | law                          | who                                        |
      | France                | eldest son                   | the ruler's eldest son                     |
      | Castile               | eldest child                 | the ruler's eldest child, a daughter if she is eldest |
      | Holy Roman Empire     | election by lords            | the candidate the electors choose          |
      | a steppe realm        | strongest claimant           | the strongest claimant among the lords     |
      | a house-ruled realm   | eldest of the house          | a brother or the eldest of the house       |
