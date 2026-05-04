import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ChevronLeftIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { ShieldCheckIcon } from '@heroicons/react/24/solid'

const SECTIONS = [
  {
    title: 'First Commandment',
    subtitle: 'I am the Lord your God. You shall have no other gods before me.',
    questions: [
      'Have I doubted or denied my faith?',
      'Have I neglected prayer, or rushed through it carelessly?',
      'Have I placed excessive importance on material things, entertainment, or another person — giving them more time and attention than God?',
      'Have I consulted horoscopes, fortune tellers, or engaged in superstitious practices?',
      'Have I been ungrateful for God\'s blessings?',
      'Have I despaired of God\'s mercy, or presumed upon it?',
    ],
  },
  {
    title: 'Second Commandment',
    subtitle: 'You shall not take the name of the Lord your God in vain.',
    questions: [
      'Have I used the name of God, Jesus, or the saints irreverently?',
      'Have I made a false oath or sworn by God\'s name while lying?',
      'Have I cursed or spoken blasphemy against God?',
      'Have I failed to treat sacred things — churches, sacraments, holy objects — with proper reverence?',
    ],
  },
  {
    title: 'Third Commandment',
    subtitle: 'Remember to keep holy the Lord\'s Day.',
    questions: [
      'Have I missed Mass on Sundays or Holy Days of Obligation without a serious reason?',
      'Have I been deliberately distracted or disrespectful during Mass?',
      'Have I done unnecessary work on Sunday that could have been done another day?',
      'Have I failed to rest, pray, or spend time with family on Sunday?',
    ],
  },
  {
    title: 'Fourth Commandment',
    subtitle: 'Honor your father and your mother.',
    questions: [
      'Have I been disobedient, disrespectful, or unkind to my parents?',
      'Have I neglected my duties to my spouse or children?',
      'Have I failed to care for elderly or sick family members?',
      'Have I failed to respect lawful authority — in the Church, at work, or in civil life?',
      'Have I set a bad example for children in my care?',
    ],
  },
  {
    title: 'Fifth Commandment',
    subtitle: 'You shall not kill.',
    questions: [
      'Have I harmed someone physically or through reckless behavior?',
      'Have I harbored hatred, resentment, or a desire for revenge toward anyone?',
      'Have I refused to forgive someone who wronged me?',
      'Have I given scandal — leading others to sin by my words or example?',
      'Have I abused alcohol, drugs, or behaved in ways harmful to my own health?',
      'Have I spoken or acted in ways that damaged another person\'s reputation?',
    ],
  },
  {
    title: 'Sixth & Ninth Commandments',
    subtitle: 'You shall not commit adultery. You shall not covet your neighbor\'s wife.',
    questions: [
      'Have I been unfaithful to my spouse in thought, word, or deed?',
      'Have I deliberately entertained impure thoughts or desires?',
      'Have I viewed pornography or other impure material?',
      'Have I engaged in sexual activity outside of marriage?',
      'Have I dressed or spoken immodestly?',
      'Have I used artificial contraception?',
    ],
  },
  {
    title: 'Seventh & Tenth Commandments',
    subtitle: 'You shall not steal. You shall not covet your neighbor\'s goods.',
    questions: [
      'Have I stolen, cheated, or defrauded someone?',
      'Have I wasted my employer\'s time or resources?',
      'Have I failed to repay debts or return borrowed items?',
      'Have I been envious or jealous of another\'s possessions or success?',
      'Have I been excessively attached to money or material things?',
      'Have I failed to give to those in need when I was able?',
    ],
  },
  {
    title: 'Eighth Commandment',
    subtitle: 'You shall not bear false witness against your neighbor.',
    questions: [
      'Have I lied deliberately, even in small matters?',
      'Have I gossiped or shared damaging information unnecessarily?',
      'Have I judged others harshly or uncharitably?',
      'Have I damaged someone\'s reputation through rumor or detraction?',
      'Have I failed to keep a secret I was trusted to keep?',
    ],
  },
  {
    title: 'Precepts of the Church',
    subtitle: 'The Church\'s minimum expectations for Catholic life.',
    questions: [
      'Have I received Holy Communion at least once during the Easter season?',
      'Have I confessed my mortal sins at least once a year?',
      'Have I observed the prescribed days of fasting and abstinence?',
      'Have I contributed to the support of the Church according to my ability?',
      'Have I observed the laws of the Church regarding marriage?',
    ],
  },
  {
    title: 'General Examination',
    subtitle: 'Further reflection on your inner life.',
    questions: [
      'Have I been proud or arrogant — refusing correction, boasting, putting myself above others?',
      'Have I been slothful in prayer, spiritual reading, or growth in virtue?',
      'Have I been quick to anger, or slow to forgive?',
      'Have I wasted time I could have used to serve God or others?',
      'Have I failed to perform works of mercy when I had the opportunity?',
      'Have I been lukewarm in my faith — neither hot nor cold?',
    ],
  },
]

function Section({ section, isOpen, onToggle }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-lightbg transition-colors"
      >
        <div className="flex-1 min-w-0 pr-3">
          <p className="font-bold text-navy text-sm">{section.title}</p>
          <p className="text-gray-400 text-xs mt-0.5 leading-snug">{section.subtitle}</p>
        </div>
        {isOpen
          ? <ChevronDownIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
          : <ChevronRightIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />}
      </button>
      {isOpen && (
        <div className="px-5 pb-5 border-t border-gray-50">
          <ul className="space-y-3 pt-4">
            {section.questions.map((q, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-gold mt-2 flex-shrink-0" />
                <p className="text-gray-700 text-sm leading-relaxed">{q}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default function ExaminationPage() {
  useEffect(() => { document.title = 'Examination of Conscience | Communio' }, [])
  const navigate = useNavigate()
  const [openSection, setOpenSection] = useState(null)
  const [expandAll, setExpandAll] = useState(false)

  function toggle(i) {
    setExpandAll(false)
    setOpenSection(prev => prev === i ? null : i)
  }

  return (
    <div className="min-h-screen bg-cream md:pl-60">
      <div className="max-w-lg mx-auto pb-24">

        <div className="bg-navy px-4 pt-5 pb-6">
          <div className="flex items-center gap-3 mb-1">
            <button onClick={() => navigate(-1)} className="text-white/70 hover:text-white p-1 transition-colors">
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <div>
              <p className="text-gold text-xs font-semibold uppercase tracking-widest">Sacrament of Penance</p>
              <h1 className="text-white font-bold text-xl">Examination of Conscience</h1>
            </div>
          </div>
          <p className="text-white/50 text-sm ml-8 mt-1">Prepare your heart and mind before Confession.</p>
        </div>

        <div className="px-4 pt-5 space-y-4">

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
            <p className="text-navy text-sm font-semibold mb-2">Before you begin, pray:</p>
            <p className="text-gray-600 text-sm leading-relaxed italic">
              "Come, Holy Spirit, enlighten my mind that I may know my sins clearly, and move my heart to true contrition. Help me to make a sincere and complete confession."
            </p>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{SECTIONS.length} sections</p>
            <button onClick={() => setExpandAll(v => !v)} className="text-xs font-semibold text-navy hover:text-gold transition-colors">
              {expandAll ? 'Collapse all' : 'Expand all'}
            </button>
          </div>

          {SECTIONS.map((section, i) => (
            <Section
              key={i}
              section={section}
              isOpen={expandAll || openSection === i}
              onToggle={() => toggle(i)}
            />
          ))}

          <div className="bg-gold/10 border border-gold/20 rounded-2xl px-5 py-4">
            <p className="text-navy font-bold text-sm mb-2">Act of Contrition:</p>
            <p className="text-gray-700 text-sm leading-relaxed italic">
              "O my God, I am heartily sorry for having offended Thee, and I detest all my sins because of Thy just punishments, but most of all because they offend Thee, my God, Who art all-good and deserving of all my love. I firmly resolve, with the help of Thy grace, to sin no more and to avoid the near occasions of sin. Amen."
            </p>
          </div>

          <Link
            to="/premium/confession-tracker"
            className="flex items-center justify-between bg-navy text-white rounded-2xl px-5 py-4 hover:bg-navy/90 transition-colors"
          >
            <div className="flex items-center gap-3">
              <ShieldCheckIcon className="w-5 h-5 text-gold" />
              <div>
                <p className="font-semibold text-sm">Log your Confession</p>
                <p className="text-white/50 text-xs">Track your last confession date</p>
              </div>
            </div>
            <ChevronRightIcon className="w-4 h-4 text-white/40" />
          </Link>

        </div>
      </div>
    </div>
  )
}
