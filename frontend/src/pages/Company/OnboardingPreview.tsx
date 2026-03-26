import { useState, useEffect, useRef } from 'react'

// ─── STATIC DATA ─────────────────────────────────────────────────────────────
const INDUSTRY_OPTIONS = [
  'Information Technology', 'Software / SaaS', 'E-Commerce',
  'Finance / FinTech', 'Healthcare / MedTech', 'EdTech',
  'Manufacturing', 'Consulting', 'FMCG / Retail',
  'Automotive', 'Media & Entertainment', 'Government / PSU', 'Other',
]

const COMPANY_SIZE_OPTIONS = [
  '1–10 employees', '11–50 employees', '51–200 employees',
  '201–500 employees', '501–1000 employees', '1001–5000 employees', '5000+ employees',
]

const STEPS = [
  { id: 1, label: 'Company Info',  short: 'Info' },
  { id: 2, label: 'Contact',       short: 'Contact' },
  { id: 3, label: 'Story',         short: 'Story' },
  { id: 4, label: 'Branding',      short: 'Brand' },
  { id: 5, label: 'Done',          short: 'Done' },
]

type FormValues = Record<string, string>
type FormErrors = Record<string, string>

function validateStep(step: number, d: FormValues): FormErrors {
  const e: FormErrors = {}
  if (step === 1) {
    if (!d.company_name?.trim())  e.company_name  = 'Company name is required'
    if (!d.industry_type)         e.industry_type = 'Select an industry'
    if (!d.company_size)          e.company_size  = 'Select a company size'
  }
  if (step === 2) {
    if (!d.company_email?.trim()) e.company_email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.company_email))
      e.company_email = 'Enter a valid email address'
    if (!d.hr_contact_number?.trim()) e.hr_contact_number = 'Contact number is required'
    if (!d.location?.trim())      e.location      = 'Location is required'
  }
  if (step === 3) {
    if (!d.description?.trim())   e.description   = 'Company description is required'
  }
  return e
}

// ─── CHECKMARK SVG ───────────────────────────────────────────────────────────
function Check({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── INPUT COMPONENT ─────────────────────────────────────────────────────────
function Input({ label, error, hint, ...props }: {
  label: string; error?: string; hint?: string
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-widest text-white/35 select-none">
        {label}
      </label>
      <input
        {...props}
        className={[
          'w-full rounded-xl bg-white/[0.04] border px-4 py-3 text-sm text-white',
          'placeholder-white/20 outline-none transition-all duration-200',
          'hover:bg-white/[0.06] hover:border-white/15',
          'focus:bg-white/[0.07] focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/15',
          error
            ? 'border-red-500/40 bg-red-500/[0.04]'
            : 'border-white/[0.08]',
          props.className ?? '',
        ].join(' ')}
      />
      {hint && !error && <p className="text-[11px] text-white/25 leading-relaxed">{hint}</p>}
      {error && (
        <p className="flex items-center gap-1.5 text-[11px] text-red-400">
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="5.5" stroke="currentColor" strokeWidth="1"/>
            <path d="M6 3.5v3M6 8h.01" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          {error}
        </p>
      )}
    </div>
  )
}

// ─── TEXTAREA COMPONENT ───────────────────────────────────────────────────────
function Textarea({ label, error, hint, ...props }: {
  label: string; error?: string; hint?: string
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-widest text-white/35 select-none">
        {label}
      </label>
      <textarea
        {...props}
        className={[
          'w-full rounded-xl bg-white/[0.04] border px-4 py-3 text-sm text-white',
          'placeholder-white/20 outline-none resize-none transition-all duration-200',
          'hover:bg-white/[0.06] hover:border-white/15',
          'focus:bg-white/[0.07] focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/15',
          error
            ? 'border-red-500/40 bg-red-500/[0.04]'
            : 'border-white/[0.08]',
        ].join(' ')}
      />
      {hint && !error && <p className="text-[11px] text-white/25 leading-relaxed">{hint}</p>}
      {error && (
        <p className="flex items-center gap-1.5 text-[11px] text-red-400">
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="5.5" stroke="currentColor" strokeWidth="1"/>
            <path d="M6 3.5v3M6 8h.01" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          {error}
        </p>
      )}
    </div>
  )
}

// ─── SELECT COMPONENT ─────────────────────────────────────────────────────────
function Select({ label, error, options, placeholder, ...props }: {
  label: string; error?: string; options: string[]; placeholder: string
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const hasValue = !!props.value
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-widest text-white/35 select-none">
        {label}
      </label>
      <div className="relative">
        <select
          {...props}
          className={[
            'w-full rounded-xl bg-white/[0.04] border px-4 py-3 text-sm',
            'outline-none appearance-none cursor-pointer transition-all duration-200 pr-10',
            'hover:bg-white/[0.06] hover:border-white/15',
            'focus:bg-white/[0.07] focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/15',
            error  ? 'border-red-500/40 bg-red-500/[0.04]' : 'border-white/[0.08]',
            hasValue ? 'text-white' : 'text-white/20',
          ].join(' ')}
        >
          <option value="" disabled style={{ background: '#0d1226', color: 'rgba(255,255,255,0.3)' }}>
            {placeholder}
          </option>
          {options.map((o) => (
            <option key={o} value={o} style={{ background: '#0d1226', color: '#fff' }}>{o}</option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30"
          width="15" height="15" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
      {error && (
        <p className="flex items-center gap-1.5 text-[11px] text-red-400">
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="5.5" stroke="currentColor" strokeWidth="1"/>
            <path d="M6 3.5v3M6 8h.01" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          {error}
        </p>
      )}
    </div>
  )
}

// ─── STEPPER ─────────────────────────────────────────────────────────────────
function Stepper({ step }: { step: number }) {
  return (
    <div className="flex items-start w-full">
      {STEPS.map((s, i) => (
        <div key={s.id} className="flex items-start flex-1">
          {/* Step node */}
          <div className="flex flex-col items-center gap-2 min-w-0 flex-shrink-0">
            <div
              className="relative flex items-center justify-center rounded-full transition-all duration-300"
              style={{
                width: 32, height: 32,
                ...(s.id < step
                  ? { background: 'linear-gradient(135deg,#7c3aed,#6366f1)', boxShadow: '0 0 14px rgba(124,58,237,0.45)', color: '#fff' }
                  : s.id === step
                  ? { background: 'linear-gradient(135deg,#7c3aed,#6366f1)', boxShadow: '0 0 0 3px rgba(124,58,237,0.2), 0 0 22px rgba(124,58,237,0.5)', color: '#fff' }
                  : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.2)' }),
              }}
            >
              {s.id < step
                ? <Check size={13} />
                : <span className="text-[11px] font-bold">{s.id}</span>
              }
            </div>
            <span
              className="text-[9px] font-semibold uppercase tracking-widest whitespace-nowrap transition-colors duration-300"
              style={{
                color: s.id === step ? '#c4b5fd' : s.id < step ? 'rgba(167,139,250,0.55)' : 'rgba(255,255,255,0.18)',
              }}
            >
              {s.label}
            </span>
          </div>
          {/* Connector */}
          {i < STEPS.length - 1 && (
            <div className="flex-1 mx-1.5 mt-4 relative h-[2px]">
              <div className="absolute inset-0 rounded-full bg-white/[0.06]" />
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                style={{
                  width: s.id < step ? '100%' : '0%',
                  background: 'linear-gradient(90deg,#7c3aed,#6366f1)',
                  boxShadow: s.id < step ? '0 0 6px rgba(124,58,237,0.5)' : 'none',
                }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── ANIMATED WRAPPER ─────────────────────────────────────────────────────────
function StepPanel({ children, active }: { children: React.ReactNode; active: boolean }) {
  return (
    <div
      style={{
        opacity: active ? 1 : 0,
        transform: active ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 0.28s ease, transform 0.28s ease',
        display: active ? 'block' : 'none',
      }}
    >
      {children}
    </div>
  )
}

// ─── CONFETTI PARTICLE ────────────────────────────────────────────────────────
function ConfettiDot({ x, color, delay, duration }: { x: number; color: string; delay: number; duration: number }) {
  return (
    <div
      className="absolute top-0 w-2 h-2 rounded-full pointer-events-none"
      style={{
        left: `${x}%`,
        backgroundColor: color,
        animation: `confettiFall ${duration}s ${delay}s ease-in forwards`,
      }}
    />
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function OnboardingPreview() {
  const [step, setStep] = useState(1)
  const [animating, setAnimating] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [showConfetti, setShowConfetti] = useState(false)
  const [checkDone, setCheckDone] = useState(false)
  const prevStep = useRef(1)

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

  const confettiItems = Array.from({ length: 28 }, (_, i) => ({
    x: Math.random() * 100,
    color: ['#7c3aed','#a78bfa','#6366f1','#818cf8','#c4b5fd','#4f46e5','#e879f9'][i % 7],
    delay: Math.random() * 0.6,
    duration: 1.2 + Math.random() * 0.8,
  }))

  useEffect(() => {
    if (step === 5) {
      setShowConfetti(true)
      setTimeout(() => setCheckDone(true), 300)
      setTimeout(() => setShowConfetti(false), 2200)
    } else {
      setCheckDone(false)
    }
  }, [step])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const goTo = (next: number) => {
    prevStep.current = step
    setAnimating(true)
    setTimeout(() => {
      setStep(next)
      setAnimating(false)
    }, 160)
  }

  const handleNext = () => {
    if (step === 5) return
    const errs = validateStep(step, formData)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    goTo(step + 1)
  }

  const handleBack = () => {
    if (step > 1) goTo(step - 1)
  }

  const stepTitles: [string, string][] = [
    ['Create Company Profile',  'Set up your company to start posting placements'],
    ['Contact Details',         'How should students and campuses reach you?'],
    ['Your Company Story',      'Tell students about your mission and culture'],
    ['Brand & Presence',        'Add your logo and finalize your public profile'],
    ['You\'re all set!',        ''],
  ]
  const [title, subtitle] = stepTitles[step - 1]

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-14 relative overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, #07091a 0%, #0b0e24 45%, #060818 100%)',
        fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@600;700;800&display=swap');
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
        textarea { scrollbar-width: thin; scrollbar-color: rgba(124,58,237,0.25) transparent; }
        select option { background: #0d1226 !important; color: #fff !important; }
        @keyframes confettiFall {
          0%   { transform: translateY(-10px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(320px) rotate(720deg); opacity: 0; }
        }
        @keyframes ringPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(124,58,237,0.4), 0 0 30px rgba(124,58,237,0.25); }
          50%       { box-shadow: 0 0 0 12px rgba(124,58,237,0), 0 0 30px rgba(124,58,237,0.25); }
        }
        @keyframes checkPop {
          0%   { transform: scale(0.5); opacity: 0; }
          65%  { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .btn-continue:hover { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(124,58,237,0.5), inset 0 1px 0 rgba(255,255,255,0.12) !important; }
        .btn-continue:active { transform: translateY(0); }
        .btn-back:hover { border-color: rgba(124,58,237,0.4) !important; background: rgba(124,58,237,0.07) !important; color: rgba(255,255,255,0.8) !important; }
      `}</style>

      {/* ── Single gradient orb (clean, not noisy) ─── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute rounded-full"
          style={{
            width: 800, height: 600,
            top: '-220px', left: '50%', transform: 'translateX(-50%)',
            background: 'radial-gradient(ellipse, rgba(79,31,191,0.14) 0%, transparent 68%)',
            filter: 'blur(48px)',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: 400, height: 400,
            bottom: '-80px', right: '-60px',
            background: 'radial-gradient(circle, rgba(99,102,241,0.09) 0%, transparent 70%)',
            filter: 'blur(50px)',
          }}
        />
      </div>

      {/* ── Confetti ─────────────────────────────────── */}
      {showConfetti && (
        <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
          {confettiItems.map((c, i) => (
            <ConfettiDot key={i} {...c} />
          ))}
        </div>
      )}

      {/* ── Logo ─────────────────────────────────────── */}
      <div className="relative z-10 flex items-center gap-2.5 mb-9">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <path d="M8 1.5L9.5 6H14L10.5 8.5L12 13L8 10.5L4 13L5.5 8.5L2 6H6.5L8 1.5Z" fill="white" />
          </svg>
        </div>
        <span
          className="text-white font-bold text-[15px] tracking-tight"
          style={{ fontFamily: 'Sora, sans-serif' }}
        >
          SmartPlacement
        </span>
      </div>

      {/* ── Card ─────────────────────────────────────── */}
      <div
        className="relative z-10 w-full"
        style={{
          maxWidth: 580,
          background: 'rgba(11,14,30,0.82)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 20,
          boxShadow: '0 0 0 1px rgba(124,58,237,0.07), 0 28px 72px rgba(0,0,0,0.55), 0 6px 20px rgba(0,0,0,0.3)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
        }}
      >
        {/* ── Stepper section ──────────────────────── */}
        <div className="px-8 pt-8 pb-7">
          <Stepper step={step} />
        </div>

        {/* ── Hairline divider ─────────────────────── */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />

        {/* ── Step header ──────────────────────────── */}
        <div className="px-8 pt-7 pb-6">
          <div className="flex items-center gap-2.5 mb-4">
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-widest"
              style={{
                background: 'rgba(124,58,237,0.12)',
                border: '1px solid rgba(124,58,237,0.25)',
                color: '#a78bfa',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: '#a78bfa', boxShadow: '0 0 6px #a78bfa' }}
              />
              Step {step} of {STEPS.length}
            </span>
          </div>

          <h1
            className="text-[1.8rem] font-bold text-white leading-tight"
            style={{ fontFamily: 'Sora, sans-serif', letterSpacing: '-0.025em' }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-sm text-white/38 leading-relaxed">{subtitle}</p>
          )}
        </div>

        {/* ── Hairline divider ─────────────────────── */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.04)' }} />

        {/* ── Form body ────────────────────────────── */}
        <div
          className="px-8 py-8"
          style={{
            opacity: animating ? 0 : 1,
            transform: animating ? 'translateY(6px)' : 'translateY(0)',
            transition: 'opacity 0.16s ease, transform 0.16s ease',
          }}
        >

          {/* Step 1 — Company Info */}
          <StepPanel active={step === 1}>
            <div className="flex flex-col gap-6">
              <Input
                label="Company Name *"
                name="company_name"
                value={formData.company_name}
                onChange={handleChange}
                placeholder="e.g. Acme Technologies Pvt. Ltd."
                error={errors.company_name}
                autoComplete="organization"
              />
              <Input
                label="Company Website"
                name="website"
                value={formData.website}
                onChange={handleChange}
                placeholder="https://www.yourcompany.com"
                type="url"
                error={errors.website}
              />
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Industry *"
                  name="industry_type"
                  value={formData.industry_type}
                  onChange={handleChange}
                  placeholder="Select industry"
                  options={INDUSTRY_OPTIONS}
                  error={errors.industry_type}
                />
                <Select
                  label="Company Size *"
                  name="company_size"
                  value={formData.company_size}
                  onChange={handleChange}
                  placeholder="Select size"
                  options={COMPANY_SIZE_OPTIONS}
                  error={errors.company_size}
                />
              </div>
              <Input
                label="Founded Year"
                name="founded_year"
                value={formData.founded_year}
                onChange={handleChange}
                placeholder="e.g. 2005"
                type="number"
                min={1800}
                max={new Date().getFullYear()}
              />
            </div>
          </StepPanel>

          {/* Step 2 — Contact */}
          <StepPanel active={step === 2}>
            <div className="flex flex-col gap-6">
              <Input
                label="Company Email *"
                name="company_email"
                value={formData.company_email}
                onChange={handleChange}
                placeholder="hr@yourcompany.com"
                type="email"
                error={errors.company_email}
              />
              <Input
                label="HR Contact Number *"
                name="hr_contact_number"
                value={formData.hr_contact_number}
                onChange={handleChange}
                placeholder="+91 98765 43210"
                error={errors.hr_contact_number}
              />
              <Textarea
                label="Company Address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows={3}
                placeholder="Building, Street, City, State, PIN"
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Location / City *"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="e.g. Bengaluru, Karnataka"
                  error={errors.location}
                />
                <Input
                  label="LinkedIn URL"
                  name="linkedin_url"
                  value={formData.linkedin_url}
                  onChange={handleChange}
                  placeholder="linkedin.com/company/..."
                />
              </div>
            </div>
          </StepPanel>

          {/* Step 3 — Story */}
          <StepPanel active={step === 3}>
            <div className="flex flex-col gap-6">
              <Textarea
                label="Company Description *"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={8}
                placeholder="Tell students about your mission, products, work culture, and what makes you unique…"
                hint="A compelling description helps attract better candidates."
                error={errors.description}
              />
            </div>
          </StepPanel>

          {/* Step 4 — Branding */}
          <StepPanel active={step === 4}>
            <div className="flex flex-col gap-6">
              <Input
                label="Company Logo URL"
                name="logo_url"
                value={formData.logo_url}
                onChange={handleChange}
                placeholder="https://cdn.yourcompany.com/logo.png"
                hint="PNG, JPG or SVG. Square or landscape ratio works best."
              />

              {formData.logo_url ? (
                <div
                  className="flex items-center gap-4 rounded-xl p-4"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <img
                    src={formData.logo_url}
                    alt="Logo preview"
                    className="w-14 h-14 rounded-xl object-contain"
                    style={{ background: 'rgba(255,255,255,0.05)' }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                  <div>
                    <p className="text-sm font-semibold text-white">{formData.company_name || 'Your Company'}</p>
                    <p className="text-xs text-white/30 mt-0.5">Logo preview</p>
                  </div>
                </div>
              ) : (
                <div
                  className="flex flex-col items-center gap-3 rounded-xl p-8 text-center"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)' }}
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6"
                      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="3"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white/45">Paste a logo URL above</p>
                    <p className="text-xs text-white/22 mt-0.5">PNG, JPG or SVG · Max 2MB recommended</p>
                  </div>
                </div>
              )}
            </div>
          </StepPanel>

          {/* Step 5 — Done */}
          <StepPanel active={step === 5}>
            <div className="flex flex-col items-center gap-7 py-3 text-center">
              {/* Animated success ring */}
              <div
                className="flex items-center justify-center rounded-full"
                style={{
                  width: 80, height: 80,
                  background: 'radial-gradient(circle, rgba(124,58,237,0.22) 0%, transparent 70%)',
                  border: '1.5px solid rgba(124,58,237,0.35)',
                  animation: checkDone ? 'ringPulse 2s ease-in-out infinite' : 'none',
                  transition: 'all 0.4s ease',
                }}
              >
                <div
                  style={{
                    animation: checkDone ? 'checkPop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards' : 'none',
                    opacity: checkDone ? 1 : 0,
                  }}
                >
                  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                    <path d="M8 18l7 7 13-14" stroke="#a78bfa" strokeWidth="2.5"
                      strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>

              <div style={{ animation: checkDone ? 'fadeSlideUp 0.5s 0.2s ease both' : 'none', opacity: checkDone ? 1 : 0 }}>
                <h2
                  className="text-2xl font-bold text-white"
                  style={{ fontFamily: 'Sora, sans-serif', letterSpacing: '-0.022em' }}
                >
                  You're all set{formData.company_name ? `, ${formData.company_name}` : ''}!
                </h2>
                <p className="mt-2 text-sm text-white/38 leading-relaxed max-w-[300px] mx-auto">
                  Your company profile is ready. Start posting placements and tracking applications.
                </p>
              </div>

              {/* Summary card */}
              <div
                className="w-full rounded-xl text-left"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  animation: checkDone ? 'fadeSlideUp 0.5s 0.35s ease both' : 'none',
                  opacity: checkDone ? 1 : 0,
                }}
              >
                {([
                  ['Company',  formData.company_name],
                  ['Industry', formData.industry_type],
                  ['Location', formData.location],
                  ['Email',    formData.company_email],
                  ['Website',  formData.website],
                ] as [string, string][])
                  .filter(([, v]) => v)
                  .map(([k, v], idx, arr) => (
                    <div
                      key={k}
                      className="flex items-center justify-between gap-4 px-5 py-3.5"
                      style={{
                        borderBottom: idx < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                      }}
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-white/28">{k}</span>
                      <span className="text-xs font-medium text-violet-300 text-right truncate max-w-[60%]">{v}</span>
                    </div>
                  ))}
              </div>
            </div>
          </StepPanel>

          {/* ── Action row ───────────────────────────── */}
          <div className="flex gap-3 mt-8">
            {step > 1 && step < 5 && (
              <button
                type="button"
                onClick={handleBack}
                className="btn-back flex items-center gap-2 rounded-xl px-5 py-3.5 text-sm font-medium text-white/45 cursor-pointer transition-all duration-200 flex-shrink-0"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.09)',
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 5l-7 7 7 7"/>
                </svg>
                Back
              </button>
            )}

            {step < 5 && (
              <button
                type="button"
                onClick={handleNext}
                className="btn-continue flex flex-1 items-center justify-center gap-2.5 rounded-xl py-3.5 text-sm font-semibold text-white cursor-pointer transition-all duration-200"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                  boxShadow: '0 4px 20px rgba(124,58,237,0.38), inset 0 1px 0 rgba(255,255,255,0.1)',
                  letterSpacing: '0.01em',
                }}
              >
                {step === 4 ? 'Save & Finish' : 'Continue'}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            )}

            {step === 5 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn-continue flex flex-1 items-center justify-center gap-2.5 rounded-xl py-3.5 text-sm font-semibold text-white cursor-pointer transition-all duration-200"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                  boxShadow: '0 4px 20px rgba(124,58,237,0.38), inset 0 1px 0 rgba(255,255,255,0.1)',
                  letterSpacing: '0.01em',
                }}
              >
                Go to Dashboard
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────── */}
      <p className="relative z-10 mt-7 text-[10px] text-white/12">
        © {new Date().getFullYear()} SmartPlacement · Secure onboarding
      </p>
    </div>
  )
}
