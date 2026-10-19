@context-tribes
Feature: Settlers on our land
  As a tribal realm
  I want settlers who found a colony on my hunting ground to pay for it, and a colonial power to be able to ask instead
  So that colonising tribal land is a diplomatic choice and not a free one

  @TRIBE-021
  Scenario Outline: A colony on a ground meets fiercer people
    Given "Southeast Mississippi" is a hunting ground of "Creek"
    And a governor of "Castile" goes ashore in "Southeast Mississippi"
    When the local aggression rolls "<rolled>"
    Then the colony's local aggression is "<result>"

    Examples:
      | rolled   | result  |
      | Peaceful | Wary    |
      | Wary     | Hostile |
      | Hostile  | Fierce  |
      | Fierce   | Fierce  |

  @TRIBE-022 @placeholder
  Scenario: The tribe holds a wrong and a war aim
    # config keys: tribes.settlers_wrong, tribes.settlers_punish_years
    Given "Southeast Mississippi" is a hunting ground of "Creek"
    When "Castile" starts founding a colony in "Southeast Mississippi" on 1 June 1510
    Then "Creek" holds the wrong "Settlers on our land" of -30 against "Castile", fading over 20 years
    And "Creek" holds the war aim "Punish" against "Castile" until 1 June 1520

  @TRIBE-023 @TRIBE-024 @placeholder
  Scenario: Asking for the land
    # config key: tribes.land_price
    Given "Southeast Missouri" is a hunting ground of "Creek"
    When "Castile" asks "Creek" for "Southeast Missouri" offering 10 gold
    And a month later "Creek" says yes
    Then "Creek" gains 10 gold and "Castile" loses 10 gold
    And "Southeast Missouri" is no longer a hunting ground of "Creek"
    And "Creek" may not claim "Southeast Missouri" again for 10 years
    And the next colony of "Castile" in "Southeast Missouri" rolls "Peaceful"
    And that colony counts as founded with the consent of the local people

  @TRIBE-025
  Scenario Outline: The reasons for giving up land
    Given "Creek" is asked for one of its hunting grounds by "Castile"
    And <fact>
    Then the reasons count of "Creek" counts it as <weight>

    Examples:
      | fact                                                         | weight       |
      | "Castile" offers more gold than the asking price             | a yes        |
      | "Creek" holds "Settlers on our land" against "Castile"       | a no         |
      | the stance of "Creek" toward "Castile" is Hostile             | a no         |
      | it is the last hunting ground of "Creek"                     | a strong no  |
