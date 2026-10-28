import "dotenv/config";
import dns from "node:dns";
import mongoose from "mongoose";
import User from "../src/models/User.js";
import House from "../src/models/House.js";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/approveResident.js <email>");
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI);

const user = await User.findOneAndUpdate(
  { email: email.toLowerCase(), role: "resident" },
  { approvalStatus: "approved" },
  { new: true }
);

if (!user) {
  console.log("Resident not found.");
} else {
  await House.findByIdAndUpdate(user.house, { occupancyStatus: "Occupied" });
  console.log("Approved:", user.email, "| status:", user.approvalStatus);
}

await mongoose.disconnect();