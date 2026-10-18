@context-naval
Feature: Hired fleets
  As a player or AI country
  I want to hire fleets as I hire mercenary companies, from free captains and from the sea powers
  So that a realm without a navy can still fight or carry an army across the sea

  @NAVY-135 @placeholder
  Scenario: Free fleets gather in their seas
    # config: naval.hiredFleets.forHire, naval.hiredFleets.moveOnChance
    Given the campaign has begun
    Then 4 free fleets are for hire
    And each lies in a sea its group historically sailed
    And no two of them have the same name

  @NAVY-136
  Scenario: A sea power at peace lends its fleet
    Given the country "Genoa" has naval capability "high" and is at war with no one
    And the country "Genoa" has 3 galleys and 2 cogs idle in its port
    When the country "France" looks for fleets to hire
    Then "The Genoa fleet" is offered to the country "France"

  @NAVY-136
  Scenario: A sea power at war keeps its fleet
    Given the country "Genoa" is at war with the country "Milan"
    When the country "France" looks for fleets to hire
    Then no fleet of the country "Genoa" is offered

  @NAVY-137 @placeholder
  Scenario: Only fleets in reach are offered
    # config: naval.hiredFleets.reachDays
    Given a free fleet lies 130 days' sailing from every port of the country "England"
    When the country "England" looks for fleets to hire
    Then that fleet is not offered to the country "England"

  @NAVY-138 @placeholder
  Scenario Outline: Pay a month
    # config: naval.hiredFleets.payMultiplier, naval.hiredFleets.lentPayMultiplier
    Given a <kind> fleet of <ships>
    Then its pay is <gold> gold a month

    Examples:
      | kind | ships                    | gold |
      | free | 3 cogs                   | 1.44 |
      | free | 1 galley                 | 1.68 |
      | lent | 3 galleys and 2 cogs     | 4    |

  @NAVY-138 @NAVY-139
  Scenario: Hiring a lent fleet pays its realm
    Given the country "France" hires "The Genoa fleet" for 4 gold a month
    Then the country "France" pays 4 gold now
    And the country "Genoa" receives 4 gold now
    And the fleet is the country "France"'s, led by a captain of Genoa's people
    And it sails for the nearest port of the country "France"

  @NAVY-140
  Scenario: A hired fleet keeps its own captain
    Given the country "England" has hired the "Danzig convoy"
    Then no admiral can be put over the "Danzig convoy"
    And it cannot join another fleet, part a ship off or be laid up
    But it can carry an army of the country "England"

  @NAVY-141
  Scenario: An unpaid fleet leaves
    Given the country "England" has hired the "Danzig convoy"
    When a month begins with the treasury of the country "England" below zero
    Then the "Danzig convoy" sails off with its captain

  @NAVY-141
  Scenario: A lent fleet is called home
    Given the country "France" has hired "The Genoa fleet"
    When the country "Genoa" goes to war
    Then the fleet goes back to the country "Genoa" and sails for its nearest port

  @NAVY-141
  Scenario: Not dismissed with an army aboard
    Given the country "England" has hired the "Danzig convoy" and an army is aboard
    When the country "England" dismisses it
    Then the order is refused until the army is ashore

  @NAVY-142 @placeholder
  Scenario: The AI hires when outgunned at sea
    # config: naval.hiredFleets.aiReserveMonths
    Given the country "Castile" is at war and its fleets are weaker than its enemy's
    And it has the AI reserve plus 6 months of a free fleet's pay
    When the month begins
    Then the country "Castile" hires the cheapest free fleet that can reach it
