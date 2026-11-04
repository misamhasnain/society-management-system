import api from "../api/axios";

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export const fmtMonth = (period) => {
  if (!period) return "—";
  const [y, m] = period.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

export const fmtMoney = (n, currency = "PKR") => `${currency} ${Number(n || 0).toLocaleString()}`;

// Downloads the server-generated PDF. Throws an Error with a readable message.
export async function downloadReceiptPdf(receiptId, receiptNumber = "receipt") {
  try {
    const res = await api.get(`/receipts/${receiptId}/pdf`, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${receiptNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    let message = "Could not download the receipt PDF.";
    try {
      const text = await err.response?.data?.text?.();
      if (text) message = JSON.parse(text).message || message;
    } catch {
      /* keep default message */
    }
    throw new Error(message);
  }
}