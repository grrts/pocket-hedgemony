@context-map-presentation
Feature: Parchment over uncharted land
  As a player
  I want what my realm doesn't know to lie under parchment
  So that exploring the world is something I see happen

  @VIEW-032
  Scenario: Uncharted land and sea lie under the parchment
    Given the country "Castile" has not charted the coast of Hispaniola
    When the map is drawn for Castile
    Then Hispaniola's coast lies under the parchment

  @VIEW-033
  Scenario: The parchment only shrinks
    Given a caravel of "Castile" charted the Bahamas
    When the caravel returns home
    Then the Bahamas stay out from under the parchment

  @VIEW-034 @open-question
  # OQ-VIEW-3: display toggle against the charted map as gameplay and the fog option
  Scenario Outline: The parchment can be switched off for viewing
    Given the switch "Parchment over unknown lands" is <switch>
    When the map is drawn
    Then <shown>
    And nothing in the simulation changes

    Examples:
      | switch | shown                                      |
      | on     | uncharted places lie under the parchment   |
      | off    | the whole world is shown                   |
