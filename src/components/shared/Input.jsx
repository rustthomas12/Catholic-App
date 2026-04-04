export default function Input({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  helper,
  required = false,
  disabled = false,
  icon: Icon,
  rightIcon: RightIcon,
  onRightIconClick,
  name,
  id,
  autoComplete,
}) {
  const inputId = id || name || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-semibold text-navy mb-1"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <Icon className="w-5 h-5" />
          </div>
        )}

        <input
          id={inputId}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          className={[
            'w-full rounded-lg border bg-white px-3 py-2.5 text-navy placeholder-gray-400',
            'transition-colors focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold',
            'disabled:bg-gray-50 disabled:cursor-not-allowed',
            error ? 'border-red-500 focus:ring-red-400 focus:border-red-400' : 'border-gray-300',
            Icon ? 'pl-10' : '',
            RightIcon ? 'pr-10' : '',
          ].join(' ')}
        />

        {RightIcon && (
          <button
            type="button"
            onClick={onRightIconClick}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-navy transition-colors"
            tabIndex={-1}
          >
            <RightIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      {helper && !error && (
        <p className="mt-1 text-sm text-gray-500">{helper}</p>
      )}
    </div>
  )
}
