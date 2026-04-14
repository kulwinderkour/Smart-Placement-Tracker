import { useState } from "react";
import { User, LogOut, Sun, Moon } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { useNavigate } from "react-router-dom";
import { useCompanyProfileStore } from "../../store/companyProfileStore";
import { useTheme } from "../../hooks/use-theme";
import ConfirmActionModal from "../common/ConfirmActionModal";

export default function AdminTopBar() {
  const { user, logout } = useAuthStore();
  const { profile } = useCompanyProfileStore();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const companyName = profile?.company_name ?? "Company";
  const initials =
    (profile?.company_name?.[0] ?? user?.email?.[0] ?? "A").toUpperCase() +
    (profile?.company_name?.split(" ")?.[1]?.[0] ?? "").toUpperCase();

  return (
    <header
      className="h-[60px] flex items-center justify-between px-5 flex-shrink-0 z-30"
      style={{
        background: "var(--color-bg-base)",
        borderBottom: "1px solid var(--color-border)",
        transition: "background-color 0.25s ease, border-color 0.25s ease",
      }}
    >
      <div />

      {/* Right: theme toggle + bell + avatar */}
      <div className="flex items-center gap-3">
        {/* ── Sun / Moon toggle ── */}
        <button
          onClick={toggleTheme}
          title={
            theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
          }
          className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
          style={{
            background: "var(--color-bg-surface)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text-muted)",
            transition:
              "background-color 0.25s ease, border-color 0.2s ease, color 0.2s ease",
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
              "var(--color-text-muted)";
            (e.currentTarget as HTMLElement).style.background =
              "var(--color-bg-surface)";
          }}
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>



        {/* ── Avatar / dropdown ── */}
        <div className="relative">
          <ConfirmActionModal
            isOpen={showLogoutConfirm}
            title="Sign out"
            message="Do you want to exit?"
            confirmText="Yes"
            cancelText="No"
            onConfirm={() => {
              setShowLogoutConfirm(false);
              setDropdownOpen(false);
              logout();
              navigate("/landing");
            }}
            onCancel={() => setShowLogoutConfirm(false)}
          />
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex items-center gap-2.5 pl-1 pr-3 py-1.5 rounded-lg transition-all"
            style={{ border: "1px solid transparent" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "var(--color-bg-surface)";
              (e.currentTarget as HTMLElement).style.borderColor =
                "var(--color-border)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "";
              (e.currentTarget as HTMLElement).style.borderColor =
                "transparent";
            }}
          >
            <div className="user-avatar w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
              {initials || "A"}
            </div>
            <div className="hidden sm:block text-left">
              <p
                className="text-sm font-semibold leading-tight"
                style={{ color: "var(--color-text)" }}
              >
                {companyName}
              </p>
              <span className="admin-badge inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                Admin
              </span>
            </div>
          </button>

          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setDropdownOpen(false)}
              />
              <div
                className="absolute right-0 top-full mt-2 w-52 rounded-xl z-50 py-1.5 overflow-hidden"
                style={{
                  background: "var(--color-bg-surface)",
                  border: "1px solid var(--color-border)",
                  boxShadow: "0 16px 40px rgba(0,0,0,0.18)",
                }}
              >
                {/* User info row */}
                <div
                  className="px-4 py-3"
                  style={{ borderBottom: "1px solid var(--color-border)" }}
                >
                  <p
                    className="text-xs font-semibold truncate"
                    style={{ color: "var(--color-text)" }}
                  >
                    {user?.email}
                  </p>
                  <p
                    className="text-[10px] uppercase tracking-wider mt-0.5"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Administrator
                  </p>
                </div>

                {/* Company Profile */}
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate("/admin/company-profile");
                  }}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm transition-colors"
                  style={{ color: "var(--color-text-secondary)" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "var(--color-accent-bg)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "";
                  }}
                >
                  <User size={14} /> Company Profile
                </button>

                {/* Sign Out */}
                <button
                  onClick={() => {
                    setShowLogoutConfirm(true);
                  }}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm transition-colors"
                  style={{ color: "var(--color-danger)" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "var(--color-danger-bg)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "";
                  }}
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
