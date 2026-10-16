@context-recruiting
Feature: Commanders from officials
  As a player
  I want to commission my officials as commanders and captains
  So that my commanders obey and their skills come from their years running provinces

  # config: official-to-commander skills and traits
  @RECR-069 @RECR-070 @RECR-072 @placeholder
  Scenario Outline: An official's type sets the commander
    Given an official of type "<type>" with 0 years served
    When the official is commissioned as commander
    Then the commander has Might <might>, Cunning <cunning> and Logistics <logistics>
    And the trait offered is "<trait>"

    Examples:
      | type            | might | cunning | logistics | trait                         |
      | Warden          | 2     | 1       | 1         | Steady or Siege master        |
      | Steward         | 0     | 1       | 3         | Careful                       |
      | Muster master   | 1     | 1       | 2         | Beloved or Old soldier        |
      | Master of works | 0     | 1       | 2         | Siege master                  |
      | Tax collector   | 0     | 2       | 2         | Greedy                        |
      | Customs officer | 0     | 3       | 1         | Careful                       |
      | Judge           | 1     | 2       | 1         | Steady or Cruel               |
      | Schoolmaster    | 0     | 2       | 1         | Old soldier                   |
      | Marshal         | 2     | 2       | 2         | Any                           |

  @RECR-070
  Scenario Outline: A chaplain is Beloved only with a faithful army
    Given an official of type "Chaplain"
    And <share> of the army shares the ruler's faith
    When the official is commissioned as commander
    Then the trait offered is "<trait>"

    Examples:
      | share       | trait   |
      | most        | Beloved |
      | less than half | none |

  @RECR-071 @RECR-074 @placeholder @open-question
  # OQ-RECR-17: tie rule and the cap of 5
  Scenario Outline: Years served raise the highest skill
    Given an official of type "Steward" with <years> years served in "Reims"
    When the official is commissioned as commander
    Then the commander has Logistics <logistics>

    Examples:
      | years | logistics |
      | 4     | 3         |
      | 5     | 4         |
      | 8     | 4         |
      | 10    | 5         |

  @RECR-072
  Scenario: Keeping the rolled trait
    Given an official of type "Warden" is being commissioned with a rolled trait "Reckless"
    When the player keeps the rolled trait
    Then the commander has trait "Reckless"

  @RECR-073
  Scenario Outline: The commander's style
    Given the country "France" has current style "<current>" and has seen style "<seen>" in a battle it fought
    When an official of type "<type>" is commissioned
    Then the commander may take <styles>

    Examples:
      | type    | current | seen  | styles                      |
      | Steward | Style A | Style B | only style "Style A"      |
      | Marshal | Style A | Style B | style "Style A" or "Style B" |

  @RECR-075 @placeholder
  Scenario Outline: How a realm gets a Marshal
    Given the country "France" <how>
    Then the country "France" gains a Marshal official

    Examples:
      | how                                                                         |
      | has an academy that graduates a Marshal                                     |
      | hires a Marshal for three times a normal official's price                  |
      | raises a captain who stood in 3 won battles, on the offer after a won battle |

  @RECR-077 @placeholder
  Scenario: A Marshal is paid double
    Given an official's wage is 2 gold a month
    Then a Marshal's wage is 4 gold a month in war and in peace

  @RECR-078
  Scenario: An idle Marshal loses skill
    Given a Marshal with best skill 3 has stood 10 years in a province with no war
    When the year ends
    Then the Marshal's best skill is 2

  # config: commission cost, field wage, staff
  @RECR-079 @RECR-080 @RECR-081 @placeholder
  Scenario Outline: What a commission costs
    Given an official with a wage of 2 gold a month
    When the official is commissioned as <role>
    Then the country pays 10 gold once
    And the field wage is <wage> gold a month
    And a staff of <staff> travels with them eating 2 rations each a month from the army's reserve

    Examples:
      | role      | wage | staff |
      | commander | 6    | 100   |
      | captain   | 4    | 50    |

  @RECR-081 @placeholder
  Scenario: A commander's staff eats about 290 rations a month
    Given a commander with 100 staff and 30 staff horses
    When a month passes
    Then the staff eat 290 rations from the army's reserve

  @RECR-082 @RECR-083 @RECR-084 @RECR-085 @RECR-086 @placeholder
  Scenario Outline: The empty province
    Given the official of province "Reims" is commissioned
    When the player chooses "<choice>" for "Reims"
    Then the province "Reims" has <effect>

    Examples:
      | choice                   | effect                                                                         |
      | Leave it                 | half tax, half recruits and the state "Ungoverned"                             |
      | Move another official in | the moved official at half effect, and their old province is now empty         |
      | Name a deputy            | full tax and recruits, no type effect, for 1 gold a month                      |
      | Ask the lord next door   | full recruits to the lord's retinue, half tax to the lord, the lord a step more loyal |

  @RECR-085
  Scenario: A deputy needs 20 clerks
    Given the province "Bar" has 12 clerks
    When the official of province "Bar" is commissioned
    Then the choice "Name a deputy" is not offered

  @RECR-086
  Scenario: The lord next door may ask for a fief
    Given the lord next door ran "Reims" while its official was away
    When the war ends
    Then the lord may ask for "Reims" as a fief

  @RECR-087
  Scenario Outline: Coming back from command
    Given a commissioned official had 8 years served in "Reims"
    And "Reims" was run by <runner> while they were away
    When the official is released to "<province>"
    Then their years served are <years>

    Examples:
      | runner          | province | years |
      | a deputy        | Reims    | 8     |
      | a deputy        | Troyes   | 4     |
      | nobody          | Reims    | 4     |
