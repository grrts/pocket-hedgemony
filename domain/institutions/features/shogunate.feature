@context-institutions
Feature: The Shogunate
  As the shogun of Japan
  I want to keep the great houses in hand
  So that the realm does not break into warring domains

  @INST-060 @placeholder
  Scenario: The Shogunate in 1444
    # config: shogunate.hold_start
    Given a new campaign starts on 11 November 1444
    Then "Japan" holds the office of Shogun
    And Japan's great houses are the Shogunate's members
    And the Shogunate's hold is 30

  @INST-061 @placeholder
  Scenario: A house in revolt costs hold
    # config: shogunate.hold_year
    Given the house "Yamana" is In revolt
    When January begins
    Then the hold record shows -5 for "Yamana"
    And no gain for a year without revolt

  @INST-062
  Scenario Outline: The houses read the shogun's hold
    Given the Shogunate's hold reads "<word>"
    When the season ends
    Then every great house counts "The shogun's hold" as <step> in its loyalty

    Examples:
      | word   | step |
      | Strong | +1   |
      | Firm   | +1   |
      | Weak   | 0    |
      | Hollow | -1   |

  @INST-063 @placeholder
  Scenario: Summoning a house
    # config: shogunate.summon_wealth_loss
    Given the Shogunate has hold 55
    When the shogun summons the house "Ōuchi"
    Then the lord of "Ōuchi" cannot join a rising
    And his wealth falls by 10 percent a year
    When the hold falls to 45
    Then the summons of "Ōuchi" ends

  @INST-064 @placeholder
  Scenario: Confirming a house's land
    # config: shogunate.confirm_cost
    Given the house "Takeda" is Wavering and its land has not been confirmed by this shogun
    When the shogun confirms the land of "Takeda"
    Then "Takeda" is Loyal
    And the Shogunate's hold falls by 5
    And the shogun cannot confirm "Takeda" again

  @INST-065
  Scenario: The break at hold 0
    Given the Shogunate has hold 0
    When the season ends
    Then each great house is a warlord domain with its land
    And the shogun's realm is a warlord domain with its royal provinces
    And the event "onin_war" is in the chronicle

  @INST-065
  Scenario: The break when the Court's province is lost
    Given the shogun loses the Court's province
    Then the Shogunate breaks into warlord domains

  @INST-066 @placeholder
  Scenario: Asking the Court
    # config: shogunate.appointed_hold
    Given the office of Shogun is vacant
    And the warlord domain "Oda" holds the Court's province and over half of Japan's land provinces
    When "Oda" asks the Court
    Then "Oda" has the shogunate form and holds the office of Shogun
    And the Shogunate's hold is 40

  @INST-067
  Scenario Outline: The oath of the houses
    Given "Oda" has just been appointed shogun
    When the warlord domain "Mōri" <answer> the oath
    Then <result>

    Examples:
      | answer  | result                                                        |
      | swears  | "Mōri" is a great house of "Oda" with its land, Wavering        |
      | refuses | "Oda" holds the war aim "Bring to heel" on "Mōri"              |

  @INST-068 @placeholder
  Scenario: Closing the country
    # config: shogunate.closed_country
    Given it is era III and the Shogunate's hold is Firm
    When the shogun closes the country with the port "North Nagasaki"
    Then foreign traders trade only at "North Nagasaki"
    And foreign faiths send no missionaries into Japan
    When the event "perry_expedition" fires
    Then the ports are open

  @INST-069
  Scenario: The end of the Shogunate
    Given "Japan" holds the office of Shogun
    When "Japan" reforms to a constitutional monarchy
    Then the Shogunate has ended
