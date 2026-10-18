@context-realm
Feature: Abroad
  As a player
  I want my allies, enemies, rivals, subjects, broken oaths, lands taken and envoys counted
  So that my standing among other countries is visible

  @REALM-120
  Scenario Outline: Allies
    Given the country "France" has 2 allies
    When <cause>
    Then the country "France" has <count> allies

    Examples:
      | cause                                         | count |
      | an envoy's alliance mission succeeds          | 3     |
      | a marriage binds a new ally                   | 3     |
      | a peace term makes an ally                    | 3     |
      | it breaks an alliance                         | 1     |
      | it goes to war with an ally                   | 1     |
      | a rival bribes an ally away                   | 1     |

  @REALM-120
  Scenario: Allies are called into wars
    Given the country "France" has the ally "Scotland"
    When the country "France" goes to war
    Then "Scotland" is called into the war

  @REALM-121
  Scenario: Enemies
    Given the country "France" is at peace
    When the country "England" declares war on "France"
    Then "England" is an enemy of "France"
    When peace is made
    Then "England" is no longer an enemy

  @REALM-122
  Scenario: Rivals compete for a named thing
    Given "France" and "England" both claim the province "Calais"
    When the claim is contested
    Then "England" is a rival of "France" over "Calais"
    And the AI targets its rivals
    And wars against the rival please the lords of "France"
    When "Calais" is settled
    Then they are no longer rivals over it

  @REALM-123
  Scenario Outline: Subjects
    Given the country "Hungary" has 1 subject
    When <cause>
    Then the country "Hungary" has <count> subjects

    Examples:
      | cause                                          | count |
      | it forces a neighbour to be a vassal in a peace | 2    |
      | a weak neighbour asks for protection           | 2     |
      | the subject wins its independence war          | 0     |
      | it releases the subject                        | 0     |
      | it annexes the subject                         | 0     |

  @REALM-123 @REALM-158
  Scenario: The Subjects row names the six kinds
    Given the country "Hungary" has 1 subject
    When the player opens the country card of "Hungary"
    Then the Subjects row reads "Vassals, tributaries, unions, marches, colonies and protectorates"

  @REALM-123
  Scenario: Subjects pay tribute and send troops
    Given the country "Hungary" has the subject "Wallachia"
    When the subject pays
    Then "Hungary" receives tribute in gold or grain
    And troops from "Wallachia"

  @REALM-124 @placeholder
  Scenario Outline: Oaths broken in the last 30 years
    # config: oaths.window_years
    Given the country "Castile" <act> <years> years ago
    When it asks for an alliance or a loan
    Then its oaths broken count includes that act: <counted>

    Examples:
      | act                    | years | counted |
      | broke a truce          | 10    | yes     |
      | abandoned an ally      | 29    | yes     |
      | defaulted on debt      | 31    | no      |

  @REALM-124
  Scenario: Others refuse a breaker of oaths
    Given the country "Castile" has 3 oaths broken
    When it asks for an alliance or a loan
    Then other countries are more likely to refuse

  @REALM-125 @placeholder
  Scenario: Lands taken make neighbours band together
    # config: lands_taken.window_years
    Given the country "Ottomans" has seized many provinces in the last 20 years
    When its neighbours weigh the threat
    Then they band together against it
    When it gives land back
    Then its lands taken fall

  @REALM-126 @REALM-158
  Scenario: An envoy is an official abroad
    Given the royal province "Troyes" is run by an official
    When the country "France" sends that official abroad on a marriage mission
    Then "Troyes" pays half until he returns
    And he handles only that one mission
    When the mission ends
    Then he comes home and runs "Troyes" again

  @REALM-126
  Scenario: An envoy can be killed or held abroad
    Given the country "France" has an envoy abroad in "England"
    When "England" holds him
    Then the country "France" has one fewer envoy

  @REALM-127 @REALM-157 @REALM-158
  Scenario: Merchants are replaced by traders
    Given the country "Venice" has 4 traders and 6 trade ships
    When the player opens the country card of "Venice"
    Then the card has the lines "Traders" and "Trade ships" and no line "Merchants"
    And gold from trade counts deposits from traders, market fees and tolls

  @REALM-158
  Scenario: The card lines other designs added
    Given the country "France" is at war
    When the player opens the country card of "France"
    Then the card also has the lines "Envoy seats", "Leagues against you", "Pretenders at court", "Arms store", "Powder store", "Prisoners", "Victories / Defeats", "Troop cap" and "Preachers"
