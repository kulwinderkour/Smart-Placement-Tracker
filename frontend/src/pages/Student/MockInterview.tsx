import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface InterviewConfig {
  role: string;
  customRole: string;
  companyType: string;
  interviewerPersona: string;
  duration: string;
}

// ── Icon primitives ───────────────────────────────────────────────────────────
function Svg({ children, size = 20 }: { children: React.ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

const ICONS = {
  code:      <><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></>,
  database:  <><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/></>,
  trending:  <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>,
  cloud:     <><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></>,
  briefcase: <><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></>,
  users:     <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
  calculator:<><rect x="2" y="2" width="20" height="20" rx="2" ry="2"/><line x1="8" y1="6" x2="8" y2="6"/><line x1="12" y1="6" x2="12" y2="6"/><line x1="16" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="8" y2="10"/><line x1="12" y1="10" x2="12" y2="10"/><line x1="16" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="8" y2="18"/><line x1="12" y1="14" x2="12" y2="14"/><line x1="16" y1="14" x2="16" y2="14"/><line x1="12" y1="18" x2="16" y2="18"/></>,
  palette:   <><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></>,
  scale:     <><path d="M12 22V12"/><path d="M5 12H2l5-9 5 9H9"/><path d="M19 12h-3l5-9 5 9h-4"/><line x1="2" y1="22" x2="22" y2="22"/></>,
  msg:       <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></>,
  clock:     <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
  play:      <><polygon points="5 3 19 12 5 21 5 3"/></>,
  shuffle:   <><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></>,
};

// ── Data ─────────────────────────────────────────────────────────────────────
const ROLES = [
  { value: 'frontend-developer', label: 'Frontend Developer' },
  { value: 'backend-developer',  label: 'Backend Developer'  },
  { value: 'full-stack',         label: 'Full Stack'         },
  { value: 'data-analyst',       label: 'Data Analyst'       },
  { value: 'devops',             label: 'DevOps'             },
  { value: 'sde-1',              label: 'SDE-1'              },
  { value: 'sde-2',              label: 'SDE-2'              },
  { value: 'hr',                 label: 'HR'                 },
  { value: 'finance',            label: 'Finance'            },
  { value: 'marketing',          label: 'Marketing'          },
  { value: 'law',                label: 'Law'                },
];

const COMPANY_TYPES = [
  { value: 'product-based', label: 'Product-based', emoji: '🏢' },
  { value: 'service-based', label: 'Service-based', emoji: '🤝' },
  { value: 'startup',       label: 'Startup',       emoji: '🚀' },
  { value: 'faang',         label: 'FAANG',         emoji: '⭐' },
];

const PERSONAS = [
  { value: 'friendly-hr',       label: 'Friendly HR',       emoji: '😊', description: 'Warm & conversational — focuses on cultural fit and soft skills'         },
  { value: 'strict-technical',  label: 'Strict Technical',  emoji: '💻', description: 'Deep technical depth — algorithms, system design, problem-solving'        },
  { value: 'behavioral-expert', label: 'Behavioral Expert', emoji: '🎯', description: 'STAR-method questions — situational scenarios and competency checks'       },
  { value: 'mixed',             label: 'Mixed',             emoji: '🔀', description: 'Balanced blend of technical, behavioral and cultural questions'            },
];

const DURATIONS = ['15', '30', '45', '60'];

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ label, step, children }: { label: string; step: number; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#161b22',
      border: '1px solid #21262d',
      borderRadius: 12,
      padding: '22px 24px',
      marginBottom: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <span style={{
          width: 24, height: 24, borderRadius: '50%',
          background: '#00e5a018', color: '#00e5a0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, flexShrink: 0,
        }}>{step}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function InterviewSetup() {
  const navigate = useNavigate();

  const [config, setConfig] = useState<InterviewConfig>({
    role: '',
    customRole: '',
    companyType: '',
    interviewerPersona: '',
    duration: '30',
  });

  const [errors, setErrors] = useState<string[]>([]);
  const [hovBtn, setHovBtn] = useState(false);

  const set = (patch: Partial<InterviewConfig>) => setConfig(prev => ({ ...prev, ...patch }));

  const handleStart = () => {
    const errs: string[] = [];
    if (!config.customRole && !config.role) errs.push('role');
    if (!config.companyType)        errs.push('companyType');
    if (!config.interviewerPersona) errs.push('interviewerPersona');
    setErrors(errs);
    if (errs.length) return;

    navigate('/student/mock-interviews/room', {
      state: {
        config: {
          role: config.role,
          customRole: config.customRole,
          companyType: config.companyType,
          interviewerPersona: config.interviewerPersona,
          duration: config.duration,
        },
      },
    });
  };

  const hasErr = (field: string) => errors.includes(field);

  return (
    <div style={{ background: '#0f1117', minHeight: '100vh', color: '#e6edf3', padding: '28px 28px 48px' }}>
      <style>{`
        .mi-select option { background: #161b22; color: #e6edf3; }
        .mi-select:focus { border-color: #00e5a0 !important; box-shadow: 0 0 0 3px #00e5a018; }
        .mi-input:focus  { border-color: #00e5a0 !important; box-shadow: 0 0 0 3px #00e5a018; }
        .mi-card:hover   { border-color: #30363d !important; background: #1c2128 !important; }
        .mi-card.selected:hover { border-color: #00e5a0 !important; }
      `}</style>

      <div style={{ maxWidth: 740, margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: '#00e5a018', color: '#00e5a0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Svg size={18}>{ICONS.play}</Svg>
            </div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#e6edf3' }}>
              Mock Interview Setup
            </h1>
          </div>
          <p style={{ margin: '0 0 0 48px', fontSize: 13, color: '#7d8590' }}>
            Configure your AI-powered interview session and get started in seconds.
          </p>
        </div>

        {/* ── Step 1: Role ── */}
        <Section label="Select Your Role" step={1}>
          <select
            className="mi-select"
            value={config.role}
            onChange={e => set({ role: e.target.value, customRole: '' })}
            style={{
              width: '100%', padding: '10px 14px',
              background: '#0f1117',
              border: `1px solid ${hasErr('role') ? '#da3633' : '#30363d'}`,
              borderRadius: 8, color: config.role ? '#e6edf3' : '#7d8590',
              fontSize: 13, marginBottom: 10, outline: 'none', cursor: 'pointer',
              transition: 'border-color 0.15s, box-shadow 0.15s',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237d8590' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
            }}
          >
            <option value="">Choose your role…</option>
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <div style={{
              position: 'absolute', left: 12, color: '#484f58',
              display: 'flex', alignItems: 'center', pointerEvents: 'none',
            }}>
              <Svg size={14}>{ICONS.code}</Svg>
            </div>
            <input
              className="mi-input"
              type="text"
              placeholder="Or type a custom role (e.g. Product Manager, Data Engineer…)"
              value={config.customRole}
              onChange={e => set({ role: '', customRole: e.target.value })}
              style={{
                width: '100%', padding: '10px 14px 10px 34px',
                background: '#0f1117',
                border: `1px solid ${hasErr('role') && !config.customRole ? '#da3633' : '#30363d'}`,
                borderRadius: 8, color: '#e6edf3',
                fontSize: 13, outline: 'none',
                transition: 'border-color 0.15s, box-shadow 0.15s',
                boxSizing: 'border-box',
              }}
            />
          </div>
          {hasErr('role') && (
            <p style={{ margin: '6px 0 0', fontSize: 12, color: '#f85149' }}>
              Please select a role or enter a custom one.
            </p>
          )}
        </Section>

        {/* ── Step 2: Company Type ── */}
        <Section label="Company Type" step={2}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {COMPANY_TYPES.map(c => {
              const selected = config.companyType === c.value;
              return (
                <div
                  key={c.value}
                  className={`mi-card${selected ? ' selected' : ''}`}
                  onClick={() => set({ companyType: c.value })}
                  style={{
                    background: selected ? '#00e5a010' : '#0f1117',
                    border: `${selected ? 2 : 1}px solid ${selected ? '#00e5a0' : hasErr('companyType') ? '#da363344' : '#30363d'}`,
                    borderRadius: 10, padding: '16px 12px',
                    cursor: 'pointer', textAlign: 'center',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ fontSize: 22, marginBottom: 8 }}>{c.emoji}</div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: selected ? '#00e5a0' : '#e6edf3' }}>
                    {c.label}
                  </div>
                </div>
              );
            })}
          </div>
          {hasErr('companyType') && (
            <p style={{ margin: '8px 0 0', fontSize: 12, color: '#f85149' }}>
              Please select a company type.
            </p>
          )}
        </Section>

        {/* ── Step 3: Interviewer Persona ── */}
        <Section label="Interviewer Persona" step={3}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {PERSONAS.map(p => {
              const selected = config.interviewerPersona === p.value;
              return (
                <div
                  key={p.value}
                  className={`mi-card${selected ? ' selected' : ''}`}
                  onClick={() => set({ interviewerPersona: p.value })}
                  style={{
                    background: selected ? '#00e5a010' : '#0f1117',
                    border: `${selected ? 2 : 1}px solid ${selected ? '#00e5a0' : hasErr('interviewerPersona') ? '#da363344' : '#30363d'}`,
                    borderRadius: 10, padding: '16px',
                    cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 12,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: 8, flexShrink: 0,
                    background: selected ? '#00e5a020' : '#21262d',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, transition: 'all 0.15s',
                  }}>
                    {p.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: selected ? '#00e5a0' : '#e6edf3', marginBottom: 4 }}>
                      {p.label}
                    </div>
                    <div style={{ fontSize: 11, color: '#7d8590', lineHeight: 1.5 }}>
                      {p.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {hasErr('interviewerPersona') && (
            <p style={{ margin: '8px 0 0', fontSize: 12, color: '#f85149' }}>
              Please select an interviewer persona.
            </p>
          )}
        </Section>

        {/* ── Step 4: Duration ── */}
        <Section label="Interview Duration" step={4}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {DURATIONS.map(d => {
              const selected = config.duration === d;
              return (
                <button
                  key={d}
                  onClick={() => set({ duration: d })}
                  style={{
                    padding: '8px 20px',
                    background: selected ? '#00e5a0' : '#0f1117',
                    border: `${selected ? 2 : 1}px solid ${selected ? '#00e5a0' : '#30363d'}`,
                    borderRadius: 20, cursor: 'pointer',
                    color: selected ? '#0f1117' : '#e6edf3',
                    fontSize: 13, fontWeight: selected ? 600 : 400,
                    display: 'flex', alignItems: 'center', gap: 6,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{ color: selected ? '#0f1117' : '#7d8590', display: 'flex' }}>
                    <Svg size={13}>{ICONS.clock}</Svg>
                  </span>
                  {d} min
                </button>
              );
            })}
          </div>
          <p style={{ margin: '10px 0 0', fontSize: 11, color: '#484f58' }}>
            Longer sessions include more follow-up questions and deeper technical probing.
          </p>
        </Section>

        {/* ── Start Button ── */}
        <button
          onClick={handleStart}
          onMouseEnter={() => setHovBtn(true)}
          onMouseLeave={() => setHovBtn(false)}
          style={{
            width: '100%', padding: '14px',
            background: hovBtn ? '#00c896' : '#00e5a0',
            border: 'none', borderRadius: 10,
            fontSize: 14, fontWeight: 600, color: '#0f1117',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transform: hovBtn ? 'translateY(-1px)' : 'translateY(0)',
            boxShadow: hovBtn ? '0 4px 16px #00e5a040' : '0 2px 8px #00e5a020',
            transition: 'all 0.15s ease',
          }}
        >
          <Svg size={16}>{ICONS.play}</Svg>
          Start Interview
        </button>

      </div>
    </div>
  );
}
