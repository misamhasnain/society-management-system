import { useState, useEffect } from "react";
import api from "../../api/axios";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { fmtMonth, fmtMoney } from "../../utils/receipt";
import { useToastContext } from "../layout/DashboardLayout";

const VALID_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const todayStr = () => new Date().toISOString().split("T")[0];

export default function PaymentProofModal({ payment, onClose, onSuccess }) {
  const toast = useToastContext();
  const [file, setFile] = useState(null);
  const [paymentDate, setPaymentDate] = useState(todayStr());
  const [referenceNo, setReferenceNo] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (payment) {
      setFile(null);
      setPaymentDate(todayStr());
      setReferenceNo("");
      setNote("");
      setError("");
    }
  }, [payment]);

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      setError("File is larger than 5MB. Please choose a smaller image or PDF.");
      setFile(null);
      return;
    }
    if (!VALID_TYPES.includes(f.type)) {
      setError("Only JPG, PNG, WEBP or PDF files are accepted.");
      setFile(null);
      return;
    }
    setError("");
    setFile(f);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return setError("Please choose your payment proof file.");
    setSubmitting(true);
    setError("");

    const fd = new FormData();
    fd.append("paymentId", payment._id);
    fd.append("paymentDate", paymentDate);
    if (referenceNo.trim()) fd.append("referenceNo", referenceNo.trim());
    if (note.trim()) fd.append("note", note.trim());
    fd.append("file", file);

    try {
      await api.post("/payment-proofs", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast?.success("Payment proof submitted. The admin will verify it shortly.");
      onSuccess?.();
    } catch (err) {
      const d = err.response?.data;
      setError(d?.errors?.length ? d.errors.join(" ") : d?.message || "Upload failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={Boolean(payment)} onClose={onClose} title="Upload Payment Proof">
      {payment && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-xl text-xs grid grid-cols-2 gap-2">
            <div>
              <p className="text-gray-500">Payment month</p>
              <p className="font-bold text-gray-900">{fmtMonth(payment.paymentPeriod)}</p>
            </div>
            <div>
              <p className="text-gray-500">Amount due</p>
              <p className="font-bold text-gray-900">{fmtMoney(payment.amount)}</p>
            </div>
          </div>

          {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">• {error}</div>}

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Payment date *</label>
            <input
              type="date"
              required
              max={todayStr()}
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Reference / transaction number (optional)</label>
            <input
              value={referenceNo}
              maxLength={100}
              onChange={(e) => setReferenceNo(e.target.value)}
              placeholder="e.g. bank transfer ref #12345678"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Payment proof (JPG, PNG, WEBP or PDF, max 5MB) *</label>
            <label
              htmlFor="proofFileInput"
              className="block border-2 border-dashed border-gray-200 hover:border-indigo-400 rounded-2xl p-5 text-center cursor-pointer transition-colors bg-gray-50/50"
            >
              <input id="proofFileInput" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,image/*,application/pdf" onChange={handleFile} className="hidden" />
              <span className="text-3xl block mb-1">🧾</span>
              {file ? (
                <>
                  <p className="text-xs font-bold text-indigo-600 truncate">{file.name}</p>
                  <p className="text-[10px] text-gray-400">{(file.size / 1024).toFixed(1)} KB · tap to change</p>
                </>
              ) : (
                <p className="text-xs font-bold text-gray-700">Tap to choose your receipt or screenshot</p>
              )}
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Note (optional)</label>
            <textarea
              rows={2}
              value={note}
              maxLength={300}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" loading={submitting} disabled={!file} className="flex-1">Submit for verification</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}