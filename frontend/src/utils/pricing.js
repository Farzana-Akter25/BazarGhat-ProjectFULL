

// Convert any value to a number, or 0 if it is not a number
const toNumber = (value) => {
  // Parsed number
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};


// Work out the price details the UI shows for a product
export const resolvePricing = (product) => {
  // No product: all zeros
  if (!product) {
    return {
      price: 0,
      oldPrice: null,
      discountPercentage: 0,
      onFlashSale: false,
      flashSale: null,
      normalPrice: 0,
    };
  }

  // Current price and the struck-through old price (only if higher)
  const price = toNumber(product.price);
  const rawOldPrice = toNumber(product.oldPrice);
  const oldPrice = rawOldPrice > price ? rawOldPrice : null;

  // Use the backend's discount %, or calculate it from the two prices
  const discountPercentage =
    product.discount_percentage != null
      ? toNumber(product.discount_percentage)
      : oldPrice
        ? Math.round(((oldPrice - price) / oldPrice) * 100)
        : 0;

  // Price details for display
  return {
    price,
    oldPrice,
    discountPercentage,
    onFlashSale: Boolean(product.on_flash_sale),
    flashSale: product.flash_sale ?? null,
    normalPrice: product.normal_price != null ? toNumber(product.normal_price) : price,
  };
};


// Copy the latest prices and stock from the live product onto a cart item
export const applyLivePricing = (item, liveProduct) => {
  // No live product found: keep the item as it is
  if (!liveProduct) return item;

  return {
    ...item,
    price: liveProduct.price,
    oldPrice: liveProduct.oldPrice ?? null,
    normal_price: liveProduct.normal_price,
    discount_percentage: liveProduct.discount_percentage,
    on_flash_sale: liveProduct.on_flash_sale,
    flash_sale: liveProduct.flash_sale ?? null,
    stock: liveProduct.stock,
    inStock: liveProduct.inStock,
  };
};
