import { createContext, useEffect, useRef, useState } from "react";
import {
  useAddCartItemMutation, // remove item from backend cart
  useClearCartMutation,
  useGetCartQuery, // change item qty on backend
  useRemoveCartItemMutation, // add item to backend cart
  useUpdateCartItemMutation, // change item qty on backend
} from "../features/customer/cartApi";
import useAuth from "../hooks/useAuth"; // current user + auth state

// context
export const CartContext = createContext();

const STORAGE_KEY = "cart_items"; // localStorage key for guest cart

// reads the guest cart from localStorage, safely
const loadLocalCart = () => {
  try {
    // Saved cart text from the browser
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return []; // corrupted/missing data falls back to empty cart
  }
};

// Provides the cart (guest cart in the browser, or the customer's cart on the server)
const CartProvider = ({ children }) => {
  // Login state
  const { isAuthenticated, user } = useAuth();
  // Only a logged-in customer gets a real, per-account backend cart.
  const backendMode = isAuthenticated && user?.role === "customer"; // true when using backend cart api

  const [localCartItems, setLocalCartItems] = useState(loadLocalCart); // guest cart items
  const [deselectedIds, setDeselectedIds] = useState([]); // ids unchecked in cart selection

  // Persist the guest cart across refreshes (unchanged from before).
  useEffect(() => {
    if (!backendMode) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(localCartItems)); // save guest cart
    }
  }, [localCartItems, backendMode]);

  const { data: backendCartItems = [] } = useGetCartQuery(undefined, {
    skip: !backendMode, // only fetch when logged in as customer
  });
  const [addCartItemMutation] = useAddCartItemMutation(); // add-item api call
  const [updateCartItemMutation] = useUpdateCartItemMutation(); // update-qty api call
  const [removeCartItemMutation] = useRemoveCartItemMutation(); // remove-item api call
  const [clearCartMutation] = useClearCartMutation(); // clear-cart api call

  const cartItems = backendMode ? backendCartItems : localCartItems; // active cart source

  // One-time merge of a guest's local cart into their account the moment they log in as a customer, so items they picked before logging in aren't lost.
  const mergedRef = useRef(false); // guards merge from running more than once
  // Merge the guest cart into the customer's account once after login
  useEffect(() => {
    if (!backendMode) {
      mergedRef.current = false; // reset guard when logged out
      return;
    }

    if (mergedRef.current) return;
    mergedRef.current = true;

    const guestItems = loadLocalCart(); // items saved before login
    if (guestItems.length === 0) return;

    Promise.all(
      guestItems.map(
        (item) =>
          addCartItemMutation({
            product_id: item.id,
            quantity: item.quantity,
          }).catch(() => {}), // best-effort merge
      ),
    ).finally(() => {
      localStorage.removeItem(STORAGE_KEY); // clear guest cart storage
      setLocalCartItems([]); // clear local state too
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendMode]);

  // Add to cart (blocked for out-of-stock products)
  const addToCart = (product) => {
    if (!product || product.stock <= 0 || product.inStock === false) {
      return false; // reject out-of-stock adds
    }

    if (backendMode) {
      addCartItemMutation({ product_id: product.id, quantity: 1 }).catch(
        () => {},
      ); // add via api
      return true;
    }

    setLocalCartItems((prev) => {
      const exist = prev.find((item) => item.id === product.id); // already in cart?

      if (exist) {
        return prev.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.stock
                  ? Math.min(item.quantity + 1, item.stock) // cap at stock
                  : item.quantity + 1,
              }
            : item,
        );
      }
      return [...prev, { ...product, quantity: 1 }]; // new cart entry
    });
    return true;
  };

  // Update quantity (capped at available stock, minimum 1)
  const updateQty = (id, change) => {
    if (backendMode) {
      const item = backendCartItems.find((i) => i.id === id); // target cart row
      if (!item) return;
      const currentQty = Number(item.quantity) || 1; // ensure it's a number
      const next = currentQty + change; // requested new qty
      // Enforce: minimum 1, maximum stock
      const capped = Math.max(
        1,
        item.stock ? Math.min(next, item.stock) : next,
      );
      updateCartItemMutation({ id, quantity: capped }).catch(() => {}); // never below 1 or above stock
      return;
    }

    setLocalCartItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const currentQty = Number(item.quantity) || 1; // ensure it's a number
        const next = currentQty + change; // requested new qty
        // Enforce: minimum 1, maximum stock
        const capped = Math.max(
          1,
          item.stock ? Math.min(next, item.stock) : next,
        );
        return { ...item, quantity: capped }; // never below 1 or above stock
      }),
    );
  };

  // Remove item
  const removeItem = (id) => {
    setDeselectedIds((prev) => prev.filter((x) => x !== id)); // drop from deselected list too

    if (backendMode) {
      removeCartItemMutation(id).catch(() => {}); // remove via api
      return;
    }

    setLocalCartItems((prev) => prev.filter((item) => item.id !== id)); // remove locally
  };

  // Clear cart entirely
  const clearCart = () => {
    setDeselectedIds([]); // reset selection state

    if (backendMode) {
      clearCartMutation().catch(() => {}); // clear via api
      return;
    }

    setLocalCartItems([]); // clear locally
  };

  // Called right after an order is placed — removes only the ordered product ids, leaving the rest of the cart untouched.
  const removeOrderedItems = (ids) => {
    setDeselectedIds((prev) => prev.filter((id) => !ids.includes(id))); // drop ordered ids from selection

    if (!backendMode) {
      setLocalCartItems((prev) =>
        prev.filter((item) => !ids.includes(item.id)),
      ); // drop ordered items locally
    }
  };

  // selection state helpers
  const isSelected = (id) => !deselectedIds.includes(id); // checked unless explicitly deselected
  // Select or unselect one item
  const toggleSelected = (id) => {
    setDeselectedIds(
      (prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id], // toggle in/out of deselected list
    );
  };
  const selectAll = () => setDeselectedIds([]); // clear all deselections

  // cart context provider
  return (
    <CartContext.Provider
      value={{
        cartItems, // active cart list
        addToCart, // add product handler
        updateQty, // change quantity handler
        removeItem, // remove product handler
        clearCart, // wipe cart handler
        removeOrderedItems, // post-checkout cleanup handler
        isSelected, // selection checker
        toggleSelected, // selection toggle
        selectAll, // reset selection
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export default CartProvider; // wraps app to provide cart state everywhere
