import { useMemo } from "react";
import { useGetProductsQuery } from "../features/product/productApi";
import { applyLivePricing } from "../utils/pricing";

// Re-prices cart lines from live product data.
const useLiveCartPricing = (cartItems) => {
  const { data: products = [] } = useGetProductsQuery({ per_page: 100 });

  return useMemo(() => {
    if (products.length === 0) return cartItems;

    // Live products by id for quick lookup
    const liveById = new Map(products.map((product) => [product.id, product]));

    // Products missing from the live list (inactive, or past the page limit) keep their stored values — the stock check flags them separately.
    return cartItems.map((item) => applyLivePricing(item, liveById.get(item.id)));
  }, [cartItems, products]);
};

export default useLiveCartPricing;
