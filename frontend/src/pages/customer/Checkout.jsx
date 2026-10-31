import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Home,
  MapPin,
  ShieldCheck,
  ShoppingBag,
  Ticket,
  Wallet,
  Truck,
  User,
  X,
} from "lucide-react"; // icons used across the checkout cards
import { useContext, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import OrderConfirmedModal from "../../components/customer/OrderConfirmedModal"; // order success popup
import { buildConfirmedOrder } from "../../utils/confirmedOrder"; // paid order -> popup payload
import PhoneOtpModal from "../../components/shared/PhoneOtpModal"; // contact number verification
import { CartContext } from "../../context/CartContext"; // shared cart state
import { useCheckoutMutation } from "../../features/customer/checkoutApi";
import {
  useApplyCouponMutation,
  useGetAvailableCouponsQuery,
} from "../../features/customer/couponApi";
import { useGetMyOrdersQuery } from "../../features/customer/orderApi"; // used to rebuild the order after a gateway return
import { useGetWalletQuery } from "../../features/customer/walletApi";
import useAuth from "../../hooks/useAuth";
import useCartStockCheck from "../../hooks/useCartStockCheck"; // flags out-of-stock/short cart items
import useLiveCartPricing from "../../hooks/useLiveCartPricing"; // re-prices lines against live flash sales

const DELIVERY_FEE = 80; // flat delivery fee in taka

// the confirmation popup is a short summary: it closes itself and sends the customer back to the homepage unless they pick Track Order first
const AUTO_CLOSE_SECONDS = 20;

// This one warning belongs beside the choice it is about, so it is rendered under the Payment Method card instead of in the page-top error banner.
const PAYMENT_METHOD_ERROR = "Please select a payment method.";

// validates and normalizes a BD phone number to +880 format
const normalizeBdPhone = (raw) => {
  // Remove spaces around the typed number
  const trimmed = raw.trim();
  if (/^01[3-9]\d{8}$/.test(trimmed)) return "+880" + trimmed.slice(1); // local format
  if (/^\+8801[3-9]\d{8}$/.test(trimmed)) return trimmed; // already international
  return null; // invalid
};

// Checkout page: delivery details, phone check, coupon, wallet, payment and place order
const Checkout = () => {
  const {
    cartItems: storedCartItems,
    updateQty,
    removeItem,
    removeOrderedItems,
    isSelected,
  } = useContext(CartContext); // shared cart state
  // Login state and router helper
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams(); // payment gateway return params
  const [checkout, { isLoading }] = useCheckoutMutation(); // place order mutation
  const [confirmedOrder, setConfirmedOrder] = useState(null); // details behind the success popup
  const [secondsLeft, setSecondsLeft] = useState(AUTO_CLOSE_SECONDS); // confirmation popup countdown

  // Once an order is confirmed the popup counts down and then takes the customer home on its own.
  useEffect(() => {
    if (!confirmedOrder) {
      setSecondsLeft(AUTO_CLOSE_SECONDS); // reset for the next order
      return;
    }

    // Count the popup timer down every second
    const tick = setInterval(
      () => setSecondsLeft((left) => (left > 0 ? left - 1 : 0)),
      1000,
    );
    // Go to the home page when the timer runs out
    const goHome = setTimeout(() => navigate("/"), AUTO_CLOSE_SECONDS * 1000);

    return () => {
      clearInterval(tick);
      clearTimeout(goHome);
    };
  }, [confirmedOrder, navigate]);

  // The summary is priced from the same live effective prices the server bills from, so the total shown here is the total that gets charged.
  const cartItems = useLiveCartPricing(storedCartItems);

  // Out-of-stock / deactivated items can't be ordered, and only the items the customer left selected on the cart page are actually being purchased now.
  const orderableItems = cartItems.filter(
    (item) => item.stock > 0 && item.inStock !== false,
  ); // buyable items only
  const selectedItems = orderableItems.filter((item) => isSelected(item.id)); // items customer checked
  const { hasIssues, issues } = useCartStockCheck(selectedItems); // stock mismatch warnings

  const [fullName, setFullName] = useState(""); // contact name field
  const [phone, setPhone] = useState(""); // contact phone field
  const [address, setAddress] = useState(""); // delivery address field
  // null until the customer picks one, so neither option is highlighted on load
  const [paymentMethod, setPaymentMethod] = useState(null); // online | cod
  const [useWallet, setUseWallet] = useState(false); // apply refund balance to this order
  const [orderError, setOrderError] = useState(""); // top-level order error banner text

  const [verifiedPhone, setVerifiedPhone] = useState(null); // normalized number proven by OTP
  const [showOtpModal, setShowOtpModal] = useState(false); // phone verification modal visibility
  const [continueAfterVerify, setContinueAfterVerify] = useState(false); // resume order once verified

  const [couponInput, setCouponInput] = useState(""); // coupon code text field
  const [appliedCoupon, setAppliedCoupon] = useState(null); // currently applied coupon object
  const [appliedAtSubtotal, setAppliedAtSubtotal] = useState(null); // subtotal snapshot when coupon applied
  const [couponMessage, setCouponMessage] = useState(null); // { type: 'success' | 'error', text }
  const [applyCoupon, { isLoading: isApplyingCoupon }] =
    useApplyCouponMutation(); // apply coupon mutation

  // decide how to fix a stock issue: drop item or clamp quantity
  const resolveStockIssue = (issue) => {
    if (issue.available <= 0) {
      removeItem(issue.id); // fully out of stock, remove
    } else {
      updateQty(issue.id, issue.available - issue.requested); // clamp to available
    }
  };

  // prefill contact fields from logged-in user profile
  useEffect(() => {
    if (user) {
      setFullName((prev) => prev || user.name || "");
      setPhone((prev) => prev || user.phone || "");
      setAddress((prev) => prev || user.address || "");
    }
  }, [user]);

  // An account phone carrying a verification timestamp was already proven, so repeat customers ordering to their own number skip the OTP entirely.
  useEffect(() => {
    if (user?.phone_verified_at) {
      // Treat the account's phone as already verified
      const normalized = normalizeBdPhone(user.phone || "");
      if (normalized) setVerifiedPhone(normalized);
    }
  }, [user]);

  // Comparing against the normalized number is what invalidates verification.
  const normalizedPhone = normalizeBdPhone(phone); // null while the number is invalid
  // Has the delivery phone been verified?
  const isPhoneVerified =
    Boolean(normalizedPhone) && verifiedPhone === normalizedPhone;

  // Price Calculations
  const subtotal =
    Math.round(
      selectedItems.reduce(
        (acc, item) =>
          acc + (Number(item.price) || 0) * (Number(item.quantity) || 1),
        0,
      ) * 100,
    ) / 100; // sum of selected items

  const { data: couponContext } = useGetAvailableCouponsQuery(subtotal, {
    skip: !isAuthenticated || subtotal <= 0, // don't fetch when nothing to apply to
  });
  // Coupons the customer can use
  const availableCoupons =
    selectedItems.length > 0 ? (couponContext?.coupons ?? []) : []; // eligible coupons list

  // Coupon still valid only if the cart total has not changed since it was applied
  const couponStillValid =
    Boolean(appliedCoupon) && appliedAtSubtotal === subtotal; // coupon matches current cart total
  const freeDeliveryApplied = couponStillValid && appliedCoupon.freeDelivery; // coupon waives delivery fee
  const couponDiscount = couponStillValid ? Number(appliedCoupon.discount) || 0 : 0; // cash off the items
  // Delivery fee (free with a coupon) and grand total
  const deliveryFee =
    selectedItems.length > 0 && !freeDeliveryApplied ? DELIVERY_FEE : 0; // fee shown in summary
  const total = Math.round((subtotal - couponDiscount + deliveryFee) * 100) / 100; // grand total

  // Refund balance available to this customer.
  const { data: walletData } = useGetWalletQuery(undefined, {
    skip: !isAuthenticated,
  });
  // Wallet balance and whether it can be used
  const walletBalance = walletData?.balance ?? 0;
  const walletEligible = walletBalance > 0 && total > 0;
  // Partial use is the normal case: spend only what this order needs, and the rest stays in the balance for next time.
  const walletUsed =
    walletEligible && useWallet ? Math.min(walletBalance, total) : 0;
  // Amount left to pay after the wallet
  const payableAmount = Math.round((total - walletUsed) * 100) / 100;
  // Balance covers the whole order: there is nothing left for a payment method to pay, so checkout stops asking for one and no gateway leg is created.
  const walletCoversOrder = walletUsed > 0 && payableAmount === 0;

  // A coupon tied to an order-value threshold stops being valid if the cart total changes after it was applied.
  useEffect(() => {
    if (
      appliedCoupon &&
      appliedAtSubtotal !== null &&
      appliedAtSubtotal !== subtotal
    ) {
      setAppliedCoupon(null); // clear stale coupon
      setAppliedAtSubtotal(null);
      setCouponMessage({
        type: "error",
        text: "Your cart changed — please re-apply your coupon.",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal]);

  // Payment gateway return leg.
  const returnStatus = searchParams.get("status"); // success | failed | cancelled
  const returnedOrderNumber = searchParams.get("order"); // order this return belongs to
  // Back from the gateway with a successful payment?
  const awaitingPaidOrder =
    returnStatus === "success" && Boolean(returnedOrderNumber);

  // The gateway only hands back an order number, so the paid order's lines and totals are read from the customer's own order list.
  const { data: myOrders } = useGetMyOrdersQuery(undefined, {
    skip: !isAuthenticated || !awaitingPaidOrder,
  });

  // Handle the result when the customer returns from the payment gateway
  useEffect(() => {
    if (!returnStatus) return;

    if (returnStatus !== "success") {
      setOrderError(
        returnStatus === "cancelled"
          ? "You cancelled the payment before it was completed — your items are still in your cart."
          : "Your payment could not be verified. Please try again.",
      );
      setSearchParams({}, { replace: true }); // don't re-fire on refresh
      return;
    }

    // Find the paid order in the customer's orders
    const paidOrder = myOrders?.find(
      (order) => order.id === returnedOrderNumber,
    );
    if (!paidOrder) return; // wait for the order list to arrive

    setConfirmedOrder(buildConfirmedOrder(paidOrder));
    setSearchParams({}, { replace: true }); // the popup owns the state from here
  }, [returnStatus, returnedOrderNumber, myOrders, setSearchParams]);

  // submit coupon code for validation
  const handleApplyCoupon = async (codeOverride) => {
    // Coupon code to apply
    const code = (codeOverride ?? couponInput).trim();

    if (!code) {
      setCouponMessage({ type: "error", text: "Please enter a coupon code." });
      return;
    }

    try {
      // Check the coupon with the server
      const response = await applyCoupon({ code, subtotal }).unwrap();
      setAppliedCoupon(response.coupon); // store validated coupon
      setAppliedAtSubtotal(subtotal); // snapshot subtotal it was applied at
      setCouponInput(response.coupon.code);
      setCouponMessage({ type: "success", text: response.message });
    } catch (err) {
      setAppliedCoupon(null);
      setAppliedAtSubtotal(null);
      setCouponMessage({
        type: "error",
        text: err?.data?.message || "Invalid or expired coupon code.",
      });
    }
  };

  // clear applied coupon
  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setAppliedAtSubtotal(null);
    setCouponInput("");
    setCouponMessage(null);
  };

  // Opens the confirmation popup from what is still on screen.
  const showConfirmation = (orderNumber, paymentLabel) => {
    setConfirmedOrder({
      orderNumber,
      placedAt: new Date(),
      items: selectedItems.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        img: item.img,
        weight: item.weight,
      })),
      subtotal,
      deliveryFee,
      freeDelivery: freeDeliveryApplied,
      couponDiscount,
      total,
      walletAmount: walletUsed, // part of the total paid from the BazarGhat Wallet
      paymentLabel,
      address: address.trim(),
    });
  };

  // submits the order — only called once every precondition has passed
  const placeOrder = async () => {
    setOrderError("");

    try {
      // Place the order
      const response = await checkout({
        customer_name: fullName.trim(),
        customer_phone: normalizedPhone,
        shipping_address: address.trim(),
        // Omitted when the balance covers the order — the server settles it against the ledger and never opens a gateway session for it.
        payment_method: walletCoversOrder ? undefined : paymentMethod,
        coupon_code: couponStillValid ? appliedCoupon.code : undefined,
        // A request, not an instruction: the server recomputes what can actually be spent against the real balance and the real total.
        use_wallet: walletUsed > 0,
        wallet_amount: walletUsed > 0 ? walletUsed : undefined,
        items: selectedItems.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
        })),
      }).unwrap();

      if (response.payment_method === "wallet") {
        // Covered in full by the refund balance — there was no gateway leg.
        showConfirmation(response.order_number, "BazarGhat Balance");
        removeOrderedItems(selectedItems.map((item) => item.id));
      } else if (response.payment_method === "cod") {
        // COD orders are confirmed immediately — the backend already removed just the ordered items from the cart, so only drop them from local selection state here.
        showConfirmation(response.order_number, "Cash on Delivery");
        removeOrderedItems(selectedItems.map((item) => item.id));
      } else {
        // Cart stays intact until SSLCommerz confirms payment on the gateway return leg.
        window.location.href = response.gateway_url; // redirect to payment gateway
      }
    } catch (err) {
      // The server enforces verification independently, so it can reject a number this page believed was verified (e.g. it expired mid-checkout).
      if (err?.data?.code === "phone_verification_required") {
        setVerifiedPhone(null);
        setContinueAfterVerify(true);
        setShowOtpModal(true);
        return;
      }

      setOrderError(
        err?.data?.message || "Could not place order. Please try again.",
      );
    }
  };

  // validate form, then verify the phone number before ordering
  const handleConfirmOrder = async () => {
    setOrderError("");

    if (selectedItems.length === 0) {
      setOrderError("Please select at least one item to order.");
      return;
    }

    if (!isAuthenticated) {
      navigate("/login", { state: { from: { pathname: "/checkout" } } }); // bounce to login, return here after
      return;
    }

    if (hasIssues) {
      setOrderError(
        "Please update your cart — some items are no longer available in the requested quantity.",
      );
      return;
    }

    if (!fullName.trim() || !phone.trim() || !address.trim()) {
      setOrderError(
        "Please fill in your name, phone number, and delivery address.",
      );
      return;
    }

    if (!normalizedPhone) {
      setOrderError(
        "Enter a valid Bangladeshi mobile number (01XXXXXXXXX or +8801XXXXXXXXX).",
      );
      return;
    }

    // Nothing is preselected, so the customer has to choose how they are paying before we ask them for anything else.
    if (!paymentMethod && !walletCoversOrder) {
      setOrderError(PAYMENT_METHOD_ERROR);
      return;
    }

    // unproven number — collect the code first, then continue automatically
    if (!isPhoneVerified) {
      setContinueAfterVerify(true);
      setShowOtpModal(true);
      return;
    }

    await placeOrder();
  };

  // opens verification on its own, from the button beside the phone field
  const handleVerifyPhoneClick = () => {
    if (!normalizedPhone) {
      setOrderError(
        "Enter a valid Bangladeshi mobile number (01XXXXXXXXX or +8801XXXXXXXXX).",
      );
      return;
    }

    setOrderError("");
    setContinueAfterVerify(false);
    setShowOtpModal(true);
  };

  // records the proven number and resumes the order if one was waiting
  const handlePhoneVerified = (provenPhone) => {
    setVerifiedPhone(provenPhone);
    setShowOtpModal(false);

    if (continueAfterVerify) {
      setContinueAfterVerify(false);
      placeOrder();
    }
  };

  // dismisses verification without ordering
  const handleCloseOtpModal = () => {
    setShowOtpModal(false);
    setContinueAfterVerify(false);
  };

  return (
    // full page bg
    <div className="min-h-screen bg-linear-to-b from-green-50/60 via-gray-50 to-gray-50 text-slate-800 font-sans py-3">
      {/* this page hides the site header, so Back and Home live here */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 mb-2 flex items-center justify-between gap-3">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="group flex items-center gap-2 text-gray-500 hover:text-green-700 font-semibold transition-colors"
        >
          {/* circular back arrow icon */}
          <span className="w-7 h-7 flex items-center justify-center rounded-full bg-white border shadow-sm group-hover:border-green-300 group-hover:shadow transition-all">
            <ArrowLeft size={14} />
          </span>
          Back
        </button>

        {/* Home Button — returns to the storefront */}
        <button
          onClick={() => navigate("/")}
          className="group flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-sm font-semibold text-gray-500 shadow-sm transition-all hover:border-green-300 hover:text-green-700 hover:shadow"
        >
          <Home size={14} />
          Home
        </button>
      </div>

      <main className="max-w-5xl mx-auto px-4 md:px-8 pb-4">
        {/* page title */}
        <div className="flex items-center gap-2.5 mb-3">
          {/* green checkmark badge */}
          <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-green-700 text-white shadow-md shadow-green-200">
            <CheckCircle size={18} />
          </span>
          <div>
            <h1 className="text-xl font-extrabold text-gray-800 leading-tight">
              Checkout
            </h1>
            <p className="text-xs text-gray-400 font-medium">
              Just a few details and you're done
            </p>
          </div>
        </div>

        {/* stock issue warning */}
        {hasIssues && (
          <div className="mb-3 bg-amber-50 border border-amber-200 rounded-xl p-3 flex flex-col gap-2">
            {/* warning heading */}
            <div className="flex items-center gap-2 text-amber-700 font-bold">
              <AlertTriangle size={16} />
              Some items changed since you added them to your cart
            </div>
            {/* list of affected items */}
            <ul className="space-y-2">
              {issues.map((issue) => (
                <li
                  key={issue.id}
                  className="flex items-center justify-between gap-3 text-sm text-amber-800 bg-white/60 rounded-lg px-3 py-2"
                >
                  <span>
                    <strong>{issue.name}</strong>{" "}
                    {issue.available > 0
                      ? `only has ${issue.available} left in stock (you have ${issue.requested} in cart).`
                      : `is now out of stock.`}
                  </span>
                  {/* fix stock issue button */}
                  <button
                    type="button"
                    onClick={() => resolveStockIssue(issue)}
                    className="shrink-0 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 px-3 py-1.5 rounded-lg transition-colors"
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

        {/* order error message — the payment-method warning is shown on that card */}
        {orderError && orderError !== PAYMENT_METHOD_ERROR && (
          <div className="mb-3 bg-red-50 border border-red-200 rounded-xl p-2.5 text-sm text-red-700 font-medium">
            {orderError}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-3">
            {/* coupon code card - only show if coupons are available or one is already applied */}
            {(availableCoupons.length > 0 || couponStillValid) && (
              <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                {/* card title with ticket icon */}
                <h2 className="flex items-center gap-2 font-bold text-gray-800 mb-2.5">
                  <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-orange-50 text-orange-500">
                    <Ticket size={16} />
                  </span>
                  Coupon Code
                </h2>

                {/* suggested/available coupons list */}
                {availableCoupons.length > 0 && !couponStillValid && (
                  <div className="mb-2.5 space-y-1">
                    {availableCoupons.map((c) => (
                      <div
                        key={c.code}
                        className="flex items-center justify-between gap-3 bg-green-50 border border-dashed border-green-300 rounded-lg px-2.5 py-1.5"
                      >
                        <div>
                          <p className="text-sm font-bold text-green-700">
                            {c.code}
                          </p>
                          <p className="text-xs text-green-700">{c.label}</p>
                        </div>
                        {/* apply this suggested coupon */}
                        <button
                          type="button"
                          onClick={() => handleApplyCoupon(c.code)}
                          disabled={isApplyingCoupon}
                          className="shrink-0 text-xs font-bold text-white bg-green-700 hover:bg-green-800 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
                        >
                          Use Code
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {couponStillValid ? (
                  // applied coupon confirmation state
                  <div className="flex items-center justify-between gap-3 bg-green-50 border border-green-300 rounded-lg px-2.5 py-1.5">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={16} className="text-green-700" />
                      <div>
                        <p className="text-sm font-bold text-green-700">
                          {appliedCoupon.code} applied
                        </p>
                        <p className="text-xs text-green-700">
                          {freeDeliveryApplied
                            ? "Free delivery on this order"
                            : `You save ৳${couponDiscount} on this order`}
                        </p>
                      </div>
                    </div>
                    {/* remove applied coupon */}
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                      aria-label="Remove coupon"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  // coupon entry input state
                  <div className="flex gap-2">
                    {/* coupon code input */}
                    <input
                      placeholder="Enter coupon code"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      className="flex-1 p-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100 transition-all uppercase"
                    />
                    {/* apply typed coupon */}
                    <button
                      type="button"
                      onClick={() => handleApplyCoupon()}
                      disabled={isApplyingCoupon}
                      className="shrink-0 px-4 rounded-lg font-bold text-white bg-green-700 hover:bg-green-800 transition-colors disabled:opacity-60"
                    >
                      {isApplyingCoupon ? "Applying..." : "Apply"}
                    </button>
                  </div>
                )}

                {/* coupon success/error message */}
                {couponMessage && (
                  <p
                    className={`mt-2 text-xs font-medium ${couponMessage.type === "success" ? "text-green-700" : "text-red-600"}`}
                  >
                    {couponMessage.text}
                  </p>
                )}
              </div>
            )}

            {/* contact info card */}
            <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              {/* card title with user icon */}
              <h2 className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-2">
                <span className="w-6 h-6 flex items-center justify-center rounded-md bg-orange-50 text-orange-500">
                  <User size={14} />
                </span>
                Contact Information
              </h2>
              <div className="grid md:grid-cols-2 gap-2">
                {/* full name input */}
                <input
                  placeholder="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="px-2.5 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100 transition-all"
                />
                {/* phone number field with verification control */}
                <div>
                  <div className="flex gap-2">
                    {/* phone number input */}
                    <input
                      placeholder="Phone Number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="flex-1 min-w-0 px-2.5 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100 transition-all"
                    />
                    {/* verify number button, replaced by a badge once proven */}
                    {!isPhoneVerified && (
                      <button
                        type="button"
                        onClick={handleVerifyPhoneClick}
                        disabled={!normalizedPhone}
                        className="shrink-0 px-2.5 rounded-lg text-xs font-bold text-white bg-green-700 hover:bg-green-800 transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                      >
                        Verify
                      </button>
                    )}
                  </div>
                  {/* verification status hint */}
                  {isPhoneVerified ? (
                    <p className="mt-1 flex items-center gap-1 text-[11px] font-bold text-green-700">
                      <CheckCircle size={12} />
                      Number verified
                    </p>
                  ) : (
                    <p className="mt-1 text-[11px] leading-snug text-gray-400">
                      We'll text a code to confirm this number before placing
                      your order.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* delivery address card */}
            <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              {/* card title with pin icon */}
              <h2 className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-2">
                <span className="w-6 h-6 flex items-center justify-center rounded-md bg-orange-50 text-orange-500">
                  <MapPin size={14} />
                </span>
                Delivery Address
              </h2>
              {/* address textarea */}
              <textarea
                placeholder="Enter full address..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg h-12 outline-none resize-none focus:border-green-700 focus:ring-2 focus:ring-green-100 transition-all"
              ></textarea>
            </div>

            {/* payment method card — nothing to choose once the refund balance covers the order in full */}
            {!walletCoversOrder && (
              <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                {/* card title with shield icon */}
                <h2 className="flex items-center gap-2 font-bold text-gray-800 mb-2.5">
                  <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-orange-50 text-orange-500">
                    <ShieldCheck size={16} />
                  </span>
                  Payment Method
                </h2>
                <div className="grid sm:grid-cols-2 gap-2.5">
                  {/* pay online option */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("online")}
                    className={`flex items-center gap-2.5 p-2.5 rounded-lg border-2 text-left transition-all ${
                      paymentMethod === "online"
                        ? "border-green-700 bg-green-50 shadow-sm"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {/* online payment icon badge */}
                    <span
                      className={`w-8 h-8 flex items-center justify-center rounded-lg ${paymentMethod === "online" ? "bg-green-700 text-white" : "bg-orange-50 text-orange-500"}`}
                    >
                      <ShieldCheck size={18} />
                    </span>
                    <div>
                      <p className="font-bold text-gray-800">Pay Online</p>
                      <p className="text-xs text-gray-500">
                        bKash, Nagad, Cards via SSLCommerz
                      </p>
                    </div>
                  </button>

                  {/* cash on delivery option */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cod")}
                    className={`flex items-center gap-2.5 p-2.5 rounded-lg border-2 text-left transition-all ${
                      paymentMethod === "cod"
                        ? "border-green-700 bg-green-50 shadow-sm"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {/* cod payment icon badge */}
                    <span
                      className={`w-8 h-8 flex items-center justify-center rounded-lg ${paymentMethod === "cod" ? "bg-green-700 text-white" : "bg-orange-50 text-orange-500"}`}
                    >
                      <Truck size={18} />
                    </span>
                    <div>
                      <p className="font-bold text-gray-800">
                        Cash on Delivery
                      </p>
                      <p className="text-xs text-gray-500">
                        Pay when you receive
                      </p>
                    </div>
                  </button>
                </div>

                {/* warning sits with the choice it is about */}
                {orderError === PAYMENT_METHOD_ERROR && (
                  <p className="mt-2.5 rounded-lg border border-red-200 bg-red-50 p-2.5 text-sm font-medium text-red-700">
                    {orderError}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* order summary sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white p-4 rounded-xl border border-gray-100 h-fit sticky top-16 shadow-md">
              {/* summary title */}
              <h2 className="flex items-center gap-2 font-bold text-gray-800 mb-3">
                <ShoppingBag size={16} className="text-green-700" />
                Order Summary
              </h2>

              {/* ordered lines, each at the price actually being charged */}
              {selectedItems.length > 0 && (
                <ul className="mb-2.5 space-y-1.5 border-b border-dashed border-gray-200 pb-2.5">
                  {selectedItems.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-gray-700">
                          {item.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          ৳{item.price} × {item.quantity}
                          {item.oldPrice && item.oldPrice > item.price && (
                            <span className="ml-1.5 text-gray-300 line-through">
                              ৳{item.oldPrice}
                            </span>
                          )}
                        </p>
                        {item.on_flash_sale && (
                          <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-[#ff2d37]">
                            ⚡ Flash sale price
                          </p>
                        )}
                      </div>
                      {/* line total */}
                      <span className="shrink-0 font-semibold text-gray-700">
                        ৳{item.price * item.quantity}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="space-y-2 text-xs mb-3">
                {/* subtotal row */}
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span className="font-semibold text-gray-700">
                    ৳{subtotal}
                  </span>
                </div>
                {/* coupon discount row, only for a cash-off coupon */}
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>Coupon ({appliedCoupon.code})</span>
                    <span className="font-semibold">-৳{couponDiscount}</span>
                  </div>
                )}
                {/* delivery fee row */}
                <div className="flex justify-between text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <Truck size={14} />
                    Delivery Fee
                  </span>
                  {freeDeliveryApplied ? (
                    // free delivery from coupon
                    <span className="font-semibold">
                      <span className="text-gray-400 line-through mr-1.5">
                        ৳{DELIVERY_FEE}
                      </span>
                      <span className="text-green-700">FREE</span>
                    </span>
                  ) : (
                    <span className="font-semibold text-gray-700">
                      ৳{deliveryFee}
                    </span>
                  )}
                </div>
                {/* order total row */}
                <div className="flex justify-between font-bold text-base border-t border-dashed border-gray-200 pt-2.5 mt-0.5">
                  <span className="text-gray-800">Order Total</span>
                  <span
                    className={
                      walletUsed > 0 ? "text-gray-800" : "text-orange-600"
                    }
                  >
                    ৳{total}
                  </span>
                </div>

                {walletEligible && (
                  // refund balance: available, and the toggle to spend it here
                  <div className="rounded-lg border border-green-100 bg-green-50/60 p-2.5">
                    <label className="flex cursor-pointer items-start gap-3">
                      {/* apply balance to this order */}
                      <input
                        type="checkbox"
                        checked={useWallet}
                        onChange={(e) => setUseWallet(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-green-700"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-sm font-bold text-gray-800">
                          <Wallet size={14} className="text-green-700" />
                          Use Refund Wallet
                        </span>
                        {/* what is available to spend */}
                        <span className="mt-0.5 block text-xs text-gray-500">
                          ৳{walletBalance.toFixed(2)} available
                          {walletBalance > total &&
                            ` — ৳${(walletBalance - total).toFixed(2)} stays in your balance`}
                        </span>
                      </span>
                    </label>
                  </div>
                )}

                {paymentMethod === "cod" && walletUsed === 0 && (
                  // cash is settled at the door, so say what is owed there
                  <div className="flex justify-between border-t border-dashed border-gray-200 pt-2.5 text-base font-bold">
                    <span className="text-gray-800">Pay at Delivery</span>
                    <span className="text-orange-600">৳{payableAmount}</span>
                  </div>
                )}

                {walletUsed > 0 && (
                  // the amount taken off this order, and what is left to pay — in cash at the door on a Cash on Delivery order
                  <>
                    <div className="flex justify-between text-gray-500">
                      <span>Wallet Amount Used</span>
                      <span className="font-semibold text-green-700">
                        -৳{walletUsed}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-dashed border-gray-200 pt-2.5 text-base font-bold">
                      <span className="text-gray-800">
                        {paymentMethod === "cod" ? "Pay at Delivery" : "Remaining Payable"}
                      </span>
                      <span className="text-orange-600">৳{payableAmount}</span>
                    </div>
                    {payableAmount === 0 && (
                      // fully covered — nothing goes to the gateway
                      <p className="-mt-1 text-xs font-medium text-green-700">
                        Fully covered by your refund balance — no online payment
                        needed.
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* partial-cart notice */}
              {selectedItems.length > 0 &&
                selectedItems.length < cartItems.length && (
                  <p className="text-xs text-gray-500 mb-2 -mt-1">
                    Only the {selectedItems.length} selected{" "}
                    {selectedItems.length === 1 ? "item" : "items"} will be
                    ordered — the rest will stay in your cart.
                  </p>
                )}

              {/* confirm order button */}
              <button
                onClick={handleConfirmOrder}
                disabled={selectedItems.length === 0 || isLoading}
                className={`w-full py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 shadow-sm transition-all duration-200
                  ${selectedItems.length > 0 && !isLoading ? "bg-green-700 text-white hover:bg-green-800 hover:shadow-lg hover:shadow-green-200" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
              >
                <CheckCircle size={18} />
                {isLoading
                  ? "Placing Order..."
                  : paymentMethod === "cod" || walletCoversOrder
                    ? "Place Order"
                    : "Process to Pay"}
              </button>

              {/* secure checkout note */}
              <div className="flex items-center justify-center gap-2 text-xs text-gray-400 mt-3">
                <ShieldCheck size={14} className="text-green-700" />
                Secure checkout guaranteed
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* contact number verification */}
      <PhoneOtpModal
        open={showOtpModal}
        phone={phone.trim()}
        onVerified={handlePhoneVerified}
        onClose={handleCloseOtpModal}
      />

      {/* order confirmed popup, auto-dismissed after AUTO_CLOSE_SECONDS */}
      <OrderConfirmedModal
        order={confirmedOrder}
        secondsLeft={secondsLeft}
        onTrack={() =>
          navigate(
            `/track-order?order=${encodeURIComponent(confirmedOrder?.orderNumber ?? "")}`,
          )
        }
        onContinue={() => navigate("/")}
        onClose={() => setConfirmedOrder(null)}
      />
    </div>
  );
};

export default Checkout;
