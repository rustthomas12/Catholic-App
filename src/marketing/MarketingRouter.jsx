import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Home from './Home'
import './marketing.css'

// Home is in the first download so the landing page draws at once; the
// other pages load when visited (and are prefetched after the first paint).
const loaders = {
  features: () => import('./Features'),
  parishes: () => import('./ForParishes'),
  about: () => import('./About'),
  contact: () => import('./Contact'),
}
const Features = lazy(loaders.features)
const ForParishes = lazy(loaders.parishes)
const About = lazy(loaders.about)
const Contact = lazy(loaders.contact)
const PitchDeckPage = lazy(() => import('../pages/PitchDeckPage'))
const IconSheet = import.meta.env.DEV ? lazy(() => import('./IconSheet')) : null

function Fallback() {
  return <div className="min-h-screen bg-navy-deep" />
}

const TITLES = {
  '/': 'inFold — The Digital Parish Hall',
  '/features': 'Features — inFold',
  '/parishes': 'For Parishes — inFold',
  '/about': 'About — inFold',
  '/contact': 'Contact — inFold',
}

function PageEffects() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    document.title = TITLES[pathname] || TITLES['/']
    if (hash) {
      requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }))
    } else {
      window.scrollTo(0, 0)
    }
  }, [pathname, hash])
  // Fetch the other pages quietly once the browser is idle
  useEffect(() => {
    const idle = window.requestIdleCallback || ((f) => setTimeout(f, 1500))
    idle(() => Object.values(loaders).forEach((l) => l().catch(() => {})))
  }, [])
  return null
}

export default function MarketingRouter() {
  return (
    <>
      <PageEffects />
      <Suspense fallback={<Fallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/features" element={<Features />} />
          <Route path="/parishes" element={<ForParishes />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/pitch" element={<PitchDeckPage />} />
          {IconSheet && <Route path="/__icons" element={<IconSheet />} />}
          <Route path="*" element={<Home />} />
        </Routes>
      </Suspense>
    </>
  )
}
