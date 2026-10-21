@context-events
Feature: Bridge events of the West, 1378 to 1444
  As a player of the 1378 start
  I want the Church, the Empire, France and England, Iberia and Italy to meet their history as events
  So that the Schism, Agincourt, Troyes or Ceuta can happen, late, early or not at all

  @EVT-087
  Scenario: A 1444 campaign already has the West's history
    Given a campaign starts on today's map in 1444
    Then the tree counts "treaty_of_troyes" as history with the choice "accept_troyes"
    And the tree counts "council_of_constance" as history
    And no event of the West fires in the first year

  @EVT-087
  Scenario: A 1378 campaign has none of it yet
    Given a campaign starts on today's map on 20 September 1378
    Then the tree counts no event of the West as history
    And the period "p_western_schism" is under way

  @EVT-088
  Scenario: France declares for Clement, then the Catholic realms choose
    Given a campaign starts on today's map on 20 September 1378
    When the months play until five realms have chosen their Pope
    Then the tree has recorded "schism_vincennes"
    And no realm chose its Pope twice

  @EVT-086
  Scenario: The tree sees a child king's regent
    Given a campaign starts on today's map on 20 September 1378
    When the ruler of "france" is a child with a regent
    Then the tree sees the flag "regency" on "france"
    And the tree sees "france" of the faith "catholic"

  @EVT-086
  Scenario: The tree sees the Emperor
    Given a campaign starts on today's map on 20 September 1378
    Then the tree sees the flag "emperor" on the Emperor's realm

  @EVT-088
  Scenario: At Troyes the French king may give Paris to England
    Given a campaign starts on today's map on 20 September 1378
    And it is 1420, "england" is at war with "france" and holds Normandy, and the princes feud
    And the player plays "france"
    When the Treaty of Troyes comes to the player and they choose "accept_troyes"
    Then "Yvelines" passes to "england"

  @EVT-089
  Scenario: The end of the Hundred Years' War needs the Lancastrian conquest first
    Given a campaign starts on today's map on 20 September 1378
    Then "end_of_hundred_years_war" waits for "battle_of_agincourt" or "treaty_of_troyes"
