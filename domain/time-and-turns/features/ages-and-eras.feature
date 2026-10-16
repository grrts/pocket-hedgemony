@context-time-and-turns
Feature: Ages and eras on the calendar
  As the game
  I want ages and eras tied to the calendar with forced dates
  So that history moves on even when a game stalls, and stops at 1939

  @TIME-063
  Scenario Outline: An age is forced to start or end by its forced date
    Given the age "<age>" has not <change> by its conditions
    When the date reaches the year <year>
    Then the age "<age>" <result>

    Examples:
      | age                          | change           | year | result  |
      | Age of Reformations          | started          | 1530 | starts  |
      | Age of Atlantic Empires      | started          | 1520 | starts  |
      | Age of Exploration           | ended            | 1680 | ends    |
      | Age of Gunpowder Empires     | ended            | 1760 | ends    |
      | Age of Revolutions           | started          | 1800 | starts  |
      | Age of Imperialism           | started          | 1860 | starts  |
      | Age of World Wars            | started          | 1925 | starts  |

  @TIME-064
  Scenario: Ages overlap
    Given the date is "May 1500"
    When the turn is processed
    Then the ages "Age of Gunpowder Empires" and "Age of Exploration" are both running

  @TIME-065 @open-question
  # OQ-TIME-9: Era VII still to 1960 in the research tree; calendar or technology
  Scenario Outline: Eras are dated bands ending at the campaign end
    Given the date is "<date>"
    When the era is read from the calendar
    Then the era is "<era>"

    Examples:
      | date          | era |
      | March 1444    | I   |
      | January 1500  | II  |
      | January 1650  | III |
      | January 1750  | IV  |
      | January 1850  | V   |
      | January 1900  | VI  |
      | January 1939  | VII |
