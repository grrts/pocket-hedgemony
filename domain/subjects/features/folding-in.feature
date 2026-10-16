@context-subjects
Feature: Folding a subject in
  As an overlord
  I want to fold a loyal subject into my realm as one great lord
  So that I can climb the ladder of rule one rung at a time

  @SUBJ-064 @placeholder
  Scenario Outline: Requirements to fold in
    # config: fold_in
    Given the subject "S" is a "<kind>" that <state>
    When its overlord orders "S" folded in
    Then the order is <result>

    Examples:
      | kind      | state                                                                          | result                                     |
      | Vassal    | has been Loyal 10 years, a subject 20 years, reachable, with lord room         | accepted                                   |
      | Vassal    | has been Loyal 9 years, a subject 20 years, reachable, with lord room          | refused: Loyal for the last 10 years       |
      | Vassal    | has been Loyal 10 years, a subject 19 years, reachable, with lord room         | refused: a subject for 20 years            |
      | Vassal    | has been Loyal 10 years, a subject 20 years, unreachable, with lord room       | refused: a land path or sea route          |
      | Vassal    | has been Loyal 10 years, a subject 20 years, reachable, with no lord room      | refused: room in lord capacity             |
      | Tributary | has been Loyal 10 years, a subject 20 years, reachable, with lord room         | refused: tighten to vassal first           |

  @SUBJ-065
  Scenario Outline: Time held in 1444
    Given the 1444 data holds "<subject>" as a subject since "<start>" with autonomy "<autonomy>"
    When the scenario starts on "1444-11-11"
    Then "<subject>" counts as a subject for <years> years
    And "<subject>" counts as Loyal for <loyal> years

    Examples:
      | subject  | start   | autonomy  | years | loyal |
      | Dauphiné | 1349    | low       | 95    | 10    |
      | Brittany | unknown | very_high | 20    | 0     |

  @SUBJ-066 @placeholder
  Scenario Outline: The envoy at court
    # config: fold_in.envoy_months_per_province
    Given the Loyal Vassal "S" has <provinces> provinces
    And its overlord's envoy has begun folding it in
    When <event>
    Then <result>

    Examples:
      | provinces | event                                    | result                                       |
      | 3         | 3 months pass and "S" stays Loyal        | "S" is folded in                             |
      | 3         | "S" drops to Wavering after 2 months     | the folding stops and the envoy comes home   |

  @SUBJ-067
  Scenario: What folding in does
    Given the Loyal Vassal "S" has 4 provinces, 2 lords, 3 buildings, an army of 2,000 and 150 gold
    And "S" holds the subject "T"
    When its overlord "O" folds it in
    Then "S" is gone from the map
    And the ruler of "S" is a lord of "O" holding all 4 provinces on one card
    And the lords of "S" are merged into his card
    And his retinue is the army of 2,000 and his wealth is 150 gold
    And the 3 buildings stay with his land
    And "T" is a subject of "O"

  @SUBJ-068 @placeholder
  Scenario Outline: Foreign rule
    # config: fold_in.foreign_rule_grievance_years
    Given the Loyal Vassal "S" <shares> the faith and people of its overlord
    When its overlord folds it in
    Then its provinces <grievance>

    Examples:
      | shares         | grievance                                     |
      | shares         | gain no grievance                             |
      | does not share | have the grievance "Foreign rule" for 10 years|

  @SUBJ-069
  Scenario Outline: Folding in a colony
    Given the Colony "C" is at stage "<stage>"
    When its overlord folds it in
    Then <result>

    Examples:
      | stage          | result                                                        |
      | Outpost        | its provinces are royal land at once, needing officials       |
      | Settled        | its provinces are royal land at once, needing officials       |
      | Self-governing | the order is refused                                          |

  @SUBJ-070 @placeholder
  Scenario Outline: Merge the crowns
    # config: kinds.union.merge_requires_years
    Given the Union "Sicily" of "Aragon" has been in union <years> years and is "<loyalty>"
    When "Aragon" merges the crowns
    Then <result>

    Examples:
      | years | loyalty  | result                                                                                                  |
      | 50    | Loyal    | its provinces join "Aragon", its lords become lords of "Aragon" one by one keeping their loyalty, and its laws become a charter there |
      | 32    | Loyal    | the order is refused                                                                                    |
      | 60    | Wavering | the order is refused                                                                                    |

  @SUBJ-071 @SUBJ-072
  Scenario Outline: Inheriting a subject
    Given the subject "S" is a <loyalty> "<kind>"
    When the ruler of "S" dies without an heir
    Then <result>

    Examples:
      | kind      | loyalty  | result                                                              |
      | Vassal    | Loyal    | its overlord inherits it and folds it in at once                    |
      | Union     | Loyal    | its overlord inherits it and folds it in at once                    |
      | Vassal    | Wavering | its lords pick a new ruler and its overlord may back one by envoy   |
      | Tributary | Loyal    | its lords pick a new ruler and its overlord may back one by envoy   |

  @SUBJ-073 @placeholder
  Scenario: The doctrine of lapse
    # config: reasons.lapse_annexation
    Given the overlord "Company" holds the flag "doctrine_of_lapse"
    And the ruler of its Protectorate "S" dies without a natural heir
    When the death is resolved
    Then "S" is folded in
    And every other subject of "Company" has -1 for 10 years
