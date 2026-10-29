import { useState, useEffect, useCallback } from "react";
import api from "../../api/axios";
import Card, { CardHeader } from "../../components/ui/Card";
import { StatusBadge } from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import EmptyState from "../../components/ui/EmptyState";
import Modal from "../../components/ui/Modal";
import { useToastContext } from "../../components/layout/DashboardLayout";

const fmtDate = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default function AdminResidents() {
  const toast = useToastContext();
  const [residents, setResidents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ approvalStatus: "", search: "", isActive: "" });
  const [selected, setSelected] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchResidents = useCallback((page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 10 });
    if (filters.approvalStatus) params.set("approvalStatus", filters.approvalStatus);
    if (filters.search) params.set("search", filters.search);
    if (filters.isActive !== "") params.set("isActive", filters.isActive);
    api.get(`/residents?${params}`)
      .then((r) => {
        setResidents(r.data.data.residents);
        setPagination(r.data.data.pagination);
      })
      .catch(() => toast?.error("Failed to load residents."))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => { fetchResidents(1); }, [filters]);

  const handleApproval = async (id, status) => {
    setActionLoading(true);
    try {
      await api.patch(`/residents/${id}/approval`, { approvalStatus: status });
      toast?.success(`Resident ${status} successfully.`);
      fetchResidents(pagination.page);
      setModalOpen(false);
    } catch (e) {
      toast?.error(e.response?.data?.message || "Action failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatus = async (id, isActive) => {
    setActionLoading(true);
    try {
      await api.patch(`/residents/${id}/status`, { isActive });
      toast?.success(`Resident ${isActive ? "activated" : "deactivated"}.`);
      fetchResidents(pagination.page);
      setModalOpen(false);
    } catch (e) {
      toast?.error(e.response?.data?.message || "Action failed.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Residents</h1>
        <p className="text-gray-500 text-sm mt-1">{pagination.total} residents total</p>
      </div>

      <Card>
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-5">
          <input
            value={filters.search}
            onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
            placeholder="Search by name, email, phone..."
            className="flex-1 min-w-48 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            value={filters.approvalStatus}
            onChange={(e) => setFilters((p) => ({ ...p, approvalStatus: e.target.value }))}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            value={filters.isActive}
            onChange={(e) => setFilters((p) => ({ ...p, isActive: e.target.value }))}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">Active & Inactive</option>
            <option value="true">Active only</option>
            <option value="false">Inactive only</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
        ) : residents.length === 0 ? (
          <EmptyState icon="👥" title="No residents found" description="Try adjusting your filters." />
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Resident</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">House</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Active</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Joined</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {residents.map((r) => (
                    <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-semibold text-sm flex-shrink-0">
                            {r.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{r.name}</p>
                            <p className="text-xs text-gray-500">{r.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {r.house ? `Block ${r.house.block} - ${r.house.houseNumber}` : "—"}
                      </td>
                      <td className="px-6 py-4"><StatusBadge status={r.approvalStatus} /></td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex w-2 h-2 rounded-full ${r.isActive ? "bg-green-500" : "bg-gray-300"}`} />
                        <span className="ml-2 text-gray-600">{r.isActive ? "Active" : "Inactive"}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-500">{fmtDate(r.createdAt)}</td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="secondary" size="sm"
                          onClick={() => { setSelected(r); setModalOpen(true); }}
                        >
                          Manage
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Showing {(pagination.page - 1) * 10 + 1}–{Math.min(pagination.page * 10, pagination.total)} of {pagination.total}
                </p>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" disabled={pagination.page <= 1}
                    onClick={() => fetchResidents(pagination.page - 1)}>← Prev</Button>
                  <Button variant="secondary" size="sm" disabled={pagination.page >= pagination.pages}
                    onClick={() => fetchResidents(pagination.page + 1)}>Next →</Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Manage Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={`Manage: ${selected?.name}`}>
        {selected && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-gray-500 text-xs">Email</p><p className="font-medium text-gray-800">{selected.email}</p></div>
              <div><p className="text-gray-500 text-xs">Phone</p><p className="font-medium text-gray-800">{selected.phone || "—"}</p></div>
              <div><p className="text-gray-500 text-xs">Approval Status</p><StatusBadge status={selected.approvalStatus} /></div>
              <div><p className="text-gray-500 text-xs">Account Active</p><StatusBadge status={selected.isActive ? "active" : "inactive"} /></div>
              <div className="col-span-2"><p className="text-gray-500 text-xs">House</p><p className="font-medium text-gray-800">{selected.house ? `Block ${selected.house.block} - House ${selected.house.houseNumber}` : "—"}</p></div>
            </div>

            {selected.approvalStatus === "pending" && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Approval Decision</p>
                <div className="flex gap-2">
                  <Button variant="success" loading={actionLoading} onClick={() => handleApproval(selected._id, "approved")} className="flex-1">✓ Approve</Button>
                  <Button variant="danger" loading={actionLoading} onClick={() => handleApproval(selected._id, "rejected")} className="flex-1">✗ Reject</Button>
                </div>
              </div>
            )}

            {selected.approvalStatus === "approved" && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Account Status</p>
                <div className="flex gap-2">
                  {selected.isActive ? (
                    <Button variant="danger" loading={actionLoading} onClick={() => handleStatus(selected._id, false)} className="flex-1">Deactivate Account</Button>
                  ) : (
                    <Button variant="success" loading={actionLoading} onClick={() => handleStatus(selected._id, true)} className="flex-1">Activate Account</Button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
