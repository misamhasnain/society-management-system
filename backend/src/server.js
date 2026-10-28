import "dotenv/config";
import dns from "node:dns";
import app from "./app.js";
import connectDB from "./config/db.js";

// Kuch routers SRV lookup reject karte hain, is liye Google DNS use karte hain
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
