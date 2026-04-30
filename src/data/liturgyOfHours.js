// Liturgy of the Hours — fixed structural elements
// Variable elements (psalms, readings) use exemplars for MVP.
// Full daily variation is a Phase 12 enhancement.

export const HOURS = {
  morning: {
    id: 'morning',
    name: 'Morning Prayer',
    latinName: 'Lauds',
    suggestedTime: '7:00 AM',
    openingVerse: 'Lord, open my lips, and my mouth will proclaim your praise.',
    psalm: {
      number: 63,
      title: 'Psalm 63 — Thirsting for God',
      text: `O God, you are my God; I seek you,
my soul thirsts for you;
my flesh faints for you,
as in a dry and weary land where there is no water.

So I have looked upon you in the sanctuary,
beholding your power and glory.
Because your steadfast love is better than life,
my lips will praise you.

So I will bless you as long as I live;
I will lift up my hands and call on your name.

My soul is satisfied as with a rich feast,
and my mouth praises you with joyful lips
when I think of you on my bed,
and meditate on you in the watches of the night.`,
    },
    shortReading: {
      reference: 'Romans 13:11–12',
      text: 'It is now the moment for you to wake from sleep. For salvation is nearer to us now than when we became believers; the night is far gone, the day is near.',
    },
    canticle: {
      name: 'Canticle of Zechariah (Benedictus)',
      reference: 'Luke 1:68–79',
      text: `Blessed be the Lord, the God of Israel;
he has come to his people and set them free.
He has raised up for us a mighty savior,
born of the house of his servant David.

Through his holy prophets he promised of old
that he would save us from our enemies,
from the hands of all who hate us.

He promised to show mercy to our fathers
and to remember his holy covenant.

This was the oath he swore to our father Abraham:
to set us free from the hand of our enemies,
free to worship him without fear,
holy and righteous in his sight all the days of our life.`,
    },
    intercessions: [
      'For all who rise to serve God this day',
      'For the Church throughout the world',
      'For those who suffer in body or spirit',
      'For our families and those we will encounter today',
    ],
    response: 'Lord, hear our prayer.',
    closing: 'May the Lord bless us, protect us from all evil, and bring us to everlasting life. Amen.',
  },

  evening: {
    id: 'evening',
    name: 'Evening Prayer',
    latinName: 'Vespers',
    suggestedTime: '6:00 PM',
    openingVerse: 'O God, come to my assistance. O Lord, make haste to help me.',
    psalm: {
      number: 141,
      title: 'Psalm 141 — An Evening Prayer',
      text: `I call upon you, O Lord; come quickly to me;
give ear to my voice when I call to you.

Let my prayer be counted as incense before you,
and the lifting up of my hands as an evening sacrifice.

Set a guard over my mouth, O Lord;
keep watch over the door of my lips.
Do not turn my heart to any evil,
to busy myself with wicked deeds.

But my eyes are turned toward you, O God, my Lord;
in you I seek refuge; do not leave me defenseless.`,
    },
    shortReading: {
      reference: '1 Peter 5:8–9',
      text: 'Discipline yourselves, keep alert. Like a roaring lion your adversary the devil prowls around, looking for someone to devour. Resist him, steadfast in your faith.',
    },
    canticle: {
      name: 'Canticle of Mary (Magnificat)',
      reference: 'Luke 1:46–55',
      text: `My soul proclaims the greatness of the Lord,
my spirit rejoices in God my Savior
for he has looked with favor on his lowly servant.

From this day all generations will call me blessed:
the Almighty has done great things for me,
and holy is his Name.

He has mercy on those who fear him
in every generation.
He has shown the strength of his arm,
he has scattered the proud in their conceit.

He has cast down the mighty from their thrones,
and has lifted up the lowly.
He has filled the hungry with good things,
and the rich he has sent away empty.`,
    },
    intercessions: [
      'For peace in our families and communities',
      'For those who have died today',
      'For our parish and its needs',
      'For those working through the night to serve others',
    ],
    response: 'Lord, hear our prayer.',
    closing: 'May the Lord bless us, protect us from all evil, and bring us to everlasting life. Amen.',
  },

  night: {
    id: 'night',
    name: 'Night Prayer',
    latinName: 'Compline',
    suggestedTime: '9:00 PM',
    openingVerse: 'O God, come to my assistance. O Lord, make haste to help me.',
    examination: 'Take a brief moment to call to mind your sins of this day, and ask God\'s forgiveness.',
    psalm: {
      number: 91,
      title: 'Psalm 91 — In the Shadow of the Almighty',
      text: `You who live in the shelter of the Most High,
who abide in the shadow of the Almighty,
will say to the Lord, "My refuge and my fortress;
my God, in whom I trust."

For he will deliver you from the snare of the fowler
and from the deadly pestilence;
he will cover you with his pinions,
and under his wings you will find refuge;
his faithfulness is a shield and buckler.

You will not fear the terror of the night,
or the arrow that flies by day,
or the pestilence that stalks in darkness,
or the destruction that wastes at noonday.`,
    },
    shortReading: {
      reference: '1 Thessalonians 5:9–10',
      text: 'God has destined us not for wrath but for obtaining salvation through our Lord Jesus Christ, who died for us, so that whether we are awake or asleep we may live with him.',
    },
    canticle: {
      name: 'Canticle of Simeon (Nunc Dimittis)',
      reference: 'Luke 2:29–32',
      text: `Lord, now you let your servant go in peace;
your word has been fulfilled:
my own eyes have seen the salvation
which you have prepared in the sight of every people:
a light to reveal you to the nations
and the glory of your people Israel.`,
    },
    marianAntiphon: {
      name: 'Salve Regina',
      text: `Hail, Holy Queen, Mother of Mercy,
our life, our sweetness, and our hope.
To thee do we cry, poor banished children of Eve;
to thee do we send up our sighs,
mourning and weeping in this valley of tears.

Turn, then, most gracious advocate,
thine eyes of mercy toward us;
and after this, our exile,
show unto us the blessed fruit of thy womb, Jesus.

O clement, O loving, O sweet Virgin Mary.`,
    },
    closing: 'May the all-powerful Lord grant us a restful night and a peaceful death. Amen.',
  },
}
