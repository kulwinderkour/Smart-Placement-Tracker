import { clsx } from 'clsx'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export default function Button({
  variant = 'primary', size = 'md', loading, children, className, disabled, ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary:   'bg-blue-600 text-white hover:bg-blue-700 active:scale-95',
    secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200 active:scale-95',
    danger:    'bg-red-600 text-white hover:bg-red-700 active:scale-95',
    ghost:     'text-gray-600 hover:bg-gray-100 active:scale-95',
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }
  return (
    <button className={clsx(base, variants[variant], sizes[size], className)} disabled={disabled || loading} {...props}>
      {loading ? <span className="animate-spin mr-2">⏳</span> : null}
      {children}
    </button>
  )
}
