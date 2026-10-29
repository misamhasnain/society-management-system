import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    resident: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [1, "Amount must be greater than 0"],
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
      default: "Monthly maintenance",
    },
    // Format: YYYY-MM, e.g. 2026-10
    paymentPeriod: {
      type: String,
      required: [true, "Payment period is required"],
      match: [/^\d{4}-(0[1-9]|1[0-2])$/, "Period must be in YYYY-MM format"],
    },
    dueDate: {
      type: Date,
      required: [true, "Due date is required"],
    },
    status: {
      type: String,
      enum: ["Paid", "Unpaid"],
      default: "Unpaid",
    },
    markedPaidAt: { type: Date },
    markedPaidBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    paymentNote: { type: String, trim: true, maxlength: 300 },
    paymentRequestSubmitted: { type: Boolean, default: false },
    paymentRequestedAt: { type: Date },
  },
  { timestamps: true }
);

paymentSchema.index(
  { resident: 1, paymentPeriod: 1, description: 1 },
  { unique: true }
);
paymentSchema.index({ status: 1, dueDate: 1 });

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
