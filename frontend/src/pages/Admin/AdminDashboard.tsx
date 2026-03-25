import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Briefcase, Users, CheckCircle, CalendarDays, Plus, ArrowRight } from 'lucide-react'
import { adminApi } from '../../api/admin'
import { useAuthStore } from '../../store/authStore'
import { useCompanyProfileStore } from '../../store/companyProfileStore'
import MetricCard from '../../components/admin/MetricCard'
import StatusBadge from '../../components/admin/StatusBadge'
import AdminLayout from '../../components/admin/AdminLayout'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { profile } = useCompanyProfileStore()
  const companyName = profile?.company_name ?? user?.email?.split('@')[0] ?? 'Admin'

  const { data, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.getStats(),
    refetchInterval: 30_000,
  })

  const stats = data?.data

  const shortlisted = stats?.recent_applications?.filter(a => a.status === 'hr_round' || a.status === 'offer').length ?? 0

  const QUICK_ACTIONS = [
    { label: 'Post Job', icon: Plus, color: '#3B82F6', bg: '#EFF6FF', path: '/admin/jobs' },
    { label: 'View Applicants', icon: Users, color: '#8B5CF6', bg: '#FAF5FF', path: '/admin/applicants' },
    { label: 'Schedule Interview', icon: CalendarDays, color: '#14B8A6', bg: '#F0FDFB', path: '/admin/interviews' },
    { label: 'Analytics', icon: ArrowRight, color: '#F59E0B', bg: '#FFFBEB', path: '/admin/analytics' },
  ]

  return (
    <AdminLayout>
      <div className="p-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
          <div>
            <p className="text-sm text-[#64748B] font-medium">{getGreeting()},</p>
            <h1 className="text-2xl font-bold text-[#0F172A]">{companyName} 👋</h1>
            <p className="text-sm text-[#94A3B8] mt-1">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/jobs')}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#3B82F6] text-white text-sm font-semibold rounded-lg hover:bg-[#2563EB] transition-colors shadow-sm"
          >
            <Plus size={16} />
            Post New Job
          </button>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
          <MetricCard
            title="Active Jobs"
            value={isLoading ? '—' : stats?.total_jobs ?? 0}
            subtitle="Total posted"
            icon={<Briefcase size={20} />}
            color="blue"
          />
          <MetricCard
            title="Total Applicants"
            value={isLoading ? '—' : stats?.total_applications ?? 0}
            subtitle="Across all jobs"
            icon={<Users size={20} />}
            color="violet"
          />
          <MetricCard
            title="Shortlisted"
            value={isLoading ? '—' : shortlisted}
            subtitle="HR round + Offer"
            icon={<CheckCircle size={20} />}
            color="green"
          />
          <MetricCard
            title="Students"
            value={isLoading ? '—' : stats?.total_students ?? 0}
            subtitle="Registered"
            icon={<CalendarDays size={20} />}
            color="amber"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-7">
          {QUICK_ACTIONS.map(({ label, icon: Icon, color, bg, path }) => (
            <button
              key={label}
              onClick={() => navigate(path)}
              className="flex flex-col items-center gap-2.5 p-4 bg-white rounded-xl border border-[#E2E8F0] hover:shadow-md transition-all hover:border-[#BFDBFE] group"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                style={{ background: bg, color }}>
                <Icon size={18} />
              </div>
              <span className="text-xs font-semibold text-[#374151]">{label}</span>
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Applications */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F1F5F9]">
              <h2 className="text-sm font-semibold text-[#0F172A]">Recent Applications</h2>
              <button onClick={() => navigate('/admin/applicants')} className="text-xs text-[#3B82F6] hover:underline font-medium">View all</button>
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center h-32 text-[#94A3B8] text-sm">Loading...</div>
            ) : !stats?.recent_applications?.length ? (
              <div className="flex flex-col items-center justify-center h-32 text-[#94A3B8]">
                <Users size={28} className="mb-2 opacity-30" />
                <p className="text-sm">No applications yet</p>
              </div>
            ) : (
              <div>
                {stats.recent_applications.map((app, i) => (
                  <div key={app.id} className={`flex items-center gap-3 px-5 py-3 hover:bg-[#F8FAFC] transition-colors ${i < stats.recent_applications.length - 1 ? 'border-b border-[#F1F5F9]' : ''}`}>
                    <div className="w-8 h-8 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[#3B82F6] text-xs font-bold flex-shrink-0">
                      {app.student_name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#0F172A] truncate">{app.student_name}</p>
                      <p className="text-xs text-[#94A3B8] truncate">{app.role_title}</p>
                    </div>
                    <StatusBadge status={app.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Jobs */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F1F5F9]">
              <h2 className="text-sm font-semibold text-[#0F172A]">Recent Jobs</h2>
              <button onClick={() => navigate('/admin/jobs')} className="text-xs text-[#3B82F6] hover:underline font-medium">View all</button>
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center h-32 text-[#94A3B8] text-sm">Loading...</div>
            ) : !stats?.recent_jobs?.length ? (
              <div className="flex flex-col items-center justify-center h-32 text-[#94A3B8]">
                <Briefcase size={28} className="mb-2 opacity-30" />
                <p className="text-sm">No jobs posted yet</p>
              </div>
            ) : (
              <div>
                {stats.recent_jobs.map((job, i) => (
                  <div key={job.id} className={`flex items-center gap-3 px-5 py-3 hover:bg-[#F8FAFC] transition-colors ${i < stats.recent_jobs.length - 1 ? 'border-b border-[#F1F5F9]' : ''}`}>
                    <div className="w-8 h-8 rounded-lg bg-[#F0FDF4] flex items-center justify-center flex-shrink-0">
                      <Briefcase size={14} className="text-[#22C55E]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#0F172A] truncate">{job.role_title}</p>
                      <p className="text-xs text-[#94A3B8]">{new Date(job.created_at).toLocaleDateString()}</p>
                    </div>
                    <StatusBadge status={job.is_active ? 'active' : 'closed'} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
