Feature: Stability, read from lords, subjects, officials and provinces
  Stability is not a stored number. The realm reads four pillars, lords,
  subjects, officials and provinces, each Steady, Uneasy, Troubled or
  Crumbling, and stands as steady as its weakest pillar (F-75).

  @REALM-199
  Scenario: The realm stands at its weakest pillar
    Given the game starts with the country "France"
    Then the stability of "France" reads the pillars lords, subjects, officials, provinces and treasury
    And the stability of "France" is the step of its weakest pillar

  @REALM-200
  Scenario: Lords turning away shake the realm
    Given the game starts with the country "France"
    And every lord of "France" is "Loyal"
    Then the lords pillar of "France" is "Steady"
    When a lord of "France" turns "Disloyal"
    Then the lords pillar of "France" is "Troubled"
    And the stability of "France" is "Troubled"
    When a lord of "France" turns "In revolt"
    Then the stability of "France" is "Crumbling"

  @REALM-200
  Scenario: A subject's loyalty counts from its 1444 standing
    Given the game starts with the country "France"
    Then each subject of "France" counts in the subjects pillar with its starting loyalty

  @REALM-201 @placeholder
  Scenario: Royal provinces whose official's post stands empty
    # config: stability.empty_posts_share
    Given the game starts with the country "France"
    And every royal province of "France" has its official at his post
    Then the officials pillar of "France" is "Steady"
    When "France" commissions the official of "Yvelines"
    Then the officials pillar of "France" counts 1 empty post and is "Uneasy"

  @REALM-202 @placeholder
  Scenario: Rioting and plotting provinces
    # config: stability.restless_share
    Given the game starts with the country "France"
    Then the provinces pillar of "France" is "Steady"

  @REALM-203
  Scenario: The stability plaque in the top bar
    Given the player rules "France"
    Then the top bar shows a stability plaque with the step in words
    When the player taps the stability plaque
    Then the General tab of the country card opens on the Stability section

  @REALM-204
  Scenario: The pillars on the General tab
    Given the player rules "France"
    When the player opens the General tab of the country card
    Then it shows the stability step, what it means and one row for each pillar with its counts and step
    And tapping a pillar opens the Lords, Diplomacy, Officials, Provinces or Treasury tab

  @REALM-205
  Scenario: A tidy top bar
    Given the player rules "France"
    Then the top bar shows the realm, the date, gold, stability, research, the war plaque while at war and the News button
    And every plaque has the same height and type

  @REALM-299 @placeholder
  Scenario Outline: Low stability costs tax, recruits and risings
    # config: realm.stability.effects
    Given a realm that reads <step>
    Then its provinces send the crown <share> of their tax and recruit refill
    And its plotting provinces rise <rising> times as often

    Examples:
      | step      | share | rising |
      | Steady    | 1     | 1      |
      | Uneasy    | 1     | 1      |
      | Troubled  | 0.9   | 1.5    |
      | Crumbling | 0.75  | 2      |

  @REALM-298 @placeholder
  Scenario: A default troubles the realm
    # config: realm.debt.default.troubled_years (2)
    Given a realm that defaulted on its debts last year
    Then its treasury pillar reads Troubled
    And two years after the default it reads Steady again
