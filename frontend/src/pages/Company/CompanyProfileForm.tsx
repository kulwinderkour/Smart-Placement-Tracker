import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { companyApi } from '../../api/company'
import { useCompanyProfileStore } from '../../store/companyProfileStore'
import { useAuthStore } from '../../store/authStore'
import type { CompanyProfilePayload } from '../../types'

// ─── STATIC OPTIONS ──────────────────────────────────────────────────────────
const INDUSTRY_OPTIONS = [
  'Information Technology', 'Software / SaaS', 'E-Commerce',
  'Finance / FinTech', 'Healthcare / MedTech', 'EdTech',
  'Manufacturing', 'Consulting', 'FMCG / Retail',
  'Automotive', 'Media & Entertainment', 'Government / PSU', 'Other',
]

const COMPANY_SIZE_OPTIONS = [
  '1–10', '11–50', '51–200', '201–500', '501–1000', '1001–5000', '5000+',
]

const STEPS = [
  { id: 1, label: 'Company Info' },
  { id: 2, label: 'Contact' },
  { id: 3, label: 'Story' },
  { id: 4, label: 'Branding' },
  { id: 5, label: 'Done' },
]

type FormErrors = Record<string, string>
type FormValues = Record<string, string>

// ─── VALIDATION ───────────────────────────────────────────────────────────────
function validateStep(step: number, data: FormValues): FormErrors {
  const e: FormErrors = {}
  if (step === 1) {
    if (!data.company_name?.trim()) e.company_name = 'Company name is required'
    if (!data.industry_type) e.industry_type = 'Select an industry'
    if (!data.company_size) e.company_size = 'Select company size'
  }
  if (step === 2) {
    if (!data.company_email?.trim()) e.company_email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.company_email))
      e.company_email = 'Enter a valid email'
    if (!data.hr_contact_number?.trim()) e.hr_contact_number = 'Contact number is required'
    if (!data.location?.trim()) e.location = 'Location is required'
  }
  if (step === 3) {
    if (!data.description?.trim()) e.description = 'Company description is required'
  }
  return e
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function CompanyProfileForm() {
  const navigate = useNavigate()
  const { profile, setProfile } = useCompanyProfileStore()
  const { setUser, user } = useAuthStore()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [isBootstrapping, setIsBootstrapping] = useState(true)

  const [formData, setFormData] = useState<FormValues>({
    company_name: '',
    website: '',
    industry_type: '',
    company_size: '',
    founded_year: '',
    company_email: '',
    hr_contact_number: '',
    address: '',
    location: '',
    linkedin_url: '',
    description: '',
    logo_url: '',
  })

  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/dashboard', { replace: true })
      return
    }
    if (user?.is_onboarding_completed) {
      navigate('/admin/dashboard', { replace: true })
      return
    }

    let mounted = true
    companyApi
      .getProfile()
      .then((res) => {
        if (!mounted) return
        const existing = res.data
        setProfile(existing)
        setFormData({
          company_name: existing.company_name ?? '',
          website: existing.website ?? '',
          company_email: existing.company_email ?? '',
          hr_contact_number: existing.hr_contact_number ?? '',
          address: existing.address ?? '',
          description: existing.description ?? '',
          industry_type: existing.industry_type ?? '',
          company_size: existing.company_size ?? '',
          logo_url: existing.logo_url ?? '',
          linkedin_url: existing.linkedin_url ?? '',
          location: existing.location ?? '',
          founded_year: existing.founded_year ? String(existing.founded_year) : '',
        })
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setIsBootstrapping(false)
      })
    return () => { mounted = false }
  }, [navigate, setProfile, user])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const buildPayload = (submit: boolean): CompanyProfilePayload => ({
    company_name: formData.company_name?.trim() ?? '',
    website: formData.website?.trim() || undefined,
    company_email: formData.company_email?.trim() || undefined,
    hr_contact_number: formData.hr_contact_number?.trim() || undefined,
    address: formData.address?.trim() || undefined,
    description: formData.description?.trim() || undefined,
    industry_type: formData.industry_type?.trim() || undefined,
    company_size: formData.company_size?.trim() || undefined,
    logo_url: formData.logo_url?.trim() || undefined,
    linkedin_url: formData.linkedin_url?.trim() || undefined,
    location: formData.location?.trim() || undefined,
    founded_year: formData.founded_year ? Number(formData.founded_year) : undefined,
    submit,
  })

  const handleNext = async () => {
    if (step === 5) {
      navigate('/admin/dashboard', { replace: true })
      return
    }
    const stepErrors = validateStep(step, formData)
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors)
      return
    }
    if (step === 4) {
      setLoading(true)
      setApiError('')
      try {
        const payload = buildPayload(true)
        const response = profile
          ? await companyApi.updateProfile(payload)
          : await companyApi.createProfile(payload)
        setProfile(response.data)
        if (user) setUser({ ...user, is_onboarding_completed: true })
        setStep(5)
      } catch {
        setApiError('Failed to save. Please try again.')
      } finally {
        setLoading(false)
      }
      return
    }
    setStep((s) => s + 1)
  }

  const stepMeta: [string, string][] = [
    ['Create Company Profile', 'Set up your company to start posting placements'],
    ['Contact Details', 'Who should students and admins reach out to?'],
    ['Company Story', 'Tell students about your mission and culture'],
    ['Brand & Presence', 'Add a logo and finalize your public profile'],
    ['Profile Complete', ''],
  ]
  const [title, subtitle] = stepMeta[step - 1]

  if (isBootstrapping) {
    return <div className="min-h-screen bg-[#060a18]" />
  }

  const inputBase =
    'w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white ' +
    'placeholder-white/25 outline-none transition-all duration-150 ' +
    'focus:border-violet-500/60 focus:bg-white/[0.07] focus:ring-2 focus:ring-violet-500/20 ' +
    'hover:border-white/20'

  const labelBase = 'block text-[11px] font-semibold uppercase tracking-widest text-white/40 mb-2'

  function Field({ label, error, children }: { label?: string; error?: string; children: React.ReactNode }) {
    return (
      <div>
        {label && <label className={labelBase}>{label}</label>}
        {children}
        {error && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-400">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="5.5" stroke="currentColor" strokeWidth="1" />
              <path d="M6 3.5v3M6 8h.01" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            {error}
          </p>
        )}
      </div>
    )
  }

  function StyledSelect({ name, value, onChange, placeholder, options }: {
    name: string; value: string
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
    placeholder: string; options: string[]
  }) {
    return (
      <div className="relative">
        <select
          name={name}
          value={value}
          onChange={onChange}
          className={inputBase + ' appearance-none cursor-pointer pr-10'}
          style={{ color: value ? '#fff' : 'rgba(255,255,255,0.25)' }}
        >
          <option value="" disabled style={{ background: '#0d1226', color: 'rgba(255,255,255,0.35)' }}>
            {placeholder}
          </option>
          {options.map((o) => (
            <option key={o} value={o} style={{ background: '#0d1226', color: '#fff' }}>{o}</option>
          ))}
        </select>
        <svg className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#060a18] flex flex-col items-center justify-center relative overflow-hidden px-6 py-16" style={{ fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@600;700;800&display=swap');
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
        textarea { scrollbar-width: thin; scrollbar-color: rgba(124,58,237,0.3) transparent; }
      `}</style>

      {/* ── Background gradient blobs ──────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute left-1/2 -translate-x-1/2 -top-32 w-[700px] h-[500px] rounded-full opacity-30"
          style={{ background: 'radial-gradient(ellipse, #4f1fbf 0%, transparent 65%)', filter: 'blur(60px)' }} />
        <div className="absolute -bottom-40 -right-20 w-[500px] h-[500px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(ellipse, #1e3a8a 0%, transparent 65%)', filter: 'blur(70px)' }} />
        <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(ellipse, #7c3aed 0%, transparent 65%)', filter: 'blur(60px)' }} />
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      {/* ── Back button ───────────────────────────────────── */}
      <button
        type="button"
        onClick={() => navigate('/dashboard')}
        className="absolute top-6 left-6 z-20 flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-medium text-white/50 backdrop-blur transition-all hover:border-white/20 hover:bg-white/10 hover:text-white/80 cursor-pointer"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        Back
      </button>

      {/* ── Logo ──────────────────────────────────────────── */}
      <div className="relative z-10 flex items-center gap-3 mb-10">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: 'linear-gradient(135deg, #7c3aed, #4338ca)' }}>
          <svg width="17" height="17" viewBox="0 0 16 16" fill="none">
            <path d="M8 1.5L9.5 6H14L10.5 8.5L12 13L8 10.5L4 13L5.5 8.5L2 6H6.5L8 1.5Z" fill="white" />
          </svg>
        </div>
        <span className="text-white font-bold text-lg tracking-tight" style={{ fontFamily: 'Sora, sans-serif' }}>
          SmartPlacement
        </span>
      </div>

      {/* ── Progress stepper (above card, full width of card) ── */}
      <div className="relative z-10 w-full max-w-[620px] mb-6 px-1">
        {/* Track */}
        <div className="relative mb-4">
          <div className="absolute top-4 left-0 right-0 h-[2px] bg-white/[0.06] rounded-full" />
          <div
            className="absolute top-4 left-0 h-[2px] rounded-full transition-all duration-500"
            style={{
              width: `${((step - 1) / (STEPS.length - 1)) * 100}%`,
              background: 'linear-gradient(90deg, #7c3aed, #6366f1)',
              boxShadow: '0 0 8px rgba(124,58,237,0.6)',
            }}
          />
          <div className="relative flex justify-between">
            {STEPS.map((s) => (
              <div key={s.id} className="flex flex-col items-center gap-2">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300"
                  style={
                    s.id < step
                      ? { background: 'linear-gradient(135deg, #7c3aed, #6366f1)', boxShadow: '0 0 12px rgba(124,58,237,0.5)', color: '#fff' }
                      : s.id === step
                      ? { background: 'linear-gradient(135deg, #7c3aed, #6366f1)', boxShadow: '0 0 20px rgba(124,58,237,0.65)', color: '#fff', outline: '2px solid rgba(124,58,237,0.3)', outlineOffset: '2px' }
                      : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.25)' }
                  }
                >
                  {s.id < step ? (
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                      <path d="M2.5 7l3 3 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    s.id
                  )}
                </div>
                <span
                  className="text-[10px] font-semibold uppercase tracking-widest whitespace-nowrap"
                  style={{ color: s.id === step ? '#a78bfa' : s.id < step ? 'rgba(167,139,250,0.5)' : 'rgba(255,255,255,0.2)' }}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Form card ─────────────────────────────────────── */}
      <div
        className="relative z-10 w-full max-w-[620px] rounded-2xl"
        style={{
          background: 'rgba(13, 18, 38, 0.9)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 0 0 1px rgba(124,58,237,0.06), 0 24px 64px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.4)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Card header */}
        <div className="px-10 pt-10 pb-7 border-b border-white/[0.06]">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/25 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-violet-300">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
              Step {step} of {STEPS.length}
            </span>
          </div>
          <h1 className="text-[1.85rem] font-bold leading-tight text-white mb-2.5" style={{ fontFamily: 'Sora, sans-serif', letterSpacing: '-0.025em' }}>
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-white/40 leading-relaxed">{subtitle}</p>
          )}
        </div>

        {/* Card body */}
        <div className="px-10 py-8">

          {/* ── Step 1 ── */}
          {step === 1 && (
            <div className="flex flex-col gap-6">
              <Field label="Company Name *" error={errors.company_name}>
                <input
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleChange}
                  placeholder="e.g. Acme Technologies Pvt. Ltd."
                  className={inputBase}
                  autoComplete="organization"
                />
              </Field>

              <Field label="Company Website" error={errors.website}>
                <input
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="https://www.yourcompany.com"
                  className={inputBase}
                  type="url"
                />
              </Field>

              <div className="grid grid-cols-2 gap-5">
                <Field label="Industry *" error={errors.industry_type}>
                  <StyledSelect
                    name="industry_type"
                    value={formData.industry_type}
                    onChange={handleChange}
                    placeholder="Select industry"
                    options={INDUSTRY_OPTIONS}
                  />
                </Field>
                <Field label="Company Size *" error={errors.company_size}>
                  <StyledSelect
                    name="company_size"
                    value={formData.company_size}
                    onChange={handleChange}
                    placeholder="Select size"
                    options={COMPANY_SIZE_OPTIONS}
                  />
                </Field>
              </div>

              <Field label="Founded Year" error={errors.founded_year}>
                <input
                  name="founded_year"
                  value={formData.founded_year}
                  onChange={handleChange}
                  placeholder="e.g. 2005"
                  type="number"
                  min="1800"
                  max={new Date().getFullYear()}
                  className={inputBase}
                />
              </Field>
            </div>
          )}

          {/* ── Step 2 ── */}
          {step === 2 && (
            <div className="flex flex-col gap-6">
              <Field label="Company Email *" error={errors.company_email}>
                <input name="company_email" value={formData.company_email} onChange={handleChange}
                  placeholder="hr@yourcompany.com" type="email" className={inputBase} />
              </Field>
              <Field label="HR Contact Number *" error={errors.hr_contact_number}>
                <input name="hr_contact_number" value={formData.hr_contact_number} onChange={handleChange}
                  placeholder="+91 98765 43210" className={inputBase} />
              </Field>
              <Field label="Company Address" error={errors.address}>
                <textarea name="address" value={formData.address} onChange={handleChange}
                  rows={3} placeholder="Building, Street, City, State, PIN"
                  className={inputBase + ' resize-none'} />
              </Field>
              <div className="grid grid-cols-2 gap-5">
                <Field label="Location / City *" error={errors.location}>
                  <input name="location" value={formData.location} onChange={handleChange}
                    placeholder="e.g. Bengaluru, Karnataka" className={inputBase} />
                </Field>
                <Field label="LinkedIn URL" error={errors.linkedin_url}>
                  <input name="linkedin_url" value={formData.linkedin_url} onChange={handleChange}
                    placeholder="linkedin.com/company/..." className={inputBase} />
                </Field>
              </div>
            </div>
          )}

          {/* ── Step 3 ── */}
          {step === 3 && (
            <div className="flex flex-col gap-6">
              <Field label="Company Description *" error={errors.description}>
                <textarea name="description" value={formData.description} onChange={handleChange}
                  rows={9} placeholder="Tell students about your mission, products, work culture, and what makes you unique…"
                  className={inputBase + ' resize-none'} />
              </Field>
            </div>
          )}

          {/* ── Step 4 ── */}
          {step === 4 && (
            <div className="flex flex-col gap-6">
              <Field label="Company Logo URL" error={errors.logo_url}>
                <input name="logo_url" value={formData.logo_url} onChange={handleChange}
                  placeholder="https://cdn.example.com/logo.png" className={inputBase} />
              </Field>

              {formData.logo_url ? (
                <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-5">
                  <img src={formData.logo_url} alt="Logo preview"
                    className="h-14 w-14 rounded-xl object-contain bg-white/5"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  <div>
                    <p className="text-sm font-semibold text-white">{formData.company_name || 'Your Company'}</p>
                    <p className="mt-0.5 text-xs text-white/35">Logo preview</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white/50">Paste a logo URL above</p>
                    <p className="mt-1 text-xs text-white/25">PNG, JPG or SVG · Max 2 MB recommended</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 5 ── */}
          {step === 5 && (
            <div className="flex flex-col items-center gap-7 py-4 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-violet-500/30"
                style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.2) 0%, transparent 70%)', boxShadow: '0 0 40px rgba(124,58,237,0.2)' }}>
                <svg width="34" height="34" viewBox="0 0 36 36" fill="none">
                  <path d="M8 18l7 7 13-14" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white" style={{ fontFamily: 'Sora, sans-serif', letterSpacing: '-0.02em' }}>
                  You're all set, {formData.company_name || 'Company'}!
                </h3>
                <p className="mt-2.5 text-sm text-white/40 leading-relaxed max-w-sm mx-auto">
                  Your company profile is live. You can now post placements and track applications from the admin dashboard.
                </p>
              </div>
              <div className="w-full rounded-xl border border-white/[0.07] bg-white/[0.03] px-6 py-5 text-left space-y-3.5">
                {([
                  ['Company', formData.company_name],
                  ['Industry', formData.industry_type],
                  ['Location', formData.location],
                  ['Email', formData.company_email],
                ] as [string, string][]).filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-4">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-white/30">{k}</span>
                    <span className="text-sm font-medium text-violet-300 text-right">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* API error */}
          {apiError && (
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.07] px-4 py-3.5 text-sm text-red-400">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2" />
                <path d="M8 5v3.5M8 10.5h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              {apiError}
            </div>
          )}

          {/* ── Action buttons ── */}
          <div className="mt-8 flex gap-3">
            {step > 1 && step < 5 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3.5 text-sm font-medium text-white/50 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white/80 cursor-pointer"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 5l-7 7 7 7" />
                </svg>
                Back
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-2.5 rounded-xl py-3.5 text-sm font-semibold text-white transition-all cursor-pointer disabled:opacity-60"
              style={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                boxShadow: '0 4px 20px rgba(124,58,237,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
                letterSpacing: '0.01em',
              }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
                    <path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Saving…
                </>
              ) : step === 5 ? (
                <>Go to Dashboard <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg></>
              ) : step === 4 ? (
                <>Save & Finish <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg></>
              ) : (
                <>Continue <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg></>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <p className="relative z-10 mt-8 text-[11px] text-white/15">
        © {new Date().getFullYear()} SmartPlacement · Secure onboarding
      </p>
    </div>
  )
}
