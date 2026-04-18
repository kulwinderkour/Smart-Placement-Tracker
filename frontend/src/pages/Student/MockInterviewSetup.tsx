import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

/* ─── Monochrome SVG icons ─── */
const IconMic = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
  </svg>
)
const IconBuilding = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21h18M3 21V7l9-4 9 4v14M9 21v-6h6v6"/>
    <path d="M9 9h.01M15 9h.01M9 13h.01M15 13h.01"/>
  </svg>
)
const IconNetwork = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="8" r="3"/><path d="M9 11c-4 0-6 1.8-6 3.5V17h12v-2.5C15 12.8 13 11 9 11z"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75M22 17.5c0-1.7-2-3.5-6-3.5"/>
  </svg>
)
const IconRocket = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2 2.63-2.37 2-3c-.63-.63-2.63.5-5 0z"/>
    <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
  </svg>
)
const IconStar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
)
const IconArrow = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>
)

/* ─── Data ─── */
const DEFAULT_ROLES = [
  'Software Engineer', 'Data Analyst', 'Product Manager', 'Marketing Manager', 
  'Financial Analyst', 'HR Specialist', 'Legal Counsel', 'UI/UX Designer'
]

const COMPANY_TYPES = [
  { id: 'product', label: 'Product-based', sub: 'Own products, own roadmap',      Icon: IconBuilding, premium: true  },
  { id: 'service', label: 'Service-based', sub: 'Client work, delivery focus',    Icon: IconNetwork,  premium: false },
  { id: 'startup', label: 'Startup',       sub: 'High velocity, high ownership',  Icon: IconRocket,   premium: false },
  { id: 'faang',   label: 'FAANG',         sub: 'Tier-1, bar-raiser standards',   Icon: IconStar,     premium: true  },
]

const PERSONAS = [
  { id: 'friendly-hr',      label: 'Friendly HR',      char: 'H' },
  { id: 'strict-technical', label: 'Strict Technical', char: 'T' },
  { id: 'behavioral',       label: 'Behavioral',       char: 'B' },
  { id: 'mixed',            label: 'Mixed',            char: 'M' },
]

const DURATIONS = [15, 30, 45, 60]

export default function MockInterviewSetup() {
  const navigate = useNavigate()
  const [role, setRole]             = useState('')
  const [customRole, setCustomRole] = useState('')
  const [useCustom, setUseCustom]   = useState(false)
  const [companyType, setCompanyType] = useState('')
  const [persona, setPersona]       = useState('')
  const [duration, setDuration]     = useState(30)
  const [dynamicRoles, setDynamicRoles] = useState<string[]>([])
  const [loadingRoles, setLoadingRoles] = useState(false)
  const [errors, setErrors]         = useState<Record<string, string>>({})

  useEffect(() => {
    const profile = JSON.parse(localStorage.getItem('userProfile') || '{}')
    const field = profile.branch || 'Software'
    setLoadingRoles(true)
    fetch(`http://localhost:8081/api/skills/suggestions?field=${field}`)
      .then(res => res.json())
      .then(data => setDynamicRoles(data.skills || DEFAULT_ROLES))
      .catch(() => setDynamicRoles(DEFAULT_ROLES))
      .finally(() => setLoadingRoles(false))
  }, [])

  const finalRole = useCustom ? customRole.trim() : role

  function validate() {
    const e: Record<string, string> = {}
    if (!finalRole)   e.role        = 'Select or enter a role'
    if (!companyType) e.companyType = 'Select a company type'
    if (!persona)     e.persona     = 'Select a persona'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleStart() {
    if (!validate()) return
    navigate('/mock-interview/room', { state: { role: finalRole, companyType, persona, duration } })
  }

  return (
    <div style={{ background: 'var(--student-bg)', minHeight: '100vh', color: 'var(--student-text)', padding: '48px 24px 80px' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800&display=swap');

        .si-root * { box-sizing: border-box; }

        /* Select */
        .si-select-wrap { position: relative; }
        .si-select {
          width: 100%; background: var(--student-surface); color: var(--student-text);
          border: 1px solid var(--student-border); border-left: 3px solid transparent;
          border-radius: 10px; padding: 12px 40px 12px 14px;
          font-size: 14px; appearance: none; cursor: pointer;
          transition: border-color 0.2s, border-left-color 0.2s; outline: none;
          font-family: inherit;
        }
        .si-select:focus { border-color: var(--student-border-strong); border-left-color: var(--student-accent); }
        .si-select option { background: var(--student-surface); color: var(--student-text); }
        .si-arrow {
          position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
          pointer-events: none; color: var(--student-text-muted);
        }
        .si-select-arrow {
          position: absolute; right: 13px; top: 50%; transform: translateY(-50%) rotate(90deg);
          pointer-events: none; color: var(--student-text-muted);
        }
        .si-custom-input {
          width: 100%; background: var(--student-surface); color: var(--student-text);
          border: 1px solid var(--student-border); border-left: 3px solid var(--student-accent);
          border-radius: 10px; padding: 12px 14px;
          font-size: 14px; font-family: inherit; outline: none;
          transition: border-color 0.2s;
        }
        .si-custom-input:focus { border-color: var(--student-border-strong); border-left-color: var(--student-accent); }
        .si-custom-input::placeholder { color: var(--student-text-dim); }

        /* Company cards */
        .co-card {
          border: 1px solid var(--student-border); border-radius: 12px; cursor: pointer;
          padding: 18px 18px 18px 20px; position: relative; overflow: hidden;
          transition: border-color 0.18s, background 0.18s;
          background: transparent;
        }
        .co-card::before {
          content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
          background: var(--student-accent); transform: scaleY(0); transition: transform 0.18s;
          transform-origin: center;
        }
        .co-card:hover { border-color: var(--student-border-strong); background: var(--student-surface-hover); }
        .co-card:hover::before { transform: scaleY(1); }
        .co-card.co-active { background: var(--student-accent-bg); border-color: var(--student-accent-border); }
        .co-card.co-active::before { transform: scaleY(1); }
        .co-card.co-active .co-label { color: var(--student-accent); }

        /* Persona chips */
        .persona-chip {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 9px 18px; border-radius: 100px; cursor: pointer; white-space: nowrap;
          border: 1px solid var(--student-border); background: var(--student-surface); color: var(--student-text-muted);
          font-size: 13px; font-family: inherit; transition: all 0.15s;
        }
        .persona-chip:hover { border-color: var(--student-border-strong); color: var(--student-text); background: var(--student-surface-hover); }
        .persona-chip.p-active { background: var(--student-accent); border-color: var(--student-accent); color: #ffffff; font-weight: 600; }
        .persona-char {
          width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center;
          justify-content: center; font-size: 10px; font-weight: 700;
          background: rgba(255,255,255,0.08); flex-shrink: 0;
        }
        .p-active .persona-char { background: rgba(0,0,0,0.15); }

        /* Segmented control */
        .seg-wrap { display: flex; border: 1px solid var(--student-border); border-radius: 10px; overflow: hidden; }
        .seg-btn {
          flex: 1; padding: 10px 8px; background: transparent; border: none;
          border-right: 1px solid var(--student-border); color: var(--student-text-muted); font-size: 13px;
          cursor: pointer; font-family: inherit; transition: all 0.15s;
        }
        .seg-btn:last-child { border-right: none; }
        .seg-btn:hover { color: var(--student-text-secondary); background: var(--student-surface-hover); }
        .seg-btn.seg-active { background: var(--student-accent-bg); color: var(--student-accent); font-weight: 600; }

        /* Section label */
        .sec-label {
          font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;
          color: var(--student-text-muted); margin: 0 0 12px;
        }

        /* CTA btn */
        .cta-btn {
          padding: 14px 36px; border: none; border-radius: 10px;
          background: var(--student-accent); color: #ffffff; font-size: 14px; font-weight: 700;
          cursor: pointer; font-family: 'Sora', inherit; display: inline-flex; align-items: center; gap: 8px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.15);
          transition: opacity 0.15s, transform 0.15s;
          white-space: nowrap;
        }
        .cta-btn:hover { opacity: 0.92; transform: translateY(-1px); }

        /* Error */
        .si-err { font-size: 11px; color: #F85149; margin: 6px 0 0; }

        /* Scrollbar for chip row */
        .chip-row { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; }
        .chip-row::-webkit-scrollbar { height: 3px; }
        .chip-row::-webkit-scrollbar-thumb { background: var(--student-border); border-radius: 3px; }
      `}</style>

      <div className="si-root" style={{ maxWidth: 640, margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 48 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, flexShrink: 0,
            background: 'var(--student-accent-bg)',
            border: '1px solid var(--student-accent-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--student-accent)',
          }}>
            <IconMic />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h1 style={{ margin: 0, fontFamily: 'Sora, sans-serif', fontSize: 26, fontWeight: 700, letterSpacing: '-0.8px', color: 'var(--student-text)', lineHeight: 1 }}>
                Mock Interview
              </h1>
              <span style={{ fontFamily: 'monospace', fontSize: 10, background: 'var(--student-surface)', color: 'var(--student-text-muted)', border: '1px solid var(--student-border)', borderRadius: 5, padding: '2px 7px', letterSpacing: '0.05em' }}>v2.1</span>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--student-border)', fontWeight: 300, letterSpacing: '0.01em' }}>
              AI-powered interview simulator — tuned to your role
            </p>
          </div>
        </div>

        {/* ── Target Role ── */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p className="sec-label" style={{ margin: 0 }}>Target Role</p>
            <button
              onClick={() => { setUseCustom(!useCustom); setRole(''); setCustomRole('') }}
              style={{
                fontSize: 12, color: 'var(--student-accent)', background: 'none', border: 'none', cursor: 'pointer',
                padding: 0, textDecoration: useCustom ? 'none' : 'none', fontFamily: 'inherit',
                borderBottom: '1px solid transparent', transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderBottomColor = 'var(--student-accent)')}
              onMouseLeave={e => (e.currentTarget.style.borderBottomColor = 'transparent')}
            >
              {useCustom ? '← Choose from list' : '+ Custom role'}
            </button>
          </div>
          {useCustom ? (
            <input
              className="si-custom-input"
              placeholder="e.g. Machine Learning Engineer"
              value={customRole}
              onChange={e => setCustomRole(e.target.value)}
            />
          ) : (
            <div className="si-select-wrap">
              <select className="si-select" value={role} onChange={e => setRole(e.target.value)}>
                <option value="">Select a role…</option>
                {loadingRoles ? (
                  <option disabled>Loading roles for your field...</option>
                ) : (
                  <>
                    <optgroup label="Suggested for You">
                      {dynamicRoles.map(r => <option key={r} value={r}>{r}</option>)}
                    </optgroup>
                    <optgroup label="Standard Roles">
                      {DEFAULT_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </optgroup>
                  </>
                )}
              </select>
              <span className="si-select-arrow">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>
              </span>
            </div>
          )}
          {errors.role && <p className="si-err">{errors.role}</p>}
        </div>

        {/* ── Company Type ── */}
        <div style={{ marginBottom: 40 }}>
          <p className="sec-label">Company Type</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 0.88fr', gap: 10 }}>
            {COMPANY_TYPES.map(c => (
              <div key={c.id}
                className={`co-card${companyType === c.id ? ' co-active' : ''}`}
                style={{ minHeight: c.premium ? 108 : 90 }}
                onClick={() => setCompanyType(c.id)}
              >
                <div style={{ color: companyType === c.id ? 'var(--student-accent)' : 'var(--student-border)', marginBottom: 10, transition: 'color 0.15s' }}>
                  <c.Icon />
                </div>
                <div className="co-label" style={{ fontSize: 13, fontWeight: 600, color: 'var(--student-text)', marginBottom: 4, transition: 'color 0.15s' }}>
                  {c.label}
                </div>
                <div style={{ fontSize: 11, color: 'var(--student-border)', lineHeight: 1.4 }}>{c.sub}</div>
              </div>
            ))}
          </div>
          {errors.companyType && <p className="si-err">{errors.companyType}</p>}
        </div>

        {/* ── Interviewer Persona ── */}
        <div style={{ marginBottom: 40 }}>
          <p className="sec-label">Interviewer Persona</p>
          <div className="chip-row">
            {PERSONAS.map(p => (
              <button key={p.id}
                className={`persona-chip${persona === p.id ? ' p-active' : ''}`}
                onClick={() => setPersona(p.id)}
              >
                <span className="persona-char">{p.char}</span>
                {p.label}
              </button>
            ))}
          </div>
          {errors.persona && <p className="si-err">{errors.persona}</p>}
        </div>

        {/* ── Duration ── */}
        <div style={{ marginBottom: 48 }}>
          <p className="sec-label">Session Duration</p>
          <div className="seg-wrap">
            {DURATIONS.map(d => (
              <button key={d} className={`seg-btn${duration === d ? ' seg-active' : ''}`} onClick={() => setDuration(d)}>
                {d} min
              </button>
            ))}
          </div>
        </div>

        {/* ── CTA ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--student-border)', letterSpacing: '0.02em', flexShrink: 0 }}>
            ~{duration} min session
          </span>
          <button className="cta-btn" onClick={handleStart}>
            Begin Interview
            <IconArrow />
          </button>
        </div>

      </div>
    </div>
  )
}
