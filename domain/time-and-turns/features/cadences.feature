@context-time-and-turns
Feature: Cadences and stated ordering
  As the game
  I want each system's step to run on the cadence its design states
  So that months, seasons and years have the effects the designs describe

  @TIME-043
  Scenario Outline: Daily steps run inside the day loop
    Given the turn is being processed
    When the day loop runs
    Then "<step>" runs once a day

    Examples:
      | step                                                |
      | armies marching                                     |
      | fleets sailing                                      |
      | traders travelling                                  |
      | armies set to attack looking at visible enemies     |

  @TIME-044 @open-question
  # OQ-TIME-4: number of weeks in a 30-day month and where weekly steps run
  Scenario Outline: Weekly steps run each week of the month
    Given the turn is being processed
    When the month is played out
    Then "<step>" runs once a week

    Examples:
      | step                                              |
      | an army abroad eats from its reserve              |
      | an army at home takes its week's meals            |
      | hunger in an army with no food                    |
      | plunder burning one tile                          |
      | a raid burning one tile and moving on             |
      | forced-march desertion of 2 % of levies           |
      | plague while an outbreak runs                     |

  @TIME-045
  Scenario Outline: Monthly steps run once per turn
    Given the context "<context>" has a monthly step "<step>"
    When the turn is processed
    Then "<step>" of the context "<context>" runs once

    Examples:
      | step                                          | context      |
      | births, deaths and overflow                   | province     |
      | building upkeep and construction sites        | buildings    |
      | siege month                                   | warfare      |
      | sickness on campaign                          | warfare      |
      | trade ratio gain and decay                    | trade        |
      | colony progress and colony food               | exploration  |
      | recruit pool refill                           | recruiting   |
      | rising chance in plotting provinces           | rebellions   |
      | subject tribute                               | subjects     |
      | fund rebels caught roll                       | diplomacy    |
      | fund a revolution caught roll                 | revolutions  |
      | AI diplomatic actions                         | diplomacy    |
      | sailors in port and ship states               | naval        |

  @TIME-046 @open-question
  # OQ-TIME-5: season boundaries are not defined
  Scenario Outline: Seasonal steps run once every three months
    Given a season is three months
    When a season ends
    Then "<step>" runs once a season

    Examples:
      | step                                              |
      | famine check in every province                   |
      | farms, groves and fisheries make food            |
      | subject loyalty worked out                       |
      | resident envoy tie +5                             |
      | pirate fleets grow by one ship                   |

  @TIME-047 @open-question
  # OQ-TIME-6: which month runs the yearly steps
  Scenario Outline: Yearly steps run once a year
    Given the step "<step>" is yearly
    When a year ends
    Then "<step>" runs once a year

    Examples:
      | step                                   |
      | traders and trade balance              |
      | wares made                             |
      | building neglect years counted         |
      | building advice                        |
      | culture drift                          |
      | faith mix                              |
      | diplomacy fades                        |
      | league checks                          |

  @TIME-048
  Scenario: Culture's engine-raised checks run every five years
    Given the date is "January 1449"
    When 5 years have passed
    Then the culture checks for the court going native, new tongues abroad and merges run once every 5 years

  @TIME-049 @placeholder
  Scenario: Pool events roll once a month
    Given the config value "selection.pool_roll_interval_months" is 1
    When the turn is processed
    Then each eligible pool event rolls once against its mean years

  @TIME-050
  Scenario: Achievement tests run last
    Given the campaign is an ironman campaign
    When the turn is processed
    Then achievement tests run after every other system of the turn
    And they read the turn's final values

  @TIME-051
  Scenario: Attention checks read the finished turn
    Given a province's local store will reach zero before the next harvest after this turn
    When the turn is processed
    Then the attention check sees the store as it is after the turn's simulation

  @TIME-052
  Scenario: The trade ratio updates after the day loop
    Given 2 traders walked through a province during the month
    When the turn is processed
    Then the trade ratio of that province is updated after the day loop has finished

  @TIME-053
  Scenario: Finished buildings open their slots before overflow runs
    Given a loom house is finished this month in a province with homeless people
    When the turn is processed
    Then the loom house's slots open before the month's overflow is placed

  @TIME-054
  Scenario: Culture drift follows births and deaths
    Given a province with French and Flemish speakers
    When a year ends
    Then births and deaths of that month run before culture drift

  @TIME-055
  Scenario: The faith mix updates with the traders
    Given a province with a Catholic and a Protestant community
    When a year ends
    Then the faith mix updates in the same step as traders and trade balance

  @TIME-057
  Scenario: A diplomatic answer arrives the next turn
    Given the country "Hungary" asks "Venice" for an alliance in "December 1444"
    When the turn is processed
    Then the answer arrives in the turn of "January 1445"

  @TIME-058
  Scenario Outline: Winter depends on the hemisphere
    Given a province in the <hemisphere> hemisphere
    And the month is "<month>"
    When the season calendar is read
    Then it is <state> there

    Examples:
      | hemisphere | month    | state      |
      | northern   | January  | winter     |
      | northern   | July     | not winter |
      | southern   | July     | winter     |
      | southern   | January  | not winter |

  @TIME-059
  Scenario Outline: Snow passes close by hemisphere
    Given a snow-peak province with no pass and no road in the <hemisphere> hemisphere
    And the month is "<month>"
    When the season calendar is read
    Then it is <state>

    Examples:
      | hemisphere | month     | state  |
      | northern   | March     | closed |
      | northern   | April     | open   |
      | southern   | September | closed |
      | southern   | October   | open   |

  @TIME-060 @placeholder
  Scenario Outline: Wet seasons follow the climate
    Given a province in "<climate>"
    And the month is "<month>"
    When the season calendar is read
    Then it is <state>

    Examples:
      | climate              | month    | state              |
      | monsoon Asia         | July     | the wet season     |
      | monsoon Asia         | January  | not the wet season |
      | the Sahel            | August   | the wet season     |
      | the Amazon           | February | the wet season     |
      | the Amazon           | August   | not the wet season |

  @TIME-061 @open-question
  # OQ-TIME-5: the harvest month is not set
  Scenario: The harvest is rolled in autumn and paddies harvest twice
    Given a province with farms and a province with rice paddies
    When a year passes
    Then the farms' harvest is rolled once, in autumn
    And the rice paddies' harvest is rolled twice

  @TIME-062
  Scenario: The 12-turn autosave falls each January
    Given the autosave interval is "every 12 turns"
    When the turns of a year are played
    Then the rotating autosave is written at the start of the January turn
