import express from "express";

const app = express();

// Request body ko JSON ke tor par parhta hai
app.use(express.json({ limit: "10kb" }));

// Health check: server zinda hai ya nahi
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

// Koi bhi route match na ho to 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    errors: [],
  });
});

export default app;