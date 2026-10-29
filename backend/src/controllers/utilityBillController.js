import mongoose from "mongoose";
import path from "node:path";
import fs from "node:fs";
import UtilityBill from "../models/UtilityBill.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";

const ok = (res, status, message, data = {}) =>
  res.status(status).json({ success: true, message, data });

const fail = (res, status, message, errors = []) =>
  res.status(status).json({ success: false, message, errors });

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const BILL_TYPES = ["Electricity", "Gas"];

// Resident: Upload or Replace Utility Bill
export const uploadUtilityBill = async (req, res) => {
  try {
    if (req.user.role !== "resident") {
      return fail(res, 403, "Only residents can upload utility bills.");
    }

    if (!req.user.house) {
      return fail(res, 400, "You must be assigned to an approved house to upload utility bills.");
    }

    const { billType, billingPeriod } = req.body || {};

    if (!billType || !BILL_TYPES.includes(billType)) {
      return fail(res, 400, "billType must be 'Electricity' or 'Gas'.");
    }

    if (!billingPeriod || !PERIOD_RE.test(String(billingPeriod))) {
      return fail(res, 400, "billingPeriod must be in YYYY-MM format.");
    }

    if (!req.file) {
      return fail(res, 400, "Bill document file (Image or PDF) is required.");
    }

    // Check existing bill
    let bill = await UtilityBill.findOne({
      resident: req.user._id,
      billType,
      billingPeriod,
    });

    if (bill && bill.status === "Approved") {
      // Remove newly uploaded file since not needed
      if (fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch {}
      }
      return fail(res, 400, `Your ${billType} bill for ${billingPeriod} is already approved.`);
    }

    if (bill) {
      // Replace existing file on disk
      if (bill.filePath && fs.existsSync(bill.filePath)) {
        try { fs.unlinkSync(bill.filePath); } catch {}
      }

      bill.fileName = req.file.filename;
      bill.filePath = req.file.path;
      bill.originalName = req.file.originalname;
      bill.mimeType = req.file.mimetype;
      bill.size = req.file.size;
      bill.status = "Pending Review";
      bill.rejectionReason = undefined;
      bill.reviewedBy = undefined;
      bill.reviewedAt = undefined;
      bill.auditLog.push({
        action: "Replaced",
        performedBy: req.user._id,
        performedByName: req.user.name,
        reason: "Resident uploaded a replacement document.",
        timestamp: new Date(),
      });

      await bill.save();
    } else {
      bill = await UtilityBill.create({
        resident: req.user._id,
        house: req.user.house,
        billType,
        billingPeriod,
        fileName: req.file.filename,
        filePath: req.file.path,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        status: "Pending Review",
        auditLog: [
          {
            action: "Uploaded",
            performedBy: req.user._id,
            performedByName: req.user.name,
            reason: "Initial bill submission",
            timestamp: new Date(),
          },
        ],
      });
    }

    // Notify admins about pending bill
    try {
      const admins = await User.find({ role: "admin", isActive: true }).select("_id");
      if (admins.length > 0) {
        await Notification.insertMany(
          admins.map((a) => ({
            recipient: a._id,
            type: "utility-bill",
            title: "New Utility Bill Uploaded",
            message: `${req.user.name} submitted a ${billType} bill for ${billingPeriod} awaiting review.`,
            relatedResource: { kind: "utility-bill", id: bill._id },
          }))
        );
      }
    } catch (e) {
      console.error("Admin notification error:", e.message);
    }

    const populated = await UtilityBill.findById(bill._id)
      .populate("resident", "name email phone")
      .populate("house", "block houseNumber");

    return ok(res, 201, `${billType} bill uploaded successfully and is now Pending Review.`, {
      bill: populated,
    });
  } catch (err) {
    console.error("Upload error:", err);
    if (req.file?.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }
    return fail(res, 500, "Failed to upload utility bill.", [err.message]);
  }
};

// Get List of Utility Bills (Admin sees all; resident sees their own)
export const getUtilityBills = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);

    const filter = {};
    if (req.user.role === "resident") {
      filter.resident = req.user._id;
    } else if (req.query.resident && mongoose.isValidObjectId(req.query.resident)) {
      filter.resident = req.query.resident;
    }

    if (["Pending Review", "Approved", "Rejected"].includes(req.query.status)) {
      filter.status = req.query.status;
    }
    if (BILL_TYPES.includes(req.query.billType)) {
      filter.billType = req.query.billType;
    }
    if (PERIOD_RE.test(String(req.query.billingPeriod || ""))) {
      filter.billingPeriod = req.query.billingPeriod;
    }

    const [bills, total] = await Promise.all([
      UtilityBill.find(filter)
        .populate("resident", "name email phone")
        .populate("house", "block houseNumber")
        .populate("reviewedBy", "name")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      UtilityBill.countDocuments(filter),
    ]);

    return ok(res, 200, "Utility bills fetched.", {
      bills,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return fail(res, 500, "Failed to fetch utility bills.", [err.message]);
  }
};

// Get Verification Status for a specific period (Resident or Admin for resident)
export const getVerificationStatus = async (req, res) => {
  try {
    let targetResident = req.user._id;
    if (req.user.role === "admin" && req.query.resident && mongoose.isValidObjectId(req.query.resident)) {
      targetResident = req.query.resident;
    }

    const billingPeriod = req.query.billingPeriod || new Date().toISOString().slice(0, 7);

    const bills = await UtilityBill.find({
      resident: targetResident,
      billingPeriod,
    }).populate("reviewedBy", "name");

    const electricityBill = bills.find((b) => b.billType === "Electricity") || null;
    const gasBill = bills.find((b) => b.billType === "Gas") || null;

    const electricityStatus = electricityBill ? electricityBill.status : "Missing";
    const gasStatus = gasBill ? gasBill.status : "Missing";

    const isVerified = electricityStatus === "Approved" && gasStatus === "Approved";

    const missing = [];
    if (electricityStatus === "Missing") missing.push("Electricity");
    if (gasStatus === "Missing") missing.push("Gas");

    const pending = [];
    if (electricityStatus === "Pending Review") pending.push("Electricity");
    if (gasStatus === "Pending Review") pending.push("Gas");

    const rejected = [];
    if (electricityStatus === "Rejected") rejected.push({ type: "Electricity", reason: electricityBill.rejectionReason });
    if (gasStatus === "Rejected") rejected.push({ type: "Gas", reason: gasBill.rejectionReason });

    return ok(res, 200, "Verification status fetched.", {
      billingPeriod,
      electricity: {
        status: electricityStatus,
        bill: electricityBill,
      },
      gas: {
        status: gasStatus,
        bill: gasBill,
      },
      isVerified,
      canPayMaintenance: isVerified,
      missing,
      pending,
      rejected,
    });
  } catch (err) {
    return fail(res, 500, "Failed to get verification status.", [err.message]);
  }
};

// Admin: Review (Approve or Reject) Bill
export const reviewUtilityBill = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return fail(res, 400, "Invalid utility bill ID.");
    }

    const { status, rejectionReason } = req.body || {};

    if (!["Approved", "Rejected"].includes(status)) {
      return fail(res, 400, "Status must be 'Approved' or 'Rejected'.");
    }

    if (status === "Rejected" && (!rejectionReason || !String(rejectionReason).trim())) {
      return fail(res, 400, "A clear rejection reason is required so the resident can correct it.");
    }

    const bill = await UtilityBill.findById(req.params.id);
    if (!bill) {
      return fail(res, 404, "Utility bill record not found.");
    }

    bill.status = status;
    bill.reviewedBy = req.user._id;
    bill.reviewedAt = new Date();
    bill.rejectionReason = status === "Rejected" ? String(rejectionReason).trim() : undefined;

    bill.auditLog.push({
      action: status,
      performedBy: req.user._id,
      performedByName: req.user.name,
      reason: status === "Rejected" ? String(rejectionReason).trim() : "Approved by administrator",
      timestamp: new Date(),
    });

    await bill.save();

    // Notify Resident
    try {
      const title = status === "Approved" ? "Utility Bill Approved" : "Utility Bill Rejected";
      const message =
        status === "Approved"
          ? `Your ${bill.billType} bill for ${bill.billingPeriod} has been approved by admin.`
          : `Your ${bill.billType} bill for ${bill.billingPeriod} was rejected. Reason: "${bill.rejectionReason}". Please upload a clear replacement.`;

      await Notification.create({
        recipient: bill.resident,
        type: "utility-bill",
        title,
        message,
        relatedResource: { kind: "utility-bill", id: bill._id },
      });
    } catch (notifErr) {
      console.error("Notification creation error:", notifErr.message);
    }

    const updated = await UtilityBill.findById(bill._id)
      .populate("resident", "name email phone")
      .populate("house", "block houseNumber")
      .populate("reviewedBy", "name");

    return ok(res, 200, `Bill marked as ${status}.`, { bill: updated });
  } catch (err) {
    return fail(res, 500, "Failed to review utility bill.", [err.message]);
  }
};

// Stream/View Bill Document Securely
export const getBillFile = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return fail(res, 400, "Invalid utility bill ID.");
    }

    const bill = await UtilityBill.findById(req.params.id);
    if (!bill) {
      return fail(res, 404, "Bill not found.");
    }

    // Security check: Only Admins or the Resident who owns this bill
    if (req.user.role === "resident" && String(bill.resident) !== String(req.user._id)) {
      return fail(res, 403, "Access denied. You can only view your own bills.");
    }

    if (!bill.filePath || !fs.existsSync(bill.filePath)) {
      return fail(res, 404, "Bill file not found on server.");
    }

    res.setHeader("Content-Type", bill.mimeType || "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(bill.originalName)}"`
    );

    return res.sendFile(path.resolve(bill.filePath));
  } catch (err) {
    return fail(res, 500, "Failed to retrieve bill file.", [err.message]);
  }
};
