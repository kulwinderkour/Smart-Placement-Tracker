import React, { useEffect, useRef, useState } from 'react'

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

type MessageRole = 'student' | 'agent' | 'thinking' | 'summary' | 'applied' | 'skipped' | 'error' | 'search_result' | 'chat' | 'confirm'

interface Message {
  id: string
  role: MessageRole
  text: string
  job?: JobResult
  totalApplied?: number
  totalSkipped?: number
  sessionId?: string
  pipelineUsed?: string
}

function inputStyle(isRunning: boolean): React.CSSProperties {
  return {
    flex: 1,
    background: isRunning ? 'var(--student-surface)' : '#242424',
    border: '1px solid ' + (isRunning ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)'),
    borderRadius: 10,
    padding: '9px 13px',
    color: isRunning ? 'var(--student-text-dim)' : 'var(--student-text)',
    fontSize: 13,
    outline: 'none',
    transition: 'border-color 0.15s, color 0.15s',
    cursor: isRunning ? 'not-allowed' : 'text',
  }
}

function sendBtnStyle(isRunning: boolean, isEmpty: boolean): React.CSSProperties {
  const disabled = isRunning || isEmpty
  return {
    background: disabled ? 'var(--student-surface)' : '#a78bfa',
    border: '1px solid ' + (disabled ? 'var(--student-text-dim)' : '#a78bfa'),
    borderRadius: 10,
    padding: '9px 16px',
    color: disabled ? 'var(--student-text-dim)' : 'var(--student-bg)',
    fontWeight: 600,
    fontSize: 13,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s',
    minWidth: 68,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  }
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

const PROGRESS_MESSAGES_APPLY = [
  'Classifying your intent...',
  'Understanding your instruction...',
  'Fetching active job listings...',
  'Validating job postings...',
  'Scoring your profile against requirements...',
  'Filtering by your criteria...',
  'Generating personalized cover letters...',
  'Submitting applications...',
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
        background: 'var(--student-border)',
        borderRadius: '1px',
        overflow: 'hidden'
      }}>
        <div style={{
          height: '2px',
          background: '#a78bfa',
          borderRadius: '1px',
          animation: 'progressBar 90s linear forwards'
        }} />
      </div>
      <p style={{ color: 'var(--student-text-muted)', fontSize: '11px', marginTop: '6px', marginBottom: 0 }}>
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
          color: '#a78bfa', fontSize: 12, fontWeight: 500,
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
            background: 'rgba(167,139,250,0.06)',
            border: '1px solid rgba(167,139,250,0.18)',
            borderRadius: 8,
            fontSize: 12,
            color: 'var(--student-text-secondary)',
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
          <p style={{ margin: 0, color: 'var(--student-text)', fontSize: 13, fontWeight: 600 }}>
            {job.title ?? 'Unknown role'}
          </p>
          <p style={{ margin: '2px 0 0', color: 'var(--student-text-muted)', fontSize: 12 }}>
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
                <span style={{ display: 'block', marginTop: 4, color: 'var(--student-text-muted)', fontSize: 11 }}>
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
          <p style={{ margin: 0, color: 'var(--student-text)', fontSize: 13, fontWeight: 600 }}>
            {job.title ?? 'Unknown role'}
          </p>
          <p style={{ margin: '2px 0 0', color: 'var(--student-text-muted)', fontSize: 12 }}>
            {job.company && <span>{job.company} · </span>}
            <span style={{ color: '#f85149' }}>{job.reason ?? 'Skipped'}</span>
          </p>
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ applied, skipped, sessionId, pipelineUsed }: { applied: number; skipped: number; sessionId?: string; pipelineUsed?: string }) {
  return (
    <div
      style={{
        background: 'var(--student-surface)',
        border: '1px solid #2d2d2d',
        borderRadius: 12,
        padding: '16px 18px',
        marginTop: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <p style={{ margin: 0, color: 'var(--student-text)', fontWeight: 700, fontSize: 14 }}>
          🏁 Run complete
        </p>
        {pipelineUsed && pipelineUsed !== 'legacy' && (
          <span style={{ fontSize: 10, color: '#3fb950', background: 'rgba(63,185,80,0.1)', border: '1px solid rgba(63,185,80,0.2)', borderRadius: 20, padding: '2px 7px', fontWeight: 500 }}>
            Autonomous v2
          </span>
        )}
      </div>
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
        <p style={{ margin: '4px 0 0', color: 'var(--student-text-muted)', fontSize: 11, fontWeight: 500 }}>
          Application(s) submitted — visible to admins
        </p>
      </div>
      {skipped > 0 && (
        <p style={{ margin: '10px 0 0', color: '#6e7681', fontSize: 11, lineHeight: 1.45 }}>
          {skipped} other listing{skipped === 1 ? '' : 's'} did not meet your criteria.
        </p>
      )}
      {sessionId && (
        <p style={{ margin: '8px 0 0', color: '#484f58', fontSize: 10, fontFamily: 'monospace' }}>
          Session: {sessionId.slice(0, 8)}…
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
            background: 'rgba(167,139,250,0.14)',
            border: '1px solid rgba(167,139,250,0.28)',
            borderRadius: '14px 14px 4px 14px',
            padding: '9px 13px',
            color: 'var(--student-text)',
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
            background: 'var(--student-surface)',
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
          sessionId={msg.sessionId}
          pipelineUsed={msg.pipelineUsed}
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

  if (msg.role === 'confirm') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 10 }}>
        <div
          style={{
            maxWidth: '92%',
            background: 'rgba(210,153,34,0.07)',
            border: '1px solid rgba(210,153,34,0.35)',
            borderRadius: '14px 14px 14px 4px',
            padding: '12px 14px',
            color: 'var(--student-text)',
            fontSize: 13,
            lineHeight: 1.65,
            whiteSpace: 'pre-wrap',
          }}
        >
          {msg.text}
        </div>
      </div>
    )
  }

  if (msg.role === 'chat') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 10 }}>
        <div
          style={{
            maxWidth: '80%',
            background: 'rgba(167,139,250,0.07)',
            border: '1px solid rgba(167,139,250,0.22)',
            borderRadius: '14px 14px 14px 4px',
            padding: '10px 14px',
            color: 'var(--student-text)',
            fontSize: 13,
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
          }}
        >
          {msg.text}
        </div>
      </div>
    )
  }

  if (msg.role === 'search_result') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 10 }}>
        <div
          style={{
            maxWidth: '92%',
            background: 'rgba(47,129,247,0.06)',
            border: '1px solid rgba(47,129,247,0.22)',
            borderRadius: '14px 14px 14px 4px',
            padding: '10px 14px',
            color: 'var(--student-text)',
            fontSize: 13,
            lineHeight: 1.65,
            whiteSpace: 'pre-wrap',
            fontFamily: 'inherit',
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
          background: 'var(--student-surface)',
          border: '1px solid #2d2d2d',
          borderRadius: '14px 14px 14px 4px',
          padding: '9px 13px',
          color: 'var(--student-text-secondary)',
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
      text: `Hi! I'm your Smart Placement Agent — powered by Gemini 2.5 Flash.\n\nI understand what you mean before doing anything:\n• Greet me → I'll say hi back\n• "Show SDE jobs above 8 LPA" → I search, no applications\n• "Apply to SDE jobs above 8 LPA" → full auto-apply pipeline\n• "What are my skills?" → I'll show your profile\n\nTry: "Apply to software engineering jobs above 10 LPA"\nHindi/Hinglish: "8 LPA se upar SDE ki job chahiye"`,
    },
  ])
  const [inputText, setInputText]   = useState(defaultInstruction)
  const [isRunning, setIsRunning]   = useState(false)
  const [needsConfirmation, setNeedsConfirmation] = useState(false)
  const [thinkingText, setThinkingText] = useState(PROGRESS_MESSAGES_APPLY[0])
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
    const msgs = PROGRESS_MESSAGES_APPLY
    let index = 0
    setThinkingText(msgs[0])
    const interval = setInterval(() => {
      index++
      if (index < msgs.length) setThinkingText(msgs[index])
    }, 10000)
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
      const timeoutId = setTimeout(() => controller.abort(), 130000)

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
          use_new_pipeline: true,
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
      const intent: string = data.intent ?? 'unknown'
      const pipeline: string = data.pipeline_used ?? 'legacy'

      if (data.success === false) {
        const displaySummary = typeof data.summary === 'string'
          ? data.summary : JSON.stringify(data.summary)
        newMessages.push({ role: 'error', text: `⚠️ ${displaySummary}` })

      } else if (pipeline === 'awaiting_confirmation' || data.needs_confirmation === true) {
        // ── Blanket apply: ask confirmation before running pipeline ──────────────
        const reply = data.brain_reply || data.summary || ''
        if (reply) newMessages.push({ role: 'confirm', text: reply })
        setNeedsConfirmation(true)

      } else if (pipeline === 'brain_reply' || intent === 'greeting' || intent === 'general_query') {
        // ── Conversational reply — no job cards, no summary ───────────────────
        const reply = data.brain_reply || data.summary || ''
        if (reply) newMessages.push({ role: 'chat', text: reply })

      } else if (pipeline === 'profile_query' || intent === 'profile_query') {
        // ── Profile summary ───────────────────────────────────────────────────
        const reply = data.brain_reply || ''
        if (reply) newMessages.push({ role: 'agent', text: reply })
        if (data.summary) newMessages.push({ role: 'agent', text: data.summary })

      } else if (pipeline === 'job_search' || intent === 'job_search') {
        // ── Search results — show list, no apply cards ────────────────────────
        const reply = data.brain_reply || ''
        if (reply) newMessages.push({ role: 'agent', text: reply })
        if (data.summary) {
          const displaySummary = typeof data.summary === 'string'
            ? data.summary : JSON.stringify(data.summary)
          newMessages.push({ role: 'search_result', text: displaySummary })
        }

      } else if (pipeline === 'memory_query' || intent === 'memory_query') {
        // ── Memory / history query — render as chat bubble ────────────────
        const reply = data.brain_reply || data.summary || ''
        if (reply) newMessages.push({ role: 'chat', text: reply })

      } else {
        setNeedsConfirmation(false)
        // ── Apply pipeline — full cards + summary ─────────────────────────────
        const reply = data.brain_reply || ''
        if (reply) newMessages.push({ role: 'agent', text: reply })

        if (data.summary) {
          const displaySummary = typeof data.summary === 'string'
            ? data.summary : JSON.stringify(data.summary)
          newMessages.push({ role: 'agent', text: displaySummary })
        }

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

        newMessages.push({
          role: 'summary',
          text: '',
          totalApplied: data.total_applied ?? 0,
          totalSkipped: data.total_skipped ?? 0,
          sessionId: data.session_id,
          pipelineUsed: pipeline,
        })
      }

      replaceThinking(newMessages)
    } catch (err: any) {
      if (err.name === 'AbortError') {
        replaceThinking([
          { role: 'agent', text: 'Request timed out after 120 seconds. Please try again with a more specific instruction like "Apply to software engineering jobs above 10 LPA".' }
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
        background: 'var(--student-bg)',
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
          background: 'var(--student-surface)',
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
          <span style={{ color: 'var(--student-text)', fontWeight: 700, fontSize: 14 }}>
            Smart Placement Agent
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
            color: isRunning ? 'var(--student-text-dim)' : 'var(--student-text-muted)', fontSize: 18, lineHeight: 1,
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
          background: 'var(--student-surface)',
          flexShrink: 0,
        }}
      >
        {needsConfirmation ? (
          <>
            <button
              onClick={() => { setNeedsConfirmation(false); setInputText('yes apply to these jobs'); setTimeout(handleSend, 50) }}
              disabled={isRunning}
              style={{
                flex: 1, background: '#238636', border: '1px solid #2ea043',
                borderRadius: 10, padding: '9px 0', color: '#fff',
                fontWeight: 700, fontSize: 13, cursor: isRunning ? 'not-allowed' : 'pointer',
              }}
            >
              ✅ Yes, apply to all
            </button>
            <button
              onClick={() => { setNeedsConfirmation(false); addMessage({ role: 'agent', text: 'Cancelled. Nothing was applied.' }) }}
              disabled={isRunning}
              style={{
                flex: 1, background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.35)',
                borderRadius: 10, padding: '9px 0', color: '#f85149',
                fontWeight: 700, fontSize: 13, cursor: isRunning ? 'not-allowed' : 'pointer',
              }}
            >
              ✕ Cancel
            </button>
          </>
        ) : (
          <>
            <input
              ref={inputRef}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isRunning}
              placeholder="Try: 'Apply to SDE jobs above 8 LPA' or 'Show jobs above 5 LPA'"
              style={inputStyle(isRunning)}
              onFocus={e => { if (!isRunning) e.target.style.borderColor = '#2f81f7' }}
              onBlur={e => { e.target.style.borderColor = isRunning ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)' }}
            />
            <button
              onClick={handleSend}
              disabled={isRunning || !inputText.trim()}
              style={sendBtnStyle(isRunning, !inputText.trim())}
            >
              {isRunning ? <Spinner /> : 'Send'}
            </button>
          </>
        )}
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
