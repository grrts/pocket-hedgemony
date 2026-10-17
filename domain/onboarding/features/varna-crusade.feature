@context-onboarding
Feature: The Varna crusade on the religion system
  As a new player
  I want the crusade to use the real faith, league, war aim and strait rules
  So that what I learn holds in every campaign

  @TUT-036 @TUT-037
  Scenario: The crusaders break the peace and a league forms
    Given chapter 3's last turn is played
    When the crusade event fires
    Then a crusading league against the country "Ottomans" starts, regardless of the usual threshold
    And its members are "Hungary", "Poland", "Wallachia" and "Papal States"
    And "Venice" and "Burgundy" send fleets
    And the country card shows "League against the Ottomans: 4 members, 31,000 soldiers"

  @TUT-038
  Scenario: The event grants the Defend the faith aim
    Given the Orthodox in Ottoman border provinces are Restricted, not Persecuted
    When the league declares war
    Then the league's war aim is Defend the faith, granted by the crusade event
    And the war screen shows the aim and its cause
    And one linked line explains why this aim and not Take land

  @TUT-039
  Scenario: A member's reasons
    When the player taps the league member "Poland"
    Then the member's reasons open on the same screen used for the player's own alliances
    And "Same faith" shows +10 between the Catholic members

  @TUT-040
  Scenario: The fleet closes the Dardanelles
    Given the crusaders' fleet holds the Dardanelles
    Then the Dardanelles crossing shows as closed with the fleet's banner on it

  @TUT-041
  Scenario: Chapter 0's Faith lens
    Given chapter 0 is played and the Food lens has been seen
    When the player switches to the Faith lens
    Then Rumelia shows Orthodox under a Sunni realm
    And provinces where a community is 30 % or more are hatched
    And the step reads "Most of your people in Rumelia are Orthodox Christians. You rule them as a Sunni sultan."

  @TUT-042 @TUT-043 @TUT-044
  Scenario Outline: The Faith policy choice in chapter 4
    Given the league calls on the sultan's Christian subjects to rise
    And the vizier opens the Faith policy screen at the Orthodox row, set to Restricted
    When the player chooses "<choice>"
    Then the Christian sipahis are "<loyalty>"
    And the faith tax <tax>
    And <lords>

    Examples:
      | choice | loyalty | tax | lords |
      | Keep it Restricted | Wavering | keeps paying for the war | the Christian sipahis do not bring their retinue when called |
      | Tolerate it | Loyal | ends | the Christian sipahis' riders come to Varna and Pious Sunni lords waver once |

  @TUT-045
  Scenario: Persecution is shown but dimmed
    When the Faith policy screen is open in the tutorial
    Then Persecute is dimmed
    And its note says it would give every Orthodox neighbour the Defend the faith aim and the crusade would only grow

  @TUT-046 @placeholder
  Scenario: Crossing by the Bosporus ferry
    Given Murad's Anatolian army of 20000 men must reach Thrace
    And the Dardanelles are closed by the crusaders' fleet
    When the player sends the army over the Bosporus ferry
    Then the crossing takes 4 days

  @TUT-047
  Scenario: After Varna
    Given the battle at "Varna" has been fought
    Then the turn report shows the result together with the faith choice
    And it says how many Christian sipahis rode at Varna, or why they stayed home
    When peace with "Hungary" is signed
    Then the league's war ends
    And Hungary's loss of its king comes through the event tree as a succession

  @TUT-048
  Scenario: Schools have a faith
    Given chapter 6 is played
    Then the madrasa in "Edirne" is Sunni
    When the step opens a Rumelian province's Faith line
    Then the Orthodox community shows as "served, Restricted, protected: no grievance"
    And its "Why?" links to the Almanac's religion page

  @TUT-049
  Scenario: The dead on both sides are counted the same way
    Given the battle at "Varna" has been fought
    Then the turn report counts the dead of both sides the same way
    And no step rewards harm
