@context-naval
Feature: At sea against an enemy
  As a player or AI country
  I want crews, boarding, prizes and pirates to shape war at sea
  So that a fleet's men matter as much as its hulls

  @NAVY-098
  Scenario: A ship fights with the share of its crew aboard
    Given a galleon with 150 sailors of its crew of 200
    When it fights a sea battle
    Then it fights with three quarters of its strength

  @NAVY-099
  Scenario Outline: Boarding
    Given a fleet of the country "Portugal" in a sea battle
    When <trigger>
    Then its soldiers aboard fight the enemy ship's crew and soldiers by the land bell rules on a single sector
    And the enemy ship is taken if its defenders break

    Examples:
      | trigger                              |
      | its admiral gives a Close order      |
      | one of its galleys rams              |

  @NAVY-100 @placeholder
  Scenario Outline: Prizes need a prize crew
    # config: naval.prize_crew_share
    Given the country "Portugal" has taken an enemy carrack with a crew of 60
    When the country "Portugal" puts <crew> of its fleet's sailors aboard
    Then the carrack is <result>
    And its own crew become prisoners or prize crew

    Examples:
      | crew | result                             |
      | 15   | Portuguese                         |
      | 10   | burned                             |

  @NAVY-100
  Scenario: A ship that strikes in a hunt can be taken as a prize
    Given a Portuguese fleet hunts traders in a zone
    And an enemy cog strikes to the stronger Portuguese fleet
    When the country "Portugal" puts a prize crew of 8 aboard
    Then the cog belongs to the country "Portugal"

  @NAVY-101 @placeholder
  Scenario: Crews of sunk ships
    # config: naval.sunk_survivors_share
    Given an enemy galleon with a crew of 210 sinks in battle
    When the battle ends
    Then 70 of its crew swim ashore or are picked up by the winner as prisoners
    And 140 drown

  @NAVY-102 @NAVY-103 @placeholder
  Scenario Outline: A pirate fleet grows where trade passes unhunted
    # config: naval.pirate_coasts; depends on OQ-NAVY-23 for the season length
    Given the pirate fleet of the "<coast>" has 4 ships
    And this season trade ships <trade> its home zones
    And <hunt> warship hunted there
    When the season ends
    Then the pirate fleet has <ships> ships

    Examples:
      | coast              | trade          | hunt | ships |
      | wokou              | passed through | no   | 5     |
      | Barbary corsairs   | passed through | a    | 4     |
      | Orang Laut         | did not pass   | no   | 4     |

  @NAVY-102
  Scenario: A pirate fleet hunts trade ships near home
    Given the pirate fleet of the "Aegean corsairs"
    When it chooses where to hunt
    Then it hunts trade ships in its home zones and one zone beyond
    And it belongs to no country

  @NAVY-103
  Scenario: A pirate fleet shrinks by ships taken or sunk
    Given the pirate fleet of the "wokou" has 5 ships
    When a Ming fleet sinks 2 of them
    Then the pirate fleet has 3 ships

  @NAVY-104 @open-question
  Scenario: Burning a pirate base ends the pirate fleet
    # depends on OQ-NAVY-23: the base rule is unclear
    Given the pirate base of the "Barbary corsairs" is a port province on that coast with no harbour of a realm that hunts it
    When the base is burned
    Then the pirate fleet ends until trade brings it back

  @NAVY-105
  Scenario: A pirate people with its own catalogue record
    Given the "Orang Laut" is a catalogue record
    When the country "Malacca" hires the Orang Laut
    Then the Orang Laut pirate fleet sails for the country "Malacca" as a hired fleet

  @NAVY-106 @NAVY-051
  Scenario: An enemy fleet blocks a port
    Given the country "Castile" is at war with the country "Portugal"
    When a Castilian fleet enters the sea zone of the port "Lagos"
    Then the port "Lagos" is blockaded
    And the port "Lagos" can still muster and build
    And no ship leaves the port "Lagos" without a sea battle

  @NAVY-107
  Scenario: Taking a port's castle takes its ships
    Given the port "Lagos" has 2 carracks in port and 1 caravel on a slipway
    When a Castilian army takes the castle of the province "Lagos"
    Then the 2 carracks and the caravel hull belong to the country "Castile"
