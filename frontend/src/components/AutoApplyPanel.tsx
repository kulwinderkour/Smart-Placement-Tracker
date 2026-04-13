import { useEffect, useRef, useState } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface JobResult {
  job_id: string
  application_id?: string
  title?: string
  company?: string
  match_score?: number
  result?: string
  reason?: string
  description?: string
}

type MessageRole = 'student' | 'agent' | 'thinking' | 'summary' | 'applied' | 'skipped' | 'error'

interface Message {
  id: string
  role: MessageRole
  text: string
  job?: JobResult
  totalApplied?: number
  totalSkipped?: number
}

interface AutoApplyPanelProps {
  isOpen: boolean
  onClose: () => void
  adminJobs: any[]
  defaultInstruction?: string
}

// ── AI engine URL ─────────────────────────────────────────────────────────────
const AI_BASE =
  (import.meta as any).env?.VITE_AI_URL || 'http://localhost:8002'

const PROGRESS_MESSAGES = [
  'Fetching jobs posted by admin...',
  'Scoring your profile against job requirements...',
  'Checking eligibility for matching jobs...',
  'Generating personalized descriptions...',
  'Submitting applications...',
  'Almost done — finalizing results...'
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

function parseResumeUrl(profile: any): string {
  return (
    profile?.resumeUrl ||
    profile?.resume_url ||
    profile?.resumeName ||
    profile?.resume_name ||
    ''
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ThinkingDots({ thinkingText }: { thinkingText: string }) {
  return (
    <div style={{ padding: '4px 0', minWidth: '220px' }}>
      <style>{`
        @keyframes progressBar {
          from { width: 0% }
          to { width: 100% }
        }
      `}</style>
      <div style={{
        height: '2px',
        background: '#21262d',
        borderRadius: '1px',
        overflow: 'hidden'
      }}>
        <div style={{
          height: '2px',
          background: '#20c997',
          borderRadius: '1px',
          animation: 'progressBar 90s linear forwards'
        }} />
      </div>
      <p style={{ color: '#7d8590', fontSize: '11px', marginTop: '6px', marginBottom: 0 }}>
        {thinkingText}
      </p>
    </div>
  )
}

function CollapsibleDescription({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ marginTop: 8 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#20c997', fontSize: 12, fontWeight: 500,
          padding: 0, display: 'flex', alignItems: 'center', gap: 4,
        }}
      >
        <span
          style={{
            display: 'inline-block',
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.18s',
            fontSize: 10,
          }}
        >
          ▶
        </span>
        {open ? 'Hide cover letter' : 'View cover letter'}
      </button>
      {open && (
        <div
          style={{
            marginTop: 8,
            padding: '10px 12px',
            background: 'rgba(32,201,151,0.06)',
            border: '1px solid rgba(32,201,151,0.18)',
            borderRadius: 8,
            fontSize: 12,
            color: '#c9d1d9',
            lineHeight: 1.65,
            whiteSpace: 'pre-wrap',
          }}
        >
          {text}
        </div>
      )}
    </div>
  )
}

function AppliedCard({ job }: { job: JobResult }) {
  const scoreColor =
    (job.match_score ?? 0) >= 70 ? '#3fb950'
    : (job.match_score ?? 0) >= 40 ? '#d29922'
    : '#f85149'

  return (
    <div
      style={{
        background: 'rgba(63,185,80,0.08)',
        border: '1px solid rgba(63,185,80,0.22)',
        borderRadius: 10,
        padding: '12px 14px',
        marginTop: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>✅</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, color: '#e0e0e0', fontSize: 13, fontWeight: 600 }}>
            {job.title ?? 'Unknown role'}
          </p>
          <p style={{ margin: '2px 0 0', color: '#888888', fontSize: 12 }}>
            {job.company ?? ''}
            {job.match_score !== undefined && (
              <span style={{ color: scoreColor, marginLeft: 8, fontWeight: 600 }}>
                {job.match_score}% match
              </span>
            )}
          </p>
          {job.result && (
            <p style={{ margin: '6px 0 0', color: '#3fb950', fontSize: 12, lineHeight: 1.5 }}>
              {job.result}
              {job.application_id ? (
                <span style={{ display: 'block', marginTop: 4, color: '#7d8590', fontSize: 11 }}>
                  Reference ID: {job.application_id}
                </span>
              ) : null}
            </p>
          )}
          {job.description && (
            <CollapsibleDescription text={job.description} />
          )}
        </div>
      </div>
    </div>
  )
}

function SkippedCard({ job }: { job: JobResult }) {
  return (
    <div
      style={{
        background: 'rgba(248,81,73,0.07)',
        border: '1px solid rgba(248,81,73,0.2)',
        borderRadius: 10,
        padding: '10px 14px',
        marginTop: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>❌</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, color: '#e0e0e0', fontSize: 13, fontWeight: 600 }}>
            {job.title ?? 'Unknown role'}
          </p>
          <p style={{ margin: '2px 0 0', color: '#888888', fontSize: 12 }}>
            {job.company && <span>{job.company} · </span>}
            <span style={{ color: '#f85149' }}>{job.reason ?? 'Skipped'}</span>
          </p>
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ applied, skipped }: { applied: number; skipped: number }) {
  return (
    <div
      style={{
        background: '#1c1c1c',
        border: '1px solid #2d2d2d',
        borderRadius: 12,
        padding: '16px 18px',
        marginTop: 8,
      }}
    >
      <p style={{ margin: '0 0 10px', color: '#e0e0e0', fontWeight: 700, fontSize: 14 }}>
        🏁 Run complete
      </p>
      <div
        style={{
          background: 'rgba(63,185,80,0.1)',
          border: '1px solid rgba(63,185,80,0.25)',
          borderRadius: 8,
          padding: '12px 14px',
          textAlign: 'center',
        }}
      >
        <p style={{ margin: 0, color: '#3fb950', fontSize: 22, fontWeight: 700 }}>{applied}</p>
        <p style={{ margin: '4px 0 0', color: '#888888', fontSize: 11, fontWeight: 500 }}>
          Application(s) submitted — visible to admins
        </p>
      </div>
      {skipped > 0 && (
        <p style={{ margin: '10px 0 0', color: '#6e7681', fontSize: 11, lineHeight: 1.45 }}>
          {skipped} other listing{skipped === 1 ? '' : 's'} did not meet your criteria (not shown).
        </p>
      )}
    </div>
  )
}

function MessageBubble({ msg, thinkingText }: { msg: Message, thinkingText?: string }) {
  if (msg.role === 'student') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <div
          style={{
            maxWidth: '78%',
            background: 'rgba(32,201,151,0.14)',
            border: '1px solid rgba(32,201,151,0.28)',
            borderRadius: '14px 14px 4px 14px',
            padding: '9px 13px',
            color: '#e0e0e0',
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          {msg.text}
        </div>
      </div>
    )
  }

  if (msg.role === 'thinking') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 10 }}>
        <div
          style={{
            background: '#1c1c1c',
            border: '1px solid #2d2d2d',
            borderRadius: '14px 14px 14px 4px',
            padding: '9px 13px',
          }}
        >
          <ThinkingDots thinkingText={thinkingText || ''} />
        </div>
      </div>
    )
  }

  if (msg.role === 'applied' && msg.job) {
    return (
      <div style={{ marginBottom: 8 }}>
        <AppliedCard job={msg.job} />
      </div>
    )
  }

  if (msg.role === 'skipped' && msg.job) {
    return (
      <div style={{ marginBottom: 8 }}>
        <SkippedCard job={msg.job} />
      </div>
    )
  }

  if (msg.role === 'summary') {
    return (
      <div style={{ marginBottom: 10 }}>
        <SummaryCard
          applied={msg.totalApplied ?? 0}
          skipped={msg.totalSkipped ?? 0}
        />
      </div>
    )
  }

  if (msg.role === 'error') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 10 }}>
        <div
          style={{
            maxWidth: '88%',
            background: 'rgba(248,81,73,0.07)',
            border: '1px solid rgba(248,81,73,0.28)',
            borderRadius: '14px 14px 14px 4px',
            padding: '9px 13px',
            color: '#f85149',
            fontSize: 13,
            lineHeight: 1.55,
            whiteSpace: 'pre-wrap',
          }}
        >
          {msg.text}
        </div>
      </div>
    )
  }

  // agent text message
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 10 }}>
      <div
        style={{
          maxWidth: '88%',
          background: '#1c1c1c',
          border: '1px solid #2d2d2d',
          borderRadius: '14px 14px 14px 4px',
          padding: '9px 13px',
          color: '#c9d1d9',
          fontSize: 13,
          lineHeight: 1.55,
          whiteSpace: 'pre-wrap',
        }}
      >
        {msg.text}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AutoApplyPanel({ isOpen, onClose, defaultInstruction = '' }: AutoApplyPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: uid(),
      role: 'agent',
      text: "Hi! I'm your Smart Placement Agent. Tell me what kinds of jobs you want to apply to and I'll handle everything — scoring, cover letters, and submissions.\n\nExample: \"Apply to software engineering jobs above 10 LPA in Bangalore\"",
    },
  ])
  const [inputText, setInputText]   = useState(defaultInstruction)
  const [isRunning, setIsRunning]   = useState(false)
  const [thinkingText, setThinkingText] = useState(PROGRESS_MESSAGES[0])
  const [minPackage, setMinPackage] = useState(0) // reserved for future LPA filter UI
  void minPackage; void setMinPackage // suppress unused warning — required by spec
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    if (!isRunning) return
    let index = 0
    setThinkingText(PROGRESS_MESSAGES[0])
    const interval = setInterval(() => {
      index++
      if (index < PROGRESS_MESSAGES.length) {
        setThinkingText(PROGRESS_MESSAGES[index])
      }
    }, 12000)
    return () => clearInterval(interval)
  }, [isRunning])

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 120)
    }
  }, [isOpen])

  const addMessage = (msg: Omit<Message, 'id'>) =>
    setMessages(prev => [...prev, { id: uid(), ...msg }])

  const replaceThinking = (replacement: Omit<Message, 'id'>[]) => {
    setMessages(prev => {
      const withoutThinking = prev.filter(m => m.role !== 'thinking')
      return [...withoutThinking, ...replacement.map(r => ({ id: uid(), ...r }))]
    })
  }

  const handleSend = async () => {
    const instruction = inputText.trim()
    if (!instruction || isRunning) return

    setInputText('')
    setIsRunning(true)

    addMessage({ role: 'student', text: instruction })
    addMessage({ role: 'thinking', text: '' })

    try {
      const token: string   = localStorage.getItem('access_token') || ''
      const rawProfile      = localStorage.getItem('userProfile') || '{}'
      const profile         = JSON.parse(rawProfile)
      const resume_url      = parseResumeUrl(profile)

      // Normalize skills to plain strings — they can be stored as {name, level} objects
      const normalizedProfile = {
        ...profile,
        skills: (profile.skills || []).map((s: any) =>
          typeof s === 'string' ? s : (s?.name || s?.skill || '')
        ).filter(Boolean)
      }

      const AI_URL = `${AI_BASE}/api/agent/auto-apply`

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 90000)

      const resp = await fetch(AI_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          instruction,
          student_token: token,
          student_profile: normalizedProfile,
          resume_url,
        }),
        signal: controller.signal
      })
      clearTimeout(timeoutId)

      if (!resp.ok) {
        const errText = await resp.text()
        replaceThinking([
          {
            role: 'agent',
            text: `⚠️ Agent returned an error (${resp.status}):\n${errText}`,
          },
        ])
        return
      }

      const data = await resp.json()
      const newMessages: Omit<Message, 'id'>[] = []

      if (data.success === false) {
        const displaySummary = typeof data.summary === 'string'
          ? data.summary
          : JSON.stringify(data.summary)
        newMessages.push({ role: 'error', text: `⚠️ Agent Failed:\n${displaySummary}` })
      } else {
        // Agent summary text
        if (data.summary) {
          // Before displaying summary ensure it is a string
          const displaySummary = typeof data.summary === 'string'
            ? data.summary
            : JSON.stringify(data.summary)
            
          newMessages.push({ role: 'agent', text: displaySummary })
        }

      // Applied job cards only (skipped jobs omitted — avoids noise at scale)
      for (const job of (data.jobs_applied ?? [])) {
        newMessages.push({
          role: 'applied',
          text: '',
          job: {
            job_id: job.job_id ?? '',
            application_id: job.application_id ?? '',
            title: job.title,
            company: job.company,
            match_score: job.match_score,
            result: job.result,
            description: job.description,
          },
        })
      }

        // Summary card
        newMessages.push({
          role: 'summary',
          text: '',
          totalApplied: data.total_applied ?? 0,
          totalSkipped: data.total_skipped ?? 0,
        })
      }

      replaceThinking(newMessages)
    } catch (err: any) {
      if (err.name === 'AbortError') {
        replaceThinking([
          { role: 'agent', text: 'Request timed out after 90 seconds. Please try again with a more specific instruction like "Apply to software engineering jobs above 10 LPA".' }
        ])
      } else {
        replaceThinking([
          {
            role: 'agent',
            text: `⚠️ Could not reach the agent. Make sure the AI engine is running at ${AI_BASE}.\n\n${err?.message ?? err}`,
          },
        ])
      }
    } finally {
      setIsRunning(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        marginTop: 12,
        background: '#121212',
        border: '1px solid #2d2d2d',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
        display: 'flex',
        flexDirection: 'column',
        height: 540,
        width: '100%',
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: '1px solid #2d2d2d',
          background: '#1c1c1c',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 8, height: 8, borderRadius: '50%',
              background: isRunning ? '#d29922' : '#3fb950',
              boxShadow: isRunning
                ? '0 0 6px #d29922'
                : '0 0 6px #3fb950',
              transition: 'all 0.3s',
            }}
          />
          <span style={{ color: '#e0e0e0', fontWeight: 700, fontSize: 14 }}>
            Auto Apply Agent
          </span>
          {isRunning && (
            <span
              style={{
                color: '#d29922', fontSize: 11, fontWeight: 500,
                background: 'rgba(210,153,34,0.12)',
                border: '1px solid rgba(210,153,34,0.25)',
                borderRadius: 20, padding: '2px 8px',
              }}
            >
              Running…
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          disabled={isRunning}
          style={{
            background: 'none', border: 'none', cursor: isRunning ? 'not-allowed' : 'pointer',
            color: isRunning ? '#555555' : '#888888', fontSize: 18, lineHeight: 1,
            padding: '2px 4px', borderRadius: 6, transition: 'color 0.15s',
          }}
          title="Close panel"
        >
          ✕
        </button>
      </div>

      {/* ── Messages ───────────────────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 16px 8px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {messages.map(msg => (
          <MessageBubble key={msg.id} msg={msg} thinkingText={thinkingText} />
        ))}
      </div>

      {/* ── Input ──────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          padding: '12px 14px',
          borderTop: '1px solid #2d2d2d',
          background: '#1c1c1c',
          flexShrink: 0,
        }}
      >
        <input
          ref={inputRef}
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isRunning}
          placeholder="e.g. Apply to software engineering jobs above 10 LPA"
          style={{
            flex: 1,
            background: isRunning ? '#1a1a1a' : '#242424',
            border: `1px solid ${isRunning ? '#2a2a2a' : '#383838'}`,
            borderRadius: 10,
            padding: '9px 13px',
            color: isRunning ? '#555555' : '#e0e0e0',
            fontSize: 13,
            outline: 'none',
            transition: 'border-color 0.15s, color 0.15s',
            cursor: isRunning ? 'not-allowed' : 'text',
          }}
          onFocus={e => { if (!isRunning) e.target.style.borderColor = '#20c997' }}
          onBlur={e => { e.target.style.borderColor = isRunning ? '#2a2a2a' : '#383838' }}
        />
        <button
          onClick={handleSend}
          disabled={isRunning || !inputText.trim()}
          style={{
            background: isRunning || !inputText.trim() ? '#1c1c1c' : '#20c997',
            border: `1px solid ${isRunning || !inputText.trim() ? '#333333' : '#20c997'}`,
            borderRadius: 10,
            padding: '9px 16px',
            color: isRunning || !inputText.trim() ? '#555555' : '#0d1117',
            fontWeight: 600,
            fontSize: 13,
            cursor: isRunning || !inputText.trim() ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s',
            minWidth: 68,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          {isRunning ? <Spinner /> : 'Send'}
        </button>
      </div>
    </div>
  )
}

// ── Spinner ────────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      style={{ animation: 'spin 0.8s linear infinite' }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  )
}
