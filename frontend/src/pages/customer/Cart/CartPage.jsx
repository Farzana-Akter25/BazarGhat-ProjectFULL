import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Tag,
  Truck,
  X,
} from "lucide-react";
import { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ProductPrice from "../../../components/product/ProductPrice";
import ProductStock from "../../../components/product/ProductStock"; // shared "N available" label
import DataTable from "../../../components/shared/DataTable"; // shared table shell
import { CartContext } from "../../../context/CartContext";
import useAuth from "../../../hooks/useAuth";
import useCartStockCheck from "../../../hooks/useCartStockCheck";
import useLiveCartPricing from "../../../hooks/useLiveCartPricing";
import { resolvePricing } from "../../../utils/pricing";

// tighter cell padding than the shared TD — the cart rows are compact
const CART_TD = "px-1.5 py-2 align-top break-words";

// cart table columns
const CART_COLUMNS = [
  { label: "Select" },
  { label: "Product" },
  { label: "Quantity" },
  { label: "Total", align: "right" },
  { label: "" },
];

// Stock warning popup
const StockWarningPopup = ({
  show,
  quantity,
  available,
  productName,
  onClose,
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xs rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-amber-100 bg-amber-50 px-4 py-3">
          <h2 className="text-sm font-bold text-amber-900 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-600" />
            Limited Stock Available
          </h2>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-gray-700 mb-1.5">
            <strong>{productName}</strong> only has <strong>{available}</strong>{" "}
            in stock, but you tried to add <strong>{quantity}</strong>.
          </p>
          <p className="text-xs text-gray-500">
            We've set your cart quantity to the maximum available.
          </p>
        </div>
        <div className="flex gap-3 px-4 py-3 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 rounded-lg text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

// editable qty field between the +/- buttons — types a value, commits on blur/Enter
const QuantityInput = ({ item, updateQty, onStockWarning }) => {
  // Text in the quantity box
  const [value, setValue] = useState(String(item.quantity));

  // stay in sync when qty changes from elsewhere (+/- buttons, stock cap, etc.)
  useEffect(() => {
    setValue(String(item.quantity));
  }, [item.quantity]);

  // Save the typed quantity
  const commit = () => {
    // Typed value as a number
    const parsed = parseInt(value, 10);

    // If not a valid number, keep current quantity
    if (Number.isNaN(parsed)) {
      setValue(String(item.quantity));
      return;
    }

    // Enforce minimum quantity of 1
    let target = Math.max(1, parsed);

    // Check if trying to exceed stock
    if (target > item.stock) {
      onStockWarning(target, item.stock, item.name);
      setValue(String(item.quantity)); // reset to current qty
      return;
    }

    // Only update if value actually changed
    if (target !== item.quantity) {
      updateQty(item.id, target - item.quantity); // updateQty takes a delta
    } else {
      setValue(String(item.quantity)); // normalize display (e.g. leading zeros, empty)
    }
  };

  return (
    <input
      type="number"
      min={1}
      max={item.stock}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.target.blur();
      }}
      className="w-7 bg-transparent text-center text-xs font-bold text-gray-800 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
    />
  );
};

// Shopping cart page: items, selection, totals and go to checkout
const CartPage = () => {
  const {
    cartItems: storedCartItems = [],
    updateQty,
    removeItem,
    isSelected,
    toggleSelected,
    selectAll,
  } = useContext(CartContext);
  // Login state and router helper
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Stock warning popup state
  const [stockWarning, setStockWarning] = useState({
    show: false,
    quantity: 0,
    available: 0,
    productName: "",
  });

  // Priced live, so a flash sale that started or expired since these items were added is what the customer sees here and pays at checkout.
  const cartItems = useLiveCartPricing(storedCartItems);

  // Out-of-stock / deactivated items can never be part of an order.
  const orderableItems = cartItems.filter(
    (item) => item.stock > 0 && item.inStock !== false,
  );
  const selectedItems = orderableItems.filter((item) => isSelected(item.id)); // items ticked for checkout
  const { hasIssues, issues } = useCartStockCheck(selectedItems); // stock changes since added

  // go to checkout, or login first if guest
  const handleProceedToCheckout = () => {
    if (selectedItems.length === 0 || hasIssues) return;
    if (!isAuthenticated) {
      navigate("/login", { state: { from: { pathname: "/checkout" } } });
      return;
    }
    navigate("/checkout");
  };

  // remove item or clamp qty down to what's actually available
  const resolveStockIssue = (issue) => {
    if (issue.available <= 0) {
      removeItem(issue.id);
    } else {
      updateQty(issue.id, issue.available - issue.requested);
    }
  };

  // Handle stock warning from QuantityInput
  const handleStockWarning = (attemptedQty, available, productName) => {
    setStockWarning({
      show: true,
      quantity: attemptedQty,
      available: available,
      productName: productName,
    });
  };

  // Handle stock warning popup close
  const handleStockWarningClose = () => {
    setStockWarning({ ...stockWarning, show: false });
  };

  // sum of price * qty for selected items
  const subtotal =
    Math.round(
      selectedItems.reduce(
        (acc, item) =>
          acc + (Number(item.price) || 0) * (Number(item.quantity) || 1),
        0,
      ) * 100,
    ) / 100;

  const deliveryFee = selectedItems.length > 0 ? 80 : 0; // flat delivery fee

  // sum of savings from old vs effective price
  const totalDiscount =
    Math.round(
      selectedItems.reduce((acc, item) => {
        // Savings from items that have an old (higher) price
        const { price, oldPrice } = resolvePricing(item);
        return oldPrice
          ? acc + (oldPrice - price) * (Number(item.quantity) || 1)
          : acc;
      }, 0) * 100,
    ) / 100;
//grand total
  const grandTotal = Math.round((subtotal + deliveryFee) * 100) / 100; // final payable total

  return (
    <div className="min-h-screen bg-linear-to-b from-green-50/60 via-gray-50 to-gray-50 py-4 font-sans">
      {/* Stock warning popup */}
      <StockWarningPopup
        show={stockWarning.show}
        quantity={stockWarning.quantity}
        available={stockWarning.available}
        productName={stockWarning.productName}
        onClose={handleStockWarningClose}
      />

      <div className="max-w-5xl mx-auto px-3">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="group flex items-center gap-2 text-xs text-gray-500 hover:text-green-700 font-semibold mb-3 transition-colors"
        >
          {/* circular arrow icon */}
          <span className="w-6 h-6 flex items-center justify-center rounded-full bg-white border shadow-sm group-hover:border-green-300 group-hover:shadow transition-all">
            <ArrowLeft size={12} />
          </span>
          Back
        </button>

        {/* page title + select all */}
        <div className="flex items-center gap-2 mb-4">
          {/* cart icon badge */}
          <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-green-700 text-white shadow-sm shadow-green-200">
            <ShoppingCart size={16} />
          </span>
          <div>
            {/* page heading */}
            <h1 className="text-lg font-extrabold text-gray-800 leading-tight">
              Shopping Cart
            </h1>
            {/* selected count subtitle */}
            {cartItems.length > 0 && (
              <p className="text-[11px] text-gray-400 font-medium">
                {selectedItems.length} of {cartItems.length}{" "}
                {cartItems.length === 1 ? "item" : "items"} selected for
                checkout
              </p>
            )}
          </div>
          {/* select all link */}
          {orderableItems.length > 0 && (
            <button
              type="button"
              onClick={selectAll}
              className="ml-auto text-[11px] font-bold text-green-700 hover:text-green-800 hover:underline"
            >
              Select all
            </button>
          )}
        </div>

        {/* stock issue warning banner */}
        {hasIssues && (
          <div className="mb-3 bg-amber-50 border border-amber-200 rounded-lg p-3 flex flex-col gap-2">
            {/* warning heading */}
            <div className="flex items-center gap-2 text-xs text-amber-700 font-bold">
              <AlertTriangle size={14} />
              Some items changed since you added them to your cart
            </div>
            {/* list of affected items */}
            <ul className="space-y-2">
              {issues.map((issue) => (
                <li
                  key={issue.id}
                  className="flex items-center justify-between gap-2 text-[11px] text-amber-800 bg-white/60 rounded-lg px-2.5 py-1.5"
                >
                  <span>
                    <strong>{issue.name}</strong>{" "}
                    {issue.available > 0
                      ? `only has ${issue.available} left in stock (you have ${issue.requested} in cart).`
                      : `is now out of stock.`}
                  </span>
                  {/* fix the issue button */}
                  <button
                    type="button"
                    onClick={() => resolveStockIssue(issue)}
                    className="shrink-0 text-[11px] font-bold text-white bg-amber-600 hover:bg-amber-700 px-2.5 py-1 rounded-md transition-colors"
                  >
                    {issue.available > 0 ? "Update quantity" : "Remove item"}
                  </button>
                </li>
              ))}
            </ul>
            <p className="text-xs text-amber-600">
              Update your cart to continue to checkout.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* LEFT */}
          <div className="lg:col-span-2 space-y-2">
            {cartItems.length > 0 ? (
              // cart items table
              <div className="bg-white p-2.5 rounded-xl border border-gray-100 shadow-sm">
                <DataTable columns={CART_COLUMNS}>
                  {cartItems.map((item) => {
                    const outOfStock = item.stock <= 0 || item.inStock === false; // dims + disables this row
                    return (
                      // cart item row
                      <tr
                        key={item.id}
                        className={`group align-middle hover:bg-gray-50 ${outOfStock ? "opacity-60" : ""}`}
                      >
                        {/* Select */}
                        <td className={CART_TD}>
                          <input
                            type="checkbox"
                            checked={!outOfStock && isSelected(item.id)}
                            disabled={outOfStock}
                            onChange={() => toggleSelected(item.id)}
                            className="w-3.5 h-3.5 accent-green-700 shrink-0 disabled:opacity-40"
                          />
                        </td>

                        {/* Image + info */}
                        <td className={CART_TD}>
                          <div className="flex items-center gap-2.5">
                            {/* Image */}
                            <div className="w-11 h-11 shrink-0 bg-linear-to-br from-gray-50 to-gray-100 rounded-lg overflow-hidden border border-gray-100">
                              <img
                                src={item.img}
                                alt={item.name}
                                className="w-full h-full object-contain p-1 group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => {
                                  e.target.src = "https://via.placeholder.com/150";
                                }}
                              />
                            </div>

                            {/* Info */}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                {/* product name */}
                                <h3 className="text-xs font-semibold text-gray-800">
                                  {item.name}
                                </h3>
                                {/* out of stock tag */}
                                {outOfStock && (
                                  <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded shrink-0">
                                    Out of Stock
                                  </span>
                                )}
                              </div>
                              {/* weight/unit */}
                              <p className="text-gray-400 text-[11px]">{item.weight}</p>

                              {/* how many are actually available right now */}
                              <ProductStock product={item} />

                              {/* effective unit price + struck old price */}
                              <ProductPrice
                                product={item}
                                showBadge
                                className="mt-1"
                              />

                              {/* flash sale marker, gone the moment the sale expires */}
                              {item.on_flash_sale && item.flash_sale && (
                                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-[#ff2d37]">
                                  ⚡ {item.flash_sale.name} price
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Quantity */}
                        <td className={CART_TD}>
                          <div className="flex w-fit items-center bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                            {/* decrease qty */}
                            <button
                              onClick={() => updateQty(item.id, -1)}
                              disabled={item.quantity <= 1}
                              className="p-1 text-gray-500 hover:bg-white hover:text-green-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                            >
                              <Minus size={12} />
                            </button>

                            {/* current qty, editable */}
                            <QuantityInput
                              item={item}
                              updateQty={updateQty}
                              onStockWarning={handleStockWarning}
                            />

                            {/* increase qty */}
                            <button
                              onClick={() => {
                                if (item.quantity >= item.stock) {
                                  handleStockWarning(
                                    item.quantity + 1,
                                    item.stock,
                                    item.name,
                                  );
                                } else {
                                  updateQty(item.id, 1);
                                }
                              }}
                              className="p-1 text-gray-500 hover:bg-white hover:text-green-700 transition-colors"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </td>

                        {/* line total */}
                        <td className={`${CART_TD} text-right`}>
                          <span className="text-xs font-extrabold whitespace-nowrap text-gray-800">
                            ৳
                            {Math.round(
                              (Number(item.price) || 0) *
                                (Number(item.quantity) || 1) *
                                100,
                            ) / 100}
                          </span>
                        </td>

                        {/* remove item */}
                        <td className={CART_TD}>
                          <button
                            onClick={() => removeItem(item.id)}
                            title="Remove from cart"
                            className="w-6 h-6 flex items-center justify-center rounded-full text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <X size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </DataTable>
              </div>
            ) : (
              // empty cart state
              <div className="text-center py-10 bg-white rounded-xl border border-gray-100 shadow-sm">
                {/* empty bag icon */}
                <span className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-gray-50 text-gray-300 mb-2.5">
                  <ShoppingBag size={22} />
                </span>
                <p className="text-gray-500 text-sm font-bold">
                  Your cart is empty!
                </p>
                <p className="text-gray-400 text-[11px] mt-1">
                  Looks like you haven't added anything yet.
                </p>
                {/* back to shop link */}
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 text-xs text-white bg-orange-600 hover:bg-orange-700 font-bold mt-3 px-4 py-2 rounded-lg transition-colors"
                >
                  Go back to shop
                </Link>
              </div>
            )}
          </div>

          {/* RIGHT */}
          <div>
            {/* order summary card */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-md sticky top-20 overflow-hidden">
              {/* summary heading */}
              <h2 className="text-sm font-bold mb-3 text-gray-800 flex items-center gap-2">
                <Tag size={14} className="text-green-700" />
                Order Summary
              </h2>

              <div className="space-y-2 mb-3 text-xs">
                {/* subtotal row */}
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span className="font-semibold text-gray-700">
                    ৳{subtotal}
                  </span>
                </div>

                {/* delivery fee row */}
                <div className="flex justify-between text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <Truck size={12} />
                    Delivery Fee
                  </span>
                  <span className="font-semibold text-gray-700">
                    ৳{deliveryFee}
                  </span>
                </div>

                {/* savings row, only if discounted */}
                {totalDiscount > 0 && (
                  <div className="flex justify-between text-green-700 font-medium">
                    <span>You Saved</span>
                    <span>-৳{totalDiscount}</span>
                  </div>
                )}

                {/* grand total row */}
                <div className="flex justify-between font-bold text-sm border-t border-dashed border-gray-200 pt-2.5">
                  <span className="text-gray-800">Total</span>
                  <span className="text-orange-600">৳{grandTotal}</span>
                </div>
              </div>

              {/* checkout button */}
              <button
                type="button"
                onClick={handleProceedToCheckout}
                disabled={selectedItems.length === 0 || hasIssues}
                className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold shadow-sm transition-all duration-200 ${
                  selectedItems.length > 0 && !hasIssues
                    ? "bg-orange-600 text-white hover:bg-orange-700 hover:shadow-lg hover:shadow-orange-200"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                Proceed to Checkout <ArrowRight size={14} />
              </button>

              {/* continue shopping link */}
              <Link
                to="/"
                className="w-full mt-2 flex items-center justify-center border border-green-700 text-green-700 py-2 rounded-lg text-xs font-semibold hover:bg-green-50 transition-colors"
              >
                Continue Shopping
              </Link>

              {/* secure checkout note */}
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400 mt-3">
                <ShieldCheck size={12} className="text-green-700" />
                Secure checkout guaranteed
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
