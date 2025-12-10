// controllers/ordersController.js
const db = require("../db");
const CUTOFF_HOUR = parseInt(process.env.CUTOFF_HOUR || "16", 10);
const CUTOFF_MINUTE = parseInt(process.env.CUTOFF_MINUTE || "0", 10);


// helper: load items for a set of order IDs WITH IMAGE URL
async function loadItemsForOrders(orderIds) {
  if (orderIds.length === 0) return {};

  const placeholders = orderIds.map(() => "?").join(",");
  const [rows] = await db.execute(
    `
    SELECT
      oi.id,
      oi.order_id AS orderId,
      oi.product_id AS productId,
      p.name AS productName,
      p.image_url AS imageUrl,
      oi.quantity,
      oi.unit_price AS unitPrice
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id IN (${placeholders})
  `,
    orderIds
  );

  const byOrder = {};
  for (const row of rows) {
    if (!byOrder[row.orderId]) byOrder[row.orderId] = [];
    byOrder[row.orderId].push({
      id: row.id,
      productId: row.productId,
      productName: row.productName,
      imageUrl: row.imageUrl,     // <-- ADDED
      quantity: row.quantity,
      unitPrice: Number(row.unitPrice),
    });
  }
  return byOrder;
}


// GET /api/orders  (admin only)
async function getAllOrders(req, res) {
  try {
    const [rows] = await db.execute(
      `
      SELECT
        o.id,
        o.buyer_id AS buyerId,
        u.name AS buyerName,
        u.company_name AS buyerCompany,
        o.status,
        o.delivery_date AS deliveryDate,
        o.total_amount AS totalAmount,
        o.created_at AS createdAt
      FROM orders o
      JOIN users u ON u.id = o.buyer_id
      ORDER BY o.created_at DESC
    `
    );

    const orderIds = rows.map((o) => o.id);
    const itemsByOrder = await loadItemsForOrders(orderIds);

    const orders = rows.map((o) => ({
      id: o.id,
      buyerId: o.buyerId,
      buyerName: o.buyerName,
      buyerCompany: o.buyerCompany,
      status: o.status,
      deliveryDate: o.deliveryDate,
      totalAmount: Number(o.totalAmount),
      createdAt: o.createdAt,
      items: itemsByOrder[o.id] || [],
    }));

    res.json(orders);
  } catch (err) {
    console.error("Error in getAllOrders:", err);
    res.status(500).json({ message: "Error fetching orders" });
  }
}


// POST /api/orders
async function createOrder(req, res) {
  const user = req.user;

  if (!user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const { deliveryDate, items } = req.body;

  if (!deliveryDate || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      message: "deliveryDate and items (non-empty array) are required",
    });
  }

  // cut-off check
  try {
    const now = new Date();

    const selected = new Date(`${deliveryDate}T00:00:00`);
    const todayMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const diffDays =
      (selected.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays < 1) {
      return res.status(400).json({
        message:
          "Delivery date must be at least tomorrow. Same-day delivery is not supported.",
      });
    }

    if (diffDays === 1) {
      const cutoffToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        CUTOFF_HOUR,
        CUTOFF_MINUTE,
        0
      );

      if (now >= cutoffToday) {
        return res.status(400).json({
          message: `Cut-off for next-day delivery has passed (today ${CUTOFF_HOUR
            .toString()
            .padStart(2, "0")}:${CUTOFF_MINUTE
            .toString()
            .padStart(2, "0")}). Please choose a later delivery date.`,
        });
      }
    }
  } catch (err) {
    console.error("Error in cut-off check:", err);
    return res
      .status(400)
      .json({ message: "Invalid delivery date. Please pick a valid date." });
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    let totalAmount = 0;
    const normalizedItems = [];

    for (const item of items) {
      const { productId, quantity } = item;

      if (!productId || !quantity || quantity <= 0) {
        await connection.rollback();
        return res.status(400).json({
          message: "Each item must have a valid productId and quantity > 0",
        });
      }

      const [prodRows] = await connection.execute(
        `
        SELECT id, name, unit, price, stock_qty
        FROM products
        WHERE id = ? AND is_active = 1
      `,
        [productId]
      );

      if (prodRows.length === 0) {
        await connection.rollback();
        return res
          .status(400)
          .json({ message: `Product with id ${productId} not found` });
      }

      const product = prodRows[0];

      if (product.stock_qty < quantity) {
        await connection.rollback();
        return res.status(400).json({
          message: `Not enough stock for "${product.name}". Requested ${quantity} ${product.unit}, available ${product.stock_qty} ${product.unit}.`,
        });
      }

      const unitPrice = Number(product.price);
      const lineTotal = unitPrice * quantity;
      totalAmount += lineTotal;

      await connection.execute(
        `
        UPDATE products
        SET stock_qty = stock_qty - ?
        WHERE id = ?
      `,
        [quantity, productId]
      );

      normalizedItems.push({
        productId,
        quantity,
        unitPrice,
      });
    }

    const [orderResult] = await connection.execute(
      `
      INSERT INTO orders (buyer_id, status, delivery_date, total_amount)
      VALUES (?, 'RECEIVED', ?, ?)
    `,
      [user.id, deliveryDate, totalAmount]
    );

    const orderId = orderResult.insertId;

    for (const item of normalizedItems) {
      await connection.execute(
        `
        INSERT INTO order_items (order_id, product_id, quantity, unit_price)
        VALUES (?, ?, ?, ?)
      `,
        [orderId, item.productId, item.quantity, item.unitPrice]
      );
    }

    await connection.commit();

    const newOrder = {
      id: orderId,
      buyerId: user.id,
      buyerName: user.email,
      status: "RECEIVED",
      deliveryDate,
      totalAmount: Number(totalAmount.toFixed(2)),
      items: normalizedItems,
    };

    res.status(201).json(newOrder);
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (_) {}
    }
    console.error("Error in createOrder:", err);
    res.status(500).json({ message: "Error creating order" });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}


// PATCH /api/orders/:id/status (admin)
async function updateOrderStatus(req, res) {
  const id = parseInt(req.params.id, 10);
  const { status } = req.body;

  const allowedStatuses = ["RECEIVED", "PICKING", "DELIVERED", "CANCELLED"];

  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "Invalid order id" });
  }

  if (!status || !allowedStatuses.includes(status)) {
    return res.status(400).json({
      message: `Status must be one of: ${allowedStatuses.join(", ")}`,
    });
  }

  try {
    const [result] = await db.execute(
      `
      UPDATE orders
      SET status = ?
      WHERE id = ?
    `,
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    const [orderRows] = await db.execute(
      `
      SELECT
        o.id,
        o.buyer_id AS buyerId,
        u.name AS buyerName,
        u.company_name AS buyerCompany,
        o.status,
        o.delivery_date AS deliveryDate,
        o.total_amount AS totalAmount,
        o.created_at AS createdAt
      FROM orders o
      JOIN users u ON u.id = o.buyer_id
      WHERE o.id = ?
    `,
      [id]
    );

    const orderRow = orderRows[0];

    const itemsByOrder = await loadItemsForOrders([id]);
    const items = itemsByOrder[id] || [];

    const order = {
      id: orderRow.id,
      buyerId: orderRow.buyerId,
      buyerName: orderRow.buyerName,
      buyerCompany: orderRow.buyerCompany,
      status: orderRow.status,
      deliveryDate: orderRow.deliveryDate,
      totalAmount: Number(orderRow.totalAmount),
      createdAt: orderRow.createdAt,
      items,
    };

    res.json(order);
  } catch (err) {
    console.error("Error in updateOrderStatus:", err);
    res.status(500).json({ message: "Error updating order status" });
  }
}


// GET /api/orders/my
async function getMyOrders(req, res) {
  const user = req.user;
  if (!user) return res.status(401).json({ message: "Authentication required" });

  try {
    const [rows] = await db.execute(
      `
      SELECT
        o.id,
        o.buyer_id AS buyerId,
        u.name AS buyerName,
        u.company_name AS buyerCompany,
        o.status,
        o.delivery_date AS deliveryDate,
        o.total_amount AS totalAmount,
        o.created_at AS createdAt
      FROM orders o
      JOIN users u ON u.id = o.buyer_id
      WHERE o.buyer_id = ?
      ORDER BY o.created_at DESC
    `,
      [user.id]
    );

    const orderIds = rows.map((o) => o.id);
    const itemsByOrder = await loadItemsForOrders(orderIds);

    const orders = rows.map((o) => ({
      id: o.id,
      buyerId: o.buyerId,
      buyerName: o.buyerName,
      buyerCompany: o.buyerCompany,
      status: o.status,
      deliveryDate: o.deliveryDate,
      totalAmount: Number(o.totalAmount),
      createdAt: o.createdAt,
      items: itemsByOrder[o.id] || [],
    }));

    res.json(orders);
  } catch (err) {
    console.error("Error in getMyOrders:", err);
    res.status(500).json({ message: "Error fetching my orders" });
  }
}


module.exports = {
  getAllOrders,
  getMyOrders,
  createOrder,
  updateOrderStatus,
};
