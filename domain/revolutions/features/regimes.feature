@context-revolutions
Feature: Regimes
  As the game
  I want a revolution to leave behind a regime that changes how the country plays
  So that a revolution changes the rules, not just who rules

  @REVO-039 @REVO-040 @REVO-046 @REVO-047 @REVO-048 @REVO-049 @REVO-050
  Scenario: The revolutionary republic package
    Given the country "France" is a feudal realm
    When the regime "revolutionary_republic" applies to "France"
    Then the form of "France" is "constitutional_republic"
    And the ruler of "France" is deposed and goes abroad with the heirs as pretenders
    And "France" gains the decrees "levy_en_masse", "sell_church_lands" and "revolutionary_tribunal"
    And "France" loses the actions "grant_fief", "sell_title" and "call_the_lords"
    And the locked actions show "Locked by the revolution"
    And the grievances "Harsh lord" and "Wrong faith" end in the provinces of "France"
    And the grievance "Broken charter" is added in the provinces of "France"
    And "France" has the flags "revolutionary_regime" and "emigre_court"

  @REVO-050
  Scenario Outline: Regimes set forms, rulers, decrees and locks
    When the regime "<regime>" applies to a country
    Then the country's form becomes "<form>"
    And its ruler is "<ruler>"
    And it gains the decrees "<decrees>"
    And it loses the actions "<locks>"

    Examples:
      | regime                 | form                    | ruler    | decrees                                        | locks                                   |
      | league_of_the_faithful | holy_rule               | replaced | call_the_faithful                              | grant_fief, sell_title, crushing_taxes  |
      | heavenly_kingdom       | holy_rule               | replaced | sacred_treasury, open_the_granaries            | grant_fief, sell_title                  |
      | mahdiyya               | holy_rule               | replaced | call_the_faithful, sacred_treasury, gather_the_tribes | hire_companies                   |
      | town_league            | diet_monarchy           | kept     | ask_the_towns, call_the_assembly               | revoke_charter, crushing_taxes          |
      | estates_republic       | merchant_republic       | elected  | sell_bonds, charter_a_company, ask_the_towns   | crushing_taxes                          |
      | commonwealth           | constitutional_republic | deposed  | army_council, sell_church_lands                | call_the_lords                          |
      | court_absolutism       | absolute_monarchy       | kept     | summon_to_court, intendants                    | none                                    |
      | princes_compact        | elective_monarchy       | kept     | none                                           | seize_land                              |
      | swarajya               | household_realm         | replaced | protection_tribute, garrison_hill_forts        | grant_fief, sell_title                  |
      | khalsa_raj             | absolute_monarchy       | replaced | hire_drill_masters, summon_to_court            | persecute                               |
      | misl_confederacy       | confederation           | elected  | protection_tribute                             | grant_fief, sell_title                  |
      | soviet_state           | party_state             | deposed  | requisition_grain, revolutionary_tribunal, levy_en_masse, divide_the_estates | grant_fief, sell_title, call_the_lords, hire_companies |
      | secular_republic       | party_state             | elected  | script_and_schools, sell_church_lands          | grant_fief, sell_title                  |

  @REVO-040
  Scenario Outline: keep and old_form
    Given the country "Joseon" holds the form "bureaucratic_empire"
    And "Joseon" held the form "<before>" before its last revolutionary regime
    When the regime "<regime>" applies to "Joseon"
    Then the form of "Joseon" is "<after>"

    Examples:
      | regime            | before              | after               |
      | agrarian_reform   | bureaucratic_empire | bureaucratic_empire |
      | restored_monarchy | household_realm     | household_realm     |

  @REVO-041
  Scenario: The engine remembers the form before the revolution
    Given the country "England" is a diet monarchy
    When the regime "commonwealth" applies to "England"
    Then the form held before the revolutionary regime is recorded as "diet_monarchy"

  @REVO-042 @REVO-043
  Scenario Outline: A form before its era, and the G14 fallback
    Given the date is <year>
    And the country "England" <has> the invention G14 Written constitution
    When the regime "<regime>" applies to "England"
    Then the form of "England" is "<form>"

    Examples:
      | year | has          | regime             | form                    |
      | 1649 | does not have| commonwealth       | constitutional_republic |
      | 1689 | does not have| crown_and_assembly | diet_monarchy           |
      | 1850 | has          | crown_and_assembly | constitutional_monarchy |

  @REVO-044
  Scenario: The form sets the caps, not the regime
    When the regime "revolutionary_republic" applies to "France"
    Then the officials and lords caps of "France" are those of the form "constitutional_republic"

  @REVO-045
  Scenario: An add-on stacks on the regime in place
    Given the country "France" holds the regime "crown_and_assembly"
    When the regime "emancipation" applies to "France"
    Then "France" holds the regime "crown_and_assembly" and the add-on "emancipation"
    And the grievance "Harsh lord" ends in the provinces of "France"
    And the lords of "France" waver one step at once

  @REVO-045 @REVO-049
  Scenario: A new regime replaces the old and clears its revolutionary flag
    Given the country "England" holds the regime "commonwealth" with the flag "revolutionary_regime"
    When the regime "court_absolutism" applies to "England"
    Then "England" holds only the regime "court_absolutism"
    And "England" no longer has the flag "revolutionary_regime"
    And "England" has the flag "reaction_regime"

  @REVO-049
  Scenario: The restored monarchy clears the revolution's flags
    Given the country "France" has the flags "revolutionary_regime" and "emigre_court"
    When the regime "restored_monarchy" applies to "France"
    Then "France" no longer has the flags "revolutionary_regime" and "emigre_court"
    And "France" has the flag "reaction_regime"

  @REVO-051 @placeholder
  Scenario: Under the reaction the revolution needs one sign fewer for 20 years
    Given the country "France" took the regime "reaction" 5 years ago
    And the revolution "french_revolution" needs 4 signs
    When the turn's signs are evaluated
    Then the revolution "french_revolution" breaks out at 3 signs for "France"

  @REVO-047
  Scenario: The lock effect removes an action
    When the effect "lock on France id massacre" applies
    Then "France" cannot massacre after beating a rising
