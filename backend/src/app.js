import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.js";
import houseRoutes from "./routes/houseRoutes.js";
import residentRoutes from "./routes/residentRoutes.js";
import complaintRoutes from "./routes/complaintRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import noticeRoutes from "./routes/noticeRoutes.js";
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import visitorRoutes from "./routes/visitorRoutes.js";

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    data: {
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/houses", houseRoutes);
app.use("/api/residents", residentRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/notices", noticeRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/visitors", visitorRoutes);


app.use(notFound);
app.use(errorHandler);

export default app;