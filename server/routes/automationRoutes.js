// routes/automationRoutes.js
const express = require("express");
const router = express.Router();
const { getDailyCatalog } = require("../controllers/automationController");
const {
  authenticate,
  requireAdmin,
} = require("../middleware/authMiddleware");

// For now: admin-auth only (automation uses an admin token)
router.get("/daily-catalog", authenticate, requireAdmin, getDailyCatalog);

module.exports = router;
