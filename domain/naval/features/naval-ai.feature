@context-naval
Feature: Naval AI and the phone budget
  As an AI country
  I want to run my ports and fleets by my catalogue personality with the same rules as the player
  So that sea powers and land powers behave differently within a phone's computing budget

  @NAVY-109 @placeholder
  Scenario: A sea power keeps seafolk at sea and buys trade ships first
    # config: naval.ai.seaPowerSeafolkAtSea (D-NAVY-25)
    Given the country "Venice" is an AI sea power by its catalogue personality
    And it can call 1200 seafolk to sea
    When it buys ships in peace
    Then it buys trade ships before warships
    And it keeps 300 of its seafolk always at sea

  @NAVY-109
  Scenario: A sea power buys warships when a rival's fleet grows
    Given the country "Genoa" is an AI sea power
    And the fleet of its rival "Venice" grows
    When the AI plans its ships
    Then the country "Genoa" buys warships

  @NAVY-110
  Scenario Outline: A land power lays up in peace and fits out for war across water
    Given the country "Hungary" is an AI land power with 2 galleys
    When <situation>
    Then the country "Hungary" <action>

    Examples:
      | situation                              | action                          |
      | it is at peace                         | lays its galleys up             |
      | a war starts across water              | fits its galleys out            |

  @NAVY-111
  Scenario: Every AI keeps a customs officer in each great port
    Given the AI country "Portugal" holds the great port "Lisbon"
    When the AI places its officials
    Then a customs officer runs the province "Lisbon"

  @NAVY-112
  Scenario: AI fleets plan with the player's graph and winds
    Given an AI fleet plans a voyage
    When its route is computed
    Then it uses the same sea-zone graph and wind calendar as the player

  @NAVY-113 @placeholder
  Scenario Outline: No fleet AI far from the player in peace
    # config: naval.ai.fleet_ai_radius_zones
    Given an AI fleet is <distance> zones from the player's realm and ports
    And the AI country is <war> with the player
    When the day loop runs
    Then the fleet <runs>

    Examples:
      | distance | war       | runs                                       |
      | 11       | at peace  | has its voyage resolved as a day count     |
      | 9        | at peace  | runs its fleet AI                          |
      | 11       | at war    | runs its fleet AI                          |

  @NAVY-114
  Scenario: Cached sea paths
    Given a path is cached for caravels at research step S4 in March
    When the country learns S5
    Then the cached path is recomputed
    And a path is otherwise reused for the same ship class, research step and month

  @NAVY-115
  Scenario: Sailors in port and ship states update once a month
    Given a port with sailors in port and ships in port
    When days pass inside a month
    Then sailors in port and ship states change only at the monthly province update

  @NAVY-116
  Scenario: A sea battle has at most 3 sectors
    Given two large fleets meet in a sea zone
    When the sea battle is set up
    Then it is fought on at most 3 sectors
