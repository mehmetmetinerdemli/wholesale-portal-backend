// routes/reportsRoutes.js
const express = require("express");
const router = express.Router();
const {
  getTopProducts,
  getLowStock,
  getDailySummary,
} = require("../controllers/reportsController");
const {
  authenticate,
  requireAdmin,
} = require("../middleware/authMiddleware");

// all report endpoints are admin-only
router.get("/top-products", authenticate, requireAdmin, getTopProducts);
router.get("/low-stock", authenticate, requireAdmin, getLowStock);
router.get("/daily-summary", authenticate, requireAdmin, getDailySummary);

module.exports = router;
