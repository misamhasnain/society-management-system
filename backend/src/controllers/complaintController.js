import mongoose from "mongoose";
import Complaint from "../models/Complaint.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";

const ok = (res, status, message, data = {}) =>
  res.status(status).json({ success: true, message, data });

const fail = (res, status, message, errors = []) =>
  res.status(status).json({ success: false, message, errors });

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const STATUSES = ["Pending", "In Progress", "Resolved", "Rejected"];
const PRIORITIES = ["Low", "Medium", "High"];
const CATEGORIES = ["Water", "Electricity", "Sanitation", "Security", "Other"];

const populateComplaint = (q) =>
  q
    .populate("resident", "name house")
    .populate("assignedTo", "name")
    .populate("statusHistory.changedBy", "name");

export const createComplaint = async (req, res) => {
  if (req.user.role !== "resident") {
    return fail(res, 403, "Only residents can submit complaints.");
  }
  const { title, description, category, priority } = req.body || {};

  const errors = [];
  if (!title || String(title).trim().length < 5) errors.push("Title must be at least 5 characters.");
  if (!description || String(description).trim().length < 10) errors.push("Description must be at least 10 characters.");
  if (category && !CATEGORIES.includes(category)) errors.push("Invalid category.");
  if (priority && !PRIORITIES.includes(priority)) errors.push("Invalid priority.");
  if (errors.length) return fail(res, 400, "Validation failed.", errors);

  const complaint = await Complaint.create({
    resident: req.user._id, // never from req.body
    title: String(title).trim(),
    description: String(description).trim(),
    category: category || "Other",
    priority: priority || "Medium",
    status: "Pending",
    statusHistory: [
      { status: "Pending", changedBy: req.user._id, note: "Complaint submitted" },
    ],
  });

  return ok(res, 201, "Complaint submitted.", { complaint });
};

export const getComplaints = async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);

  const filter = {};
  if (req.user.role === "resident") filter.resident = req.user._id;

  if (STATUSES.includes(req.query.status)) filter.status = req.query.status;
  if (PRIORITIES.includes(req.query.priority)) filter.priority = req.query.priority;
  if (CATEGORIES.includes(req.query.category)) filter.category = req.query.category;
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(String(req.query.search).slice(0, 50)), "i");
    filter.$or = [{ title: rx }, { description: rx }];
  }

  const [complaints, total] = await Promise.all([
    populateComplaint(
      Complaint.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
    ),
    Complaint.countDocuments(filter),
  ]);

  return ok(res, 200, "Complaints fetched.", {
    complaints,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
};

export const getComplaintById = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return fail(res, 400, "Invalid complaint ID.");
  }
  const filter = { _id: req.params.id };
  if (req.user.role === "resident") filter.resident = req.user._id;

  const complaint = await populateComplaint(Complaint.findOne(filter));
  if (!complaint) return fail(res, 404, "Complaint not found.");

  return ok(res, 200, "Complaint fetched.", { complaint });
};

export const updateComplaintStatus = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return fail(res, 400, "Invalid complaint ID.");
  }
  const { status, priority, note } = req.body || {};

  if (status !== undefined && !STATUSES.includes(status)) {
    return fail(res, 400, "Invalid status.");
  }
  if (priority !== undefined && !PRIORITIES.includes(priority)) {
    return fail(res, 400, "Invalid priority.");
  }
  if (status === undefined && priority === undefined) {
    return fail(res, 400, "Provide status and/or priority.");
  }

  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) return fail(res, 404, "Complaint not found.");

  const statusChanged = status !== undefined && status !== complaint.status;
  if (priority !== undefined) complaint.priority = priority;
  if (statusChanged) {
    complaint.status = status;
    complaint.statusHistory.push({
      status,
      changedBy: req.user._id,
      note: note ? String(note).trim().slice(0, 500) : undefined,
    });
  }
  await complaint.save();

  if (statusChanged) {
    await Notification.create({
      recipient: complaint.resident,
      type: "complaint",
      title: "Complaint status updated",
      message: `Your complaint "${complaint.title}" is now ${status}.`,
      relatedResource: { kind: "complaint", id: complaint._id },
    });
  }

  const populated = await populateComplaint(Complaint.findById(complaint._id));
  return ok(res, 200, "Complaint updated.", { complaint: populated });
};

export const assignComplaint = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return fail(res, 400, "Invalid complaint ID.");
  }
  const { assignedTo } = req.body || {};
  if (!assignedTo || !mongoose.isValidObjectId(assignedTo)) {
    return fail(res, 400, "A valid assignedTo user ID is required.");
  }

  const assignee = await User.findOne({ _id: assignedTo, role: "admin", isActive: true });
  if (!assignee) return fail(res, 404, "Assignee must be an active admin account.");

  const complaint = await Complaint.findByIdAndUpdate(
    req.params.id,
    { assignedTo: assignee._id },
    { returnDocument: "after" }
  );
  if (!complaint) return fail(res, 404, "Complaint not found.");

  await Notification.create({
    recipient: complaint.resident,
    type: "complaint",
    title: "Complaint assigned",
    message: `Your complaint "${complaint.title}" was assigned to ${assignee.name}.`,
    relatedResource: { kind: "complaint", id: complaint._id },
  });

  const populated = await populateComplaint(Complaint.findById(complaint._id));
  return ok(res, 200, "Complaint assigned.", { complaint: populated });
};