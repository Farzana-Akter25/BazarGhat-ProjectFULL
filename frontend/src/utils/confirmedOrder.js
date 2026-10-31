// Builds the order-confirmed popup's payload from an order as the customer order API returns it.
// Used on the payment gateway return leg, where the lines and totals come back from the server
// rather than from what was still on screen when the order was placed.
export const buildConfirmedOrder = (paidOrder) => ({
  orderNumber: paidOrder.id,
  placedAt: paidOrder.date,
  items: paidOrder.items.map((item) => ({
    id: item.id,
    name: item.name,
    quantity: item.qty,
    price: item.price,
  })),
  subtotal: Number(paidOrder.subtotal),
  // The order stores the delivery fee it charged; a coupon that waived it leaves 0 there and the waiver in the discount.
  deliveryFee: Number(paidOrder.deliveryFee) || 0,
  couponDiscount: Number(paidOrder.couponDiscount) || 0,
  freeDelivery: Number(paidOrder.deliveryFee) === 0 && Number(paidOrder.discount) > 0,
  total: Number(paidOrder.total),
  // part of the total paid from the BazarGhat Wallet before the gateway leg
  walletAmount: Number(paidOrder.walletAmount) || 0,
  // The gateway plus the channel it actually charged — "SSLCommerz (bKash)".
  paymentLabel: paidOrder.paymentLabel || paidOrder.paymentMethod,
  // Kept apart as well so the popup can lead with the channel the customer recognises ("bKash") and still name the gateway underneath it, instead of squeezing both into one line that gets cut off.
  paymentChannel: paidOrder.paymentChannel,
  paymentGateway: paidOrder.paymentMethod,
  address: paidOrder.shippingAddress,
});
