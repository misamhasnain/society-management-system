import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { StatusBadge } from "../../components/ui/Badge";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import EmptyState from "../../components/ui/EmptyState";
import Modal from "../../components/ui/Modal";
import ReceiptModal from "../../components/receipt/ReceiptModal";
import ProofViewer from "../../components/payments/ProofViewer";
import { downloadReceiptPdf, fmtDate, fmtMonth, fmtMoney } from "../../utils/receipt";
import { useToastContext } from "../../components/layout/DashboardLayout";

export default function ResidentReceipts() {
  const toast = useToastContext();
  const [tab, setTab] = useState("receipts");
  const [receipts, setReceipts] = useState([]);
  const [proofs, setProofs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [receiptId, setReceiptId] = useState(null);
  const [viewProof, setViewProof] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([api.get("/receipts?limit=100"), api.get("/payment-proofs?limit=100")])
      .then(([r, p]) => {
        setReceipts(r.data.data.receipts || []);
        setProofs(p.data.data.proofs || []);
      })
      .catch(() => toast?.error("Could not load your payment history."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDownload = async (r) => {
    setDownloadingId(r._id);
    try {
      await downloadReceiptPdf(r._id, r.receiptNumber);
    } catch (e) {
      toast?.error(e.message);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Receipts & Payment History</h1>
          <p className="text-xs text-gray-500 mt-1">Your approved maintenance receipts and the status of every payment proof you submitted.</p>
        </div>
        <Link
          to="/resident/payments"
          className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm text-center"
        >
          Go to My Bills & Dues
        </Link>
      </div>

      <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl w-full sm:w-fit">
        {[
          ["receipts", `Receipts (${receipts.length})`],
          ["proofs", `Submitted proofs (${proofs.length})`],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              tab === key ? "bg-white text-indigo-700 shadow-xs" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <Card padding={false}>
        {loading ? (
          <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
        ) : tab === "receipts" ? (
          receipts.length === 0 ? (
            <div className="p-8">
              <EmptyState icon="🧾" title="No receipts yet" description="A receipt is generated automatically once the admin approves your payment proof." />
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {receipts.map((r) => (
                <div key={r._id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-gray-900 font-mono">{r.receiptNumber}</p>
                      <StatusBadge status={r.status === "Void" ? "Rejected" : "Paid"} />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {fmtMonth(r.paymentPeriod)} · Paid on {fmtDate(r.paymentDate)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <p className="text-base font-black text-gray-900">{fmtMoney(r.amount, r.currency)}</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setReceiptId(r._id)}>View</Button>
                      <Button size="sm" variant="secondary" loading={downloadingId === r._id} onClick={() => handleDownload(r)}>
                        ⬇ PDF
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : proofs.length === 0 ? (
          <div className="p-8">
            <EmptyState icon="📤" title="No payment proofs submitted" description="Upload proof from My Bills & Dues once your utility bills are approved." />
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {proofs.map((p) => (
              <div key={p._id} className="p-4 sm:p-5 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={p.status} />
                    <p className="text-sm font-bold text-gray-900">{fmtMonth(p.payment?.paymentPeriod)}</p>
                    <span className="text-xs text-gray-500">{fmtMoney(p.payment?.amount)}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setViewProof(p)}>View file</Button>
                    {p.receipt && (
                      <Button size="sm" onClick={() => setReceiptId(p.receipt._id)}>🧾 Receipt</Button>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-gray-400">
                  Submitted {fmtDate(p.createdAt)} · Payment date {fmtDate(p.paymentDate)}
                  {p.referenceNo ? ` · Ref ${p.referenceNo}` : ""}
                </p>
                {p.status === "Rejected" && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                    <p className="font-bold">Rejected by admin</p>
                    <p className="italic mt-0.5">"{p.rejectionReason}"</p>
                    <p className="text-[11px] text-rose-600 mt-1">Upload a corrected proof from My Bills & Dues.</p>
                  </div>
                )}
                {p.status === "Pending" && (
                  <p className="text-[11px] text-amber-700 font-medium">⏳ Waiting for the admin to verify this proof.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <ReceiptModal receiptId={receiptId} onClose={() => setReceiptId(null)} />

      <Modal isOpen={Boolean(viewProof)} onClose={() => setViewProof(null)} title="Submitted payment proof">
        {viewProof && <ProofViewer proofId={viewProof._id} mimeType={viewProof.mimeType} name={viewProof.originalName} />}
      </Modal>
    </div>
  );
}