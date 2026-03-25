type Status = 'applied' | 'online_test' | 'technical_round' | 'hr_round' | 'offer' | 'rejected' | 'shortlisted' | 'active' | 'closed' | 'draft' | 'scheduled' | 'completed' | 'cancelled'

const CONFIG: Record<Status, { label: string; bg: string; text: string; dot: string }> = {
  applied:         { label: 'Applied',         bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6' },
  online_test:     { label: 'Online Test',     bg: '#FFF7ED', text: '#C2410C', dot: '#F97316' },
  technical_round: { label: 'Technical',       bg: '#FAF5FF', text: '#6D28D9', dot: '#8B5CF6' },
  hr_round:        { label: 'HR Round',        bg: '#F0FDFB', text: '#0F766E', dot: '#14B8A6' },
  offer:           { label: 'Offer',           bg: '#F0FDF4', text: '#15803D', dot: '#22C55E' },
  rejected:        { label: 'Rejected',        bg: '#FFF1F2', text: '#BE123C', dot: '#F43F5E' },
  shortlisted:     { label: 'Shortlisted',     bg: '#ECFDF5', text: '#065F46', dot: '#10B981' },
  active:          { label: 'Active',          bg: '#F0FDF4', text: '#15803D', dot: '#22C55E' },
  closed:          { label: 'Closed',          bg: '#F1F5F9', text: '#475569', dot: '#94A3B8' },
  draft:           { label: 'Draft',           bg: '#FFFBEB', text: '#92400E', dot: '#F59E0B' },
  scheduled:       { label: 'Scheduled',       bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6' },
  completed:       { label: 'Completed',       bg: '#F0FDF4', text: '#15803D', dot: '#22C55E' },
  cancelled:       { label: 'Cancelled',       bg: '#FFF1F2', text: '#BE123C', dot: '#F43F5E' },
}

export default function StatusBadge({ status }: { status: string }) {
  const cfg = CONFIG[status as Status] ?? { label: status, bg: '#F1F5F9', text: '#475569', dot: '#94A3B8' }
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  )
}
