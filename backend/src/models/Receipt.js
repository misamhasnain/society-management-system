import mongoose from "mongoose";

const receiptSchema = new mongoose.Schema(
  {
    receiptNumber: { type: String, required: true, unique: true },
    resident: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", required: true, unique: true },
    type: { type: String, enum: ["Demand", "Final"], required: true }, // Demand = before payment, Final = after payment
    status: { type: String, enum: ["Unpaid", "Paid"], default: "Unpaid" },
    pdfPath: { type: String, required: true }, // stored path relative to uploads/receipts
    issueDate: { type: Date, default: Date.now },
    amount: { type: Number, required: true },
  },
  { timestamps: true }
);
export default mongoose.model("Receipt", receiptSchema);
