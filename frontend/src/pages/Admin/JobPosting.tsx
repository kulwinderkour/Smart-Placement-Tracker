import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { companyJobsApi } from "../../api/companyJobs";
import type { JobCreatePayload } from "../../types/index";

type WizardStep = 1 | 2 | 3 | 4 | 5;

const STEP_LABELS = [
  "Basic job details",
  "MCQ test",
  "Technical interview",
  "HR Interview",
  "Preview",
] as const;

const SKILL_SUGGESTIONS = [
  "Figma",
  "Adobe XD",
  "React JS",
  "dot. net",
  "Flutter",
  "Creative skills",
  "After effects",
];

export default function JobPosting() {
  const navigate = useNavigate();
  const [page, setPage] = useState<"menu" | "wizard">("menu");
  const [activeStep, setActiveStep] = useState<WizardStep>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredFlowNode, setHoveredFlowNode] = useState<number | null>(null);

  const [form, setForm] = useState<JobCreatePayload>({
    company_name: "",
    role_title: "",
    location: "",
    salary_min: undefined,
    salary_max: undefined,
    experience_min: undefined,
    experience_max: undefined,
    job_type: "full_time",
    description: "",
    deadline: "",
  });

  const [mcq, setMcq] = useState({
    assessmentName: "",
    numberOfQuestions: "",
    cutoffPercent: "",
    aptitude: 10,
    reasoning: 10,
    verbal: 10,
    technical: 10,
  });

  const [technicalInterview, setTechnicalInterview] = useState({
    interviewType: "",
    numberOfQuestions: "",
    level: "",
  });

  const [hrInterview, setHrInterview] = useState({
    interviewType: "",
    numberOfQuestions: "",
    level: "",
  });

  const [skillsInput, setSkillsInput] = useState("");
  const [skills, setSkills] = useState<string[]>([]);

  const canGoNext = useMemo(() => {
    if (activeStep === 1) return form.role_title.trim().length > 0;
    return true;
  }, [activeStep, form.role_title]);

  const addSkill = (skill: string) => {
    const clean = skill.trim();
    if (!clean) return;
    if (skills.some((s) => s.toLowerCase() === clean.toLowerCase())) return;
    setSkills((prev) => [...prev, clean]);
  };

  const goToWizard = () => {
    setPage("wizard");
    setActiveStep(1);
  };

  const handleNext = () => {
    if (!canGoNext) return;
    setActiveStep((prev) => (Math.min(prev + 1, 5) as WizardStep));
  };

  const handleBack = () => {
    setActiveStep((prev) => (Math.max(prev - 1, 1) as WizardStep));
  };

  const handleSkipSection = () => {
    setActiveStep((prev) => (Math.min(prev + 1, 5) as WizardStep));
  };

  const handleSaveDraft = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await companyJobsApi.create({
        role_title: form.role_title,
        location: form.location || undefined,
        salary_min: form.salary_min,
        salary_max: form.salary_max,
        experience_min: form.experience_min,
        experience_max: form.experience_max,
        job_type: form.job_type,
        description: form.description || "",
        deadline: form.deadline || undefined,
      });
      navigate("/admin/jobs");
    } catch (requestError: any) {
      setError(requestError?.response?.data?.detail ?? "Failed to create job posting");
    } finally {
      setSubmitting(false);
    }
  };

  // ── interview type cards data ─────────────────────────────────────────────
  const rightNodes = [
    {
      title: "Technical interview",
      description: "Coding assessment",
      accent: "#58a6ff",
      action: () => {},
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#58a6ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      ),
    },
    {
      title: "MCQs",
      description: "Aptitude & technical test",
      accent: "#3fb950",
      action: () => {},
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3fb950" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      ),
    },
    {
      title: "HR interview",
      description: "Behavioral round",
      accent: "#d29922",
      action: () => {},
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d29922" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      title: "Manual interview",
      description: "One-on-one session",
      accent: "#f85149",
      action: () => {},
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f85149" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
    },
  ];

  if (page === "menu") {

    return (
      <div style={{ background: "#ffffff", minHeight: "calc(100vh - 60px)" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 32px" }}>

          {/* ── page header ──────────────────────────────────────────────── */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 36 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827", margin: 0 }}>
                Set up your hiring pipeline
              </h1>
              <p style={{ fontSize: 13, color: "#6b7280", margin: "5px 0 0" }}>
                Start with a job post, then layer on the interview rounds you need.
              </p>
            </div>
            <button
              type="button"
              id="back-to-dashboard-btn"
              onClick={() => navigate("/admin/dashboard")}
              style={{
                background: "transparent",
                border: "1px solid #e5e7eb",
                color: "#6b7280",
                borderRadius: 8,
                padding: "7px 16px",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              ← Back to dashboard
            </button>
          </div>

          {/* ── step 1: create job post hero card ────────────────────────── */}
          <div
            id="create-job-post-card"
            style={{
              background: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 60%, #faf5ff 100%)",
              border: "1.5px solid #ddd6fe",
              borderRadius: 20,
              padding: "30px 36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 24,
              marginBottom: 28,
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* decorative blobs */}
            <div style={{ position: "absolute", right: -40, top: -40, width: 200, height: 200, background: "radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
            <div style={{ position: "absolute", right: 80, bottom: -60, width: 160, height: 160, background: "radial-gradient(circle, rgba(167,139,250,0.10) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />

            {/* left: icon + text */}
            <div style={{ display: "flex", alignItems: "center", gap: 20, position: "relative", zIndex: 1 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg, #7c3aed, #a855f7)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 20px rgba(124,58,237,0.28)", flexShrink: 0 }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
              </div>
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#7c3aed", textTransform: "uppercase" as const, background: "rgba(124,58,237,0.10)", borderRadius: 4, padding: "2px 8px", display: "inline-block", marginBottom: 5 }}>Step 1</span>
                <h2 style={{ fontSize: 19, fontWeight: 700, color: "#1e1b4b", margin: 0 }}>Create job post</h2>
                <p style={{ fontSize: 13, color: "#6d28d9", margin: "3px 0 0", fontWeight: 500 }}>Define role, eligibility, salary &amp; deadline</p>
              </div>
            </div>

            {/* right: CTA button */}
            <button
              type="button"
              id="create-job-post-btn"
              onClick={goToWizard}
              style={{ background: "linear-gradient(135deg, #7c3aed, #9333ea)", color: "#ffffff", border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, flexShrink: 0, position: "relative", zIndex: 1, boxShadow: "0 6px 18px rgba(124,58,237,0.35)", transition: "transform 0.15s, box-shadow 0.15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 10px 24px rgba(124,58,237,0.42)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 18px rgba(124,58,237,0.35)"; }}
            >
              Create Job Post
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>

          {/* ── step 2 divider ────────────────────────────────────────────── */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#374151", textTransform: "uppercase" as const, background: "#f3f4f6", borderRadius: 4, padding: "3px 10px", whiteSpace: "nowrap" as const }}>Step 2 — optional</span>
            <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
            <span style={{ fontSize: 12, color: "#9ca3af", whiteSpace: "nowrap" as const }}>Attach an interview round</span>
          </div>

          {/* ── 2×2 interview type grid ───────────────────────────────────── */}
          <div className="interview-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
            {rightNodes.map((node, i) => (
              <div
                key={node.title}
                id={`interview-card-${i}`}
                onMouseEnter={() => setHoveredFlowNode(i)}
                onMouseLeave={() => setHoveredFlowNode(null)}
                onClick={node.action}
                style={{
                  background: hoveredFlowNode === i ? `${node.accent}08` : "#fafafa",
                  border: `1.5px solid ${hoveredFlowNode === i ? node.accent : "#e5e7eb"}`,
                  borderRadius: 16,
                  padding: "22px 24px",
                  cursor: "pointer",
                  transition: "border-color 0.18s, background 0.18s, box-shadow 0.18s",
                  boxShadow: hoveredFlowNode === i ? `0 4px 20px ${node.accent}22` : "0 1px 4px rgba(0,0,0,0.05)",
                  display: "flex",
                  flexDirection: "column" as const,
                  gap: 14,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `${node.accent}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {node.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", lineHeight: 1.2 }}>{node.title}</div>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{node.description}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); node.action(); }}
                  style={{ alignSelf: "flex-start", background: `${node.accent}14`, color: node.accent, border: `1px solid ${node.accent}30`, borderRadius: 7, padding: "7px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "background 0.15s", display: "flex", alignItems: "center", gap: 6 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${node.accent}24`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${node.accent}14`; }}
                >
                  Set up
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

        </div>

        <style>{`
          @media (max-width: 640px) {
            .interview-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      className="w-full"
      style={{
        minHeight: "calc(100vh - 60px)",
        background: "linear-gradient(180deg,#f7f8fc 0%, #ffffff 70%)",
      }}
    >
      <div className="mx-auto w-full max-w-[920px] px-6 py-8 text-[#0b0b0b]">
        <div className="relative mb-6">
          <h1
            className="text-center text-[18px] font-semibold tracking-tight"
            style={{ color: "#7c3aed", opacity: 1 }}
          >
            Create new job post
          </h1>
          <button
            type="button"
            onClick={() => navigate("/admin/jobs")}
            className="absolute right-0 top-0 text-xs font-semibold underline underline-offset-4"
            style={{ color: "#6b7280" }}
          >
            Cancel job post
          </button>
        </div>

        {/* Compact stepper */}
        <div className="mb-6 flex items-start justify-between gap-2">
          {STEP_LABELS.map((label, idx) => {
            const step = (idx + 1) as WizardStep;
            const isActive = step === activeStep;
            const isDone = step < activeStep;
            return (
              <div key={label} className="flex min-w-0 flex-1 items-center gap-2">
                <div className="flex flex-col items-center gap-2">
                  <div
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] text-[10px]"
                    style={{
                      background: isActive || isDone ? "#7c3aed" : "#d1d5db",
                      color: "white",
                      opacity: 1,
                    }}
                  >
                    ✓
                  </div>
                  <p
                    className="w-[76px] text-center text-[10px] leading-tight"
                    style={{ color: isActive ? "#7c3aed" : "#6b7280" }}
                  >
                    {label}
                  </p>
                </div>
                {idx < STEP_LABELS.length - 1 && (
                  <div className="mt-2 h-[2px] flex-1 bg-[#e5e7eb]" />
                )}
              </div>
            );
          })}
        </div>

        <div className="mx-auto w-full">
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        {activeStep === 1 && (
          <>
            {/* Job type (compact inline) */}
            <div className="mb-4 flex items-center justify-center gap-6">
              <span className="text-sm font-semibold text-[#111827]">Job type</span>
              <label className="flex items-center gap-2 text-sm font-semibold text-[#111827]">
                <input
                  type="radio"
                  name="job_type"
                  checked={form.job_type === "intern"}
                  onChange={() => setForm((p) => ({ ...p, job_type: "intern" }))}
                  aria-label="Job type internship"
                />
                <span style={{ color: form.job_type === "intern" ? "#7c3aed" : "#9ca3af" }}>
                  Internship
                </span>
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold text-[#111827]">
                <input
                  type="radio"
                  name="job_type"
                  checked={form.job_type === "full_time"}
                  onChange={() => setForm((p) => ({ ...p, job_type: "full_time" }))}
                  aria-label="Job type job"
                />
                <span style={{ color: form.job_type === "full_time" ? "#7c3aed" : "#9ca3af" }}>
                  Job
                </span>
              </label>
            </div>

            {/* Single-column stacked form */}
            <div className="space-y-4">
              <Field label="Job title">
                <input
                  value={form.role_title}
                  onChange={(e) => setForm((p) => ({ ...p, role_title: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-[#c9ced6] bg-white px-3 text-sm outline-none"
                  placeholder="Ui designer"
                  title="Job title"
                  aria-label="Job title"
                />
              </Field>

              <div>
                <span className="mb-1 block text-xs font-medium text-[#111827]">
                  Required experience
                </span>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={form.experience_min ?? ""}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        experience_min: e.target.value ? Number(e.target.value) : undefined,
                      }))
                    }
                    className="h-10 w-full rounded-lg border border-[#c9ced6] bg-white px-3 text-sm outline-none"
                    placeholder="0"
                    title="Required experience minimum years"
                    aria-label="Required experience minimum years"
                  />
                  <span className="text-sm text-[#6b7280]">to</span>
                  <input
                    type="number"
                    value={form.experience_max ?? ""}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        experience_max: e.target.value ? Number(e.target.value) : undefined,
                      }))
                    }
                    className="h-10 w-full rounded-lg border border-[#c9ced6] bg-white px-3 text-sm outline-none"
                    placeholder="2"
                    title="Required experience maximum years"
                    aria-label="Required experience maximum years"
                  />
                  <span className="text-sm text-[#6b7280]">(years)</span>
                </div>
              </div>

              <Field label="Work mode">
                <input
                  value={form.location || ""}
                  onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-[#c9ced6] bg-white px-3 text-sm outline-none"
                  placeholder="Work from office"
                  title="Work mode"
                  aria-label="Work mode"
                />
              </Field>

              <Field label="No. of openings">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={form.salary_min ?? ""}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      salary_min: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  className="h-10 w-full rounded-lg border border-[#c9ced6] bg-white px-3 text-sm outline-none"
                  placeholder="1"
                  title="Number of openings"
                  aria-label="Number of openings"
                />
              </Field>
            </div>

            <div className="mt-4">
              <Field label="Skills required">
                <input
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSkill(skillsInput);
                      setSkillsInput("");
                    }
                  }}
                  className="h-11 w-full rounded-xl border border-[#c9ced6] bg-white px-3 text-sm outline-none"
                  placeholder="Enter skill and press Enter"
                  title="Skills required"
                  aria-label="Skills required"
                />
              </Field>
              <div className="mt-3 flex flex-wrap gap-2">
                {SKILL_SUGGESTIONS.map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => addSkill(skill)}
                    className="rounded-full bg-[#e4e4e4] px-3 py-1.5 text-sm text-[#7d7d7d]"
                  >
                    {skill} +
                  </button>
                ))}
                {skills.map((skill) => (
                  <span
                    key={`picked-${skill}`}
                    className="inline-flex items-center gap-2 rounded-full bg-[#f3e8ff] pl-3 pr-2 py-1.5 text-sm font-medium text-[#7c3aed]"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => setSkills((prev) => prev.filter((s) => s !== skill))}
                      className="grid h-5 w-5 place-items-center rounded-full text-[14px] leading-none"
                      style={{ color: "#7c3aed", background: "rgba(124, 58, 237, 0.12)" }}
                      aria-label={`Remove skill ${skill}`}
                      title="Remove"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-medium text-[#111827]">
                  Description about job
                </label>
              </div>
              <textarea
                value={form.description || ""}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                className="h-40 w-full rounded-xl border border-[#c9ced6] bg-white px-3 py-2 text-sm outline-none"
                placeholder="Write job description"
                title="Description about job"
                aria-label="Description about job"
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={submitting}
                className="rounded-xl border border-[#d9d9d9] px-6 py-3 text-sm font-semibold text-[#4a4a4a]"
              >
                {submitting ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={!canGoNext}
                className="w-full rounded-xl bg-[#7c3aed] px-12 py-3 text-sm font-semibold text-white transition disabled:opacity-50"
                onMouseEnter={(e) => {
                  if ((e.currentTarget as HTMLButtonElement).disabled) return;
                  (e.currentTarget as HTMLElement).style.background = "#6d28d9";
                }}
                onMouseLeave={(e) => {
                  if ((e.currentTarget as HTMLButtonElement).disabled) return;
                  (e.currentTarget as HTMLElement).style.background = "#7c3aed";
                }}
              >
                Next
              </button>
            </div>
          </>
        )}

        {activeStep === 2 && (
          <div className="mx-auto w-full max-w-[560px]">
            <div className="mb-5 flex items-center justify-between">
              <h2
                className="text-center text-[22px] font-semibold"
                style={{ color: "#000000" }}
              >
                Add MCQ test
              </h2>
              <button
                type="button"
                onClick={handleSkipSection}
                className="text-xs font-semibold underline underline-offset-4"
                style={{ color: "#7c3aed" }}
              >
                Skip Section
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#111827]">
                  Name of the Assessment
                </label>
                <select
                  value={mcq.assessmentName}
                  onChange={(e) => setMcq((p) => ({ ...p, assessmentName: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-[#c9ced6] bg-white px-3 text-sm outline-none"
                  aria-label="Name of the Assessment"
                  title="Name of the Assessment"
                >
                  <option value="" disabled>
                    Select assessment
                  </option>
                  <option value="Aptitude + Technical">Aptitude + Technical</option>
                  <option value="Aptitude">Aptitude</option>
                  <option value="Technical">Technical</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[#111827]">
                  Number of questions
                </label>
                <input
                  value={mcq.numberOfQuestions}
                  onChange={(e) => setMcq((p) => ({ ...p, numberOfQuestions: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-[#c9ced6] bg-white px-3 text-sm outline-none"
                  aria-label="Number of questions"
                  title="Number of questions"
                  inputMode="numeric"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[#111827]">
                  Cut off (%)
                </label>
                <input
                  value={mcq.cutoffPercent}
                  onChange={(e) => setMcq((p) => ({ ...p, cutoffPercent: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-[#c9ced6] bg-white px-3 text-sm outline-none"
                  aria-label="Cut off (%)"
                  title="Cut off (%)"
                  inputMode="numeric"
                />
                {!!mcq.cutoffPercent.trim() && (
                  <p className="mt-1 text-[12px]" style={{ color: "#b45309" }}>
                    The candidates who will score above {mcq.cutoffPercent.trim()}% will be listed to you
                  </p>
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                {([
                  ["Aptitude", "aptitude"],
                  ["Reasoning", "reasoning"],
                  ["Verbal", "verbal"],
                  ["Technical", "technical"],
                ] as const).map(([label, key]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-2 rounded-lg border border-[#c9ced6] bg-white px-3 py-2"
                    style={{ minWidth: 120 }}
                  >
                    <span className="text-xs font-semibold text-[#111827]">{label}</span>
                    <input
                      type="number"
                      value={mcq[key]}
                      onChange={(e) =>
                        setMcq((p) => ({ ...p, [key]: Number(e.target.value || 0) }))
                      }
                      className="w-[56px] rounded-md border border-[#e5e7eb] px-2 py-1 text-xs outline-none"
                      aria-label={`${label} questions`}
                      title={`${label} questions`}
                      min={0}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-10 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleBack}
                className="text-sm font-semibold"
                style={{ color: "#b45309" }}
              >
                {"< Back"}
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="rounded-xl bg-[#7c3aed] px-12 py-3 text-sm font-semibold text-white transition"
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "#6d28d9";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "#7c3aed";
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {activeStep === 3 && (
          <div className="mx-auto w-full max-w-[560px]">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-center text-[22px] font-semibold" style={{ color: "#000000" }}>
                Add Technical interview
              </h2>
              <button
                type="button"
                onClick={handleSkipSection}
                className="text-xs font-semibold underline underline-offset-4"
                style={{ color: "#b45309" }}
              >
                Skip Section
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#111827]">
                  Interview type
                </label>
                <select
                  value={technicalInterview.interviewType}
                  onChange={(e) =>
                    setTechnicalInterview((p) => ({ ...p, interviewType: e.target.value }))
                  }
                  className="h-10 w-full rounded-lg border border-[#c9ced6] bg-white px-3 text-sm outline-none"
                  aria-label="Interview type"
                  title="Interview type"
                >
                  <option value="" disabled>
                    Interview type
                  </option>
                  <option value="DSA">DSA</option>
                  <option value="Frontend">Frontend</option>
                  <option value="Backend">Backend</option>
                  <option value="System Design">System Design</option>
                  <option value="Project-based Technical Interview">
                    Project-based Technical Interview
                  </option>
                  <option value="Debugging Technical Interview">
                    Debugging Technical Interview
                  </option>
                  <option value="Custom">Custom</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[#111827]">
                  Number of questions
                </label>
                <input
                  value={technicalInterview.numberOfQuestions}
                  onChange={(e) =>
                    setTechnicalInterview((p) => ({ ...p, numberOfQuestions: e.target.value }))
                  }
                  className="h-10 w-full rounded-lg border border-[#c9ced6] bg-white px-3 text-sm outline-none"
                  aria-label="Number of questions (technical interview)"
                  title="Number of questions"
                  inputMode="numeric"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[#111827]">
                  Select level
                </label>
                <select
                  value={technicalInterview.level}
                  onChange={(e) =>
                    setTechnicalInterview((p) => ({ ...p, level: e.target.value }))
                  }
                  className="h-10 w-full rounded-lg border border-[#c9ced6] bg-white px-3 text-sm outline-none"
                  aria-label="Select level"
                  title="Select level"
                >
                  <option value="" disabled>
                    Level
                  </option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
            </div>

            <div className="mt-12 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleBack}
                className="text-sm font-semibold"
                style={{ color: "#b45309" }}
              >
                {"< Back"}
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="rounded-xl px-12 py-3 text-sm font-semibold text-white transition"
                style={{ background: "#f97316" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "#ea580c";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "#f97316";
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {activeStep === 4 && (
          <div className="mx-auto w-full max-w-[560px]">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-center text-[22px] font-semibold" style={{ color: "#000000" }}>
                Add HR interview
              </h2>
              <button
                type="button"
                onClick={handleSkipSection}
                className="text-xs font-semibold underline underline-offset-4"
                style={{ color: "#b45309" }}
              >
                Skip Section
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#111827]">
                  Interview type
                </label>
                <select
                  value={hrInterview.interviewType}
                  onChange={(e) => setHrInterview((p) => ({ ...p, interviewType: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-[#c9ced6] bg-white px-3 text-sm outline-none"
                  aria-label="Interview type (HR interview)"
                  title="Interview type"
                >
                  <option value="" disabled>
                    Interview type
                  </option>
                  <option value="HR Screening">HR Screening</option>
                  <option value="Behavioral">Behavioral</option>
                  <option value="Culture Fit">Culture Fit</option>
                  <option value="Communication">Communication</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[#111827]">
                  Number of questions
                </label>
                <input
                  value={hrInterview.numberOfQuestions}
                  onChange={(e) =>
                    setHrInterview((p) => ({ ...p, numberOfQuestions: e.target.value }))
                  }
                  className="h-10 w-full rounded-lg border border-[#c9ced6] bg-white px-3 text-sm outline-none"
                  aria-label="Number of questions (HR interview)"
                  title="Number of questions"
                  inputMode="numeric"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[#111827]">
                  Select level
                </label>
                <select
                  value={hrInterview.level}
                  onChange={(e) => setHrInterview((p) => ({ ...p, level: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-[#c9ced6] bg-white px-3 text-sm outline-none"
                  aria-label="Select level (HR interview)"
                  title="Select level"
                >
                  <option value="" disabled>
                    Level
                  </option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
            </div>

            <div className="mt-12 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleBack}
                className="text-sm font-semibold"
                style={{ color: "#b45309" }}
              >
                {"< Back"}
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="rounded-xl px-12 py-3 text-sm font-semibold text-white transition"
                style={{ background: "#f97316" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "#ea580c";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "#f97316";
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {activeStep === 5 && (
          <div className="mx-auto w-full max-w-[720px]">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-center text-[22px] font-semibold" style={{ color: "#000000" }}>
                Preview
              </h2>
              <button
                type="button"
                onClick={() => setActiveStep(1)}
                className="text-xs font-semibold underline underline-offset-4"
                style={{ color: "#b45309" }}
              >
                Edit details
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border bg-white p-5" style={{ borderColor: "#e7e9f2" }}>
                <p className="mb-3 text-sm font-semibold text-[#111827]">Basic job details</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <PreviewRow label="Job title" value={form.role_title || "—"} />
                  <PreviewRow label="Job type" value={form.job_type === "intern" ? "Internship" : "Job"} />
                  <PreviewRow label="Required experience" value={`${form.experience_min ?? 0} to ${form.experience_max ?? 0} years`} />
                  <PreviewRow label="Work mode" value={form.location || "—"} />
                  <PreviewRow label="No. of openings" value={form.salary_min != null ? String(form.salary_min) : "—"} />
                </div>
                <div className="mt-4">
                  <p className="text-xs font-semibold text-[#111827]">Skills required</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {skills.length ? (
                      skills.map((s) => (
                        <span
                          key={`preview-skill-${s}`}
                          className="rounded-full bg-[#f3e8ff] px-3 py-1.5 text-xs font-semibold text-[#7c3aed]"
                        >
                          {s}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-[#6b7280]">—</span>
                    )}
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-xs font-semibold text-[#111827]">Description</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-[#374151]">
                    {form.description?.trim() ? form.description : "—"}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border bg-white p-5" style={{ borderColor: "#e7e9f2" }}>
                <p className="mb-3 text-sm font-semibold text-[#111827]">MCQ test</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <PreviewRow label="Assessment" value={mcq.assessmentName || "—"} />
                  <PreviewRow label="Number of questions" value={mcq.numberOfQuestions || "—"} />
                  <PreviewRow label="Cut off (%)" value={mcq.cutoffPercent || "—"} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <PreviewChip label="Aptitude" value={mcq.aptitude} />
                  <PreviewChip label="Reasoning" value={mcq.reasoning} />
                  <PreviewChip label="Verbal" value={mcq.verbal} />
                  <PreviewChip label="Technical" value={mcq.technical} />
                </div>
              </div>

              <div className="rounded-2xl border bg-white p-5" style={{ borderColor: "#e7e9f2" }}>
                <p className="mb-3 text-sm font-semibold text-[#111827]">Technical interview</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <PreviewRow label="Interview type" value={technicalInterview.interviewType || "—"} />
                  <PreviewRow label="Number of questions" value={technicalInterview.numberOfQuestions || "—"} />
                  <PreviewRow label="Level" value={technicalInterview.level || "—"} />
                </div>
              </div>

              <div className="rounded-2xl border bg-white p-5" style={{ borderColor: "#e7e9f2" }}>
                <p className="mb-3 text-sm font-semibold text-[#111827]">HR interview</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <PreviewRow label="Interview type" value={hrInterview.interviewType || "—"} />
                  <PreviewRow label="Number of questions" value={hrInterview.numberOfQuestions || "—"} />
                  <PreviewRow label="Level" value={hrInterview.level || "—"} />
                </div>
              </div>
            </div>

            <div className="mt-10 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleBack}
                className="text-sm font-semibold"
                style={{ color: "#b45309" }}
              >
                {"< Back"}
              </button>
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={submitting}
                className="rounded-xl px-10 py-3 text-sm font-semibold text-white transition disabled:opacity-60"
                style={{ background: "#7c3aed" }}
                onMouseEnter={(e) => {
                  if ((e.currentTarget as HTMLButtonElement).disabled) return;
                  (e.currentTarget as HTMLElement).style.background = "#6d28d9";
                }}
                onMouseLeave={(e) => {
                  if ((e.currentTarget as HTMLButtonElement).disabled) return;
                  (e.currentTarget as HTMLElement).style.background = "#7c3aed";
                }}
              >
                {submitting ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        )}

        {activeStep !== 1 && activeStep !== 2 && activeStep !== 3 && activeStep !== 4 && activeStep !== 5 && (
          <div className="mx-auto w-full max-w-[560px]">
            <div className="rounded-2xl border bg-white p-6" style={{ borderColor: "#e7e9f2" }}>
              <p className="text-sm text-[#6b7280]">
                This step isn’t implemented yet.
              </p>
              <div className="mt-6 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleBack}
                  className="text-sm font-semibold"
                  style={{ color: "#b45309" }}
                >
                  {"< Back"}
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="rounded-xl bg-[#7c3aed] px-12 py-3 text-sm font-semibold text-white transition"
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "#6d28d9";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "#7c3aed";
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[28px] font-medium text-[#191919]">{label}</span>
      {children}
    </label>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white px-4 py-3" style={{ borderColor: "#eef0f5" }}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6b7280]">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-[#111827]">{value}</p>
    </div>
  );
}

function PreviewChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-xl border bg-white px-4 py-3" style={{ borderColor: "#eef0f5" }}>
      <span className="text-xs font-semibold text-[#111827]">{label}</span>
      <span className="text-xs font-semibold text-[#6b7280]">{value}</span>
    </div>
  );
}
