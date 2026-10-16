@context-diplomacy
Feature: Demands
  As a player who wants a war
  I want to ask first, in public, and let the refusal be the reason
  So that my war is a clean one

  @DIPL-111
  Scenario Outline: What a demand needs
    Given the country "A" <has_reason> against the country "B"
    And <need>
    When the country "A" demands "<demand>" of the country "B"
    Then the demand is <result>

    Examples:
      | has_reason              | demand                         | need                                                      | result  |
      | holds a Rival stance    | Hand over a province           | A borders that province                                   | sent    |
      | holds a Rival stance    | Hand over a province           | A neither borders nor claims that province                | refused |
      | holds a war aim         | Pay tribute                    | A borders B                                               | sent    |
      | holds a Hostile stance  | Recognise our pretender        | A has a pretender to B's throne at court                  | sent    |
      | holds a Rival stance    | Release a subject              | B has a subject                                           | sent    |
      | holds a Rival stance    | Tolerate our faith             | a province of B bordering A carries the persecution flag  | sent    |
      | holds a Rival stance    | Apologise and pay              | B insulted A                                              | sent    |
      | holds a Rival stance    | Expel an envoy or cut an alliance | B is allied with A's Rival                             | sent    |
      | has no stance or aim    | Pay tribute                    | A borders B                                               | refused |

  @DIPL-111 @DIPL-112 @placeholder
  Scenario Outline: The demand count
    # config: actions.demand
    Given the country "A" has <ratio> times the soldiers of the country "B"
    And the province "<province>" <heart>
    When the country "A" demands the province "<province>" of the country "B"
    Then the demand's own reasons total <number>

    Examples:
      | ratio | province | heart                                 | number |
      | 1     | Nikopol  | is neither B's capital nor of B's culture | -60 |
      | 3     | Nikopol  | is neither B's capital nor of B's culture | -30 |
      | 3     | Edirne   | holds B's capital                     | -60    |

  @DIPL-113
  Scenario: Giving in
    Given the diplomacy rules are in force
    When the country "B" gives in to the demand "Pay tribute" of the country "A"
    Then the country "A" gets exactly the tribute demanded
    And the ledger of "B" toward "A" holds "Threatened us" at -15
    And there is no war and no truce between them

  @DIPL-114 @placeholder
  Scenario Outline: Refusing gives a war aim for 5 years
    # config: actions.demand.kinds, on_refusal.aim_years
    Given the date is "1450-01"
    When the country "B" refuses the demand "<demand>" of the country "A"
    Then the country "A" holds the war aim "<aim>" against "B" until "1455-01"
    And the ledger of "B" toward "A" holds "Threatened us" at -15

    Examples:
      | demand                         | aim                |
      | Hand over a province           | Take land          |
      | Pay tribute                    | Tribute            |
      | Recognise our pretender        | Seat a pretender   |
      | Release a subject              | Break a subject    |
      | Tolerate our faith             | Defend the faith   |
      | Apologise and pay              | Punish             |
      | Expel an envoy or cut an alliance | Punish          |

  @DIPL-115 @open-question
  Scenario: A war after a refused demand is provoked by the target
    # OQ-DIPL-5: the +20 the target's allies lose is not defined
    Given the country "B" refused the demand of the country "A"
    When the country "A" declares war on "B" with the aim from the refusal
    Then the lords of "A" who are not Warlike do not waver
    And offensive calls of "A" to its allies get +20
    And defensive calls of "B" to its allies lose the +20 bonus to come
