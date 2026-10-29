import mongoose from "mongoose";
import Visitor from "../models/Visitor.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";

const ok = (res, status, message, data = {}) =>
  res.status(status).json({ success: true, message, data });

const fail = (res, status, message, errors = []) =>
  res.status(status).json({ success: false, message, errors });

// Admin: Direct Gate Log Check-in (or with pre-registered data)
export const createVisitor = async (req, res) => {
  try {
    const { visitorName, purpose, phone, vehicleNumber, expectedArrival } = req.body || {};
    const house = req.body.house || req.body.houseId;

    if (!visitorName || String(visitorName).trim().length < 2) {
      return fail(res, 400, "Visitor name must be at least 2 characters.", ["Visitor name must be at least 2 characters."]);
    }

    if (!house || !mongoose.isValidObjectId(house)) {
      return fail(res, 400, "Valid house ID is required.", ["Valid house ID is required."]);
    }

    const visitor = await Visitor.create({
      visitorName: String(visitorName).trim(),
      purpose: purpose ? String(purpose).trim() : "Visit",
      house,
      phone: phone ? String(phone).trim() : undefined,
      vehicleNumber: vehicleNumber ? String(vehicleNumber).trim() : undefined,
      entryAt: new Date(),
      status: "Inside",
      isPreRegistered: false,
      recordedBy: req.user._id,
    });

    // Notify approved residents of the visiting house
    try {
      const residents = await User.find({
        house,
        role: "resident",
        approvalStatus: "approved",
        isActive: true,
      }).select("_id");

      if (residents.length > 0) {
        await Notification.insertMany(
          residents.map((r) => ({
            recipient: r._id,
            type: "visitor",
            title: "Visitor arrived at security gate",
            message: `${visitor.visitorName} has entered for your house (${visitor.purpose}).`,
            relatedResource: { kind: "visitor", id: visitor._id },
          }))
        );
      }
    } catch (notifyErr) {
      console.error("Visitor arrival notification error:", notifyErr.message);
    }

    const populated = await Visitor.findById(visitor._id)
      .populate("house", "block houseNumber")
      .populate("recordedBy", "name");

    return ok(res, 201, "Visitor check-in recorded.", { visitor: populated });
  } catch (err) {
    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map((e) => e.message);
      return fail(res, 400, "Validation failed.", errors);
    }
    return fail(res, 500, "Server error creating visitor.", [err.message]);
  }
};

// Resident: Pre-Register an Expected Visitor
export const preRegisterVisitor = async (req, res) => {
  try {
    if (req.user.role !== "resident") {
      return fail(res, 403, "Only residents can pre-register visitors.");
    }

    if (!req.user.house) {
      return fail(res, 400, "You must belong to an approved house to pre-register visitors.");
    }

    const { visitorName, purpose, expectedArrival, vehicleNumber, phone } = req.body || {};

    if (!visitorName || String(visitorName).trim().length < 2) {
      return fail(res, 400, "Visitor name must be at least 2 characters.", ["Visitor name must be at least 2 characters."]);
    }

    const visitor = await Visitor.create({
      visitorName: String(visitorName).trim(),
      purpose: purpose ? String(purpose).trim() : "Guest Visit",
      house: req.user.house,
      phone: phone ? String(phone).trim() : undefined,
      vehicleNumber: vehicleNumber ? String(vehicleNumber).trim() : undefined,
      expectedArrival: expectedArrival ? new Date(expectedArrival) : new Date(),
      status: "Pre-Registered",
      isPreRegistered: true,
      preRegisteredBy: req.user._id,
      recordedBy: req.user._id,
    });

    const populated = await Visitor.findById(visitor._id)
      .populate("house", "block houseNumber")
      .populate("preRegisteredBy", "name email");

    return ok(res, 201, "Expected visitor pre-registered successfully.", { visitor: populated });
  } catch (err) {
    return fail(res, 500, "Failed to pre-register visitor.", [err.message]);
  }
};

// Admin: Check-in a pre-registered visitor at the gate
export const checkInVisitor = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return fail(res, 400, "Invalid visitor ID.");
    }

    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) {
      return fail(res, 404, "Visitor record not found.");
    }

    if (visitor.status === "Inside") {
      return fail(res, 400, "Visitor is already inside.");
    }

    visitor.status = "Inside";
    visitor.entryAt = new Date();
    visitor.recordedBy = req.user._id;
    await visitor.save();

    // Notify resident who pre-registered
    try {
      if (visitor.preRegisteredBy) {
        await Notification.create({
          recipient: visitor.preRegisteredBy,
          type: "visitor",
          title: "Pre-registered guest arrived",
          message: `${visitor.visitorName} has just checked in at the entrance gate.`,
          relatedResource: { kind: "visitor", id: visitor._id },
        });
      }
    } catch {}

    const populated = await Visitor.findById(visitor._id)
      .populate("house", "block houseNumber")
      .populate("recordedBy", "name");

    return ok(res, 200, "Visitor successfully checked in.", { visitor: populated });
  } catch (err) {
    return fail(res, 500, "Failed to check-in visitor.", [err.message]);
  }
};

// Get Visitor Logs (Admin views all; resident views their house)
export const getVisitors = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);

    const filter = {};
    if (req.user.role === "resident") {
      if (!req.user.house) {
        return ok(res, 200, "Visitors fetched.", {
          visitors: [],
          pagination: { page, limit, total: 0, pages: 0 },
        });
      }
      filter.house = req.user.house;
    }

    if (req.query.inside === "true") {
      filter.status = "Inside";
    } else if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.preRegistered === "true") {
      filter.isPreRegistered = true;
    }

    if (req.query.search) {
      const rx = new RegExp(String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ visitorName: rx }, { vehicleNumber: rx }, { purpose: rx }];
    }

    const [visitors, total] = await Promise.all([
      Visitor.find(filter)
        .populate("house", "block houseNumber")
        .populate("recordedBy", "name")
        .populate("preRegisteredBy", "name")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Visitor.countDocuments(filter),
    ]);

    return ok(res, 200, "Visitors fetched.", {
      visitors,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return fail(res, 500, "Server error fetching visitors.", [err.message]);
  }
};

// Admin: Mark departure / exit
export const markExit = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return fail(res, 400, "Invalid visitor ID.");
    }

    const visitor = await Visitor.findOneAndUpdate(
      { _id: req.params.id, exitAt: { $exists: false } },
      { exitAt: new Date(), status: "Exited" },
      { new: true }
    );

    if (!visitor) {
      const exists = await Visitor.exists({ _id: req.params.id });
      if (!exists) {
        return fail(res, 404, "Visitor record not found.");
      }
      return fail(res, 400, "Visitor has already exited.");
    }

    return ok(res, 200, "Visitor exit recorded.", { visitor });
  } catch (err) {
    return fail(res, 500, "Server error recording exit.", [err.message]);
  }
};
