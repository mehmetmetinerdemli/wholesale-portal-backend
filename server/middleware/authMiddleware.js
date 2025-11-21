// middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "Missing or invalid Authorization header" });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: decoded.userId,
      role: decoded.role,
      email: decoded.email,
    };
    next();
  } catch (err) {
    console.error("JWT error:", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin role required" });
  }
  next();
}

module.exports = {
  authenticate,
  requireAdmin,
};
