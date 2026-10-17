@context-government
Feature: Reforms
  As a player or AI country
  I want to reform my government into one of its next forms when I meet the needs and pay the gold
  So that my realm can grow into a form that suits it, at a cost in gold and lords' loyalty

  Background:
    Given the reform list is the config list "reforms"

  @GOV-027 @GOV-028 @GOV-029 @GOV-031 @GOV-032 @GOV-033 @placeholder
  Scenario Outline: Every reform row
    # config key: reforms
    Given the country "Testland" has the form "<from>"
    And the country "Testland" meets "<needs>"
    And the country "Testland" has 400 gold
    When the country "Testland" reforms to "<to>"
    Then the form of "Testland" is "<to>"
    And the country "Testland" has paid <gold> gold
    And <slip> lords of "Testland" have lost a loyalty step

    Examples:
      | from                    | to                      | needs                                              | gold | slip |
      | Clan council            | Chiefdom                | 5 or more provinces                                | 0    | 0    |
      | Clan council            | Confederation           | allied with 2 neighbours of the same people        | 0    | 0    |
      | Chiefdom                | Paramount chiefdom      | 8 or more provinces                                | 50   | 1    |
      | Paramount chiefdom      | Tribute empire          | 3 or more subjects                                 | 100  | 1    |
      | Paramount chiefdom      | Feudal realm            | G2 Feudal grants                                   | 100  | 1    |
      | Paramount chiefdom      | Household realm         | G1 Written law codes                               | 100  | 2    |
      | Tribute empire          | Household realm         | G3 Tax registers or G6 Quipu                       | 150  | 2    |
      | Tribute empire          | Bureaucratic empire     | G4 Examination system                              | 200  | 3    |
      | Horde                   | Household realm         | a palace in a town                                 | 150  | 2    |
      | Feudal realm            | Diet monarchy           | a diet hall                                        | 100  | 0    |
      | Feudal realm            | Absolute monarchy       | G9 Professional bureaucracy and W12 Standing regiments | 300 | 3  |
      | Diet monarchy           | Absolute monarchy       | G9 Professional bureaucracy and W12 Standing regiments | 300 | 3  |
      | Diet monarchy           | Constitutional monarchy | G14 Written constitution and a parliament house    | 200  | 1    |
      | Absolute monarchy       | Constitutional monarchy | G14 Written constitution and a parliament house    | 200  | 1    |
      | Bureaucratic empire     | Constitutional monarchy | G14 Written constitution and a parliament house    | 200  | 1    |
      | Elective monarchy       | Feudal realm            | the same house elected 3 times running             | 100  | 2    |
      | Elective monarchy       | Diet monarchy           | a diet hall                                        | 100  | 1    |
      | Household realm         | Absolute monarchy       | G9 Professional bureaucracy and W12 Standing regiments | 250 | 2  |
      | Household realm         | Bureaucratic empire     | G9 Professional bureaucracy and an examination hall | 250 | 2    |
      | City commune            | Merchant republic       | 4 or more traders abroad                           | 100  | 1    |
      | City commune            | Feudal realm            | one family led the city 3 times running            | 150  | 2    |
      | Merchant republic       | Feudal realm            | one family led the city 3 times running            | 150  | 2    |
      | Peasant commune         | City commune            | a city in the realm                                | 50   | 0    |
      | City commune            | Constitutional republic | G14 Written constitution and a parliament house    | 150  | 0    |
      | Merchant republic       | Constitutional republic | G14 Written constitution and a parliament house    | 150  | 0    |
      | Peasant commune         | Constitutional republic | G14 Written constitution and a parliament house    | 150  | 0    |
      | Prince-bishopric        | Feudal realm            | the ruler takes a reformed faith                   | 100  | 2    |
      | Military order          | Feudal realm            | the ruler takes a reformed faith                   | 100  | 2    |
      | Holy rule               | Household realm         | one family chose the ruler 3 times running         | 150  | 1    |
      | Warlord domain          | Shogunate               | holds the imperial capital and 8 or more lords     | 150  | 1    |
      | Warlord domain          | Feudal realm            | G1 Written law codes                               | 100  | 2    |
      | Shogunate               | Constitutional monarchy | G14 Written constitution and a parliament house    | 250  | 4    |
      | Soldier emirs           | Household realm         | one emir's family held the throne 3 reigns         | 150  | 2    |
      | Confederation           | Feudal realm            | one member holds over half the land                | 150  | 3    |

  @GOV-028
  Scenario: A reform is refused when a need is missing
    Given the country "France" has the form "Feudal realm"
    And the country "France" has G9 Professional bureaucracy but not W12 Standing regiments
    And the country "France" has 500 gold
    When the country "France" reforms to "Absolute monarchy"
    Then the reform is refused
    And the form of "France" is "Feudal realm"
    And the country "France" still has 500 gold

  @GOV-030 @placeholder
  Scenario: A reform is refused without the gold
    Given the country "France" has the form "Feudal realm"
    And the country "France" has a diet hall
    And the country "France" has 60 gold
    When the country "France" reforms to "Diet monarchy"
    Then the reform is refused
    And the form of "France" is "Feudal realm"

  @GOV-027 @GOV-051
  Scenario Outline: A reform only goes to a listed next form
    # D-GOV-1 and D-GOV-2: only the config's reform rows can be ordered
    Given the country "Testland" has the form "<from>"
    When the country "Testland" reforms to "<to>"
    Then the reform is refused because "<to>" has no reform from "<from>"

    Examples:
      | from              | to                      |
      | Feudal realm      | Constitutional monarchy |
      | Clan council      | Feudal realm            |
      | Military junta    | Constitutional republic |
      | Party state       | Constitutional republic |
      | Colonial government | Company rule          |

  @GOV-032 @placeholder
  Scenario: A reform changes the caps and the other numbers
    Given the country "Muscovy" has the form "Household realm"
    And the country "Muscovy" has a palace at step 2 and no other cap building
    And the country "Muscovy" has G9 Professional bureaucracy and W12 Standing regiments and 300 gold
    When the country "Muscovy" reforms to "Absolute monarchy"
    Then the officials cap of "Muscovy" is 26
    And the lords cap of "Muscovy" is 8
    And the colonial range of "Muscovy" is 20 sea zones
    And succession in "Muscovy" is "eldest heir"

  @GOV-031 @placeholder
  Scenario: The lords with the lowest loyalty lose a step when a reform passes
    # config keys: reforms, over_cap.reform.order (D-GOV-4: the New Year order)
    Given the country "Poland" has the form "Elective monarchy" and 9 lords
    And the lord "Oleśnicki" has the lowest loyalty
    And the lords "Tęczyński" and "Tarnowski" share the next lowest loyalty, "Tęczyński" holding more provinces
    And the country "Poland" meets the needs of the reform to "Feudal realm" and has 100 gold
    When the country "Poland" reforms to "Feudal realm"
    Then 2 lords of "Poland" have lost a loyalty step
    And the lord "Oleśnicki" loses 1 loyalty step
    And the lord "Tęczyński" loses 1 loyalty step
    And the lord "Tarnowski" loses no loyalty step

  @GOV-050 @GOV-031 @placeholder
  Scenario Outline: A condition changes the form by itself
    # config key: reforms (the rows marked automatic, D-GOV-3)
    Given the country "Testland" has the form "<from>" and 5 lords
    And for "Testland" it now holds that "<condition>"
    When the month ends
    Then the form of "Testland" is "<to>"
    And the country "Testland" has paid 0 gold
    And <slip> lords of "Testland" have lost a loyalty step

    Examples:
      | from                    | to                      | condition                       | slip |
      | Feudal realm            | Elective monarchy       | the ruling line dies out        | 0    |
      | Horde                   | Confederation           | no adult heir                   | 0    |
      | Shogunate               | Warlord domain          | the shogun loses the capital    | 0    |
      | Merchant republic       | City commune            | trade in debt 3 years running   | 1    |
      | Constitutional monarchy | Constitutional republic | the ruler deposed or abdicates  | 0    |
      | Constitutional republic | Constitutional monarchy | a king invited by parliament    | 0    |
      | Company rule            | Colonial government     | the crown takes over            | 1    |

  @GOV-050
  Scenario: A condition change cannot be ordered
    Given the country "Castile" has the form "Feudal realm"
    And the country "Castile" has 400 gold
    When the country "Castile" reforms to "Elective monarchy"
    Then the reform is refused
    And the form of "Castile" is "Feudal realm"
    And the country "Castile" still has 400 gold

  @GOV-051
  Scenario: A next form with no reform row comes only by revolution or event
    Given the country "Mexico" has the form "Military junta"
    When the player opens the government card of "Mexico"
    Then it shows "Constitutional republic: by revolution or event only" as not met

  @GOV-052 @placeholder
  Scenario Outline: The AI reforms in January when it meets the needs with gold to spare
    # config keys: ai.reform_month, ai.reform_gold_reserve_factor
    Given the country "Castile" has the form "Feudal realm"
    And the country "Castile" has a diet hall
    And the country "Castile" has <gold> gold
    And the date is <date>
    When the AI of "Castile" considers a reform
    Then the AI of "Castile" <outcome>

    Examples:
      | gold | date         | outcome                              |
      | 200  | January 1450 | orders the reform to "Diet monarchy" |
      | 199  | January 1450 | orders no reform                     |
      | 400  | March 1450   | orders no reform                     |

  @GOV-056
  Scenario Outline: A prince-bishop takes a reformed faith
    Given the country "Testland" has the form "Prince-bishopric"
    And the country "Testland" was founded in the faith "Catholic" and now has the state faith "<faith>"
    And the country "Testland" has 400 gold
    When the country "Testland" reforms to "Feudal realm"
    Then the form of "Testland" is "<form>"

    Examples:
      | faith      | form             |
      | Protestant | Feudal realm     |
      | Catholic   | Prince-bishopric |
