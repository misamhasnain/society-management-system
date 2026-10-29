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

export default function AdminComplaints() {
  const toast = useToastContext();
  const [complaints, setComplaints] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: "", priority: "", category: "", search: "" });
  const [selected, setSelected] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [statusNote, setStatusNote] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [newPriority, setNewPriority] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchComplaints = useCallback((page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 10 });
    if (filters.status) params.set("status", filters.status);
    if (filters.priority) params.set("priority", filters.priority);
    if (filters.category) params.set("category", filters.category);
    if (filters.search) params.set("search", filters.search);
    api.get(`/complaints?${params}`)
      .then((r) => { setComplaints(r.data.data.complaints); setPagination(r.data.data.pagination); })
      .catch(() => toast?.error("Failed to load complaints."))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => { fetchComplaints(1); }, [filters]);

  const openModal = (c) => {
    setSelected(c);
    setNewStatus(c.status);
    setNewPriority(c.priority);
    setStatusNote("");
    setModalOpen(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api.patch(`/complaints/${selected._id}/status`, {
        status: newStatus !== selected.status ? newStatus : undefined,
        priority: newPriority !== selected.priority ? newPriority : undefined,
        note: statusNote || undefined,
      });
      toast?.success("Complaint updated.");
      fetchComplaints(pagination.page);
      setModalOpen(false);
    } catch (e) {
      toast?.error(e.response?.data?.message || "Update failed.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Complaints</h1>
        <p className="text-gray-500 text-sm mt-1">{pagination.total} total complaints</p>
      </div>

      <Card>
        <div className="flex flex-wrap gap-3 mb-5">
          <input value={filters.search} onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
            placeholder="Search title or description..."
            className="flex-1 min-w-48 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <select value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">All statuses</option>
            <option>Pending</option><option>In Progress</option><option>Resolved</option><option>Rejected</option>
          </select>
          <select value={filters.priority} onChange={(e) => setFilters((p) => ({ ...p, priority: e.target.value }))}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">All priorities</option>
            <option>Low</option><option>Medium</option><option>High</option>
          </select>
          <select value={filters.category} onChange={(e) => setFilters((p) => ({ ...p, category: e.target.value }))}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">All categories</option>
            <option>Water</option><option>Electricity</option><option>Sanitation</option><option>Security</option><option>Other</option>
          </select>
        </div>

        {loading ? <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div> :
          complaints.length === 0 ? <EmptyState icon="📋" title="No complaints found" description="Try adjusting filters." /> : (
          <>
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Complaint</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Resident</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Category</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Priority</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {complaints.map((c) => (
                    <tr key={c._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 max-w-xs">
                        <p className="font-medium text-gray-900 truncate">{c.title}</p>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{c.description?.slice(0, 60)}...</p>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{c.resident?.name || "—"}</td>
                      <td className="px-6 py-4 text-gray-600">{c.category}</td>
                      <td className="px-6 py-4"><StatusBadge status={c.priority} /></td>
                      <td className="px-6 py-4"><StatusBadge status={c.status} /></td>
                      <td className="px-6 py-4 text-gray-500">{fmtDate(c.createdAt)}</td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="secondary" size="sm" onClick={() => openModal(c)}>Update</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">Page {pagination.page} of {pagination.pages} ({pagination.total} total)</p>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" disabled={pagination.page <= 1} onClick={() => fetchComplaints(pagination.page - 1)}>← Prev</Button>
                  <Button variant="secondary" size="sm" disabled={pagination.page >= pagination.pages} onClick={() => fetchComplaints(pagination.page + 1)}>Next →</Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Update Complaint">
        {selected && (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="font-semibold text-gray-800">{selected.title}</p>
              <p className="text-sm text-gray-600 mt-1">{selected.description}</p>
              <div className="flex gap-2 mt-3 flex-wrap">
                <StatusBadge status={selected.category} />
                <StatusBadge status={selected.priority} />
                <StatusBadge status={selected.status} />
              </div>
              {selected.resident && <p className="text-xs text-gray-500 mt-2">Submitted by: {selected.resident.name}</p>}
            </div>

            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Update Status</label>
              <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option>Pending</option><option>In Progress</option><option>Resolved</option><option>Rejected</option>
              </select>
            </div>

            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Update Priority</label>
              <select value={newPriority} onChange={(e) => setNewPriority(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option>Low</option><option>Medium</option><option>High</option>
              </select>
            </div>

            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Note (optional)</label>
              <textarea value={statusNote} onChange={(e) => setStatusNote(e.target.value)} rows={2} placeholder="Add a note about this update..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">Cancel</Button>
              <Button type="submit" loading={actionLoading} className="flex-1">Save Changes</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
