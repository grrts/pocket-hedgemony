@context-warfare
Feature: War and peace voices
  As a player
  I want my realm's lords and provinces to say whether to keep fighting, and the war to end by concrete terms
  So that I can read exactly why a ruler will or won't make peace

  # Diplomacy owns how a war aim is held, declaring war, calls to arms, truce length and carrying the peace.
  # Config keys: warfare.peace.capital_share, warfare.peace.warlike_ignore, warfare.peace.half,
  # warfare.peace.three_quarters, warfare.peace.tribute_years, warfare.peace.open_roads_years,
  # warfare.raid_war_months, diplomacy.truce_years

  @WAR-177
  Scenario: The war aim is shown to everyone
    Given the country "France" declares war on "Burgundy" with the aim "Take land" naming "Champagne"
    When the peace voices are counted
    Then every country sees the aim
    And the aim decides which lords come and how peace voices speak

  @WAR-178
  Scenario: A war with no fitting aim
    Given the country "France" declares war on "Savoy" with no aim
    When France takes 2 provinces in the war
    Then France counts 2 Lands taken
    And its lords who aren't Warlike waver
    And its allies don't have to join

  @WAR-179
  Scenario: Breaking a truce
    Given the country "France" has a truce with "England"
    When France declares war on England
    Then France counts an oath broken
    And every lord of France wavers one step

  @WAR-180
  Scenario Outline: A lord's voices
    Given the lord "Duke of Bourbon" holds 3 provinces of "France" at war
    And <situation>
    When the peace voices are counted
    Then his 3 voices say <voice>

    Examples:
      | situation                                                    | voice |
      | one of his provinces is occupied                             | peace |
      | his retinue has lost half its men                            | peace |
      | he is wavering                                               | peace |
      | his lands are hungry                                         | peace |
      | he is Warlike                                                | war   |
      | the war aim is his Want                                      | war   |
      | he is loyal and France has more victories in this war        | war   |

  @WAR-180
  Scenario Outline: A royal province's voice
    Given the royal province "Champagne" of "France" at war
    And it has <grievances>
    When the peace voices are counted
    Then its voice says <voice>

    Examples:
      | grievances                                 | voice   |
      | Conscription and Soldiers quartered        | peace   |
      | Burned homes and Hungry                    | peace   |
      | only Heavy taxes                           | nothing |
      | no grievance but it is occupied            | peace   |

  @WAR-180 @placeholder
  Scenario: The capital is a third of all voices
    Given the capital of "France" is besieged
    When the peace voices are counted
    Then a third of all French voices say peace

  @WAR-180 @placeholder
  Scenario: A Warlike ruler ignores a quarter of the peace voices
    Given the ruler of "France" is Warlike
    And 60 % of French voices say peace
    When the peace voices are counted
    Then 45 % of French voices count as peace

  @WAR-180
  Scenario: A child ruler's regent counts as a lord
    Given the ruler of "France" is a child with a regent
    When the peace voices are counted
    Then the regent's voices count as a lord's

  @WAR-181 @WAR-182 @placeholder
  Scenario Outline: What the peace voices oblige
    Given <share> of the voices of "France" say peace
    When the peace voices are counted
    Then France <must>

    Examples:
      | share         | must                                                                                  |
      | 40 %          | is free to fight on                                                                   |
      | 60 %          | must accept a peace asking only for provinces the enemy occupies and gold up to its treasury |
      | 80 %          | must also accept tribute, a pretender, or becoming a subject                          |

  @WAR-181
  Scenario: A player who refuses an obliged peace
    Given over half of the player's voices say peace
    And the enemy offers a peace asking only for occupied provinces
    When the player refuses
    Then every lord of the player's country loses a step of loyalty each season
    And its levies desert twice as fast

  @WAR-183
  Scenario: The AI makes peace by the same counts
    Given over half of the voices of the AI country "Burgundy" say peace
    When the player offers a peace asking only for provinces France occupies
    Then "Burgundy" accepts

  @WAR-184 @placeholder
  Scenario Outline: Peace terms' war-state preconditions
    Given the country "France" at war with "Burgundy"
    And <state>
    When the peace voices are counted
    Then France <can> ask for "<term>"

    Examples:
      | state                                                         | can    | term                 |
      | France occupies "Dijon"                                       | can    | cede Dijon           |
      | France does not occupy "Dijon"                                | cannot | cede Dijon           |
      | Burgundy has 500 gold in its treasury                         | can    | pay 500 gold         |
      | 60 % of Burgundy's voices say peace                           | cannot | tribute              |
      | 80 % of Burgundy's voices say peace                           | can    | tribute              |
      | 80 % of Burgundy's voices say peace                           | can    | become a subject     |
      | France occupies the capital of Burgundy                       | can    | seat a pretender     |
      | France does not occupy the capital of Burgundy                | cannot | seat a pretender     |
      | Burgundy keeps "Dijon"                                        | can    | demolish the castle of Dijon |
      | nothing in particular                                         | can    | white peace          |

  @WAR-185
  Scenario: A side with no soldiers and no castles left
    Given the country "Savoy" has no soldiers and no castles left
    When the peace voices are counted
    Then the war ends
    And the winner takes all it occupies

  @WAR-186 @placeholder
  Scenario: A Raid war ends by itself
    Given the country "Crimea" fights a war with the aim "Raid" against "Muscovy"
    When 12 months pass
    Then the war ends
    And during it Crimea could only raid, not occupy

  @WAR-187
  Scenario Outline: A succession war ends a foreign war
    Given the ruler of "Burgundy" dies with no heir during its war with "France"
    And the lords of Burgundy fall into a succession war
    And "France" <backs>
    When the peace voices are counted
    Then the foreign war <ends>

    Examples:
      | backs                    | ends                       |
      | backs no claimant        | becomes a white peace      |
      | backs a claimant         | goes on                    |

  @WAR-188 @placeholder
  Scenario Outline: A signed peace starts the diplomacy truce
    Given a peace between "France" and "Burgundy" is signed that <moves>
    When the peace voices are counted
    Then the war ends
    And a truce of <years> years starts

    Examples:
      | moves                    | years |
      | moves no province        | 5     |
      | moves provinces          | 10    |

  @WAR-189
  Scenario Outline: What winning each war aim means
    Given the country "France" wins a war with the aim "<aim>"
    When the peace voices are counted
    Then <result>

    Examples:
      | aim               | result                                                       |
      | Take land         | France gets the named provinces                              |
      | Seat a pretender  | the enemy ruler is replaced and the realm becomes France's ally or subject |
      | Tribute           | the enemy pays yearly gold or grain                          |
      | Free a people     | a new country is released                                    |
      | Break a subject   | the subject becomes independent                              |
      | Defend the faith  | a faith tolerance charter is granted there, or France gets the province |
      | Punish            | the enemy pays gold and its ruler is humbled                 |
