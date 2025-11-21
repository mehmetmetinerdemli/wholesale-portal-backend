// routes/productsRoutes.js
const express = require("express");
const router = express.Router();

const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productsController");

const {
  authenticate,
  requireAdmin,
} = require("../middleware/authMiddleware");

// Public / buyer: view products
router.get("/", getAllProducts);
router.get("/:id", getProductById);

// Admin: manage products
router.post("/", authenticate, requireAdmin, createProduct);
router.put("/:id", authenticate, requireAdmin, updateProduct);
router.delete("/:id", authenticate, requireAdmin, deleteProduct);

module.exports = router;
