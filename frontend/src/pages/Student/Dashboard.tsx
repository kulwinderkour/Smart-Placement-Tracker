import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { applicationsApi, type TrackedApplication } from '../../api/applications'
import JobMatchScoreCard from '../../components/JobMatchScoreCard'
import AutoApplyPanel from '../../components/AutoApplyPanel'

// ── Types & Helpers ──────────────────────────────────────────────────────────
interface PastApp { company: string; status: string }
interface UserProfile {
  fullName?: string; full_name?: string;
  college?: string; branch?: string; 
  cgpa?: string | number;
  graduationYear?: string | number; graduation_year?: string | number;
  skills?: string[]; 
  jobType?: string; job_type?: string;
  resumeName?: string; resume_name?: string; 
  resumeBase64?: string; resume_base64?: string;
  resumeUrl?: string; resume_url?: string;
  hasExperience?: boolean; 
  previousCompanies?: PastApp[]; previous_companies?: PastApp[]
}

const STATUS_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  Applied:    { bg: '#1f2d3d', color: '#58a6ff', border: '1px solid #1f6feb33' },
  Interviewed:{ bg: '#2d2208', color: '#d29922', border: '1px solid #9e6a0333' },
  Offered:    { bg: '#1a2e22', color: '#3fb950', border: '1px solid #23863633' },
  Rejected:   { bg: '#2d1b1b', color: '#f85149', border: '1px solid #da363333' },
}

function calcReadiness(profile: UserProfile): number {
  let score = 0
  const fullName = profile.fullName || profile.full_name
  const resume = profile.resumeName || profile.resume_name || profile.resumeUrl || profile.resume_url
  const prevApps = profile.previousCompanies || profile.previous_companies
  const cgpa = typeof profile.cgpa === 'string' ? parseFloat(profile.cgpa) : (profile.cgpa || 0)

  if (fullName && profile.college) score += 20
  if (profile.skills?.length) score += 20
  if (resume) score += 20
  if (profile.hasExperience && prevApps?.length) score += 20
  if (cgpa >= 7.0) score += 20
  return score
}

const cleanSkill = (skill: string) => skill.replace(/^[-+#@\s]+/, '').trim()

const studentHas = (skill: string) => {
  if (!skill) return false;
  const cleaned = cleanSkill(skill).toLowerCase()
  const profile = JSON.parse(localStorage.getItem('userProfile') || '{}')
  const skillsList = (profile.skills || []).map((s: any) =>
    typeof s === 'string' ? s : (s?.name || '')
  ).filter(Boolean)
  const studentSkills = skillsList.map((s: string) => s.toLowerCase())
  return studentSkills.some((s: string) => s.includes(cleaned) || (s && cleaned.includes(s)))
}

const formatPackage = (pkg: number) => {
  if (!pkg) return 'Package not specified'
  const lpa = pkg > 1000 ? pkg / 100000 : pkg
  const min = Math.floor(lpa * 0.85)
  const max = Math.ceil(lpa * 1.15)
  return `₹${min} - ${max} LPA`
}

// ── Components ───────────────────────────────────────────────────────────────

function StatCard({ value, label, icon, accent }: { value: string | number; label: string; icon: string; accent: string }) {
  const [hov, setHov] = useState(false)
  return (
    <div 
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: '#1c1c1c', border: `1px solid ${hov ? '#333333' : '#2d2d2d'}`,
        borderRadius: 10, padding: '20px 22px', flex: 1, minWidth: 200, transition: 'all 0.15s ease'
      }}>
      <div style={{ color: accent, marginBottom: 16 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d={icon} />
        </svg>
      </div>
      <h3 style={{ margin: 0, fontSize: 28, fontWeight: 600, color: '#e0e0e0', lineHeight: 1.2 }}>{value}</h3>
      <p style={{ margin: '4px 0 0', fontSize: 12, color: '#888888', fontWeight: 500 }}>{label}</p>
    </div>
  )
}

function ActionCard({ icon, title, subtitle, to }: { icon: string; title: string; subtitle: string; to: string }) {
  const [hov, setHov] = useState(false)
  return (
    <Link to={to} 
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? '#1f1f1f' : '#1c1c1c',
        border: `1px solid ${hov ? '#333333' : '#2d2d2d'}`,
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
        <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: '#e0e0e0', lineHeight: 1.5 }}>{title}</p>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888888', lineHeight: 1.5 }}>{subtitle}</p>
      </div>
      <span style={{ color: hov ? '#888888' : '#555555', fontSize: 18 }}>→</span>
    </Link>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const profile: UserProfile = JSON.parse(localStorage.getItem('userProfile') || '{}')
  const readiness = calcReadiness(profile)
  const fullName = profile.fullName || profile.full_name
  const firstName = fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'Member'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : hour < 21 ? 'Good evening' : 'Good night'

  const [logoutHov, setLogoutHov] = useState(false)
  const handleLogout = () => { logout(); navigate('/login') }

  const [applications, setApplications] = useState<TrackedApplication[]>([])
  const [appsLoading, setAppsLoading] = useState(true)

  const [adminJobs, setAdminJobs] = useState<any[]>([])
  const [jobsLoading, setJobsLoading] = useState(true)
  const [matchScores, setMatchScores] = useState<Record<string, { loading: boolean; score?: number; label?: string; matched?: string[]; gaps?: string[] }>>({});

  const [autoApplyOpen, setAutoApplyOpen] = useState(false);
  const [refetchTrigger, setRefetchTrigger] = useState(0);
  const [minPackage, setMinPackage] = useState(10);

  const [showApplyModal, setShowApplyModal] = useState(false);
  const [activeJobForApply, setActiveJobForApply] = useState<any>(null);
  const [applyNotes, setApplyNotes] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);

  const handleManualApply = async () => {
    if (!activeJobForApply) return;
    setIsApplying(true);
    try {
      await applicationsApi.apply(activeJobForApply.id, applyNotes);
      alert('Application submitted successfully!');
      setShowApplyModal(false);
      setApplyNotes('');
      // Invalidate applications count
      applicationsApi.myApplications().then(res => setApplications(res.data as any));
    } catch (err: any) {
      alert('Failed to apply: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsApplying(false);
    }
  };

  const AI_ENGINE_URL = 'http://localhost:8002';

  const fetchMatchScores = async (jobs: any[], freshProfile?: any) => {
    setMatchScores(prev => {
      const next = { ...prev };
      jobs.forEach(job => { next[job.id] = { loading: true }; });
      return next;
    });
    const activeProfile = freshProfile || profile;
    const studentPayload = {
      fullName: activeProfile.fullName || activeProfile.full_name || '',
      college: activeProfile.college || '',
      branch: activeProfile.branch || '',
      cgpa: parseFloat((activeProfile.cgpa || '0').toString()) || 0,
      graduationYear: parseInt((activeProfile.graduationYear || activeProfile.graduation_year || '2025').toString()) || 0,
      skills: (activeProfile.skills || []).map((s: any) =>
        typeof s === 'string' ? s : (s?.name || '')
      ).filter(Boolean),
      mockInterviewScore: 0,
      aptitudeStreak: 0,
      previousCompanies: (profile.previousCompanies || profile.previous_companies || []) as any[],
    };
    await Promise.allSettled(
      jobs.map(async job => {
        try {
          const res = await fetch(`${AI_ENGINE_URL}/api/matcher/score`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              student: studentPayload,
              job: {
                id: job.id || '',
                title: job.title || job.role_title || '',
                company: job.company || job.company_name || '',
                location: job.location || '',
                package_lpa: parseFloat(job.package_lpa || job.salary_min || 0),
                required_skills: job.required_skills || [],
                min_cgpa: parseFloat(job.min_cgpa || 0),
                job_type: job.job_type || '',
                company_type: job.company_type || '',
                description: job.description || '',
              },
            }),
          });
          if (!res.ok) throw new Error('Score fetch failed');
          const data = await res.json();
          setMatchScores(prev => ({
            ...prev,
            [job.id]: { loading: false, score: data.match_score, label: data.match_label, matched: data.matched_skills || [], gaps: data.gap_skills || [] },
          }));
        } catch {
          setMatchScores(prev => ({ ...prev, [job.id]: { loading: false } }));
        }
      })
    );
  };

  useEffect(() => {
    if (!user?.id) return
    applicationsApi.myApplications()
      .then(res => setApplications(res.data as unknown as TrackedApplication[]))
      .catch((err) => {
        console.error("Dashboard: applications fetch failed:", err.response?.data || err.message);
        setApplications([]);
      })
      .finally(() => setAppsLoading(false))
    
    // Fetch company-posted jobs from FastAPI student API
    const fetchJobs = async () => {
      const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

      // Fetch fresh profile first so match scores use up-to-date skills
      let freshProfile: any = null;
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token') || '';
        const pRes = await fetch(`${API}/student/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (pRes.ok) {
          freshProfile = await pRes.json();
          localStorage.setItem('userProfile', JSON.stringify(freshProfile));
        }
      } catch (e) {
        console.warn('Profile pre-fetch skipped:', e);
      }

      try {
        const res = await fetch(`${API}/student/jobs?limit=20`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          // Normalise field names so the existing job card JSX works unchanged
          const normalised = data.data.map((j: any) => ({
            ...j,
            title: j.role_title ?? j.title,
            company: j.company_name ?? j.company,
            package_lpa: j.salary_min ?? j.package_lpa,
            application_deadline: j.deadline ?? j.application_deadline,
          }));
          setAdminJobs(normalised);
          fetchMatchScores(normalised, freshProfile);
        }
      } catch (err) {
        console.error('Failed to fetch company jobs:', err);
      } finally {
        setJobsLoading(false);
      }
    };
    fetchJobs();
  }, [user?.id, refetchTrigger])

  const skills = profile.skills || []

  const gradYearStr = (profile.graduationYear || profile.graduation_year || '2025').toString()
  const gradYear = parseInt(gradYearStr, 10)
  const diffDays = Math.max(0, Math.ceil((new Date(gradYear, 5, 1).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
  const cgpaNum = typeof profile.cgpa === 'string' ? parseFloat(profile.cgpa) : (profile.cgpa || 0)
  const resumeName = profile.resumeName || profile.resume_name || 'resume.pdf'
  const resumeBase = profile.resumeBase64 || profile.resume_base64

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#121212' }}>
      
      {/* ── Top Bar ── */}
      <header style={{
        background: '#121212', borderBottom: '1px solid #2d2d2d',
        padding: '14px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'sticky', top: 0, zIndex: 10
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 500, color: '#e0e0e0' }}>
            {greeting}, {firstName} 👋
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#888888' }}>
            {skills.length > 0 ? `Track your profile and skills efficiently.` : `Complete your profile to boost placement readiness.`}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Notification Bell */}
          <div style={{ color: '#888888', cursor: 'pointer', padding: '6px', borderRadius: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </div>

          {/* Avatar */}
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: '#20c99722', color: '#20c997',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 600, flexShrink: 0
          }}>
            {firstName[0].toUpperCase()}
          </div>

          {/* Separator */}
          <div style={{ width: 1, height: 22, background: '#2d2d2d', margin: '0 4px' }} />

          {/* Logout Button */}
          <button
            id="student-logout-btn"
            onClick={handleLogout}
            onMouseEnter={() => setLogoutHov(true)}
            onMouseLeave={() => setLogoutHov(false)}
            title="Sign out"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: logoutHov ? '#2d1b1b' : 'transparent',
              border: `1px solid ${logoutHov ? '#da363344' : 'transparent'}`,
              borderRadius: 8,
              padding: '6px 12px',
              color: logoutHov ? '#f85149' : '#888888',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 500,
              transition: 'all 0.18s ease',
            }}
          >
            <LogOut size={15} strokeWidth={2.2} />
            <span style={{ display: 'inline' }}>Sign out</span>
          </button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, padding: '20px 28px' }}>
        
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* Stats Row */}
          <div style={{ display: 'flex', gap: 16 }}>
            <StatCard value={`${readiness}%`} label="Readiness" icon="M22 12h-4l-3 9L9 3l-3 9H2" accent="#20c997" />
            <StatCard value={skills.length} label="Skills" icon="M13 2L3 14h9l-1 8 10-12h-9l1-8z" accent="#7c3aed" />
            <StatCard value={appsLoading ? '…' : applications.length} label="Apps" icon="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" accent="#1f6feb" />
            <StatCard value={`${diffDays}d`} label="To Season" icon="M12 6v6l4 2" accent="#da3633" />
          </div>

          {/* Readiness Bar */}
          <div style={{ background: '#1c1c1c', border: '1px solid #2d2d2d', borderRadius: 10, padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: '#e0e0e0' }}>Placement Readiness</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#20c997' }}>{readiness}%</span>
            </div>
            <div style={{ height: 6, background: '#2d2d2d', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${readiness}%`, height: '100%', background: '#20c997', transition: 'width 0.8s ease' }} />
            </div>
            <p style={{ margin: '8px 0 0', fontSize: 12, color: '#888888' }}>
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
          <div style={{ background: '#1c1c1c', border: '1px solid #2d2d2d', borderRadius: 10, padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#e0e0e0' }}>Recent Applications</h2>
              <Link to="/jobs" style={{ fontSize: 12, color: '#20c997', textDecoration: 'none', fontWeight: 500 }}>Browse Jobs →</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {appsLoading ? (
                <p style={{ fontSize: 13, color: '#888888', margin: 0 }}>Loading…</p>
              ) : applications.length > 0 ? applications.slice(0, 5).map((app, i) => {
                const statusKey = app.status === 'applied' ? 'Applied'
                  : app.status === 'offer' ? 'Offered'
                  : app.status === 'rejected' ? 'Rejected'
                  : 'Interviewed'
                const s = STATUS_STYLES[statusKey] || STATUS_STYLES['Applied']
                const appliedDate = app.applied_at
                  ? new Date(app.applied_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                  : '—'
                return (
                  <div key={i} style={{ 
                    padding: '12px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    borderBottom: i === Math.min(applications.length, 5) - 1 ? 'none' : '1px solid #2d2d2d'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 6, background: '#2d2d2d', color: '#888888',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 500,
                        flexShrink: 0
                      }}>{app.company[0]?.toUpperCase() ?? '?'}</div>
                      <div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: '#e0e0e0' }}>{app.company}</p>
                        <p style={{ margin: 0, fontSize: 12, color: '#888888' }}>{app.role} · {appliedDate}</p>
                      </div>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 4,
                      background: s.bg, color: s.color, border: s.border, flexShrink: 0
                    }}>{statusKey}</span>
                  </div>
                )
              }) : (
                <p style={{ fontSize: 13, color: '#888888', margin: 0 }}>
                  No applications yet. <Link to="/jobs" style={{ color: '#20c997', textDecoration: 'none' }}>Browse jobs →</Link>
                </p>
              )}
            </div>
          </div>


          {/* ── Apply Modal ── */}
          {showApplyModal && activeJobForApply && (
            <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 100, backdropFilter: 'blur(4px)'
            }}>
              <div style={{
                background: '#1c1c1c', border: '1px solid #2d2d2d', borderRadius: '12px',
                width: '100%', maxWidth: '450px', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
              }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#e0e0e0' }}>
                  Apply for {activeJobForApply.title}
                </h3>
                <p style={{ fontSize: '13px', color: '#888888', marginTop: '4px', marginBottom: '16px' }}>
                  {activeJobForApply.company} · {activeJobForApply.location}
                </p>

                {/* ── ML Match Score Block ── */}
                {(() => {
                  const ms = matchScores[activeJobForApply.id];
                  if (!ms) return null;
                  if (ms.loading) return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#1a1a2e40', border: '1px solid #818cf830', borderRadius: '8px', padding: '10px 12px', marginBottom: '16px' }}>
                      <div style={{ width: '12px', height: '12px', border: '2px solid #818cf8', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                      <span style={{ fontSize: '12px', color: '#818cf8' }}>Computing your profile match…</span>
                    </div>
                  );
                  const score = ms.score ?? 0;
                  const scoreColor = score >= 70 ? '#3fb950' : score >= 50 ? '#d29922' : '#f85149';
                  const msg = score >= 80 ? '🎯 Excellent match' : score >= 60 ? '✔ Good match' : score >= 50 ? '⚡ Eligible' : '⚠️ Low match';
                  return (
                    <div style={{ background: `${scoreColor}0d`, border: `1px solid ${scoreColor}40`, borderRadius: '10px', padding: '12px 14px', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '13px', color: '#e0e0e0', fontWeight: 500 }}>{msg} — Your profile match</span>
                        <span style={{ fontSize: '22px', fontWeight: 800, color: scoreColor }}>{score}%</span>
                      </div>
                      <div style={{ height: '6px', background: '#2d2d2d', borderRadius: '3px', overflow: 'hidden', marginBottom: '10px' }}>
                        <div style={{ width: `${score}%`, height: '100%', background: scoreColor, borderRadius: '3px', transition: 'width 0.6s ease' }} />
                      </div>
                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                        {(ms.matched || []).slice(0, 5).map(s => (
                          <span key={s} style={{ background: '#1a2e2260', color: '#3fb950', border: '1px solid #3fb95040', borderRadius: '3px', padding: '2px 6px', fontSize: '10px' }}>✓ {s}</span>
                        ))}
                        {(ms.gaps || []).slice(0, 3).map(s => (
                          <span key={s} style={{ background: '#2d1b1b60', color: '#f85149', border: '1px solid #f8514940', borderRadius: '3px', padding: '2px 6px', fontSize: '10px' }}>✗ {s}</span>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#555555', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Notes for the Placement Cell / Company
                  </label>
                  <textarea 
                    value={applyNotes}
                    onChange={(e) => setApplyNotes(e.target.value)}
                    placeholder="Briefly state your interest or mention any relevant details..."
                    style={{
                      width: '100%', height: '120px', background: '#121212', border: '1px solid #2d2d2d',
                      borderRadius: '8px', padding: '12px', color: '#e0e0e0', fontSize: '14px',
                      resize: 'none', outline: 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={() => { setShowApplyModal(false); setApplyNotes(''); }}
                    style={{
                      flex: 1, background: 'transparent', border: '1px solid #2d2d2d',
                      color: '#e0e0e0', borderRadius: '8px', padding: '10px', fontSize: '14px',
                      fontWeight: 600, cursor: 'pointer'
                    }}>
                    Cancel
                  </button>
                  <button onClick={handleManualApply} disabled={isApplying}
                    style={{
                      flex: 1, background: '#20c997', border: 'none',
                      color: '#121212', borderRadius: '8px', padding: '10px', fontSize: '14px',
                      fontWeight: 600, cursor: isApplying ? 'not-allowed' : 'pointer',
                      opacity: isApplying ? 0.7 : 1
                    }}>
                    {isApplying ? 'Applying...' : 'Submit Application'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Admin Posted Opportunities Section ── */}
          <div style={{ marginTop: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 style={{ color: '#e0e0e0', fontSize: '16px', fontWeight: 600, margin: 0 }}>
                    Opportunities from SmartPlacement
                  </h2>
                  <span style={{
                    background: '#20c997', color: '#121212', fontSize: '10px', fontWeight: 700,
                    padding: '2px 8px', borderRadius: '20px', letterSpacing: '0.05em'
                  }}>VERIFIED</span>
                </div>
                <p style={{ color: '#888888', fontSize: '12px', marginTop: '3px' }}>
                  Handpicked opportunities posted directly by our placement team
                </p>
              </div>
              <span style={{ color: '#888888', fontSize: '12px' }}>
                {adminJobs.length} active opening{adminJobs.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div style={{ height: '1px', background: '#2d2d2d', marginBottom: '16px' }} />

            {/* Auto apply bar */}
            <div style={{
              background: '#1c1c1c', border: '1px solid #2d2d2d',
              borderRadius: '10px', padding: '16px 20px',
              display: 'flex', alignItems: 'center', gap: '12px',
              marginBottom: '16px', flexWrap: 'wrap'
            }}>
              <span style={{ color: '#e0e0e0', fontSize: '13px', fontWeight: 500 }}>
                Auto Apply Agent
              </span>
              <span style={{ color: '#888888', fontSize: '12px' }}>
                Apply to all eligible jobs above
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                <span style={{ color: '#888888', fontSize: '12px' }}>Min package:</span>
                <select
                  value={minPackage}
                  onChange={e => setMinPackage(Number(e.target.value))}
                  aria-label="Minimum package filter"
                  title="Minimum package filter"
                  style={{ background: '#121212', border: '1px solid #2d2d2d', borderRadius: '6px', color: '#e0e0e0', padding: '6px 10px', fontSize: '12px' }}
                >
                  {[5, 8, 10, 12, 15, 20, 25, 30].map(p => (
                    <option key={p} value={p}>₹{p} LPA+</option>
                  ))}
                </select>
                <button
                  onClick={() => setAutoApplyOpen(true)}
                  disabled={jobsLoading}
                  style={{
                    background: jobsLoading ? '#2d2d2d' : '#7c3aed',
                    color: jobsLoading ? '#888888' : 'white',
                    border: 'none', borderRadius: '6px',
                    padding: '7px 16px', fontSize: '12px',
                    fontWeight: 600, cursor: jobsLoading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}>
                  ⚡ Auto Apply
                </button>
              </div>
            </div>

            <AutoApplyPanel
              isOpen={autoApplyOpen}
              onClose={() => {
                setAutoApplyOpen(false);
                applicationsApi.myApplications().then(res => setApplications(res.data as any));
                setRefetchTrigger(t => t + 1);
              }}
              adminJobs={adminJobs}
              defaultInstruction={`Apply to jobs above ₹${minPackage} LPA`}
            />

            {jobsLoading && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                {[1, 2].map(i => (
                  <div key={i} style={{ background: '#1c1c1c', border: '1px solid #2d2d2d', borderRadius: '10px', padding: '18px', height: '100px' }} />
                ))}
              </div>
            )}

            {!jobsLoading && adminJobs.length === 0 && (
              <div style={{ background: '#1c1c1c', border: '1px solid #2d2d2d', borderRadius: '10px', padding: '32px', textAlign: 'center' }}>
                <p style={{ color: '#555555', fontSize: '13px' }}>No opportunities posted yet. Check back soon.</p>
              </div>
            )}

            {!jobsLoading && adminJobs.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', height: 'calc(100vh - 200px)', minHeight: '600px' }}>
                {/* Left Column: Job Cards List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', overflowY: 'auto', paddingRight: '8px', paddingBottom: '16px' }}>
                  {adminJobs.map(job => {
                    const ms = matchScores[job.id];
                    const scoreColor = !ms || ms.loading || ms.score === undefined ? '#888888'
                      : ms.score >= 70 ? '#3fb950'
                      : ms.score >= 40 ? '#d29922'
                      : '#f85149';
                    const isSelected = selectedJob?.id === job.id;
                    
                    return (
                      <div key={job.id} 
                        onClick={() => setSelectedJob(job)}
                        style={{
                          background: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.9)', 
                          backdropFilter: 'blur(10px)',
                          border: '1px solid',
                          borderColor: isSelected ? '#20c997' : '#e5e7eb',
                          borderLeft: isSelected ? '4px solid #20c997' : '1px solid #e5e7eb',
                          borderRadius: '12px',
                          boxShadow: isSelected ? '0 12px 32px rgba(32, 201, 151, 0.15)' : '0 4px 12px rgba(0, 0, 0, 0.04)',
                          padding: '20px', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'pointer',
                          transform: isSelected ? 'translateY(-2px)' : 'none'
                        }}
                        onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; } }}
                        onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.04)'; } }}>
                          
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ color: '#111827', fontSize: '15px', fontWeight: 600 }}>{job.title}</div>
                            <div style={{ color: '#4b5563', fontSize: '13px', marginTop: '2px' }}>{job.company || job.company_name}</div>
                          </div>
                          <div style={{
                            width: '44px', height: '44px', borderRadius: '10px', 
                            background: '#f3f4f6',
                            border: '1px solid #e5e7eb',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', 
                            color: '#111827', fontWeight: 700,
                            fontSize: '18px', flexShrink: 0, overflow: 'hidden', marginLeft: '12px',
                            boxShadow: 'none'
                          }}>
                            {job.company_logo ? <img src={job.company_logo} alt={job.company || job.company_name || 'Company'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (job.company || job.company_name)?.charAt(0).toUpperCase()}
                          </div>
                        </div>

                        <div style={{ marginTop: '12px', marginBottom: '8px' }}>
                          <span style={{ background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', fontWeight: 600 }}>
                            {formatPackage(job.package_lpa || job.salary_min)}
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                          {job.location && <span style={{ color: '#6b7280', fontSize: '12px' }}>📍 {job.location}</span>}
                          {job.job_type && <span style={{ color: '#6b7280', fontSize: '12px' }}>💼 {job.job_type}</span>}
                        </div>

                        {job.required_skills && job.required_skills.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                            {job.required_skills.slice(0, 5).map((skill: string, idx: number) => {
                              const hasIt = studentHas(skill)
                              return (
                                <span key={idx} style={{ 
                                  background: hasIt ? '#dcfce7' : '#fee2e2', 
                                  color: hasIt ? '#166534' : '#991b1b', 
                                  borderRadius: '4px', padding: '2px 8px', fontSize: '11px', fontWeight: 500 
                                }}>
                                  {cleanSkill(skill)}
                                </span>
                              )
                            })}
                            {job.required_skills.length > 5 && <span style={{ color: '#6b7280', fontSize: '11px', alignSelf: 'center' }}>+{job.required_skills.length - 5}</span>}
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                          {ms ? (
                            <span style={{ fontSize: '12px', fontWeight: 600, color: ms.loading ? '#888888' : scoreColor }}>
                              {ms.loading ? '⏳ Scoring...' : `🎯 Match Score: ${ms.score}%`}
                            </span>
                          ) : <div/>}
                          <span style={{ color: '#20c997', fontSize: '12px', fontWeight: 500 }}>View details →</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Right Column: Job Detail Panel */}
                <div style={{ 
                  background: 'rgba(255, 255, 255, 0.95)', 
                  backdropFilter: 'blur(20px)',
                  border: '1px solid #e5e7eb', 
                  borderRadius: '16px', 
                  padding: '28px', 
                  height: '100%',
                  overflowY: 'auto',
                  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.08)'
                }}>
                  {!selectedJob ? (
                    <div style={{ textAlign: 'center', padding: '80px 0', color: '#6b7280' }}>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px', opacity: 0.5, margin: '0 auto 16px auto', display: 'block' }}>
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                      </svg>
                      <p style={{ margin: 0, fontSize: '15px' }}>Select a job to view details</p>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                        <div>
                          <h2 style={{ color: '#111827', fontSize: '20px', fontWeight: 700, margin: '0 0 4px', lineHeight: 1.3 }}>{selectedJob.title}</h2>
                          <p style={{ color: '#4b5563', fontSize: '14px', margin: 0 }}>{selectedJob.company || selectedJob.company_name}</p>
                        </div>
                        <div style={{
                          width: '64px', height: '64px', borderRadius: '14px', 
                          background: '#f3f4f6',
                          border: '1px solid #e5e7eb',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111827', fontWeight: 700,
                          fontSize: '28px', flexShrink: 0, overflow: 'hidden', marginLeft: '16px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                        }}>
                          {selectedJob.company_logo ? <img src={selectedJob.company_logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (selectedJob.company || selectedJob.company_name)?.charAt(0).toUpperCase()}
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px', padding: '16px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
                        <div>
                          <p style={{ color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', margin: '0 0 4px', fontWeight: 600 }}>Salary</p>
                          <p style={{ color: '#111827', fontSize: '13px', margin: 0, fontWeight: 600 }}>{formatPackage(selectedJob.package_lpa || selectedJob.salary_min)}</p>
                        </div>
                        {selectedJob.location && (
                          <div>
                            <p style={{ color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', margin: '0 0 4px', fontWeight: 600 }}>Location</p>
                            <p style={{ color: '#111827', fontSize: '13px', margin: 0, fontWeight: 600 }}>{selectedJob.location}</p>
                          </div>
                        )}
                        {selectedJob.job_type && (
                          <div>
                            <p style={{ color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', margin: '0 0 4px', fontWeight: 600 }}>Job Type</p>
                            <p style={{ color: '#111827', fontSize: '13px', margin: 0, fontWeight: 600 }}>{selectedJob.job_type}</p>
                          </div>
                        )}
                        {selectedJob.openings && (
                          <div>
                            <p style={{ color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', margin: '0 0 4px', fontWeight: 600 }}>Openings</p>
                            <p style={{ color: '#111827', fontSize: '13px', margin: 0, fontWeight: 600 }}>{selectedJob.openings}</p>
                          </div>
                        )}
                      </div>

                      {selectedJob.description && (
                        <>
                          <div style={{ borderLeft: '3px solid #20c997', paddingLeft: '10px', marginBottom: '12px', marginTop: '20px' }}>
                            <span style={{ color: '#20c997', fontSize: '14px', fontWeight: 600 }}>Job description</span>
                          </div>
                          <p style={{ color: '#374151', fontSize: '13px', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                            {selectedJob.description}
                          </p>
                        </>
                      )}

                      {selectedJob.required_skills && selectedJob.required_skills.length > 0 && (
                        <>
                          <div style={{ borderLeft: '3px solid #20c997', paddingLeft: '10px', marginBottom: '12px', marginTop: '20px' }}>
                            <span style={{ color: '#20c997', fontSize: '14px', fontWeight: 600 }}>Required skills</span>
                          </div>
                          <ol style={{ color: '#374151', fontSize: '13px', margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {selectedJob.required_skills.map((skill: string, idx: number) => (
                              <li key={idx} style={{ paddingLeft: '4px' }}>{cleanSkill(skill)}</li>
                            ))}
                          </ol>
                        </>
                      )}

                      {selectedJob.min_cgpa > 0 && (
                        <>
                          <div style={{ borderLeft: '3px solid #20c997', paddingLeft: '10px', marginBottom: '12px', marginTop: '20px' }}>
                            <span style={{ color: '#20c997', fontSize: '14px', fontWeight: 600 }}>Eligibility</span>
                          </div>
                          <p style={{ color: '#374151', fontSize: '13px', margin: 0 }}>Minimum CGPA: {selectedJob.min_cgpa}</p>
                        </>
                      )}

                      {selectedJob.application_deadline && (
                        <>
                          <div style={{ borderLeft: '3px solid #20c997', paddingLeft: '10px', marginBottom: '12px', marginTop: '20px' }}>
                            <span style={{ color: '#20c997', fontSize: '14px', fontWeight: 600 }}>Deadline</span>
                          </div>
                          <p style={{ color: '#374151', fontSize: '13px', margin: 0 }}>
                            {new Date(selectedJob.application_deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                            {(() => {
                              const diff = new Date(selectedJob.application_deadline).getTime() - new Date().getTime();
                              const days = Math.ceil(diff / (1000 * 3600 * 24));
                              if (diff < 0) return <span style={{ color: '#dc2626', marginLeft: '6px' }}>(Expired)</span>;
                              if (days === 0) return <span style={{ color: '#d97706', marginLeft: '6px' }}>(Ends today)</span>;
                              return <span style={{ color: '#6b7280', marginLeft: '6px' }}>({days} days remaining)</span>;
                            })()}
                          </p>
                        </>
                      )}

                      {matchScores[selectedJob.id] && !matchScores[selectedJob.id].loading && (
                        <div style={{ marginTop: '24px' }}>
                          <JobMatchScoreCard
                            matchScore={matchScores[selectedJob.id].score ?? 0}
                            matchedSkills={
                              matchScores[selectedJob.id].matched?.length
                                ? matchScores[selectedJob.id].matched
                                : (selectedJob.required_skills || []).filter((s: string) => studentHas(s)).map(cleanSkill)
                            }
                            missingSkills={
                              matchScores[selectedJob.id].gaps?.length
                                ? matchScores[selectedJob.id].gaps
                                : (selectedJob.required_skills || []).filter((s: string) => !studentHas(s)).map(cleanSkill)
                            }
                          />
                        </div>
                      )}

                      <div style={{ marginTop: '32px' }}>
                        {(() => {
                          const isApplied = applications.some((a: any) => a.job_id === selectedJob.id);
                          const isExpired = selectedJob.application_deadline && new Date() > new Date(selectedJob.application_deadline);
                          if (isApplied) {
                            return (
                              <button disabled style={{ width: '100%', background: '#2d2d2d', color: '#888888', border: '1px solid #333333', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: 600, cursor: 'not-allowed' }}>
                                Applied ✓
                              </button>
                            );
                          } else if (isExpired) {
                            return (
                              <button disabled style={{ width: '100%', background: '#2d1b1b', color: '#f85149', border: '1px solid #da363333', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: 600, cursor: 'not-allowed' }}>
                                Deadline passed
                              </button>
                            );
                          } else {
                            if (selectedJob.apply_link) {
                                return (
                                  <a href={selectedJob.apply_link} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                                    <button style={{ width: '100%', background: '#20c997', color: '#121212', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.2s' }}
                                      onMouseEnter={e => e.currentTarget.style.opacity = '0.9'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                                      Apply Externally
                                    </button>
                                  </a>
                                );
                            } else {
                                return (
                                  <button onClick={() => { setActiveJobForApply(selectedJob); setShowApplyModal(true); }}
                                    style={{ width: '100%', background: '#20c997', color: '#121212', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.2s' }}
                                    onMouseEnter={e => e.currentTarget.style.opacity = '0.9'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                                    Apply Now
                                  </button>
                                );
                            }
                          }
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>


        </div>

        {/* Right Panel - Profile Summary */}
        <aside style={{
          background: '#1c1c1c', border: '1px solid #2d2d2d', borderRadius: 10,
          padding: '20px', position: 'sticky', top: 16, height: 'fit-content'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%', background: '#20c99718', color: '#20c997',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600
            }}>{firstName[0].toUpperCase()}</div>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e0e0e0' }}>{profile.fullName || 'User'}</h3>
              <p style={{ margin: 0, fontSize: 12, color: '#888888' }}>Batch of {profile.graduationYear}</p>
            </div>
          </div>

          <div style={{ height: 1, background: '#2d2d2d', margin: '16px 0' }} />

          {/* CGPA Section */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: '#888888' }}>Academic CGPA</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#e0e0e0' }}>{profile.cgpa || profile.cgpa} / 10</span>
            </div>
            <div style={{ height: 4, background: '#2d2d2d', borderRadius: 2 }}>
              <div style={{ width: `${(cgpaNum / 10) * 100}%`, height: '100%', background: '#20c997', borderRadius: 2 }} />
            </div>
          </div>

          {/* Skills Section */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 600, color: '#555555', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Skills</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {skills.map(s => (
                <span key={s} style={{
                  background: '#2d2d2d', color: '#888888', padding: '3px 10px', borderRadius: 4, fontSize: 11, border: '1px solid transparent'
                }}>{s}</span>
              ))}
            </div>
          </div>

          <div style={{ height: 1, background: '#2d2d2d', margin: '16px 0' }} />

          {/* Resume Section */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#3fb950', fontSize: 12 }}>✓</span>
              <span style={{ fontSize: 12, color: '#3fb950', fontWeight: 500 }}>{resumeName}</span>
            </div>
            {resumeBase ? (
              <button 
                onClick={() => {
                  const win = window.open('', '_blank')
                  if (win) win.document.write(`<html><body style="margin:0"><iframe src="${resumeBase}" width="100%" height="100%" style="border:none;position:fixed;inset:0"></iframe></body></html>`)
                }}
                style={{ background: 'none', border: 'none', padding: 0, fontSize: 12, fontWeight: 500, color: '#58a6ff', textDecoration: 'none', cursor: 'pointer' }}
              >
                View →
              </button>
            ) : (
              <Link to="/profile" style={{ fontSize: 12, fontWeight: 500, color: '#58a6ff', textDecoration: 'none' }}>Add →</Link>
            )}
          </div>

          <Link to="/profile" style={{
            display: 'block', marginTop: 24, textAlign: 'center', fontSize: 13, fontWeight: 500,
            color: '#20c997', textDecoration: 'none', padding: '10px', borderRadius: 6,
            border: '1px solid #2d2d2d', background: '#121212'
          }}>Edit Profile</Link>
        </aside>

      </div>
    </div>
  )
}
