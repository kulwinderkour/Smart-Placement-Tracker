import { useEffect } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useAdminStatsStore } from '../../store/adminStatsStore'

export default function AnalyticsDashboard() {
  const { stats, loading, error, fetchStats } = useAdminStatsStore()

  useEffect(() => {
    void fetchStats()
  }, [fetchStats])

  if (loading && !stats) {
    return <div className="p-8 text-sm text-white/70">Loading analytics...</div>
  }

  if (error && !stats) {
    return <div className="p-8 text-sm text-red-300">{error}</div>
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="font-['Sora'] text-2xl font-bold text-white">Analytics Dashboard</h1>
      <p className="mb-6 text-sm text-white/50">Database-driven company growth and industry distribution.</p>

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard title="Industry Distribution">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats?.industry_distribution || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="industry_type" stroke="rgba(255,255,255,0.7)" fontSize={11} />
              <YAxis stroke="rgba(255,255,255,0.7)" fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#22d3ee" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Company Growth">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={stats?.company_growth || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="month" stroke="rgba(255,255,255,0.7)" fontSize={11} />
              <YAxis stroke="rgba(255,255,255,0.7)" fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#34d399" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h2 className="mb-3 text-sm font-semibold text-white">{title}</h2>
      {children}
    </div>
  )
}
