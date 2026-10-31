import { apiSlice } from "../api/apiSlice";

// Customer's BazarGhat refund balance.
export const walletApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get wallet (GET /customer/wallet)
    getWallet: builder.query({
      query: () => "/customer/wallet",
      providesTags: ["Wallet"],
    }),
    // Get wallet transactions (GET /customer/wallet/transactions)
    getWalletTransactions: builder.query({
      query: () => "/customer/wallet/transactions",
      providesTags: ["Wallet"],
    }),
  }),
  // Do not replace endpoints that already exist
  overrideExisting: false,
});

// React hooks generated for the endpoints above
export const { useGetWalletQuery, useGetWalletTransactionsQuery } =
  walletApiSlice;
