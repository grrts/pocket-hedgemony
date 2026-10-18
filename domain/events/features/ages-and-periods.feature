@context-events
Feature: Ages and periods
  As the game
  I want ages and periods to start and end from the simulated world, within windows and forced dates
  So that history's framing follows play and a stalled game still advances

  @EVT-011 @EVT-013 @placeholder
  Scenario Outline: Forced dates start and end an age
    Given the start condition of the age "<age>" has never held
    When the date reaches <force_start>
    Then the age "<age>" is active
    When the date reaches <force_end> and its end condition has never held
    Then the age "<age>" is no longer active

    Examples:
      | age                          | force_start | force_end |
      | age_of_gunpowder_empires     | 1444        | 1760      |
      | age_of_exploration           | 1444        | 1680      |
      | age_of_reformations          | 1530        | 1700      |
      | age_of_atlantic_empires      | 1520        | 1880      |
      | age_of_crisis_and_absolutism | 1640        | 1790      |
      | age_of_revolutions           | 1800        | 1880      |
      | age_of_industrialization     | 1830        | 1950      |
      | age_of_imperialism           | 1860        | 1945      |
      | age_of_world_wars            | 1925        | 1960      |

  @EVT-011
  Scenario: An age starts early from its conditions
    Given the date is 1792
    And the event "french_revolution" has happened
    When the yearly age check runs
    Then the age "age_of_revolutions" is active

  @EVT-011
  Scenario: An age cannot start outside its window
    Given the date is 1740
    And the event "american_revolution" has somehow happened
    When the yearly age check runs
    Then the age "age_of_revolutions" is not active, because its window opens in 1750

  @EVT-012
  Scenario: Several ages run at once
    Given the date is 1500
    When the yearly age check runs
    Then the ages "age_of_gunpowder_empires" and "age_of_exploration" are both active

  @EVT-014
  Scenario: An age's region list gates systems that read it
    Given the age "age_of_exploration" lists the region "europe" and not "central_asia"
    And the age "age_of_exploration" is active
    When exploration asks whether the age has begun in "central_asia"
    Then the answer is no

  @EVT-015
  Scenario: A period active at the start ends on its condition
    Given the period "p_ottoman_expansion" starts as initial
    When the campaign starts in 1444
    Then the period "p_ottoman_expansion" is active
    When the event "death_of_suleiman" happens
    Then the period "p_ottoman_expansion" ends

  @EVT-015
  Scenario: A period can never start
    Given the start condition of a period never holds inside its window
    When its window closes
    Then the period never became active

  @EVT-016
  Scenario: Membership is declared once
    Given the event "french_revolution" lists the period "p_atlantic_revolutions"
    When the event tree is built
    Then the period "p_atlantic_revolutions" lists the event "french_revolution"

  @EVT-017
  Scenario: Effects start a period that conditions can read
    Given the event "french_revolution" has the effect "start_period p_atlantic_revolutions"
    When the event fires
    Then the condition "period_active p_atlantic_revolutions" is true
