// controllers/reportsController.js
const db = require("../db");

// GET /api/reports/top-products?days=30
async function getTopProducts(req, res) {
  const days = parseInt(req.query.days || "30", 10);

  try {
    const [rows] = await db.execute(
      `
      SELECT
        p.id,
        p.name,
        SUM(oi.quantity) AS totalQty,
        SUM(oi.quantity * oi.unit_price) AS totalRevenue
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN products p ON p.id = oi.product_id
      WHERE o.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY p.id, p.name
      ORDER BY totalQty DESC
      LIMIT 10
    `,
      [days]
    );

    const data = rows.map((r) => ({
      productId: r.id,
      name: r.name,
      totalQty: Number(r.totalQty),
      totalRevenue: Number(r.totalRevenue),
    }));

    res.json(data);
  } catch (err) {
    console.error("Error in getTopProducts:", err);
    res.status(500).json({ message: "Error fetching top products" });
  }
}

// GET /api/reports/low-stock?threshold=50
async function getLowStock(req, res) {
  const threshold = parseInt(req.query.threshold || "50", 10);

  try {
    const [rows] = await db.execute(
      `
      SELECT
        id,
        name,
        stock_qty AS stockQty,
        unit
      FROM products
      WHERE is_active = 1 AND stock_qty <= ?
      ORDER BY stock_qty ASC, name ASC
    `,
      [threshold]
    );

    const data = rows.map((r) => ({
      id: r.id,
      name: r.name,
      stockQty: Number(r.stockQty),
      unit: r.unit,
    }));

    res.json(data);
  } catch (err) {
    console.error("Error in getLowStock:", err);
    res.status(500).json({ message: "Error fetching low stock products" });
  }
}

// GET /api/reports/daily-summary?days=14
async function getDailySummary(req, res) {
  const days = parseInt(req.query.days || "14", 10);

  try {
    const [rows] = await db.execute(
      `
      SELECT
        DATE(created_at) AS day,
        COUNT(*) AS orderCount,
        SUM(total_amount) AS totalRevenue
      FROM orders
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY DATE(created_at)
      ORDER BY day DESC
    `,
      [days]
    );

    const data = rows.map((r) => ({
      day: r.day,
      orderCount: Number(r.orderCount),
      totalRevenue: Number(r.totalRevenue),
    }));

    res.json(data);
  } catch (err) {
    console.error("Error in getDailySummary:", err);
    res.status(500).json({ message: "Error fetching daily summary" });
  }
}

module.exports = {
  getTopProducts,
  getLowStock,
  getDailySummary,
};
