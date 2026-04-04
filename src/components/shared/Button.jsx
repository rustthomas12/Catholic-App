import LoadingSpinner from './LoadingSpinner'

const variants = {
  primary: 'bg-navy text-white hover:bg-opacity-90 focus-visible:ring-gold',
  secondary: 'bg-white text-navy border border-navy hover:bg-lightbg focus-visible:ring-navy',
  gold: 'bg-gold text-navy hover:bg-opacity-90 focus-visible:ring-navy',
  ghost: 'bg-transparent text-navy hover:bg-lightbg focus-visible:ring-navy',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
}

const sizes = {
  sm: 'px-3 py-2 text-sm min-h-[36px]',
  md: 'px-4 py-2.5 text-base min-h-[44px]',
  lg: 'px-6 py-3 text-lg min-h-[52px]',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  onClick,
  type = 'button',
  children,
  className = '',
}) {
  const isDisabled = disabled || loading

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant] || variants.primary,
        sizes[size] || sizes.md,
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
    >
      {loading ? (
        <>
          <LoadingSpinner size="sm" color={variant === 'primary' || variant === 'danger' ? 'white' : 'navy'} />
          <span>Loading...</span>
        </>
      ) : (
        children
      )}
    </button>
  )
}
