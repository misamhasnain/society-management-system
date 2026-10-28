import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    // Password hash kabhi API response mein nahi jata (select: false)
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ["admin", "resident"],
      default: "resident",
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 20,
    },
    // Sirf residents ke liye
    house: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "House",
    },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Ek house par sirf ek active resident account
userSchema.index(
  { house: 1 },
  {
    unique: true,
    partialFilterExpression: { house: { $type: "objectId" }, isActive: true },
  }
);

// Password ka hash banane ka helper
userSchema.statics.hashPassword = function (plainPassword) {
  return bcrypt.hash(plainPassword, 12);
};

// Login par password check karne ka helper
userSchema.methods.comparePassword = function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

const User = mongoose.model("User", userSchema);

export default User;