import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Briefcase, MapPin, Users, X, ChevronDown,
  Pencil, Trash2, PowerOff, Power, Wifi, WifiOff,
} from "lucide-react";
import { companyJobsApi } from "../../api/companyJobs";
import StatusBadge from "../../components/admin/StatusBadge";
import AdminLayout from "../../components/admin/AdminLayout";
import type { Job, CompanyJobCreate } from "../../types";
import { useCompanyProfileStore } from "../../store/companyProfileStore";
import { useJobsRealtime } from "../../hooks/useJobsRealtime";

const JOB_TYPES = ["full_time", "intern", "contract"] as const;

/* ── Shared input style (uses CSS variables) ── */
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

type JobFormState = CompanyJobCreate;

const EMPTY_FORM: JobFormState = {
  role_title: "",
  location: "",
  salary_min: undefined,
  salary_max: undefined,
  experience_min: undefined,
  experience_max: undefined,
  job_type: "full_time",
  description: "",
  deadline: "",
};

function focusBorder(e: React.FocusEvent<HTMLElement>) {
  (e.target as HTMLElement).style.borderColor = "var(--color-accent)";
}
function blurBorder(e: React.FocusEvent<HTMLElement>) {
  (e.target as HTMLElement).style.borderColor = "var(--color-border)";
}

/* ─────────────────────────────────────────────
   Job Form (shared by Post + Edit modals)
───────────────────────────────────────────── */
function JobForm({
  title,
  initialValues,
  onClose,
  onSubmit,
  submitLabel,
}: {
  title: string;
  initialValues?: Partial<JobFormState>;
  onClose: () => void;
  onSubmit: (form: JobFormState) => Promise<void>;
  submitLabel: string;
}) {
  const { profile } = useCompanyProfileStore();
  const [form, setForm] = useState<JobFormState>({
    ...EMPTY_FORM,
    location: profile?.location ?? "",
    ...initialValues,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof JobFormState, v: unknown) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.role_title.trim()) {
      setError("Role title is required");
      return;
    }
    if (!form.deadline) {
      setError("Deadline is required");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await onSubmit(form);
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail;
      setError(msg ?? "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-xl rounded-2xl"
        style={{
          background: "var(--color-bg-surface)",
          border: "1px solid var(--color-border)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
        }}
      >
        {/* Modal header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <h2
            className="text-base font-bold"
            style={{ color: "var(--color-text)" }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{ color: "var(--color-text-muted)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--color-accent-bg)";
              (e.currentTarget as HTMLElement).style.color = "var(--color-accent)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "";
              (e.currentTarget as HTMLElement).style.color = "var(--color-text-muted)";
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal form */}
        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-4 max-h-[70vh] overflow-y-auto"
        >
          {error && (
            <div
              className="rounded-lg px-4 py-3 text-sm"
              style={{
                background: "rgba(239,68,68,0.10)",
                border: "1px solid rgba(239,68,68,0.28)",
                color: "var(--color-danger)",
              }}
            >
              {error}
            </div>
          )}

          {/* Company name (read-only, auto-filled) */}
          {profile?.company_name && (
            <div
              className="rounded-lg px-4 py-3 text-sm flex items-center gap-2"
              style={{
                background: "rgba(124,58,237,0.08)",
                border: "1px solid rgba(124,58,237,0.22)",
                color: "var(--color-text-secondary)",
              }}
            >
              <span style={{ color: "var(--color-text-muted)" }}>Posting as</span>
              <span className="font-semibold" style={{ color: "var(--color-accent)" }}>
                {profile.company_name}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Role Title */}
            <label className="flex flex-col gap-1.5 col-span-2">
              <span
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--color-text-muted)" }}
              >
                Role Title *
              </span>
              <input
                value={form.role_title}
                onChange={(e) => set("role_title", e.target.value)}
                required
                placeholder="e.g. Software Engineer Intern"
                style={INPUT_STYLE}
                className="theme-input"
                onFocus={focusBorder}
                onBlur={blurBorder}
              />
            </label>

            {/* Location */}
            <label className="flex flex-col gap-1.5">
              <span
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--color-text-muted)" }}
              >
                Location
              </span>
              <input
                value={form.location ?? ""}
                onChange={(e) => set("location", e.target.value)}
                placeholder="e.g. Bengaluru"
                style={INPUT_STYLE}
                className="theme-input"
                onFocus={focusBorder}
                onBlur={blurBorder}
              />
            </label>

            {/* Job Type */}
            <label className="flex flex-col gap-1.5">
              <span
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--color-text-muted)" }}
              >
                Job Type
              </span>
              <div className="relative">
                <select
                  value={form.job_type ?? "full_time"}
                  onChange={(e) =>
                    set("job_type", e.target.value as CompanyJobCreate["job_type"])
                  }
                  className="appearance-none w-full pr-8"
                  style={INPUT_STYLE}
                  onFocus={focusBorder}
                  onBlur={blurBorder}
                >
                  {JOB_TYPES.map((t) => (
                    <option
                      key={t}
                      value={t}
                      style={{ background: "var(--color-bg-surface)" }}
                    >
                      {t === "full_time" ? "Full-time" : t === "intern" ? "Internship" : "Contract"}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={13}
                  className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: "var(--color-text-muted)" }}
                />
              </div>
            </label>

            {/* Salary Min */}
            <label className="flex flex-col gap-1.5">
              <span
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--color-text-muted)" }}
              >
                Salary Min (₹)
              </span>
              <input
                type="number"
                value={form.salary_min ?? ""}
                onChange={(e) => set("salary_min", e.target.value ? +e.target.value : undefined)}
                placeholder="e.g. 300000"
                style={INPUT_STYLE}
                className="theme-input"
                onFocus={focusBorder}
                onBlur={blurBorder}
              />
            </label>

            {/* Salary Max */}
            <label className="flex flex-col gap-1.5">
              <span
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--color-text-muted)" }}
              >
                Salary Max (₹)
              </span>
              <input
                type="number"
                value={form.salary_max ?? ""}
                onChange={(e) => set("salary_max", e.target.value ? +e.target.value : undefined)}
                placeholder="e.g. 600000"
                style={INPUT_STYLE}
                className="theme-input"
                onFocus={focusBorder}
                onBlur={blurBorder}
              />
            </label>

            {/* Exp Min */}
            <label className="flex flex-col gap-1.5">
              <span
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--color-text-muted)" }}
              >
                Exp Min (yrs)
              </span>
              <input
                type="number"
                value={form.experience_min ?? ""}
                onChange={(e) => set("experience_min", e.target.value ? +e.target.value : undefined)}
                placeholder="0"
                style={INPUT_STYLE}
                className="theme-input"
                onFocus={focusBorder}
                onBlur={blurBorder}
              />
            </label>

            {/* Exp Max */}
            <label className="flex flex-col gap-1.5">
              <span
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--color-text-muted)" }}
              >
                Exp Max (yrs)
              </span>
              <input
                type="number"
                value={form.experience_max ?? ""}
                onChange={(e) => set("experience_max", e.target.value ? +e.target.value : undefined)}
                placeholder="3"
                style={INPUT_STYLE}
                className="theme-input"
                onFocus={focusBorder}
                onBlur={blurBorder}
              />
            </label>

            {/* Deadline */}
            <label className="flex flex-col gap-1.5 col-span-2">
              <span
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--color-text-muted)" }}
              >
                Deadline{" "}
                <span style={{ color: "#ef4444" }}>*</span>
              </span>
              <input
                type="date"
                value={form.deadline ?? ""}
                onChange={(e) => set("deadline", e.target.value)}
                required
                style={INPUT_STYLE}
                onFocus={focusBorder}
                onBlur={blurBorder}
              />
            </label>

            {/* Description */}
            <label className="flex flex-col gap-1.5 col-span-2">
              <span
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--color-text-muted)" }}
              >
                Description
              </span>
              <textarea
                value={form.description ?? ""}
                onChange={(e) => set("description", e.target.value)}
                rows={4}
                placeholder="Describe the role, requirements and responsibilities…"
                style={{ ...INPUT_STYLE, resize: "none" }}
                className="theme-input"
                onFocus={focusBorder}
                onBlur={blurBorder}
              />
            </label>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={{
                border: "1px solid var(--color-border)",
                color: "var(--color-text-secondary)",
                background: "transparent",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "var(--color-accent-bg)";
                (e.currentTarget as HTMLElement).style.borderColor = "var(--color-accent-border)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "transparent";
                (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border)";
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-60"
              style={{ background: "#7c3aed", color: "#ffffff" }}
              onMouseEnter={(e) => {
                if (!submitting)
                  (e.currentTarget as HTMLElement).style.background = "#6d28d9";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#7c3aed";
              }}
            >
              {submitting ? "Saving…" : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Post Job Modal
───────────────────────────────────────────── */
function PostJobModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const handleSubmit = async (form: JobFormState) => {
    await companyJobsApi.create(form);
    onSuccess();
  };
  return <JobForm title="Post New Job" onClose={onClose} onSubmit={handleSubmit} submitLabel="Post Job" />;
}

/* ─────────────────────────────────────────────
   Edit Job Modal
───────────────────────────────────────────── */
function EditJobModal({
  job,
  onClose,
  onSuccess,
}: {
  job: Job;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const handleSubmit = async (form: JobFormState) => {
    await companyJobsApi.update(job.id, form);
    onSuccess();
  };
  return (
    <JobForm
      title="Edit Job"
      initialValues={{
        role_title: job.role_title,
        location: job.location,
        salary_min: job.salary_min,
        salary_max: job.salary_max,
        experience_min: job.experience_min,
        experience_max: job.experience_max,
        job_type: job.job_type,
        description: job.description,
        deadline: job.deadline,
      }}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Save Changes"
    />
  );
}

/* ─────────────────────────────────────────────
   Main AdminJobs Page
───────────────────────────────────────────── */
export default function AdminJobs() {
  const queryClient = useQueryClient();
  const [showPostModal, setShowPostModal] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["company-jobs"],
    queryFn: () => companyJobsApi.list(1, 100),
  });

  const jobs: Job[] = (data?.data as { data?: Job[] } | undefined)?.data ?? [];

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["company-jobs"] }),
    [queryClient],
  );

  /* Real-time: invalidate query on any job event from this company */
  const { status: wsStatus } = useJobsRealtime({ onEvent: invalidate });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      companyJobsApi.setStatus(id, is_active),
    onSuccess: () => invalidate(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => companyJobsApi.delete(id),
    onSuccess: () => invalidate(),
  });

  const wsIndicator = (
    <div
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full"
      style={{
        background: wsStatus === "connected" ? "rgba(34,197,94,0.10)" : "rgba(148,163,184,0.10)",
        border: wsStatus === "connected" ? "1px solid rgba(34,197,94,0.25)" : "1px solid rgba(148,163,184,0.2)",
        color: wsStatus === "connected" ? "#22c55e" : "var(--color-text-muted)",
      }}
    >
      {wsStatus === "connected" ? <Wifi size={12} /> : <WifiOff size={12} />}
      {wsStatus === "connected" ? "Live" : "Offline"}
    </div>
  );

  return (
    <AdminLayout>
      <div className="p-6 max-w-[1400px] mx-auto page-enter">
        {/* ── Page header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ color: "var(--color-text)" }}
            >
              Jobs
            </h1>
            <p
              className="text-sm mt-0.5"
              style={{ color: "var(--color-text-muted)" }}
            >
              Manage your company's job postings
            </p>
          </div>
          <div className="flex items-center gap-3">
            {wsIndicator}
            <button
              onClick={() => setShowPostModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={{ background: "#7c3aed", color: "#ffffff" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#6d28d9";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#7c3aed";
              }}
            >
              <Plus size={16} /> Post New Job
            </button>
          </div>
        </div>

        {/* ── Loading skeletons ── */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton rounded-xl h-52" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          /* ── Empty state ── */
          <div
            className="flex flex-col items-center justify-center py-24"
            style={{ color: "var(--color-text-muted)" }}
          >
            <Briefcase size={48} className="mb-4 opacity-20" />
            <h3
              className="text-base font-semibold mb-1"
              style={{ color: "var(--color-text)" }}
            >
              No jobs posted yet
            </h3>
            <p className="text-sm mb-4">
              Post your first job to start receiving applications
            </p>
            <button
              onClick={() => setShowPostModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{ background: "#7c3aed", color: "#ffffff" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#6d28d9"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#7c3aed"; }}
            >
              <Plus size={15} /> Post New Job
            </button>
          </div>
        ) : (
          /* ── Jobs grid ── */
          <div className="grid sm:grid-cols-2 gap-4">
            {jobs.map((job, idx) => (
              <div
                key={job.id}
                className={`glass-card hover-card card-enter animate-scale-in animate-stagger-${(idx % 4) + 1} transition-all duration-200`}
              >
                {/* Card body */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3
                      className="font-bold text-xl leading-tight"
                      style={{ color: "var(--color-text)" }}
                    >
                      {job.role_title}
                    </h3>
                    <StatusBadge status={job.is_active ? "active" : "closed"} />
                  </div>

                  {job.description && (
                    <p
                      className="text-sm mb-4 line-clamp-2"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {job.description}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                    {job.job_type && (
                      <div className="flex items-center gap-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                        <Briefcase size={14} className="shrink-0" style={{ color: "var(--color-text-muted)" }} />
                        {job.job_type === "full_time" ? "Full-time" : job.job_type === "intern" ? "Internship" : "Contract"}
                      </div>
                    )}
                    {job.location && (
                      <div className="flex items-center gap-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                        <MapPin size={14} className="shrink-0" style={{ color: "var(--color-text-muted)" }} />
                        {job.location}
                      </div>
                    )}
                    {(job.salary_min || job.salary_max) && (
                      <div className="flex items-center gap-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                        <span className="text-sm">💰</span>
                        {job.salary_min && job.salary_max
                          ? `₹${(job.salary_min / 100000).toFixed(0)}–${(job.salary_max / 100000).toFixed(0)} LPA`
                          : job.salary_max ? `₹${(job.salary_max / 100000).toFixed(1)}L` : "—"}
                      </div>
                    )}
                    {job.deadline && (
                      <div className="flex items-center gap-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                        <span className="text-sm">🕐</span>
                        {new Date(job.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card footer */}
                <div
                  className="flex items-center justify-between px-5 py-3"
                  style={{ borderTop: "1px solid var(--color-border)" }}
                >
                  {/* Applicant count */}
                  <div className="flex items-center gap-1.5 text-sm" style={{ color: "var(--color-text-muted)" }}>
                    <Users size={15} className="shrink-0" style={{ color: "var(--color-text-muted)" }} />
                    <span className="font-semibold" style={{ color: "var(--color-text)" }}>
                      {job.application_count ?? 0}
                    </span>
                    <span>applicants</span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1.5">
                    {/* View applicants */}
                    <button
                      onClick={() => (window.location.href = `/admin/applicants?job=${job.id}`)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                      style={{ background: "transparent", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
                      onMouseEnter={(e) => {
                        const el = e.currentTarget as HTMLElement;
                        el.style.borderColor = "var(--color-accent)";
                        el.style.color = "var(--color-accent)";
                        el.style.background = "var(--color-accent-bg)";
                      }}
                      onMouseLeave={(e) => {
                        const el = e.currentTarget as HTMLElement;
                        el.style.borderColor = "var(--color-border)";
                        el.style.color = "var(--color-text-secondary)";
                        el.style.background = "transparent";
                      }}
                    >
                      Applicants
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => setEditingJob(job)}
                      title="Edit job"
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                      style={{ border: "1px solid var(--color-border)", color: "var(--color-text-muted)", background: "transparent" }}
                      onMouseEnter={(e) => {
                        const el = e.currentTarget as HTMLElement;
                        el.style.borderColor = "var(--color-accent)";
                        el.style.color = "var(--color-accent)";
                        el.style.background = "var(--color-accent-bg)";
                      }}
                      onMouseLeave={(e) => {
                        const el = e.currentTarget as HTMLElement;
                        el.style.borderColor = "var(--color-border)";
                        el.style.color = "var(--color-text-muted)";
                        el.style.background = "transparent";
                      }}
                    >
                      <Pencil size={13} />
                    </button>

                    {/* Toggle active */}
                    <button
                      onClick={() => toggleMutation.mutate({ id: job.id, is_active: !job.is_active })}
                      title={job.is_active ? "Deactivate" : "Activate"}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                      style={{
                        border: job.is_active ? "1px solid rgba(234,179,8,0.35)" : "1px solid rgba(34,197,94,0.35)",
                        color: job.is_active ? "#eab308" : "#22c55e",
                        background: job.is_active ? "rgba(234,179,8,0.08)" : "rgba(34,197,94,0.08)",
                      }}
                    >
                      {job.is_active ? <PowerOff size={13} /> : <Power size={13} />}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => {
                        if (confirm(`Remove "${job.role_title}"? This cannot be undone.`)) {
                          deleteMutation.mutate(job.id);
                        }
                      }}
                      title="Remove job"
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                      style={{
                        border: "1px solid rgba(239,68,68,0.30)",
                        color: "#ef4444",
                        background: "rgba(239,68,68,0.07)",
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Post Job Modal */}
      {showPostModal && (
        <PostJobModal
          onClose={() => setShowPostModal(false)}
          onSuccess={invalidate}
        />
      )}

      {/* Edit Job Modal */}
      {editingJob && (
        <EditJobModal
          job={editingJob}
          onClose={() => setEditingJob(null)}
          onSuccess={() => {
            setEditingJob(null);
            invalidate();
          }}
        />
      )}
    </AdminLayout>
  );
}
