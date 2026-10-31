import { resolvePricing } from "../../utils/pricing";
// Text sizes for each size option
const SIZES = {
  sm: { price: "text-base", old: "text-[11px]" },
  md: { price: "text-lg", old: "text-xs" },
  lg: { price: "text-3xl", old: "text-base" },
};

// Shows the current price, the old price struck through, and an optional discount badge
const ProductPrice = ({ product, size = "md", showBadge = false, className = "" }) => {
  // Price details for this product
  const { price, oldPrice, discountPercentage } = resolvePricing(product);
  const scale = SIZES[size] || SIZES.md;

  return (
    <div className={`flex items-baseline gap-2 ${className}`}>
      {/* effective price — what this product actually sells for right now */}
      <span className={`text-[#f57224] font-bold leading-none ${scale.price}`}>
        ৳{price}
      </span>

      {/* old price design */}
      {oldPrice && (
        <span className={`text-gray-400 line-through leading-none ${scale.old}`}>
          ৳{oldPrice}
        </span>
      )}

      {/* inline saving, for surfaces without a corner badge */}
      {showBadge && discountPercentage > 0 && (
        <span className="rounded bg-[#ff2d37]/10 px-1.5 py-0.5 text-[11px] font-extrabold leading-none text-[#ff2d37]">
          -{discountPercentage}%
        </span>
      )}
    </div>
  );
};

// Corner ribbon for product cards.
export const DiscountBadge = ({ product, className = "" }) => {
  // Discount details for the badge
  const { discountPercentage, onFlashSale } = resolvePricing(product);

  if (discountPercentage <= 0) return null;

  return (
    <span
      className={`absolute top-2 left-2 z-10 inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-extrabold leading-none text-white shadow-sm ${
        onFlashSale ? "bg-[#ff2d37]" : "bg-[#f57224]"
      } ${className}`}
    >
      {onFlashSale && <span className="text-[9px] uppercase tracking-wide">Flash</span>}
      -{discountPercentage}%
    </span>
  );
};

export default ProductPrice;
