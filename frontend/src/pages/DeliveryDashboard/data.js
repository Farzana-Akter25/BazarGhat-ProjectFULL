export const rider = {
  name: "Karim Uddin",
  status: "Active",
  phone: "01799-123456",
  email: "karim@delivery.com",
  area: "Uttara, Dhaka",
  vehicle: "Motorbike",
  vehicleNumber: "DH-1234",
};

export const TODAY_ORDERS = [
  { id: "ORD-2026-011", customer: "Rakib Hasan", area: "Uttara", amount: 1350, status: "Assigned" },
  { id: "ORD-2026-012", customer: "Tasnia Ahmed", area: "Mirpur", amount: 820, status: "On The Way" },
  { id: "ORD-2026-013", customer: "Fahim Rahman", area: "Dhanmondi", amount: 2100, status: "Picked Up" },
  { id: "ORD-2026-014", customer: "Sadia Khatun", area: "Banani", amount: 450, status: "Delivered" },
];

export const TODAY_SUMMARY = {
  assigned: 1,
  onTheWay: 1,
  delivered: 2,
  failed: 1,
};

export const EARNINGS = {
  weekTotal: 113,
  successfulDeliveries: 2,
  weeklyTarget: 5,
};

export const PERFORMANCE = {
  rating: 4.8,
  onTimeDelivery: 95,
  customerFeedback: 88,
  packageSafety: 100,
};

export const ASSIGNED_ORDERS = [
  {
    id: "ORD-2026-011",
    customer: "Rakib Hasan",
    date: "Jul 2, 2026",
    address: "House 12, Road 3, Uttara, Dhaka",
    note: "Call before delivery",
    amount: 1350,
    items: 3,
    product: "Basmati Rice 5kg",
    status: "Assigned",
    phone: "01711-234567",
  },
  {
    id: "ORD-2026-012",
    customer: "Tasnia Ahmed",
    date: "Jul 2, 2026",
    address: "Flat 4B, Mirpur-10, Dhaka",
    amount: 820,
    items: 2,
    product: "Soybean Oil 2L",
    status: "On The Way",
    phone: "01812-345678",
  },
  {
    id: "ORD-2026-013",
    customer: "Fahim Rahman",
    date: "Jul 1, 2026",
    address: "House 7, Dhanmondi-15, Dhaka",
    note: "Fragile items inside",
    amount: 2100,
    items: 5,
    product: "Mixed Grocery Pack",
    status: "Picked Up",
    phone: "01913-456789",
  },
  {
    id: "ORD-2026-014",
    customer: "Sadia Khatun",
    date: "Jul 1, 2026",
    address: "Road 11, Banani, Dhaka",
    amount: 450,
    items: 1,
    product: "Fresh Milk 1L",
    status: "Delivered",
    phone: "01614-567890",
  },
  {
    id: "ORD-2026-015",
    customer: "Arif Hossain",
    date: "Jun 30, 2026",
    address: "Block C, Bashundhara, Dhaka",
    amount: 1800,
    items: 4,
    product: "Chinigura Rice 5kg",
    status: "Delivered",
    phone: "01515-678901",
  },
  {
    id: "ORD-2026-016",
    customer: "Nusrat Jahan",
    date: "Jun 30, 2026",
    address: "Sector 7, Uttara, Dhaka",
    amount: 690,
    items: 2,
    product: "Lentils (Masoor Dal) 1kg",
    status: "Failed",
    phone: "01616-789012",
  },
];

export const DELIVERY_HISTORY = [
  { id: "ORD-2026-001", customer: "Jamil Ahmed", area: "Uttara", date: "Jul 1, 2026", amount: 1200, status: "Delivered", earned: 60 },
  { id: "ORD-2026-002", customer: "Rina Begum", area: "Mirpur", date: "Jun 30, 2026", amount: 850, status: "Delivered", earned: 43 },
  { id: "ORD-2026-003", customer: "Kabir Mia", area: "Dhanmondi", date: "Jun 29, 2026", amount: 2100, status: "Failed", earned: 0 },
  { id: "ORD-2026-004", customer: "Sumaiya Islam", area: "Banani", date: "Jun 28, 2026", amount: 450, status: "Delivered", earned: 23 },
  { id: "ORD-2026-005", customer: "Tariq Hassan", area: "Gulshan", date: "Jun 27, 2026", amount: 980, status: "Delivered", earned: 49 },
  { id: "ORD-2026-006", customer: "Monir Hossain", area: "Uttara", date: "Jun 26, 2026", amount: 630, status: "Delivered", earned: 32 },
];

export const HISTORY_STATS = {
  totalDeliveries: DELIVERY_HISTORY.filter((o) => o.status === "Delivered").length,
  failed: DELIVERY_HISTORY.filter((o) => o.status === "Failed").length,
  totalEarned: DELIVERY_HISTORY.reduce((sum, o) => sum + o.earned, 0),
};

export const REQUEST_TYPES = ["Day Off", "Route Change", "Fuel Expense", "Vehicle Issue", "Other"];

export const DELIVERY_REQUESTS = [
  {
    id: "REQ-001",
    type: "Day Off",
    status: "Pending",
    message: "Need a day off on July 5 for medical appointment.",
    date: "Jul 1, 2026",
  },
  {
    id: "REQ-002",
    type: "Route Change",
    status: "Approved",
    message: "Request to change delivery route to Uttara zone.",
    date: "Jun 29, 2026",
  },
  {
    id: "REQ-003",
    type: "Fuel Expense",
    status: "Rejected",
    message: "Claim 500 BDT for extra fuel on Jun 28.",
    date: "Jun 28, 2026",
  },
];
