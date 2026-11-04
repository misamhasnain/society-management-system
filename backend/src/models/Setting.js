import mongoose from "mongoose";

// Simple key-value settings collection, used for configuration such as late fee amount and due day.
const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Setting", settingSchema);
