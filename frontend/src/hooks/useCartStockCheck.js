import { useGetProductsQuery } from "../features/product/productApi";

// Cross-checks cart items against live product stock so the UI can warn and block checkout when stock changed after an item was added to the cart.
const useCartStockCheck = (cartItems) => {
  // Live product list (first 100 products)
  const { data: products = [], isLoading, isUninitialized } =
    useGetProductsQuery({ per_page: 100 });

  
  // List the cart items that are out of stock or have too few left
  const issues =
    isLoading || isUninitialized
      ? []
      : cartItems
          .map((item) => {
            // The live version of this cart item
            const live = products.find((p) => p.id === item.id);

            if (!live || live.stock <= 0) {
              return { id: item.id, name: item.name, requested: item.quantity, available: 0 };
            }
            if (live.stock < item.quantity) {
              return { id: item.id, name: item.name, requested: item.quantity, available: live.stock };
            }
            return null;
          })
          .filter(Boolean);

  return { hasIssues: issues.length > 0, issues, isLoading };
};

export default useCartStockCheck;
