import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  Users,
  Search,
  Filter,
  Download,
  X,
  FileText,
  ChevronDown,
} from "lucide-react";
import { companyJobsApi } from "../../api/companyJobs";
import StatusBadge from "../../components/admin/StatusBadge";
import AdminLayout from "../../components/admin/AdminLayout";
import type { ApplicationWithStudent, Job } from "../../types";

const STATUS_OPTIONS = [
  "all",
  "applied",
  "online_test",
  "technical_round",
  "hr_round",
  "offer",
  "rejected",
];

/* ── Shared input/select base style (CSS-variable-aware) ── */
const INPUT_BASE: React.CSSProperties = {
  background: "var(--color-bg-surface)",
  border: "1px solid var(--color-border)",
  color: "var(--color-text)",
  outline: "none",
};

/* ─────────────────────────────────────────────
   Applicant Detail Modal
───────────────────────────────────────────── */
function StudentModal({
  app,
  onClose,
  onStatusChange,
}: {
  app: ApplicationWithStudent;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  const [status, setStatus] = useState(app.status);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onStatusChange(app.id, status);
    setSaving(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto"
        style={{
          background: "var(--color-bg-surface)",
          border: "1px solid var(--color-border)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
        }}
      >
        {/* Modal header */}
        <div
          className="flex items-center justify-between px-6 py-4 sticky top-0"
          style={{
            background: "var(--color-bg-surface)",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <h2
            className="text-base font-bold"
            style={{ color: "var(--color-text)" }}
          >
            Applicant Profile
          </h2>
          <button
            type="button"
            onClick={onClose}
            title="Close"
            aria-label="Close"
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
          {/* Avatar + name */}
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold shrink-0"
              style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}
            >
              {app.student_name?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div>
              <h3
                className="font-bold text-lg"
                style={{ color: "var(--color-text)" }}
              >
                {app.student_name}
              </h3>
              <p
                className="text-sm"
                style={{ color: "var(--color-text-muted)" }}
              >
                {app.college ?? "N/A"} · {app.branch ?? "N/A"}
              </p>
              {app.graduation_year && (
                <p
                  className="text-xs mt-0.5"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Class of {app.graduation_year}
                </p>
              )}
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ["CGPA", app.cgpa ? `${app.cgpa}/10` : "—"],
                ["Applied", new Date(app.applied_at).toLocaleDateString()],
              ] as [string, string][]
            ).map(([label, val]) => (
              <div
                key={label}
                className="rounded-lg p-3"
                style={{
                  background: "var(--color-bg-elevated)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <p
                  className="text-[10px] font-semibold uppercase tracking-wider mb-0.5"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {label}
                </p>
                <p
                  className="text-sm font-semibold"
                  style={{ color: "var(--color-text)" }}
                >
                  {val}
                </p>
              </div>
            ))}
          </div>

          {/* Applied for */}
          <div
            className="rounded-lg p-3"
            style={{
              background: "var(--color-accent-bg)",
              border: "1px solid var(--color-accent-border)",
            }}
          >
            <p
              className="text-[10px] font-semibold uppercase tracking-wider mb-1"
              style={{ color: "var(--color-text-muted)" }}
            >
              Applied For
            </p>
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--color-accent)" }}
            >
              {app.role_title}
            </p>
            {app.agent_applied ? (
              <p
                className="text-xs mt-2 leading-relaxed"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Submitted via Auto Apply — cover letter below was generated for this role.
              </p>
            ) : null}
          </div>

          {/* Cover letter / Gemini application text */}
          <div
            className="rounded-xl p-4"
            style={{
              background: "var(--color-bg-elevated)",
              border: "1px solid var(--color-border)",
            }}
          >
            <p
              className="text-[10px] font-semibold uppercase tracking-wider mb-2"
              style={{ color: "var(--color-text-muted)" }}
            >
              Cover letter / application message
            </p>
            {app.cover_letter && String(app.cover_letter).trim() ? (
              <div
                className="text-sm leading-relaxed rounded-lg p-3 max-h-64 overflow-y-auto"
                style={{
                  color: "var(--color-text)",
                  background: "var(--color-bg-surface)",
                  border: "1px solid var(--color-border)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {app.cover_letter}
              </div>
            ) : (
              <p
                className="text-sm italic"
                style={{ color: "var(--color-text-muted)" }}
              >
                No cover letter was submitted with this application.
              </p>
            )}
          </div>

          {/* Resume / LinkedIn links */}
          {(app.resume_url || app.linkedin_url) && (
            <div className="flex gap-2">
              {app.resume_url && (
                <a
                  href={app.resume_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-all"
                  style={{
                    background: "var(--color-accent-bg)",
                    color: "var(--color-accent)",
                    border: "1px solid var(--color-accent-border)",
                  }}
                >
                  <FileText size={13} /> View Resume
                </a>
              )}
              {app.linkedin_url && (
                <a
                  href={app.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-all"
                  style={{
                    background: "var(--color-bg-elevated)",
                    color: "var(--color-text-secondary)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  LinkedIn ↗
                </a>
              )}
            </div>
          )}

          {/* Status selector */}
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: "var(--color-text-muted)" }}
            >
              Update Status
            </p>
            <div className="grid grid-cols-3 gap-2">
              {STATUS_OPTIONS.filter((s) => s !== "all").map((s) => (
                <button
                  key={s}
                  onClick={() =>
                    setStatus(s as ApplicationWithStudent["status"])
                  }
                  className="py-2 px-3 rounded-lg text-xs font-semibold transition-all capitalize"
                  style={
                    status === s
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
                  {s.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
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
              disabled={saving || status === app.status}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-60"
              style={{ background: "#7c3aed", color: "#ffffff" }}
              onMouseEnter={(e) => {
                if (!saving && status !== app.status)
                  (e.currentTarget as HTMLElement).style.background = "#6d28d9";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#7c3aed";
              }}
            >
              {saving ? "Saving…" : "Update Status"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main AdminApplicants Page
───────────────────────────────────────────── */
export default function AdminApplicants() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [jobFilter, setJobFilter] = useState(searchParams.get("job") ?? "all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeApp, setActiveApp] = useState<ApplicationWithStudent | null>(
    null,
  );

  const { data: appsData, isLoading } = useQuery({
    queryKey: ["company-applicants", jobFilter, statusFilter],
    queryFn: () =>
      companyJobsApi.listApplicants(
        jobFilter === "all" ? undefined : jobFilter,
        statusFilter === "all" ? undefined : statusFilter,
      ),
  });

  const { data: jobsData } = useQuery({
    queryKey: ["company-jobs"],
    queryFn: () => companyJobsApi.list(1, 100),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      companyJobsApi.updateApplicantStatus(id, status),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["company-applicants"] }),
  });

  const apps: ApplicationWithStudent[] = appsData?.data?.data ?? [];
  const jobs: Job[] = jobsData?.data?.data ?? [];

  const filtered = apps.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.student_name?.toLowerCase().includes(q) ||
      a.college?.toLowerCase().includes(q)
    );
  });

  const bulkAction = async (status: string) => {
    for (const id of selected) {
      await statusMutation.mutateAsync({ id, status });
    }
    setSelected(new Set());
  };

  const SELECT_STYLE: React.CSSProperties = {
    ...INPUT_BASE,
    borderRadius: "8px",
    padding: "10px 36px 10px 12px",
    fontSize: "13px",
    appearance: "none",
    cursor: "pointer",
    minWidth: "130px",
  };

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
              Applicants
            </h1>
            <p
              className="text-sm mt-0.5"
              style={{ color: "var(--color-text-muted)" }}
            >
              Review and manage applications
            </p>
          </div>
        </div>

        {/* ── Filter bar ── */}
        <div className="flex flex-wrap gap-3 items-center mb-5">
          {/* Search input */}
          <div
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg flex-1 min-w-64"
            style={{
              background: "var(--color-bg-surface)",
              border: "1px solid var(--color-border)",
              transition: "border-color 0.15s ease",
            }}
          >
            <Search
              size={14}
              className="shrink-0"
              style={{ color: "var(--color-text-muted)" }}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search applicants..."
              className="bg-transparent text-sm outline-none w-full theme-input"
              style={{ color: "var(--color-text)" }}
            />
          </div>

          {/* Job filter */}
          <div className="relative">
            <select
              value={jobFilter}
              onChange={(e) => setJobFilter(e.target.value)}
              style={SELECT_STYLE}
            >
              <option
                value="all"
                style={{ background: "var(--color-bg-surface)" }}
              >
                All Jobs
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
              className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: "var(--color-text-muted)" }}
            />
          </div>

          {/* Status filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={SELECT_STYLE}
            >
              {STATUS_OPTIONS.map((s) => (
                <option
                  key={s}
                  value={s}
                  style={{ background: "var(--color-bg-surface)" }}
                >
                  {s === "all" ? "All Status" : s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <ChevronDown
              size={13}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: "var(--color-text-muted)" }}
            />
          </div>

          {/* More Filters */}
          <button
            className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-lg transition-all"
            style={{
              color: "var(--color-text-secondary)",
              border: "1px solid var(--color-border)",
              background: "transparent",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor =
                "var(--color-accent)";
              (e.currentTarget as HTMLElement).style.color =
                "var(--color-accent)";
              (e.currentTarget as HTMLElement).style.background =
                "var(--color-accent-bg)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor =
                "var(--color-border)";
              (e.currentTarget as HTMLElement).style.color =
                "var(--color-text-secondary)";
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            <Filter size={14} /> More Filters
          </button>
        </div>

        {/* ── Bulk actions bar ── */}
        {selected.size > 0 && (
          <div
            className="rounded-xl px-4 py-3 mb-4 flex items-center gap-4"
            style={{
              background: "var(--color-accent-bg)",
              border: "1px solid var(--color-accent-border)",
            }}
          >
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--color-accent)" }}
            >
              {selected.size} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => bulkAction("hr_round")}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                style={{
                  background: "rgba(34,197,94,0.15)",
                  color: "#16a34a",
                  border: "1px solid rgba(34,197,94,0.3)",
                }}
              >
                Shortlist
              </button>
              <button
                onClick={() => bulkAction("rejected")}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                style={{
                  background: "rgba(239,68,68,0.12)",
                  color: "var(--color-danger)",
                  border: "1px solid rgba(239,68,68,0.28)",
                }}
              >
                Reject
              </button>
              <button
                onClick={() => setSelected(new Set())}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                style={{
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text-muted)",
                  background: "transparent",
                }}
              >
                Clear
              </button>
            </div>
          </div>
        )}

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
                    "College / Branch",
                    "Applied For",
                    "Applied Date",
                    "Status",
                    "Resume",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3.5 text-xs font-semibold text-left uppercase tracking-wide"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {/* Loading skeletons */}
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr
                      key={i}
                      style={{ borderBottom: "1px solid var(--color-border)" }}
                    >
                      {[...Array(6)].map((__, j) => (
                        <td key={j} className="px-5 py-4">
                          <div className="skeleton h-4 rounded" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  /* Empty state */
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-16 text-center"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      <Users size={36} className="mx-auto mb-3 opacity-25" />
                      <p className="text-sm font-medium">No applicants found</p>
                    </td>
                  </tr>
                ) : (
                  /* Data rows */
                  filtered.map((app, i) => (
                    <tr
                      key={app.id}
                      onClick={() => setActiveApp(app)}
                      className="cursor-pointer transition-colors"
                      style={
                        i < filtered.length - 1
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
                      {/* Student name + avatar */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{
                              background:
                                "linear-gradient(135deg,#7c3aed,#4f46e5)",
                            }}
                          >
                            {app.student_name?.[0]?.toUpperCase() ?? "?"}
                          </div>
                          <div>
                            <p
                              className="text-sm font-semibold cursor-pointer underline-offset-2 decoration-transparent hover:decoration-current"
                              style={{ color: "var(--color-text)" }}
                              title="View applicant profile and cover letter"
                            >
                              {app.student_name}
                            </p>
                            {app.cgpa && (
                              <p
                                className="text-xs"
                                style={{ color: "var(--color-text-muted)" }}
                              >
                                CGPA: {app.cgpa}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* College / Branch */}
                      <td className="px-5 py-4">
                        <p
                          className="text-sm"
                          style={{ color: "var(--color-text-secondary)" }}
                        >
                          {app.college ?? "—"}
                          {app.branch ? ` · ${app.branch}` : ""}
                        </p>
                      </td>

                      {/* Applied For */}
                      <td
                        className="px-5 py-4 text-sm font-medium max-w-[200px]"
                        style={{ color: "var(--color-text)" }}
                      >
                        <div className="flex flex-col gap-1 min-w-0">
                          <span className="truncate">{app.role_title}</span>
                          {app.agent_applied ? (
                            <span
                              className="text-[10px] font-semibold uppercase tracking-wide w-fit px-1.5 py-0.5 rounded"
                              style={{
                                background: "rgba(32,201,151,0.12)",
                                color: "#20c997",
                                border: "1px solid rgba(32,201,151,0.28)",
                              }}
                              title="Submitted via Auto Apply agent"
                            >
                              Auto apply
                            </span>
                          ) : null}
                        </div>
                      </td>

                      {/* Applied Date */}
                      <td
                        className="px-5 py-4 text-sm whitespace-nowrap"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        {new Date(app.applied_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>

                      {/* Status badge */}
                      <td className="px-5 py-4">
                        <StatusBadge status={app.status} />
                      </td>

                      {/* Resume download */}
                      <td
                        className="px-5 py-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {app.resume_url ? (
                          <a
                            href={app.resume_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 transition-colors"
                            style={{ color: "var(--color-accent)" }}
                            title="Download Resume"
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLElement).style.opacity =
                                "0.7";
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLElement).style.opacity =
                                "1";
                            }}
                          >
                            <Download size={16} />
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
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Applicant detail modal */}
      {activeApp && (
        <StudentModal
          app={activeApp}
          onClose={() => setActiveApp(null)}
          onStatusChange={(id, status) =>
            statusMutation.mutateAsync({ id, status })
          }
        />
      )}
    </AdminLayout>
  );
}
