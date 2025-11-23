// controllers/authController.js
const db = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const JWT_EXPIRES_IN = "7d";

function generateToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      role: user.role,
      email: user.email,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// POST /api/auth/register
async function registerUser(req, res) {
  const { name, email, password, companyName } = req.body;

  // 🔒 force self-registered users to BUYER
  const role = "BUYER";

  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ message: "name, email and password are required" });
  }

  try {
    // check if email already exists
    const [existingRows] = await db.execute(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );
    if (existingRows.length > 0) {
      return res.status(409).json({ message: "Email already registered" });
    }

    // hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // insert new user
    const [result] = await db.execute(
      `
      INSERT INTO users (name, email, password_hash, role, company_name)
      VALUES (?, ?, ?, ?, ?)
    `,
      [name, email, passwordHash, role, companyName || null]
    );

    const insertedId = result.insertId;

    // fetch the inserted user
    const [rows] = await db.execute(
      "SELECT id, name, email, role, company_name AS companyName FROM users WHERE id = ?",
      [insertedId]
    );

    const user = rows[0];

    const token = generateToken(user);

    // frontend expects { user, token }
    return res.status(201).json({ user, token });
  } catch (err) {
    console.error("Error in registerUser:", err);
    return res.status(500).json({ message: "Server error during registration" });
  }
}

// POST /api/auth/login
async function loginUser(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "email and password are required" });
  }

  try {
    const [rows] = await db.execute("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const userRow = rows[0];

    const passwordMatch = await bcrypt.compare(
      password,
      userRow.password_hash
    );

    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = {
      id: userRow.id,
      name: userRow.name,
      email: userRow.email,
      role: userRow.role,
      companyName: userRow.company_name,
    };

    const token = generateToken(user);

    return res.json({ user, token });
  } catch (err) {
    console.error("Error in loginUser:", err);
    return res.status(500).json({ message: "Server error during login" });
  }
}

// GET /api/auth/me
async function getMe(req, res) {
  try {
    const [rows] = await db.execute(
      "SELECT id, name, email, role, company_name AS companyName FROM users WHERE id = ?",
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ user: rows[0] });
  } catch (err) {
    console.error("Error in getMe:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

module.exports = {
  registerUser,
  loginUser,
  getMe,
};
