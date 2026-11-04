import { useState } from "react";
import { fmtDate, fmtMonth, fmtMoney } from "../../utils/receipt";

// Place your logo at frontend/public/society-logo.png. If it is missing,
// the society's initial is shown instead.
function Field({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-gray-900 mt-0.5 break-words">{value || "—"}</p>
    </div>
  );
}

export default function ReceiptDocument({ receipt }) {
  const [logoOk, setLogoOk] = useState(true);
  const isVoid = receipt.status === "Void";

  return (
    <div id="receipt-print" className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="bg-indigo-600 text-white px-5 sm:px-7 py-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center shrink-0 overflow-hidden">
          {logoOk ? (
            <img
              src="/society-logo.png"
              alt={`${receipt.societyName} logo`}
              className="w-11 h-11 object-contain"
              onError={() => setLogoOk(false)}
            />
          ) : (
            <span className="text-2xl font-bold text-indigo-600">{receipt.societyName?.charAt(0)?.toUpperCase() || "S"}</span>
          )}
        </div>
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-bold leading-tight truncate">{receipt.societyName}</h2>
          {receipt.societyAddress && <p className="text-xs text-indigo-100 truncate">{receipt.societyAddress}</p>}
          <p className="text-xs font-semibold text-indigo-100 mt-1">Monthly Maintenance Payment Receipt</p>
        </div>
      </div>

      <div className="px-5 sm:px-7 py-5 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold text-gray-500">Receipt number</p>
            <p className="text-lg font-bold text-gray-900 font-mono">{receipt.receiptNumber}</p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold border ${
              isVoid ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
            }`}
          >
            {isVoid ? "Void" : "Paid"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 pb-5 border-b border-gray-100">
          <Field label="Customer name" value={receipt.residentName} />
          <Field label="House / Flat number" value={receipt.houseLabel} />
          <Field label="Description" value={receipt.description} />
          <Field label="Payment month" value={fmtMonth(receipt.paymentPeriod)} />
          <Field label="Payment date" value={fmtDate(receipt.paymentDate)} />
          <Field label="Approval date" value={fmtDate(receipt.approvedAt)} />
        </div>

        <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-indigo-50 border border-indigo-100">
          <div>
            <p className="text-xs font-semibold text-indigo-700">Monthly maintenance amount</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{fmtMoney(receipt.amount, receipt.currency)}</p>
          </div>
          <p className="text-xs text-indigo-700 text-right hidden sm:block">Payment status<br /><strong>{isVoid ? "Void" : "Paid"}</strong></p>
        </div>

        <p className="text-[11px] text-gray-400 text-center">
          This is a computer-generated receipt and does not require a signature.
        </p>
      </div>
    </div>
  );
}