import "dotenv/config";
import app from "./app.js";
import connectDB from "./config/db.js";
import "./models/House.js";
import "./models/User.js";
import "./models/Complaint.js";
import "./models/Payment.js";
import "./models/Notice.js";
import "./models/Notification.js";
import "./models/Visitor.js";

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