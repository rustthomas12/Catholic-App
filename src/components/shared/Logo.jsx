// inFold logo (brand/ logo pack; served from public/brand)
//   <LogoMark />                  steeple on the blue tile
//   <LogoWordmark />              steeple + "inFold", for light backgrounds
//   <LogoWordmark onDark />       the same for navy / dark backgrounds
// Pass alt="" when the name is already written next to the logo.

export function LogoMark({ className = 'w-8 h-8', alt = 'inFold' }) {
  return <img src="/brand/infold-icon.svg" alt={alt} className={`shrink-0 ${className}`} draggable="false" />
}

export function LogoWordmark({ onDark = false, className = 'h-16 w-auto', alt = 'inFold' }) {
  const src = onDark ? '/brand/infold-logo-no-background-dark.svg' : '/brand/infold-logo-no-background.svg'
  return <img src={src} alt={alt} className={`shrink-0 ${className}`} draggable="false" />
}
