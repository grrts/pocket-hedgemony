@context-diplomacy
Feature: Claims and forging them
  As a ruler
  I want to hold and forge claims on my neighbours' provinces
  So that my wars are fought for a reason the world understands

  # Leroy (F-30): "War is declared without a casus belli: is that planned later?"
  # Config: diplomacy.claims

  @DIPL-256 @placeholder
  Scenario: A forged claim gives Take land
    Given the country "France" holds a claim on "Champagne", a province of "Burgundy"
    Then France holds the aim "Take land" on Champagne because of "our claim"
    And Burgundy holds the wrong "Holds a claim on our land or throne" toward France
    When 20 years pass
    Then France holds no claim on Champagne

  @DIPL-256
  Scenario: The claim follows the province
    Given the country "France" holds a claim on "Champagne", a province of "Burgundy"
    When "Champagne" passes to "Lorraine"
    Then France holds the aim "Take land" on Champagne against Lorraine
    When "Champagne" passes to France
    Then France holds no claim on Champagne

  @DIPL-257 @DIPL-258 @placeholder
  Scenario: Forging a claim
    Given the country "France" has a free envoy and 25 gold
    And "Champagne" of "Burgundy" borders France
    When France sends an envoy to forge a claim on Champagne
    Then France pays 25 gold
    And the envoy stays at Burgundy's court holding his seat
    When 12 months pass
    Then France holds a claim on Champagne
    And the envoy comes home

  @DIPL-257
  Scenario Outline: What stops a forging
    Given the country "France" <state>
    When France tries to forge a claim on "Champagne" of "Burgundy"
    Then it is refused because "<why>"

    Examples:
      | state                                    | why                                 |
      | is at war with Burgundy                  | you are at war with them            |
      | has no free envoy                        | no free envoy: every seat is taken  |
      | does not border Champagne                | it does not border your land        |
      | already holds Take land on Champagne     | you already hold a claim on it      |
      | is forging a claim at Burgundy's court   | your envoy is there already         |

  @DIPL-259 @placeholder
  Scenario: Found out but the work goes on
    Given France's envoy forges a claim on "Champagne" of "Burgundy"
    When Burgundy finds him out at a season's end
    Then Burgundy holds the wrong "Forged a claim on us" toward France
    And the envoy stays at work

  @DIPL-258
  Scenario: A war ends the forging
    Given France's envoy forges a claim on "Champagne" of "Burgundy"
    When France and Burgundy go to war
    Then the envoy comes home and no claim is made

  @DIPL-260
  Scenario: The AI forges on its rivals
    Given the AI country "Milan" holds "Venice" as Rival, borders it and holds no aim on it
    And Milan has a free envoy
    When a season ends
    Then Milan forges a claim on Venice's border province with the most people

  @DIPL-261
  Scenario: Picking the aim
    Given the player's realm "France" holds "Take land" on "Champagne" and "Punish" against "Burgundy"
    When the player picks "Punish" on the declare sheet and confirms
    Then France's war on Burgundy has the aim "Punish"

  @DIPL-262 @DIPL-263 @DIPL-264
  Scenario: The Claims section
    Given the player's realm "France" borders "Burgundy"
    When the player opens Burgundy's Diplomacy tab
    Then a section "Claims" lists "Your claims on them" and a "Forge a claim on" button for each Burgundian province on France's border
    And each button is at least 44 points tall
    And the player's own Diplomacy tab lists "Your claims"
