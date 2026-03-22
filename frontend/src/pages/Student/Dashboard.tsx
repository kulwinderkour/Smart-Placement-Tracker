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
  Applied:    { bg: 'rgba(59,130,246,0.15)', color: '#93c5fd', border: 'rgba(59,130,246,0.25)' },
  Interviewed:{ bg: 'rgba(245,158,11,0.15)', color: '#fcd34d', border: 'rgba(245,158,11,0.25)' },
  Offered:    { bg: 'rgba(16,185,129,0.15)', color: '#6ee7b7', border: 'rgba(16,185,129,0.25)' },
  Rejected:   { bg: 'rgba(239,68,68,0.15)',  color: '#fca5a5', border: 'rgba(239,68,68,0.25)' },
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

// ── Glass Components ──────────────────────────────────────────────────────────

function StatCard({ value, label, icon, glowColor, trend }: { 
  value: string | number; label: string; icon: React.ReactNode; glowColor: string; trend?: string 
}) {
  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: 22,
      padding: '24px',
      flex: 1,
      minWidth: 200,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Subtle Corner Glow */}
      <div style={{
        position: 'absolute', top: -30, right: -30, width: 100, height: 100,
        borderRadius: '50%', background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
        zIndex: 0, pointerEvents: 'none'
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 14, background: 'rgba(255, 255, 255, 0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16
        }}>
          {icon}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <h3 style={{ margin: 0, fontSize: 32, fontWeight: 700, color: 'white' }}>{value}</h3>
          {trend && <span style={{ fontSize: 11, color: '#20c997', fontWeight: 600 }}>{trend}</span>}
        </div>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </p>
      </div>
    </div>
  )
}

function ActionRow({ icon, title, subtitle, to, iconBg }: { 
  icon: string; title: string; subtitle: string; to: string; iconBg: string 
}) {
  const [hov, setHov] = useState(false)
  return (
    <Link to={to} 
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)',
        border: `1px solid ${hov ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.06)'}`,
        borderRadius: 16, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14,
        textDecoration: 'none', transition: 'all 0.2s ease', transform: hov ? 'translateY(-2px)' : 'none',
        cursor: 'pointer'
      }}
    >
      <div style={{
        width: 42, height: 42, borderRadius: 12, background: iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d={icon} />
        </svg>
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'white' }}>{title}</p>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{subtitle}</p>
      </div>
      <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 18 }}>→</span>
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

  // Graduation / Days to Season
  const gradYear = parseInt(profile.graduationYear || '2025', 10)
  const diffDays = Math.max(0, Math.ceil((new Date(gradYear, 5, 1).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))

  return (
    <div style={{ width: '100%', padding: '0 0 40px', boxSizing: 'border-box' }}>
      
      {/* ── Top Bar ── */}
      <header style={{
        background: 'rgba(255, 255, 255, 0.02)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        backdropFilter: 'blur(12px)',
        padding: '16px 40px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'sticky', top: 0, zIndex: 10, margin: '0 -40px 32px'
      }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: 'white', letterSpacing: '-0.01em' }}>
          Good morning, {firstName}! 👋
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {/* Search Glass Pill */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 50, padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 10, width: 220
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
            <input type="text" placeholder="Search resources..." style={{
              background: 'none', border: 'none', color: 'white', fontSize: 13, outline: 'none', width: '100%'
            }} />
          </div>
          <div style={{ color: 'rgba(255,255,255,0.4)', cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
          </div>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #20c997, #0d9488)', border: '2px solid rgba(255,255,255,0.1)', flexShrink: 0 }} />
        </div>
      </header>

      <div style={{ padding: '0 40px' }}>
        
        {/* ── Stat Cards Row ── */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 24, flexWrap: 'wrap' }}>
          <StatCard value={`${readiness}%`} label="Placement Readiness" glowColor="rgba(32,201,151,0.25)" trend="+5% this week"
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#20c997" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="m16 12-4-4-4 4"/></svg>} />
          <StatCard value={skills.length} label="Skills Added" glowColor="rgba(251,191,36,0.25)"
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>} />
          <StatCard value={companies.length} label="Apps Tracked" glowColor="rgba(59,130,246,0.25)" trend="Active"
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>} />
          <StatCard value={`${diffDays}d`} label="Days to Season" glowColor="rgba(168,85,247,0.25)"
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>} />
        </div>

        {/* ── Readiness Bar Section ── */}
        <div style={{
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 24, padding: '24px 32px', marginBottom: 24
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'white', display: 'flex', alignItems: 'center', gap: 8 }}>
              📈 Placement Readiness
            </h2>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#20c997' }}>{readiness}%</span>
          </div>
          <div style={{ height: 8, borderRadius: 50, background: 'rgba(255,255,255,0.06)', marginBottom: 12, overflow: 'hidden' }}>
            <div style={{
              width: `${readiness}%`, height: '100%', background: 'linear-gradient(90deg, #20c997, #7c3aed)',
              borderRadius: 50, transition: 'width 1.2s cubic-bezier(.4,0,.2,1)'
            }} />
          </div>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
            💡 Complete your profile mock interviews to boost your score to {Math.min(readiness + 15, 100)}%
          </p>
        </div>

        {/* ── Content Grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
          
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* Quick Actions */}
            <div style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 24, padding: '24px'
            }}>
              <h2 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 600, color: 'white' }}>Quick Actions</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <ActionRow title="Browse Jobs" subtitle="Find roles matching you" to="/jobs" iconBg="rgba(32,201,151,0.1)" icon="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                <ActionRow title="Resume Analyser" subtitle="Check ATS score" to="/resume" iconBg="rgba(59,130,246,0.1)" icon="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <ActionRow title="Application Tracker" subtitle="Manage your pipeline" to="/tracker" iconBg="rgba(124,58,237,0.1)" icon="M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6" />
                <ActionRow title="Mock Interviews" subtitle="Practice and improve" to="/mock" iconBg="rgba(20,184,166,0.1)" icon="M15 10l4.5 2.5L15 15v-5zM4 8h11v8H4V8z" />
              </div>
            </div>

            {/* Recent Applications */}
            <div style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 24, padding: '0', overflow: 'hidden'
            }}>
              <div style={{ padding: '24px 24px 16px' }}>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'white' }}>Recent Applications</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {companies.length > 0 ? companies.map((app, i) => {
                  const s = STATUS_STYLES[app.status] || STATUS_STYLES['Applied']
                  return (
                    <div key={i} style={{ 
                      padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      borderTop: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.01)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{
                          width: 38, height: 38, borderRadius: 12, background: 'rgba(255,255,255,0.05)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                          fontWeight: 700, fontSize: 14
                        }}>{app.company[0].toUpperCase()}</div>
                        <div>
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: 'white' }}>{app.company}</p>
                          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Applied on Mar 20, 2024</p>
                        </div>
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 50,
                        background: s.bg, color: s.color, border: `1px solid ${s.border}`, textTransform: 'uppercase', letterSpacing: '0.04em'
                      }}>{app.status}</span>
                    </div>
                  )
                }) : (
                  <div style={{ padding: '60px 24px', textAlign: 'center' }}>
                    <p style={{ color: 'rgba(255,255,255,0.3)', margin: 0 }}>No applications tracked yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Profile Summary */}
          <aside style={{
            background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24,
            padding: '32px 24px', position: 'sticky', top: 100, textAlign: 'center'
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px',
              background: 'linear-gradient(135deg, #20c997, #7c3aed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, fontWeight: 700, color: 'white', boxShadow: '0 8px 16px rgba(0,0,0,0.2)'
            }}>
              {firstName[0]}
            </div>
            <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 600, color: 'white' }}>{profile.fullName || 'User'}</h3>
            <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{profile.college} ({profile.graduationYear})</p>
            <p style={{ margin: '4px 0 20px', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{profile.branch}</p>
            
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '20px 0' }} />
            
            {/* CGPA Section */}
            <div style={{ textAlign: 'left', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>Academic CGPA</span>
                <span style={{ color: 'white', fontWeight: 600 }}>{profile.cgpa} / 10</span>
              </div>
              <div style={{ height: 6, borderRadius: 50, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <div style={{ width: `${(parseFloat(profile.cgpa || '0') / 10) * 100}%`, height: '100%', background: '#20c997' }} />
              </div>
            </div>

            {/* Skills Pills */}
            <div style={{ textAlign: 'left', marginBottom: 24 }}>
              <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Top Skills</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {skills.slice(0, 6).map(s => (
                  <span key={s} style={{
                    background: 'rgba(124,58,237,0.15)', color: '#c4b5fd', border: '1px solid rgba(124,58,237,0.3)',
                    padding: '4px 12px', borderRadius: 40, fontSize: 11, fontWeight: 500
                  }}>{s}</span>
                ))}
              </div>
            </div>

            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '20px 0' }} />

            {/* Resume Status */}
            <div style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
              background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ color: '#20c997' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5"/></svg></div>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>Resume Ready</span>
              </div>
              <Link to="/resume" style={{ fontSize: 11, fontWeight: 700, color: '#20c997', textDecoration: 'none' }}>VIEW →</Link>
            </div>

          </aside>

        </div>
      </div>
    </div>
  )
}
