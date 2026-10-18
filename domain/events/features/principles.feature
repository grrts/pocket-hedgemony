@context-events
Feature: Principles of the event tree
  As the game
  I want history to be a reference, roles to bind any fitting country, and harm never to be rewarded
  So that a campaign can follow history, drift or diverge with respect for those who lived it

  @EVT-004
  Scenario: The history block never drives play
    Given the event "french_revolution" has the history date 1789-05-05
    And the trigger of "french_revolution" does not hold for any country in 1789
    When the year 1789 is processed
    Then the event "french_revolution" does not fire

  @EVT-005
  Scenario: A role binds any country that meets its selector
    Given the role "realm" of "french_revolution" selects any monarchy with debt of 2000 or more
    And the country "Spain" is a monarchy with debt of 2500
    When the event becomes eligible
    Then "Spain" can be bound to the role "realm"
    And the historical holder "france" is reference only

  @EVT-005
  Scenario: A fixed role binds the historical holders
    Given the role "revolutionaries" of "french_revolution" is fixed to "french_third_estate"
    When the event becomes eligible
    Then the role "revolutionaries" is bound to "french_third_estate"

  @EVT-006
  Scenario: Resisters choose their own options
    Given the event "anglo_mysore_wars" binds "mysore" as resister and initiator
    When the event fires
    Then the controller of "mysore" chooses the options whose chooser is that role

  @EVT-007
  Scenario: A narrative-only event pays no perpetrator
    Given the event "indian_removal_act" is marked narrative only
    When its options are listed
    Then no option gives the perpetrator a positive stat or prestige payoff
    And its effects act on the named people through population effects

  @EVT-008
  Scenario: Enslaved people are never a trade good
    Given a province with plantations in the Caribbean
    When its trade good is set
    Then enslaved people are not a trade good
    And enslavement is applied as forced population movement with costs on the source societies

  @EVT-009
  Scenario: Disputed numbers lower confidence
    Given the death toll of "bengal_famine_1770" is disputed between 1 and 10 million
    When its history block is shown
    Then the dispute is shown with the confidence "medium"
    And the population loss in its effects is a design value

  @EVT-010
  Scenario Outline: Our own words
    When the event tree names "<concept>"
    Then it uses the term "<term>"

    Examples:
      | concept                     | term               |
      | a province's wealth         | prosperity         |
      | spreading techniques        | innovations        |
      | trade centres               | trade_hubs         |
      | expected waiting time       | mean_years         |
      | reputation for aggression   | notoriety          |
      | strain of holding conquests | integration_strain |

  @EVT-066
  Scenario Outline: Music tags move the soundtrack
    Given the event "<event>" carries the music tag "<tag>"
    When the event fires
    Then the soundtrack receives the tag "<tag>"

    Examples:
      | event              | tag          |
      | french_revolution  | revolution   |
      | great_depression   | crisis       |

  @EVT-067
  Scenario: Tutorial-only events never fire in a real campaign
    Given a scripted event is marked tutorial only
    And a real campaign is running
    When eligibility is evaluated
    Then the scripted event never fires
