import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Plus,
  X,
  Video,
  MapPin,
  Star,
  ChevronDown,
  Link,
  Phone,
} from "lucide-react";
import { adminApi } from "../../api/admin";
import StatusBadge from "../../components/admin/StatusBadge";
import AdminLayout from "../../components/admin/AdminLayout";
import type { Interview, Job } from "../../types";

const MODE_LABELS: Record<string, string> = {
  google_meet: "Video",
  zoom: "Video",
  offline: "In-person",
  phone: "Phone",
};

const MODE_COLORS: Record<string, string> = {
  google_meet: "#3b82f6",
  zoom: "#3b82f6",
  offline: "#10b981",
  phone: "#f97316",
};

/* ── Shared input style using CSS variables ── */
const INPUT_BASE: React.CSSProperties = {
  background: "var(--color-bg-elevated)",
  border: "1px solid var(--color-border)",
  color: "var(--color-text)",
  outline: "none",
};

function ModeIcon({ mode }: { mode: string }) {
  if (mode === "offline") return <MapPin size={13} />;
  if (mode === "phone") return <Phone size={13} />;
  return <Video size={13} />;
}

/* ─────────────────────────────────────────────
   Schedule Interview Slide-Over
───────────────────────────────────────────── */
function ScheduleSlideOver({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { data: appsData } = useQuery({
    queryKey: ["admin-applicants"],
    queryFn: () => adminApi.listApplicants(),
  });
  const { data: jobsData } = useQuery({
    queryKey: ["admin-jobs"],
    queryFn: () => adminApi.listJobs(1, 100),
  });

  const apps = appsData?.data?.data ?? [];
  const jobs: Job[] = jobsData?.data?.data ?? [];

  const [form, setForm] = useState({
    student_id: "",
    job_id: "",
    scheduled_at: "",
    mode: "google_meet",
    meeting_link: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.student_id || !form.job_id || !form.scheduled_at) {
      setError("Student, Job, and Date/Time are required");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await adminApi.createInterview({
        student_id: form.student_id as unknown as Interview["student_id"],
        job_id: form.job_id as unknown as Interview["job_id"],
        scheduled_at: form.scheduled_at,
        mode: form.mode as Interview["mode"],
        meeting_link: form.meeting_link || undefined,
        notes: form.notes || undefined,
      });
      onSuccess();
      onClose();
    } catch {
      setError("Failed to schedule interview. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const focusBorder = (e: React.FocusEvent<HTMLElement>) => {
    (e.target as HTMLElement).style.borderColor = "var(--color-accent)";
  };
  const blurBorder = (e: React.FocusEvent<HTMLElement>) => {
    (e.target as HTMLElement).style.borderColor = "var(--color-border)";
  };

  const FIELD_LABEL =
    "text-[10px] font-semibold uppercase tracking-wider mb-1.5 block";

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="flex-1"
        style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="w-full max-w-[480px] h-full flex flex-col overflow-y-auto"
        style={{
          background: "var(--color-bg-surface)",
          borderLeft: "1px solid var(--color-border)",
          boxShadow: "-24px 0 60px rgba(0,0,0,0.14)",
          transition: "background-color 0.25s ease",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 sticky top-0 z-10"
          style={{
            background: "var(--color-bg-surface)",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <div>
            <h2
              className="text-base font-bold"
              style={{ color: "var(--color-text)" }}
            >
              Schedule Interview
            </h2>
            <p
              className="text-xs mt-0.5"
              style={{ color: "var(--color-text-muted)" }}
            >
              Set up a new interview session
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{ color: "var(--color-text-muted)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "var(--color-accent-bg)";
              (e.currentTarget as HTMLElement).style.color =
                "var(--color-accent)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "";
              (e.currentTarget as HTMLElement).style.color =
                "var(--color-text-muted)";
            }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex-1 space-y-5">
          {/* Error banner */}
          {error && (
            <div
              className="text-sm px-4 py-3 rounded-xl"
              style={{
                background: "rgba(239,68,68,0.10)",
                border: "1px solid rgba(239,68,68,0.28)",
                color: "var(--color-danger)",
              }}
            >
              {error}
            </div>
          )}

          {/* Student */}
          <div>
            <label
              className={FIELD_LABEL}
              style={{ color: "var(--color-text-muted)" }}
            >
              Student *
            </label>
            <div className="relative">
              <select
                value={form.student_id}
                onChange={(e) => set("student_id", e.target.value)}
                className="w-full rounded-lg px-3 py-2.5 pr-9 text-sm appearance-none"
                style={{ ...INPUT_BASE, borderRadius: "8px" }}
                onFocus={focusBorder}
                onBlur={blurBorder}
              >
                <option
                  value=""
                  style={{ background: "var(--color-bg-surface)" }}
                >
                  Select student…
                </option>
                {apps.map((a) => (
                  <option
                    key={a.student_id}
                    value={a.student_id}
                    style={{ background: "var(--color-bg-surface)" }}
                  >
                    {a.student_name}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={13}
                className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: "var(--color-text-muted)" }}
              />
            </div>
          </div>

          {/* Job Role */}
          <div>
            <label
              className={FIELD_LABEL}
              style={{ color: "var(--color-text-muted)" }}
            >
              Job Role *
            </label>
            <div className="relative">
              <select
                value={form.job_id}
                onChange={(e) => set("job_id", e.target.value)}
                className="w-full rounded-lg px-3 py-2.5 pr-9 text-sm appearance-none"
                style={{ ...INPUT_BASE, borderRadius: "8px" }}
                onFocus={focusBorder}
                onBlur={blurBorder}
              >
                <option
                  value=""
                  style={{ background: "var(--color-bg-surface)" }}
                >
                  Select job…
                </option>
                {jobs.map((j) => (
                  <option
                    key={j.id}
                    value={j.id}
                    style={{ background: "var(--color-bg-surface)" }}
                  >
                    {j.role_title}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={13}
                className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: "var(--color-text-muted)" }}
              />
            </div>
          </div>

          {/* Date & Time */}
          <div>
            <label
              className={FIELD_LABEL}
              style={{ color: "var(--color-text-muted)" }}
            >
              Date & Time *
            </label>
            <input
              type="datetime-local"
              value={form.scheduled_at}
              onChange={(e) => set("scheduled_at", e.target.value)}
              className="w-full rounded-lg px-3 py-2.5 text-sm theme-input"
              style={{ ...INPUT_BASE, borderRadius: "8px" }}
              onFocus={focusBorder}
              onBlur={blurBorder}
            />
          </div>

          {/* Mode */}
          <div>
            <label
              className={FIELD_LABEL}
              style={{ color: "var(--color-text-muted)" }}
            >
              Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["google_meet", "zoom", "offline"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => set("mode", m)}
                  className="py-2.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                  style={
                    form.mode === m
                      ? {
                          background: "#7c3aed",
                          color: "#ffffff",
                          border: "1px solid #7c3aed",
                        }
                      : {
                          background: "transparent",
                          color: "var(--color-text-muted)",
                          border: "1px solid var(--color-border)",
                        }
                  }
                >
                  <ModeIcon mode={m} />
                  {m === "google_meet"
                    ? "Meet"
                    : m === "zoom"
                      ? "Zoom"
                      : "Offline"}
                </button>
              ))}
            </div>
          </div>

          {/* Meeting Link */}
          {form.mode !== "offline" && (
            <div>
              <label
                className={FIELD_LABEL}
                style={{ color: "var(--color-text-muted)" }}
              >
                Meeting Link
              </label>
              <input
                value={form.meeting_link}
                onChange={(e) => set("meeting_link", e.target.value)}
                placeholder="https://meet.google.com/..."
                className="w-full rounded-lg px-3 py-2.5 text-sm theme-input"
                style={{ ...INPUT_BASE, borderRadius: "8px" }}
                onFocus={focusBorder}
                onBlur={blurBorder}
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label
              className={FIELD_LABEL}
              style={{ color: "var(--color-text-muted)" }}
            >
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              placeholder="Interview instructions, topics to cover…"
              className="w-full rounded-lg px-3 py-2.5 text-sm resize-none theme-input"
              style={{ ...INPUT_BASE, borderRadius: "8px" }}
              onFocus={focusBorder}
              onBlur={blurBorder}
            />
          </div>

          {/* Actions */}
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
                (e.currentTarget as HTMLElement).style.background =
                  "var(--color-accent-bg)";
                (e.currentTarget as HTMLElement).style.borderColor =
                  "var(--color-accent-border)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "transparent";
                (e.currentTarget as HTMLElement).style.borderColor =
                  "var(--color-border)";
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
              {submitting ? "Scheduling…" : "Schedule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Feedback Modal
───────────────────────────────────────────── */
function FeedbackModal({
  interview,
  onClose,
}: {
  interview: Interview;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(interview.feedback_rating ?? 0);
  const [comment, setComment] = useState(interview.feedback_comment ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await adminApi.updateInterview(interview.id, {
      status: "completed",
      feedback_rating: rating,
      feedback_comment: comment,
    });
    queryClient.invalidateQueries({ queryKey: ["admin-interviews"] });
    setSaving(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-md rounded-2xl"
        style={{
          background: "var(--color-bg-surface)",
          border: "1px solid var(--color-border)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <h2
            className="text-base font-bold"
            style={{ color: "var(--color-text)" }}
          >
            Interview Feedback
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{ color: "var(--color-text-muted)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "var(--color-accent-bg)";
              (e.currentTarget as HTMLElement).style.color =
                "var(--color-accent)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "";
              (e.currentTarget as HTMLElement).style.color =
                "var(--color-text-muted)";
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Interview info */}
          <div
            className="rounded-xl p-4"
            style={{
              background: "var(--color-bg-elevated)",
              border: "1px solid var(--color-border)",
            }}
          >
            <p
              className="text-[10px] font-semibold uppercase tracking-wider mb-1"
              style={{ color: "var(--color-text-muted)" }}
            >
              Interview For
            </p>
            <p className="font-bold" style={{ color: "var(--color-text)" }}>
              {interview.student_name}
            </p>
            <p
              className="text-sm mt-0.5"
              style={{ color: "var(--color-accent)" }}
            >
              {interview.role_title}
            </p>
          </div>

          {/* Star rating */}
          <div>
            <p
              className="text-[10px] font-semibold uppercase tracking-wider mb-3"
              style={{ color: "var(--color-text-muted)" }}
            >
              Rating
            </p>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setRating(n)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    size={28}
                    fill={n <= rating ? "#f59e0b" : "none"}
                    style={{
                      color:
                        n <= rating ? "#f59e0b" : "var(--color-border-strong)",
                    }}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span
                  className="ml-1 text-sm font-bold"
                  style={{ color: "#f59e0b" }}
                >
                  {rating}/5
                </span>
              )}
            </div>
          </div>

          {/* Comments */}
          <div>
            <label
              className="text-[10px] font-semibold uppercase tracking-wider block mb-1.5"
              style={{ color: "var(--color-text-muted)" }}
            >
              Comments
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              placeholder="How did the interview go? Any highlights or concerns?"
              className="w-full rounded-lg px-3 py-2.5 text-sm resize-none theme-input"
              style={{
                background: "var(--color-bg-elevated)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text)",
                outline: "none",
                borderRadius: "8px",
              }}
              onFocus={(e) => {
                (e.target as HTMLElement).style.borderColor =
                  "var(--color-accent)";
              }}
              onBlur={(e) => {
                (e.target as HTMLElement).style.borderColor =
                  "var(--color-border)";
              }}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={{
                border: "1px solid var(--color-border)",
                color: "var(--color-text-secondary)",
                background: "transparent",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "var(--color-accent-bg)";
                (e.currentTarget as HTMLElement).style.borderColor =
                  "var(--color-accent-border)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "transparent";
                (e.currentTarget as HTMLElement).style.borderColor =
                  "var(--color-border)";
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || rating === 0}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-60"
              style={{ background: "#7c3aed", color: "#ffffff" }}
              onMouseEnter={(e) => {
                if (!saving && rating > 0)
                  (e.currentTarget as HTMLElement).style.background = "#6d28d9";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#7c3aed";
              }}
            >
              {saving ? "Saving…" : "Save Feedback"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main AdminInterviews Page
───────────────────────────────────────────── */
export default function AdminInterviews() {
  const queryClient = useQueryClient();
  const [showSchedule, setShowSchedule] = useState(false);
  const [feedbackInterview, setFeedbackInterview] = useState<Interview | null>(
    null,
  );

  const { data, isLoading } = useQuery({
    queryKey: ["admin-interviews"],
    queryFn: () => adminApi.listInterviews(),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) =>
      adminApi.updateInterview(id, { status: "cancelled" }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin-interviews"] }),
  });

  const interviews: Interview[] = data?.data?.data ?? [];

  const statCards = [
    {
      label: "Upcoming",
      value: interviews.filter((iv) => iv.status === "scheduled").length,
      color: "#3b82f6",
    },
    {
      label: "Completed",
      value: interviews.filter((iv) => iv.status === "completed").length,
      color: "#10b981",
    },
    {
      label: "Total Scheduled",
      value: interviews.length,
      color: "#7c3aed",
    },
  ];

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
              Interviews
            </h1>
            <p
              className="text-sm mt-0.5"
              style={{ color: "var(--color-text-muted)" }}
            >
              Schedule and track candidate interviews
            </p>
          </div>
          <button
            onClick={() => setShowSchedule(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all"
            style={{ background: "#7c3aed", color: "#ffffff" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "#6d28d9";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "#7c3aed";
            }}
          >
            <Plus size={16} /> Schedule Interview
          </button>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {statCards.map(({ label, value, color }) => (
            <div
              key={label}
              className="glass-card flex flex-col items-center justify-center py-7 px-4"
            >
              <p
                className="text-sm mb-2 font-medium"
                style={{ color: "var(--color-text-muted)" }}
              >
                {label}
              </p>
              <p className="text-5xl font-bold" style={{ color }}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* ── Table ── */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr
                  style={{
                    background: "var(--color-bg-elevated)",
                    borderBottom: "1px solid var(--color-border)",
                  }}
                >
                  {[
                    "Student",
                    "Job Role",
                    "Date & Time",
                    "Mode",
                    "Link",
                    "Status",
                    "Rating",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-left"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {/* Loading */}
                {isLoading ? (
                  [...Array(4)].map((_, i) => (
                    <tr
                      key={i}
                      style={{ borderBottom: "1px solid var(--color-border)" }}
                    >
                      {[...Array(8)].map((__, j) => (
                        <td key={j} className="px-5 py-3">
                          <div className="skeleton h-4 rounded" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : interviews.length === 0 ? (
                  /* Empty state */
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-16 text-center"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      <CalendarDays
                        size={36}
                        className="mx-auto mb-3 opacity-25"
                      />
                      <p className="text-sm font-medium">
                        No interviews scheduled
                      </p>
                    </td>
                  </tr>
                ) : (
                  /* Data rows */
                  interviews.map((iv, i) => (
                    <tr
                      key={iv.id}
                      className="transition-colors"
                      style={
                        i < interviews.length - 1
                          ? { borderBottom: "1px solid var(--color-border)" }
                          : {}
                      }
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background =
                          "var(--color-accent-bg-hover)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = "";
                      }}
                    >
                      {/* Student */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{
                              background:
                                "linear-gradient(135deg,#7c3aed,#4f46e5)",
                            }}
                          >
                            {iv.student_name?.[0]?.toUpperCase()}
                          </div>
                          <span
                            className="text-sm font-semibold"
                            style={{ color: "var(--color-text)" }}
                          >
                            {iv.student_name}
                          </span>
                        </div>
                      </td>

                      {/* Job Role */}
                      <td
                        className="px-5 py-4 text-sm"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        {iv.role_title}
                      </td>

                      {/* Date & Time */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <p
                          className="text-sm font-medium"
                          style={{ color: "var(--color-text)" }}
                        >
                          {new Date(iv.scheduled_at).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric", year: "numeric" },
                          )}
                        </p>
                        <p
                          className="text-xs mt-0.5"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          {new Date(iv.scheduled_at).toLocaleTimeString(
                            "en-US",
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                        </p>
                      </td>

                      {/* Mode */}
                      <td className="px-5 py-4">
                        <span
                          className="flex items-center gap-1.5 text-xs font-semibold"
                          style={{
                            color:
                              MODE_COLORS[iv.mode] ?? "var(--color-text-muted)",
                          }}
                        >
                          <ModeIcon mode={iv.mode} />
                          {MODE_LABELS[iv.mode] ?? iv.mode}
                        </span>
                      </td>

                      {/* Link */}
                      <td className="px-5 py-4">
                        {iv.meeting_link ? (
                          <a
                            href={iv.meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-70"
                            style={{ color: "var(--color-accent)" }}
                          >
                            <Link size={11} /> Join
                          </a>
                        ) : (
                          <span
                            className="text-xs"
                            style={{ color: "var(--color-border-strong)" }}
                          >
                            —
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <StatusBadge status={iv.status} />
                      </td>

                      {/* Rating */}
                      <td className="px-5 py-4">
                        {iv.feedback_rating ? (
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <Star
                                key={n}
                                size={13}
                                fill={
                                  n <= iv.feedback_rating! ? "#f59e0b" : "none"
                                }
                                style={{
                                  color:
                                    n <= iv.feedback_rating!
                                      ? "#f59e0b"
                                      : "var(--color-border-strong)",
                                }}
                              />
                            ))}
                          </div>
                        ) : (
                          <span
                            className="text-xs"
                            style={{ color: "var(--color-border-strong)" }}
                          >
                            —
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {iv.status === "scheduled" && (
                            <>
                              <button
                                onClick={() => setFeedbackInterview(iv)}
                                className="text-xs font-semibold transition-colors"
                                style={{ color: "var(--color-accent)" }}
                                onMouseEnter={(e) => {
                                  (
                                    e.currentTarget as HTMLElement
                                  ).style.opacity = "0.7";
                                }}
                                onMouseLeave={(e) => {
                                  (
                                    e.currentTarget as HTMLElement
                                  ).style.opacity = "1";
                                }}
                              >
                                Feedback
                              </button>
                              <button
                                onClick={() => cancelMutation.mutate(iv.id)}
                                className="text-xs font-semibold transition-colors"
                                style={{ color: "var(--color-danger)" }}
                                onMouseEnter={(e) => {
                                  (
                                    e.currentTarget as HTMLElement
                                  ).style.opacity = "0.7";
                                }}
                                onMouseLeave={(e) => {
                                  (
                                    e.currentTarget as HTMLElement
                                  ).style.opacity = "1";
                                }}
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          {iv.status === "completed" && !iv.feedback_rating && (
                            <button
                              onClick={() => setFeedbackInterview(iv)}
                              className="text-xs font-semibold transition-colors"
                              style={{ color: "#f59e0b" }}
                              onMouseEnter={(e) => {
                                (e.currentTarget as HTMLElement).style.opacity =
                                  "0.7";
                              }}
                              onMouseLeave={(e) => {
                                (e.currentTarget as HTMLElement).style.opacity =
                                  "1";
                              }}
                            >
                              Add Feedback
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Schedule slide-over */}
      {showSchedule && (
        <ScheduleSlideOver
          onClose={() => setShowSchedule(false)}
          onSuccess={() =>
            queryClient.invalidateQueries({ queryKey: ["admin-interviews"] })
          }
        />
      )}

      {/* Feedback modal */}
      {feedbackInterview && (
        <FeedbackModal
          interview={feedbackInterview}
          onClose={() => setFeedbackInterview(null)}
        />
      )}
    </AdminLayout>
  );
}
