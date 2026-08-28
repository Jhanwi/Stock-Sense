import "dotenv/config";
import express from "express";
import cors from "cors";

import pool from "./config/database";
import stockRoutes from "./routes/stockRoutes";
import authRoutes from "./routes/authRoutes";
import watchlistRoutes from "./routes/watchlistRoutes";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");

    res.json({
      status: "healthy",
      database: "connected",
    });
  } catch (error) {
    console.error("Database connection failed:", error);

    res.status(500).json({
      status: "unhealthy",
      database: "disconnected",
    });
  }
});

app.use("/api/stocks", stockRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/watchlist", watchlistRoutes);

export default app;