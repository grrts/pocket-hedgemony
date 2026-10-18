@context-government
Feature: Hordes and technology
  As a horde, or a settled realm beside one
  I want hordes to start strong in the horse and behind in everything else, and able to catch up
  So that the steppe wins in the field early, fades without learning, and is never simply overpowered

  @GOV-067
  Scenario Outline: Which realms are hordes
    Given the campaign starts on 11 November 1444
    Then the form of "<realm>" is "Horde"
    And the country "<realm>" is in the start group "<group>"

    Examples:
      | realm         | group  |
      | great_horde   | Steppe |
      | crimea        | Steppe |
      | kazan         | Steppe |
      | nogai         | Steppe |
      | uzbek_khanate | Steppe |
      | oirat         | Steppe |

  @GOV-068
  Scenario Outline: A horde starts level in the horse and behind in the rest
    # The era levels below Era I come from the single tree (research).
    Given the campaign starts on 11 November 1444
    Then the country "<realm>" <knows> the invention "<invention>"

    Examples:
      | realm       | knows          | invention |
      | great_horde | knows          | W1        |
      | great_horde | knows          | F11       |
      | great_horde | knows          | G1        |
      | great_horde | knows          | L1        |
      | great_horde | knows          | L2        |
      | great_horde | does not know  | B1        |
      | great_horde | does not know  | W3        |
      | great_horde | does not know  | W5        |
      | great_horde | does not know  | G5        |
      | oirat       | knows          | W1        |
      | oirat       | does not know  | L2        |
      | muscovy     | knows          | B1        |
      | muscovy     | does not know  | W1        |

  @GOV-070 @placeholder
  Scenario Outline: Inventions from an earlier era cost less
    # config keys: research.behind_discount_pct_per_era, research.behind_discount_cap_pct
    Given the date is 1 January <year>
    And the country "Testland" has no neighbour or trade partner who knows the invention "<invention>"
    Then the invention "<invention>" costs "Testland" <cost> scholar-years

    Examples:
      | year | invention | cost |
      | 1450 | W5        | 20   |
      | 1550 | W5        | 15   |
      | 1650 | W5        | 10   |
      | 1750 | W5        | 10   |
      | 1550 | W7        | 40   |

  @GOV-070 @placeholder
  Scenario: Behind the times and spread from neighbours add up, down to a fifth of the cost
    # config keys: research.behind_discount_cap_pct, research.spread_cap
    Given the date is 1 January 1650
    And 6 neighbours of the country "Testland" know the invention "W5"
    Then the invention "W5" costs "Testland" 4 scholar-years

  @GOV-072
  Scenario: A horde settles and keeps what it knows
    Given the country "Testland" has the form "Horde"
    And the country "Testland" knows the invention "W1"
    And the country "Testland" meets "a palace in a town"
    And the country "Testland" has 400 gold
    When the country "Testland" reforms to "Household realm"
    Then the form of "Testland" is "Household realm"
    And the country "Testland" knows the invention "W1"
    And the form's officials of "Testland" are 10
    And the form's lords of "Testland" are 4

  @GOV-069 @GOV-071 @GOV-073 @GOV-074 @placeholder
  Scenario Outline: Balance targets for hordes
    # Checked by the balance model, not by a single rule; config keys hordes.balance.*
    Given the balance model runs the campaign from 1444
    Then the balance target "<target>" is "<value>"

    Examples:
      | target                                         | value |
      | horde Technology score in 1444 against Muscovy | 0.5   |
      | a studying horde closes its gap by             | 1550  |
      | horde field wins against equal settled, Era I  | 0.6   |
      | horde field wins against equal settled, Era II | 0.5   |
      | horde field wins against equal settled, Era III on | 0.25 |
      | horde gold from raids and tribute in Era I, at least | 1/3 |
