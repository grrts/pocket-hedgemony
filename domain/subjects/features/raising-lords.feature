@context-subjects
Feature: Raising a lord to a subject
  As a ruler of a big realm
  I want to raise a great lord to a subject realm
  So that he stops weighing on my lord capacity, at the price of his land

  @SUBJ-049 @placeholder
  Scenario Outline: Who can be raised
    # config: raise_lord
    Given the lord "<lord>" of "France" holds <provinces> provinces and is "<loyalty>"
    When "France" raises "<lord>"
    Then the order is <result>

    Examples:
      | lord              | provinces | loyalty  | result   |
      | Duke of Bourbon   | 3         | Loyal    | accepted |
      | Duke of Bourbon   | 2         | Loyal    | refused  |
      | Duke of Bourbon   | 4         | Disloyal | refused  |

  @SUBJ-049
  Scenario Outline: What a raised lord becomes
    Given the lord "L" holds 3 provinces <where> and is Loyal
    When his ruler raises him
    Then "L" is a <kind> with his provinces as its own country on the map
    And his retinue becomes its army

    Examples:
      | where                  | kind   |
      | inside the realm       | Vassal |
      | on a frontier          | March  |

  @SUBJ-050 @placeholder
  Scenario: Given a crown
    # config: reasons.given_a_crown
    Given the lord "L" holds 3 provinces and is Wavering
    When his ruler raises him
    Then the new subject "L" has the reason "Given a crown" at 1 for 10 years

  @SUBJ-051
  Scenario: The trade of raising a lord
    Given the lord "L" of "France" holds 3 provinces
    When "France" raises "L"
    Then "L" no longer counts against the lord capacity of "France"
    And "L" counts against the subject reach of "France"
    And the provinces of "L" are no longer in the realm of "France"
    And "France" receives a Vassal's share instead of half his taxes
    And "L" may make friends abroad of its own
