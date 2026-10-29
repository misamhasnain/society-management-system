import React, { useState, useEffect, useCallback } from "react";
import api from "../../api/axios";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import EmptyState from "../../components/ui/EmptyState";
import Modal from "../../components/ui/Modal";
import { useToastContext } from "../../components/layout/DashboardLayout";

export default function ResidentVisitors() {
  const toast = useToastContext();
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    visitorName: "",
    purpose: "Guest Visit",
    expectedArrival: "",
    vehicleNumber: "",
    phone: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState([]);

  const fetchVisitors = useCallback(() => {
    setLoading(true);
    api
      .get("/visitors?limit=50")
      .then((r) => setVisitors(r.data.data.visitors || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchVisitors();
  }, [fetchVisitors]);

  const handlePreRegister = async (e) => {
    e.preventDefault();
    setFormErrors([]);
    setSubmitting(true);
    try {
      await api.post("/visitors/pre-register", form);
      toast?.success(`Expected guest ${form.visitorName} pre-registered for gate clearance.`);
      setModalOpen(false);
      setForm({ visitorName: "", purpose: "Guest Visit", expectedArrival: "", vehicleNumber: "", phone: "" });
      fetchVisitors();
    } catch (err) {
      const d = err.response?.data;
      setFormErrors(d?.errors?.length ? d.errors : [d?.message || "Failed to pre-register visitor."]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Visitor & Guest Management</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Pre-register expected guests for fast gate entry and track visiting logs
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>+ Pre-Register Expected Guest</Button>
      </div>

      <Card padding={false}>
        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : visitors.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon="🚶"
              title="No visitor records"
              description="Pre-register your expected visitors or view security check-ins here."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-5">Visitor / Guest</th>
                  <th className="py-3 px-4">Purpose</th>
                  <th className="py-3 px-4">Vehicle / Phone</th>
                  <th className="py-3 px-4">Expected / Check-in</th>
                  <th className="py-3 px-5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visitors.map((v) => (
                  <tr key={v._id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3.5 px-5 font-bold text-gray-900">
                      {v.visitorName}
                      {v.isPreRegistered && (
                        <span className="block text-[10px] text-purple-600 font-medium">Pre-registered</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">{v.purpose}</td>
                    <td className="py-3.5 px-4 text-gray-600">
                      {v.vehicleNumber && (
                        <span className="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[11px] font-semibold mr-1">
                          {v.vehicleNumber}
                        </span>
                      )}
                      <span>{v.phone || "—"}</span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-500 font-mono text-[11px]">
                      {v.entryAt ? (
                        <span>Checked In: {new Date(v.entryAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      ) : v.expectedArrival ? (
                        <span>Expected: {new Date(v.expectedArrival).toLocaleDateString()} {new Date(v.expectedArrival).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      {v.status === "Pre-Registered" ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200">
                          Pre-Registered (Awaiting Gate Entry)
                        </span>
                      ) : v.status === "Inside" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Currently Inside
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium text-gray-500 bg-gray-100">
                          Departed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pre-Register Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Pre-Register Expected Guest">
        <form onSubmit={handlePreRegister} className="space-y-4">
          <p className="text-xs text-gray-500">
            Pre-register your guest so gate security can verify and fast-track their entrance without delay.
          </p>

          {formErrors.length > 0 && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
              {formErrors.map((e, i) => (
                <p key={i}>• {e}</p>
              ))}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
              Guest Full Name *
            </label>
            <input
              required
              value={form.visitorName}
              onChange={(e) => setForm({ ...form, visitorName: e.target.value })}
              placeholder="e.g. Bilal Ahmed"
              className="w-full px-4 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                Expected Date & Time
              </label>
              <input
                type="datetime-local"
                value={form.expectedArrival}
                onChange={(e) => setForm({ ...form, expectedArrival: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                Vehicle No. (optional)
              </label>
              <input
                value={form.vehicleNumber}
                onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })}
                placeholder="e.g. ABC-1234"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
              Guest Phone Number (optional)
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="0300 0000000"
              className="w-full px-4 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
              Purpose / Visit Type
            </label>
            <input
              value={form.purpose}
              onChange={(e) => setForm({ ...form, purpose: e.target.value })}
              placeholder="e.g. Dinner Party, Delivery, Family Visit"
              className="w-full px-4 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" loading={submitting} className="flex-1">
              Pre-Register Guest
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
