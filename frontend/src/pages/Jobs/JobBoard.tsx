import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { jobsApi } from '../../api/jobs'
import Card from '../../components/common/Card'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import { MapPin, Building2, Clock, Search } from 'lucide-react'

const jobTypeColors: Record<string, 'blue' | 'green' | 'purple'> = {
  full_time: 'blue', intern: 'green', contract: 'purple'
}

export default function JobBoard() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['jobs', page, search],
    queryFn: () => jobsApi.list(page, 20, search || undefined),
  })

  const jobs = data?.data?.data || []
  const total = data?.data?.meta?.total || 0

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Job Board</h1>
        <p className="text-gray-500 mt-1">{total} opportunities available</p>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Search by location..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Job Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map((job: any) => (
            <Card key={job.id} onClick={() => navigate(`/jobs/${job.id}`)}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-lg">
                  🏢
                </div>
                {job.job_type && (
                  <Badge label={job.job_type.replace('_', ' ')} color={jobTypeColors[job.job_type] || 'gray'} />
                )}
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{job.role_title}</h3>
              <div className="flex items-center gap-1 text-gray-500 text-sm mb-1">
                <Building2 className="w-3 h-3" />
                <span>{job.company_name}</span>
              </div>
              {job.location && (
                <div className="flex items-center gap-1 text-gray-500 text-sm mb-3">
                  <MapPin className="w-3 h-3" />
                  <span>{job.location}</span>
                </div>
              )}
              {job.salary_min && (
                <p className="text-green-600 text-sm font-medium">
                  ₹{job.salary_min.toLocaleString()} - ₹{job.salary_max?.toLocaleString()}/mo
                </p>
              )}
              {job.deadline && (
                <div className="flex items-center gap-1 text-gray-400 text-xs mt-2">
                  <Clock className="w-3 h-3" />
                  <span>Deadline: {new Date(job.deadline).toLocaleDateString()}</span>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="flex justify-center gap-2 mt-8">
          <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            Previous
          </Button>
          <span className="px-4 py-2 text-sm text-gray-600">Page {page} of {Math.ceil(total / 20)}</span>
          <Button variant="secondary" size="sm" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
