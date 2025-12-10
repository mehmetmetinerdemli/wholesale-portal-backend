const db = require("../db");

const VALID_TYPES = ["DAILY", "WEEKLY", "MONTHLY"];

async function getPromotions(req, res) {
  try {
    const type = (req.query.type || "DAILY").toUpperCase();

    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ message: "Invalid promotion type" });
    }

    const [rows] = await db.execute(
      `
      SELECT
        id,
        name,
        description,
        type,
        discount_percent AS discountPercent,
        start_date AS startDate,
        end_date AS endDate,
        is_active AS isActive,
        created_at AS createdAt
      FROM promotions
      WHERE type = ?
        AND is_active = 1
        AND (start_date IS NULL OR start_date <= NOW())
        AND (end_date IS NULL OR end_date >= NOW())
      ORDER BY created_at DESC
      `,
      [type]
    );

    const now = new Date();

    const payload = {
      generatedAt: now.toISOString(),
      promotionType: type,
      promotionCount: rows.length,
      promotions: rows.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        discountPercent: Number(p.discountPercent),
        startDate: p.startDate,
        endDate: p.endDate,
        createdAt: p.createdAt,
      })),
    };

    res.json(payload);
  } catch (err) {
    console.error("Error in getPromotions:", err);
    res.status(500).json({ message: "Error loading promotions" });
  }
}

module.exports = {
  getPromotions,
};