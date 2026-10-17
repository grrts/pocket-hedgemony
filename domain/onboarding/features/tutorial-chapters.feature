@context-onboarding
Feature: The tutorial campaign "The Year of Varna"
  As a new player
  I want ten short chapters as the Ottomans, spring 1444 to 1447, on history's own dates
  So that I learn each 1444 system by doing it on the real map

  @TUT-011 @TUT-012 @TUT-013 @placeholder
  Scenario Outline: Each chapter starts from its own save and ends on its Done-when condition
    Given the chapter <number> "<chapter>" is started from its own chapter save
    And the date is <date>
    When <done_when>
    Then the chapter <number> is marked done
    And the chapter list shows a tick on "<chapter>"

    Examples:
      | number | chapter | date | done_when |
      | 0 | The map | April 1444 | the player has opened the province card of "Edirne" and seen the Food and Faith lenses |
      | 1 | A month at a time | April 1444 | the peace event at "Edirne" is answered and the turn report is read |
      | 2 | A boy on the throne | July 1444 | an official is placed and one wavering lord has been given his want, given a gift or left alone |
      | 3 | Bread and castles | August 1444 | a Food policy preset is chosen, the harvest turn is played and one hungry province's "Why?" is opened |
      | 4 | Men under arms | October 1444 | an army of levies, lords' riders and Janissaries stands with a commander |
      | 5 | Varna | October 1444 | peace is signed |
      | 6 | Schools and inventions | 1445 | an invention is chosen and the player has seen the recruit pool shrink |
      | 7 | The Janissaries' pay | 1446 | the rising in "Edirne" ends by any means |
      | 8 | The wall at Corinth | November 1446 | the Hexamilion falls or terms are agreed |
      | 9 | Your realm now | 1447 | the player picks to keep playing these Ottomans or to start a new campaign |

  @TUT-011
  Scenario: No event is moved off its historical date
    Given the tutorial's scripted events
    Then the Edirne peace is offered in June 1444
    And the Varna battle is fought in November 1444
    And the storming of the Hexamilion comes in December 1446

  @TUT-014 @TUT-015
  Scenario: A choice that differs from history carries on, then the next chapter resets
    Given the player refused the peace in chapter 1
    Then chapter 1 carries on from what happened, as a real campaign would
    When the player starts chapter 2
    Then the world is back on its historical course
    And the opening card of chapter 2 says so in one line

  @TUT-016
  Scenario: Scripted events keep their history block
    Given the scripted event "Murad's abdication"
    Then it has the event tree's history block with sources

  @TUT-017
  Scenario Outline: The whole tutorial works without a purchase
    Given the player uses "<edition>"
    When the player starts the tutorial
    Then every chapter can be played

    Examples:
      | edition |
      | the Steam demo |
      | the iOS free download |
      | the Android free download |

  # The Ottoman worked-example numbers do not exist yet (OQ-TUT-11).
  @TUT-018 @open-question
  Scenario: The tutorial uses its own Ottoman numbers
    Given the recruiting, battle and siege lessons
    Then their numbers come from an Ottoman set made the same way as the French worked examples

  @TUT-024 @TUT-025
  Scenario: The scenario file overrides only what the tutorial needs
    Given the tutorial scenario file
    Then it starts from the normal 1444 setup
    And the country "Ottomans" has Murad II as ruler and Mehmed as heir
    And Çandarlı Halil is grand vizier
    And the Evrenos, Mihal and Turahan families are lords, one of them wavering
    And one royal province in Anatolia has no official
    And the Orthodox row of the Faith policy is Restricted
    And the Christian sipahis have a lord card
    And the seed is fixed

  @TUT-026
  Scenario: Scripted events never fire in a real campaign
    Given a real campaign as the country "Ottomans" in 1444
    When the month of June 1444 is played
    Then no event marked tutorial_only fires

  @TUT-027
  Scenario: Forced AI personalities
    Given chapter 5 is played
    Then the country "Hungary" marches on "Varna" with Hunyadi commanding
    Given chapter 8 is played and the wall has fallen
    Then the Morea accepts terms

  @TUT-028
  Scenario: Chapter saves are rebuilt by a tool
    When a balance patch changes the rules
    Then every chapter save is rebuilt by playing the previous chapter's recommended path in the engine
    And no chapter save is edited by hand

  @TUT-029
  Scenario: Every chapter is tested in CI
    Given the chapter save of chapter 5 and its recommended orders
    When the CI test plays the recommended path twice
    Then both runs give the same result
    And the chapter reaches its Done-when condition
