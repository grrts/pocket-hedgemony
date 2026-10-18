@context-province
Feature: Other people stats
  As a player
  I want people, refugees, faith and language counted per province
  So that the country sums and the province card can show them

  @PROV-130 @PROV-131
  Scenario: People are the sum of the classes; town and country are shown, not stored
    Given the province "Troyes" has farmers 48,000, herders 6,000, woodsmen 4,500, seafolk 3,000, craftsmen 4,500, others 2,400 and homeless 3,600
    When the game works out the province's stats
    Then the province "Troyes" has 72,000 people
    And its townsfolk are worked out from the town classes, not stored
    And its town size is read from its townsfolk
    And its townsfolk grow no food

  @PROV-132 @placeholder
  Scenario: Refugees settle after two years
    # config: province.refugees.settle_years
    Given the province "Sens" shelters 2,000 refugees from "Troyes"
    And "Troyes" stays unsafe
    When 2 years pass
    Then the refugees join the classes of "Sens" by overflow
    And any who find no slot become homeless

  @PROV-132
  Scenario: Refugees go home when it is safe
    Given the province "Sens" shelters 2,000 refugees from "Troyes"
    When "Troyes" becomes safe
    Then the refugees go home to "Troyes"

  @PROV-133
  Scenario: Fleeing scholars keep their class if a slot is free
    Given scholars flee war into the province "Florence"
    And "Florence" has a free scholar slot in its school
    When the game works out the province's stats
    Then the scholars who fill it stay scholars

  @PROV-134
  Scenario: The country's Faith is the people-weighted sum of the provinces
    Given the country "France" has the province "Troyes" with 72,000 people, 100 % Catholic
    And the province "Calais" with 28,000 people, 50 % Catholic
    And the country "France" is Catholic
    When the game works out the province's stats
    Then the country's Faith is 86 %

  @PROV-134
  Scenario: Only the top three faiths and languages are stored
    Given the province "Troyes" has languages French 94 % and Flemish 6 %
    When the game works out the province's stats
    Then the province stores at most three languages and three faiths

  @PROV-135
  Scenario: Persecuted people take their faith and crafts away
    Given the province "Seville" persecutes a minority faith
    When people of that faith flee
    Then the faith mix of "Seville" loses their share
    And their crafts leave with them
