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
import ReceiptModal from "../../components/receipt/ReceiptModal";
import { fmtDate, fmtMonth, fmtMoney } from "../../utils/receipt";
import { useToastContext } from "../../components/layout/DashboardLayout";

const TABS = [
  ["", "All"],
  ["Pending", "Pending"],
  ["Approved", "Approved"],
  ["Rejected", "Rejected"],
];

const houseLabel = (h) => (h ? `Block ${h.block} - ${h.houseNumber}` : "—");

const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";

const fmtSize = (bytes) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round((bytes || 0) / 1024))} KB`);

const fileKind = (p) => (p.mimeType?.includes("pdf") ? "PDF" : "Image");

function Info({ label, children, wide = false }) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <p className="text-[11px] text-gray-500">{label}</p>
      <div className="text-xs font-bold text-gray-900 break-words mt-0.5">{children || "—"}</div>
    </div>
  );
}

export default function AdminPaymentProofs() {
  const toast = useToastContext();
  const [proofs, setProofs] = useState([]);
  const [counts, setCounts] = useState({ Pending: 0, Approved: 0, Rejected: 0 });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("Pending");
  const [period, setPeriod] = useState("");

  const [selected, setSelected] = useState(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [acting, setActing] = useState(false);
  const [receiptId, setReceiptId] = useState(null);

  const fetchProofs = useCallback(
    (page = 1) => {
      setLoading(true);
      const params = new URLSearchParams({ page, limit: 10 });
      if (status) params.set("status", status);
      if (period) params.set("paymentPeriod", period);
      api
        .get(`/payment-proofs?${params}`)
        .then((r) => {
          setProofs(r.data.data.proofs || []);
          setCounts(r.data.data.counts || { Pending: 0, Approved: 0, Rejected: 0 });
          setPagination(r.data.data.pagination);
        })
        .catch(() => toast?.error("Failed to load payment proofs."))
        .finally(() => setLoading(false));
    },
    [status, period]
  );

  useEffect(() => {
    fetchProofs(1);
  }, [fetchProofs]);

  const openReview = (p) => {
    setSelected(p);
    setRejecting(false);
    setReason("");
    setReasonError("");
  };
  const closeReview = () => setSelected(null);

  const review = async (newStatus) => {
    if (newStatus === "Rejected" && reason.trim().length < 5) {
      setReasonError("Please give a clear reason (at least 5 characters) so the resident can fix it.");
      return;
    }
    setActing(true);
    try {
      const res = await api.patch(`/payment-proofs/${selected._id}/review`, {
        status: newStatus,
        rejectionReason: newStatus === "Rejected" ? reason.trim() : undefined,
      });
      const rc = res.data.data.receipt;
      toast?.success(newStatus === "Approved" ? `Approved. Receipt ${rc?.receiptNumber} generated.` : "Payment proof rejected.");
      closeReview();
      fetchProofs(pagination.page);
    } catch (e) {
      toast?.error(e.response?.data?.message || "Action failed.");
      fetchProofs(pagination.page);
    } finally {
      setActing(false);
    }
  };

  const viewButton = (p) => (
    <Button size="sm" variant={p.status === "Pending" ? "primary" : "secondary"} onClick={() => openReview(p)} className="whitespace-nowrap">
      👁 View Uploaded Bill
    </Button>
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Payment Proof Verification</h1>
        <p className="text-xs text-gray-500 mt-1">
          Open each customer's uploaded bill, inspect it, then approve or reject. Approving marks the invoice paid and generates a receipt.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Pending review" value={counts.Pending} color="yellow" icon={<span className="text-xl">⏳</span>} />
        <StatCard title="Approved" value={counts.Approved} color="green" icon={<span className="text-xl">✓</span>} />
        <StatCard title="Rejected" value={counts.Rejected} color="red" icon={<span className="text-xl">✗</span>} />
      </div>

      <Card padding={false}>
        <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
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
          <div className="flex items-center gap-2">
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
        ) : proofs.length === 0 ? (
          <div className="p-8">
            <EmptyState icon="🧾" title="No payment proofs" description="Nothing matches this filter right now." />
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {proofs.map((p) => (
                <div key={p._id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{p.resident?.name || "—"}</p>
                      <p className="text-xs text-gray-500">{houseLabel(p.house)} · {fmtMonth(p.payment?.paymentPeriod)}</p>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-500">
                    <span>Uploaded {fmtDate(p.createdAt)} · {fileKind(p)}</span>
                    <span className="text-sm font-black text-gray-900">{fmtMoney(p.payment?.amount)}</span>
                  </div>
                  <div className="[&>button]:w-full">{viewButton(p)}</div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60 text-gray-500 font-semibold">
                    <th className="py-3 px-5">Resident</th>
                    <th className="py-3 px-4">House</th>
                    <th className="py-3 px-4">Month</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Uploaded</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-5 text-right">Uploaded bill</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {proofs.map((p) => (
                    <tr key={p._id} className="hover:bg-gray-50/60">
                      <td className="py-3.5 px-5">
                        <p className="font-bold text-gray-900">{p.resident?.name || "—"}</p>
                        <p className="text-[11px] text-gray-500">{p.resident?.email}</p>
                      </td>
                      <td className="py-3.5 px-4 text-gray-700">{houseLabel(p.house)}</td>
                      <td className="py-3.5 px-4 text-gray-700">{fmtMonth(p.payment?.paymentPeriod)}</td>
                      <td className="py-3.5 px-4 font-bold text-gray-900">{fmtMoney(p.payment?.amount)}</td>
                      <td className="py-3.5 px-4 text-gray-500">
                        {fmtDate(p.createdAt)}
                        <span className="ml-1.5 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">{fileKind(p)}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={p.status} />
                        {p.receipt && <p className="text-[10px] text-gray-400 font-mono mt-1">{p.receipt.receiptNumber}</p>}
                      </td>
                      <td className="py-3.5 px-5 text-right">{viewButton(p)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination.pages > 1 && (
              <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <p>Page {pagination.page} of {pagination.pages} ({pagination.total} total)</p>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" disabled={pagination.page <= 1} onClick={() => fetchProofs(pagination.page - 1)}>← Prev</Button>
                  <Button variant="secondary" size="sm" disabled={pagination.page >= pagination.pages} onClick={() => fetchProofs(pagination.page + 1)}>Next →</Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Inspect + decide modal */}
      <Modal isOpen={Boolean(selected)} onClose={closeReview} title="Uploaded bill & verification" size="xl">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* Customer details (first on mobile, right column on desktop) */}
              <div className="md:col-span-2 md:order-2 space-y-3">
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 grid grid-cols-2 gap-x-3 gap-y-3">
                  <Info label="Customer name" wide>{selected.resident?.name}</Info>
                  <Info label="House / Flat">{houseLabel(selected.house)}</Info>
                  <Info label="Payment month">{fmtMonth(selected.payment?.paymentPeriod)}</Info>
                  <Info label="Invoice amount">{fmtMoney(selected.payment?.amount)}</Info>
                  <Info label="Verification status">
                    <StatusBadge status={selected.status} />
                  </Info>
                  <Info label="Uploaded on" wide>{fmtDateTime(selected.createdAt)}</Info>
                  <Info label="Payment date (declared)">{fmtDate(selected.paymentDate)}</Info>
                  <Info label="Reference no.">{selected.referenceNo}</Info>
                  {selected.note && <Info label="Customer note" wide>{selected.note}</Info>}
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
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Customer's uploaded file</p>
                <ProofViewer key={selected._id} proofId={selected._id} mimeType={selected.mimeType} name={selected.originalName} />
              </div>
            </div>

            {/* Decision */}
            {selected.status === "Pending" ? (
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
                    placeholder="e.g. Amount in the screenshot does not match the invoice."
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-400 resize-none"
                  />
                  {reasonError && <p className="text-xs text-rose-600">{reasonError}</p>}
                  <div className="flex flex-col-reverse sm:flex-row gap-2">
                    <Button variant="secondary" onClick={() => setRejecting(false)} className="flex-1">Back</Button>
                    <Button variant="danger" loading={acting} onClick={() => review("Rejected")} className="flex-1">Confirm rejection</Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1 border-t border-gray-100">
                  <Button variant="danger" onClick={() => setRejecting(true)} className="flex-1 mt-3">Reject</Button>
                  <Button variant="success" loading={acting} onClick={() => review("Approved")} className="flex-1 sm:mt-3">
                    Approve & generate receipt
                  </Button>
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
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex flex-wrap items-center justify-between gap-2">
                    <p>
                      Approved{selected.reviewedBy?.name ? ` by ${selected.reviewedBy.name}` : ""}
                      {selected.reviewedAt ? ` on ${fmtDate(selected.reviewedAt)}` : ""}
                      {selected.receipt && (
                        <>
                          {" "}· Receipt <strong className="font-mono">{selected.receipt.receiptNumber}</strong>
                        </>
                      )}
                    </p>
                    {selected.receipt && (
                      <Button size="sm" variant="secondary" onClick={() => setReceiptId(selected.receipt._id)}>View receipt</Button>
                    )}
                  </div>
                )}
                <p className="text-[11px] text-gray-400">The original upload above is kept on record and is separate from the generated receipt.</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ReceiptModal receiptId={receiptId} onClose={() => setReceiptId(null)} />
    </div>
  );
}