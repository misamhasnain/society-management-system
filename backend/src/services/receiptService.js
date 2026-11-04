import Counter from "../models/Counter.js";
import Receipt from "../models/Receipt.js";
import User from "../models/User.js";
import House from "../models/House.js";
import Notification from "../models/Notification.js";

export const societyInfo = () => ({
  name: process.env.SOCIETY_NAME || "SocietyOS",
  address: process.env.SOCIETY_ADDRESS || "",
});

const nextReceiptNumber = async (date) => {
  const ym = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`;
  const counter = await Counter.findOneAndUpdate(
    { _id: `receipt-${ym}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `RCP-${ym}-${String(counter.seq).padStart(5, "0")}`;
};

/**
 * Idempotent: returns the existing receipt for a payment if there is one,
 * otherwise creates it. Safe against double-clicks and concurrent requests
 * (unique index on `payment` is the final guard).
 */
export const ensureReceipt = async ({ payment, proof = null, approvedBy = null, approvedAt = null }) => {
  const existing = await Receipt.findOne({ payment: payment._id });
  if (existing) {
    if (existing.status === "Void") {
      existing.status = "Paid";
      await existing.save();
    }
    return { receipt: existing, created: false };
  }

  const resident = await User.findById(payment.resident).select("name house");
  const house = await House.findById(proof?.house || resident?.house).select("block houseNumber");
  const now = new Date();
  const info = societyInfo();

  try {
    const receipt = await Receipt.create({
      receiptNumber: await nextReceiptNumber(now),
      payment: payment._id,
      proof: proof?._id,
      resident: payment.resident,
      house: house?._id,
      societyName: info.name,
      societyAddress: info.address,
      residentName: resident?.name || "Resident",
      houseLabel: house ? `Block ${house.block} - House ${house.houseNumber}` : "",
      description: payment.description,
      amount: payment.amount,
      paymentPeriod: payment.paymentPeriod,
      paymentDate: proof?.paymentDate || payment.markedPaidAt || now,
      approvedAt: approvedAt || now,
      approvedByName: approvedBy?.name || "",
      status: "Paid",
    });
    return { receipt, created: true };
  } catch (err) {
    if (err.code === 11000) {
      const dup = await Receipt.findOne({ payment: payment._id });
      if (dup) return { receipt: dup, created: false };
    }
    throw err;
  }
};

export const voidReceipt = (paymentId) =>
  Receipt.updateOne({ payment: paymentId, status: "Paid" }, { $set: { status: "Void" } });

export const notifyReceiptIssued = async (receipt) => {
  try {
    await Notification.create({
      recipient: receipt.resident,
      type: "payment",
      title: "Payment receipt generated",
      message: `Receipt ${receipt.receiptNumber} for ${receipt.paymentPeriod} (PKR ${receipt.amount}) is ready. You can view, download or print it from Receipts & History.`,
      relatedResource: { kind: "receipt", id: receipt._id },
    });
  } catch (e) {
    console.error("Receipt notification error:", e.message);
  }
};