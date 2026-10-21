# Institutions

Some realms belong to something bigger than themselves. At the 1378 start that is **the Empire**, whose Emperor is elected by seven seats and is only as strong as his hold over its members. **The Shogunate** in Japan works the same way: the shogun is only as strong as his hold over the great houses. Every number here is provisional and lives in `institutions.json`.

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
On 20 September 1378 the crown is held by **Charles IV** of the house of Luxembourg, King of Bohemia, aged 62. In history he dies on 29 November, in the tenth week, and his son **Wenceslaus**, aged 17 and already elected King of the Romans, follows him without an election. Wenceslaus's deposition (1400) and the reigns of Rupert, Jobst and Sigismund are events. The members are the realms whose capital lies in imperial land, from the Low Countries' fiefs, Lorraine and Savoy to Bohemia, Austria and the north German princes and cities. The hold starts at 35 (Weak); Wenceslaus's Empire is weak, and this first value may be set lower.

*In the game today* the member list in `institutions.json` is still the one of the 1444 checkpoint (18 members, with Austria and Frederick III holding the crown); the 1378 list replaces it.

**Imperial land** is every province the members held on the start day. It never changes: a province an outsider takes stays imperial land, held by an outsider, and the Emperor holds the war aim *Restore imperial land* on whoever holds it.

A member leaves when its capital is no longer in imperial land, when it becomes the subject of a realm outside the Empire, or when it is gone. The Emperor can ask a realm whose capital lies in imperial land to join; it answers by the reasons count.

### Seats and the election
Seven seats elect the Emperor: Cologne, Bohemia, the Palatinate, Saxe-Wittenberg and Brandenburg, held by those realms, and the **church seats** of Mainz and Trier, which vote for the candidate the Pope thinks best of. A realm holds at most one seat, but a house can hold two: in 1378 the Luxembourgs hold both Bohemia and Brandenburg. Meissen and Thuringia, the Wettins' land, have no seat yet; the Saxon seat passes to the Wettins (1423) and Brandenburg to the Hohenzollerns (1415) by event. When a seat's realm leaves or is gone, the seat stands **vacant** until the Emperor grants it to a member without one.

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

## The Shogunate

### The houses
Japan starts as the shogun's realm, with hold 30 (Weak). In 1378 the Southern Court still holds out against the Ashikaga shogun Yoshimitsu as a realm of its own, at war with him. Its fourteen **great houses** are its lords, each on its own land: Hosokawa, Hatakeyama, Shiba, Yamana, Ōuchi, Uesugi, Imagawa, Toki, Kyōgoku, Ōtomo, Shimazu, Takeda, Date and Nanbu. The rest is the shogun's own: Mie, where the Court sits in Kyoto, the three Nagasaki provinces and Ehime.

What the Shogunate's hold counts each year:

| | Hold |
|---|---:|
| No house in revolt | +3 |
| Each house in revolt | −5 |
| No adult heir | −10 |
| At war while over half the houses are Wavering or worse | −3 |
| Each house summoned to the capital | +1 |
| The closed country | +2 |
| Confirming a house's land | −5 |

Each season the houses read the hold: at Firm or Strong each grows a step more loyal, at Weak nothing happens, and at Hollow each grows a step less loyal.

### The shogun's actions
- **Summon a house** (while hold is Firm or better): its lord lives at the capital, his wealth falls by a tenth each year and he cannot join a rising. The summons ends when you release him or when hold falls below Firm.
- **Confirm a house's land**, once per house for each ruler: the house grows a step more loyal, for 5 hold.
- **Close the country** (from era III, while hold is Firm or better): foreign traders may trade only at the one port you name and foreign faiths send no preachers in. It ends when you open the ports or when the Perry Expedition forces them open.

### The break
At a season's end with hold 0, or as soon as the shogun loses Mie, the Shogunate **breaks**: each great house becomes its own warlord domain on its land, the shogun keeps only his own provinces, and the Ōnin War begins if it has not. The office of Shogun then stands vacant, and every warlord domain with its capital in Japan is a member.

A member that holds Mie and owns, or holds as subjects, over half of Japan's 32 provinces can **Ask the Court**: it becomes the Shogunate at no cost, with hold 40, and every other member is asked to **swear to the shogun**. One that swears becomes his great house with its land, Wavering; one that refuses stays a realm, and the shogun holds the war aim *Bring to heel* on it. If you are asked, an answer card waits a month; silence is a refusal.

What a member weighs before it swears:

| | Reasons |
|---|---:|
| Base (keeping its own realm) | −10 |
| Standing toward the shogun | a quarter of it |
| The shogun has more soldiers | +10 for each multiple, at most +30 |
| The shogun's hold | (hold − 50) ÷ 5 |

### The end
The Shogunate ends when the shogun's realm leaves the shogunate form, by reform to a constitutional monarchy or by a revolution.

## Where you find it
- **Your Diplomacy tab** has an Institutions row while you belong to one: "The Empire · Emperor: Bohemia · Hold 35 Weak · You: Elector". Tap it for the Empire card.
- **A member's country card** shows a badge, Emperor, Elector or Empire, that opens the Empire card.
- **The Empire card** has a header (the Emperor, the hold bar, your role) and four folds: **Election** (each seat and whom it would vote for today, the tally, Stand for the crown, a seat's reasons and Seek their vote), **Reforms** (the ladder with the passed reforms ticked, the next one's effect, its cost and today's forecast, *Call the Diet* for the Emperor, *Vote yes* and *Vote no* while the Diet sits, and *Take to court* once the Imperial Court has passed), **Members** (each member with its land, faith, seat and badges) and **Hold** (the year's gains and losses).
- **The Shogunate card** has a header (the shogun, the hold bar, your role) and three folds: **Houses** (each great house with its lord, land, loyalty and *Summon* or *Confirm*, or each member realm while the office is vacant), **The Court** (who holds Mie, *Ask the Court* when you qualify, *Close the country* or *Open the ports*) and **Hold**. While hold is Weak or lower it warns: "At hold 0 the houses break away".
- **News** carries the call to defend a member, the election's vote, a sitting Diet, a court ruling against you and a request to swear to the shogun as answer cards.
- **The peace sheet** offers *Dissolve the Empire* when you are at war with the Emperor, not a member, and it is era IV or later.
- **The Institutions map mode** colours the Emperor and the shogun gold and the members light gold, marks the seats, hatches imperial land held by outsiders, and draws Japan by house while it is whole.
- On a phone the card is a side sheet in the Wide layout and a bottom sheet in the Tall layout; every row and button is a full 44-point tap.

## Numbers

Every value the game uses, made from its config so it always matches the game: [Institutions data](Data-Institutions). How they combine: [Formulas](Formulas).
