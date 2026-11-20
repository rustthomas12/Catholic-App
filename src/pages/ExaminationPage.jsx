import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import TopBar from '../components/shared/TopBar'
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { ShieldCheckIcon } from '@heroicons/react/24/solid'
import { useTranslation } from 'react-i18next'

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

// Spanish version of the same examination
const SECTIONS_ES = [
  {
    title: 'Primer mandamiento',
    subtitle: 'Yo soy el Señor tu Dios. No tendrás otros dioses fuera de mí.',
    questions: [
      '¿He dudado de mi fe o la he negado?',
      '¿He descuidado la oración o la he hecho deprisa y sin atención?',
      '¿He dado una importancia excesiva a las cosas materiales, al entretenimiento o a otra persona, dedicándoles más tiempo y atención que a Dios?',
      '¿He consultado horóscopos o adivinos, o he caído en prácticas supersticiosas?',
      '¿He sido desagradecido por las bendiciones de Dios?',
      '¿He desesperado de la misericordia de Dios o he abusado de ella?',
    ],
  },
  {
    title: 'Segundo mandamiento',
    subtitle: 'No tomarás el nombre del Señor tu Dios en vano.',
    questions: [
      '¿He usado sin respeto el nombre de Dios, de Jesús o de los santos?',
      '¿He hecho un juramento falso o he jurado por el nombre de Dios mintiendo?',
      '¿He maldecido o blasfemado contra Dios?',
      '¿He dejado de tratar con la debida reverencia las cosas sagradas: iglesias, sacramentos, objetos benditos?',
    ],
  },
  {
    title: 'Tercer mandamiento',
    subtitle: 'Santificarás el día del Señor.',
    questions: [
      '¿He faltado a misa los domingos o días de precepto sin una razón grave?',
      '¿He estado distraído a propósito o he sido irrespetuoso durante la misa?',
      '¿He hecho en domingo trabajos innecesarios que podía haber hecho otro día?',
      '¿He dejado de descansar, rezar o pasar tiempo con mi familia el domingo?',
    ],
  },
  {
    title: 'Cuarto mandamiento',
    subtitle: 'Honrarás a tu padre y a tu madre.',
    questions: [
      '¿He sido desobediente, irrespetuoso o poco amable con mis padres?',
      '¿He descuidado mis deberes con mi cónyuge o mis hijos?',
      '¿He dejado de cuidar a familiares mayores o enfermos?',
      '¿He faltado al respeto a la autoridad legítima: en la Iglesia, en el trabajo o en la vida civil?',
      '¿He dado mal ejemplo a los niños a mi cargo?',
    ],
  },
  {
    title: 'Quinto mandamiento',
    subtitle: 'No matarás.',
    questions: [
      '¿He hecho daño físico a alguien o lo he puesto en peligro por imprudencia?',
      '¿He guardado odio, rencor o deseos de venganza contra alguien?',
      '¿Me he negado a perdonar a alguien que me ofendió?',
      '¿He dado escándalo, llevando a otros a pecar con mis palabras o mi ejemplo?',
      '¿He abusado del alcohol o de las drogas, o me he comportado de forma dañina para mi salud?',
      '¿He hablado o actuado de modo que dañara la reputación de otra persona?',
    ],
  },
  {
    title: 'Sexto y noveno mandamientos',
    subtitle: 'No cometerás adulterio. No desearás la mujer de tu prójimo.',
    questions: [
      '¿He sido infiel a mi cónyuge de pensamiento, palabra u obra?',
      '¿Me he detenido voluntariamente en pensamientos o deseos impuros?',
      '¿He visto pornografía u otro material impuro?',
      '¿He tenido relaciones sexuales fuera del matrimonio?',
      '¿Me he vestido o he hablado de forma inmodesta?',
      '¿He usado anticonceptivos artificiales?',
    ],
  },
  {
    title: 'Séptimo y décimo mandamientos',
    subtitle: 'No robarás. No codiciarás los bienes ajenos.',
    questions: [
      '¿He robado, hecho trampa o defraudado a alguien?',
      '¿He desperdiciado el tiempo o los recursos de mi empleador?',
      '¿He dejado de pagar deudas o de devolver lo que me prestaron?',
      '¿He sentido envidia o celos de los bienes o el éxito de otros?',
      '¿He estado demasiado apegado al dinero o a las cosas materiales?',
      '¿He dejado de ayudar a los necesitados cuando podía hacerlo?',
    ],
  },
  {
    title: 'Octavo mandamiento',
    subtitle: 'No darás falso testimonio contra tu prójimo.',
    questions: [
      '¿He mentido a propósito, aunque fuera en cosas pequeñas?',
      '¿He chismeado o difundido sin necesidad información que perjudica a otros?',
      '¿He juzgado a otros con dureza o falta de caridad?',
      '¿He dañado la reputación de alguien con rumores o murmuraciones?',
      '¿He dejado de guardar un secreto que me confiaron?',
    ],
  },
  {
    title: 'Preceptos de la Iglesia',
    subtitle: 'Lo mínimo que la Iglesia pide para la vida católica.',
    questions: [
      '¿He comulgado al menos una vez durante el tiempo de Pascua?',
      '¿He confesado mis pecados mortales al menos una vez al año?',
      '¿He guardado los días de ayuno y abstinencia establecidos?',
      '¿He ayudado al sostenimiento de la Iglesia según mis posibilidades?',
      '¿He cumplido las leyes de la Iglesia sobre el matrimonio?',
    ],
  },
  {
    title: 'Examen general',
    subtitle: 'Una reflexión más sobre tu vida interior.',
    questions: [
      '¿He sido orgulloso o arrogante: rechazando la corrección, presumiendo, poniéndome por encima de los demás?',
      '¿He sido perezoso en la oración, la lectura espiritual o el crecimiento en la virtud?',
      '¿Me he enojado con facilidad o me ha costado perdonar?',
      '¿He perdido el tiempo que podía haber usado para servir a Dios o a los demás?',
      '¿He dejado de hacer obras de misericordia cuando tuve ocasión?',
      '¿He sido tibio en mi fe, ni frío ni caliente?',
    ],
  },
]

function Section({ section, isOpen, onToggle }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-lightbg transition-colors"
      >
        <div className="flex-1 min-w-0 pr-3">
          <p className="font-bold text-navy text-sm">{section.title}</p>
          <p className="text-gray-500 text-xs mt-0.5 leading-snug">{section.subtitle}</p>
        </div>
        {isOpen
          ? <ChevronDownIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
          : <ChevronRightIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />}
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
  const { t, i18n } = useTranslation()
  const sections = i18n.language?.startsWith('es') ? SECTIONS_ES : SECTIONS
  useEffect(() => { document.title = `${t('faith:exam.examination_of_conscience', 'Examination of Conscience')} | inFold` }, [t])
  const [openSection, setOpenSection] = useState(null)
  const [expandAll, setExpandAll] = useState(false)

  function toggle(i) {
    setExpandAll(false)
    setOpenSection(prev => prev === i ? null : i)
  }

  return (
    <div className="min-h-screen bg-cream md:pl-60">
      <div className="max-w-lg mx-auto pb-24">

        <TopBar variant="navy" title={t('faith:exam.examination_of_conscience', 'Examination of Conscience')} back />
        <div className="bg-navy px-4 pb-6">
          <p className="text-gold text-xs font-semibold uppercase tracking-widest ml-10">{t('faith:exam.sacrament_of_penance', 'Sacrament of Penance')}</p>
          <p className="text-white/75 text-sm ml-10 mt-1">{t('faith:exam.prepare_your_heart_and_mind_before', 'Prepare your heart and mind before Confession.')}</p>
        </div>

        <div className="px-4 pt-5 space-y-4">

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
            <p className="text-navy text-sm font-semibold mb-2">{t('faith:exam.before_you_begin_pray', 'Before you begin, pray:')}</p>
            <p className="text-gray-600 text-sm leading-relaxed italic">
              {t('faith:exam.come_holy_spirit', '"Come, Holy Spirit, enlighten my mind that I may know my sins clearly, and move my heart to true contrition. Help me to make a sincere and complete confession."')}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{t('faith:exam.sections', '{{count}} sections', { count: sections.length })}</p>
            <button onClick={() => setExpandAll(v => !v)} className="text-xs font-semibold text-navy hover:text-gold transition-colors">
              {expandAll ? t('faith:exam.collapse_all', 'Collapse all') : t('faith:exam.expand_all', 'Expand all')}
            </button>
          </div>

          {sections.map((section, i) => (
            <Section
              key={i}
              section={section}
              isOpen={expandAll || openSection === i}
              onToggle={() => toggle(i)}
            />
          ))}

          <div className="bg-gold/10 border border-gold/20 rounded-2xl px-5 py-4">
            <p className="text-navy font-bold text-sm mb-2">{t('faith:exam.act_of_contrition', 'Act of Contrition:')}</p>
            <p className="text-gray-700 text-sm leading-relaxed italic">
              {t('faith:exam.act_of_contrition_text', '"O my God, I am heartily sorry for having offended Thee, and I detest all my sins because of Thy just punishments, but most of all because they offend Thee, my God, Who art all-good and deserving of all my love. I firmly resolve, with the help of Thy grace, to sin no more and to avoid the near occasions of sin. Amen."')}
            </p>
          </div>

          <Link
            to="/premium/confession-tracker"
            className="flex items-center justify-between bg-navy text-white rounded-2xl px-5 py-4 hover:bg-navy/90 transition-colors"
          >
            <div className="flex items-center gap-3">
              <ShieldCheckIcon className="w-5 h-5 text-gold" />
              <div>
                <p className="font-semibold text-sm">{t('faith:exam.log_your_confession', 'Log your Confession')}</p>
                <p className="text-white/50 text-xs">{t('faith:exam.track_your_last_confession_date', 'Track your last confession date')}</p>
              </div>
            </div>
            <ChevronRightIcon className="w-4 h-4 text-white/70" />
          </Link>

        </div>
      </div>
    </div>
  )
}
