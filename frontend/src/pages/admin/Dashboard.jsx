import { useState, useEffect } from "react";
import api from "../../api/axios";
import StatCard from "../../components/ui/StatCard";
import Card, { CardHeader } from "../../components/ui/Card";
import { StatusBadge } from "../../components/ui/Badge";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import EmptyState from "../../components/ui/EmptyState";

const fmtCurrency = (n) => `PKR ${Number(n || 0).toLocaleString()}`;
const fmtDate = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/reports/dashboard")
      .then((r) => setStats(r.data.data))
      .catch((e) => setError(e.response?.data?.message || "Failed to load dashboard stats."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <LoadingSpinner size="lg" />
    </div>
  );

  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700 text-sm">{error}</div>
  );

  const s = stats;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Overview of your society</p>
      </div>

      {/* Stat cards row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Residents"
          value={s.residents.total}
          subtitle={`${s.residents.pending} pending approval`}
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
          color="indigo"
        />
        <StatCard
          title="Houses"
          value={s.houses.total}
          subtitle={`${s.houses.occupied} occupied, ${s.houses.vacant} vacant`}
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>}
          color="blue"
        />
        <StatCard
          title="Open Complaints"
          value={s.complaints.pending}
          subtitle={`${s.complaints.resolved} resolved total`}
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
          color="yellow"
        />
        <StatCard
          title="Unpaid Bills"
          value={s.payments.unpaid}
          subtitle={fmtCurrency(s.payments.pendingRevenue) + " pending"}
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          color="red"
        />
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={fmtCurrency(s.payments.totalRevenue)}
          subtitle={`${s.payments.paid} bills paid`}
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
          color="green"
        />
        <StatCard
          title="Active Notices"
          value={s.notices.active}
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>}
          color="purple"
        />
        <StatCard
          title="Visitors Inside"
          value={s.visitors.currentlyInside}
          subtitle={`${s.visitors.total} total logged`}
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
          color="teal"
        />
        <StatCard
          title="Total Complaints"
          value={s.complaints.total}
          subtitle={`${s.complaints.resolved} resolved`}
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>}
          color="pink"
        />
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Complaints */}
        <Card>
          <CardHeader title="Recent Complaints" subtitle="Last 5 complaints submitted" />
          {s.recentComplaints.length === 0 ? (
            <EmptyState icon="📋" title="No complaints yet" />
          ) : (
            <div className="space-y-3">
              {s.recentComplaints.map((c) => (
                <div key={c._id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{c.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{c.category} · {fmtDate(c.createdAt)}</p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Complaint breakdown */}
        <Card>
          <CardHeader title="Complaints by Category" />
          {s.charts.complaintsByCategory.length === 0 ? (
            <EmptyState icon="📊" title="No data yet" />
          ) : (
            <div className="space-y-3">
              {s.charts.complaintsByCategory.map((c) => {
                const total = s.complaints.total || 1;
                const pct = Math.round((c.count / total) * 100);
                const colors = { Water: "bg-blue-500", Electricity: "bg-yellow-500", Sanitation: "bg-green-500", Security: "bg-red-500", Other: "bg-gray-500" };
                return (
                  <div key={c._id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-700">{c._id}</span>
                      <span className="text-sm font-medium text-gray-900">{c.count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${colors[c._id] || "bg-indigo-500"} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Pending residents alert */}
      {s.residents.pending > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="text-amber-800 font-semibold text-sm">{s.residents.pending} resident{s.residents.pending > 1 ? "s" : ""} awaiting approval</p>
            <p className="text-amber-600 text-xs mt-0.5">Go to Residents → Pending to review and approve or reject them.</p>
          </div>
          <a href="/admin/residents" className="ml-auto text-amber-700 hover:text-amber-900 text-sm font-medium whitespace-nowrap">Review →</a>
        </div>
      )}
    </div>
  );
}
