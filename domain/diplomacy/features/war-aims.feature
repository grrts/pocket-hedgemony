@context-diplomacy
Feature: War aims
  As a country
  I want to hold war aims because of things in the world
  So that every war has a reason everyone can see

  @DIPL-139 @placeholder
  Scenario Outline: Holding Take land
    # config: war_aims.held_province_years, refused_demand_years
    Given <reason>
    When the game evaluates it
    Then the country "A" holds the war aim "Take land" for the province "P" against "B" <lasting>

    Examples:
      | reason                                                           | lasting                  |
      | the country "A" held the province "P" 40 years ago               | while the reason holds   |
      | a pretender of "A" claims the province "P"                       | while the reason holds   |
      | the province "P" is a homeland of the culture of "A"             | while the reason holds   |
      | a lord of "A" wants the province "P"                             | while the reason holds   |
      | the country "B" refused the demand of "A" for the province "P"   | for 5 years              |
      | a lord defected from "A" to "B" with the province "P"            | while the reason holds   |

  @DIPL-139
  Scenario: Land held too long ago gives no aim
    Given the country "A" last held the province "P" 51 years ago and has no other reason
    When the game evaluates it
    Then the country "A" holds no war aim "Take land" for the province "P"

  @DIPL-140 @DIPL-108
  Scenario: Austria holds Seat a pretender against Hungary in 1444
    Given the date is "1444-11-11"
    And Ladislaus V, a pretender to the throne of "Hungary", is at the court of "Austria"
    Then the country "Austria" holds the war aim "Seat a pretender" against "Hungary"
    When Ladislaus V dies with no heir
    Then the country "Austria" no longer holds that aim

  @DIPL-141 @placeholder
  Scenario Outline: Holding Tribute
    # config: war_aims.tribute_by_strength_multiple
    Given the countries "A" and "B" share a border
    And <reason>
    When the game evaluates it
    Then the country "A" <holds> the war aim "Tribute" against "B"

    Examples:
      | reason                                         | holds          |
      | "B" refused a tribute demand of "A"            | holds for 5 years |
      | "A" has 3 times the soldiers of "B"            | holds while true  |
      | "A" has 2 times the soldiers of "B"            | does not hold     |

  @DIPL-142
  Scenario Outline: Holding Free a people
    Given the land of "B" holds a homeland of the culture "<culture>" with no country of its own
    And the culture "<culture>" is <relation> of "A"
    When the game evaluates it
    Then the country "A" <holds> the war aim "Free a people" against "B"

    Examples:
      | culture | relation                   | holds         |
      | Serbian | the culture                | holds         |
      | Serbian | an accepted culture        | holds         |
      | Serbian | neither culture nor accepted | does not hold |

  @DIPL-143 @open-question
  Scenario Outline: Holding Break a subject
    # OQ-DIPL-8: who is the target of Break a subject
    Given the country "B" has the subject "S"
    And <reason>
    When the game evaluates it
    Then the country "A" <holds> the war aim "Break a subject" against "B"

    Examples:
      | reason                                   | holds         |
      | "S" is Hostile toward "B"                | holds         |
      | "S" asked "A" for help                   | holds         |
      | "S" is Friendly toward "B"               | does not hold |

  @DIPL-144
  Scenario Outline: Holding Defend the faith
    Given <reason>
    When the game evaluates it
    Then the country "A" holds the war aim "Defend the faith" against "B"

    Examples:
      | reason                                                                  |
      | a province of "B" bordering "A" carries the persecution flag            |
      | "B" refused the demand of "A" to tolerate its faith there               |

  @DIPL-145 @placeholder
  Scenario Outline: Holding Punish for 5 years
    # config: war_aims.punish_years
    Given the date is "1460-01"
    When <deed>
    Then the country "A" holds the war aim "Punish" against "B" until "1465-01"

    Examples:
      | deed                                                         |
      | the country "B" breaks a truce with "A"                      |
      | the country "B" insults "A"                                  |
      | the country "B" holds an envoy of "A"                        |
      | an army of "B" enters "A" without passage                    |
      | the country "B" refuses the demand "Apologise and pay" of "A"|
      | "A" catches "B" funding rebels in its land                   |

  @DIPL-146
  Scenario Outline: Raid and No aim are always held
    Given the country "A" holds no other aim against "B"
    When the game evaluates it
    Then the country "A" may declare war on "B" with the aim "<aim>"

    Examples:
      | aim    |
      | Raid   |
      | No aim |

  @DIPL-147
  Scenario Outline: Events and national strengths grant aims
    Given <grant>
    When the game evaluates it
    Then the country "A" holds the war aim "<aim>" against "B" <lasting>

    Examples:
      | grant                                                       | aim       | lasting        |
      | an event grants "A" the aim "Take land" for 10 years        | Take land | for 10 years   |
      | a national strength of "A" grants its own aim against "B"   | its own aim | as the strength says |
