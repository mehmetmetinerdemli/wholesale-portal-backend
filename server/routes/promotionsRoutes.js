// routes/promotionsRoutes.js
const express = require("express");
const router = express.Router();

const {
  getPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
} = require("../controllers/promotionsController");

const { authenticate, requireAdmin } = require("../middleware/authMiddleware");

// Everyone who is logged in (BUYER or ADMIN) can view promotions
// GET /api/promotions?type=DAILY&activeOnly=true
router.get("/", authenticate, getPromotions);

// Admin-only: create a new promotion
// POST /api/promotions
router.post("/", authenticate, requireAdmin, createPromotion);

// Admin-only: update an existing promotion
// PUT /api/promotions/:id
router.put("/:id", authenticate, requireAdmin, updatePromotion);

// Admin-only: delete a promotion
// DELETE /api/promotions/:id
router.delete("/:id", authenticate, requireAdmin, deletePromotion);

module.exports = router;
