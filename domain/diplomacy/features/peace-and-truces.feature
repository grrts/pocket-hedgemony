@context-diplomacy
Feature: Peace and truces
  As a country
  I want peace to bring a truce of a known length
  So that wars do not restart at once

  @DIPL-154 @placeholder
  Scenario Outline: Truce length after a peace
    # config: truce.base_months, extra_months_if_land_or_subject, white_peace_months
    Given the date is "1450-01"
    When the countries "A" and "B" sign a peace that <terms>
    Then their truce lasts until "<until>"

    Examples:
      | terms                     | until   |
      | is a white peace          | 1455-01 |
      | pays gold only            | 1455-01 |
      | moves a province          | 1460-01 |
      | makes "B" a subject       | 1460-01 |

  @DIPL-155
  Scenario: Both sides may extend a truce
    Given the countries "England" and "France" have a truce
    When both agree to extend it
    Then the truce lasts longer

  @DIPL-070
  Scenario: The envoy carrying a peace is never held
    Given an envoy of "Hungary" carries a peace offer to the "Ottomans" during the war
    When the game evaluates it
    Then the envoy is never held

  @DIPL-156 @DIPL-166
  Scenario Outline: Many-sided peace
    Given the date is "<date>"
    And three countries are at war on each side
    When one envoy carries a single peace to every warring country
    Then <result>

    Examples:
      | date    | result                                                             |
      | 1610-01 | each country signs or not by its own peace voices, all at once    |
      | 1550-01 | each pair must make its own peace                                  |
