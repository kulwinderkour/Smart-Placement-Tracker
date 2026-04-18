import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY}`

interface SetupState { role: string; companyType: string; persona: string; duration: number }
interface AnswerResult { question: string; answer: string; score: number; feedback: string; keyPoints: string[]; missing: string[] }
type Phase = 'loading' | 'question' | 'listening' | 'analyzing' | 'feedback' | 'complete'

const COMPANY_LABELS: Record<string, string> = { product: 'Product-based', service: 'Service-based', startup: 'Startup', faang: 'FAANG' }

/* ── Gemini helpers ── */
async function geminiCall(prompt: string): Promise<string> {
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 1024, temperature: 1, thinkingConfig: { thinkingBudget: 0 } },
    }),
  })
  if (!res.ok) throw new Error(`Gemini ${res.status}`)
  const d = await res.json()
  return d.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''
}

/* Forces Gemini to output valid JSON — no markdown, no preamble */
async function geminiJsonCall(prompt: string): Promise<string> {
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 1024, temperature: 1, thinkingConfig: { thinkingBudget: 0 }, responseMimeType: 'application/json' },
    }),
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Gemini ${res.status}: ${errText.slice(0, 200)}`)
  }
  const d = await res.json()
  return d.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''
}

function extractJson(raw: string): string {
  // Strip markdown code fences e.g. ```json ... ```
  const stripped = raw.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim()
  return stripped
}

async function generateQuestions(role: string, companyType: string, persona: string): Promise<string[]> {
  const comp = { product: 'product-based tech', service: 'service-based IT', startup: 'startup', faang: 'FAANG (Google/Meta/Amazon level)' }[companyType] || 'tech'
  const style = { 'friendly-hr': 'HR and culture-fit', 'strict-technical': 'deep technical', 'behavioral': 'behavioral (STAR method)', 'mixed': 'mixed technical and behavioral' }[persona] || 'general'
  const raw = await geminiJsonCall(
    `Generate exactly 6 ${style} interview questions for a ${role} role at a ${comp} company. Return a JSON array of 6 strings.`
  )
  try {
    const parsed = JSON.parse(extractJson(raw))
    if (Array.isArray(parsed)) return parsed as string[]
    // Gemini sometimes returns {"questions":[...]}
    const vals = Object.values(parsed)
    const arr = vals.find(v => Array.isArray(v)) as string[] | undefined
    if (arr) return arr
    throw new Error('No array found in response')
  } catch (e) {
    console.error('[generateQuestions] parse error, raw:', raw.slice(0, 400))
    throw new Error(`Could not parse questions: ${(e as Error).message}`)
  }
}

async function analyzeAnswer(question: string, answer: string, role: string): Promise<Omit<AnswerResult, 'question' | 'answer'>> {
  if (!answer.trim()) return { score: 0, feedback: 'No answer was provided.', keyPoints: [], missing: ['Provide a spoken answer before submitting'] }
  const raw = await geminiJsonCall(
    `You are an expert interviewer evaluating a candidate for a ${role} position.

Question: ${question}

Candidate answer: ${answer}

Score this answer from 0 to 100 based on correctness, depth, and relevance. Return a JSON object with these fields:
- score: integer 0-100
- feedback: string (2-3 sentences about strengths and weaknesses)
- keyPoints: array of strings (concepts the candidate covered well)
- missing: array of strings (important concepts the candidate missed)`
  )
  try {
    const parsed = JSON.parse(extractJson(raw))
    return {
      score:      typeof parsed.score === 'number' ? Math.round(parsed.score) : 50,
      feedback:   typeof parsed.feedback === 'string' ? parsed.feedback : 'Evaluation complete.',
      keyPoints:  Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
      missing:    Array.isArray(parsed.missing) ? parsed.missing : [],
    }
  } catch (e) {
    console.error('[analyzeAnswer] Parse error, raw:', raw.slice(0, 400))
    return { score: 50, feedback: 'Analysis encountered a technical issue. Your answer was recorded.', keyPoints: [], missing: [] }
  }
}

/* ── Score ring (SVG) — value comes from Gemini's 0-100 score ── */
function ScoreRing({ value, label }: { value: number; label: string }) {
  const r = 40, c = 2 * Math.PI * r
  const dash = (value / 100) * c
  const color = value >= 70 ? 'var(--student-accent)' : value >= 45 ? '#f0b429' : '#f85149'
  return (
    <svg width="100" height="100" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--student-border)" strokeWidth="7" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="7"
        strokeDasharray={`${dash} ${c - dash}`} strokeLinecap="round"
        transform="rotate(-90 50 50)" style={{ transition: 'stroke-dasharray 0.6s ease, stroke 0.3s' }} />
      <text x="50" y="46" textAnchor="middle" dominantBaseline="middle" fill={color} fontSize="16" fontWeight="700">{value}%</text>
      <text x="50" y="62" textAnchor="middle" fill="var(--student-text-muted)" fontSize="9">{label}</text>
    </svg>
  )
}

export default function MockInterviewRoom() {
  const location = useLocation()
  const navigate = useNavigate()
  const setup = (location.state as SetupState) || { role: 'Software Engineer', companyType: 'product', persona: 'mixed', duration: 30 }

  const [questions, setQuestions]     = useState<string[]>([])
  const [currentIdx, setCurrentIdx]   = useState(0)
  const [caption, setCaption]         = useState('')     // live speech transcript
  const [phase, setPhase]             = useState<Phase>('loading')
  const [results, setResults]         = useState<AnswerResult[]>([])
  const [currentResult, setCurrentResult] = useState<Omit<AnswerResult, 'question' | 'answer'> | null>(null)
  const [timeLeft, setTimeLeft]       = useState(setup.duration * 60)
  const [webcamOn, setWebcamOn]       = useState(false)
  const [loadErr, setLoadErr]         = useState('')

  const videoRef       = useRef<HTMLVideoElement>(null)
  const streamRef      = useRef<MediaStream | null>(null)
  const recognitionRef = useRef<any>(null)

  /* ── Timer (single setInterval, no others) ── */
  useEffect(() => {
    const id = setInterval(() => setTimeLeft(t => {
      if (t <= 1) { clearInterval(id); setPhase('complete'); return 0 }
      return t - 1
    }), 1000)
    return () => clearInterval(id)
  }, [])

  /* ── Generate questions once on mount ── */
  useEffect(() => {
    generateQuestions(setup.role, setup.companyType, setup.persona)
      .then(qs => { setQuestions(qs); setPhase('question') })
      .catch(e => setLoadErr(e.message))
  }, [])

  /* ── Cleanup on unmount ── */
  useEffect(() => () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    recognitionRef.current?.stop()
  }, [])

  /* ── Webcam: getUserMedia for local preview only, nothing streamed ── */
  async function startWebcam() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      if (videoRef.current) videoRef.current.srcObject = s
      streamRef.current = s; setWebcamOn(true)
    } catch { console.warn('Webcam unavailable') }
  }
  function stopWebcam() {
    streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null; setWebcamOn(false)
  }

  /* ── Mic: Web Speech API — browser converts audio to text locally, no server ── */
  function startListening() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { alert('Speech recognition not supported. Use Chrome or Edge.'); return }
    const rec = new SR()
    rec.lang = 'en-US'; rec.continuous = true; rec.interimResults = true
    recognitionRef.current = rec
    rec.onresult = (e: any) => {
      const t = Array.from(e.results).map((r: any) => r[0].transcript).join(' ')
      setCaption(t)
    }
    rec.onerror = () => { setPhase('question') }
    rec.start(); setPhase('listening')
  }
  function stopListening() { recognitionRef.current?.stop(); setPhase('question') }

  /* ── Submit: stop mic, send question+answer to Gemini for scoring ── */
  async function submitAnswer() {
    recognitionRef.current?.stop()
    const ans = caption.trim()
    setPhase('analyzing')
    try {
      const res = await analyzeAnswer(questions[currentIdx], ans, setup.role)
      setCurrentResult(res)
      setResults(prev => [...prev, { question: questions[currentIdx], answer: ans, ...res }])
    } catch {
      setCurrentResult({ score: 0, feedback: 'Analysis failed. Please try again.', keyPoints: [], missing: [] })
      setResults(prev => [...prev, { question: questions[currentIdx], answer: ans, score: 0, feedback: 'Analysis failed.', keyPoints: [], missing: [] }])
    }
    setPhase('feedback')
  }

  /* ── Next question ── */
  function nextQuestion() {
    if (currentIdx + 1 >= questions.length) { setPhase('complete'); return }
    setCurrentIdx(i => i + 1); setCaption(''); setCurrentResult(null); setPhase('question')
  }

  function fmtTime(s: number) { return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}` }

  const timerRed = timeLeft < 120
  const avgScore = results.length ? Math.round(results.reduce((a, r) => a + r.score, 0) / results.length) : 0
  const q = questions[currentIdx] || ''

  /* ════════════════════ RENDER ════════════════════ */
  return (
    <div style={{ background: 'var(--student-bg)', height: '100vh', color: 'var(--student-text)', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'inherit' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap');
        .room-scroll::-webkit-scrollbar { width: 4px; }
        .room-scroll::-webkit-scrollbar-thumb { background: #21262d; border-radius: 4px; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .pulse-mic { animation: pulse-mic 1.2s ease-in-out infinite; }
        @keyframes pulse-mic { 0%,100% { box-shadow: 0 0 0 0 rgba(248,81,73,0.4); } 50% { box-shadow: 0 0 0 10px rgba(248,81,73,0); } }
        .tag-green { background: rgba(167,139,250,0.1); border: 1px solid rgba(167,139,250,0.25); color: var(--student-accent); border-radius: 20px; padding: 3px 10px; font-size: 11px; }
        .tag-red   { background: rgba(248,81,73,0.1);  border: 1px solid rgba(248,81,73,0.25);  color: #f85149; border-radius: 20px; padding: 3px 10px; font-size: 11px; }
        .tag-yellow{ background: rgba(240,180,41,0.1); border: 1px solid rgba(240,180,41,0.25); color: #f0b429; border-radius: 20px; padding: 3px 10px; font-size: 11px; }
        .end-btn { transition: background 0.15s !important; }
        .end-btn:hover { background: rgba(220,60,60,0.12) !important; }
        .cam-on-btn { transition: background 0.15s !important; }
        .cam-on-btn:hover { background: rgba(167,139,250,0.1) !important; }
      `}</style>

      {/* ── Top bar ── */}
      <div style={{ height: 56, borderBottom: '1px solid var(--student-surface)', background: 'var(--student-bg)', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12, flexShrink: 0 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--student-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>🎙</div>
        <span style={{ fontWeight: 600, fontSize: 14, color: '#E0E0E8' }}>Mock Interview</span>
        <div style={{ width: 1, height: 16, background: 'var(--student-border)' }} />
        <span style={{ fontSize: 12, color: 'var(--student-text)', fontWeight: 500 }}>{setup.role}</span>
        <span style={{ color: 'var(--student-border)', fontSize: 12 }}>→</span>
        <span style={{ fontSize: 12, color: 'var(--student-accent)', fontWeight: 500 }}>{COMPANY_LABELS[setup.companyType]}</span>
        {phase !== 'loading' && phase !== 'complete' && (
          <>
            <span style={{ color: 'var(--student-border)', fontSize: 12 }}>·</span>
            <span style={{ fontSize: 12, color: 'var(--student-border)' }}>Q {currentIdx + 1} / {questions.length}</span>
          </>
        )}
        <div style={{ flex: 1 }} />
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 500, letterSpacing: '2px',
          color: timerRed ? '#f85149' : 'var(--student-text)',
          background: timerRed ? 'rgba(248,81,73,0.1)' : 'var(--student-surface)',
          border: `1px solid ${timerRed ? 'rgba(248,81,73,0.4)' : 'var(--student-border)'}`,
          borderRadius: 8, padding: '6px 14px', transition: 'all 0.4s',
        }}>{fmtTime(timeLeft)}</div>
        <button className="end-btn" onClick={() => setPhase('complete')}
          style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(220,60,60,0.5)', background: 'transparent', color: '#E05555', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          End
        </button>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Left: main area ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

          {/* LOADING */}
          {phase === 'loading' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: 'radial-gradient(ellipse at center, #111116 0%, #0C0C0F 100%)' }}>
              {loadErr ? (
                <>
                  <div style={{ fontSize: 13, color: '#f85149' }}>⚠ {loadErr}</div>
                  <button onClick={() => window.location.reload()} style={{ padding: '8px 20px', borderRadius: 8, background: 'var(--student-surface)', border: '1px solid #30363d', color: 'var(--student-text)', cursor: 'pointer' }}>Retry</button>
                </>
              ) : (
                <>
                  <div className="spin" style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--student-surface)', borderTopColor: 'var(--student-accent)' }} />
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--student-border)' }}>Generating questions for <strong style={{ color: 'var(--student-text)', fontWeight: 700 }}>{setup.role}</strong>…</p>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--student-border)' }}>Gemini AI is tailoring questions based on your role and company type</p>
                </>
              )}
            </div>
          )}

          {/* QUESTION / LISTENING / ANALYZING / FEEDBACK */}
          {(phase === 'question' || phase === 'listening' || phase === 'analyzing' || phase === 'feedback') && (
            <div className="room-scroll" style={{ flex: 1, overflowY: 'auto', padding: '28px 32px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Question card */}
              <div style={{ background: 'var(--student-surface)', border: '1px solid #21262d', borderRadius: 16, padding: '28px 28px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--student-text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Question {currentIdx + 1} of {questions.length}</span>
                  <div style={{ flex: 1, height: 1, background: 'var(--student-border)' }} />
                </div>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 500, lineHeight: 1.6, color: 'var(--student-text)' }}>{q}</p>
              </div>

              {/* Caption area — live transcript or final answer */}
              <div style={{
                background: 'var(--student-bg)',
                border: `1px solid ${phase === 'listening' ? 'rgba(248,81,73,0.4)' : 'var(--student-border)'}`,
                borderRadius: 12, padding: '16px 20px', minHeight: 80, transition: 'border-color 0.3s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  {phase === 'listening' && (
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f85149', display: 'inline-block', animation: 'pulse-mic 1.2s infinite' }} />
                  )}
                  <span style={{ fontSize: 11, color: phase === 'listening' ? '#f85149' : 'var(--student-text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {phase === 'listening' ? 'Recording…' : caption ? 'Your Answer' : 'Your answer will appear here as you speak'}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 14, color: caption ? 'var(--student-text)' : 'var(--student-border)', lineHeight: 1.7, minHeight: 42 }}>
                  {caption || 'Click the microphone to start speaking…'}
                </p>
              </div>

              {/* Controls */}
              {phase !== 'analyzing' && phase !== 'feedback' && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  {phase === 'question' && (
                    <button onClick={startListening}
                      style={{
                        flex: 1, padding: '13px', borderRadius: 12, border: '1px solid rgba(167,139,250,0.3)',
                        background: 'rgba(167,139,250,0.08)', color: 'var(--student-accent)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      }}>
                      🎤 &nbsp;Start Speaking
                    </button>
                  )}
                  {phase === 'listening' && (
                    <>
                      <button onClick={stopListening}
                        style={{ padding: '12px 20px', borderRadius: 12, border: '1px solid #30363d', background: 'var(--student-surface)', color: 'var(--student-text)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        ⏸ Pause
                      </button>
                      <button onClick={submitAnswer} disabled={!caption.trim()}
                        style={{
                          flex: 1, padding: '13px', borderRadius: 12, border: 'none',
                          background: caption.trim() ? 'linear-gradient(135deg,var(--student-accent),var(--student-accent-hover))' : 'var(--student-border)',
                          color: caption.trim() ? 'var(--student-bg)' : 'var(--student-text-dim)',
                          fontSize: 14, fontWeight: 700, cursor: caption.trim() ? 'pointer' : 'not-allowed',
                        }}>
                        Submit Answer →
                      </button>
                    </>
                  )}
                  {phase === 'question' && caption && (
                    <button onClick={submitAnswer}
                      style={{ flex: 1, padding: '13px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,var(--student-accent),var(--student-accent-hover))', color: 'var(--student-bg)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                      Submit Answer →
                    </button>
                  )}
                </div>
              )}

              {/* Analyzing spinner */}
              {phase === 'analyzing' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', background: 'var(--student-surface)', border: '1px solid #21262d', borderRadius: 12 }}>
                  <div className="spin" style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #21262d', borderTopColor: 'var(--student-accent)', flexShrink: 0 }} />
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--student-text)' }}>Analyzing your answer…</p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--student-text-muted)' }}>Gemini is comparing your response against expected key concepts for {setup.role}</p>
                  </div>
                </div>
              )}

              {/* Feedback card */}
              {phase === 'feedback' && currentResult && (
                <div style={{ background: 'var(--student-surface)', border: '1px solid #21262d', borderRadius: 14, padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <ScoreRing value={currentResult.score}
                      label={currentResult.score >= 70 ? 'Strong' : currentResult.score >= 45 ? 'Decent' : 'Needs Work'} />
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 600, color: 'var(--student-text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>AI Feedback</p>
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--student-text)', lineHeight: 1.65 }}>{currentResult.feedback}</p>
                    </div>
                  </div>

                  {/* How the score works — transparent explanation */}
                  <div style={{ background: 'var(--student-bg)', borderRadius: 10, padding: '12px 14px', border: '1px solid #21262d' }}>
                    <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 600, color: 'var(--student-text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>How this score is calculated</p>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--student-text-muted)', lineHeight: 1.6 }}>
                      Gemini evaluates your spoken answer against the expected concepts for a <strong style={{ color: 'var(--student-text)' }}>{setup.role}</strong> role — checking correctness, depth, and relevance. The score is 0–100 based on that semantic match, not word count.
                    </p>
                  </div>

                  {currentResult.keyPoints.length > 0 && (
                    <div>
                      <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: 'var(--student-accent)' }}>✓ Points you covered well</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {currentResult.keyPoints.map((k, i) => <span key={i} className="tag-green">{k}</span>)}
                      </div>
                    </div>
                  )}

                  {currentResult.missing.length > 0 && (
                    <div>
                      <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: '#f85149' }}>✗ Key points you missed</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {currentResult.missing.map((m, i) => <span key={i} className="tag-red">{m}</span>)}
                      </div>
                    </div>
                  )}

                  <button onClick={nextQuestion}
                    style={{ padding: '12px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,var(--student-accent),var(--student-accent-hover))', color: 'var(--student-bg)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                    {currentIdx + 1 >= questions.length ? '🏁  View Final Results' : `Next Question → (${currentIdx + 2}/${questions.length})`}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* COMPLETE */}
          {phase === 'complete' && (
            <div className="room-scroll" style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
              <div style={{ maxWidth: 640, margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                  <div style={{ fontSize: 44, marginBottom: 12 }}>🏁</div>
                  <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700 }}>Interview Complete</h2>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--student-text-muted)' }}>{setup.role} · {COMPANY_LABELS[setup.companyType]} · {results.length} questions answered</p>
                </div>

                {/* Overall score */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                  <ScoreRing value={avgScore} label="Overall Score" />
                </div>

                {/* Per-question breakdown */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
                  {results.map((r, i) => (
                    <div key={i} style={{ background: 'var(--student-surface)', border: '1px solid #21262d', borderRadius: 12, padding: '16px 20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--student-text)', flex: 1 }}>Q{i + 1}: {r.question}</p>
                        <span className={r.score >= 70 ? 'tag-green' : r.score >= 45 ? 'tag-yellow' : 'tag-red'}>{r.score}%</span>
                      </div>
                      {r.answer && <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--student-text-muted)', fontStyle: 'italic' }}>"{r.answer.slice(0, 120)}{r.answer.length > 120 ? '…' : ''}"</p>}
                      <p style={{ margin: 0, fontSize: 12, color: 'var(--student-text-muted)' }}>{r.feedback}</p>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => navigate('/mock-interview')}
                    style={{ flex: 1, padding: '13px', borderRadius: 12, border: '1px solid #30363d', background: 'transparent', color: 'var(--student-text)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    New Interview
                  </button>
                  <button onClick={() => navigate('/dashboard')}
                    style={{ flex: 1, padding: '13px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,var(--student-accent),var(--student-accent-hover))', color: 'var(--student-bg)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    Dashboard
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Right panel: webcam ── */}
        <div style={{ width: 260, borderLeft: '1px solid var(--student-surface)', background: 'var(--student-bg)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '22px 16px 14px', borderBottom: '1px solid var(--student-surface)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 500, color: 'var(--student-border)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Camera</span>
              <button onClick={webcamOn ? stopWebcam : startWebcam} className={webcamOn ? '' : 'cam-on-btn'}
                style={{
                  fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 8, cursor: 'pointer',
                  border: `1px solid ${webcamOn ? 'rgba(220,60,60,0.5)' : 'var(--student-accent)'}`,
                  background: webcamOn ? 'rgba(220,60,60,0.08)' : 'transparent',
                  color: webcamOn ? '#E05555' : 'var(--student-accent)',
                }}>
                {webcamOn ? 'Turn Off' : 'Turn On'}
              </button>
            </div>
            <div style={{ width: '100%', aspectRatio: '4/3', borderRadius: 12, background: '#0F0F13', border: '1px solid var(--student-surface)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: webcamOn ? 'block' : 'none' }} />
              {!webcamOn && (
                <div style={{ textAlign: 'center' }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--student-border)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', margin: '0 auto 6px' }}>
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                  <div style={{ fontSize: 10, color: 'var(--student-border)' }}>Camera off</div>
                </div>
              )}
            </div>
          </div>

          {/* Score history */}
          <div style={{ padding: '22px 16px 14px', flex: 1, overflowY: 'auto' }}>
            <p style={{ margin: '0 0 12px', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 500, color: 'var(--student-border)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Score History</p>
            {results.length === 0
              ? (
                <div style={{ textAlign: 'center', paddingTop: 12 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--student-border)" strokeWidth="1.5" style={{ display: 'block', margin: '0 auto 8px' }}>
                    <circle cx="12" cy="12" r="8"/>
                  </svg>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--student-border)' }}>No answers yet</p>
                </div>
              )
              : results.map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, padding: '6px 10px', background: 'var(--student-bg)', borderRadius: 8, border: '1px solid #21262d' }}>
                  <span style={{ fontSize: 12, color: 'var(--student-text-muted)' }}>Q{i + 1}</span>
                  <span className={r.score >= 70 ? 'tag-green' : r.score >= 45 ? 'tag-yellow' : 'tag-red'} style={{ fontSize: 11, padding: '2px 8px' }}>{r.score}%</span>
                </div>
              ))
            }
            {results.length > 0 && (
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #21262d', display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--student-text-dim)' }}>Average</span>
                <span style={{ color: 'var(--student-text)', fontWeight: 700 }}>{avgScore}%</span>
              </div>
            )}
          </div>

          {/* How analysis works — always visible */}
          <div style={{ padding: '20px 16px 16px', borderTop: '1px solid var(--student-surface)' }}>
            <p style={{ margin: '0 0 10px', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 500, color: 'var(--student-border)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>How it works</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {[
                { dot: 'var(--student-accent)', label: 'Voice',     value: "Browser's Speech API" },
                { dot: '#A0A0FF', label: 'Score',     value: 'Gemini semantic match' },
                { dot: '#E0A050', label: 'Camera',    value: 'Local preview only' },
                { dot: '#6090E0', label: 'No WebRTC', value: 'All local + Gemini API' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: item.dot, flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ fontSize: 10, color: '#9090A8' }}>{item.label}:</span>
                  <span style={{ fontSize: 10, color: '#C0C0C8' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
