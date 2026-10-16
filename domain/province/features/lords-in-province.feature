@context-province
Feature: Lords in the province
  As the game
  I want lords to hold land, keep their own officials and build in their provinces
  So that a lord is a real holder of land and not just a name

  @PROV-200 @PROV-201
  Scenario Outline: A lord who loses his last province stops being a lord
    Given the lord "Philip of Burgundy" holds only the province "Dijon"
    When <cause>
    Then he is no longer a lord
    And he <fate>

    Examples:
      | cause                                         | fate                                           |
      | the country "France" seizes "Dijon" by force  | flees abroad and becomes a pretender to "Dijon" |
      | an enemy conquers "Dijon"                     | stays at court as a courtier                   |
      | he gives "Dijon" away                         | stays at court as a courtier                   |

  @PROV-201
  Scenario: A courtier can be granted land again
    Given "Philip of Burgundy" is a courtier at the court of "France"
    When the country "France" grants him the province "Nevers"
    Then he is a lord again

  @PROV-202 @PROV-203
  Scenario: A lord's officials run his provinces
    Given the lord "Philip of Burgundy" holds "Dijon" and "Beaune"
    And he has one "steward" official of his own in "Dijon"
    When the game works out the province's stats
    Then "Dijon" gets the steward's effect
    And "Beaune" pays him half and has the "Ungoverned" grievance

  @PROV-204
  Scenario: Lending an official to a lord
    Given the country "France" has a free "judge" official
    When the country "France" lends the judge to the lord "Philip of Burgundy"
    Then the country "France" keeps paying the judge's wage
    And the lord's loyalty goes up
    And the judge works for the lord until called back

  @PROV-205
  Scenario Outline: Lords build by their traits
    Given a lord with the trait "<trait>" has wealth to spend
    When he builds in his own provinces
    Then he favours <buildings>

    Examples:
      | trait   | buildings                    |
      | Builder | the most buildings of any lord |
      | Greedy  | markets and mines            |
      | Pious   | houses of worship            |
      | Warlike | castles                      |

  @PROV-206
  Scenario Outline: Paying for a building in a lord's land
    Given the lord "Philip of Burgundy" is "<loyalty>"
    When the country "France" pays for a market in "Dijon"
    Then the market belongs to the lord
    And his loyalty becomes "<after>"

    Examples:
      | loyalty   | after     |
      | Disloyal  | Wavering  |
      | Wavering  | Loyal     |
      | In revolt | In revolt |

  @PROV-207
  Scenario: Land comes back with its buildings
    Given the lord "Armagnac" owns a market and a castle in "Armagnac"
    When his land comes back to the country "France"
    Then the market and the castle belong to the country "France"
