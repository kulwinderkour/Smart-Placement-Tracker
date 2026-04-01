import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  Users,
  CheckCircle,
  GraduationCap,
  Plus,
  Eye,
  CalendarDays,
  BarChart2,
} from "lucide-react";
import { companyJobsApi } from "../../api/companyJobs";
import { useAuthStore } from "../../store/authStore";
import { useCompanyProfileStore } from "../../store/companyProfileStore";
import StatusBadge from "../../components/admin/StatusBadge";
import AdminLayout from "../../components/admin/AdminLayout";

const MODULE_NOW_MS = Date.now();

const CARD_ICONS = [
  { iconBg: "rgba(124,58,237,0.15)", iconColor: "#7c3aed" },
  { iconBg: "rgba(59,130,246,0.15)", iconColor: "#3b82f6" },
  { iconBg: "rgba(16,185,129,0.15)", iconColor: "#10b981" },
  { iconBg: "rgba(245,158,11,0.15)", iconColor: "#f59e0b" },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { profile } = useCompanyProfileStore();
  const companyName =
    profile?.company_name ?? user?.email?.split("@")[0] ?? "Admin";

  const { data, isLoading } = useQuery({
    queryKey: ["company-stats"],
    queryFn: () => companyJobsApi.getStats(),
    refetchInterval: 30_000,
  });

  const stats = data?.data?.data;
  const shortlisted =
    (stats?.status_breakdown?.["hr_round"] ?? 0) +
    (stats?.status_breakdown?.["offer"] ?? 0);

  const METRIC_CARDS = [
    {
      title: "Active Jobs",
      value: isLoading ? "—" : (stats?.active_jobs ?? 0),
      subtitle: `${stats?.total_jobs ?? 0} total`,
      icon: <Briefcase size={20} />,
      ...CARD_ICONS[0],
    },
    {
      title: "Total Applicants",
      value: isLoading ? "—" : (stats?.total_applications ?? 0),
      subtitle: "across all jobs",
      icon: <Users size={20} />,
      ...CARD_ICONS[1],
    },
    {
      title: "Shortlisted",
      value: isLoading ? "—" : shortlisted,
      subtitle: "HR round + offers",
      icon: <CheckCircle size={20} />,
      ...CARD_ICONS[2],
    },
    {
      title: "Offers Made",
      value: isLoading ? "—" : (stats?.offer_count ?? 0),
      subtitle: `${stats?.offer_rate ?? 0}% offer rate`,
      icon: <GraduationCap size={20} />,
      ...CARD_ICONS[3],
    },
  ];

  const QUICK_ACTIONS = [
    { label: "Post Job", icon: Plus, path: "/admin/jobs" },
    { label: "Verified Jobs", icon: CheckCircle, path: "/admin/platform-jobs" },
    { label: "View Applicants", icon: Eye, path: "/admin/applicants" },
    {
      label: "Interviews",
      icon: CalendarDays,
      path: "/admin/interviews",
    },
    { label: "Analytics", icon: BarChart2, path: "/admin/analytics" },
  ];

  return (
    <AdminLayout>
      <div className="p-6 max-w-[1400px] mx-auto page-enter">
        {/* ── Header ── */}
        <div className="mb-7">
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--color-text)" }}
          >
            Welcome back, {companyName}! 👋
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: "var(--color-text-muted)" }}
          >
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        {/* ── Metric Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          {METRIC_CARDS.map((card) => (
            <div
              key={card.title}
              className="glass-card hover-card card-enter p-5 cursor-default"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p
                    className="text-sm mb-1"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {card.title}
                  </p>
                  <p
                    className="text-4xl font-bold mt-1"
                    style={{ color: "var(--color-text)" }}
                  >
                    {card.value}
                  </p>
                  <p
                    className="text-sm mt-1.5 font-medium"
                    style={{ color: "var(--color-accent)" }}
                  >
                    {card.subtitle}
                  </p>
                </div>
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: card.iconBg, color: card.iconColor }}
                >
                  {card.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Quick Actions ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {QUICK_ACTIONS.map(({ label, icon: Icon, path }) => (
            <button
              key={label}
              onClick={() => navigate(path)}
              className="glass-card hover-card flex flex-col items-center gap-2 py-5 px-4 transition-all duration-200 w-full"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: "var(--color-accent-bg)",
                  color: "var(--color-accent)",
                }}
              >
                <Icon size={20} />
              </div>
              <span
                className="text-sm font-medium"
                style={{ color: "var(--color-text)" }}
              >
                {label}
              </span>
            </button>
          ))}
        </div>

        {/* ── Bottom: Recent Applications + Recent Jobs ── */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Applications */}
          <div className="glass-card overflow-hidden">
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: "1px solid var(--color-border)" }}
            >
              <h2
                className="text-lg font-semibold"
                style={{ color: "var(--color-text)" }}
              >
                Recent Applications
              </h2>
              <button
                onClick={() => navigate("/admin/applicants")}
                className="text-xs font-medium transition-colors"
                style={{ color: "var(--color-accent)" }}
              >
                View all
              </button>
            </div>

            {isLoading ? (
              <div
                className="flex items-center justify-center h-32"
                style={{ color: "var(--color-text-muted)" }}
              >
                <div className="text-sm">Loading…</div>
              </div>
            ) : !stats?.recent_applications?.length ? (
              <div
                className="flex flex-col items-center justify-center h-32"
                style={{ color: "var(--color-text-muted)" }}
              >
                <Users size={28} className="mb-2 opacity-30" />
                <p className="text-sm">No applications yet</p>
              </div>
            ) : (
              <div>
                {stats.recent_applications.map(
                  (
                    app: {
                      id: string;
                      student_name?: string;
                      role_title?: string;
                      status: string;
                      applied_at?: string;
                    },
                    i: number,
                  ) => (
                    <div
                      key={app.id}
                      className="flex items-center gap-3 px-5 py-3.5 transition-colors cursor-pointer"
                      style={
                        i < stats.recent_applications.length - 1
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
                      {/* Avatar */}
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{
                          background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
                        }}
                      >
                        {app.student_name?.[0]?.toUpperCase() ?? "?"}
                      </div>

                      {/* Name + role */}
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-medium truncate"
                          style={{ color: "var(--color-text)" }}
                        >
                          {app.student_name}
                        </p>
                        <p
                          className="text-xs truncate"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          {app.role_title}
                        </p>
                      </div>

                      {/* Badge + time */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <StatusBadge status={app.status} />
                        {app.applied_at && (
                          <span
                            className="text-xs"
                            style={{ color: "var(--color-text-muted)" }}
                          >
                            {Math.floor(
                              (MODULE_NOW_MS -
                                new Date(app.applied_at).getTime()) /
                                3600000,
                            )}
                            h ago
                          </span>
                        )}
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>

          {/* Recent Jobs */}
          <div className="glass-card overflow-hidden">
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: "1px solid var(--color-border)" }}
            >
              <h2
                className="text-lg font-semibold"
                style={{ color: "var(--color-text)" }}
              >
                Recent Jobs
              </h2>
              <button
                onClick={() => navigate("/admin/jobs")}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                style={{ background: "#7c3aed", color: "#ffffff" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "#6d28d9";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "#7c3aed";
                }}
              >
                <Plus size={12} /> Post Job
              </button>
            </div>

            {isLoading ? (
              <div
                className="flex items-center justify-center h-32"
                style={{ color: "var(--color-text-muted)" }}
              >
                <div className="text-sm">Loading…</div>
              </div>
            ) : !stats?.recent_jobs?.length ? (
              <div
                className="flex flex-col items-center justify-center h-32"
                style={{ color: "var(--color-text-muted)" }}
              >
                <Briefcase size={28} className="mb-2 opacity-30" />
                <p className="text-sm">No jobs posted yet</p>
              </div>
            ) : (
              <div>
                {stats.recent_jobs.map(
                  (
                    job: {
                      id: string;
                      role_title?: string;
                      job_type?: string;
                      deadline?: string;
                      is_active?: boolean;
                      application_count?: number;
                    },
                    i: number,
                  ) => (
                    <div
                      key={job.id}
                      className="flex items-center gap-3 px-5 py-4 transition-colors cursor-pointer"
                      style={
                        i < stats.recent_jobs.length - 1
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
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-semibold truncate"
                          style={{ color: "var(--color-text)" }}
                        >
                          {job.role_title}
                        </p>
                        <p
                          className="text-xs mt-0.5"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          {job.job_type?.replace("_", "-")} ·{" "}
                          {job.deadline
                            ? `Deadline: ${new Date(
                                job.deadline,
                              ).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}`
                            : "No deadline"}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p
                          className="text-xl font-bold"
                          style={{ color: "var(--color-text)" }}
                        >
                          {job.application_count ?? 0}
                        </p>
                        <p
                          className="text-xs"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          applicants
                        </p>
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
