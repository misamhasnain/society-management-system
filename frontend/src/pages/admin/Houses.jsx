import { useState, useEffect, useCallback } from "react";
import api from "../../api/axios";
import Card, { CardHeader } from "../../components/ui/Card";
import { StatusBadge } from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import EmptyState from "../../components/ui/EmptyState";
import Modal from "../../components/ui/Modal";
import { useToastContext } from "../../components/layout/DashboardLayout";

export default function AdminHouses() {
  const toast = useToastContext();
  const [houses, setHouses] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ houseNumber: "", block: "", address: "" });
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState([]);

  const fetchHouses = useCallback((page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 10 });
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    api.get(`/houses?${params}`)
      .then((r) => { setHouses(r.data.data.houses); setPagination(r.data.data.pagination); })
      .catch(() => toast?.error("Failed to load houses."))
      .finally(() => setLoading(false));
  }, [search, statusFilter]);

  useEffect(() => { fetchHouses(1); }, [search, statusFilter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormErrors([]);
    setSubmitting(true);
    try {
      await api.post("/houses", form);
      toast?.success("House created successfully.");
      setModalOpen(false);
      setForm({ houseNumber: "", block: "", address: "" });
      fetchHouses(1);
    } catch (err) {
      const d = err.response?.data;
      setFormErrors(d?.errors?.length ? d.errors : [d?.message || "Failed to create house."]);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setFormErrors([]);
    setSubmitting(true);
    try {
      await api.patch(`/houses/${selected._id}`, form);
      toast?.success("House updated.");
      setEditModal(false);
      fetchHouses(pagination.page);
    } catch (err) {
      const d = err.response?.data;
      setFormErrors(d?.errors?.length ? d.errors : [d?.message || "Update failed."]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Houses</h1>
          <p className="text-gray-500 text-sm mt-1">{pagination.total} houses in the society</p>
        </div>
        <Button onClick={() => { setForm({ houseNumber: "", block: "", address: "" }); setFormErrors([]); setModalOpen(true); }}>
          + Add House
        </Button>
      </div>

      <Card>
        <div className="flex flex-wrap gap-3 mb-5">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by number, block, address..."
            className="flex-1 min-w-48 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">All statuses</option>
            <option value="Occupied">Occupied</option>
            <option value="Vacant">Vacant</option>
          </select>
        </div>

        {loading ? <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div> :
          houses.length === 0 ? <EmptyState icon="🏡" title="No houses found" description="Add houses or adjust filters." /> : (
          <>
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Block</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">House No.</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Address</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {houses.map((h) => (
                    <tr key={h._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{h.block}</td>
                      <td className="px-6 py-4 text-gray-700">{h.houseNumber}</td>
                      <td className="px-6 py-4 text-gray-500">{h.address || "—"}</td>
                      <td className="px-6 py-4"><StatusBadge status={h.occupancyStatus} /></td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="secondary" size="sm" onClick={() => {
                          setSelected(h);
                          setForm({ houseNumber: h.houseNumber, block: h.block, address: h.address || "" });
                          setFormErrors([]);
                          setEditModal(true);
                        }}>Edit</Button>
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
                  <Button variant="secondary" size="sm" disabled={pagination.page <= 1} onClick={() => fetchHouses(pagination.page - 1)}>← Prev</Button>
                  <Button variant="secondary" size="sm" disabled={pagination.page >= pagination.pages} onClick={() => fetchHouses(pagination.page + 1)}>Next →</Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Create Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add New House">
        <form onSubmit={handleCreate} className="space-y-4">
          {formErrors.length > 0 && <div className="p-3 bg-red-50 border border-red-200 rounded-xl">{formErrors.map((e, i) => <p key={i} className="text-red-700 text-sm">• {e}</p>)}</div>}
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Block *</label>
            <input required value={form.block} onChange={(e) => setForm((p) => ({ ...p, block: e.target.value }))} placeholder="e.g. A" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">House Number *</label>
            <input required value={form.houseNumber} onChange={(e) => setForm((p) => ({ ...p, houseNumber: e.target.value }))} placeholder="e.g. 101" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
            <input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} placeholder="Optional address" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">Cancel</Button>
            <Button type="submit" loading={submitting} className="flex-1">Create House</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={editModal} onClose={() => setEditModal(false)} title="Edit House">
        <form onSubmit={handleEdit} className="space-y-4">
          {formErrors.length > 0 && <div className="p-3 bg-red-50 border border-red-200 rounded-xl">{formErrors.map((e, i) => <p key={i} className="text-red-700 text-sm">• {e}</p>)}</div>}
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Block</label>
            <input value={form.block} onChange={(e) => setForm((p) => ({ ...p, block: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">House Number</label>
            <input value={form.houseNumber} onChange={(e) => setForm((p) => ({ ...p, houseNumber: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
            <input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setEditModal(false)} className="flex-1">Cancel</Button>
            <Button type="submit" loading={submitting} className="flex-1">Save Changes</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
