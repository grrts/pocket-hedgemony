@context-exploration
Feature: Voyages into the fog
  As a player or AI country
  I want to draw a path for my exploration ships into the parchment
  So that they chart new coasts and come home before their supply runs out

  @EXPL-017 @EXPL-019
  Scenario: The São Gabriel voyage preview
    Given the caravel "São Gabriel" of the country "Portugal" is in the port "Lagos" with 60 supply
    When the player draws a voyage of 34 zones, 21 of them uncharted
    Then the voyage shows 34 zones and 21 uncharted
    And the voyage shows supply 60 of 60, 34 out and 34 back, 8 short
    And the voyage lists "Arguin" as a canoe landing with no dock and "Elmina" as uncharted
    And the voyage offers "Turn back" and "Carry on" on low supply

  @EXPL-018
  Scenario: A voyage always leaves port with full supply
    Given the caravel "São Gabriel" is in the port "Lagos" with 40 of 60 supply
    When the voyage starts
    Then the caravel leaves the port "Lagos" with 60 supply

  @EXPL-020
  Scenario: Turn back is the default
    Given a caravel on a voyage set to "Turn back"
    And the nearest port where it may dock is 12 zones away
    When its supply left falls to 12
    Then the caravel turns and sails to that port

  @EXPL-021 @placeholder
  Scenario: Carry on runs out of supply if it must
    # config: naval.out_of_supply_crew_loss
    Given a caravel with a crew of 25 on a voyage set to "Carry on"
    And its path is 8 zones longer than its supply allows
    When it sails the path to its end
    Then it sails the last zones with no supply
    And it loses 1 in 10 of its crew for each zone sailed without supply

  @EXPL-022
  Scenario Outline: Docking on the way
    Given a Castilian caravel on a voyage reaches a port of the country "<owner>"
    And the country "<owner>" is <relation> of the country "Castile"
    When the caravel tries to dock
    Then docking is <result>

    Examples:
      | owner    | relation                 | result                |
      | Castile  | the realm                | allowed, paid in food |
      | Genoa    | at peace and not a rival | allowed, paid in gold |
      | Portugal | a rival                  | refused               |

  @EXPL-023
  Scenario: What a voyage finds
    Given a Castilian caravel charts the coast of "Hispaniola"
    When the land is newly charted
    Then the country "Castile" sees its terrain, its owner and its ports
    And nothing else about its peoples is shown

  @EXPL-012 @EXPL-022
  Scenario: Castile 1493, the first voyage
    Given the country "Castile" has the exploration unlock and knows S5
    And three caravels sail from the port "Seville" to the Canaries and dock for food from the province
    When they sail 17 uncharted zones west with 60 supply each
    Then the voyage preview shows enough supply to get there and back
    And they chart the Bahamas and the coast of "Hispaniola"
    And they come home
