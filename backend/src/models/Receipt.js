import mongoose from "mongoose";

const receiptSchema = new mongoose.Schema(
  {
    receiptNumber: { type: String, required: true, unique: true },
    // unique => one receipt per payment, ever (duplicate protection)
    payment: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", required: true, unique: true },
    proof: { type: mongoose.Schema.Types.ObjectId, ref: "PaymentProof" },
    resident: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    house: { type: mongoose.Schema.Types.ObjectId, ref: "House" },

    // Snapshot values: receipts must not change if names/houses are edited later
    societyName: { type: String, required: true },
    societyAddress: { type: String, default: "" },
    residentName: { type: String, required: true },
    houseLabel: { type: String, default: "" },
    description: { type: String, default: "Monthly maintenance" },
    amount: { type: Number, required: true },
    currency: { type: String, default: "PKR" },
    paymentPeriod: { type: String, required: true },
    paymentDate: { type: Date, required: true },
    approvedAt: { type: Date, required: true },
    approvedByName: { type: String, default: "" },
    status: { type: String, enum: ["Paid", "Void"], default: "Paid" },
  },
  { timestamps: true }
);

receiptSchema.index({ resident: 1, createdAt: -1 });

const Receipt = mongoose.model("Receipt", receiptSchema);

export default Receipt;