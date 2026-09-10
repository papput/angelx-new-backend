const sendToken = (user, statusCode, res, type = 'user') => {
  // Generate JWT token
  const token = user.getJwtToken();
  
  // Options for cookie
  const cookieExpireDays = Number(process.env.COOKIE_EXPIRE) || 30;
  const options = {
    expires: new Date(
      Date.now() + cookieExpireDays * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  const cookieNames = {
    admin: "adminToken",
    blog_admin: "blogAdminToken",
  };
  const cookieName = cookieNames[type] || "token";

  res.status(statusCode).cookie(cookieName, token, options).json({
    success: true,
    token,
    data: {
      user
    }
  });
};

module.exports = sendToken;