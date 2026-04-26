import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { studentApi } from '../../api/student'
import { applicationsApi, type TrackedApplication } from '../../api/applications'
import type { Interview } from '../../types'

// ─── Types ───────────────────────────────────────────────────────────────────
type EventType = 'Interview' | 'OA/Test' | 'Deadline' | 'Other'

interface ScheduleEvent {
  id: string
  company: string
  detail: string
  date: string          // yyyy-mm-dd
  type: EventType
  adminScheduled?: boolean
  meetingLink?: string
  mode?: string
  status?: string
  notes?: string
}

// ─── Theme tokens ──────────────────────────────────────────────────────────
const C = {
  bg:       'var(--student-bg)',
  card:     'var(--student-surface)',
  border:   'var(--student-border)',
  text:     'var(--student-text)',
  muted:    'var(--student-text-muted)',
  dim:      'var(--student-text-dim)',
  accent:   'var(--student-accent)',
  accentBg: 'var(--student-accent-bg)',
}

const TYPE_COLOR: Record<EventType, string> = {
  'Interview': '#58a6ff',
  'OA/Test':   '#f0b429',
  'Deadline':  '#f85149',
  'Other':     '#8b8fa8',
}

// ─── Helpers ──────────────────────────────────────────────────────────────
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December']
const DAYS   = ['Su','Mo','Tu','We','Th','Fr','Sa']

function fmtDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
}

function daysFromNow(iso: string) {
  const diff = Math.ceil(
    (new Date(iso + 'T00:00:00').getTime() - Date.now()) / 86_400_000
  )
  if (diff === 0) return 'Today'
  if (diff < 0)  return `${Math.abs(diff)}d ago`
  return `In ${diff} days`
}

function toISO(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
}

function buildCalendarGrid(year: number, month: number) {
  const first = new Date(year, month, 1).getDay()
  const last  = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < first; i++) cells.push(null)
  for (let d = 1; d <= last; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

/** Convert an admin Interview object → ScheduleEvent */
function adminInterviewToEvent(iv: Interview): ScheduleEvent {
  const date = iv.scheduled_at.slice(0, 10)
  return {
    id:            `admin-${iv.id}`,
    company:       (iv as any).company_name ?? 'Company',
    detail:        iv.role_title,
    date,
    type:          'Interview',
    adminScheduled: true,
    meetingLink:   iv.meeting_link,
    mode:          iv.mode,
    status:        iv.status,
    notes:         iv.notes,
  }
}

// ─── Seed local events ────────────────────────────────────────────────────
function seedEvents(): ScheduleEvent[] {
  const today = new Date()
  const y = today.getFullYear()
  const m = today.getMonth()
  const d = today.getDate()
  const iso = (offset: number) => toISO(y, m, d + offset)
  return [
    { id:'e1', company:'Google',    detail:'DSA + Systems',       date: iso(3),  type:'OA/Test'  },
    { id:'e2', company:'Microsoft', detail:'Round 1 — HR',        date: iso(6),  type:'Interview'},
    { id:'e3', company:'Atlassian', detail:'Application closes',  date: iso(7),  type:'Deadline' },
    { id:'e4', company:'Flipkart',  detail:'Technical round',     date: iso(14), type:'Interview'},
    { id:'e5', company:'Amazon',    detail:'SDE-1 online test',   date: iso(18), type:'OA/Test'  },
  ]
}

function loadLocalEvents(): ScheduleEvent[] {
  try {
    const raw = localStorage.getItem('interview_scheduler_v1')
    return raw ? JSON.parse(raw) : seedEvents()
  } catch { return seedEvents() }
}

function saveLocalEvents(events: ScheduleEvent[]) {
  localStorage.setItem('interview_scheduler_v1', JSON.stringify(events))
}

// ─── Add-event modal ──────────────────────────────────────────────────────
function AddEventModal({ onAdd, onClose }: {
  onAdd: (e: ScheduleEvent) => void
  onClose: () => void
}) {
  const [form, setForm] = useState({
    company: '', detail: '', date: '', type: 'Interview' as EventType
  })
  const submit = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!form.company || !form.date) return
    onAdd({ id: Date.now().toString(), company: form.company, detail: form.detail, date: form.date, type: form.type })
    onClose()
  }
  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: C.bg, border: `1px solid ${C.border}`,
    color: C.text, fontSize: 13, borderRadius: 8,
    padding: '8px 10px', outline: 'none', fontFamily: 'inherit',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 11, color: C.muted, marginBottom: 4, display: 'block',
    fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
  }
  return (
    <div style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.55)',
      display:'flex', alignItems:'center', justifyContent:'center' }} onClick={onClose}>
      <div style={{ background: C.card, border:`1px solid ${C.border}`, borderRadius:14,
        padding:'24px 22px', width:340, boxSizing:'border-box' }} onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <span style={{ fontSize:15, fontWeight:700, color:C.text }}>Add Event</span>
          <button type="button" onClick={onClose}
            style={{ background:'transparent', border:'none', color:C.muted, cursor:'pointer', fontSize:18 }}>×</button>
        </div>
        <form onSubmit={submit}>
          <div style={{ marginBottom:12 }}>
            <label style={labelStyle}>Company</label>
            <input style={inputStyle} placeholder="e.g. Google" value={form.company}
              onChange={e => setForm(p=>({...p, company:e.target.value}))} />
          </div>
          <div style={{ marginBottom:12 }}>
            <label style={labelStyle}>Detail / Round</label>
            <input style={inputStyle} placeholder="e.g. DSA round 1" value={form.detail}
              onChange={e => setForm(p=>({...p, detail:e.target.value}))} />
          </div>
          <div style={{ marginBottom:12 }}>
            <label style={labelStyle}>Date</label>
            <input type="date" style={inputStyle} value={form.date}
              onChange={e => setForm(p=>({...p, date:e.target.value}))} />
          </div>
          <div style={{ marginBottom:18 }}>
            <label style={labelStyle}>Type</label>
            <select style={{...inputStyle, cursor:'pointer'}} value={form.type}
              onChange={e => setForm(p=>({...p, type:e.target.value as EventType}))}>
              {(['Interview','OA/Test','Deadline','Other'] as EventType[]).map(t=>(
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button type="submit" style={{ flex:1, padding:'9px 0', background:C.accent, color:'#fff',
              border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' }}>Add</button>
            <button type="button" onClick={onClose} style={{ flex:1, padding:'9px 0', background:C.bg,
              color:C.text, border:`1px solid ${C.border}`, borderRadius:8, fontSize:13, cursor:'pointer' }}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Mini Calendar ────────────────────────────────────────────────────────
function MiniCalendar({ year, month, selectedDay, events, onPrev, onNext, onSelectDay }: {
  year: number, month: number, selectedDay: number | null
  events: ScheduleEvent[]
  onPrev: () => void, onNext: () => void
  onSelectDay: (d: number) => void
}) {
  const cells = buildCalendarGrid(year, month)
  const today = new Date()
  const hasEvent = (d: number) => events.some(e => e.date === toISO(year, month, d))
  const hasAdmin  = (d: number) => events.some(e => e.date === toISO(year, month, d) && e.adminScheduled)

  return (
    <div style={{ background: C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:'20px 18px', userSelect:'none' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <button type="button" onClick={onPrev}
          style={{ background:'transparent', border:'none', color:C.muted, cursor:'pointer', fontSize:16 }}>‹</button>
        <span style={{ fontSize:16, fontWeight:700, color:C.text }}>{MONTHS[month]} {year}</span>
        <button type="button" onClick={onNext}
          style={{ background:'transparent', border:'none', color:C.muted, cursor:'pointer', fontSize:16 }}>›</button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', marginBottom:6 }}>
        {DAYS.map(d => (
          <span key={d} style={{ textAlign:'center', fontSize:13, color:C.text, fontWeight:600 }}>{d}</span>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', rowGap:2 }}>
        {cells.map((cell, i) => {
          if (!cell) return <span key={i} />
          const isToday    = cell===today.getDate() && month===today.getMonth() && year===today.getFullYear()
          const isSelected = cell === selectedDay
          const hasDot     = hasEvent(cell)
          const adminDot   = hasAdmin(cell)
          return (
            <div key={i} onClick={() => onSelectDay(cell)}
              style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                padding:'4px 0', borderRadius:8, cursor:'pointer',
                background: isSelected ? C.accent : isToday ? C.accentBg : 'transparent',
                color: isSelected ? '#fff' : isToday ? C.accent : C.text,
                fontSize:14, fontWeight: isToday || isSelected ? 700 : 400, position:'relative' }}>
              {cell}
              {hasDot && (
                <span style={{ width:4, height:4, borderRadius:'50%',
                  background: adminDot ? '#f0b429' : (isSelected ? '#fff' : C.accent),
                  marginTop:1 }} />
              )}
            </div>
          )
        })}
      </div>
      {/* Calendar legend */}
      <div style={{ display:'flex', gap:10, marginTop:10, flexWrap:'wrap' }}>
        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:C.accent, display:'inline-block' }} />
          <span style={{ fontSize:10, color:C.muted }}>Your events</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:'#f0b429', display:'inline-block' }} />
          <span style={{ fontSize:10, color:C.muted }}>Admin-scheduled</span>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────
export default function StreakTracker() {
  const [localEvents, setLocalEvents] = useState<ScheduleEvent[]>(loadLocalEvents)
  const [filter, setFilter]           = useState<'All' | EventType>('All')
  const [showModal, setShowModal]     = useState(false)
  const today   = new Date()
  const [calYear,  setCalYear]  = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth())
  const [selDay,   setSelDay]   = useState<number | null>(today.getDate())

  // ── Fetch admin-scheduled interviews ──────────────────────────────────
  const { data: adminData, isLoading: adminLoading } = useQuery({
    queryKey: ['my-interviews'],
    queryFn:  () => studentApi.getMyInterviews(),
    staleTime: 60_000,
  })

  // ── Fetch application status updates ────────────────────────────────────
  const [appStatuses, setAppStatuses] = useState<TrackedApplication[]>([])
  useEffect(() => {
    applicationsApi.myApplications()
      .then(res => setAppStatuses((res.data.applications as unknown as TrackedApplication[]) || []))
      .catch(() => {})
  }, [])

  const ACTIVE_STAGES: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    Pending: { label: 'Pending', color: '#f0b429', bg: 'rgba(240,180,41,0.10)', icon: '📝' },
    Shortlisted: { label: 'Shortlisted', color: '#79c0ff', bg: 'rgba(121,192,255,0.10)', icon: '🤝' },
    Approved: { label: 'Approved', color: '#3fb950', bg: 'rgba(63,185,80,0.10)', icon: '🎉' },
  }

  const activeApps = appStatuses.filter(a => ACTIVE_STAGES[a.status])

  const adminEvents: ScheduleEvent[] = (adminData?.data?.data ?? []).map(adminInterviewToEvent)

  // Merge local + admin (deduplicate by id)
  const allEvents: ScheduleEvent[] = [
    ...localEvents,
    ...adminEvents.filter(ae => !localEvents.some(le => le.id === ae.id)),
  ].sort((a, b) => a.date.localeCompare(b.date))

  const addEvent = (e: ScheduleEvent) => {
    const updated = [...localEvents, e].sort((a,b) => a.date.localeCompare(b.date))
    setLocalEvents(updated)
    saveLocalEvents(updated)
  }

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y=>y-1); setCalMonth(11) }
    else setCalMonth(m=>m-1)
    setSelDay(null)
  }
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y=>y+1); setCalMonth(0) }
    else setCalMonth(m=>m+1)
    setSelDay(null)
  }

  const FILTERS: Array<'All' | EventType> = ['All','Interview','OA/Test','Deadline']

  const visibleEvents = allEvents
    .filter(e => filter === 'All' || e.type === filter)
    .filter(e => selDay ? e.date === toISO(calYear, calMonth, selDay) : true)

  const adminCount = adminEvents.length

  return (
    <div style={{ background: C.bg, minHeight:'100vh', color: C.text }}>
      <div style={{ padding:'28px 32px 60px' }}>

        {/* ── Application Status Alerts ── */}
        {activeApps.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              🔔 Active Stages
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activeApps.map((app, i) => {
                const stage = ACTIVE_STAGES[app.status]!
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: stage.bg, border: `1px solid ${stage.color}44`,
                    borderRadius: 10, padding: '10px 14px',
                  }}>
                    <span style={{ fontSize: 18 }}>{stage.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text }}>
                        {(app as any).company || 'Company'}
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: C.muted }}>
                        {(app as any).jobTitle || (app as any).role || ''}
                      </p>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 10px',
                      borderRadius: 20, background: stage.bg,
                      border: `1px solid ${stage.color}66`, color: stage.color,
                      whiteSpace: 'nowrap',
                    }}>{stage.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Header ── */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
          <div>
            <h1 style={{ margin:'0 0 6px', fontSize:26, fontWeight:700, color:C.text }}>
              Interview Scheduler
            </h1>
            <p style={{ margin:0, fontSize:15, color:C.muted }}>
              All your interviews, OA dates and deadlines in one place.
            </p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            {/* Admin interview count badge */}
            {adminCount > 0 && (
              <span style={{
                background:'rgba(240,180,41,0.15)', color:'#f0b429',
                border:'0.5px solid rgba(240,180,41,0.4)',
                borderRadius:8, padding:'5px 10px', fontSize:12, fontWeight:600,
              }}>
                {adminCount} admin-scheduled
              </span>
            )}
            {adminLoading && (
              <span style={{ fontSize:11, color:C.muted }}>Syncing…</span>
            )}
            <button type="button" onClick={() => setShowModal(true)}
              style={{ display:'flex', alignItems:'center', gap:6, background:C.accent, color:'#fff',
                border:'none', borderRadius:9, padding:'8px 14px', fontSize:13, fontWeight:600, cursor:'pointer' }}>
              + Add event
            </button>
          </div>
        </div>

        {/* ── Two-column layout ── */}
        <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', gap:20, alignItems:'start' }}>

          {/* Left — Mini calendar */}
          <MiniCalendar
            year={calYear} month={calMonth} selectedDay={selDay}
            events={allEvents} onPrev={prevMonth} onNext={nextMonth}
            onSelectDay={d => setSelDay(prev => prev===d ? null : d)}
          />

          {/* Right — Event list */}
          <div style={{ background: C.card, border:`0.5px solid ${C.border}`, borderRadius:14, overflow:'hidden', minHeight: 'calc(100vh - 180px)', display: 'flex', flexDirection: 'column' }}>

            {/* Filter tabs */}
            <div style={{ display:'flex', gap:6, padding:'12px 14px 10px', borderBottom:`0.5px solid ${C.border}` }}>
              {FILTERS.map(f => (
                <button key={f} type="button" onClick={() => setFilter(f)}
                  style={{ padding:'7px 16px', borderRadius:8, border:'1px solid transparent',
                    fontSize:14, fontWeight:500, cursor:'pointer',
                    background: filter===f ? C.accent : C.bg,
                    color:      filter===f ? '#fff'   : C.muted,
                    borderColor: filter===f ? C.accent : C.border }}>
                  {f}
                </button>
              ))}
            </div>

            {/* Events */}
            <div style={{ padding:'8px 0' }}>
              {visibleEvents.length === 0 ? (
                <p style={{ padding:'20px 14px', fontSize:13, color:C.dim, textAlign:'center' }}>
                  No events {selDay ? `on ${MONTHS[calMonth]} ${selDay}` : 'found'}.
                </p>
              ) : visibleEvents.map(ev => (
                <div key={ev.id} style={{ display:'flex', alignItems:'flex-start', gap:12,
                  padding:'10px 14px', borderBottom:`0.5px solid ${C.border}`,
                  background: ev.adminScheduled ? 'rgba(240,180,41,0.04)' : 'transparent' }}>

                  {/* Color strip */}
                  <div style={{ width:3, alignSelf:'stretch', borderRadius:4,
                    background: ev.adminScheduled ? '#f0b429' : TYPE_COLOR[ev.type], flexShrink:0 }} />

                  {/* Content */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:2 }}>
                      <span style={{ fontSize:16, fontWeight:600, color:C.text }}>{ev.company}</span>
                      <span style={{ fontSize:13, color:C.muted, whiteSpace:'nowrap' }}>{fmtDate(ev.date)}</span>
                    </div>
                    <span style={{ fontSize:14, color:C.muted }}>{ev.detail}</span>
                    <div style={{ marginTop:5, display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
                      {/* Type badge */}
                      <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20,
                        background:`${TYPE_COLOR[ev.type]}22`, color:TYPE_COLOR[ev.type] }}>
                        {ev.type}
                      </span>
                      {/* Admin-scheduled badge */}
                      {ev.adminScheduled && (
                        <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20,
                          background:'rgba(240,180,41,0.15)', color:'#f0b429' }}>
                          Admin scheduled
                        </span>
                      )}
                      {/* Status badge for admin interviews */}
                      {ev.status && ev.adminScheduled && (
                        <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20,
                          background: ev.status==='scheduled' ? 'rgba(88,166,255,0.14)' : ev.status==='completed' ? 'rgba(31,159,117,0.14)' : 'rgba(248,81,73,0.14)',
                          color: ev.status==='scheduled' ? '#58a6ff' : ev.status==='completed' ? '#1D9E75' : '#f85149' }}>
                          {ev.status}
                        </span>
                      )}
                      {/* Meeting link */}
                      {ev.meetingLink && (
                        <a href={ev.meetingLink} target="_blank" rel="noreferrer"
                          style={{ fontSize:11, color:C.accent, textDecoration:'none' }}>
                          Join meeting →
                        </a>
                      )}
                    </div>
                    {/* Notes */}
                    {ev.notes && (
                      <p style={{ margin:'4px 0 0', fontSize:11, color:C.dim, fontStyle:'italic' }}>
                        {ev.notes}
                      </p>
                    )}
                  </div>

                  {/* Days-away badge */}
                  <span style={{ fontSize:11, fontWeight:600, whiteSpace:'nowrap', paddingTop:2,
                    color: daysFromNow(ev.date).includes('ago') ? '#f85149' :
                           daysFromNow(ev.date) === 'Today' ? '#f0b429' : C.accent }}>
                    {daysFromNow(ev.date)}
                  </span>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div style={{ display:'flex', gap:14, padding:'10px 14px', borderTop:`0.5px solid ${C.border}`, flexWrap:'wrap' }}>
              {(['Interview','OA/Test','Deadline','Other'] as EventType[]).map(t => (
                <div key={t} style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <span style={{ width:8, height:8, borderRadius:'50%', background:TYPE_COLOR[t], display:'inline-block' }} />
                  <span style={{ fontSize:11, color:C.muted }}>{t}</span>
                </div>
              ))}
              <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                <span style={{ width:8, height:8, borderRadius:'50%', background:'#f0b429', display:'inline-block' }} />
                <span style={{ fontSize:11, color:C.muted }}>Admin scheduled</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showModal && <AddEventModal onAdd={addEvent} onClose={() => setShowModal(false)} />}
    </div>
  )
}
