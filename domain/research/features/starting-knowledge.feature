@context-research
Feature: What each country knows in 1444
  As the game
  I want countries to start with what they historically knew
  So that the tree starts from history

  @RSCH-050
  Scenario: Everyone knows the root and the boughs
    Given the date is 1444
    When any country is set up
    Then it knows "Settled life" and the four boughs

  @RSCH-051 @open-question
  Scenario Outline: Historical starting inventions
    # OQ-RSCH-11: mapping from institutional_development and region
    Given the date is 1444
    When the country "<country>" is set up
    Then it typically knows "<invention>"

    Examples:
      | country  | invention                      |
      | Ming     | L5 printing                    |
      | Ming     | G4 Examination system          |
      | Korea    | L4 Metal movable type          |
      | Timurids | L3 Observatories               |
      | Portugal | S4 Carrack and caravel         |
      | Ottomans | W5 gunpowder_infantry          |
      | Inca     | G6 Quipu and knot records      |
