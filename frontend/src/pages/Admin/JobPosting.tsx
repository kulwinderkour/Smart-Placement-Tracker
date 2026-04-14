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

  if (page === "menu") {
    return (
      <div
        className="w-full"
        style={{
          minHeight: "calc(100vh - 60px)",
          background: "linear-gradient(180deg,#f7f8fc 0%, #ffffff 70%)",
        }}
      >
        <div className="mx-auto w-full max-w-[1200px] px-6 py-10">
          <div className="mb-8 flex items-start justify-between gap-4">
            <h1
              className="text-[36px] font-semibold tracking-tight"
              style={{ color: "#000000", opacity: 1 }}
            >
              Create a interview
            </h1>
            <button
              type="button"
              onClick={() => navigate("/admin/dashboard")}
              className="rounded-full border px-4 py-2 text-xs font-semibold transition"
              style={{
                background: "#ffffff",
                borderColor: "#e7e9f2",
                color: "#000000",
                opacity: 1,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#f4f5fb";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#ffffff";
              }}
            >
              Back to dashboard
            </button>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
          {[
            {
              title: "Create job post",
              description:
                "Post new job opportunities for your students. Include role details, eligibility criteria, and application deadlines to attract top talent.",
              cta: "Create",
              action: goToWizard,
            },
            {
              title: "Technical interview",
              description:
                "Schedule coding and technical assessments. Automated evaluation with real-time feedback and performance analytics.",
              cta: "Create",
              action: () => {},
            },
            {
              title: "MCQs",
              description:
                "Build quick aptitude and technical MCQ tests. Set difficulty levels, time limits, and instant scoring for screening.",
              cta: "Create",
              action: () => {},
            },
            {
              title: "HR interview",
              description:
                "Conduct final HR rounds with behavioral questions. Track candidate fit, salary expectations, and offer readiness.",
              cta: "Create",
              action: () => {},
            },
            {
              title: "Manual interview",
              description:
                "Arrange personalized one-on-one interviews. Custom scheduling, feedback collection, and direct recruiter-student matching.",
              cta: "Create",
              action: () => {},
            },
          ].map((card, idx) => (
            <div
              key={`${card.title}-${idx}`}
              className="flex min-h-[190px] flex-col justify-between rounded-2xl border bg-white p-6"
              style={{
                borderColor: "#e7e9f2",
                boxShadow:
                  "0 10px 30px rgba(15, 23, 42, 0.06), 0 2px 8px rgba(15, 23, 42, 0.04)",
              }}
            >
              <div>
                <h2
                  className="text-[18px] font-semibold leading-tight"
                  style={{ color: "#000000", opacity: 1 }}
                >
                  {card.title}
                </h2>
                <p
                  className="mt-2 text-[12px] leading-relaxed"
                  style={{ color: "#000000", opacity: 1 }}
                >
                  {card.description}
                </p>
              </div>
              <button
                onClick={card.action}
                className="mt-6 w-fit rounded-xl px-8 py-2 text-sm font-semibold text-white transition"
                style={{
                  background: "#7c3aed",
                  boxShadow: "0 10px 18px rgba(124, 58, 237, 0.22)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "#6d28d9";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "#7c3aed";
                }}
              >
                {card.cta}
              </button>
            </div>
          ))}
        </div>
        </div>
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
