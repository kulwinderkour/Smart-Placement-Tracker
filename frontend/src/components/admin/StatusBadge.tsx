type Status =
  | "applied"
  | "online_test"
  | "technical_round"
  | "hr_round"
  | "offer"
  | "rejected"
  | "shortlisted"
  | "active"
  | "closed"
  | "draft"
  | "scheduled"
  | "completed"
  | "cancelled";

const CONFIG: Record<Status, { label: string; bg: string; text: string }> = {
  applied: { label: "New", bg: "rgba(59,130,246,0.15)", text: "#60a5fa" },
  online_test: {
    label: "Online Test",
    bg: "rgba(249,115,22,0.15)",
    text: "#fb923c",
  },
  technical_round: {
    label: "Technical",
    bg: "rgba(139,92,246,0.15)",
    text: "#a78bfa",
  },
  hr_round: { label: "HR Round", bg: "rgba(20,184,166,0.15)", text: "#2dd4bf" },
  offer: { label: "Offer", bg: "rgba(34,197,94,0.15)", text: "#4ade80" },
  rejected: { label: "Rejected", bg: "rgba(239,68,68,0.15)", text: "#f87171" },
  shortlisted: {
    label: "Shortlisted",
    bg: "rgba(16,185,129,0.15)",
    text: "",
  },
  active: { label: "Active", bg: "rgba(34,197,94,0.15)", text: "#4ade80" },
  closed: { label: "Closed", bg: "rgba(100,116,139,0.15)", text: "#94a3b8" },
  draft: { label: "Draft", bg: "rgba(100,116,139,0.15)", text: "#94a3b8" },
  scheduled: {
    label: "Scheduled",
    bg: "rgba(59,130,246,0.15)",
    text: "#60a5fa",
  },
  completed: {
    label: "Completed",
    bg: "rgba(34,197,94,0.15)",
    text: "#4ade80",
  },
  cancelled: {
    label: "Cancelled",
    bg: "rgba(239,68,68,0.15)",
    text: "#f87171",
  },
};

export default function StatusBadge({ status }: { status: string }) {
  const cfg = CONFIG[status as Status] ?? {
    label: status,
    bg: "rgba(100,116,139,0.15)",
    text: "#94a3b8",
  };
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.text }}
    >
      {cfg.label}
    </span>
  );
}
