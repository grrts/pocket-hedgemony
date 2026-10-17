@context-government
Feature: Form changes without a reform
  As the game
  I want revolutions, coups, the loss of a shogun's capital and events to change a country's form
  So that history and upheaval can remake a government without the reform path

  @GOV-034 @GOV-035
  Scenario: A revolution sets a form before its era
    Given the date is 1649
    And the country "England" has the form "Diet monarchy"
    And the country "England" does not have G14 Written constitution
    When a revolution sets the form "Constitutional republic" on "England"
    Then the form of "England" is "Constitutional republic"
    And no gold is paid and no reform needs are checked

  @GOV-034
  Scenario: A won New ideas rising sets a form
    Given the country "France" has the form "Absolute monarchy"
    When a "New ideas" rising wins in "France" and sets the form "Constitutional monarchy"
    Then the form of "France" is "Constitutional monarchy"

  @GOV-036
  Scenario: Reforms still need their items after a revolution elsewhere
    Given the date is 1650
    And a revolution has set the form "Constitutional republic" on "England"
    And the country "Venice" has the form "Merchant republic" and no G14 Written constitution
    When the country "Venice" reforms to "Constitutional republic"
    Then the reform is refused

  @GOV-037
  Scenario: An army coup sets a military junta
    Given the country "Mexico" has the form "Constitutional republic"
    When an army coup succeeds in "Mexico"
    Then the form of "Mexico" is "Military junta"

  @GOV-038
  Scenario: The shogun loses the capital
    Given the country "Ashikaga" has the form "Shogunate"
    When the country "Ashikaga" loses its capital
    Then the shogunate breaks into warlord domains
    And the form of "Ashikaga" is "Warlord domain"

  @GOV-039 @GOV-040 @GOV-041 @placeholder
  Scenario Outline: Event-tree government values map to forms
    # config key: event_tree_map
    Given the country "Testland" has the form "<current>"
    And the country "Testland" <g14> G14 Written constitution
    When an event sets the government value "<value>" on "Testland"
    Then the form of "Testland" is "<result>"

    Examples:
      | current                 | g14          | value                   | result                  |
      | Paramount chiefdom      | does not have | monarchy               | Paramount chiefdom      |
      | Household realm         | does not have | monarchy               | Household realm         |
      | City commune            | does not have | monarchy               | Feudal realm            |
      | Feudal realm            | does not have | elective_monarchy      | Elective monarchy       |
      | Feudal realm            | does not have | theocracy              | Holy rule               |
      | Prince-bishopric        | does not have | theocracy              | Prince-bishopric        |
      | Feudal realm            | does not have | republic               | City commune            |
      | Feudal realm            | has          | republic                | Constitutional republic |
      | Peasant commune         | has          | republic                | Peasant commune         |
      | Merchant republic       | has          | republic                | Merchant republic       |
      | Constitutional monarchy | has          | monarchy                | Constitutional monarchy |
      | Feudal realm            | does not have | merchant_republic      | Merchant republic       |
      | Clan council            | does not have | tribal                 | Clan council            |
      | Paramount chiefdom      | does not have | tribal                 | Chiefdom                |
      | Chiefdom                | does not have | confederation          | Confederation           |
      | Feudal realm            | does not have | nomadic_empire         | Horde                   |
      | Feudal realm            | does not have | company                | Company rule            |
      | Feudal realm            | does not have | colonial_administration | Colonial government    |
      | Feudal realm            | has          | constitutional_monarchy | Constitutional monarchy |
      | Feudal realm            | has          | liberal_democracy       | Constitutional republic |
      | Feudal realm            | has          | one_party_state         | Party state             |
      | Feudal realm            | has          | communist               | Party state             |
      | Feudal realm            | has          | fascist                 | Party state             |
      | Feudal realm            | has          | military_junta          | Military junta          |

  @GOV-040
  Scenario: A monarchy event on an elective monarchy
    # D-GOV-8: every house monarchy stays as it is
    Given the country "Poland" has the form "Elective monarchy"
    When an event sets the government value "monarchy" on "Poland"
    Then the form of "Poland" is "Elective monarchy"

  @GOV-042 @placeholder
  Scenario Outline: An event's admin capacity adds to the officials cap
    # config key: admin_capacity_officials_per_point (D-GOV-11)
    Given the country "Ottomans" has the form "Household realm"
    And the country "Ottomans" has a palace at step 2, a chancery, 4 seats at step 1 and a hostage residence
    When an event changes the admin_capacity of "Ottomans" by <change>
    Then the officials cap of "Ottomans" is <cap>

    Examples:
      | change | cap |
      | 4      | 36  |
      | -6     | 26  |
      | -40    | 0   |

  @GOV-053
  Scenario: A form that holds no subjects releases them all
    Given the country "Testland" has the form "Company rule" and 2 subjects
    When an event sets the government value "colonial_administration" on "Testland"
    Then the form of "Testland" is "Colonial government"
    And the country "Testland" releases its 2 subjects

  @GOV-054
  Scenario: The form before a run of revolutions is remembered
    Given the country "France" has the form "Absolute monarchy"
    When a revolution sets the form "Constitutional republic" on "France"
    And a revolution sets the form "Party state" on "France"
    Then the old form of "France" is "Absolute monarchy"

  @GOV-054
  Scenario: Another change ends the run of revolutions
    Given the country "France" has the form "Absolute monarchy"
    And a revolution has set the form "Constitutional republic" on "France"
    And the country "France" has G14 Written constitution
    When an event sets the government value "constitutional_monarchy" on "France"
    Then the old form of "France" is "Constitutional monarchy"
