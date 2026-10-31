import { apiSlice } from "../api/apiSlice";

// Add these endpoints to the shared API slice
export const checkoutApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Checkout (POST /customer/checkout)
    checkout: builder.mutation({
      query: (data) => ({
        url: "/customer/checkout",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Order", "Product", "Cart", "Wallet"],
    }),
  }),
  // Do not replace endpoints that already exist
  overrideExisting: false,
});

// React hooks generated for the endpoints above
export const { useCheckoutMutation } = checkoutApiSlice;
