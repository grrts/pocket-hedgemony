@context-diplomacy
Feature: Relation actions
  As the game
  I want every change of relations to go through one set of actions with requirements and endings
  So that every state the game reaches is valid

  @DIPL-022 @DIPL-026 @DIPL-029 @DIPL-039
  Scenario: After Varna: peace, a truce, and a broken truce
    Given the countries "Hungary" and "Ottomans" are at war
    And the country "Serbia" is a subject of the country "Ottomans" with kind "tributary"
    When "Hungary" and "Ottomans" make peace with a truce of 24 months
    Then "Hungary" and "Ottomans" have a "truce"
    And the stance of "Hungary" toward "Ottomans" is stored as "hostile"
    When the country "Hungary" declares war on the country "Ottomans"
    Then the declaration is refused because a truce is in force
    When the country "Hungary" breaks the truce with the country "Ottomans"
    And the country "Hungary" declares war on the country "Ottomans"
    Then "Hungary" and "Ottomans" are at war
    And the country "Serbia" is still a subject of the country "Ottomans"

  @DIPL-028 @DIPL-030
  Scenario: Truce of Tours: extension and expiry
    Given the countries "England" and "France" have a truce expiring "1446-04-01"
    And "England" and "France" are mutual rivals
    And the date is "1445-04"
    When both extend the truce by 36 months
    Then the truce expires "1449-04-01"
    When the date reaches "1449-04"
    Then "England" and "France" have no truce
    And the stance of "France" toward "England" is "rival"
    And the country "France" may declare war on the country "England"

  @DIPL-028
  Scenario: A truce can only be extended if one exists
    Given the countries "A" and "B" have no truce
    When both extend the truce by 12 months
    Then the action is refused

  @DIPL-025 @DIPL-034 @DIPL-003
  Scenario: A disloyal subject breaks free and changes overlord
    Given the country "Prussian Confederation" is a subject of "Teutonic Order" with kind "estate"
    And the stance of "Prussian Confederation" toward "Teutonic Order" is "hostile" with a note
    And the country "Livonian Order" is a subject of "Teutonic Order"
    When the country "Prussian Confederation" starts an independence war
    Then "Prussian Confederation" and "Teutonic Order" are at war
    And both stances between them are "hostile"
    When "Prussian Confederation" becomes a subject of "Poland" with kind "estate"
    And the country "Poland" declares war on the country "Teutonic Order"
    And "Poland" and "Teutonic Order" make peace with "Teutonic Order" becoming a subject of "Poland"
    Then the overlord of "Teutonic Order" is "Poland"
    And the overlord of "Livonian Order" is "Teutonic Order"

  @DIPL-025
  Scenario: An overlord's victory restores the subject
    Given the country "A" started an independence war against its overlord "B"
    When the country "B" wins the war
    Then the country "A" is again a subject of the country "B"

  @DIPL-022 @DIPL-033
  Scenario: You cannot stab an ally without breaking the alliance first
    Given the countries "France" and "Castile" are allied
    When the country "France" declares war on the country "Castile"
    Then the declaration is refused
    When the country "France" breaks the alliance with the country "Castile"
    And the country "France" declares war on the country "Castile"
    Then "France" and "Castile" are at war
    And the country "France" gains an Oath broken

  @DIPL-022
  Scenario: A subject cannot declare war on its overlord
    Given the country "Brittany" is a subject of the country "France"
    When the country "Brittany" declares war on the country "France"
    Then the declaration is refused with "use independence_war"

  @DIPL-023
  Scenario: An overlord cannot declare war on its own subject
    Given the country "Brittany" is a subject of the country "France"
    When the country "France" declares war on the country "Brittany"
    Then the declaration is refused with "an overlord ends a subject relation by annexing or releasing it"

  @DIPL-024
  Scenario: Declaring war ends friendship and sets hostility where nothing was stored
    Given the stance of "A" toward "B" is stored as "friendly"
    And no stance of "B" toward "A" is stored
    When the country "A" declares war on the country "B"
    Then the friendly stance is ended
    And the stance of "B" toward "A" is stored as "hostile"

  @DIPL-031 @DIPL-032 @DIPL-037
  Scenario: Enemies need reconciliation before an alliance
    Given the countries "Bosnia" and "Herzegovina" are at war
    When "Bosnia" and "Herzegovina" make peace
    Then they have a "truce" and both stances are "hostile"
    When the country "Bosnia" proposes an alliance to the country "Herzegovina"
    Then the alliance is refused because a stance is "hostile"
    When relations between them improve until both stances are "friendly"
    And the countries "Bosnia" and "Herzegovina" form an alliance
    Then they are allied
    And they have no truce
    And no friendly stance is stored between them

  @DIPL-031
  Scenario Outline: Alliance is blocked by war or a subject tie
    Given the countries "A" and "B" have "<relation>"
    When the countries "A" and "B" form an alliance
    Then the action is refused

    Examples:
      | relation             |
      | at_war               |
      | A is a subject of B  |

  @DIPL-003 @DIPL-035
  Scenario: One overlord at a time
    Given the country "Serbia" is a subject of the country "Ottomans"
    When "Serbia" is made a subject of "Hungary"
    Then the action is refused because "Serbia" already has an overlord
    When "Ottomans" releases "Serbia"
    Then both stances between "Serbia" and "Ottomans" are "friendly"
    When "Serbia" is made a subject of "Hungary"
    Then the overlord of "Serbia" is "Hungary"

  @DIPL-034
  Scenario: Subjection carries antagonism with a note
    Given the stance of "A" toward "B" is "rival"
    When "A" is made a subject of "B"
    Then the subject record carries the note "Subjected while antagonistic."

  @DIPL-027
  Scenario: A white peace cools hostility into rivalry
    Given the countries "Austria" and "Swiss Confederation" are at war
    When they make a white peace
    Then they have a "truce"
    And the stance of "Austria" toward "Swiss Confederation" is "rival"
    And the rival stance notes the contested object is still open

  @DIPL-036 @open-question
  Scenario: An insult sets a Hostile stance and ends friendship
    # OQ-DIPL-4: whose perspective becomes Hostile
    Given the stance between "A" and "B" is "friendly"
    When the country "A" insults the country "B"
    Then the friendly stance is ended
    And a "hostile" stance is set between them

  @DIPL-037
  Scenario Outline: Improving relations moves one step
    Given the stance of "A" toward "B" is "<from>"
    When relations of "A" toward "B" improve
    Then the stance of "A" toward "B" is "<to>"

    Examples:
      | from    | to       |
      | hostile | rival    |
      | rival   | neutral  |
      | neutral | friendly |

  @DIPL-038
  Scenario: A destroyed country loses all relations
    Given the country "A" has an alliance with "B" and a rival stance toward "C"
    When the country "A" is destroyed
    Then no relation names the country "A"

  @DIPL-040 @DIPL-041 @DIPL-042 @placeholder
  Scenario Outline: Stance durations
    # config: types.friendly.duration.decay_months, types.rival.duration.min_months_before_change, types.hostile.duration.decay_months
    Given the stance of "A" toward "B" has been "<stance>" for <months> months
    When the month passes
    Then <result>

    Examples:
      | stance   | months | result                                   |
      | friendly | 240    | the friendly stance may decay            |
      | rival    | 119    | the rival stance may not change yet      |
      | hostile  | 120    | the hostile stance decays to "rival"     |

  @DIPL-043 @placeholder
  Scenario: The AI is forced to accept peace after long exhaustion
    # config: types.at_war.duration.war_exhaustion_peace_months
    Given the AI country "A" has been exhausted at war for 60 months
    When a peace is offered
    Then the AI country "A" accepts it

  @DIPL-044
  Scenario: War stops trade between the pair
    Given the countries "Venice" and "Ottomans" are at war
    When the game evaluates it
    Then no trade flows between "Venice" and "Ottomans"

  @DIPL-045 @placeholder
  Scenario: Hostility allows border raids
    # config: modifiers.hostile.border_raid_chance_per_month
    Given the stance of "Ethiopia" toward "Adal" is "hostile"
    When the game evaluates it
    Then each month a border-raid event between them has a chance of 0.02

  @DIPL-046
  Scenario: A historical truce keeps its recorded term
    Given the dataset truce between "England" and "France" expires "1446-04-01"
    When the game starts on "1444-11-11"
    Then the truce expires "1446-04-01" and not after the configured length
