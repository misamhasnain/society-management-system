import React, { useState, useEffect, useCallback } from "react";
import api from "../../api/axios";
import Card from "../../components/ui/Card";
import { StatusBadge } from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import EmptyState from "../../components/ui/EmptyState";
import Modal from "../../components/ui/Modal";
import { useToastContext } from "../../components/layout/DashboardLayout";

export default function ResidentComplaints() {
  const toast = useToastContext();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [createModal, setCreateModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", category: "Other", priority: "Medium" });
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState([]);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);

  const fetchComplaints = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: 50 });
    if (statusFilter) params.set("status", statusFilter);
    api
      .get(`/complaints?${params}`)
      .then((r) => setComplaints(r.data.data.complaints || []))
      .catch(() => toast?.error("Could not load complaints."))
      .finally(() => setLoading(false));
  }, [statusFilter, toast]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const handleAiAutoCategorize = async () => {
    if (!form.title || !form.description) {
      toast?.warning("Please fill in title and description first for AI diagnosis.");
      return;
    }
    setAiAnalyzing(true);
    try {
      const res = await api.post("/ai/analyze-complaint", {
        title: form.title,
        description: form.description,
      });
      const ana = res.data.data.analysis;
      if (ana) {
        setForm((prev) => ({
          ...prev,
          category: ana.suggestedCategory || prev.category,
          priority: ana.suggestedPriority || prev.priority,
        }));
        toast?.success(`AI diagnosed: Suggested ${ana.suggestedCategory} (${ana.suggestedPriority} priority)`);
      }
    } catch {
      toast?.error("AI assistant could not categorize this ticket.");
    } finally {
      setAiAnalyzing(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormErrors([]);
    setSubmitting(true);
    try {
      await api.post("/complaints", form);
      toast?.success("Complaint ticket submitted to society administration.");
      setCreateModal(false);
      setForm({ title: "", description: "", category: "Other", priority: "Medium" });
      fetchComplaints();
    } catch (err) {
      const d = err.response?.data;
      setFormErrors(d?.errors?.length ? d.errors : [d?.message || "Failed to submit."]);
    } finally {
      setSubmitting(false);
    }
  };

  // Helper for tracking steps
  const getStepIndex = (status) => {
    if (status === "Pending") return 0;
    if (status === "In Progress") return 1;
    if (status === "Resolved") return 2;
    if (status === "Rejected") return 3;
    return 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">My Complaint Tickets</h1>
          <p className="text-xs text-gray-500 mt-1">
            Lodge maintenance requests, track progress timeline, and read admin resolution notes
          </p>
        </div>
        <Button onClick={() => setCreateModal(true)}>+ Lodge New Complaint</Button>
      </div>

      <Card padding={false}>
        <div className="p-4 sm:p-5 border-b border-gray-100 flex gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending Review</option>
            <option value="In Progress">In Progress / Assigned</option>
            <option value="Resolved">Resolved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : complaints.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon="📋"
              title="No complaint tickets"
              description="Submit a complaint whenever you face any maintenance or society issue."
              actionLabel="Lodge New Complaint"
              onAction={() => setCreateModal(true)}
            />
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {complaints.map((c) => (
              <div
                key={c._id}
                onClick={() => setSelected(c)}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/60 transition-colors cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <StatusBadge status={c.status} />
                    <StatusBadge status={c.priority} />
                    <span className="text-[11px] font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                      {c.category}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      Lodged: {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 truncate">{c.title}</h3>
                  <p className="text-xs text-gray-500 line-clamp-2 mt-1 leading-relaxed">{c.description}</p>
                </div>
                <div className="shrink-0 text-right">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800">
                    Track Progress →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Details & Tracking Timeline Modal */}
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Complaint Tracking & Admin Resolution">
        {selected && (
          <div className="space-y-5">
            {/* Ticket Header */}
            <div>
              <div className="flex gap-2 mb-2 flex-wrap">
                <StatusBadge status={selected.status} />
                <StatusBadge status={selected.priority} />
                <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                  Category: {selected.category}
                </span>
              </div>
              <h3 className="text-base font-bold text-gray-900">{selected.title}</h3>
              <p className="text-xs text-gray-600 mt-2 leading-relaxed whitespace-pre-wrap bg-gray-50 p-3 rounded-xl border border-gray-100">
                {selected.description}
              </p>
            </div>

            {/* Stepper Progress Bar */}
            <div className="p-4 bg-slate-50/80 rounded-2xl border border-gray-100">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-3">Resolution Progress</h4>
              <div className="flex items-center justify-between text-xs font-bold text-center">
                <div className="flex-1 flex flex-col items-center">
                  <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs mb-1">
                    ✓
                  </div>
                  <span className="text-gray-900 text-[11px]">Submitted</span>
                </div>

                <div
                  className={`flex-1 h-0.5 ${
                    getStepIndex(selected.status) >= 1 ? "bg-emerald-600" : "bg-gray-200"
                  }`}
                />

                <div className="flex-1 flex flex-col items-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs mb-1 ${
                      selected.status === "In Progress" || selected.status === "Resolved"
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {selected.status === "In Progress" ? "⏳" : "2"}
                  </div>
                  <span className="text-gray-900 text-[11px]">In Progress</span>
                </div>

                <div
                  className={`flex-1 h-0.5 ${
                    selected.status === "Resolved"
                      ? "bg-emerald-600"
                      : selected.status === "Rejected"
                      ? "bg-rose-600"
                      : "bg-gray-200"
                  }`}
                />

                <div className="flex-1 flex flex-col items-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs mb-1 ${
                      selected.status === "Resolved"
                        ? "bg-emerald-600 text-white"
                        : selected.status === "Rejected"
                        ? "bg-rose-600 text-white"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {selected.status === "Resolved" ? "✓" : selected.status === "Rejected" ? "✗" : "3"}
                  </div>
                  <span className="text-gray-900 text-[11px]">
                    {selected.status === "Rejected" ? "Rejected" : "Resolved"}
                  </span>
                </div>
              </div>
            </div>

            {/* Admin Resolution / Notes */}
            {selected.resolutionNotes && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <span>✓</span> Admin Final Resolution Note:
                </p>
                <p className="italic">{selected.resolutionNotes}</p>
                {selected.resolvedAt && (
                  <p className="text-[10px] text-emerald-700">
                    Resolved on {new Date(selected.resolvedAt).toLocaleString()}
                  </p>
                )}
              </div>
            )}

            {/* Full Status Audit Log */}
            <div className="border-t border-gray-100 pt-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                Status History & Admin Updates
              </h4>
              {!selected.statusHistory || selected.statusHistory.length === 0 ? (
                <p className="text-xs text-gray-400">No updates logged yet.</p>
              ) : (
                <div className="space-y-2">
                  {selected.statusHistory.map((h, i) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                      <div className="flex justify-between font-bold text-gray-800">
                        <span>{h.status}</span>
                        <span className="text-[10px] text-gray-400 font-normal">
                          {new Date(h.changedAt).toLocaleString()}
                        </span>
                      </div>
                      {h.note && <p className="text-gray-600 mt-1 italic">"{h.note}"</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Lodge Complaint Modal */}
      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Lodge Society Maintenance Complaint">
        <form onSubmit={handleCreate} className="space-y-4">
          {formErrors.length > 0 && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
              {formErrors.map((e, i) => (
                <p key={i}>• {e}</p>
              ))}
            </div>
          )}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
              Issue Title (min 5 characters) *
            </label>
            <input
              required
              minLength={5}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Broken water line in kitchen ceiling"
              className="w-full px-4 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
              Detailed Description (min 10 characters) *
            </label>
            <textarea
              required
              minLength={10}
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe what happened, exact location, when it started..."
              className="w-full px-4 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div className="flex justify-between items-center py-1">
            <span className="text-xs text-gray-500">Unsure of severity or category?</span>
            <button
              type="button"
              disabled={aiAnalyzing}
              onClick={handleAiAutoCategorize}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5"
            >
              <span>🤖</span> {aiAnalyzing ? "Analyzing..." : "Auto-Diagnose with AI"}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Water">Water</option>
                <option value="Electricity">Electricity</option>
                <option value="Sanitation">Sanitation</option>
                <option value="Security">Security</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High (Urgent)</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setCreateModal(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" loading={submitting} className="flex-1">
              Submit Ticket
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
