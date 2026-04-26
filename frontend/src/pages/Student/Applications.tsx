import { useEffect, useMemo, useState } from "react";
import { applicationsApi, type TrackedApplication } from "../../api/applications";

const TABS = ["Everything", "Pending", "Approved", "Rejected", "Shortlisted"] as const;
type Tab = (typeof TABS)[number];

const STATUS_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  Pending: { bg: "rgba(240,180,41,0.12)", color: "#f0b429", border: "1px solid rgba(240,180,41,0.32)" },
  Approved: { bg: "rgba(63,185,80,0.12)", color: "#3fb950", border: "1px solid rgba(63,185,80,0.32)" },
  Rejected: { bg: "rgba(248,81,73,0.12)", color: "#f85149", border: "1px solid rgba(248,81,73,0.32)" },
  Shortlisted: { bg: "rgba(129,140,248,0.12)", color: "#818cf8", border: "1px solid rgba(129,140,248,0.32)" },
};

export default function ApplicationsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Everything");
  const [loading, setLoading] = useState(false);
  const [applications, setApplications] = useState<TrackedApplication[]>([]);
  const [counts, setCounts] = useState<Record<Tab, number>>({
    Everything: 0,
    Pending: 0,
    Approved: 0,
    Rejected: 0,
    Shortlisted: 0,
  });

  const fetchAllCounts = async () => {
    const all = await applicationsApi.myApplications();
    const list = all.data.applications || [];
    const nextCounts: Record<Tab, number> = {
      Everything: list.length,
      Pending: list.filter((a) => a.status === "Pending").length,
      Approved: list.filter((a) => a.status === "Approved").length,
      Rejected: list.filter((a) => a.status === "Rejected").length,
      Shortlisted: list.filter((a) => a.status === "Shortlisted").length,
    };
    setCounts(nextCounts);
  };

  const fetchData = async (tab: Tab) => {
    setLoading(true);
    try {
      const status = tab === "Everything" ? undefined : tab;
      const res = await applicationsApi.myApplications(status);
      setApplications(res.data.applications || []);
      await fetchAllCounts();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab]);

  const titleCount = useMemo(() => counts[activeTab], [counts, activeTab]);

  return (
    <div style={{ width: "100%", minHeight: "100vh", background: "var(--student-bg)", padding: "28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div>
          <h1 style={{ margin: 0, color: "var(--student-text)", fontSize: 26, fontWeight: 700 }}>Applications</h1>
          <p style={{ margin: "6px 0 0", color: "var(--student-text-muted)", fontSize: 13 }}>
            My History · Track your progress
          </p>
        </div>
        <button
          onClick={() => fetchData(activeTab)}
          style={{
            background: "var(--student-surface)",
            color: "var(--student-text)",
            border: "1px solid var(--student-border)",
            borderRadius: 8,
            padding: "8px 14px",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Live Sync
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {TABS.map((tab) => {
          const active = tab === activeTab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: active ? "var(--student-accent)" : "var(--student-surface)",
                color: active ? "#fff" : "var(--student-text-muted)",
                border: active ? "1px solid var(--student-accent)" : "1px solid var(--student-border)",
                borderRadius: 999,
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {tab} ({counts[tab]})
            </button>
          );
        })}
      </div>

      <div style={{ marginBottom: 12, color: "var(--student-text-muted)", fontSize: 12 }}>
        {loading ? "Loading..." : `${titleCount} result${titleCount === 1 ? "" : "s"}`}
      </div>

      {loading ? (
        <div style={{ color: "var(--student-text-muted)", fontSize: 13 }}>Loading applications...</div>
      ) : applications.length === 0 ? (
        <div
          style={{
            border: "1px solid var(--student-border)",
            borderRadius: 12,
            background: "var(--student-surface)",
            minHeight: 200,
            display: "grid",
            placeItems: "center",
            textAlign: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 28, marginBottom: 10 }}>📄</div>
            <div style={{ color: "var(--student-text-muted)", fontSize: 14 }}>No applications found.</div>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {applications.map((app) => {
            const st = STATUS_STYLE[app.status] || STATUS_STYLE.Pending;
            const applied = app.applied_at ? new Date(app.applied_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
            return (
              <div
                key={app.id}
                style={{
                  border: "1px solid var(--student-border)",
                  borderRadius: 12,
                  background: "var(--student-surface)",
                  padding: "14px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <div>
                  <div style={{ color: "var(--student-text)", fontSize: 15, fontWeight: 700 }}>
                    {app.jobTitle || app.role || "Untitled Job"}
                  </div>
                  <div style={{ color: "var(--student-text-secondary)", fontSize: 13, marginTop: 2 }}>
                    {app.company || "Unknown Company"}
                  </div>
                  <div style={{ color: "var(--student-text-muted)", fontSize: 12, marginTop: 6 }}>
                    Applied: {applied}
                  </div>
                </div>
                <span
                  style={{
                    ...st,
                    padding: "4px 10px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                  }}
                >
                  {app.status}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
