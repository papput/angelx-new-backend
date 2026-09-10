const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const fileUpload = require("express-fileupload");
const path = require("path");
// Load environment variables
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Import routes
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const exchangeRoutes = require("./routes/exchange");
const depositRoutes = require("./routes/deposit");
const withdrawRoutes = require("./routes/withdraw");
const walletRoutes = require("./routes/wallet");
const adminRoutes = require("./routes/admin");
const blogRoutes = require("./routes/blogs");
const { generatedErrors } = require("./middleware/error");

// Middleware
// app.use(
//   cors({
//     origin: [
//       /https?:\/\/([a-zA-Z0-9-]+\.)?angelsx\.co$/,
//       /https?:\/\/([a-zA-Z0-9-]+\.)?angelx\.exchange$/,
//       /https?:\/\/([a-zA-Z0-9-]+\.)?angelsx\.netlify\.app$/,
//       "http://localhost:3000",
//       "http://localhost:3001",
//       "http://127.0.0.1:3000",
//       "http://192.168.29.157:3000",
//       "http://localhost:8081",
//       "http://192.168.29.157:8081",
//       "https://angelsx-admin.vercel.app",
//       "exp://192.168.29.157:8081",
//       "http://localhost:8081",
//     ],
//     credentials: true,
//   })
// );

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow mobile apps (Origin = null)
      if (!origin) return callback(null, true);

      const allowed = [
        /https?:\/\/([a-zA-Z0-9-]+\.)?angelsx\.co$/,
        /https?:\/\/([a-zA-Z0-9-]+\.)?angelx\.exchange$/,
        /https?:\/\/([a-zA-Z0-9-]+\.)?angelsx\.netlify\.app$/,
        /https?:\/\/([a-zA-Z0-9-]+\.)?angel-x\.co$/,
        /https?:\/\/([a-zA-Z0-9-]+\.)?angelxco\.co$/,
        /https?:\/\/([a-zA-Z0-9-]+\.)?angelxs\.co$/,
        /https?:\/\/([a-zA-Z0-9-]+\.)?angelxco\.org$/,
        /https?:\/\/([a-zA-Z0-9-]+\.)?angelxco\.vercel\.app$/,
        /https?:\/\/([a-zA-Z0-9-]+\.)?angel-exchange-co\.vercel\.app\/?$/,
        /https?:\/\/angelx-[a-zA-Z0-9-]+\.vercel\.app\/?$/,
        /https?:\/\/([a-zA-Z0-9-]+\.)?angelx\.biz$/,
        "https://angelx-ssr.vercel.app",
        "https://angelx-blog.vercel.app",
        "https://angelx-new-frontend.vercel.app",
        "https://angelx-new-admin.vercel.app",
        "https://angelx.biz",
        "https://www.angelx.biz",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3002",
        "http://192.168.29.157:3000",
        "http://localhost:8081",
        "http://192.168.29.157:8081",
        "https://angelsx-admin.vercel.app",
        "https://angelsx-admin-main.vercel.app",
        "exp://192.168.29.157:8081",
      ];

      const isAllowed = allowed.some((rule) =>
        rule instanceof RegExp ? rule.test(origin) : rule === origin
      );

      if (isAllowed) return callback(null, true);

      callback(new Error("CORS blocked from origin: " + origin));
    },
    credentials: true,
  })
);
app.use(cors({ origin: "*", credentials: true }));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("combined"));
app.use(
  fileUpload({
    createParentPath: true,
    limits: {
      fileSize: 2 * 1024 * 1024 * 1024, // 2MB max file size
    },
  })
);

// Database connection (Atlas / Render friendly)
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/angelx";

mongoose.set("bufferTimeoutMS", 20000);

async function connectDatabase(retries = 8) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 15000,
        connectTimeoutMS: 15000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
      });
      console.log(
        "MongoDB connected successfully:",
        mongoose.connection.name || "(default db)",
      );
      return;
    } catch (err) {
      console.error(
        `MongoDB connection attempt ${attempt}/${retries} failed:`,
        err.message,
      );
      if (attempt === retries) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
    }
  }
}

mongoose.connection.on("disconnected", () => {
  console.error("MongoDB disconnected");
});
mongoose.connection.on("reconnected", () => {
  console.log("MongoDB reconnected");
});
mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error event:", err.message);
});

// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/exchange", exchangeRoutes);
app.use("/api/v1/deposit", depositRoutes);
app.use("/api/v1/withdraw", withdrawRoutes);
app.use("/api/v1/wallet", walletRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/blogs", blogRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  const dbState = mongoose.connection.readyState;
  // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
  const dbConnected = dbState === 1;
  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? "OK" : "DEGRADED",
    message: "AngelX API is running",
    dbConnected,
    dbState,
  });
});

// Error handling middleware
app.use(generatedErrors);

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
  });
});

async function startServer() {
  if (!process.env.MONGODB_URI) {
    console.error(
      "FATAL: MONGODB_URI is not set. Add it in Render Environment variables.",
    );
  }

  try {
    await connectDatabase();
  } catch (err) {
    console.error(
      "FATAL: Could not connect to MongoDB. Check MONGODB_URI and Atlas Network Access (allow 0.0.0.0/0 for Render).",
      err.message,
    );
    // Keep process alive so Render can show logs; health will report DEGRADED.
  }

  app.listen(PORT, () => {
    console.log(`AngelX API server running on port ${PORT}`);
  });
}

startServer();