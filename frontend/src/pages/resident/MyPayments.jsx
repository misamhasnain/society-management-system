import React, { useState, useEffect, useCallback } from "react";
import api from "../../api/axios";
import Card from "../../components/ui/Card";
import Badge, { StatusBadge } from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import EmptyState from "../../components/ui/EmptyState";
import Modal from "../../components/ui/Modal";
import { useToastContext } from "../../components/layout/DashboardLayout";

export default function ResidentPayments() {
  const toast = useToastContext();

  // Invoices state
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  // Utility Bill Verification state
  const currentMonthStr = new Date().toISOString().slice(0, 7); // e.g. "2026-10"
  const [selectedPeriod, setSelectedPeriod] = useState(currentMonthStr);
  const [verificationData, setVerificationData] = useState(null);
  const [verificationLoading, setVerificationLoading] = useState(true);

  // Upload Modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadBillType, setUploadBillType] = useState("Electricity");
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Preview Modal state
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Payment Confirmation Request Modal
  const [requestPayModalPayment, setRequestPayModalPayment] = useState(null);
  const [paymentNote, setPaymentNote] = useState("");
  const [requestingPay, setRequestingPay] = useState(false);

  // Fetch Invoices
  const fetchPayments = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: 50 });
    if (statusFilter) params.set("status", statusFilter);
    api
      .get(`/payments?${params}`)
      .then((r) => setPayments(r.data.data.payments || []))
      .catch(() => toast?.error("Could not fetch invoices."))
      .finally(() => setLoading(false));
  }, [statusFilter, toast]);

  // Fetch Utility Bill Verification Status for selected period
  const fetchVerificationStatus = useCallback(() => {
    setVerificationLoading(true);
    api
      .get(`/utility-bills/status?billingPeriod=${selectedPeriod}`)
      .then((r) => {
        setVerificationData(r.data.data);
      })
      .catch((err) => {
        toast?.error(err.response?.data?.message || "Failed to load utility bill status.");
      })
      .finally(() => setVerificationLoading(false));
  }, [selectedPeriod, toast]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  useEffect(() => {
    fetchVerificationStatus();
  }, [fetchVerificationStatus]);

  // Open upload modal for specific bill type
  const openUploadModal = (type) => {
    setUploadBillType(type);
    setSelectedFile(null);
    setUploadError("");
    setUploadModalOpen(true);
  };

  // Handle File Selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File size exceeds 5MB. Please choose a smaller image or compressed PDF.");
      setSelectedFile(null);
      return;
    }

    // Validate type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      setUploadError("Invalid file type. Only JPG, PNG, WEBP, or PDF files are accepted.");
      setSelectedFile(null);
      return;
    }

    setUploadError("");
    setSelectedFile(file);
  };

  // Submit Bill Upload
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError("Please select a bill document file to upload.");
      return;
    }

    setUploading(true);
    setUploadError("");

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("billType", uploadBillType);
    formData.append("billingPeriod", selectedPeriod);

    try {
      await api.post("/utility-bills/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast?.success(`${uploadBillType} bill uploaded successfully! Submitted for admin verification.`);
      setUploadModalOpen(false);
      setSelectedFile(null);
      fetchVerificationStatus();
      fetchPayments();
    } catch (err) {
      const msg = err.response?.data?.message || "Upload failed. Please check the file and try again.";
      setUploadError(msg);
      toast?.error(msg);
    } finally {
      setUploading(false);
    }
  };

  // Preview Bill Document
  const handlePreview = async (bill) => {
    if (!bill?._id) return;
    setPreviewLoading(true);
    try {
      const res = await api.get(`/utility-bills/${bill._id}/file`, { responseType: "blob" });
      const objectUrl = URL.createObjectURL(res.data);
      setPreviewDoc({
        id: bill._id,
        originalName: bill.originalName,
        mimeType: bill.mimeType || res.data.type,
        url: objectUrl,
        bill,
      });
    } catch (e) {
      toast?.error(e.response?.data?.message || "Could not retrieve bill document file.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    if (previewDoc?.url) {
      URL.revokeObjectURL(previewDoc.url);
    }
    setPreviewDoc(null);
  };

  // Submit Payment Request (After bills verified)
  const handleRequestPayment = async () => {
    if (!requestPayModalPayment) return;
    setRequestingPay(true);
    try {
      await api.patch(`/payments/${requestPayModalPayment._id}/request-pay`, {
        paymentNote,
      });
      toast?.success("Payment confirmation request submitted! Admin will verify and mark as paid.");
      setRequestPayModalPayment(null);
      setPaymentNote("");
      fetchPayments();
    } catch (err) {
      toast?.error(err.response?.data?.message || "Failed to submit payment request.");
    } finally {
      setRequestingPay(false);
    }
  };

  const totalDues = payments
    .filter((p) => p.status === "Unpaid")
    .reduce((s, p) => s + (p.amount || 0), 0);

  const elec = verificationData?.electricity || { status: "Missing" };
  const gas = verificationData?.gas || { status: "Missing" };
  const isPeriodVerified = verificationData?.isVerified;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Maintenance & Utility Bills</h1>
          <p className="text-xs text-gray-500 mt-1">
            Upload your monthly Electricity & Gas bills for admin approval, and manage society maintenance dues.
          </p>
        </div>
        <div className="p-3.5 rounded-2xl bg-white border border-gray-100 shadow-xs flex items-center gap-3">
          <span className="text-2xl">💳</span>
          <div>
            <p className="text-[10px] uppercase font-bold text-gray-400">Total Outstanding Dues</p>
            <p className="text-base font-black text-rose-600">PKR {totalDues.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* SECTION 1: UTILITY BILL VERIFICATION CENTER */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">⚡</span>
              <h2 className="text-base font-bold text-gray-900">Utility Bill Verification Center</h2>
              {isPeriodVerified ? (
                <span className="px-2 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-800 rounded-full">
                  ✓ Ready for Maintenance Payment
                </span>
              ) : (
                <span className="px-2 py-0.5 text-xs font-bold bg-amber-100 text-amber-800 rounded-full">
                  ⏳ Verification Required
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Society bylaws require verified latest Electricity & Gas bills before maintenance settlement can be processed.
            </p>
          </div>

          {/* Billing Period Selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-600">Billing Period:</label>
            <input
              type="month"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 bg-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {verificationLoading ? (
          <div className="py-10 flex justify-center">
            <LoadingSpinner size="md" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {/* ELECTRICITY BILL CARD */}
            <div
              className={`p-4 rounded-2xl border transition-all ${
                elec.status === "Approved"
                  ? "bg-emerald-50/40 border-emerald-200"
                  : elec.status === "Pending Review"
                  ? "bg-amber-50/40 border-amber-200"
                  : elec.status === "Rejected"
                  ? "bg-rose-50/40 border-rose-300"
                  : "bg-slate-50 border-dashed border-gray-300"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl p-2 bg-white rounded-xl shadow-xs">⚡</span>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Electricity Bill</h3>
                    <p className="text-[11px] text-gray-500 font-mono">Period: {selectedPeriod}</p>
                  </div>
                </div>
                <StatusBadge status={elec.status} />
              </div>

              {/* Status details */}
              <div className="mt-3.5 text-xs">
                {elec.status === "Approved" && (
                  <p className="text-emerald-700 font-medium">
                    ✓ Verified & approved by administration on{" "}
                    {elec.bill?.reviewedAt ? new Date(elec.bill.reviewedAt).toLocaleDateString() : "record"}.
                  </p>
                )}

                {elec.status === "Pending Review" && (
                  <p className="text-amber-700 font-medium">
                    ⏳ Document submitted ({elec.bill?.originalName}). Awaiting administrative review.
                  </p>
                )}

                {elec.status === "Rejected" && (
                  <div className="p-3 bg-white/80 rounded-xl border border-rose-200 text-rose-800 space-y-1">
                    <p className="font-bold">❌ Bill Rejected by Admin:</p>
                    <p className="italic">"{elec.bill?.rejectionReason || "Unclear image or details"}"</p>
                    <p className="text-[11px] text-rose-600 font-medium">
                      Please upload a clear, legible replacement bill.
                    </p>
                  </div>
                )}

                {elec.status === "Missing" && (
                  <p className="text-gray-500">
                    No electricity bill has been uploaded for {selectedPeriod}. Please upload to enable payment.
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="mt-4 pt-3 border-t border-gray-100/80 flex items-center justify-between gap-2">
                {elec.bill && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handlePreview(elec.bill)}
                    loading={previewLoading && previewDoc?.id === elec.bill._id}
                  >
                    👁 View Uploaded File
                  </Button>
                )}

                {elec.status !== "Approved" && (
                  <Button
                    size="sm"
                    variant={elec.status === "Rejected" ? "danger" : "primary"}
                    onClick={() => openUploadModal("Electricity")}
                  >
                    {elec.status === "Rejected"
                      ? "🔄 Upload Corrected Bill"
                      : elec.status === "Pending Review"
                      ? "🔄 Replace Bill"
                      : "📤 Upload Electricity Bill"}
                  </Button>
                )}
              </div>
            </div>

            {/* GAS BILL CARD */}
            <div
              className={`p-4 rounded-2xl border transition-all ${
                gas.status === "Approved"
                  ? "bg-emerald-50/40 border-emerald-200"
                  : gas.status === "Pending Review"
                  ? "bg-amber-50/40 border-amber-200"
                  : gas.status === "Rejected"
                  ? "bg-rose-50/40 border-rose-300"
                  : "bg-slate-50 border-dashed border-gray-300"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl p-2 bg-white rounded-xl shadow-xs">🔥</span>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Sui Gas Bill</h3>
                    <p className="text-[11px] text-gray-500 font-mono">Period: {selectedPeriod}</p>
                  </div>
                </div>
                <StatusBadge status={gas.status} />
              </div>

              {/* Status details */}
              <div className="mt-3.5 text-xs">
                {gas.status === "Approved" && (
                  <p className="text-emerald-700 font-medium">
                    ✓ Verified & approved by administration on{" "}
                    {gas.bill?.reviewedAt ? new Date(gas.bill.reviewedAt).toLocaleDateString() : "record"}.
                  </p>
                )}

                {gas.status === "Pending Review" && (
                  <p className="text-amber-700 font-medium">
                    ⏳ Document submitted ({gas.bill?.originalName}). Awaiting administrative review.
                  </p>
                )}

                {gas.status === "Rejected" && (
                  <div className="p-3 bg-white/80 rounded-xl border border-rose-200 text-rose-800 space-y-1">
                    <p className="font-bold">❌ Bill Rejected by Admin:</p>
                    <p className="italic">"{gas.bill?.rejectionReason || "Unclear image or details"}"</p>
                    <p className="text-[11px] text-rose-600 font-medium">
                      Please upload a clear, legible replacement bill.
                    </p>
                  </div>
                )}

                {gas.status === "Missing" && (
                  <p className="text-gray-500">
                    No gas bill has been uploaded for {selectedPeriod}. Please upload to enable payment.
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="mt-4 pt-3 border-t border-gray-100/80 flex items-center justify-between gap-2">
                {gas.bill && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handlePreview(gas.bill)}
                    loading={previewLoading && previewDoc?.id === gas.bill._id}
                  >
                    👁 View Uploaded File
                  </Button>
                )}

                {gas.status !== "Approved" && (
                  <Button
                    size="sm"
                    variant={gas.status === "Rejected" ? "danger" : "primary"}
                    onClick={() => openUploadModal("Gas")}
                  >
                    {gas.status === "Rejected"
                      ? "🔄 Upload Corrected Bill"
                      : gas.status === "Pending Review"
                      ? "🔄 Replace Bill"
                      : "📤 Upload Gas Bill"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Informative Guidance Banner */}
        <div className="mt-4 p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-900 flex items-start gap-2.5">
          <span className="text-base">ℹ️</span>
          <div>
            <p className="font-bold">Maintenance Payment Policy:</p>
            <p className="text-indigo-800 text-[11px] mt-0.5">
              Residents cannot submit maintenance settlement confirmation until both monthly utility bills are uploaded and marked as
              <strong> Approved</strong> by society administration. This ensures all community utility quotas and records remain up-to-date.
            </p>
          </div>
        </div>
      </Card>

      {/* SECTION 2: MAINTENANCE INVOICES TABLE */}
      <Card padding={false}>
        <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-gray-900">Maintenance Invoices Ledger</h2>
            <span className="text-xs text-gray-400">({payments.length} invoices)</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Invoices</option>
            <option value="Paid">Paid</option>
            <option value="Unpaid">Unpaid Only</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : payments.length === 0 ? (
          <div className="p-8">
            <EmptyState icon="💳" title="No billing records" description="You have no maintenance invoices on record." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60 text-gray-500 uppercase tracking-wider font-semibold text-[11px]">
                  <th className="py-3.5 px-5">Invoice Description</th>
                  <th className="py-3.5 px-4">Period</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Due Date</th>
                  <th className="py-3.5 px-4">Utility Verification</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-5 text-right">Payment Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((p) => {
                  const elecStatus = p.billsVerification?.electricity?.status || "Missing";
                  const gasStatus = p.billsVerification?.gas?.status || "Missing";
                  const billsReady = elecStatus === "Approved" && gasStatus === "Approved";

                  return (
                    <tr key={p._id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-4 px-5">
                        <p className="font-bold text-gray-900">{p.description}</p>
                        {p.isOverdue && p.status === "Unpaid" && (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-red-100 text-red-700 font-bold text-[10px] rounded-full border border-red-200">
                            ⚠️ Overdue ({p.daysOverdue} days)
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 font-mono font-semibold text-gray-700">{p.paymentPeriod}</td>
                      <td className="py-4 px-4 font-black text-gray-900 text-sm">
                        PKR {Number(p.amount || 0).toLocaleString()}
                      </td>
                      <td className="py-4 px-4 text-gray-600 font-medium">
                        {p.dueDate ? new Date(p.dueDate).toLocaleDateString() : "No date"}
                      </td>
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <span className="text-gray-400">⚡:</span>
                            <StatusBadge status={elecStatus} />
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <span className="text-gray-400">🔥:</span>
                            <StatusBadge status={gasStatus} />
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <StatusBadge status={p.status} />
                        {p.markedPaidAt && (
                          <p className="text-[10px] text-gray-400 mt-1">
                            Paid {new Date(p.markedPaidAt).toLocaleDateString()}
                          </p>
                        )}
                        {p.paymentRequestSubmitted && p.status === "Unpaid" && (
                          <p className="text-[10px] text-sky-700 font-semibold mt-1 bg-sky-50 p-1 rounded border border-sky-100">
                            ⏳ Request submitted
                          </p>
                        )}
                      </td>
                      <td className="py-4 px-5 text-right">
                        {p.status === "Paid" ? (
                          <span className="text-xs font-bold text-emerald-600">✓ Settled</span>
                        ) : p.paymentRequestSubmitted ? (
                          <span className="text-[11px] text-sky-600 font-bold bg-sky-50 px-2 py-1 rounded-lg border border-sky-200">
                            Awaiting Admin Review
                          </span>
                        ) : billsReady ? (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => {
                              setRequestPayModalPayment(p);
                              setPaymentNote("");
                            }}
                          >
                            ✓ Confirm Payment
                          </Button>
                        ) : (
                          <div className="text-right">
                            <span className="inline-block px-2.5 py-1 bg-amber-50 text-amber-800 rounded-lg text-[10px] font-bold border border-amber-200">
                              🔒 Bills Required
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* MODAL 1: UPLOAD UTILITY BILL */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title={`Upload ${uploadBillType} Bill (${selectedPeriod})`}
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <p className="text-xs text-gray-500">
            Upload your paid or latest bill document for <strong>{selectedPeriod}</strong>. Images (JPG, PNG, WEBP) or PDF files up to 5MB are accepted.
          </p>

          {uploadError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
              • {uploadError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
              Bill Type *
            </label>
            <select
              value={uploadBillType}
              onChange={(e) => setUploadBillType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Electricity">⚡ Electricity Bill</option>
              <option value="Gas">🔥 Sui Gas Bill</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
              Document File (JPG, PNG, PDF max 5MB) *
            </label>
            <div className="border-2 border-dashed border-gray-200 hover:border-indigo-400 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-gray-50/50">
              <input
                type="file"
                id="billFileInput"
                accept=".jpg,.jpeg,.png,.webp,.pdf,image/*,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="billFileInput" className="cursor-pointer block">
                <span className="text-3xl block mb-2">📁</span>
                {selectedFile ? (
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-indigo-600 truncate max-w-xs mx-auto">
                      {selectedFile.name}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {(selectedFile.size / 1024).toFixed(1)} KB • Click to change file
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-bold text-gray-700">Click to browse or drop file here</p>
                    <p className="text-[10px] text-gray-400 mt-1">Accepts clear photo or PDF document</p>
                  </div>
                )}
              </label>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setUploadModalOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!selectedFile}
              loading={uploading}
              className="flex-1"
            >
              Submit for Verification
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: PREVIEW UPLOADED BILL */}
      <Modal
        isOpen={Boolean(previewDoc)}
        onClose={closePreview}
        title={`Uploaded ${previewDoc?.bill?.billType || "Bill"} (${previewDoc?.bill?.billingPeriod || ""})`}
      >
        <div className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-xl text-xs flex items-center justify-between">
            <div>
              <p className="font-bold text-gray-900">{previewDoc?.originalName}</p>
              <p className="text-gray-500 text-[11px]">
                Status: <span className="font-semibold">{previewDoc?.bill?.status}</span>
              </p>
            </div>
            {previewDoc?.url && (
              <a
                href={previewDoc.url}
                download={previewDoc.originalName}
                className="px-3 py-1.5 bg-indigo-50 text-indigo-700 font-bold rounded-lg hover:bg-indigo-100 transition-colors"
              >
                💾 Download
              </a>
            )}
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-900 flex items-center justify-center min-h-[360px] max-h-[550px]">
            {previewDoc?.mimeType?.includes("pdf") ? (
              <iframe
                src={previewDoc.url}
                title="Bill PDF Preview"
                className="w-full h-[500px] border-none"
              />
            ) : (
              <img
                src={previewDoc?.url}
                alt="Utility Bill Document"
                className="max-h-[500px] w-auto object-contain mx-auto"
              />
            )}
          </div>
        </div>
      </Modal>

      {/* MODAL 3: CONFIRM PAYMENT SETTLEMENT REQUEST */}
      <Modal
        isOpen={Boolean(requestPayModalPayment)}
        onClose={() => setRequestPayModalPayment(null)}
        title="Confirm Maintenance Payment Settlement"
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
            <p className="font-bold">✓ Bills Verified for this Period</p>
            <p className="text-[11px] mt-0.5">
              Your electricity and gas bills for period {requestPayModalPayment?.paymentPeriod} have been verified.
              You can now submit your payment confirmation to administration.
            </p>
          </div>

          <div className="p-3 bg-gray-50 rounded-xl text-xs space-y-1">
            <p className="text-gray-600">
              Amount Due: <strong className="text-gray-900 font-bold">PKR {Number(requestPayModalPayment?.amount || 0).toLocaleString()}</strong>
            </p>
            <p className="text-gray-600">
              Period: <strong className="text-gray-900 font-bold">{requestPayModalPayment?.paymentPeriod}</strong>
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
              Payment Reference / Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={paymentNote}
              onChange={(e) => setPaymentNote(e.target.value)}
              placeholder="e.g. Paid cash at society office or bank transfer ref #12345678"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setRequestPayModalPayment(null)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              loading={requestingPay}
              onClick={handleRequestPayment}
              className="flex-1"
            >
              Submit Confirmation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
