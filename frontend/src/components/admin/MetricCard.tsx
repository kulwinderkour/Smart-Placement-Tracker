import type { ReactNode } from 'react'

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: ReactNode
  color: 'blue' | 'green' | 'violet' | 'amber'
  trend?: { value: number; label: string }
}

const COLOR_MAP = {
  blue:   { bg: '#EFF6FF', icon: '#3B82F6', text: '#1D4ED8' },
  green:  { bg: '#F0FDF4', icon: '#22C55E', text: '#15803D' },
  violet: { bg: '#FAF5FF', icon: '#8B5CF6', text: '#6D28D9' },
  amber:  { bg: '#FFFBEB', icon: '#F59E0B', text: '#B45309' },
}

export default function MetricCard({ title, value, subtitle, icon, color, trend }: MetricCardProps) {
  const c = COLOR_MAP[color]
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-1">{title}</p>
          <p className="text-3xl font-bold text-[#0F172A] leading-none">{value}</p>
          {subtitle && <p className="text-xs text-[#94A3B8] mt-1.5">{subtitle}</p>}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span className={`text-xs font-semibold ${trend.value >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              <span className="text-xs text-[#94A3B8]">{trend.label}</span>
            </div>
          )}
        </div>
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ml-3"
          style={{ background: c.bg, color: c.icon }}
        >
          {icon}
        </div>
      </div>
    </div>
  )
}
