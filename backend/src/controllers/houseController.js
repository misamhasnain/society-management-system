import mongoose from "mongoose";
import House from "../models/House.js";
import User from "../models/User.js";

const ok = (res, status, message, data = {}) =>
  res.status(status).json({ success: true, message, data });

const fail = (res, status, message, errors = []) =>
  res.status(status).json({ success: false, message, errors });

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Public: houses that nobody has registered for yet
export const getAvailableHouses = async (req, res) => {
  const takenHouseIds = await User.distinct("house", {
    role: "resident",
    approvalStatus: { $in: ["pending", "approved"] },
    house: { $ne: null },
  });

  const houses = await House.find({ _id: { $nin: takenHouseIds } })
    .select("block houseNumber address")
    .sort({ block: 1, houseNumber: 1 });

  return ok(res, 200, "Available houses fetched.", { houses });
};

// Admin: list with search + pagination
export const getHouses = async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);

  const filter = {};
  if (req.query.status) filter.occupancyStatus = String(req.query.status);
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(String(req.query.search).slice(0, 50)), "i");
    filter.$or = [{ houseNumber: rx }, { block: rx }, { address: rx }];
  }

  const [houses, total] = await Promise.all([
    House.find(filter)
      .sort({ block: 1, houseNumber: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    House.countDocuments(filter),
  ]);

  return ok(res, 200, "Houses fetched.", {
    houses,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
};

// Admin: one house
export const getHouseById = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return fail(res, 400, "Invalid house ID.");
  }
  const house = await House.findById(req.params.id);
  if (!house) return fail(res, 404, "House not found.");
  return ok(res, 200, "House fetched.", { house });
};

// Admin: create
export const createHouse = async (req, res) => {
  const { houseNumber, block, address } = req.body || {};

  const errors = [];
  if (!houseNumber || !String(houseNumber).trim()) errors.push("House number is required.");
  if (!block || !String(block).trim()) errors.push("Block is required.");
  if (errors.length) return fail(res, 400, "Validation failed.", errors);

  const house = await House.create({
    houseNumber: String(houseNumber).trim(),
    block: String(block).trim(),
    address: address ? String(address).trim() : undefined,
  });

  return ok(res, 201, "House created.", { house });
};

// Admin: update (occupancyStatus is NOT editable here)
export const updateHouse = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return fail(res, 400, "Invalid house ID.");
  }

  const updates = {};
  for (const field of ["houseNumber", "block", "address"]) {
    if (req.body?.[field] !== undefined) {
      updates[field] = String(req.body[field]).trim();
    }
  }
  if (Object.keys(updates).length === 0) {
    return fail(res, 400, "Nothing to update.");
  }

  const house = await House.findByIdAndUpdate(req.params.id, updates, {
    returnDocument: "after",
    runValidators: true,
  });
  if (!house) return fail(res, 404, "House not found.");

  return ok(res, 200, "House updated.", { house });
};