import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const API = "http://localhost:8081";

// ─── Constants & Mock Data ───────────────────────────────────────────────────

const COLORS = {
  bg: '#0d0d0d',
  cardBg: 'rgba(255, 255, 255, 0.04)',
  border: 'rgba(255, 255, 255, 0.09)',
  muted: 'rgba(255, 255, 255, 0.38)',
  text: '#f0ede8',
  amber: '#e8a045',
  slate: '#6b8cba',
  progress: '#c97d3a',
  progressFaded: '#8a6040',
  demandHigh: '#b5a28a',
  demandMed: '#7a8fa6',
  gapCritical: '#a05050',
  gapHigh: '#8a6030',
  gapMedium: '#4a6080',
};

// ─── Components ───────────────────────────────────────────────────────────────

const CircularProgress = ({ score, size = 100 }: { score: number; size?: number }) => {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 1800;
    const startTime = performance.now();

    const updateCount = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = progress * (2 - progress);
      setCount(Math.floor(eased * score));
      if (progress < 1) requestAnimationFrame(updateCount);
    };

    requestAnimationFrame(updateCount);
  }, [score]);

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={COLORS.progress} strokeWidth="8"
          strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - (score / 100) * circumference }}
          transition={{ duration: 1.8, ease: "easeOut" }} strokeLinecap="round"
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 24, fontWeight: 800, color: COLORS.text }}>{count}%</span>
      </div>
    </div>
  );
};

const FloatingDots = () => (
  <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
    {[...Array(12)].map((_, i) => (
      <motion.div
        key={i} initial={{ opacity: 0.15 + Math.random() * 0.15, x: `${Math.random() * 100}%`, y: `${Math.random() * 100}%` }}
        animate={{ y: [0, Math.random() * 40 - 20, 0] }}
        transition={{ duration: 10 + Math.random() * 8, repeat: Infinity, ease: "easeInOut" }}
        style={{ width: 2, height: 2, background: COLORS.text, borderRadius: '50%', position: 'absolute' }}
      />
    ))}
  </div>
);

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Skills() {
  const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
  const [userSkills, setUserSkills] = useState<string[]>(profile.skills || []);
  const [targetRole, setTargetRole] = useState(profile.jobType || '');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingStep, setLoadingStep] = useState(0);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRoleChange = (val: string) => {
    setTargetRole(val);
    clearTimeout(debounceRef.current);

    if (val.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        setShowSuggestions(true);
        const res = await fetch(`${API}/api/skills/suggestions?field=${encodeURIComponent(val)}`);
        const data = await res.json();
        setSuggestions(data.suggestions || []);
      } catch (err) {
        console.error(err);
      }
    }, 400);
  };

  const selectRole = (role: string) => {
    setTargetRole(role);
    setSuggestions([]);
    setShowSuggestions(false);
    clearTimeout(debounceRef.current);
  };

  const addSkill = (s: string) => {
    const trimmed = s.trim();
    if (trimmed && !userSkills.includes(trimmed)) {
      setUserSkills([...userSkills, trimmed]);
    }
    setNewSkill('');
  };

  const removeSkill = (s: string) => setUserSkills(userSkills.filter(x => x !== s));

  const runAnalysis = async () => {
    if (!userSkills.length || !targetRole) return;
    setLoading(true);
    setError('');
    setAnalysis(null);
    const steps = setInterval(() => setLoadingStep(prev => prev + 1), 500);
    try {
      const startTime = Date.now();
      const res = await fetch(`${API}/api/skills/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userSkills, targetRole }),
      });
      const data = await res.json();
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 2200 - elapsed);
      await new Promise(r => setTimeout(r, remaining));
      if (data.error) throw new Error(data.error);
      setAnalysis(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      clearInterval(steps);
      setLoading(false);
      setLoadingStep(0);
    }
  };

  const STYLES = {
    page: { 
      background: COLORS.bg, minHeight: '100vh', padding: '40px 32px', 
      color: COLORS.text, fontFamily: '"DM Sans", sans-serif', position: 'relative',
      overflowX: 'hidden'
    } as React.CSSProperties,
    card: {
      background: COLORS.cardBg, border: `1px solid ${COLORS.border}`,
      borderRadius: '12px', padding: '24px', position: 'relative', zIndex: 1
    } as React.CSSProperties,
    label: {
      color: COLORS.muted, fontSize: '10px', fontWeight: 700, 
      textTransform: 'uppercase' as const, letterSpacing: '0.12em', marginBottom: '12px', display: 'block'
    },
    input: {
      background: 'rgba(255,255,255,0.02)', border: `1px solid ${COLORS.border}`,
      borderRadius: '8px', padding: '12px 16px', color: COLORS.text, fontSize: '14px',
      width: '100%', outline: 'none'
    } as React.CSSProperties,
    btn: {
      background: COLORS.progress, color: '#fff', border: 'none', borderRadius: '8px',
      padding: '16px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', width: '100%'
    } as React.CSSProperties,
    badge: {
      background: 'rgba(232, 160, 69, 0.12)', color: COLORS.amber,
      borderRadius: '4px', padding: '4px 8px', fontSize: '10px', fontWeight: 700,
      textTransform: 'uppercase' as const, letterSpacing: '0.05em'
    } as React.CSSProperties,
  };

  return (
    <div style={STYLES.page}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap" rel="stylesheet" />
      <FloatingDots />
      
      <div style={{ position: 'fixed', top: '-10%', right: '-10%', width: '50%', height: '50%', background: 'radial-gradient(circle, rgba(180, 120, 60, 0.04) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: '-10%', left: '-10%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(70, 90, 130, 0.03) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ display: 'grid', gridTemplateColumns: '500px 1fr', gap: '32px', maxWidth: '1300px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
          
          <div style={STYLES.card}>
            <span style={STYLES.label}>Target Role / Occupation</span>
            <div style={{ position: 'relative' }}>
              <input style={STYLES.input} value={targetRole} onChange={e => handleRoleChange(e.target.value)} placeholder="Search occupations..." />
              <AnimatePresence>
                {showSuggestions && suggestions.length > 0 && (
                  <motion.div 
                    ref={dropdownRef}
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} 
                    style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#141414', border: `1px solid ${COLORS.border}`, borderRadius: '8px', zIndex: 10, marginTop: '8px', overflow: 'hidden', maxHeight: '300px', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}
                  >
                    {suggestions.map(s => (
                      <div key={s} 
                        onClick={() => selectRole(s)}
                        style={{ padding: '12px 16px', cursor: 'pointer', fontSize: '13px', borderBottom: `1px solid ${COLORS.border}` }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        {s}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div style={{ marginTop: '24px' }}>
              <span style={STYLES.label}>Your Current Skills</span>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <input style={{ ...STYLES.input, flex: 1 }} value={newSkill} onChange={e => setNewSkill(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSkill(newSkill)} placeholder="e.g. React" />
                <button onClick={() => addSkill(newSkill)} style={{ width: 44, height: 44, background: 'rgba(255,255,255,0.05)', border: `1px solid ${COLORS.border}`, borderRadius: '8px', color: COLORS.text, cursor: 'pointer' }}>+</button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <AnimatePresence mode="popLayout">
                  {userSkills.map(s => (
                    <motion.span layout key={s} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '20px', padding: '6px 14px', fontSize: '12px', color: '#c8bfb0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {s}
                      <button onClick={() => removeSkill(s)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: 0 }}>×</button>
                    </motion.span>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={runAnalysis} disabled={loading || !userSkills.length || !targetRole} style={{ ...STYLES.btn, opacity: loading || !userSkills.length || !targetRole ? 0.4 : 1, transition: 'all 0.2s' }}>
                <AnimatePresence mode="wait">
                  {loading ? (
                    <motion.div key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                      <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                      Analyzing your profile...
                    </motion.div>
                  ) : <motion.span key="i" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>Analyze My Readiness →</motion.span>}
                </AnimatePresence>
              </button>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '8px' }}>
                {[
                  { label: '900+', val: 'Occupations' },
                  { label: '20', val: 'Live Postings' },
                  { label: 'O*NET', val: 'Verified' }
                ].map(x => (
                  <div key={x.val} style={{ border: `1px solid ${COLORS.border}`, background: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: COLORS.text, marginBottom: '2px' }}>{x.label}</div>
                    <div style={{ fontSize: '9px', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{x.val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {error && <div style={{ color: COLORS.gapCritical, fontSize: '12px', textAlign: 'center', marginTop: '-8px' }}>⚠ {error}</div>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <AnimatePresence mode="wait">
            {!loading && !analysis && (
              <motion.div key="1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '80px 0' }}>
                <div style={{ fontSize: 48, color: 'rgba(255,255,255,0.05)', fontWeight: 900, marginBottom: 20 }}>◈</div>
                <h2 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px' }}>Ready to check your market value?</h2>
                <p style={{ color: COLORS.muted, fontSize: 14 }}>Add your skills and target role to begin the analysis</p>
              </motion.div>
            )}
            {loading && (
              <motion.div key="2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '60px 0' }}>
                <div style={{ position: 'relative', width: 60, height: 60, marginBottom: 40 }}>
                  {[...Array(4)].map((_, i) => (
                    <motion.div key={i} animate={{ rotate: 360 }} transition={{ duration: 2 - i * 0.3, repeat: Infinity, ease: "linear" }} style={{ position: 'absolute', inset: i * 6, border: `2px solid ${COLORS.progress}`, borderRadius: '50%', borderTopColor: 'transparent', borderLeftColor: 'transparent', opacity: 1 - i * 0.2 }} />
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-start' }}>
                  {['Fetching O*NET occupation codes...', 'Scanning live job postings...', 'Calculating skill weights...', 'Compiling gap analysis...'].map((t, i) => (
                    <motion.div key={t} initial={{ opacity: 0, x: -10 }} animate={loadingStep >= i ? { opacity: 1, x: 0 } : {}} style={{ display: 'flex', alignItems: 'center', gap: '12px', color: COLORS.muted, fontSize: '13px' }}>
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }} style={{ width: 6, height: 6, borderRadius: '50%', background: COLORS.amber }} />
                      {t}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
            {analysis && (
              <motion.div key="3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={STYLES.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                        <span style={STYLES.badge}>O*NET Verified</span>
                        <span style={STYLES.badge}>20 Live Postings</span>
                      </div>
                      <h2 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.02em' }}>{analysis.occupationTitle}</h2>
                      <div style={{ fontSize: '10px', color: COLORS.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>{analysis.readinessLabel}</div>
                      <p style={{ margin: 0, fontSize: '14px', color: COLORS.muted, lineHeight: 1.6, maxWidth: '85%' }}>{analysis.topRecommendation || "Based on the latest industry standards..."}</p>
                    </div>
                    <CircularProgress score={analysis.overallReadiness} />
                  </div>
                </div>
                <div style={STYLES.card}>
                  <h3 style={STYLES.label}>Skill Relevance and Market Score</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '4px' }}>
                    {analysis.analyzedSkills?.map((s: any, i: number) => (
                      <div key={s.skill}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 600 }}>{s.skill}</span>
                            <span style={{ fontSize: '8px', background: 'rgba(255,255,255,0.05)', color: COLORS.muted, padding: '2px 6px', borderRadius: '3px', fontWeight: 700 }}>GOV</span>
                            <span style={{ fontSize: '8px', background: 'rgba(255,255,255,0.05)', color: COLORS.muted, padding: '2px 6px', borderRadius: '3px', fontWeight: 700 }}>MARKET</span>
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: s.demandScore >= 70 ? COLORS.demandHigh : COLORS.demandMed }}>{s.demandScore >= 70 ? 'HIGH' : 'MEDIUM'} DEMAND</span>
                        </div>
                        <div style={{ height: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', overflow: 'hidden' }}>
                          <motion.div initial={{ width: 0 }} animate={{ width: `${s.demandScore}%` }} transition={{ duration: 1.2, delay: i * 0.1, ease: "easeOut" }} style={{ height: '100%', background: `linear-gradient(90deg, ${COLORS.progressFaded}, ${COLORS.progress})`, borderRadius: '4px' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={STYLES.card}>
                  <h3 style={STYLES.label}>Critical Skill Gaps</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                    {analysis.gapSkills?.map((gap: any, i: number) => {
                      const bg = gap.importance === 'Critical' ? COLORS.gapCritical : gap.importance === 'Important' ? COLORS.gapHigh : COLORS.gapMedium;
                      return (
                        <motion.div key={gap.skill} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '14px 18px', borderRadius: '8px', borderLeft: `3px solid ${bg}` }}>
                          <span style={{ fontSize: '14px', fontWeight: 600 }}>{gap.skill}</span>
                          <span style={{ fontSize: '9px', fontWeight: 800, color: '#fff', background: bg, padding: '4px 8px', borderRadius: '4px', opacity: 0.8 }}>{gap.importance.toUpperCase()}</span>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
