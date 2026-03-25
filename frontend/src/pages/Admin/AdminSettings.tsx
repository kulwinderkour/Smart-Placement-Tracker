import { useState } from "react";
import { Bell, Shield, Palette, CheckCircle } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";

interface Toggle {
  label: string;
  description: string;
  key: string;
}

const NOTIFICATION_TOGGLES: Toggle[] = [
  {
    key: "email_notifications",
    label: "Email notifications",
    description: "Receive updates via email",
  },
  {
    key: "new_application_alerts",
    label: "New application alerts",
    description: "Get notified when students apply",
  },
  {
    key: "interview_reminders",
    label: "Interview reminders",
    description: "Receive reminders before interviews",
  },
  {
    key: "weekly_digest",
    label: "Weekly digest",
    description: "Get a weekly summary report",
  },
];

/* ── Toggle switch — uses CSS variables for off state ── */
function ToggleSwitch({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      className="relative w-11 h-6 rounded-full transition-all duration-200 shrink-0"
      style={{
        background: enabled ? "#7c3aed" : "var(--color-border-strong)",
        transition: "background 0.2s ease",
      }}
      aria-checked={enabled}
      role="switch"
    >
      <span
        className="absolute top-0.5 w-5 h-5 rounded-full transition-all duration-200"
        style={{
          background: "white",
          left: enabled ? "calc(100% - 22px)" : "2px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
        }}
      />
    </button>
  );
}

/* ── Section card heading ── */
function SectionHead({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-5">
      <h2
        className="text-lg font-bold flex items-center gap-2"
        style={{ color: "var(--color-text)" }}
      >
        <Icon size={17} style={{ color: "var(--color-accent)" }} />
        {title}
      </h2>
      <p
        className="text-sm mt-0.5"
        style={{ color: "var(--color-text-muted)" }}
      >
        {subtitle}
      </p>
    </div>
  );
}

const INPUT_STYLE: React.CSSProperties = {
  background: "var(--color-bg-surface)",
  border: "1px solid var(--color-border)",
  color: "var(--color-text)",
  borderRadius: "8px",
  padding: "10px 12px",
  fontSize: "14px",
  outline: "none",
  transition: "border-color 0.15s ease",
};

const SELECT_STYLE: React.CSSProperties = {
  ...INPUT_STYLE,
  appearance: "none" as const,
  paddingRight: "12px",
  cursor: "pointer",
};

export default function AdminSettings() {
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    email_notifications: true,
    new_application_alerts: true,
    interview_reminders: true,
    weekly_digest: false,
    two_factor: false,
  });
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [language, setLanguage] = useState("English");
  const [timezone, setTimezone] = useState("IST (UTC+5:30)");
  const [saved, setSaved] = useState(false);

  const toggle = (key: string) => setToggles((p) => ({ ...p, [key]: !p[key] }));

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const focusStyle = (
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    (e.target as HTMLElement).style.borderColor = "var(--color-accent)";
    (e.target as HTMLElement).style.boxShadow =
      "0 0 0 2px var(--color-accent-bg)";
  };
  const blurStyle = (
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    (e.target as HTMLElement).style.borderColor = "var(--color-border)";
    (e.target as HTMLElement).style.boxShadow = "";
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-[900px] mx-auto page-enter">
        {/* ── Page header ── */}
        <div className="mb-6">
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--color-text)" }}
          >
            Settings
          </h1>
          <p
            className="text-sm mt-0.5"
            style={{ color: "var(--color-text-muted)" }}
          >
            Manage your preferences
          </p>
        </div>

        <div className="space-y-5">
          {/* ── Notifications ── */}
          <div className="glass-card p-6">
            <SectionHead
              icon={Bell}
              title="Notifications"
              subtitle="Configure how you receive notifications"
            />

            <div className="space-y-0">
              {NOTIFICATION_TOGGLES.map(({ key, label, description }, idx) => (
                <div
                  key={key}
                  className="flex items-center justify-between py-4"
                  style={
                    idx < NOTIFICATION_TOGGLES.length - 1
                      ? { borderBottom: "1px solid var(--color-border)" }
                      : {}
                  }
                >
                  <div>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: "var(--color-text)" }}
                    >
                      {label}
                    </p>
                    <p
                      className="text-sm mt-0.5"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {description}
                    </p>
                  </div>
                  <ToggleSwitch
                    enabled={!!toggles[key]}
                    onChange={() => toggle(key)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ── Security ── */}
          <div className="glass-card p-6">
            <SectionHead
              icon={Shield}
              title="Security"
              subtitle="Manage your security preferences"
            />

            <div className="space-y-5">
              {/* Two-factor */}
              <div
                className="flex items-center justify-between py-1 pb-5"
                style={{ borderBottom: "1px solid var(--color-border)" }}
              >
                <div>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: "var(--color-text)" }}
                  >
                    Two-factor authentication
                  </p>
                  <p
                    className="text-sm mt-0.5"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Add an extra layer of security
                  </p>
                </div>
                <ToggleSwitch
                  enabled={!!toggles.two_factor}
                  onChange={() => toggle("two_factor")}
                />
              </div>

              {/* Change password */}
              <div>
                <p
                  className="text-sm font-semibold mb-3"
                  style={{ color: "var(--color-text)" }}
                >
                  Change Password
                </p>
                <div className="flex gap-3">
                  <input
                    type="password"
                    placeholder="Current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="flex-1 theme-input"
                    style={INPUT_STYLE}
                    onFocus={focusStyle}
                    onBlur={blurStyle}
                  />
                  <input
                    type="password"
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="flex-1 theme-input"
                    style={INPUT_STYLE}
                    onFocus={focusStyle}
                    onBlur={blurStyle}
                  />
                  <button
                    className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                    style={{
                      border: "1px solid var(--color-border)",
                      color: "var(--color-text)",
                      background: "var(--color-bg-elevated)",
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
                        "var(--color-text)";
                      (e.currentTarget as HTMLElement).style.background =
                        "var(--color-bg-elevated)";
                    }}
                  >
                    Update
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Appearance ── */}
          <div className="glass-card p-6">
            <SectionHead
              icon={Palette}
              title="Appearance"
              subtitle="Customize your experience"
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Language */}
              <label className="flex flex-col gap-1.5">
                <span
                  className="text-sm font-semibold"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Language
                </span>
                <div className="relative">
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full"
                    style={SELECT_STYLE}
                    onFocus={focusStyle}
                    onBlur={blurStyle}
                  >
                    <option style={{ background: "var(--color-bg-surface)" }}>
                      English
                    </option>
                    <option style={{ background: "var(--color-bg-surface)" }}>
                      Hindi
                    </option>
                  </select>
                  <svg
                    className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </label>

              {/* Timezone */}
              <label className="flex flex-col gap-1.5">
                <span
                  className="text-sm font-semibold"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Timezone
                </span>
                <div className="relative">
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full"
                    style={SELECT_STYLE}
                    onFocus={focusStyle}
                    onBlur={blurStyle}
                  >
                    {[
                      "IST (UTC+5:30)",
                      "UTC",
                      "PST (UTC-8)",
                      "EST (UTC-5)",
                      "CET (UTC+1)",
                    ].map((tz) => (
                      <option
                        key={tz}
                        style={{ background: "var(--color-bg-surface)" }}
                      >
                        {tz}
                      </option>
                    ))}
                  </select>
                  <svg
                    className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </label>
            </div>
          </div>

          {/* ── Save button ── */}
          <div className="flex items-center gap-4 pt-2">
            <button
              onClick={handleSave}
              className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={{ background: "#7c3aed", color: "#ffffff" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#6d28d9";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#7c3aed";
              }}
            >
              Save All Settings
            </button>

            {saved && (
              <div
                className="flex items-center gap-1.5 text-xs font-semibold"
                style={{ color: "#16a34a" }}
              >
                <CheckCircle size={14} /> Settings saved!
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
