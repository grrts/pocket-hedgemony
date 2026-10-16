@context-religion
Feature: Several faiths in one realm
  As a player
  I want one Faith policy row per faith, and communities that are served or unserved
  So that I choose between calm minorities that grow and shrinking ones that resent me

  @RELG-042 @placeholder
  Scenario Outline: Communities
    # config key: communities.min_share
    Given the faith "protestant" is <share> of "Lyon"
    Then "protestant" is <community> in "Lyon"

    Examples:
      | share | community        |
      | 0.10  | a community      |
      | 0.09  | not a community  |

  @RELG-043 @RELG-044
  Scenario Outline: Served or unserved
    Given the country "France" has the state faith "catholic"
    And the province "La Rochelle" has a protestant community of 40 %
    And protestant is <policy>
    And "La Rochelle" <house> a protestant house of worship
    Then the protestant community is <state>

    Examples:
      | policy     | house   | state    |
      | Tolerated  | has     | served   |
      | Restricted | has     | served   |
      | Tolerated  | has no  | unserved |
      | Persecuted | has     | unserved |

  @RELG-046 @RELG-047 @placeholder @open-question
  Scenario Outline: Wrong faith
    # OQ-RELG-1: a third, not every unserved community
    # config key: communities.wrong_faith_min_share
    Given the country "France" has the state faith "catholic"
    And protestant is <share> of "La Rochelle", <policy>, with <house>
    Then "La Rochelle" <grievance> the grievance "Wrong faith"

    Examples:
      | share | policy     | house                 | grievance     |
      | 0.40  | Tolerated  | no protestant house   | has           |
      | 0.20  | Tolerated  | no protestant house   | does not have |
      | 0.40  | Tolerated  | a protestant church   | does not have |
      | 0.60  | Restricted | a protestant church   | has           |
      | 0.40  | Restricted | a protestant church   | does not have |

  @RELG-047
  Scenario Outline: Wrong faith ends
    Given "La Rochelle" has the grievance "Wrong faith" from its protestant community
    When <change>
    Then "La Rochelle" does not have the grievance "Wrong faith"

    Examples:
      | change                                                       |
      | a protestant house is built and protestant is Tolerated      |
      | the protestant people convert below a third                  |
      | a "Faith tolerance" charter for protestant is granted         |

  @RELG-045
  Scenario: Exactly one Established faith
    Given the country "France" has the state faith "catholic"
    When the player opens the Faith policy screen
    Then there is one row per faith present in the realm
    And only "catholic" is Established

  @RELG-048 @RELG-049 @placeholder
  Scenario: Tolerating a large faith
    # config key: policies.tolerated.pious_lords_waver_if_faith_share_of_realm
    Given the country "France" has protestants as 12 % of the realm
    And the lord "Guise" is Pious and catholic
    When protestant becomes Tolerated at the next New Year
    Then protestant clergy keep their houses and may build new ones
    And protestant tax is normal
    And the lord "Guise" wavers once

  @RELG-050 @RELG-051 @placeholder
  Scenario: Restricting a faith
    # config key: policies.restricted
    Given the country "Mughals" has the state faith "sunni"
    And the lord "Mewar" is hindu
    When hindu becomes Restricted at the next New Year
    Then the hindu share of the tax is 25 % higher
    And "sunni" gets 1 more pull in every province where hindus live
    And hindu clergy build no new houses
    And the lord "Mewar" wavers one step

  @RELG-052 @RELG-053 @RELG-054 @placeholder
  Scenario: Persecuting a faith
    # config key: policies.persecuted
    Given the country "Castile" has the state faith "catholic" and chose to close persecuted houses
    And sunni is 30 % of "Valencia" and 5 % of "Murcia"
    And the country "Granada" is sunni and borders "Castile"
    When sunni becomes Persecuted at the next New Year
    Then the sunni houses of "Castile" are closed
    And sunni pays no tax
    And "Valencia" has the grievance "Persecuted", counting as two
    And "Murcia" does not have the grievance "Persecuted"
    And the "catholic" pull doubles where sunni lives
    And sunni lords become disloyal
    And the flag "religious_persecution_active" is set on "Castile"
    And "Granada" gains the war aim "Defend the faith" against "Castile"
    And each year 2 % of the sunni people flee as refugees, craftsmen and scholars first

  @RELG-055 @placeholder
  Scenario: A change waits for the New Year
    # config key: policies.change_takes_effect
    Given the date is 1 May 1530
    When the player sets protestant to Restricted
    Then protestant is still Tolerated until 1 January 1531

  @RELG-056
  Scenario Outline: Harsher steps are sparks
    Given protestant is <from> in "France"
    When it is changed to <to>
    Then <spark>

    Examples:
      | from       | to         | spark                                                   |
      | Tolerated  | Restricted | a faith-rising spark is raised where protestants live   |
      | Restricted | Persecuted | a faith-rising spark is raised where protestants live   |
      | Persecuted | Restricted | no spark is raised                                      |

  @RELG-057
  Scenario: A Faith tolerance charter overrides the row
    Given jewish is Restricted in "Castile"
    And "Toledo" has a "Faith tolerance" charter for jewish
    Then jewish is treated as Tolerated in "Toledo"

  @RELG-058
  Scenario: Persecuted ends when the policy changes
    Given "Valencia" has the grievance "Persecuted" from sunni
    When sunni becomes Restricted at the next New Year
    Then "Valencia" does not have the grievance "Persecuted"

  @RELG-066 @RELG-067 @placeholder
  Scenario Outline: Lords and faith
    # config key: lords
    Given the lord "<lord>" is of the faith "<faith>"<trait>
    When <change>
    Then the lord "<lord>" <result>

    Examples:
      | lord    | faith    | trait        | change                                                     | result               |
      | Rozmberk | catholic |              | catholic is set to Restricted                              | loses one step       |
      | Rozmberk | catholic |              | catholic is set to Persecuted                              | loses two steps      |
      | Guise   | catholic | , Pious      | the realm tolerates protestants at 12 % of the realm        | loses one step       |
      | Guise   | catholic | , Pious      | the realm takes over protestant houses                     | gains one step       |
      | Mewar   | hindu    |              | the ruler builds a temple in his land                      | gains one step       |
      | Mewar   | hindu    |              | the state faith changes away from hindu                    | loses one step       |
      | Mewar   | hindu    |              | the state faith changes to hindu                           | gains one step       |
