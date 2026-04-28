const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const conversionRoutes = require("./routes/conversionRoutes");

const app = express();

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173"
  })
);
app.use(morgan("dev"));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", conversionRoutes);

// Centralized error handling ensures consistent API error responses.
app.use((error, _req, res, _next) => {
  if (error.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "File too large. Maximum upload size is 1 GB." });
  }

  if (error.code === "LIMIT_FILE_COUNT") {
    return res.status(413).json({ error: "Too many files. Maximum 20 files per batch." });
  }

  if (error.message === "Unsupported file type.") {
    return res.status(415).json({ error: error.message });
  }

  console.error(error);
  return res.status(500).json({ error: "Internal server error." });
});

module.exports = app;
