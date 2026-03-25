import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Users, Search, Filter, Download, X, FileText, ChevronDown } from 'lucide-react'
import { adminApi } from '../../api/admin'
import StatusBadge from '../../components/admin/StatusBadge'
import AdminLayout from '../../components/admin/AdminLayout'
import type { ApplicationWithStudent, Job } from '../../types'

const STATUS_OPTIONS = ['all', 'applied', 'online_test', 'technical_round', 'hr_round', 'offer', 'rejected']

function StudentModal({ app, onClose, onStatusChange }: {
  app: ApplicationWithStudent
  onClose: () => void
  onStatusChange: (id: string, status: string) => void
}) {
  const [status, setStatus] = useState(app.status)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await onStatusChange(app.id, status)
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] sticky top-0 bg-white">
          <h2 className="text-base font-bold text-[#0F172A]">Applicant Profile</h2>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#0F172A]"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-5">
          {/* Avatar + name */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[#3B82F6] text-xl font-bold">
              {app.student_name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div>
              <h3 className="font-bold text-[#0F172A] text-lg">{app.student_name}</h3>
              <p className="text-sm text-[#64748B]">{app.college ?? 'N/A'} · {app.branch ?? 'N/A'}</p>
              {app.graduation_year && <p className="text-xs text-[#94A3B8]">Class of {app.graduation_year}</p>}
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              ['CGPA', app.cgpa ? `${app.cgpa}/10` : '—'],
              ['ATS Score', app.ats_score ? `${app.ats_score}%` : '—'],
              ['Phone', app.phone ?? '—'],
              ['Applied', new Date(app.applied_at).toLocaleDateString()],
            ].map(([label, val]) => (
              <div key={label} className="bg-[#F8FAFC] rounded-lg p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8] mb-0.5">{label}</p>
                <p className="text-sm font-semibold text-[#0F172A]">{val}</p>
              </div>
            ))}
          </div>

          {/* Applied for */}
          <div className="bg-[#EFF6FF] rounded-lg p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8] mb-1">Applied For</p>
            <p className="text-sm font-semibold text-[#1D4ED8]">{app.role_title}</p>
          </div>

          {/* Links */}
          {(app.resume_url || app.linkedin_url) && (
            <div className="flex gap-2">
              {app.resume_url && (
                <a href={app.resume_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#3B82F6] bg-[#EFF6FF] px-3 py-2 rounded-lg hover:bg-[#DBEAFE] transition-colors">
                  <FileText size={13} /> View Resume
                </a>
              )}
              {app.linkedin_url && (
                <a href={app.linkedin_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#0F172A] bg-[#F1F5F9] px-3 py-2 rounded-lg hover:bg-[#E2E8F0] transition-colors">
                  LinkedIn ↗
                </a>
              )}
            </div>
          )}

          {/* Status update */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">Update Status</p>
            <div className="grid grid-cols-3 gap-2">
              {STATUS_OPTIONS.filter(s => s !== 'all').map(s => (
                <button key={s} onClick={() => setStatus(s as ApplicationWithStudent['status'])}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                    status === s
                      ? 'bg-[#3B82F6] border-[#3B82F6] text-white'
                      : 'border-[#E2E8F0] text-[#64748B] hover:border-[#3B82F6] hover:text-[#3B82F6]'
                  }`}>
                  {s.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-[#E2E8F0] text-sm font-semibold text-[#64748B] hover:bg-[#F8FAFC]">Cancel</button>
            <button onClick={handleSave} disabled={saving || status === app.status}
              className="flex-1 py-2.5 rounded-lg bg-[#3B82F6] text-sm font-semibold text-white hover:bg-[#2563EB] disabled:opacity-60 transition-colors">
              {saving ? 'Saving…' : 'Update Status'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminApplicants() {
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [jobFilter, setJobFilter] = useState(searchParams.get('job') ?? 'all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [activeApp, setActiveApp] = useState<ApplicationWithStudent | null>(null)

  const { data: appsData, isLoading } = useQuery({
    queryKey: ['admin-applicants', jobFilter, statusFilter],
    queryFn: () => adminApi.listApplicants(jobFilter === 'all' ? undefined : jobFilter, statusFilter === 'all' ? undefined : statusFilter),
  })

  const { data: jobsData } = useQuery({
    queryKey: ['admin-jobs'],
    queryFn: () => adminApi.listJobs(1, 100),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => adminApi.updateApplicationStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-applicants'] }),
  })

  const apps: ApplicationWithStudent[] = appsData?.data?.data ?? []
  const jobs: Job[] = jobsData?.data?.data ?? []

  const filtered = apps.filter(a => {
    if (!search) return true
    const q = search.toLowerCase()
    return a.student_name?.toLowerCase().includes(q) || a.college?.toLowerCase().includes(q)
  })

  const toggleSelect = (id: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const bulkAction = async (status: string) => {
    for (const id of selected) {
      await statusMutation.mutateAsync({ id, status })
    }
    setSelected(new Set())
  }

  return (
    <AdminLayout>
      <div className="p-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold text-[#0F172A]">Applicants</h1>
            <p className="text-sm text-[#64748B] mt-0.5">{filtered.length} applicant{filtered.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 mb-5 flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 flex-1 min-w-48">
            <Search size={14} className="text-[#94A3B8] flex-shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or college…"
              className="bg-transparent text-sm text-[#0F172A] placeholder-[#94A3B8] outline-none w-full" />
          </div>

          <div className="relative">
            <select value={jobFilter} onChange={e => setJobFilter(e.target.value)}
              className="appearance-none border border-[#E2E8F0] rounded-lg px-3 py-2 pr-8 text-sm text-[#374151] outline-none focus:border-[#3B82F6] bg-white">
              <option value="all">All Jobs</option>
              {jobs.map(j => <option key={j.id} value={j.id}>{j.role_title}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
          </div>

          <div className="relative">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="appearance-none border border-[#E2E8F0] rounded-lg px-3 py-2 pr-8 text-sm text-[#374151] outline-none focus:border-[#3B82F6] bg-white">
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s === 'all' ? 'All Status' : s.replace(/_/g, ' ')}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
          </div>

          <div className="flex items-center gap-1 text-xs text-[#94A3B8]">
            <Filter size={12} /> {filtered.length} results
          </div>
        </div>

        {/* Bulk actions */}
        {selected.size > 0 && (
          <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl px-4 py-3 mb-4 flex items-center gap-4">
            <span className="text-sm font-semibold text-[#1D4ED8]">{selected.size} selected</span>
            <div className="flex gap-2">
              <button onClick={() => bulkAction('hr_round')}
                className="text-xs font-semibold px-3 py-1.5 bg-[#22C55E] text-white rounded-lg hover:bg-[#16A34A] transition-colors">
                Shortlist
              </button>
              <button onClick={() => bulkAction('rejected')}
                className="text-xs font-semibold px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                Reject
              </button>
              <button onClick={() => setSelected(new Set())}
                className="text-xs font-semibold px-3 py-1.5 border border-[#E2E8F0] text-[#64748B] rounded-lg hover:bg-white transition-colors">
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                  <th className="px-4 py-3 w-8">
                    <input type="checkbox"
                      checked={selected.size === filtered.length && filtered.length > 0}
                      onChange={e => setSelected(e.target.checked ? new Set(filtered.map(a => a.id)) : new Set())}
                      className="rounded border-[#CBD5E1]" />
                  </th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">College / Branch</th>
                  <th className="px-4 py-3">Applied For</th>
                  <th className="px-4 py-3">Applied Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Resume</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-[#F1F5F9]">
                      {[...Array(7)].map((__, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-4 bg-[#F1F5F9] rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <Users size={36} className="mx-auto mb-3 text-[#CBD5E1]" />
                      <p className="text-sm text-[#94A3B8] font-medium">No applicants found</p>
                    </td>
                  </tr>
                ) : filtered.map((app, i) => (
                  <tr
                    key={app.id}
                    onClick={() => setActiveApp(app)}
                    className={`border-b border-[#F1F5F9] hover:bg-[#F8FAFC] cursor-pointer transition-colors ${i === filtered.length - 1 ? 'border-b-0' : ''}`}
                  >
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(app.id)} onChange={() => toggleSelect(app.id)} className="rounded border-[#CBD5E1]" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[#3B82F6] text-xs font-bold flex-shrink-0">
                          {app.student_name?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#0F172A]">{app.student_name}</p>
                          {app.cgpa && <p className="text-xs text-[#94A3B8]">CGPA: {app.cgpa}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-[#374151]">{app.college ?? '—'}</p>
                      <p className="text-xs text-[#94A3B8]">{app.branch ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#374151] max-w-[160px] truncate">{app.role_title}</td>
                    <td className="px-4 py-3 text-sm text-[#64748B] whitespace-nowrap">
                      {new Date(app.applied_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={app.status} /></td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      {app.resume_url ? (
                        <a href={app.resume_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-[#3B82F6] hover:underline font-medium">
                          <Download size={12} /> PDF
                        </a>
                      ) : (
                        <span className="text-xs text-[#CBD5E1]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {activeApp && (
        <StudentModal
          app={activeApp}
          onClose={() => setActiveApp(null)}
          onStatusChange={(id, status) => statusMutation.mutateAsync({ id, status })}
        />
      )}
    </AdminLayout>
  )
}
