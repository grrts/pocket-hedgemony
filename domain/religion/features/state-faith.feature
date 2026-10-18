@context-religion
Feature: Changing the state faith
  As a player
  I want to adopt a new state faith when my people already hold it or an event offers it
  So that changing faith is cheap when the people led and dangerous before

  @RELG-074 @placeholder
  Scenario Outline: When Adopt a faith is offered
    # config key: state_faith_change
    Given the country "Saxony" has the state faith "catholic"
    And protestant is <capital> of its capital province and <realm> of the realm
    And <event>
    Then "Adopt a faith" for protestant is <offered>

    Examples:
      | capital | realm | event                                   | offered     |
      | 30 %    | 10 %  | no event offers it                      | offered     |
      | 20 %    | 40 %  | no event offers it                      | offered     |
      | 20 %    | 30 %  | no event offers it                      | not offered |
      | 5 %     | 5 %   | the Reformation event offers it         | offered     |

  @RELG-075 @RELG-076 @RELG-077
  Scenario: Adopting a faith and taking over the church
    Given the country "Sweden" has the state faith "catholic" and 3 catholic preachers
    When "Sweden" adopts "protestant" and takes over the catholic houses, closing catholic schools
    Then the state faith of "Sweden" is "protestant"
    And catholic is Tolerated and can be changed from the next New Year
    And "Sweden" has no catholic preachers and no protestant preachers until protestant houses exist
    And the catholic houses become protestant and their pull flips
    And their property's gold is paid into the treasury, twice for monastic land
    And an "insult to faith" spark is raised where each house was taken
    And catholic schools close
    And catholic lords lose one step and protestant lords gain one step

  @RELG-076
  Scenario: Adopting a faith and keeping the old houses
    When "Sweden" adopts "protestant" and keeps the catholic houses
    Then the catholic houses serve the catholic community

  @RELG-078 @placeholder
  Scenario Outline: Thirty years between adoptions by decision
    # config key: state_faith_change.cooldown_years
    Given "Sweden" adopted a faith by decision in 1527
    And the date is <date>
    When "Sweden" tries to adopt a faith <how>
    Then it is <result>

    Examples:
      | date | how          | result  |
      | 1550 | by decision  | refused |
      | 1557 | by decision  | allowed |
      | 1550 | by an event  | allowed |

  @RELG-079
  Scenario: Cuius regio
    Given the event "peace_of_augsburg" has fired
    And the country "Palatinate" is inside the Empire with the state faith "protestant"
    And catholic is 2 % of its capital and of the realm
    Then the Palatinate may adopt "catholic"
    But it may not adopt "orthodox" this way

  @RELG-068 @RELG-075
  Scenario: Preachers after adopting a faith follow their sources
    Given the country "Sweden" has the state faith "catholic" and 3 catholic preachers
    And an event has granted "Sweden" 2 protestant preachers for 30 years
    When "Sweden" adopts "protestant" and keeps the catholic houses
    Then "Sweden" has 2 protestant preachers before any protestant house exists

  @RELG-123
  Scenario Outline: Taking a reformed faith
    Given the country "<country>" has the state faith "<old>"
    When "<country>" adopts "<new>"
    Then the ruler of "<country>" <takes> a reformed faith for government's reforms

    Examples:
      | country | old        | new        | takes        |
      | Prussia | catholic   | protestant | takes        |
      | England | catholic   | anglican   | takes        |
      | Sweden  | protestant | catholic   | does not take |
      | Kazan   | sunni      | orthodox   | does not take |
