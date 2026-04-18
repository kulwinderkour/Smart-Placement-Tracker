import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { aiClient } from '../api/client'

export default function FloatingAgent() {
  const { user } = useAuthStore()
  const [open, setOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [resumePath, setResumePath] = useState('resume.pdf')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')

  const handleRun = async () => {
    if (!prompt.trim()) return
    setLoading(true)
    setResult('')
    setError('')
    try {
      const res = await aiClient.post('/agent/run', {
        prompt: prompt.trim(),
        user_id: user?.id || 'anonymous',
        resume_path: resumePath || 'resume.pdf',
      })
      setResult(res.data.result || 'Agent completed with no output.')
    } catch (err: any) {
      setError(
        err?.response?.data?.detail || err?.message || 'Something went wrong.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleRun()
  }

  const handleClose = () => {
    setOpen(false)
  }

  return (
    <>
      {/* ── Backdrop (click outside to close) ── */}
      {open && (
        <div
          onClick={handleClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 999,
            background: 'rgba(0,0,0,0.45)',
          }}
        />
      )}

      {/* ── Slide-up Drawer ── */}
      <div
        style={{
          position: 'fixed',
          bottom: open ? 90 : -480,
          right: 24,
          width: 420,
          maxWidth: 'calc(100vw - 48px)',
          background: 'var(--student-surface)',
          border: '1px solid #21262d',
          borderRadius: '14px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          zIndex: 1000,
          transition: 'bottom 0.3s cubic-bezier(.4,0,.2,1)',
          overflow: 'hidden',
        }}
      >
        {/* Drawer header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', borderBottom: '1px solid #21262d',
          background: 'linear-gradient(90deg, #0d1117 0%, #161b22 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'linear-gradient(135deg, #a78bfa30, #58a6ff30)',
              border: '1px solid #a78bfa50',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15,
            }}>✦</div>
            <div>
              <div style={{ color: 'var(--student-text)', fontSize: 13, fontWeight: 600 }}>
                AI Placement Agent
              </div>
              <div style={{ color: 'var(--student-text-muted)', fontSize: 11 }}>
                Gemini-powered · Auto-apply to jobs
              </div>
            </div>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'none', border: 'none', color: 'var(--student-text-muted)',
              fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: '2px 6px',
            }}
          >×</button>
        </div>

        {/* Drawer body */}
        <div style={{ padding: '16px 18px' }}>
          {/* Prompt input */}
          <input
            type="text"
            placeholder="e.g. Apply to all jobs above 20 LPA with my resume"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px 14px',
              background: 'var(--student-bg)',
              border: `1px solid ${loading ? 'var(--student-border)' : 'var(--student-border)'}`,
              borderRadius: 8,
              color: 'var(--student-text)',
              fontSize: 13,
              outline: 'none',
              boxSizing: 'border-box',
              opacity: loading ? 0.6 : 1,
            }}
            onFocus={e => { if (!loading) e.target.style.borderColor = '#a78bfa' }}
            onBlur={e => { e.target.style.borderColor = loading ? 'var(--student-border)' : 'var(--student-border)' }}
          />

          {/* Resume + Run row */}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input
              type="text"
              placeholder="resume.pdf"
              value={resumePath}
              onChange={e => setResumePath(e.target.value)}
              disabled={loading}
              title="Resume filename"
              style={{
                width: 110, padding: '9px 10px',
                background: 'var(--student-bg)', border: '1px solid #21262d',
                borderRadius: 8, color: 'var(--student-text-muted)', fontSize: 12, outline: 'none',
                opacity: loading ? 0.6 : 1,
              }}
            />
            <button
              onClick={handleRun}
              disabled={loading || !prompt.trim()}
              style={{
                flex: 1, padding: '9px 14px',
                background: loading || !prompt.trim() ? 'var(--student-border)' : '#a78bfa',
                color: loading || !prompt.trim() ? 'var(--student-text-muted)' : 'var(--student-bg)',
                border: 'none', borderRadius: 8,
                fontSize: 13, fontWeight: 600,
                cursor: loading || !prompt.trim() ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'background 0.15s',
              }}
            >
              {loading ? (
                <>
                  <span style={{
                    width: 13, height: 13, border: '2px solid #7d859077',
                    borderTopColor: 'var(--student-text)', borderRadius: '50%',
                    display: 'inline-block',
                    animation: 'fabSpin 0.7s linear infinite',
                  }} />
                  Running…
                </>
              ) : 'Run Agent'}
            </button>
          </div>

          <p style={{ margin: '6px 0 12px', fontSize: 11, color: 'var(--student-text-dim)' }}>
            Ctrl+Enter to run
          </p>

          {/* Loading bar */}
          {loading && (
            <div style={{
              background: 'var(--student-bg)', border: '1px solid #21262d',
              borderRadius: 8, padding: '12px 14px',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{
                width: 16, height: 16, border: '2px solid #21262d',
                borderTopColor: '#a78bfa', borderRadius: '50%',
                display: 'inline-block', flexShrink: 0,
                animation: 'fabSpin 0.7s linear infinite',
              }} />
              <span style={{ color: 'var(--student-text-muted)', fontSize: 12 }}>
                Fetching jobs, filtering & submitting applications…
              </span>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div style={{
              background: '#2d1b1b', border: '1px solid #da363333',
              borderRadius: 8, padding: '12px 14px',
              color: '#f85149', fontSize: 12,
            }}>
              ⚠ {error}
            </div>
          )}

          {/* Result */}
          {result && !loading && (
            <div style={{
              background: 'var(--student-bg)', border: '1px solid #1a2e22',
              borderRadius: 8, padding: '14px',
              maxHeight: 200, overflowY: 'auto',
            }}>
              <div style={{ color: '#3fb950', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
                ✓ Agent finished
              </div>
              <pre style={{
                margin: 0, color: 'var(--student-text)', fontSize: 12,
                lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                fontFamily: 'inherit',
              }}>
                {result}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* ── Floating Action Button ── */}
      <button
        onClick={() => setOpen(prev => !prev)}
        title="AI Placement Agent"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 54,
          height: 54,
          borderRadius: '50%',
          background: open
            ? 'var(--student-surface)'
            : 'linear-gradient(135deg, #a78bfa 0%, #0ea5e9 100%)',
          border: open ? '1px solid #30363d' : 'none',
          boxShadow: open
            ? '0 4px 20px rgba(0,0,0,0.4)'
            : '0 4px 24px rgba(167,139,250,0.45)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001,
          transition: 'all 0.25s cubic-bezier(.4,0,.2,1)',
          transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
        }}
        onMouseEnter={e => {
          if (!open) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = open ? 'rotate(45deg)' : 'scale(1)'
        }}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="var(--student-text)" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke="var(--student-bg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.38 5.06L2 22l4.94-1.38A9.94 9.94 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2z" />
            <path d="M8 10h8M8 14h5" strokeWidth="2" />
          </svg>
        )}
      </button>

      <style>{`
        @keyframes fabSpin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  )
}
