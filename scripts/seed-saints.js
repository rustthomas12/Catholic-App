// Seed 60+ saints for the faith library.
// Idempotent — skips saints that already exist by name.
// Run with: node --env-file=.env.local scripts/seed-saints.js

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const saints = [
  // ── JANUARY ──────────────────────────────────────────────
  {
    name: 'Elizabeth Ann Seton',
    feast_day: '01-04',
    birth_year: 1774,
    death_year: 1821,
    summary: 'The first native-born American saint, Elizabeth Ann Seton founded the Sisters of Charity and established Catholic education in the United States.',
    biography: `Elizabeth Ann Seton was born in New York City in 1774 into a prominent Episcopalian family. Widowed at 29 with five children, she underwent a profound conversion to Catholicism in 1805 after experiencing the Real Presence in the Eucharist during a stay in Italy.\n\nDespite fierce opposition from Protestant family members who cut off financial support, Elizabeth embraced her new faith with complete trust in Divine Providence. She moved to Baltimore in 1808 at the invitation of Archbishop Carroll, where she opened a school for girls and laid the foundation for the Catholic parochial school system in America.\n\nIn 1809, she founded the Sisters of Charity of St. Joseph's, the first religious community founded in the United States. She guided her community until her death in 1821, establishing orphanages and schools across the country. She was canonized by Pope Paul VI in 1975 as the first American-born saint.`,
    patron_of: ['death of children', 'loss of parents', 'widows', 'Catholic schools'],
    prayer: 'O God, who crowned with heavenly glory Saint Elizabeth Ann Seton, who nurtured the seeds of faith in your people, grant, through her intercession, that we may always be strengthened by the same faith and made fertile in works of charity. Through our Lord Jesus Christ, your Son, who lives and reigns with you in the unity of the Holy Spirit, one God, for ever and ever. Amen.',
    image_url: null,
  },
  {
    name: 'Hilary of Poitiers',
    feast_day: '01-13',
    birth_year: 315,
    death_year: 368,
    summary: 'A Doctor of the Church who courageously defended the divinity of Christ against Arianism and was called the "Athanasius of the West."',
    biography: `Hilary of Poitiers was born into a pagan family of high rank in Gaul around 315 AD. After years of philosophical study and searching for truth, he encountered the opening of John's Gospel and was overwhelmed by the concept of the eternal Word. He converted to Christianity and was elected Bishop of Poitiers around 350 AD.\n\nWhen the Arian heresy — which denied the full divinity of Christ — swept through the Empire under Emperor Constantius II, Hilary stood as one of its most formidable opponents. He was exiled to Phrygia in Asia Minor in 356 AD for his refusal to condemn Saint Athanasius. Far from silencing him, exile only gave him time to write his masterwork "De Trinitate," a profound defense of the Trinity that earned him the title Doctor of the Church.\n\nHe returned from exile in 360 AD, continuing to battle Arianism through writing and councils. Saint Jerome called him "the trumpet of the Latins against the Arians." He died peacefully in Poitiers in 368 AD, leaving behind a treasury of theological writing that shaped the Church's understanding of the Trinity for centuries.`,
    patron_of: ['lawyers', 'against snake bites'],
    prayer: null,
    image_url: null,
  },
  {
    name: 'Agnes',
    feast_day: '01-21',
    birth_year: 291,
    death_year: 304,
    summary: 'A young Roman noblewoman who chose martyrdom over marriage at thirteen years old, Agnes has been venerated as a symbol of purity and courageous faith since the earliest centuries of the Church.',
    biography: `Agnes was a young Roman girl of noble birth who consecrated her virginity to Christ at a young age. When she was about thirteen years old, the son of a Roman prefect fell in love with her and showered her with gifts and promises of wealth. She refused him, saying she had pledged herself to a spouse far greater than any earthly lord.\n\nEnraged, the prefect's son denounced her as a Christian to the authorities. She was brought before the prefect himself, who subjected her to various torments and attempts to break her faith — including being sent to a house of ill repute — from which she was miraculously preserved. She bore all persecution with extraordinary calm and joy.\n\nIn 304 AD, Agnes was beheaded — or stabbed in the throat, accounts vary — becoming one of the most beloved martyrs of the early Church. Pope Damasus wrote a poem in her honor, and Saint Ambrose held her up as the model of virginal martyrdom. A basilica was built over her tomb in Rome, which remains a place of pilgrimage today. Her name means "lamb" in Latin, and on her feast day lambs are blessed at her basilica, the wool later woven into the palliums worn by archbishops.`,
    patron_of: ['girls', 'chastity', 'victims of sexual abuse', 'the Children of Mary'],
    prayer: null,
    image_url: null,
  },
  {
    name: 'Francis de Sales',
    feast_day: '01-24',
    birth_year: 1567,
    death_year: 1622,
    summary: 'A Doctor of the Church who taught that holiness is possible for everyone in ordinary life, Francis de Sales is the patron of writers and journalists for his gentle, persuasive pen.',
    biography: `Francis de Sales was born in 1567 to a noble Savoyard family who intended him for a legal career. After receiving his doctorate in law, he experienced a spiritual crisis during which he was convinced he was damned — and emerged from it with a peace and trust in God's mercy that would characterize his entire ministry.\n\nOrphaned against his family's wishes, he was ordained a priest in 1593 and volunteered to evangelize the Chablais region of Savoy, which had been almost entirely converted to Calvinism. Unable to enter villages safely, he lived under constant threat of death and slid pamphlets under doors. Over four years, he peacefully re-converted an estimated 70,000 souls — using reasoned argument, gentleness, and tireless compassion rather than compulsion.\n\nAs Bishop of Geneva, he co-founded the Visitation Order with Saint Jane de Chantal and became one of the most influential spiritual directors of his age. His "Introduction to the Devout Life" is addressed to laypeople in the world, arguing that holiness is not just for monks but for everyone — soldiers, merchants, married couples. It remains a spiritual classic five centuries later. He was declared a Doctor of the Church in 1877.`,
    patron_of: ['writers', 'journalists', 'the deaf', 'educators'],
    prayer: null,
    image_url: null,
  },
  {
    name: 'Thomas Aquinas',
    feast_day: '01-28',
    birth_year: 1225,
    death_year: 1274,
    summary: 'The greatest theologian and philosopher of the Catholic Church, Thomas Aquinas synthesized faith and reason in the Summa Theologica, a work that continues to shape Catholic intellectual life.',
    biography: `Thomas Aquinas was born around 1225 into a noble Italian family who intended him for an abbacy at Monte Cassino. Instead, he joined the newly founded Dominican Order at age nineteen — against his family's violent protests. His family kidnapped him and held him prisoner for over a year to break his vocation. He spent the time studying theology and teaching his sisters.\n\nEventually released, he studied under the great Albert the Great in Cologne and Paris. So quiet was he in class that his fellow students called him "the dumb ox" — to which Albert replied, "This dumb ox will bellow so loud that his bellowing will fill the world." The prediction proved prophetic. Thomas went on to write a breathtaking body of work, including the Summa Theologica, which systematically addresses virtually every question of theology and philosophy with extraordinary clarity and depth.\n\nThomas believed deeply that faith and reason are complementary, not contradictory — that the natural light of reason and the supernatural light of faith both lead to truth. Near the end of his life, he experienced a mystical vision after which he said, "All that I have written seems to me like straw compared to what I have seen." He died in 1274 at age 49. He was declared a Doctor of the Church in 1323, just 49 years after his death.`,
    patron_of: ['students', 'scholars', 'theologians', 'universities', 'booksellers'],
    prayer: 'Grant me, O Lord my God, a mind to know you, a heart to seek you, wisdom to find you, conduct pleasing to you, faithful perseverance in waiting for you, and a hope of finally embracing you. Amen.',
    image_url: null,
  },
  {
    name: 'John Bosco',
    feast_day: '01-31',
    birth_year: 1815,
    death_year: 1888,
    summary: 'A visionary educator from Turin who founded the Salesians to serve at-risk youth, John Bosco pioneered a preventative approach to education built on reason, religion, and loving kindness.',
    biography: `John Bosco was born in 1815 near Turin, Italy, the son of a poor peasant. His father died when John was two years old, and he grew up in poverty under the devoted care of his mother. At age nine he had a dream that would define his entire life: he saw a crowd of rough, fighting boys transformed as they encountered Christ. He understood his calling was to bring Christ to troubled youth.\n\nAfter his ordination in 1841, he began gathering street children and young workers in Turin — teaching them, playing with them, offering them trades and schooling and above all friendship. His method, called the "preventative system," rejected punishment and relied instead on presence, affection, and reason. Landlords who feared disturbance evicted him repeatedly; he and his boys slept in the open air.\n\nIn 1859 he founded the Society of Saint Francis de Sales — the Salesians — which became one of the largest religious orders in the world. He also founded the Daughters of Mary Help of Christians with Saint Mary Mazzarello. By his death in 1888, his work had spread to six continents. He was canonized in 1934. His method of education — loving rather than punishing, trusting rather than fearing — remains the foundation of Salesian schools worldwide.`,
    patron_of: ['youth', 'editors', 'students', 'apprentices'],
    prayer: null,
    image_url: null,
  },

  // ── FEBRUARY ─────────────────────────────────────────────
  {
    name: 'Blaise',
    feast_day: '02-03',
    birth_year: null,
    death_year: 316,
    summary: 'A bishop and physician martyred in Armenia, Blaise is invoked for throat ailments after reportedly saving a boy choking on a fish bone.',
    biography: `Blaise was Bishop of Sebaste in Armenia in the early fourth century. Accounts describe him as a physician before becoming a bishop, known for healing both physical and spiritual ailments. During the persecution of Christians under Licinius, he fled to a cave in the mountains, where wild animals would come to be healed by him and wait quietly for his blessing before going on their way.\n\nHunters sent to catch animals for the games discovered him in the cave surrounded by the beasts. He was arrested and taken to the governor Agricolaus. On the way, he stopped to save a young boy who was choking to death on a fish bone — a miracle that gave rise to the blessing of throats on his feast day.\n\nDespite being subjected to various tortures — including having his flesh torn with iron combs — he continued to preach and work miracles. He was beheaded around 316 AD. The blessing of throats with crossed candles performed on his feast day, often celebrated with the words "Through the intercession of Saint Blaise, bishop and martyr, may God deliver you from every disease of the throat and from every other illness," remains one of the most universally practiced popular devotions in the Catholic Church.`,
    patron_of: ['throat ailments', 'animals', 'wild animals'],
    prayer: null,
    image_url: null,
  },
  {
    name: 'Agatha',
    feast_day: '02-05',
    birth_year: null,
    death_year: 251,
    summary: 'A Sicilian noblewoman who suffered terrible persecution for refusing to renounce her faith, Agatha is one of the seven women commemorated by name in the Roman Canon.',
    biography: `Agatha was a young noblewoman from Catania or Palermo in Sicily who consecrated her virginity to God. Around 251 AD, during the persecution of the Emperor Decius, she was arrested and brought before the proconsul Quintianus, who had long desired her.\n\nWhen she refused his advances, he handed her over to a brothel, hoping to break her virtue. After a month of abuse, she was brought back before Quintianus, still resolute. He ordered her breasts to be cut off — a torture after which, tradition holds, Saint Peter appeared to her in prison and healed her.\n\nShe was then rolled over hot coals and broken pottery. She died in prison from her wounds, her face alight with joy, praying, "Lord, my Creator, you have always protected me from the cradle; you have taken me from the love of the world and given me patience to suffer. Receive my soul." She is invoked against breast cancer and by nurses, and also against fire — the day after her death, an eruption of Mount Etna was reportedly stopped by her veil carried in procession.`,
    patron_of: ['breast cancer patients', 'nurses', 'Sicily', 'against fire'],
    prayer: null,
    image_url: null,
  },
  {
    name: 'Scholastica',
    feast_day: '02-10',
    birth_year: 480,
    death_year: 543,
    summary: 'The twin sister of Saint Benedict and first Benedictine nun, Scholastica teaches us that love is stronger than rules through a charming story of her last meeting with her brother.',
    biography: `Scholastica was born around 480 AD, the twin sister of Saint Benedict of Nursia. Like her brother, she consecrated herself to God from an early age. When Benedict established his monastery at Monte Cassino, Scholastica founded a convent nearby at Plombariola, about five miles away, becoming the first Benedictine nun.\n\nOnce a year, the twins would meet at a house between their two communities for a day of spiritual conversation and prayer. At their last meeting, as evening fell and Benedict prepared to return to his monastery — the Rule did not permit him to spend the night outside — Scholastica begged him to stay and continue their conversation. He refused, citing the rule.\n\nShe folded her hands in prayer, and immediately a violent storm broke out — so severe that neither Benedict nor his companions could leave. He exclaimed, "What have you done?" She replied, "I asked you and you would not listen; I asked God and he did listen." He stayed. Three days later, Benedict saw her soul ascending to heaven in the form of a dove. He had her body buried in the tomb he had prepared for himself; they lie together still at Monte Cassino.`,
    patron_of: ['Benedictine nuns', 'against storms', 'children having convulsions'],
    prayer: null,
    image_url: null,
  },
  {
    name: 'Valentine',
    feast_day: '02-14',
    birth_year: null,
    death_year: 269,
    summary: 'A Roman priest and physician who was martyred for his faith, Valentine became the patron of lovers through centuries of tradition connecting his feast day with springtime and new love.',
    biography: `Valentine was a priest and possibly a physician in Rome during the reign of Emperor Claudius II. The historical records are sparse and sometimes conflicting — there may have been more than one martyr named Valentine — but tradition holds that he was arrested for performing Christian marriage ceremonies for soldiers, whom Claudius had forbidden to marry believing single men made better soldiers.\n\nAnother tradition holds that he helped persecuted Christians escape Roman prisons, and that while imprisoned himself, he restored sight to the daughter of his jailer. Just before his execution, he allegedly wrote her a farewell letter signed "from your Valentine" — the first valentine. He was martyred on February 14, 269 AD.\n\nThe association of his feast day with romantic love grew through the medieval period, when Geoffrey Chaucer and other poets noted that February 14 was the day birds began to choose their mates. By the High Middle Ages, sending love tokens on Valentine's Day had become a widespread custom across Europe. Though the feast was removed from the Roman Calendar in 1969, Valentine remains venerated as a martyr and symbol of faithful love.`,
    patron_of: ['lovers', 'happy marriages', 'engaged couples', 'beekeepers'],
    prayer: null,
    image_url: null,
  },
  {
    name: 'Polycarp',
    feast_day: '02-23',
    birth_year: 69,
    death_year: 155,
    summary: 'Bishop of Smyrna and disciple of the Apostle John, Polycarp was martyred at age 86 and left us a witness of extraordinary dignity: "I have served Christ for 86 years and he has done me no harm."',
    biography: `Polycarp was born around 69 AD and became a disciple of the Apostle John himself — one of the last living links to the generation that knew Jesus personally. He served as Bishop of Smyrna for decades, shepherding his community through intense persecution and doctrinal controversy.\n\nHe traveled to Rome to meet with Pope Anicetus to resolve a dispute over the date of Easter — they disagreed, but parted in peace and communion, a model of how the Church can hold together amid differences. He combated the Gnostic heresies with vigor, reportedly calling Marcion "the firstborn of Satan" when they met.\n\nIn 155 AD, a pagan crowd in Smyrna demanded his death. When the police captain urged him to save himself by cursing Christ, he replied with the most famous words of the early martyrs: "Eighty-six years I have served him, and he has done me no wrong. How can I blaspheme my King who saved me?" When the fire was lit, witnesses reported it did not touch him but formed a wall around him; he was eventually killed with a sword. His martyrdom, recorded in the Martyrdom of Polycarp, is the oldest detailed account of a Christian martyrdom outside the New Testament.`,
    patron_of: ['Smyrna', 'earache'],
    prayer: null,
    image_url: null,
  },

  // ── MARCH ─────────────────────────────────────────────────
  {
    name: 'Casimir',
    feast_day: '03-04',
    birth_year: 1458,
    death_year: 1484,
    summary: 'A Polish prince who chose prayer and charity over the comforts of royalty, Casimir died at 26 but left a legacy of holiness that made him the patron of Poland and Lithuania.',
    biography: `Casimir was born in 1458 as the third of thirteen children of King Casimir IV of Poland. From an early age, he showed a deep piety and an indifference to the privileges of his royal birth. He slept on the floor, fasted rigorously, and spent long hours of the night in prayer before his chamber door, singing hymns to Mary.\n\nWhen his father sent him at age thirteen to claim the Hungarian throne by military force, he led an army into Hungary but found the soldiers deserting because their pay was in arrears. Refusing to maintain the campaign through unjust means, he returned to Poland — against his father's furious wishes. He was confined at Dobzki Castle for several months as punishment for this perceived disobedience.\n\nHe refused to marry, consecrating his celibacy to God, and served as regent of Poland in his father's absence, governing with such wisdom and justice that the poor called him "father of the poor." When physicians told him that marriage and intimacy might cure his tuberculosis, he refused, saying he would rather die. He died at Grodno in 1484 at just 26 years old. A Latin hymn in honor of Mary, "Omni die dic Mariae," was said to be his daily prayer and was buried with him. He was canonized in 1521.`,
    patron_of: ['Poland', 'Lithuania', 'youth', 'princes'],
    prayer: null,
    image_url: null,
  },
  {
    name: 'Perpetua and Felicity',
    feast_day: '03-07',
    birth_year: null,
    death_year: 203,
    summary: 'A noblewoman and her enslaved companion who were martyred together in Carthage, their prison diary is one of the earliest Christian documents written by a woman.',
    biography: `Vibia Perpetua was a young Carthaginian noblewoman, twenty-two years old, nursing an infant when she was arrested in 203 AD for refusing to sacrifice to the Roman gods. Felicity was an enslaved woman in the same group of catechumens, eight months pregnant at the time of arrest.\n\nPerpetua's prison diary — one of the oldest first-person accounts by a Christian woman — survives to this day. In it, she records a series of visions and her agonized conversations with her pagan father, who begged her repeatedly to renounce Christ to save her life. Her answers reveal a soul of immovable gentleness: "Father, do you see this vessel lying here — a little pitcher or whatever it is? Can it be called by any other name than what it is?" "No," he said. "So I also cannot call myself anything other than what I am: a Christian."\n\nFelicity gave birth to a daughter in prison two days before the execution. When a guard taunted her about her cries in labor, she answered, "Now I suffer what I suffer. But then Another will be in me who will suffer for me, because I too will suffer for Him." Together they were thrown to wild beasts in the arena and then beheaded on March 7, 203 AD. They are commemorated together in the Roman Canon of the Mass.`,
    patron_of: ['mothers', 'expectant mothers', 'martyrs of Africa'],
    prayer: null,
    image_url: null,
  },
  {
    name: 'Patrick',
    feast_day: '03-17',
    birth_year: 385,
    death_year: 461,
    summary: 'Kidnapped as a boy and enslaved in Ireland, Patrick returned as a missionary bishop to convert the very people who had enslaved him, bringing Christianity to the whole island.',
    biography: `Patrick was born around 385 AD in Roman Britain, the son of a deacon and grandson of a priest. At age sixteen he was kidnapped by Irish raiders and taken as a slave to Ireland, where he spent six years tending flocks on a lonely hillside. In his isolation and suffering, he turned to God with an intensity he had never felt before, praying sometimes a hundred times a day.\n\nAfter six years, he heard a voice in a dream telling him a ship was ready for him. He escaped and made his way to the coast, where he found passage back to Britain. But he could not forget Ireland. He began studies for the priesthood, and in another vision he heard "the voice of the Irish" calling him: "We beg you, holy boy, to come and walk among us again." Despite opposition from some in the Church who felt he was unfit, he was consecrated a bishop and sent to Ireland around 432 AD.\n\nFor nearly thirty years he traveled every corner of Ireland, baptizing thousands, ordaining priests, founding monasteries and convents, and confronting pagan kings without fear. He transformed a society of warrior clans into a deeply Christian culture that would, within a few centuries, send missionaries across Europe to rekindle the faith. He reportedly used the shamrock to explain the Trinity to the Irish. He died around 461 AD, leaving behind his "Confession" — a moving personal testimony of God's mercy in his life.`,
    patron_of: ['Ireland', 'Nigeria', 'engineers', 'excluded people', 'against snakes'],
    prayer: 'Christ with me, Christ before me, Christ behind me, Christ in me, Christ beneath me, Christ above me, Christ on my right, Christ on my left, Christ when I lie down, Christ when I sit down, Christ when I arise. I arise today through a mighty strength, the invocation of the Trinity. Amen.',
    image_url: null,
  },
  {
    name: 'Joseph',
    feast_day: '03-19',
    birth_year: null,
    death_year: null,
    summary: 'The foster father of Jesus and husband of Mary, Joseph protected the Holy Family in silence and obedience, making him the model of fatherhood and the patron of workers.',
    biography: `Joseph appears in the Gospels as a man of extraordinary faith and discretion — silent in Scripture, but his actions speak volumes. A carpenter from Nazareth of the lineage of David, he was betrothed to the Virgin Mary when she was found to be with child by the Holy Spirit. Rather than expose her to public shame, he resolved to divorce her quietly — until an angel appeared in a dream and revealed the mystery.\n\nHis response was immediate and total obedience: he took Mary as his wife. When the Magi's visit endangered the Child's life, he received another dream — "Rise, take the child and his mother and flee to Egypt" — and rose at once, in the middle of the night. He lived in exile in Egypt until a third dream sent him home. His life was a continuous act of faith in divine messages received in sleep.\n\nJoseph taught Jesus the carpenter's trade, provided for his family through honest labor, and led Mary and Jesus to Jerusalem for the great feasts. He disappears from the Gospel narrative before Jesus's public ministry — tradition holds he died peacefully, with Jesus and Mary at his side, which is why he is patron of a happy death. Pope Pius IX declared him patron of the universal Church in 1870. His feast on May 1 — Joseph the Worker — was added to counterbalance the socialist celebration of Labor Day.`,
    patron_of: ['fathers', 'workers', 'the universal Church', 'carpenters', 'a happy death', 'families'],
    prayer: 'O Saint Joseph, whose protection is so great, so strong, so prompt before the throne of God, I place in you all my interests and desires. O Saint Joseph, do assist me by your powerful intercession, and obtain for me from your divine Son all spiritual blessings through Jesus Christ. Amen.',
    image_url: null,
  },

  // ── APRIL ─────────────────────────────────────────────────
  {
    name: 'Francis of Paola',
    feast_day: '04-02',
    birth_year: 1416,
    death_year: 1507,
    summary: 'A humble hermit from Calabria who founded the Minims — the "least" of religious orders — Francis of Paola became one of the most celebrated wonder-workers of the fifteenth century.',
    biography: `Francis was born in 1416 in Paola, Calabria, to a poor family. As a young man he lived as a hermit in a sea cave, and his reputation for holiness attracted so many followers that he eventually organized them into a religious order he called the Minims — from "minimi," meaning the least, because he wanted his friars to be the humblest of all religious. Their rule included perpetual abstinence from meat.\n\nRumors of his miracles spread across Italy and beyond. He reportedly multiplied food, cured the sick, and crossed the Strait of Messina on his cloak when a ferryman refused to take him without payment. King Louis XI of France, dying of illness, begged Pope Sixtus IV to send Francis to his bedside. Francis came, but instead of curing the king, he helped him prepare for death with such peace and trust that the king died a holy death — perhaps the greater miracle.\n\nFrancis lived in France for the last 25 years of his life, at the invitation of successive French kings, founding monasteries and working wonders. He was known for his extraordinary humility — he reportedly refused to touch money and wrote letters only with difficulty. He died at age 91 in 1507, having fasted on bread and water for his last forty years. He was canonized in 1519.`,
    patron_of: ['sailors', 'naval officers', 'Calabria', 'the poor'],
    prayer: null,
    image_url: null,
  },
  {
    name: 'John Baptist de la Salle',
    feast_day: '04-07',
    birth_year: 1651,
    death_year: 1719,
    summary: 'A wealthy French priest who gave away his entire fortune to serve poor children, John Baptist de la Salle founded the Brothers of the Christian Schools and transformed Catholic education.',
    biography: `John Baptist de la Salle was born in 1651 in Reims, France, into a wealthy noble family. Ordained a priest and holding a lucrative cathedral position, he became involved almost accidentally with a group of poor schoolteachers, helping them organize schools for destitute children who roamed the streets of French cities.\n\nOver time, he came to see this work as his true vocation. He gave away his entire fortune during a famine, resigned his prestigious position, and gathered his teachers into a community. In 1680, he founded the Brothers of the Christian Schools — a religious congregation of laymen (not priests) dedicated entirely to teaching the poor, a radical innovation in the history of religious life.\n\nHis educational contributions were revolutionary: he introduced teaching in the vernacular French instead of Latin, grouped students by ability, trained teachers systematically, and established schools for delinquents and new immigrants. Modern school practices we take for granted — including teaching all students simultaneously rather than one at a time — trace directly to his innovations.\n\nHe faced fierce opposition from jealous masters, from Church authorities who questioned his approach, and from the secular establishment. He died in 1719, worn out, having given everything. He was canonized in 1900 and declared patron of teachers in 1950.`,
    patron_of: ['teachers', 'educators', 'school principals'],
    prayer: null,
    image_url: null,
  },
  {
    name: 'Catherine of Siena',
    feast_day: '04-29',
    birth_year: 1347,
    death_year: 1380,
    summary: 'A Dominican tertiary and Doctor of the Church who never learned to read but dictated masterworks of mystical theology and boldly called a wayward pope back to Rome.',
    biography: `Catherine Benincasa was born in Siena in 1347, the twenty-fourth of twenty-five children of a wool dyer. At six she had a vision of Christ that set the course of her life. Despite her parents' wish that she marry, she cut off her hair in protest and eventually received the habit of the Dominican tertiaries, living in a small room in her father's house in prayer and penance.\n\nFrom her solitude, she was drawn out by a second great vision into a life of intense public service: she cared for plague victims, prisoners, and the poor with reckless love. Illiterate, she dictated her masterwork "The Dialogue" to secretaries while in ecstasy — a profound mystical treatise on divine love and providence that ranks among the greatest works of medieval spirituality.\n\nMost remarkably, she became a political force, writing hundreds of letters to princes, popes, and city governors that combined theological depth with fearless directness. She wrote to Pope Gregory XI, who had lived at Avignon for 68 years, calling him to courage: "Be a man, Father!" She succeeded — he returned to Rome in 1377. She died in 1380 at age 33, exhausted from her labors. She was declared a Doctor of the Church in 1970 — one of the first two women so honored — and patron of Italy and Europe.`,
    patron_of: ['Italy', 'Europe', 'nurses', 'sick people', 'fire prevention'],
    prayer: null,
    image_url: null,
  },

  // ── MAY ──────────────────────────────────────────────────
  {
    name: 'Matthias',
    feast_day: '05-14',
    birth_year: null,
    death_year: null,
    summary: 'Chosen by lot to replace Judas Iscariot, Matthias was a witness to the Resurrection from the beginning and served as an Apostle to the early Church.',
    biography: `Matthias is the only Apostle chosen after the Ascension of Christ. When the community of disciples gathered in Jerusalem after Pentecost, Peter stood and said that one of those who had been with Jesus from the beginning — from his baptism in the Jordan through his Resurrection — must be chosen to take the place of Judas. Two men were nominated: Joseph called Barsabbas and Matthias.\n\nThe community prayed: "Lord, you who know the hearts of all, show us which of these two you have chosen." Then they cast lots, and the lot fell to Matthias. This was the last recorded use of casting lots in Scripture — from Pentecost onward, the Holy Spirit would guide the Church's decisions more directly.\n\nLittle is known with certainty about Matthias's subsequent ministry. Various traditions send him to Ethiopia, Cappadocia, or Georgia. One tradition holds he was stoned and then beheaded; another says he died peacefully. What is certain is that he was present from the beginning of Christ's public ministry and witnessed the Resurrection — the essential qualification for apostleship that Peter enumerated. His feast reminds us that God's choices often surprise us.`,
    patron_of: ['alcoholics', 'carpenters', 'tailors'],
    prayer: null,
    image_url: null,
  },
  {
    name: 'Isidore the Farmer',
    feast_day: '05-15',
    birth_year: 1070,
    death_year: 1130,
    summary: 'A humble Spanish farm laborer who spent his entire life working the fields and praying, Isidore shows that the deepest holiness can flower in the most ordinary circumstances.',
    biography: `Isidore was born around 1070 in Madrid into a poor family. He spent his entire working life as a farm laborer on the estate of a wealthy landowner named John de Vargas, never rising to any position of prominence or worldly success. His life was one of extraordinary simplicity: he farmed, he prayed, he shared what little he had with the poor and with animals.\n\nHis practice of attending Mass each morning before going to his fields apparently troubled his employer, who suspected he was neglecting his work. But other workers reported seeing angels plowing for Isidore while he prayed — a story that may reflect the testimony of those who noticed that his fields produced more than those of workers who arrived earlier. Whether the angels were literal or symbolic, the abundant harvest was real.\n\nHe married María de la Cabeza, who is also venerated as a saint. They had one son who died young, after which they agreed to live in complete continence. Isidore died around 1130, but his holiness was remembered. In 1212, the night before the Battle of Las Navas de Tolosa, King Alfonso VIII of Castile reportedly saw a vision of Isidore showing him a pass through the mountains — the Christians won a decisive victory. He was canonized in 1622, on the same day as Ignatius of Loyola, Francis Xavier, Teresa of Avila, and Philip Neri.`,
    patron_of: ['farmers', 'laborers', 'peasants', 'Madrid'],
    prayer: null,
    image_url: null,
  },
  {
    name: 'Philip Neri',
    feast_day: '05-26',
    birth_year: 1515,
    death_year: 1595,
    summary: 'The "Apostle of Rome" whose joy and humor drew thousands to conversion, Philip Neri founded the Oratory and is one of the most loveable saints in the Catholic tradition.',
    biography: `Philip Neri was born in Florence in 1515 and as a young man went to Rome, where he lived as a layman for years, spending his nights in the catacombs in prayer and his days evangelizing the young men of the city with humor, games, and friendship. He had a mystical experience on Pentecost 1544 in the catacombs of San Sebastian, in which he felt his heart expand with such warmth that he broke two ribs — a physical phenomenon visible to physicians throughout his life.\n\nHe worked as a layman for seventeen years before friends persuaded him to be ordained at age 36. His confessional became one of the wonders of Rome: people waited hours to see him. He could reportedly read consciences and smell the state of souls. But what drew people was not fear — it was his irresistible joy, his practical jokes, his complete naturalness. He famously shaved half his beard, wore a white fur coat inside out, and had disciples read funny books at serious gatherings — all to puncture the pride of those who thought holiness was solemn.\n\nHe founded the Congregation of the Oratory — priests living in community without vows — which spread across the world. His "Oratory" meetings of prayer, music, and spiritual reading gave the world a new musical form: the oratorio. He died in 1595, still joking. He was canonized in 1622.`,
    patron_of: ['Rome', 'joy', 'laughter', 'youth workers'],
    prayer: null,
    image_url: null,
  },

  // ── JUNE ─────────────────────────────────────────────────
  {
    name: 'Justin Martyr',
    feast_day: '06-01',
    birth_year: 100,
    death_year: 165,
    summary: 'The first great Christian philosopher, Justin Martyr embraced Christianity after years of searching through every philosophical school, and died rather than sacrifice to Roman gods.',
    biography: `Justin was born around 100 AD in Samaria of Greek parents. He was a passionate seeker of truth who studied Stoicism, Aristotelianism, Pythagoreanism, and Platonism — finding each school inadequate. One day, walking by the sea, he met an old man who led him, step by step, to Christianity, showing him how the Hebrew prophets had pointed to Christ long before Plato ever lived.\n\nConverted at around 130 AD, Justin refused to abandon philosophy — instead, he argued that Christ is the Logos, the eternal Word and Reason behind all things, and that wherever reason and truth are found — even among pagan philosophers — traces of Christ are present. He opened a school of Christian philosophy in Rome, wearing his philosopher's cloak as a visible sign that Christianity was the true philosophy.\n\nHis "Apologies" — addressed directly to Emperor Antoninus Pius — contain our earliest detailed description of Sunday liturgy, including the Eucharist. He was a pioneer of dialogue with Judaism in his "Dialogue with Trypho." Around 165 AD, he was denounced to the authorities and refused to sacrifice to the Roman gods. His exchange with the Prefect Rusticus has survived: "Do you suppose you will rise from the dead and live forever?" "I do not suppose it — I know it and am fully persuaded of it." He was beheaded.`,
    patron_of: ['philosophers', 'apologists'],
    prayer: null,
    image_url: null,
  },
  {
    name: 'Anthony of Padua',
    feast_day: '06-13',
    birth_year: 1195,
    death_year: 1231,
    summary: 'A Franciscan preacher of extraordinary power, Anthony of Padua is one of the most beloved saints in the world and is invoked for finding lost objects.',
    biography: `Anthony was born Fernando de Bulhões in Lisbon in 1195 to a noble family. He joined the Augustinian canons and studied intensely. When the bodies of the first Franciscan martyrs were brought through Lisbon on their way to burial in Morocco, he was so moved that he transferred to the Franciscans and took the name Anthony, hoping to seek martyrdom himself in Africa. Instead, illness forced his ship back, and he ended up at a small hermitage in Forli, Italy.\n\nAt an ordination ceremony where no one had prepared a sermon, he was pressed to speak — and the assembled crowd was thunderstruck. Word reached Francis of Assisi, who wrote to him immediately: "It pleases me that you teach sacred theology to the brothers." Anthony became the first theologian of the Franciscan Order, but above all he was a preacher of extraordinary power. He reportedly preached to fish when the people of Rimini refused to listen; the fish raised their heads out of the water and attended solemnly.\n\nHe worked tirelessly for the poor and against usury, and reportedly appeared in two places simultaneously. He died at Padua in 1231 at just 36 years old. He was canonized within a year of his death — one of the fastest canonizations in history. The association with finding lost things comes from a story of a novice who stole Anthony's psalter and was so troubled by a vision that he returned it.`,
    patron_of: ['lost items', 'the poor', 'Portugal', 'Padua', 'travelers'],
    prayer: 'O holy St. Anthony, gentlest of Saints, your love for God and Charity for His creatures, made you worthy, when on earth, to possess miraculous powers. Miracles waited on your word, which you were ever ready to speak for those in trouble or anxiety. Encouraged by this thought, I implore of you to obtain for me (request). The answer to my prayer may require a miracle; even so, you are the Saint of Miracles. O gentle and loving St. Anthony, whose heart was ever full of human sympathy, whisper my petition into the ears of the sweet Infant Jesus, who loved to be folded in your arms; and the gratitude of my heart will ever be yours. Amen.',
    image_url: null,
  },
  {
    name: 'Thomas More',
    feast_day: '06-22',
    birth_year: 1478,
    death_year: 1535,
    summary: 'Lord Chancellor of England who refused to recognize Henry VIII\'s supremacy over the Church and was beheaded, More went to his death calling himself "the King\'s good servant, but God\'s first."',
    biography: `Thomas More was born in London in 1478, the son of a judge. A brilliant scholar trained in law and the classics, he became one of the leading humanists of Europe — a friend of Erasmus, a writer of wit and depth, a judge of legendary fairness. He rose to become Lord Chancellor of England, the highest legal office in the realm.\n\nWhen Henry VIII sought to divorce Catherine of Aragon, More could not in conscience support the annulment. He resigned the chancellorship in 1532 rather than take an oath affirming the king's supremacy over the Church. He lived quietly in poverty for two years, hoping his silence would protect him. But silence was not enough for the king.\n\nArrested in 1534 and imprisoned in the Tower of London, he was tried for treason and condemned on the perjured testimony of Richard Rich. His conduct throughout was a masterpiece of legal precision, good humor, and unbreakable faith. On the scaffold, he told the crowd he died "the King's good servant, but God's first." He jokingly moved his beard away from the block, saying it at least had committed no treason.\n\nHe was canonized in 1935, four hundred years after his death. He and his friend Bishop John Fisher are the only laypeople and bishops, respectively, to be canonized from the English Reformation.`,
    patron_of: ['lawyers', 'civil servants', 'politicians', 'statesmen', 'difficult marriages'],
    prayer: null,
    image_url: null,
  },
  {
    name: 'Peter and Paul',
    feast_day: '06-29',
    birth_year: null,
    death_year: null,
    summary: 'The two great pillars of the apostolic Church, Peter and Paul were both martyred in Rome under Nero and together represent the two great missions of Christianity: to the Jews and to the Gentiles.',
    biography: `Peter was a fisherman from Galilee, impulsive and passionate, chosen by Christ to be the Rock on which the Church would be built. He denied Christ three times and was three times asked, "Do you love me?" before receiving his commission: "Feed my lambs." He led the Jerusalem community, presided over the first council, preached at Pentecost, and eventually came to Rome, where he was crucified upside down — requesting this position because he was unworthy to die as his Lord had died.\n\nPaul was born Saul of Tarsus, a Pharisee who persecuted the first Christians with zeal. On the road to Damascus to arrest Christians, he was knocked to the ground by a blinding light and heard the voice of the risen Christ. Converted instantly, he became the most tireless missionary in the Church's history, founding communities across Asia Minor, Greece, and possibly Spain, enduring shipwreck, imprisonment, beatings, and constant danger. His letters constitute half of the New Testament.\n\nBoth were martyred in Rome under Nero around 64-68 AD. Their shared feast — unusual for two apostles — celebrates not just their martyrdoms but the miracle of their unity: the impulsive fisherman and the persecutor turned missionary, so different in origin and temperament, together built the Church that transformed the world.`,
    patron_of: ['Rome', 'the universal Church', 'fishermen', 'missionaries'],
    prayer: null,
    image_url: null,
  },

  // ── JULY ─────────────────────────────────────────────────
  {
    name: 'Thomas the Apostle',
    feast_day: '07-03',
    birth_year: null,
    death_year: null,
    summary: 'The Apostle who famously doubted the Resurrection until he touched Christ\'s wounds, Thomas afterward proclaimed "My Lord and my God!" — the clearest confession of faith in all the Gospels.',
    biography: `Thomas, called "the Twin" (Didymus in Greek), appears at three dramatic moments in John's Gospel. When Jesus announced he was going back to Judea where the authorities had just tried to stone him, it was Thomas who said, with fierce loyalty: "Let us also go, that we may die with him." At the Last Supper, when Jesus spoke of going to prepare a place and said the disciples knew the way, Thomas blurted honestly, "Lord, we do not know where you are going; how can we know the way?" — prompting Jesus's great declaration, "I am the way, the truth, and the life."\n\nHis most famous moment came after the Resurrection. Absent when Jesus appeared to the other disciples, he refused to believe unless he could touch the wounds himself. Eight days later, Jesus appeared again and invited Thomas to do exactly that. The response that came out of Thomas was not a careful theological formulation but a cry from the depths: "My Lord and my God!" — perhaps the most complete expression of faith in the Gospels.\n\nTraditionally, Thomas then traveled to India, where the ancient Thomas Christians of Kerala trace their foundation to his mission. He was martyred there, traditionally by being run through with a spear. His willingness to doubt honestly and then believe completely makes him a patron of those who struggle with faith.`,
    patron_of: ['India', 'Sri Lanka', 'architects', 'builders', 'those with doubts'],
    prayer: null,
    image_url: null,
  },
  {
    name: 'Benedict',
    feast_day: '07-11',
    birth_year: 480,
    death_year: 547,
    summary: 'Father of Western monasticism and patron of Europe, Benedict wrote a Rule of such wisdom and balance that it governed religious life in the West for fifteen centuries and continues to do so today.',
    biography: `Benedict was born around 480 AD in Nursia, Italy. He went to Rome to study but was so scandalized by the corruption of city life that he abandoned his studies and fled to the hills of Subiaco, living for three years as a hermit in a cave. His reputation for holiness drew followers; twice he tried to lead a monastic community and twice the monks — disturbed by his high standards — tried to poison him. The cup shattered at his blessing; the bread was carried away by a raven.\n\nEventually he settled at Monte Cassino, where he founded a monastery and wrote his Rule for Monks — a document of extraordinary practicality and humanity. The Rule balances prayer, work, and study with mercy and flexibility, making room for the weak while challenging the strong. Its motto, "Ora et Labora" (Pray and Work), made Benedictine monasteries the engines of European civilization: they preserved ancient learning, developed agriculture, cared for the sick, and educated the young through centuries of chaos.\n\nPope Gregory the Great wrote a biography of Benedict in his "Dialogues" that has been read continuously for fourteen centuries. Benedict's twin sister Scholastica founded the first Benedictine convent nearby. He died in 547, having turned the destruction of Rome into an opportunity for a new civilization. Paul VI declared him patron of Europe in 1964.`,
    patron_of: ['Europe', 'monks', 'the dying', 'against poison', 'agricultural workers'],
    prayer: 'Graciously hear us, O Lord, that this sign of the Holy Cross shall drive away the devil and every evil from those who use it in faith. Through Christ our Lord. Amen.',
    image_url: null,
  },
  {
    name: 'Mary Magdalene',
    feast_day: '07-22',
    birth_year: null,
    death_year: null,
    summary: 'The first witness to the Resurrection and "Apostle to the Apostles," Mary Magdalene was devoted to Christ from the earliest days of his ministry through the cross and the empty tomb.',
    biography: `Mary Magdalene appears more prominently in the Resurrection accounts than any other figure except the Apostles themselves. Luke's Gospel tells us she was among the women who accompanied Jesus through Galilee and supported his ministry from their own resources, and that Jesus had driven seven demons from her.\n\nShe was present at the Crucifixion when most of the male disciples had fled. She was among the women who came to anoint Jesus's body at dawn on Easter morning and found the tomb empty. John's Gospel gives us the most intimate account: Mary remained weeping outside the tomb after the others had left, and Jesus appeared to her first — speaking her name with such particularity that she recognized him immediately. He commissioned her: "Go to my brothers and tell them I am ascending." Pope John Paul II called her "the apostle to the apostles."\n\nWestern tradition, conflating her with other Marys in the Gospels, portrayed her as a repentant sinner — a tradition now recognized as historically questionable. Pope Francis elevated her feast to a Feast (from a Memorial) in 2016, honoring her as the first evangelist of the Resurrection. Eastern tradition sends her to Ephesus with Mary the Mother of Jesus, or to southern France, where a great medieval cult in Provence held that she died as a contemplative.`,
    patron_of: ['women', 'penitents', 'hairdressers', 'perfumers', 'contemplative life'],
    prayer: null,
    image_url: null,
  },
  {
    name: 'James',
    feast_day: '07-25',
    birth_year: null,
    death_year: 44,
    summary: 'The first Apostle to be martyred, James the Greater was beheaded by Herod Agrippa and his remains are venerated at Santiago de Compostela, one of the great pilgrimage sites of the world.',
    biography: `James, son of Zebedee and brother of John the Apostle, was a fisherman on the Sea of Galilee when Jesus called him and his brother by name. Jesus nicknamed them "Boanerges" — Sons of Thunder — apparently for their fiery temperament. James, Peter, and John formed the inner circle of the Twelve, present at the Transfiguration and at the agony in Gethsemane.\n\nJames and John once asked Jesus for the chief seats in his kingdom, prompting the Lord's great teaching on servanthood: "Whoever wishes to be great among you must be your servant." Jesus told them they would indeed drink his cup — and James became the first Apostle to do so, beheaded by Herod Agrippa in 44 AD, just over a decade after the Resurrection.\n\nTraditionally, James had previously evangelized Spain — a tradition that gave rise to one of the great pilgrimage routes in Christian history. In the ninth century, a tomb at Compostela in northern Spain was identified as his, and the Camino de Santiago became one of the three great pilgrimages of the medieval Church (with Rome and Jerusalem). Millions have walked it across the centuries and continue to do so today.`,
    patron_of: ['Spain', 'pilgrims', 'laborers', 'the dying'],
    prayer: null,
    image_url: null,
  },
  {
    name: 'Ignatius of Loyola',
    feast_day: '07-31',
    birth_year: 1491,
    death_year: 1556,
    summary: 'A Basque soldier whose conversion during convalescence from war wounds led him to found the Society of Jesus, whose missionaries transformed the Americas, Asia, and Africa.',
    biography: `Ignatius Loyola was born in 1491 at the castle of Loyola in the Basque country of Spain. A soldier and courtier by vocation, he was badly wounded at the siege of Pamplona in 1521 when a cannonball shattered his leg. During his long and painful recovery, the only books available were a life of Christ and a collection of saints' lives — and they changed everything.\n\nHe noticed that when he imagined glory in battle, the satisfaction faded; when he imagined following Christ as Francis and Dominic had done, a lasting joy remained. This observation became the seed of the "discernment of spirits" — a method of recognizing God's will through the movements of consolation and desolation — that he would develop into his Spiritual Exercises, one of the most influential spiritual texts in Christian history.\n\nHe traveled as a pilgrim to Jerusalem, studied theology in Paris — where he gathered the first companions, including Francis Xavier — and founded the Society of Jesus (the Jesuits) in 1540. The Jesuits became the shock troops of the Counter-Reformation: founding schools and universities, sending missionaries to the Americas, Japan, China, India, and Africa, and staffing the most intellectually demanding posts in the Church. Ignatius died in Rome in 1556, having never ceased to experience, as he put it, "great peace in God." He was canonized in 1622.`,
    patron_of: ['Jesuits', 'soldiers', 'spiritual retreats', 'the Society of Jesus'],
    prayer: 'Take, Lord, and receive all my liberty, my memory, my understanding, and my entire will, all I have and call my own. You have given all to me. To you, Lord, I return it. Everything is yours; do with it what you will. Give me only your love and your grace; that is enough for me. Amen.',
    image_url: null,
  },

  // ── AUGUST ────────────────────────────────────────────────
  {
    name: 'John Vianney',
    feast_day: '08-04',
    birth_year: 1786,
    death_year: 1859,
    summary: 'The Curé of Ars who spent sixteen to eighteen hours a day in the confessional, John Vianney converted a village and then a nation by the power of prayer and self-denial.',
    biography: `Jean-Marie Vianney was born in 1786 near Lyon, France. His education was disrupted by the Revolution, and he nearly failed his seminary exams — his Latin was poor and theology slow to come. His director advised the seminary to ordain him anyway, noting: "Is he not a model of piety? The Church needs not only learned priests but also holy ones."\n\nAssigned to the obscure village of Ars, he found a community barely practicing the faith. He attacked the problem frontally: preaching with burning directness against dancing, taverns, and Sunday labor, but above all offering himself as a living sacrament of God's mercy. People came from across France to his confessional. By 1855, over twenty thousand pilgrims a year were traveling to Ars — a village of 230 souls — to confess to the Curé.\n\nHe slept as little as two hours a night, fasted so severely that his health was constantly precarious, and suffered what he believed were physical attacks from the devil, who he referred to as "the grappin." He tried three times to flee to a monastery and live as a contemplative; three times he was brought back. He died in 1859, having spent thirty years giving sixteen to eighteen hours a day to the confessional. He was canonized in 1925 and declared patron of parish priests by Pius XI.`,
    patron_of: ['parish priests', 'priests', 'confessors'],
    prayer: null,
    image_url: null,
  },
  {
    name: 'Dominic',
    feast_day: '08-08',
    birth_year: 1170,
    death_year: 1221,
    summary: 'A Spanish priest who founded the Order of Preachers to combat heresy through preaching and study, Dominic initiated the tradition of the Rosary and shaped Catholic intellectual life for centuries.',
    biography: `Dominic de Guzmán was born around 1170 in Caleruega, Spain. While studying theology at Palencia, he sold his books and personal effects to feed victims of a famine. He became a canon regular and accompanied his bishop on a diplomatic mission through southern France, where he encountered the Albigensian heresy — which condemned matter and flesh as evil — spreading rapidly among the population.\n\nWhere the Cistercians sent to combat the heresy had failed — partly because their wealthy entourages undermined their credibility — Dominic adopted poverty and went on foot, debating Cathar preachers in their own towns and winning converts back. He understood that the heresy had to be met with theological argument delivered by credible, holy witnesses.\n\nIn 1216 he founded the Order of Preachers — the Dominicans — whose charism was specifically intellectual: study in service of preaching. The Dominicans established themselves in the new universities and produced such figures as Albert the Great, Thomas Aquinas, and Meister Eckhart. The Order spread with astonishing speed across Europe.\n\nDominic is also credited with promulgating the Rosary, which he received from Mary in a vision during his preaching mission — though the Rosary's full development came later. He died in Bologna in 1221, saying to his brothers, "Do not weep. I shall be more useful to you after my death and shall help you more than during my life." He was canonized in 1234.`,
    patron_of: ['preachers', 'astronomers', 'the Dominican Republic'],
    prayer: null,
    image_url: null,
  },
  {
    name: 'Clare of Assisi',
    feast_day: '08-11',
    birth_year: 1194,
    death_year: 1253,
    summary: 'The friend and spiritual daughter of Francis of Assisi who founded the Poor Clares, Clare defended the "privilege of poverty" against papal pressure and lived it with complete joy for forty years.',
    biography: `Clare was born in 1194 in Assisi to a noble family. At eighteen, hearing Francis preach, she was so moved that she ran away from home in the middle of the night to meet him. Francis cut her hair, clothed her in a rough habit, and placed her in a Benedictine convent until she could establish her own community.\n\nSoon her sister Agnes joined her, then her mother and other women. Francis gave them the little church of San Damiano below Assisi, where Clare would live for forty years without ever leaving — governing her community as abbess through illness and long periods of intense suffering, during which she apparently had mystical visions.\n\nThe great struggle of her life was the "privilege of poverty" — her insistence that her community own no property whatsoever, not even in common. Four popes tried to modify this. Cardinal Hugolino, later Gregory IX, brought her a bull allowing property in common; she reportedly refused it while he was standing there. Two days before her death, she finally received papal approval of her Rule, the first religious rule in history written by a woman. She died holding it in her hands.\n\nWhen Saracen troops threatened Assisi, Clare reportedly carried the Blessed Sacrament to the wall of her convent and the troops fled — which is why she is patron of television: she "broadcast" the vision of Christ. She was canonized in 1255.`,
    patron_of: ['television', 'goldsmiths', 'eye disease', 'embroiderers', 'Assisi'],
    prayer: null,
    image_url: null,
  },
  {
    name: 'Monica',
    feast_day: '08-27',
    birth_year: 331,
    death_year: 387,
    summary: 'The mother of Augustine who prayed for thirty years for her son\'s conversion, Monica is the patron of all who mourn over wayward children and wait on God\'s timing.',
    biography: `Monica was born around 331 AD in Tagaste, North Africa, to a Christian family. She was given in marriage to Patricius, a pagan Roman official of difficult temperament, and her mother-in-law was similarly hostile. By her patience and gentleness, she eventually won both her husband and her mother-in-law to the faith.\n\nHer greatest trial was her son Augustine — brilliant, pleasure-loving, captivated by Manichaeism, living with a concubine, fathering a child outside of marriage, and showing no interest in Christianity. Monica prayed and fasted for him for seventeen years. When he planned to go to Rome, she tried to prevent him; he deceived her about his departure and sailed away in the night.\n\nShe followed him to Rome and then to Milan, where she came under the influence of Saint Ambrose — "that man of God," Augustine later called him, in a tribute to both Monica and Ambrose. In 386, Augustine was converted, baptized by Ambrose at the Easter Vigil. Mother and son shared several days of mystical conversation at Ostia before Monica was struck ill. She died there, saying, "Nothing is far from God." Augustine recorded her life and death in his Confessions with a tenderness that has moved readers for sixteen centuries.`,
    patron_of: ['mothers', 'wives', 'abuse victims', 'alcoholics', 'those with difficult marriages'],
    prayer: null,
    image_url: null,
  },
  {
    name: 'Augustine',
    feast_day: '08-28',
    birth_year: 354,
    death_year: 430,
    summary: 'Bishop of Hippo and the greatest theologian of Christian antiquity, Augustine\'s "Confessions" and "City of God" shaped Western thought, and his prayer "Our heart is restless until it rests in you, O Lord" speaks for every soul.',
    biography: `Augustine was born in 354 in Tagaste, North Africa, to Monica (a Christian) and Patricius (a pagan). Brilliant from childhood, he pursued rhetoric and philosophy with passion — and pleasure. He took a concubine at seventeen, had a son, Adeodatus, and spent a decade as a Manichaean. He moved to Rome for career advancement, then to Milan, where he became the city's professor of rhetoric.\n\nIn Milan, he began attending Ambrose's sermons — initially to study rhetoric, not theology. But the arguments worked on him. He read the Platonists and found they pointed toward a transcendent God; he read Paul and found the full truth. His conversion came in a garden in 386: hearing a child's voice singing "Take up and read," he opened Paul's letter and was converted on the spot. He was baptized at Easter 387 by Ambrose.\n\nHe returned to Africa, was ordained a priest against his will by the bishop of Hippo, and eventually became bishop himself. For thirty-five years he preached almost daily, governed his diocese, engaged in fierce theological controversies — against the Manichaeans, Donatists, Pelagians — and wrote with astonishing productivity: Confessions, City of God, On the Trinity, and hundreds of sermons and letters. He died in 430 as the Vandals besieged Hippo, having lived to see the Roman world he had known collapse. He is a Doctor of the Church and perhaps the most influential theologian in Christian history.`,
    patron_of: ['theologians', 'brewers', 'printers', 'sore eyes', 'those with troubled marriages'],
    prayer: 'Breathe in me, O Holy Spirit, that my thoughts may all be holy. Act in me, O Holy Spirit, that my work, too, may be holy. Draw my heart, O Holy Spirit, that I love but what is holy. Strengthen me, O Holy Spirit, to defend all that is holy. Guard me, then, O Holy Spirit, that I always may be holy. Amen.',
    image_url: null,
  },

  // ── SEPTEMBER ─────────────────────────────────────────────
  {
    name: 'Gregory the Great',
    feast_day: '09-03',
    birth_year: 540,
    death_year: 604,
    summary: 'Pope Gregory I reformed the Church, codified the liturgy, sent Augustine to evangelize England, and coined the term "servant of the servants of God" as the papal title.',
    biography: `Gregory was born around 540 in Rome to a wealthy senatorial family. He became prefect of Rome at thirty — the highest civil post in the city — but resigned to become a monk in the monastery he founded in his own family mansion. He experienced five years of contemplation that he would call the happiest of his life, and never fully ceased to long for that silence.\n\nInstead, he was drawn back into the world: sent as papal ambassador to Constantinople, then elected pope by the Roman clergy and people in 590, against his strenuous protests. He served for fourteen years under constant physical suffering — gout, stomach ailments, fevers — and produced one of the most remarkable pontificates in history.\n\nHe reorganized the vast papal estates to fund relief for a city ravaged by plague and war, reformed the liturgy (including what we now call Gregorian chant, though his direct role in its development is debated), wrote pastoral letters and homilies of lasting influence, and sent Augustine of Canterbury to evangelize the Anglo-Saxons — a mission that gave England its Catholic heritage. He insisted on calling himself "servant of the servants of God," a title that popes still use. He died in 604, leaving the Church stronger than he found it.`,
    patron_of: ['musicians', 'singers', 'teachers', 'popes'],
    prayer: null,
    image_url: null,
  },
  {
    name: 'Matthew',
    feast_day: '09-21',
    birth_year: null,
    death_year: null,
    summary: 'A tax collector called from his booth by Christ\'s simple word "Follow me," Matthew became an Apostle and Evangelist whose Gospel portrays Jesus as the fulfillment of Jewish prophecy.',
    biography: `Matthew — also called Levi — was a tax collector at Capernaum when Jesus passed by his tax booth and said simply, "Follow me." Matthew rose and followed. Tax collectors were despised as collaborators with Rome and notorious for enriching themselves at the expense of their neighbors; yet Jesus chose him not despite this background but, it seems, partly because of it.\n\nMatthew's first act was to throw a great banquet for Jesus at his home, inviting his colleagues — other tax collectors and "sinners." When the Pharisees objected, Jesus said, "I have not come to call the righteous, but sinners." This is the key to Matthew's Gospel: it is the Gospel of mercy extended across every boundary.\n\nHis Gospel is the most Jewish of the four — structured around five great discourses mirroring the five books of Moses, beginning with Jesus's genealogy traced back to Abraham, and full of Old Testament citations. He writes for Jewish Christians who need to see Christ as the fulfillment of everything they had hoped for. Tradition sends him to Ethiopia or Persia for his missionary work; he was martyred, though the manner is uncertain. He is patron of financial workers — a reminder that no background disqualifies anyone from being used by God.`,
    patron_of: ['accountants', 'bankers', 'tax collectors', 'financial workers'],
    prayer: null,
    image_url: null,
  },
  {
    name: 'Vincent de Paul',
    feast_day: '09-27',
    birth_year: 1581,
    death_year: 1660,
    summary: 'A French priest who organized systematic charity on an unprecedented scale, Vincent de Paul founded the Vincentians and the Daughters of Charity to serve the poor as "our lords and masters."',
    biography: `Vincent de Paul was born in 1581 in Gascony, France, to a peasant family. He was ordained at nineteen — too young — and spent years seeking preferment and a comfortable living. His conversion came gradually through encounters with the poor and through the influence of his spiritual director Francis de Sales.\n\nIn 1617, called to preach at a country estate, he heard the confession of a dying man whose family had no idea he had unconfessed sins — and organized the parish women into the first "Confraternity of Charity" to serve the poor systematically. This seed grew over forty years into an empire of organized compassion: the Congregation of the Mission (Vincentians) for priests working among the rural poor, the Daughters of Charity (the first apostolic religious community for women working in the world), and hundreds of hospitals, orphanages, and relief operations.\n\nHe organized relief for the victims of the Thirty Years War, ransomed Christians enslaved in North Africa, cared for galley slaves in Marseilles, and helped establish seminaries across France. His method was always the same: see the need, organize the response, train others to continue the work. He died in 1660 at nearly eighty, still at work. He was canonized in 1737 and declared patron of charitable societies — the St. Vincent de Paul Society takes his name.`,
    patron_of: ['charitable societies', 'hospitals', 'prisoners', 'Madagascar'],
    prayer: null,
    image_url: null,
  },
  {
    name: 'Michael, Gabriel, Raphael',
    feast_day: '09-29',
    birth_year: null,
    death_year: null,
    summary: 'The three archangels named in Scripture, Michael the protector, Gabriel the messenger, and Raphael the healer, are celebrated together as the mightiest servants of God in the heavenly court.',
    biography: `Michael, whose name means "Who is like God?" — a rhetorical question implying no one — appears in Scripture as the warrior archangel who leads the heavenly armies. In Daniel, he is the "great prince who stands guard over" Israel. In Revelation, he leads the angels in the war against the dragon. Ancient tradition invokes him as protector of the Church and against evil, and the prayer to him composed after the First Vatican Council was recited after every Low Mass for decades.\n\nGabriel, whose name means "God is my strength" or "hero of God," appears as God's primary messenger at the most significant moments: explaining Daniel's visions, announcing the birth of John the Baptist to Zechariah, and appearing to Mary at the Annunciation with the words that changed history: "Hail, full of grace, the Lord is with you."\n\nRaphael, whose name means "God heals," appears in the book of Tobit as the traveling companion of young Tobiah, healing his father Tobit's blindness and protecting Tobiah's wife Sarah. He identifies himself at the end: "I am Raphael, one of the seven angels who stand and serve before the Glory of the Lord." He is the patron of healing and medicine.\n\nTheir shared feast reminds us that the spiritual universe is inhabited by powerful beings entirely devoted to God's will — a truth easy to forget in a material age.`,
    patron_of: ['Michael: soldiers, police, paramedics, mariners', 'Gabriel: communications workers, messengers, broadcasters', 'Raphael: travelers, blind people, pharmacists, physicians'],
    prayer: 'Saint Michael the Archangel, defend us in battle. Be our protection against the wickedness and snares of the devil. May God rebuke him, we humbly pray; and do thou, O Prince of the heavenly host, by the power of God, cast into hell Satan and all the evil spirits who prowl about the world seeking the ruin of souls. Amen.',
    image_url: null,
  },
  {
    name: 'Jerome',
    feast_day: '09-30',
    birth_year: 342,
    death_year: 420,
    summary: 'Doctor of the Church and the greatest biblical scholar of antiquity, Jerome translated the entire Bible into Latin — the Vulgate — which remained the standard biblical text of Western Christianity for a thousand years.',
    biography: `Jerome was born around 342 in Stridon, Dalmatia, and received an excellent classical education in Rome. He was baptized as a young man but lived a worldly life until a fever brought him near death and he experienced a vision in which he was condemned for being "a Ciceronian, not a Christian" — more devoted to pagan literature than to Scripture. He resolved to change his life.\n\nHe lived as a hermit in the Syrian desert, studying Hebrew from a Jewish convert under conditions of great physical discomfort, his fiery temperament making solitude both necessary and difficult. Called to Rome by Pope Damasus, he was commissioned to revise the Latin Bible and became spiritual director to a circle of learned Roman women — Paula, Marcella, Eustochium — who studied Hebrew with him.\n\nAfter Damasus's death, Jerome's sharp tongue had made him too many enemies in Rome. He traveled to the Holy Land with Paula and her daughter Eustochium, settling in Bethlehem, where he spent the remaining thirty-five years of his life in a monastery, translating and commenting on Scripture with ferocious energy. His Vulgate Latin Bible — translated from the original languages, not from the Greek Septuagint — shaped Western theology, art, and culture for a millennium. He died in 420, having written more than any Church Father except Augustine.`,
    patron_of: ['librarians', 'translators', 'archaeologists', 'students of Scripture'],
    prayer: null,
    image_url: null,
  },

  // ── OCTOBER ───────────────────────────────────────────────
  {
    name: 'Thérèse of Lisieux',
    feast_day: '10-01',
    birth_year: 1873,
    death_year: 1897,
    summary: 'A Carmelite nun who died at 24 and never left her convent, Thérèse\'s "little way" of spiritual childhood became one of the most widely-read spiritual teachings in history.',
    biography: `Marie-Françoise-Thérèse Martin was born in Alençon, France in 1873, the youngest of five daughters in a deeply devout family. Her mother died of cancer when Thérèse was four, leaving a wound that shaped her soul. At fifteen — after personally appealing to Pope Leo XIII — she received permission to enter the Carmelite convent at Lisieux, where three of her sisters already lived.\n\nHer life in Carmel was outwardly unremarkable: she swept corridors, worked in the sacristy, helped the novices. No great visions or extraordinary penances. But her inner life was something extraordinary. Struggling with aridity in prayer and doubts about faith, she discovered what she called the "little way" — a path of radical trust in God's love, of offering every small action and suffering as love, of accepting spiritual helplessness as the condition that makes God's grace most powerful.\n\nOn doctor's orders she wrote her memoirs — "Story of a Soul" — in three notebooks. Published after her death from tuberculosis in 1897 at age twenty-four, it spread across the world with almost supernatural speed, translated into dozens of languages. She was canonized in 1925, declared a Doctor of the Church in 1997 — the youngest person and one of only four women to receive that title — and named co-patron of missions, which she had longed to join.`,
    patron_of: ['missions', 'France', 'florists', 'those with AIDS', 'aviators'],
    prayer: "O Little Thérèse of the Child Jesus, please pick for me a rose from the heavenly gardens and send it to me as a message of love. O Little Flower of Jesus, ask God today to grant the favors I now place with confidence in your hands. St. Thérèse, help me to always believe as you did, in God's great love for me, so that I might imitate your 'Little Way' each day. Amen.",
    image_url: null,
  },
  {
    name: 'Francis of Assisi',
    feast_day: '10-04',
    birth_year: 1181,
    death_year: 1226,
    summary: 'The poverello who kissed the leper, rebuilt churches, preached to birds, and received the stigmata, Francis of Assisi remains the most universally beloved saint in Christian history.',
    biography: `Giovanni di Pietro di Bernardone was born in Assisi around 1181, the son of a wealthy cloth merchant. He lived a carefree youth of parties and dreams of knightly glory until he was captured in battle, imprisoned for a year, and then fell gravely ill. During his recovery, the glitter of the world began to fade.\n\nThe decisive moment came before a crucifix in the ruined church of San Damiano, where he heard a voice: "Francis, rebuild my Church which has fallen into ruin." He took it literally, selling his father's cloth to pay for building materials. His father dragged him before the bishop for restitution; Francis stripped off his clothes, handed them back, and declared he had no father but God.\n\nFor the next twenty years he lived in radical poverty, attracting followers by the thousands. He founded the Friars Minor (Lesser Brothers) — who were to own nothing, not even their churches. He preached to birds, negotiated with the Sultan al-Kamil during the Crusades (possibly the most remarkable peace mission in medieval history), and in 1224 received the stigmata — the five wounds of Christ — becoming the first person in history whose stigmatization is well-documented. He died singing in 1226, having asked to be laid on the bare earth. His "Canticle of Creatures" is the first great poem in Italian literature.`,
    patron_of: ['animals', 'ecology', 'Italy', 'merchants', 'zoos', 'the environment'],
    prayer: 'Lord, make me an instrument of your peace. Where there is hatred, let me sow love; where there is injury, pardon; where there is doubt, faith; where there is despair, hope; where there is darkness, light; where there is sadness, joy. O Divine Master, grant that I may not so much seek to be consoled as to console; to be understood as to understand; to be loved as to love. For it is in giving that we receive; it is in pardoning that we are pardoned; and it is in dying that we are born to eternal life. Amen.',
    image_url: null,
  },
  {
    name: 'Teresa of Avila',
    feast_day: '10-15',
    birth_year: 1515,
    death_year: 1582,
    summary: 'A Spanish Carmelite reformer and Doctor of the Church whose "Interior Castle" mapped the soul\'s journey to union with God, Teresa combined mystical depth with remarkable common sense and humor.',
    biography: `Teresa de Ahumada was born in Ávila, Spain in 1515. Entering the Carmelite convent at twenty, she spent the next eighteen years in a struggle between worldly attachments and her longing for God — a struggle she describes with disarming honesty in her autobiography. Around age 39, she experienced a definitive conversion before a statue of the wounded Christ, and her interior life deepened rapidly.\n\nShe began experiencing mystical phenomena: locutions, visions, levitations. Her experiences were tested rigorously by confessors — including Peter of Alcántara and eventually John of the Cross — who confirmed their authenticity. All this time she was governing a large convent and managing its affairs with practical intelligence that belied the image of a dreamy mystic.\n\nIn 1562, she founded a reformed Carmelite convent in Ávila — with only thirteen nuns, strict enclosure, and absolute poverty. In the next twenty years, despite enormous opposition, she founded seventeen more convents and, with John of the Cross, reformed the male Carmelites. Her mystical writings — The Life, The Way of Perfection, The Interior Castle — combined with a remarkable gift for friendship, humor, and common sense. She famously said, "God preserve us from gloomy saints." She died in 1582. She was declared a Doctor of the Church in 1970, the first woman so honored.`,
    patron_of: ['Spain', 'headache sufferers', 'chess players', 'people in need of grace'],
    prayer: 'Let nothing disturb you, let nothing frighten you. All things are passing away: God never changes. Patience obtains all things. Whoever has God lacks nothing; God alone suffices. Amen.',
    image_url: null,
  },
  {
    name: 'Luke',
    feast_day: '10-18',
    birth_year: null,
    death_year: null,
    summary: 'A physician and companion of Paul, Luke is the author of the Gospel that bears his name and the Acts of the Apostles, giving us the fullest account of Mary and the early Church.',
    biography: `Luke is identified by Paul as "the beloved physician" — the only Gentile author of a New Testament book. His Gospel, addressed to "Theophilus," is the longest of the four and the most literary: he writes with the grace of an educated Greek author, weaving together eyewitness testimony into a structured narrative.\n\nLuke's Gospel is uniquely attentive to women: it gives us the Annunciation, the Visitation, the Magnificat, and more detailed accounts of women disciples than any other Gospel. It is also the Gospel of mercy — the Prodigal Son, the Good Samaritan, Zacchaeus — and of prayer. Only Luke records the angel comforting Jesus in Gethsemane.\n\nThe Acts of the Apostles, Luke's second volume, is our primary source for the early Church — the coming of the Spirit at Pentecost, the martyrdom of Stephen, Paul's missionary journeys. Luke traveled with Paul on portions of those journeys, as the "we" passages reveal. Tradition holds that Luke also knew Mary personally and that his account of the Nativity and Annunciation came from her memory.\n\nHe is patron of physicians and artists — the latter because of an ancient tradition that he painted the first icon of the Virgin Mary. He reportedly died peacefully in Greece at a great age.`,
    patron_of: ['physicians', 'surgeons', 'artists', 'painters', 'students', 'butchers'],
    prayer: null,
    image_url: null,
  },

  // ── NOVEMBER ──────────────────────────────────────────────
  {
    name: 'All Saints',
    feast_day: '11-01',
    birth_year: null,
    death_year: null,
    summary: 'The feast honoring all the saints in heaven — named and unnamed — who rejoice in the presence of God and intercede for those still on earth.',
    biography: `All Saints\' Day honors not only the canonized saints whose feasts fill the liturgical calendar, but all those who have died in God\'s friendship and now share in his glory — the vast multitude whose names are known only to God.\n\nThe feast has ancient roots: the early Church celebrated the martyrs with great solemnity, and as the number of martyrs grew beyond what the calendar could contain, a common feast was instituted. Pope Gregory III (731-741) established November 1 as All Saints\' Day, dedicating a chapel in St. Peter\'s Basilica in honor of all the saints.\n\nThe theology behind the feast is one of the Church\'s great consolations: we are not alone in our pilgrimage. We are surrounded by a "great cloud of witnesses" — millions of souls who have completed the journey and now see God face to face, and who intercede continuously for those still on the way. The Church is not just the living community we can see, but a communion of the whole Body of Christ across time and eternity.\n\nThe evening before — All Hallows\' Eve, now Halloween — was once observed with solemnity as the vigil of this great feast. The customs surrounding it, whatever their commercial distortions, speak to the ancient human recognition that the boundary between the living and the dead is not as solid as we think.`,
    patron_of: null,
    prayer: null,
    image_url: null,
  },
  {
    name: 'Martin de Porres',
    feast_day: '11-03',
    birth_year: 1579,
    death_year: 1639,
    summary: 'A Dominican lay brother of mixed race in colonial Peru who cared for the sick and poor of all races and conditions, Martin de Porres was canonized as a symbol of racial justice and universal charity.',
    biography: `Martin de Porres was born in Lima, Peru in 1579, the illegitimate son of a Spanish nobleman and a freed black slave from Panama. The racial and social humiliations he suffered throughout his life would have embittered many; they seemed instead to deepen his compassion.\n\nAt fifteen he became a Dominican lay brother — a servant, not a full member of the community, because of his race. He accepted this with complete equanimity and threw himself into his work: tending the sick in the infirmary, running a shelter for the poor and orphaned children in Lima, and somehow finding time for long hours of prayer and severe physical penance.\n\nHis care extended to animals: he reportedly healed a dog, a cat, and a mouse that were eating together from the same bowl, persuading them to peacefully share. Stories multiplied of his miraculous healings, his bilocation, his ability to be in two places at once, his levitations during prayer. When the Dominican community fell into debt and the prior suggested selling some of the servants, Martin offered himself: "I am only a poor mulatto. Sell me."\n\nHe died in 1639, the whole city of Lima coming to venerate his body. He was canonized in 1962 by John XXIII, who invoked him as a patron of racial harmony and social justice — qualities his life had embodied three centuries before the civil rights era.`,
    patron_of: ['racial harmony', 'social justice', 'barbers', 'public health workers', 'Peru'],
    prayer: null,
    image_url: null,
  },
  {
    name: 'Cecilia',
    feast_day: '11-22',
    birth_year: null,
    death_year: 230,
    summary: 'A Roman martyr whose legend says she sang to God in her heart while the wedding music played, Cecilia has been venerated as patron of musicians for over fifteen centuries.',
    biography: `Cecilia was a young Roman noblewoman who had vowed her virginity to God when she was given in marriage to a young pagan named Valerian. On their wedding day, as the musicians played, she sang to God in her heart — the gesture that made her the patron of music. She told Valerian she had an angel of God as her protector; if he wished to see this angel, he must be baptized. He was, by Pope Urban I himself, and was converted. His brother Tiburtius was also converted.\n\nAll three were eventually arrested and martyred under the prefect Almachius. Cecilia was beheaded — but the executioner failed to sever her head completely with three strokes, leaving her to die slowly over three days, during which she continued to teach converts and distribute her goods to the poor. She died in an attitude of prayer with three fingers of one hand extended and one of the other — signifying, it was said, her belief in the Trinity and in the One God.\n\nHer remains were discovered in 1599 in the Basilica of Santa Cecilia in Trastevere, Rome, perfectly preserved and in the position in which she had died. The sculptor Stefano Maderno immortalized this moment in his famous marble statue. The Academy of Music in Rome, founded in 1584, took her as its patron, and from that decision grew the universal association of Cecilia with sacred music.`,
    patron_of: ['musicians', 'composers', 'poets', 'singers', 'music'],
    prayer: null,
    image_url: null,
  },
  {
    name: 'Andrew',
    feast_day: '11-30',
    birth_year: null,
    death_year: null,
    summary: 'The first Apostle called by Jesus, Andrew was Peter\'s brother and brought both Peter and others to Christ, making him the patron of the evangelical work of introduction.',
    biography: `Andrew was a fisherman from Bethsaida on the Sea of Galilee, the brother of Simon Peter. He appears first in the Gospel of John as a disciple of John the Baptist who, when the Baptist pointed to Jesus and said "Behold the Lamb of God," immediately followed Jesus. When asked where he was staying, Jesus said, "Come and see." Andrew stayed with him that day and then ran to find his brother: "We have found the Messiah." He brought Peter to Jesus — perhaps his greatest act.\n\nIn the Synoptic Gospels, Jesus calls Andrew and Peter together from their fishing nets. Andrew appears at key moments: it was he who brought the boy with the loaves and fishes to Jesus's attention at the multiplication; he and Philip together brought the Greeks who wished to see Jesus, prompting the discourse on the grain of wheat.\n\nTradition sends Andrew to preach in Scythia and Greece, where he was crucified on an X-shaped cross at Patras — he reportedly refused a standard cross as too similar to his Lord's, and was tied rather than nailed, prolonging his suffering over two days while he preached to the assembled crowd. His X-shaped cross, the "Saltire," appears on the flags of Scotland and the United Kingdom. He is patron of Scotland, which claims to possess his relics, brought there in the fourth century.`,
    patron_of: ['Scotland', 'Russia', 'Greece', 'fishermen', 'Romania'],
    prayer: null,
    image_url: null,
  },

  // ── DECEMBER ──────────────────────────────────────────────
  {
    name: 'Francis Xavier',
    feast_day: '12-03',
    birth_year: 1506,
    death_year: 1552,
    summary: 'Co-founder of the Jesuits who baptized hundreds of thousands across India, Japan, and Southeast Asia, Francis Xavier died on the threshold of China — the greatest missionary since Paul.',
    biography: `Francis Xavier was born in 1506 in the kingdom of Navarre, Spain, to a noble family. At Paris he became a friend and companion of Ignatius of Loyola and was one of the seven who made vows at Montmartre in 1534, forming the nucleus of the Society of Jesus. When a Jesuit companion fell ill, Francis was sent in his place to India — and thus began one of the most extraordinary missionary careers in history.\n\nIn Goa he worked among the sick in hospitals and prisoners in jails, and then moved to the Pearl Fishery Coast, where he baptized thousands of fisher families in the space of months, learning their language and teaching them the faith with a directness and simplicity that was irresistible. He moved relentlessly: to Malacca, the Moluccas, Ceylon, Japan — where he spent two years, learned Japanese, and established a thriving Christian community that would survive underground for two centuries.\n\nAt every stop he wrote long letters back to Europe — letters so vivid and inspiring that they practically created the modern missionary movement. He died in 1552 on the island of Sancian, within sight of the Chinese coast, waiting for passage that never came. He was forty-six years old. He had baptized an estimated half-million people. He was canonized in 1622, on the same day as Ignatius, his spiritual father.`,
    patron_of: ['missions', 'missionaries', 'Japan', 'Navarre', 'Goa'],
    prayer: null,
    image_url: null,
  },
  {
    name: 'Nicholas',
    feast_day: '12-06',
    birth_year: 270,
    death_year: 343,
    summary: 'Bishop of Myra whose legendary generosity — secretly providing dowries for three impoverished sisters — made him the basis for Santa Claus and the patron of children and the poor.',
    biography: `Nicholas was born around 270 AD in Patara, Lycia (modern Turkey), to wealthy Christian parents who died in an epidemic, leaving him a large inheritance. Inspired by the words of Jesus to "sell what you own and give the money to the poor," he gave away his entire wealth in acts of anonymous charity.\n\nThe most famous of these concerned a neighbor who had three daughters but no money for their dowries — without which they could not marry and would likely be sold into slavery. Nicholas came secretly in the night and threw bags of gold through the window (or, in some versions, down the chimney into stockings hung to dry) — once for each daughter. The neighbor discovered his identity on the third night and Nicholas swore him to secrecy.\n\nHe became Bishop of Myra and suffered imprisonment during Diocletian's persecution. He was reportedly present at the Council of Nicaea in 325, where tradition holds he struck the heretic Arius across the face — a story beloved for its human honesty, whatever its historical status. After his death in 343, his cult spread extraordinarily rapidly: within two centuries he had more churches dedicated to him in Constantinople than any saint except the Virgin Mary.\n\nHis relics were taken to Bari, Italy in 1087, where the Basilica di San Nicola remains a pilgrimage site. Through Dutch Sinterklaas traditions, he became the basis of Santa Claus.`,
    patron_of: ['children', 'sailors', 'merchants', 'students', 'Russia', 'the poor'],
    prayer: null,
    image_url: null,
  },
  {
    name: 'Juan Diego',
    feast_day: '12-09',
    birth_year: 1474,
    death_year: 1548,
    summary: 'An indigenous Mexican peasant to whom Our Lady of Guadalupe appeared in 1531, Juan Diego carries her miraculous image on his tilma — the most-visited Marian shrine in the world.',
    biography: `Juan Diego Cuauhtlatoatzin was born in 1474 near Texcoco, Mexico, into the indigenous Chichimec people. He converted to Christianity after the Spanish conquest and walked fifteen miles each week to attend Mass and catechism classes. He was a widower, living with his uncle, when the events of December 1531 began.\n\nOn December 9, walking to Mass, he heard music and saw a shining cloud. A young woman appeared, radiant as the sun, speaking to him in his own language of Nahuatl: "Know and understand well, my most humble son, that I am the ever-virgin Holy Mary." She asked him to go to the Bishop of Mexico, Juan de Zumárraga, and request that a church be built in her honor.\n\nThe bishop was skeptical and asked for a sign. On December 12, Juan Diego found Castilian roses blooming on the rocky, winter hillside of Tepeyac — a miracle in itself — and gathered them in his tilma (cloak). When he opened his cloak before the bishop, the flowers fell out and revealed on the fabric a perfect image of Our Lady: dark-skinned, clothed with the sun, standing on the moon, surrounded by stars. The image has never been adequately explained by science — it shows no brushstrokes and contains microscopic images in the eyes.\n\nThe Basilica of Our Lady of Guadalupe in Mexico City now receives over twenty million pilgrims annually — more than any other Catholic shrine in the world. Juan Diego was canonized in 2002.`,
    patron_of: ['indigenous people of the Americas', 'Mexico'],
    prayer: null,
    image_url: null,
  },
  {
    name: 'John of the Cross',
    feast_day: '12-14',
    birth_year: 1542,
    death_year: 1591,
    summary: 'A Spanish Carmelite mystic and Doctor of the Church whose poetry and spiritual writing on the "Dark Night of the Soul" map the deepest reaches of the soul\'s journey to God.',
    biography: `Juan de Yepes y Álvarez was born in Fontiveros, Spain in 1542 to a poor weaver family. His father died when John was young, and he grew up in poverty. After studies with the Jesuits and work in a hospital, he entered the Carmelites, intending to join the stricter Carthusian order for a more contemplative life. Instead, he met Teresa of Avila, who persuaded him to join her reform of the Carmelites.\n\nThe reform was violently opposed by the unreformed Carmelites. In 1577, John was kidnapped, imprisoned in a tiny cell in Toledo, given one ration of bread and water per day, and regularly flogged before the community at meals. In this dark prison, in darkness and cold, he composed some of the greatest spiritual poetry in any language — the Spiritual Canticle and the beginning of the Dark Night — working the poems out in his memory before he could write them down.\n\nHe escaped after nine months by lowering himself from a window at night. He went on to govern Carmelite houses and write his great prose commentaries on his poems: The Ascent of Mount Carmel, The Dark Night, The Living Flame of Love, The Spiritual Canticle. These texts, which map with extraordinary precision the soul\'s painful purification and ultimate union with God, have been recognized as the summit of Christian mysticism. He died in 1591, having asked to die in a house where no one knew him. He was canonized in 1726 and declared a Doctor of the Church in 1926.`,
    patron_of: ['mystics', 'contemplatives', 'Spanish poets'],
    prayer: 'O Holy Spirit, divine fire, consume me with your love. O most Holy Trinity, live in me. O my God and my all, may I love you with my whole heart, and my neighbor as myself for love of you. Amen.',
    image_url: null,
  },
  {
    name: 'Stephen',
    feast_day: '12-26',
    birth_year: null,
    death_year: 34,
    summary: 'The first Christian martyr, Stephen was one of the seven deacons of the Jerusalem Church who was stoned to death while forgiving his killers and seeing a vision of the glorified Christ.',
    biography: `Stephen is described in the Acts of the Apostles as "a man full of faith and the Holy Spirit," one of seven men chosen by the Apostles to care for the widows and poor of the Jerusalem community — the first deacons. He was also a powerful preacher and miracle worker, and his debates with the members of various synagogues could not be refuted.\n\nHis opponents had him arrested and brought before the Sanhedrin on charges of blasphemy. His defense speech — the longest speech in Acts — is a sweeping recounting of Israel's history that concludes with a fierce indictment of the council as those who have always persecuted the prophets and have now murdered the Righteous One. At that moment, he saw a vision: "Behold, I see the heavens opened, and the Son of Man standing at the right hand of God."\n\nThe crowd covered their ears, rushed on him, and drove him out of the city to stone him. As the stones fell, he prayed, "Lord Jesus, receive my spirit" — consciously echoing Christ's words on the cross — and then knelt and prayed, "Lord, do not hold this sin against them." And then he died. Among the witnesses was a young man named Saul, who approved of the execution and held the cloaks of those doing the stoning. Stephen's prayer may have contributed to Saul's eventual conversion.`,
    patron_of: ['deacons', 'stonemasons', 'headache sufferers', 'bricklayers'],
    prayer: null,
    image_url: null,
  },
  {
    name: 'John the Apostle',
    feast_day: '12-27',
    birth_year: 6,
    death_year: 100,
    summary: 'The "Beloved Disciple" who stood at the foot of the Cross and received Mary into his care, John the Apostle wrote the fourth Gospel, three epistles, and the Book of Revelation.',
    biography: `John was the son of Zebedee the fisherman and Salome, and the younger brother of James. With Peter and James he formed the inner circle of the Twelve — present at the Transfiguration, in Gethsemane, at the high priest's courtyard. He is almost certainly the "Beloved Disciple" of the fourth Gospel who reclined next to Jesus at the Last Supper and ran to the empty tomb with Peter.\n\nHe was the only Apostle present at the Crucifixion, standing with Mary. Jesus's final act from the Cross was to give his mother into John's care: "Woman, behold your son... Behold your mother." John took her into his own home. This makes John uniquely the guardian of Mary's memory — which may explain the Marian richness of the Johannine writings.\n\nAfter Pentecost, John worked with Peter in Jerusalem and was imprisoned with him. He later went to Ephesus with Mary. The tradition of his authorship of the fourth Gospel, three epistles, and Revelation is ancient, though debated by scholars. The Gospel of John, with its soaring Prologue ("In the beginning was the Word"), its "I am" sayings, and its profound theology of love, has been called "the spiritual Gospel."\n\nUnlike the other Apostles, John reportedly died peacefully of old age in Ephesus around 100 AD — tradition says after being thrown into boiling oil and emerging unharmed. His last recorded words were simply: "Little children, love one another."`,
    patron_of: ['love', 'loyalty', 'authors', 'editors', 'theologians'],
    prayer: null,
    image_url: null,
  },
]

async function seed() {
  console.log(`\nSeeding ${saints.length} saints...\n`)
  let inserted = 0
  let skipped = 0
  let errors = 0

  for (const saint of saints) {
    // Check if already exists
    const { data: existing } = await supabase
      .from('saints')
      .select('id')
      .eq('name', saint.name)
      .maybeSingle()

    if (existing) {
      console.log(`  ⟳ Skip: ${saint.name} (already exists)`)
      skipped++
      continue
    }

    const { error } = await supabase.from('saints').insert(saint)

    if (error) {
      console.error(`  ✗ Error: ${saint.name} — ${error.message}`)
      errors++
    } else {
      console.log(`  ✓ Inserted: ${saint.name}`)
      inserted++
    }
  }

  console.log(`\n── Summary ──────────────────`)
  console.log(`  Inserted: ${inserted}`)
  console.log(`  Skipped:  ${skipped}`)
  console.log(`  Errors:   ${errors}`)
  console.log(`────────────────────────────\n`)

  if (errors > 0) process.exit(1)
}

seed().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
