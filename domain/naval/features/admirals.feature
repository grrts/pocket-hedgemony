@context-naval
Feature: Admirals
  As a player or AI country
  I want every fleet that leaves port led by an official I commissioned as its admiral
  So that fleets compete with governing for the realm's trained people

  @NAVY-065
  Scenario: Warships without an admiral stay in port but defend it
    Given the country "Portugal" has 2 galleons in the port "Lisbon" with no admiral
    When the galleons are ordered to sail
    Then the order is refused
    When an enemy fleet enters the sea zone of the port "Lisbon"
    Then the 2 galleons fight the sea battle in the port's own zone

  @NAVY-066
  Scenario: Trade ships sail with no admiral
    Given the country "Portugal" has a cog set to trade in the port "Lisbon"
    When the trade design gives it a route
    Then the cog sails the route under the country "Portugal" with no admiral

  @NAVY-067
  Scenario: Commissioning an official leaves his province
    Given the official "Rui Vaz" runs the province "Lagos"
    When the country "Portugal" commissions "Rui Vaz" as admiral of the fleet of the Algarve
    Then the province "Lagos" is handled as an official leaving it: left, another official moved in, a deputy named or the lord next door asked
    When the country "Portugal" releases "Rui Vaz"
    Then "Rui Vaz" returns to a province the country "Portugal" chooses

  @NAVY-068 @placeholder
  Scenario Outline: Vice-admirals
    Given a large fleet of the country "Portugal" with an admiral
    When the country "Portugal" names <count> vice-admirals from officials or lords
    Then the naming is <result>

    Examples:
      | count | result  |
      | 2     | allowed |
      | 3     | refused |

  @NAVY-069 @NAVY-070 @NAVY-071 @placeholder
  Scenario Outline: Sea skills
    # config: naval.admiral.*
    Given an admiral with <skill> <points>
    When his fleet <does>
    Then <effect>

    Examples:
      | skill     | points | does                       | effect                                                   |
      | Might     | 2      | fights a sea battle        | ships in his part of the line make +10 percent hits      |
      | Might     | 2      | boards an enemy ship       | soldiers and crew he leads aboard fight +20 percent      |
      | Cunning   | 5      | sails a zone               | it needs 25 percent fewer days                           |
      | Cunning   | 1      | looks for enemy fleets     | it sees enemy fleets one zone further                    |
      | Logistics | 2      | sails through a storm      | it suffers 20 percent fewer storm losses                 |
      | Logistics | 3      | sails 10 zones             | it uses 9 supply                                         |
      | Logistics | 2      | sails 10 zones             | it uses 10 supply                                        |

  @NAVY-072 @placeholder
  Scenario: Three storm-free years at sea teach logistics
    Given the admiral "Rui Vaz" has Logistics 1
    And he has spent 3 years at sea without losing a ship to a storm
    When the year ends
    Then the admiral "Rui Vaz" has Logistics 2

  @NAVY-072
  Scenario: Sea victories count as victories
    Given an admiral wins a sea battle
    When skills are gained by the warfare rules
    Then the sea battle counts as a victory

  @NAVY-073 @placeholder
  Scenario Outline: Which officials make admirals
    # config: naval.admirals_by_official
    Given an official of the type "<type>" with no years served
    When he is commissioned as admiral
    Then he starts with Might <might>, Cunning <cunning> and Logistics <logistics>
    And he is offered the trait "<trait>"

    Examples:
      | type            | might | cunning | logistics | trait    |
      | customs officer | 0     | 3       | 1         | Careful  |
      | warden          | 2     | 1       | 1         | Steady   |
      | steward         | 0     | 1       | 3         | Careful  |
      | muster master   | 1     | 1       | 2         | Beloved  |
      | tax collector   | 0     | 2       | 1         | Greedy   |
      | judge           | 1     | 2       | 0         | Cruel    |
      | master of works | 0     | 1       | 2         | none     |
      | chaplain        | 0     | 1       | 1         | none     |
      | schoolmaster    | 0     | 1       | 1         | none     |
      | marshal         | 2     | 2       | 1         | any      |

  @NAVY-073 @open-question
  Scenario: Rui Vaz of Lagos
    # depends on OQ-NAVY-11: the years-served steps (+1 at 5 and at 10 years) are recruiting 7.1's
    Given the official "Rui Vaz" is a customs officer who ran the port province "Lagos" for 9 years
    When the country "Portugal" commissions "Rui Vaz" as admiral
    Then his 9 years in a port count as 18
    And he starts with Might 0, Cunning 5 and Logistics 1
    And he is offered the trait "Careful"

  @NAVY-074
  Scenario: An admiral takes the realm's sea style
    Given the country "Portugal" has a current sea style
    When the country "Portugal" commissions an admiral
    Then the admiral uses that sea style

  @NAVY-075
  Scenario Outline: Who else can lead a fleet
    Given the country "<country>" has a fleet
    When <leader> takes command
    Then <catch>

    Examples:
      | country  | leader                         | catch                                                                   |
      | Portugal | the ruler                      | if he is lost at sea or captured the country faces a succession crisis  |
      | Portugal | a proud lord                   | he will not sail under an official admiral                              |
      | Portugal | a hired privateer              | he leaves when unpaid and may raid neutral shipping and drag Portugal into a war |
      | Igbo     | an elder                       | the fleet is led as by any lord                                         |
