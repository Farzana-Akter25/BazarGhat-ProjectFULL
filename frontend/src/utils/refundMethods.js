
// Title and description shown for each refund method
export const REFUND_METHOD_COPY = {
  WALLET: {
    title: "Refund to Refund Wallet",
    detail: "Use the refund immediately for future purchases.",
  },
  ORIGINAL_PAYMENT: {
    title: "Refund to Original Payment Method",
    detail:
      "The money is returned through the payment method used for the original payment.",
  },
};


// Explains where the money will go for the chosen refund method
export const refundMethodNote = (method, paymentMethod) => {
  // Wallet refund
  if (method !== "ORIGINAL_PAYMENT") {
    return "Your approved refund amount will be added to your Refund Wallet and can be used for future shopping.";
  }

  
  // Original payment refund, naming the payment method when known
  return paymentMethod
    ? `Your refund will be given by ${paymentMethod} and may take up to 3 days to reach you.`
    : "Your refund will be given by SSLCommerz and may take up to 3 days to reach your original payment method.";
};
