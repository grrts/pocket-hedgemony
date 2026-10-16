@context-culture
Feature: Drift of tongues
  As the game
  I want a small share of each province's people to drift toward one pull tongue every year
  So that years of rule, schools, officials and settlers slowly change who people are

  @CULT-016 @CULT-019 @CULT-020 @CULT-023 @CULT-025 @placeholder
  Scenario: Troyes
    # config keys: drift.base_rate_per_year, drift.multipliers.school_in_pull_tongue, policy.teach.drift
    Given the country "France" has the court tongue "French" and the Tongue policy "Teach"
    And the province "Troyes" is 94 % French and 6 % Flemish
    And the province "Troyes" has been held by "France" for 200 years and is governed by a royal official
    And the province "Troyes" has a school teaching in "French"
    When a year ends
    Then the pull tongue of "Troyes" is "French"
    And 0.75 % of the Flemish people of "Troyes" become French, about 32 people
    And no French people of "Troyes" move

  @CULT-024 @placeholder
  Scenario: A Schoolmaster doubles it
    Given the province "Troyes" is set up as in the Troyes example
    And a Schoolmaster official serves in "Troyes"
    When a year ends
    Then 1.5 % of the Flemish people of "Troyes" become French

  @CULT-017 @CULT-018 @placeholder
  Scenario Outline: Which tongue pulls
    # config keys: drift.court_pull_needs_years_held, drift.court_pull_needs
    Given the country "France" has the court tongue "French"
    And the province "Rennes" is mostly Breton
    And the province "Rennes" has been held <years> years
    And the province "Rennes" is governed by <governor>
    When a year ends
    Then the pull tongue of "Rennes" is "<pull>"

    Examples:
      | years | governor                  | pull   |
      | 20    | a royal official          | French |
      | 25    | a lord of the tongue French | French |
      | 25    | a lord of the tongue Breton | Breton |
      | 19    | a royal official          | Breton |

  @CULT-020 @CULT-021 @CULT-022 @CULT-024 @CULT-025 @CULT-026 @CULT-027 @CULT-028 @CULT-030 @CULT-031 @placeholder
  Scenario Outline: Drift multipliers
    # config key: drift.multipliers
    Given a province whose pull tongue is "<pull>"
    And the drifting people are <who>
    When a year ends
    Then their drift rate is the base 0.5 % times <multiplier>

    Examples:
      | pull     | who                                                         | multiplier |
      | French   | Flemish farmers with no other condition, under Teach        | 1          |
      | French   | Flemish craftsmen in the town                               | 2          |
      | French   | Occitan farmers (cousins)                                   | 2          |
      | French   | Flemish farmers, under Let be                               | 0.5        |
      | French   | Flemish farmers, under Impose                               | 2          |
      | French   | Breton farmers in the Breton homeland                       | 0.5        |
      | Russian  | farmers of a herding tongue on the steppe                   | 0.5        |
      | French   | Jewish farmers (a trading people)                           | 0.25       |
      | French   | Breton farmers where Breton nationalism is 0.3              | 0.25       |
      | French   | Flemish farmers, the country has printing and railways      | 1.5625     |

  @CULT-029
  Scenario: An Own-tongue charter stops drift toward the court
    Given the country "France" has the court tongue "French"
    And the province "Bayonne" has an "Own tongue" charter for "Basque"
    And the pull tongue of "Bayonne" would be "French"
    When a year ends
    Then no Basque people of "Bayonne" become French

  @CULT-018
  Scenario: Minorities melt into the majority
    Given the province "Kent" has been held 5 years and its majority tongue is "English"
    And the province "Kent" has a "Norman" minority
    When a year ends
    Then the pull tongue of "Kent" is "English"
    And part of the Norman people of "Kent" become English

  @CULT-032 @placeholder
  Scenario: A tongue below 1 % disappears
    # config key: drift.drop_below_share
    Given the province "Troyes" has 0.9 % Flemish people after drift
    When the year's drift is finished
    Then the tongue "Flemish" is no longer in "Troyes"

  @CULT-033 @open-question
  Scenario: A fourth tongue arrives
    # OQ-CULT-5: religion only replaces the smallest if the newcomer is larger
    Given the province "Riga" holds Latvian 60 %, German 30 % and Russian 10 %
    When people of the tongue "Swedish" arrive in "Riga"
    Then the tongue "Swedish" replaces "Russian" among the top three
    And the Russian people join the majority tongue "Latvian"

  @CULT-034 @CULT-035 @CULT-036 @CULT-037
  Scenario Outline: People carry their tongue
    Given the country "Castile" has the court tongue "Castilian"
    When <movers> arrive in the province "<province>"
    Then <effect>

    Examples:
      | movers                                     | province | effect                                                                      |
      | settlers from Castile                      | Toledo   | they add Castilian people to Toledo, an own province with free tiles        |
      | Andalusi refugees                          | Fez      | they count in the Tongue mix of Fez after 2 years                           |
      | homeless Galicians drifting next door      | Leon     | they add Galician people to Leon                                            |
      | soldiers coming home to Galicia            | Galicia  | they rejoin the Galician tongue                                             |
