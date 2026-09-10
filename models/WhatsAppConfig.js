// models/WhatsAppConfig.js
const mongoose = require("mongoose");

const WhatsAppConfigSchema = new mongoose.Schema(
  {
    phoneNumber: {
      type: String,
      required: true,
      default: "919351804820",
    },
    defaultMessage: {
      type: String,
      required: true,
      default: "Hello, I need help with AngelX platform.",
    },
  },
  { timestamps: true }
);

// Export using CommonJS
module.exports = mongoose.model("WhatsAppConfig", WhatsAppConfigSchema);
