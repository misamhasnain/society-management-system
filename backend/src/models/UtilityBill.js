import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ["Uploaded", "Replaced", "Approved", "Rejected"],
      required: true,
    },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    performedByName: { type: String, trim: true },
    reason: { type: String, trim: true, maxlength: 500 },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const utilityBillSchema = new mongoose.Schema(
  {
    resident: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    house: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "House",
      required: true,
      index: true,
    },
    billType: {
      type: String,
      enum: ["Electricity", "Gas"],
      required: true,
    },
    billingPeriod: {
      type: String,
      required: true,
      match: [/^\d{4}-(0[1-9]|1[0-2])$/, "Period must be in YYYY-MM format"],
    },
    fileName: { type: String, required: true },
    filePath: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    status: {
      type: String,
      enum: ["Pending Review", "Approved", "Rejected"],
      default: "Pending Review",
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: { type: Date },
    auditLog: [auditLogSchema],
  },
  { timestamps: true }
);

utilityBillSchema.index(
  { resident: 1, billType: 1, billingPeriod: 1 },
  { unique: true }
);
utilityBillSchema.index({ status: 1, createdAt: -1 });

const UtilityBill = mongoose.model("UtilityBill", utilityBillSchema);

export default UtilityBill;
