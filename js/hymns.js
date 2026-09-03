/* =====================================================================
   hymns.js — the hymn library. Every tune here is in the public domain.
   Melodies are written in ABC notation (see README for how to add one).
   Keys are guitar-friendly; `hymnalKey` says where most hymnals print it.
   Exposes window.HG.Hymns
   ===================================================================== */
(function () {
  'use strict';
  window.HG = window.HG || {};

  const list = [
    {
      id: 'amazing-grace',
      title: 'Amazing Grace',
      tune: 'New Britain',
      credit: 'Words: John Newton, 1779 · Tune: American folk melody, 1829',
      tags: ['classic', 'first hymn', '3/4'],
      level: 1,
      hymnalKey: 'G',
      defaultKey: 'G',
      about: 'The perfect first fingerpicking hymn. The melody uses only five notes (a pentatonic scale), it sits on the open strings in G, and the waltz feel (bass–pluck–pluck) teaches your thumb and fingers to take turns.',
      abc: `X:1
T:Amazing Grace
M:3/4
L:1/4
Q:1/4=72
K:G
"G"D | "G"G2 B/2 G/2 | B2 A | "C"G2 E | "G"D2 D |
w: A- ma- zing_ grace how sweet the sound that
"G"G2 B/2 G/2 | "G"B2 "D"A | "D"d3- | "D7"d2 d |
w: saved a_ wretch like me! I
"G"B2 d/2 B/2 | B2 A | "C"G2 E | "G"D2 D |
w: once was_ lost but now am found, was
"G"G2 B/2 G/2 | "G"B2 "D7"A | "G"G3- | G3 |]
w: blind but_ now I see.`,
      verses: [
        'Amazing grace! how sweet the sound, that saved a wretch like me! I once was lost, but now am found, was blind, but now I see.',
        "'Twas grace that taught my heart to fear, and grace my fears relieved; how precious did that grace appear the hour I first believed!",
        'Through many dangers, toils and snares, I have already come; ’tis grace hath brought me safe thus far, and grace will lead me home.',
        'When we’ve been there ten thousand years, bright shining as the sun, we’ve no less days to sing God’s praise than when we’d first begun.'
      ]
    },
    {
      id: 'joyful-joyful',
      title: 'Joyful, Joyful, We Adore Thee',
      tune: 'Hymn to Joy',
      credit: 'Words: Henry van Dyke, 1907 · Tune: Ludwig van Beethoven, 1824 (Ninth Symphony)',
      tags: ['classic', 'stepwise melody', '4/4'],
      level: 1,
      hymnalKey: 'G',
      defaultKey: 'G',
      about: 'Beethoven’s "Ode to Joy". The melody moves almost entirely by step, so it is a wonderful way to learn where the notes of the G scale live on the top three strings.',
      abc: `X:1
T:Joyful, Joyful, We Adore Thee
M:4/4
L:1/4
Q:1/4=96
K:G
"G"B B c d | "G"d c "D7"B A | "G"G G A B | "D"B3/2 A/2 A2 |
w: Joy- ful, joy- ful, we a- dore thee, God of glo- ry, Lord of love;
"G"B B c d | "G"d c "D7"B A | "G"G G A B | "D7"A3/2 G/2 "G"G2 |
w: hearts un- fold like flow'rs be- fore thee, o- p'ning to the sun a- bove.
"D"A A "G"B G | "D"A B/2 c/2 "G"B G | "D"A B/2 c/2 B A | "G"G A "D"D2 |
w: Melt the clouds of sin and_ sad- ness; drive the_ dark of doubt a- way;
"G"B B c d | "G"d c "D7"B A | "G"G G A B | "D7"A3/2 G/2 "G"G2 |]
w: giv- er of im- mor- tal glad- ness, fill us with the light of day!`,
      verses: [
        'Joyful, joyful, we adore thee, God of glory, Lord of love; hearts unfold like flowers before thee, opening to the sun above. Melt the clouds of sin and sadness; drive the dark of doubt away; giver of immortal gladness, fill us with the light of day!',
        'All thy works with joy surround thee, earth and heaven reflect thy rays, stars and angels sing around thee, center of unbroken praise. Field and forest, vale and mountain, flowery meadow, flashing sea, chanting bird and flowing fountain, call us to rejoice in thee.'
      ]
    },
    {
      id: 'come-thou-fount',
      title: 'Come, Thou Fount of Every Blessing',
      tune: 'Nettleton',
      credit: 'Words: Robert Robinson, 1758 · Tune: American folk melody (Wyeth’s Repository, 1813)',
      tags: ['classic', 'folk hymn', '4/4'],
      level: 2,
      hymnalKey: 'D',
      defaultKey: 'G',
      about: 'A beloved American folk hymn. In G the melody sits on the open G and B strings, and the chords are G, C and D — the three friendliest chords on the guitar. Capo 7 matches the hymnal key of D.',
      abc: `X:1
T:Come, Thou Fount of Every Blessing
M:4/4
L:1/4
Q:1/4=84
K:D
"D"F E D D | "D"F A "A"E E | "D"F A "G"B A | "A"F E "D"D2 |
w: Come, thou Fount of ev- ery bless- ing, tune my heart to sing thy grace;
"D"F E D D | "D"F A "A"E E | "D"F A "G"B A | "A"F E "D"D2 |
w: streams of mer- cy, nev- er ceas- ing, call for songs of loud- est praise.
"D"A A "G"B A | "D"F D E F | "D"A A "G"B A | "A"F E "D"D2 |
w: Teach me some me- lo- dious son- net, sung by flam- ing tongues a- bove;
"D"F E D D | "D"F A "A"E E | "D"F A "G"B A | "A"F E "D"D2 |]
w: praise the mount! I'm fixed up- on it, mount of thy re- deem- ing love.`,
      verses: [
        'Come, thou Fount of every blessing, tune my heart to sing thy grace; streams of mercy, never ceasing, call for songs of loudest praise. Teach me some melodious sonnet, sung by flaming tongues above; praise the mount! I’m fixed upon it, mount of thy redeeming love.',
        'Here I raise my Ebenezer; hither by thy help I’m come; and I hope, by thy good pleasure, safely to arrive at home. Jesus sought me when a stranger, wandering from the fold of God; he, to rescue me from danger, interposed his precious blood.'
      ]
    },
    {
      id: 'silent-night',
      title: 'Silent Night',
      tune: 'Stille Nacht',
      credit: 'Words: Joseph Mohr, 1818 (tr. John F. Young) · Tune: Franz Xaver Gruber, 1818',
      tags: ['christmas', 'lullaby', '6/8'],
      level: 2,
      hymnalKey: 'Bb',
      defaultKey: 'D',
      about: 'Written for guitar! Gruber and Mohr first performed it with a guitar on Christmas Eve 1818 because the church organ was broken. The 6/8 rocking arpeggio (p i m, p i m) is the classic lullaby picking pattern.',
      abc: `X:1
T:Silent Night
M:6/8
L:1/8
Q:3/8=50
K:C
"C"G3 A G2 | E6 | G3 A G2 | E6 |
w: Si- _ lent night, ho- _ ly night,
"G7"d3 d B2- | B6 | "C"c3 c G2- | G6 |
w: all is calm, all is bright.
"F"A3 A c2 | "C"A3 G E2 | G3 A G2 | E6 |
w: Round yon vir- gin mo- ther and child, _ _
"F"A3 A c2 | "C"A3 G E2 | G3 A G2 | E6 |
w: Ho- ly in- fant so ten- der and mild, _
"G7"d3 d f2 | d3 B c2 | "C"e6 | e3 z3 |
w: sleep in heav- en- ly peace, _ _
"C"c3 G E2 | "G7"G3 F D2 | "C"C6 | C3 z3 |]
w: sleep in heav- en- ly peace. _ _`,
      verses: [
        'Silent night, holy night, all is calm, all is bright round yon virgin mother and child. Holy infant so tender and mild, sleep in heavenly peace, sleep in heavenly peace.',
        'Silent night, holy night, shepherds quake at the sight; glories stream from heaven afar, heavenly hosts sing Alleluia! Christ the Savior is born, Christ the Savior is born.'
      ]
    },
    {
      id: 'what-child-is-this',
      title: 'What Child Is This',
      tune: 'Greensleeves',
      credit: 'Words: William Chatterton Dix, 1865 · Tune: English melody, 16th century',
      tags: ['christmas', 'minor key', '6/8'],
      level: 3,
      hymnalKey: 'Em',
      defaultKey: 'Am',
      about: 'Greensleeves is one of the great guitar melodies. It is in a minor key, so it teaches how minor feels — and how the raised seventh note (a "leading tone") pulls the ear back home. A minor puts the tune on the top strings; switch to E minor for the traditional low, dark sound.',
      abc: `X:1
T:What Child Is This
M:6/8
L:1/8
Q:3/8=54
K:Em
"Em"E | "Em"G2 A B3/2 c/2 B | "D"A2 F D3/2 E/2 F | "Em"G2 E E3/2 ^D/2 E | "B7"^F2 ^D B,2 E |
w: What child is this_ who laid to rest_ on Ma- ry's lap_ is sleep-_ ing? Whom
"Em"G2 A B3/2 c/2 B | "D"A2 F D3/2 E/2 F | "G"G3/2 F/2 E "B7"^D3/2 ^C/2 ^D | "Em"E6 |
w: an- gels greet_ with an- thems sweet_ while shep- herds watch are keep- ing?
"G"d3 d3/2 c/2 B | "D"A2 F D3/2 E/2 F | "Em"G2 E E3/2 ^D/2 E | "B7"^F2 ^D B,3 |
w: This, this_ is Christ the King,_ whom shep- herds guard_ and an- gels sing;
"G"d3 d3/2 c/2 B | "D"A2 F D3/2 E/2 F | "G"G3/2 F/2 E "B7"^D3/2 ^C/2 ^D | "Em"E6 |]
w: haste, haste_ to bring Him laud,_ the babe,_ the son of Ma- ry.`,
      verses: [
        'What child is this, who, laid to rest, on Mary’s lap is sleeping? Whom angels greet with anthems sweet, while shepherds watch are keeping? This, this is Christ the King, whom shepherds guard and angels sing; haste, haste to bring him laud, the babe, the son of Mary.'
      ]
    },
    {
      id: 'doxology',
      title: 'Doxology (Praise God, from Whom All Blessings Flow)',
      tune: 'Old Hundredth',
      credit: 'Words: Thomas Ken, 1674 · Tune: Genevan Psalter, 1551 (Louis Bourgeois)',
      tags: ['classic', 'short', '4/4'],
      level: 1,
      hymnalKey: 'G',
      defaultKey: 'G',
      about: 'The oldest tune in the book and one of the shortest hymns you will ever learn: four lines, mostly stepwise. Bach harmonized this melody twice, and this is the melody he used.',
      abc: `X:1
T:Doxology
M:4/4
L:1/4
Q:1/4=76
K:G
"G"G2 G F | "C"E D "D"G A | "G"B4 |
w: Praise God, from whom all bless- ings flow;
"G"B2 B B | "G"A G "C"c B | "D"A4 |
w: praise Him, all crea- tures here be- low;
"G"G2 A B | "D"A G E F | "G"G4 |
w: praise Him a- bove, ye heav'n- ly host;
"G"d2 B G | "D7"A c B A | "G"G4 |]
w: praise Fa- ther, Son, and Ho- ly Ghost.`,
      verses: ['Praise God, from whom all blessings flow; praise Him, all creatures here below; praise Him above, ye heavenly host; praise Father, Son, and Holy Ghost. Amen.']
    },
    {
      id: 'praise-to-the-lord',
      title: 'Praise to the Lord, the Almighty',
      tune: 'Lobe den Herren',
      credit: 'Words: Joachim Neander, 1680 (tr. Catherine Winkworth) · Tune: Stralsund Gesangbuch, 1665',
      tags: ['classic', 'joyful', '3/4'],
      level: 2,
      hymnalKey: 'F',
      defaultKey: 'G',
      about: 'A bright, dancing tune in 3/4 with the characteristic long-short "dotted" rhythm. Bach used this very melody in his cantata BWV 137; the version here follows it, with the modern hymnal simplifications.',
      abc: `X:1
T:Praise to the Lord, the Almighty
M:3/4
L:1/4
Q:1/4=104
K:G
"G"G G d | "G"B3/2 A/2 G | "D"F3/2 E/2 D | "G"G A B | "D"A2 "G"G |
w: Praise to the Lord, the Al- migh- ty, the King of cre- a- tion!
"G"G G d | "G"B3/2 A/2 G | "D"F3/2 E/2 D | "G"G A B | "D"A2 "G"G |
w: O my soul, praise Him, for He is thy health and sal- va- tion!
"G"B3/2 A/2 B | "C"c3 | "G"B3/2 c/2 d | "G"d3/2 c/2 B | "D"A3 |
w: All ye who hear, now to His tem- ple draw near;
"D"D E F | "G"G A B | "D"A2 "G"G |]
w: join me in glad ad- o- ra- tion!`,
      verses: ['Praise to the Lord, the Almighty, the King of creation! O my soul, praise Him, for He is thy health and salvation! All ye who hear, now to His temple draw near; join me in glad adoration!', 'Praise to the Lord, who o’er all things so wondrously reigneth, shelters thee under His wings, yea, so gently sustaineth! Hast thou not seen how thy desires e’er have been granted in what He ordaineth?']
    },
    {
      id: 'o-sacred-head',
      title: 'O Sacred Head, Now Wounded',
      tune: 'Passion Chorale',
      credit: 'Words: attr. Bernard of Clairvaux (tr. James W. Alexander, 1830) · Tune: Hans Leo Hassler, 1601, harmonized by J. S. Bach',
      tags: ['lent', 'tender', 'minor colour', '4/4'],
      level: 2,
      hymnalKey: 'C',
      defaultKey: 'G',
      about: 'The great Passion Chorale from Bach’s St Matthew Passion. Notice how the melody starts and ends on E (the third of C major) instead of the home note, which gives it that suspended, tender quality.',
      abc: `X:1
T:O Sacred Head, Now Wounded
M:4/4
L:1/4
Q:1/4=66
K:C
"Am"E | "Am"A G "F"F E | "Dm"D2 "E7"E B | "Am"c c "E7"B/2 A/2 B | "Am"A3 |
w: O sa- cred Head, now wound- ed, with grief and shame_ weighed down;
"Am"E | "Am"A G "F"F E | "Dm"D2 "E7"E B | "Am"c c "E7"B/2 A/2 B | "Am"A3 |
w: now scorn- ful- ly sur- round- ed with thorns, thine on-_ ly crown.
"C"c | "G"B/2 A/2 G "Am"A B | "C"c2 c "G"G | "Am"A G "Dm"F/2 E/2 F | "E7"E3 |
w: O sa-_ cred Head, what glo- ry, what bliss till now_ was thine!
"C"c | "G"B/2 c/2 d "C"c B | "Am"A2 B "E7"E | "F"F E "G"D G | "C"E3 |]
w: Yet, though_ de- spised and go- ry, I joy to call thee mine.`,
      verses: ['O sacred Head, now wounded, with grief and shame weighed down; now scornfully surrounded with thorns, thine only crown. O sacred Head, what glory, what bliss till now was thine! Yet, though despised and gory, I joy to call thee mine.']
    },
    {
      id: 'all-glory-laud',
      title: 'All Glory, Laud, and Honor',
      tune: 'St. Theodulph (Valet will ich dir geben)',
      credit: 'Words: Theodulph of Orléans, c. 820 (tr. John Mason Neale, 1851) · Tune: Melchior Teschner, 1615, harmonized by J. S. Bach',
      tags: ['palm sunday', 'processional', '4/4'],
      level: 2,
      hymnalKey: 'Bb',
      defaultKey: 'D',
      about: 'A stately processional. The first two lines repeat (a "bar form", like most old German chorales), so once you know one line you know half the hymn.',
      abc: `X:1
T:All Glory, Laud, and Honor
M:4/4
L:1/4
Q:1/4=92
K:D
"D"D | "D"A A "G"B "A"c | "D"d2 d f | "A"e "D"d d "A"c | "D"d3 |
w: All glo- ry, laud, and hon- or to thee, Re- deem- er, King,
"D"D | "D"A A "G"B "A"c | "D"d2 d f | "A"e "D"d d "A"c | "D"d3 |
w: to whom the lips of chil- dren made sweet ho- san- nas ring.
"D"d/2 e/2 | "D"f f "A"e3/2 d/2 | "A7"c/2 B/2 c A c | "D"d "A"c "G"B B | "A"A3 |
w: Thou_ art the King_ of_ Is- rael, thou Da- vid's roy- al Son,
"D"A | "D"F/2 G/2 A "G"B "D"A | "D"A G/2 F/2 F A | "G"G "D"F "A"E E | "D"D3 |]
w: who in_ the Lord's name com- est,_ _ the King and bless- ed One.`,
      verses: ['All glory, laud, and honor to thee, Redeemer, King, to whom the lips of children made sweet hosannas ring. Thou art the King of Israel, thou David’s royal Son, who in the Lord’s name comest, the King and Blessed One.']
    },
    {
      id: 'now-thank-we',
      title: 'Now Thank We All Our God',
      tune: 'Nun danket alle Gott',
      credit: 'Words: Martin Rinkart, c. 1636 (tr. Catherine Winkworth) · Tune: Johann Crüger, 1647, harmonized by J. S. Bach',
      tags: ['thanksgiving', 'classic', '4/4'],
      level: 2,
      hymnalKey: 'F',
      defaultKey: 'G',
      about: 'A hymn of thanks written during the Thirty Years’ War. The first two lines repeat, then the tune climbs through a chromatic C-sharp to its highest note before settling home.',
      abc: `X:1
T:Now Thank We All Our God
M:4/4
L:1/4
Q:1/4=88
K:G
"G"d | "G"d d "C"e e | "G"d3 B | "C"c "G"B "D"A B/2 c/2 | "D"A2 "G"G |
w: Now thank we all our God, with heart and hands and_ voi- ces,
"G"d | "G"d d "C"e e | "G"d3 B | "C"c "G"B "D"A B/2 c/2 | "D"A2 "G"G |
w: who won- drous things hath done, in whom his world re-_ joi- ces;
"D"A | "D"A A "G"B B | "D"A3 A | "G"B/2 ^c/2 d d "C"=c | "G"d3 |
w: who from our moth- ers' arms hath blessed_ us on our way
"G"d | "C"e d "G"c B | "C"c3 "G"B | "D"A B/2 c/2 A3/2 "G"G/2 | "G"G3 |]
w: with count- less gifts of love, and still is_ ours to- day.`,
      verses: ['Now thank we all our God, with heart and hands and voices, who wondrous things hath done, in whom his world rejoices; who from our mothers’ arms hath blessed us on our way with countless gifts of love, and still is ours today.', 'O may this bounteous God through all our life be near us, with ever joyful hearts and blessed peace to cheer us; and keep us in his grace, and guide us when perplexed; and free us from all ills, in this world and the next.']
    }
  ];

  function byId(id) { return list.find(h => h.id === id) || null; }

  window.HG.Hymns = { list, byId };
})();
