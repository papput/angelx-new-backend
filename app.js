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

// Database connection
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/angelx", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

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
  res.json({ status: "OK", message: "AngelX API is running" });
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

app.listen(PORT, () => {
  console.log(`AngelX API server running on port ${PORT}`);
});
