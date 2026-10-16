@context-revolutions
Feature: Aftermath of a revolution
  As the game
  I want a won revolution to spread, leave émigrés, provoke the old powers and risk a restoration
  So that keeping a revolution's gains is its own game

  @REVO-055 @placeholder
  Scenario Outline: A won revolution spreads its family's wave
    # config: families.<id>.wave.amount
    Given a revolution of the family "<family>" wins in a country
    When the wave is applied
    Then <wave>

    Examples:
      | family           | wave                                                                                 |
      | liberal_national | liberalism support rises by 0.05 in the neighbours                                   |
      | estates          | parliamentarism support rises by 0.03 in the neighbours                              |
      | freedom          | abolitionism support rises by 0.10 in the region                                     |
      | socialist_defeat | socialism support rises by 0.05 in the region                                        |
      | faith            | religion's faith wave starts toward the neighbours                                   |
      | agrarian         | neighbouring provinces get the grievance "Neighbour in revolt", not an ideology       |
      | homeland         | neighbouring provinces held by distant empires get the grievance "Foreign rule"      |
      | from_above       | nothing spreads                                                                      |
      | restoration      | nothing spreads                                                                      |

  @REVO-055
  Scenario: 1789 makes 1848 more likely
    Given the revolution "french_revolution" has won in "France"
    And its wave has raised liberalism in the neighbours of "France"
    When the signs of "revolutions_of_1848" that read liberalism are evaluated
    Then more of them are lit than before the wave

  @REVO-056
  Scenario: A deposing regime leaves an émigré court
    When the regime "revolutionary_republic" applies to "France"
    Then the old dynasty of "France" lives abroad as a pretender
    And "France" has the flag "emigre_court"
    And rivals of "France" can fund the pretender
    And the old dynasty can bind the role of "restoration_of_the_old_order"

  @REVO-057 @placeholder
  Scenario: Counter-revolution against a revolutionary republic
    # config: counter_revolution.years, counter_revolution.opinion
    When the regime "revolutionary_republic" applies to "France"
    Then every monarchy's opinion of "France" falls by 50
    And every monarchy gains a counter-revolution reason to fight "France" for 25 years
    And diplomacy counts the reason "Different form of rule -20" between "France" and every monarchy

  @REVO-058 @placeholder
  Scenario: Generals grow too big twice as often in a revolutionary republic
    # config: generals.too_big_mult
    Given the country "France" holds the regime "revolutionary_republic"
    When the chance of a general growing too big is computed for "France"
    Then the chance is doubled
    And a winning general can switch the regime to "court_absolutism" or "military_kingdom"

  @REVO-059
  Scenario: The old dynasty comes back
    Given the country "France" has the flag "emigre_court"
    And "France" has lost a war, has broken charters and a weak regime
    When the event "restoration_of_the_old_order" fires for "France"
    Then the regime "restored_monarchy" applies to "France"
    And the form of "France" returns to the form it held before the revolution
