@context-diplomacy
Feature: Arms and fear
  As an AI country
  I want to keep a standing army against my neighbours and feel threatened by a much stronger one
  So that a player who builds an army meets realms that arm, borrow and fight back

  # Leroy, 19 Oct (F-165). No rivalry: fear is measured from the armies each month.
  # Config keys: diplomacy.arms_and_fear.fear, .standing, .war, .borrow (all provisional).

  @DIPL-231 @placeholder
  Scenario Outline: Fear of a stronger neighbour
    Given a realm whose side has a strength of <side>
    And a neighbour, neither ally, overlord nor subject, with a strength of <neighbour>
    When the realm measures its neighbours
    Then it is <fear> of that neighbour

    Examples:
      | side   | neighbour | fear       |
      | 40000  | 50000     | calm       |
      | 40000  | 60000     | wary       |
      | 40000  | 100000    | threatened |

  @DIPL-231 @placeholder
  Scenario: Friends count on a realm's side
    Given a realm with a strength of 20000 and allies with strengths of 30000 and 10000
    When the realm measures its neighbours
    Then its side counts 40000

  @DIPL-232 @placeholder
  Scenario Outline: A standing army sized against the neighbours
    Given an AI realm at peace with a troop cap of <cap> and <income> gold a month before army pay
    And the largest force under arms of a neighbour that is not its friend is <largest> men
    And a levy's pay is 1 gold a month per 1000 men
    And the realm is <fear>
    When it sizes its standing army
    Then it keeps <target> men under arms

    Examples:
      | cap   | income | largest | fear       | target |
      | 40000 | 1000   | 0       | calm       | 10000  |
      | 40000 | 1000   | 30000   | calm       | 15000  |
      | 40000 | 1000   | 0       | threatened | 20000  |
      | 40000 | 1000   | 100000  | calm       | 20000  |
      | 40000 | 5      | 30000   | calm       | 2000   |

  @DIPL-232
  Scenario: Levies beyond the standing army go home, never below it
    Given an AI realm at peace keeps a standing army of 20000 men
    And it has levies of 3000, 4000, 6000 and 30000 men whose free months are over
    When the AI calls and sends home its men
    Then the levies of 3000, 4000 and 6000 men go home
    And the levy of 30000 men stays

  @DIPL-233
  Scenario: Calling men across the realm at war
    Given the AI country "France" is at war with a commander free
    When the AI calls its men for the month
    Then it calls men in its royal provinces with the most men to call, near its capital or not
    And at most 3 thousands in a province
    And at most a quarter of its troop cap in the month

  @DIPL-234
  Scenario Outline: Borrowing for war
    Given an AI realm that is <state> pays its army 10 gold a month and holds 5 gold
    When the AI sees to its treasury
    Then it <does>

    Examples:
      | state           | does                                  |
      | at war          | borrows until it holds 30 gold        |
      | Threatened      | borrows until it holds 30 gold        |
      | calm at peace   | takes no loan                         |

  @DIPL-235
  Scenario: A realm's card says it fears you
    Given the player is "France" and "Savoy" is Threatened of France at 11.3 times its side
    And Savoy also fears "Milan"
    When the player opens Savoy's Diplomacy tab
    Then What they think of you says "Threatened of you: your strength is 11.3 times their side's"
    And it names Milan as a realm they fear, as a link to Milan's card

  @DIPL-236
  Scenario: Neighbours who fear you on Your name abroad
    Given the player is "France" and "Savoy" is Threatened and "Burgundy" Wary of France
    When the player opens their own Diplomacy tab
    Then Your name abroad has the row "Neighbours who fear you" with "2 realms · 1 threatened", marked red
    And a tap opens Savoy and Burgundy with Threatened and Wary and how many times their side France is
    And when Savoy first comes to be Threatened by France a news line says so
