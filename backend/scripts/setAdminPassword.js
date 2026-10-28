import "dotenv/config";
import dns from "node:dns";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../src/models/User.js";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password || password.length < 8) {
  console.error("Usage: node scripts/setAdminPassword.js <email> <password (min 8 chars)>");
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI);

const hash = await bcrypt.hash(password, 12);
const admin = await User.findOneAndUpdate(
  { email: email.toLowerCase(), role: "admin" },
  { passwordHash: hash },
  { returnDocument: "after" }
);

console.log(admin ? "Admin password updated for: " + admin.email : "Admin not found.");
await mongoose.disconnect();