import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { COOKIE_NAME } from "../utils/generateToken.js";

const fail = (res, status, message) =>
  res.status(status).json({ success: false, message, errors: [] });

export const protect = async (req, res, next) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    return fail(res, 401, "Not authenticated. Please log in.");
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return fail(res, 401, "Session expired or invalid. Please log in again.");
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    return fail(res, 401, "Account no longer exists.");
  }
  if (!user.isActive) {
    return fail(res, 403, "Your account is deactivated.");
  }
  if (user.role === "resident" && user.approvalStatus !== "approved") {
    return fail(res, 403, "Your account is not approved yet.");
  }

  req.user = user;
  next();
};

export const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return fail(res, 403, "You do not have permission to do this.");
    }
    next();
  };