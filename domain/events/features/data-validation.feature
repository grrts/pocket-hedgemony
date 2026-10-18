@context-events
Feature: Data layers, reference tables and validation
  As the game's designers
  I want the event tree's data checked and split into layers
  So that each discipline edits its own part and broken references never reach a campaign

  @EVT-057
  Scenario Outline: Flags read by triggers must be set somewhere
    Given a trigger reads the flag "<flag>"
    And <source>
    When the event tree is built
    Then the build reports <result>

    Examples:
      | flag              | source                                            | result   |
      | ruler_died        | it is a declared system flag set by the engine    | no error |
      | laki_eruption_fog | no effect sets it and it is not declared          | an error |

  @EVT-058
  Scenario: Adding a value to a closed list needs no engine change
    Given the religion list has no "jain"
    When "jain" is added to the religions in enums
    Then events can use "jain" without any engine change

  @EVT-059
  Scenario: Entities referenced in a trigger must exist at the event's date
    Given a trigger names the entity "johor" for a role in 1511
    And "johor" exists from 1528
    When the event tree is built
    Then the build reports an anachronism warning

  @EVT-060
  Scenario: The build writes one runtime file per layer
    When the event tree is built
    Then it writes the layers history_reference, ages, periods, event_definitions, triggers, selection, execution, choices, ai, effects, modifiers, statistics, balance and localization.en

  @EVT-061
  Scenario: Player-facing text comes from the localization layer
    When the event card for "mahdist_state" is shown
    Then its name "Mahdist state in Sudan" comes from the localization layer by its id

  @EVT-062
  Scenario Outline: Structural checks
    Given <defect>
    When the event tree is built
    Then the build reports an error

    Examples:
      | defect                                                                |
      | an event references an undeclared role                                |
      | an event has two options marked historical                            |
      | a narrative-only event has an option that raises the perpetrator's prestige |
      | two events require each other as mandatory prerequisites              |
      | an event's earliest reachable date is after its latest date           |
      | two exclusive events are both mandatory prerequisites of a third      |
      | a period lies inside none of its ages                                 |

  @EVT-063 @placeholder
  Scenario: Coverage gaps are flagged
    # config: coverage.min_events_per_region_age, coverage.min_agency_share
    Given the age "age_of_globalization" lists the region "caribbean"
    And only 1 event touches the Caribbean in that age
    When the coverage report is built
    Then it flags "caribbean in age_of_globalization: 1 event(s)"

  @EVT-063
  Scenario: Agency share
    Given the Caribbean holds 4 initiator, 5 beneficiary and 3 resister slots out of 34
    When the coverage report is built
    Then its active share is 35 percent

  @EVT-064
  Scenario: The current validation result
    When the event tree is built in check mode
    Then it reports 12 ages, 93 periods and 306 events
    And it reports 0 errors and 21 warnings
    And it exits without failure

  @EVT-065
  Scenario: Unverified sources are marked
    Given a source has verified false
    When the sources are listed for review
    Then the source is marked for a historian to check before release
