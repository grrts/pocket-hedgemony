@context-naval
Feature: Fleets at sea
  As a player or AI country
  I want fleets that sight each other at sea, leaders with a post that fits the fleet, and blockades that pay
  So that a fleet off an enemy's shore at war closes their trade and earns from the trade it stops

  @NAVY-135 @placeholder
  Scenario Outline: Sighting range grows with the leader's Cunning
    # seaEngage base 20, perCunning 1, max 30
    Given a fleet whose leader has Cunning <cunning>
    Then the fleet sights enemy fleets in its own sea zone within <tiles> tiles

    Examples:
      | cunning | tiles |
      | 0       | 20    |
      | 3       | 23    |
      | 10      | 30    |
      | 15      | 30    |

  @NAVY-135 @placeholder
  Scenario: A fleet with no leader sights at the base range
    Given a fleet with no leader
    Then the fleet sights enemy fleets in its own sea zone within 20 tiles

  @NAVY-137 @NAVY-138
  Scenario Outline: Appointing picks the post that fits the fleet
    Given a fleet made up of <ships>
    When a leader is appointed to the fleet
    Then the leader holds the post "<post>"

    Examples:
      | ships                  | post      |
      | cog, carrack           | commodore |
      | caravel                | viceroy   |
      | galleon, cog           | admiral   |
      | galley                 | admiral   |
      | caravel, cog           | admiral   |

  @NAVY-137 @placeholder
  Scenario Outline: A leader's Might in a sea battle
    # admiralPosts.<post>.mightShare
    Given a fleet leader with Might 4 in the post "<post>"
    Then his Might counts as <might> in a sea battle

    Examples:
      | post      | might |
      | admiral   | 4     |
      | commodore | 2     |
      | viceroy   | 2     |

  @NAVY-140
  Scenario Outline: When a fleet blockades
    Given a <ships> fleet <leader>, its realm <war>, <where>
    Then the fleet <blockades>

    Examples:
      | ships   | leader            | war           | where                       | blockades            |
      | galleon | with a leader     | at war        | lying still in a sea zone   | blockades            |
      | galleon | with a leader     | at peace      | lying still in a sea zone   | does not blockade    |
      | cog     | with a leader     | at war        | lying still in a sea zone   | does not blockade    |
      | galleon | with no leader    | at war        | lying still in a sea zone   | does not blockade    |
      | galleon | with a leader     | at war        | sailing a voyage            | does not blockade    |
      | galleon | with a leader     | at war        | in a sea battle             | does not blockade    |
      | galleon | with a leader     | at war        | running for port            | does not blockade    |
      | galleon | with a leader     | at war        | landing an army             | does not blockade    |
      | galleon | with a leader     | at war        | lying in port               | does not blockade    |

  @NAVY-142
  Scenario Outline: Blocked trade ships pass only with their own commodore
    Given a sea zone that <blockade>
    And <escort>
    Then a trade ship of the blocked realm <passes> the zone

    Examples:
      | blockade                     | escort                                   | passes         |
      | no blockade closes           | no commodore of its realm lies there     | passes         |
      | a blockade closes            | no commodore of its realm lies there     | may not pass   |
      | a blockade closes            | a commodore of its realm lies there      | passes         |

  @NAVY-143 @placeholder
  Scenario Outline: Prize money from a closed port
    # blockade.prizeShare 0.5
    Given a closed port whose sea trade value is <value> gold a month at a trade ratio of <ratio>
    When the month's prize money is taken by a fleet under its "admiral"
    Then the blockading realm takes <prize> gold

    Examples:
      | value | ratio | prize |
      | 20    | 40    | 4     |
      | 20    | 100   | 10    |
      | 10    | 0     | 0     |

  @NAVY-139 @NAVY-143 @placeholder
  Scenario: A commodore takes more prize money
    # admiralPosts.commodore.prizeFactor 1.5
    Given a closed port whose sea trade value is 20 gold a month at a trade ratio of 40
    When the month's prize money is taken by a fleet under its "commodore"
    Then the blockading realm takes 6 gold

  @NAVY-144 @placeholder
  Scenario: A closed port weighs half an occupied province
    # blockade.peaceWeight 0.5
    Given the blockade config of the design
    Then each closed port counts as 0.5 of an occupied province when its side weighs peace
