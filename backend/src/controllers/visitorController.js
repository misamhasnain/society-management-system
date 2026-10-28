import mongoose from "mongoose";
import Visitor from "../models/Visitor.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";

export const createVisitor = async (req, res) => {
  try {
    const { visitorName, purpose, house } = req.body;

    if (!mongoose.isValidObjectId(house)) {
      return res.status(400).json({ success: false, message: "Valid house ID is required.", errors: [] });
    }

    const visitor = await Visitor.create({
      visitorName,
      purpose,
      house,
      recordedBy: req.user._id,
    });

    // Us ghar ke approved residents ko notification (fail ho to entry nahi rukti)
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
            type: "general",
            title: "Visitor at the gate",
            message: `${visitor.visitorName} has arrived (${visitor.purpose}).`,
          }))
        );
      }
    } catch (notifyErr) {
      console.error("Visitor notification failed:", notifyErr.message);
    }

    res.status(201).json({ success: true, message: "Visitor entry recorded.", data: { visitor } });
  } catch (err) {
    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: "Validation failed.", errors });
    }
    res.status(500).json({ success: false, message: "Server error.", errors: [] });
  }
};

export const getVisitors = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);

    const filter = {};
    if (req.user.role === "resident") {
      if (!req.user.house) {
        return res.json({
          success: true,
          message: "Visitors fetched.",
          data: { visitors: [], pagination: { page, limit, total: 0, pages: 0 } },
        });
      }
      filter.house = req.user.house;
    }
    if (req.query.inside === "true") {
      filter.exitAt = { $exists: false };
    }

    const [visitors, total] = await Promise.all([
      Visitor.find(filter)
        .populate("house", "houseNumber")
        .populate("recordedBy", "name")
        .sort({ entryAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Visitor.countDocuments(filter),
    ]);

    res.json({
      success: true,
      message: "Visitors fetched.",
      data: { visitors, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error.", errors: [] });
  }
};

export const markExit = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid visitor ID.", errors: [] });
    }

    // Sirf tab update ho jab exitAt abhi set nahi (double exit se bachata hai)
    const visitor = await Visitor.findOneAndUpdate(
      { _id: req.params.id, exitAt: { $exists: false } },
      { exitAt: new Date() },
      { new: true }
    );

    if (!visitor) {
      const exists = await Visitor.exists({ _id: req.params.id });
      if (!exists) {
        return res.status(404).json({ success: false, message: "Visitor not found.", errors: [] });
      }
      return res.status(400).json({ success: false, message: "Visitor has already exited.", errors: [] });
    }

    res.json({ success: true, message: "Visitor exit recorded.", data: { visitor } });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error.", errors: [] });
  }
};