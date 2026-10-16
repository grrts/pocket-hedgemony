@context-culture
Feature: What culture does
  As the game
  I want kin, cousins and strangers to change officials, lords, order, war, trade, research and diplomacy
  So that every culture effect is attached to something the player already sees

  @CULT-050 @placeholder
  Scenario Outline: Officials learn slower among strangers
    # config key: officials.years_to_full_effect
    Given the country "France" has the court tongue "French"
    And an official of the tongue "<official>" serves in a province whose people are <people>
    When the years pass
    Then the official reaches full effect after <years> years

    Examples:
      | official | people           | years |
      | French   | French (kin)     | 5     |
      | French   | Occitan (cousins) | 7    |
      | French   | Breton (strangers) | 10  |
      | Breton   | Breton (strangers) | 5   |

  @CULT-051
  Scenario Outline: Officials have a tongue
    When an official is <how>
    Then the official has the tongue "<tongue>"

    Examples:
      | how                                               | tongue  |
      | hired in the province "Rennes", which is Breton   | Breton  |
      | graduated from a school teaching in French        | French  |

  @CULT-052 @open-question
  Scenario: A local official keeps Banned tongue from worsening Foreign rule
    # OQ-CULT-11: "made worse" is not defined
    Given the province "Rennes" is Breton with "Foreign rule" and "Banned tongue"
    And a Breton official serves in "Rennes"
    Then "Banned tongue" does not make "Foreign rule" worse in "Rennes"

  @CULT-053 @open-question
  Scenario Outline: Capacity weight of provinces
    # OQ-CULT-1: government v2 does not count provinces
    Given a province of "France" whose majority is <majority>
    Then it counts as <weight> provinces toward what the government of "France" can support

    Examples:
      | majority | weight |
      | kin      | 1      |
      | cousin   | 1      |
      | stranger | 1.5    |

  @CULT-054 @open-question
  Scenario Outline: Lords and tongue
    # OQ-CULT-8: mapping to loyalty reasons
    Given the country "France" has the court tongue "French"
    When a lord of the tongue "<tongue>" is weighed for loyalty
    Then his loyalty <effect>

    Examples:
      | tongue  | effect                         |
      | French  | tends one step up              |
      | Occitan | is not changed by tongue       |
      | Breton  | starts one step lower          |

  @CULT-055 @CULT-056 @CULT-075 @placeholder
  Scenario Outline: Homeland risings
    Given the province "Rennes" is the Breton homeland with nationalism <nationalism>
    When a homeland rising starts in "Rennes"
    Then it draws 8 % of everyone of the tongue "Breton"
    And its demand is "<demand>"

    Examples:
      | nationalism | demand      |
      | 0.2         | self-rule   |
      | 0.5         | a new country |

  @CULT-057
  Scenario: Locals know the land
    Given a battle in rough ground in the Breton homeland
    When defenders of the tongue "Breton" fight, rebels or not
    Then they get +10 %

  @CULT-058
  Scenario Outline: Garrison bribes
    Given a garrison captain of the tongue "<captain>" serves a ruler of the tongue "French"
    And nationalism is <nationalism>
    Then the captain <can> be bribed

    Examples:
      | captain | nationalism | can    |
      | Breton  | 0           | can    |
      | Occitan | 0           | cannot |
      | Occitan | 0.3         | can    |
      | French  | 0.5         | cannot |

  @CULT-059
  Scenario Outline: Free a people
    Given the province "<province>" is the homeland of "<tongue>", <relation> to its ruler, with nationalism <nationalism>
    Then the war aim "Free a people" is <open> against its ruler

    Examples:
      | province | tongue  | relation | nationalism | open     |
      | Rennes   | Breton  | stranger | 0           | open     |
      | Toulouse | Occitan | cousin   | 0.2         | not open |
      | Toulouse | Occitan | cousin   | 0.3         | open     |

  @CULT-060
  Scenario: Gather our kin
    Given the date is 1820
    And the province "Venetia" is mostly Italian and held by "Austria"
    And the country "Piedmont" has the court tongue "Italian"
    When the country "Piedmont" takes "Venetia" with the war aim "Gather our kin"
    Then the province "Venetia" does not get the grievance "Foreign rule"

  @CULT-060
  Scenario: Gather our kin is not offered before the age of revolutions
    Given the date is 1700
    Then the war aim "Gather our kin" is not offered

  @CULT-061 @placeholder
  Scenario Outline: National levy
    # config key: effects.national_levy
    Given the age of revolutions has begun
    And a province of "France" is <relation> with nationalism <nationalism>
    Then recruits refill there <speed>

    Examples:
      | relation | nationalism | speed            |
      | kin      | 0.5         | 25 % faster      |
      | kin      | 0.4         | at the usual rate |
      | stranger | 0.5         | 25 % slower      |

  @CULT-062 @placeholder
  Scenario Outline: Trading peoples
    # config key: effects.trading_people
    Given the province "<province>" has a market: <market>
    And the tongue "Jewish" is <share> of the province
    Then the province <bonus>

    Examples:
      | province | market | share | bonus                                                        |
      | Paris    | yes    | 2 %   | gets +10 % trade value and may hire one extra Jewish trader  |
      | Lyon     | yes    | 1 %   | gets no trading-people bonus                                 |
      | Rennes   | no     | 3 %   | gets no trading-people bonus                                 |

  @CULT-063
  Scenario: Expelling a trading people moves the bonus
    Given the province "Seville" has a Jewish trading people bonus
    When the country "Castile" expels the Jewish people
    Then "Seville" loses the bonus
    And the Jewish people go as refugees to a neighbour
    And that neighbour gains the bonus where they settle

  @CULT-064 @placeholder
  Scenario: Ideas travel in a shared speech
    # config key: effects.family_neighbour_research_weight
    Given the country "France" researches an invention known by its neighbour "Castile" (latin family) and its neighbour "Burgundy"
    Then "Castile" counts double toward the 60 % cap on cheaper research
    And "Burgundy" of another family counts once

  @CULT-065
  Scenario: Scholars settle first among their family
    Given a foreign scholar of the tongue "Tuscan" looks for a realm
    And "France" (latin) and "Bohemia" (slavic) both welcome scholars
    Then the scholar settles first in "France"

  @CULT-066
  Scenario Outline: Inputs to diplomacy
    Given the ruler of "<a>" has the court tongue "<ta>" and the ruler of "<b>" has the court tongue "<tb>"
    Then relations between them start <warmth> steps warmer

    Examples:
      | a      | ta        | b        | tb        | warmth |
      | France | French    | Savoy    | French    | 2      |
      | France | French    | Castile  | Castilian | 1      |
      | France | French    | England  | English   | 0      |

  @CULT-066
  Scenario: A natural rival after nationalism
    Given nationalism has spread
    And the country "Austria" holds many people of the tongue "Italian"
    Then "Austria" is a natural rival of "Piedmont", whose court tongue is "Italian"
