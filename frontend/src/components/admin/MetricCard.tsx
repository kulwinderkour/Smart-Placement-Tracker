import type { ReactNode } from "react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  iconBg?: string;
  iconColor?: string;
  trend?: { value: number; label: string };
}

export default function MetricCard({
  title,
  value,
  subtitle,
  icon,
  iconBg,
  iconColor,
  trend,
}: MetricCardProps) {
  return (
    <div
      className="card-enter rounded-xl p-5 transition-all duration-200 cursor-default group"
      style={{
        background: "var(--color-bg-surface)",
        border: "1px solid var(--color-border)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border-strong)";
        (e.currentTarget as HTMLElement).style.transform = "scale(1.02)";
        (e.currentTarget as HTMLElement).style.boxShadow =
          "0 8px 30px var(--color-accent-glow)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border)";
        (e.currentTarget as HTMLElement).style.transform = "";
        (e.currentTarget as HTMLElement).style.boxShadow = "";
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p
            className="text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: "var(--color-text-muted)" }}
          >
            {title}
          </p>
          <p className="text-3xl font-bold leading-none" style={{ color: "var(--color-text)" }}>{value}</p>
          {subtitle && (
            <p
              className="text-xs mt-2 font-medium"
              style={{ color: "var(--color-accent)" }}
            >
              {subtitle}
            </p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span
                className={`text-xs font-semibold ${trend.value >= 0 ? "text-emerald-400" : "text-red-400"}`}
              >
                {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%
              </span>
              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                {trend.label}
              </span>
            </div>
          )}
        </div>
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ml-3"
          style={{
            background: iconBg ?? "var(--color-accent-bg)",
            color: iconColor ?? "var(--color-accent)",
          }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
