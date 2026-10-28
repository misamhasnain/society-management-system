import mongoose from "mongoose";

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Resolved", "Rejected"],
      required: true,
    },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    note: { type: String, trim: true, maxlength: 500 },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const complaintSchema = new mongoose.Schema(
  {
    resident: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: 5,
      maxlength: 120,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      minlength: 10,
      maxlength: 2000,
    },
    category: {
      type: String,
      enum: ["Water", "Electricity", "Sanitation", "Security", "Other"],
      default: "Other",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Resolved", "Rejected"],
      default: "Pending",
    },
    // Admin account jisko complaint assign hui
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    statusHistory: [statusHistorySchema],
  },
  { timestamps: true }
);

complaintSchema.index({ status: 1, priority: 1 });
complaintSchema.index({ createdAt: -1 });

const Complaint = mongoose.model("Complaint", complaintSchema);

export default Complaint;