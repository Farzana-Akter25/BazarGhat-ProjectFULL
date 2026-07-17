import {
  ChevronLeft,
  ChevronRight,
  RefreshCcw,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CartContext } from "../../context/CartContext";

const Hero = () => {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();
  const { addToCart } = useContext(CartContext);

  // Flash sale timer
  const [timeLeft, setTimeLeft] = useState(3 * 60 * 60);

  const banners = [
    { id: 1, image: "/Home page pic.png" },
    { id: 2, image: "/BANER 2.jpg" },
    { id: 3, image: "/Home page pic.png" },
    { id: 4, image: "/BANER 2.jpg" },
  ];

  // Product list
  const products = [
    {
      id: 1,
      name: "Vegetable Oil 1L Pure & Healthy Fresh Oil",
      image: "/Vegetable-Oil.webp",
      price: 500,
      oldPrice: 550,
      weight: "1L",
    },
    {
      id: 2,
      name: "Poteto Cracker",
      image: "/chips.png",
      price: 20,
      oldPrice: 25,
      weight: "50g",
    },
    {
      id: 3,
      name: "Black Rice",
      image: "/blackrice.png",
      price: 200,
      oldPrice: 300,
      weight: "1kg",
    },
    {
      id: 4,
      name: "Pran Tometo Sauce",
      image: "/tometo sause.png",
      price: 90,
      oldPrice: 120,
      weight: "1kg",
    },
    {
      id: 5,
      name: "Coca Cola",
      image: "/cocacola.png",
      price: 80,
      oldPrice: 100,
      weight: "1L",
    },
    {
      id: 6,
      name: "Fresh Red Tomatoes 1kg Premium Quality",
      image: "/tomatoes_300x.avif",
      price: 28,
      oldPrice: 30,
      weight: "1kg",
    },
    {
      id: 7,
      name: "Lays",
      image: "/Lays new.png",
      price: 500,
      oldPrice: 550,
      weight: "1L",
    },
    {
      id: 8,
      name: "Pop Corn",
      image: "/pop corn new.png",
      price: 20,
      oldPrice: 25,
      weight: "500g",
    },
    {
      id: 9,
      name: "Grap Juice",
      image: "/juice.png",
      price: 200,
      oldPrice: 300,
      weight: "1kg",
    },
    {
      id: 10,
      name: "Family Fun Pack",
      image: "/Family fun pack.png",
      price: 90,
      oldPrice: 120,
      weight: "1kg",
    },
    {
      id: 11,
      name: "Orange Juice",
      image: "/orange juice.png",
      price: 80,
      oldPrice: 100,
      weight: "500ml",
    },
    {
      id: 12,
      name: "Kurkure",
      image: "/Kurkure new.png",
      price: 40,
      oldPrice: 60,
      weight: "100g",
    },
  ];

  // Banner slider
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev === banners.length - 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  // count down
  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  // hh:mm:ss
  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600)
      .toString()
      .padStart(2, "0");
    const m = Math.floor((seconds % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return { h, m, s };
  };

  const { h, m, s } = formatTime(timeLeft);

  const serviceCards = [
    {
      title: "Free Delivery",
      description: "On orders above ৳500",
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
      <div className="relative overflow-hidden w-full h-50 md:h-87.5 group">
        <div
          className="flex h-full transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {banners.map((b) => (
            <img
              key={b.id}
              src={b.image}
              className="min-w-full h-full object-cover"
              alt="banner"
            />
          ))}
        </div>
        <button
          onClick={() =>
            setCurrent(current === 0 ? banners.length - 1 : current - 1)
          }
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full z-10 transition-all opacity-0 group-hover:opacity-100"
        >
          <ChevronLeft size={24} />
        </button>
        <button
          onClick={() =>
            setCurrent(current === banners.length - 1 ? 0 : current + 1)
          }
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full z-10 transition-all opacity-0 group-hover:opacity-100"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {/* -------- SERVICE CARDS -------- */}
      <div className="w-full px-4 md:px-4 mt-6 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
          {serviceCards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.title}
                className={`${card.cardBg} rounded-3xl p-5 md:p-6 shadow-sm border border-white/70 flex items-center gap-4 md:gap-5 transition-transform duration-300 hover:-translate-y-1 hover:shadow-md`}
              >
                <div
                  className={`${card.iconBg} w-16 h-16 md:w-18 md:h-18 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm`}
                >
                  <Icon size={30} strokeWidth={2.1} />
                </div>

                <div className="min-w-0">
                  <h3 className="text-xl md:text-[22px] font-extrabold text-slate-800 leading-tight">
                    {card.title}
                  </h3>
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
      <div className="w-full mt-4 px-4 md:px-4">
        {/* Header with Countdown Timer */}
        <div className="bg-white p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center px-6 gap-3 shadow-sm border-b border-gray-100">
          <div className="flex flex-wrap items-center gap-4">
            <h2 className="text-[#f57224] text-xl font-bold uppercase tracking-tight">
              Flash Sale
            </h2>

            {/* count down design*/}
            <div className="flex items-center gap-1 text-sm font-semibold text-gray-700">
              <span className="text-xs text-gray-500 uppercase tracking-wider mr-1">
                Ends In:
              </span>
              <span className="bg-[#f57224] text-white px-2 py-1 rounded text-xs font-mono">
                {h}
              </span>
              <span>:</span>
              <span className="bg-[#f57224] text-white px-2 py-1 rounded text-xs font-mono">
                {m}
              </span>
              <span>:</span>
              <span className="bg-[#f57224] text-white px-2 py-1 rounded text-xs font-mono">
                {s}
              </span>
            </div>
          </div>
          <button className="text-[#f57224] text-xs font-bold border border-[#f57224] px-4 py-1.5 hover:bg-[#f57224] hover:text-white transition-all uppercase">
            View All
          </button>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6 gap-0.5 mt-0.5">
          {products.map((item) => {
            // dynamic discount percentage calculation
            const discountPercentage = Math.round(
              ((item.oldPrice - item.price) / item.oldPrice) * 100,
            );

            return (
              <div
                key={item.id}
                className="bg-white flex flex-col justify-between border border-gray-100 hover:shadow-md transition-all group/item"
              >
                {/* Content Area with internal padding */}
                <div className="p-3 pb-4">
                  {/* Image and Dynamic Discount Tag */}
                  <div className="relative">
                    {discountPercentage > 0 && (
                      <span className="absolute top-2 left-2 inline-flex items-center justify-center rounded-lg bg-[#ff2d37] px-2.5 py-1 text-[11px] font-extrabold leading-none text-white shadow-sm z-10">
                        -{discountPercentage}%
                      </span>
                    )}
                    <div className="w-full aspect-square mb-2 overflow-hidden">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-contain group-hover/item:scale-105 transition-transform duration-300"
                      />
                    </div>
                  </div>

                  {/* Product Title */}
                  <h3 className="text-sm text-gray-800 line-clamp-2 h-10 mb-1 leading-tight hover:text-[#f57224] transition-colors">
                    {item.name}
                  </h3>

                  {/* Weight */}
                  <p className="text-xs text-gray-400 mb-2">{item.weight}</p>

                  {/* Price Section */}
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[#f57224] font-bold text-lg leading-none">
                      ৳{item.price}
                    </span>
                    <span className="text-gray-400 line-through text-xs leading-none">
                      ৳{item.oldPrice}
                    </span>
                  </div>
                </div>

                {/* Add to Cart Button */}
                <button
                  onClick={() => {
                    addToCart(item);
                    navigate("/cart");
                  }}
                  className="w-full bg-[#00aa4b] hover:bg-[#008f3f] text-white py-2 text-[12px] font-bold transition-colors uppercase tracking-tight block text-center"
                >
                  Add To Cart
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Hero;
