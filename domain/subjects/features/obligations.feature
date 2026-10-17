@context-subjects
Feature: Obligations in both directions
  As an overlord
  I want to know what I owe my subjects
  So that neglect has a cost

  @SUBJ-052 @placeholder
  Scenario Outline: Defending a subject
    # config: reasons.defended, reasons.left_alone
    Given the subject "S" is a "<kind>" of "O"
    And the country "<attacker>" declares war on "S"
    When "O" <answer> the call
    Then <result>

    Examples:
      | kind      | attacker | answer  | result                                                                                        |
      | Vassal    | X        | answers | "S" has the reason "You defended it" at 1 for 20 years                                       |
      | Vassal    | X        | refuses | "O" gains an Oath broken, "S" has "You left it alone" at -1, and every other subject has -1 for 5 years |
      | Tributary | O        | ignores | "O" owes no defence against itself                                                           |

  @SUBJ-053 @placeholder
  Scenario: A missed stipend
    # config: reasons.missed_stipend
    Given the March "Jianzhou" expects a yearly stipend from "Ming"
    When a year ends without the stipend paid
    Then "Jianzhou" has the reason "Missed stipend" at -1

  @SUBJ-054
  Scenario: A union shares its ruler's wars
    Given the Union "Sweden" shares the ruler of "Denmark"
    When "Denmark" goes to war with "Holstein"
    Then the war is also the war of "Sweden"
    And the lords of "Sweden" add their peace voices to those of "Denmark"

  @SUBJ-055
  Scenario Outline: Two subjects at odds
    Given the subjects "A" and "B" of "O" are at odds
    When "A" would attack "B" without the leave of "O"
    Then it is refused and the matter goes to "O"
    When "O" <decides>
    Then <result>

    Examples:
      | decides          | result                                       |
      | sides with "A"   | the loyalty of "B" drops one step            |
      | forbids it       | "A" and "B" each have -1 for 5 years         |
