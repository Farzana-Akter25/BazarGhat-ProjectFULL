
// Shows how many are left in stock (nothing when out of stock)
const ProductStock = ({ product, className = "", showSold = false }) => {
  // Out of stock?
  const outOfStock = product.inStock === false || product.stock <= 0;

  if (outOfStock) return null;

  return (
    <p className={`text-[11px] font-semibold text-green-700 ${className}`}>
      {product.stock} available
      {/* mega sale cards also show how many have gone already */}
      {showSold && product.sold_count > 0 && (
        <span className="font-normal text-gray-400"> · {product.sold_count} sold</span>
      )}
    </p>
  );
};

export default ProductStock; // shared "N available" label for product cards
