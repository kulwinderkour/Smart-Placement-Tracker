import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { BarChart2, TrendingUp, Users, Award } from "lucide-react";
import { adminApi } from "../../api/admin";
import AdminLayout from "../../components/admin/AdminLayout";

const FUNNEL_COLORS: Record<string, string> = {
  applied: "#7c3aed",
  online_test: "#f97316",
  technical_round: "#8b5cf6",
  hr_round: "#14b8a6",
  offer: "#22c55e",
  rejected: "#f43f5e",
};

const PIE_COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f97316",
  "#8b5cf6",
  "#14b8a6",
  "#f43f5e",
];

const CHART_TOOLTIP = {
  contentStyle: {
    background: "#1a1625",
    border: "1px solid #2d2540",
    borderRadius: 10,
    fontSize: 12,
    color: "white",
    padding: "8px 14px",
  },
  labelStyle: { color: "#c4b8e0" },
  itemStyle: { color: "#a78bfa" },
};

const AXIS_TICK = { fontSize: 11, fill: "#7c6fa0" };

export default function AdminAnalytics() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: () => adminApi.getAnalytics(),
  });

  const analytics = data?.data;

  const funnelData =
    analytics?.placement_funnel?.map(
      (f: { status: string; count: number }) => ({
        ...f,
        label: f.status.replace(/_/g, " "),
        fill: FUNNEL_COLORS[f.status] ?? "#7c3aed",
      }),
    ) ?? [];

  const totalApplicants =
    analytics?.placement_funnel?.reduce(
      (s: number, f: { count: number }) => s + f.count,
      0,
    ) ?? 0;

  const STAT_CARDS = [
    {
      label: "Offer Rate",
      value: `${analytics?.offer_rate ?? 0}%`,
      icon: Award,
      iconBg: "rgba(34,197,94,0.18)",
      iconColor: "#4ade80",
    },
    {
      label: "Shortlist Rate",
      value: `${analytics?.shortlist_rate ?? 0}%`,
      icon: TrendingUp,
      iconBg: "rgba(59,130,246,0.18)",
      iconColor: "#60a5fa",
    },
    {
      label: "Total Applicants",
      value: totalApplicants,
      icon: Users,
      iconBg: "rgba(124,58,237,0.18)",
      iconColor: "#a78bfa",
    },
    {
      label: "Colleges",
      value: analytics?.top_colleges?.length ?? 0,
      icon: BarChart2,
      iconBg: "rgba(245,158,11,0.18)",
      iconColor: "#fbbf24",
    },
  ];

  return (
    <AdminLayout>
      <div className="p-6 max-w-[1400px] mx-auto page-enter">
        <div className="mb-7">
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-sm mt-0.5" style={{ color: "#7c6fa0" }}>
            Placement performance insights
          </p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {STAT_CARDS.map(({ label, value, icon: Icon, iconBg, iconColor }) => (
            <div
              key={label}
              className="glass-card hover-scale card-enter rounded-xl p-5 flex items-center gap-4 transition-all duration-150"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: iconBg, color: iconColor }}
              >
                <Icon size={22} />
              </div>
              <div>
                <p className="text-sm mb-1" style={{ color: "#7c6fa0" }}>
                  {label}
                </p>
                <p className="text-2xl font-bold" style={{ color: iconColor }}>
                  {isLoading ? "—" : value}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Applications Over Time */}
          <div className="glass-card p-5">
            <h2 className="text-lg font-semibold text-white mb-5">
              Applications Over Time
            </h2>
            {isLoading ? (
              <div className="skeleton h-56 rounded-lg" />
            ) : !analytics?.applications_over_time?.length ? (
              <div
                className="h-56 flex flex-col items-center justify-center"
                style={{ color: "#7c6fa0" }}
              >
                <TrendingUp size={32} className="mb-2 opacity-20" />
                <p className="text-sm">No application data yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={analytics.applications_over_time}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2d2540" />
                  <XAxis
                    dataKey="date"
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: string) =>
                      new Date(v).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    }
                  />
                  <YAxis
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    {...CHART_TOOLTIP}
                    labelFormatter={(v) =>
                      new Date(v as string).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#7c3aed"
                    strokeWidth={2.5}
                    dot={{
                      fill: "#a78bfa",
                      r: 4,
                      strokeWidth: 2,
                      stroke: "#7c3aed",
                    }}
                    activeDot={{ r: 6, fill: "#a78bfa" }}
                    name="Applications"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Placement Funnel */}
          <div className="glass-card p-5">
            <h2 className="text-lg font-semibold text-white mb-5">
              Placement Funnel
            </h2>
            {isLoading ? (
              <div className="skeleton h-56 rounded-lg" />
            ) : !funnelData.length ? (
              <div
                className="h-56 flex flex-col items-center justify-center"
                style={{ color: "#7c6fa0" }}
              >
                <BarChart2 size={32} className="mb-2 opacity-20" />
                <p className="text-sm">No funnel data yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={funnelData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#2d2540"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip {...CHART_TOOLTIP} />
                  <Bar dataKey="count" name="Applicants" radius={[6, 6, 0, 0]}>
                    {funnelData.map(
                      (entry: { fill: string }, index: number) => (
                        <Cell key={index} fill={entry.fill} />
                      ),
                    )}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Top Colleges */}
          <div className="glass-card p-5">
            <h2 className="text-lg font-semibold text-white mb-5">
              Top Colleges by Applications
            </h2>
            {isLoading ? (
              <div className="skeleton h-56 rounded-lg" />
            ) : !analytics?.top_colleges?.length ? (
              <div
                className="h-56 flex flex-col items-center justify-center"
                style={{ color: "#7c6fa0" }}
              >
                <Users size={32} className="mb-2 opacity-20" />
                <p className="text-sm">No college data yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={analytics.top_colleges.slice(0, 8)}
                  layout="vertical"
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#2d2540"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="college"
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={false}
                    width={80}
                    tickFormatter={(v: string) =>
                      v.length > 10 ? v.slice(0, 10) + "…" : v
                    }
                  />
                  <Tooltip {...CHART_TOOLTIP} />
                  <Bar
                    dataKey="count"
                    fill="#3b82f6"
                    name="Applications"
                    radius={[0, 6, 6, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Status Distribution Pie */}
          <div className="glass-card p-5">
            <h2 className="text-lg font-semibold text-white mb-5">
              Application Status
            </h2>
            {isLoading ? (
              <div className="skeleton h-56 rounded-lg" />
            ) : !funnelData.length ? (
              <div
                className="h-56 flex flex-col items-center justify-center"
                style={{ color: "#7c6fa0" }}
              >
                <BarChart2 size={32} className="mb-2 opacity-20" />
                <p className="text-sm">No data yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={funnelData}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    innerRadius={45}
                  >
                    {funnelData.map((_: unknown, index: number) => (
                      <Cell
                        key={index}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip {...CHART_TOOLTIP} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(v: string) => (
                      <span style={{ fontSize: 11, color: "#c4b8e0" }}>
                        {v}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
