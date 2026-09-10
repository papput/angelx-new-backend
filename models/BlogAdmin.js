const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const blogAdminSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      default: "Blog Editor",
    },
  },
  { timestamps: true },
);

blogAdminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (error) {
    next(error);
  }
});

blogAdminSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

blogAdminSchema.methods.getJwtToken = function () {
  return jwt.sign(
    { id: this._id, type: "blog_admin" },
    process.env.JWT_SECRET || "angelx-secret-key-2024",
    { expiresIn: process.env.JWT_EXPIRE || "30d" },
  );
};

module.exports = mongoose.model("BlogAdmin", blogAdminSchema);
