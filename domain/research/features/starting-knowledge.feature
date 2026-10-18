@context-research
Feature: What each country knows in 1444
  As the game
  I want countries to start with what they historically knew
  So that the tree starts from history

  @RSCH-050
  Scenario: Everyone knows the root and the branches
    Given the date is 1444
    When any country is set up
    Then it knows "Settled life" and the four branches

  @RSCH-051 @RSCH-076 @placeholder
  Scenario Outline: Historical starting inventions
    # config: research.start_region_members, research.start_extra
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

  @RSCH-076
  Scenario: Starting knowledge brings what it needs, but no progress
    Given the date is 1444
    When the country "Portugal" is set up
    Then it knows "S1 Magnetic compass and sea charts" and "S2 Lateen and junk rigging", which "S4 Carrack and caravel" needs
    And it does not know "L25 computing"
    And it has no study under way
