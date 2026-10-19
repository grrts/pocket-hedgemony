@context-onboarding
Feature: The tutorial campaign "Murad's Frontier"
  As a new player
  I want ten short chapters as the Ottomans under Murad I, from 20 September 1378 to 1383, on history's own dates
  So that I learn each system of the start by doing it on the real map

  @TUT-011 @TUT-012 @TUT-013 @placeholder
  Scenario Outline: Each chapter starts from its own save and ends on its Done-when condition
    Given the chapter <number> "<chapter>" is started from its own chapter save
    And the date is <date>
    When <done_when>
    Then the chapter <number> is marked done
    And the chapter list shows a tick on "<chapter>"

    Examples:
      | number | chapter | date | done_when |
      | 0 | The map | September 1378 | the player has opened the province card of "Edirne" and seen the Food and Faith lenses |
      | 1 | A week at a time | September 1378 | the event "Tribute from Constantinople" is answered and the turn report is read |
      | 2 | The bey and his lords | December 1378 | an official is placed and one wavering lord has been given his want, given a gift or left alone |
      | 3 | Schools and inventions | March 1379 | an invention is chosen and the player has seen the recruit pool shrink |
      | 4 | Two emperors | June 1379 | an emperor is chosen and an army of levies, lords' riders and Janissaries stands with a commander |
      | 5 | The walls of Pera | July 1379 | peace is signed |
      | 6 | Bread and castles | June 1381 | a Food policy preset is chosen, the harvest turn is played and one hungry province's "Why?" is opened |
      | 7 | The soldiers' pay | 1382 | the rising in "Edirne" ends by any means |
      | 8 | The road to Serres | August 1383 | Serres falls or terms are agreed |
      | 9 | Your realm now | late 1383 | the player picks to keep playing these Ottomans or to start a new campaign |

  @TUT-011
  Scenario: No event is moved off its historical date
    Given the tutorial's scripted events
    Then the tutorial starts on 20 September 1378, the start of every campaign
    And the event "Tribute from Constantinople" comes in autumn 1378
    And the event "John V and Manuel reach Murad" comes in June 1379
    And the event "John V back in Constantinople" comes on 1 July 1379
    And the event "The settlement of 1381" comes in May 1381
    And the event "A bride for Bayezid" comes in 1381
    And the event "The Hamid towns for sale" comes in 1381
    And the event "Manuel goes to Thessaloniki" comes in 1382
    And Serres falls on 19 September 1383

  @TUT-011
  Scenario Outline: A disputed date takes the dating the 1378 start uses, and says so
    Given the scripted event "<event>"
    Then its date is <date>
    And its history block names the other dating

    Examples:
      | event | date |
      | A bride for Bayezid | 1381 |
      | The Hamid towns for sale | 1381 |

  @TUT-014 @TUT-015
  Scenario: A choice that differs from history carries on, then the next chapter resets
    Given the player asked after John V in chapter 1
    Then chapter 1 carries on from what happened, as a real campaign would
    When the player starts chapter 2
    Then the world is back on its historical course
    And the opening card of chapter 2 says so in one line

  @TUT-016
  Scenario: Scripted events keep their history block
    Given the scripted event "Tribute from Constantinople"
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

  @TUT-018 @placeholder
  Scenario: The tutorial uses its own Ottoman numbers
    Given the recruiting, battle and siege lessons
    Then their numbers come from the Ottoman set
      | janissaries | 1000 |
      | levies | 4000 |
      | lords_riders | 2000 |
      | pera_army | 6000 |
      | serres_months | 2 |

  @TUT-024 @TUT-025
  Scenario: The scenario file overrides only what the tutorial needs
    Given the tutorial scenario file
    Then it starts from the normal 20 September 1378 setup
    And the country "Ottomans" has Murad I, aged 52, as ruler, with Bayezid, aged 18, as heir
    And Edirne is the capital and Bursa the second seat
    And Andronikos IV holds Constantinople, with John V and Manuel II in his prison
    And Çandarlı Kara Halil is grand vizier
    And the Evrenos, Mihal and Timurtaş families are lords, one of them wavering
    And one royal province in Anatolia has no official
    And the Orthodox row of the Faith policy is Restricted
    And the Christian sipahis have a lord card
    And the seed is fixed

  @TUT-026
  Scenario: Scripted events never fire in a real campaign
    Given a real campaign as the country "Ottomans" in 1378
    When the autumn of 1378 is played
    Then no event marked tutorial_only fires

  @TUT-027
  Scenario: Forced AI personalities
    Given chapter 5 is played
    Then Andronikos IV holds "Pera" with the country "Genoa" and commands its sally
    Given chapter 8 is played and Serres has fallen
    Then Manuel II accepts terms

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
