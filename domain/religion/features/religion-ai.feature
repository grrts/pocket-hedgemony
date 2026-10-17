@context-religion
Feature: Religion choices of the AI
  As an AI country
  I want to use the same faith levers as the player, steered by my personality
  So that computer realms tolerate, restrict and convert as history did

  @RELG-119 @placeholder
  Scenario Outline: Building houses
    # config key: ai.build_state_house_where_state_share_below
    Given the AI country "Testland" has gold to spare
    And its state faith is <share> of the province "Testshire"
    And <minority>
    Then the AI <action>

    Examples:
      | share | minority                                                     | action                                           |
      | 40 %  | no minority has Wrong faith                                  | builds a house of the state faith in "Testshire" |
      | 60 %  | no minority has Wrong faith                                  | builds no house in "Testshire"                   |
      | 60 %  | a minority has Wrong faith there and its lords are wavering  | builds a house of that minority in "Testshire"   |

  @RELG-120 @placeholder
  Scenario Outline: Policy by personality
    # config keys: ai.tolerate_faith_above_realm_share, ai.zealous_personalities_restrict, ai.persecute_only_after_event_or_religious_war
    Given the AI country "Testland" has the personality "<personality>"
    And the faith "jewish" is 25 % of its realm
    And <history>
    Then the AI sets jewish to "<policy>"

    Examples:
      | personality  | history                                    | policy     |
      | mercantile   | no event or war of religion                | Tolerated  |
      | zealot       | no event or war of religion                | Restricted |
      | zealot       | a war of religion has been fought          | Persecuted |

  @RELG-121
  Scenario: Where the AI sends preachers
    Given the AI country "Testland" has a free preacher
    And its state faith is under half in its province "Testshire"
    And a neighbour has given it leave to preach
    Then it sends the preacher to "Testshire" first

  @RELG-122 @placeholder
  Scenario Outline: When the AI changes faith
    # config key: ai.adopt_faith_without_event_above_realm_share
    Given a faith is <share> of the AI country's realm and <event>
    Then the AI <adopts> it

    Examples:
      | share | event                    | adopts         |
      | 61 %  | no event offers it       | adopts         |
      | 45 %  | no event offers it       | does not adopt |
      | 10 %  | an event offers it       | may adopt      |
