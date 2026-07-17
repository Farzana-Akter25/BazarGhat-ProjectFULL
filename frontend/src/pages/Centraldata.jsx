

// ==================== (GLOCERY SECTION) ====================
export const groceryProducts = [
  { 
    id: 101, 
    name: "Maida 1kg Pure Fresh Brand", 
    price: 150, 
    oldPrice: 180, 
    img: "/Maida.png", 
    weight: "1kg", 
    category: "grocery",
    showOnHome: true 
  },
  { 
    id: 102, 
    name: "Paprika Powder Premium Pack", 
    price: 60, 
    oldPrice: 70, 
    img: "/paprika powder.jpg", 
    weight: "1 Unit", 
    category: "grocery",
    showOnHome: false 
  },
  { 
    id: 103, 
    name: "Vegetable Oil 1L Pure & Healthy Fresh Oil", 
    price: 195, 
    oldPrice: 220, 
    img: "/Vegetable-Oil.webp", 
    weight: "1L", 
    category: "grocery",
    showOnHome: true 
  },
  { 
    id: 104, 
    name: "Organic Honey 100% Pure Natural", 
    price: 120, 
    oldPrice: 150, 
    img: "/organic honey.jpg", 
    weight: "500g", 
    category: "grocery",
    showOnHome: true 
  },
  { 
    id: 105, 
    name: "Pure Ghee Traditional Cow Ghee", 
    price: 720, 
    oldPrice: 800, 
    img: "/ghee.jpg", 
    weight: "1kg", 
    category: "grocery",
    showOnHome: true 
  },
  { 
    id: 106, 
    name: "Arabian Dates Premium Quality Imported", 
    price: 320, 
    oldPrice: 380, 
    img: "/dates copy.jpg", 
    weight: "1kg", 
    category: "grocery",
    showOnHome: false 
  },
  { 
    id: 107, 
    name: "White Bread Fresh Baked Healthy", 
    price: 70, 
    oldPrice: 90, 
    img: "/white bread.jpg", 
    weight: "500g", 
    category: "grocery",
    showOnHome: false 
  },
  { 
    id: 108, 
    name: "Pran Tomato Sauce Real Tomato Taste", 
    price: 90, 
    oldPrice: 120, 
    img: "/tometo sause.png", 
    weight: "1kg", 
    category: "grocery",
    showOnHome: false 
  }
];

// ==================== (ORGANIC SECTION) ====================
export const organicProducts = [
  { 
    id: 201, 
    name: "Brocoly Fresh Organic Vegetable", 
    price: 80, 
    oldPrice: 120, 
    img: "/Brockly.png", 
    weight: "250g", 
    category: "organic",
    showOnHome: true 
  },
  { 
    id: 202, 
    name: "Carrot Fresh Organic Vegetable", 
    price: 50, 
    oldPrice: 80, 
    img: "/carrot1.png", 
    weight: "500g", 
    category: "organic",
    showOnHome: true 
  },
  { 
    id: 203, 
    name: "Mango Premium Organic Fruits", 
    price: 250, 
    oldPrice: 300, 
    img: "/mango1.png", 
    weight: "200g", 
    category: "organic",
    showOnHome: true
  },
  { 
    id: 204, 
    name: "Fresh Red Tomatoes 1kg Premium Quality", 
    price: 28, 
    oldPrice: 30, 
    img: "/tomatoes_300x.avif", 
    weight: "1kg", 
    category: "organic",
    showOnHome: true 
  },
  { 
    id: 205, 
    name: "Betroot Fresh Organic Vegetable", 
    price: 20, 
    oldPrice: 25, 
    img: "/betroot.jpeg", 
    weight: "50g", 
    category: "organic",
    showOnHome: false 
  },
  { 
    id: 206, 
    name: "Black Rice Premium Unpolished Organic", 
    price: 200, 
    oldPrice: 300, 
    img: "/blackrice.png", 
    weight: "1kg", 
    category: "organic",
    showOnHome: false 
  }
];

// ALL PRODUCTS MERGE

export const allProductsList = [...groceryProducts, ...organicProducts];