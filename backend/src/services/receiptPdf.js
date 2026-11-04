import fs from "node:fs";
import path from "node:path";

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-";

const fmtMonth = (p) => {
  const [y, m] = String(p).split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

/**
 * Streams a receipt PDF into `res`. Returns false (and writes nothing) if
 * pdfkit is not installed, so the caller can respond with a clean error.
 */
export const renderReceiptPdf = async (receipt, res) => {
  let PDFDocument;
  try {
    ({ default: PDFDocument } = await import("pdfkit"));
  } catch {
    return false;
  }

  const INDIGO = "#4f46e5";
  const doc = new PDFDocument({ size: "A4", margin: 40, info: { Title: `Receipt ${receipt.receiptNumber}` } });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${receipt.receiptNumber}.pdf"`);
  doc.on("error", () => res.destroy());
  doc.pipe(res);

  // Header band
  doc.rect(0, 0, 595, 120).fill(INDIGO);
  doc.roundedRect(40, 30, 60, 60, 12).fill("#ffffff");

  const logoPath = process.env.SOCIETY_LOGO_PATH ? path.resolve(process.cwd(), process.env.SOCIETY_LOGO_PATH) : null;
  if (logoPath && fs.existsSync(logoPath) && /\.(png|jpe?g)$/i.test(logoPath)) {
    doc.image(logoPath, 46, 36, { fit: [48, 48], align: "center", valign: "center" });
  } else {
    doc
      .fillColor(INDIGO)
      .font("Helvetica-Bold")
      .fontSize(28)
      .text((receipt.societyName || "S").charAt(0).toUpperCase(), 40, 46, { width: 60, align: "center", lineBreak: false });
  }

  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(22).text(receipt.societyName, 116, 34, { width: 430, lineBreak: false });
  if (receipt.societyAddress) {
    doc.font("Helvetica").fontSize(9).text(receipt.societyAddress, 116, 62, { width: 430, lineBreak: false });
  }
  doc.font("Helvetica-Bold").fontSize(10).text("MONTHLY MAINTENANCE PAYMENT RECEIPT", 116, 88, { lineBreak: false });

  // Receipt number + issue date
  doc.fillColor("#6b7280").font("Helvetica-Bold").fontSize(8).text("RECEIPT NUMBER", 40, 145, { lineBreak: false });
  doc.fillColor("#111827").font("Helvetica-Bold").fontSize(16).text(receipt.receiptNumber, 40, 158, { lineBreak: false });
  doc.fillColor("#6b7280").font("Helvetica-Bold").fontSize(8).text("ISSUED ON", 380, 145, { width: 175, align: "right", lineBreak: false });
  doc.fillColor("#111827").font("Helvetica-Bold").fontSize(12).text(fmtDate(receipt.approvedAt), 380, 160, { width: 175, align: "right", lineBreak: false });

  // Detail rows
  const rows = [
    ["Customer name", receipt.residentName],
    ["House / Flat no.", receipt.houseLabel],
    ["Description", receipt.description],
    ["Payment month", fmtMonth(receipt.paymentPeriod)],
    ["Payment date", fmtDate(receipt.paymentDate)],
    ["Approval date", fmtDate(receipt.approvedAt)],
    ["Payment status", receipt.status === "Void" ? "VOID" : "PAID"],
  ];
  let y = 205;
  rows.forEach(([label, value]) => {
    doc.fillColor("#6b7280").font("Helvetica-Bold").fontSize(8).text(label.toUpperCase(), 40, y + 4, { lineBreak: false });
    doc.fillColor("#111827").font("Helvetica").fontSize(12).text(String(value || "-"), 220, y, { width: 335, lineBreak: false });
    doc.moveTo(40, y + 26).lineTo(555, y + 26).lineWidth(0.5).strokeColor("#e5e7eb").stroke();
    y += 34;
  });

  // Amount box
  y += 14;
  doc.roundedRect(40, y, 515, 80, 10).fill("#eef2ff");
  doc.fillColor("#4338ca").font("Helvetica-Bold").fontSize(9).text("AMOUNT PAID", 60, y + 18, { lineBreak: false });
  doc
    .fillColor("#111827")
    .font("Helvetica-Bold")
    .fontSize(28)
    .text(`${receipt.currency} ${Number(receipt.amount).toLocaleString("en-US")}`, 60, y + 36, { lineBreak: false });

  // Status stamp
  const isVoid = receipt.status === "Void";
  doc.roundedRect(455, y + 22, 80, 36, 8).fill(isVoid ? "#fee2e2" : "#d1fae5");
  doc
    .fillColor(isVoid ? "#b91c1c" : "#047857")
    .font("Helvetica-Bold")
    .fontSize(16)
    .text(isVoid ? "VOID" : "PAID", 455, y + 33, { width: 80, align: "center", lineBreak: false });

  // Footer
  doc.moveTo(40, 760).lineTo(555, 760).lineWidth(0.5).strokeColor("#e5e7eb").stroke();
  doc
    .fillColor("#9ca3af")
    .font("Helvetica")
    .fontSize(9)
    .text("This is a computer-generated receipt and does not require a signature.", 40, 770, { width: 515, align: "center", lineBreak: false });

  doc.end();
  return true;
};