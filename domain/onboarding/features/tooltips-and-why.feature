@context-onboarding
Feature: Tooltips, "Why?" and linked words
  As any player
  I want every number to explain itself in place
  So that I can learn by playing

  @TUT-084
  Scenario Outline: A tooltip on every input
    Given the gold number on the country card
    When the player uses <gesture> on "<input>"
    Then a tooltip shows the stat's name and one line on what it is

    Examples:
      | input | gesture |
      | touch | a long-press |
      | mouse | a hover for the tooltip delay set in settings |
      | controller | focus then {btn:info} |

  @TUT-085 @TUT-086
  Scenario Outline: Why? on every number
    Given the gold number on the country card
    When the player uses <gesture> on "<input>"
    Then "Why?" shows the full gain and lose list with this month's numbers
    And it links to the Almanac

    Examples:
      | input | gesture |
      | touch | a tap on the number |
      | mouse | a click on the number |
      | controller | focus then {btn:confirm} |

  @TUT-087
  Scenario: A lint test guards every stat
    Given a stat key without an Almanac entry in the UI string tables
    When the lint test runs
    Then it fails

  @TUT-088
  Scenario: A game term links the first time it appears
    Given an event option text uses the term "levy" twice
    Then the first "levy" has a dotted underline and opens its Almanac entry
    And the second "levy" is plain text

  @TUT-089
  Scenario: Plurals link too
    Given the glossary file maps "lord" and "lords" in English
    When a tooltip uses "lords"
    Then "lords" links to the Almanac entry for "lord"

  @TUT-117
  Scenario Outline: Detailed tooltips put the Why? list in the tooltip
    Given the setting "Detailed tooltips" is <setting>
    When the player opens the tooltip of the gold number on the country card
    Then the tooltip shows the stat's name and one line
    And the tooltip <why> the "Why?" list

    Examples:
      | setting | why |
      | off | does not show |
      | on | also shows |
