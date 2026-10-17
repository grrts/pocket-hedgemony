@context-revolutions
Feature: The 36 revolutions
  As the game
  I want 36 historical revolutions that bind countries by role and may never happen
  So that history can be followed, drift, or be missed

  @REVO-066
  Scenario Outline: Each revolution has a family, an event and a threshold
    Given the revolution "<event>"
    When the revolution catalogue is generated
    Then its family is "<family>"
    And it breaks out at "<threshold>"

    Examples:
      | event                              | family           | threshold            |
      | kaga_ikko_ikki                     | faith            | 3 of 5               |
      | safavid_rise                       | faith            | 3 of 5               |
      | khalsa_founded                     | faith            | 2 of 5               |
      | futa_jallon_jihad                  | faith            | 2 of 3               |
      | sokoto_jihad                       | faith            | 3 of 5               |
      | taiping_rebellion                  | faith            | 3 of 5               |
      | mahdist_state                      | faith            | 3 of 5               |
      | comuneros_revolt                   | estates          | 3 of 5               |
      | dutch_revolt                       | estates          | 2 of 5               |
      | wars_of_the_three_kingdoms         | estates          | 3 of 5               |
      | fronde                             | estates          | 3 of 6               |
      | glorious_revolution                | estates          | 2 of 3               |
      | restoration_of_charles_ii          | restoration      | 2 of 3               |
      | american_revolution                | liberal_national | 3 of 6               |
      | french_revolution                  | liberal_national | 4 of 6               |
      | latin_american_independence        | liberal_national | 1 of 4               |
      | revolutions_of_1848                | liberal_national | 2 of 4               |
      | iranian_constitutional_revolution  | liberal_national | 3 of 5               |
      | young_turk_revolution              | liberal_national | 1 of 3               |
      | xinhai_revolution                  | liberal_national | 3 of 4               |
      | egyptian_revolution_1919           | liberal_national | 3 of 5               |
      | haitian_revolution                 | freedom          | 1 of 4               |
      | shivaji_coronation                 | homeland         | 2 of 5               |
      | sikh_empire_founded                | homeland         | 2 of 5               |
      | fall_of_beijing_1644               | agrarian         | 3 of 5               |
      | tay_son_uprising                   | agrarian         | 3 of 5               |
      | donghak_revolution                 | agrarian         | 3 of 5               |
      | mexican_revolution                 | agrarian         | 2 of 3               |
      | petrine_reforms                    | from_above       | 1 of 4               |
      | rise_of_the_zulu_kingdom           | from_above       | 1 of 2               |
      | meiji_restoration                  | from_above       | 3 of 4               |
      | kemalist_reforms                   | from_above       | 2 of 3               |
      | russian_revolution_1905            | socialist_defeat | 3 of 6               |
      | russian_revolution                 | socialist_defeat | 3 of 5               |
      | armistice_1918                     | socialist_defeat | its existing trigger |
      | restoration_of_the_old_order       | restoration      | 2 of 5               |

  @REVO-066
  Scenario: Ten revolutions are new events and twenty-six extend existing ones
    When the revolution layer is built
    Then 10 revolutions are new events
    And 26 revolutions extend events that already exist in the event tree

  @REVO-067
  Scenario: Another indebted crown can get France's revolution
    Given the date is 1789
    And the country "Spain" is a monarchy with debt above 2000 gold and lit signs of "french_revolution"
    When the event's role selector for "realm" is evaluated
    Then "Spain" can be bound as the realm of "french_revolution"
    And "Spain" sees the card "french_revolution"

  @REVO-067
  Scenario: The generic revolution of 1905 binds any monarchy
    Given the country "Austria" is a monarchy
    And "Austria" has recently lost a war, liberal and socialist ideas, crowded factory workers, land hunger and war weariness
    When the month's signs are evaluated
    Then "Austria" can break out with "russian_revolution_1905" at 3 of 6 signs

  @REVO-068
  Scenario: A revolution whose signs never light never happens
    Given no sign of "french_revolution" was ever lit for any country by 1880
    When the date passes 1880
    Then the revolution "french_revolution" never fires
    And its historical path is gone

  @REVO-069
  Scenario Outline: What is not a revolution
    Given <happening>
    When it is handled
    Then it is handled by <system>, not as a revolution

    Examples:
      | happening                               | system                    |
      | an ordinary peasant rising              | the rebellions system      |
      | a pretender war                         | the rebellions system      |
      | a separatist revolt                     | the rebellions system      |
      | the Tanzimat reforms                    | an ordinary event          |
      | a coup that only swaps rulers           | warfare 4.6                |
