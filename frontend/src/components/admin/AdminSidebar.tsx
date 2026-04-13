import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { useCompanyProfileStore } from "../../store/companyProfileStore";
import ConfirmActionModal from "../common/ConfirmActionModal";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  CalendarDays,
  Building2,
  Settings,
  LogOut,
  GraduationCap,
  FilePlus2,
} from "lucide-react";

const NAV = [
  { path: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/admin/jobs", label: "Jobs", icon: Briefcase },
  {
    path: "/admin/jobs/post",
    label: "Post New Job",
    icon: FilePlus2,
  },
  { path: "/admin/applicants", label: "Applicants", icon: Users },
  { path: "/admin/interviews", label: "Interviews", icon: CalendarDays },
  { path: "/admin/company-profile", label: "Company Profile", icon: Building2 },
  { path: "/admin/settings", label: "Settings", icon: Settings },
];

interface Props {
  collapsed: boolean;
}

export default function AdminSidebar({ collapsed }: Props) {
  const location = useLocation();
  const { logout, user } = useAuthStore();
  const { profile } = useCompanyProfileStore();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };
  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    logout();
  };

  const initials = (
    profile?.company_name?.[0] ??
    user?.email?.[0] ??
    "A"
  ).toUpperCase();

  return (
    <aside
      className="flex flex-col h-full select-none"
      style={{
        width: collapsed ? 64 : 240,
        background: "var(--color-bg-base)",
        borderRight: "1px solid var(--color-border)",
        transition:
          "width 0.3s ease, background-color 0.25s ease, border-color 0.25s ease",
      }}
    >
      <ConfirmActionModal
        isOpen={showLogoutConfirm}
        title="Sign out"
        message="Do you want to exit?"
        confirmText="Yes"
        cancelText="No"
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      {/* ── Logo ── */}
      <div
        className="flex items-center h-[60px] px-4 gap-3 overflow-hidden flex-shrink-0"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}
        >
          <GraduationCap size={16} color="white" />
        </div>
        {!collapsed && (
          <span
            className="font-bold text-[15px] truncate tracking-tight"
            style={{ color: "var(--color-text)" }}
          >
            SmartPlacement
          </span>
        )}
      </div>

      {/* ── Nav links ── */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
        {NAV.map(({ path, label, icon: Icon }) => {
          const pathname = location.pathname;
          const active =
            pathname === path ||
            (pathname.startsWith(path + "/") &&
              !(
                path === "/admin/jobs" &&
                pathname.startsWith("/admin/jobs/post")
              ));
          return (
            <Link
              key={path}
              to={path}
              title={collapsed ? label : undefined}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
              style={
                active
                  ? {
                      background: "var(--color-accent-bg)",
                      color: "var(--color-accent-light)",
                      border: "1px solid var(--color-accent-border)",
                    }
                  : {
                      color: "var(--color-text-muted)",
                      border: "1px solid transparent",
                    }
              }
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background =
                    "var(--color-accent-bg-hover)";
                  (e.currentTarget as HTMLElement).style.color =
                    "var(--color-text-secondary)";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = "";
                  (e.currentTarget as HTMLElement).style.color =
                    "var(--color-text-muted)";
                }
              }}
            >
              <Icon size={17} className="flex-shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* ── Bottom section ── */}
      <div
        className="flex-shrink-0 px-2 pb-3 space-y-1"
        style={{
          borderTop: "1px solid var(--color-border)",
          paddingTop: "12px",
          transition: "border-color 0.25s ease",
        }}
      >
        {/* User info pill */}
        {!collapsed && (
          <div
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-2"
            style={{
              background: "var(--color-bg-surface)",
              border: "1px solid var(--color-border)",
              transition:
                "background-color 0.25s ease, border-color 0.25s ease",
            }}
          >
            <div className="user-avatar w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p
                className="text-xs font-semibold truncate leading-tight"
                style={{ color: "var(--color-text)" }}
              >
                {user?.email}
              </p>
              <span className="admin-badge inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-0.5">
                Admin
              </span>
            </div>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          title="Logout"
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-all"
          style={{ color: "var(--color-text-muted)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "var(--color-danger-bg)";
            (e.currentTarget as HTMLElement).style.color =
              "var(--color-danger)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "";
            (e.currentTarget as HTMLElement).style.color =
              "var(--color-text-muted)";
          }}
        >
          <LogOut size={15} className="flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>


      </div>
    </aside>
  );
}
