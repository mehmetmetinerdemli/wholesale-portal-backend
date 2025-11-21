// data/orders.js
const orders = [
  {
    id: 1,
    buyerName: "Retailer One",
    status: "received", // later: received → picking → delivered
    deliveryDate: "2025-11-21",
    totalAmount: 45.2,
    items: [
      {
        productId: 1, // Bananas
        quantity: 10,
        unitPrice: 1.8,
      },
      {
        productId: 2, // Tomatoes
        quantity: 5,
        unitPrice: 2.4,
      },
    ],
  },
  {
    id: 2,
    buyerName: "Retailer Two",
    status: "picking",
    deliveryDate: "2025-11-22",
    totalAmount: 19.0,
    items: [
      {
        productId: 3, // Potatoes
        quantity: 20,
        unitPrice: 0.95,
      },
    ],
  },
];

module.exports = orders;
