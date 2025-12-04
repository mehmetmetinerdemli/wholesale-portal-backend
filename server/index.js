const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

require("dotenv").config();
const db = require("./db");

const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productsRoutes");
const orderRoutes = require("./routes/ordersRoutes");
const reportsRoutes = require("./routes/reportsRoutes");
const automationRoutes = require("./routes/automationRoutes");
const userRoutes = require("./routes/userRoutes");

// ⬇️ NEW: promotions routes
const promotionsRoutes = require("./routes/promotionsRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/automation", automationRoutes);
app.use("/api/users", userRoutes);

// ⬇️ NEW: mount promotions API
app.use("/api/promotions", promotionsRoutes);

// Simple test route
app.get("/", (req, res) => {
  res.json({ message: "ELSO - Elite Solutions API is running 🚚" });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
