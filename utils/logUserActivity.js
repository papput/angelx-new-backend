const UserActivity = require("../models/UserActivity");

/**
 * Logs user activity for tracking in admin panel.
 *
 * Handles:
 *  - login requests (req may be phone OR Express req)
 *  - normal API requests
 *  - platform detection (web/mobile/unknown)
 */
const logUserActivity = async (req, action, details = "", apiCall = "") => {
  try {
    let platform = "unknown";
    let ip = "unknown";
    let userAgent = "Unknown";
    let phone = null;
    let userId = null;

    console.log("platform - 1", platform);
    /* --------------------------------------------------------
       CASE A → LOGIN REQUEST
       req may be a phone number OR Express request object
    ---------------------------------------------------------*/
    if (apiCall === "login") {
      // Login request came from a real Express request
      if (req && req.headers) {
        platform = req.headers["x-platform"] || "unknown";
        ip =
          req.headers["x-forwarded-for"] ||
          req.connection?.remoteAddress ||
          "unknown";
        userAgent = req.headers["user-agent"] || "Unknown";

        phone = req.body?.phone || null;
        console.log("platform - 2", platform);
      } else {
        // Login request where req = phone number only
        phone = req;
      }
      console.log("platform - 3", platform);
      await UserActivity.create({
        phone,
        action,
        details,
        platform,
        ip,
        userAgent,
      });

      return;
    }

    /* --------------------------------------------------------
       CASE B → NORMAL API REQUEST (req MUST be Express object)
    ---------------------------------------------------------*/
    if (req && req.headers) {
      platform = req.headers["x-platform"] || "unknown";
      ip =
        req.headers["x-forwarded-for"] ||
        req.connection?.remoteAddress ||
        "unknown";
      userAgent = req.headers["user-agent"] || "Unknown";
    }

    /* --------------------------------------------------------
       Extract userId safely
    ---------------------------------------------------------*/
    userId =
      req?.user?._id ||
      (() => {
        try {
          return req?.headers?.["x-user-id"]
            ? JSON.parse(req.headers["x-user-id"])._id
            : null;
        } catch {
          return null;
        }
      })();

    await UserActivity.create({
      userId: userId || null,
      action,
      details,
      platform,
      ip,
      userAgent,
    });
  } catch (error) {
    console.error("❌ Error logging user activity:", error.message);
  }
};

module.exports = logUserActivity;
