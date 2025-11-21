// controllers/productsController.js
const db = require("../db");

// GET /api/products
async function getAllProducts(req, res) {
  try {
    const [rows] = await db.execute(
      `
      SELECT
        id,
        name,
        grade,
        origin,
        unit,
        price,
        stock_qty AS stockQty,
        is_active AS isActive,
        created_at AS createdAt
      FROM products
      WHERE is_active = 1
      ORDER BY name
    `
    );

    res.json(rows);
  } catch (err) {
    console.error("Error in getAllProducts:", err);
    res.status(500).json({ message: "Error fetching products" });
  }
}

// GET /api/products/:id
async function getProductById(req, res) {
  const id = parseInt(req.params.id, 10);

  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "Invalid product id" });
  }

  try {
    const [rows] = await db.execute(
      `
      SELECT
        id,
        name,
        grade,
        origin,
        unit,
        price,
        stock_qty AS stockQty,
        is_active AS isActive,
        created_at AS createdAt
      FROM products
      WHERE id = ? AND is_active = 1
    `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Error in getProductById:", err);
    res.status(500).json({ message: "Error fetching product" });
  }
}

// POST /api/products  (admin only, we'll protect in routes)
async function createProduct(req, res) {
  const { name, grade, origin, unit, price, stockQty } = req.body;

  if (!name || !grade || !origin || !unit || price == null || stockQty == null) {
    return res.status(400).json({
      message: "name, grade, origin, unit, price and stockQty are required",
    });
  }

  try {
    const [result] = await db.execute(
      `
      INSERT INTO products (name, grade, origin, unit, price, stock_qty)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
      [name, grade, origin, unit, price, stockQty]
    );

    const id = result.insertId;

    const [rows] = await db.execute(
      `
      SELECT
        id,
        name,
        grade,
        origin,
        unit,
        price,
        stock_qty AS stockQty,
        is_active AS isActive,
        created_at AS createdAt
      FROM products
      WHERE id = ?
    `,
      [id]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Error in createProduct:", err);
    res.status(500).json({ message: "Error creating product" });
  }
}

// PUT /api/products/:id  (admin only)
async function updateProduct(req, res) {
  const id = parseInt(req.params.id, 10);
  const { name, grade, origin, unit, price, stockQty, isActive } = req.body;

  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "Invalid product id" });
  }

  try {
    // First make sure product exists
    const [existingRows] = await db.execute(
      "SELECT id FROM products WHERE id = ?",
      [id]
    );
    if (existingRows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    await db.execute(
      `
      UPDATE products
      SET
        name = COALESCE(?, name),
        grade = COALESCE(?, grade),
        origin = COALESCE(?, origin),
        unit = COALESCE(?, unit),
        price = COALESCE(?, price),
        stock_qty = COALESCE(?, stock_qty),
        is_active = COALESCE(?, is_active)
      WHERE id = ?
    `,
      [
        name ?? null,
        grade ?? null,
        origin ?? null,
        unit ?? null,
        price ?? null,
        stockQty ?? null,
        isActive ?? null,
        id,
      ]
    );

    const [rows] = await db.execute(
      `
      SELECT
        id,
        name,
        grade,
        origin,
        unit,
        price,
        stock_qty AS stockQty,
        is_active AS isActive,
        created_at AS createdAt
      FROM products
      WHERE id = ?
    `,
      [id]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error("Error in updateProduct:", err);
    res.status(500).json({ message: "Error updating product" });
  }
}

// DELETE /api/products/:id  (admin only - soft delete)
async function deleteProduct(req, res) {
  const id = parseInt(req.params.id, 10);

  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "Invalid product id" });
  }

  try {
    const [existingRows] = await db.execute(
      "SELECT id FROM products WHERE id = ?",
      [id]
    );
    if (existingRows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    // soft delete: set is_active = 0
    await db.execute("UPDATE products SET is_active = 0 WHERE id = ?", [id]);

    res.json({ message: "Product deactivated" });
  } catch (err) {
    console.error("Error in deleteProduct:", err);
    res.status(500).json({ message: "Error deleting product" });
  }
}

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
