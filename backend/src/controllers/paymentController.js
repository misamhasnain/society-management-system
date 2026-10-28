import mongoose from "mongoose";
import Payment from "../models/Payment.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";

const ok = (res, status, message, data = {}) =>
  res.status(status).json({ success: true, message, data });

const fail = (res, status, message, errors = []) =>
  res.status(status).json({ success: false, message, errors });

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const STATUSES = ["Paid", "Unpaid"];

const validateBill = ({ amount, paymentPeriod, dueDate, description }) => {
  const errors = [];
  const num = Number(amount);
  if (!Number.isFinite(num) || num < 1) errors.push("Amount must be a number greater than 0.");
  if (!paymentPeriod || !PERIOD_RE.test(String(paymentPeriod))) errors.push("Payment period must be in YYYY-MM format.");
  if (!dueDate || Number.isNaN(new Date(dueDate).getTime())) errors.push("A valid due date is required.");
  if (description !== undefined && String(description).trim().length > 200) errors.push("Description is too long.");
  return errors;
};

export const getPayments = async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);

  const filter = {};
  if (req.user.role === "resident") filter.resident = req.user._id;
  else if (req.query.resident && mongoose.isValidObjectId(req.query.resident)) {
    filter.resident = req.query.resident;
  }
  if (STATUSES.includes(req.query.status)) filter.status = req.query.status;
  if (PERIOD_RE.test(String(req.query.paymentPeriod || ""))) {
    filter.paymentPeriod = req.query.paymentPeriod;
  }

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .populate("resident", "name house")
      .sort({ dueDate: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Payment.countDocuments(filter),
  ]);

  return ok(res, 200, "Payments fetched.", {
    payments,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
};

export const getPaymentById = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return fail(res, 400, "Invalid payment ID.");
  }
  const filter = { _id: req.params.id };
  if (req.user.role === "resident") filter.resident = req.user._id;

  const payment = await Payment.findOne(filter).populate("resident", "name house");
  if (!payment) return fail(res, 404, "Payment not found.");
  return ok(res, 200, "Payment fetched.", { payment });
};

export const createPayment = async (req, res) => {
  const { resident, amount, description, paymentPeriod, dueDate } = req.body || {};

  const errors = validateBill({ amount, paymentPeriod, dueDate, description });
  if (!resident || !mongoose.isValidObjectId(resident)) errors.push("A valid resident ID is required.");
  if (errors.length) return fail(res, 400, "Validation failed.", errors);

  const user = await User.findOne({
    _id: resident,
    role: "resident",
    approvalStatus: "approved",
  });
  if (!user) return fail(res, 404, "Approved resident not found.");

  const payment = await Payment.create({
    resident: user._id,
    amount: Number(amount),
    description: description ? String(description).trim() : undefined,
    paymentPeriod,
    dueDate: new Date(dueDate),
    status: "Unpaid",
  });

  await Notification.create({
    recipient: user._id,
    type: "payment",
    title: "New maintenance bill",
    message: `A bill of ${payment.amount} for ${payment.paymentPeriod} has been added.`,
    relatedResource: { kind: "payment", id: payment._id },
  });

  return ok(res, 201, "Payment created.", { payment });
};

export const createBulkPayments = async (req, res) => {
  const { amount, description, paymentPeriod, dueDate } = req.body || {};

  const errors = validateBill({ amount, paymentPeriod, dueDate, description });
  if (errors.length) return fail(res, 400, "Validation failed.", errors);

  const desc = description ? String(description).trim() : "Monthly maintenance";

  const residents = await User.find({
    role: "resident",
    approvalStatus: "approved",
    isActive: true,
  }).select("_id");

  const existing = await Payment.find({
    resident: { $in: residents.map((r) => r._id) },
    paymentPeriod,
    description: desc,
  }).select("resident");
  const alreadyBilled = new Set(existing.map((p) => String(p.resident)));

  const toCreate = residents
    .filter((r) => !alreadyBilled.has(String(r._id)))
    .map((r) => ({
      resident: r._id,
      amount: Number(amount),
      description: desc,
      paymentPeriod,
      dueDate: new Date(dueDate),
      status: "Unpaid",
    }));

  let created = [];
  if (toCreate.length) created = await Payment.insertMany(toCreate);

  if (created.length) {
    await Notification.insertMany(
      created.map((p) => ({
        recipient: p.resident,
        type: "payment",
        title: "New maintenance bill",
        message: `A bill of ${p.amount} for ${p.paymentPeriod} has been added.`,
        relatedResource: { kind: "payment", id: p._id },
      }))
    );
  }

  return ok(res, 201, "Bulk billing completed.", {
    created: created.length,
    skippedExisting: alreadyBilled.size,
  });
};

export const updatePaymentStatus = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return fail(res, 400, "Invalid payment ID.");
  }
  const { status } = req.body || {};
  if (!STATUSES.includes(status)) {
    return fail(res, 400, 'status must be "Paid" or "Unpaid".');
  }

  const payment = await Payment.findById(req.params.id);
  if (!payment) return fail(res, 404, "Payment not found.");

  if (payment.status !== status) {
    payment.status = status;
    if (status === "Paid") {
      payment.markedPaidAt = new Date();
      payment.markedPaidBy = req.user._id;
    } else {
      payment.markedPaidAt = undefined;
      payment.markedPaidBy = undefined;
    }
    await payment.save();

    await Notification.create({
      recipient: payment.resident,
      type: "payment",
      title: "Payment status updated",
      message: `Your bill for ${payment.paymentPeriod} is now marked ${status}.`,
      relatedResource: { kind: "payment", id: payment._id },
    });
  }

  return ok(res, 200, "Payment updated.", { payment });
};