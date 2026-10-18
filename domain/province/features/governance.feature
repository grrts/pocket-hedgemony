@context-province
Feature: Who holds and governs the province
  As the game
  I want owner, governance, occupation, years held, homelands and pretenders tracked per province
  So that tax, recruits, grievances and claims follow who rules the land

  @PROV-180
  Scenario Outline: A province changes owner
    Given the country "France" owns the province "Calais"
    When <cause>
    Then the country "<new>" owns the province "Calais"

    Examples:
      | cause                                                       | new      |
      | the country "England" conquers it and keeps it in the peace | England  |
      | the country "France" cedes it to "Burgundy" in a peace      | Burgundy |
      | its lord defects to "Burgundy" with his land                | Burgundy |

  @PROV-181 @PROV-182
  Scenario Outline: What governance gives
    Given the province "Troyes" is governed by <governor>
    When the game works out the province's stats
    Then it gives <tax> tax and <recruits>
    And it has <extra>

    Examples:
      | governor            | tax  | recruits                       | extra                          |
      | an official         | full | full recruits                  | the effect of his type         |
      | a lord              | half | recruits to the lord's retinue | the lord's officials running it |
      | no one              | half | half recruits                  | the "Ungoverned" grievance     |

  @PROV-181
  Scenario: A subject ruler governs a subject's province
    Given the province "Wallachia" belongs to a subject of the country "Hungary"
    When the game works out the province's stats
    Then the province "Wallachia" is governed by a subject ruler

  @PROV-183
  Scenario: A lord's line dies out
    Given the lord "Armagnac" holds the province "Armagnac" and has no heir
    When the lord dies
    Then the province "Armagnac" becomes royal
    And it needs an official

  @PROV-184
  Scenario Outline: Occupation
    Given the province "<province>" <castle>
    When the army of "England" <action>
    Then the province "<province>" is occupied by "England"
    And its tax, recruits, food and trade go to "England"

    Examples:
      | province | castle              | action                              |
      | Calais   | has a castle        | takes the castle                    |
      | Picardy  | has no castle       | holds the province for a season     |

  @PROV-184
  Scenario: Peace ends occupation
    Given the province "Calais" has been occupied by "England" for 7 months
    When peace is made and "Calais" stays French
    Then the province "Calais" is no longer occupied

  @PROV-185
  Scenario: Long holding shifts language and faith faster and fades Foreign rule
    Given the province "Brittany" has been held by "France" for 60 years
    When the game works out the province's stats
    Then its language and faith shift toward the ruler's faster than in its first years
    And "Foreign rule" there fades

  @PROV-186 @placeholder
  Scenario: A people becomes a homeland's people after 100 years
    # config: province.homeland.years
    Given the Castilians make up most of the province "Granada" for 100 years
    When the game works out the province's stats
    Then the province "Granada" is a homeland of the Castilians

  @PROV-186
  Scenario: A people gone for 100 years loses its homeland
    Given no Moors have lived in the province "Granada" for 100 years
    When the game works out the province's stats
    Then the province "Granada" is no longer a homeland of the Moors

  @PROV-187
  Scenario: Foreign rule over a homeland
    Given the province "Brittany" is the homeland of the Bretons
    And it is held by a ruler of the French language
    When the game works out the province's stats
    Then the province "Brittany" has the "Foreign rule" grievance
    And separatist events can start there

  @PROV-188 @placeholder
  Scenario Outline: Pretenders come and go
    # config: province.pretender.years
    Given the province "Calais" <setup>
    When the game works out the province's stats
    Then <result>

    Examples:
      | setup                                                                  | result                                         |
      | was lost by the king of "England" in war 49 years ago                  | the king of "England" is a pretender to it     |
      | was lost by the king of "England" in war 51 years ago                  | the king of "England" is no longer a pretender |
      | has a pretender who died without heirs                                 | that pretender is gone                         |
      | has a pretender who renounced it in a peace                            | that pretender is gone                         |
      | has a pretender who married into the ruling house of "France"          | that pretender is gone                         |
