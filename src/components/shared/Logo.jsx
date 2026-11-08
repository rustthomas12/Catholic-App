// inFold logo (brand/ kit; served from public/brand)
//   <LogoMark />                  steeple on the blue tile, for tight spaces
//   <LogoLockup />                tile + "inFold", for light backgrounds
//   <LogoLockup onDark />         the same for navy / dark backgrounds
//   <LogoWordmark color="white" /> "inFold" alone (black, white, navy, blue)
// Pass alt="" when the name is already written next to the logo.

export function LogoMark({ className = 'w-8 h-8', alt = 'inFold' }) {
  return <img src="/brand/icon/infold-icon.svg" alt={alt} className={`shrink-0 ${className}`} draggable="false" />
}

export function LogoLockup({ onDark = false, className = 'h-10 w-auto', alt = 'inFold' }) {
  const src = `/brand/lockup/infold-lockup-${onDark ? 'white' : 'black'}.svg`
  return <img src={src} alt={alt} className={`shrink-0 ${className}`} draggable="false" />
}

export function LogoWordmark({ color = 'black', className = 'h-6 w-auto', alt = 'inFold' }) {
  return <img src={`/brand/wordmark/infold-wordmark-${color}.svg`} alt={alt} className={`shrink-0 ${className}`} draggable="false" />
}
