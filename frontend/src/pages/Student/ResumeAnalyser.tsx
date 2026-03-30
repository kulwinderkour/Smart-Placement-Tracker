import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

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

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${import.meta.env.GEMINI_API_KEY}`

function scoreColor(n: number) {
  return n >= 70 ? '#00e5a0' : n >= 50 ? '#f0b429' : '#f85149'
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
            fill="none" stroke="#21262d" strokeWidth={strokeW} />
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
          {large && <span style={{ fontSize: 11, color: '#7d8590', marginTop: 2 }}>/ 100</span>}
        </div>
      </div>
      {label && (
        <span style={{ fontSize: 11, color: '#7d8590', textAlign: 'center', maxWidth: size }}>{label}</span>
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
    <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 600, color: '#484f58', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
      {children}
    </p>
  )
}

// ── Card shell ────────────────────────────────────────────────────────────────
function Panel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: '#161b22', border: '1px solid #21262d',
      borderRadius: 12, padding: '20px 22px', ...style,
    }}>
      {children}
    </div>
  )
}

export default function ResumeAnalyser() {
  const navigate = useNavigate()
  const [file, setFile]               = useState<File | null>(null)
  const [base64, setBase64]           = useState<string>('')
  const [jobDescription, setJobDescription] = useState('')
  const [isLoading, setIsLoading]     = useState(false)
  const [result, setResult]           = useState<AnalysisResult | null>(null)
  const [error, setError]             = useState<string>('')
  const [isDragging, setIsDragging]   = useState(false)
  const [visible, setVisible]         = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const readFileAsBase64 = (f: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const raw = reader.result as string
        resolve(raw.replace(/^data:.+;base64,/, ''))
      }
      reader.onerror = reject
      reader.readAsDataURL(f)
    })

  const handleFile = useCallback(async (f: File) => {
    if (!f.name.endsWith('.pdf')) { setError('Only PDF files are supported.'); return }
    setFile(f)
    setError('')
    const b64 = await readFileAsBase64(f)
    setBase64(b64)
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  const handleAnalyze = async () => {
    if (!file || !base64) { setError('Please upload your resume first'); return }
    setIsLoading(true); setError(''); setResult(null); setVisible(false)

    const promptText = `You are an expert ATS (Applicant Tracking System) and resume analyzer.
Analyze this resume ${jobDescription ? 'for this job description: ' + jobDescription : 'for general ATS compatibility'}.

Respond ONLY with a valid JSON object, no markdown, no backticks, no explanation.
Use exactly this structure:
{
  "atsScore": 78,
  "breakdown": {
    "keywordsMatch": 80,
    "formatScore": 75,
    "skillsRelevance": 82,
    "experienceMatch": 70
  },
  "strengths": ["string1", "string2", "string3"],
  "improvements": ["string1", "string2", "string3"],
  "missingKeywords": ["keyword1", "keyword2", "keyword3"],
  "suggestedKeywords": ["keyword1", "keyword2", "keyword3"],
  "summary": "2-3 sentence overall assessment"
}`

    try {
      const response = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: 'application/pdf', data: base64 } },
              { text: promptText }
            ]
          }]
        })
      })

      const data = await response.json()

      if (!response.ok) {
        const apiMsg = data?.error?.message || `HTTP ${response.status}`
        throw new Error(`Gemini API error: ${apiMsg}`)
      }

      if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        const reason = data.candidates?.[0]?.finishReason || data.promptFeedback?.blockReason || 'No response text'
        throw new Error(`Gemini returned no text: ${reason}`)
      }

      const raw = data.candidates[0].content.parts[0].text
      let cleaned = raw.replace(/```json|```/g, '').trim()
      let parsed: AnalysisResult
      try {
        parsed = JSON.parse(cleaned)
      } catch {
        const match = cleaned.match(/\{[\s\S]*\}/)
        if (!match) throw new Error('Could not parse JSON from response')
        parsed = JSON.parse(match[0])
      }
      setResult(parsed)
      setTimeout(() => setVisible(true), 50)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ background: '#0f1117', minHeight: '100vh', color: '#e6edf3', position: 'relative' }}>
      <button 
        onClick={() => navigate('/dashboard')}
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(33, 38, 45, 0.5)',
          border: '1px solid #30363d',
          borderRadius: '8px',
          padding: '8px 14px',
          color: '#8b949e',
          fontSize: '13px',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.2s',
          zIndex: 30,
          backdropFilter: 'blur(8px)'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = '#30363d';
          e.currentTarget.style.color = '#e6edf3';
          e.currentTarget.style.borderColor = '#484f58';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = 'rgba(33, 38, 45, 0.5)';
          e.currentTarget.style.color = '#8b949e';
          e.currentTarget.style.borderColor = '#30363d';
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Back to Dashboard
      </button>
      <style>{`
        .ra-page { padding: 32px 16px 60px; }
        .ra-drop { border: 2px dashed #2d3748; border-radius: 14px; padding: 36px 20px; text-align: center; cursor: pointer; transition: all 0.2s ease; background: transparent; }
        .ra-drop:hover, .ra-drop.dragging { border-color: #00e5a0; background: rgba(0,229,160,0.06); box-shadow: 0 0 20px rgba(0,229,160,0.1); }
        .ra-textarea { width: 100%; padding: 12px 14px; resize: vertical; background: rgba(255,255,255,0.04); border: 1px solid #2d3748; border-radius: 10px; color: #e6edf3; font-size: 13px; line-height: 1.6; box-sizing: border-box; transition: border-color 0.2s, box-shadow 0.2s; font-family: inherit; }
        .ra-textarea:focus { border-color: #00e5a0; box-shadow: 0 0 0 3px rgba(0,229,160,0.12); outline: none; }
        .ra-textarea::placeholder { color: #4a5568; }
        .ra-btn { width: 100%; padding: 14px; border-radius: 12px; border: none; font-size: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s; letter-spacing: 0.02em; }
        .ra-btn:not(:disabled):hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(0,229,160,0.3); }
        .ra-btn:disabled { cursor: not-allowed; }
        .ra-results { opacity: 0; transform: translateY(12px); transition: opacity 0.5s ease, transform 0.5s ease; }
        .ra-results.visible { opacity: 1; transform: translateY(0); }
        .ra-glass { background: rgba(22,27,34,0.8); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.07); border-radius: 20px; }
        @media (max-width: 768px) {
          .ra-two-col { grid-template-columns: 1fr !important; }
          .ra-page { padding: 20px 12px 48px; }
        }
      `}</style>

      {/* ── Upload section — vertically centered when no results ── */}
      {!result ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 60px)', padding: '32px 16px' }}>
          <div className="ra-glass" style={{ width: '100%', maxWidth: 680, padding: '40px 40px 32px' }}>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(0,229,160,0.12)', border: '1px solid rgba(0,229,160,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 16px' }}>
                📄
              </div>
              <h1 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 700, color: '#e6edf3', letterSpacing: '-0.02em' }}>Resume Analyser</h1>
              <p style={{ margin: 0, fontSize: 14, color: '#7d8590', lineHeight: 1.6 }}>
                Upload your PDF resume and get a detailed ATS compatibility<br />report powered by Gemini AI.
              </p>
            </div>

            {/* Drop zone */}
            <div
              className={`ra-drop${isDragging ? ' dragging' : ''}`}
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={onInputChange} />
              {file ? (
                <>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>✅</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#00e5a0', marginBottom: 4 }}>{file.name}</div>
                  <div style={{ fontSize: 12, color: '#4a5568' }}>Click to change file</div>
                </>
              ) : (
                <>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#4a5568" strokeWidth="1.5" style={{ marginBottom: 12 }}>
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M12 12v6M9 15l3-3 3 3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <div style={{ fontSize: 14, color: '#7d8590', marginBottom: 4, fontWeight: 500 }}>Drag & drop your PDF here</div>
                  <div style={{ fontSize: 12, color: '#4a5568' }}>or <span style={{ color: '#00e5a0', textDecoration: 'underline' }}>click to browse</span></div>
                </>
              )}
            </div>

            {/* Job description */}
            <div style={{ marginTop: 20 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                Target Job Description (optional)
              </label>
              <textarea
                className="ra-textarea"
                value={jobDescription}
                onChange={e => setJobDescription(e.target.value)}
                placeholder="Paste the job description you're applying for..."
                rows={4}
              />
            </div>

            {/* Error */}
            {error && (
              <div style={{ marginTop: 14, background: 'rgba(248,81,73,0.08)', border: '1px solid rgba(248,81,73,0.25)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#f85149' }}>
                {error}
              </div>
            )}

            {/* Button */}
            <button
              className="ra-btn"
              onClick={handleAnalyze}
              disabled={isLoading}
              style={{ marginTop: 20, background: isLoading ? '#2d3748' : 'linear-gradient(135deg, #00e5a0, #00c8c8)', color: '#0a0f1a' }}
            >
              {isLoading ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e6edf3" strokeWidth="2.5">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
                      <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
                    </path>
                  </svg>
                  <span style={{ color: '#e6edf3' }}>Analyzing your resume…</span>
                </>
              ) : (
                <>✨ Analyze Resume</>
              )}
            </button>

            <p style={{ margin: '14px 0 0', textAlign: 'center', fontSize: 11, color: '#2d3748' }}>
              Powered by Gemini AI · Your resume is never stored
            </p>
          </div>
        </div>
      ) : (
        /* ── Results view — two column ── */
        <div className="ra-page">
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>

            {/* Top bar with score + re-analyze */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
              <div>
                <h1 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700, color: '#e6edf3' }}>Analysis Complete</h1>
                <p style={{ margin: 0, fontSize: 13, color: '#7d8590' }}>{file?.name}</p>
              </div>
              <button
                onClick={() => { setResult(null); setVisible(false); setFile(null); setBase64(''); setError(''); }}
                style={{ padding: '9px 18px', borderRadius: 10, border: '1px solid #2d3748', background: 'transparent', color: '#e6edf3', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
              >
                ← Analyze Another
              </button>
            </div>

            <div className={`ra-results ra-two-col${visible ? ' visible' : ''}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, alignItems: 'start' }}>

              {/* LEFT col */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                {/* ATS Score */}
                <Panel>
                  <SectionLabel>ATS Score</SectionLabel>
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
                    <RingGauge score={result.atsScore} size={160} strokeW={14} large />
                  </div>
                  <p style={{ margin: '10px 0 0', textAlign: 'center', fontSize: 12, color: '#7d8590' }}>
                    {result.atsScore >= 70 ? '✅ Good ATS compatibility' : result.atsScore >= 50 ? '⚠️ Needs improvement' : '❌ Significant improvements needed'}
                  </p>
                </Panel>

                {/* Breakdown */}
                <Panel>
                  <SectionLabel>Score Breakdown</SectionLabel>
                  <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 12 }}>
                    <RingGauge score={result.breakdown.keywordsMatch}  size={80} strokeW={7} label="Keywords" />
                    <RingGauge score={result.breakdown.formatScore}     size={80} strokeW={7} label="Format" />
                    <RingGauge score={result.breakdown.skillsRelevance} size={80} strokeW={7} label="Skills" />
                    <RingGauge score={result.breakdown.experienceMatch} size={80} strokeW={7} label="Experience" />
                  </div>
                </Panel>

                {/* Summary */}
                <Panel>
                  <SectionLabel>Overall Assessment</SectionLabel>
                  <p style={{ margin: 0, fontSize: 13, color: '#c9d1d9', lineHeight: 1.8 }}>{result.summary}</p>
                </Panel>

                {/* Missing keywords */}
                <Panel>
                  <SectionLabel>Missing Keywords</SectionLabel>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {result.missingKeywords.map((k, i) => <Pill key={i} text={k} color="#f85149" />)}
                  </div>
                </Panel>
              </div>

              {/* RIGHT col */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                {/* Strengths */}
                <Panel>
                  <SectionLabel>Strengths</SectionLabel>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {result.strengths.map((s, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'rgba(0,229,160,0.06)', border: '1px solid rgba(0,229,160,0.18)', borderRadius: 8, padding: '9px 12px' }}>
                        <span style={{ color: '#00e5a0', fontSize: 15, flexShrink: 0, marginTop: 1 }}>✓</span>
                        <span style={{ fontSize: 13, color: '#c9d1d9', lineHeight: 1.5 }}>{s}</span>
                      </div>
                    ))}
                  </div>
                </Panel>

                {/* Improvements */}
                <Panel>
                  <SectionLabel>Areas to Improve</SectionLabel>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {result.improvements.map((s, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'rgba(248,81,73,0.06)', border: '1px solid rgba(248,81,73,0.18)', borderRadius: 8, padding: '9px 12px' }}>
                        <span style={{ color: '#f85149', fontSize: 14, flexShrink: 0, marginTop: 1 }}>⚠</span>
                        <span style={{ fontSize: 13, color: '#c9d1d9', lineHeight: 1.5 }}>{s}</span>
                      </div>
                    ))}
                  </div>
                </Panel>

                {/* Suggested keywords */}
                <Panel>
                  <SectionLabel>Suggested Keywords to Add</SectionLabel>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {result.suggestedKeywords.map((k, i) => <Pill key={i} text={k} color="#00e5a0" />)}
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
