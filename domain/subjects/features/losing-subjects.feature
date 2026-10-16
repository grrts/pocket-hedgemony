@context-subjects
Feature: Losing a subject
  As an overlord
  I want to see how subjects drift, rise, change masters or are taken
  So that I can act before I lose them

  @SUBJ-074
  Scenario: A disloyal subject drifts away
    Given the Vassal "S" of "O" is "Disloyal"
    When the month ends
    Then "S" pays nothing and refuses calls
    And "S" may bargain with a foreign envoy for a backer who agrees to declare "Break a subject" when it rises

  @SUBJ-075
  Scenario Outline: Disloyal subjects rise together
    Given the subjects "A" and "B" of "O" are "Disloyal"
    And "B" <link> "A"
    When "A" rises
    Then "B" <rises>

    Examples:
      | link                         | rises          |
      | borders                      | rises too      |
      | shares the backer of         | rises too      |
      | neither borders nor shares a backer with | does not rise |

  @SUBJ-076 @placeholder
  Scenario Outline: When a disloyal subject rises
    # config: rising
    Given the Vassal "S" of "O" is "Disloyal"
    And <condition>
    When the month ends
    Then "S" <result>

    Examples:
      | condition                                                          | result         |
      | "S" has a backer that is at peace and willing                       | rises          |
      | "O" is at war elsewhere with over half its peace voices for peace   | rises          |
      | an event says "S" rises                                             | rises          |
      | "S" has no backer and "O" is at peace                               | does not rise  |

  @SUBJ-077
  Scenario: The independence war
    Given the Vassal "S" of "O" has the backer "B"
    When "S" rises
    Then "S" is "In revolt"
    And the Subject relation of "S" ends and "S" is at war with "O"
    And the war aim of "S" is "Independence"
    And "B" joins the war on the side of "S"

  @SUBJ-078
  Scenario Outline: The overlord wins
    Given the <kind> "S" rose against "O" and "S" <border> "O"
    When "O" wins the independence war
    Then the peace may <result>

    Examples:
      | kind      | border               | result                                          |
      | Tributary | does not share a border with | restore "S" as a Vassal                  |
      | Vassal    | shares a border with | fold "S" in at once, ignoring the year requirements |

  @SUBJ-079
  Scenario: The subject wins
    Given the Vassal "S" rose against "O"
    When "S" wins the independence war
    Then "S" is independent
    And "S" is Hostile toward "O"

  @SUBJ-080 @open-question
  Scenario: Changing masters
    # OQ-SUBJ-11: how the rival accepts
    Given "Moldavia" is a Disloyal Vassal of "Poland"
    And "Moldavia" borders "Hungary", a rival of "Poland"
    When "Moldavia" asks to change masters and "Hungary" accepts
    Then "Moldavia" is a Vassal of "Hungary"
    And the stance of "Poland" toward "Moldavia" and toward "Hungary" is "hostile"

  @SUBJ-081 @open-question
  Scenario Outline: Taken by force
    # OQ-SUBJ-6: target of Break a subject
    Given the country "X" declares "Break a subject" on the subject "S" of "O"
    Then "S" is called as the defender and "O" is called to defend it
    When "X" wins and chooses <choice>
    Then "S" <result>

    Examples:
      | choice           | result                    |
      | to free it       | is independent            |
      | to take it       | is a subject of "X"       |

  @SUBJ-082
  Scenario Outline: When the overlord falls
    Given the overlord "O" has the "<kind>" "S"
    And "T" took the capital of "O"
    When "O" is destroyed and "T" <wants> it
    Then "S" <result>

    Examples:
      | kind      | wants           | result                  |
      | Tributary | wants           | goes free               |
      | March     | wants           | goes free               |
      | Vassal    | wants           | is a subject of "T"     |
      | Union     | wants           | is a subject of "T"     |
      | Colony    | does not want   | goes free               |
