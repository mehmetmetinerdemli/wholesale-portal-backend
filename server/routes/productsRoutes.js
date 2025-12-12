// routes/productsRoutes.js
const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");

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

// Public routes
router.get("/", getAllProducts);
router.get("/:id", getProductById);

// Admin routes
router.post(
  "/",
  authenticate,
  requireAdmin,
  upload.single("image"),
  createProduct
);

router.put(
  "/:id",
  authenticate,
  requireAdmin,
  upload.single("image"),
  updateProduct
);

router.delete(
  "/:id",
  authenticate,
  requireAdmin,
  deleteProduct
);

module.exports = router;
