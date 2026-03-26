import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

// ── Types & Helpers ──────────────────────────────────────────────────────────
interface PastApp { company: string; status: string }
interface UserProfile {
  fullName?: string; college?: string; branch?: string; cgpa?: string;
  graduationYear?: string; skills?: string[]; jobType?: string;
  resumeName?: string; resumeBase64?: string; resumeUrl?: string;
  hasExperience?: boolean; previousCompanies?: PastApp[]
}

const STATUS_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  Applied:    { bg: '#1f2d3d', color: '#58a6ff', border: '1px solid #1f6feb33' },
  Interviewed:{ bg: '#2d2208', color: '#d29922', border: '1px solid #9e6a0333' },
  Offered:    { bg: '#1a2e22', color: '#3fb950', border: '1px solid #23863633' },
  Rejected:   { bg: '#2d1b1b', color: '#f85149', border: '1px solid #da363333' },
}

function calcReadiness(profile: UserProfile): number {
  let score = 0
  if (profile.fullName && profile.college) score += 20
  if (profile.skills?.length) score += 20
  if (profile.resumeName || profile.resumeUrl) score += 20
  if (profile.hasExperience && profile.previousCompanies?.length) score += 20
  if (parseFloat(profile.cgpa || '0') >= 7.0) score += 20
  return score
}

// ── Components ───────────────────────────────────────────────────────────────

function StatCard({ value, label, icon, accent }: { value: string | number; label: string; icon: string; accent: string }) {
  const [hov, setHov] = useState(false)
  return (
    <div 
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: '#161b22', border: `1px solid ${hov ? '#30363d' : '#21262d'}`,
        borderRadius: 10, padding: '20px 22px', flex: 1, minWidth: 200, transition: 'all 0.15s ease'
      }}>
      <div style={{ color: accent, marginBottom: 16 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d={icon} />
        </svg>
      </div>
      <h3 style={{ margin: 0, fontSize: 28, fontWeight: 600, color: '#e6edf3', lineHeight: 1.2 }}>{value}</h3>
      <p style={{ margin: '4px 0 0', fontSize: 12, color: '#7d8590', fontWeight: 500 }}>{label}</p>
    </div>
  )
}

function ActionCard({ icon, title, subtitle, to }: { icon: string; title: string; subtitle: string; to: string }) {
  const [hov, setHov] = useState(false)
  return (
    <Link to={to} 
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? '#1c2128' : '#161b22',
        border: `1px solid ${hov ? '#30363d' : '#21262d'}`,
        borderRadius: 10, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14,
        textDecoration: 'none', transition: 'all 0.15s ease', cursor: 'pointer'
      }}
    >
      <div style={{ color: '#20c997', flexShrink: 0 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d={icon} />
        </svg>
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: '#e6edf3', lineHeight: 1.5 }}>{title}</p>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#7d8590', lineHeight: 1.5 }}>{subtitle}</p>
      </div>
      <span style={{ color: hov ? '#7d8590' : '#484f58', fontSize: 18 }}>→</span>
    </Link>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuthStore()
  const profile: UserProfile = JSON.parse(localStorage.getItem('userProfile') || '{}')
  const readiness = calcReadiness(profile)
  const firstName = profile.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'Member'

  const companies = profile.previousCompanies?.filter(c => c.company) || []
  const skills = profile.skills || []

  const gradYear = parseInt(profile.graduationYear || '2025', 10)
  const diffDays = Math.max(0, Math.ceil((new Date(gradYear, 5, 1).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#0d1117' }}>
      
      {/* ── Top Bar ── */}
      <header style={{
        background: '#0d1117', borderBottom: '1px solid #21262d',
        padding: '14px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'sticky', top: 0, zIndex: 10
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 500, color: '#e6edf3' }}>
            Good morning, {firstName} 👋
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#7d8590' }}>
            {skills.length > 0 ? `Track your profile and skills efficiently.` : `Complete your profile to boost placement readiness.`}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ color: '#7d8590', cursor: 'pointer' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </div>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#20c99722', color: '#20c997', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600 }}>
            {firstName[0].toUpperCase()}
          </div>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, padding: '20px 28px' }}>
        
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* Stats Row */}
          <div style={{ display: 'flex', gap: 16 }}>
            <StatCard value={`${readiness}%`} label="Readiness" icon="M22 12h-4l-3 9L9 3l-3 9H2" accent="#20c997" />
            <StatCard value={skills.length} label="Skills" icon="M13 2L3 14h9l-1 8 10-12h-9l1-8z" accent="#7c3aed" />
            <StatCard value={companies.length} label="Apps" icon="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" accent="#1f6feb" />
            <StatCard value={`${diffDays}d`} label="To Season" icon="M12 6v6l4 2" accent="#da3633" />
          </div>

          {/* Readiness Bar */}
          <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 10, padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: '#e6edf3' }}>Placement Readiness</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#20c997' }}>{readiness}%</span>
            </div>
            <div style={{ height: 6, background: '#21262d', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${readiness}%`, height: '100%', background: '#20c997', transition: 'width 0.8s ease' }} />
            </div>
            <p style={{ margin: '8px 0 0', fontSize: 12, color: '#7d8590' }}>
              💡 Profile completion status. Upload your latest resume to reach 100%.
            </p>
          </div>

          {/* Quick Actions Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <ActionCard title="Browse Jobs" subtitle="Roles for you" to="/jobs" icon="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            <ActionCard title="Resume Analyser" subtitle="Check ATS Score" to="/resume" icon="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <ActionCard title="Application Tracker" subtitle="Manage pipeline" to="/tracker" icon="M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6" />
          </div>

          {/* Recent Apps */}
          <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 10, padding: '20px 24px' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 500, color: '#e6edf3' }}>Recent Applications</h2>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {companies.length > 0 ? companies.map((app, i) => {
                const s = STATUS_STYLES[app.status] || STATUS_STYLES['Applied']
                return (
                  <div key={i} style={{ 
                    padding: '12px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    borderBottom: i === companies.length - 1 ? 'none' : '1px solid #21262d'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 6, background: '#21262d', color: '#7d8590',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 500
                      }}>{app.company[0].toUpperCase()}</div>
                      <div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: '#e6edf3' }}>{app.company}</p>
                        <p style={{ margin: 0, fontSize: 12, color: '#7d8590' }}>Mar 2024</p>
                      </div>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 4,
                      background: s.bg, color: s.color, border: s.border
                    }}>{app.status}</span>
                  </div>
                )
              }) : (
                <p style={{ fontSize: 13, color: '#7d8590', margin: 0 }}>No active applications.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Profile Summary */}
        <aside style={{
          background: '#161b22', border: '1px solid #21262d', borderRadius: 10,
          padding: '20px', position: 'sticky', top: 16, height: 'fit-content'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%', background: '#20c99718', color: '#20c997',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600
            }}>{firstName[0].toUpperCase()}</div>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e6edf3' }}>{profile.fullName || 'User'}</h3>
              <p style={{ margin: 0, fontSize: 12, color: '#7d8590' }}>Batch of {profile.graduationYear}</p>
            </div>
          </div>

          <div style={{ height: 1, background: '#21262d', margin: '16px 0' }} />

          {/* CGPA Section */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: '#7d8590' }}>Academic CGPA</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#e6edf3' }}>{profile.cgpa} / 10</span>
            </div>
            <div style={{ height: 4, background: '#21262d', borderRadius: 2 }}>
              <div style={{ width: `${(parseFloat(profile.cgpa || '0') / 10) * 100}%`, height: '100%', background: '#20c997', borderRadius: 2 }} />
            </div>
          </div>

          {/* Skills Section */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 600, color: '#484f58', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Skills</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {skills.map(s => (
                <span key={s} style={{
                  background: '#21262d', color: '#7d8590', padding: '3px 10px', borderRadius: 4, fontSize: 11, border: '1px solid transparent'
                }}>{s}</span>
              ))}
            </div>
          </div>

          <div style={{ height: 1, background: '#21262d', margin: '16px 0' }} />

          {/* Resume Section */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#3fb950', fontSize: 12 }}>✓</span>
              <span style={{ fontSize: 12, color: '#3fb950', fontWeight: 500 }}>resume.pdf</span>
            </div>
            <Link to="/resume" style={{ fontSize: 12, fontWeight: 500, color: '#58a6ff', textDecoration: 'none' }}>View →</Link>
          </div>

          <Link to="/profile" style={{
            display: 'block', marginTop: 24, textAlign: 'center', fontSize: 13, fontWeight: 500,
            color: '#20c997', textDecoration: 'none', padding: '10px', borderRadius: 6,
            border: '1px solid #21262d', background: '#0d1117'
          }}>Edit Profile</Link>
        </aside>

      </div>
    </div>
  )
}
