import React, { useState, useEffect, useCallback } from "react";
import api from "../../api/axios";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import EmptyState from "../../components/ui/EmptyState";
import Modal from "../../components/ui/Modal";
import { useToastContext } from "../../components/layout/DashboardLayout";

export default function AdminVisitors() {
  const toast = useToastContext();
  const [visitors, setVisitors] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all"); // "all" | "inside" | "pre-registered"
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [houses, setHouses] = useState([]);
  const [form, setForm] = useState({
    visitorName: "",
    purpose: "Guest / Visit",
    house: "",
    phone: "",
    vehicleNumber: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState([]);

  const fetchVisitors = useCallback(
    (page = 1) => {
      setLoading(true);
      const params = new URLSearchParams({ page, limit: 15 });
      if (activeTab === "inside") params.set("inside", "true");
      if (activeTab === "pre-registered") params.set("preRegistered", "true");
      if (search) params.set("search", search);

      api
        .get(`/visitors?${params}`)
        .then((r) => {
          setVisitors(r.data.data.visitors || []);
          setPagination(r.data.data.pagination || { page: 1, pages: 1, total: 0 });
        })
        .catch(() => toast?.error("Could not fetch gate logs."))
        .finally(() => setLoading(false));
    },
    [activeTab, search, toast]
  );

  useEffect(() => {
    fetchVisitors(1);
  }, [fetchVisitors]);

  const loadHouses = () => {
    api
      .get("/houses?limit=100")
      .then((r) => setHouses(r.data.data.houses || []))
      .catch(() => {});
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormErrors([]);

    if (!form.house) {
      setFormErrors(["Please select a visiting house unit."]);
      return;
    }

    setSubmitting(true);
    try {
      // Send both house and houseId for complete backend compatibility
      const payload = {
        visitorName: form.visitorName,
        purpose: form.purpose,
        house: form.house,
        houseId: form.house,
        phone: form.phone,
        vehicleNumber: form.vehicleNumber,
      };

      await api.post("/visitors", payload);
      toast?.success(`Visitor entry recorded for ${form.visitorName}.`);
      setModalOpen(false);
      setForm({ visitorName: "", purpose: "Guest / Visit", house: "", phone: "", vehicleNumber: "" });
      fetchVisitors(1);
    } catch (err) {
      const d = err.response?.data;
      setFormErrors(d?.errors?.length ? d.errors : [d?.message || "Failed to log entry."]);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckIn = async (id, name) => {
    try {
      await api.patch(`/visitors/${id}/check-in`);
      toast?.success(`Checked in ${name} at the gate.`);
      fetchVisitors(pagination.page);
    } catch (err) {
      toast?.error(err.response?.data?.message || "Check-in failed.");
    }
  };

  const handleExit = async (id, name) => {
    try {
      await api.patch(`/visitors/${id}/exit`);
      toast?.success(`Recorded departure for ${name}.`);
      fetchVisitors(pagination.page);
    } catch (err) {
      toast?.error(err.response?.data?.message || "Exit marking failed.");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Security Gate Logs</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Real-time security check-ins, pre-registered guest verification, and departures
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              loadHouses();
              setFormErrors([]);
              setModalOpen(true);
            }}
          >
            + Log Walk-in Visitor
          </Button>
        </div>
      </div>

      {/* Tabs & Search Bar */}
      <Card padding={false}>
        <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl shrink-0">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "all" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              All Visitors
            </button>
            <button
              onClick={() => setActiveTab("inside")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "inside" ? "bg-white text-indigo-700 shadow-xs" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Inside Now
            </button>
            <button
              onClick={() => setActiveTab("pre-registered")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "pre-registered"
                  ? "bg-white text-purple-700 shadow-xs"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Pre-Registered Guests
            </button>
          </div>

          <div className="relative flex-1 sm:max-w-xs">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search visitor, vehicle, or purpose..."
              className="w-full px-3.5 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : visitors.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon="🚶"
              title="No visitor records"
              description="No visitor check-ins or pre-registrations match this filter."
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-5">Visitor / Guest</th>
                    <th className="py-3 px-4">Visiting Unit</th>
                    <th className="py-3 px-4">Contact / Vehicle</th>
                    <th className="py-3 px-4">Purpose</th>
                    <th className="py-3 px-4">Arrival / Time</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {visitors.map((v) => (
                    <tr key={v._id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3.5 px-5">
                        <p className="font-bold text-gray-900">{v.visitorName}</p>
                        {v.isPreRegistered && (
                          <span className="text-[10px] text-purple-700 bg-purple-50 font-semibold px-2 py-0.5 rounded-full inline-block mt-0.5">
                            Pre-Registered by Resident
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-gray-800">
                        {v.house ? `Block ${v.house.block || ""} #${v.house.houseNumber || ""}` : "General"}
                      </td>
                      <td className="py-3.5 px-4 text-gray-600">
                        {v.vehicleNumber && (
                          <span className="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[11px] font-semibold mr-1">
                            {v.vehicleNumber}
                          </span>
                        )}
                        <span>{v.phone || "—"}</span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600">{v.purpose}</td>
                      <td className="py-3.5 px-4 text-gray-500 font-mono text-[11px]">
                        {v.entryAt ? (
                          new Date(v.entryAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        ) : v.expectedArrival ? (
                          `Expected: ${new Date(v.expectedArrival).toLocaleDateString()} ${new Date(
                            v.expectedArrival
                          ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {v.status === "Pre-Registered" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200">
                            Expected
                          </span>
                        ) : v.status === "Inside" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Inside Society
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium text-gray-500 bg-gray-100">
                            Exited
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        {v.status === "Pre-Registered" && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleCheckIn(v._id, v.visitorName)}
                          >
                            ✓ Check-In at Gate
                          </Button>
                        )}
                        {v.status === "Inside" && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleExit(v._id, v.visitorName)}
                          >
                            Mark Departure
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination.pages > 1 && (
              <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <p>
                  Page {pagination.page} of {pagination.pages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={pagination.page <= 1}
                    onClick={() => fetchVisitors(pagination.page - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={pagination.page >= pagination.pages}
                    onClick={() => fetchVisitors(pagination.page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Log Visitor Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Log Visitor Entry Check-in">
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
              Visitor Full Name *
            </label>
            <input
              required
              value={form.visitorName}
              onChange={(e) => setForm({ ...form, visitorName: e.target.value })}
              placeholder="e.g. Ali Raza"
              className="w-full px-4 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
              Visiting House Unit *
            </label>
            <select
              required
              value={form.house}
              onChange={(e) => setForm({ ...form, house: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Select Visiting Unit --</option>
              {houses.map((h) => (
                <option key={h._id} value={h._id}>
                  Block {h.block} - #{h.houseNumber} {h.address ? `(${h.address})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                Vehicle No. (optional)
              </label>
              <input
                value={form.vehicleNumber}
                onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })}
                placeholder="e.g. LEA-1234"
                className="w-full px-4 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                Phone Number (optional)
              </label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="0300 0000000"
                className="w-full px-4 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
              Purpose of Visit
            </label>
            <input
              value={form.purpose}
              onChange={(e) => setForm({ ...form, purpose: e.target.value })}
              placeholder="e.g. Guest / Visit, Courier Delivery, Maintenance"
              className="w-full px-4 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" loading={submitting} className="flex-1">
              Record Entry
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
