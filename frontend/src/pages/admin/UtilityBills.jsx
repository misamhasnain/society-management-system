import { useState, useEffect, useCallback } from "react";
import api from "../../api/axios";
import Card from "../../components/ui/Card";
import StatCard from "../../components/ui/StatCard";
import { StatusBadge } from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import EmptyState from "../../components/ui/EmptyState";
import Modal from "../../components/ui/Modal";
import ProofViewer from "../../components/payments/ProofViewer";
import { fmtDate, fmtMonth } from "../../utils/receipt";
import { useToastContext } from "../../components/layout/DashboardLayout";

const TABS = [
  ["Pending Review", "Pending Review"],
  ["Approved", "Approved"],
  ["Rejected", "Rejected"],
  ["", "All"],
];

const TYPE_ICON = { Electricity: "⚡", Gas: "🔥" };

const houseLabel = (h) => (h ? `Block ${h.block} - ${h.houseNumber}` : "—");

const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";

const fmtSize = (bytes) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round((bytes || 0) / 1024))} KB`;

const fileKind = (b) => (b.mimeType?.includes("pdf") ? "PDF" : "Image");

// Latest upload time (a replacement upload counts as the newest upload)
const uploadedAt = (b) => {
  const last = [...(b.auditLog || [])].reverse().find((a) => a.action === "Uploaded" || a.action === "Replaced");
  return last?.timestamp || b.createdAt;
};

const wasResubmitted = (b) => (b.auditLog || []).some((a) => a.action === "Replaced");

function Info({ label, children, wide = false }) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <p className="text-[11px] text-gray-500">{label}</p>
      <div className="text-xs font-bold text-gray-900 break-words mt-0.5">{children || "—"}</div>
    </div>
  );
}

export default function AdminUtilityBills() {
  const toast = useToastContext();
  const [bills, setBills] = useState([]);
  const [counts, setCounts] = useState({ "Pending Review": 0, Approved: 0, Rejected: 0 });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("Pending Review");
  const [billType, setBillType] = useState("");
  const [period, setPeriod] = useState("");

  const [selected, setSelected] = useState(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [acting, setActing] = useState(false);

  const fetchBills = useCallback(
    (page = 1) => {
      setLoading(true);
      const build = (extra) => {
        const p = new URLSearchParams(extra);
        if (billType) p.set("billType", billType);
        if (period) p.set("billingPeriod", period);
        return p;
      };
      const countFor = (s) =>
        api
          .get(`/utility-bills?${build({ limit: 1, status: s })}`)
          .then((r) => r.data.data.pagination.total)
          .catch(() => 0);

      const listParams = build({ page, limit: 10 });
      if (status) listParams.set("status", status);

      Promise.all([api.get(`/utility-bills?${listParams}`), countFor("Pending Review"), countFor("Approved"), countFor("Rejected")])
        .then(([list, pending, approved, rejected]) => {
          setBills(list.data.data.bills || []);
          setPagination(list.data.data.pagination);
          setCounts({ "Pending Review": pending, Approved: approved, Rejected: rejected });
        })
        .catch((e) => toast?.error(e.response?.data?.message || "Failed to load utility bills."))
        .finally(() => setLoading(false));
    },
    [status, billType, period]
  );

  useEffect(() => {
    fetchBills(1);
  }, [fetchBills]);

  const openReview = (b) => {
    setSelected(b);
    setRejecting(false);
    setReason("");
    setReasonError("");
  };
  const closeReview = () => setSelected(null);

  const review = async (newStatus) => {
    if (newStatus === "Rejected" && reason.trim().length < 5) {
      setReasonError("Please give a clear reason (at least 5 characters) so the resident knows what to fix.");
      return;
    }
    setActing(true);
    try {
      await api.patch(`/utility-bills/${selected._id}/review`, {
        status: newStatus,
        rejectionReason: newStatus === "Rejected" ? reason.trim() : undefined,
      });
      toast?.success(`${selected.billType} bill ${newStatus === "Approved" ? "approved" : "rejected"}.`);
      closeReview();
      fetchBills(pagination.page);
    } catch (e) {
      toast?.error(e.response?.data?.message || "Action failed.");
      closeReview();
      fetchBills(pagination.page);
    } finally {
      setActing(false);
    }
  };

  const viewButton = (b) => (
    <Button size="sm" variant={b.status === "Pending Review" ? "primary" : "secondary"} onClick={() => openReview(b)} className="whitespace-nowrap">
      👁 View Uploaded Bill
    </Button>
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Utility Bill Verification</h1>
        <p className="text-xs text-gray-500 mt-1">
          Open each customer's uploaded Electricity or Gas bill, inspect the original file, then approve or reject it.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Pending review" value={counts["Pending Review"]} color="yellow" icon={<span className="text-xl">⏳</span>} />
        <StatCard title="Approved" value={counts.Approved} color="green" icon={<span className="text-xl">✓</span>} />
        <StatCard title="Rejected" value={counts.Rejected} color="red" icon={<span className="text-xl">✗</span>} />
      </div>

      <Card padding={false}>
        <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto">
            {TABS.map(([value, label]) => (
              <button
                key={label}
                onClick={() => setStatus(value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                  status === value ? "bg-white text-indigo-700 shadow-xs" : "text-gray-500 hover:text-gray-900"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={billType}
              onChange={(e) => setBillType(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All bill types</option>
              <option value="Electricity">⚡ Electricity</option>
              <option value="Gas">🔥 Gas</option>
            </select>
            <label className="text-xs font-bold text-gray-600">Month</label>
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-indigo-500"
            />
            {period && (
              <button onClick={() => setPeriod("")} className="text-xs font-bold text-indigo-600 hover:underline">
                Clear
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
        ) : bills.length === 0 ? (
          <div className="p-8">
            <EmptyState icon="⚡" title="No utility bills" description="Nothing matches this filter right now." />
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {bills.map((b) => (
                <div key={b._id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{b.resident?.name || "—"}</p>
                      <p className="text-xs text-gray-500">{houseLabel(b.house)}</p>
                    </div>
                    <StatusBadge status={b.status} />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-500">
                    <span className="font-semibold text-gray-700">
                      {TYPE_ICON[b.billType]} {b.billType} · {fmtMonth(b.billingPeriod)}
                    </span>
                    <span>{fileKind(b)}</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Uploaded {fmtDate(uploadedAt(b))}
                    {wasResubmitted(b) && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold">Resubmitted</span>}
                  </p>
                  <div className="[&>button]:w-full">{viewButton(b)}</div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60 text-gray-500 font-semibold">
                    <th className="py-3 px-5">Customer</th>
                    <th className="py-3 px-4">House / Flat</th>
                    <th className="py-3 px-4">Bill type</th>
                    <th className="py-3 px-4">Month</th>
                    <th className="py-3 px-4">Uploaded</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-5 text-right">Uploaded bill</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bills.map((b) => (
                    <tr key={b._id} className="hover:bg-gray-50/60">
                      <td className="py-3.5 px-5">
                        <p className="font-bold text-gray-900">{b.resident?.name || "—"}</p>
                        <p className="text-[11px] text-gray-500">{b.resident?.email}</p>
                      </td>
                      <td className="py-3.5 px-4 text-gray-700">{houseLabel(b.house)}</td>
                      <td className="py-3.5 px-4 text-gray-700 font-semibold">
                        {TYPE_ICON[b.billType]} {b.billType}
                      </td>
                      <td className="py-3.5 px-4 text-gray-700">{fmtMonth(b.billingPeriod)}</td>
                      <td className="py-3.5 px-4 text-gray-500">
                        {fmtDate(uploadedAt(b))}
                        <span className="ml-1.5 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">{fileKind(b)}</span>
                        {wasResubmitted(b) && (
                          <span className="ml-1 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold">Resubmitted</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4"><StatusBadge status={b.status} /></td>
                      <td className="py-3.5 px-5 text-right">{viewButton(b)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination.pages > 1 && (
              <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <p>Page {pagination.page} of {pagination.pages} ({pagination.total} total)</p>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" disabled={pagination.page <= 1} onClick={() => fetchBills(pagination.page - 1)}>← Prev</Button>
                  <Button variant="secondary" size="sm" disabled={pagination.page >= pagination.pages} onClick={() => fetchBills(pagination.page + 1)}>Next →</Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Inspect + decide modal */}
      <Modal isOpen={Boolean(selected)} onClose={closeReview} title="Uploaded utility bill & verification" size="xl">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* Customer details (first on mobile, right column on desktop) */}
              <div className="md:col-span-2 md:order-2">
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 grid grid-cols-2 gap-x-3 gap-y-3">
                  <Info label="Customer name" wide>{selected.resident?.name}</Info>
                  <Info label="House / Flat">{houseLabel(selected.house)}</Info>
                  <Info label="Bill type">{TYPE_ICON[selected.billType]} {selected.billType}</Info>
                  <Info label="Billing month">{fmtMonth(selected.billingPeriod)}</Info>
                  <Info label="Verification status"><StatusBadge status={selected.status} /></Info>
                  <Info label="Uploaded on" wide>
                    {fmtDateTime(uploadedAt(selected))}
                    {wasResubmitted(selected) && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold">Resubmitted</span>
                    )}
                  </Info>
                  <Info label="Contact" wide>
                    {[selected.resident?.email, selected.resident?.phone].filter(Boolean).join(" · ")}
                  </Info>
                  <Info label="Original file" wide>
                    <span className="font-mono font-medium">{selected.originalName}</span>
                    <span className="text-gray-400 font-normal"> · {fileKind(selected)} · {fmtSize(selected.size)}</span>
                  </Info>
                </div>
              </div>

              {/* Original uploaded file */}
              <div className="md:col-span-3 md:order-1 min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Customer's uploaded bill</p>
                <ProofViewer
                  key={selected._id}
                  proofId={selected._id}
                  fileUrl={`/utility-bills/${selected._id}/file`}
                  mimeType={selected.mimeType}
                  name={selected.originalName}
                />
              </div>
            </div>

            {/* Decision */}
            {selected.status === "Pending Review" ? (
              rejecting ? (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-700">Rejection reason (shown to the resident) *</label>
                  <textarea
                    rows={3}
                    value={reason}
                    maxLength={500}
                    onChange={(e) => {
                      setReason(e.target.value);
                      setReasonError("");
                    }}
                    placeholder="e.g. The bill photo is blurry and the amount cannot be read."
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-400 resize-none"
                  />
                  {reasonError && <p className="text-xs text-rose-600">{reasonError}</p>}
                  <div className="flex flex-col-reverse sm:flex-row gap-2">
                    <Button variant="secondary" onClick={() => setRejecting(false)} className="flex-1">Back</Button>
                    <Button variant="danger" loading={acting} onClick={() => review("Rejected")} className="flex-1">Confirm rejection</Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col-reverse sm:flex-row gap-2 pt-3 border-t border-gray-100">
                  <Button variant="danger" onClick={() => setRejecting(true)} className="flex-1">Reject</Button>
                  <Button variant="success" loading={acting} onClick={() => review("Approved")} className="flex-1">Approve bill</Button>
                </div>
              )
            ) : (
              <div className="space-y-2">
                {selected.status === "Rejected" && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                    <p className="font-bold">
                      Rejected{selected.reviewedBy?.name ? ` by ${selected.reviewedBy.name}` : ""}
                      {selected.reviewedAt ? ` on ${fmtDate(selected.reviewedAt)}` : ""}
                    </p>
                    <p className="italic mt-0.5">"{selected.rejectionReason}"</p>
                  </div>
                )}
                {selected.status === "Approved" && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                    Approved{selected.reviewedBy?.name ? ` by ${selected.reviewedBy.name}` : ""}
                    {selected.reviewedAt ? ` on ${fmtDate(selected.reviewedAt)}` : ""}
                  </div>
                )}
                <p className="text-[11px] text-gray-400">
                  This decision is final. If the resident uploads a replacement, the bill returns to Pending Review.
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}