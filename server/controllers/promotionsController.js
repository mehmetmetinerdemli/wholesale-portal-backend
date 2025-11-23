const db = require("../db");

// GET /api/promotions?type=DAILY&activeOnly=true
async function getPromotions(req, res) {
  const { type, activeOnly } = req.query;

  const params = [];
  let sql = `
    SELECT 
      id, 
      name,
      description,
      type,
      discount_percent AS discountPercent,
      start_date AS startDate,
      end_date AS endDate,
      is_active AS isActive
    FROM promotions
    WHERE 1=1
  `;

  if (type) {
    sql += " AND type = ?";
    params.push(type.toUpperCase());
  }

  if (activeOnly === "true") {
    sql += " AND is_active = 1";
  }

  sql += " ORDER BY created_at DESC";

  try {
    const [rows] = await db.execute(sql, params);
    res.json({ promotions: rows });
  } catch (err) {
    console.error("Error in getPromotions:", err);
    res.status(500).json({ message: "Failed to load promotions" });
  }
}

// POST /api/promotions (admin only)
async function createPromotion(req, res) {
  const {
    name,
    description,
    type,
    discountPercent,
    startDate,
    endDate,
    isActive = true,
  } = req.body;

  if (!name || !type) {
    return res
      .status(400)
      .json({ message: "name and type are required" });
  }

  const allowed = ["DAILY", "WEEKLY", "MONTHLY"];
  if (!allowed.includes(type)) {
    return res.status(400).json({
      message: "type must be DAILY, WEEKLY, or MONTHLY",
    });
  }

  try {
    const [result] = await db.execute(
      `
      INSERT INTO promotions 
      (name, description, type, discount_percent, start_date, end_date, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      [
        name,
        description || null,
        type,
        discountPercent ?? 0,
        startDate || null,
        endDate || null,
        isActive ? 1 : 0,
      ]
    );

    const insertedId = result.insertId;

    const [rows] = await db.execute(
      `
      SELECT 
        id, name, description, type,
        discount_percent AS discountPercent,
        start_date AS startDate,
        end_date AS endDate,
        is_active AS isActive
      FROM promotions
      WHERE id = ?
    `,
      [insertedId]
    );

    res.status(201).json({ promotion: rows[0] });
  } catch (err) {
    console.error("Error in createPromotion:", err);
    res.status(500).json({ message: "Failed to create promotion" });
  }
}

// PUT /api/promotions/:id (admin)
async function updatePromotion(req, res) {
  const { id } = req.params;
  const {
    name,
    description,
    type,
    discountPercent,
    startDate,
    endDate,
    isActive,
  } = req.body;

  const updates = [];
  const params = [];

  if (name !== undefined) {
    updates.push("name = ?");
    params.push(name);
  }
  if (description !== undefined) {
    updates.push("description = ?");
    params.push(description);
  }
  if (type !== undefined) {
    updates.push("type = ?");
    params.push(type);
  }
  if (discountPercent !== undefined) {
    updates.push("discount_percent = ?");
    params.push(discountPercent);
  }
  if (startDate !== undefined) {
    updates.push("start_date = ?");
    params.push(startDate || null);
  }
  if (endDate !== undefined) {
    updates.push("end_date = ?");
    params.push(endDate || null);
  }
  if (isActive !== undefined) {
    updates.push("is_active = ?");
    params.push(isActive ? 1 : 0);
  }

  if (updates.length === 0) {
    return res.status(400).json({ message: "No fields to update" });
  }

  params.push(id);

  try {
    await db.execute(
      `UPDATE promotions SET ${updates.join(", ")} WHERE id = ?`,
      params
    );

    const [rows] = await db.execute(
      `
      SELECT 
        id, name, description, type,
        discount_percent AS discountPercent,
        start_date AS startDate,
        end_date AS endDate,
        is_active AS isActive
      FROM promotions
      WHERE id = ?
    `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Promotion not found" });
    }

    res.json({ promotion: rows[0] });
  } catch (err) {
    console.error("Error in updatePromotion:", err);
    res.status(500).json({ message: "Failed to update promotion" });
  }
}

// DELETE /api/promotions/:id (admin)
async function deletePromotion(req, res) {
  const { id } = req.params;

  try {
    const [result] = await db.execute(
      "DELETE FROM promotions WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Promotion not found" });
    }

    res.json({ message: "Promotion deleted" });
  } catch (err) {
    console.error("Error in deletePromotion:", err);
    res.status(500).json({ message: "Failed to delete promotion" });
  }
}

module.exports = {
  getPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
};
