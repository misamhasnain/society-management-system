import mongoose from "mongoose";
import User from "../models/User.js";
import House from "../models/House.js";

const ok = (res, status, message, data = {}) =>
  res.status(status).json({ success: true, message, data });

const fail = (res, status, message, errors = []) =>
  res.status(status).json({ success: false, message, errors });

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const APPROVAL_VALUES = ["pending", "approved", "rejected"];

// Keeps House.occupancyStatus in sync. Only called from this file.
const syncHouseOccupancy = async (houseId) => {
  if (!houseId) return;
  const hasActiveResident = await User.exists({
    house: houseId,
    role: "resident",
    approvalStatus: "approved",
    isActive: true,
  });
  await House.findByIdAndUpdate(houseId, {
    occupancyStatus: hasActiveResident ? "Occupied" : "Vacant",
  });
};

export const getResidents = async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);

  const filter = { role: "resident" };
  if (APPROVAL_VALUES.includes(req.query.approvalStatus)) {
    filter.approvalStatus = req.query.approvalStatus;
  }
  if (req.query.isActive === "true") filter.isActive = true;
  if (req.query.isActive === "false") filter.isActive = false;
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(String(req.query.search).slice(0, 50)), "i");
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
  }

  const [residents, total] = await Promise.all([
    User.find(filter)
      .populate("house", "block houseNumber address")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  return ok(res, 200, "Residents fetched.", {
    residents,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
};

export const getResidentById = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return fail(res, 400, "Invalid resident ID.");
  }
  const resident = await User.findOne({
    _id: req.params.id,
    role: "resident",
  }).populate("house", "block houseNumber address");
  if (!resident) return fail(res, 404, "Resident not found.");
  return ok(res, 200, "Resident fetched.", { resident });
};

export const updateApproval = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return fail(res, 400, "Invalid resident ID.");
  }
  const { approvalStatus } = req.body || {};
  if (!["approved", "rejected"].includes(approvalStatus)) {
    return fail(res, 400, 'approvalStatus must be "approved" or "rejected".');
  }

  const resident = await User.findOne({ _id: req.params.id, role: "resident" });
  if (!resident) return fail(res, 404, "Resident not found.");

  resident.approvalStatus = approvalStatus;
  await resident.save();
  await syncHouseOccupancy(resident.house);

  return ok(res, 200, `Resident ${approvalStatus}.`, { resident });
};

export const updateStatus = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return fail(res, 400, "Invalid resident ID.");
  }
  const { isActive } = req.body || {};
  if (typeof isActive !== "boolean") {
    return fail(res, 400, "isActive must be true or false.");
  }

  const resident = await User.findOne({ _id: req.params.id, role: "resident" });
  if (!resident) return fail(res, 404, "Resident not found.");

  resident.isActive = isActive;
  await resident.save();
  await syncHouseOccupancy(resident.house);

  return ok(res, 200, isActive ? "Resident activated." : "Resident deactivated.", {
    resident,
  });
};