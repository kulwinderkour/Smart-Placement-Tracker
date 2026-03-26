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

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${import.meta.env.GEMINI_API_KEY}`

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
    <div style={{ background: '#0f1117', minHeight: '100vh', color: '#e6edf3', padding: '28px 28px 48px' }}>
      <style>{`
        .ra-drop:hover { border-color: #00e5a0 !important; background: #00e5a018 !important; }
        .ra-drop.dragging { border-color: #00e5a0 !important; background: #00e5a018 !important; }
        .ra-textarea:focus { border-color: #00e5a0 !important; outline: none; }
        .ra-results { opacity: 0; transform: translateY(8px); transition: opacity 0.4s ease, transform 0.4s ease; }
        .ra-results.visible { opacity: 1; transform: translateY(0); }
      `}</style>

      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#00e5a018', color: '#00e5a0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
            📄
          </div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#e6edf3' }}>Resume Analyser</h1>
        </div>
        <p style={{ margin: '0 0 0 48px', fontSize: 13, color: '#7d8590' }}>
          Upload your PDF resume and get a detailed ATS compatibility report powered by Gemini AI.
        </p>
      </div>

      {/* ── Two-column layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: result ? '1fr 1fr' : '1fr', gap: 20, alignItems: 'start', maxWidth: result ? '100%' : 560 }}>

        {/* ══ LEFT PANEL ══ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Drop zone */}
          <Panel>
            <SectionLabel>Resume (PDF)</SectionLabel>
            <div
              className={`ra-drop${isDragging ? ' dragging' : ''}`}
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed #30363d', borderRadius: 10,
                padding: '28px 20px', textAlign: 'center', cursor: 'pointer',
                transition: 'all 0.15s ease', background: 'transparent',
              }}
            >
              <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={onInputChange} />
              {file ? (
                <>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#00e5a0', marginBottom: 4 }}>{file.name}</div>
                  <div style={{ fontSize: 11, color: '#484f58' }}>Click to change file</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📎</div>
                  <div style={{ fontSize: 13, color: '#7d8590', marginBottom: 4 }}>Drag & drop your PDF here</div>
                  <div style={{ fontSize: 11, color: '#484f58' }}>or click to browse</div>
                </>
              )}
            </div>
          </Panel>

          {/* Job description */}
          <Panel>
            <SectionLabel>Target Job Description (optional)</SectionLabel>
            <textarea
              className="ra-textarea"
              value={jobDescription}
              onChange={e => setJobDescription(e.target.value)}
              placeholder="Paste the job description you're applying for..."
              rows={5}
              style={{
                width: '100%', height: 120, padding: '10px 12px', resize: 'vertical',
                background: '#0f1117', border: '1px solid #30363d', borderRadius: 8,
                color: '#e6edf3', fontSize: 13, lineHeight: 1.6, boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
            />
          </Panel>

          {/* Error */}
          {error && (
            <div style={{ background: '#f8514910', border: '1px solid #f8514940', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#f85149' }}>
              {error}
            </div>
          )}

          {/* Analyze button */}
          <button
            onClick={handleAnalyze}
            disabled={isLoading}
            style={{
              width: '100%', padding: '13px', borderRadius: 10, border: 'none',
              background: isLoading ? '#484f58' : '#00e5a0',
              color: '#0f1117', fontSize: 14, fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'background 0.15s',
            }}
          >
            {isLoading ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0f1117" strokeWidth="2.5">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
                    <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
                  </path>
                </svg>
                Analyzing…
              </>
            ) : (
              <>✨ Analyze Resume</>
            )}
          </button>
          <p style={{ margin: 0, textAlign: 'center', fontSize: 11, color: '#484f58' }}>Powered by Gemini AI</p>
        </div>

        {/* ══ RIGHT PANEL — Results ══ */}
        {result && (
          <div className={`ra-results${visible ? ' visible' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* ATS Score ring */}
            <Panel>
              <SectionLabel>ATS Score</SectionLabel>
              <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px' }}>
                <RingGauge score={result.atsScore} size={150} strokeW={14} large />
              </div>
              <p style={{ margin: '10px 0 0', textAlign: 'center', fontSize: 12, color: '#7d8590' }}>
                {result.atsScore >= 70 ? 'Good ATS compatibility' : result.atsScore >= 50 ? 'Needs improvement' : 'Significant improvements needed'}
              </p>
            </Panel>

            {/* Breakdown */}
            <Panel>
              <SectionLabel>Score Breakdown</SectionLabel>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <RingGauge score={result.breakdown.keywordsMatch}   size={76} strokeW={7} label="Keywords" />
                <RingGauge score={result.breakdown.formatScore}      size={76} strokeW={7} label="Format" />
                <RingGauge score={result.breakdown.skillsRelevance}  size={76} strokeW={7} label="Skills" />
                <RingGauge score={result.breakdown.experienceMatch}  size={76} strokeW={7} label="Experience" />
              </div>
            </Panel>

            {/* Strengths */}
            <Panel>
              <SectionLabel>Strengths</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {result.strengths.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#00e5a010', border: '1px solid #00e5a030', borderRadius: 8, padding: '9px 12px' }}>
                    <span style={{ color: '#00e5a0', fontSize: 14, flexShrink: 0, marginTop: 1 }}>✓</span>
                    <span style={{ fontSize: 13, color: '#e6edf3', lineHeight: 1.5 }}>{s}</span>
                  </div>
                ))}
              </div>
            </Panel>

            {/* Improvements */}
            <Panel>
              <SectionLabel>Areas to Improve</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {result.improvements.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#f8514910', border: '1px solid #f8514930', borderRadius: 8, padding: '9px 12px' }}>
                    <span style={{ color: '#f85149', fontSize: 14, flexShrink: 0, marginTop: 1 }}>⚠</span>
                    <span style={{ fontSize: 13, color: '#e6edf3', lineHeight: 1.5 }}>{s}</span>
                  </div>
                ))}
              </div>
            </Panel>

            {/* Missing keywords */}
            <Panel>
              <SectionLabel>Missing Keywords</SectionLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {result.missingKeywords.map((k, i) => <Pill key={i} text={k} color="#f85149" />)}
              </div>
            </Panel>

            {/* Suggested keywords */}
            <Panel>
              <SectionLabel>Suggested Keywords to Add</SectionLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {result.suggestedKeywords.map((k, i) => <Pill key={i} text={k} color="#00e5a0" />)}
              </div>
            </Panel>

            {/* Summary */}
            <Panel>
              <SectionLabel>Overall Assessment</SectionLabel>
              <p style={{ margin: 0, fontSize: 13, color: '#e6edf3', lineHeight: 1.7 }}>{result.summary}</p>
            </Panel>

          </div>
        )}
      </div>
    </div>
  )
}
