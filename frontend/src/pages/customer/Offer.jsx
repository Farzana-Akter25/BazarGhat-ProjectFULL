import { ArrowRight, BadgePercent, Clock, Flame, Tag, Zap } from "lucide-react";
import { useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import ProductPrice, { DiscountBadge } from "../../components/product/ProductPrice";
import ProductStock from "../../components/product/ProductStock"; // shared "N available" label
import { CartContext } from "../../context/CartContext";
import { useGetFlashSalesQuery } from "../../features/flashSale/flashSaleApi";
import { useGetProductsQuery } from "../../features/product/productApi";
import useAuth from "../../hooks/useAuth";
import { pad2, useCountdown } from "../../hooks/useCountdown";
import { getCartRedirectForRole } from "../../utils/cartAccess";

// Countdown pill.
const SaleCountdown = ({ sale }) => {
  // Count down to the end of a running sale, or to the start of an upcoming one
  const isRunning = sale.phase === "active";
  const { days, hours, minutes, seconds, expired } = useCountdown(
    isRunning ? sale.end_at : sale.start_at,
  );

  if (expired) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-white/80">
        {isRunning ? "Ends in" : "Starts in"}
      </span>
      <div className="flex items-center gap-1 font-mono text-sm font-bold text-white">
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
  );
};

// One product tile.
const FlashSaleCard = ({ product, isRunning, onAddToCart }) => {
  // Out of stock?
  const outOfStock = product.inStock === false || product.stock <= 0;

  return (
    <div className="group/card relative flex flex-col justify-between border-b border-r border-gray-200 bg-white transition-all duration-200 hover:z-10 hover:shadow-xl">
      <div className="p-3 pb-4">
        <div className="relative mb-2 aspect-square w-full overflow-hidden">
          {/* saving badge, driven by the effective price */}
          {isRunning ? (
            <DiscountBadge product={product} />
          ) : (
            product.flash_sale_discount_percentage > 0 && (
              <span className="absolute left-2 top-2 z-10 rounded-lg bg-slate-700 px-2.5 py-1 text-[11px] font-extrabold leading-none text-white shadow-sm">
                soon -{product.flash_sale_discount_percentage}%
              </span>
            )
          )}

          <img
            src={product.img}
            alt={product.name}
            className="h-full w-full object-contain transition-transform duration-300 group-hover/card:scale-105"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "https://placehold.co/300x300?text=Product";
            }}
          />
        </div>

        {/* product name */}
        <h3 className="mb-1 line-clamp-2 h-10 text-sm leading-snug text-gray-800 transition-colors hover:text-[#f57224]">
          {product.name}
        </h3>

        {/* unit/weight */}
        <p className="mb-2 text-[11px] text-gray-400">{product.weight || "1 Unit"}</p>

        {/* while running this is the sale price struck against the normal selling price; before it starts it's simply the normal price */}
        <ProductPrice product={product} />

        {/* the sale hasn't started, so this is still the normal price — say what it will become rather than pretending the deal is live */}
        {!isRunning && (
          <p className="mt-1 text-[11px] font-semibold text-slate-500">
            ৳{product.flash_sale_price} when the sale starts
          </p>
        )}

        {/* stock — the product's own pool, shown exactly as on every other page */}
        <ProductStock product={product} className="mt-1.5" showSold />
      </div>

      {/* Add to cart at the effective price. */}
      <button
        disabled={outOfStock}
        onClick={() => onAddToCart(product)}
        className={`block w-full py-2.5 text-[12px] font-bold uppercase tracking-tight transition-colors ${
          outOfStock
            ? "cursor-not-allowed bg-gray-300 text-gray-500"
            : "bg-green-700 text-white hover:bg-green-800"
        }`}
      >
        {outOfStock ? "Out of Stock" : isRunning ? "Add To Cart" : "Buy At Normal Price"}
      </button>
    </div>
  );
};

// Offers page: running and upcoming flash sales
const Offer = () => {
  // Router, cart and login helpers
  const navigate = useNavigate();
  const { addToCart } = useContext(CartContext);
  const { user } = useAuth();
  const roleRedirect = getCartRedirectForRole(user?.role); // non-customer roles bounce to their own dashboard

  // Running + upcoming sales.
  const { data: flashSales = [], isLoading } = useGetFlashSalesQuery(undefined, {
    pollingInterval: 30000,
  });

  // Everything else that's discounted.
  const { data: allProducts = [] } = useGetProductsQuery({ per_page: 100 });

  // Sales running now
  const runningSales = useMemo(
    () => flashSales.filter((sale) => sale.phase === "active"),
    [flashSales],
  );
  // Sales starting later
  const upcomingSales = useMemo(
    () => flashSales.filter((sale) => sale.phase === "upcoming"),
    [flashSales],
  );

  // Discounted products that aren't currently driven by a flash sale, biggest saving first.
  const otherOffers = useMemo(
    () =>
      allProducts
        .filter((product) => !product.on_flash_sale && product.discount_percentage > 0)
        .sort((a, b) => b.discount_percentage - a.discount_percentage || a.price - b.price),
    [allProducts],
  );

  // Header stats cover everything actually discounted on the page, so they don't read "0" whenever no flash sale happens to be running.
  const liveProductCount =
    runningSales.reduce((total, sale) => total + sale.products.length, 0) + otherOffers.length;

  // Biggest discount among running sales
  const topDiscount = Math.max(
    0,
    ...runningSales.flatMap((sale) => sale.products.map((p) => p.discount_percentage || 0)),
    ...otherOffers.map((p) => p.discount_percentage || 0),
  );

  // Add to cart, or send non-customers to their dashboard
  const handleAddToCart = (product) => {
    if (roleRedirect) {
      navigate(roleRedirect);
      return;
    }
    if (addToCart(product)) navigate("/cart");
  };

  // Render one sale with its countdown and products
  const renderSale = (sale) => {
    const isRunning = sale.phase === "active";

    return (
      <section key={sale.id} className="mb-10">
        {/* sale header with countdown */}
        <div
          className={`flex flex-col gap-3 rounded-t-2xl px-6 py-4 sm:flex-row sm:items-center sm:justify-between ${
            isRunning
              ? "bg-linear-to-r from-[#ff7a18] to-[#ff2d37]"
              : "bg-linear-to-r from-slate-600 to-slate-800"
          }`}
        >
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="flex items-center gap-2 text-xl font-extrabold uppercase tracking-tight text-white">
              <Zap size={20} />
              {sale.name}
            </h2>
            {!isRunning && (
              <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase text-white">
                Upcoming
              </span>
            )}
            {isRunning && sale.ends_soon && (
              <span className="animate-pulse rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase text-[#ff2d37]">
                Ends Soon
              </span>
            )}
          </div>

          <SaleCountdown sale={sale} />
        </div>

        {/* products in this sale */}
        <div className="grid grid-cols-2 border-l border-t border-gray-200 bg-[#eff0f5] sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {sale.products.map((product) => (
            <FlashSaleCard
              key={product.id}
              product={product}
              isRunning={isRunning}
              onAddToCart={handleAddToCart}
            />
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-[#eff0f5] text-slate-900">
      {/* hero banner */}
      <section className="relative overflow-hidden bg-linear-to-r from-[#ff7a18] via-[#ff4d2e] to-[#ff2d37] text-white">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_left,white,transparent_35%),radial-gradient(circle_at_bottom_right,white,transparent_30%)]" />
        <div className="relative mx-auto flex max-w-7xl flex-col gap-6 px-4 py-14 md:flex-row md:items-end md:justify-between md:px-6 md:py-16">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur-sm">
              <Flame size={16} />
              Flash Sale
            </div>
            <h1 className="text-4xl font-black leading-tight md:text-6xl">
              Limited-time prices, straight from your store
            </h1>
            <p className="mt-4 max-w-xl text-base text-white/90 md:text-lg">
              Flash sale prices apply everywhere on the site while the countdown
              runs — and revert to the normal price the moment it ends.
            </p>
          </div>

          {/* live stats */}
          <div className="grid grid-cols-2 gap-3 rounded-3xl bg-white/10 p-4 backdrop-blur-sm md:min-w-70 md:grid-cols-1">
            <div className="rounded-2xl bg-white/15 px-4 py-4">
              <p className="text-sm text-white/80">Products on sale now</p>
              <p className="mt-1 text-3xl font-black">{liveProductCount}</p>
            </div>
            <div className="rounded-2xl bg-white/15 px-4 py-4">
              <p className="text-sm text-white/80">Top discount</p>
              <p className="mt-1 text-3xl font-black">{topDiscount}%</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
        {isLoading ? (
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
            <p className="text-gray-500">Loading flash sales...</p>
          </div>
        ) : (
          <>
            {/* nothing scheduled — every product is simply at its normal price */}
            {runningSales.length === 0 && upcomingSales.length === 0 && (
              <div className="mb-10 rounded-3xl bg-white p-10 text-center shadow-sm">
                <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-orange-400">
                  <Clock size={28} />
                </span>
                <p className="text-lg font-bold text-gray-600">No flash sales running right now</p>
                <p className="mt-1 text-sm text-gray-400">
                  {otherOffers.length > 0
                    ? "Check back soon — here are the best standing offers meanwhile."
                    : "Check back soon — products are at their normal price for now."}
                </p>
              </div>
            )}

            {runningSales.map(renderSale)}

            {upcomingSales.length > 0 && (
              <div className="mb-5 mt-2 flex items-center gap-2 text-sm font-semibold text-slate-500">
                <BadgePercent size={16} />
                Coming up next
              </div>
            )}
            {upcomingSales.map(renderSale)}

            {/* standing discounts, so this page is never empty */}
            {otherOffers.length > 0 && (
              <section className="mb-6">
                <div className="flex flex-col gap-1 rounded-t-2xl bg-white px-6 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="flex items-center gap-2 text-xl font-extrabold uppercase tracking-tight text-[#f57224]">
                    <Tag size={20} />
                    More Offers
                  </h2>
                  <p className="text-xs text-slate-400">
                    Everyday savings · biggest discount first
                  </p>
                </div>

                <div className="grid grid-cols-2 border-l border-t border-gray-200 bg-[#eff0f5] sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {otherOffers.map((product) => {
                    const outOfStock = product.inStock === false || product.stock <= 0;

                    return (
                      <div
                        key={product.id}
                        className="group/card relative flex cursor-pointer flex-col justify-between border-b border-r border-gray-200 bg-white transition-all duration-200 hover:z-10 hover:shadow-xl"
                        onClick={() => navigate(`/product/${product.id}`)}
                      >
                        <div className="p-3 pb-4">
                          <div className="relative mb-2 aspect-square w-full overflow-hidden">
                            <DiscountBadge product={product} />
                            <img
                              src={product.img}
                              alt={product.name}
                              className="h-full w-full object-contain transition-transform duration-300 group-hover/card:scale-105"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = "https://placehold.co/300x300?text=Product";
                              }}
                            />
                          </div>

                          <h3 className="mb-1 line-clamp-2 h-10 text-sm leading-snug text-gray-800">
                            {product.name}
                          </h3>
                          <p className="mb-2 text-[11px] text-gray-400">
                            {product.weight || "1 Unit"}
                          </p>

                          {/* how many are actually available right now */}
                          <ProductStock product={product} className="mb-2" />

                          {/* same price component as everywhere else */}
                          <ProductPrice product={product} />
                        </div>

                        <button
                          disabled={outOfStock}
                          onClick={(e) => {
                            e.stopPropagation(); // don't trigger the card's navigation
                            handleAddToCart(product);
                          }}
                          className={`block w-full py-2.5 text-[12px] font-bold uppercase tracking-tight transition-colors ${
                            outOfStock
                              ? "cursor-not-allowed bg-gray-300 text-gray-500"
                              : "bg-green-700 text-white hover:bg-green-800"
                          }`}
                        >
                          {outOfStock ? "Out of Stock" : "Add To Cart"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}

        {/* browse all products */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => navigate("/all-product")}
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Browse all products
            <ArrowRight size={16} />
          </button>
        </div>
      </section>
    </div>
  );
};

export default Offer;
