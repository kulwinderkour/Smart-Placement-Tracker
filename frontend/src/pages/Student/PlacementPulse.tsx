import { useState, useEffect, useMemo } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────
type Mood = 'locked' | 'average' | 'distracted'

interface PS {
  cats: Record<string, number>
  doneToday: string[]
  streak: number
  best: number
  lastDate: string
  weekDots: boolean[]
  mood: Mood | null
  note: string
}

interface CatDef { id: string; label: string; icon: string; color: string }

// ─── Theme ───────────────────────────────────────────────────────────────────
const C = {
  bg: '#121212', card: '#1c1c1c', border: '#2d2d2d', borderH: '#333333',
  text: '#e0e0e0', muted: '#888888', primary: '#20c997',
  dim: '#0d2b22', warn: '#f0b429', danger: '#f85149', blue: '#58a6ff',
}

// ─── Static data ─────────────────────────────────────────────────────────────
const CATS: CatDef[] = [
  { id: 'dsa',    label: 'DSA',            icon: '🧠', color: '#58a6ff' },
  { id: 'apt',    label: 'Aptitude',       icon: '🔢', color: '#f0b429' },
  { id: 'core',   label: 'Core Subjects',  icon: '📚', color: '#4ade80' },
  { id: 'resume', label: 'Resume',         icon: '📄', color: '#20c997' },
  { id: 'proj',   label: 'Projects',       icon: '🛠️', color: '#f97316' },
  { id: 'comm',   label: 'Communication',  icon: '🎙️', color: '#ec4899' },
  { id: 'hr',     label: 'HR Prep',        icon: '🤝', color: '#c084fc' },
  { id: 'apps',   label: 'Applications',   icon: '📬', color: '#34d399' },
]

const ACTIONS = [
  { id: 'a1', label: 'Solved DSA problems',    icon: '💡', cats: ['dsa'],           pts: 14 },
  { id: 'a2', label: 'Revised DBMS / OS / CN', icon: '📖', cats: ['core'],          pts: 14 },
  { id: 'a3', label: 'Practiced aptitude',     icon: '🔢', cats: ['apt'],           pts: 14 },
  { id: 'a4', label: 'Updated resume',         icon: '✏️', cats: ['resume'],        pts: 16 },
  { id: 'a5', label: 'Gave mock interview',    icon: '🎙️', cats: ['comm', 'hr'],    pts: 15 },
  { id: 'a6', label: 'Applied to company',     icon: '📬', cats: ['apps'],          pts: 16 },
  { id: 'a7', label: 'Practiced HR answers',   icon: '🤝', cats: ['hr'],            pts: 13 },
  { id: 'a8', label: 'Improved project pitch', icon: '🛠️', cats: ['proj', 'comm'],  pts: 14 },
]

const MOODS: { id: Mood; label: string; icon: string; color: string }[] = [
  { id: 'locked',     label: 'Locked In',  icon: '🔥', color: C.primary },
  { id: 'average',    label: 'Average',    icon: '😐', color: C.warn    },
  { id: 'distracted', label: 'Distracted', icon: '😵', color: C.danger  },
]

// ─── State helpers ────────────────────────────────────────────────────────────
const KEY = 'pp_v2'
const todayISO = () => new Date().toISOString().slice(0, 10)

const DEMO: PS = {
  cats: { dsa: 65, apt: 42, core: 38, resume: 80, proj: 55, comm: 30, hr: 20, apps: 72 },
  doneToday: ['a1', 'a4'],
  streak: 4, best: 7,
  lastDate: todayISO(),
  weekDots: [true, true, false, true, true, false, false],
  mood: 'average',
  note: 'Solved two medium LeetCode problems. Need to focus more on Core Subjects this week.',
}

function loadState(): PS {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEMO, lastDate: todayISO() }
    const p: PS = JSON.parse(raw)
    if (p.lastDate !== todayISO()) {
      const yest = new Date(); yest.setDate(yest.getDate() - 1)
      const wasYest = yest.toISOString().slice(0, 10) === p.lastDate
      const dots: boolean[] = Array.isArray(p.weekDots) && p.weekDots.length === 7
        ? p.weekDots : DEMO.weekDots
      return {
        ...p,
        doneToday: [], mood: null, note: '',
        streak: wasYest ? p.streak : 0,
        weekDots: [...dots.slice(1), p.doneToday.length > 0],
        lastDate: todayISO(),
      }
    }
    return p
  } catch { return { ...DEMO, lastDate: todayISO() } }
}

function calcScore(cats: Record<string, number>): number {
  const vals = Object.values(cats)
  if (!vals.length) return 0
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
}

function readinessMsg(s: number): { msg: string; color: string } {
  if (s >= 80) return { msg: 'Interview-ready this week 🚀', color: C.primary }
  if (s >= 60) return { msg: "You're building strong momentum ⚡", color: C.primary }
  if (s >= 40) return { msg: "Keep pushing — you're getting there 💪", color: C.warn }
  return { msg: 'Your prep needs attention. Start today!', color: C.danger }
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function MomentumRing({ score }: { score: number }) {
  const R = 72, circ = 2 * Math.PI * R
  const { msg, color } = readinessMsg(score)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{ position: 'relative', width: 190, height: 190 }}>
        <svg width={190} height={190} style={{ transform: 'rotate(-90deg)' }}>
          <defs>
            <filter id="ring-glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <circle cx={95} cy={95} r={R} fill="none" stroke={C.border} strokeWidth={13} />
          <circle cx={95} cy={95} r={R} fill="none" stroke={color} strokeWidth={13}
            strokeLinecap="round"
            strokeDasharray={`${(score / 100) * circ} ${circ}`}
            filter="url(#ring-glow)"
            style={{ transition: 'stroke-dasharray 1.4s cubic-bezier(.4,0,.2,1), stroke 0.6s' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 44, fontWeight: 800, color: C.text, lineHeight: 1 }}>{score}</span>
          <span style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>/ 100</span>
        </div>
      </div>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color, textAlign: 'center', maxWidth: 190 }}>{msg}</p>
    </div>
  )
}

interface ZProps { title: string; emoji: string; cat: CatDef & { score: number }; color: string }
function ZoneRow({ title, emoji, cat, color }: ZProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'rgba(13,17,23,0.7)', borderRadius: 9, border: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 16 }}>{emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 10, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{title}</p>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.icon} {cat.label}</p>
      </div>
      <span style={{ fontSize: 14, fontWeight: 800, color, background: `${color}18`, padding: '2px 8px', borderRadius: 20 }}>{cat.score}</span>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PlacementPulse() {
  const [st, setSt] = useState<PS>(loadState)
  const score = useMemo(() => calcScore(st.cats), [st.cats])

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(st)) } catch {}
  }, [st])

  const doAction = (id: string, cats: string[], pts: number) => {
    if (st.doneToday.includes(id)) return
    setSt(prev => {
      const nc = { ...prev.cats }
      cats.forEach(c => { nc[c] = Math.min(100, (nc[c] ?? 0) + pts) })
      const nd = [...prev.doneToday, id]
      const ns = prev.doneToday.length === 0 ? prev.streak + 1 : prev.streak
      return { ...prev, cats: nc, doneToday: nd, streak: ns, best: Math.max(prev.best, ns) }
    })
  }

  const sortedCats = [...CATS]
    .map(c => ({ ...c, score: st.cats[c.id] ?? 0 }))
    .sort((a, b) => b.score - a.score)

  const todayPct = Math.round((st.doneToday.length / ACTIONS.length) * 100)
  const activeDays = st.weekDots.filter(Boolean).length

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 60px' }}>

        {/* ── Page Header ── */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h1 style={{
            fontSize: 32, fontWeight: 800, margin: '0 0 8px',
            background: `linear-gradient(135deg, ${C.primary} 0%, ${C.blue} 100%)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            ⚡ Placement Pulse
          </h1>
          <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>
            Track your real placement momentum, not just tasks.
          </p>
        </div>

        {/* ── Row 1: Ring | Stats | Focus Zones ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>

          {/* Momentum Ring */}
          <div style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 18,
            padding: '32px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 40px ${C.primary}08`,
          }}>
            <MomentumRing score={score} />
          </div>

          {/* Stats 2×2 grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: 'Current Streak',  val: `${st.streak}d`,   icon: '🔥', col: '#f97316' },
              { label: 'Best Streak',     val: `${st.best}d`,     icon: '🏆', col: C.primary },
              { label: "Today's Actions", val: `${st.doneToday.length}/${ACTIONS.length}`, icon: '⚡', col: C.blue },
              { label: 'Days This Week',  val: `${activeDays}/7`, icon: '📅', col: '#4ade80' },
            ].map(s => (
              <div key={s.label} style={{
                background: C.card, border: `1px solid ${C.border}`, borderRadius: 14,
                padding: '16px 16px', display: 'flex', gap: 12, alignItems: 'center',
              }}>
                <span style={{ fontSize: 24 }}>{s.icon}</span>
                <div>
                  <p style={{ margin: 0, fontSize: 10, color: C.muted, fontWeight: 600 }}>{s.label}</p>
                  <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: s.col }}>{s.val}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Focus Zones */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: '20px 18px' }}>
            <p style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Focus Zones
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <ZoneRow title="Strongest" emoji="💪" cat={sortedCats[0]} color={C.primary} />
              <ZoneRow title="Needs Work" emoji="⚠️" cat={sortedCats[sortedCats.length - 1]} color={C.danger} />
              <ZoneRow title="Most Ignored" emoji="💤" cat={sortedCats[sortedCats.length - 2]} color={C.muted} />
            </div>
          </div>
        </div>

        {/* ── 7-Day Activity Strip ── */}
        <div style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 14,
          padding: '13px 20px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: C.muted, whiteSpace: 'nowrap' }}>7-Day Activity</span>
          <div style={{ display: 'flex', gap: 6, flex: 1 }}>
            {st.weekDots.map((active, i) => (
              <div key={i} style={{
                flex: 1, height: 28, borderRadius: 7,
                background: active ? C.primary : C.border,
                transition: 'background 0.4s ease',
                boxShadow: active ? `0 0 12px ${C.primary}55` : 'none',
              }} />
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
            <div style={{ width: 28, height: 28, borderRadius: 50, background: `${C.primary}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: C.primary }}>{todayPct}%</div>
            <span style={{ fontSize: 12, color: C.muted }}>{st.doneToday.length > 0 ? `${st.doneToday.length} done today` : 'No actions yet'}</span>
          </div>
        </div>

        {/* ── Daily Prep Actions ── */}
        <div style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 18,
          padding: '20px 20px 24px', marginBottom: 20,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Today's Prep Actions</h2>
            <span style={{ fontSize: 12, color: C.muted }}>
              {st.doneToday.length} / {ACTIONS.length} completed
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {ACTIONS.map(a => {
              const done = st.doneToday.includes(a.id)
              return (
                <button key={a.id} onClick={() => doAction(a.id, a.cats, a.pts)}
                  style={{
                    background: done ? C.dim : C.bg,
                    border: `1px solid ${done ? C.primary : C.border}`,
                    borderRadius: 14, padding: '18px 10px',
                    cursor: done ? 'default' : 'pointer', textAlign: 'center',
                    transition: 'all 0.22s ease',
                    boxShadow: done ? `0 0 18px ${C.primary}22` : 'none',
                    position: 'relative', overflow: 'hidden',
                  }}
                  onMouseOver={e => {
                    if (!done) {
                      e.currentTarget.style.borderColor = C.primary
                      e.currentTarget.style.background = C.dim
                      e.currentTarget.style.boxShadow = `0 0 20px ${C.primary}18`
                    }
                  }}
                  onMouseOut={e => {
                    if (!done) {
                      e.currentTarget.style.borderColor = C.border
                      e.currentTarget.style.background = C.bg
                      e.currentTarget.style.boxShadow = 'none'
                    }
                  }}
                >
                  {done && (
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                      background: `linear-gradient(90deg, ${C.primary}, ${C.blue})`,
                      borderRadius: '14px 14px 0 0',
                    }} />
                  )}
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{done ? '✅' : a.icon}</div>
                  <div style={{
                    fontSize: 12, fontWeight: 500, lineHeight: 1.4,
                    color: done ? C.primary : C.text,
                  }}>{a.label}</div>
                  {done && (
                    <div style={{ fontSize: 10, color: C.primary, marginTop: 6, fontWeight: 700 }}>
                      +{a.pts} pts
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Category Readiness ── */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: '20px', marginBottom: 20 }}>
          <h2 style={{ margin: '0 0 18px', fontSize: 16, fontWeight: 700 }}>Category Readiness</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {CATS.map(cat => {
              const s = st.cats[cat.id] ?? 0
              const lbl = s >= 70 ? 'Strong' : s >= 30 ? 'Improving' : 'Neglected'
              const lc = s >= 70 ? C.primary : s >= 30 ? C.warn : C.danger
              return (
                <div key={cat.id} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 20 }}>{cat.icon}</span>
                    <span style={{
                      fontSize: 9, fontWeight: 700, color: lc,
                      background: `${lc}18`, padding: '2px 7px', borderRadius: 20,
                    }}>{lbl}</span>
                  </div>
                  <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 600, color: C.text }}>{cat.label}</p>
                  <div style={{ background: C.border, borderRadius: 4, height: 5, marginBottom: 5 }}>
                    <div style={{
                      width: `${s}%`, height: '100%', background: cat.color, borderRadius: 4,
                      transition: 'width 1.1s cubic-bezier(.4,0,.2,1)',
                      boxShadow: s > 0 ? `0 0 8px ${cat.color}55` : 'none',
                    }} />
                  </div>
                  <span style={{ fontSize: 10, color: C.muted }}>{s} / 100</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Today's Reflection ── */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: '20px' }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>Today's Reflection</h2>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            {MOODS.map(m => (
              <button key={m.id}
                onClick={() => setSt(p => ({ ...p, mood: m.id }))}
                style={{
                  flex: 1, padding: '11px 8px',
                  background: st.mood === m.id ? `${m.color}20` : 'transparent',
                  border: `1px solid ${st.mood === m.id ? m.color : C.border}`,
                  borderRadius: 11, cursor: 'pointer',
                  color: st.mood === m.id ? m.color : C.muted,
                  fontSize: 13, fontWeight: st.mood === m.id ? 700 : 400,
                  transition: 'all 0.2s ease',
                }}
              >
                {m.icon} {m.label}
              </button>
            ))}
          </div>
          <textarea
            value={st.note}
            onChange={e => setSt(p => ({ ...p, note: e.target.value }))}
            placeholder="Quick reflection for today — what went well, what needs work..."
            rows={3}
            style={{
              width: '100%', background: C.bg, border: `1px solid ${C.border}`,
              borderRadius: 11, padding: '11px 14px', color: C.text,
              fontSize: 13, resize: 'vertical', boxSizing: 'border-box',
              fontFamily: 'inherit', outline: 'none', lineHeight: 1.6,
            }}
            onFocus={e => { e.currentTarget.style.borderColor = C.primary }}
            onBlur={e => { e.currentTarget.style.borderColor = C.border }}
          />
          {st.note && (
            <p style={{ margin: '8px 0 0', fontSize: 11, color: C.muted }}>
              💾 Saved locally — only visible to you.
            </p>
          )}
        </div>

      </div>
    </div>
  )
}
