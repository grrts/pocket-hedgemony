@context-diplomacy
Feature: Relation model
  As the game
  I want every pair of countries described by nine relation types in three slots
  So that no two relations contradict each other and history and balance stay apart

  @DIPL-001
  Scenario: Overlord is read from a Subject record, never stored
    Given the country "Serbia" is a subject of the country "Ottomans" with kind "tributary"
    When the game reads the relations of the country "Ottomans"
    Then the country "Ottomans" is the overlord of the country "Serbia"
    And no Overlord record is stored

  @DIPL-001 @DIPL-019
  Scenario: A stored Overlord record is rejected
    Given a relation set holding an Overlord record from "France" to "Brittany"
    When the validator checks the relation set
    Then the validator reports the error "must not be stored"

  @DIPL-002
  Scenario Outline: One state relation per pair
    Given a relation set holding a "<first>" and a "<second>" between the countries "A" and "B"
    When the validator checks the relation set
    Then the validator reports the error "pair already has a state relation"

    Examples:
      | first    | second   |
      | alliance | at_war   |
      | alliance | truce    |
      | at_war   | truce    |

  @DIPL-002 @DIPL-010
  Scenario: Two stances in one perspective are rejected
    Given a relation set holding a one-way "rival" from "A" to "B" and a one-way "hostile" from "A" to "B"
    When the validator checks the relation set
    Then the validator reports the error "already has a stance"

  @DIPL-010
  Scenario: Different stances from opposite perspectives are allowed
    Given a relation set holding a one-way "hostile" from "A" to "B" and a one-way "friendly" from "B" to "A"
    When the validator checks the relation set
    Then the validator reports no error

  @DIPL-003
  Scenario: A country has one direct overlord
    Given a relation set where the country "Wallachia" is a subject of "Hungary" and of "Ottomans"
    When the validator checks the relation set
    Then the validator reports the error "already has overlord"

  @DIPL-003
  Scenario: Subject chains are allowed but cycles are not
    Given a relation set where "A" is a subject of "B", "B" of "C" and "C" of "A"
    When the validator checks the relation set
    Then the validator reports the error "cycle"

  @DIPL-004 @DIPL-019
  Scenario: A mutual relation stored again in reverse is a duplicate
    Given a relation set holding a mutual "rival" from "A" to "B" and a mutual "rival" from "B" to "A"
    When the validator checks the relation set
    Then the validator reports the error "duplicates"

  @DIPL-004 @DIPL-019
  Scenario: A one-way stance conflicting with a mutual one is rejected
    Given a relation set holding a mutual "friendly" between "A" and "B" and a one-way "hostile" from "A" to "B"
    When the validator checks the relation set
    Then the validator reports the error "already has a stance"

  @DIPL-005
  Scenario Outline: Implied stance when none is stored
    Given the countries "A" and "B" have the state "<state>" and no stored stance
    When the game reads the stance of "A" toward "B"
    Then the stance is "<stance>"

    Examples:
      | state    | stance   |
      | at_war   | hostile  |
      | alliance | friendly |
      | none     | neutral  |

  @DIPL-006
  Scenario: A missing pair is not a historical claim
    Given the dataset holds no relation between the countries "Poland" and "Ottomans"
    When the game reads the pair
    Then the pair is "nothing recorded"
    And no Alliance, Subject or Rival is inferred from neighbourhood or friendliness

  @DIPL-007
  Scenario Outline: Forbidden combinations of the exclusivity matrix
    Given a relation set holding a "<a>" and a "<b>" between the same pair
    When the validator checks the relation set
    Then the validator reports an error

    Examples:
      | a        | b        |
      | alliance | neutral  |
      | alliance | hostile  |
      | at_war   | friendly |
      | at_war   | neutral  |
      | subject  | at_war   |
      | subject  | truce    |
      | subject  | alliance |
      | subject  | neutral  |

  @DIPL-008
  Scenario Outline: Redundant combinations only warn
    Given a relation set holding a "<a>" and a "<b>" between the same pair
    When the validator checks the relation set
    Then the validator reports no error
    And the validator reports a warning "redundant"

    Examples:
      | a        | b        |
      | alliance | friendly |
      | subject  | friendly |

  @DIPL-009
  Scenario Outline: Combinations allowed only with a note
    Given a relation set holding a "<a>" and a "<b>" between the same pair with note "<note>"
    When the validator checks the relation set
    Then the validator result is "<result>"

    Examples:
      | a        | b       | note                           | result               |
      | subject  | hostile | none                           | error needs a note   |
      | subject  | hostile | A disloyal subject             | no error             |
      | alliance | rival   | Allies compete over a frontier | no error             |
      | subject  | rival   | none                           | error needs a note   |

  @DIPL-011
  Scenario: Conflicting historical records are never silently fixed
    Given the 1444 dataset holds an Alliance and an At War for the same pair
    When the validator checks the dataset
    Then the dataset is rejected
    And neither record is removed automatically

  @DIPL-012 @DIPL-013
  Scenario: The newest action wins unless blocked, and same-tick effects follow precedence
    Given the countries "A" and "B" have a "truce"
    And in the same tick an effect sets "alliance" and another sets "at_war" between them
    When the tick is resolved
    Then "at_war" wins because At War comes before Truce, Subject and Alliance

  @DIPL-013
  Scenario: The precedence order
    Given the diplomacy rules are in force
    When the game evaluates it
    Then the relation precedence is "at_war, truce, subject, alliance, hostile, rival, friendly, neutral"

  @DIPL-014
  Scenario: A rivalry needs a contested object
    Given the country "Portugal" holds no contested object with the country "Castile"
    When the country "Portugal" declares the country "Castile" a rival
    Then the action is refused with "a rivalry needs a contested object"

  @DIPL-015
  Scenario Outline: Facts feed reasons and never make or block a relation
    Given the fact "<fact>" between the countries "<a>" and "<b>"
    When the game reads the relations between "<a>" and "<b>"
    Then the fact creates no relation type
    And the fact blocks no relation action

    Examples:
      | fact              | a       | b       |
      | dynastic_claim    | Austria | Hungary |
      | royal_marriage    | France  | Scotland|
      | trade_agreement   | England | Hanseatic League |

  @DIPL-016
  Scenario: Gameplay relations never flow back into the dataset
    Given the countries "France" and "Castile" form an alliance in play
    When the game is saved
    Then the alliance has origin "gameplay"
    And the file "relations-1444.json" is unchanged

  @DIPL-017
  Scenario: A locked relation changes only by scripted event
    Given a relation between "A" and "B" is locked
    When the country "A" insults the country "B"
    Then the relation is unchanged
    But a scripted event may change it

  @DIPL-018
  Scenario Outline: Date checks against the reference date 1444-11-11
    Given a relation with start date "<start>" and expiry "<expiry>" of type "<type>"
    When the validator checks it against the reference date "1444-11-11"
    Then the validator result is "<result>"

    Examples:
      | type  | start   | expiry     | result                         |
      | rival | 1445    | none       | error after the reference date |
      | truce | 1440    | 1443-01-01 | error expired                  |
      | truce | 1444-05 | 1446-04-01 | no error                       |

  @DIPL-019
  Scenario Outline: Other invalid records
    Given a relation set holding <record>
    When the validator checks the relation set
    Then the validator reports the error "<message>"

    Examples:
      | record                                         | message      |
      | a "rival" from "A" to "A"                      | same country |
      | a one-way "alliance" from "A" to "B"           | direction    |
      | a "subject" with kind "client_state"           | subject_kind |

  @DIPL-020
  Scenario: The historical 1444 start is a valid game state
    Given the dataset "relations-1444.json" with 280 relations and 19 facts
    When the validator checks it with the rules file
    Then the validator reports no error

  @DIPL-021
  Scenario: Diplomacy adds no relation type
    Given the diplomacy rules are in force
    When the country "Hungary" pledges protection to the country "Wallachia"
    Then a "protection_pledge" fact is recorded
    And no relation type other than the nine is used

  @DIPL-191
  Scenario: Balance numbers live in config, not in the dataset
    Given the config value "truce.base_months" is changed
    When the game loads
    Then the file "relations-1444.json" is unchanged
