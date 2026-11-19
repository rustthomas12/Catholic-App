import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth.jsx'
import { format, subDays } from 'date-fns'

export const DAILY_MYSTERIES = {
  0: 'glorious',   // Sunday
  1: 'joyful',     // Monday
  2: 'sorrowful',  // Tuesday
  3: 'glorious',   // Wednesday
  4: 'luminous',   // Thursday
  5: 'sorrowful',  // Friday
  6: 'joyful',     // Saturday
}

export const MYSTERY_NAMES = {
  joyful:    'Joyful Mysteries',
  sorrowful: 'Sorrowful Mysteries',
  glorious:  'Glorious Mysteries',
  luminous:  'Luminous Mysteries',
}

export const MYSTERY_INITIAL = {
  joyful: 'J', sorrowful: 'S', glorious: 'G', luminous: 'L',
}

export const MYSTERIES = {
  joyful: [
    { title: 'The Annunciation', description: 'The angel Gabriel announces to Mary that she will conceive and bear the Son of God. Mary\'s "yes" to God opens the door to our salvation.' },
    { title: 'The Visitation', description: 'Mary visits her cousin Elizabeth. At Mary\'s greeting, John the Baptist leaps in the womb, filled with the Holy Spirit.' },
    { title: 'The Nativity', description: 'Jesus is born in a stable in Bethlehem, wrapped in swaddling clothes and laid in a manger. The Word becomes flesh.' },
    { title: 'The Presentation in the Temple', description: 'Mary and Joseph present the infant Jesus in the Temple. Simeon recognizes him as the salvation prepared for all peoples.' },
    { title: 'The Finding of Jesus in the Temple', description: 'After three days of searching, Mary and Joseph find the twelve-year-old Jesus in the Temple, "about his Father\'s business."' },
  ],
  sorrowful: [
    { title: 'The Agony in the Garden', description: 'Jesus prays in Gethsemane, sweating blood in his anguish. "Not my will, but yours be done." He is betrayed and arrested.' },
    { title: 'The Scourging at the Pillar', description: 'Jesus is bound and scourged — his body broken by blows. By his wounds we are healed.' },
    { title: 'The Crowning with Thorns', description: 'Soldiers mock Jesus as King, pressing thorns into his head. He accepts the humiliation in silence.' },
    { title: 'The Carrying of the Cross', description: 'Jesus carries his cross through the streets of Jerusalem, falls, and rises — bearing the weight of our sin.' },
    { title: 'The Crucifixion', description: 'Jesus is nailed to the cross and dies. "Father, into your hands I commend my spirit." The greatest act of love in history.' },
  ],
  glorious: [
    { title: 'The Resurrection', description: 'On the third day, Jesus rises from the dead — the firstborn from among the dead, the guarantee of our own resurrection.' },
    { title: 'The Ascension', description: 'Forty days after Easter, Jesus ascends to the Father. He goes to prepare a place for us and sends the Holy Spirit.' },
    { title: 'The Descent of the Holy Spirit', description: 'At Pentecost, the Holy Spirit descends on the disciples as tongues of fire. The Church is born.' },
    { title: 'The Assumption of Mary', description: 'At the end of her earthly life, Mary is taken body and soul into heavenly glory — a sign of our own destiny.' },
    { title: 'The Coronation of Mary', description: 'Mary is crowned Queen of Heaven and Earth — the first of the redeemed, the model of the Church, our Mother and intercessor.' },
  ],
  luminous: [
    { title: 'The Baptism of Jesus', description: 'Jesus is baptized in the Jordan. The heavens open: "This is my beloved Son, in whom I am well pleased."' },
    { title: 'The Wedding at Cana', description: 'At Mary\'s intercession, Jesus performs his first miracle — turning water into wine. His hour has come.' },
    { title: 'The Proclamation of the Kingdom', description: 'Jesus proclaims the Kingdom of God and calls all to repentance, healing the sick and forgiving sinners.' },
    { title: 'The Transfiguration', description: 'On Mount Tabor, Jesus is transfigured in glory. Moses and Elijah appear. "Listen to him."' },
    { title: 'The Institution of the Eucharist', description: 'At the Last Supper, Jesus gives us his Body and Blood — the gift of himself, the source and summit of the Christian life.' },
  ],
}

function calculateStreak(days) {
  if (!days.length) return 0
  const daySet = new Set(days.map(d => d.prayed_on))
  let streak = 0
  let checkDate = new Date()
  if (!daySet.has(format(checkDate, 'yyyy-MM-dd'))) {
    checkDate = subDays(checkDate, 1)
  }
  while (daySet.has(format(checkDate, 'yyyy-MM-dd'))) {
    streak++
    checkDate = subDays(checkDate, 1)
  }
  return streak
}

// Last 30 days per user, so the tracker opens instantly on a return visit
const _recentCache = new Map() // userId → rows

export function useRosaryTracker() {
  const { user } = useAuth()
  const cached = user ? _recentCache.get(user.id) : null
  const [recentDays, setRecentDays] = useState(cached ?? [])
  const [streak,     setStreak]     = useState(() => (cached ? calculateStreak(cached) : 0))
  const [loading,    setLoading]    = useState(!cached)

  const todayStr       = format(new Date(), 'yyyy-MM-dd')
  const todayMysteries = DAILY_MYSTERIES[new Date().getDay()]

  const fetchRecent = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('rosary_tracker')
      .select('prayed_on, mysteries')
      .eq('user_id', user.id)
      .gte('prayed_on', format(subDays(new Date(), 30), 'yyyy-MM-dd'))
      .order('prayed_on', { ascending: false })
    if (!data) { setLoading(false); return } // keep what we had on a failed request
    const result = data
    _recentCache.set(user.id, result)
    setRecentDays(result)
    setStreak(calculateStreak(result))
    setLoading(false)
  }, [user])

  useEffect(() => { fetchRecent() }, [fetchRecent])

  const prayedToday = recentDays.some(d => d.prayed_on === todayStr)

  const logRosary = useCallback(async (mysteries = todayMysteries) => {
    if (!user) return
    // Show it right away; the refetch below confirms it
    setRecentDays((prev) => {
      const next = [{ prayed_on: todayStr, mysteries }, ...prev.filter((d) => d.prayed_on !== todayStr)]
      setStreak(calculateStreak(next))
      return next
    })
    await supabase
      .from('rosary_tracker')
      .upsert(
        { user_id: user.id, prayed_on: todayStr, mysteries },
        { onConflict: 'user_id,prayed_on' }
      )
    fetchRecent()
  }, [user, todayStr, todayMysteries, fetchRecent])

  return {
    recentDays, streak, loading, prayedToday,
    todayMysteries, logRosary,
    MYSTERY_NAMES, MYSTERIES, DAILY_MYSTERIES, MYSTERY_INITIAL,
  }
}

// ── Spanish ────────────────────────────────────────────────
export const MYSTERY_NAMES_ES = {
  joyful:    'Misterios Gozosos',
  sorrowful: 'Misterios Dolorosos',
  glorious:  'Misterios Gloriosos',
  luminous:  'Misterios Luminosos',
}

export const MYSTERY_INITIAL_ES = {
  joyful: 'Go', sorrowful: 'D', glorious: 'Gl', luminous: 'L',
}

export const MYSTERIES_ES = {
  joyful: [
    { title: 'La Anunciación', description: 'El ángel Gabriel anuncia a María que concebirá y dará a luz al Hijo de Dios. El "sí" de María a Dios abre la puerta a nuestra salvación.' },
    { title: 'La Visitación', description: 'María visita a su prima Isabel. Al oír el saludo de María, Juan el Bautista salta en el seno de su madre, lleno del Espíritu Santo.' },
    { title: 'El Nacimiento de Jesús', description: 'Jesús nace en un establo de Belén, envuelto en pañales y acostado en un pesebre. El Verbo se hace carne.' },
    { title: 'La Presentación en el Templo', description: 'María y José presentan al niño Jesús en el Templo. Simeón lo reconoce como la salvación preparada para todos los pueblos.' },
    { title: 'El Niño Jesús perdido y hallado en el Templo', description: 'Después de tres días de búsqueda, María y José encuentran a Jesús, de doce años, en el Templo, "en las cosas de su Padre".' },
  ],
  sorrowful: [
    { title: 'La Oración en el Huerto', description: 'Jesús ora en Getsemaní y suda sangre en su angustia. "No se haga mi voluntad, sino la tuya." Es traicionado y arrestado.' },
    { title: 'La Flagelación', description: 'Jesús es atado y azotado; su cuerpo queda destrozado por los golpes. Por sus llagas hemos sido curados.' },
    { title: 'La Coronación de Espinas', description: 'Los soldados se burlan de Jesús como Rey y le clavan espinas en la cabeza. Él acepta la humillación en silencio.' },
    { title: 'Jesús con la Cruz a cuestas', description: 'Jesús carga su cruz por las calles de Jerusalén, cae y se levanta, llevando el peso de nuestro pecado.' },
    { title: 'La Crucifixión', description: 'Jesús es clavado en la cruz y muere. "Padre, en tus manos encomiendo mi espíritu." El mayor acto de amor de la historia.' },
  ],
  glorious: [
    { title: 'La Resurrección', description: 'Al tercer día, Jesús resucita de entre los muertos: el primogénito de entre los muertos, la garantía de nuestra propia resurrección.' },
    { title: 'La Ascensión', description: 'Cuarenta días después de la Pascua, Jesús sube al Padre. Va a prepararnos un lugar y nos envía el Espíritu Santo.' },
    { title: 'La Venida del Espíritu Santo', description: 'En Pentecostés, el Espíritu Santo desciende sobre los discípulos como lenguas de fuego. Nace la Iglesia.' },
    { title: 'La Asunción de María', description: 'Al final de su vida terrena, María es llevada en cuerpo y alma a la gloria del cielo, signo de nuestro propio destino.' },
    { title: 'La Coronación de María', description: 'María es coronada Reina del Cielo y de la Tierra: la primera de los redimidos, modelo de la Iglesia, nuestra Madre e intercesora.' },
  ],
  luminous: [
    { title: 'El Bautismo de Jesús', description: 'Jesús es bautizado en el Jordán. Los cielos se abren: "Este es mi Hijo amado, en quien me complazco."' },
    { title: 'Las Bodas de Caná', description: 'Por intercesión de María, Jesús realiza su primer milagro: convierte el agua en vino. Ha llegado su hora.' },
    { title: 'El Anuncio del Reino', description: 'Jesús anuncia el Reino de Dios y llama a todos a la conversión, sanando a los enfermos y perdonando a los pecadores.' },
    { title: 'La Transfiguración', description: 'En el monte Tabor, Jesús se transfigura en gloria. Aparecen Moisés y Elías. "Escúchenlo."' },
    { title: 'La Institución de la Eucaristía', description: 'En la Última Cena, Jesús nos da su Cuerpo y su Sangre, el don de sí mismo, fuente y cumbre de la vida cristiana.' },
  ],
}
