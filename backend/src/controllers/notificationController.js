import mongoose from "mongoose";
import Notification from "../models/Notification.js";

export const getMyNotifications = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);
    const filter = { recipient: req.user._id };

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Notification.countDocuments(filter),
    ]);

    res.json({
      success: true,
      message: "Notifications fetched.",
      data: {
        notifications,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error.", errors: [] });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false,
    });
    res.json({ success: true, message: "Unread count fetched.", data: { count } });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error.", errors: [] });
  }
};

export const markAsRead = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid notification ID.", errors: [] });
    }
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found.", errors: [] });
    }
    res.json({ success: true, message: "Notification marked as read.", data: { notification } });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error.", errors: [] });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true }
    );
    res.json({
      success: true,
      message: "All notifications marked as read.",
      data: { modifiedCount: result.modifiedCount },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error.", errors: [] });
  }
};