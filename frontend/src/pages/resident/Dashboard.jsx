import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import StatCard from "../../components/ui/StatCard";
import Card, { CardHeader } from "../../components/ui/Card";
import { StatusBadge } from "../../components/ui/Badge";
import { PageLoader } from "../../components/ui/LoadingSpinner";
import EmptyState from "../../components/ui/EmptyState";

export default function ResidentDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState({ complaints: [], payments: [], notices: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/complaints?limit=5").catch(() => ({ data: { data: { complaints: [] } } })),
      api.get("/payments?limit=5").catch(() => ({ data: { data: { payments: [] } } })),
      api.get("/notices?limit=3").catch(() => ({ data: { data: { notices: [] } } })),
    ])
      .then(([cRes, pRes, nRes]) => {
        setData({
          complaints: cRes.data.data.complaints || [],
          payments: pRes.data.data.payments || [],
          notices: nRes.data.data.notices || [],
        });
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  const unpaidBills = data.payments.filter((p) => p.status === "Unpaid");
  const openComplaints = data.complaints.filter((c) => c.status === "Pending" || c.status === "In Progress");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Welcome home, {user?.name} 👋
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Unit Details: Block {user?.house?.block || "—"} - #{user?.house?.houseNumber || "—"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/resident/complaints"
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all"
          >
            + File a Complaint
          </Link>
          <Link
            to="/resident/ai"
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold shadow-sm transition-all"
          >
            🤖 AI Assistant
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Open Complaints"
          value={openComplaints.length}
          subtitle="Tickets in progress"
          color="yellow"
          icon={<span className="text-xl">📋</span>}
        />
        <StatCard
          title="Unpaid Maintenance"
          value={`PKR ${unpaidBills.reduce((s, b) => s + (b.amount || 0), 0).toLocaleString()}`}
          subtitle={`${unpaidBills.length} unpaid bill(s)`}
          color={unpaidBills.length > 0 ? "red" : "green"}
          icon={<span className="text-xl">💳</span>}
        />
        <StatCard
          title="Community Notices"
          value={data.notices.length}
          subtitle="Recent announcements"
          color="indigo"
          icon={<span className="text-xl">📢</span>}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding={false}>
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">My Recent Complaints</h3>
            <Link to="/resident/complaints" className="text-xs font-bold text-indigo-600 hover:underline">
              View All →
            </Link>
          </div>
          {data.complaints.length === 0 ? (
            <div className="p-6">
              <EmptyState title="No complaints logged" description="You have no active or historical tickets." />
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {data.complaints.map((c) => (
                <div key={c._id} className="p-4 flex items-center justify-between gap-3 hover:bg-gray-50/60">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-800 truncate">{c.title}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {c.category} • {new Date(c.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card padding={false}>
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">Maintenance Bills</h3>
            <Link to="/resident/payments" className="text-xs font-bold text-indigo-600 hover:underline">
              All Bills →
            </Link>
          </div>
          {data.payments.length === 0 ? (
            <div className="p-6">
              <EmptyState title="No invoices found" description="You are fully up to date on society bills." />
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {data.payments.map((p) => (
                <div key={p._id} className="p-4 flex items-center justify-between gap-3 hover:bg-gray-50/60">
                  <div>
                    <p className="text-xs font-bold text-gray-800">{p.description}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Period: {p.paymentPeriod} • Due: {new Date(p.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-gray-900">
                      PKR {Number(p.amount || 0).toLocaleString()}
                    </p>
                    <StatusBadge status={p.status} className="mt-1" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
