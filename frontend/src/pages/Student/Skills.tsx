import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const API = "http://localhost:8081";

// --- Constants & Color System (Teal Theme) ---

const COLORS = {
  bg: '#0d1117',
  cardBg: '#161b22', 
  border: '#21262d',
  borderHover: '#30363d',
  muted: '#8b949e',
  text: '#e6edf3',
  accent: '#20c997', // Teal
  accentTint: '#20c99712',
  progress: '#20c997',
  progressFaded: '#161b22',
  demandHigh: '#20c997',
  demandMed: '#58a6ff',
  gapCritical: '#f85149',
  gapHigh: '#d29922',
  gapMedium: '#58a6ff',
};

// --- Components ---

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
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#21262d" strokeWidth="8" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={COLORS.accent} strokeWidth="8"
          strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - (score / 100) * circumference }}
          transition={{ duration: 1.8, delay: 0.5, ease: "easeOut" }} strokeLinecap="round"
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 24, fontWeight: 700, color: COLORS.text }}>{count}%</span>
      </div>
    </div>
  );
};

// --- Main Page ---

export default function Skills() {
  const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
  const [userSkills, setUserSkills] = useState<string[]>(profile.skills || []);
  const [targetRole, setTargetRole] = useState(profile.jobType || '');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingStep, setNewLoadingStep] = useState(0);

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
    const steps = setInterval(() => setNewLoadingStep(prev => prev + 1), 600);
    try {
      const startTime = Date.now();
      const res = await fetch(`${API}/api/skills/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userSkills, targetRole }),
      });
      const data = await res.json();
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 2400 - elapsed);
      await new Promise(r => setTimeout(r, remaining));
      if (data.error) throw new Error(data.error);
      setAnalysis(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      clearInterval(steps);
      setLoading(false);
      setNewLoadingStep(0);
    }
  };

  const STYLES = {
    page: { 
      background: 'transparent', minHeight: '100vh', padding: '40px 28px', 
      color: COLORS.text, fontFamily: '"Inter", sans-serif', position: 'relative',
    } as React.CSSProperties,
    card: {
      background: COLORS.cardBg, border: `1px solid ${COLORS.border}`,
      borderRadius: '10px', padding: '24px', position: 'relative', zIndex: 1
    } as React.CSSProperties,
    label: {
      color: COLORS.muted, fontSize: '11px', fontWeight: 600, 
      textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '12px', display: 'block'
    },
    input: {
      background: '#0d1117', border: `1px solid ${COLORS.border}`,
      borderRadius: '6px', padding: '10px 14px', color: COLORS.text, fontSize: '14px',
      width: '100%', outline: 'none'
    } as React.CSSProperties,
    btn: {
      background: COLORS.accent, color: '#0d1117', border: 'none', borderRadius: '6px',
      padding: '14px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', width: '100%'
    } as React.CSSProperties,
    badge: {
      background: '#20c99712', color: COLORS.accent, border: '1px solid #20c99722',
      borderRadius: '4px', padding: '4px 8px', fontSize: '10px', fontWeight: 600,
      textTransform: 'uppercase' as const, letterSpacing: '0.05em'
    } as React.CSSProperties,
  };

  return (
    <div style={STYLES.page}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 480px) 1fr', gap: '28px', maxWidth: '1400px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
          
          <div style={STYLES.card}>
            <span style={STYLES.label}>Target Occupation</span>
            <div style={{ position: 'relative' }}>
              <input style={STYLES.input} value={targetRole} onChange={e => handleRoleChange(e.target.value)} placeholder="e.g. Software Engineer..." />
              <AnimatePresence>
                {showSuggestions && suggestions.length > 0 && (
                  <motion.div 
                    ref={dropdownRef}
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} 
                    style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#161b22', border: `1px solid ${COLORS.border}`, borderRadius: '8px', zIndex: 10, marginTop: '8px', overflow: 'hidden', maxHeight: '300px', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}
                  >
                    {suggestions.map(s => (
                      <div key={s} 
                        onClick={() => selectRole(s)}
                        style={{ padding: '12px 16px', cursor: 'pointer', fontSize: '13px', borderBottom: `1px solid ${COLORS.border}`, color: COLORS.text }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#21262d')}
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
              <span style={STYLES.label}>Core Skills</span>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <input style={{ ...STYLES.input, flex: 1 }} value={newSkill} onChange={e => setNewSkill(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSkill(newSkill)} placeholder="Add a skill..." />
                <button onClick={() => addSkill(newSkill)} style={{ width: 42, height: 42, background: '#21262d', border: `1px solid ${COLORS.border}`, borderRadius: '6px', color: COLORS.text, cursor: 'pointer', fontWeight: 600 }}>+</button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <AnimatePresence mode="popLayout">
                  {userSkills.map(s => (
                    <motion.span layout key={s} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={{ background: '#21262d', border: '1px solid #30363d', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', color: COLORS.text, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {s}
                      <button onClick={() => removeSkill(s)} style={{ background: 'none', border: 'none', color: COLORS.muted, cursor: 'pointer', padding: 0, fontSize: 16 }}>×</button>
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
                      <div style={{ width: 14, height: 14, border: '2px solid rgba(13,17,23,0.3)', borderTop: '2px solid #0d1117', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                      Crunching market data...
                    </motion.div>
                  ) : <motion.span key="i" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>Analyze My Readiness →</motion.span>}
                </AnimatePresence>
              </button>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '12px' }}>
                {[
                  { label: '900+', val: 'Occupations' },
                  { label: '20', val: 'Postings' },
                  { label: 'O*NET', val: 'Standard' }
                ].map(x => (
                  <div key={x.val} style={{ border: `1px solid ${COLORS.border}`, background: '#0d1117', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: COLORS.text, marginBottom: '2px' }}>{x.label}</div>
                    <div style={{ fontSize: '10px', color: COLORS.muted, textTransform: 'uppercase', fontWeight: 600 }}>{x.val}</div>
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
              <motion.div key="1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 400 }}>
                <div style={{ fontSize: 40, color: COLORS.accent, opacity: 0.1, marginBottom: 20 }}>
                   <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 8px' }}>Ready for a market readiness check?</h2>
                <p style={{ color: COLORS.muted, fontSize: 13 }}>Enter your skills and target role to begin AI analysis</p>
              </motion.div>
            )}
            {loading && (
              <motion.div key="2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 400 }}>
                <div style={{ position: 'relative', width: 50, height: 50, marginBottom: 40 }}>
                   <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} style={{ position: 'absolute', inset: 0, border: `3px solid ${COLORS.accentTint}`, borderTopColor: COLORS.accent, borderRadius: '50%' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'flex-start' }}>
                  {['Accessing industry database...', 'Scanning job requirements...', 'Comparing skill weights...', 'finalizing score...'].map((t, i) => (
                    <motion.div key={t} initial={{ opacity: 0, x: -10 }} animate={loadingStep >= i ? { opacity: 1, x: 0 } : {}} style={{ display: 'flex', alignItems: 'center', gap: '12px', color: COLORS.muted, fontSize: '13px' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: loadingStep >= i ? COLORS.accent : COLORS.border }} />
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
                        <span style={STYLES.badge}>Verified Role</span>
                        <span style={STYLES.badge}>Live Data</span>
                      </div>
                      <h2 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 8px', color: COLORS.text }}>{analysis.occupationTitle}</h2>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                         <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.accent }} />
                         <span style={{ fontSize: '12px', color: COLORS.accent, fontWeight: 600, textTransform: 'uppercase' }}>{analysis.readinessLabel}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '14px', color: COLORS.muted, lineHeight: 1.6, maxWidth: '90%' }}>{analysis.topRecommendation}</p>
                    </div>
                    <CircularProgress score={analysis.overallReadiness} />
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div style={STYLES.card}>
                    <h3 style={STYLES.label}>Market Relevance</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', marginTop: 8 }}>
                      {analysis.analyzedSkills?.map((s: any, i: number) => (
                        <div key={s.skill}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600 }}>{s.skill}</span>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: s.demandScore >= 70 ? COLORS.demandHigh : COLORS.demandMed }}>{s.demandScore}%</span>
                          </div>
                          <div style={{ height: '4px', background: '#21262d', borderRadius: '2px', overflow: 'hidden' }}>
                            <motion.div initial={{ width: 0 }} animate={{ width: `${s.demandScore}%` }} transition={{ duration: 1.2, delay: i * 0.1, ease: "easeOut" }} style={{ height: '100%', background: COLORS.accent, borderRadius: '2px' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div style={STYLES.card}>
                    <h3 style={STYLES.label}>Identified Gaps</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 8 }}>
                      {analysis.gapSkills?.map((gap: any, i: number) => {
                        const borderColor = gap.importance === 'Critical' ? COLORS.gapCritical : gap.importance === 'Important' ? COLORS.gapHigh : COLORS.gapMedium;
                        return (
                          <motion.div key={gap.skill} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0d1117', padding: '12px 14px', borderRadius: '6px', borderLeft: `3px solid ${borderColor}`, border: `1px solid ${COLORS.border}` }}>
                            <span style={{ fontSize: '13px', fontWeight: 500 }}>{gap.skill}</span>
                            <span style={{ fontSize: '9px', fontWeight: 700, color: borderColor }}>{gap.importance.toUpperCase()}</span>
                          </motion.div>
                        );
                      })}
                    </div>
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
