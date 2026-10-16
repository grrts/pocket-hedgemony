@context-culture
Feature: How culture moves through the centuries
  As the game
  I want events and engine-raised checks to move tongues, change courts, split and merge tongues and read nationalism
  So that history's big changes in culture come from the people, not a script

  @CULT-067 @placeholder
  Scenario: The Oromo migrations spread a family
    # config key: family_default_by_region
    Given the event "oromo_migrations" spreads the family "cushitic" into the Ethiopian highlands
    When the event applies its spread
    Then the tongue "Oromo" rises in each province of the Ethiopian highlands

  @CULT-067
  Scenario: Spread raises the leading tongue of the family
    Given the province "Valencia" has the latin tongues "Catalan" 60 % and "Castilian" 10 %
    When an event spreads the family "latin" into "Valencia"
    Then the share of "Catalan" rises in "Valencia"

  @CULT-068 @CULT-069 @placeholder
  Scenario: The court goes native
    # config key: engine_events.court_goes_native
    Given the country "Qing" has the court tongue "Manchu"
    And "Manchu" has been under 20 % of the people of "Qing" for 50 years
    And "Han" is over half of the people of "Qing"
    When the 5-yearly culture checks run
    Then the event "The court goes native" is raised for "Qing" with the choices "Take their tongue" and "Keep ours"

  @CULT-070
  Scenario: Take their tongue
    Given the event "The court goes native" is raised for "Qing" with the majority tongue "Han"
    When "Qing" chooses "Take their tongue"
    Then the court tongue of "Qing" is "Han"
    And lords of the tongue "Manchu" waver a step
    And the "Manchu" people become strangers to "Qing"

  @CULT-071 @placeholder
  Scenario: Keep ours
    Given the event "The court goes native" is raised for "Qing" in 1700
    When "Qing" chooses "Keep ours"
    Then nothing changes
    And the check for "Qing" runs again in 1725

  @CULT-069
  Scenario: No check while the court tongue is large enough
    Given the country "France" has the court tongue "French" at 72 % of its people
    When the 5-yearly culture checks run
    Then the event "The court goes native" is not raised for "France"

  @CULT-072 @placeholder @open-question
  Scenario Outline: New tongues abroad
    # OQ-CULT-10: "region" and sea separation are not defined
    # config key: engine_events.new_tongue_abroad
    Given settlers of the tongue "<tongue>" have been the majority for 100 years in "<region>", separated by sea from the court of "<court>"
    When the 5-yearly culture checks run
    Then the tongue "<tongue>" in "<region>" becomes "<new>" of the family "creole_atlantic"
    And "<new>" people are cousins to "<court>" and get no "Foreign rule" at once

    Examples:
      | tongue     | region      | court    | new           |
      | Castilian  | New Spain   | Castile  | Criollo       |
      | Portuguese | Brazil      | Portugal | Brazilian     |
      | English    | New England | England  | Anglo-American |
      | Dutch      | the Cape    | Holland  | Afrikaans     |

  @CULT-073 @open-question
  Scenario: Nationalism is read from the event tree
    # OQ-CULT-4: per province or per tongue
    Given the event tree sets nationalism support 0.3 in the province "Naples"
    When the culture rules read nationalism for "Naples"
    Then they use 0.3
    And the culture system never changes the nationalism support of "Naples"

  @CULT-074 @placeholder
  Scenario: Nationalism 0.3 for cousins of the court
    Given the country "Piedmont" has the court tongue "Tuscan"
    And the province "Naples" is the homeland of "Neapolitan" with nationalism 0.3
    Then the "Neapolitan" people of "Naples" count as strangers to "Piedmont"
    And "Naples" has the grievance "Foreign rule" if held by "Piedmont"
    And drift toward "Tuscan" in "Naples" is multiplied by 0.25
    And the war aim "Free a people" opens for "Naples"

  @CULT-075
  Scenario: A released country
    Given the province "Rennes" has nationalism 0.5 and a homeland rising that wins
    When the Breton people are released as a country
    Then the new country takes the catalogue's record for the Breton people
    And if no record fits, a generated one is used

  @CULT-076
  Scenario Outline: Merging tongues by event
    When the event "<event>" runs merge_tongues
    Then the tongues <from> merge into "<into>"

    Examples:
      | event               | from                                | into    |
      | italian_unification | "Tuscan", "Lombard" and "Neapolitan" | Italian |
      | german_unification  | "High German" and "Low German"      | German  |

  @CULT-077 @open-question
  Scenario: Merging without an event
    # OQ-CULT-2: which forms count as a nation state
    Given the country "Italy" is a nation state with the Tongue policy "Impose" for 50 years
    And its cousin tongues "Tuscan" and "Lombard" have the merges_into entry "Italian"
    When the 5-yearly culture checks run
    Then "Tuscan" and "Lombard" merge into "Italian"

  @CULT-078 @CULT-079 @CULT-010
  Scenario Outline: New event verbs
    When an event applies "<verb>" with <params>
    Then <result>

    Examples:
      | verb             | params                                      | result                                                                 |
      | tongue_spread    | id Castilian, where Mexico and an amount      | the tongue "Castilian" rises in Mexico                                 |
      | set_court_tongue | on Bolivia, id Criollo                      | the court tongue of "Bolivia" is "Criollo"                             |
      | merge_tongues    | ids Tuscan and Lombard, into Italian, where Italy | the two tongues become "Italian" in Italy                        |
      | move_people      | tongue Cherokee, from Georgia, to Oklahoma and an amount | Cherokee people leave Georgia as refugees and settle in Oklahoma |

  @CULT-078
  Scenario Outline: New event triggers
    Given the country "France" has the court tongue "French"
    And the province "Toulouse" is 70 % Occitan
    Then the trigger <trigger> is true

    Examples:
      | trigger                                    |
      | court_tongue of France is French           |
      | tongue_share of Occitan in Toulouse is 0.7 |
      | cousin_of France for Occitan               |
      | stranger_to France for Breton              |
      | kin_of France for French                   |
