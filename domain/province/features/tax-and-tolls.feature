@context-province
Feature: Tax and tolls per province
  As a player or AI country
  I want to set tax per province with a realm default, and tolls on toll points
  So that I can squeeze or spare each province and earn from passing traders

  @PROV-150
  Scenario Outline: The owner sets tolls on toll points
    Given the country "Denmark" holds the toll point "Øresund"
    When the country "Denmark" sets its toll to "<rate>"
    Then the toll at "Øresund" is "<rate>"

    Examples:
      | rate |
      | none |
      | low  |
      | high |

  @PROV-150
  Scenario: A free-trade charter sets the toll to none
    Given the province "Antwerp" has a toll point with a "high" toll
    When the country grants "Antwerp" a free trade charter
    Then the toll at "Antwerp" is "none"

  @PROV-160
  Scenario: Provinces follow the realm default unless overridden
    Given the country "France" sets the realm default tax rate to "normal"
    And the country "France" sets the province "Calais" to "light"
    When the game works out the province's stats
    Then the province "Troyes" pays at "normal"
    And the province "Calais" pays at "light"

  @PROV-160
  Scenario Outline: Five tax rates
    Given the country "France" owns the province "Troyes"
    When the country "France" sets the province "Troyes" to "<rate>"
    Then the province "Troyes" has the tax rate "<rate>"

    Examples:
      | rate     |
      | none     |
      | light    |
      | normal   |
      | heavy    |
      | crushing |

  @PROV-161
  Scenario: Tolls are not part of tax owed
    Given the province "Troyes" has buildings, townsfolk and a toll point
    When its tax owed for the year is worked out
    Then it comes from the value of what its buildings make and its townsfolk
    And the tolls are counted in trade, not in tax owed

  @PROV-162 @PROV-163 @open-question
  Scenario: Troyes owes 11 gold and 9 reach the treasury
    # OQ-PROV-22: the design does not say which rule loses the 2 gold
    Given the province "Troyes" owes 11 gold this year at "normal"
    And it is a royal province with an official, 3 days from Paris
    When the tax is collected
    Then 9 gold reach the country "France"

  @PROV-162
  Scenario Outline: Things that cut tax owed
    Given the province "Troyes" <condition>
    When the game works out the province's stats
    Then its tax owed is lower than without it

    Examples:
      | condition              |
      | has burned tiles       |
      | has fallow tiles       |
      | has homeless people    |

  @PROV-162 @PROV-231
  Scenario: Riots halve tax
    Given the province "Troyes" owes 12 gold a year
    When the province "Troyes" has riots
    Then it owes 6 gold a year

  @PROV-163 @placeholder @open-question
  Scenario Outline: How much reaches you
    # config: province.tax.no_official, province.tax.lord_share, province.tax.free_travel_days; OQ-PROV-10 travel share
    Given the province "<province>" owes 20 gold
    And <condition>
    When the game works out the province's stats
    Then <reach> reaches the treasury

    Examples:
      | province | condition                                  | reach                     |
      | Troyes   | it is royal with no official               | at most 10 gold           |
      | Dijon    | a lord governs it                          | at most 10 gold           |
      | Calais   | it is occupied by the country "England"    | nothing                   |
      | Gascony  | it is 12 days from the capital             | less than within 5 days   |
      | Troyes   | an enemy army sits on the road to Paris    | less than with a free road |

  @PROV-164
  Scenario Outline: Tax screen presets fill in the realm at once
    Given the country "France" owns border provinces, a heartland, towns and countryside
    When the country "France" picks the tax preset "<preset>"
    Then <result>

    Examples:
      | preset              | result                                                        |
      | Even                | every province is "normal"                                    |
      | Spare the frontier  | border provinces are "light" and the heartland "heavy"        |
      | Squeeze the towns   | towns and cities are "heavy" and the countryside "light"      |
      | War chest           | every province is "heavy"                                     |

  @PROV-165
  Scenario: A lord keeps half and wavers under a heavy demand
    Given the lord "Philip of Burgundy" holds the province "Dijon"
    And his loyalty is "Loyal"
    When the country "France" sets "Dijon" to "heavy"
    Then the lord keeps half of what is collected
    And the lord "Philip of Burgundy" wavers

  @PROV-166
  Scenario: A tax cap charter keeps the rate at light
    Given the province "Lyon" has a tax cap charter
    When the country "France" tries to set "Lyon" to "heavy"
    Then the province "Lyon" stays at "light" or below

  @PROV-166
  Scenario: Rebels force the rate down
    Given the province "Troyes" has the tax rate "heavy"
    When rebels in "Troyes" force their demand
    Then the tax rate of "Troyes" goes down

  @PROV-167
  Scenario Outline: Heavy taxes are a grievance
    Given the country "France" owns the province "Troyes"
    When the country "France" sets "Troyes" to "<rate>"
    Then "Heavy taxes" counts as <weight> in "Troyes"

    Examples:
      | rate     | weight |
      | normal   | 0      |
      | heavy    | 1      |
      | crushing | 2      |
