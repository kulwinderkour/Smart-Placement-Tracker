import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { jobsApi } from '../../api/jobs'
import { useCompanyStore } from '../../store/companyStore'
import type { JobCreatePayload } from '../../types'

const JOB_TYPES: Array<JobCreatePayload['job_type']> = ['full_time', 'intern', 'contract']

export default function JobPosting() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const companyId = searchParams.get('companyId')

  const { company, loading, error, fetchCompanyById, clearCompany } = useCompanyStore()
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [form, setForm] = useState<JobCreatePayload>({
    company_name: '',
    role_title: '',
    location: '',
    salary_min: undefined,
    salary_max: undefined,
    job_type: 'full_time',
    description: '',
    deadline: '',
  })

  useEffect(() => {
    if (!companyId) return
    void fetchCompanyById(companyId)
    return () => clearCompany()
  }, [clearCompany, companyId, fetchCompanyById])

  useEffect(() => {
    if (!company) return
    setForm((prev) => ({
      ...prev,
      company_name: company.company_name,
      location: company.location || '',
      description: prev.description || company.description || '',
    }))
  }, [company])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError(null)
    setSubmitting(true)
    try {
      await jobsApi.create(form)
      navigate('/admin/jobs', { replace: true })
    } catch (requestError: any) {
      setSubmitError(requestError?.response?.data?.detail ?? 'Failed to create job posting')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="font-['Sora'] text-2xl font-bold text-white">Job Posting</h1>
      <p className="mb-6 text-sm text-white/50">
        Company information is auto-filled from company profile data.
      </p>

      {loading && <p className="mb-4 text-sm text-white/70">Loading company info...</p>}
      {error && <p className="mb-4 text-sm text-red-300">{error}</p>}
      {submitError && <p className="mb-4 text-sm text-red-300">{submitError}</p>}

      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
        <Field label="Company Name (auto-fill)">
          <input
            value={form.company_name}
            readOnly
            className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm text-white/90"
          />
        </Field>

        <Field label="Role Title">
          <input
            required
            value={form.role_title}
            onChange={(event) => setForm((prev) => ({ ...prev, role_title: event.target.value }))}
            className="w-full rounded-xl border border-white/15 bg-transparent px-4 py-2 text-sm text-white placeholder:text-white/35 focus:border-cyan-400/50 focus:outline-none"
            placeholder="Software Engineer Intern"
          />
        </Field>

        <Field label="Location (auto-fill editable)">
          <input
            value={form.location || ''}
            onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
            className="w-full rounded-xl border border-white/15 bg-transparent px-4 py-2 text-sm text-white placeholder:text-white/35 focus:border-cyan-400/50 focus:outline-none"
            placeholder="Bengaluru"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Salary Min">
            <input
              type="number"
              value={form.salary_min ?? ''}
              onChange={(event) => setForm((prev) => ({ ...prev, salary_min: event.target.value ? Number(event.target.value) : undefined }))}
              className="w-full rounded-xl border border-white/15 bg-transparent px-4 py-2 text-sm text-white placeholder:text-white/35 focus:border-cyan-400/50 focus:outline-none"
            />
          </Field>
          <Field label="Salary Max">
            <input
              type="number"
              value={form.salary_max ?? ''}
              onChange={(event) => setForm((prev) => ({ ...prev, salary_max: event.target.value ? Number(event.target.value) : undefined }))}
              className="w-full rounded-xl border border-white/15 bg-transparent px-4 py-2 text-sm text-white placeholder:text-white/35 focus:border-cyan-400/50 focus:outline-none"
            />
          </Field>
        </div>

        <Field label="Job Type">
          <select
            value={form.job_type || 'full_time'}
            onChange={(event) => setForm((prev) => ({ ...prev, job_type: event.target.value as JobCreatePayload['job_type'] }))}
            className="w-full rounded-xl border border-white/15 bg-[#0d1224] px-4 py-2 text-sm text-white focus:border-cyan-400/50 focus:outline-none"
          >
            {JOB_TYPES.map((jobType) => (
              <option key={jobType} value={jobType || 'full_time'}>
                {jobType?.replace('_', ' ')}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Description">
          <textarea
            value={form.description || ''}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            rows={5}
            className="w-full rounded-xl border border-white/15 bg-transparent px-4 py-2 text-sm text-white placeholder:text-white/35 focus:border-cyan-400/50 focus:outline-none"
          />
        </Field>

        <Field label="Deadline">
          <input
            type="date"
            value={form.deadline || ''}
            onChange={(event) => setForm((prev) => ({ ...prev, deadline: event.target.value }))}
            className="w-full rounded-xl border border-white/15 bg-transparent px-4 py-2 text-sm text-white focus:border-cyan-400/50 focus:outline-none"
          />
        </Field>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl border border-cyan-400/40 bg-cyan-500/15 px-5 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/25 disabled:opacity-50"
        >
          {submitting ? 'Creating Job...' : 'Create Job'}
        </button>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-wider text-white/55">{label}</span>
      {children}
    </label>
  )
}
