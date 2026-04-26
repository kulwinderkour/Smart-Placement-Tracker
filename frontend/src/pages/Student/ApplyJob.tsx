import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  User, 
  GraduationCap, 
  CheckCircle2, 
  Loader2, 
  Upload,
  Phone,
  Calendar,
  Briefcase
} from 'lucide-react';
import { applicationsApi } from '../../api/applications';

const INPUT_STYLE = "w-full bg-[#161b22] border border-[#30363d] rounded-lg px-4 py-3 text-[#c9d1d9] focus:outline-none focus:border-[#2f81f7] focus:ring-1 focus:ring-[#2f81f7] transition-all";
const LABEL_STYLE = "block text-sm font-medium text-[#8b949e] mb-2";

export default function ApplyJob() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    dob: '',
    gender: '',
    phone: '',
    college: '',
    cgpa: '',
    resume_url: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const API = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').replace(/\/$/, '');
        const jobRes = await fetch(`${API}/student/jobs/${jobId}`);
        const jobData = await jobRes.json();
        if (jobData.success) setJob(jobData.data);

        const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
        setFormData(prev => ({
          ...prev,
          full_name: profile.full_name || profile.fullName || '',
          phone: profile.phone || '',
          college: profile.college || '',
          cgpa: profile.cgpa?.toString() || '',
          dob: profile.dob || '',
          gender: profile.gender || '',
          resume_url: profile.resume_url || ''
        }));
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [jobId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobId) return;
    setSubmitting(true);
    try {
      await applicationsApi.apply({
        job_id: jobId,
        full_name: formData.full_name,
        dob: formData.dob,
        gender: formData.gender,
        phone: formData.phone,
        college: formData.college,
        cgpa: formData.cgpa ? parseFloat(formData.cgpa) : undefined,
        resume_url: formData.resume_url
      } as any);
      setSubmitted(true);
      setTimeout(() => navigate('/applications'), 2000);
    } catch (err) {
      console.error("Application failed:", err);
      alert("Failed to submit application. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#2f81f7] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9] font-sans selection:bg-[#2f81f740]">
      <AnimatePresence mode="wait">
        {!submitted ? (
          <motion.div 
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -30, opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-3xl mx-auto px-6 py-12"
          >
            <button 
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-[#8b949e] hover:text-[#c9d1d9] transition-colors mb-8 group"
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              <span>Return to Dashboard</span>
            </button>

            <div className="mb-10">
              <h1 className="text-4xl font-bold text-white mb-2">Job Application</h1>
              <div className="flex flex-wrap gap-4 text-sm text-[#8b949e]">
                <span className="flex items-center gap-1.5">
                  <Briefcase size={14} />
                  Role: <span className="text-[#2f81f7] font-semibold">{job?.role_title || "Position"}</span>
                </span>
                <span className="text-[#30363d]">|</span>
                <span className="flex items-center gap-1.5">
                  <User size={14} />
                  Company: <span className="text-white font-medium">{job?.company_name || "Company"}</span>
                </span>
              </div>
            </div>

            <div className="h-[1px] bg-[#30363d] mb-12" />

            <form onSubmit={handleSubmit} className="space-y-10">
              <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-8 space-y-6 shadow-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-[#2f81f720] flex items-center justify-center text-[#2f81f7]">
                    <User size={18} />
                  </div>
                  <h3 className="text-lg font-bold text-white">Personal Information</h3>
                </div>

                <div>
                  <label htmlFor="full_name" className={LABEL_STYLE}>Full Name *</label>
                  <input 
                    type="text" 
                    id="full_name"
                    required
                    className={INPUT_STYLE}
                    value={formData.full_name}
                    onChange={e => setFormData({...formData, full_name: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="dob" className={LABEL_STYLE}>Date of Birth *</label>
                    <div className="relative">
                      <input 
                        type="date" 
                        id="dob"
                        required
                        className={INPUT_STYLE}
                        value={formData.dob}
                        onChange={e => setFormData({...formData, dob: e.target.value})}
                      />
                      <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8b949e] pointer-events-none" size={18} />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="gender" className={LABEL_STYLE}>Gender *</label>
                    <select 
                      id="gender"
                      required
                      className={INPUT_STYLE}
                      value={formData.gender}
                      onChange={e => setFormData({...formData, gender: e.target.value})}
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="phone" className={LABEL_STYLE}>Phone Number *</label>
                  <div className="relative">
                    <input 
                      type="tel" 
                      id="phone"
                      required
                      placeholder="+91"
                      className={INPUT_STYLE}
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                    />
                    <Phone className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8b949e] pointer-events-none" size={18} />
                  </div>
                </div>

                <div className="pt-4 flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-[#23863620] flex items-center justify-center text-[#238636]">
                    <GraduationCap size={18} />
                  </div>
                  <h3 className="text-lg font-bold text-white">Academic Details</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="college" className={LABEL_STYLE}>University / College *</label>
                    <input 
                      type="text" 
                      id="college"
                      required
                      className={INPUT_STYLE}
                      value={formData.college}
                      onChange={e => setFormData({...formData, college: e.target.value})}
                    />
                  </div>
                  <div>
                    <label htmlFor="cgpa" className={LABEL_STYLE}>CGPA *</label>
                    <input 
                      type="number" 
                      id="cgpa"
                      required
                      step="0.01"
                      min="0"
                      max="10"
                      className={INPUT_STYLE}
                      value={formData.cgpa}
                      onChange={e => setFormData({...formData, cgpa: e.target.value})}
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <label className={LABEL_STYLE}>Resume *</label>
                  <div 
                    className="border-2 border-dashed border-[#30363d] rounded-xl p-8 flex flex-col items-center justify-center gap-3 hover:border-[#2f81f760] hover:bg-[#2f81f705] transition-all cursor-pointer group"
                    onClick={() => document.getElementById('resume-upload')?.click()}
                  >
                    <Upload size={32} className="text-[#8b949e] group-hover:text-[#2f81f7] transition-colors" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-[#c9d1d9]">
                        {formData.resume_url || (formData as any).resume ? (
                          <span className="flex items-center justify-center gap-2 text-[#238636]">
                            <CheckCircle2 size={16} /> Resume has been added {(formData as any).resume?.name}
                          </span>
                        ) : "Click to upload resume"}
                      </p>
                      <p className="text-xs text-[#8b949e] mt-1">PDF preferred</p>
                    </div>
                    <input 
                      type="file" 
                      id="resume-upload" 
                      className="hidden" 
                      accept=".pdf" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setFormData({...formData, resume: file} as any);
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#2f81f7] hover:bg-[#246dd6] text-white px-10 py-3.5 rounded-lg font-bold transition-all flex items-center gap-2 shadow-lg shadow-[#2f81f720] disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Apply Now</span>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="w-20 h-20 bg-[#23863620] border border-[#23863640] rounded-full flex items-center justify-center text-[#238636] mb-6 shadow-2xl shadow-[#23863620]">
              <CheckCircle2 size={40} />
            </div>
            <h2 className="text-3xl font-bold text-white mb-3">Application Successful!</h2>
            <p className="text-[#8b949e] max-w-sm mx-auto">
              Your profile has been shared with <span className="text-white font-semibold">{job?.company_name}</span>. 
              Taking you back to your applications...
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
