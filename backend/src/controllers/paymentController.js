import mongoose from "mongoose";
import Payment from "../models/Payment.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import UtilityBill from "../models/UtilityBill.js";

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
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);

    const filter = {};
    if (req.user.role === "resident") {
      filter.resident = req.user._id;
    } else if (req.query.resident && mongoose.isValidObjectId(req.query.resident)) {
      filter.resident = req.query.resident;
    }
    if (STATUSES.includes(req.query.status)) filter.status = req.query.status;
    if (PERIOD_RE.test(String(req.query.paymentPeriod || ""))) {
      filter.paymentPeriod = req.query.paymentPeriod;
    }

    const [rawPayments, total] = await Promise.all([
      Payment.find(filter)
        .populate("resident", "name house email phone")
        .sort({ dueDate: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Payment.countDocuments(filter),
    ]);

    // Attach utility bills verification and overdue indicators
    const residentIds = [...new Set(rawPayments.map((p) => p.resident?._id || p.resident).filter(Boolean))];
    const periods = [...new Set(rawPayments.map((p) => p.paymentPeriod).filter(Boolean))];

    const utilityBills = await UtilityBill.find({
      resident: { $in: residentIds },
      billingPeriod: { $in: periods },
    }).select("resident billType billingPeriod status rejectionReason");

    const billMap = new Map();
    utilityBills.forEach((b) => {
      const key = `${b.resident}_${b.billingPeriod}_${b.billType}`;
      billMap.set(key, b);
    });

    const now = new Date();

    const payments = rawPayments.map((p) => {
      const doc = p.toObject();
      const rId = String(p.resident?._id || p.resident);
      const period = p.paymentPeriod;

      const elec = billMap.get(`${rId}_${period}_Electricity`);
      const gas = billMap.get(`${rId}_${period}_Gas`);

      const elecStatus = elec ? elec.status : "Missing";
      const gasStatus = gas ? gas.status : "Missing";
      const billsVerified = elecStatus === "Approved" && gasStatus === "Approved";

      const dueDate = new Date(p.dueDate);
      const isOverdue = p.status === "Unpaid" && dueDate < now;
      const daysOverdue = isOverdue ? Math.floor((now - dueDate) / (1000 * 60 * 60 * 24)) : 0;

      doc.billsVerification = {
        electricity: elecStatus,
        gas: gasStatus,
        verified: billsVerified,
        electricityReason: elec?.rejectionReason,
        gasReason: gas?.rejectionReason,
      };

      doc.isOverdue = isOverdue;
      doc.daysOverdue = daysOverdue;

      return doc;
    });

    return ok(res, 200, "Payments fetched.", {
      payments,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return fail(res, 500, "Failed to load payments.", [err.message]);
  }
};

export const getPaymentById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return fail(res, 400, "Invalid payment ID.");
    }
    const filter = { _id: req.params.id };
    if (req.user.role === "resident") filter.resident = req.user._id;

    const payment = await Payment.findOne(filter).populate("resident", "name house email");
    if (!payment) return fail(res, 404, "Payment not found.");
    return ok(res, 200, "Payment fetched.", { payment });
  } catch (err) {
    return fail(res, 500, "Error fetching payment.", [err.message]);
  }
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
    title: "New maintenance bill issued",
    message: `A bill of PKR ${payment.amount} for period ${payment.paymentPeriod} is due on ${new Date(payment.dueDate).toLocaleDateString()}. Please upload your Electricity and Gas bills for verification.`,
    relatedResource: { kind: "payment", id: payment._id },
  });

  return ok(res, 201, "Payment bill created.", { payment });
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
        title: "New maintenance bill issued",
        message: `Maintenance bill of PKR ${p.amount} for ${p.paymentPeriod} is now active. Remember to verify your latest utility bills.`,
        relatedResource: { kind: "payment", id: p._id },
      }))
    );
  }

  return ok(res, 201, "Bulk billing completed.", {
    created: created.length,
    skippedExisting: alreadyBilled.size,
  });
};

// Resident: Submit Payment Confirmation (Only when both utility bills are approved!)
export const submitPaymentRequest = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return fail(res, 400, "Invalid payment ID.");
    }

    const payment = await Payment.findOne({
      _id: req.params.id,
      resident: req.user._id,
    });

    if (!payment) {
      return fail(res, 404, "Maintenance payment record not found.");
    }

    if (payment.status === "Paid") {
      return fail(res, 400, "This invoice is already marked as Paid.");
    }

    // STRICT CHECK: Both Electricity and Gas bill must be APPROVED for this period!
    const [elecBill, gasBill] = await Promise.all([
      UtilityBill.findOne({
        resident: req.user._id,
        billingPeriod: payment.paymentPeriod,
        billType: "Electricity",
      }),
      UtilityBill.findOne({
        resident: req.user._id,
        billingPeriod: payment.paymentPeriod,
        billType: "Gas",
      }),
    ]);

    const elecApproved = elecBill && elecBill.status === "Approved";
    const gasApproved = gasBill && gasBill.status === "Approved";

    if (!elecApproved || !gasApproved) {
      const issues = [];
      if (!elecBill) issues.push("Electricity bill is missing.");
      else if (elecBill.status !== "Approved") issues.push(`Electricity bill is ${elecBill.status}${elecBill.rejectionReason ? ` (${elecBill.rejectionReason})` : ""}.`);

      if (!gasBill) issues.push("Gas bill is missing.");
      else if (gasBill.status !== "Approved") issues.push(`Gas bill is ${gasBill.status}${gasBill.rejectionReason ? ` (${gasBill.rejectionReason})` : ""}.`);

      return fail(
        res,
        400,
        "Maintenance payment process is blocked until both Electricity and Gas bills for this period are uploaded and approved by the admin.",
        issues
      );
    }

    payment.paymentRequestSubmitted = true;
    payment.paymentRequestedAt = new Date();
    payment.paymentNote = req.body?.note ? String(req.body.note).trim().slice(0, 300) : "Resident marked payment ready";
    await payment.save();

    // Notify admins
    const admins = await User.find({ role: "admin", isActive: true }).select("_id");
    if (admins.length) {
      await Notification.insertMany(
        admins.map((a) => ({
          recipient: a._id,
          type: "payment",
          title: "Maintenance Payment Awaiting Confirmation",
          message: `${req.user.name} has submitted payment confirmation for ${payment.paymentPeriod} (Utility bills verified).`,
          relatedResource: { kind: "payment", id: payment._id },
        }))
      );
    }

    return ok(res, 200, "Payment verification request submitted to society administration.", { payment });
  } catch (err) {
    return fail(res, 500, "Failed to submit payment request.", [err.message]);
  }
};

// Admin: Mark payment Paid / Unpaid
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
      payment.paymentRequestSubmitted = false;
    } else {
      payment.markedPaidAt = undefined;
      payment.markedPaidBy = undefined;
    }
    await payment.save();

    await Notification.create({
      recipient: payment.resident,
      type: "payment",
      title: "Maintenance bill status updated",
      message: `Your maintenance invoice for ${payment.paymentPeriod} has been marked as ${status}.`,
      relatedResource: { kind: "payment", id: payment._id },
    });
  }

  return ok(res, 200, "Payment status updated.", { payment });
};

// Admin: Send Overdue / Due Reminder
export const sendDueReminder = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return fail(res, 400, "Invalid payment ID.");
    }

    const payment = await Payment.findById(req.params.id).populate("resident", "name email");
    if (!payment) return fail(res, 404, "Payment record not found.");

    if (payment.status === "Paid") {
      return fail(res, 400, "Cannot send reminder for an already paid bill.");
    }

    const dueDateStr = new Date(payment.dueDate).toLocaleDateString();
    const isPastDue = new Date(payment.dueDate) < new Date();

    const title = isPastDue ? "⚠️ Overdue Maintenance Notice" : "Maintenance Payment Reminder";
    const message = isPastDue
      ? `Your maintenance payment of PKR ${payment.amount} for ${payment.paymentPeriod} was due on ${dueDateStr} and is currently overdue. Please verify utility bills and settle your dues immediately.`
      : `Friendly reminder: Your maintenance payment of PKR ${payment.amount} for ${payment.paymentPeriod} is due on ${dueDateStr}.`;

    await Notification.create({
      recipient: payment.resident._id,
      type: "payment",
      title,
      message,
      relatedResource: { kind: "payment", id: payment._id },
    });

    return ok(res, 200, `Reminder sent to ${payment.resident?.name || "resident"}.`);
  } catch (err) {
    return fail(res, 500, "Failed to send reminder notification.", [err.message]);
  }
};
