import mongoose from "mongoose";
import path from "node:path";
import fs from "node:fs";
import Payment from "../models/Payment.js";
import PaymentProof from "../models/PaymentProof.js";
import Receipt from "../models/Receipt.js";
import UtilityBill from "../models/UtilityBill.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { ensureReceipt, notifyReceiptIssued } from "../services/receiptService.js";

const ok = (res, status, message, data = {}) => res.status(status).json({ success: true, message, data });
const fail = (res, status, message, errors = []) => res.status(status).json({ success: false, message, errors });

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const STATUSES = ["Pending", "Approved", "Rejected"];

const removeFile = (p) => {
  if (p && fs.existsSync(p)) {
    try {
      fs.unlinkSync(p);
    } catch {
      /* ignore */
    }
  }
};

const populateProof = (q) =>
  q
    .populate("resident", "name email phone")
    .populate("house", "block houseNumber")
    .populate("payment", "amount paymentPeriod description status dueDate")
    .populate("reviewedBy", "name");

// Resident: submit proof of maintenance payment
export const submitPaymentProof = async (req, res) => {
  try {
    if (req.user.role !== "resident") {
      removeFile(req.file?.path);
      return fail(res, 403, "Only residents can submit payment proof.");
    }
    if (!req.user.house) {
      removeFile(req.file?.path);
      return fail(res, 400, "You must be assigned to a house to submit payment proof.");
    }

    const { paymentId, paymentDate, referenceNo, note } = req.body || {};
    const errors = [];

    if (!paymentId || !mongoose.isValidObjectId(paymentId)) errors.push("A valid invoice is required.");
    if (!req.file) errors.push("Payment proof file (image or PDF) is required.");

    const pd = new Date(paymentDate);
    if (!paymentDate || Number.isNaN(pd.getTime())) errors.push("A valid payment date is required.");
    else if (pd.getTime() > Date.now() + 24 * 60 * 60 * 1000) errors.push("Payment date cannot be in the future.");

    if (referenceNo && String(referenceNo).trim().length > 100) errors.push("Reference number is too long (max 100).");
    if (note && String(note).trim().length > 300) errors.push("Note is too long (max 300).");

    if (errors.length) {
      removeFile(req.file?.path);
      return fail(res, 400, "Validation failed.", errors);
    }

    const payment = await Payment.findOne({ _id: paymentId, resident: req.user._id });
    if (!payment) {
      removeFile(req.file.path);
      return fail(res, 404, "Maintenance invoice not found.");
    }
    if (payment.status === "Paid") {
      removeFile(req.file.path);
      return fail(res, 400, "This invoice is already paid.");
    }

    // Same gating rule as the existing request-pay flow
    const approvedUtility = await UtilityBill.countDocuments({
      resident: req.user._id,
      billingPeriod: payment.paymentPeriod,
      billType: { $in: ["Electricity", "Gas"] },
      status: "Approved",
    });
    if (approvedUtility < 2) {
      removeFile(req.file.path);
      return fail(
        res,
        400,
        "Both Electricity and Gas bills for this period must be approved before you can submit payment proof."
      );
    }

    const live = await PaymentProof.findOne({ payment: payment._id, active: true }).select("status");
    if (live) {
      removeFile(req.file.path);
      return fail(
        res,
        409,
        live.status === "Approved"
          ? "Payment proof for this invoice is already approved."
          : "A payment proof for this invoice is already awaiting review."
      );
    }

    let proof;
    try {
      proof = await PaymentProof.create({
        payment: payment._id,
        resident: req.user._id,
        house: req.user.house,
        status: "Pending",
        active: true,
        fileName: req.file.filename,
        filePath: req.file.path,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        paymentDate: pd,
        referenceNo: referenceNo ? String(referenceNo).trim() : undefined,
        note: note ? String(note).trim() : undefined,
        auditLog: [
          {
            action: "Submitted",
            performedBy: req.user._id,
            performedByName: req.user.name,
            reason: "Resident submitted payment proof",
          },
        ],
      });
    } catch (err) {
      removeFile(req.file.path);
      if (err.code === 11000) return fail(res, 409, "A payment proof for this invoice already exists.");
      throw err;
    }

    await Payment.updateOne(
      { _id: payment._id },
      { $set: { paymentRequestSubmitted: true, paymentRequestedAt: new Date() } }
    );

    try {
      const admins = await User.find({ role: "admin", isActive: true }).select("_id");
      if (admins.length) {
        await Notification.insertMany(
          admins.map((a) => ({
            recipient: a._id,
            type: "payment",
            title: "New payment proof to verify",
            message: `${req.user.name} submitted payment proof for ${payment.paymentPeriod} (PKR ${payment.amount}).`,
            relatedResource: { kind: "payment-proof", id: proof._id },
          }))
        );
      }
    } catch (e) {
      console.error("Admin notification error:", e.message);
    }

    const populated = await populateProof(PaymentProof.findById(proof._id));
    return ok(res, 201, "Payment proof submitted. It is now pending admin verification.", { proof: populated });
  } catch (err) {
    removeFile(req.file?.path);
    console.error("Submit payment proof error:", err);
    return fail(res, 500, "Failed to submit payment proof.", [err.message]);
  }
};

// Admin: all proofs. Resident: own proofs only.
export const getPaymentProofs = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);

    const base = {};
    if (req.user.role === "resident") {
      base.resident = req.user._id;
    } else if (req.query.resident && mongoose.isValidObjectId(req.query.resident)) {
      base.resident = req.query.resident;
    }

    if (PERIOD_RE.test(String(req.query.paymentPeriod || ""))) {
      const ids = await Payment.find({ paymentPeriod: req.query.paymentPeriod }).distinct("_id");
      base.payment = { $in: ids };
    }

    const filter = { ...base };
    if (STATUSES.includes(req.query.status)) filter.status = req.query.status;

    const [rows, total, pending, approved, rejected] = await Promise.all([
      populateProof(PaymentProof.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)),
      PaymentProof.countDocuments(filter),
      PaymentProof.countDocuments({ ...base, status: "Pending" }),
      PaymentProof.countDocuments({ ...base, status: "Approved" }),
      PaymentProof.countDocuments({ ...base, status: "Rejected" }),
    ]);

    const receipts = await Receipt.find({ payment: { $in: rows.map((p) => p.payment?._id || p.payment) } }).select(
      "receiptNumber payment"
    );
    const receiptMap = new Map(receipts.map((r) => [String(r.payment), r]));

    const proofs = rows.map((p) => {
      const doc = p.toObject();
      const r = receiptMap.get(String(p.payment?._id || p.payment));
      doc.receipt = r ? { _id: r._id, receiptNumber: r.receiptNumber } : null;
      return doc;
    });

    return ok(res, 200, "Payment proofs fetched.", {
      proofs,
      counts: { Pending: pending, Approved: approved, Rejected: rejected },
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return fail(res, 500, "Failed to fetch payment proofs.", [err.message]);
  }
};

// Admin: approve (auto-generates receipt) or reject (reason required)
export const reviewPaymentProof = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 400, "Invalid payment proof ID.");

    const { status, rejectionReason } = req.body || {};
    if (!["Approved", "Rejected"].includes(status)) {
      return fail(res, 400, "Status must be 'Approved' or 'Rejected'.");
    }
    const reason = rejectionReason ? String(rejectionReason).trim() : "";
    if (status === "Rejected") {
      if (reason.length < 5) return fail(res, 400, "Please give a clear rejection reason (at least 5 characters).");
      if (reason.length > 500) return fail(res, 400, "Rejection reason is too long (max 500).");
    }

    let proof = await PaymentProof.findById(req.params.id);
    if (!proof) return fail(res, 404, "Payment proof not found.");

    const payment = await Payment.findById(proof.payment);
    if (!payment) return fail(res, 404, "The related maintenance invoice no longer exists.");

    const now = new Date();

    if (status === "Rejected") {
      // Atomic claim: only a Pending proof can be rejected
      const claimed = await PaymentProof.findOneAndUpdate(
        { _id: proof._id, status: "Pending" },
        {
          $set: { status: "Rejected", active: false, rejectionReason: reason, reviewedBy: req.user._id, reviewedAt: now },
          $push: {
            auditLog: { action: "Rejected", performedBy: req.user._id, performedByName: req.user.name, reason, timestamp: now },
          },
        },
        { new: true }
      );
      if (!claimed) return fail(res, 409, `This proof was already ${proof.status.toLowerCase()}.`);

      await Payment.updateOne({ _id: payment._id }, { $set: { paymentRequestSubmitted: false } });

      try {
        await Notification.create({
          recipient: proof.resident,
          type: "payment",
          title: "Payment proof rejected",
          message: `Your payment proof for ${payment.paymentPeriod} was rejected. Reason: "${reason}". Please upload a corrected proof.`,
          relatedResource: { kind: "payment-proof", id: proof._id },
        });
      } catch (e) {
        console.error("Notification error:", e.message);
      }

      const updated = await populateProof(PaymentProof.findById(proof._id));
      return ok(res, 200, "Payment proof rejected.", { proof: updated, receipt: null });
    }

    // ---- Approve ----
    if (proof.status === "Rejected") return fail(res, 409, "A rejected proof cannot be approved. Ask the resident to resubmit.");

    if (proof.status === "Pending") {
      const claimed = await PaymentProof.findOneAndUpdate(
        { _id: proof._id, status: "Pending" },
        {
          $set: { status: "Approved", active: true, reviewedBy: req.user._id, reviewedAt: now },
          $unset: { rejectionReason: 1 },
          $push: {
            auditLog: {
              action: "Approved",
              performedBy: req.user._id,
              performedByName: req.user.name,
              reason: "Approved by administrator",
              timestamp: now,
            },
          },
        },
        { new: true }
      );
      if (!claimed) return fail(res, 409, "This proof was already reviewed.");
      proof = claimed;
    }
    // If it is already Approved we fall through: this safely repairs a missing
    // receipt without ever creating a second one.

    if (payment.status !== "Paid") {
      payment.status = "Paid";
      payment.markedPaidAt = proof.reviewedAt || now;
      payment.markedPaidBy = req.user._id;
      payment.paymentRequestSubmitted = false;
      await payment.save();
    }

    const { receipt, created } = await ensureReceipt({
      payment,
      proof,
      approvedBy: req.user,
      approvedAt: proof.reviewedAt || now,
    });

    if (created) {
      try {
        await Notification.create({
          recipient: proof.resident,
          type: "payment",
          title: "Payment proof approved",
          message: `Your payment for ${payment.paymentPeriod} was approved. Receipt ${receipt.receiptNumber} has been generated.`,
          relatedResource: { kind: "receipt", id: receipt._id },
        });
      } catch (e) {
        console.error("Notification error:", e.message);
      }
    }

    const updated = await populateProof(PaymentProof.findById(proof._id));
    return ok(res, 200, created ? "Payment approved and receipt generated." : "Payment already approved. Existing receipt returned.", {
      proof: updated,
      receipt: { _id: receipt._id, receiptNumber: receipt.receiptNumber },
    });
  } catch (err) {
    console.error("Review payment proof error:", err);
    return fail(res, 500, "Failed to review payment proof.", [err.message]);
  }
};

// Stream the proof file (admin, or the resident who owns it)
export const getProofFile = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 400, "Invalid payment proof ID.");

    const proof = await PaymentProof.findById(req.params.id);
    if (!proof) return fail(res, 404, "Payment proof not found.");

    if (req.user.role === "resident" && String(proof.resident) !== String(req.user._id)) {
      return fail(res, 403, "Access denied. You can only view your own payment proofs.");
    }
    if (!proof.filePath || !fs.existsSync(proof.filePath)) return fail(res, 404, "Proof file not found on server.");

    res.setHeader("Content-Type", proof.mimeType || "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(proof.originalName)}"`);
    return res.sendFile(path.resolve(proof.filePath));
  } catch (err) {
    return fail(res, 500, "Failed to retrieve proof file.", [err.message]);
  }
};