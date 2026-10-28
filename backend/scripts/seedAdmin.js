import "dotenv/config";
import dns from "node:dns";
import mongoose from "mongoose";
import User from "../src/models/User.js";

// Wohi DNS fix jo server.js mein hai
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const run = async () => {
  const { MONGODB_URI, ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

  if (!MONGODB_URI || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error("MONGODB_URI, ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env");
  }
  if (ADMIN_PASSWORD.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters");
  }

  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });

  const email = ADMIN_EMAIL.toLowerCase().trim();
  const existing = await User.findOne({ email });

  if (existing) {
    console.log(`Admin already exists: ${email} (nothing changed)`);
  } else {
    await User.create({
      name: ADMIN_NAME || "Society Admin",
      email,
      passwordHash: await User.hashPassword(ADMIN_PASSWORD),
      role: "admin",
      approvalStatus: "approved",
      isActive: true,
    });
    console.log(`Admin created: ${email}`);
  }

  await mongoose.disconnect();
};

run().catch((error) => {
  console.error("Seed failed:", error.message);
  process.exit(1);
});