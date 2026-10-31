@context-events
Feature: Everyday events
  As a player
  I want small choices about my officials, lords, family, stores and provinces every few months
  So that the realm feels alive between the great events of history

  @EVT-115 @EVT-116
  Scenario: A choice comes every few months
    Given France is played from 11 November 1444
    When five years pass and each everyday event is answered at once
    Then France has had between 12 and 31 everyday events
    And no AI realm has an everyday event waiting

  @EVT-117
  Scenario: No new everyday event while one waits
    Given France is played and an everyday event waits for its answer
    When three years pass without an answer
    Then only that one everyday event waits

  @EVT-122
  Scenario: A seasoned man keeps the post's years
    Given France's official at a royal province has died
    When France sends for a seasoned man
    Then France pays 25 gold
    And the post keeps the years its official had served

  @EVT-122
  Scenario: The deputy starts afresh
    Given France's official at a royal province has died
    When France raises his deputy
    Then the post's years start again from today

  @EVT-120
  Scenario: An option the realm cannot pay is not offered
    Given France holds 5 gold
    And France's official at a royal province has died
    Then the card does not offer to send for a seasoned man

  @EVT-126
  Scenario: Spoiled grain is lost at once and buying grain makes half of it good
    Given grain has rotted in a store of France's
    Then the card says how many months of grain were lost whatever France chooses
    When France buys grain from merchants
    Then half of the lost grain is back in the store

  @EVT-123
  Scenario: The crown takes a dead lord's lands
    Given a lord of France has died and his heir has taken his lands
    When France takes his lands for the crown
    Then his provinces are royal land
    And the other lords of France fear for their own

  @EVT-123
  Scenario: The heir follows his father
    Given a lord of France has died and his heir has taken his lands
    When France confirms the heir
    Then the heir holds the lands under his own name

  @EVT-123
  Scenario: A line that dies out brings no card
    Given a lord of France with no heir and no kinsman has died
    Then no everyday event waits for France
    And his provinces are royal land

  @EVT-132
  Scenario: A general's second keeps his men in the field
    Given a general of France has died while his army stands in a lord's land
    Then his men march for crown land without him
    And a card names his second in command and his skills
    When France gives the second the command
    Then the second leads the army where it stands and it takes orders again

  @EVT-132
  Scenario: The second is not offered once the men have a leader
    Given a general of France has died
    When another general takes up his men before France answers
    Then the card offers only to let them go home

  @EVT-132
  Scenario: An admiral's flag captain keeps the fleet at sea
    Given an admiral of Venice has died at sea
    When Venice gives his flag captain the fleet
    Then the fleet stops sailing for port under its new admiral

  @EVT-131
  Scenario: A death while an everyday event waits brings no second card
    Given an everyday event waits for France
    When one of France's officials dies
    Then only that one everyday event waits

  @EVT-124
  Scenario: A child born to an heirless ruler is the heir
    Given France's ruler is 30 and has no heir
    When a child is born to him and France gives thanks quietly
    Then the child is France's heir

  @EVT-128
  Scenario: The waiting event is kept in the save
    Given two of France's lords quarrel and the event waits for France
    When the game is saved and loaded
    Then the same event waits for France

  @EVT-133 @placeholder
  Scenario Outline: An event comes only to realms of its region and era
    Given <realm> is played in <year>
    Then the everyday event "<event>" <can> come to <realm>

    Examples:
      | realm  | year | event         | can    |
      | France | 1444 | tournament    | can    |
      | France | 1444 | railway       | cannot |
      | France | 1850 | railway       | can    |
      | France | 1850 | tournament    | cannot |
      | France | 1444 | monsoon_fails | cannot |
      | Delhi  | 1444 | monsoon_fails | can    |

  @EVT-134 @placeholder
  Scenario: The same event never comes twice in 20 years
    Given France is played from 11 November 1444
    When twenty years pass and each everyday event is answered at once
    Then no drawn everyday event came to France twice
    And when each came is kept in the save

  @EVT-135
  Scenario: A rich harvest fills the store
    Given a rich harvest at one of France's provinces waits for France
    When France fills the granaries
    Then the province's store holds 2 more months of food for its people
