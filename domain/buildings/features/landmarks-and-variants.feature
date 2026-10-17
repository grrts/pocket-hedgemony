@context-buildings
Feature: Landmarks and regional variants
  As a player
  I want real, named buildings with one effect of their own and buildings that look like their region
  So that the map feels like history

  @BLD-124 @BLD-127
  Scenario Outline: Landmark effects
    Given the landmark "<landmark>" stands in "<province>"
    When the building rules are applied
    Then it is a "<type>"
    And its own effect is "<effect>"

    Examples:
      | landmark               | province       | type                       | effect                                                       |
      | Hagia Sophia           | Constantinople | house of worship, step 3   | its faith's houses of worship in reach of the capital turn the faith mix twice as fast |
      | Forbidden City         | Beijing        | palace, step 3             | +24 officials; lords at court never waver                    |
      | Alhambra               | Granada        | palace, step 3             | Granada's castle counts one step higher                      |
      | Great Mosque of Djenné | Djenné         | house of worship, step 3   | no grievance from earth upkeep; traders passing +20 % in the replastering season |
      | Sankore Mosque         | Timbuktu       | school, step 3             | scholars from any Muslim realm may settle here               |
      | Masjid al-Haram        | Mecca          | pilgrimage shrine, step 1  | the largest pilgrims passing in the world                    |
      | Topkapı Palace         | Constantinople | palace, step 3             | +20 officials; the capital's seat runs two provinces         |
      | Ulugh Beg Observatory  | Samarkand      | observatory, step 1        | Boats and Counting inventions 20 % cheaper for its owner     |
      | Kremlin                | Moscow         | castle, step 3             | the palace and the castle share one tile                     |
      | Templo Mayor           | Tenochtitlan   | house of worship, step 3   | Triple Alliance lords gain loyalty when the realm wins a war |
      | Coricancha             | Cusco          | house of worship, step 3   | every province linked to Cusco by road counts one day closer |
      | Venetian Arsenal       | Venice         | shipyard, step 3           | 3 slipways                                                   |
      | Taj Mahal              | Agra           | landmark tomb              | traders passing in Agra +30 %                                |

  @BLD-125
  Scenario Outline: Landmarks are never built from the build sheet
    Given the date is <date>
    When the building rules are applied
    Then the landmark "<landmark>" is <state>

    Examples:
      | date         | landmark            | state                                     |
      | 11 Nov 1444  | Hagia Sophia        | on the map                                |
      | 11 Nov 1444  | St Peter's Basilica | not on the map; founded by event in 1506 if its requirements hold |
      | 11 Nov 1444  | Topkapı Palace      | not on the map; founded by event in 1459 if its requirements hold |
      | 11 Nov 1444  | Taj Mahal           | not on the map; founded by event in 1632 if its requirements hold |

  @BLD-125
  Scenario: St Peter's asks for gifts while being built
    Given the event founding "St Peter's Basilica" has fired in "Rome"
    And it is being built
    When the building rules are applied
    Then realms of its faith can be asked for gifts toward it

  @BLD-125
  Scenario: Angkor starts neglected
    Given the landmark "Angkor" stands neglected in 1444
    When its owner pays its upkeep
    Then it can be brought back to sound
    And restoring it is a decision with its own event

  @BLD-126
  Scenario: Only real landmarks
    Given an event founds a landmark in an alternate history
    When the building rules are applied
    Then the landmark is a real building that stood or was built between 1444 and 1939
    And it may stand in another realm or never be built

  @BLD-128
  Scenario: Landmarks at world zoom
    Given the buildings config of the design
    When the map is at world zoom
    Then only landmarks show, as a small icon on their province

  @BLD-129
  Scenario Outline: One building, many names
    Given a "<building>" stands in a province of region and faith "<region>"
    When the building rules are applied
    Then it is named "<name>" with that region's sprite
    And its effect is the same as everywhere

    Examples:
      | building         | region            | name         |
      | house of worship | Catholic Europe   | church       |
      | house of worship | Sunni Maghreb     | mosque       |
      | market           | Ottoman lands     | bazaar       |
      | market           | Mexico            | tianguis     |
      | caravanserai     | Andes             | tambo        |
      | castle           | Sahel             | tata         |
      | palace           | steppe            | ordu         |
      | granary          | Andes             | qollqa       |

  @BLD-130
  Scenario Outline: Unique variants are stored in the buildings data
    Given the buildings config of the design
    When the building rules are applied
    Then the variant "<variant>" for "<who>" is stored in the buildings data, changing "<change>"

    Examples:
      | variant             | who                       | change                                                     |
      | Külliye             | Ottoman                   | a great mosque that holds an almshouse, a school and a hospital in one slot |
      | Kontor              | Hanseatic towns           | a warehouse abroad in a foreign town by treaty             |
      | Qollqa line         | Inca                      | granaries along roads without a castle                     |
      | Polder mill         | Low Countries             | dykes drain one marsh tile every 5 years by themselves     |
      | Ever-normal granary | Ming, Korea               | granaries in towns as well as castles                      |
      | Funduq quarter      | Mamluk and Maghrebi ports | foreign traders passing pay market fees here               |
