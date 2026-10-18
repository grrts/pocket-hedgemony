@context-buildings
Feature: AI building
  As an AI country
  I want to build by the same rules with a short priority list
  So that computer realms grow sensibly and cheaply

  @BLD-145 @BLD-146
  Scenario Outline: The first rule that fits
    Given the AI country "Castile" checks the province "Toledo" this month
    And "Toledo" has <situation>
    When the building rules are applied
    Then the AI picks <choice>

    Examples:
      | situation                                             | choice                                                  |
      | a ruined market it can pay to rebuild                 | to repair or rebuild the market                         |
      | under 3 months of food and an empty fields tile       | a food building on the empty tile                       |
      | homeless over 5 %                                     | the building whose class can take most of them          |
      | wool and no loom house in reach                       | a loom house                                            |
      | a border with a country it expects war with           | a castle step or walls                                  |
      | a low share of its faith                              | a house of worship                                      |
      | none of the above and a mercantile personality        | a market or a harbour                                   |

  @BLD-146
  Scenario: One province a month, at most one building
    Given the AI country "Castile" has 20 provinces
    When a month passes
    Then the AI checks one province and starts at most one building

  @BLD-147 @placeholder
  Scenario Outline: Reserve and crew
    Given the AI country "Castile" has building upkeep of 60 gold a year
    And it has <gold> gold
    And the site <crew>
    When the building rules are applied
    Then the AI <starts> the site

    Examples:
      | gold | crew                    | starts         |
      | 100  | can be crewed           | starts         |
      | 50   | can be crewed           | does not start |
      | 100  | cannot be crewed        | does not start |
