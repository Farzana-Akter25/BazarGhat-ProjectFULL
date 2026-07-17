import { ArrowRight, BadgePercent, Flame } from "lucide-react";
import { useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CartContext } from "../context/CartContext";
import { allProductsList } from "./Centraldata";

const Offer = () => {
  const navigate = useNavigate();
  const { addToCart } = useContext(CartContext);

  const offerProducts = useMemo(() => {
    return allProductsList
      .map((product) => {
        const discountPercentage = product.oldPrice
          ? Math.round(
              ((product.oldPrice - product.price) / product.oldPrice) * 100,
            )
          : 0;

        return {
          ...product,
          discountPercentage,
        };
      })
      .filter((product) => product.discountPercentage > 0)
      .sort(
        (a, b) =>
          b.discountPercentage - a.discountPercentage || a.price - b.price,
      );
  }, []);

  const featuredOffers = offerProducts.slice(0, 12);
  const highestOffer = featuredOffers[0]?.discountPercentage || 0;

  return (
    <div className="min-h-screen bg-[#eff0f5] text-slate-900">
      <section className="relative overflow-hidden bg-linear-to-r from-[#ff7a18] via-[#ff4d2e] to-[#ff2d37] text-white">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_left,white,transparent_35%),radial-gradient(circle_at_bottom_right,white,transparent_30%)]" />
        <div className="relative mx-auto flex max-w-7xl flex-col gap-6 px-4 py-14 md:flex-row md:items-end md:justify-between md:px-6 md:py-16">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur-sm">
              <Flame size={16} />
              Best Offer Products
            </div>
            <h1 className="text-4xl font-black leading-tight md:text-6xl">
              Highest discount products from your store
            </h1>
            <p className="mt-4 max-w-xl text-base text-white/90 md:text-lg">
              Real products from your catalog, sorted by the biggest discounts
              first.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-3xl bg-white/10 p-4 backdrop-blur-sm md:min-w-70 md:grid-cols-1">
            <div className="rounded-2xl bg-white/15 px-4 py-4">
              <p className="text-sm text-white/80">Products on offer</p>
              <p className="mt-1 text-3xl font-black">
                {featuredOffers.length}
              </p>
            </div>
            <div className="rounded-2xl bg-white/15 px-4 py-4">
              <p className="text-sm text-white/80">Top discount</p>
              <p className="mt-1 text-3xl font-black">{highestOffer}%</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 md:text-3xl">
              Top Offer Products
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Sorted by highest savings first
            </p>
          </div>
          <div className="hidden items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#ff4d2e] shadow-sm md:flex">
            <BadgePercent size={16} />
            Limited time deals
          </div>
        </div>

        {featuredOffers.length === 0 ? (
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
            <p className="text-gray-500">
              No discounted products available right now.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-6 bg-[#eff0f5] border-t border-l border-gray-200">
            {featuredOffers.map((product) => {
              const finalPrice = Math.round(
                product.price -
                  (product.price * product.discountPercentage) / 100,
              );

              return (
                <div
                  key={product.id}
                  className="group flex flex-col overflow-hidden bg-white border-r border-b border-gray-200 transition hover:shadow-lg hover:z-10"
                >
                  <div className="relative aspect-square bg-white p-2.5 pb-1.5">
                    <span className="absolute left-2 top-2 inline-flex items-center justify-center rounded-lg bg-[#ff2d37] px-2.5 py-1 text-[11px] font-extrabold leading-none text-white shadow-sm z-10">
                      -{product.discountPercentage}%
                    </span>
                    <img
                      src={product.img}
                      alt={product.name}
                      className="h-full w-full object-contain transition duration-300 group-hover:scale-105"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src =
                          "https://placehold.co/300x300?text=Product";
                      }}
                    />
                  </div>

                  <div className="flex min-h-36 grow flex-col px-3 pb-3 pt-1.5">
                    <h3 className="h-9 line-clamp-2 text-[13px] leading-snug text-slate-800 hover:text-[#ff4d2e] transition-colors">
                      {product.name}
                    </h3>
                    <p className="mt-1 text-[10px] text-slate-400">
                      {product.weight || "1 Unit"}
                    </p>

                    <div className="mt-2.5 flex items-baseline gap-2">
                      <span className="text-base font-bold leading-none text-[#ff4d2e]">
                        ৳{finalPrice}
                      </span>
                      <span className="text-[11px] leading-none text-slate-400 line-through">
                        ৳{product.price}
                      </span>
                    </div>

                    <button
                      onClick={() => addToCart(product)}
                      className="mt-3 w-full bg-[#00aa4b] py-2 text-[12px] font-bold uppercase tracking-tight text-white transition-colors hover:bg-[#008f3f]"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

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
