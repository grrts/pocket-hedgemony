# Institutions

Some realms belong to something bigger than themselves. In 1444 that is **the Empire**, whose Emperor is elected by seven seats and is only as strong as his hold over its members. The Shogunate in Japan works the same way and comes in a later build. Every number here is provisional and lives in `institutions.json`.

## Hold

An institution's office is worth its **hold**, 0 to 100, named by a word: **Hollow** (0 to 19), **Weak** (20 to 49), **Firm** (50 to 79) and **Strong** (80 to 100). Some things move it at once (answering a call to defend a member); the rest is added up each January, and the Hold fold shows each gain and loss with its cause.

What the Empire's hold counts each year:

| | Hold |
|---|---:|
| No war between members and no imperial land held by outsiders | +2 |
| Each war between two members | −3 |
| Each imperial province an outsider holds | −2 (at most −10) |
| Each member that left | −5 |
| Each member whose faith is not the Emperor's (halved after the Peace of Augsburg, none after Westphalia) | −1 |
| Defending a member when called | +10 |
| Refusing, or not answering, a call to defend a member | −15 |

## The Empire

### Members and imperial land
The Empire starts with 18 members: Austria, Bavaria, Bohemia, Brandenburg, Cologne, Hamburg, Hesse, Lorraine, Lüneburg, Mecklenburg, the Palatinate, Pomerania, Saxony, Württemberg and Switzerland, with Milan, Savoy and Modena for imperial Italy. Austria holds the crown, with hold 35 (Weak).

**Imperial land** is every province the members held on 1 January 1444. It never changes: a province an outsider takes stays imperial land, held by an outsider, and the Emperor holds the war aim *Restore imperial land* on whoever holds it.

A member leaves when its capital is no longer in imperial land, when it becomes the subject of a realm outside the Empire, or when it is gone. The Emperor can ask a realm whose capital lies in imperial land to join; it answers by the reasons count.

### Seats and the election
Seven seats elect the Emperor: Cologne, Bohemia, the Palatinate, Saxony and Brandenburg, held by those realms, and the **church seats** of Mainz and Trier, which vote for the candidate the Pope thinks best of. A realm holds at most one seat. When a seat's realm leaves or is gone, the seat stands **vacant** until the Emperor grants it to a member without one.

The seats elect a new Emperor when the Emperor dies or his realm leaves the Empire. The election sits for a month. The candidates are the sitting house, the three members with the most soldiers and every member whose ruler stands for the crown, all of the Catholic faith until the Peace of Westphalia. Each seat votes for the candidate it rates highest:

| Reason | |
|---|---:|
| Standing toward the candidate | ÷ 4 |
| Same faith | +10 |
| The sitting house | +15 |
| A strong crown: the candidate has more soldiers | +5 for each multiple, at most +20 |
| Sought our vote | +15, fading over 10 years |
| At war with the candidate | −50 |

Most votes win; a tie goes to the sitting house, then to the candidate with more soldiers. If you hold a seat, you cast its vote yourself while the election sits; if you say nothing, your seat votes by its reasons.

**Seek their vote** sends an envoy with a 30-gold gift to an elector's court. When he arrives, the elector holds the tie *Sought our vote* toward you.

### The Emperor
- **Defend the Empire.** When a realm outside the Empire declares war on a member, or holds a member's imperial land in a war, the Emperor is called to defend it. Answering gives +10 hold. Refusing, or saying nothing for a month, costs 15 hold, and the attacked member and every elector hold the wrong *Left us to our fate* toward him.
- **Dues.** Each month the Emperor receives 1 gold per member times hold ÷ 100, on the Tribute line of the treasury.
- He grants vacant seats and asks realms to join.
- He is bound by every reform like any member.

### The Diet and the reforms
While hold is 50 or more, the Emperor may call the **Diet**, at most once every five years, on the next reform of the ladder. The reforms pass in order:

| Reform | What it does |
|---|---|
| Public Peace | A member that declares war on another member is a **Breaker of the Peace**: for ten years the Emperor and every member hold a war aim on it, and the Emperor is called to defend its victim. |
| Imperial Court | A member with a war aim on another member's province may take it to court instead of to war. The court rules by the aim, both sides' standing toward the Emperor and the hold. A ruling for the plaintiff moves the province with no war; refusing it makes the refuser a Breaker of the Peace. Saying nothing for a month hands it over. |
| Circles | When an outsider attacks a member, every member of its circle joins the defence. The circles: Austrian, Bavarian, Swabian, Upper Rhenish, Electoral Rhenish, Lower Saxon and Upper Saxon. |
| Common Tax | Every member pays 5 in 100 of its tax to the Emperor each month, in place of the dues. |
| Imperial Army | When the Emperor answers a call to defend the Empire, he raises a contingent of a tenth of every member's soldiers at his capital for the war; it goes home with the peace. |
| Hereditary Crown | The Emperor's heir takes the crown; no more elections. |
| One Realm | Needs hold 80. Every other member's ruler becomes a great lord of the Emperor with his land, Wavering, and the Empire becomes one realm. |

The Diet sits for a month. Every member votes yes or no by its reasons; an elector's vote counts twice, and over half the votes pass it. Passing spends 30 hold and failing 10. If you are a member you vote on an answer card; saying nothing counts as no.

| A member's reason to vote yes | |
|---|---:|
| The reform itself | Public Peace +10, Imperial Court and Circles +5, Common Tax and Imperial Army −10, Hereditary Crown −25, One Realm −40 |
| The Empire's hold | ÷ 10 |
| Standing toward the Emperor | ÷ 4 |
| Same faith as the Emperor | +10 |
| An outsider holds imperial land next to us | +15 |
| Small beside the Emperor (or strong beside him) | +5 (or −5) for each multiple, at most 20 |

### Faith and the end
- After the **Peace of Westphalia** an eighth seat goes to the largest member without one, and a member's faith no longer costs hold.
- The Empire is **dissolved** when its hold has stood at 0 for five years in a row, or when a realm outside it that beat the Emperor in a war takes the peace term **Dissolve the Empire** (from era IV). Every member is then a free realm and every imperial war aim ends.

## Where you find it
- **Your Diplomacy tab** has an Institutions row while you belong to one: "The Empire · Emperor: Austria · Hold 35 Weak · You: Elector". Tap it for the Empire card.
- **A member's country card** shows a badge, Emperor, Elector or Empire, that opens the Empire card.
- **The Empire card** has a header (the Emperor, the hold bar, your role) and four folds: **Election** (each seat and whom it would vote for today, the tally, Stand for the crown, a seat's reasons and Seek their vote), **Reforms** (the ladder with the passed reforms ticked, the next one's effect, its cost and today's forecast, *Call the Diet* for the Emperor, *Vote yes* and *Vote no* while the Diet sits, and *Take to court* once the Imperial Court has passed), **Members** (each member with its land, faith, seat and badges) and **Hold** (the year's gains and losses).
- **News** carries the call to defend a member, the election's vote, a sitting Diet and a court ruling against you as answer cards.
- **The peace sheet** offers *Dissolve the Empire* when you are at war with the Emperor, not a member, and it is era IV or later.
- **The Institutions map mode** colours the Emperor gold and the members light gold, marks the seats and hatches imperial land held by outsiders.
- On a phone the card is a side sheet in the Wide layout and a bottom sheet in the Tall layout; every row and button is a full 44-point tap.
