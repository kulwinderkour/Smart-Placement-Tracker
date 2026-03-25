import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Briefcase, MapPin, Calendar, Users, Edit, X, ChevronDown } from 'lucide-react'
import { adminApi } from '../../api/admin'
import { jobsApi } from '../../api/jobs'
import StatusBadge from '../../components/admin/StatusBadge'
import AdminLayout from '../../components/admin/AdminLayout'
import type { Job, JobCreatePayload } from '../../types'
import { useCompanyProfileStore } from '../../store/companyProfileStore'

const JOB_TYPES = ['full_time', 'intern', 'contract'] as const

function PostJobModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { profile } = useCompanyProfileStore()
  const [form, setForm] = useState<JobCreatePayload>({
    company_name: profile?.company_name ?? '',
    role_title: '',
    location: profile?.location ?? '',
    salary_min: undefined,
    salary_max: undefined,
    job_type: 'full_time',
    description: '',
    deadline: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const set = (k: keyof JobCreatePayload, v: unknown) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.role_title.trim()) { setError('Role title is required'); return }
    setSubmitting(true); setError('')
    try {
      await jobsApi.create(form)
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg ?? 'Failed to create job')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
          <h2 className="text-base font-bold text-[#0F172A]">Post New Job</h2>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#0F172A] transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-lg">{error}</div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5 col-span-2">
              <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Role Title *</span>
              <input value={form.role_title} onChange={e => set('role_title', e.target.value)} required
                placeholder="e.g. Software Engineer Intern"
                className="border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10 placeholder-[#CBD5E1]" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Company</span>
              <input value={form.company_name} onChange={e => set('company_name', e.target.value)}
                className="border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Location</span>
              <input value={form.location ?? ''} onChange={e => set('location', e.target.value)}
                placeholder="e.g. Bengaluru"
                className="border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10 placeholder-[#CBD5E1]" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Salary Min (₹)</span>
              <input type="number" value={form.salary_min ?? ''} onChange={e => set('salary_min', e.target.value ? +e.target.value : undefined)}
                placeholder="e.g. 300000"
                className="border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10 placeholder-[#CBD5E1]" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Salary Max (₹)</span>
              <input type="number" value={form.salary_max ?? ''} onChange={e => set('salary_max', e.target.value ? +e.target.value : undefined)}
                placeholder="e.g. 600000"
                className="border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10 placeholder-[#CBD5E1]" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Job Type</span>
              <div className="relative">
                <select value={form.job_type ?? 'full_time'} onChange={e => set('job_type', e.target.value as JobCreatePayload['job_type'])}
                  className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#3B82F6] appearance-none bg-white pr-8">
                  {JOB_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
              </div>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Deadline</span>
              <input type="date" value={form.deadline ?? ''} onChange={e => set('deadline', e.target.value)}
                className="border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10" />
            </label>
            <label className="flex flex-col gap-1.5 col-span-2">
              <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Description</span>
              <textarea value={form.description ?? ''} onChange={e => set('description', e.target.value)} rows={4}
                placeholder="Describe the role, requirements and responsibilities…"
                className="border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10 placeholder-[#CBD5E1] resize-none" />
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-[#E2E8F0] text-sm font-semibold text-[#64748B] hover:bg-[#F8FAFC] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 py-2.5 rounded-lg bg-[#3B82F6] text-sm font-semibold text-white hover:bg-[#2563EB] transition-colors disabled:opacity-60">
              {submitting ? 'Posting…' : 'Post Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminJobs() {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-jobs'],
    queryFn: () => adminApi.listJobs(1, 100),
  })

  const jobs: Job[] = data?.data?.data ?? []

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      adminApi.updateJobStatus(id, is_active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-jobs'] }),
  })

  return (
    <AdminLayout>
      <div className="p-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold text-[#0F172A]">Jobs</h1>
            <p className="text-sm text-[#64748B] mt-0.5">{jobs.length} job{jobs.length !== 1 ? 's' : ''} posted</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#3B82F6] text-white text-sm font-semibold rounded-lg hover:bg-[#2563EB] transition-colors shadow-sm"
          >
            <Plus size={16} /> Post New Job
          </button>
        </div>

        {/* Jobs Grid */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-[#E2E8F0] p-5 animate-pulse h-44" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-[#94A3B8]">
            <Briefcase size={48} className="mb-4 opacity-20" />
            <h3 className="text-base font-semibold text-[#64748B] mb-1">No jobs posted yet</h3>
            <p className="text-sm mb-4">Post your first job to start receiving applications</p>
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#3B82F6] text-white text-sm font-semibold rounded-lg hover:bg-[#2563EB] transition-colors">
              <Plus size={15} /> Post New Job
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map(job => (
              <div key={job.id} className="bg-white rounded-xl border border-[#E2E8F0] p-5 hover:shadow-md transition-all group">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
                    <Briefcase size={18} className="text-[#3B82F6]" />
                  </div>
                  <StatusBadge status={job.is_active ? 'active' : 'closed'} />
                </div>
                <h3 className="font-semibold text-[#0F172A] text-sm mb-0.5 line-clamp-1">{job.role_title}</h3>
                <p className="text-xs text-[#64748B] mb-3">{job.company_name}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {job.location && (
                    <span className="flex items-center gap-1 text-xs text-[#64748B]">
                      <MapPin size={11} /> {job.location}
                    </span>
                  )}
                  {job.job_type && (
                    <span className="text-xs bg-[#F1F5F9] text-[#475569] px-2 py-0.5 rounded-full font-medium">
                      {job.job_type.replace('_', ' ')}
                    </span>
                  )}
                  {job.salary_max && (
                    <span className="text-xs text-[#64748B]">
                      ₹{(job.salary_max / 100000).toFixed(1)}L
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-[#94A3B8]">
                    <Calendar size={11} />
                    {new Date(job.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => toggleMutation.mutate({ id: job.id, is_active: !job.is_active })}
                      disabled={toggleMutation.isPending}
                      className={`text-xs font-semibold px-3 py-1 rounded-full transition-colors ${
                        job.is_active
                          ? 'bg-red-50 text-red-500 hover:bg-red-100'
                          : 'bg-green-50 text-green-600 hover:bg-green-100'
                      }`}
                    >
                      {job.is_active ? 'Close' : 'Activate'}
                    </button>
                    <button className="text-[#94A3B8] hover:text-[#3B82F6] transition-colors">
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => window.location.href = `/admin/applicants?job=${job.id}`}
                      className="text-xs font-semibold text-[#3B82F6] flex items-center gap-1 hover:underline"
                    >
                      <Users size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <PostJobModal
          onClose={() => setShowModal(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['admin-jobs'] })}
        />
      )}
    </AdminLayout>
  )
}
