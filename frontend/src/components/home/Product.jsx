import { useContext, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CartContext } from "../../context/CartContext"; // cart state + addToCart
import ProductPrice, { DiscountBadge } from "../product/ProductPrice"; // shared effective-price display
import ProductStock from "../product/ProductStock"; // shared "N available" label
import { useGetProductsQuery } from "../../features/product/productApi"; // fetch products from api
import useAuth from "../../hooks/useAuth"; // current logged in user
import { getCartRedirectForRole } from "../../utils/cartAccess"; // block cart for non-customer roles

// -------------------- CATEGORY SECTION --------------------
const CategorySection = () => {
  // category cards data
  const categories = [
    {
      id: 1,
      name: "Grocery", // card title
      description: "Rice, flour, oil, spices & more", // card subtext
      img: "/gg1.png", // unused image ref
      path: "/grocery", // link target
      key: "grocery", // interest tracking key
      cardBg: "bg-[#efb000]", // card background color
      imageBg: "bg-[#f3c43f]", // unused image bg color
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

  return (
    // shop by category section
    <div className="w-full mt-6 px-4 md:px-4">
      {/* section heading */}
      <div className="mb-5 md:mb-6 flex items-end justify-between">
        <div>
          {/* heading text */}
          <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
            Shop by Category
          </h2>
        </div>
      </div>

      {/* category cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        {categories.map((cat) => (
          // single category card, colored per category
          <Link
            key={cat.id}
            to={cat.path}
            className={`${cat.cardBg} relative isolate overflow-hidden rounded-3xl min-h-48 md:min-h-64 p-4 text-white shadow-[0_14px_30px_rgba(15,23,42,0.10)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_44px_rgba(15,23,42,0.20)] group flex flex-col justify-between`}
          >
            {/* decorative glow */}
            <span className="pointer-events-none absolute -right-8 -top-10 w-36 h-36 rounded-full bg-white/10 blur-2xl transition-transform duration-500 group-hover:scale-125" />
            {/* decorative bottom shadow blob */}
            <span className="pointer-events-none absolute -left-10 -bottom-14 w-32 h-32 rounded-full bg-black/10 blur-3xl" />
            {/* subtle ring on hover */}
            <span className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/0 transition-all duration-300 group-hover:ring-white/25" />

            {/* arrow icon top row */}
            <div className="relative flex items-start justify-end">
              {/* circular arrow button */}
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0 transition-all duration-300 group-hover:bg-white group-hover:translate-x-0.5">
                {/* chevron right svg */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                  className="w-3 h-3 text-white transition-colors duration-300 group-hover:text-slate-900"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 4.5l7.5 7.5-7.5 7.5"
                  />
                </svg>
              </div>
            </div>

            {/* card text block */}
            <div className="relative pt-2 md:pt-2.5">
              {/* category name */}
              <h3 className="text-xl md:text-2xl font-extrabold leading-none tracking-tight">
                {cat.name}
              </h3>
              {/* category description */}
              <p className="mt-2 md:mt-2.5 text-xs leading-relaxed text-white/90 max-w-44">
                {cat.description}
              </p>
              {/* underline accent, grows on hover */}
              <span className="mt-3 inline-block h-0.5 w-8 rounded-full bg-white/50 transition-all duration-300 group-hover:w-14 group-hover:bg-white" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

// -------------------- PRODUCT CARD --------------------
const ProductCard = ({ product, addToCart }) => {
  // Router helper
  const navigate = useNavigate();
  const { user } = useAuth(); // logged in user, if any
  const roleRedirect = getCartRedirectForRole(user?.role); // non-customer roles get redirected instead of adding to cart
  // out of stock check
  const outOfStock = product.inStock === false || product.stock <= 0;

  // goes to product detail page
  const handleProductClick = () => navigate(`/product/${product.id}`);

  return (
    // whole card is clickable
    <div
      onClick={handleProductClick}
      className="bg-white flex flex-col justify-between border-r border-b border-gray-200 hover:shadow-xl hover:z-10 transition-all duration-200 group/card cursor-pointer relative"
    >
      {/* cart body */}
      <div className="p-3 pb-4">
        {/* product image wrapper */}
        <div className="w-full aspect-square mb-2 overflow-hidden relative">
          {/* discount red badge, flash sale aware */}
          <DiscountBadge product={product} />

          {/* product image, falls back to placeholder on error */}
          <img
            src={product.img}
            alt={product.name}
            className="w-full h-full object-contain transition-transform duration-300 group-hover/card:scale-102"
            onError={(e) => {
              e.target.onerror = null; // avoid error loop
              e.target.src = "https://placehold.co/150x150?text=Product"; // fallback image
            }}
          />
        </div>

        {/* product name */}
        <h3 className="text-sm text-gray-800 line-clamp-2 h-10 mb-1 leading-snug hover:text-[#f57224] transition-colors">
          {product.name}
        </h3>

        {/* unit/weight label */}
        <p className="text-[11px] text-gray-400 mb-2">
          {product.weight || "1 Unit"}
        </p>

        {/* how many are actually available right now */}
        <ProductStock product={product} className="mb-2" />


        <ProductPrice product={product} className="mt-1" />
      </div>

      {/* cart button */}
      <button
        disabled={outOfStock}
        onClick={(e) => {
          e.preventDefault(); // don't trigger card click nav
          e.stopPropagation(); // don't bubble to card onClick
          if (roleRedirect) {
            navigate(roleRedirect); // send non-customer elsewhere
            return;
          }
          if (addToCart(product)) navigate("/cart"); // add then go to cart
        }}
        className={`w-full py-2.5 text-[12px] font-bold transition-colors uppercase tracking-tight block ${
          outOfStock
            ? "bg-gray-300 text-gray-500 cursor-not-allowed" // disabled look
            : "bg-green-700 text-white hover:bg-green-800" // active look
        }`}
      >
        {outOfStock ? "Out of Stock" : "Add To Cart"}
      </button>
    </div>
  );
};

// -------------------- PRODUCT SECTION --------------------
const ProductSection = ({ title, products, addToCart, viewAllPath }) => {
  const navigate = useNavigate();

  return (
    // one product row section (title + grid)
    <div className="w-full mt-4 px-4 md:px-4">
      {/* section header: title + view all */}
      <div className="bg-white p-4 flex justify-between items-center px-6 shadow-sm border-b border-gray-100">
        {/* section title */}
        <h2 className="text-[#f57224] text-xl font-bold uppercase tracking-tight italic">
          {title}
        </h2>
        {/* view all button, only if path given */}
        {viewAllPath && (
          <button
            onClick={() => navigate(viewAllPath)}
            className="text-[#f57224] text-xs font-bold border border-[#f57224] px-4 py-1.5 hover:bg-[#f57224] hover:text-white transition-all uppercase"
          >
            View All
          </button>
        )}
      </div>

      {/* grid no gap */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6 bg-[#eff0f5] border-t border-l border-gray-200 gap-1">
        {products.map((product) => (
          // one product card per item
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
const BEST_SELLER_LIMIT = 12; // how many products the "just for you" row shows
const MIN_BEST_SELLERS = 6; // below this the row gets topped up so it isn't half empty

// Home page product sections (best sellers, organic, all products)
const Product = () => {
  const { addToCart } = useContext(CartContext); // cart add function

  const { data: allProductsList = [] } = useGetProductsQuery({ per_page: 100 }); // fetch all products

  // filter products by category
  const groceryProducts = useMemo(
    () => allProductsList.filter((p) => p.category?.toLowerCase() === "grocery"),
    [allProductsList],
  );
  // Organic products only
  const organicProducts = useMemo(
    () => allProductsList.filter((p) => p.category?.toLowerCase() === "organic"),
    [allProductsList],
  );

  const homeGrocery = groceryProducts.slice(0, 6); // grocery row limit
  const homeOrganic = organicProducts.slice(0, 6); // organic row limit

  // newest first, so this row doesn't just repeat the best sellers above
  const homeAllProducts = useMemo(
    () => [...allProductsList].sort((a, b) => b.id - a.id).slice(0, 12),
    [allProductsList],
  );

  // "just for you" = best selling products (sold_count comes from the api, counting only orders that weren't cancelled or rejected)
  const forYouProducts = useMemo(() => {
    // Best sellers: products that sold, highest first
    const sold = allProductsList
      .filter((p) => (p.sold_count ?? 0) > 0) // only products that actually sold
      .sort((a, b) => b.sold_count - a.sold_count); // highest selling first

    if (sold.length >= MIN_BEST_SELLERS) return sold.slice(0, BEST_SELLER_LIMIT);

    // new shop with few sales yet, top up with the rest so the row stays full
    const rest = allProductsList.filter(
      (p) => !sold.some((s) => s.id === p.id),
    );
    return [...sold, ...rest].slice(0, BEST_SELLER_LIMIT);
  }, [allProductsList]);

  return (
    // page wrapper for all home product sections
    <div className="bg-[#eff0f5] min-h-screen w-full pb-10">
      {/* personalized picks section */}
      {forYouProducts.length > 0 && (
        <ProductSection
          title="Just For You"
          products={forYouProducts}
          addToCart={addToCart}
        />
      )}

      {/* category cards section */}
      <CategorySection />

      {/* grocery products row */}
      <ProductSection
        title="Grocery Products"
        products={homeGrocery}
        addToCart={addToCart}
        viewAllPath="/grocery"
      />

      {/* organic products row */}
      <ProductSection
        title="Organic Products"
        products={homeOrganic}
        addToCart={addToCart}
        viewAllPath="/organic"
      />

      {/* all products row */}
      <ProductSection
        title="All Products"
        products={homeAllProducts}
        addToCart={addToCart}
        viewAllPath="/all-product"
      />
    </div>
  );
};

export default Product; // homepage product listing sections
