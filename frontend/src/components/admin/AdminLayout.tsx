import { useState } from "react";
import type { ReactNode } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminTopBar from "./AdminTopBar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className="admin-shell flex h-screen overflow-hidden"
      style={{
        background: "var(--color-bg-base)",
        fontFamily: "Inter, system-ui, sans-serif",
        transition: "background-color 0.25s ease",
      }}
    >
      {/* Sidebar */}
      <div className="hidden md:flex flex-col flex-shrink-0 h-full">
        <AdminSidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((v) => !v)}
        />
      </div>

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        <AdminTopBar onToggleSidebar={() => setCollapsed((v) => !v)} />
        <main
          className="flex-1 overflow-y-auto"
          style={{ background: "var(--color-bg-base)" }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
