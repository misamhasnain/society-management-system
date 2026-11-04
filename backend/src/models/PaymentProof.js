import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    action: { type: String, enum: ["Submitted", "Approved", "Rejected"], required: true },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    performedByName: { type: String, trim: true },
    reason: { type: String, trim: true, maxlength: 500 },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const paymentProofSchema = new mongoose.Schema(
  {
    payment: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", required: true },
    resident: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    house: { type: mongoose.Schema.Types.ObjectId, ref: "House", required: true },
    status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
    // true while the proof is Pending or Approved. Lets us enforce
    // "only one live proof per payment" with a partial unique index.
    active: { type: Boolean, default: true },
    fileName: { type: String, required: true },
    filePath: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    paymentDate: { type: Date, required: true },
    referenceNo: { type: String, trim: true, maxlength: 100 },
    note: { type: String, trim: true, maxlength: 300 },
    rejectionReason: { type: String, trim: true, maxlength: 500 },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    auditLog: [auditLogSchema],
  },
  {
    timestamps: true,
    // Never expose the server's internal file path in API responses
    toJSON: { transform: (doc, ret) => { delete ret.filePath; return ret; } },
    toObject: { transform: (doc, ret) => { delete ret.filePath; return ret; } },
  }
);

paymentProofSchema.index(
  { payment: 1 },
  { name: "one_live_proof_per_payment", unique: true, partialFilterExpression: { active: true } }
);
paymentProofSchema.index({ status: 1, createdAt: -1 });

const PaymentProof = mongoose.model("PaymentProof", paymentProofSchema);

export default PaymentProof;