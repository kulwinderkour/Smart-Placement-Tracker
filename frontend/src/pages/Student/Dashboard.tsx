import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { applicationsApi, type TrackedApplication } from '../../api/applications'

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

  const [agentRunning, setAgentRunning] = useState(false);
  const [showAutoApplyModal, setShowAutoApplyModal] = useState(false);
  const [autoApplyStatus, setAutoApplyStatus] = useState<Record<string, 'idle'|'applying'|'done'|'failed'|'skip'>>({});
  const [autoApplyConfirmed, setAutoApplyConfirmed] = useState(false);
  const [minPackage, setMinPackage] = useState(10);

  const [showApplyModal, setShowApplyModal] = useState(false);
  const [activeJobForApply, setActiveJobForApply] = useState<any>(null);
  const [applyNotes, setApplyNotes] = useState('');
  const [isApplying, setIsApplying] = useState(false);

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

  const _pkgToLPA = (val: number) => val >= 10000 ? Math.round(val / 100000 * 10) / 10 : val;
  const _fmtPkg = (val: number) => {
    if (!val) return null;
    const lpa = _pkgToLPA(val);
    return `₹${lpa} LPA`;
  };

  const openAutoApplyPreview = () => {
    setAutoApplyStatus({});
    setAutoApplyConfirmed(false);
    setShowAutoApplyModal(true);
    const needsScoring = adminJobs.some(j => !matchScores[j.id] || matchScores[j.id].loading);
    if (needsScoring) fetchMatchScores(adminJobs);
  };

  const confirmAutoApply = async () => {
    setAutoApplyConfirmed(true);
    setAgentRunning(true);
    const eligibleJobs = adminJobs.filter(j => {
      const ms = matchScores[j.id];
      const pkgLPA = _pkgToLPA(Number(j.package_lpa || j.salary_min || 0));
      const score = ms?.score ?? 0;
      const alreadyApplied = applications.some((a: any) => a.job_id === j.id);
      return !alreadyApplied && ms && !ms.loading && score >= 50 && (pkgLPA === 0 || pkgLPA >= minPackage);
    });
    for (const job of eligibleJobs) {
      setAutoApplyStatus(prev => ({ ...prev, [job.id]: 'applying' }));
      try {
        await applicationsApi.apply(job.id, 'Auto-applied via Smart Placement Agent');
        setAutoApplyStatus(prev => ({ ...prev, [job.id]: 'done' }));
      } catch {
        setAutoApplyStatus(prev => ({ ...prev, [job.id]: 'failed' }));
      }
    }
    setAgentRunning(false);
    applicationsApi.myApplications().then(res => setApplications(res.data as any));
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
  }, [user?.id])

  const skills = profile.skills || []

  const gradYearStr = (profile.graduationYear || profile.graduation_year || '2025').toString()
  const gradYear = parseInt(gradYearStr, 10)
  const diffDays = Math.max(0, Math.ceil((new Date(gradYear, 5, 1).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
  const cgpaNum = typeof profile.cgpa === 'string' ? parseFloat(profile.cgpa) : (profile.cgpa || 0)
  const resumeName = profile.resumeName || profile.resume_name || 'resume.pdf'
  const resumeBase = profile.resumeBase64 || profile.resume_base64

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
            {greeting}, {firstName} 👋
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#7d8590' }}>
            {skills.length > 0 ? `Track your profile and skills efficiently.` : `Complete your profile to boost placement readiness.`}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Notification Bell */}
          <div style={{ color: '#7d8590', cursor: 'pointer', padding: '6px', borderRadius: 8 }}>
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
          <div style={{ width: 1, height: 22, background: '#21262d', margin: '0 4px' }} />

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
              color: logoutHov ? '#f85149' : '#7d8590',
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#e6edf3' }}>Recent Applications</h2>
              <Link to="/jobs" style={{ fontSize: 12, color: '#20c997', textDecoration: 'none', fontWeight: 500 }}>Browse Jobs →</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {appsLoading ? (
                <p style={{ fontSize: 13, color: '#7d8590', margin: 0 }}>Loading…</p>
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
                    borderBottom: i === Math.min(applications.length, 5) - 1 ? 'none' : '1px solid #21262d'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 6, background: '#21262d', color: '#7d8590',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 500,
                        flexShrink: 0
                      }}>{app.company[0]?.toUpperCase() ?? '?'}</div>
                      <div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: '#e6edf3' }}>{app.company}</p>
                        <p style={{ margin: 0, fontSize: 12, color: '#7d8590' }}>{app.role} · {appliedDate}</p>
                      </div>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 4,
                      background: s.bg, color: s.color, border: s.border, flexShrink: 0
                    }}>{statusKey}</span>
                  </div>
                )
              }) : (
                <p style={{ fontSize: 13, color: '#7d8590', margin: 0 }}>
                  No applications yet. <Link to="/jobs" style={{ color: '#20c997', textDecoration: 'none' }}>Browse jobs →</Link>
                </p>
              )}
            </div>
          </div>

          {/* ── Auto Apply Preview Modal ── */}
          {showAutoApplyModal && (
            <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', zIndex: 1000, padding: '16px'
            }}>
              <div style={{
                background: '#161b22', border: '1px solid #30363d', borderRadius: '14px',
                width: '100%', maxWidth: '600px', maxHeight: '85vh',
                display: 'flex', flexDirection: 'column', boxShadow: '0 24px 48px rgba(0,0,0,0.5)'
              }}>
                {/* Header */}
                <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #21262d', flexShrink: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#e6edf3' }}>⚡ Smart Placement Auto-Apply</h2>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#7d8590' }}>
                        Powered by trained ML profile matcher · Filter: ₹{minPackage} LPA+ · Match ≥ 50%
                      </p>
                    </div>
                    <button onClick={() => setShowAutoApplyModal(false)}
                      style={{ background: 'none', border: 'none', color: '#7d8590', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}>✕</button>
                  </div>
                </div>

                {/* Job List */}
                <div style={{ overflowY: 'auto', flex: 1, padding: '16px 24px' }}>
                  {adminJobs.length === 0 && (
                    <p style={{ color: '#484f58', textAlign: 'center', marginTop: '32px' }}>No placements posted yet.</p>
                  )}
                  {adminJobs.map(job => {
                    const ms = matchScores[job.id];
                    const score = ms?.score ?? 0;
                    const progressStatus = autoApplyStatus[job.id];
                    const pkg = Number(job.package_lpa || job.salary_min || 0);
                    const pkgLPA = _pkgToLPA(pkg);
                    const alreadyApplied = applications.some((a: any) => a.job_id === job.id);

                    // Compute display status reactively from live matchScores
                    type DS = 'scoring'|'eligible'|'ineligible'|'applying'|'done'|'failed';
                    let ds: DS;
                    if (progressStatus === 'applying') ds = 'applying';
                    else if (progressStatus === 'done' || alreadyApplied) ds = 'done';
                    else if (progressStatus === 'failed') ds = 'failed';
                    else if (!ms || ms.loading) ds = 'scoring';
                    else if (score >= 50 && (pkgLPA === 0 || pkgLPA >= minPackage)) ds = 'eligible';
                    else ds = 'ineligible';

                    const scoreColor = score >= 70 ? '#3fb950' : score >= 50 ? '#d29922' : '#f85149';
                    const eligMsg = score >= 80 ? `🎯 Excellent match — you are` :
                                   score >= 60 ? `✔ Good match — you are` :
                                   score >= 50 ? `⚡ You are` : `⚠️ Low match — only`;
                    const statusConfig: Record<DS, { label: string; bg: string; fg: string; border: string }> = {
                      scoring:    { label: '⏳ Scoring…',      bg: '#1a1a2e', fg: '#818cf8', border: '#818cf833' },
                      eligible:   { label: '✓ Will Apply',    bg: '#1a2e22', fg: '#3fb950', border: '#23863633' },
                      ineligible: { label: '— Skipped',       bg: '#161b22', fg: '#7d8590', border: '#21262d'   },
                      applying:   { label: '⏳ Applying…',    bg: '#1a1a2e', fg: '#818cf8', border: '#818cf833' },
                      done:       { label: '✓ Applied',       bg: '#1a2e22', fg: '#3fb950', border: '#3fb95033' },
                      failed:     { label: '✗ Failed',        bg: '#2d1b1b', fg: '#f85149', border: '#f8514933' },
                    };
                    const sc = statusConfig[ds];

                    return (
                      <div key={job.id} style={{
                        background: '#0d1117', border: `1px solid ${ds === 'eligible' ? '#23863660' : '#21262d'}`,
                        borderRadius: '10px', padding: '14px 16px', marginBottom: '10px',
                        opacity: ds === 'ineligible' ? 0.5 : 1,
                        transition: 'border-color 0.3s'
                      }}>
                        {/* Header row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#e6edf3' }}>{job.title}</div>
                            <div style={{ fontSize: '12px', color: '#7d8590', marginTop: '2px' }}>
                              {job.company || job.company_name} · {job.location || 'Remote'}
                              {pkg > 0 && <span style={{ color: '#3fb950', marginLeft: '8px' }}>{_fmtPkg(pkg)}</span>}
                            </div>
                          </div>
                          <span style={{ background: sc.bg, color: sc.fg, border: `1px solid ${sc.border}`, borderRadius: '6px', padding: '3px 10px', fontSize: '11px', fontWeight: 600, flexShrink: 0, marginLeft: '8px' }}>
                            {sc.label}
                          </span>
                        </div>

                        {/* Eligibility block */}
                        {ds === 'scoring' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: '#1a1a2e40', borderRadius: '8px' }}>
                            <div style={{ width: '14px', height: '14px', border: '2px solid #818cf8', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                            <span style={{ fontSize: '12px', color: '#818cf8' }}>Computing your eligibility for this placement…</span>
                          </div>
                        ) : ds !== 'done' && ms && !ms.loading && ms.score !== undefined ? (
                          <div style={{ background: `${scoreColor}08`, border: `1px solid ${scoreColor}30`, borderRadius: '8px', padding: '10px 12px' }}>
                            {/* Prominence message */}
                            <div style={{ fontSize: '13px', color: '#e6edf3', fontWeight: 500, marginBottom: '8px' }}>
                              {eligMsg} <span style={{ color: scoreColor, fontSize: '18px', fontWeight: 800 }}>{score}%</span>{' '}
                              <span style={{ color: scoreColor }}>eligible</span> for this placement
                            </div>
                            {/* Score bar */}
                            <div style={{ height: '6px', background: '#21262d', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
                              <div style={{ width: `${score}%`, height: '100%', background: scoreColor, borderRadius: '3px', transition: 'width 0.6s ease' }} />
                            </div>
                            {/* Skills */}
                            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                              {(ms.matched || []).slice(0, 4).map(s => (
                                <span key={s} style={{ background: '#1a2e2260', color: '#3fb950', border: '1px solid #3fb95040', borderRadius: '3px', padding: '2px 6px', fontSize: '10px' }}>✓ {s}</span>
                              ))}
                              {(ms.gaps || []).slice(0, 3).map(s => (
                                <span key={s} style={{ background: '#2d1b1b60', color: '#f85149', border: '1px solid #f8514940', borderRadius: '3px', padding: '2px 6px', fontSize: '10px' }}>✗ {s}</span>
                              ))}
                              {ds === 'ineligible' && pkgLPA > 0 && pkgLPA < minPackage && (
                                <span style={{ color: '#7d8590', fontSize: '10px', alignSelf: 'center', marginLeft: '4px' }}>Package below ₹{minPackage} LPA threshold</span>
                              )}
                            </div>
                          </div>
                        ) : ds === 'done' ? (
                          <div style={{ fontSize: '12px', color: '#3fb950' }}>✓ Application submitted successfully</div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                {/* Footer */}
                <div style={{ padding: '16px 24px', borderTop: '1px solid #21262d', flexShrink: 0 }}>
                  {(() => {
                    const eligible = adminJobs.filter(j => {
                      const ms = matchScores[j.id];
                      const pkgLPA = _pkgToLPA(Number(j.package_lpa || j.salary_min || 0));
                      const score = ms?.score ?? 0;
                      const alreadyApplied = applications.some((a: any) => a.job_id === j.id);
                      const progress = autoApplyStatus[j.id];
                      return !alreadyApplied && progress !== 'done' && progress !== 'applying' &&
                             ms && !ms.loading && score >= 50 && (pkgLPA === 0 || pkgLPA >= minPackage);
                    }).length;
                    const scoring = adminJobs.some(j => !matchScores[j.id] || matchScores[j.id].loading);
                    const done = Object.values(autoApplyStatus).filter(s => s === 'done').length;
                    const failed = Object.values(autoApplyStatus).filter(s => s === 'failed').length;
                    return (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', color: scoring && !autoApplyConfirmed ? '#818cf8' : '#7d8590' }}>
                          {autoApplyConfirmed
                            ? `${done} applied · ${failed} failed · ${eligible} pending`
                            : scoring
                            ? '⏳ Computing your eligibility…'
                            : `${eligible} eligible placement${eligible !== 1 ? 's' : ''} found`
                          }
                        </span>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button onClick={() => setShowAutoApplyModal(false)}
                            style={{ background: 'transparent', border: '1px solid #30363d', color: '#e6edf3', borderRadius: '8px', padding: '8px 18px', fontSize: '13px', cursor: 'pointer' }}>
                            {autoApplyConfirmed && !agentRunning ? 'Close' : 'Cancel'}
                          </button>
                          {!autoApplyConfirmed && eligible > 0 && (
                            <button onClick={confirmAutoApply}
                              style={{ background: '#7c3aed', border: 'none', color: 'white', borderRadius: '8px', padding: '8px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                              Apply to {eligible} job{eligible !== 1 ? 's' : ''} →
                            </button>
                          )}
                          {agentRunning && (
                            <span style={{ color: '#818cf8', fontSize: '13px', alignSelf: 'center' }}>⏳ Applying…</span>
                          )}
                          {autoApplyConfirmed && !agentRunning && eligible === 0 && (
                            <span style={{ color: '#3fb950', fontSize: '13px', alignSelf: 'center' }}>✓ All done!</span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* ── Apply Modal ── */}
          {showApplyModal && activeJobForApply && (
            <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 100, backdropFilter: 'blur(4px)'
            }}>
              <div style={{
                background: '#161b22', border: '1px solid #21262d', borderRadius: '12px',
                width: '100%', maxWidth: '450px', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
              }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#e6edf3' }}>
                  Apply for {activeJobForApply.title}
                </h3>
                <p style={{ fontSize: '13px', color: '#7d8590', marginTop: '4px', marginBottom: '16px' }}>
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
                        <span style={{ fontSize: '13px', color: '#e6edf3', fontWeight: 500 }}>{msg} — Your profile match</span>
                        <span style={{ fontSize: '22px', fontWeight: 800, color: scoreColor }}>{score}%</span>
                      </div>
                      <div style={{ height: '6px', background: '#21262d', borderRadius: '3px', overflow: 'hidden', marginBottom: '10px' }}>
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
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#484f58', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Notes for the Placement Cell / Company
                  </label>
                  <textarea 
                    value={applyNotes}
                    onChange={(e) => setApplyNotes(e.target.value)}
                    placeholder="Briefly state your interest or mention any relevant details..."
                    style={{
                      width: '100%', height: '120px', background: '#0d1117', border: '1px solid #21262d',
                      borderRadius: '8px', padding: '12px', color: '#e6edf3', fontSize: '14px',
                      resize: 'none', outline: 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={() => { setShowApplyModal(false); setApplyNotes(''); }}
                    style={{
                      flex: 1, background: 'transparent', border: '1px solid #21262d',
                      color: '#e6edf3', borderRadius: '8px', padding: '10px', fontSize: '14px',
                      fontWeight: 600, cursor: 'pointer'
                    }}>
                    Cancel
                  </button>
                  <button onClick={handleManualApply} disabled={isApplying}
                    style={{
                      flex: 1, background: '#20c997', border: 'none',
                      color: '#0d1117', borderRadius: '8px', padding: '10px', fontSize: '14px',
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
                  <h2 style={{ color: '#e6edf3', fontSize: '16px', fontWeight: 600, margin: 0 }}>
                    Opportunities from SmartPlacement
                  </h2>
                  <span style={{
                    background: '#20c997', color: '#0d1117', fontSize: '10px', fontWeight: 700,
                    padding: '2px 8px', borderRadius: '20px', letterSpacing: '0.05em'
                  }}>VERIFIED</span>
                </div>
                <p style={{ color: '#7d8590', fontSize: '12px', marginTop: '3px' }}>
                  Handpicked opportunities posted directly by our placement team
                </p>
              </div>
              <span style={{ color: '#7d8590', fontSize: '12px' }}>
                {adminJobs.length} active opening{adminJobs.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div style={{ height: '1px', background: '#21262d', marginBottom: '16px' }} />

            {/* Auto apply bar */}
            <div style={{
              background: '#161b22', border: '1px solid #21262d',
              borderRadius: '10px', padding: '16px 20px',
              display: 'flex', alignItems: 'center', gap: '12px',
              marginBottom: '16px', flexWrap: 'wrap'
            }}>
              <span style={{ color: '#e6edf3', fontSize: '13px', fontWeight: 500 }}>
                Auto Apply Agent
              </span>
              <span style={{ color: '#7d8590', fontSize: '12px' }}>
                Apply to all eligible jobs above
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                <span style={{ color: '#7d8590', fontSize: '12px' }}>Min package:</span>
                <select
                  value={minPackage}
                  onChange={e => setMinPackage(Number(e.target.value))}
                  aria-label="Minimum package filter"
                  title="Minimum package filter"
                  style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: '6px', color: '#e6edf3', padding: '6px 10px', fontSize: '12px' }}
                >
                  {[5, 8, 10, 12, 15, 20, 25, 30].map(p => (
                    <option key={p} value={p}>₹{p} LPA+</option>
                  ))}
                </select>
                <button onClick={openAutoApplyPreview} disabled={jobsLoading || Object.keys(matchScores).length === 0}
                  style={{
                    background: (jobsLoading || Object.keys(matchScores).length === 0) ? '#21262d' : '#7c3aed',
                    color: (jobsLoading || Object.keys(matchScores).length === 0) ? '#7d8590' : 'white',
                    border: 'none', borderRadius: '6px',
                    padding: '7px 16px', fontSize: '12px',
                    fontWeight: 600, cursor: (jobsLoading || Object.keys(matchScores).length === 0) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}>
                  ⚡ Auto Apply
                </button>
              </div>
            </div>

            {jobsLoading && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                {[1, 2].map(i => (
                  <div key={i} style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: '10px', padding: '18px', height: '100px' }} />
                ))}
              </div>
            )}

            {!jobsLoading && adminJobs.length === 0 && (
              <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: '10px', padding: '32px', textAlign: 'center' }}>
                <p style={{ color: '#484f58', fontSize: '13px' }}>No opportunities posted yet. Check back soon.</p>
              </div>
            )}

            {!jobsLoading && adminJobs.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
                {adminJobs.map(job => {
                  const isApplied = applications.some(a => a.job_id === job.id);
                  const ms = matchScores[job.id];
                  const scoreColor = !ms || ms.loading || ms.score === undefined ? '#7d8590'
                    : ms.score >= 70 ? '#3fb950'
                    : ms.score >= 40 ? '#d29922'
                    : '#f85149';
                  return (
                    <div key={job.id} style={{
                      background: '#161b22', border: '1px solid #21262d', borderRadius: '10px',
                      padding: '18px 20px', transition: 'border-color 0.15s', cursor: 'pointer'
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#30363d'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#21262d'}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '36px', height: '36px', borderRadius: '8px', background: '#21262d',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7d8590', fontWeight: 700,
                            fontSize: '14px', flexShrink: 0, overflow: 'hidden'
                          }}>
                            {job.company_logo ? <img src={job.company_logo} alt={job.company || job.company_name || 'Company'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (job.company || job.company_name)?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ color: '#e6edf3', fontSize: '14px', fontWeight: 600 }}>{job.title}</div>
                            <div style={{ color: '#7d8590', fontSize: '12px' }}>{job.company || job.company_name}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px', flexShrink: 0 }}>
                          {(job.package_lpa || job.salary_min) && (
                            <span style={{ background: '#1a2e22', color: '#3fb950', border: '1px solid #23863633', borderRadius: '4px', padding: '3px 8px', fontSize: '11px', fontWeight: 600 }}>
                              ₹{job.package_lpa || job.salary_min} LPA
                            </span>
                          )}
                          {ms && (
                            ms.loading ? (
                              <span style={{ fontSize: '10px', color: '#7d8590' }}>⏳ scoring…</span>
                            ) : ms.score !== undefined ? (
                              <span style={{ background: scoreColor + '22', color: scoreColor, border: `1px solid ${scoreColor}44`, borderRadius: '4px', padding: '3px 8px', fontSize: '11px', fontWeight: 700 }}>
                                {ms.score}% match
                              </span>
                            ) : null
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '12px', marginBottom: '6px', flexWrap: 'wrap' }}>
                        {job.location && <span style={{ color: '#7d8590', fontSize: '11px' }}>📍 {job.location}</span>}
                        {job.job_type && <span style={{ color: '#7d8590', fontSize: '11px' }}>💼 {job.job_type}</span>}
                      </div>
                      {ms && !ms.loading && ms.score !== undefined && ((ms.matched?.length ?? 0) > 0 || (ms.gaps?.length ?? 0) > 0) && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                          {(ms.matched || []).slice(0, 3).map(s => (
                            <span key={s} style={{ background: '#1a2e2260', color: '#3fb950', border: '1px solid #3fb95040', borderRadius: '3px', padding: '2px 6px', fontSize: '10px', fontWeight: 500 }}>{s}</span>
                          ))}
                          {(ms.gaps || []).slice(0, 2).map(s => (
                            <span key={s} style={{ background: '#2d1b1b60', color: '#f85149', border: '1px solid #f8514940', borderRadius: '3px', padding: '2px 6px', fontSize: '10px', fontWeight: 500 }}>−{s}</span>
                          ))}
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#484f58', fontSize: '11px' }}>
                          {job.application_deadline ? `Deadline: ${new Date(job.application_deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}
                        </span>
                        {isApplied ? (
                          <button disabled
                            style={{ background: '#21262d', color: '#7d8590', border: '1px solid #30363d', borderRadius: '6px', padding: '5px 14px', fontSize: '12px', fontWeight: 600, cursor: 'not-allowed' }}>
                            Applied ✓
                          </button>
                        ) : job.apply_link ? (
                          <a href={job.apply_link} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                            style={{ background: '#20c997', color: '#0d1117', borderRadius: '6px', padding: '5px 14px', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}>
                            Apply Externally →
                          </a>
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); setActiveJobForApply(job); setShowApplyModal(true); }}
                            style={{ background: '#7c3aed', color: 'white', border: 'none', borderRadius: '6px', padding: '5px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                            Apply Internally →
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Placement Pulse CTA */}
          <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 10, padding: '20px 24px', marginTop: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#e6edf3' }}>⚡ Placement Pulse</h2>
              <Link to="/placement-pulse" style={{ fontSize: 12, color: '#20c997', textDecoration: 'none', fontWeight: 500 }}>Open Pulse →</Link>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: '#20c99712', border: '1px solid #20c99722', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#20c997' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#e6edf3' }}>Track your prep momentum</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#7d8590' }}>Daily actions · Streaks · Category readiness</p>
              </div>
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
              <span style={{ fontSize: 12, fontWeight: 500, color: '#e6edf3' }}>{profile.cgpa || profile.cgpa} / 10</span>
            </div>
            <div style={{ height: 4, background: '#21262d', borderRadius: 2 }}>
              <div style={{ width: `${(cgpaNum / 10) * 100}%`, height: '100%', background: '#20c997', borderRadius: 2 }} />
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
            border: '1px solid #21262d', background: '#0d1117'
          }}>Edit Profile</Link>
        </aside>

      </div>
    </div>
  )
}
