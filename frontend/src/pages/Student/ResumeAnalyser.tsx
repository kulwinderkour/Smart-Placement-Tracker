import { useState, useEffect, useRef, useCallback } from 'react'

interface AnalysisResult {
  atsScore: number
  breakdown: {
    keywordsMatch: number
    formatScore: number
    skillsRelevance: number
    experienceMatch: number
  }
  strengths: string[]
  improvements: string[]
  missingKeywords: string[]
  suggestedKeywords: string[]
  summary: string
}

function scoreColor(n: number) {
  return n >= 70 ? 'var(--student-accent)' : n >= 50 ? '#f0b429' : '#f85149'
}

// ── Animated ring gauge ───────────────────────────────────────────────────────
function RingGauge({
  score, size = 120, strokeW = 10, label, large = false,
}: {
  score: number; size?: number; strokeW?: number; label?: string; large?: boolean
}) {
  const [displayed, setDisplayed] = useState(0)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)
  const DURATION = 1500

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    startRef.current = null
    const target = score

    const step = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp
      const elapsed = timestamp - startRef.current
      const progress = Math.min(elapsed / DURATION, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayed(Math.round(eased * target))
      if (progress < 1) rafRef.current = requestAnimationFrame(step)
    }

    rafRef.current = requestAnimationFrame(step)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [score])

  const r = (size - strokeW) / 2
  const circ = 2 * Math.PI * r
  const fill = (displayed / 100) * circ
  const color = scoreColor(score)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke="var(--student-border)" strokeWidth={strokeW} />
          <circle cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={color} strokeWidth={strokeW}
            strokeDasharray={`${fill} ${circ - fill}`}
            strokeLinecap="round"
            style={{ transition: 'none' }} />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{
            fontSize: large ? 28 : 15, fontWeight: 700, color,
            lineHeight: 1,
          }}>{displayed}</span>
          {large && <span style={{ fontSize: 11, color: 'var(--student-text-muted)', marginTop: 2 }}>/ 100</span>}
        </div>
      </div>
      {label && (
        <span style={{ fontSize: 11, color: 'var(--student-text-muted)', textAlign: 'center', maxWidth: size }}>{label}</span>
      )}
    </div>
  )
}

// ── Pill tag ──────────────────────────────────────────────────────────────────
function Pill({ text, color }: { text: string; color: string }) {
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 20, fontSize: 12,
      border: `1px solid ${color}`, color, background: `${color}12`,
      whiteSpace: 'nowrap',
    }}>{text}</span>
  )
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 600, color: 'var(--student-text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
      {children}
    </p>
  )
}

// ── Card shell ────────────────────────────────────────────────────────────────
function Panel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'var(--student-surface)', border: '1px solid var(--student-border)',
      borderRadius: 12, padding: '20px 22px', ...style,
    }}>
      {children}
    </div>
  )
}

interface StoredResume {
  resume_id: string | null
  version: number
  file_name: string | null
  signed_url: string
  expires_in_minutes: number
}

interface HistoryEntry {
  id: string
  resume_version: number
  file_name: string
  ats_score: number
  analyzed_at: string
  job_description_snippet: string | null
  feedback: AnalysisResult | null
}

export default function ResumeAnalyser() {
  const API = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').replace(/\/$/, '')

  const [storedResume, setStoredResume] = useState<StoredResume | null>(null)
  const [loadingResume, setLoadingResume] = useState(true)
  const [uploadFile, setUploadFile]   = useState<File | null>(null)
  const [isDragging, setIsDragging]   = useState(false)
  const [uploading, setUploading]     = useState(false)
  const [jobDescription, setJobDescription] = useState('')
  const [isLoading, setIsLoading]     = useState(false)
  const [result, setResult]           = useState<AnalysisResult | null>(null)
  const [error, setError]             = useState<string>('')
  const [visible, setVisible]         = useState(false)
  const [activeTab, setActiveTab]     = useState<'analyze' | 'history'>('analyze')
  const [history, setHistory]         = useState<HistoryEntry[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [resultFileName, setResultFileName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const token = () => localStorage.getItem('token') || localStorage.getItem('access_token') || ''
  const authHeader = () => ({ Authorization: `Bearer ${token()}` })

  const fetchStoredResume = useCallback(async () => {
    setLoadingResume(true)
    try {
      const res = await fetch(`${API}/student/resume`, { headers: authHeader() })
      if (res.ok) setStoredResume(await res.json())
      else setStoredResume(null)
    } catch { setStoredResume(null) }
    finally { setLoadingResume(false) }
  }, [API])

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true)
    try {
      const res = await fetch(`${API}/student/resume/analysis/history`, { headers: authHeader() })
      if (res.ok) {
        const data = await res.json()
        setHistory(data.data || [])
      }
    } catch { /* silent */ }
    finally { setLoadingHistory(false) }
  }, [API])

  useEffect(() => { fetchStoredResume() }, [fetchStoredResume])
  useEffect(() => { if (activeTab === 'history') fetchHistory() }, [activeTab, fetchHistory])

  const handleFile = useCallback((f: File) => {
    if (!f.name.toLowerCase().endsWith('.pdf')) { setError('Only PDF files are supported.'); return }
    setUploadFile(f); setError('')
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  const handleUpload = async () => {
    if (!uploadFile) return
    setUploading(true); setError('')
    try {
      const form = new FormData()
      form.append('file', uploadFile)
      const res = await fetch(`${API}/student/upload-resume`, {
        method: 'POST',
        headers: authHeader(),
        body: form,
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.detail || 'Upload failed')
      }
      setUploadFile(null)
      await fetchStoredResume()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally { setUploading(false) }
  }

  const handleAnalyze = async () => {
    if (!storedResume) { setError('Please upload your resume first'); return }
    setIsLoading(true); setError(''); setResult(null); setVisible(false)
    setResultFileName(storedResume.file_name || 'resume.pdf')

    try {
      const res = await fetch(`${API}/student/resume/analyze`, {
        method: 'POST',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_description: jobDescription }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Analysis failed')
      setResult(data.data)
      setTimeout(() => setVisible(true), 50)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.')
    } finally { setIsLoading(false) }
  }

  return (
    <div style={{ background: 'var(--student-bg)', minHeight: '100vh', color: 'var(--student-text)' }}>
      <style>{`
        .ra-page { padding: 32px 16px 60px; }
        .ra-drop { border: 2px dashed var(--student-border); border-radius: 14px; padding: 36px 20px; text-align: center; cursor: pointer; transition: all 0.2s ease; background: transparent; }
        .ra-drop:hover, .ra-drop.dragging { border-color: var(--student-accent); background: rgba(167,139,250,0.06); box-shadow: 0 0 20px rgba(167,139,250,0.1); }
        .ra-textarea { width: 100%; padding: 12px 14px; resize: vertical; background: var(--student-surface); border: 1px solid var(--student-border); border-radius: 10px; color: var(--student-text); font-size: 13px; line-height: 1.6; box-sizing: border-box; transition: border-color 0.2s, box-shadow 0.2s; font-family: inherit; }
        .ra-textarea:focus { border-color: var(--student-accent); box-shadow: 0 0 0 3px rgba(167,139,250,0.12); outline: none; }
        .ra-textarea::placeholder { color: var(--student-text-muted); }
        .ra-btn { width: 100%; padding: 14px; border-radius: 12px; border: none; font-size: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s; letter-spacing: 0.02em; }
        .ra-btn:not(:disabled):hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(167,139,250,0.3); }
        .ra-btn:disabled { cursor: not-allowed; }
        .ra-results { opacity: 0; transform: translateY(12px); transition: opacity 0.5s ease, transform 0.5s ease; }
        .ra-results.visible { opacity: 1; transform: translateY(0); }
        .ra-glass { background: var(--student-surface); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid var(--student-border); border-radius: 20px; }
        @media (max-width: 768px) { .ra-two-col { grid-template-columns: 1fr !important; } .ra-page { padding: 20px 12px 48px; } }
      `}</style>

      {!result ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '32px 16px' }}>
          <div className="ra-glass" style={{ width: '100%', maxWidth: 680, padding: '40px 40px 32px' }}>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 16px' }}>📄</div>
              <h1 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 700, color: 'var(--student-text)', letterSpacing: '-0.02em' }}>Resume Analyser</h1>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--student-text-muted)', lineHeight: 1.6 }}>AI-powered ATS compatibility report. Resume stored securely in GCS.</p>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, background: '#ffffff', borderRadius: 10, padding: 4, marginBottom: 24 }}>
              {(['analyze', 'history'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', background: activeTab === tab ? 'var(--student-accent)' : 'transparent', color: '#000000', transition: 'all 0.15s' }}>
                  {tab === 'analyze' ? 'Analyze' : 'History'}
                </button>
              ))}
            </div>

            {activeTab === 'analyze' ? (
              <>
                {/* Stored resume banner */}
                {storedResume ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 20 }}>📎</span>
                      <div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--student-accent)' }}>{storedResume.file_name}</p>
                        <p style={{ margin: 0, fontSize: 11, color: 'var(--student-text-muted)' }}>v{storedResume.version} · Stored in GCS · Ready to analyze</p>
                      </div>
                    </div>
                    <a href={storedResume.signed_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--student-accent)', textDecoration: 'none', fontWeight: 500 }}>View →</a>
                  </div>
                ) : loadingResume ? (
                  <p style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 600, color: '#ffffff', textAlign: 'center' }}>Loading resume…</p>
                ) : (
                  <p style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 600, color: '#ffffff', textAlign: 'center' }}>No resume stored yet — upload one below.</p>
                )}

                {/* Upload new / replace */}
                <div
                  className={`ra-drop${isDragging ? ' dragging' : ''}`}
                  onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input ref={fileInputRef} type="file" accept=".pdf" aria-label="Upload resume PDF" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
                  {uploadFile ? (
                    <>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--student-accent)', marginBottom: 4 }}>{uploadFile.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--student-text-muted)' }}>Click to change · will create new version</div>
                    </>
                  ) : (
                    <>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--student-text-muted)" strokeWidth="1.5" style={{ marginBottom: 10 }}>
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M12 12v6M9 15l3-3 3 3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <div style={{ fontSize: 13, color: 'var(--student-text-muted)', marginBottom: 4, fontWeight: 500 }}>
                        {storedResume ? 'Upload new version (drag & drop or click)' : 'Drag & drop PDF or click to browse'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--student-text-dim)' }}>PDF only · max 5 MB</div>
                    </>
                  )}
                </div>

                {uploadFile && (
                  <button className="ra-btn" onClick={handleUpload} disabled={uploading} style={{ marginTop: 10, background: uploading ? 'var(--student-border)' : 'var(--student-surface)', border: '1px solid var(--student-border)', color: 'var(--student-text)', fontSize: 13 }}>
                    {uploading ? 'Uploading…' : '⬆ Save resume to GCS'}
                  </button>
                )}

                {/* JD input */}
                <div style={{ marginTop: 20 }}>
                  <label htmlFor="ra-jd" style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--student-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                    Target Job Description (optional)
                  </label>
                  <textarea id="ra-jd" className="ra-textarea" value={jobDescription} onChange={e => setJobDescription(e.target.value)} placeholder="Paste the job description you're applying for…" rows={4} />
                </div>

                {error && (
                  <div style={{ marginTop: 14, background: 'rgba(248,81,73,0.08)', border: '1px solid rgba(248,81,73,0.25)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#f85149' }}>{error}</div>
                )}

                <button className="ra-btn" onClick={handleAnalyze} disabled={isLoading || !storedResume} style={{ marginTop: 20, background: (!storedResume || isLoading) ? 'var(--student-border)' : 'linear-gradient(135deg, var(--student-accent), var(--student-accent-hover))', color: 'var(--student-bg)' }}>
                  {isLoading ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
                          <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
                        </path>
                      </svg>
                      Analyzing…
                    </>
                  ) : '✨ Analyze Resume'}
                </button>

              </>
            ) : (
              /* History tab */
              <div>
                {loadingHistory ? (
                  <p style={{ textAlign: 'center', color: 'var(--student-text-muted)', fontSize: 13, padding: '20px 0' }}>Loading history…</p>
                ) : history.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--student-text-muted)', fontSize: 13, padding: '20px 0' }}>No analyses yet. Analyze your resume to see history here.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {history.map(h => (
                      <div key={h.id} style={{ background: 'var(--student-bg)', border: '1px solid var(--student-border)', borderRadius: 12, padding: '14px 16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <div>
                            <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 600, color: 'var(--student-text)' }}>{h.file_name} <span style={{ color: 'var(--student-text-dim)', fontWeight: 400 }}>v{h.resume_version}</span></p>
                            <p style={{ margin: 0, fontSize: 11, color: 'var(--student-text-muted)' }}>{new Date(h.analyzed_at).toLocaleString()}</p>
                          </div>
                          <span style={{ fontSize: 20, fontWeight: 700, color: scoreColor(h.ats_score) }}>{h.ats_score}</span>
                        </div>
                        {h.job_description_snippet && (
                          <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--student-text-dim)', fontStyle: 'italic' }}>JD: {h.job_description_snippet}…</p>
                        )}
                        {h.feedback && (
                          <button onClick={() => { setResult(h.feedback!); setResultFileName(h.file_name); setTimeout(() => setVisible(true), 50) }} style={{ fontSize: 12, color: 'var(--student-accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 500 }}>
                            View full report →
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── Results view ── */
        <div className="ra-page">
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
              <div>
                <h1 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700, color: 'var(--student-text)' }}>Analysis Complete</h1>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--student-text-muted)' }}>{resultFileName}</p>
              </div>
              <button onClick={() => { setResult(null); setVisible(false); setError('') }} style={{ padding: '9px 18px', borderRadius: 10, border: '1px solid var(--student-border)', background: 'transparent', color: 'var(--student-text)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                ← Back
              </button>
            </div>

            <div className={`ra-results ra-two-col${visible ? ' visible' : ''}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, alignItems: 'start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <Panel>
                  <SectionLabel>ATS Score</SectionLabel>
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
                    <RingGauge score={result.atsScore} size={160} strokeW={14} large />
                  </div>
                  <p style={{ margin: '10px 0 0', textAlign: 'center', fontSize: 12, color: 'var(--student-text-muted)' }}>
                    {result.atsScore >= 70 ? '✅ Good ATS compatibility' : result.atsScore >= 50 ? '⚠️ Needs improvement' : '❌ Significant improvements needed'}
                  </p>
                </Panel>
                <Panel>
                  <SectionLabel>Score Breakdown</SectionLabel>
                  <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 12 }}>
                    <RingGauge score={result.breakdown.keywordsMatch}  size={80} strokeW={7} label="Keywords" />
                    <RingGauge score={result.breakdown.formatScore}     size={80} strokeW={7} label="Format" />
                    <RingGauge score={result.breakdown.skillsRelevance} size={80} strokeW={7} label="Skills" />
                    <RingGauge score={result.breakdown.experienceMatch} size={80} strokeW={7} label="Experience" />
                  </div>
                </Panel>
                <Panel>
                  <SectionLabel>Overall Assessment</SectionLabel>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--student-text-secondary)', lineHeight: 1.8 }}>{result.summary}</p>
                </Panel>
                <Panel>
                  <SectionLabel>Missing Keywords</SectionLabel>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {result.missingKeywords.map((k, i) => <Pill key={i} text={k} color="#f85149" />)}
                  </div>
                </Panel>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <Panel>
                  <SectionLabel>Strengths</SectionLabel>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {result.strengths.map((s, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.18)', borderRadius: 8, padding: '9px 12px' }}>
                        <span style={{ color: 'var(--student-accent)', fontSize: 15, flexShrink: 0, marginTop: 1 }}>✓</span>
                        <span style={{ fontSize: 13, color: 'var(--student-text-secondary)', lineHeight: 1.5 }}>{s}</span>
                      </div>
                    ))}
                  </div>
                </Panel>
                <Panel>
                  <SectionLabel>Areas to Improve</SectionLabel>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {result.improvements.map((s, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'rgba(248,81,73,0.06)', border: '1px solid rgba(248,81,73,0.18)', borderRadius: 8, padding: '9px 12px' }}>
                        <span style={{ color: '#f85149', fontSize: 14, flexShrink: 0, marginTop: 1 }}>⚠</span>
                        <span style={{ fontSize: 13, color: 'var(--student-text-secondary)', lineHeight: 1.5 }}>{s}</span>
                      </div>
                    ))}
                  </div>
                </Panel>
                <Panel>
                  <SectionLabel>Suggested Keywords to Add</SectionLabel>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {result.suggestedKeywords.map((k, i) => <Pill key={i} text={k} color="var(--student-accent)" />)}
                  </div>
                </Panel>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
