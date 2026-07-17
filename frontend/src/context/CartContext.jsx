import React, { createContext, useState } from "react";

// ✅ Create context
export const CartContext = createContext();

const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);

  // ✅ Add to cart
  const addToCart = (product) => {
    const exist = cartItems.find((item) => item.id === product.id);

    if (exist) {
      setCartItems(
        cartItems.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCartItems([...cartItems, { ...product, quantity: 1 }]);
    }
  };

  // ✅ Update quantity
  const updateQty = (id, change) => {
    setCartItems(
      cartItems.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(1, item.quantity + change) }
          : item
      )
    );
  };

  // ✅ Remove item
  const removeItem = (id) => {
    setCartItems(cartItems.filter((item) => item.id !== id));
  };

  return (
    <CartContext.Provider
      value={{ cartItems, addToCart, updateQty, removeItem }}
    >
      {children}
    </CartContext.Provider>
  );
};

export default CartProvider;