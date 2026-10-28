import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "../models/User.js";
import House from "../models/House.js";
import {
  generateToken,
  setAuthCookie,
  clearAuthCookie,
} from "../utils/generateToken.js";

const ok = (res, status, message, data = {}) =>
  res.status(status).json({ success: true, message, data });

const fail = (res, status, message, errors = []) =>
  res.status(status).json({ success: false, message, errors });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const toSafeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
  house: user.house,
  approvalStatus: user.approvalStatus,
  isActive: user.isActive,
});

export const register = async (req, res) => {
  const { name, email, password, phone, houseId } = req.body || {};

  const errors = [];
  if (!name || String(name).trim().length < 2) errors.push("Name must be at least 2 characters.");
  if (!email || !EMAIL_RE.test(String(email))) errors.push("A valid email is required.");
  if (!password || String(password).length < 8) errors.push("Password must be at least 8 characters.");
  if (!houseId || !mongoose.isValidObjectId(houseId)) errors.push("A valid house must be selected.");
  if (errors.length) return fail(res, 400, "Validation failed.", errors);

  const cleanEmail = String(email).trim().toLowerCase();

  if (await User.findOne({ email: cleanEmail })) {
    return fail(res, 409, "This email is already registered.");
  }

  const house = await House.findById(houseId);
  if (!house) return fail(res, 404, "Selected house does not exist.");

  // One active resident per house (our agreed rule).
  const houseTaken = await User.findOne({
    house: house._id,
    approvalStatus: { $in: ["pending", "approved"] },
  });
  if (houseTaken) {
    return fail(res, 409, "This house already has a resident account.");
  }

  const passwordHash = await bcrypt.hash(String(password), 12);

  // role and approvalStatus are forced here, never read from req.body.
  const user = await User.create({
    name: String(name).trim(),
    email: cleanEmail,
    passwordHash,
    phone: phone ? String(phone).trim() : undefined,
    house: house._id,
    role: "resident",
    approvalStatus: "pending",
    isActive: true,
  });

  return ok(
    res,
    201,
    "Registration submitted. Please wait for admin approval before logging in.",
    { user: toSafeUser(user) }
  );
};

export const login = async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return fail(res, 400, "Email and password are required.");
  }

  const user = await User.findOne({
    email: String(email).trim().toLowerCase(),
  }).select("+passwordHash");

  const valid = user && (await bcrypt.compare(String(password), user.passwordHash));
  if (!valid) {
    return fail(res, 401, "Invalid email or password.");
  }

  // Status checks only after the password is proven correct.
  if (!user.isActive) {
    return fail(res, 403, "Your account is deactivated. Contact the admin.");
  }
  if (user.role === "resident" && user.approvalStatus === "pending") {
    return fail(res, 403, "Your registration is still waiting for admin approval.");
  }
  if (user.role === "resident" && user.approvalStatus === "rejected") {
    return fail(res, 403, "Your registration was rejected. Contact the admin.");
  }

  const token = generateToken(user._id, user.role);
  setAuthCookie(res, token);

  return ok(res, 200, "Logged in successfully.", { user: toSafeUser(user) });
};

export const logout = (req, res) => {
  clearAuthCookie(res);
  return ok(res, 200, "Logged out successfully.");
};

export const getMe = (req, res) => {
  return ok(res, 200, "Current user fetched.", { user: toSafeUser(req.user) });
};