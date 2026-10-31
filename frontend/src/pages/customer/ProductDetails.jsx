import {
  ArrowLeft,
  Minus,
  Package,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Zap,
} from "lucide-react";
import { useContext, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ProductPrice from "../../components/product/ProductPrice";
import { CartContext } from "../../context/CartContext";
import { useGetProductQuery } from "../../features/product/productApi";
import useAuth from "../../hooks/useAuth";
import { pad2, useCountdown } from "../../hooks/useCountdown";
import { getCartRedirectForRole } from "../../utils/cartAccess";
import { resolvePricing } from "../../utils/pricing";

// Countdown to the end of the sale driving this product's price.
const FlashSaleBanner = ({ flashSale }) => {
  // Time left until the sale ends
  const { days, hours, minutes, seconds, expired } = useCountdown(flashSale.end_at);

  if (expired) return null;

  return (
    <div className="rounded-2xl bg-linear-to-r from-[#ff7a18] to-[#ff2d37] p-4 text-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* sale name */}
        <div className="flex items-center gap-2">
          <Zap size={18} />
          <span className="font-extrabold uppercase tracking-tight">{flashSale.name}</span>
        </div>

        {/* days/hours/minutes/seconds remaining */}
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-white/80">Ends in</span>
          <div className="flex items-center gap-1 font-mono text-sm font-bold">
            {days > 0 && (
              <>
                <span className="rounded bg-white/20 px-2 py-1">{pad2(days)}d</span>
                <span>:</span>
              </>
            )}
            <span className="rounded bg-white/20 px-2 py-1">{pad2(hours)}</span>
            <span>:</span>
            <span className="rounded bg-white/20 px-2 py-1">{pad2(minutes)}</span>
            <span>:</span>
            <span className="rounded bg-white/20 px-2 py-1">{pad2(seconds)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Single product page with price, stock, quantity and add to cart
const ProductDetails = () => {
  // Product id from the URL, plus router, cart and login helpers
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useContext(CartContext);
  const { user } = useAuth();
  const roleRedirect = getCartRedirectForRole(user?.role);
  // Chosen quantity
  const [quantity, setQuantity] = useState(1);

  // Polled so a sale starting or ending is picked up without a manual refresh.
  const { data: product, isLoading, isError } = useGetProductQuery(id, {
    pollingInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#eff0f5]">
        <p className="text-gray-500">Loading product...</p>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-[#eff0f5]">
        <p className="text-lg font-bold text-gray-600">This product is no longer available.</p>
        <Link
          to="/all-product"
          className="rounded-xl bg-green-700 px-5 py-3 text-sm font-bold text-white hover:bg-green-800"
        >
          Browse all products
        </Link>
      </div>
    );
  }

  // Price details, stock and the largest quantity allowed
  const { discountPercentage, onFlashSale, flashSale, normalPrice, price } = resolvePricing(product);
  const outOfStock = product.inStock === false || product.stock <= 0;
  const maxQuantity = Math.max(1, product.stock || 1);

  // Change quantity, kept between 1 and the stock
  const changeQuantity = (delta) =>
    setQuantity((current) => Math.min(maxQuantity, Math.max(1, current + delta)));

  // Adds at the effective price — the cart re-resolves it server-side anyway, so the two can never diverge.
  const handleAddToCart = () => {
    if (roleRedirect) {
      navigate(roleRedirect);
      return;
    }
    for (let i = 0; i < quantity; i += 1) {
      if (!addToCart(product)) return;
    }
    navigate("/cart");
  };

  return (
    <div className="min-h-screen bg-[#eff0f5] pb-12">
      {/* breadcrumb */}
      <div className="border-b border-gray-200 bg-white px-6 py-3 text-sm text-gray-600 shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 font-semibold hover:text-[#f57224]"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <span>/</span>
          {product.category && (
            <>
              <Link
                to={`/${product.category.toLowerCase()}`}
                className="hover:text-[#f57224]"
              >
                {product.category}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="truncate font-medium text-gray-400">{product.name}</span>
        </div>
      </div>

      <div className="mx-auto mt-6 max-w-6xl px-4">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* product image */}
          <div className="relative overflow-hidden rounded-3xl bg-white p-6 shadow-sm">
            {discountPercentage > 0 && (
              <span
                className={`absolute left-4 top-4 z-10 inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-sm font-extrabold text-white shadow-sm ${
                  onFlashSale ? "bg-[#ff2d37]" : "bg-[#f57224]"
                }`}
              >
                -{discountPercentage}%
              </span>
            )}
            <img
              src={product.img}
              alt={product.name}
              className="aspect-square w-full object-contain"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "https://placehold.co/500x500?text=Product";
              }}
            />
          </div>

          {/* product info */}
          <div className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm">
            <div>
              <h1 className="text-2xl font-extrabold leading-tight text-slate-900 md:text-3xl">
                {product.name}
              </h1>
              <p className="mt-1 text-sm text-gray-400">{product.weight || "1 Unit"}</p>
            </div>

            {/* countdown, only while a sale is actually driving the price */}
            {onFlashSale && flashSale && <FlashSaleBanner flashSale={flashSale} />}

            {/* the effective price — identical to every listing page */}
            <div>
              <ProductPrice product={product} size="lg" showBadge />
              {onFlashSale && (
                <p className="mt-2 text-sm text-gray-500">
                  Normal price <span className="font-semibold">৳{normalPrice}</span> — you save{" "}
                  <span className="font-semibold text-green-700">৳{normalPrice - price}</span>
                </p>
              )}
            </div>

            {/* stock — one shared pool, flash sale or not */}
            <div className="flex items-center gap-2 text-sm">
              <Package size={16} className="text-gray-400" />
              {outOfStock ? (
                <span className="font-bold text-red-500">Out of Stock</span>
              ) : (
                <span className="text-gray-600">
                  <span className="font-bold text-green-700">{product.stock}</span> in stock
                </span>
              )}
            </div>

            {product.description && (
              <p className="text-sm leading-relaxed text-gray-600">{product.description}</p>
            )}

            {/* quantity picker */}
            {!outOfStock && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-600">Quantity</span>
                <div className="flex items-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                  <button
                    onClick={() => changeQuantity(-1)}
                    disabled={quantity <= 1}
                    className="p-2.5 text-gray-500 transition-colors hover:bg-white hover:text-green-700 disabled:opacity-30"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-12 text-center font-bold text-gray-800">{quantity}</span>
                  <button
                    onClick={() => changeQuantity(1)}
                    disabled={quantity >= maxQuantity}
                    className="p-2.5 text-gray-500 transition-colors hover:bg-white hover:text-green-700 disabled:opacity-30"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                {/* line preview at the price being charged */}
                <span className="text-sm text-gray-500">
                  = <span className="font-bold text-[#f57224]">৳{price * quantity}</span>
                </span>
              </div>
            )}

            {/* add to cart, at the effective price */}
            <button
              onClick={handleAddToCart}
              disabled={outOfStock}
              className={`flex w-full items-center justify-center gap-2 rounded-xl py-4 text-sm font-bold uppercase tracking-tight transition-colors ${
                outOfStock
                  ? "cursor-not-allowed bg-gray-200 text-gray-400"
                  : "bg-green-700 text-white hover:bg-green-800"
              }`}
            >
              <ShoppingCart size={18} />
              {outOfStock ? "Out of Stock" : `Add to Cart — ৳${price * quantity}`}
            </button>

            {/* reassurance row */}
            <div className="flex flex-wrap gap-4 border-t border-dashed border-gray-200 pt-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <Truck size={14} className="text-green-700" /> Fast delivery
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-green-700" /> Secure checkout
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
