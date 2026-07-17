export const customer = {
  name: "Mohammad Rahman",
  firstName: "Mohammad",
  customerId: "CUS-2026-12345",
  email: "rahman@example.com",
  phone: "01712-345678",
  address: "House 123, Road 4, Uttara, Dhaka, Bangladesh",
  memberSince: "July 2026",
  loyaltyPoints: 850,
};

export const ORDERS = [
  {
    id: "ORD-2026-001234",
    date: "2026-07-08",
    status: "Delivered",
    deliveredOn: "2026-07-09",
    total: 1050,
    items: [
      { name: "Fresh Organic Apple", price: 500, qty: 1, emoji: "🍎" },
      { name: "Basmati Rice 5kg", price: 450, qty: 1, emoji: "🌾" },
      { name: "Pure Honey 500g", price: 350, qty: 1, emoji: "🍯" },
    ],
  },
  {
    id: "ORD-2026-001198",
    date: "2026-07-05",
    status: "In Transit",
    estDelivery: "2026-07-13",
    total: 520,
    items: [
      { name: "Dairy Milk 1L", price: 170, qty: 2, emoji: "🥛" },
      { name: "Fresh Chicken 1kg", price: 350, qty: 1, emoji: "🍗" },
    ],
  },
  {
    id: "ORD-2026-001102",
    date: "2026-07-01",
    status: "Processing",
    total: 980,
    items: [
      { name: "Fresh Vegetables Mix", price: 360, qty: 2, emoji: "🥦" },
      { name: "Fresh Tomatoes 1kg", price: 180, qty: 3, emoji: "🍅" },
    ],
  },
  {
    id: "ORD-2026-001050",
    date: "2026-06-30",
    status: "Delivered",
    deliveredOn: "2026-06-30",
    total: 1450,
    items: [
      { name: "Organic Eggs 12pcs", price: 360, qty: 2, emoji: "🥚" },
      { name: "Fresh Orange Juice 1L", price: 450, qty: 1, emoji: "🍊" },
    ],
  },
];

export const itemCount = (order) =>
  order.items.reduce((sum, i) => sum + i.qty, 0);

export const RETURN_REQUESTS = [
  {
    id: "RET-2026-0001",
    status: "Pending Review",
    orderId: "ORD-2026-001234",
    date: "2026-07-10",
    amount: 450,
    product: "Basmati Rice 5kg",
    reason: "Damaged Packaging",
    description:
      "Package was damaged during delivery. Rice bag has torn and some rice spilled.",
  },
];

export const STATS = {
  totalOrders: ORDERS.length,
  inTransit: ORDERS.filter((o) => o.status === "In Transit").length,
  delivered: ORDERS.filter((o) => o.status === "Delivered").length,
  totalSpent: ORDERS.reduce((sum, o) => sum + o.total, 0),
};
