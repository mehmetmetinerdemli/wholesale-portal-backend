const express = require("express");
const router = express.Router();
const { getPromotions } = require("../controllers/automationController");
const { authenticate, requireAdmin } = require("../middleware/authMiddleware");

router.get("/promotions", authenticate, requireAdmin, getPromotions);

module.exports = router;