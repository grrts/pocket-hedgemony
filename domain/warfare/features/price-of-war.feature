@context-warfare
Feature: The price of war
  As a ruler
  I want every war to cost gold, men, people and my lords' patience, and one peace to take only part of a realm
  So that war is a choice with a price and not the best answer to everything

  # Leroy, 18 Oct (X-20). Config keys: warfare.peace.long_war_years, warfare.occupation.tax_share,
  # warfare.peace.max_ceded_share, warfare.ai.war_chest_months, warfare.ai.declare_strength_ratio,
  # diplomacy.ai.notoriety_restraint

  @WAR-221
  Scenario: Peace voices in the game
    Given the country "France" is at war with "Burgundy"
    And 3 of France's 5 lords have provinces occupied by Burgundy
    When the peace voices are counted
    Then France's voices are counted from its lords, royal provinces and capital
    And not from the share of its people under occupation

  @WAR-221
  Scenario: Refusing an obliged peace costs the ruler
    Given over half the peace voices of "France" say peace
    And Burgundy offers peace asking only for provinces it occupies
    When France refuses
    Then every lord of France loses a step of loyalty at the season's end
    And France's levies desert twice as fast

  @WAR-222
  Scenario: A war with no fitting aim in the game
    Given the country "France" declares war on "Savoy" with no aim
    When France takes a province in the war
    Then France's lords who aren't Warlike waver

  @WAR-223 @placeholder
  Scenario: Lords tire of a long war
    Given the country "France" has been at war with "England" for 2 years with the aim "Take land" naming "Guyenne"
    And the lord "Duke of Bourbon" is not Warlike and his Want is not Guyenne
    When the peace voices are counted
    Then all his voices say peace

  @WAR-224 @placeholder
  Scenario: Occupation does not pay for the war
    Given the province "Champagne" pays 10 gold of tax and 4 of trade a month to "France"
    When "Burgundy" occupies Champagne for a month
    Then Burgundy gets 5 gold of tax and no trade from Champagne
    And France gets nothing from Champagne

  @WAR-225
  Scenario Outline: Levies at war are paid at once
    Given the country "Castile" raised a levy company 1 month ago
    And Castile is <state>
    When the month's pay is counted
    Then the company is <paid>

    Examples:
      | state     | paid     |
      | at war    | paid     |
      | at peace  | not paid |

  @WAR-226
  Scenario: The dead are missed at home
    Given a levy company of 1000 peasants of "Champagne" serves "France"
    When 300 of them are killed in a battle
    Then Champagne has 300 fewer peasants
    And Champagne's Fallen from here rises by 300

  @WAR-227 @placeholder
  Scenario Outline: One peace cannot swallow a realm
    Given the country "Burgundy" has <provinces> provinces and France occupies <occupied> of them, its capital among them
    When France asks a peace taking every province it may
    Then the peace cedes <ceded> provinces
    And the capital is <capital>

    Examples:
      | provinces | occupied | ceded | capital  |
      | 11        | 11       | 4     | kept     |
      | 3         | 2        | 1     | kept     |
      | 1         | 1        | 1     | ceded    |

  @WAR-228 @placeholder
  Scenario Outline: The AI counts the price before declaring
    Given the AI country "Poland" borders "Lithuania" and is <situation>
    When Poland weighs a war on Lithuania
    Then Poland <declares>

    Examples:
      | situation                                                                    | declares          |
      | twice as strong as Lithuania's side with its allies, pledgers and leagues    | may declare       |
      | twice as strong as Lithuania alone but not with Lithuania's allies           | does not declare  |
      | strong enough but holding gold for 3 months of war pay                       | does not declare  |
      | strong enough at notoriety 60 and not Warlike                                | does not declare  |
      | strong enough at notoriety 60 and Warlike                                    | may declare       |

  @WAR-229 @WAR-232
  Scenario: The declare sheet shows the price of war
    Given the player's realm "France" opens the declare sheet against "Burgundy"
    And Burgundy has 11 provinces and an ally "Austria" with 20000 soldiers
    Then the Price of war block lists Austria with its soldiers, the neighbours who will hold Threatened us, the lords who will waver and the monthly pay at war
    And it says "at most 4 of their 11 provinces"
    And every line and Confirm are at least 44 points tall and open their reason on tap

  @WAR-230 @WAR-231
  Scenario: The war card
    Given the player's realm "France" is at war with "Burgundy" and 55 in 100 of its voices say peace
    Then the war plaque shows France's peace voices as a red bar
    And tapping it opens the war card with the aim, both sides' voices, months at war, provinces occupied each way and the most one peace can take now
