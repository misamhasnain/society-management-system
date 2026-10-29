import mongoose from "mongoose";

const acknowledgmentSchema = new mongoose.Schema(
  {
    resident: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    acknowledgedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const noticeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: 3,
      maxlength: 150,
    },
    content: {
      type: String,
      required: [true, "Content is required"],
      trim: true,
      minlength: 5,
      maxlength: 3000,
    },
    priority: {
      type: String,
      enum: ["Normal", "Important", "Urgent"],
      default: "Normal",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    publishedAt: { type: Date, default: Date.now },
    isArchived: { type: Boolean, default: false },
    acknowledgedBy: [acknowledgmentSchema],
  },
  { timestamps: true }
);

noticeSchema.index({ isArchived: 1, publishedAt: -1 });

const Notice = mongoose.model("Notice", noticeSchema);

export default Notice;
