const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Admin = require("../models/Admin");
const BlogAdmin = require("../models/BlogAdmin");
const { ErrorHandler } = require("../utils/ErrorHandler");
const catchAsyncError = require("../utils/catchAsyncError");

const JWT_SECRET = process.env.JWT_SECRET || "angelx-secret-key-2024";

// Generate JWT token
const generateToken = (id, type = "user") => {
  return jwt.sign(
    { id, type },
    JWT_SECRET,
    { expiresIn: "100y" }, // 100 years
  );
};

// Verify JWT token
const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

// Middleware to authenticate users
const authenticateUser = catchAsyncError(async (req, res, next) => {
  let token;

  console.log("i hitted--------")

  // Get token
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return next(new ErrorHandler("Access denied. No token provided.", 401));
  }

  let decoded;

  try {
    decoded = verifyToken(token);
  } catch (error) {
    if (error.name === "TokenExpiredErrorrr") {
      return next(
        new ErrorHandler("jwt expireddd", 401)
      );
    }

    if (error.name === "JsonWebTokenError") {
      return next(
        new ErrorHandler("Invalid token", 401)
      );
    }

    return next(new ErrorHandler("Authentication failed", 401));
  }

  if (decoded.type !== "user") {
    return next(new ErrorHandler("Invalid token type.", 401));
  }

  const user = await User.findById(decoded.id).select("-__v");

  if (!user) {
    return next(
      new ErrorHandler("Token is valid but user not found.", 401)
    );
  }

  req.user = user;
  next();
});

// const authenticateUser = catchAsyncError(async (req, res, next) => {
//   let token;

//   // Check for token in Authorization header
//   if (
//     req.headers.authorization &&
//     req.headers.authorization.startsWith("Bearer")
//   ) {
//     token = req.headers.authorization.split(" ")[1];
//   }
//   // Check for token in cookies
//   else if (req.cookies.token) {
//     token = req.cookies.token;
//   }

//   if (!token) {
//     return next(new ErrorHandler("Access denied. No token provided.", 401));
//   }

//   // Verify token
//   const decoded = verifyToken(token);

//   if (decoded.type !== "user") {
//     return next(new ErrorHandler("Invalid token type.", 401));
//   }

//   // Get user from database
//   const user = await User.findById(decoded.id).select("-__v");

//   if (!user) {
//     return next(new ErrorHandler("Token is valid but user not found.", 401));
//   }

//   req.user = user;
//   next();
// });

// Middleware to authenticate admins
const authenticateAdmin = catchAsyncError(async (req, res, next) => {
  let token;

  
  // Check for token in Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }
  // Check for token in cookies
  else if (req.cookies.adminToken) {
    token = req.cookies.adminToken;
  }

  if (!token) {
    return next(new ErrorHandler("Access denied. Admin token required.", 401));
  }

  // Verify token
  const decoded = verifyToken(token);

  if (decoded.type !== "admin") {
    return next(new ErrorHandler("Invalid admin token.", 401));
  }

  // Get admin from database
  const admin = await Admin.findById(decoded.id).select("-password -__v");

  if (!admin) {
    return next(
      new ErrorHandler("Admin token is valid but admin not found.", 401),
    );
  }

  req.admin = admin;
  next();
});

// Blog CMS: blog-only admins + exchange admins (not the reverse)
const authenticateBlogAdmin = catchAsyncError(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.blogAdminToken) {
    token = req.cookies.blogAdminToken;
  } else if (req.cookies.adminToken) {
    token = req.cookies.adminToken;
  }

  if (!token) {
    return next(new ErrorHandler("Access denied. Blog admin token required.", 401));
  }

  const decoded = verifyToken(token);

  if (decoded.type === "blog_admin") {
    const blogAdmin = await BlogAdmin.findById(decoded.id).select("-password -__v");
    if (!blogAdmin) {
      return next(new ErrorHandler("Blog admin not found.", 401));
    }
    req.blogAdmin = blogAdmin;
    return next();
  }

  if (decoded.type === "admin") {
    const admin = await Admin.findById(decoded.id).select("-password -__v");
    if (!admin) {
      return next(new ErrorHandler("Admin not found.", 401));
    }
    req.admin = admin;
    return next();
  }

  return next(new ErrorHandler("Invalid blog admin token.", 401));
});

// Mask phone number for display
const maskPhone = (phone) => {
  if (!phone || phone.length < 5) return phone;
  return phone.substr(0, 3) + "*****" + phone.substr(-2);
};

module.exports = {
  generateToken,
  verifyToken,
  authenticateUser,
  authenticateAdmin,
  authenticateBlogAdmin,
  maskPhone,
};
