import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useCompanyStore } from '../../store/companyStore'

export default function CompanyProfileView() {
  const { id } = useParams<{ id: string }>()
  const { company, loading, error, fetchCompanyById, clearCompany } = useCompanyStore()

  useEffect(() => {
    if (!id) return
    void fetchCompanyById(id)
    return () => clearCompany()
  }, [clearCompany, fetchCompanyById, id])

  if (loading) {
    return <div className="p-8 text-sm text-white/70">Loading company profile...</div>
  }

  if (error) {
    return <div className="p-8 text-sm text-red-300">{error}</div>
  }

  if (!company) {
    return <div className="p-8 text-sm text-white/70">Company profile not found.</div>
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-['Sora'] text-2xl font-bold text-white">{company.company_name}</h1>
          <p className="text-sm text-white/50">Company Profile View</p>
        </div>
        <Link
          to={`/admin/jobs/post?companyId=${company.id}`}
          className="rounded-xl border border-cyan-400/40 bg-cyan-500/15 px-4 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/25"
        >
          Post Job For Company
        </Link>
      </div>

      <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 sm:grid-cols-2">
        <Detail label="Company Email" value={company.company_email} />
        <Detail label="Website" value={company.website} />
        <Detail label="Industry" value={company.industry_type} />
        <Detail label="Company Size" value={company.company_size} />
        <Detail label="Location" value={company.location} />
        <Detail label="Founded Year" value={company.founded_year ? String(company.founded_year) : undefined} />
        <Detail label="Contact Number" value={company.hr_contact_number} />
        <Detail label="LinkedIn" value={company.linkedin_url} />
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5">
        <p className="mb-2 text-xs uppercase tracking-wider text-white/50">Address</p>
        <p className="text-sm text-white/80">{company.address || 'N/A'}</p>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5">
        <p className="mb-2 text-xs uppercase tracking-wider text-white/50">Description</p>
        <p className="text-sm leading-relaxed text-white/80">{company.description || 'N/A'}</p>
      </div>
    </div>
  )
}

function Detail({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-white/50">{label}</p>
      <p className="mt-1 text-sm text-white/85">{value || 'N/A'}</p>
    </div>
  )
}
