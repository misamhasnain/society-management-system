import { useEffect, useState } from "react";
import api from "../../api/axios";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import LoadingSpinner from "../ui/LoadingSpinner";
import ReceiptDocument from "./ReceiptDocument";
import { downloadReceiptPdf } from "../../utils/receipt";
import { useToastContext } from "../layout/DashboardLayout";

export default function ReceiptModal({ receiptId, onClose }) {
  const toast = useToastContext();
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!receiptId) {
      setReceipt(null);
      return;
    }
    let active = true;
    setLoading(true);
    api
      .get(`/receipts/${receiptId}`)
      .then((r) => active && setReceipt(r.data.data.receipt))
      .catch((e) => {
        toast?.error(e.response?.data?.message || "Could not load the receipt.");
        onClose?.();
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [receiptId]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadReceiptPdf(receipt._id, receipt.receiptNumber);
    } catch (e) {
      toast?.error(e.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal isOpen={Boolean(receiptId)} onClose={onClose} title="Payment Receipt" size="lg">
      {loading || !receipt ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="space-y-4">
          <ReceiptDocument receipt={receipt} />
          <div className="no-print flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <Button variant="secondary" onClick={onClose}>Close</Button>
            <Button variant="secondary" onClick={() => window.print()}>🖨 Print</Button>
            <Button onClick={handleDownload} loading={downloading}>⬇ Download PDF</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}