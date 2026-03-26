import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import DataTable, { type TableColumn } from '../../components/common/DataTable'
import { useAdminCompanyStore } from '../../store/adminCompanyStore'
import type { CompanyProfile } from '../../types'

export default function ManageCompanies() {
  const { companies, loading, error, total, page, limit, fetchCompanies } = useAdminCompanyStore()
  const [searchInput, setSearchInput] = useState('')

  useEffect(() => {
    void fetchCompanies({ page: 1, limit: 10 })
  }, [fetchCompanies])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  const columns = useMemo<Array<TableColumn<CompanyProfile>>>(
    () => [
      {
        key: 'company_name',
        header: 'Company',
        render: (company) => (
          <div>
            <p className="font-semibold text-white">{company.company_name}</p>
            <p className="text-xs text-white/50">{company.company_email || 'No email provided'}</p>
          </div>
        ),
      },
      {
        key: 'industry',
        header: 'Industry',
        render: (company) => (
          <span className="text-white/80">{company.industry_type || 'N/A'}</span>
        ),
      },
      {
        key: 'location',
        header: 'Location',
        render: (company) => (
          <span className="text-white/80">{company.location || 'N/A'}</span>
        ),
      },
      {
        key: 'website',
        header: 'Website',
        render: (company) => (
          company.website ? (
            <a
              href={company.website}
              target="_blank"
              rel="noreferrer"
              className="text-cyan-300 hover:text-cyan-200"
            >
              Visit
            </a>
          ) : (
            <span className="text-white/50">N/A</span>
          )
        ),
      },
      {
        key: 'created_at',
        header: 'Created',
        render: (company) => (
          <span className="text-white/70">{new Date(company.created_at).toLocaleDateString()}</span>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        className: 'text-right',
        render: (company) => (
          <div className="flex justify-end gap-2">
            <Link
              to={`/admin/companies/${company.id}`}
              className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10"
            >
              View
            </Link>
            <Link
              to={`/admin/jobs/post?companyId=${company.id}`}
              className="rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20"
            >
              Post Job
            </Link>
          </div>
        ),
      },
    ],
    []
  )

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-['Sora'] text-2xl font-bold text-white">Manage Companies</h1>
          <p className="text-sm text-white/50">Live company profiles submitted from onboarding form.</p>
        </div>
        <div className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold text-white/70">
          Total: {total}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search by company name"
          className="w-full max-w-sm rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/35 focus:border-cyan-400/50 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => void fetchCompanies({ page: 1, limit, search: searchInput })}
          className="rounded-xl border border-cyan-400/40 bg-cyan-500/15 px-4 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/25"
        >
          Search
        </button>
      </div>

      <DataTable
        columns={columns}
        rows={companies}
        loading={loading}
        error={error}
        emptyMessage="No company profiles found yet."
        rowKey={(company) => company.id}
      />

      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          disabled={page <= 1 || loading}
          onClick={() => void fetchCompanies({ page: page - 1, limit })}
          className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/80 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        <p className="text-xs text-white/60">
          Page {page} of {totalPages}
        </p>
        <button
          type="button"
          disabled={page >= totalPages || loading}
          onClick={() => void fetchCompanies({ page: page + 1, limit })}
          className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/80 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  )
}
