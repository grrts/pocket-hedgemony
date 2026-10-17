@context-province
Feature: Colonies and the people already there
  As a player
  I want colonies to take only free tiles in unowned land
  So that taking land from the people there always shows its cost

  @PROV-250 @PROV-298
  Scenario Outline: Only unowned provinces can be colonised
    Given the province "<province>" is <owned>
    When the country "Portugal" tries to found a colony there
    Then the founding is <result>

    Examples:
      | province  | owned                                | result  |
      | Madeira   | owned by no country                  | allowed |
      | Kongo     | owned by the country "Kongo"         | refused |
      | Iroquoia  | owned by a tribal country            | refused |
      | Virginia  | lived in by a stateless people       | allowed |

  @PROV-251
  Scenario: A colony takes only the free tiles
    Given the unowned province "Virginia" has 8 tiles, of which 3 are worked by the local people
    When a colony is founded there
    Then the colony takes the 5 free tiles
    And the local people keep their 3 tiles

  @PROV-252
  Scenario Outline: Settlement steps are gained
    Given the province "<province>" has the settlement "<before>"
    When <cause>
    Then the province "<province>" has the settlement "<after>"

    Examples:
      | province | before | cause                                                      | after          |
      | Madeira  | none   | a colonial governor founds a colony there                  | settlement     |
      | Malindi  | none   | the country founds a post with an envoy and gold           | trading post   |

  @PROV-298
  Scenario Outline: Settlement steps are the subjects design's colony stages
    Given the province "Virginia" has the settlement "<step>"
    Then its colony stage is "<stage>"

    Examples:
      | step         | stage          |
      | trading post | Outpost        |
      | settlement   | Settled        |
      | colony       | Self-governing |

  @PROV-252
  Scenario Outline: Settlements are lost
    Given the province "Virginia" has the settlement "settlement"
    When <cause>
    Then the province "Virginia" loses its settlement

    Examples:
      | cause                                      |
      | the local people drive it out              |
      | disease wipes it out                       |
      | the country abandons it                    |
      | another power takes it                     |

  @PROV-253
  Scenario: A trading post draws traders without taking a tile
    Given the province "Malindi" has a trading post of "Portugal"
    When the game works out the province's stats
    Then the trading post works as a market drawing traders
    And it takes no tile

  @PROV-254
  Scenario: Settlers fill the free tiles and then growth stops
    Given the country "Portugal" has homeless people in "Lisboa"
    When it sends 3,000 of them as settlers to the colony "Madeira"
    Then they live on the free tiles of "Madeira" and the buildings on them
    When the free tiles of "Madeira" are full
    Then the colony stops growing

  @PROV-254
  Scenario Outline: Settlers are lost
    Given the colony "Guinea" has 2,000 settlers
    When <cause>
    Then the colony "Guinea" has fewer settlers

    Examples:
      | cause                                  |
      | fever land kills them                  |
      | war with the local people              |
      | settlers leave                         |

  @PROV-255
  Scenario: Taking the local people's tiles has a cost
    Given the country "Portugal" owns the province "Virginia" with 3 tiles worked by the local people
    When it takes one of those tiles by conquest
    Then the province "Virginia" gains grievances
    And resistance events start
    And the local people keep their other tiles, buildings and lords
