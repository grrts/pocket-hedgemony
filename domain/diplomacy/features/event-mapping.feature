@context-diplomacy
Feature: Events and diplomacy
  As an event writer
  I want events to read and write diplomacy through the event tree's existing terms
  So that diplomacy needs no second event system

  @DIPL-172
  Scenario Outline: Opinion effects become ledger entries
    Given the diplomacy rules are in force
    When the event "<event>" adds opinion <weight> of "A" toward "B" <fade>
    Then the ledger of "A" toward "B" holds an entry named after "<event>" at <weight> <result>

    Examples:
      | event                    | weight | fade                    | result                  |
      | a_royal_hunt             | 20     | with no fade given      | fading over 10 years    |
      | a_border_quarrel         | -30    | fading over 5 years     | fading over 5 years     |

  @DIPL-173
  Scenario Outline: Trust is derived from oaths broken
    Given the country "A" has broken <oaths> oaths in the last 30 years
    When the game evaluates it
    Then the trust of "A" reads <trust>

    Examples:
      | oaths | trust |
      | 0     | 100   |
      | 3     | 70    |
      | 12    | 0     |

  @DIPL-173
  Scenario: Lowering trust adds an oath broken
    Given the diplomacy rules are in force
    When an event lowers the trust of "A"
    Then the country "A" gains an Oath broken

  @DIPL-174 @open-question
  Scenario: Notoriety is derived and written as a notorious deed
    # OQ-DIPL-26: whose deeds count toward notoriety
    Given the country "A" has 4 Lands taken
    When an event adds notoriety 2 to "A"
    Then every country that shares a border, a sea zone or a trade partner with "A" gains the wrong "Notorious deed" at -20 fading over 30 years
    And the Lands taken of "A" are still 4
    And the notoriety of "A" never reads above 100

  @DIPL-175
  Scenario Outline: Relation effects use the engine's actions
    Given the diplomacy rules are in force
    When an event sets the relation "<type>" between "A" and "B"
    Then the diplomacy context applies "<action>" with its requirements

    Examples:
      | type           | action               |
      | alliance       | form_alliance        |
      | truce          | swear peace          |
      | rivalry        | set_rival            |
      | war            | declare_war          |
      | trade_pact     | trade pact           |
      | embargo        | embargo              |
      | guarantee      | pledge protection    |
      | non_aggression | swear peace          |

  @DIPL-175
  Scenario: An event cannot make allies fight without breaking the alliance
    Given the countries "A" and "B" are allied
    When an event sets the relation "war" between "A" and "B"
    Then the alliance must be broken first, as for a player

  @DIPL-176
  Scenario Outline: New effects
    Given the diplomacy rules are in force
    When an event uses the effect "<effect>"
    Then <result>

    Examples:
      | effect    | result                                                              |
      | war_aim   | a war aim against a role is granted for a set number of years       |
      | league    | a league against a role is started                                  |
      | pretender | a pretender to a role's throne is placed at another role's court    |
