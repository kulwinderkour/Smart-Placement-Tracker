import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Save, Building2, Globe, Mail, Phone, MapPin, Linkedin, CheckCircle } from 'lucide-react'
import { companyApi } from '../../api/company'
import { useCompanyProfileStore } from '../../store/companyProfileStore'
import AdminLayout from '../../components/admin/AdminLayout'

const INPUT = 'w-full border border-[#E2E8F0] rounded-lg px-3 py-2.5 text-sm text-[#0F172A] outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10 placeholder-[#CBD5E1] transition-all'
const LABEL = 'block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-1.5'

export default function AdminCompanyProfile() {
  const { profile, setProfile } = useCompanyProfileStore()

  const [form, setForm] = useState({
    company_name: '',
    company_email: '',
    hr_contact_number: '',
    website: '',
    location: '',
    address: '',
    description: '',
    industry_type: '',
    company_size: '',
    logo_url: '',
    linkedin_url: '',
    founded_year: '',
  })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (profile) {
      setForm({
        company_name: profile.company_name ?? '',
        company_email: profile.company_email ?? '',
        hr_contact_number: profile.hr_contact_number ?? '',
        website: profile.website ?? '',
        location: profile.location ?? '',
        address: profile.address ?? '',
        description: profile.description ?? '',
        industry_type: profile.industry_type ?? '',
        company_size: profile.company_size ?? '',
        logo_url: profile.logo_url ?? '',
        linkedin_url: profile.linkedin_url ?? '',
        founded_year: profile.founded_year ? String(profile.founded_year) : '',
      })
    }
  }, [profile])

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        founded_year: form.founded_year ? Number(form.founded_year) : undefined,
        submit: false,
      }
      return profile
        ? companyApi.updateProfile(payload)
        : companyApi.createProfile({ ...payload, company_name: form.company_name, submit: false })
    },
    onSuccess: (res) => {
      setProfile(res.data)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  return (
    <AdminLayout>
      <div className="p-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold text-[#0F172A]">Company Profile</h1>
            <p className="text-sm text-[#64748B] mt-0.5">Manage your public company information</p>
          </div>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#3B82F6] text-white text-sm font-semibold rounded-lg hover:bg-[#2563EB] transition-colors shadow-sm disabled:opacity-60"
          >
            {saved ? <CheckCircle size={16} /> : <Save size={16} />}
            {mutation.isPending ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>

        {mutation.isError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
            Failed to save. Please try again.
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          {/* ── Left: Form ── */}
          <div className="space-y-5">
            {/* Basic Info */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6">
              <h2 className="text-sm font-bold text-[#0F172A] mb-5 flex items-center gap-2">
                <Building2 size={16} className="text-[#3B82F6]" /> Basic Information
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <label className="col-span-2">
                  <span className={LABEL}>Company Name *</span>
                  <input value={form.company_name} onChange={e => set('company_name', e.target.value)}
                    placeholder="Acme Technologies" className={INPUT} />
                </label>
                <label>
                  <span className={LABEL}>Industry</span>
                  <input value={form.industry_type} onChange={e => set('industry_type', e.target.value)}
                    placeholder="e.g. Software / SaaS" className={INPUT} />
                </label>
                <label>
                  <span className={LABEL}>Company Size</span>
                  <input value={form.company_size} onChange={e => set('company_size', e.target.value)}
                    placeholder="e.g. 51–200" className={INPUT} />
                </label>
                <label>
                  <span className={LABEL}>Founded Year</span>
                  <input type="number" value={form.founded_year} onChange={e => set('founded_year', e.target.value)}
                    placeholder="e.g. 2010" min={1800} max={new Date().getFullYear()} className={INPUT} />
                </label>
                <label>
                  <span className={LABEL}>Location</span>
                  <div className="relative">
                    <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
                    <input value={form.location} onChange={e => set('location', e.target.value)}
                      placeholder="Bengaluru, Karnataka" className={INPUT + ' pl-8'} />
                  </div>
                </label>
                <label className="col-span-2">
                  <span className={LABEL}>Address</span>
                  <textarea value={form.address} onChange={e => set('address', e.target.value)} rows={2}
                    placeholder="Building, Street, City, State, PIN"
                    className={INPUT + ' resize-none'} />
                </label>
              </div>
            </div>

            {/* Contact */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6">
              <h2 className="text-sm font-bold text-[#0F172A] mb-5 flex items-center gap-2">
                <Mail size={16} className="text-[#3B82F6]" /> Contact Details
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <label>
                  <span className={LABEL}>Company Email</span>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
                    <input value={form.company_email} onChange={e => set('company_email', e.target.value)}
                      type="email" placeholder="hr@company.com" className={INPUT + ' pl-8'} />
                  </div>
                </label>
                <label>
                  <span className={LABEL}>HR Contact Number</span>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
                    <input value={form.hr_contact_number} onChange={e => set('hr_contact_number', e.target.value)}
                      placeholder="+91 98765 43210" className={INPUT + ' pl-8'} />
                  </div>
                </label>
              </div>
            </div>

            {/* Online Presence */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6">
              <h2 className="text-sm font-bold text-[#0F172A] mb-5 flex items-center gap-2">
                <Globe size={16} className="text-[#3B82F6]" /> Online Presence
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <label>
                  <span className={LABEL}>Website</span>
                  <div className="relative">
                    <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
                    <input value={form.website} onChange={e => set('website', e.target.value)}
                      type="url" placeholder="https://yourcompany.com" className={INPUT + ' pl-8'} />
                  </div>
                </label>
                <label>
                  <span className={LABEL}>LinkedIn</span>
                  <div className="relative">
                    <Linkedin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
                    <input value={form.linkedin_url} onChange={e => set('linkedin_url', e.target.value)}
                      placeholder="linkedin.com/company/..." className={INPUT + ' pl-8'} />
                  </div>
                </label>
                <label className="col-span-2">
                  <span className={LABEL}>Logo URL</span>
                  <input value={form.logo_url} onChange={e => set('logo_url', e.target.value)}
                    placeholder="https://cdn.example.com/logo.png" className={INPUT} />
                </label>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6">
              <h2 className="text-sm font-bold text-[#0F172A] mb-5">About the Company</h2>
              <label>
                <span className={LABEL}>Description</span>
                <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={5}
                  placeholder="Tell students about your mission, products, work culture and what makes you unique…"
                  className={INPUT + ' resize-none'} />
              </label>
            </div>
          </div>

          {/* ── Right: Live Preview ── */}
          <div>
            <div className="sticky top-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8] mb-3">Live Preview</p>
              <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
                {/* Logo + name */}
                <div className="flex items-center gap-3 mb-4">
                  {form.logo_url ? (
                    <img src={form.logo_url} alt="Logo"
                      className="w-14 h-14 rounded-xl object-contain border border-[#E2E8F0]"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
                      <Building2 size={24} className="text-[#3B82F6]" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="font-bold text-[#0F172A] text-base leading-tight truncate">
                      {form.company_name || 'Company Name'}
                    </h3>
                    {form.industry_type && (
                      <p className="text-xs text-[#64748B] mt-0.5">{form.industry_type}</p>
                    )}
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {form.company_size && (
                    <span className="text-xs bg-[#F1F5F9] text-[#475569] px-2 py-1 rounded-full font-medium">
                      {form.company_size}
                    </span>
                  )}
                  {form.founded_year && (
                    <span className="text-xs bg-[#F1F5F9] text-[#475569] px-2 py-1 rounded-full font-medium">
                      Est. {form.founded_year}
                    </span>
                  )}
                </div>

                {/* Info rows */}
                <div className="space-y-2 text-xs text-[#64748B] mb-4">
                  {form.location && (
                    <div className="flex items-center gap-2">
                      <MapPin size={12} className="text-[#94A3B8] flex-shrink-0" />
                      {form.location}
                    </div>
                  )}
                  {form.company_email && (
                    <div className="flex items-center gap-2">
                      <Mail size={12} className="text-[#94A3B8] flex-shrink-0" />
                      <span className="truncate">{form.company_email}</span>
                    </div>
                  )}
                  {form.hr_contact_number && (
                    <div className="flex items-center gap-2">
                      <Phone size={12} className="text-[#94A3B8] flex-shrink-0" />
                      {form.hr_contact_number}
                    </div>
                  )}
                  {form.website && (
                    <div className="flex items-center gap-2">
                      <Globe size={12} className="text-[#94A3B8] flex-shrink-0" />
                      <a href={form.website} target="_blank" rel="noopener noreferrer"
                        className="text-[#3B82F6] hover:underline truncate">{form.website}</a>
                    </div>
                  )}
                  {form.linkedin_url && (
                    <div className="flex items-center gap-2">
                      <Linkedin size={12} className="text-[#94A3B8] flex-shrink-0" />
                      <span className="truncate">{form.linkedin_url}</span>
                    </div>
                  )}
                </div>

                {/* Description preview */}
                {form.description && (
                  <div className="border-t border-[#F1F5F9] pt-3">
                    <p className="text-xs text-[#64748B] leading-relaxed line-clamp-4">{form.description}</p>
                  </div>
                )}

                {!form.company_name && !form.description && (
                  <p className="text-xs text-[#CBD5E1] text-center py-4">
                    Fill in the form to see a live preview
                  </p>
                )}
              </div>

              {/* Save reminder */}
              {mutation.isPending && (
                <div className="mt-3 text-xs text-[#94A3B8] text-center animate-pulse">Saving changes…</div>
              )}
              {saved && (
                <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-green-600 font-semibold">
                  <CheckCircle size={12} /> Changes saved successfully
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
