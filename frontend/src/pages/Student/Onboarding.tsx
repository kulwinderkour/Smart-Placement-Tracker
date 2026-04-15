import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../store/authStore'
import { authApi } from '../../api/auth'
import { studentApi } from '../../api/student'

// ─── Types ────────────────────────────────────────────────────────────────────
interface PastApp { company: string; status: string }
interface OnboardingData {
  fullName: string; college: string; branch: string; cgpa: string; graduationYear: string
  skills: string[]; jobType: string
  resumeName: string; resumeBase64: string
  hasExperience: boolean; previousCompanies: PastApp[]
}

// ─── Stepper ──────────────────────────────────────────────────────────────────
const STEPS = ['Basic Info', 'Skills', 'Resume', 'Experience', 'Done']

function Stepper({ current }: { current: number }) {
  return (
    <div className="w-full mb-8 select-none">
      <div className="hidden sm:flex items-center w-full">
        {STEPS.map((label, i) => {
          const step = i + 1; const done = step < current; const active = step === current
          return (
            <div key={step} className="flex items-center" style={{ flex: i < STEPS.length - 1 ? 1 : undefined }}>
              <div className="flex flex-col items-center" style={{ minWidth: 44 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: done || active ? '#7c3aed' : 'rgba(255,255,255,0.1)',
                  border: active ? '2px solid #a78bfa' : done ? '2px solid #7c3aed' : '2px solid rgba(255,255,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.3s', boxShadow: active ? '0 0 12px rgba(124,58,237,0.5)' : 'none'
                }}>
                  {done
                    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    : <span style={{ color: active ? '#fff' : 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 700 }}>{step}</span>
                  }
                </div>
                <span style={{ fontSize: 10, color: active || done ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)', marginTop: 6, fontWeight: active ? 600 : 400, whiteSpace: 'nowrap' }}>{label}</span>
              </div>
              {i < STEPS.length - 1 && <div style={{ flex: 1, height: 1, margin: '0 4px', marginBottom: 18, background: done ? '#7c3aed' : 'rgba(255,255,255,0.1)', transition: 'background 0.3s' }} />}
            </div>
          )
        })}
      </div>
      {/* Mobile compact */}
      <div className="flex sm:hidden items-center gap-3">
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#7c3aed', border: '2px solid #a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 12px rgba(124,58,237,0.5)' }}>
          <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>{current}</span>
        </div>
        <div>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: 0 }}>Step {current} of 5</p>
          <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, margin: 0 }}>{STEPS[current - 1]}</p>
        </div>
        <div className="flex-1 flex gap-1 ml-2">
          {STEPS.map((_, i) => <div key={i} style={{ flex: 1, height: 3, borderRadius: 99, background: i < current ? '#7c3aed' : 'rgba(255,255,255,0.1)', transition: 'background 0.3s' }} />)}
        </div>
      </div>
    </div>
  )
}

// ─── Styled Inputs ────────────────────────────────────────────────────────────
const inputBase: React.CSSProperties = {
  width: '100%', background: '#0e0e2a', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10, padding: '12px 16px', color: '#fff', fontSize: 14,
  outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s, box-shadow 0.2s',
  fontFamily: 'DM Sans, sans-serif',
}
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginBottom: 6, display: 'block' }

function StyledInput({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input {...props} style={{ ...inputBase, borderColor: focused ? '#7c3aed' : 'rgba(255,255,255,0.1)', boxShadow: focused ? '0 0 0 3px rgba(124,58,237,0.2)' : 'none' }}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
    </div>
  )
}


function SelectionRow({ index, label, selected, onClick }: { index: number; label: string; selected: boolean; onClick: () => void }) {
  return (
    <motion.div onClick={onClick} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
      style={{ background: selected ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${selected ? '#7c3aed' : 'rgba(255,255,255,0.08)'}`, borderRadius: 50, padding: '13px 20px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', marginBottom: 10, transition: 'background 0.15s, border-color 0.15s' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: selected ? '#7c3aed' : 'rgba(255,255,255,0.08)', color: selected ? '#fff' : 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}>
        {selected ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg> : index}
      </div>
      <span style={{ color: selected ? '#fff' : 'rgba(255,255,255,0.75)', fontSize: 15, fontWeight: selected ? 600 : 400 }}>{label}</span>
    </motion.div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Onboarding() {
  const navigate = useNavigate()
  const { updateUser } = useAuthStore()
  const [currentStep, setCurrentStep] = useState(1)
  const [dragging, setDragging] = useState(false)
  const [dynamicSkills, setDynamicSkills] = useState<string[]>([])
  const [loadingSkills, setLoadingSkills] = useState(false)
  const [customSkillInput, setCustomSkillInput] = useState('')

  const [data, setData] = useState<OnboardingData>({
    fullName: '', college: '', branch: '', cgpa: '', graduationYear: '',
    skills: [], jobType: '',
    resumeName: '', resumeBase64: '',
    hasExperience: false, previousCompanies: [{ company: '', status: 'Applied' }],
  })

  const update = (fields: Partial<OnboardingData>) => setData(prev => ({ ...prev, ...fields }))

  const toggleSkill = (s: string) => update({ skills: data.skills.includes(s) ? data.skills.filter(x => x !== s) : [...data.skills, s] })

  const handleResumeFile = (file: File) => {
    if (!file || file.type !== 'application/pdf') return
    const reader = new FileReader()
    reader.onload = e => update({ resumeName: file.name, resumeBase64: e.target?.result as string })
    reader.readAsDataURL(file)
  }

  useEffect(() => {
    if (currentStep === 5) {
      // Mark onboarding as completed
      authApi.completeOnboarding()
        .then(() => updateUser({ is_onboarding_completed: true }))
        .catch(() => {})
      
      // Save profile data to backend
      studentApi.updateProfile({
        full_name: data.fullName,
        college: data.college,
        branch: data.branch,
        cgpa: data.cgpa ? parseFloat(data.cgpa) : undefined,
        graduation_year: data.graduationYear ? parseInt(data.graduationYear) : undefined,
        skills: data.skills,
        job_type: data.jobType,
        resume_name: data.resumeName,
        resume_base64: data.resumeBase64
      }).then(res => {
        localStorage.setItem('userProfile', JSON.stringify(res.data))
      }).catch(err => {
        console.error('Failed to sync profile to backend:', err)
        localStorage.setItem('userProfile', JSON.stringify(data))
      })
      const t = setTimeout(() => navigate('/dashboard'), 2800)
      return () => clearTimeout(t)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep])

  useEffect(() => {
    if (data.branch) {
      setLoadingSkills(true)
      fetch(`http://localhost:8081/api/skills/suggestions?field=${data.branch}`)
        .then(res => res.json())
        .then(resData => {
          setDynamicSkills(resData.suggestions || [])
        })
        .catch(() => setDynamicSkills(['React', 'Python', 'Java', 'Node.js', 'SQL', 'DSA']))
        .finally(() => setLoadingSkills(false))
    }
  }, [data.branch])

  const handleNext = () => { if (currentStep < 5) setCurrentStep(p => p + 1) }
  const handleBack = () => { if (currentStep > 1) setCurrentStep(p => p - 1) }

  const JOB_TYPES = ['Internship', 'Full-time', 'Both']

  return (
    <div style={{ minHeight: '100vh', width: '100%', background: '#07071a', backgroundImage: `repeating-linear-gradient(15deg,rgba(255,255,255,0.015) 0px,rgba(255,255,255,0.015) 1px,transparent 1px,transparent 60px)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif', padding: '100px 16px 40px', boxSizing: 'border-box' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap'); ::placeholder{color:rgba(255,255,255,0.25)!important} select option{background:#0e0e2a;color:#fff} *{box-sizing:border-box}`}</style>

      {/* Navbar */}
      <nav style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 100, display: 'flex', alignItems: 'center', gap: 20, borderRadius: 50, padding: '10px 24px', background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
          </div>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>SmartPlacement</span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5">
          {[1,2,3,4,5].map(s => <div key={s} style={{ width: 6, height: 6, borderRadius: '50%', background: s <= currentStep ? '#7c3aed' : 'rgba(255,255,255,0.2)', transition: 'background 0.3s' }} />)}
        </div>
        <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }} className="hidden sm:block">Step {currentStep} of 5</span>
      </nav>

      {/* Card */}
      <div style={{ width: '100%', maxWidth: 480, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: 20, padding: '36px 44px' }}>
        <Stepper current={currentStep} />
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', marginBottom: 28 }} />

        <AnimatePresence mode="wait">
          <motion.div key={currentStep} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.28, ease: 'easeOut' }} style={{ minHeight: 320 }}>

            {/* ── STEP 1: Basic Info ── */}
            {currentStep === 1 && (
              <div>
                <h2 style={{ color: '#fff', fontSize: 24, fontWeight: 700, margin: '0 0 6px', lineHeight: 1.2 }}>Create Your Profile</h2>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: '0 0 20px', lineHeight: 1.6 }}>Tell us about yourself to personalise your SmartPlacement experience</p>
                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', marginBottom: 20 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <StyledInput label="Full Name" placeholder="e.g. Kulwinder Kour" value={data.fullName} onChange={e => update({ fullName: e.target.value })} />
                  <StyledInput label="College / University" placeholder="e.g. Chandigarh University" value={data.college} onChange={e => update({ college: e.target.value })} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <StyledInput label="Branch" placeholder="e.g. Computer Science" value={data.branch} onChange={e => update({ branch: e.target.value })} />
                    <StyledInput label="CGPA" type="number" placeholder="e.g. 8.5" min="0" max="10" step="0.01" value={data.cgpa} onChange={e => update({ cgpa: e.target.value })} />
                  </div>
                  <StyledInput label="Graduation Year" type="number" placeholder="e.g. 2026" min="2000" max="2035" value={data.graduationYear} onChange={e => update({ graduationYear: e.target.value })} />
                </div>
              </div>
            )}

            {/* ── STEP 2: Skills ── */}
            {currentStep === 2 && (
              <div>
                <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>What skills do you bring?</h2>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, margin: '0 0 16px' }}>Select all that apply — we'll use this to match you with the best jobs.</p>
                {data.skills.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                    {data.skills.map(s => <span key={s} style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.5)', color: '#c4b5fd', borderRadius: 50, padding: '4px 14px', fontSize: 13 }}>{s}</span>)}
                  </div>
                )}
                {loadingSkills ? (
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, padding: '20px', textAlign: 'center' }}>Loading suggested skills for {data.branch}...</div>
                ) : (
                  <div style={{ maxHeight: '200px', overflowY: 'auto', paddingRight: '8px' }}>
                    {dynamicSkills.map((s, i) => <SelectionRow key={s} index={i + 1} label={s} selected={data.skills.includes(s)} onClick={() => toggleSkill(s)} />)}
                        {dynamicSkills.length === 0 && <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, textAlign: 'center' }}>Select a branch to see skill suggestions</div>}
                  </div>
                )}
                <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                  <input
                    value={customSkillInput}
                    onChange={e => setCustomSkillInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const s = customSkillInput.trim()
                        if (s && !data.skills.includes(s)) toggleSkill(s)
                        setCustomSkillInput('')
                      }
                    }}
                    placeholder="Add a custom skill…"
                    style={{ ...inputBase, flex: 1, fontSize: 13 }}
                  />
                  <button
                    onClick={() => {
                      const s = customSkillInput.trim()
                      if (s && !data.skills.includes(s)) toggleSkill(s)
                      setCustomSkillInput('')
                    }}
                    style={{ height: 44, padding: '0 18px', borderRadius: 10, background: customSkillInput.trim() ? '#7c3aed' : 'rgba(255,255,255,0.06)', border: `1px solid ${customSkillInput.trim() ? '#7c3aed' : 'rgba(255,255,255,0.12)'}`, color: customSkillInput.trim() ? '#fff' : 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: 600, cursor: customSkillInput.trim() ? 'pointer' : 'default', transition: 'all 0.15s', whiteSpace: 'nowrap', fontFamily: 'DM Sans, sans-serif' }}
                  >+ Add</button>
                </div>
                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', margin: '20px 0 16px' }} />
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Looking for</p>
                {JOB_TYPES.map((t, i) => <SelectionRow key={t} index={i + 1} label={t} selected={data.jobType === t} onClick={() => update({ jobType: t })} />)}
              </div>
            )}

            {/* ── STEP 3: Resume ── */}
            {currentStep === 3 && (
              <div>
                <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Upload your resume</h2>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, margin: '0 0 24px' }}>Upload your PDF resume to complete your profile.</p>
                <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: `1.5px dashed ${dragging ? '#7c3aed' : 'rgba(255,255,255,0.15)'}`, borderRadius: 16, padding: '40px 24px', cursor: 'pointer', textAlign: 'center', background: dragging ? 'rgba(124,58,237,0.05)' : 'transparent', transition: 'all 0.2s' }}
                  onDragOver={e => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)}
                  onDrop={e => { e.preventDefault(); setDragging(false); handleResumeFile(e.dataTransfer.files[0]) }}>
                  <input type="file" style={{ display: 'none' }} accept=".pdf" onChange={e => { if (e.target.files?.[0]) handleResumeFile(e.target.files[0]) }} />
                  <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }} style={{ marginBottom: 16 }}>
                    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
                    </svg>
                  </motion.div>
                  <p style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 500, marginBottom: 4, fontSize: 14 }}>Drag & drop your PDF here</p>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>or click to browse</p>
                </label>
                <AnimatePresence>
                  {data.resumeName && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 16px' }}>
                        <div style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid #10b981', borderRadius: 8, padding: 6, display: 'flex' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <p style={{ color: '#fff', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{data.resumeName}</p>
                        </div>
                        <button
                          onClick={() => update({ resumeName: '', resumeBase64: '' })}
                          aria-label="Remove uploaded resume"
                          title="Remove uploaded resume"
                          style={{ color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* ── STEP 4: Experience ── */}
            {currentStep === 4 && (
              <div>
                <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Any prior applications?</h2>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, margin: '0 0 24px' }}>Help us understand where you stand in your placement journey.</p>
                <SelectionRow index={1} label="Yes, I've applied before" selected={data.hasExperience === true} onClick={() => update({ hasExperience: true })} />
                <SelectionRow index={2} label="No, this is my first time" selected={data.hasExperience === false && data.previousCompanies.length === 0} onClick={() => update({ hasExperience: false, previousCompanies: [] })} />
                <AnimatePresence>
                  {data.hasExperience && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginTop: 16 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {data.previousCompanies.map((app, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <input placeholder="Company name" value={app.company}
                              onChange={e => { const a = [...data.previousCompanies]; a[idx].company = e.target.value; update({ previousCompanies: a }) }}
                              style={{ ...inputBase, flex: 1 }} />
                            <div style={{ position: 'relative' }}>
                              <select value={app.status}
                                onChange={e => { const a = [...data.previousCompanies]; a[idx].status = e.target.value; update({ previousCompanies: a }) }}
                                aria-label="Application status"
                                style={{ ...inputBase, width: 130, paddingRight: 30, appearance: 'none', cursor: 'pointer' }}>
                                {['Applied','Interviewed','Offered','Rejected'].map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                              <svg style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'rgba(255,255,255,0.4)' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                            </div>
                            <button
                              onClick={() => update({ previousCompanies: data.previousCompanies.filter((_, i) => i !== idx) })}
                              aria-label="Remove previous company entry"
                              title="Remove previous company entry"
                              style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                            </button>
                          </div>
                        ))}
                        <button onClick={() => update({ previousCompanies: [...data.previousCompanies, { company: '', status: 'Applied' }] })}
                          style={{ background: 'none', border: '1px solid rgba(124,58,237,0.4)', borderRadius: 10, padding: '10px 16px', color: '#a78bfa', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add another
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* ── STEP 5: Done ── */}
            {currentStep === 5 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px 0 10px' }}>
                <div style={{ position: 'relative', marginBottom: 28 }}>
                  <div style={{ position: 'absolute', inset: 0, background: '#7c3aed', borderRadius: '50%', filter: 'blur(24px)', opacity: 0.3 }} />
                  <svg width="88" height="88" viewBox="0 0 100 100" style={{ position: 'relative', zIndex: 1 }}>
                    <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(124,58,237,0.25)" strokeWidth="5" />
                    <motion.circle cx="50" cy="50" r="44" fill="none" stroke="#7c3aed" strokeWidth="5" strokeLinecap="round" strokeDasharray="276" initial={{ strokeDashoffset: 276 }} animate={{ strokeDashoffset: 0 }} transition={{ duration: 1.2, ease: 'easeInOut' }} />
                    <motion.path d="M30 52 L44 66 L70 34" fill="none" stroke="#7c3aed" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="80" initial={{ strokeDashoffset: 80 }} animate={{ strokeDashoffset: 0 }} transition={{ duration: 0.6, delay: 1, ease: 'easeOut' }} />
                  </svg>
                </div>
                <h2 style={{ color: '#fff', fontSize: 28, fontWeight: 700, margin: '0 0 10px' }}>You're all set!</h2>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, margin: '0 0 32px' }}>Redirecting you to your dashboard...</p>
                <div style={{ width: '100%', height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                  <motion.div style={{ height: '100%', background: '#7c3aed', borderRadius: 99, boxShadow: '0 0 12px rgba(124,58,237,0.7)' }} initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: 2.5, ease: 'easeInOut' }} />
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                  {[0, 0.2, 0.4].map((delay, i) => <motion.div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#7c3aed' }} animate={{ y: [-4, 4, -4] }} transition={{ repeat: Infinity, duration: 1.2, delay }} />)}
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>

        {/* Nav Buttons */}
        {currentStep < 5 && (
          <div style={{ marginTop: 32, display: 'flex', gap: 12, alignItems: 'center' }}>
            {currentStep > 1 && (
              <button onClick={handleBack} style={{ height: 44, padding: '0 20px', borderRadius: 10, background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                ← Back
              </button>
            )}
            <button onClick={handleNext} style={{ flex: 1, height: 44, borderRadius: 10, background: '#7c3aed', border: 'none', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', boxShadow: '0 4px 16px rgba(124,58,237,0.35)', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#6d28d9'; e.currentTarget.style.boxShadow = '0 6px 22px rgba(124,58,237,0.5)' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#7c3aed'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(124,58,237,0.35)' }}>
              {currentStep === 4 ? 'Finish & Launch →' : 'Continue →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
