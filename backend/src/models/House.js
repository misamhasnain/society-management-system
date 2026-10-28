import mongoose from "mongoose";

const houseSchema = new mongoose.Schema(
  {
    houseNumber: {
      type: String,
      required: [true, "House number is required"],
      trim: true,
      maxlength: 20,
    },
    block: {
      type: String,
      required: [true, "Block is required"],
      trim: true,
      uppercase: true,
      maxlength: 20,
    },
    address: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    occupancyStatus: {
      type: String,
      enum: ["Vacant", "Occupied"],
      default: "Vacant",
    },
  },
  { timestamps: true }
);

// Ek block mein ek house number sirf ek baar ho sakta hai
houseSchema.index({ block: 1, houseNumber: 1 }, { unique: true });

const House = mongoose.model("House", houseSchema);

export default House;