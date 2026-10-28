import mongoose from "mongoose";
import Notice from "../models/Notice.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";

const ok = (res, status, message, data = {}) =>
  res.status(status).json({ success: true, message, data });

const fail = (res, status, message, errors = []) =>
  res.status(status).json({ success: false, message, errors });

const PRIORITIES = ["Normal", "Important", "Urgent"];

export const getNotices = async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);

  const filter = {};
  // Residents never see archived notices
  if (!(req.user.role === "admin" && req.query.archived === "true")) {
    filter.isArchived = false;
  }
  if (PRIORITIES.includes(req.query.priority)) filter.priority = req.query.priority;

  const [notices, total] = await Promise.all([
    Notice.find(filter)
      .populate("createdBy", "name")
      .sort({ publishedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Notice.countDocuments(filter),
  ]);

  return ok(res, 200, "Notices fetched.", {
    notices,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
};

export const getNoticeById = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return fail(res, 400, "Invalid notice ID.");
  }
  const filter = { _id: req.params.id };
  if (req.user.role !== "admin") filter.isArchived = false;

  const notice = await Notice.findOne(filter).populate("createdBy", "name");
  if (!notice) return fail(res, 404, "Notice not found.");
  return ok(res, 200, "Notice fetched.", { notice });
};

export const createNotice = async (req, res) => {
  const { title, content, priority } = req.body || {};

  const errors = [];
  if (!title || String(title).trim().length < 3) errors.push("Title must be at least 3 characters.");
  if (!content || String(content).trim().length < 5) errors.push("Content must be at least 5 characters.");
  if (priority && !PRIORITIES.includes(priority)) errors.push("Invalid priority.");
  if (errors.length) return fail(res, 400, "Validation failed.", errors);

  const notice = await Notice.create({
    title: String(title).trim(),
    content: String(content).trim(),
    priority: priority || "Normal",
    createdBy: req.user._id, // never from req.body
  });

  const residents = await User.find({
    role: "resident",
    approvalStatus: "approved",
    isActive: true,
  }).select("_id");

  if (residents.length) {
    await Notification.insertMany(
      residents.map((r) => ({
        recipient: r._id,
        type: "notice",
        title: "New notice",
        message: notice.title.slice(0, 120),
        relatedResource: { kind: "notice", id: notice._id },
      }))
    );
  }

  return ok(res, 201, "Notice published.", { notice });
};

export const updateNotice = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return fail(res, 400, "Invalid notice ID.");
  }

  const updates = {};
  if (req.body?.title !== undefined) updates.title = String(req.body.title).trim();
  if (req.body?.content !== undefined) updates.content = String(req.body.content).trim();
  if (req.body?.priority !== undefined) {
    if (!PRIORITIES.includes(req.body.priority)) return fail(res, 400, "Invalid priority.");
    updates.priority = req.body.priority;
  }
  if (Object.keys(updates).length === 0) return fail(res, 400, "Nothing to update.");

  const notice = await Notice.findByIdAndUpdate(req.params.id, updates, {
    returnDocument: "after",
    runValidators: true,
  });
  if (!notice) return fail(res, 404, "Notice not found.");
  return ok(res, 200, "Notice updated.", { notice });
};

export const archiveNotice = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return fail(res, 400, "Invalid notice ID.");
  }
  const notice = await Notice.findByIdAndUpdate(
    req.params.id,
    { isArchived: true },
    { returnDocument: "after" }
  );
  if (!notice) return fail(res, 404, "Notice not found.");
  return ok(res, 200, "Notice archived.", { notice });
};