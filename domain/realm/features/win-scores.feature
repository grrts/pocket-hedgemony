@context-realm
Feature: Winning the campaign
  As a player
  I want to win by world domination or by leading economy, power or technology
  So that a campaign has an end I can aim for
  # Decided 16 October 2026 (gap-lists A.1); made fair 19 October (X-28).

  @REALM-150 @REALM-151
  Scenario: The Economy score
    Given the country "Venice" has a yearly income of 400 gold from taxes, lords' share, trade and tribute
    And it has 900 gold and 300 debt
    When the scores are worked out
    Then its Economy score is built from 400 yearly income and a bank of 600, of which 400 counts

  @REALM-310 @placeholder
  Scenario Outline: The bank counts up to a year's income
    # config: win.bank_cap_years_income
    Given the country "Venice" has a yearly income of 400 gold from taxes, lords' share, trade and tribute
    And it has <gold> gold and <debt> debt
    When the scores are worked out
    Then its Economy score is <score>

    Examples:
      | gold  | debt | score |
      | 900   | 700  | 600   |
      | 5000  | 0    | 800   |
      | 100   | 500  | 0     |

  @REALM-152 @REALM-160 @REALM-314 @placeholder
  Scenario: The Power score counts subjects at half
    # config: win.subject_province_weight, win.army_weights, win.warship_men
    Given the country "Ottomans" holds 60 provinces and its subjects hold 20
    And it has 30,000 foot, 10,000 horse, 2,000 guns, 20 warships and 3 commanders
    When the scores are worked out
    Then its Power score counts 70 provinces
    And adds its army power from soldiers weighted by kind and warships
    And its commanders add nothing
    And its army power is 58

  @REALM-153
  Scenario: The Technology score weighs inventions by era cost
    Given the country "Korea" knows 30 inventions of era I and 5 of era II
    When the scores are worked out
    Then its Technology score weighs each invention by its era cost in the research tree
    And no event removes a known invention from it

  @REALM-154 @REALM-173 @placeholder
  Scenario Outline: World domination
    # config: win.domination_share, win.checked_month
    Given the country "Ottomans" owns or holds as subjects <share> % of the world's settled land provinces
    And it is the turn in which 1 <month> falls
    When the scores are worked out
    Then the country "Ottomans" <result>

    Examples:
      | share | month   | result                                                       |
      | 100   | January | wins by world domination and may keep playing to the end date |
      | 99    | January | does not win yet                                             |
      | 100   | June    | does not win yet                                             |

  @REALM-155 @REALM-173
  Scenario: Leading by a wide margin does not end the campaign early
    Given the country "Venice" has led Economy by 50 % over second place for 25 years
    When the scores are worked out
    Then no one wins by a score before the end date

  @REALM-155 @REALM-173
  Scenario: Leading a score when the campaign ends
    Given the date is 31 August 1939
    And the country "Japan" leads the Technology score
    When the campaign's end date arrives
    Then the country "Japan" wins by the Technology score

  @REALM-173
  Scenario: Tied leaders share the win
    Given the date is 31 August 1939
    And the countries "Japan" and "Germany" share the lead in the Technology score
    When the campaign's end date arrives
    Then both "Germany" and "Japan" win by the Technology score

  @REALM-173
  Scenario: A campaign that ends without a win
    Given the date is 31 August 1939
    And the country "Portugal" leads no score and holds no domination
    When the campaign's end date arrives
    Then the campaign shows the final scores and the player's rank in each

  @REALM-311
  Scenario Outline: A score is the average of its last 25 Januaries
    # config: win.average_years
    Given the country "Venice" had an Economy score of <earlier> in each of <years> Januaries before this one
    And its Economy score is <now> in this January
    When the scores are worked out
    Then its Economy score is judged as <judged>

    Examples:
      | earlier | years | now  | judged |
      | 100     | 24    | 1100 | 140    |
      | 100     | 40    | 1100 | 140    |
      | 100     | 0     | 1100 | 1100   |

  @REALM-312 @placeholder
  Scenario: Growth against the realm's own start
    # config: win.start_floor_quantile
    Given the realms' Power scores are:
      | realm    | start | average now |
      | France   | 81    | 81          |
      | Brittany | 5     | 10          |
      | Tlemcen  | 1     | 3           |
    When the scores are worked out
    Then the Power growth of "Brittany" is 2.00
    And the Power growth of "France" is 1.00
    And the Power growth of "Tlemcen" is 0.60, measured from the floor of 5
    And "Brittany" leads the Power score

  @REALM-313
  Scenario: A chapter closes every 100 years
    # config: win.chapter_years
    Given a campaign that starts in 1444 and ends on 31 August 1939
    Then a chapter closes in the January turns of 1544, 1644, 1744 and 1844
    And the last chapter closes with the campaign on 31 August 1939
