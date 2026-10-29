import React, { useState, useEffect } from "react";
import api from "../../api/axios";
import Card, { CardHeader } from "../../components/ui/Card";
import { PageLoader } from "../../components/ui/LoadingSpinner";

export default function AdminReports() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/reports/dashboard")
      .then((r) => setStats(r.data.data))
      .catch((e) => setError(e.response?.data?.message || "Failed to load reports."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;
  if (error) return <div className="p-6 rounded-2xl bg-rose-50 text-rose-700 text-sm">{error}</div>;

  const { payments, charts = {}, complaints, houses } = stats;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Reports & Analytics</h1>
        <p className="text-xs text-gray-500 mt-0.5">Comprehensive audit, billing metrics, and issue breakdown</p>
      </div>

      {/* Financial Health Overview */}
      <Card>
        <CardHeader title="Financial Health & Cashflow" subtitle="Aggregate maintenance collections and dues" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-100">
            <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Total Received</p>
            <p className="text-2xl font-black text-emerald-900 mt-1">
              PKR {(payments?.totalRevenue || 0).toLocaleString()}
            </p>
            <p className="text-[11px] text-emerald-700 mt-1">{payments?.paid || 0} invoices settled</p>
          </div>
          <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-100">
            <p className="text-xs font-semibold text-rose-800 uppercase tracking-wider">Total Uncollected</p>
            <p className="text-2xl font-black text-rose-900 mt-1">
              PKR {(payments?.pendingRevenue || 0).toLocaleString()}
            </p>
            <p className="text-[11px] text-rose-700 mt-1">{payments?.unpaid || 0} invoices pending payment</p>
          </div>
          <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-100">
            <p className="text-xs font-semibold text-indigo-800 uppercase tracking-wider">Recovery Ratio</p>
            <p className="text-2xl font-black text-indigo-900 mt-1">
              {payments?.total ? Math.round(((payments?.paid || 0) / payments.total) * 100) : 0}%
            </p>
            <p className="text-[11px] text-indigo-700 mt-1">of total {payments?.total || 0} billed periods</p>
          </div>
        </div>
      </Card>

      {/* Category and Status Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Complaints by Category" subtitle="Service ticket volume distribution" />
          <div className="space-y-3">
            {charts.complaintsByCategory?.length === 0 ? (
              <p className="text-xs text-gray-400 py-4">No complaint records available.</p>
            ) : (
              charts.complaintsByCategory?.map((cat) => {
                const total = complaints?.total || 1;
                const pct = Math.round((cat.count / total) * 100);
                return (
                  <div key={cat._id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-gray-700">{cat._id}</span>
                      <span className="font-bold text-gray-900">
                        {cat.count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Complaints by Resolution Status" subtitle="Work order operational progress" />
          <div className="space-y-3">
            {charts.complaintsByStatus?.length === 0 ? (
              <p className="text-xs text-gray-400 py-4">No complaint records available.</p>
            ) : (
              charts.complaintsByStatus?.map((st) => {
                const total = complaints?.total || 1;
                const pct = Math.round((st.count / total) * 100);
                const colors = {
                  Pending: "bg-amber-500",
                  "In Progress": "bg-sky-500",
                  Resolved: "bg-emerald-500",
                  Rejected: "bg-rose-500",
                };
                return (
                  <div key={st._id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-gray-700">{st._id}</span>
                      <span className="font-bold text-gray-900">
                        {st.count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${colors[st._id] || "bg-indigo-600"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {/* Monthly Dues Overview */}
      <Card>
        <CardHeader title="Monthly Billing Records" subtitle="Overview of generated monthly billing cycles" />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wider font-semibold">
                <th className="py-2.5 px-4">Period</th>
                <th className="py-2.5 px-4">Total Invoices</th>
                <th className="py-2.5 px-4">Paid Collections</th>
                <th className="py-2.5 px-4">Outstanding</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {charts.monthlyPayments?.map((m) => (
                <tr key={m._id} className="hover:bg-gray-50/60 font-medium">
                  <td className="py-3 px-4 font-mono font-bold text-gray-800">{m._id}</td>
                  <td className="py-3 px-4 text-gray-600">{m.count} bills</td>
                  <td className="py-3 px-4 text-emerald-600 font-bold">PKR {Number(m.paid || 0).toLocaleString()}</td>
                  <td className="py-3 px-4 text-rose-600 font-bold">PKR {Number(m.unpaid || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
