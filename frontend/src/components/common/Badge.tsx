import { clsx } from 'clsx'
import React from 'react'

interface BadgeProps {
  label: string
  color?: 'blue' | 'purple' | 'yellow' | 'green' | 'red' | 'gray'
  className?: string
}

const colorStyles = {
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  green: 'bg-green-100 text-green-700 border-green-200',
  red: 'bg-red-100 text-red-700 border-red-200',
  gray: 'bg-gray-100 text-gray-700 border-gray-200',
}

export default function Badge({ label, color = 'gray', className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors',
        colorStyles[color],
        className
      )}
    >
      {label}
    </span>
  )
}
