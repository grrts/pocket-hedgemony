@context-religion
Feature: Faith waves and the religion events
  As the game
  I want events to start faith waves that spread pull over decades, and new events to fill the gaps of the tree
  So that the Reformation, Shi'ism and the jihads unfold as flows the player can resist or ride

  @RELG-016 @RELG-097 @RELG-098 @RELG-099 @placeholder
  Scenario: The Reformation wave
    Given the event "protestant_reformation" fires with the option "protect_the_reformer" and the reform centre "Saxony"
    Then a faith wave "reformation" starts for "protestant" from "Saxony"
    And it gives 1.5 pull per press, school and market town or bigger in each province reached
    And it spreads 0.5 rings a year and never leaves Europe
    And it ends with the period "p_protestant_reformation"

  @RELG-098 @RELG-099 @placeholder
  Scenario Outline: Carriers
    Given a wave of "<faith>" with the carrier "<carrier>" and pull 1 has reached "Testshire"
    And "Testshire" has <count>
    Then the wave gives <pull> pull in "Testshire"

    Examples:
      | faith      | carrier   | count                                           | pull |
      | protestant | presses   | 2 presses                                       | 2    |
      | protestant | schools   | 1 school                                        | 1    |
      | protestant | towns     | 1 market town and 1 village                     | 1    |
      | sunni      | traders   | 300 traders passing                             | 3    |
      | shia       | rule      | the wave's from country as owner                | 1    |
      | sunni      | army      | an army of the from country passing this year   | 1    |
      | vajrayana  | preachers | 1 preacher of that faith                        | 1    |

  @RELG-100
  Scenario: A wave does not convert by itself
    Given the Reformation wave has reached "Bavaria"
    And the duke of "Bavaria" has many catholic churches, schools and preachers, and persecutes protestants
    Then "Bavaria" may stay catholic

  @RELG-097 @placeholder
  Scenario Outline: Wave patches on existing events
    # religion event-tree-additions patches.yaml
    When the event "<event>" fires with the option "<option>"
    Then a wave "<wave>" of "<faith>" starts with carriers <carriers>, pull <pull>, reach <reach> a year, limited to <limit>, for <end>

    Examples:
      | event              | option               | wave             | faith      | carriers                | pull | reach | limit              | end                          |
      | council_of_trent   | confessional_reform  | catholic_renewal | catholic   | schools, preachers      | 1.0  | 1.0   | Europe             | the catholic reformation period |
      | safavid_rise       | impose_twelver_shiism | safavid_shiism  | shia       | rule, preachers         | 2.0  | 1.0   | the Middle East    | 150 years                    |
      | sikh_panth_founded | new_panth            | sikh_panth       | sikh       | preachers, towns        | 0.5  | 0.2   | north India        | 200 years                    |
      | futa_jallon_jihad  | almamate             | futa_jallon      | sunni      | rule, army              | 1.5  | 0.5   | West Africa        | 80 years                     |
      | sokoto_jihad       | caliphate            | sokoto           | sunni      | rule, army, preachers   | 1.5  | 0.5   | sub-Saharan Africa | 100 years                    |
      | altan_khan_and_the_dalai_lama | patron_of_the_gelug | mongol_conversion | vajrayana | rule, preachers | 1.5  | 0.5   | Central Asia       | 70 years                     |

  @RELG-101 @RELG-102 @RELG-104
  Scenario Outline: New conditions and effects
    When an event uses "<item>" with <params>
    Then <result>

    Examples:
      | item              | params                                   | result                                                          |
      | faith_policy      | on Mughals, faith hindu, set restricted  | the hindu row of "Mughals" becomes Restricted                    |
      | faith_policy      | who Mughals, faith hindu, is tolerated   | the condition is true while hindu is Tolerated in "Mughals"     |
      | holds_holy_place  | who Ottomans, faith sunni, op >=, value 1 | the condition counts sunni holy places owned by "Ottomans"     |
      | faith_wave_active | id reformation                           | the condition is true while the wave "reformation" runs         |
      | religion_share    | where Bengal, religion sunni             | it reads the faith mix directly                                 |

  @RELG-103
  Scenario: Preachers granted for a time
    When an event gives "Britain" 3 preachers for 60 years with no faith named
    Then "Britain" has 3 extra preachers of its state faith for 60 years

  @RELG-105
  Scenario Outline: Engine flags set by religion
    When <cause>
    Then the flag "<flag>" is set

    Examples:
      | cause                                         | flag                           |
      | a faith is Persecuted                         | religious_persecution_active   |
      | a preacher is killed or expelled abroad       | missionary_persecution         |
      | a Catholic monarchy founds an Inquisition     | inquisition_established        |

  @RELG-106 @open-question
  Scenario Outline: The ten new events
    # OQ-RELG-10: not yet merged into the event tree
    When the religion additions are read
    Then the religion additions hold the event "<event>" dated <date>

    Examples:
      | event                          | date        |
      | princes_adopt_the_reformation  | 1525–1563   |
      | expulsion_of_the_moriscos      | 1609–1614   |
      | altan_khan_and_the_dalai_lama  | 1578        |
      | jizya_reimposed                | 1679        |
      | raskol_old_believers           | 1653–1667   |
      | revolution_and_the_church      | 1790–1801   |
      | separation_of_church_and_state | 1905–1928   |
      | missionary_societies           | 1792 onward |
      | court_conversion_islam         | 1444–1750   |
      | court_conversion_christian     | 1790–1914   |

  @RELG-106 @open-question
  Scenario: The Moriscos expelled by event
    # OQ-RELG-4: 90 % in the event, 70 % in the design
    Given the crown "Spain" is catholic with the flag "inquisition_established"
    And the Mudejar and Morisco population exists
    When the event "expulsion_of_the_moriscos" fires and "Spain" chooses "expel"
    Then 90 % of the Morisco population moves to the host
    And the flag "religious_persecution_active" is set on "Spain" for 20 years

  @RELG-106
  Scenario Outline: A prince adopts the Reformation
    Given the prince "Hesse" is catholic and its realm is at least 10 % protestant during the Reformation
    When it chooses "<option>"
    Then <result>

    Examples:
      | option                      | result                                                                  |
      | adopt_and_take_church_lands | it becomes protestant, dissolves the monasteries and Restricts catholic |
      | adopt_and_keep_church_lands | it becomes protestant and Tolerates catholic                            |
      | stay_with_rome              | it gains 1 catholic preacher for 30 years and Restricts protestant       |
