@context-subjects
Feature: Subject loyalty
  As an overlord
  I want subjects to use the lords' four loyalty steps, moved by visible reasons
  So that I can count the arrows and act before a subject turns

  @SUBJ-026 @placeholder
  Scenario Outline: What each step does
    # config: loyalty.effects
    Given the subject "S" owes 10 gold a month and is "<step>"
    When the month ends
    Then "S" pays <gold> gold
    And "S" <envoys> foreign envoys

    Examples:
      | step      | gold | envoys                      |
      | Loyal     | 10   | turns away                  |
      | Wavering  | 5    | listens to                  |
      | Disloyal  | 0    | bargains with               |
      | In revolt | 0    | is at war and ignores       |

  @SUBJ-026
  Scenario: Only a Loyal subject can be folded in
    Given the subject "S" is "Wavering"
    When its overlord tries to fold it in
    Then the order is refused

  @SUBJ-027 @placeholder
  Scenario Outline: A wavering subject comes half and late
    # config: loyalty.effects.wavering.goes_home_after_months
    Given the Vassal "S" is "Wavering"
    And its overlord's war is <where>
    When "S" is called to war and 6 months pass
    Then "S" sent half its army, late
    And "S" <home>

    Examples:
      | where              | home                          |
      | far from its border| has gone home                 |
      | on its border      | stays in the war              |

  @SUBJ-028 @placeholder
  Scenario: A disloyal subject refuses and hides its army
    # config: reasons.refused_call_again
    Given the Vassal "S" is "Disloyal"
    When its overlord calls it to war twice
    Then "S" refuses both calls
    And "S" gains the down reason "Refused a call again" for 12 months
    And its overlord sees no true size of the army of "S"

  @SUBJ-029
  Scenario: Reasons are visible badges
    Given the subject "Brittany" has reasons
    When the player opens the card of "Brittany"
    Then every reason shows as a named badge pointing up or down
    And no loyalty number is shown or kept

  @SUBJ-030 @placeholder
  Scenario Outline: The seasonal count
    # config: loyalty.check_every_months, step_up_at, step_down_at
    Given the subject "S" is "<from>" with <up> up arrows and <down> down arrows
    When the season ends
    Then "S" is "<to>"

    Examples:
      | from     | up | down | to       |
      | Wavering | 4  | 2    | Loyal    |
      | Wavering | 3  | 2    | Wavering |
      | Wavering | 2  | 4    | Disloyal |
      | Loyal    | 3  | 3    | Loyal    |
      | Loyal    | 1  | 3    | Wavering |

  @SUBJ-031 @placeholder
  Scenario: No two steps the same way within a year
    # config: loyalty.min_months_between_same_direction_steps
    Given the subject "S" dropped from "Loyal" to "Wavering" 6 months ago
    And its arrows total -3
    When the season ends
    Then "S" is still "Wavering"

  @SUBJ-032 @placeholder
  Scenario Outline: Up and down reasons
    # config: reasons
    Given <situation>
    When the season ends
    Then the subject "S" has the reason "<reason>" at <arrow>

    Examples:
      | situation                                                    | reason                   | arrow |
      | "S" shares its overlord's faith                              | Same faith               | 1     |
      | "S" has another faith and its overlord persecutes it         | Different faith          | -2    |
      | the ruler of "S" shares the culture of its overlord's ruler  | Same people              | 1     |
      | the culture of "S" is not accepted by its overlord           | Different people         | -1    |
      | its overlord defended "S" 15 years ago                       | You defended it          | 1     |
      | its overlord sent a gift 3 years ago                         | Gift                     | 1     |
      | a marriage binds the houses                                  | Marriage                 | 1     |
      | an envoy of its overlord is resident there                   | Resident at court        | 1     |
      | a foreign envoy works against its overlord there             | Courted                  | -1    |
      | both have the same rival                                     | Common enemy             | 1     |
      | "S" has been a subject 30 years                              | Long held                | 1     |
      | tribute is light                                             | Light tribute            | 1     |
      | tribute is crushing                                          | Crushing tribute         | -2    |
      | its overlord lost a war 4 years ago                          | You lost a war           | -1    |
      | a new ruler took its overlord's throne 2 years ago           | New ruler                | -1    |
      | no land path and no sea route of its overlord reach "S"      | Far away                 | -1    |
      | "S" holds a subject of its own                               | Master of others         | -3    |
      | "S" is Hostile toward its overlord                           | Hostile stance           | -2    |
      | "S" is Rival toward its overlord                             | Rival stance             | -1    |

  @SUBJ-033 @placeholder
  Scenario Outline: The strength reasons
    # config: reasons.much_stronger, reasons.not_much_stronger
    Given the overlord has <o> soldiers and the subject "S" has <s>
    When the season ends
    Then "S" has <reason>

    Examples:
      | o     | s     | reason                                  |
      | 30000 | 10000 | the reason "You are much stronger" at 1 |
      | 20000 | 10000 | the reason "You are not much stronger" at -1 |
      | 25000 | 10000 | neither strength reason                 |

  @SUBJ-034
  Scenario Outline: Outgrown
    Given the overlord has <o> provinces and the <kind> "S" has <s>
    When the season ends
    Then "S" <has> the reason "Outgrown"

    Examples:
      | o  | kind      | s  | has          |
      | 10 | Vassal    | 6  | has          |
      | 10 | Vassal    | 5  | does not have|
      | 10 | Tributary | 11 | has          |
      | 10 | Tributary | 8  | does not have|

  @SUBJ-035
  Scenario: Events add and remove reasons
    Given the subject "Sweden" is a Union of "Denmark"
    When an event adds a named one-off reason at -2 for 24 months to "Sweden"
    Then "Sweden" has that reason for 24 months
    When an event removes it
    Then "Sweden" no longer has it

  @SUBJ-036
  Scenario Outline: Starting loyalty in 1444
    Given the 1444 data holds "<subject>" with autonomy "<autonomy>" and <stance> toward its overlord
    When the scenario starts
    Then "<subject>" starts "<step>"

    Examples:
      | subject   | autonomy  | stance              | step     |
      | Armagnac  | low       | no Hostile stance   | Loyal    |
      | Nevers    | moderate  | no Hostile stance   | Loyal    |
      | Foix      | high      | no Hostile stance   | Wavering |
      | Brittany  | very_high | no Hostile stance   | Wavering |
      | S         | high      | a Hostile stance    | Disloyal |
