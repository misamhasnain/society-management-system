import { useState, useEffect, useCallback } from "react";
import api from "../../api/axios";
import Card from "../../components/ui/Card";
import { StatusBadge } from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import EmptyState from "../../components/ui/EmptyState";
import Modal from "../../components/ui/Modal";
import { useToastContext } from "../../components/layout/DashboardLayout";

const fmtDate = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const fmtCurrency = (n) => `PKR ${Number(n || 0).toLocaleString()}`;

export default function AdminPayments() {
  const toast = useToastContext();
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [createModal, setCreateModal] = useState(false);
  const [bulkModal, setBulkModal] = useState(false);
  const [residents, setResidents] = useState([]);
  const [form, setForm] = useState({ resident: "", amount: "", description: "Monthly maintenance", paymentPeriod: "", dueDate: "" });
  const [bulkForm, setBulkForm] = useState({ amount: "", description: "Monthly maintenance", paymentPeriod: "", dueDate: "" });
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState([]);

  const fetchPayments = useCallback((page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 10 });
    if (statusFilter) params.set("status", statusFilter);
    api.get(`/payments?${params}`)
      .then((r) => { setPayments(r.data.data.payments); setPagination(r.data.data.pagination); })
      .catch(() => toast?.error("Failed to load payments."))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => { fetchPayments(1); }, [statusFilter]);

  const fetchResidents = () => {
    api.get("/residents?approvalStatus=approved&limit=100")
      .then((r) => setResidents(r.data.data.residents))
      .catch(() => {});
  };

  const handleMarkPaid = async (id, currentStatus) => {
    const newStatus = currentStatus === "Paid" ? "Unpaid" : "Paid";
    try {
      await api.patch(`/payments/${id}/status`, { status: newStatus });
      toast?.success(`Payment marked as ${newStatus}.`);
      fetchPayments(pagination.page);
    } catch (e) {
      toast?.error(e.response?.data?.message || "Failed to update.");
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormErrors([]);
    setSubmitting(true);
    try {
      await api.post("/payments", { ...form, amount: Number(form.amount) });
      toast?.success("Payment bill created.");
      setCreateModal(false);
      setForm({ resident: "", amount: "", description: "Monthly maintenance", paymentPeriod: "", dueDate: "" });
      fetchPayments(1);
    } catch (err) {
      const d = err.response?.data;
      setFormErrors(d?.errors?.length ? d.errors : [d?.message || "Failed."]);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulk = async (e) => {
    e.preventDefault();
    setFormErrors([]);
    setSubmitting(true);
    try {
      const r = await api.post("/payments/bulk", { ...bulkForm, amount: Number(bulkForm.amount) });
      toast?.success(`Bulk billing done: ${r.data.data.created} created, ${r.data.data.skippedExisting} skipped.`);
      setBulkModal(false);
      setBulkForm({ amount: "", description: "Monthly maintenance", paymentPeriod: "", dueDate: "" });
      fetchPayments(1);
    } catch (err) {
      const d = err.response?.data;
      setFormErrors(d?.errors?.length ? d.errors : [d?.message || "Failed."]);
    } finally {
      setSubmitting(false);
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-500 text-sm mt-1">{pagination.total} payment records</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => { setBulkForm({ amount: "", description: "Monthly maintenance", paymentPeriod: "", dueDate: "" }); setFormErrors([]); setBulkModal(true); }}>
            📋 Bulk Bill
          </Button>
          <Button onClick={() => { setForm({ resident: "", amount: "", description: "Monthly maintenance", paymentPeriod: "", dueDate: "" }); setFormErrors([]); fetchResidents(); setCreateModal(true); }}>
            + Create Bill
          </Button>
        </div>
      </div>

      <Card>
        <div className="flex gap-3 mb-5">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">All payments</option>
            <option value="Paid">Paid</option>
            <option value="Unpaid">Unpaid</option>
          </select>
        </div>

        {loading ? <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div> :
          payments.length === 0 ? <EmptyState icon="💳" title="No payment records" description="Create bills for residents." /> : (
          <>
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Resident</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Description</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Period</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Due Date</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {payments.map((p) => (
                    <tr key={p._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{p.resident?.name || "—"}</td>
                      <td className="px-6 py-4 text-gray-600">{p.description}</td>
                      <td className="px-6 py-4 text-gray-600">{p.paymentPeriod}</td>
                      <td className="px-6 py-4 font-semibold text-gray-900">{fmtCurrency(p.amount)}</td>
                      <td className="px-6 py-4 text-gray-500">{fmtDate(p.dueDate)}</td>
                      <td className="px-6 py-4"><StatusBadge status={p.status} /></td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant={p.status === "Paid" ? "secondary" : "success"}
                          size="sm"
                          onClick={() => handleMarkPaid(p._id, p.status)}
                        >
                          {p.status === "Paid" ? "Mark Unpaid" : "Mark Paid"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">Page {pagination.page} of {pagination.pages}</p>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" disabled={pagination.page <= 1} onClick={() => fetchPayments(pagination.page - 1)}>← Prev</Button>
                  <Button variant="secondary" size="sm" disabled={pagination.page >= pagination.pages} onClick={() => fetchPayments(pagination.page + 1)}>Next →</Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Create Bill Modal */}
      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Create Payment Bill">
        <form onSubmit={handleCreate} className="space-y-4">
          {formErrors.length > 0 && <div className="p-3 bg-red-50 border border-red-200 rounded-xl">{formErrors.map((e, i) => <p key={i} className="text-red-700 text-sm">• {e}</p>)}</div>}
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Resident *</label>
            <select required value={form.resident} onChange={(e) => setForm((p) => ({ ...p, resident: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">-- Select resident --</option>
              {residents.map((r) => <option key={r._id} value={r._id}>{r.name} ({r.email})</option>)}
            </select>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Amount (PKR) *</label>
            <input required type="number" min="1" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} placeholder="e.g. 5000"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Period * (YYYY-MM)</label>
            <input required type="month" value={form.paymentPeriod} onChange={(e) => setForm((p) => ({ ...p, paymentPeriod: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Due Date *</label>
            <input required type="date" min={todayStr} value={form.dueDate} onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setCreateModal(false)} className="flex-1">Cancel</Button>
            <Button type="submit" loading={submitting} className="flex-1">Create Bill</Button>
          </div>
        </form>
      </Modal>

      {/* Bulk Modal */}
      <Modal isOpen={bulkModal} onClose={() => setBulkModal(false)} title="Bulk Bill All Residents">
        <p className="text-sm text-gray-500 mb-4">This will create payment bills for all active approved residents who don't already have a bill for this period.</p>
        <form onSubmit={handleBulk} className="space-y-4">
          {formErrors.length > 0 && <div className="p-3 bg-red-50 border border-red-200 rounded-xl">{formErrors.map((e, i) => <p key={i} className="text-red-700 text-sm">• {e}</p>)}</div>}
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Amount (PKR) *</label>
            <input required type="number" min="1" value={bulkForm.amount} onChange={(e) => setBulkForm((p) => ({ ...p, amount: e.target.value }))} placeholder="e.g. 5000"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <input value={bulkForm.description} onChange={(e) => setBulkForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Period *</label>
            <input required type="month" value={bulkForm.paymentPeriod} onChange={(e) => setBulkForm((p) => ({ ...p, paymentPeriod: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Due Date *</label>
            <input required type="date" min={todayStr} value={bulkForm.dueDate} onChange={(e) => setBulkForm((p) => ({ ...p, dueDate: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setBulkModal(false)} className="flex-1">Cancel</Button>
            <Button type="submit" loading={submitting} className="flex-1">Send Bulk Bills</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
