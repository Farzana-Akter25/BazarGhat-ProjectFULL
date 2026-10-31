// Heading of the refund policy box
export const REFUND_POLICY_TITLE = "Refund & Cancellation Policy";

// Bullet points of the refund policy
export const REFUND_POLICY_POINTS = [
  "If you cancel your order before it is assigned for delivery, the full paid amount will be refunded.",
  "If you request a refund after the product has been delivered, the applicable delivery charge will be deducted from the refundable amount.",
  "If you select SSLCommerz, the refund will be processed within 3 days.",
  "If you select Wallet, the refundable amount will be added to your BazarGhat Wallet instantly.",
  "Wallet refund can be used for future purchases on BazarGhat.",
  "By agreeing to these terms, you confirm that you understand and accept the refund/cancellation conditions.",
];

// Text next to the "I agree" checkbox
export const REFUND_POLICY_AGREEMENT =
  "I have read and agree to the Refund & Cancellation Policy.";


// Title and description for each refund method in the policy box
export const REFUND_POLICY_METHOD_COPY = {
  ORIGINAL_PAYMENT: {
    title: "SSLCommerz",
    detail: "Refund will be processed within 3 days.",
  },
  WALLET: {
    title: "Wallet",
    detail:
      "Refund will be added instantly to your BazarGhat Wallet and can be used for future purchases.",
  },
}
// Sort methods so the original payment option comes first
export const policyMethodOrder = (methods = []) =>
  [...methods].sort(
    (a, b) => (a === "ORIGINAL_PAYMENT" ? 0 : 1) - (b === "ORIGINAL_PAYMENT" ? 0 : 1),
  );
