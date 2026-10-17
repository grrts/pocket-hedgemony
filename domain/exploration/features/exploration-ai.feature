@context-exploration
Feature: Exploration AI
  As an AI country
  I want to explore and colonise by my catalogue personality
  So that sea-minded realms open the world and land powers stay home

  @EXPL-053
  Scenario: A sea-minded AI explores the edge of its charts, then colonises
    Given the AI country "Portugal" favours expansion by sea in its catalogue personality
    And the country "Portugal" has the exploration unlock
    When the AI plans its exploration
    Then it sends exploration ships along the edge of its charted map
    And it founds colonies on the nearest unowned coasts

  @EXPL-053 @EXPL-062 @placeholder
  Scenario Outline: The AI loads enough stores for the roll plus a margin
    # config: exploration.ai.stores_margin (1.25)
    Given an AI colony rolled the local aggression "<level>"
    When the AI loads colony stores for it
    Then it loads <stores> rations, more than the <food> the level needs on average

    Examples:
      | level    | food | stores |
      | Peaceful | 360  | 450    |
      | Wary     | 460  | 575    |
      | Hostile  | 600  | 750    |
      | Fierce   | 900  | 1125   |

  @EXPL-054
  Scenario: Land powers never explore
    Given the AI country "Hungary" is a land power by its catalogue personality
    When the AI plans its turn
    Then it gives no voyage and founds no colony
