import mongoose from "mongoose";
import Receipt from "../models/Receipt.js";
import { renderReceiptPdf } from "../services/receiptPdf.js";

const ok = (res, status, message, data = {}) => res.status(status).json({ success: true, message, data });
const fail = (res, status, message, errors = []) => res.status(status).json({ success: false, message, errors });

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

// Residents can only ever load their own receipts
const ownedFilter = (req, id) => {
  const filter = { _id: id };
  if (req.user.role === "resident") filter.resident = req.user._id;
  return filter;
};

export const listReceipts = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);

    const filter = {};
    if (req.user.role === "resident") {
      filter.resident = req.user._id;
    } else if (req.query.resident && mongoose.isValidObjectId(req.query.resident)) {
      filter.resident = req.query.resident;
    }
    if (PERIOD_RE.test(String(req.query.paymentPeriod || ""))) filter.paymentPeriod = req.query.paymentPeriod;

    const [receipts, total] = await Promise.all([
      Receipt.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Receipt.countDocuments(filter),
    ]);

    return ok(res, 200, "Receipts fetched.", {
      receipts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return fail(res, 500, "Failed to fetch receipts.", [err.message]);
  }
};

export const getReceipt = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 400, "Invalid receipt ID.");
    const receipt = await Receipt.findOne(ownedFilter(req, req.params.id));
    if (!receipt) return fail(res, 404, "Receipt not found.");
    return ok(res, 200, "Receipt fetched.", { receipt });
  } catch (err) {
    return fail(res, 500, "Failed to fetch receipt.", [err.message]);
  }
};

export const downloadReceiptPdf = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 400, "Invalid receipt ID.");
    const receipt = await Receipt.findOne(ownedFilter(req, req.params.id));
    if (!receipt) return fail(res, 404, "Receipt not found.");

    const rendered = await renderReceiptPdf(receipt, res);
    if (!rendered) {
      return fail(res, 501, "PDF generation is not available on the server. Please use Print and save as PDF.");
    }
  } catch (err) {
    if (!res.headersSent) return fail(res, 500, "Failed to generate receipt PDF.", [err.message]);
    res.destroy();
  }
};