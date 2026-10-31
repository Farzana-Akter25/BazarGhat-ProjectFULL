import { Check, MapPin, ShoppingBag, ShoppingCart, Truck, Wallet, X } from "lucide-react"; // confirmation, meta and action icons
import { formatDate } from "../../utils/formatDate"; // dd-mm-yyyy display format

// money as taka, trimming the decimals off whole amounts
const tk = (value) =>
  `৳${Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;


 
// Popup shown after an order is placed, with an order summary
const OrderConfirmedModal = ({
  order,
  secondsLeft,
  onTrack,
  onContinue,
  onClose,
}) => {
  if (!order) return null; // nothing confirmed yet

  
  // Order date and time labels
  const placedDate = order.placedAt instanceof Date ? order.placedAt : null;
  const dateLabel = formatDate(order.placedAt);
  const timeLabel = placedDate
    ? placedDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    // modal overlay
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4">
      {/* confirmation card — scrolls internally on short screens */}
      <div className="my-auto w-full max-w-76 rounded-2xl bg-linear-to-b from-green-50 to-white p-4 shadow-xl">
        {/* close popup */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="-mt-1 -mr-1 text-gray-300 transition-colors hover:text-gray-500"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

      
        <div className="-mt-1 flex items-center justify-center gap-1.5">
          {/* orange cart icon badge */}
          <span className="flex items-center justify-center rounded-md bg-orange-500 p-1">
            <ShoppingCart className="h-3.5 w-3.5 text-white" />
          </span>
          {/* brand name */}
          <span className="text-base font-extrabold text-orange-600">
            Bazar<span className="text-green-700">Ghat</span>
          </span>
        </div>

        {/* success tick */}
        <div className="mt-2.5 flex justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-green-700 text-white ring-4 ring-green-100">
            <Check size={24} strokeWidth={3} />
          </span>
        </div>

        {/* headline */}
        <h2 className="mt-2 text-center text-lg font-extrabold text-green-700">
          Order Confirmed! 🎉
        </h2>

        {/* order number + placed at */}
        <div className="mt-3 flex items-start justify-between gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-sm">
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-900">
              Order
            </p>
            <p className="truncate text-sm font-extrabold text-gray-800">
              #{order.orderNumber}
            </p>
          </div>
          <div className="shrink-0 text-right text-[10px] font-medium text-gray-900">
            <p>{dateLabel}</p>
            {timeLabel && <p>{timeLabel}</p>}
          </div>
        </div>

        {/* ordered lines and totals */}
        <div className="mt-2 rounded-xl border border-gray-100 bg-white px-3 py-2.5 shadow-sm">
          <p className="mb-1.5 text-[9px] font-bold uppercase tracking-widest text-gray-900">
            Order Summary
          </p>

          {/* long orders scroll instead of stretching the popup */}
          <ul className="max-h-32 space-y-1.5 overflow-y-auto">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center gap-2 text-xs">
                {/* item thumbnail, falls back to a bag icon */}
                {item.img ? (
                  <img
                    src={item.img}
                    alt={item.name}
                    className="h-6 w-6 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-700">
                    <ShoppingBag size={11} />
                  </span>
                )}
                {/* item name */}
                <span className="min-w-0 flex-1 truncate font-semibold text-gray-900">
                  {item.name}
                </span>
                {/* quantity ordered */}
                <span className="shrink-0 text-[10px] text-gray-800">
                  {item.weight ? `${item.weight} × ` : "× "}
                  {item.quantity}
                </span>
                {/* line total */}
                <span className="shrink-0 text-[11px] font-bold text-gray-900">
                  {tk(item.price * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-2 space-y-1 border-t border-dashed border-gray-200 pt-2 text-[11px]">
            {/* subtotal row */}
            <div className="flex justify-between text-gray-900">
              <span>Subtotal</span>
              <span className="font-semibold text-gray-900">
                {tk(order.subtotal)}
              </span>
            </div>
            {/* coupon discount row, only for a cash-off coupon */}
            {order.couponDiscount > 0 && (
              <div className="flex justify-between text-green-700">
                <span>Coupon discount</span>
                <span className="font-semibold">-{tk(order.couponDiscount)}</span>
              </div>
            )}
            {/* delivery row, free when a coupon waived it */}
            <div className="flex justify-between text-gray-900">
              <span>Delivery</span>
              {order.freeDelivery ? (
                <span className="font-bold text-green-700">FREE</span>
              ) : (
                <span className="font-semibold text-gray-900">
                  {tk(order.deliveryFee)}
                </span>
              )}
            </div>
            {/* grand total row */}
            <div className="flex justify-between border-t border-dashed border-gray-200 pt-1.5 text-sm font-bold">
              <span className="text-gray-800">Total</span>
              <span className="text-orange-600">{tk(order.total)}</span>
            </div>
            {order.walletAmount > 0 && (
              
              <>
                <div className="flex justify-between text-gray-900">
                  <span>Paid from Wallet</span>
                  <span className="font-semibold text-green-700">
                    {tk(order.walletAmount)}
                  </span>
                </div>
                {order.total - order.walletAmount > 0 && (
                  <div className="flex justify-between gap-2 text-gray-900">
                    <span className="min-w-0 truncate">
                      {order.paymentLabel === "Cash on Delivery"
                        ? "Pay on Delivery"
                        : `Paid via ${order.paymentChannel || order.paymentLabel}`}
                    </span>
                    <span className="shrink-0 font-semibold text-gray-900">
                      {tk(order.total - order.walletAmount)}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* payment method + delivery address */}
        <div className="mt-2 grid grid-cols-2 gap-2">
          {/* how this order is being paid */}
          <div className="flex items-start gap-1.5 rounded-xl border border-gray-100 bg-white p-2 shadow-sm">
            <Wallet size={13} className="mt-0.5 shrink-0 text-green-700" />
            <div className="min-w-0">
              <p className="text-[9px] font-semibold text-gray-900">Payment</p>
              
              <p className="text-[11px] leading-tight font-bold wrap-break-word text-gray-900">
                {order.paymentChannel || order.paymentLabel}
              </p>
              {order.paymentChannel && order.paymentGateway && (
                <p className="text-[9px] leading-tight font-medium text-gray-500">
                  via {order.paymentGateway}
                </p>
              )}
            </div>
          </div>
          {/* where it is going */}
          <div className="flex items-start gap-1.5 rounded-xl border border-gray-100 bg-white p-2 shadow-sm">
            <MapPin size={13} className="mt-0.5 shrink-0 text-orange-500" />
            <div className="min-w-0">
              <p className="text-[9px] font-semibold text-gray-900">Address</p>
              <p className="truncate text-[11px] font-bold text-gray-900">
                {order.address}
              </p>
            </div>
          </div>
        </div>

        {/* go to the tracking page for this order */}
        <button
          type="button"
          onClick={onTrack}
          className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-lg bg-green-700 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-green-800 hover:shadow-lg hover:shadow-green-200"
        >
          <Truck size={15} />
          Track Order
        </button>
        {/* back to the storefront */}
        <button
          type="button"
          onClick={onContinue}
          className="mt-1.5 flex w-full items-center justify-center gap-2 rounded-lg border border-green-200 bg-white py-2 text-sm font-bold text-green-700 transition-colors hover:bg-green-50"
        >
          <ShoppingBag size={15} />
          Continue Shopping
        </button>

        {/* auto-dismiss countdown */}
        {typeof secondsLeft === "number" && (
          <p className="mt-2 text-center text-[10px] font-semibold text-gray-900">
            Returning to home in {Math.max(secondsLeft, 0)}s
          </p>
        )}

        {/* support line */}
        <p className="mt-1 text-center text-[10px] text-gray-900">
          Need help?{" "}
          <span className="font-bold text-green-700">01947938237</span>
        </p>
      </div>
    </div>
  );
};

export default OrderConfirmedModal;
