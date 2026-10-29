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
    phone: { type: String, trim: true, maxlength: 20 },
    vehicleNumber: { type: String, trim: true, maxlength: 30 },
    entryAt: { type: Date },
    exitAt: { type: Date },
    expectedArrival: { type: Date },
    status: {
      type: String,
      enum: ["Pre-Registered", "Inside", "Exited"],
      default: "Inside",
    },
    isPreRegistered: { type: Boolean, default: false },
    preRegisteredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
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
visitorSchema.index({ status: 1, expectedArrival: -1 });

const Visitor = mongoose.model("Visitor", visitorSchema);

export default Visitor;
