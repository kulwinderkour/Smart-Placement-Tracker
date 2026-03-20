import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { applicationsApi } from '../../api/applications'
import { useAuthStore } from '../../store/authStore'
import Card from '../../components/common/Card'
import Badge from '../../components/common/Badge'

const statusColors: Record<string, 'blue' | 'yellow' | 'purple' | 'green' | 'red' | 'gray'> = {
  applied: 'blue', online_test: 'yellow', technical_round: 'purple',
  hr_round: 'purple', offer: 'green', rejected: 'red',
}

export default function Dashboard() {
  const { user } = useAuthStore()
  const { data: apps, isLoading } = useQuery({
    queryKey: ['my-applications'],
    queryFn: () => applicationsApi.myApplications(),
  })

  const applications = apps?.data || []
  const stats = {
    total:     applications.length,
    active:    applications.filter((a: any) => !['offer','rejected'].includes(a.status)).length,
    offers:    applications.filter((a: any) => a.status === 'offer').length,
    rejected:  applications.filter((a: any) => a.status === 'rejected').length,
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back 👋
        </h1>
        <p className="text-gray-500 mt-1">{user?.email}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Applied', value: stats.total, emoji: '📋' },
          { label: 'In Progress',   value: stats.active, emoji: '⏳' },
          { label: 'Offers',        value: stats.offers, emoji: '🎉' },
          { label: 'Rejected',      value: stats.rejected, emoji: '❌' },
        ].map(stat => (
          <Card key={stat.label}>
            <div className="text-2xl mb-1">{stat.emoji}</div>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-sm text-gray-500">{stat.label}</div>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link to="/jobs">
          <Card className="text-center hover:border-blue-300">
            <div className="text-3xl mb-2">🔍</div>
            <h3 className="font-semibold text-gray-900">Browse Jobs</h3>
            <p className="text-sm text-gray-500 mt-1">Find new opportunities</p>
          </Card>
        </Link>
        <Link to="/tracker">
          <Card className="text-center hover:border-blue-300">
            <div className="text-3xl mb-2">📊</div>
            <h3 className="font-semibold text-gray-900">Application Tracker</h3>
            <p className="text-sm text-gray-500 mt-1">View your Kanban board</p>
          </Card>
        </Link>
        <Link to="/resume">
          <Card className="text-center hover:border-blue-300">
            <div className="text-3xl mb-2">📄</div>
            <h3 className="font-semibold text-gray-900">Resume Analyser</h3>
            <p className="text-sm text-gray-500 mt-1">Get your ATS score</p>
          </Card>
        </Link>
      </div>

      {/* Recent Applications */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Applications</h2>
        {isLoading ? (
          <p className="text-gray-500">Loading...</p>
        ) : applications.length === 0 ? (
          <Card className="text-center py-12">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-gray-500">No applications yet.</p>
            <Link to="/jobs" className="text-blue-600 text-sm font-medium mt-2 inline-block">Browse jobs →</Link>
          </Card>
        ) : (
          <div className="space-y-3">
            {applications.slice(0, 5).map((app: any) => (
              <Card key={app.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{app.job?.role_title || 'Unknown Role'}</p>
                  <p className="text-sm text-gray-500">{app.job?.company_name}</p>
                </div>
                <Badge label={app.status.replace('_', ' ')} color={statusColors[app.status]} />
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
