import {
  ChevronLeft,
  ChevronRight,
  RefreshCcw,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CartContext } from "../../context/CartContext";
import ProductPrice, { DiscountBadge } from "../product/ProductPrice";
import ProductStock from "../product/ProductStock"; // shared "N available" label
import { useGetFlashSalesQuery } from "../../features/flashSale/flashSaleApi";
import { pad2, useCountdown } from "../../hooks/useCountdown";

// Home page banner slider plus the flash sale box
const Hero = () => {
  const [current, setCurrent] = useState(0); // active slider index
  // Router and cart helpers
  const navigate = useNavigate();
  const { addToCart } = useContext(CartContext);

  // flash sale list, refetched periodically
  const { data: flashSales = [] } = useGetFlashSalesQuery(undefined, {
    pollingInterval: 30000,
  });

  // Pick the flash sale to feature: the soonest-ending running sale, falling back to the soonest-starting upcoming sale.
  const featuredSale = useMemo(() => {
    // currently running sales, soonest end first
    const running = flashSales
      .filter((fs) => fs.phase === "active")
      .sort((a, b) => new Date(a.end_at) - new Date(b.end_at));
    if (running.length > 0) return running[0];

    // otherwise fall back to soonest upcoming sale
    const upcoming = flashSales
      .filter((fs) => fs.phase === "upcoming")
      .sort((a, b) => new Date(a.start_at) - new Date(b.start_at));
    return upcoming[0] || null;
  }, [flashSales]);

  const isRunning = featuredSale?.phase === "active"; // running vs upcoming
  // Count down to the end of a running sale, or to the start of an upcoming one
  const countdownTarget = featuredSale
    ? isRunning
      ? featuredSale.end_at // counts down to end
      : featuredSale.start_at // counts down to start
    : null;
  // Time left, split into parts
  const { days, hours, minutes, seconds, expired } = useCountdown(countdownTarget);
  const h = pad2(days > 0 ? days * 24 + hours : hours); // hours display, folds in days
  const m = pad2(minutes); // minutes display
  const s = pad2(seconds); // seconds display

  const products = isRunning && !expired ? featuredSale.products.slice(0, 12) : []; // capped product grid

  // slider banner images
  const banners = [
    { id: 1, image: "/Home page pic.png" },
    { id: 2, image: "/BANER 2.jpg" },
    { id: 3, image: "/Home page pic.png" },
    { id: 4, image: "/BANER 2.jpg" },
  ];

  // Banner slider
  useEffect(() => {
    // Move to the next banner every 5 seconds
    const timer = setInterval(() => {
      setCurrent((prev) => (prev === banners.length - 1 ? 0 : prev + 1)); // advance, loop to start
    }, 5000);
    return () => clearInterval(timer); // cleanup on unmount
  }, [banners.length]);

  // service info cards data
  const serviceCards = [
    {
      title: "Free Delivery",
      description: "On orders above ৳2000",
      icon: Truck,
      iconBg: "bg-[#ff7a18]",
      cardBg: "bg-[#fff3ea]",
    },
    {
      title: "Secure Payment",
      description: "100% protected checkout",
      icon: ShieldCheck,
      iconBg: "bg-[#10c95a]",
      cardBg: "bg-[#eefbf3]",
    },
    {
      title: "Easy Returns",
      description: "7 days return policy",
      icon: RefreshCcw,
      iconBg: "bg-[#367dff]",
      cardBg: "bg-[#eef4ff]",
    },
  ];

  return (
    <div className="bg-[#eff0f5] min-h-screen w-full">
      {/* -------- SLIDER -------- */}
      <div className="flex w-full h-50 md:h-87.5 gap-1">
        {/* Sliding banners */}
        <div className="relative overflow-hidden flex-1 h-full group">
          {/* slide track, shifts by current index */}
          <div
            className="flex h-full transition-transform duration-700 ease-in-out"
            style={{ transform: `translateX(-${current * 100}%)` }}
          >
            {/* one image per banner */}
            {banners.map((b) => (
              <img
                key={b.id}
                src={b.image}
                className="min-w-full h-full object-cover"
                alt="banner"
              />
            ))}
          </div>
          {/* prev arrow, shows on hover */}
          <button
            onClick={() =>
              setCurrent(current === 0 ? banners.length - 1 : current - 1)
            }
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full z-10 transition-all opacity-0 group-hover:opacity-100"
          >
            <ChevronLeft size={24} />
          </button>
          {/* next arrow, shows on hover */}
          <button
            onClick={() =>
              setCurrent(current === banners.length - 1 ? 0 : current + 1)
            }
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full z-10 transition-all opacity-0 group-hover:opacity-100"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Fixed banner */}
        <div className="w-1/4 h-full flex flex-col gap-1 shrink-0">
          {/* top static banner */}
          <div className="flex-1 overflow-hidden">
            <img
              src="/1.png"
              className="w-full h-full object-cover"
              alt="static banner top"
            />
          </div>
          {/* bottom static banner */}
          <div className="flex-1 overflow-hidden">
            <img
              src="/2.png"
              className="w-full h-full object-cover"
              alt="static banner bottom"
            />
          </div>
        </div>
      </div>

      {/* SERVICE CARDS */}
      <div className="w-full px-4 md:px-4 mt-6 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
          {/* one card per service */}
          {serviceCards.map((card) => {
            const Icon = card.icon; // icon component for this card

            return (
              // service card
              <div
                key={card.title}
                className={`${card.cardBg} rounded-3xl p-5 md:p-6 shadow-sm border border-white/70 flex items-center gap-4 md:gap-5 transition-transform duration-300 hover:-translate-y-1 hover:shadow-md`}
              >
                {/* icon badge */}
                <div
                  className={`${card.iconBg} w-16 h-16 md:w-18 md:h-18 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm`}
                >
                  <Icon size={30} strokeWidth={2.1} />
                </div>

                <div className="min-w-0">
                  {/* card title */}
                  <h3 className="text-xl md:text-[22px] font-extrabold text-slate-800 leading-tight">
                    {card.title}
                  </h3>
                  {/* card description */}
                  <p className="text-sm md:text-base text-slate-600 mt-1 leading-snug">
                    {card.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* -------- FLASH SALE -------- */}
      {featuredSale && (
        <div className="w-full mt-4 px-4 md:px-4">
          {/* Header with Countdown Timer */}
          <div className="bg-white p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center px-6 gap-3 shadow-sm border-b border-gray-100">
            <div className="flex flex-wrap items-center gap-4">
              {/* sale name heading */}
              <h2 className="text-[#f57224] text-xl font-bold uppercase tracking-tight">
                {featuredSale.name}
              </h2>

              {/* countdown clock, hidden once expired */}
              {!expired && (
                <div className="flex items-center gap-1 text-sm font-semibold text-gray-700">
                  {/* ends/starts label */}
                  <span className="text-xs text-gray-500 uppercase tracking-wider mr-1">
                    {isRunning ? "Ends In:" : "Starts In:"}
                  </span>
                  {/* hours box */}
                  <span className="bg-[#f57224] text-white px-2 py-1 rounded text-xs font-mono">
                    {h}
                  </span>
                  <span>:</span>
                  {/* minutes box */}
                  <span className="bg-[#f57224] text-white px-2 py-1 rounded text-xs font-mono">
                    {m}
                  </span>
                  <span>:</span>
                  {/* seconds box */}
                  <span className="bg-[#f57224] text-white px-2 py-1 rounded text-xs font-mono">
                    {s}
                  </span>
                </div>
              )}

              {/* ends soon pulsing badge */}
              {isRunning && featuredSale.ends_soon && (
                <span className="rounded-full bg-red-100 px-3 py-1 text-[11px] font-bold uppercase text-red-600 animate-pulse">
                  Ends Soon
                </span>
              )}
            </div>
            {/* link to full offers page */}
            <button
              onClick={() => navigate("/offer")}
              className="text-[#f57224] text-xs font-bold border border-[#f57224] px-4 py-1.5 hover:bg-[#f57224] hover:text-white transition-all uppercase"
            >
              View All
            </button>
          </div>

          {/* Product Grid */}
          {isRunning ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6 gap-0.5 mt-0.5">
              {/* one card per sale product */}
              {products.map((item) => {
                const outOfStock = item.stock <= 0; // disable add-to-cart when true

                return (
                  // flash sale product card
                  <div
                    key={item.id}
                    className="bg-white flex flex-col justify-between border border-gray-100 hover:shadow-md transition-all group/item"
                  >
                    {/* Content Area with internal padding */}
                    <div className="p-3 pb-4">
                      {/* Image and Dynamic Discount Tag */}
                      <div className="relative">
                        {/* discount percent badge */}
                        <DiscountBadge product={item} />
                        {/* product image */}
                        <div className="w-full aspect-square mb-2 overflow-hidden">
                          <img
                            src={item.img}
                            alt={item.name}
                            className="w-full h-full object-contain group-hover/item:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = "https://placehold.co/300x300?text=Product"; // fallback image
                            }}
                          />
                        </div>
                      </div>

                      {/* Product Title */}
                      <h3 className="text-sm text-gray-800 line-clamp-2 h-10 mb-1 leading-tight hover:text-[#f57224] transition-colors">
                        {item.name}
                      </h3>

                      {/* Weight */}
                      <p className="text-xs text-gray-400 mb-1">{item.weight}</p>

                      {/* Price Section — effective price, struck normal price */}
                      <ProductPrice product={item} />

                      {/* Stock & Sold — same availability line as every other page */}
                      <ProductStock product={item} className="mt-1.5" showSold />
                    </div>

                    {/* Add to Cart Button */}
                    <button
                      disabled={outOfStock}
                      onClick={() => {
                        // Flash sale products arrive in the same shape as every other product, already priced — nothing to translate.
                        if (addToCart(item)) navigate("/cart");
                      }}
                      className={`w-full py-2 text-[12px] font-bold transition-colors uppercase tracking-tight block text-center ${
                        outOfStock
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                          : "bg-green-700 hover:bg-[#008f3f] text-white"
                      }`}
                    >
                      {outOfStock ? "Out of Stock" : "Add To Cart"}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            // upcoming sale placeholder message
            <div className="bg-white px-6 py-8 text-center text-sm text-gray-500">
              This flash sale hasn&apos;t started yet — check back when the countdown ends.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Hero;
