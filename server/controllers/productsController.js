// controllers/productsController.js
const db = require("../db");

// Helper: map DB row to frontend shape
function mapProduct(row) {
  return {
    id: row.id,
    name: row.name,
    grade: row.grade,
    origin: row.origin,
    unit: row.unit,
    price: Number(row.price),
    stockQty: Number(row.stock_qty),
    isActive: row.is_active === 1,
    image_url: row.image_url,
    createdAt: row.created_at
  };
}

// ======================================================
// GET /api/products  (buyers see only active, admins see all)
// ======================================================
async function getAllProducts(req, res) {
  try {
    const isAdmin = req.user && req.user.role === "ADMIN";

    const sql = isAdmin
      ? `SELECT * FROM products ORDER BY name`
      : `SELECT * FROM products WHERE is_active = 1 ORDER BY name`;

    const [rows] = await db.execute(sql);

    res.json(rows.map(mapProduct));
  } catch (err) {
    console.error("Error in getAllProducts:", err);
    res.status(500).json({ message: "Error fetching products" });
  }
}

// ======================================================
// GET /api/products/:id
// ======================================================
async function getProductById(req, res) {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ message: "Invalid product id" });

  try {
    const [rows] = await db.execute(`SELECT * FROM products WHERE id = ?`, [id]);

    if (rows.length === 0) return res.status(404).json({ message: "Product not found" });

    res.json(mapProduct(rows[0]));
  } catch (err) {
    console.error("Error in getProductById:", err);
    res.status(500).json({ message: "Error fetching product" });
  }
}

// ======================================================
// POST /api/products (admin only)
// ======================================================
async function createProduct(req, res) {
  try {
    const {
      name,
      unit,
      grade,
      origin,
      price,
      stockQty,
      isActive
    } = req.body;

    const image_url = req.file ? `/uploads/${req.file.filename}` : null;

    const [result] = await db.execute(
      `
      INSERT INTO products
        (name, unit, grade, origin, price, stock_qty, is_active, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        name,
        unit,
        grade,
        origin,
        Number(price),
        Number(stockQty),
        isActive ? 1 : 0,
        image_url
      ]
    );

    const [rows] = await db.execute(`SELECT * FROM products WHERE id = ?`, [
      result.insertId,
    ]);

    res.json(mapProduct(rows[0]));
  } catch (err) {
    console.error("Error in createProduct:", err);
    res.status(500).json({ message: "Failed to create product" });
  }
}

// ======================================================
// PUT /api/products/:id (admin only)
// ======================================================
async function updateProduct(req, res) {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ message: "Invalid product id" });

  const {
    name,
    grade,
    origin,
    unit,
    price,
    stockQty,
    isActive
  } = req.body;

  try {
    // First: build base SQL
    let sql = `
      UPDATE products
      SET
        name = ?,
        grade = ?,
        origin = ?,
        unit = ?,
        price = ?,
        stock_qty = ?,
        is_active = ?
    `;

    const params = [
      name,
      grade,
      origin,
      unit,
      Number(price),
      Number(stockQty),
      isActive ? 1 : 0
    ];

    // If new image uploaded → update it
    if (req.file) {
      sql += `, image_url = ?`;
      params.push(`/uploads/${req.file.filename}`);
    }

    sql += ` WHERE id = ?`;
    params.push(id);

    const [result] = await db.execute(sql, params);

    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Product not found" });

    const [rows] = await db.execute(`SELECT * FROM products WHERE id = ?`, [
      id,
    ]);

    res.json(mapProduct(rows[0]));
  } catch (err) {
    console.error("Error updating product:", err);
    res.status(500).json({ message: "Failed to update product" });
  }
}

// ======================================================
// DELETE /api/products/:id  (soft delete)
// ======================================================
async function deleteProduct(req, res) {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ message: "Invalid product id" });

  try {
    const [result] = await db.execute(
      `UPDATE products SET is_active = 0 WHERE id = ?`,
      [id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Product not found" });

    res.json({ message: "Product deactivated" });
  } catch (err) {
    console.error("Error in deleteProduct:", err);
    res.status(500).json({ message: "Failed to delete product" });
  }
}

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
