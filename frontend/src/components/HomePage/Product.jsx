import { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CartContext } from "../../context/CartContext";

import {
  allProductsList,
  groceryProducts,
  organicProducts,
} from "../../pages/Centraldata";

// -------------------- CATEGORY SECTION --------------------
const CategorySection = () => {
  const categories = [
    {
      id: 1,
      name: "Grocery",
      description: "Rice, flour, oil, spices & more",
      img: "/gg1.png",
      path: "/grocery",
      key: "grocery",
      cardBg: "bg-[#efb000]",
      imageBg: "bg-[#f3c43f]",
    },
    {
      id: 2,
      name: "Organic",
      description: "Organic fruits, vegetables & honey",
      img: "/organic.png",
      path: "/organic",
      key: "organic",
      cardBg: "bg-[#06c75a]",
      imageBg: "bg-[#25d56f]",
    },
    {
      id: 3,
      name: "All Products",
      description: "Browse our complete collection",
      img: "/download.png",
      path: "/all-product",
      key: "all",
      cardBg: "bg-[#ff7a00]",
      imageBg: "bg-[#ff8d24]",
    },
  ];

  const handleCategoryClick = (categoryKey) => {
    if (categoryKey !== "all") {
      let interests = JSON.parse(localStorage.getItem("user_interests")) || [];
      interests = [
        categoryKey,
        ...interests.filter((item) => item !== categoryKey),
      ].slice(0, 3);
      localStorage.setItem("user_interests", JSON.stringify(interests));
    }
  };

  return (
    <div className="w-full mt-6 px-4 md:px-4">
      <div className="mb-5 md:mb-6">
        <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
          Shop by Category
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            to={cat.path}
            onClick={() => handleCategoryClick(cat.key)}
            className={`${cat.cardBg} rounded-3xl min-h-48 md:min-h-64 p-4 text-white shadow-[0_14px_30px_rgba(15,23,42,0.10)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(15,23,42,0.14)] group flex flex-col justify-between`}
          >
            <div className="flex items-start justify-between gap-4">
              <div
                className={`${cat.imageBg} w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center overflow-hidden shadow-sm`}
              >
                <img
                  src={cat.img}
                  alt={cat.name}
                  className="w-8 h-8 md:w-9 md:h-9 object-contain transition-transform duration-300 group-hover:scale-110"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src =
                      "https://cdn-icons-png.flaticon.com/512/1170/1170576.png";
                  }}
                />
              </div>

              <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-white/15 flex items-center justify-center shrink-0 transition-all duration-300 group-hover:bg-white/25">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                  className="w-3 h-3 text-white"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 4.5l7.5 7.5-7.5 7.5"
                  />
                </svg>
              </div>
            </div>

            <div className="pt-2 md:pt-2.5">
              <h3 className="text-xl md:text-2xl font-extrabold leading-none tracking-tight">
                {cat.name}
              </h3>
              <p className="mt-2 md:mt-2.5 text-xs leading-relaxed text-white/90 max-w-44">
                {cat.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

// -------------------- PRODUCT CARD --------------------
const ProductCard = ({ product, addToCart }) => {
  const navigate = useNavigate();

  // discount price
  const discountPercentage = product.oldPrice
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : 0;

  const handleProductClick = () => {
    if (product.category) {
      let interests = JSON.parse(localStorage.getItem("user_interests")) || [];
      interests = [
        product.category,
        ...interests.filter((item) => item !== product.category),
      ].slice(0, 3);
      localStorage.setItem("user_interests", JSON.stringify(interests));
    }
    navigate(`/product/${product.id}`);
  };

  return (
    <div
      onClick={handleProductClick}
      className="bg-white flex flex-col justify-between border-r border-b border-gray-200 hover:shadow-xl hover:z-10 transition-all duration-200 group/card cursor-pointer relative"
    >
      {/* cart body*/}
      <div className="p-3 pb-4">
        <div className="w-full aspect-square mb-2 overflow-hidden relative">
          {/* discount red badge */}
          {discountPercentage > 0 && (
            <span className="absolute top-2 left-2 inline-flex items-center justify-center rounded-lg bg-[#ff2d37] px-2.5 py-1 text-[11px] font-extrabold leading-none text-white shadow-sm z-10">
              -{discountPercentage}%
            </span>
          )}

          <img
            src={product.img}
            alt={product.name}
            className="w-full h-full object-contain transition-transform duration-300 group-hover/card:scale-102"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "https://placehold.co/150x150?text=Product";
            }}
          />
        </div>

        <h3 className="text-sm text-gray-800 line-clamp-2 h-10 mb-1 leading-snug hover:text-[#f57224] transition-colors">
          {product.name}
        </h3>

        <p className="text-[11px] text-gray-400 mb-2">
          {product.weight || "1 Unit"}
        </p>

        {/* প্রাইস এবং ওল্ড প্রাইস পাশাপাশি এলাইন করার জন্য flex row এবং items-baseline ব্যবহার করা হয়েছে */}
        <div className="flex items-baseline gap-2 mt-1">
          {/* বর্তমান মূল্য */}
          <span className="text-[#f57224] font-semibold text-lg leading-none">
            ৳{product.price}
          </span>

          {product.oldPrice && (
            <span className="text-gray-400 line-through text-xs leading-none">
              ৳{product.oldPrice}
            </span>
          )}
        </div>
      </div>

      {/* cart button*/}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          addToCart(product);
          navigate("/cart");
        }}
        className="w-full bg-green-600 text-white py-2.5 text-[12px] font-bold transition-colors uppercase tracking-tight block hover:bg-green-700"
      >
        Add To Cart
      </button>
    </div>
  );
};

// -------------------- PRODUCT SECTION --------------------
const ProductSection = ({ title, products, addToCart, viewAllPath }) => {
  const navigate = useNavigate();

  return (
    <div className="w-full mt-4 px-4 md:px-4">
      <div className="bg-white p-4 flex justify-between items-center px-6 shadow-sm border-b border-gray-100">
        <h2 className="text-[#f57224] text-xl font-bold uppercase tracking-tight italic">
          {title}
        </h2>
        {viewAllPath && (
          <button
            onClick={() => navigate(viewAllPath)}
            className="text-[#f57224] text-xs font-bold border border-[#f57224] px-4 py-1.5 hover:bg-[#f57224] hover:text-white transition-all uppercase"
          >
            View All
          </button>
        )}
      </div>

      {/* grid no gap*/}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6 bg-[#eff0f5] border-t border-l border-gray-200 gap-1">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            addToCart={addToCart}
          />
        ))}
      </div>
    </div>
  );
};

// -------------------- MAIN PAGE --------------------
const Product = () => {
  const { addToCart } = useContext(CartContext);
  const [forYouProducts, setForYouProducts] = useState([]);

  const homeGrocery = groceryProducts.slice(0, 6);
  const homeOrganic = organicProducts.slice(0, 6);
  const homeAllProducts = allProductsList.slice(0, 12);

  useEffect(() => {
    const userInterests =
      JSON.parse(localStorage.getItem("user_interests")) || [];

    if (userInterests.length > 0) {
      const matchedProducts = allProductsList.filter((product) =>
        userInterests.includes(product.category),
      );

      if (matchedProducts.length < 4) {
        const remainingProducts = allProductsList.filter(
          (p) => !matchedProducts.find((m) => m.id === p.id),
        );
        const combined = [...matchedProducts, ...remainingProducts].slice(0, 6);
        setForYouProducts(combined);
      } else {
        setForYouProducts(matchedProducts.slice(0, 6));
      }
    } else {
      const defaultRecommendations = [
        groceryProducts[0],
        organicProducts[0],
        organicProducts[1],
      ].filter(Boolean);
      setForYouProducts(defaultRecommendations.slice(0, 6));
    }
  }, []);

  return (
    <div className="bg-[#eff0f5] min-h-screen w-full pb-10">
      <CategorySection />

      {forYouProducts.length > 0 && (
        <ProductSection
          title="Just For You"
          products={forYouProducts}
          addToCart={addToCart}
        />
      )}

      <ProductSection
        title="Grocery Products"
        products={homeGrocery}
        addToCart={addToCart}
        viewAllPath="/grocery"
      />

      <ProductSection
        title="Organic Products"
        products={homeOrganic}
        addToCart={addToCart}
        viewAllPath="/organic"
      />

      <ProductSection
        title="All Products"
        products={homeAllProducts}
        addToCart={addToCart}
        viewAllPath="/all-product"
      />
    </div>
  );
};

export default Product;
