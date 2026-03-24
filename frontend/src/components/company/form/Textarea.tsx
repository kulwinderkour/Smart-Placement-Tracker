interface TextareaProps {
  id: string
  value: string
  placeholder?: string
  rows?: number
  onChange: (value: string) => void
}

const baseInputClass =
  'w-full resize-none rounded-2xl border border-white/10 bg-[#17142f]/80 px-4 py-3.5 text-sm text-white placeholder:text-white/28 ' +
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm transition-all duration-200 ' +
  'focus:border-violet-400/70 focus:outline-none focus:ring-4 focus:ring-violet-500/15 ' +
  'hover:border-white/20 hover:bg-[#1a1636]/90'

export default function Textarea({ id, value, placeholder, rows = 4, onChange }: TextareaProps) {
  return (
    <textarea
      id={id}
      value={value}
      placeholder={placeholder}
      rows={rows}
      onChange={(e) => onChange(e.target.value)}
      className={baseInputClass}
    />
  )
}
