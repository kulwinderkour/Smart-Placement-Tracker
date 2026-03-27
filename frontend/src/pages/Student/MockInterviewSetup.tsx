import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const ROLES = [
  'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
  'Data Analyst', 'DevOps Engineer', 'SDE-1', 'SDE-2',
  'HR', 'Finance Analyst', 'Marketing', 'Law',
]

const COMPANY_TYPES = [
  { id: 'product',  label: 'Product-based', icon: '🏢', desc: 'Companies that build their own products' },
  { id: 'service',  label: 'Service-based', icon: '🤝', desc: 'IT services and outsourcing firms' },
  { id: 'startup',  label: 'Startup',       icon: '🚀', desc: 'Fast-paced early-stage companies' },
  { id: 'faang',    label: 'FAANG',         icon: '⭐', desc: 'Top-tier tech giants' },
]

const PERSONAS = [
  { id: 'friendly-hr',       label: 'Friendly HR',       icon: '😊', desc: 'Warm & conversational — culture fit and soft skills focus' },
  { id: 'strict-technical',  label: 'Strict Technical',  icon: '🔬', desc: 'Rigorous & deep — challenges you on every technical detail' },
  { id: 'behavioral',        label: 'Behavioral Expert', icon: '🧠', desc: 'STAR-method driven — explores past experiences in depth' },
  { id: 'mixed',             label: 'Mixed',             icon: '🎯', desc: 'Balanced technical, behavioral and situational questions' },
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
  const [errors, setErrors]         = useState<Record<string, string>>({})

  const finalRole = useCustom ? customRole.trim() : role

  function validate() {
    const e: Record<string, string> = {}
    if (!finalRole)    e.role        = 'Please select or enter a role'
    if (!companyType)  e.companyType = 'Please select a company type'
    if (!persona)      e.persona     = 'Please select an interviewer persona'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleStart() {
    if (!validate()) return
    navigate('/mock-interview/room', {
      state: { role: finalRole, companyType, persona, duration },
    })
  }

  return (
    <div style={{ background: '#0f1117', minHeight: '100vh', color: '#e6edf3', padding: '32px 24px 60px' }}>
      <style>{`
        .mi-card { background: rgba(22,27,34,0.9); border: 1px solid #21262d; border-radius: 16px; padding: 28px; }
        .mi-sel  { border: 2px solid #21262d; border-radius: 12px; cursor: pointer; padding: 16px; transition: all 0.15s; }
        .mi-sel:hover  { border-color: #00e5a0; background: rgba(0,229,160,0.04); }
        .mi-sel.active { border-color: #00e5a0; background: rgba(0,229,160,0.08); }
        .mi-pill { border: 1.5px solid #30363d; border-radius: 20px; padding: 7px 22px; cursor: pointer; font-size: 14px; font-weight: 500; background: transparent; transition: all 0.15s; color: #7d8590; }
        .mi-pill:hover  { border-color: #00e5a0; color: #e6edf3; }
        .mi-pill.active { border-color: #00e5a0; background: rgba(0,229,160,0.12); color: #00e5a0; }
        .mi-select { background: #0d1117; border: 1px solid #30363d; color: #e6edf3; border-radius: 8px; padding: 10px 12px; font-size: 13px; width: 100%; }
        .mi-select:focus { border-color: #00e5a0; outline: none; }
        .mi-input  { background: #0d1117; border: 1px solid #30363d; color: #e6edf3; border-radius: 8px; padding: 10px 12px; font-size: 13px; width: 100%; box-sizing: border-box; font-family: inherit; }
        .mi-input:focus  { border-color: #00e5a0; outline: none; }
        .mi-start { width: 100%; padding: 14px; border-radius: 12px; border: none; background: linear-gradient(135deg, #00e5a0, #00c8c8); color: #0a0f1a; font-size: 15px; font-weight: 700; cursor: pointer; letter-spacing: 0.01em; transition: transform 0.15s, box-shadow 0.15s; }
        .mi-start:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(0,229,160,0.3); }
        @media (max-width: 640px) { .mi-2col { grid-template-columns: 1fr !important; } }
      `}</style>

      <div style={{ maxWidth: 800, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: 'rgba(0,229,160,0.12)', border: '1px solid rgba(0,229,160,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, margin: '0 auto 16px',
          }}>🎙️</div>
          <h1 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>Mock Interview Setup</h1>
          <p style={{ margin: 0, color: '#7d8590', fontSize: 14 }}>Configure your AI-powered interview session</p>
        </div>

        <div className="mi-card" style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>

          {/* ── Role ── */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3' }}>Target Role</label>
              <button
                onClick={() => { setUseCustom(!useCustom); setRole(''); setCustomRole('') }}
                style={{ fontSize: 12, color: '#00e5a0', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                {useCustom ? '← Choose from list' : '+ Custom role'}
              </button>
            </div>
            {useCustom ? (
              <input
                className="mi-input"
                placeholder="e.g. Machine Learning Engineer"
                value={customRole}
                onChange={e => setCustomRole(e.target.value)}
              />
            ) : (
              <select className="mi-select" value={role} onChange={e => setRole(e.target.value)}>
                <option value="">Select a role…</option>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            )}
            {errors.role && <p style={{ margin: '6px 0 0', fontSize: 12, color: '#f85149' }}>⚠ {errors.role}</p>}
          </div>

          {/* ── Company type ── */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#e6edf3', marginBottom: 12 }}>Company Type</label>
            <div className="mi-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {COMPANY_TYPES.map(c => (
                <div key={c.id}
                  className={`mi-sel${companyType === c.id ? ' active' : ''}`}
                  onClick={() => setCompanyType(c.id)}
                >
                  <div style={{ fontSize: 22, marginBottom: 8 }}>{c.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: companyType === c.id ? '#00e5a0' : '#e6edf3', marginBottom: 4 }}>{c.label}</div>
                  <div style={{ fontSize: 11, color: '#7d8590' }}>{c.desc}</div>
                </div>
              ))}
            </div>
            {errors.companyType && <p style={{ margin: '6px 0 0', fontSize: 12, color: '#f85149' }}>⚠ {errors.companyType}</p>}
          </div>

          {/* ── Persona ── */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#e6edf3', marginBottom: 12 }}>Interviewer Persona</label>
            <div className="mi-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {PERSONAS.map(p => (
                <div key={p.id}
                  className={`mi-sel${persona === p.id ? ' active' : ''}`}
                  onClick={() => setPersona(p.id)}
                >
                  <div style={{ fontSize: 22, marginBottom: 8 }}>{p.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: persona === p.id ? '#00e5a0' : '#e6edf3', marginBottom: 4 }}>{p.label}</div>
                  <div style={{ fontSize: 11, color: '#7d8590' }}>{p.desc}</div>
                </div>
              ))}
            </div>
            {errors.persona && <p style={{ margin: '6px 0 0', fontSize: 12, color: '#f85149' }}>⚠ {errors.persona}</p>}
          </div>

          {/* ── Duration ── */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#e6edf3', marginBottom: 12 }}>Duration</label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {DURATIONS.map(d => (
                <button key={d} className={`mi-pill${duration === d ? ' active' : ''}`} onClick={() => setDuration(d)}>
                  {d} min
                </button>
              ))}
            </div>
          </div>

          {/* ── Start ── */}
          <button className="mi-start" onClick={handleStart}>
            🎙️ &nbsp;Start Mock Interview
          </button>

        </div>
      </div>
    </div>
  )
}
