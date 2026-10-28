import mongoose from "mongoose";

const visitorSchema = new mongoose.Schema(
  {
    visitorName: {
      type: String,
      required: [true, "Visitor name is required"],
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    purpose: { type: String, trim: true, maxlength: 200, default: "Visit" },
    house: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "House",
      required: [true, "House is required"],
    },
    entryAt: { type: Date, default: Date.now },
    exitAt: { type: Date },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

visitorSchema.index({ house: 1, entryAt: -1 });
visitorSchema.index({ entryAt: -1 });

const Visitor = mongoose.model("Visitor", visitorSchema);

export default Visitor;