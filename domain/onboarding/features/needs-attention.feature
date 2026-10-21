@context-onboarding
Feature: What needs attention
  As a player in a real campaign
  I want one list of what needs me, with a way to see it
  So that nothing important slips by without an advisor nagging me

  @TUT-071 @TUT-072 @TUT-073
  Scenario: Entries are listed in two groups, warnings first
    Given a real campaign as the country "Ottomans"
    And there is one opportunity, one new system and one warning to list
    When the player opens the Needs attention list
    Then the screen is titled "Needs attention"
    And the group "Warnings" holds the warning
    And the group "Waiting for you" holds the opportunity, then the new entry
    And each entry is one line with a Show button
    And no advisor face or voice appears

  @TUT-079 @placeholder
  Scenario Outline: Checks add entries
    Given <condition>
    When the turn's simulation ends
    Then the Needs attention list has the <kind> "<line>"

    Examples:
      | condition | kind | line |
      | the local store of "Sofia" will reach zero before the next harvest | warning | Sofia will run out of bread by March. |
      | Murad's army has 12 days of food in reserve | warning | Murad's army has twelve days of food left. |
      | the lord "Evrenos Bey" turns Wavering | warning | Evrenos Bey grows cold toward you. He wants a march on Serres. |
      | the soldiers have not been paid for two months | warning | Your soldiers have not been paid for two months. |
      | gold will run out in under three months at this rate | warning | At this pace the treasury is empty by June. |
      | 5000 farmers are levied with the harvest three weeks away | warning | Five thousand farmers are under arms with the harvest three weeks away. |
      | grievances in "Edirne" pass the rising threshold | warning | Talk of rising in Edirne. |
      | the royal province "Bursa" has no official | warning | Bursa pays half its taxes without an official. |
      | a neighbour's lord is disloyal and borders the realm | opportunity | A lord across the border may be won over. |
      | the castle of "Edirne" has more grain than it can hold | opportunity | Edirne has more than it can hold. |

  @TUT-007 @TUT-074
  Scenario Outline: Later systems are taught by New entries
    Given the campaign has not yet seen <first>
    When <first> happens
    Then the Needs attention list has a new entry linked to its Almanac page

    Examples:
      | first |
      | a siege |
      | a plague |
      | the first invention of a new era |
      | a new age |

  @TUT-072
  Scenario: Show
    Given the warning "Talk of rising in Edirne." is listed
    When the player presses Show
    Then the camera moves to "Edirne"

  @TUT-075
  Scenario: An entry leaves when its cause ends
    Given the warning "Bursa pays half its taxes without an official." is listed
    When an official is placed in "Bursa"
    Then the warning leaves the list

  @TUT-076
  Scenario Outline: Mute a kind
    Given an entry of the kind "army food low" is listed
    When the player uses <gesture> on the entry and picks "Don't list this kind again"
    Then entries of the kind "army food low" are no longer listed

    Examples:
      | gesture |
      | a long-press |
      | a right-click |
      | {btn:info} |

  @TUT-120
  Scenario: Mute one item
    Given the warning "Bursa pays half its taxes without an official." is listed
    When the player picks "Mute this" on the entry
    Then the warning leaves the list
    And entries of the kind "no official" for other provinces are still listed
    And the mute can be undone in Settings

  @TUT-077 @TUT-078
  Scenario: One checks file drives the list and the vizier
    Given the tutorial is running
    When the check "army food reserve under 15 days" holds after the turn's simulation
    Then the vizier reads out the line in his note

  @TUT-080 @TUT-081
  Scenario: End turn count and the turn report
    Given 3 warnings are on the list
    Then the End turn button shows the count 3
    And the turn report shows the line "Needs attention (3)" that opens the list
    And the turn report does not repeat the warnings

  @TUT-082 @placeholder
  Scenario: A dismissed famine warning waits out its cooldown
    Given the famine warning for "Sofia" was dismissed in March 1450
    And the famine check for "Sofia" holds again in May 1450
    Then the warning is not listed again before March 1451

  @TUT-083
  Scenario: Each later system brings its own checks
    Given a new system design lists its warnings and first-time moments
    Then those checks are added to the one checks config file
