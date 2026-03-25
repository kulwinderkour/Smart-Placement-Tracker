import { useQuery } from '@tanstack/react-query'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { BarChart2, TrendingUp, Users, Award } from 'lucide-react'
import { adminApi } from '../../api/admin'
import AdminLayout from '../../components/admin/AdminLayout'

const STATUS_COLORS: Record<string, string> = {
  applied: '#3B82F6',
  online_test: '#F97316',
  technical_round: '#8B5CF6',
  hr_round: '#14B8A6',
  offer: '#22C55E',
  rejected: '#F43F5E',
}

const PIE_COLORS = ['#3B82F6', '#22C55E', '#F97316', '#8B5CF6', '#14B8A6', '#F43F5E']

export default function AdminAnalytics() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: () => adminApi.getAnalytics(),
  })

  const analytics = data?.data

  const funnelData = analytics?.placement_funnel?.map(f => ({
    ...f,
    label: f.status.replace(/_/g, ' '),
    fill: STATUS_COLORS[f.status] ?? '#3B82F6',
  })) ?? []

  return (
    <AdminLayout>
      <div className="p-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="mb-7">
          <h1 className="text-xl font-bold text-[#0F172A]">Analytics</h1>
          <p className="text-sm text-[#64748B] mt-0.5">Real-time placement insights from your database</p>
        </div>

        {/* Rate Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
          {[
            { label: 'Offer Rate', value: `${analytics?.offer_rate ?? 0}%`, icon: Award, color: '#22C55E', bg: '#F0FDF4' },
            { label: 'Shortlist Rate', value: `${analytics?.shortlist_rate ?? 0}%`, icon: TrendingUp, color: '#3B82F6', bg: '#EFF6FF' },
            { label: 'Total Applicants', value: analytics?.placement_funnel?.reduce((s, f) => s + f.count, 0) ?? 0, icon: Users, color: '#8B5CF6', bg: '#FAF5FF' },
            { label: 'Colleges', value: analytics?.top_colleges?.length ?? 0, icon: BarChart2, color: '#F59E0B', bg: '#FFFBEB' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-1">{label}</p>
                  <p className="text-3xl font-bold text-[#0F172A]">{isLoading ? '—' : value}</p>
                </div>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: bg, color }}>
                  <Icon size={20} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Applications Over Time */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
            <h2 className="text-sm font-semibold text-[#0F172A] mb-4">Applications Over Time</h2>
            {isLoading ? (
              <div className="h-56 bg-[#F8FAFC] rounded-lg animate-pulse" />
            ) : !analytics?.applications_over_time?.length ? (
              <div className="h-56 flex flex-col items-center justify-center text-[#94A3B8]">
                <TrendingUp size={32} className="mb-2 opacity-20" />
                <p className="text-sm">No application data yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={analytics.applications_over_time}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false}
                    tickFormatter={v => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12, padding: '8px 12px' }}
                    labelFormatter={v => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  />
                  <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2.5} dot={{ fill: '#3B82F6', r: 3 }} activeDot={{ r: 5 }} name="Applications" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Placement Funnel */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
            <h2 className="text-sm font-semibold text-[#0F172A] mb-4">Placement Funnel</h2>
            {isLoading ? (
              <div className="h-56 bg-[#F8FAFC] rounded-lg animate-pulse" />
            ) : !funnelData.length ? (
              <div className="h-56 flex flex-col items-center justify-center text-[#94A3B8]">
                <BarChart2 size={32} className="mb-2 opacity-20" />
                <p className="text-sm">No funnel data yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={funnelData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={false} width={90} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12, padding: '8px 12px' }}
                  />
                  <Bar dataKey="count" name="Applicants" radius={[0, 6, 6, 0]}>
                    {funnelData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Top Colleges */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
            <h2 className="text-sm font-semibold text-[#0F172A] mb-4">Top Colleges by Applications</h2>
            {isLoading ? (
              <div className="h-56 bg-[#F8FAFC] rounded-lg animate-pulse" />
            ) : !analytics?.top_colleges?.length ? (
              <div className="h-56 flex flex-col items-center justify-center text-[#94A3B8]">
                <Users size={32} className="mb-2 opacity-20" />
                <p className="text-sm">No college data yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={analytics.top_colleges.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="college" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false}
                    tickFormatter={v => v.length > 12 ? v.slice(0, 12) + '…' : v} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12, padding: '8px 12px' }}
                  />
                  <Bar dataKey="count" fill="#3B82F6" name="Applications" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Status Distribution Pie */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
            <h2 className="text-sm font-semibold text-[#0F172A] mb-4">Application Status Distribution</h2>
            {isLoading ? (
              <div className="h-56 bg-[#F8FAFC] rounded-lg animate-pulse" />
            ) : !funnelData.length ? (
              <div className="h-56 flex flex-col items-center justify-center text-[#94A3B8]">
                <BarChart2 size={32} className="mb-2 opacity-20" />
                <p className="text-sm">No data yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={funnelData} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={85} innerRadius={45}>
                    {funnelData.map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12, padding: '8px 12px' }} />
                  <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ fontSize: 11, color: '#64748B' }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
