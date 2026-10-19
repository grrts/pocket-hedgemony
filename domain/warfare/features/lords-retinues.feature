@context-warfare
Feature: Lords lead their retinues
  As a ruler
  I want my lords to bring their own men to my wars and lead them
  So that a loyal nobility is an army I don't pay for, and a wavering one is a risk

  # Leroy, 18 Oct (X-26). Config keys: warfare.lords.loyal_days, warfare.lords.wavering_days,
  # warfare.lords.wavering_share, warfare.lords.wavering_stay_months, warfare.lords.min_men,
  # warfare.lords.retinue_horse_share, warfare.lords.retinue_horse_arm

  @WAR-252
  Scenario: A lord's lands fill his retinue
    Given the lord "Philip of Burgundy" holds "Dijon" in the country "France"
    When the year's recruits refill
    Then the recruits of "Dijon" are his retinue
    And they count neither in France's levies nor in its troop cap

  @WAR-253 @placeholder
  Scenario Outline: Calling the lords
    Given the country "France" is at war
    And the lord "Philip of Burgundy" is "<loyalty>" with 2,000 men at home
    When France calls the lords
    Then he brings <men> men to his seat after <days> days

    Examples:
      | loyalty  | men   | days |
      | Loyal    | 2,000 | 21   |
      | Wavering | 1,000 | 42   |
      | Disloyal | 0     | none |

  @WAR-253
  Scenario: The lords are called only at war
    Given the country "France" is at peace
    When France calls the lords
    Then no lord is called

  @WAR-254 @WAR-255
  Scenario: A lord leads his own retinue
    Given the lord "Philip of Burgundy" answered France's call
    When his men have gathered at his seat
    Then they stand there as an army of the retinue kind led by "Philip of Burgundy"
    And France pays them nothing and they do not count toward its troop cap
    And the army can only march, fight and go home

  @WAR-256
  Scenario Outline: A retinue goes home
    Given the lord "Philip of Burgundy" leads his retinue for "France"
    When <cause>
    Then his retinue goes home and its men rejoin the recruits of his lands

    Examples:
      | cause                                                        |
      | France makes peace                                           |
      | he turns disloyal                                            |
      | he is wavering and has served 6 months for an aim not his Want |
      | the ruler sends him home                                     |

  @WAR-257
  Scenario: A victory wins a lord's loyalty
    Given the lord "Philip of Burgundy" is "Wavering" and leads his retinue
    When his army wins a battle
    Then he is "Loyal"

  @WAR-258
  Scenario: The AI calls its lords
    Given the AI country "Castile" is at war
    When the month turns
    Then every lord of Castile who will come is called

  @WAR-259 @WAR-260 @WAR-261 @WAR-262
  Scenario: The Lords' men section
    Given the player's country "France" is at war with 3 loyal lords and 1 disloyal lord
    When the player opens the Army tab
    Then the Lords' men section sums the men ready, gathering, in the field and refusing
    And it shows a row per lord with his loyalty and state
    And a Call the lords button at least 44 points tall
