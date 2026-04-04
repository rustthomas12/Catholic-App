const sizeMap = { sm: 16, md: 24, lg: 40 }
const colorMap = { navy: '#1B2A4A', gold: '#C9A84C', white: '#ffffff' }

export default function LoadingSpinner({ size = 'md', color = 'navy', fullPage = false }) {
  const px = sizeMap[size] ?? sizeMap.md
  const fill = colorMap[color] ?? colorMap.navy

  const spinner = (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="animate-spin"
      aria-label="Loading"
    >
      <circle cx="12" cy="12" r="10" stroke={fill} strokeOpacity="0.25" strokeWidth="3" />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke={fill}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )

  if (fullPage) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-cream z-50">
        {spinner}
      </div>
    )
  }

  return spinner
}
