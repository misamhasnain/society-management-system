import "dotenv/config";
import dns from "node:dns";
import mongoose from "mongoose";
import House from "../src/models/House.js";

// Same DNS workaround as src/server.js (SRV lookup fix)
dns.setServers(["8.8.8.8", "1.1.1.1"]);

await mongoose.connect(process.env.MONGODB_URI);

let house = await House.findOne({ block: "A", houseNumber: "101" });
if (!house) {
  house = await House.create({
    houseNumber: "101",
    block: "A",
    address: "Block A, House 101",
  });
}

console.log("HOUSE_ID:", house._id.toString());
await mongoose.disconnect();