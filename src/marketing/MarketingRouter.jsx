import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'

const Home        = lazy(() => import('./Home'))
const Features    = lazy(() => import('./Features'))
const ForParishes = lazy(() => import('./ForParishes'))
const About       = lazy(() => import('./About'))
const Contact     = lazy(() => import('./Contact'))

function Spinner() {
  return (
    <div className="min-h-screen bg-navy flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
    </div>
  )
}

export default function MarketingRouter() {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/"          element={<Home />} />
        <Route path="/features"  element={<Features />} />
        <Route path="/parishes"  element={<ForParishes />} />
        <Route path="/about"     element={<About />} />
        <Route path="/contact"   element={<Contact />} />
        {/* Catch-all → home */}
        <Route path="*"          element={<Home />} />
      </Routes>
    </Suspense>
  )
}
