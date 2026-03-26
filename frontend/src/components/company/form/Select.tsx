interface SelectOption {
  label: string
  value: string
}

interface SelectProps {
  id: string
  value: string
  placeholder?: string
  options: SelectOption[]
  onChange: (value: string) => void
}

const baseInputClass =
  'w-full cursor-pointer rounded-2xl border border-white/10 bg-[#17142f]/80 px-4 py-3.5 text-sm text-white ' +
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm transition-all duration-200 ' +
  'focus:border-violet-400/70 focus:outline-none focus:ring-4 focus:ring-violet-500/15 ' +
  'hover:border-white/20 hover:bg-[#1a1636]/90'

export default function Select({ id, value, placeholder, options, onChange }: SelectProps) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={baseInputClass}
    >
      <option value="" disabled className="bg-[#120f25] text-white/50">
        {placeholder ?? 'Select...'}
      </option>
      {options.map((option) => (
        <option key={option.value} value={option.value} className="bg-[#120f25] text-white">
          {option.label}
        </option>
      ))}
    </select>
  )
}
