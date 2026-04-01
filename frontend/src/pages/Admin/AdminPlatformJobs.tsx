import { useState, useEffect } from "react";
import { Plus, Briefcase, MapPin, X, Pencil, DollarSign, Link as LinkIcon, Trash2, PowerOff, Power } from "lucide-react";
import { adminJobsApi, type AdminJob } from "../../api/adminJobs";
import AdminLayout from "../../components/admin/AdminLayout";
import { useAuthStore } from "../../store/authStore";

const INPUT_STYLE: React.CSSProperties = {
  background: "var(--color-bg-elevated)",
  border: "1px solid var(--color-border)",
  color: "var(--color-text)",
  borderRadius: "8px",
  padding: "10px 12px",
  fontSize: "14px",
  outline: "none",
  width: "100%",
};

export default function AdminPlatformJobs() {
  const { user } = useAuthStore();
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<Partial<AdminJob>>({
    title: "",
    company: "",
    location: "",
    package_lpa: undefined,
    job_type: "Full-time",
    required_skills: [],
    min_cgpa: 0,
    application_deadline: "",
    apply_link: "",
    company_logo: "",
    openings: 1,
    description: "",
    is_active: true,
  });

  const [skillInput, setSkillInput] = useState("");

  const loadJobs = async () => {
    try {
      const res = await adminJobsApi.getActiveJobs();
      setJobs(res.data.jobs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadJobs();
  }, []);

  const handleAddSkill = () => {
    if (skillInput.trim() && !form.required_skills?.includes(skillInput.trim())) {
      setForm(p => ({ ...p, required_skills: [...(p.required_skills || []), skillInput.trim()] }));
      setSkillInput("");
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setForm(p => ({ ...p, required_skills: p.required_skills?.filter(s => s !== skill) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.company) return setError("Title and Company are required");
    
    setSubmitting(true);
    setError("");
    try {
      await adminJobsApi.create({ ...form, posted_by: user?.id });
      setShowModal(false);
      setForm({
        title: "",
        company: "",
        location: "",
        package_lpa: undefined,
        job_type: "Full-time",
        required_skills: [],
        min_cgpa: 0,
        application_deadline: "",
        apply_link: "",
        company_logo: "",
        openings: 1,
        description: "",
        is_active: true,
      });
      await loadJobs();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to save job");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-[1400px] mx-auto page-enter">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>SmartPlacement Opportunities</h1>
            <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>Manage verified platform-wide opportunities for students</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all"
            style={{ background: "#7c3aed", color: "#ffffff" }}
          >
            <Plus size={18} /> Post Verified Job
          </button>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <div key={i} className="h-56 rounded-xl animate-pulse bg-white/5" />)}
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-16 h-16 rounded-full mb-4 flex items-center justify-center bg-white/5 text-white/20">
              <Briefcase size={32} />
            </div>
            <h3 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>No opportunities posted</h3>
            <p className="text-sm max-w-sm mt-1" style={{ color: "var(--color-text-muted)" }}>Posted jobs will appear on the student dashboard's verified section.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map(job => (
              <div key={job.id} className="glass-card hover-card p-5 group flex flex-col h-full">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5 flex items-center justify-center text-sm font-bold shadow-inner">
                      {job.company_logo ? <img src={job.company_logo} className="w-full h-full object-cover" /> : job.company[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm leading-tight group-hover:text-violet-400 transition-colors">{job.title}</h3>
                      <p className="text-xs mt-0.5 opacity-60">{job.company}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider ${job.is_active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                    {job.is_active ? 'Active' : 'Draft'}
                  </span>
                </div>
                
                <div className="flex-1 space-y-2 mt-2">
                  <div className="flex items-center gap-2 text-xs opacity-70"><MapPin size={12} /> {job.location || 'Remote'}</div>
                  <div className="flex items-center gap-2 text-xs opacity-70"><Briefcase size={12} /> {job.job_type}</div>
                  {job.package_lpa && <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold"><DollarSign size={12} /> ₹{job.package_lpa} LPA</div>}
                </div>

                <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                   <div className="text-[10px] opacity-40">Posted on {new Date(job.created_at).toLocaleDateString()}</div>
                   <div className="flex items-center gap-2">
                      <button className="p-2 rounded-lg hover:bg-white/5 transition-colors text-white/50 hover:text-white"><Pencil size={14} /></button>
                      <button className="p-2 rounded-lg hover:bg-red-500/10 transition-colors text-red-400/50 hover:text-red-400"><Trash2 size={14} /></button>
                   </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
            <div className="w-full max-w-2xl bg-[#0f1425] border border-white/10 rounded-2xl shadow-2xl my-8">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                <h2 className="text-lg font-bold">Post Verified Opportunity</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/5 rounded-lg opacity-50 hover:opacity-100 transition-all"><X size={20}/></button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto scrollbar-hide">
                {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs">{error}</div>}

                <div className="grid grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1.5 col-span-2">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Job Title *</span>
                    <input required style={INPUT_STYLE} value={form.title} placeholder="Software Engineer" onChange={e => setForm({...form, title: e.target.value})} />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Company Name *</span>
                    <input required style={INPUT_STYLE} value={form.company} placeholder="Google" onChange={e => setForm({...form, company: e.target.value})} />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Company Logo URL</span>
                    <input style={INPUT_STYLE} value={form.company_logo} placeholder="https://logo.png" onChange={e => setForm({...form, company_logo: e.target.value})} />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Location</span>
                    <input style={INPUT_STYLE} value={form.location} placeholder="Bengaluru" onChange={e => setForm({...form, location: e.target.value})} />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Job Type</span>
                    <select style={INPUT_STYLE} value={form.job_type} onChange={e => setForm({...form, job_type: e.target.value})}>
                      <option value="Full-time">Full-time</option>
                      <option value="Internship">Internship</option>
                      <option value="Remote">Remote</option>
                    </select>
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Package (LPA)</span>
                    <input type="number" step="0.1" style={INPUT_STYLE} value={form.package_lpa} placeholder="12.5" onChange={e => setForm({...form, package_lpa: +e.target.value})} />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Min CGPA</span>
                    <input type="number" step="0.1" style={INPUT_STYLE} value={form.min_cgpa} placeholder="7.5" onChange={e => setForm({...form, min_cgpa: +e.target.value})} />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Openings</span>
                    <input type="number" style={INPUT_STYLE} value={form.openings} onChange={e => setForm({...form, openings: +e.target.value})} />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Deadline</span>
                    <input type="date" style={INPUT_STYLE} value={form.application_deadline} onChange={e => setForm({...form, application_deadline: e.target.value})} />
                  </label>

                  <label className="flex flex-col gap-1.5 col-span-2">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Apply Link</span>
                    <div className="relative">
                      <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30"/>
                      <input style={{...INPUT_STYLE, paddingLeft: '34px'}} value={form.apply_link} placeholder="https://careers.google.com/..." onChange={e => setForm({...form, apply_link: e.target.value})} />
                    </div>
                  </label>

                  <div className="col-span-2 space-y-3">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Required Skills</span>
                    <div className="flex gap-2">
                      <input style={INPUT_STYLE} value={skillInput} placeholder="React, Node.js..." onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())} onChange={e => setSkillInput(e.target.value)} />
                      <button type="button" onClick={handleAddSkill} className="px-4 py-2 bg-white/5 rounded-lg text-xs font-bold hover:bg-white/10 transition-colors">Add</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {form.required_skills?.map(skill => (
                        <span key={skill} className="px-2 py-1 bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs rounded-md flex items-center gap-1.5">
                          {skill} <button type="button" onClick={() => handleRemoveSkill(skill)}><X size={12} className="opacity-50 hover:opacity-100"/></button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <label className="flex flex-col gap-1.5 col-span-2">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Description</span>
                    <textarea value={form.description} rows={5} style={{...INPUT_STYLE, resize: 'none'}} onChange={e => setForm({...form, description: e.target.value})} />
                  </label>

                  <div className="flex items-center gap-3 col-span-2 pt-2">
                    <button type="button" onClick={() => setForm({...form, is_active: !form.is_active})} className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${form.is_active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-white/5 text-white/40 border border-white/5'}`}>
                      {form.is_active ? <Power size={14}/> : <PowerOff size={14}/>}
                      {form.is_active ? 'Published' : 'Draft'}
                    </button>
                    <span className="text-xs text-white/30 italic">Drafts won't be visible to students</span>
                  </div>
                </div>

                <div className="flex gap-3 pt-6 border-t border-white/5">
                   <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-sm transition-all">Cancel</button>
                   <button type="submit" disabled={submitting} className="flex-1 py-3 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-xl font-bold text-sm transition-all shadow-[0_4px_14px_0_rgba(124,58,237,0.39)]">{submitting ? 'Posting...' : 'Create Posting'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
