@context-buildings
Feature: Building catalogue effects
  As the game
  I want every building's named effect to work as listed
  So that buildings give jobs, wares and their one local effect

  @BLD-092 @placeholder
  Scenario Outline: Step 1 entries in the catalogue
    Given the buildings config of the design
    When the building rules are applied
    Then the "<building>" stands on "<place>" with <jobs> and costs <cost>

    Examples:
      | building     | place                  | jobs                        | cost                       |
      | farm         | fields                 | 12,000 farmers              | 30 g · 10 timber · 6 mo    |
      | rice paddy   | wet fields or shore    | 18,000 farmers              | 40 g · 10 timber · 12 mo   |
      | ranch        | pasture                | 3,000 herders               | 20 g · 10 timber · 4 mo    |
      | lumber camp  | woods                  | 1,500 woodsmen              | 10 g · 4 mo                |
      | mine         | waste, hills, mountains| 6,000 miners                | 60 g · 20 timber · 12 mo   |
      | quarry       | waste, hills, mountains| 3,000 miners                | 20 g · 10 timber · 6 mo    |
      | almshouse    | town slot              | 600 clergy                  | 30 g · 10 stone · 6 mo     |
      | harbour      | shore tile             | 1,500 seafolk               | 40 g · 20 timber · 12 mo   |
      | fishery      | shore                  | 3,000 seafolk               | 15 g · 10 timber · 4 mo    |
      | bank         | town slot              | 900 market folk             | 150 g · 30 stone · 12 mo   |

  @BLD-093
  Scenario: A farm growing a crop feeds nobody
    Given the province "Troyes" has 4 farms growing grain
    When the player sets one farm to flax
    Then that farm feeds nobody
    And the province card warns if the province would be short of food

  @BLD-094
  Scenario: A grove takes three years to bear
    Given a vineyard is finished in "Bordeaux" in 1450
    When the building rules are applied
    Then it makes no grapes in 1450, 1451 and 1452
    And it makes grapes from 1453

  @BLD-095
  Scenario: No forced-labour bonus for plantations
    Given a plantation in "Bahia"
    When the building rules are applied
    Then no rule gives it a forced-labour bonus

  @BLD-096
  Scenario: A monastery
    Given a monastery stands on a fields tile in "Cluny"
    And the country knows "L1"
    When the building rules are applied
    Then it makes grain at the farm rate
    And it makes clergy in the province
    And it gives 20 student seats

  @BLD-097
  Scenario: Saltpetre works needs a ranch or horse stud
    Given the province "Troyes" has no ranch and no horse stud
    When the player tries to build a saltpetre works
    Then it is refused

  @BLD-098
  Scenario: A weaving manufactory needs an official
    Given the province "Troyes" has a weaving manufactory and no official
    When the building rules are applied
    Then the weaving manufactory does not work

  @BLD-099
  Scenario: A printing house makes schools cheaper
    Given the province "Paris" has a printing house
    When a school is built in a province in reach of "Paris"
    Then the school costs less

  @BLD-100
  Scenario: Factories make Smoke and powered factories need power
    Given the province "Lille" has a factory at step 2 and no power station
    When the building rules are applied
    Then the factory makes Smoke
    And the step 2 factory lacks the power it needs

  @BLD-101
  Scenario Outline: Trade flags of trade buildings
    Given the province "Troyes" has a "<building>"
    When the building rules are applied
    Then the trade context reads the flag "<flag>"

    Examples:
      | building      | flag            |
      | weekly market | trade_endpoint  |
      | yearly fair   | hires_traders   |
      | trading house | bills_of_exchange |
      | trading post  | trade_endpoint  |

  @BLD-102
  Scenario Outline: Minority house of worship
    Given the province "Granada" has a Jewish share of <share>
    And the province "Granada" <charter> a "Faith tolerance" charter
    When the building rules are applied
    Then a minority synagogue <allowed> be built
    And if built it calms that faith instead of spreading it

    Examples:
      | share | charter  | allowed |
      | 0.10  | lacks    | may     |
      | 0.05  | lacks    | may not |
      | 0.05  | has      | may     |

  @BLD-103
  Scenario: Pilgrimage shrines only at named holy places
    Given the province "Santiago" is a named holy place
    And the province "Troyes" is not
    When the building rules are applied
    Then a pilgrimage shrine is never on the build sheet in either province
    And pilgrims to "Santiago" count as traders passing

  @BLD-104
  Scenario: Each faith is moved by its own houses of worship
    Given the province "Sarajevo" has a church and a mosque
    When the building rules are applied
    Then Christians are moved by the church and Muslims by the mosque
    And pulling down the minority house of worship is persecution

  @BLD-105
  Scenario Outline: School seats by step
    Given a school at step <step> as a "<kind>"
    When the building rules are applied
    Then it has <seats> student seats

    Examples:
      | step | kind          | seats |
      | 1    | temple school | 20    |
      | 2    | madrasa       | 30    |
      | 2    | university    | 60    |
      | 3    | academy       | 100   |

  @BLD-106
  Scenario: A library
    Given the province "Paris" has a library
    When the building rules are applied
    Then students there graduate a year sooner
    And when "Paris" is sacked not all its scholars flee

  @BLD-107
  Scenario: An observatory
    Given the province "Lisbon" has an observatory
    When the building rules are applied
    Then scholars there work at double rate on Boats inventions

  @BLD-108 @BLD-109 @BLD-110 @placeholder
  Scenario: Health buildings
    Given the province "Cairo" has a bimaristan, wells and drains and an almshouse
    When the building rules are applied
    Then town classes there die 0.5 % slower and plague spreads slower
    And plague deaths in town are halved
    And the town can grow one size bigger before shanty camps
    And 3000 homeless are sheltered

  @BLD-111 @BLD-112
  Scenario: Rule buildings add to the caps
    Given the country "France" has a palace at step 2, three seats and a court of law
    When the building rules are applied
    Then the buildings add 16 officials and 6 lords to its caps
    And tax registers take effect only once a chancery stands

  @BLD-113
  Scenario: A mint
    Given the province "Potosí" makes silver and the realm has a mint
    When the building rules are applied
    Then the silver is coined at full value instead of sold on the market

  @BLD-114 @placeholder
  Scenario Outline: Drill yard training room
    Given the province "Troyes" has a drill yard at step <step>
    When the building rules are applied
    Then it has training room for <room> men of any arm

    Examples:
      | step | room |
      | 1    | 1500 |
      | 2    | 4000 |

  @BLD-114
  Scenario: Barracks house standing regiments without quartering
    Given standing regiments are housed in the barracks of "Troyes"
    When the building rules are applied
    Then they do not give "Soldiers quartered"

  @BLD-115 @placeholder
  Scenario: Stores spoil without an arsenal
    Given the country "France" keeps 100 arms in store and has no arsenal
    When a year passes
    Then 10 arms are lost

  @BLD-116
  Scenario: A watchtower line
    Given the border province "Metz" has a watchtower line
    When the building rules are applied
    Then enemy armies are seen one province further away
    And raids are spotted a season ahead

  @BLD-117 @placeholder
  Scenario Outline: Harbour berths by step
    Given the province "Lisbon" has a harbour at step <step>
    When the building rules are applied
    Then it has <berths> berths and is a port that raises sailors

    Examples:
      | step | berths |
      | 1    | 10     |
      | 2    | 25     |
      | 3    | 50     |

  @BLD-118 @placeholder
  Scenario Outline: Shipyard slipways by step
    Given the province "<province>" has a shipyard at step <step>
    When the building rules are applied
    Then it has <slipways> slipways

    Examples:
      | province | step | slipways |
      | Lisbon   | 1    | 1        |
      | Lisbon   | 2    | 2        |
      | Lisbon   | 3    | 2        |
      | Venice   | 4    | 3        |

  @BLD-119 @BLD-120
  Scenario: Lighthouse and naval base
    Given the province "Brest" has a lighthouse and a naval base
    When the building rules are applied
    Then ships in the next sea zone lose half as many to storms
    And fleets based there keep their crews in peace without pay at sea
    And sea battles next to "Brest" give its side reinforcement from the port

  @BLD-121
  Scenario: Works across the province are built like any building
    Given the buildings config of the design
    When a canal is built in "Languedoc"
    Then it costs 400 gold, 100 stone, 60 months and 6000 labourers
    And it adds a river to the province

  @BLD-122
  Scenario: A telegraph office
    Given the province "Lyon" has a telegraph office
    When the building rules are applied
    Then its Days to capital count as 1 for orders and market prices

  @BLD-123
  Scenario: Dykes
    Given the province "Holland" has dykes
    When the building rules are applied
    Then floods can't turn its fields to marsh
    And with "F8" its marsh tiles can be drained

  @BLD-158
  Scenario: The yearly fair needs T6
    Given the province "Troyes" is a market town with a weekly market and a market charter
    And the country "France" doesn't know "T6 Merchant fairs and exchanges"
    When the player tries to upgrade the market to a yearly fair
    Then the upgrade is refused
    When the country "France" learns T6
    Then a yearly fair may be built in "Troyes"

  @BLD-159
  Scenario Outline: Trade buildings take trade's roles
    Given the buildings config of the design
    When the building rules are applied
    Then the "<building>" gives "<role>"

    Examples:
      | building       | role                                             |
      | caravanserai   | land traders +25 % weight and no bandits         |
      | counting house | foreign traders deposit with bills of exchange   |
