import mongoose from "mongoose";

const bankConfigSchema = new mongoose.Schema({
  bankName: { type: String, required: true, trim: true },
  accountTitle: { type: String, required: true, trim: true },
  accountNumber: { type: String, required: true, trim: true },
  iban: { type: String, required: true, trim: true },
  accountType: { type: String, required: true, trim: true },
  qrCodePath: { type: String, default: null }, // stored path relative to uploads
}, { timestamps: true });

export default mongoose.model("BankConfig", bankConfigSchema);
