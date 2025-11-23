const express = require("express");
const router = express.Router();
const db = require("../db");
const { authenticate, requireAdmin } = require("../middleware/authMiddleware");

// GET /api/users/:id
// - If the user in DB is NOT ADMIN  -> return data publicly (no auth needed)
// - If the user in DB IS ADMIN      -> require valid admin token
router.get("/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    const [rows] = await db.query(
      "SELECT id, name, email, role FROM users WHERE id = ?",
      [userId]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = rows[0];

    // ✅ Case 1: Not an admin in DB → public
    if (user.role !== "ADMIN") {
      return res.json(user);
    }

    // 🔒 Case 2: This user *is* ADMIN → require admin auth
    authenticate(req, res, () => {
      requireAdmin(req, res, () => {
        // if we got here, the caller is a valid admin
        return res.json(user);
      });
    });
  } catch (err) {
    console.error("Error fetching user by id:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
