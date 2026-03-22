import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

export default function Onboarding() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  
  // Form State
  const [fullName, setFullName] = useState('')
  const [college, setCollege] = useState('')
  const [branch, setBranch] = useState('')
  const [cgpa, setCgpa] = useState('')
  const [gradYear, setGradYear] = useState('')
  
  const [skills, setSkills] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState('')
  const [jobType, setJobType] = useState('Both')
  
  const [file, setFile] = useState<File | null>(null)
  const [hasPriorApps, setHasPriorApps] = useState(false)
  const [pastApps, setPastApps] = useState([{ company: '', status: 'Applied' }])

  const suggestedSkills = ['React', 'Python', 'Java', 'SQL', 'Node.js', 'DSA']

  useEffect(() => {
    if (currentStep === 5) {
      // Save logic
      localStorage.setItem('onboardingComplete', 'true')
      const timer = setTimeout(() => {
        navigate('/dashboard')
      }, 2500)
      return () => clearTimeout(timer)
    }
  }, [currentStep, navigate])

  const handleNext = () => {
    if (currentStep < 5) setCurrentStep(prev => prev + 1)
  }

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1)
  }

  const handleAddSkill = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && skillInput.trim() !== '') {
      if (!skills.includes(skillInput.trim())) setSkills([...skills, skillInput.trim()])
      setSkillInput('')
    }
  }

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter(s => s !== skillToRemove))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  return (
    <div 
      className="min-h-screen w-full flex flex-col font-['DM_Sans',sans-serif] selection:bg-purple-500/30 overflow-hidden relative"
      style={{
        backgroundColor: '#07071a',
        backgroundImage: 'repeating-linear-gradient(15deg, transparent, transparent 40px, rgba(255,255,255,0.02) 40px, rgba(255,255,255,0.02) 41px)'
      }}
    >
      {/* NAVBAR */}
      <nav style={{
        position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
        width: 'calc(100% - 48px)', maxWidth: 1100, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 20px 10px 16px', borderRadius: 100,
        background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 4px 32px rgba(0,0,0,0.25)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'linear-gradient(135deg, #7c3aed, #5b21b6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>
          </div>
          <span style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 22, color: '#fff', letterSpacing: '-0.01em' }}>SmartPlacement</span>
        </div>
        
        <div className="hidden sm:flex text-[14px] font-medium text-white/70">
          Steps Indicator
        </div>
        
        <div style={{ width: 150 }} className="hidden sm:block" />
      </nav>

      {/* MAIN CONTAINER */}
      <div className="flex-1 w-full max-w-[560px] mx-auto flex items-center justify-center p-6 mt-20 relative z-10">
        
        <div 
          className="w-full relative shadow-2xl transition-all"
          style={{
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 20,
            overflow: 'hidden'
          }}
        >
          {/* Progress Bar */}
          <div className="flex w-full h-[3px] bg-white/5">
            {[1, 2, 3, 4, 5].map((step) => (
              <div 
                key={step} 
                className="flex-1 transition-all duration-300 h-full border-r border-[#07071a]" 
                style={{ 
                  background: currentStep >= step ? '#7c3aed' : 'transparent',
                  boxShadow: currentStep >= step ? '0 0 8px #7c3aed88' : 'none'
                }} 
              />
            ))}
          </div>

          <div className="p-8 sm:p-10">
            {/* Step Label Tracker */}
            <div className="text-[12px] font-medium text-white/40 mb-8 tracking-wide uppercase">
              {currentStep === 1 && "Step 1 of 5 — Who are you?"}
              {currentStep === 2 && "Step 2 of 5 — Skills & Interests"}
              {currentStep === 3 && "Step 3 of 5 — Your Resume"}
              {currentStep === 4 && "Step 4 of 5 — Past Experience"}
              {currentStep === 5 && "Step 5 of 5 — All Set!"}
            </div>

            <div className="min-h-[360px] relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="w-full"
                >
                  {/* STEP 1 */}
                  {currentStep === 1 && (
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-[#7c3aed] font-bold text-sm bg-[#7c3aed]/10 px-2 py-1 rounded-md">· 01</span>
                        <h2 className="text-3xl font-bold text-white font-['Sora',sans-serif]">Let's get to know you</h2>
                      </div>
                      <p className="text-white/55 mb-8 text-[15px]">Tell us a bit about yourself to personalize your experience.</p>
                      
                      <div className="space-y-4">
                        <div>
                          <input type="text" placeholder="Full Name" value={fullName} onChange={e => setFullName(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-all" />
                        </div>
                        <div>
                          <input type="text" placeholder="College / University" value={college} onChange={e => setCollege(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-all" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <select value={branch} onChange={e => setBranch(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] appearance-none transition-all">
                            <option value="" disabled className="bg-[#0f111a]">Branch</option>
                            <option value="CSE" className="bg-[#0f111a]">CSE</option>
                            <option value="IT" className="bg-[#0f111a]">IT</option>
                            <option value="ECE" className="bg-[#0f111a]">ECE</option>
                            <option value="Mechanical" className="bg-[#0f111a]">Mechanical</option>
                            <option value="Civil" className="bg-[#0f111a]">Civil</option>
                            <option value="Other" className="bg-[#0f111a]">Other</option>
                          </select>
                          <input type="number" placeholder="CGPA (0-10)" min="0" max="10" step="0.01" value={cgpa} onChange={e => setCgpa(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-all" />
                        </div>
                        <div>
                          <select value={gradYear} onChange={e => setGradYear(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] appearance-none transition-all">
                            <option value="" disabled className="bg-[#0f111a]">Graduation Year</option>
                            <option value="2024" className="bg-[#0f111a]">2024</option>
                            <option value="2025" className="bg-[#0f111a]">2025</option>
                            <option value="2026" className="bg-[#0f111a]">2026</option>
                            <option value="2027" className="bg-[#0f111a]">2027</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 2 */}
                  {currentStep === 2 && (
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-[#7c3aed] font-bold text-sm bg-[#7c3aed]/10 px-2 py-1 rounded-md">· 02</span>
                        <h2 className="text-3xl font-bold text-white font-['Sora',sans-serif]">What do you bring to the table?</h2>
                      </div>
                      <p className="text-white/55 mb-8 text-[15px]">Add your tech skills and tell us what kind of role you're after.</p>

                      <div className="mb-6">
                        <label className="block text-sm font-medium text-white/70 mb-2">Your Skills</label>
                        <div className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-3 flex flex-wrap gap-2 focus-within:border-[#7c3aed] focus-within:ring-1 focus-within:ring-[#7c3aed] transition-all">
                          {skills.map((skill, i) => (
                            <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#7c3aed]/50 bg-[#7c3aed]/10 text-white text-sm">
                              {skill}
                              <button onClick={() => handleRemoveSkill(skill)} className="text-white/50 hover:text-white mt-0.5">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                              </button>
                            </span>
                          ))}
                          <input 
                            type="text" 
                            className="flex-1 min-w-[120px] bg-transparent text-white outline-none placeholder-white/30 text-sm py-1.5 px-1" 
                            placeholder={skills.length === 0 ? "Type a skill and press Enter..." : "Add more..."}
                            value={skillInput}
                            onChange={(e) => setSkillInput(e.target.value)}
                            onKeyDown={handleAddSkill}
                          />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="text-white/40 text-xs py-1">Suggested:</span>
                          {suggestedSkills.map(s => (
                            <button key={s} onClick={() => !skills.includes(s) && setSkills([...skills, s])}
                              className="text-xs text-white/60 bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-full border border-white/10 transition-colors">
                              + {s}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white/70 mb-3">Looking for</label>
                        <div className="flex bg-white/5 p-1 rounded-full border border-white/10">
                          {['Internship', 'Full-time', 'Both'].map(type => (
                            <button
                              key={type}
                              onClick={() => setJobType(type)}
                              className={`flex-1 py-2.5 text-sm font-medium rounded-full transition-all duration-300 ${jobType === type ? 'bg-gradient-to-r from-[#7c3aed] to-[#5b21b6] text-white shadow-lg' : 'text-white/60 hover:text-white'}`}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 3 */}
                  {currentStep === 3 && (
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-[#7c3aed] font-bold text-sm bg-[#7c3aed]/10 px-2 py-1 rounded-md">· 03</span>
                        <h2 className="text-3xl font-bold text-white font-['Sora',sans-serif]">Upload your resume</h2>
                      </div>
                      <p className="text-white/55 mb-8 text-[15px]">We'll analyse it and give you an ATS score instantly.</p>

                      <label className="relative flex flex-col items-center justify-center w-full h-[200px] rounded-[16px] cursor-pointer hover:bg-white/[0.03] transition-colors"
                        style={{ border: '2px dashed rgba(255,255,255,0.12)' }}>
                        <input type="file" className="hidden" accept=".pdf" onChange={handleFileChange} />
                        <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }} className="mb-4">
                          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                        </motion.div>
                        <p className="text-white/80 font-medium mb-1 text-sm">Drag & drop your PDF here</p>
                        <p className="text-white/40 text-sm">or click to browse</p>
                      </label>

                      {file && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 flex flex-col gap-3">
                          <div className="flex items-center justify-between bg-white/[0.04] border border-white/10 rounded-xl p-3">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="bg-[#34d399]/20 p-2 rounded-lg text-[#34d399]">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                              </div>
                              <div>
                                <p className="text-white text-sm font-medium truncate max-w-[200px]">{file.name}</p>
                                <p className="text-white/40 text-[11px] mt-0.5">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                              </div>
                            </div>
                          </div>
                          <div className="bg-[#0f766e]/20 border border-[#0d9488]/30 px-4 py-2.5 rounded-xl flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-[#2dd4bf] shadow-[0_0_8px_#2dd4bf]"></div>
                             <span className="text-[#2dd4bf] text-sm font-medium">ATS pre-check: Looks good!</span>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  )}

                  {/* STEP 4 */}
                  {currentStep === 4 && (
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-[#7c3aed] font-bold text-sm bg-[#7c3aed]/10 px-2 py-1 rounded-md">· 04</span>
                        <h2 className="text-3xl font-bold text-white font-['Sora',sans-serif]">Any prior applications?</h2>
                      </div>
                      <p className="text-white/55 mb-8 text-[15px]">Help us understand where you stand in your placement journey.</p>
                      
                      <div className="flex items-center justify-between bg-white/[0.03] border border-white/10 rounded-2xl p-4 mb-6 cursor-pointer" onClick={() => setHasPriorApps(!hasPriorApps)}>
                        <span className="text-white font-medium">I have applied to jobs recently</span>
                        <div className={`w-12 h-7 flex items-center rounded-full p-1 transition-colors duration-300 ${hasPriorApps ? 'bg-[#7c3aed]' : 'bg-white/10'}`}>
                          <motion.div layout className="bg-white w-5 h-5 rounded-full shadow-sm" animate={{ x: hasPriorApps ? 20 : 0 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
                        </div>
                      </div>

                      <AnimatePresence>
                        {hasPriorApps && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-4 overflow-hidden">
                            {pastApps.map((app, index) => (
                              <div key={index} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                                <input type="text" placeholder="Company Name" value={app.company} 
                                  onChange={(e) => {
                                    const newApps = [...pastApps]
                                    newApps[index].company = e.target.value
                                    setPastApps(newApps)
                                  }}
                                  className="flex-1 w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-[#7c3aed] transition-all" />
                                
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                  <select value={app.status} 
                                    onChange={(e) => {
                                      const newApps = [...pastApps]
                                      newApps[index].status = e.target.value
                                      setPastApps(newApps)
                                    }}
                                    className={`w-full sm:w-[140px] text-sm appearance-none border rounded-xl px-4 py-3 focus:outline-none transition-all
                                      ${app.status === 'Applied' ? 'bg-[#3b82f6]/10 border-[#3b82f6]/30 text-[#60a5fa]' : ''}
                                      ${app.status === 'Interviewed' ? 'bg-[#f59e0b]/10 border-[#f59e0b]/30 text-[#fbbf24]' : ''}
                                      ${app.status === 'Offered' ? 'bg-[#10b981]/10 border-[#10b981]/30 text-[#34d399]' : ''}
                                      ${app.status === 'Rejected' ? 'bg-[#ef4444]/10 border-[#ef4444]/30 text-[#f87171]' : ''}
                                    `}>
                                    <option value="Applied" className="bg-[#0f111a] text-white">Applied</option>
                                    <option value="Interviewed" className="bg-[#0f111a] text-white">Interviewed</option>
                                    <option value="Offered" className="bg-[#0f111a] text-white">Offered</option>
                                    <option value="Rejected" className="bg-[#0f111a] text-white">Rejected</option>
                                  </select>
                                  <button onClick={() => setPastApps(pastApps.filter((_, i) => i !== index))} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-white/50 hover:text-red-400 transition-colors">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                                  </button>
                                </div>
                              </div>
                            ))}
                            <button onClick={() => setPastApps([...pastApps, { company: '', status: 'Applied' }])}
                              className="text-[#7c3aed] text-sm font-medium hover:text-[#9353d3] transition-colors mt-2 flex items-center gap-1.5">
                              + Add another
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* STEP 5 */}
                  {currentStep === 5 && (
                    <div className="flex flex-col items-center justify-center text-center py-10">
                      <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", damping: 15, duration: 0.6 }} className="mb-6 relative">
                        <div className="absolute inset-0 bg-[#7c3aed] blur-[30px] opacity-30 rounded-full"></div>
                        <svg width="80" height="80" viewBox="0 0 100 100" className="relative z-10">
                           <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(124,58,237,0.2)" strokeWidth="6" />
                           <motion.circle cx="50" cy="50" r="46" fill="none" stroke="#7c3aed" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="290" initial={{ strokeDashoffset: 290 }} animate={{ strokeDashoffset: 0 }} transition={{ duration: 1, ease: "easeInOut" }} />
                           <motion.path d="M30 52 L44 65 L70 35" fill="none" stroke="#7c3aed" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="100" initial={{ strokeDashoffset: 100 }} animate={{ strokeDashoffset: 0 }} transition={{ duration: 0.6, delay: 0.8, ease: "easeOut" }} />
                        </svg>
                      </motion.div>
                      <h2 className="text-4xl font-bold text-white font-['Sora',sans-serif] mb-3 leading-tight">You're all set!</h2>
                      <p className="text-white/60 mb-8 text-[16px]">Taking you to your dashboard...</p>
                      
                      <div className="flex gap-2.5 mt-2">
                        <motion.div initial={{ y: 0 }} animate={{ y: [-4, 4, -4] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0 }} className="w-2.5 h-2.5 rounded-full bg-[#7c3aed]"></motion.div>
                        <motion.div initial={{ y: 0 }} animate={{ y: [-4, 4, -4] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }} className="w-2.5 h-2.5 rounded-full bg-[#7c3aed]"></motion.div>
                        <motion.div initial={{ y: 0 }} animate={{ y: [-4, 4, -4] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }} className="w-2.5 h-2.5 rounded-full bg-[#7c3aed]"></motion.div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Navigation Buttons */}
            {currentStep < 5 && (
              <div className="mt-8 pt-8 border-t border-white/10 flex items-center justify-between">
                {currentStep > 1 ? (
                  <button onClick={handleBack} 
                    className="h-11 px-6 rounded-full border border-white/15 text-white bg-transparent hover:bg-white/5 font-medium transition-colors text-[14px]">
                    ← Back
                  </button>
                ) : (
                  <div></div>
                )}
                
                <button 
                  onClick={handleNext} 
                  className="h-11 px-7 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#5b21b6] text-white font-semibold flex items-center gap-2 transition-all hover:shadow-[0_0_20px_rgba(124,58,237,0.4)] hover:brightness-110 text-[14px]">
                  {currentStep === 4 ? "Finish & Launch →" : "Next →"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
