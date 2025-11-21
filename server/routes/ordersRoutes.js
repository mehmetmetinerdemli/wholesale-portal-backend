// routes/ordersRoutes.js
const express = require("express");
const router = express.Router();
const {
  getAllOrders,
  getMyOrders,
  createOrder,
  updateOrderStatus,
} = require("../controllers/ordersController");
const {
  authenticate,
  requireAdmin,
} = require("../middleware/authMiddleware");

//Buyer: their own orders
router.get("/my",authenticate, getMyOrders);

// Admin: view all orders
router.get("/", authenticate, requireAdmin, getAllOrders);

// Buyer: create order (must be logged in)
router.post("/", authenticate, createOrder);

// Admin: update order status
router.patch("/:id/status", authenticate, requireAdmin, updateOrderStatus);

module.exports = router;
