@context-onboarding
Feature: The Byzantine civil war on the diplomacy, religion, warfare and troop movement rules
  As a new player
  I want the choice between two emperors to use the real war aim, reasons, faith and strait rules
  So that what I learn holds in every campaign

  @TUT-036 @TUT-037
  Scenario: Two emperors, and the news that one has escaped
    Given the tutorial scenario file
    Then Andronikos IV holds the Byzantine throne from the start, since 12 August 1376
    And John V and Manuel II are in his prison
    And the countries "Venice" and "Genoa" are at war over Tenedos
    When chapter 3's last turn is played
    Then the news reads "John V and Manuel have escaped to Murad"
    And the country card shows "Two emperors: Andronikos IV (Genoa) and John V (Venice)"

  @TUT-038
  Scenario Outline: Which emperor to back
    Given the event "John V and Manuel reach Murad" is open in chapter 4
    When the player picks "<choice>"
    Then the Italian partner is "<partner>", bringing <brings>
    And the enemy is "<enemy>", with "<enemy_partner>" beside him
    And the Ottoman war aim is <aim>

    Examples:
      | choice | partner | brings | enemy | enemy_partner | aim |
      | Back John V | Venice | Venetian galleys | Andronikos IV | Genoa | Seat a pretender, from John V at your court |
      | Keep Andronikos IV | Genoa | Genoese galleys from Pera | John V | Venice | none, since the emperor on the throne is already yours |

  @TUT-038
  Scenario: The war screen explains the aim
    Given the player backed John V
    When the player opens the war screen of the war for John V's throne
    Then the war aim is Seat a pretender, from John V at your court
    And the war screen shows the aim and its cause
    And one linked line explains why this aim and not Take land

  @TUT-039
  Scenario: The partner's reasons
    When the player taps the partner "Venice"
    Then the partner's reasons open on the same screen used for the player's own alliances
    And "Share a rival" shows +15 toward "Byzantium" while both stand against "Genoa"
    And "Same faith" shows +10 toward "Genoa" but not toward "Byzantium"

  @TUT-040
  Scenario: The enemy partner's galleys close the Bosporus
    Given Genoese galleys from Pera hold the Bosporus
    Then the Bosporus crossing shows as closed with the banner of "Genoa" on it
    And the Dardanelles crossing at Gallipoli stays open

  @TUT-041
  Scenario: Chapter 0's Faith lens
    Given chapter 0 is played and the Food lens has been seen
    When the player switches to the Faith lens
    Then Rumelia shows Orthodox under a Sunni realm
    And provinces where a community is 30 % or more are hatched
    And the step reads "Most of your people in Rumelia are Orthodox Christians. You rule them as a Sunni bey."

  @TUT-042 @TUT-043 @TUT-044
  Scenario Outline: The Faith policy choice in chapter 4
    Given the Christian sipahis are called to ride for an emperor
    And the vizier opens the Faith policy screen at the Orthodox row, set to Restricted
    When the player chooses "<choice>"
    Then the Christian sipahis are "<loyalty>"
    And the faith tax <tax>
    And <lords>

    Examples:
      | choice | loyalty | tax | lords |
      | Keep it Restricted | Wavering | keeps paying for the war | the Christian sipahis do not bring their retinue when called |
      | Tolerate it | Loyal | ends | the Christian sipahis' riders come to Constantinople and Pious Sunni lords waver once |

  @TUT-045
  Scenario: Persecution is shown but dimmed
    When the Faith policy screen is open in the tutorial
    Then Persecute is dimmed
    And its note says it would give every Orthodox neighbour the Defend the faith aim and turn both emperors against you

  @TUT-046 @placeholder
  Scenario: Crossing at Gallipoli
    Given the Anatolian army of 20000 men must reach Thrace
    And the Bosporus is closed by the Genoese galleys
    When the player sends the army over the Dardanelles at Gallipoli
    Then the crossing takes 4 days

  @TUT-047
  Scenario: After the clash before Pera
    Given the battle at "Pera" has been fought
    Then the turn report shows the result together with the faith choice
    And it says how many Christian sipahis rode at Pera, or why they stayed home
    And it names what the Venetian partner brought
    When peace with Andronikos IV's side is signed
    Then the war for John V's throne ends
    And the Genoese partner leaves the war with it

  @TUT-048
  Scenario: Schools have a faith
    Given chapter 3 is played
    Then the madrasa in "Bursa" is Sunni
    When the step opens a Rumelian province's Faith line
    Then the Orthodox community shows as "served, Restricted, protected: no grievance"
    And its "Why?" links to the Almanac's religion page

  @TUT-049
  Scenario: The dead on both sides are counted the same way
    Given the battle at "Pera" has been fought
    Then the turn report counts the dead of both sides the same way
    And no step rewards harm
