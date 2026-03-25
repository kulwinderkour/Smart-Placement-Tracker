import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, Plus, X, Video, MapPin, Star, ChevronDown, Link } from 'lucide-react'
import { adminApi } from '../../api/admin'
import StatusBadge from '../../components/admin/StatusBadge'
import AdminLayout from '../../components/admin/AdminLayout'
import type { Interview, Job } from '../../types'

const MODE_LABELS: Record<string, string> = {
  google_meet: 'Google Meet',
  zoom: 'Zoom',
  offline: 'Offline',
}

const MODE_COLORS: Record<string, string> = {
  google_meet: '#4285F4',
  zoom: '#2D8CFF',
  offline: '#64748B',
}

function ScheduleSlideOver({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { data: appsData } = useQuery({
    queryKey: ['admin-applicants'],
    queryFn: () => adminApi.listApplicants(),
  })
  const { data: jobsData } = useQuery({
    queryKey: ['admin-jobs'],
    queryFn: () => adminApi.listJobs(1, 100),
  })

  const apps = appsData?.data?.data ?? []
  const jobs: Job[] = jobsData?.data?.data ?? []

  const [form, setForm] = useState({
    student_id: '',
    job_id: '',
    scheduled_at: '',
    mode: 'google_meet',
    meeting_link: '',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.student_id || !form.job_id || !form.scheduled_at) {
      setError('Student, Job, and Date/Time are required')
      return
    }
    setSubmitting(true); setError('')
    try {
      await adminApi.createInterview({
        student_id: form.student_id as unknown as Interview['student_id'],
        job_id: form.job_id as unknown as Interview['job_id'],
        scheduled_at: form.scheduled_at,
        mode: form.mode as Interview['mode'],
        meeting_link: form.meeting_link || undefined,
        notes: form.notes || undefined,
      })
      onSuccess()
      onClose()
    } catch {
      setError('Failed to schedule interview. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] sticky top-0 bg-white z-10">
          <h2 className="text-base font-bold text-[#0F172A]">Schedule Interview</h2>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#0F172A]"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1">
          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-lg">{error}</div>}

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Student *</span>
            <div className="relative">
              <select value={form.student_id} onChange={e => set('student_id', e.target.value)}
                className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 pr-8 text-sm text-[#0F172A] outline-none focus:border-[#3B82F6] appearance-none bg-white">
                <option value="">Select student…</option>
                {apps.map(a => <option key={a.student_id} value={a.student_id}>{a.student_name}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
            </div>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Job Role *</span>
            <div className="relative">
              <select value={form.job_id} onChange={e => set('job_id', e.target.value)}
                className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 pr-8 text-sm text-[#0F172A] outline-none focus:border-[#3B82F6] appearance-none bg-white">
                <option value="">Select job…</option>
                {jobs.map(j => <option key={j.id} value={j.id}>{j.role_title}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
            </div>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Date & Time *</span>
            <input type="datetime-local" value={form.scheduled_at} onChange={e => set('scheduled_at', e.target.value)}
              className="border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10" />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Mode</span>
            <div className="grid grid-cols-3 gap-2">
              {['google_meet', 'zoom', 'offline'].map(m => (
                <button key={m} type="button" onClick={() => set('mode', m)}
                  className={`py-2 px-2 rounded-lg text-xs font-semibold border transition-all ${
                    form.mode === m
                      ? 'bg-[#3B82F6] border-[#3B82F6] text-white'
                      : 'border-[#E2E8F0] text-[#64748B] hover:border-[#3B82F6] hover:text-[#3B82F6]'
                  }`}>
                  {MODE_LABELS[m]}
                </button>
              ))}
            </div>
          </label>

          {form.mode !== 'offline' && (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Meeting Link</span>
              <input value={form.meeting_link} onChange={e => set('meeting_link', e.target.value)}
                placeholder="https://meet.google.com/..."
                className="border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10 placeholder-[#CBD5E1]" />
            </label>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Notes</span>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3}
              placeholder="Interview instructions, topics to cover…"
              className="border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10 placeholder-[#CBD5E1] resize-none" />
          </label>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-[#E2E8F0] text-sm font-semibold text-[#64748B] hover:bg-[#F8FAFC] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 py-2.5 rounded-lg bg-[#3B82F6] text-sm font-semibold text-white hover:bg-[#2563EB] transition-colors disabled:opacity-60">
              {submitting ? 'Scheduling…' : 'Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function FeedbackModal({ interview, onClose }: { interview: Interview; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [rating, setRating] = useState(interview.feedback_rating ?? 0)
  const [comment, setComment] = useState(interview.feedback_comment ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await adminApi.updateInterview(interview.id, {
      status: 'completed',
      feedback_rating: rating,
      feedback_comment: comment,
    })
    queryClient.invalidateQueries({ queryKey: ['admin-interviews'] })
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
          <h2 className="text-base font-bold text-[#0F172A]">Interview Feedback</h2>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#0F172A]"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="bg-[#F8FAFC] rounded-xl p-4">
            <p className="text-xs text-[#94A3B8] mb-0.5">Interview For</p>
            <p className="font-semibold text-[#0F172A]">{interview.student_name}</p>
            <p className="text-sm text-[#64748B]">{interview.role_title}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">Rating</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setRating(n)}
                  className="transition-transform hover:scale-110">
                  <Star size={28} fill={n <= rating ? '#F59E0B' : 'none'} className={n <= rating ? 'text-amber-400' : 'text-[#CBD5E1]'} />
                </button>
              ))}
              {rating > 0 && <span className="ml-1 text-sm font-semibold text-[#64748B] self-center">{rating}/5</span>}
            </div>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Comments</span>
            <textarea value={comment} onChange={e => setComment(e.target.value)} rows={4}
              placeholder="How did the interview go? Any highlights or concerns?"
              className="border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10 placeholder-[#CBD5E1] resize-none" />
          </label>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-[#E2E8F0] text-sm font-semibold text-[#64748B] hover:bg-[#F8FAFC] transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={saving || rating === 0}
              className="flex-1 py-2.5 rounded-lg bg-[#3B82F6] text-sm font-semibold text-white hover:bg-[#2563EB] disabled:opacity-60 transition-colors">
              {saving ? 'Saving…' : 'Save Feedback'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminInterviews() {
  const queryClient = useQueryClient()
  const [showSchedule, setShowSchedule] = useState(false)
  const [feedbackInterview, setFeedbackInterview] = useState<Interview | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-interviews'],
    queryFn: () => adminApi.listInterviews(),
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => adminApi.updateInterview(id, { status: 'cancelled' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-interviews'] }),
  })

  const interviews: Interview[] = data?.data?.data ?? []

  return (
    <AdminLayout>
      <div className="p-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold text-[#0F172A]">Interviews</h1>
            <p className="text-sm text-[#64748B] mt-0.5">{interviews.length} scheduled</p>
          </div>
          <button onClick={() => setShowSchedule(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#3B82F6] text-white text-sm font-semibold rounded-lg hover:bg-[#2563EB] transition-colors shadow-sm">
            <Plus size={16} /> Schedule Interview
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                  <th className="px-5 py-3">Student</th>
                  <th className="px-5 py-3">Job Role</th>
                  <th className="px-5 py-3">Date & Time</th>
                  <th className="px-5 py-3">Mode</th>
                  <th className="px-5 py-3">Link</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Rating</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i} className="border-b border-[#F1F5F9]">
                      {[...Array(8)].map((__, j) => (
                        <td key={j} className="px-5 py-3"><div className="h-4 bg-[#F1F5F9] rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : interviews.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-16 text-center">
                      <CalendarDays size={36} className="mx-auto mb-3 text-[#CBD5E1]" />
                      <p className="text-sm text-[#94A3B8] font-medium">No interviews scheduled</p>
                    </td>
                  </tr>
                ) : interviews.map((iv, i) => (
                  <tr key={iv.id} className={`border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors ${i === interviews.length - 1 ? 'border-b-0' : ''}`}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[#3B82F6] text-xs font-bold">
                          {iv.student_name?.[0]?.toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-[#0F172A]">{iv.student_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-[#374151]">{iv.role_title}</td>
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-[#0F172A]">
                        {new Date(iv.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <p className="text-xs text-[#94A3B8]">
                        {new Date(iv.scheduled_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: MODE_COLORS[iv.mode] }}>
                        {iv.mode === 'offline' ? <MapPin size={13} /> : <Video size={13} />}
                        {MODE_LABELS[iv.mode]}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {iv.meeting_link ? (
                        <a href={iv.meeting_link} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-[#3B82F6] hover:underline font-medium">
                          <Link size={11} /> Join
                        </a>
                      ) : <span className="text-xs text-[#CBD5E1]">—</span>}
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={iv.status} /></td>
                    <td className="px-5 py-3">
                      {iv.feedback_rating ? (
                        <div className="flex items-center gap-1">
                          <Star size={13} fill="#F59E0B" className="text-amber-400" />
                          <span className="text-xs font-semibold text-[#374151]">{iv.feedback_rating}/5</span>
                        </div>
                      ) : <span className="text-xs text-[#CBD5E1]">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {iv.status === 'scheduled' && (
                          <>
                            <button onClick={() => setFeedbackInterview(iv)}
                              className="text-xs font-semibold text-[#3B82F6] hover:underline">
                              Feedback
                            </button>
                            <button onClick={() => cancelMutation.mutate(iv.id)}
                              className="text-xs font-semibold text-red-400 hover:underline">
                              Cancel
                            </button>
                          </>
                        )}
                        {iv.status === 'completed' && !iv.feedback_rating && (
                          <button onClick={() => setFeedbackInterview(iv)}
                            className="text-xs font-semibold text-amber-500 hover:underline">
                            Add Feedback
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showSchedule && (
        <ScheduleSlideOver
          onClose={() => setShowSchedule(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['admin-interviews'] })}
        />
      )}
      {feedbackInterview && (
        <FeedbackModal interview={feedbackInterview} onClose={() => setFeedbackInterview(null)} />
      )}
    </AdminLayout>
  )
}
