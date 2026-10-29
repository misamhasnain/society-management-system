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

export default function AdminNotices() {
  const toast = useToastContext();
  const [notices, setNotices] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ title: "", content: "", priority: "Normal" });
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState([]);

  const fetchNotices = useCallback((page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 10 });
    if (showArchived) params.set("archived", "true");
    api.get(`/notices?${params}`)
      .then((r) => { setNotices(r.data.data.notices); setPagination(r.data.data.pagination); })
      .catch(() => toast?.error("Failed to load notices."))
      .finally(() => setLoading(false));
  }, [showArchived]);

  useEffect(() => { fetchNotices(1); }, [showArchived]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormErrors([]);
    setSubmitting(true);
    try {
      await api.post("/notices", form);
      toast?.success("Notice published successfully.");
      setCreateModal(false);
      setForm({ title: "", content: "", priority: "Normal" });
      fetchNotices(1);
    } catch (err) {
      const d = err.response?.data;
      setFormErrors(d?.errors?.length ? d.errors : [d?.message || "Failed."]);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setFormErrors([]);
    setSubmitting(true);
    try {
      await api.patch(`/notices/${selected._id}`, form);
      toast?.success("Notice updated.");
      setEditModal(false);
      fetchNotices(pagination.page);
    } catch (err) {
      const d = err.response?.data;
      setFormErrors(d?.errors?.length ? d.errors : [d?.message || "Failed."]);
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async (id) => {
    if (!confirm("Archive this notice?")) return;
    try {
      await api.patch(`/notices/${id}/archive`);
      toast?.success("Notice archived.");
      fetchNotices(pagination.page);
    } catch (e) {
      toast?.error(e.response?.data?.message || "Failed.");
    }
  };

  const PRIORITY_COLORS = { Normal: "🟢", Important: "🟡", Urgent: "🔴" };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notice Board</h1>
          <p className="text-gray-500 text-sm mt-1">{pagination.total} notices</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="rounded" />
            Show archived
          </label>
          <Button onClick={() => { setForm({ title: "", content: "", priority: "Normal" }); setFormErrors([]); setCreateModal(true); }}>
            + New Notice
          </Button>
        </div>
      </div>

      {loading ? <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div> :
        notices.length === 0 ? <EmptyState icon="📢" title="No notices" description="Create a notice to inform residents." /> : (
          <div className="space-y-4">
            {notices.map((n) => (
              <Card key={n._id} className={n.isArchived ? "opacity-60" : ""}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span>{PRIORITY_COLORS[n.priority]}</span>
                      <StatusBadge status={n.priority} />
                      {n.isArchived && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Archived</span>}
                    </div>
                    <h3 className="font-semibold text-gray-900 text-base">{n.title}</h3>
                    <p className="text-gray-600 text-sm mt-1 leading-relaxed">{n.content}</p>
                    <p className="text-xs text-gray-400 mt-3">By {n.createdBy?.name || "Admin"} · {fmtDate(n.publishedAt)}</p>
                  </div>
                  {!n.isArchived && (
                    <div className="flex gap-2 flex-shrink-0">
                      <Button variant="secondary" size="sm" onClick={() => {
                        setSelected(n);
                        setForm({ title: n.title, content: n.content, priority: n.priority });
                        setFormErrors([]);
                        setEditModal(true);
                      }}>Edit</Button>
                      <Button variant="ghost" size="sm" onClick={() => handleArchive(n._id)}>Archive</Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Publish New Notice">
        <form onSubmit={handleCreate} className="space-y-4">
          {formErrors.length > 0 && <div className="p-3 bg-red-50 border border-red-200 rounded-xl">{formErrors.map((e, i) => <p key={i} className="text-red-700 text-sm">• {e}</p>)}</div>}
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Title *</label>
            <input required value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Notice title..."
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Content *</label>
            <textarea required rows={4} value={form.content} onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))} placeholder="Notice content..."
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Priority</label>
            <select value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option>Normal</option><option>Important</option><option>Urgent</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setCreateModal(false)} className="flex-1">Cancel</Button>
            <Button type="submit" loading={submitting} className="flex-1">Publish</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={editModal} onClose={() => setEditModal(false)} title="Edit Notice">
        <form onSubmit={handleEdit} className="space-y-4">
          {formErrors.length > 0 && <div className="p-3 bg-red-50 border border-red-200 rounded-xl">{formErrors.map((e, i) => <p key={i} className="text-red-700 text-sm">• {e}</p>)}</div>}
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
            <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Content</label>
            <textarea rows={4} value={form.content} onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Priority</label>
            <select value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option>Normal</option><option>Important</option><option>Urgent</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setEditModal(false)} className="flex-1">Cancel</Button>
            <Button type="submit" loading={submitting} className="flex-1">Save Changes</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
