@context-realm
Feature: Winning the campaign
  As a player
  I want to win by world domination or by leading economy, power or technology
  So that a campaign has an end I can aim for
  # Decided 16 October 2026 (gap-lists A.1).

  @REALM-150 @REALM-151
  Scenario: The Economy score
    Given the country "Venice" has a yearly income of 400 gold from taxes, lords' share, trade and tribute
    And it has 900 gold and 300 debt
    When the scores are worked out
    Then its Economy score is built from 400 yearly income and a bank of 600

  @REALM-152 @placeholder @open-question
  Scenario: The Power score counts subjects at half
    # config: win.subject_province_weight; OQ-REALM-6 on army weights
    Given the country "Ottomans" holds 60 provinces and its subjects hold 20
    When the scores are worked out
    Then its Power score counts 70 provinces
    And adds its army power from soldiers weighted by kind, warships and commanders

  @REALM-153
  Scenario: The Technology score weighs inventions by era cost
    Given the country "Korea" knows 30 inventions of era I and 5 of era II
    When the scores are worked out
    Then its Technology score weighs each invention by its era cost in the research tree
    And no event removes a known invention from it

  @REALM-154 @placeholder @open-question
  Scenario: World domination
    # config: win.domination_share; OQ-REALM-6 on "allies-by-marriage" and "settled provinces"
    Given the country "Ottomans", its subjects and its allies-by-marriage hold 61 % of the world's settled provinces
    When the scores are worked out
    Then the country "Ottomans" wins by world domination

  @REALM-155 @placeholder
  Scenario: Leading a score long enough
    # config: win.score_margin, win.score_years
    Given the country "Venice" has led Economy by 50 % over second place for 25 years
    When the scores are worked out
    Then the country "Venice" wins by the Economy score

  @REALM-155 @open-question
  Scenario: Leading a score when the campaign ends
    # OQ-REALM-6: whether the margin is needed at the end date
    Given the date is 31 August 1939
    And the country "Japan" leads the Technology score
    When the campaign's end date arrives
    Then the country "Japan" wins by the Technology score
