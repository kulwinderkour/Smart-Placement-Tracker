import { clsx } from 'clsx'

interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export default function Card({ children, className, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'bg-white rounded-xl border border-gray-200 shadow-sm p-5',
        onClick && 'cursor-pointer hover:shadow-md hover:border-blue-200 transition-all',
        className
      )}
    >
      {children}
    </div>
  )
}
