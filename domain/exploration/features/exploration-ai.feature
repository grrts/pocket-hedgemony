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

  @EXPL-053 @open-question
  Scenario Outline: The AI loads enough stores for the roll plus a margin
    # depends on OQ-EXPL-13: the margin is not given
    Given an AI colony rolled the local aggression "<level>"
    When the AI loads colony stores for it
    Then it loads more than <food> rations

    Examples:
      | level    | food |
      | Peaceful | 360  |
      | Hostile  | 600  |
      | Fierce   | 900  |

  @EXPL-054
  Scenario: Land powers never explore
    Given the AI country "Hungary" is a land power by its catalogue personality
    When the AI plans its turn
    Then it gives no voyage and founds no colony
