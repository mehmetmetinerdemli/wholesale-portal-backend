// controllers/automationController.js
const db = require("../db");

const CUTOFF_HOUR = parseInt(process.env.CUTOFF_HOUR || "16", 10);
const CUTOFF_MINUTE = parseInt(process.env.CUTOFF_MINUTE || "0", 10);

// GET /api/automation/daily-catalog
// For daily emails: returns concise product catalog snapshot.
async function getDailyCatalog(req, res) {
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
        is_active AS isActive
      FROM products
      WHERE is_active = 1
      ORDER BY name
    `
    );

    const now = new Date();
    const pad = (n) => n.toString().padStart(2, "0");

    const payload = {
      generatedAt: now.toISOString(),
      cutoffTime: `${pad(CUTOFF_HOUR)}:${pad(CUTOFF_MINUTE)}`,
      productCount: rows.length,
      products: rows.map((p) => ({
        id: p.id,
        name: p.name,
        grade: p.grade,
        origin: p.origin,
        unit: p.unit,
        price: Number(p.price),
        stockQty: Number(p.stockQty),
      })),
    };

    res.json(payload);
  } catch (err) {
    console.error("Error in getDailyCatalog:", err);
    res.status(500).json({ message: "Error building daily catalog" });
  }
}

module.exports = {
  getDailyCatalog,
};
