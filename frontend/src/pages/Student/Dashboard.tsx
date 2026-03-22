import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

// ── Types ─────────────────────────────────────────────────────────────────────
interface PastApp { company: string; status: string }
interface UserProfile {
  fullName?: string
  college?: string
  branch?: string
  cgpa?: string
  graduationYear?: string
  skills?: string[]
  jobType?: string
  resumeName?: string
  resumeBase64?: string
  resumeUrl?: string
  hasExperience?: boolean
  previousCompanies?: PastApp[]
}

// ── Status badge styles ───────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  Applied:    { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  Interviewed:{ bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  Offered:    { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  Rejected:   { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function calcReadiness(profile: UserProfile): number {
  let score = 0
  const hasName   = !!(profile.fullName && profile.college && profile.branch && profile.cgpa && profile.graduationYear)
  const hasSkills = !!(profile.skills?.length)
  const hasResume = !!(profile.resumeName || profile.resumeUrl)
  const hasExp    = !!(profile.hasExperience && profile.previousCompanies?.some(p => p.company))
  const highCGPA  = parseFloat(profile.cgpa || '0') >= 7.0

  if (hasName)   score += 20
  if (hasSkills) score += 20
  if (hasResume) score += 20
  if (hasExp)    score += 20
  if (highCGPA)  score += 20
  return score
}


// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ value, label, iconBg, icon }: {
  value: string | number; label: string; iconBg: string; icon: React.ReactNode
}) {
  return (
    <div style={{
      background: 'white',
      border: '1px solid #e8e8f0',
      borderRadius: 14,
      padding: '20px 24px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      flex: 1,
      minWidth: 0,
    }}>
      <div style={{
        width: 46,
        height: 46,
        borderRadius: '50%',
        background: iconBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#111827', lineHeight: 1.1 }}>{value}</p>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280', fontWeight: 400 }}>{label}</p>
      </div>
    </div>
  )
}

// ── Quick Action Card ─────────────────────────────────────────────────────────
function ActionCard({ to, iconBg, iconColor, icon, title, subtitle }: {
  to: string; iconBg: string; iconColor: string; icon: string; title: string; subtitle: string
}) {
  const [hov, setHov] = useState(false)
  return (
    <Link
      to={to}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? '#f0fdf9' : 'white',
        border: `1px solid ${hov ? '#20c997' : '#e8e8f0'}`,
        borderRadius: 14,
        padding: '18px 22px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        textDecoration: 'none',
        transition: 'all 0.18s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: iconColor,
          flexShrink: 0,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d={icon} />
          </svg>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#111827' }}>{title}</p>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6b7280' }}>{subtitle}</p>
        </div>
      </div>
      <span style={{ color: '#9ca3af', fontSize: 18, flexShrink: 0 }}>→</span>
    </Link>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuthStore()
  const profile: UserProfile = JSON.parse(localStorage.getItem('userProfile') || '{}')
  const readiness = calcReadiness(profile)

  // Animated readiness bar
  const [barWidth, setBarWidth] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setBarWidth(readiness), 300)
    return () => clearTimeout(t)
  }, [readiness])

  // Greeting
  const firstName = profile.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  // Subtitle
  const skills = profile.skills || []
  const companies = profile.previousCompanies?.filter(c => c.company) || []
  const subtitle = skills.length > 0
    ? `You have ${skills.length} skills listed. Keep building your profile!`
    : companies.length > 0
    ? `You've tracked ${companies.length} application${companies.length !== 1 ? 's' : ''}. Keep going!`
    : 'Complete your profile to boost your placement readiness.'

  // Readiness tip
  const hasResume = !!(profile.resumeName || profile.resumeUrl)
  const readinessTip = !hasResume
    ? `Upload your resume to jump to ${Math.min(readiness + 20, 100)}%!`
    : skills.length === 0
    ? 'Add your skills to boost readiness!'
    : parseFloat(profile.cgpa || '0') < 7.0
    ? 'Keep your CGPA above 7.0 for better eligibility.'
    : "You're fully set up! Start applying to companies."

  // Days to season approximate
  const gradYear = parseInt(profile.graduationYear || '2025', 10)
  const now = new Date()
  const targetDate = new Date(gradYear, 5, 1) // June of grad year
  const diffDays = Math.max(0, Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

  // Profile initials
  const displayName = profile.fullName || user?.email?.split('@')[0] || 'User'
  const initials = displayName.split(' ').slice(0, 2).map((n: string) => n[0]?.toUpperCase() || '').join('')

  // Progress bar ref for animation
  const barRef = useRef<HTMLDivElement>(null)

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', width: '100%', maxWidth: '100%' }}>
      {/* ── Section 1: Greeting ───────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: '0 0 6px', lineHeight: 1.2 }}>
          {greeting}, {firstName}! 👋
        </h1>
        <p style={{ fontSize: 15, color: '#6b7280', margin: 0, fontWeight: 400 }}>{subtitle}</p>
      </div>

      {/* ── Section 2: Stat Cards ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatCard
          value={`${readiness}%`}
          label="Placement Readiness"
          iconBg="rgba(32,201,151,0.12)"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#20c997" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" />
            </svg>
          }
        />
        <StatCard
          value={skills.length}
          label="Skills Added"
          iconBg="rgba(245,158,11,0.12)"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          }
        />
        <StatCard
          value={companies.length}
          label="Apps Tracked"
          iconBg="rgba(59,130,246,0.12)"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
            </svg>
          }
        />
        <StatCard
          value={`${diffDays}d`}
          label="Days to Season"
          iconBg="rgba(124,58,237,0.12)"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          }
        />
      </div>

      {/* ── Section 3: Readiness Bar ──────────────────────────────────────── */}
      <div style={{
        background: 'white',
        border: '1px solid #e8e8f0',
        borderRadius: 14,
        padding: '20px 24px',
        marginBottom: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#111827' }}>📈 Placement Readiness</h2>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#20c997' }}>{readiness}%</span>
        </div>
        <div style={{
          height: 10,
          borderRadius: 50,
          background: '#e8e8f0',
          overflow: 'hidden',
          marginBottom: 10,
        }}>
          <div
            ref={barRef}
            style={{
              height: '100%',
              width: `${barWidth}%`,
              borderRadius: 50,
              background: 'linear-gradient(90deg, #20c997, #7c3aed)',
              transition: 'width 1s ease',
            }}
          />
        </div>
        <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
          💡 {readinessTip}
        </p>
      </div>

      {/* ── Main 2-col: Quick Actions + Profile Summary ───────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, marginBottom: 24, alignItems: 'start' }}>

        {/* Left column: Quick Actions + Recent Applications */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>

          {/* ── Section 4: Quick Actions ──────────────────────────────────── */}
          <div>
            <h2 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 600, color: '#111827' }}>Quick Actions</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <ActionCard
                to="/jobs"
                iconBg="rgba(32,201,151,0.12)"
                iconColor="#20c997"
                icon="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                title="Browse Jobs"
                subtitle="Find roles matching your skills"
              />
              <ActionCard
                to="/resume"
                iconBg="rgba(59,130,246,0.12)"
                iconColor="#3b82f6"
                icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                title="Resume Analyser"
                subtitle="Check your ATS score"
              />
              <ActionCard
                to="/tracker"
                iconBg="rgba(124,58,237,0.12)"
                iconColor="#7c3aed"
                icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                title="Application Tracker"
                subtitle="View your Kanban board"
              />
              <ActionCard
                to="/skills"
                iconBg="rgba(245,158,11,0.12)"
                iconColor="#f59e0b"
                icon="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                title="Skill Analyzer"
                subtitle="See gaps in your profile"
              />
            </div>
          </div>

          {/* ── Section 5: Recent Applications ───────────────────────────── */}
          <div>
            <h2 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 600, color: '#111827' }}>
              Recent Applications
            </h2>
            <div style={{
              background: 'white',
              border: '1px solid #e8e8f0',
              borderRadius: 14,
              overflow: 'hidden',
            }}>
              {companies.length > 0 ? (
                companies.map((app, i) => {
                  const s = STATUS_STYLES[app.status] || STATUS_STYLES['Applied']
                  const compInit = (app.company || '?')[0].toUpperCase()
                  const isLast = i === companies.length - 1
                  return (
                    <div
                      key={i}
                      style={{
                        padding: '14px 20px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: isLast ? 'none' : '1px solid #f0f0f5',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          background: '#f3f4f6',
                          color: '#374151',
                          fontSize: 14,
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          {compInit}
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#111827' }}>
                            {app.company}
                          </p>
                          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9ca3af' }}>
                            Added during onboarding
                          </p>
                        </div>
                      </div>
                      <span style={{
                        fontSize: 12,
                        fontWeight: 500,
                        padding: '4px 12px',
                        borderRadius: 50,
                        background: s.bg,
                        color: s.color,
                        border: `1px solid ${s.border}`,
                        whiteSpace: 'nowrap',
                      }}>
                        {app.status}
                      </span>
                    </div>
                  )
                })
              ) : (
                <div style={{
                  padding: '48px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
                  <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 500, color: '#374151' }}>
                    No applications tracked yet
                  </p>
                  <p style={{ margin: '0 0 16px', fontSize: 13, color: '#9ca3af' }}>
                    Track your placement applications here
                  </p>
                  <Link
                    to="/tracker"
                    style={{
                      background: '#20c997',
                      color: 'white',
                      border: 'none',
                      borderRadius: 8,
                      padding: '10px 20px',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      textDecoration: 'none',
                      display: 'inline-block',
                    }}
                  >
                    Add companies →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Section 6: Profile Summary Card (right sidebar) ────────────── */}
        <div style={{
          background: 'white',
          border: '1px solid #e8e8f0',
          borderRadius: 14,
          padding: '24px 20px',
          position: 'sticky',
          top: 32,
        }}>
          <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 600, color: '#111827' }}>
            Profile Summary
          </h2>

          {/* Avatar + name */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #20c997, #0d9488)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              fontWeight: 700,
              color: 'white',
              marginBottom: 10,
            }}>
              {initials || 'U'}
            </div>
            <p style={{ margin: '0 0 2px', fontSize: 15, fontWeight: 600, color: '#111827', textAlign: 'center' }}>
              {displayName}
            </p>
            {profile.college && (
              <p style={{ margin: '0 0 2px', fontSize: 13, color: '#6b7280', textAlign: 'center' }}>
                {profile.college}
              </p>
            )}
            {profile.branch && (
              <p style={{ margin: 0, fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
                {profile.branch}
              </p>
            )}
          </div>

          {/* CGPA */}
          {profile.cgpa && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>CGPA</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>
                  {profile.cgpa} / 10
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 50, background: '#f3f4f6', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${(parseFloat(profile.cgpa) / 10) * 100}%`,
                  borderRadius: 50,
                  background: parseFloat(profile.cgpa) >= 7
                    ? 'linear-gradient(90deg, #20c997, #0d9488)'
                    : 'linear-gradient(90deg, #f59e0b, #d97706)',
                  transition: 'width 1s ease',
                }} />
              </div>
            </div>
          )}

          {/* Divider */}
          <div style={{ height: 1, background: '#f3f4f6', margin: '16px 0' }} />

          {/* Skills */}
          <div style={{ marginBottom: 16 }}>
            <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Skills
            </p>
            {skills.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {skills.map((s) => (
                  <span key={s} style={{
                    background: 'rgba(32,201,151,0.1)',
                    color: '#0d9488',
                    border: '1px solid rgba(32,201,151,0.25)',
                    borderRadius: 50,
                    padding: '3px 10px',
                    fontSize: 12,
                    fontWeight: 500,
                  }}>
                    {s}
                  </span>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>No skills added yet</p>
            )}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: '#f3f4f6', margin: '16px 0' }} />

          {/* Resume */}
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Resume
            </p>
            {hasResume ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: '#16a34a', fontSize: 14 }}>✓</span>
                  <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 500 }}>Resume uploaded</span>
                </div>
                {(profile.resumeUrl || profile.resumeBase64) && (
                  <a
                    href={profile.resumeUrl || profile.resumeBase64}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: 12,
                      color: '#20c997',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    View →
                  </a>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: '#dc2626', fontSize: 14 }}>✗</span>
                  <span style={{ fontSize: 13, color: '#9ca3af', fontWeight: 400 }}>No resume</span>
                </div>
                <Link
                  to="/resume"
                  style={{
                    fontSize: 12,
                    color: '#7c3aed',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  Upload now →
                </Link>
              </div>
            )}
          </div>

          {/* Edit Profile link */}
          <Link
            to="/profile"
            style={{
              display: 'block',
              marginTop: 20,
              textAlign: 'center',
              fontSize: 13,
              fontWeight: 600,
              color: '#20c997',
              textDecoration: 'none',
              padding: '10px',
              borderRadius: 8,
              border: '1px solid rgba(32,201,151,0.3)',
              background: 'rgba(32,201,151,0.05)',
              transition: 'all 0.15s',
            }}
          >
            Edit Profile →
          </Link>
        </div>
      </div>
    </div>
  )
}
