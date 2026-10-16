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
      | Horde                   | Confederation           | no adult heir                                      | 0    | 0    |
      | Feudal realm            | Diet monarchy           | a diet hall                                        | 100  | 0    |
      | Feudal realm            | Elective monarchy       | the ruling line dies out                           | 0    | 0    |
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
      | Merchant republic       | City commune            | trade in debt 3 years running                      | 0    | 1    |
      | Peasant commune         | City commune            | a city in the realm                                | 50   | 0    |
      | City commune            | Constitutional republic | G14 Written constitution and a parliament house    | 150  | 0    |
      | Merchant republic       | Constitutional republic | G14 Written constitution and a parliament house    | 150  | 0    |
      | Peasant commune         | Constitutional republic | G14 Written constitution and a parliament house    | 150  | 0    |
      | Prince-bishopric        | Feudal realm            | the ruler takes a reformed faith                   | 100  | 2    |
      | Military order          | Feudal realm            | the ruler takes a reformed faith                   | 100  | 2    |
      | Holy rule               | Household realm         | one family chose the ruler 3 times running         | 150  | 1    |
      | Warlord domain          | Shogunate               | holds the imperial capital and 8 or more lords     | 150  | 1    |
      | Warlord domain          | Feudal realm            | G1 Written law codes                               | 100  | 2    |
      | Shogunate               | Warlord domain          | the shogun loses the capital                       | 0    | 0    |
      | Shogunate               | Constitutional monarchy | G14 Written constitution and a parliament house    | 250  | 4    |
      | Soldier emirs           | Household realm         | one emir's family held the throne 3 reigns         | 150  | 2    |
      | Confederation           | Feudal realm            | one member holds over half the land                | 150  | 3    |
      | Constitutional monarchy | Constitutional republic | the ruler deposed or abdicates                     | 0    | 0    |
      | Constitutional republic | Constitutional monarchy | a king invited by parliament                       | 0    | 0    |
      | Company rule            | Colonial government     | the crown takes over                               | 0    | 1    |

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

  @GOV-027 @open-question
  Scenario Outline: A reform only goes to a listed next form
    # OQ-GOV-1 and OQ-GOV-2: constitutional reforms and next forms without a reform row
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

  @GOV-031 @open-question
  Scenario: Lords lose a step when a reform passes
    # OQ-GOV-4: which lords lose the step is not stated
    Given the country "Castile" has the form "Feudal realm" and 9 lords
    And the country "Castile" meets the needs of the reform to "Absolute monarchy" and has 300 gold
    When the country "Castile" reforms to "Absolute monarchy"
    Then 3 lords of "Castile" have lost a loyalty step
