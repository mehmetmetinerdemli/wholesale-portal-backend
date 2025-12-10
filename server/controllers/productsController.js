// controllers/productsController.js
const db = require("../db");

// ======================================================
// GET /api/products  (public - buyer)
// ======================================================
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
        image_url AS image_url,
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

// ======================================================
// GET /api/products/:id
// ======================================================
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
        image_url AS image_url,
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

// ======================================================
// POST /api/products (admin only)
// ======================================================
const createProduct = async (req, res) => {
  try {
    const { name, unit, grade, origin, price, stock_qty, is_active } = req.body;

    const image_url = req.file ? `/uploads/${req.file.filename}` : null;

    const [result] = await db.query(
      `
      INSERT INTO products 
        (name, unit, grade, origin, price, stock_qty, is_active, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [name, unit, grade, origin, price, stock_qty, is_active, image_url]
    );

    res.json({
      id: result.insertId,
      message: "Product created",
      image_url
    });
  } catch (err) {
    console.error("Error in createProduct:", err);
    res.status(500).json({ error: err.message });
  }
};

// ======================================================
// PUT /api/products/:id (admin only)
// ======================================================
const updateProduct = async (req, res) => {
  try {
    const { name, unit, grade, origin, price, stock_qty, is_active } = req.body;

    let image_url = null;
    if (req.file) {
      image_url = `/uploads/${req.file.filename}`;
    }

    // Build SQL dynamically
    let sql = `
      UPDATE products 
      SET name=?, unit=?, grade=?, origin=?, price=?, stock_qty=?, is_active=?
    `;

    const fields = [
      name,
      unit,
      grade,
      origin,
      price,
      stock_qty,
      is_active
    ];

    // Only update image_url if a new file was uploaded
    if (image_url) {
      sql += `, image_url=?`;
      fields.push(image_url);
    }

    sql += ` WHERE id=?`;
    fields.push(req.params.id);

    await db.query(sql, fields);

    res.json({
      message: "Product updated",
      image_url: image_url || null
    });
  } catch (err) {
    console.error("Error in updateProduct:", err);
    res.status(500).json({ error: err.message });
  }
};

// ======================================================
// DELETE /api/products/:id  (admin only - soft delete)
// ======================================================
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

    // Soft delete
    await db.execute("UPDATE products SET is_active = 0 WHERE id = ?", [id]);

    res.json({ message: "Product deactivated" });
  } catch (err) {
    console.error("Error in deleteProduct:", err);
    res.status(500).json({ message: "Error deleting product" });
  }
}

// ======================================================
// EXPORTS
// ======================================================
module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
