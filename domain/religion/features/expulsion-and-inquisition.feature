@context-religion
Feature: Expulsion and the Inquisition
  As a player
  I want harsh one-off decisions with their full costs
  So that driving out a faith is possible but never leaves my realm better off

  @RELG-059
  Scenario: Expel only a Persecuted faith
    Given jewish is Restricted in "Castile"
    Then the decision "Expel" is not offered for jewish
    When jewish becomes Persecuted
    Then the decision "Expel" is offered for jewish

  @RELG-060 @RELG-061 @placeholder
  Scenario: The Alhambra decree
    # config key: expulsion
    Given the date is 1492
    And jewish is Persecuted in "Castile"
    And the nearest realm where jewish is Tolerated is "Ottomans"
    When "Castile" expels the jewish faith
    Then within a year 70 % of the jewish people leave as refugees for "Ottomans", keeping their class where a slot is free
    And the rest convert or hide, and the hidden-believer floor still applies
    And "Castile" gains their houses and the gold of their property
    And the "Persecuted" grievance of jewish ends in "Castile"
    And every province where they lived gets the grievance "Bloodshed"

  @RELG-062
  Scenario: Harm is never rewarded
    Given "Castile" expels the jewish faith
    Then "Castile" is not better off in people or skills
    And "Ottomans" gains the people and their skills

  @RELG-063
  Scenario Outline: Who may found an Inquisition
    Given the country "<country>" has the state faith "<faith>" and the form "<form>"
    Then the Inquisition decision is <offered> to "<country>"

    Examples:
      | country  | faith      | form              | offered     |
      | Castile  | catholic   | Feudal realm      | offered     |
      | Poland   | catholic   | Elective monarchy | offered     |
      | Portugal | catholic   | Absolute monarchy | offered     |
      | Venice   | catholic   | Merchant republic | not offered |
      | Teutons  | catholic   | Military order    | not offered |
      | England  | anglican   | Diet monarchy     | not offered |

  @RELG-063 @RELG-064 @placeholder
  Scenario: An Inquisition runs
    # config key: inquisition
    Given "Castile" founds an Inquisition
    And "Valencia" has a Restricted sunni community
    Then the flag "inquisition_established" is set on "Castile"
    And "Castile" pays the Inquisition's gold upkeep each year
    And "catholic" gets 1 more pull in "Valencia"
    And the hidden-believer floor no longer applies in "Castile"
    And each year 1 % of the scholars and craftsmen of "Valencia" leave

  @RELG-065
  Scenario: Closing the Inquisition
    Given "Spain" has an Inquisition
    When "Spain" closes it in 1834
    Then the Inquisition's effects end
